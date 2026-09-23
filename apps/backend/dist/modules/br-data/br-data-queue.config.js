"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BR_DATA_JOB_OPTIONS = exports.BR_DATA_QUEUE_NAMES = void 0;
exports.resolveRateLimit = resolveRateLimit;
exports.resolveRedisConnection = resolveRedisConnection;
exports.resolveQueuePrefix = resolveQueuePrefix;
exports.resolveSyncWaitMs = resolveSyncWaitMs;
exports.resolveRateLimitBackoffMs = resolveRateLimitBackoffMs;
exports.BR_DATA_QUEUE_NAMES = {
    cep: 'br-data-cep',
    cnpj: 'br-data-cnpj',
};
const DEFAULT_RATE_LIMITS = {
    cep: { max: 30, duration: 60_000 },
    cnpj: { max: 10, duration: 60_000 },
};
const RATE_LIMIT_ENV_PREFIX = {
    cep: 'VIACEP',
    cnpj: 'BRASILAPI',
};
const DEFAULT_QUEUE_PREFIX = 'bull';
const DEFAULT_REDIS_PORT = 6389;
const DEFAULT_SYNC_WAIT_MS = 15_000;
const DEFAULT_RATE_LIMIT_BACKOFF_MS = 60_000;
exports.BR_DATA_JOB_OPTIONS = {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5_000 },
    removeOnComplete: { age: 24 * 60 * 60 },
    removeOnFail: { age: 7 * 24 * 60 * 60 },
};
function resolveRateLimit(source) {
    const prefix = RATE_LIMIT_ENV_PREFIX[source];
    const fallback = DEFAULT_RATE_LIMITS[source];
    return {
        max: readInteger(`${prefix}_RATE_LIMIT_MAX`, fallback.max, 1),
        duration: readInteger(`${prefix}_RATE_LIMIT_DURATION_MS`, fallback.duration, 1),
    };
}
function resolveRedisConnection() {
    return {
        host: process.env.REDIS_HOST?.trim() || 'localhost',
        port: readInteger('REDIS_PORT', DEFAULT_REDIS_PORT, 1),
        maxRetriesPerRequest: null,
    };
}
function resolveQueuePrefix() {
    return process.env.BR_DATA_QUEUE_PREFIX?.trim() || DEFAULT_QUEUE_PREFIX;
}
function resolveSyncWaitMs() {
    return readInteger('BR_DATA_SYNC_WAIT_MS', DEFAULT_SYNC_WAIT_MS, 0);
}
function resolveRateLimitBackoffMs() {
    return readInteger('BR_DATA_RATE_LIMIT_BACKOFF_MS', DEFAULT_RATE_LIMIT_BACKOFF_MS, 1);
}
function readInteger(name, fallback, min) {
    const value = Number(process.env[name]?.trim() || Number.NaN);
    return Number.isInteger(value) && value >= min ? value : fallback;
}
//# sourceMappingURL=br-data-queue.config.js.map