import type { BrDataSource } from '@br-data-hub/br-data';
import type { ConnectionOptions, DefaultJobOptions } from 'bullmq';

export const BR_DATA_QUEUE_NAMES: Record<BrDataSource, string> = {
  cep: 'br-data-cep',
  cnpj: 'br-data-cnpj',
};

export interface BrDataRateLimit {
  max: number;
  duration: number;
}

// Nem a ViaCEP nem a BrasilAPI publicam um limite numérico: as duas bloqueiam
// "uso massivo" (a ViaCEP bloqueia o IP por tempo indeterminado; a BrasilAPI
// responde 429). Padrões conservadores, ajustáveis pelo .env.
const DEFAULT_RATE_LIMITS: Record<BrDataSource, BrDataRateLimit> = {
  cep: { max: 30, duration: 60_000 },
  cnpj: { max: 10, duration: 60_000 },
};

const RATE_LIMIT_ENV_PREFIX: Record<BrDataSource, string> = {
  cep: 'VIACEP',
  cnpj: 'BRASILAPI',
};

const DEFAULT_QUEUE_PREFIX = 'bull';
const DEFAULT_REDIS_PORT = 6389;
const DEFAULT_SYNC_WAIT_MS = 15_000;
const DEFAULT_RATE_LIMIT_BACKOFF_MS = 60_000;

// Rede/timeout/5xx são tentados de novo com backoff exponencial (5s, 10s).
// Jobs ficam guardados para a consulta por jobId: 1 dia concluídos, 7 dias com falha.
export const BR_DATA_JOB_OPTIONS: DefaultJobOptions = {
  attempts: 3,
  backoff: { type: 'exponential', delay: 5_000 },
  removeOnComplete: { age: 24 * 60 * 60 },
  removeOnFail: { age: 7 * 24 * 60 * 60 },
};

export function resolveRateLimit(source: BrDataSource): BrDataRateLimit {
  const prefix = RATE_LIMIT_ENV_PREFIX[source];
  const fallback = DEFAULT_RATE_LIMITS[source];

  return {
    max: readInteger(`${prefix}_RATE_LIMIT_MAX`, fallback.max, 1),
    duration: readInteger(
      `${prefix}_RATE_LIMIT_DURATION_MS`,
      fallback.duration,
      1,
    ),
  };
}

// maxRetriesPerRequest: null é exigido pelo BullMQ nas conexões de Worker.
export function resolveRedisConnection(): ConnectionOptions {
  return {
    host: process.env.REDIS_HOST?.trim() || 'localhost',
    port: readInteger('REDIS_PORT', DEFAULT_REDIS_PORT, 1),
    maxRetriesPerRequest: null,
  };
}

// Prefixo das chaves das filas no Redis. Os testes de integração usam um
// prefixo próprio para não disputar jobs com um backend de dev rodando.
export function resolveQueuePrefix(): string {
  return process.env.BR_DATA_QUEUE_PREFIX?.trim() || DEFAULT_QUEUE_PREFIX;
}

// Quanto o POST espera os jobs terminarem antes de devolver os jobIds.
export function resolveSyncWaitMs(): number {
  return readInteger('BR_DATA_SYNC_WAIT_MS', DEFAULT_SYNC_WAIT_MS, 0);
}

// Pausa da fila quando a fonte externa responde 429.
export function resolveRateLimitBackoffMs(): number {
  return readInteger(
    'BR_DATA_RATE_LIMIT_BACKOFF_MS',
    DEFAULT_RATE_LIMIT_BACKOFF_MS,
    1,
  );
}

function readInteger(name: string, fallback: number, min: number): number {
  const value = Number(process.env[name]?.trim() || Number.NaN);

  return Number.isInteger(value) && value >= min ? value : fallback;
}
