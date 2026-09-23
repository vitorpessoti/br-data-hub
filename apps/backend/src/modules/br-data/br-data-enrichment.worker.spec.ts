import { Logger } from '@nestjs/common';
import type { BrDataEnrichmentRequest } from '@br-data-hub/br-data';
import {
  BrDataEnrichmentProcessor,
  BrDataRateLimitedError,
} from './br-data-enrichment.processor';
import { BrDataEnrichmentWorker } from './br-data-enrichment.worker';

type MockJob = { id: string; data: BrDataEnrichmentRequest };

interface MockWorkerInstance {
  name: string;
  processor: (job: MockJob) => Promise<unknown>;
  opts: Record<string, unknown>;
  handlers: Map<string, (...args: unknown[]) => void>;
  rateLimit: jest.Mock;
  close: jest.Mock;
}

const mockWorkers: MockWorkerInstance[] = [];
const RATE_LIMIT_ERROR = new Error('bullmq:rateLimitExceeded');

// Substitui o Worker do BullMQ: guarda a função de processamento e as opções
// para o teste chamar os jobs diretamente, sem Redis.
jest.mock('bullmq', () => {
  class MockWorker {
    static RateLimitError = jest.fn(() => RATE_LIMIT_ERROR);
    handlers = new Map<string, (...args: unknown[]) => void>();
    rateLimit = jest.fn().mockResolvedValue(undefined);
    close = jest.fn().mockResolvedValue(undefined);

    constructor(
      readonly name: string,
      readonly processor: (job: unknown) => Promise<unknown>,
      readonly opts: Record<string, unknown>,
    ) {
      mockWorkers.push(this as unknown as MockWorkerInstance);
    }

    on(event: string, handler: (...args: unknown[]) => void) {
      this.handlers.set(event, handler);
      return this;
    }
  }

  return { Worker: MockWorker, UnrecoverableError: class extends Error {} };
});

const ENV_KEYS = [
  'VIACEP_RATE_LIMIT_MAX',
  'VIACEP_RATE_LIMIT_DURATION_MS',
  'BRASILAPI_RATE_LIMIT_MAX',
  'BRASILAPI_RATE_LIMIT_DURATION_MS',
  'BR_DATA_RATE_LIMIT_BACKOFF_MS',
  'BR_DATA_QUEUE_PREFIX',
];
const ORIGINAL_ENV = Object.fromEntries(
  ENV_KEYS.map((key) => [key, process.env[key]]),
);

function job(index: number, source: 'cep' | 'cnpj' = 'cep'): MockJob {
  return {
    id: `${source}-job-${index}`,
    data: {
      brDataId: `br-data-${index}`,
      userId: 'user-1',
      source,
      document: source === 'cep' ? '01001-000' : '19131243000197',
    },
  };
}

function setup() {
  const processor = { process: jest.fn() };
  const worker = new BrDataEnrichmentWorker(
    processor as unknown as BrDataEnrichmentProcessor,
  );

  worker.onModuleInit();

  const [cepWorker, cnpjWorker] = mockWorkers;

  return { worker, processor, cepWorker: cepWorker!, cnpjWorker: cnpjWorker! };
}

describe('BrDataEnrichmentWorker', () => {
  let loggerWarnMock: jest.SpyInstance;
  let loggerErrorMock: jest.SpyInstance;

  beforeEach(() => {
    mockWorkers.length = 0;
    for (const key of ENV_KEYS) delete process.env[key];
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    loggerWarnMock = jest
      .spyOn(Logger.prototype, 'warn')
      .mockImplementation(() => undefined);
    loggerErrorMock = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    for (const key of ENV_KEYS) {
      if (ORIGINAL_ENV[key] === undefined) delete process.env[key];
      else process.env[key] = ORIGINAL_ENV[key];
    }
  });

  describe('configuracao das filas', () => {
    it('cria um worker por API, com concorrencia 1 e os limites padrao', () => {
      const { cepWorker, cnpjWorker } = setup();

      expect(mockWorkers).toHaveLength(2);
      expect(cepWorker.name).toBe('br-data-cep');
      expect(cepWorker.opts).toMatchObject({
        concurrency: 1,
        prefix: 'bull',
        limiter: { max: 30, duration: 60_000 },
        connection: { maxRetriesPerRequest: null },
      });
      expect(cnpjWorker.name).toBe('br-data-cnpj');
      expect(cnpjWorker.opts).toMatchObject({
        concurrency: 1,
        limiter: { max: 10, duration: 60_000 },
      });
    });

    it('le os limites e o prefixo do ambiente, cada API com o seu', () => {
      process.env.VIACEP_RATE_LIMIT_MAX = '5';
      process.env.VIACEP_RATE_LIMIT_DURATION_MS = '1000';
      process.env.BRASILAPI_RATE_LIMIT_MAX = '2';
      process.env.BRASILAPI_RATE_LIMIT_DURATION_MS = '3000';
      process.env.BR_DATA_QUEUE_PREFIX = 'br-data-test';

      const { cepWorker, cnpjWorker } = setup();

      expect(cepWorker.opts).toMatchObject({
        prefix: 'br-data-test',
        limiter: { max: 5, duration: 1000 },
      });
      expect(cnpjWorker.opts).toMatchObject({
        prefix: 'br-data-test',
        limiter: { max: 2, duration: 3000 },
      });
    });

    it('ignora limites invalidos no ambiente e usa o padrao', () => {
      process.env.VIACEP_RATE_LIMIT_MAX = '0';
      process.env.VIACEP_RATE_LIMIT_DURATION_MS = 'abc';

      const { cepWorker } = setup();

      expect(cepWorker.opts).toMatchObject({
        limiter: { max: 30, duration: 60_000 },
      });
    });
  });

  describe('processamento', () => {
    it('repassa o job ao processor e devolve o resultado', async () => {
      const { processor, cepWorker } = setup();
      processor.process.mockResolvedValue({ status: 'completed' });

      await expect(cepWorker.processor(job(1))).resolves.toEqual({
        status: 'completed',
      });
      expect(processor.process).toHaveBeenCalledWith(job(1));
      expect(cepWorker.rateLimit).not.toHaveBeenCalled();
    });

    it('pausa a fila pelo backoff e devolve o job para a espera quando a API responde 429', async () => {
      process.env.BR_DATA_RATE_LIMIT_BACKOFF_MS = '1500';
      const { processor, cnpjWorker, cepWorker } = setup();
      processor.process.mockRejectedValue(
        new BrDataRateLimitedError('cnpj.provider.rate.limited'),
      );

      await expect(cnpjWorker.processor(job(1, 'cnpj'))).rejects.toBe(
        RATE_LIMIT_ERROR,
      );

      expect(cnpjWorker.rateLimit).toHaveBeenCalledWith(1500);
      // a pausa é só da fila da API que limitou
      expect(cepWorker.rateLimit).not.toHaveBeenCalled();
      expect(loggerWarnMock).toHaveBeenCalledWith(
        expect.stringContaining('Fila cnpj pausada por 1500ms'),
      );
    });

    it('com varios jobs simultaneos, so os que receberam 429 pausam a fila e voltam para a espera', async () => {
      const { processor, cepWorker } = setup();
      const rateLimited = new Set(['cep-job-2', 'cep-job-4', 'cep-job-5']);
      processor.process.mockImplementation(async (current: MockJob) => {
        await new Promise((resolve) => setImmediate(resolve));

        if (rateLimited.has(current.id)) {
          throw new BrDataRateLimitedError('cep.provider.rate.limited');
        }

        return { status: 'completed' };
      });

      const results = await Promise.allSettled(
        [1, 2, 3, 4, 5, 6].map((index) => cepWorker.processor(job(index))),
      );

      expect(results.map((result) => result.status)).toEqual([
        'fulfilled',
        'rejected',
        'fulfilled',
        'rejected',
        'rejected',
        'fulfilled',
      ]);
      for (const result of results) {
        if (result.status === 'rejected') {
          expect(result.reason).toBe(RATE_LIMIT_ERROR);
        }
      }
      expect(cepWorker.rateLimit).toHaveBeenCalledTimes(3);
      expect(processor.process).toHaveBeenCalledTimes(6);
    });

    it('propaga outros erros sem pausar a fila', async () => {
      const { processor, cepWorker } = setup();
      const failure = new Error('cep.provider.failed');
      processor.process.mockRejectedValue(failure);

      await expect(cepWorker.processor(job(1))).rejects.toBe(failure);
      expect(cepWorker.rateLimit).not.toHaveBeenCalled();
    });
  });

  describe('eventos e encerramento', () => {
    it('registra jobs com falha e erros do worker no log', () => {
      const { cepWorker } = setup();

      cepWorker.handlers.get('failed')!({ id: 'cep-job-1' }, new Error('boom'));
      cepWorker.handlers.get('failed')!(undefined, new Error('sem job'));
      cepWorker.handlers.get('error')!(new Error('redis caiu'));

      expect(loggerWarnMock).toHaveBeenCalledWith(
        'Job cep-job-1 (cep) falhou: boom',
      );
      expect(loggerWarnMock).toHaveBeenCalledWith(
        'Job undefined (cep) falhou: sem job',
      );
      expect(loggerErrorMock).toHaveBeenCalledWith('Worker cep: redis caiu');
    });

    it('fecha todos os workers ao encerrar o modulo', async () => {
      const { worker, cepWorker, cnpjWorker } = setup();

      await worker.onModuleDestroy();

      expect(cepWorker.close).toHaveBeenCalledTimes(1);
      expect(cnpjWorker.close).toHaveBeenCalledTimes(1);
    });
  });
});
