import {
  BrData,
  BrDataEnrichmentPatch,
  BrDataEnrichmentRequest,
  BrDataPageParams,
  BrDataSource,
} from '@br-data-hub/br-data';
import { DomainError, ValidationException } from '@br-data-hub/shared';
import type { Response } from 'express';
import type { PrismaCepRepository } from '../cep/cep.prisma';
import type { PrismaCnpjRepository } from '../cnpj/cnpj.prisma';
import { BrDataController } from './br-data.controller';
import type { PrismaBrDataRepository } from './br-data.prisma';
import type {
  BrDataJob,
  BrDataPendingJob,
  BullMqBrDataEnrichmentProvider,
} from './bullmq.br-data-enrichment';

// Isola o controller do JwtModule: aqui o usuário é passado direto nos métodos.
jest.mock('../../shared/auth/jwt-auth.guard', () => ({
  JwtAuthGuard: class {},
}));

const USER_ID = '550e8400-e29b-41d4-a716-446655440000';
const OTHER_USER_ID = '9b2f4c1e-3d5a-4e6f-8a7b-1c2d3e4f5a6b';

class InMemoryBrDataRepository {
  readonly storage = new Map<string, BrData>();

  async create(data: BrData) {
    this.storage.set(data.id, data);
    return data;
  }

  async update(data: BrData) {
    this.storage.set(data.id, data);
    return data;
  }

  async updateEnrichment(
    id: string,
    source: BrDataSource,
    patch: BrDataEnrichmentPatch,
  ) {
    const found = this.storage.get(id)!;
    const prefix = source === 'cep' ? 'cep' : 'cnpj';
    const changes: Record<string, unknown> = {};

    if (patch.status !== undefined) changes[`${prefix}Status`] = patch.status;
    if (patch.jobId !== undefined) changes[`${prefix}JobId`] = patch.jobId;
    if (patch.error !== undefined) {
      changes[`${prefix}Error`] = patch.error ?? undefined;
    }

    this.storage.set(id, found.clone(changes));
  }

  async findById(id: string) {
    return this.storage.get(id) ?? null;
  }

  async findPage(params: BrDataPageParams) {
    const items = [...this.storage.values()].filter(
      (item) => item.userId === params.userId,
    );

    return {
      items: items.slice(
        (params.page - 1) * params.perPage,
        params.page * params.perPage,
      ),
      page: params.page,
      perPage: params.perPage,
      total: items.length,
    };
  }
}

/**
 * Simula a fila com rate-limit: só os primeiros `capacity` jobs enfileirados
 * cabem na janela e terminam durante a espera do POST; os demais ficam
 * pendentes, como se o limiter do BullMQ os segurasse.
 */
class FakeRateLimitedEnrichment {
  readonly requests: (BrDataEnrichmentRequest & { jobId: string })[] = [];
  readonly waitCalls: { jobs: BrDataPendingJob[]; timeoutMs: number }[] = [];

  constructor(
    private readonly repository: InMemoryBrDataRepository,
    private readonly capacity: Record<BrDataSource, number>,
  ) {}

  enqueue = jest.fn(async (request: BrDataEnrichmentRequest) => {
    const jobId = `${request.source}-job-${this.requests.length + 1}`;
    this.requests.push({ ...request, jobId });
    // cede a vez: as requisições simultâneas enfileiram intercaladas
    await new Promise((resolve) => setImmediate(resolve));
    return jobId;
  });

  waitForJobs = jest.fn(async (jobs: BrDataPendingJob[], timeoutMs: number) => {
    this.waitCalls.push({ jobs, timeoutMs });

    for (const { source, jobId } of jobs) {
      const request = this.requests.find((item) => item.jobId === jobId)!;
      const position = this.requests
        .filter((item) => item.source === source)
        .indexOf(request);

      if (position < this.capacity[source]) {
        await this.repository.updateEnrichment(request.brDataId, source, {
          status: 'completed',
        });
      }
    }
  });

  findJob = jest.fn(async (): Promise<BrDataJob | null> => null);
}

function responseMock() {
  return { status: jest.fn() } as unknown as Response & { status: jest.Mock };
}

function setup(
  capacity: Record<BrDataSource, number> = { cep: 100, cnpj: 100 },
) {
  const brDataRepository = new InMemoryBrDataRepository();
  const enrichment = new FakeRateLimitedEnrichment(brDataRepository, capacity);
  const cepRepository = { findByCep: jest.fn().mockResolvedValue(null) };
  const cnpjRepository = { findByCnpj: jest.fn().mockResolvedValue(null) };
  const controller = new BrDataController(
    brDataRepository as unknown as PrismaBrDataRepository,
    enrichment as unknown as BullMqBrDataEnrichmentProvider,
    cepRepository as unknown as PrismaCepRepository,
    cnpjRepository as unknown as PrismaCnpjRepository,
  );

  return { controller, brDataRepository, enrichment, cepRepository };
}

describe('BrDataController', () => {
  const ORIGINAL_SYNC_WAIT = process.env.BR_DATA_SYNC_WAIT_MS;

  afterEach(() => {
    if (ORIGINAL_SYNC_WAIT === undefined)
      delete process.env.BR_DATA_SYNC_WAIT_MS;
    else process.env.BR_DATA_SYNC_WAIT_MS = ORIGINAL_SYNC_WAIT;
  });

  describe('POST /br-data', () => {
    it('responde 201 com os dados quando as duas consultas terminam na espera', async () => {
      process.env.BR_DATA_SYNC_WAIT_MS = '2500';
      const { controller, enrichment, cepRepository } = setup();
      const response = responseMock();

      const body = await controller.saveBrData(
        USER_ID,
        { cep: '01001000', cnpj: '19.131.243/0001-97' },
        response,
      );

      expect(response.status).not.toHaveBeenCalled();
      expect(body).not.toHaveProperty('pendingJobs');
      expect(body.enrichment.cep).toMatchObject({
        status: 'completed',
        jobId: 'cep-job-1',
        data: null,
      });
      expect(body.enrichment.cnpj).toMatchObject({
        status: 'completed',
        jobId: 'cnpj-job-2',
      });
      expect(enrichment.waitCalls).toEqual([
        {
          jobs: [
            { source: 'cep', jobId: 'cep-job-1' },
            { source: 'cnpj', jobId: 'cnpj-job-2' },
          ],
          timeoutMs: 2500,
        },
      ]);
      expect(cepRepository.findByCep).toHaveBeenCalledWith('01001-000');
    });

    it('responde 202 com o jobId da fonte limitada e os dados da que terminou', async () => {
      const { controller } = setup({ cep: 1, cnpj: 0 });
      const response = responseMock();

      const body = await controller.saveBrData(
        USER_ID,
        { cep: '01001-000', cnpj: '19131243000197' },
        response,
      );

      expect(response.status).toHaveBeenCalledWith(202);
      expect(body.enrichment.cep?.status).toBe('completed');
      expect(body.enrichment.cnpj?.status).toBe('pending');
      expect(
        (body as { pendingJobs?: BrDataPendingJob[] }).pendingJobs,
      ).toEqual([{ source: 'cnpj', jobId: 'cnpj-job-2' }]);
    });

    it('com varias requisicoes simultaneas, as que cabem na janela recebem 201 e as excedentes 202 com jobId', async () => {
      const { controller, brDataRepository } = setup({ cep: 3, cnpj: 0 });
      const responses = Array.from({ length: 8 }, () => responseMock());

      const bodies = await Promise.all(
        responses.map((response) =>
          controller.saveBrData(USER_ID, { cep: '01001-000' }, response),
        ),
      );

      const accepted = responses.filter((response) =>
        response.status.mock.calls.some(([status]) => status === 202),
      );
      const pendingJobIds = bodies.flatMap(
        (body) =>
          (body as { pendingJobs?: BrDataPendingJob[] }).pendingJobs ?? [],
      );

      expect(accepted).toHaveLength(5);
      expect(pendingJobIds).toHaveLength(5);
      expect(new Set(pendingJobIds.map((job) => job.jobId)).size).toBe(5);
      // os jobs excedentes são exatamente os que ficaram fora das 3 vagas
      expect(pendingJobIds.map((job) => job.jobId).sort()).toEqual(
        [
          'cep-job-4',
          'cep-job-5',
          'cep-job-6',
          'cep-job-7',
          'cep-job-8',
        ].sort(),
      );
      expect(
        [...brDataRepository.storage.values()]
          .map((item) => item.cepStatus)
          .sort(),
      ).toEqual([
        'completed',
        'completed',
        'completed',
        'pending',
        'pending',
        'pending',
        'pending',
        'pending',
      ]);
    });

    it('usa a espera padrao de 15s quando o ambiente nao define', async () => {
      delete process.env.BR_DATA_SYNC_WAIT_MS;
      const { controller, enrichment } = setup();

      await controller.saveBrData(
        USER_ID,
        { cep: '01001-000' },
        responseMock(),
      );

      expect(enrichment.waitCalls[0]!.timeoutMs).toBe(15_000);
    });

    it('propaga erro de validacao sem enfileirar nem esperar', async () => {
      const { controller, enrichment } = setup();

      await expect(
        controller.saveBrData(USER_ID, undefined, responseMock()),
      ).rejects.toBeInstanceOf(ValidationException);
      expect(enrichment.enqueue).not.toHaveBeenCalled();
      expect(enrichment.waitForJobs).not.toHaveBeenCalled();
    });
  });

  describe('GET /br-data/jobs/:jobId', () => {
    function brDataJob(userId: string): BrDataJob {
      return {
        jobId: 'cnpj-job-1',
        source: 'cnpj',
        state: 'waiting',
        request: {
          brDataId: 'br-1',
          userId,
          source: 'cnpj',
          document: '19131243000197',
        },
        attemptsMade: 0,
        maxAttempts: 3,
        rateLimited: true,
        result: null,
        failedReason: null,
        createdAt: new Date('2026-09-14T19:00:00.000Z'),
        processedAt: null,
        finishedAt: null,
      };
    }

    it('devolve a situacao do job do proprio usuario, sem expor o userId', async () => {
      const { controller, enrichment } = setup();
      enrichment.findJob.mockResolvedValue(brDataJob(USER_ID));

      const view = await controller.findJob(USER_ID, 'cnpj-job-1');

      expect(enrichment.findJob).toHaveBeenCalledWith('cnpj-job-1');
      expect(view).toEqual({
        jobId: 'cnpj-job-1',
        source: 'cnpj',
        state: 'waiting',
        brDataId: 'br-1',
        document: '19131243000197',
        attemptsMade: 0,
        maxAttempts: 3,
        rateLimited: true,
        result: null,
        failedReason: null,
        createdAt: new Date('2026-09-14T19:00:00.000Z'),
        processedAt: null,
        finishedAt: null,
      });
    });

    it.each([
      ['inexistente', null],
      ['de outro usuario', brDataJob(OTHER_USER_ID)],
    ])('responde 404 para job %s', async (_, job) => {
      const { controller, enrichment } = setup();
      enrichment.findJob.mockResolvedValue(job);

      const error = await controller
        .findJob(USER_ID, 'cnpj-job-1')
        .catch((thrown: unknown) => thrown);

      expect(error).toBeInstanceOf(DomainError);
      expect((error as DomainError).message).toBe('br-data.job.not.found');
      expect((error as DomainError).statusCode).toBe(404);
    });
  });

  describe('GET /br-data e /br-data/:id', () => {
    it('lista so os pedidos do usuario, limitando perPage a 100', async () => {
      const { controller, brDataRepository } = setup();
      await brDataRepository.create(
        new BrData({ userId: USER_ID, cep: '01001-000', cepStatus: 'pending' }),
      );
      await brDataRepository.create(
        new BrData({
          userId: OTHER_USER_ID,
          cep: '01001-000',
          cepStatus: 'pending',
        }),
      );
      const findPageSpy = jest.spyOn(brDataRepository, 'findPage');

      const page = await controller.findBrDataPage(USER_ID, 'abc', '500');

      expect(findPageSpy).toHaveBeenCalledWith({
        userId: USER_ID,
        page: 1,
        perPage: 100,
      });
      expect(page.total).toBe(1);
      expect(page.items[0]).not.toHaveProperty('enrichment.cep.data');
    });

    it('responde 404 para pedido de outro usuario', async () => {
      const { controller, brDataRepository } = setup();
      const other = await brDataRepository.create(
        new BrData({
          userId: OTHER_USER_ID,
          cep: '01001-000',
          cepStatus: 'pending',
        }),
      );

      await expect(
        controller.findBrDataById(USER_ID, other.id),
      ).rejects.toThrow('br-data.not.found');
    });
  });
});
