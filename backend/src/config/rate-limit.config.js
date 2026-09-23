import './env.js';

// Neither ViaCEP nor BrasilAPI publishes a numeric limit: ViaCEP only warns that massive use blocks
// the client indefinitely and BrasilAPI blocks abusive clients. The defaults are conservative
// (3 requests per second per API) and can be tuned through the .env.
const limit = (prefix, defaults) => ({
    max: Number(process.env[`${prefix}_RATE_LIMIT_MAX`]) || defaults.max,
    duration: Number(process.env[`${prefix}_RATE_LIMIT_DURATION_MS`]) || defaults.duration,
    concurrency: Number(process.env[`${prefix}_QUEUE_CONCURRENCY`]) || defaults.concurrency,
});

export const RateLimitConfig = {
    VIACEP: limit('VIACEP', { max: 3, duration: 1000, concurrency: 3 }),
    BRASILAPI: limit('BRASILAPI', { max: 3, duration: 1000, concurrency: 3 }),
};
