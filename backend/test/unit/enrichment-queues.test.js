import { jest } from '@jest/globals';

const queueAddMock = jest.fn();
const createEnrichmentWorkerMock = jest.fn(options => ({ options }));

jest.unstable_mockModule('../../src/services/prisma.service.js', () => ({ default: {} }));
jest.unstable_mockModule('../../src/services/queue.factory.js', () => ({
    getQueue: name => ({ name, add: queueAddMock }),
    createEnrichmentWorker: createEnrichmentWorkerMock,
    isRetryable: () => true,
}));

const { default: CepQueue } = await import('../../src/modules/cep/cep.queue.js');
const { default: CnpjQueue } = await import('../../src/modules/cnpj/cnpj.queue.js');
const { startCepWorker } = await import('../../src/modules/cep/cep.worker.js');
const { startCnpjWorker } = await import('../../src/modules/cnpj/cnpj.worker.js');
const { default: CepService } = await import('../../src/modules/cep/cep.service.js');
const { default: CnpjService } = await import('../../src/modules/cnpj/cnpj.service.js');
const { default: RateLimiterService } = await import('../../src/services/rate-limiter.service.js');
const { RateLimitConfig } = await import('../../src/config/rate-limit.config.js');

const JOB_ID = '7f1c2d3e-4b5a-4c6d-8e7f-9a0b1c2d3e4f';

describe.each([
    {
        type: 'cep',
        document: '01001000',
        Queue: CepQueue,
        startWorker: startCepWorker,
        Service: CepService,
        queueName: 'cep-enrichment',
        jobName: 'enrich-cep',
        limiterKey: 'rate-limit:viacep',
        limits: RateLimitConfig.VIACEP,
    },
    {
        type: 'cnpj',
        document: '19131243000197',
        Queue: CnpjQueue,
        startWorker: startCnpjWorker,
        Service: CnpjService,
        queueName: 'cnpj-enrichment',
        jobName: 'enrich-cnpj',
        limiterKey: 'rate-limit:brasilapi',
        limits: RateLimitConfig.BRASILAPI,
    },
])('# $type enrichment queue', ({ type, document, Queue, startWorker, Service, queueName, jobName, limiterKey, limits }) => {
    it('should add the job with the document and the given jobId', async () => {
        queueAddMock.mockResolvedValue({ id: JOB_ID });

        await expect(new Queue().add(document, JOB_ID)).resolves.toEqual({ id: JOB_ID });
        expect(queueAddMock).toHaveBeenCalledWith(jobName, { [type]: document }, { jobId: JOB_ID });
    });

    it('should start the worker with the API rate limiter and limits', () => {
        const { options } = startWorker();

        expect(options.queueName).toBe(queueName);
        expect(options.limits).toBe(limits);
        expect(options.rateLimiter).toBeInstanceOf(RateLimiterService);
        expect(options.rateLimiter).toMatchObject({ key: limiterKey, max: limits.max, duration: limits.duration });
    });

    it('should process the job data with the module service', async () => {
        const service = { processJob: jest.fn().mockResolvedValue('record') };
        const { options } = startWorker({ service });

        await expect(options.process({ [type]: document }, { lastAttempt: true })).resolves.toBe('record');
        expect(service.processJob).toHaveBeenCalledWith(document, { lastAttempt: true });
    });

    it('should use the module service by default', () => {
        const { options } = startWorker();
        const processJob = jest.spyOn(Service.prototype, 'processJob').mockResolvedValue('record');

        options.process({ [type]: document }, {});

        expect(processJob).toHaveBeenCalledWith(document, {});
        processJob.mockRestore();
    });
});

describe('# rate limit config', () => {
    it.each(['VIACEP', 'BRASILAPI'])('should have a positive limit for %s', api => {
        expect(RateLimitConfig[api]).toEqual({
            max: expect.any(Number),
            duration: expect.any(Number),
            concurrency: expect.any(Number),
        });
        expect(RateLimitConfig[api].max).toBeGreaterThan(0);
    });
});
