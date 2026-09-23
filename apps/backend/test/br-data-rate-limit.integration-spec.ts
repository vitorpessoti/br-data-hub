import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import {
  BrData,
  BrDataEnrichmentPatch,
  BrDataPageParams,
  BrDataSource,
} from '@br-data-hub/br-data';
import { Cep, CepData } from '@br-data-hub/cep';
import { Cnpj, CnpjData } from '@br-data-hub/cnpj';
import { DomainError } from '@br-data-hub/shared';
import { Queue } from 'bullmq';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { PrismaService } from '../src/db/prisma.service';
import { BrDataModule } from '../src/modules/br-data/br-data.module';
import { BR_DATA_QUEUE_NAMES } from '../src/modules/br-data/br-data-queue.config';
import { PrismaBrDataRepository } from '../src/modules/br-data/br-data.prisma';
import { PrismaCepRepository } from '../src/modules/cep/cep.prisma';
import { ViaCepProvider } from '../src/modules/cep/viacep.cep';
import { BrasilApiCnpjProvider } from '../src/modules/cnpj/brasilapi.cnpj';
import { PrismaCnpjRepository } from '../src/modules/cnpj/cnpj.prisma';
import { DomainExceptionFilter } from '../src/shared/errors/domain-exception.filter';

/**
 * Rate-limit das filas BullMQ com Redis de verdade.
 *
 * Roda o BrDataModule inteiro (controller, fila, worker e processor reais)
 * trocando só o que sai do processo: Postgres vira repositório em memória e
 * ViaCEP/BrasilAPI viram APIs falsas que registram o horário de cada chamada.
 * Cada teste usa um prefixo de fila próprio no Redis e limites baixos
 * (poucos jobs por 1-3s) para o limiter aparecer em segundos.
 *
 * Pré-requisito: `docker compose up -d redis` em apps/backend.
 */

// O guard real depende do JwtModule; aqui o usuário vem do header x-user-id.
jest.mock('../src/shared/auth/jwt-auth.guard', () => ({
  JwtAuthGuard: class {
    canActivate(context: {
      switchToHttp: () => {
        getRequest: () => {
          headers: Record<string, string | undefined>;
          user?: unknown;
        };
      };
    }) {
      const req = context.switchToHttp().getRequest();
      const userId = req.headers['x-user-id'];

      if (!userId) {
        return false;
      }

      req.user = { id: userId, sub: userId };
      return true;
    }
  },
}));

const USER_ID = '550e8400-e29b-41d4-a716-446655440000';
const REDIS_HOST = process.env.REDIS_HOST ?? 'localhost';
const REDIS_PORT = Number(process.env.REDIS_PORT ?? 6389);
// Folga para a granularidade do limiter e o tempo de cada chamada falsa.
const TIMING_TOLERANCE_MS = 150;

const ENV_KEYS = [
  'BR_DATA_QUEUE_PREFIX',
  'BR_DATA_SYNC_WAIT_MS',
  'BR_DATA_RATE_LIMIT_BACKOFF_MS',
  'VIACEP_RATE_LIMIT_MAX',
  'VIACEP_RATE_LIMIT_DURATION_MS',
  'BRASILAPI_RATE_LIMIT_MAX',
  'BRASILAPI_RATE_LIMIT_DURATION_MS',
];

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

class InMemoryBrDataRepository {
  private readonly storage = new Map<string, BrData>();

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
    const found = this.storage.get(id);

    if (!found) {
      return;
    }

    const changes: Record<string, unknown> = {};

    if (patch.status !== undefined) changes[`${source}Status`] = patch.status;
    if (patch.jobId !== undefined) changes[`${source}JobId`] = patch.jobId;
    if (patch.error !== undefined) {
      changes[`${source}Error`] = patch.error ?? undefined;
    }

    this.storage.set(id, found.clone(changes));
  }

  async delete(id: string) {
    this.storage.delete(id);
  }

  async findById(id: string) {
    return this.storage.get(id) ?? null;
  }

  async findPage(params: BrDataPageParams) {
    const items = [...this.storage.values()].filter(
      (item) => item.userId === params.userId,
    );

    return { items, page: 1, perPage: items.length, total: items.length };
  }
}

// Repositório em memória para Cep/Cnpj, indexado pelo documento.
class InMemoryDocumentRepository<T extends Cep | Cnpj> {
  private readonly storage = new Map<string, T>();

  constructor(private readonly keyOf: (item: T) => string) {}

  async create(data: T) {
    this.storage.set(this.keyOf(data), data);
    return data;
  }

  async update(data: T) {
    return this.create(data);
  }

  async find(document: string) {
    return this.storage.get(document) ?? null;
  }
}

// API externa falsa: registra cada chamada e pode responder 429 algumas vezes.
class FakeExternalApi<TData> {
  readonly calls: { document: string; at: number }[] = [];
  private rateLimitedResponses = 0;

  constructor(
    private readonly source: BrDataSource,
    private readonly toData: (document: string) => TData,
    private readonly latencyMs = 25,
  ) {}

  respondRateLimited(times: number) {
    this.rateLimitedResponses = times;
  }

  async lookup(document: string): Promise<TData> {
    this.calls.push({ document, at: Date.now() });
    await sleep(this.latencyMs);

    if (this.rateLimitedResponses > 0) {
      this.rateLimitedResponses--;
      throw new DomainError(`${this.source}.provider.rate.limited`, 429);
    }

    return this.toData(document);
  }
}

const cepData = (cep: string): CepData => ({
  cep,
  street: 'Praça da Sé',
  neighborhood: 'Sé',
  city: 'São Paulo',
  stateCode: 'SP',
  stateName: 'São Paulo',
  region: 'Sudeste',
  ibgeCode: '3550308',
  giaCode: '1004',
  areaCode: '11',
  siafiCode: '7107',
});

const cnpjData = (cnpj: string): CnpjData => ({
  cnpj,
  branchTypeCode: 1,
  legalName: 'OPEN KNOWLEDGE BRASIL',
  registrationStatusCode: 2,
  legalNatureCode: 3999,
  mainCnaeCode: '9430800',
  stateCode: 'SP',
  city: 'SAO PAULO',
  shareCapital: 0,
  secondaryCnaes: [],
  partners: [],
  taxRegimes: [],
});

interface TestContext {
  app: INestApplication;
  prefix: string;
  cepApi: FakeExternalApi<CepData>;
  cnpjApi: FakeExternalApi<CnpjData>;
}

async function startApp(env: Record<string, string>): Promise<TestContext> {
  const prefix = `br-data-it-${randomUUID()}`;

  Object.assign(process.env, { BR_DATA_QUEUE_PREFIX: prefix, ...env });

  const cepApi = new FakeExternalApi('cep', cepData);
  const cnpjApi = new FakeExternalApi('cnpj', cnpjData);
  const cepRepository = new InMemoryDocumentRepository<Cep>((item) => item.cep);
  const cnpjRepository = new InMemoryDocumentRepository<Cnpj>(
    (item) => item.cnpj,
  );

  const moduleRef = await Test.createTestingModule({ imports: [BrDataModule] })
    .overrideProvider(PrismaService)
    .useValue({})
    .overrideProvider(PrismaBrDataRepository)
    .useValue(new InMemoryBrDataRepository())
    .overrideProvider(PrismaCepRepository)
    .useValue({
      create: (item: Cep) => cepRepository.create(item),
      update: (item: Cep) => cepRepository.update(item),
      findByCep: (cep: string) => cepRepository.find(cep),
    })
    .overrideProvider(PrismaCnpjRepository)
    .useValue({
      create: (item: Cnpj) => cnpjRepository.create(item),
      update: (item: Cnpj) => cnpjRepository.update(item),
      findByCnpj: (cnpj: string) => cnpjRepository.find(cnpj),
    })
    .overrideProvider(ViaCepProvider)
    .useValue({ findByCep: (cep: string) => cepApi.lookup(cep) })
    .overrideProvider(BrasilApiCnpjProvider)
    .useValue({ findByCnpj: (cnpj: string) => cnpjApi.lookup(cnpj) })
    .compile();

  const app = moduleRef.createNestApplication({ logger: false });
  app.useGlobalFilters(new DomainExceptionFilter());
  await app.listen(0);

  return { app, prefix, cepApi, cnpjApi };
}

async function stopApp(ctx: TestContext | undefined): Promise<void> {
  if (!ctx) {
    return;
  }

  await ctx.app.close();

  for (const name of Object.values(BR_DATA_QUEUE_NAMES)) {
    const queue = new Queue(name, {
      connection: { host: REDIS_HOST, port: REDIS_PORT },
      prefix: ctx.prefix,
    });
    await queue.obliterate({ force: true });
    await queue.close();
  }
}

function postBrData(ctx: TestContext, body: Record<string, string>) {
  const startedAt = Date.now();

  return request(ctx.app.getHttpServer())
    .post('/br-data')
    .set('x-user-id', USER_ID)
    .send(body)
    .then((response) => ({ response, elapsedMs: Date.now() - startedAt }));
}

async function getJob(ctx: TestContext, jobId: string) {
  const response = await request(ctx.app.getHttpServer())
    .get(`/br-data/jobs/${jobId}`)
    .set('x-user-id', USER_ID)
    .expect(200);

  return response.body as {
    jobId: string;
    state: string;
    rateLimited: boolean;
    result: { status: string } | null;
    processedAt: string | null;
  };
}

async function getBrData(ctx: TestContext, id: string) {
  const response = await request(ctx.app.getHttpServer())
    .get(`/br-data/${id}`)
    .set('x-user-id', USER_ID)
    .expect(200);

  return response.body;
}

async function waitFor<T>(
  load: () => Promise<T>,
  done: (value: T) => boolean,
  timeoutMs = 20_000,
): Promise<T> {
  const deadline = Date.now() + timeoutMs;
  let value = await load();

  while (!done(value)) {
    if (Date.now() > deadline) {
      throw new Error(
        `condicao nao atingida em ${timeoutMs}ms: ${JSON.stringify(value)}`,
      );
    }

    await sleep(50);
    value = await load();
  }

  return value;
}

const jobsOf = (ctx: TestContext, jobIds: string[]) => () =>
  Promise.all(jobIds.map((jobId) => getJob(ctx, jobId)));

const allCompleted = <T extends { state: string }>(jobs: T[]) =>
  jobs.every((job) => job.state === 'completed');

// Em qualquer intervalo menor que a janela, no máximo `max` jobs iniciados.
// Mede pelo `processedAt` (momento em que o limiter liberou o job), e não pela
// chamada à API: o primeiro job ainda paga aquecimento antes de chamar a API.
function expectAtMostPerWindow(
  jobs: { processedAt: string | null }[],
  max: number,
  durationMs: number,
) {
  const times = jobs
    .map((job) => Date.parse(job.processedAt!))
    .sort((a, b) => a - b);

  for (let i = 0; i + max < times.length; i++) {
    expect(times[i + max]! - times[i]!).toBeGreaterThanOrEqual(
      durationMs - TIMING_TOLERANCE_MS,
    );
  }
}

describe('br-data: rate-limit das filas com Redis (integração)', () => {
  const originalEnv = Object.fromEntries(
    ENV_KEYS.map((key) => [key, process.env[key]]),
  );
  let ctx: TestContext | undefined;

  beforeAll(async () => {
    const probe = new Queue('br-data-it-probe', {
      connection: {
        host: REDIS_HOST,
        port: REDIS_PORT,
        maxRetriesPerRequest: 1,
        connectTimeout: 2000,
        retryStrategy: () => null,
      },
    });
    probe.on('error', () => undefined);

    try {
      await Promise.race([
        probe.waitUntilReady(),
        sleep(3000).then(() => Promise.reject(new Error('timeout'))),
      ]);
      await probe.obliterate({ force: true });
    } catch {
      throw new Error(
        `Redis indisponível em ${REDIS_HOST}:${REDIS_PORT}. Suba com "docker compose up -d redis" em apps/backend.`,
      );
    } finally {
      await probe.close().catch(() => undefined);
    }
  });

  afterEach(async () => {
    await stopApp(ctx);
    ctx = undefined;

    for (const key of ENV_KEYS) {
      if (originalEnv[key] === undefined) delete process.env[key];
      else process.env[key] = originalEnv[key];
    }
  });

  it('varias requisicoes simultaneas: o limiter segura o excedente e nunca passa do max por janela', async () => {
    ctx = await startApp({
      VIACEP_RATE_LIMIT_MAX: '3',
      VIACEP_RATE_LIMIT_DURATION_MS: '2000',
      // sem espera no POST: todas devolvem o jobId na hora
      BR_DATA_SYNC_WAIT_MS: '0',
    });

    const results = await Promise.all(
      Array.from({ length: 8 }, () => postBrData(ctx!, { cep: '01001000' })),
    );

    expect(results.map(({ response }) => response.status)).toEqual(
      Array(8).fill(202),
    );

    const jobIds = results.map(
      ({ response }) => response.body.pendingJobs[0].jobId as string,
    );
    expect(new Set(jobIds).size).toBe(8);

    // primeira janela: 3 jobs concluídos e os outros 5 seguros pelo limiter
    const firstWindow = await waitFor(
      jobsOf(ctx, jobIds),
      (jobs) => jobs.filter((job) => job.state === 'completed').length === 3,
    );
    const held = firstWindow.filter((job) => job.state !== 'completed');

    expect(held).toHaveLength(5);
    for (const job of held) {
      expect(job).toMatchObject({ state: 'waiting', rateLimited: true });
    }
    expect(ctx.cepApi.calls).toHaveLength(3);

    // o excedente sai sozinho nas janelas seguintes
    const finished = await waitFor(jobsOf(ctx, jobIds), allCompleted);

    expect(ctx.cepApi.calls).toHaveLength(8);
    expectAtMostPerWindow(finished, 3, 2000);

    for (const { response } of results) {
      const brData = await getBrData(ctx, response.body.id);
      expect(brData.enrichment.cep).toMatchObject({
        status: 'completed',
        data: { cep: '01001-000', city: 'São Paulo' },
      });
    }
  });

  it('janela esgotada: requisicoes simultaneas recebem 202 com jobId na hora, sem esperar o BR_DATA_SYNC_WAIT_MS', async () => {
    ctx = await startApp({
      VIACEP_RATE_LIMIT_MAX: '3',
      VIACEP_RATE_LIMIT_DURATION_MS: '3000',
      BR_DATA_SYNC_WAIT_MS: '10000',
    });

    // as 3 primeiras cabem na janela: o POST espera e já devolve os dados
    const withinLimit = await Promise.all(
      Array.from({ length: 3 }, () => postBrData(ctx!, { cep: '01001-000' })),
    );

    for (const { response } of withinLimit) {
      expect(response.status).toBe(201);
      expect(response.body.enrichment.cep.status).toBe('completed');
    }

    const excess = await Promise.all(
      Array.from({ length: 4 }, () => postBrData(ctx!, { cep: '01001-000' })),
    );

    for (const { response, elapsedMs } of excess) {
      expect(response.status).toBe(202);
      expect(response.body.enrichment.cep.status).toBe('pending');
      expect(response.body.pendingJobs).toEqual([
        { source: 'cep', jobId: response.body.enrichment.cep.jobId },
      ]);
      // não ficou esperando os 10s: devolveu o jobId assim que viu a fila travada
      expect(elapsedMs).toBeLessThan(2000);
    }

    const jobIds = excess.map(
      ({ response }) => response.body.enrichment.cep.jobId as string,
    );
    const queued = await jobsOf(ctx, jobIds)();

    for (const job of queued) {
      expect(job).toMatchObject({ state: 'waiting', rateLimited: true });
    }

    const finished = await waitFor(jobsOf(ctx, jobIds), allCompleted);

    for (const job of finished) {
      expect(job).toMatchObject({
        rateLimited: false,
        result: { status: 'completed' },
      });
    }
    const firstWindow = await jobsOf(
      ctx,
      withinLimit.map(
        ({ response }) => response.body.enrichment.cep.jobId as string,
      ),
    )();

    expect(ctx.cepApi.calls).toHaveLength(7);
    expectAtMostPerWindow([...firstWindow, ...finished], 3, 3000);
  });

  it('cada API tem o seu limite: CNPJ travado nao segura o CEP da mesma requisicao', async () => {
    ctx = await startApp({
      VIACEP_RATE_LIMIT_MAX: '5',
      VIACEP_RATE_LIMIT_DURATION_MS: '3000',
      BRASILAPI_RATE_LIMIT_MAX: '1',
      BRASILAPI_RATE_LIMIT_DURATION_MS: '3000',
      BR_DATA_SYNC_WAIT_MS: '10000',
    });

    // ocupa a única vaga da BrasilAPI
    const filler = await postBrData(ctx, { cnpj: '19131243000197' });
    expect(filler.response.status).toBe(201);

    const { response, elapsedMs } = await postBrData(ctx, {
      cep: '01001-000',
      cnpj: '19.131.243/0001-97',
    });

    expect(response.status).toBe(202);
    expect(elapsedMs).toBeLessThan(2000);
    expect(response.body.enrichment.cep).toMatchObject({
      status: 'completed',
      data: { city: 'São Paulo' },
    });
    expect(response.body.enrichment.cnpj.status).toBe('pending');
    expect(response.body.pendingJobs).toEqual([
      { source: 'cnpj', jobId: response.body.enrichment.cnpj.jobId },
    ]);

    const cnpjJob = await getJob(ctx, response.body.enrichment.cnpj.jobId);
    expect(cnpjJob).toMatchObject({ state: 'waiting', rateLimited: true });

    await waitFor(jobsOf(ctx, [cnpjJob.jobId]), allCompleted);

    const brData = await getBrData(ctx, response.body.id);
    expect(brData.enrichment.cnpj).toMatchObject({
      status: 'completed',
      data: { legalName: 'OPEN KNOWLEDGE BRASIL' },
    });
    expect(ctx.cnpjApi.calls).toHaveLength(2);
    expectAtMostPerWindow(
      await jobsOf(ctx, [
        filler.response.body.enrichment.cnpj.jobId as string,
        cnpjJob.jobId,
      ])(),
      1,
      3000,
    );
  });

  it('429 da API pausa a fila: requisicoes durante a pausa recebem 202 e tudo e refeito depois', async () => {
    const backoffMs = 3000;
    ctx = await startApp({
      VIACEP_RATE_LIMIT_MAX: '10',
      VIACEP_RATE_LIMIT_DURATION_MS: '1000',
      BR_DATA_RATE_LIMIT_BACKOFF_MS: String(backoffMs),
      BR_DATA_SYNC_WAIT_MS: '1500',
    });
    ctx.cepApi.respondRateLimited(1);

    // o job começa, recebe 429 e volta para a espera; o POST esgota a espera
    const first = await postBrData(ctx, { cep: '01001-000' });
    const firstJobId = first.response.body.enrichment.cep.jobId as string;

    expect(first.response.status).toBe(202);
    expect(ctx.cepApi.calls).toHaveLength(1);
    expect(await getJob(ctx, firstJobId)).toMatchObject({
      state: 'waiting',
      rateLimited: true,
    });

    // durante a pausa, novas requisições simultâneas não chamam a API
    const duringPause = await Promise.all(
      Array.from({ length: 3 }, () => postBrData(ctx!, { cep: '01001-000' })),
    );

    for (const { response, elapsedMs } of duringPause) {
      expect(response.status).toBe(202);
      expect(elapsedMs).toBeLessThan(1000);
    }
    expect(ctx.cepApi.calls).toHaveLength(1);

    const jobIds = [
      firstJobId,
      ...duringPause.map(
        ({ response }) => response.body.enrichment.cep.jobId as string,
      ),
    ];
    const finished = await waitFor(jobsOf(ctx, jobIds), allCompleted);

    for (const job of finished) {
      expect(job.result).toEqual({ status: 'completed' });
    }
    // 1 chamada com 429 + 4 depois da pausa; a segunda só depois do backoff
    expect(ctx.cepApi.calls).toHaveLength(5);
    expect(
      ctx.cepApi.calls[1]!.at - ctx.cepApi.calls[0]!.at,
    ).toBeGreaterThanOrEqual(backoffMs - TIMING_TOLERANCE_MS);

    const brData = await getBrData(ctx, first.response.body.id);
    expect(brData.enrichment.cep).toMatchObject({
      status: 'completed',
      error: null,
    });
  });
});
