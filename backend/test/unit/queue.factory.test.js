import { jest } from '@jest/globals';

const queueInstances = [];
const workerInstances = [];
const rateLimitError = new Error('bullmq:rateLimitExceeded');
const redisClient = { name: 'shared client' };

class QueueMock {
    constructor(name, options) {
        this.name = name;
        this.options = options;
        this.rateLimit = jest.fn();
        this.close = jest.fn();
        queueInstances.push(this);
    }
}

class WorkerMock {
    static RateLimitError() {
        return rateLimitError;
    }

    constructor(name, processor, options) {
        this.name = name;
        this.processor = processor;
        this.options = options;
        workerInstances.push(this);
    }
}

class UnrecoverableErrorMock extends Error {}

jest.unstable_mockModule('bullmq', () => ({
    Queue: QueueMock,
    Worker: WorkerMock,
    UnrecoverableError: UnrecoverableErrorMock,
}));
jest.unstable_mockModule('../../src/config/redis.config.js', () => ({
    getRedisClient: () => redisClient,
    workerRedisConfig: { host: 'localhost', port: 6379, maxRetriesPerRequest: null },
}));

const { getQueue, closeQueues, createEnrichmentWorker, isRetryable, DEFAULT_JOB_OPTIONS } =
    await import('../../src/services/queue.factory.js');

const limits = { max: 3, duration: 1000, concurrency: 2 };
const job = (overrides = {}) => ({ id: 'job-1', data: { cep: '01001000' }, attemptsMade: 0, opts: { attempts: 3 }, ...overrides });
const httpError = status => Object.assign(new Error(`http ${status}`), { status });

afterEach(async () => {
    await closeQueues();
    queueInstances.length = 0;
    workerInstances.length = 0;
});

describe('# queue.factory - getQueue', () => {
    it('should create the queue once, with the shared connection and the default job options', () => {
        const queue = getQueue('cep-enrichment');

        expect(getQueue('cep-enrichment')).toBe(queue);
        expect(queueInstances).toHaveLength(1);
        expect(queue.options).toEqual({ connection: redisClient, defaultJobOptions: DEFAULT_JOB_OPTIONS });
    });

    it('should close every queue and forget them', async () => {
        const queue = getQueue('cep-enrichment');

        await closeQueues();

        expect(queue.close).toHaveBeenCalled();
        expect(getQueue('cep-enrichment')).not.toBe(queue);
    });

    it('should retry the transient failures only', () => {
        expect(DEFAULT_JOB_OPTIONS.attempts).toBeGreaterThan(1);
        expect(isRetryable(httpError(502))).toBe(true);
        expect(isRetryable(new Error('database offline'))).toBe(true);
        expect(isRetryable(httpError(404))).toBe(false);
        expect(isRetryable(httpError(400))).toBe(false);
    });
});

describe('# queue.factory - createEnrichmentWorker', () => {
    let rateLimiter;
    let process;
    let worker;

    beforeEach(() => {
        rateLimiter = { tryAcquire: jest.fn().mockResolvedValue({ allowed: true }) };
        process = jest.fn().mockResolvedValue('done');
        worker = createEnrichmentWorker({ queueName: 'cep-enrichment', rateLimiter, limits, process });
    });

    it('should create the worker with the rate limit and concurrency of the API', () => {
        expect(worker.name).toBe('cep-enrichment');
        expect(worker.options).toEqual({
            connection: { host: 'localhost', port: 6379, maxRetriesPerRequest: null },
            concurrency: 2,
            limiter: { max: 3, duration: 1000 },
        });
    });

    it('should process the job when the rate limiter has a slot', async () => {
        await expect(worker.processor(job())).resolves.toBe('done');
        expect(process).toHaveBeenCalledWith({ cep: '01001000' }, { jobId: 'job-1', lastAttempt: false });
    });

    it('should flag the last attempt', async () => {
        await worker.processor(job({ attemptsMade: 2 }));

        expect(process).toHaveBeenCalledWith({ cep: '01001000' }, { jobId: 'job-1', lastAttempt: true });
    });

    it('should treat a job without attempts as its last attempt', async () => {
        await worker.processor(job({ opts: {} }));

        expect(process).toHaveBeenCalledWith({ cep: '01001000' }, { jobId: 'job-1', lastAttempt: true });
    });

    it('should rate limit the queue and put the job back when there is no slot', async () => {
        rateLimiter.tryAcquire.mockResolvedValue({ allowed: false, retryAfterMs: 400 });

        await expect(worker.processor(job())).rejects.toBe(rateLimitError);
        expect(getQueue('cep-enrichment').rateLimit).toHaveBeenCalledWith(400);
        expect(process).not.toHaveBeenCalled();
    });

    it('should rethrow transient failures so BullMQ retries them', async () => {
        const error = httpError(504);
        process.mockRejectedValue(error);

        await expect(worker.processor(job())).rejects.toBe(error);
    });

    it('should turn client errors into unrecoverable errors', async () => {
        process.mockRejectedValue(httpError(404));

        const failure = worker.processor(job());

        await expect(failure).rejects.toBeInstanceOf(UnrecoverableErrorMock);
        await expect(failure).rejects.toThrow('http 404');
    });
});
