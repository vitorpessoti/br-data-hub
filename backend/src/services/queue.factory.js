import { Queue, Worker, UnrecoverableError } from 'bullmq';
import { getRedisClient, workerRedisConfig } from '../config/redis.config.js';

// Retries only transient failures (external API down/timeout, database errors).
export const DEFAULT_JOB_OPTIONS = {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: { age: 24 * 60 * 60, count: 1000 },
    removeOnFail: { age: 7 * 24 * 60 * 60 },
};

const queues = new Map();

// One Queue instance per name, sharing the HTTP side Redis connection.
export const getQueue = name => {
    if (!queues.has(name)) {
        queues.set(name, new Queue(name, { connection: getRedisClient(), defaultJobOptions: DEFAULT_JOB_OPTIONS }));
    }
    return queues.get(name);
};

export const closeQueues = async () => {
    await Promise.all([...queues.values()].map(queue => queue.close()));
    queues.clear();
};

// Client errors (4xx, e.g. document not found on the external API) will not change on a retry.
export const isRetryable = error => !(error.status >= 400 && error.status < 500);

// Worker of an enrichment queue. Before calling the external API it takes a slot of the same
// rate limiter used by the HTTP requests; without one, the whole queue waits for the next window.
export const createEnrichmentWorker = ({ queueName, rateLimiter, limits, process }) => {
    const processor = async job => {
        const slot = await rateLimiter.tryAcquire();
        if (!slot.allowed) {
            await getQueue(queueName).rateLimit(slot.retryAfterMs);
            throw Worker.RateLimitError();
        }

        const lastAttempt = job.attemptsMade + 1 >= (job.opts.attempts ?? 1);
        try {
            return await process(job.data, { jobId: job.id, lastAttempt });
        } catch (error) {
            if (!isRetryable(error)) throw new UnrecoverableError(error.message);
            throw error;
        }
    };

    return new Worker(queueName, processor, {
        connection: workerRedisConfig,
        concurrency: limits.concurrency,
        limiter: { max: limits.max, duration: limits.duration },
    });
};
