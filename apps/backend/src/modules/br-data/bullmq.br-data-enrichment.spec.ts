import type {
  BrDataEnrichmentRequest,
  BrDataSource,
} from '@br-data-hub/br-data';
import { BullMqBrDataEnrichmentProvider } from './bullmq.br-data-enrichment';

interface MockQueueInstance {
  name: string;
  opts: Record<string, unknown>;
  add: jest.Mock;
  getJob: jest.Mock;
  getRateLimitTtl: jest.Mock;
  close: jest.Mock;
}

interface MockQueueEventsInstance {
  name: string;
  opts: Record<string, unknown>;
  close: jest.Mock;
}

const mockQueues: MockQueueInstance[] = [];
const mockQueueEvents: MockQueueEventsInstance[] = [];

// Substitui Queue/QueueEvents do BullMQ: o teste controla o estado de cada job
// e o TTL do limiter, sem Redis.
jest.mock('bullmq', () => ({
  Queue: class {
    add = jest.fn().mockResolvedValue(undefined);
    getJob = jest.fn().mockResolvedValue(undefined);
    getRateLimitTtl = jest.fn().mockResolvedValue(0);
    close = jest.fn().mockResolvedValue(undefined);

    constructor(
      readonly name: string,
      readonly opts: Record<string, unknown>,
    ) {
      mockQueues.push(this as unknown as MockQueueInstance);
    }
  },
  QueueEvents: class {
    close = jest.fn().mockResolvedValue(undefined);

    constructor(
      readonly name: string,
      readonly opts: Record<string, unknown>,
    ) {
      mockQueueEvents.push(this as unknown as MockQueueEventsInstance);
    }
  },
}));

const ENV_KEYS = [
  'REDIS_HOST',
  'REDIS_PORT',
  'BR_DATA_QUEUE_PREFIX',
  'VIACEP_RATE_LIMIT_MAX',
  'BRASILAPI_RATE_LIMIT_MAX',
];
const ORIGINAL_ENV = Object.fromEntries(
  ENV_KEYS.map((key) => [key, process.env[key]]),
);

function enrichmentRequest(
  source: BrDataSource = 'cep',
  index = 1,
): BrDataEnrichmentRequest {
  return {
    brDataId: `br-data-${index}`,
    userId: 'user-1',
    source,
    document: source === 'cep' ? '01001-000' : '19131243000197',
  };
}

function fakeJob(
  id: string,
  state: string,
  overrides: Record<string, unknown> = {},
) {
  const source = id.split('-')[0] as BrDataSource;

  return {
    id,
    data: enrichmentRequest(source),
    attemptsMade: 0,
    opts: { attempts: 3 },
    returnvalue: undefined as unknown,
    failedReason: undefined as string | undefined,
    timestamp: Date.parse('2026-09-14T19:00:00.000Z'),
    processedOn: undefined as number | undefined,
    finishedOn: undefined as number | undefined,
    getState: jest.fn().mockResolvedValue(state),
    waitUntilFinished: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

type FakeJob = ReturnType<typeof fakeJob>;

function withJobs(queue: MockQueueInstance, jobs: FakeJob[]): void {
  queue.getJob.mockImplementation(async (id: string) =>
    jobs.find((job) => job.id === id),
  );
}

const flush = async () => {
  for (let i = 0; i < 5; i++) {
    await new Promise((resolve) => setImmediate(resolve));
  }
};

function setup() {
  const provider = new BullMqBrDataEnrichmentProvider();
  const [cepQueue, cnpjQueue] = mockQueues;
  const [cepEvents, cnpjEvents] = mockQueueEvents;

  return {
    provider,
    cepQueue: cepQueue!,
    cnpjQueue: cnpjQueue!,
    cepEvents: cepEvents!,
    cnpjEvents: cnpjEvents!,
  };
}

describe('BullMqBrDataEnrichmentProvider', () => {
  beforeEach(() => {
    mockQueues.length = 0;
    mockQueueEvents.length = 0;
    for (const key of ENV_KEYS) delete process.env[key];
  });

  afterEach(() => {
    for (const key of ENV_KEYS) {
      if (ORIGINAL_ENV[key] === undefined) delete process.env[key];
      else process.env[key] = ORIGINAL_ENV[key];
    }
  });

  describe('filas', () => {
    it('cria uma fila e um QueueEvents por API, com conexao, prefixo e opcoes de job padrao', () => {
      const { cepQueue, cnpjQueue, cepEvents, cnpjEvents } = setup();

      expect(cepQueue.name).toBe('br-data-cep');
      expect(cnpjQueue.name).toBe('br-data-cnpj');
      expect(cepEvents.name).toBe('br-data-cep');
      expect(cnpjEvents.name).toBe('br-data-cnpj');
      expect(cepQueue.opts).toEqual({
        connection: {
          host: 'localhost',
          port: 6389,
          maxRetriesPerRequest: null,
        },
        prefix: 'bull',
        defaultJobOptions: expect.objectContaining({
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
        }),
      });
      expect(cnpjEvents.opts).toEqual({
        connection: {
          host: 'localhost',
          port: 6389,
          maxRetriesPerRequest: null,
        },
        prefix: 'bull',
      });
    });

    it('le host, porta e prefixo do ambiente', () => {
      process.env.REDIS_HOST = ' redis ';
      process.env.REDIS_PORT = '6380';
      process.env.BR_DATA_QUEUE_PREFIX = 'br-data-test';

      const { cepQueue } = setup();

      expect(cepQueue.opts).toMatchObject({
        connection: { host: 'redis', port: 6380 },
        prefix: 'br-data-test',
      });
    });
  });

  describe('enqueue', () => {
    it('adiciona o job na fila da API com jobId prefixado pela fonte', async () => {
      const { provider, cepQueue, cnpjQueue } = setup();
      const request = enrichmentRequest('cep');

      const jobId = await provider.enqueue(request);

      expect(jobId).toMatch(
        /^cep-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
      );
      expect(cepQueue.add).toHaveBeenCalledWith('cep', request, { jobId });
      expect(cnpjQueue.add).not.toHaveBeenCalled();
    });

    it('enfileira varias requisicoes simultaneas com jobIds unicos, cada uma na fila da sua API', async () => {
      const { provider, cepQueue, cnpjQueue } = setup();
      const sources: BrDataSource[] = [
        'cep',
        'cnpj',
        'cep',
        'cep',
        'cnpj',
        'cep',
      ];

      const jobIds = await Promise.all(
        sources.map((source, index) =>
          provider.enqueue(enrichmentRequest(source, index)),
        ),
      );

      expect(new Set(jobIds).size).toBe(6);
      expect(cepQueue.add).toHaveBeenCalledTimes(4);
      expect(cnpjQueue.add).toHaveBeenCalledTimes(2);
      jobIds.forEach((jobId, index) =>
        expect(jobId.startsWith(`${sources[index]}-`)).toBe(true),
      );
    });
  });

  describe('isRateLimited', () => {
    it('consulta o TTL do limiter com o max da API e so considera limitado com TTL > 0', async () => {
      process.env.BRASILAPI_RATE_LIMIT_MAX = '2';
      const { provider, cepQueue, cnpjQueue } = setup();
      cnpjQueue.getRateLimitTtl.mockResolvedValue(1500);

      await expect(provider.isRateLimited('cep')).resolves.toBe(false);
      await expect(provider.isRateLimited('cnpj')).resolves.toBe(true);
      expect(cepQueue.getRateLimitTtl).toHaveBeenCalledWith(30);
      expect(cnpjQueue.getRateLimitTtl).toHaveBeenCalledWith(2);
    });
  });

  describe('waitForJobs', () => {
    it.each([['waiting'], ['delayed'], ['prioritized']])(
      'nao espera job %s quando a janela da fila esta esgotada',
      async (state) => {
        const { provider, cnpjQueue } = setup();
        const job = fakeJob('cnpj-1', state);
        withJobs(cnpjQueue, [job]);
        cnpjQueue.getRateLimitTtl.mockResolvedValue(2000);

        await provider.waitForJobs(
          [{ source: 'cnpj', jobId: 'cnpj-1' }],
          15_000,
        );

        expect(job.waitUntilFinished).not.toHaveBeenCalled();
      },
    );

    it('espera o job ativo mesmo com TTL > 0: foi ele que ocupou a ultima vaga da janela', async () => {
      const { provider, cnpjQueue, cnpjEvents } = setup();
      const job = fakeJob('cnpj-1', 'active');
      withJobs(cnpjQueue, [job]);
      cnpjQueue.getRateLimitTtl.mockResolvedValue(2000);

      await provider.waitForJobs([{ source: 'cnpj', jobId: 'cnpj-1' }], 15_000);

      expect(job.waitUntilFinished).toHaveBeenCalledWith(cnpjEvents, 15_000);
    });

    it('le o TTL antes do estado: o worker pegar o job entre as leituras nao vira falso rate-limit', async () => {
      const { provider, cnpjQueue, cnpjEvents } = setup();
      let current = 'waiting';
      const job = fakeJob('cnpj-1', 'waiting', {
        getState: jest.fn(async () => current),
      });
      withJobs(cnpjQueue, [job]);
      // enquanto o TTL é lido, o worker pega este job e ocupa a última vaga
      cnpjQueue.getRateLimitTtl.mockImplementation(async () => {
        current = 'active';
        return 3000;
      });

      await provider.waitForJobs([{ source: 'cnpj', jobId: 'cnpj-1' }], 15_000);

      expect(
        cnpjQueue.getRateLimitTtl.mock.invocationCallOrder[0],
      ).toBeLessThan(job.getState.mock.invocationCallOrder[0]!);
      expect(job.waitUntilFinished).toHaveBeenCalledWith(cnpjEvents, 15_000);
    });

    it('nao consulta o estado quando a janela ainda tem vaga', async () => {
      const { provider, cepQueue } = setup();
      const job = fakeJob('cep-1', 'waiting');
      withJobs(cepQueue, [job]);

      await provider.waitForJobs([{ source: 'cep', jobId: 'cep-1' }], 800);

      expect(job.getState).not.toHaveBeenCalled();
      expect(job.waitUntilFinished).toHaveBeenCalledTimes(1);
    });

    it('espera job na fila quando a janela ainda tem vaga', async () => {
      const { provider, cepQueue, cepEvents } = setup();
      const job = fakeJob('cep-1', 'waiting');
      withJobs(cepQueue, [job]);

      await provider.waitForJobs([{ source: 'cep', jobId: 'cep-1' }], 800);

      expect(job.waitUntilFinished).toHaveBeenCalledWith(cepEvents, 800);
    });

    it('nao espera com timeout 0 nem job inexistente', async () => {
      const { provider, cepQueue } = setup();
      const job = fakeJob('cep-1', 'waiting');
      withJobs(cepQueue, [job]);

      await provider.waitForJobs(
        [
          { source: 'cep', jobId: 'cep-1' },
          { source: 'cep', jobId: 'cep-removido' },
        ],
        0,
      );

      expect(job.getState).not.toHaveBeenCalled();
      expect(job.waitUntilFinished).not.toHaveBeenCalled();
    });

    it('nao interrompe a resposta quando o job falha ou o tempo esgota', async () => {
      const { provider, cepQueue } = setup();
      withJobs(cepQueue, [
        fakeJob('cep-1', 'active', {
          waitUntilFinished: jest
            .fn()
            .mockRejectedValue(
              new Error('Job wait timed out before finishing'),
            ),
        }),
      ]);

      await expect(
        provider.waitForJobs([{ source: 'cep', jobId: 'cep-1' }], 100),
      ).resolves.toBeUndefined();
    });

    it('espera os jobs de CEP e CNPJ em paralelo, sem um aguardar o outro', async () => {
      const { provider, cepQueue, cnpjQueue } = setup();
      const releases: (() => void)[] = [];
      const pending = () =>
        jest.fn(() => new Promise<void>((resolve) => releases.push(resolve)));
      const cepJob = fakeJob('cep-1', 'active', {
        waitUntilFinished: pending(),
      });
      const cnpjJob = fakeJob('cnpj-1', 'waiting', {
        waitUntilFinished: pending(),
      });
      withJobs(cepQueue, [cepJob]);
      withJobs(cnpjQueue, [cnpjJob]);

      const waiting = provider.waitForJobs(
        [
          { source: 'cep', jobId: 'cep-1' },
          { source: 'cnpj', jobId: 'cnpj-1' },
        ],
        15_000,
      );
      await flush();

      // nenhum terminou ainda, e os dois já estão sendo aguardados
      expect(cepJob.waitUntilFinished).toHaveBeenCalledTimes(1);
      expect(cnpjJob.waitUntilFinished).toHaveBeenCalledTimes(1);

      releases.forEach((release) => release());
      await waiting;
    });

    it('com varias requisicoes simultaneas, so espera os jobs que o limiter ja deixou passar', async () => {
      const { provider, cnpjQueue } = setup();
      // janela de 3 vagas esgotada: 2 jobs concluídos, 1 ativo, 7 seguros na espera
      const states = [
        'completed',
        'completed',
        'active',
        ...Array.from({ length: 7 }, () => 'waiting'),
      ];
      const jobs = states.map((state, index) =>
        fakeJob(`cnpj-${index + 1}`, state),
      );
      withJobs(cnpjQueue, jobs);
      cnpjQueue.getRateLimitTtl.mockResolvedValue(45_000);

      await Promise.all(
        jobs.map((job) =>
          provider.waitForJobs([{ source: 'cnpj', jobId: job.id }], 15_000),
        ),
      );

      const waited = jobs.filter(
        (job) => job.waitUntilFinished.mock.calls.length > 0,
      );

      expect(waited.map((job) => job.id)).toEqual([
        'cnpj-1',
        'cnpj-2',
        'cnpj-3',
      ]);
      expect(cnpjQueue.getRateLimitTtl).toHaveBeenCalledTimes(10);
    });
  });

  describe('findJob', () => {
    it.each([['semprefixo'], ['cpf-123']])(
      'devolve null sem consultar fila para jobId %s',
      async (jobId) => {
        const { provider, cepQueue, cnpjQueue } = setup();

        await expect(provider.findJob(jobId)).resolves.toBeNull();
        expect(cepQueue.getJob).not.toHaveBeenCalled();
        expect(cnpjQueue.getJob).not.toHaveBeenCalled();
      },
    );

    it('devolve null quando o job nao existe mais na fila', async () => {
      const { provider, cnpjQueue } = setup();

      await expect(provider.findJob('cnpj-removido')).resolves.toBeNull();
      expect(cnpjQueue.getJob).toHaveBeenCalledWith('cnpj-removido');
    });

    it('mapeia um job concluido', async () => {
      const { provider, cepQueue } = setup();
      withJobs(cepQueue, [
        fakeJob('cep-1', 'completed', {
          attemptsMade: 1,
          returnvalue: { status: 'completed' },
          failedReason: '',
          processedOn: Date.parse('2026-09-14T19:00:01.000Z'),
          finishedOn: Date.parse('2026-09-14T19:00:02.000Z'),
        }),
      ]);

      await expect(provider.findJob('cep-1')).resolves.toEqual({
        jobId: 'cep-1',
        source: 'cep',
        state: 'completed',
        request: enrichmentRequest('cep'),
        attemptsMade: 1,
        maxAttempts: 3,
        rateLimited: false,
        result: { status: 'completed' },
        failedReason: null,
        createdAt: new Date('2026-09-14T19:00:00.000Z'),
        processedAt: new Date('2026-09-14T19:00:01.000Z'),
        finishedAt: new Date('2026-09-14T19:00:02.000Z'),
      });
    });

    it('marca rateLimited so para job na espera com a janela esgotada', async () => {
      const { provider, cnpjQueue } = setup();
      withJobs(cnpjQueue, [
        fakeJob('cnpj-1', 'waiting'),
        fakeJob('cnpj-2', 'active'),
        fakeJob('cnpj-3', 'failed', {
          opts: {},
          failedReason: 'cnpj.provider.failed',
        }),
      ]);
      cnpjQueue.getRateLimitTtl.mockResolvedValue(30_000);

      const [waiting, active, failed] = await Promise.all([
        provider.findJob('cnpj-1'),
        provider.findJob('cnpj-2'),
        provider.findJob('cnpj-3'),
      ]);

      expect(waiting).toMatchObject({ state: 'waiting', rateLimited: true });
      expect(active).toMatchObject({ state: 'active', rateLimited: false });
      expect(failed).toMatchObject({
        state: 'failed',
        rateLimited: false,
        maxAttempts: 1,
        failedReason: 'cnpj.provider.failed',
        result: null,
      });
    });
  });

  it('fecha filas e QueueEvents ao encerrar o modulo', async () => {
    const { provider } = setup();

    await provider.onModuleDestroy();

    for (const instance of [...mockQueues, ...mockQueueEvents]) {
      expect(instance.close).toHaveBeenCalledTimes(1);
    }
  });
});
