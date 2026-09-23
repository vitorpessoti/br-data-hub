// End-to-end: real HTTP app, PostgreSQL, Redis (BullMQ + rate limiter), ViaCEP and BrasilAPI.
// Run with: npm run test:e2e (requires: docker compose up -d redis)
import { jest } from '@jest/globals';
import httpStatus from 'http-status';
import app from '../../src/app.js';
import { authenticatedRequest } from '../helpers/auth.helper.js';
import prisma from '../../src/services/prisma.service.js';
import { getRedisClient, closeRedisClient } from '../../src/config/redis.config.js';
import { closeQueues } from '../../src/services/queue.factory.js';
import { RateLimitConfig } from '../../src/config/rate-limit.config.js';
import { createViaCepRateLimiter } from '../../src/modules/cep/cep.queue.js';
import { createBrasilApiRateLimiter } from '../../src/modules/cnpj/cnpj.queue.js';
import { startCepWorker } from '../../src/modules/cep/cep.worker.js';
import { startCnpjWorker } from '../../src/modules/cnpj/cnpj.worker.js';
import { CepConstants } from '../../src/modules/cep/cep.constants.js';
import { CnpjConstants } from '../../src/modules/cnpj/cnpj.constants.js';
import { JobConstants } from '../../src/modules/job/job.constants.js';

jest.setTimeout(60000);

// Well-known, stable CEPs and CNPJs (Banco do Brasil, Petrobras).

const api = authenticatedRequest(app);
const CEPS = ['01310100', '20040020', '30130010', '40010000', '70040010', '80010000'];
const CNPJS = ['00000000000191', '33000167000101'];
const UUID = expect.stringMatching(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);

const workers = [];

const removeTestData = () => Promise.all([
    prisma.cep.deleteMany({ where: { cep: { in: CEPS } } }),
    prisma.cnpj.deleteMany({ where: { cnpj: { in: CNPJS } } }),
]);

// Starts every test on a fresh rate limit window.
const resetRateLimits = () => getRedisClient().del(
    `rate-limit:${CepConstants.RATE_LIMIT_KEY}`,
    `rate-limit:${CnpjConstants.RATE_LIMIT_KEY}`
);

// Takes every slot of the current window, so the next request goes to the queue.
const exhaust = async limiter => {
    while ((await limiter.tryAcquire()).allowed);
};

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

const waitForJob = async (jobId, expectedStatus, timeoutMs = 30000) => {
    const deadline = Date.now() + timeoutMs;
    for (;;) {
        const response = await api.get(`/api/v1/jobs/${jobId}`);
        if (response.body.status === expectedStatus || Date.now() > deadline) return response;
        await sleep(250);
    }
};

beforeAll(removeTestData);
beforeEach(resetRateLimits);

afterAll(async () => {
    await Promise.all(workers.map(worker => worker.close()));
    await resetRateLimits();
    await removeTestData();
    await closeQueues();
    await closeRedisClient();
    await prisma.$disconnect();
});

describe('# Rate limit E2E - CEP (ViaCEP)', () => {
    it('should answer up to the limit directly and queue the rest of a burst with 202', async () => {
        const burst = CEPS.slice(0, RateLimitConfig.VIACEP.max + 2);

        const responses = await Promise.all(
            burst.map(cep => api.post('/api/v1/cep').send({ cep }))
        );

        const direct = responses.filter(response => response.status === httpStatus.CREATED);
        const queued = responses.filter(response => response.status === httpStatus.ACCEPTED);
        expect(direct).toHaveLength(RateLimitConfig.VIACEP.max);
        expect(queued).toHaveLength(burst.length - RateLimitConfig.VIACEP.max);

        for (const response of direct) {
            expect(response.body.cep).toMatchObject({ jobId: null, status: 'completed' });
        }
        for (const response of queued) {
            expect(response.body).toEqual({
                message: CepConstants.MESSAGES.SUCCESS.CEP_QUEUED,
                jobId: UUID,
                status: 'pending',
                cep: expect.any(String),
            });
            const stored = await prisma.cep.findUnique({ where: { cep: response.body.cep } });
            expect(stored).toMatchObject({ jobId: response.body.jobId, status: 'pending', city: null });
        }
    });

    it('should return the same job while the CEP is still queued', async () => {
        const [cep] = CEPS.slice(-1);
        await exhaust(createViaCepRateLimiter());

        const first = await api.post('/api/v1/cep').send({ cep });
        const second = await api.post('/api/v1/cep').send({ cep });

        expect(first.status).toBe(httpStatus.ACCEPTED);
        expect(second.status).toBe(httpStatus.ACCEPTED);
        expect(second.body).toEqual({
            message: CepConstants.MESSAGES.SUCCESS.CEP_ALREADY_QUEUED,
            jobId: first.body.jobId,
            status: 'pending',
            cep,
        });
    });

    it('should process the queued CEPs within the limit and expose the result by jobId', async () => {
        const queued = await prisma.cep.findMany({ where: { cep: { in: CEPS }, status: 'pending' } });
        expect(queued.length).toBeGreaterThan(0);

        workers.push(startCepWorker());

        for (const { cep, jobId } of queued) {
            const response = await waitForJob(jobId, 'completed');

            expect(response.status).toBe(httpStatus.OK);
            expect(response.body).toMatchObject({
                message: JobConstants.MESSAGES.SUCCESS.JOB_FOUND,
                jobId,
                type: 'cep',
                status: 'completed',
                cep: { cep, jobId, status: 'completed', city: expect.any(String), uf: expect.any(String) },
            });
        }
    });
});

describe('# Rate limit E2E - CNPJ (BrasilAPI)', () => {
    it('should queue the CNPJ over the limit and complete it with the worker', async () => {
        const [cnpj] = CNPJS;
        await exhaust(createBrasilApiRateLimiter());

        const queued = await api.post('/api/v1/cnpj').send({ cnpj });

        expect(queued.status).toBe(httpStatus.ACCEPTED);
        expect(queued.body).toEqual({
            message: CnpjConstants.MESSAGES.SUCCESS.CNPJ_QUEUED,
            jobId: UUID,
            status: 'pending',
            cnpj,
        });
        const pending = await api.get(`/api/v1/jobs/${queued.body.jobId}`);
        expect(pending.body).toMatchObject({ type: 'cnpj', status: 'pending', cnpj: { cnpj, corporateName: null } });

        workers.push(startCnpjWorker());
        const response = await waitForJob(queued.body.jobId, 'completed');

        expect(response.body).toMatchObject({
            type: 'cnpj',
            status: 'completed',
            cnpj: { cnpj, jobId: queued.body.jobId, corporateName: expect.any(String) },
        });
    });

    it('should enrich directly with a null jobId when under the limit', async () => {
        const [, cnpj] = CNPJS;

        const response = await api.post('/api/v1/cnpj').send({ cnpj });

        expect(response.status).toBe(httpStatus.CREATED);
        expect(response.body.cnpj).toMatchObject({ cnpj, jobId: null, status: 'completed' });
    });

    it('should return 404 for an unknown jobId', async () => {
        const response = await api.get('/api/v1/jobs/00000000-0000-4000-8000-000000000000');

        expect(response.status).toBe(httpStatus.NOT_FOUND);
        expect(response.body.error).toBe(JobConstants.MESSAGES.ERROR.JOB_NOT_FOUND);
    });
});
