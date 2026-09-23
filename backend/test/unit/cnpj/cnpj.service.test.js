import { jest } from '@jest/globals';
import httpStatus from 'http-status';
import createError from 'http-errors';
import { CNPJ, cnpjData } from '../../fixtures/cnpj.fixture.js';

const loggerErrorMock = jest.fn();

jest.unstable_mockModule('../../../src/services/prisma.service.js', () => ({ default: {} }));
jest.unstable_mockModule('../../../src/services/logger.service.js', () => ({
    default: class {
        error(message) {
            loggerErrorMock(message);
        }
    },
}));

const { default: CnpjService } = await import('../../../src/modules/cnpj/cnpj.service.js');
const { default: CnpjRepository } = await import('../../../src/modules/cnpj/cnpj.repository.js');
const { default: BrasilApiService } = await import('../../../src/modules/cnpj/brasilapi.service.js');
const { default: CnpjQueue } = await import('../../../src/modules/cnpj/cnpj.queue.js');
const { default: RateLimiterService } = await import('../../../src/services/rate-limiter.service.js');
const { CnpjConstants } = await import('../../../src/modules/cnpj/cnpj.constants.js');
const { RateLimitConfig } = await import('../../../src/config/rate-limit.config.js');

const { SUCCESS, ERROR } = CnpjConstants.MESSAGES;

const { cnpj: _cnpj, ...cnpjFields } = cnpjData;
const storedCnpj = { id: 'b3c9f5a2-1d2e-4f3a-9b8c-7d6e5f4a3b2c', ...cnpjData };

const prismaError = code => Object.assign(new Error(`prisma ${code}`), { code });
const UUID = expect.stringMatching(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
const JOB_ID = '7f1c2d3e-4b5a-4c6d-8e7f-9a0b1c2d3e4f';

let repository;
let brasilApi;
let rateLimiter;
let queue;
let service;

beforeEach(() => {
    repository = {
        findAll: jest.fn(),
        findByCnpj: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
    };
    brasilApi = { findByCnpj: jest.fn().mockResolvedValue(cnpjData) };
    rateLimiter = { tryAcquire: jest.fn().mockResolvedValue({ allowed: true }) };
    queue = { add: jest.fn().mockResolvedValue({ id: JOB_ID }) };
    service = new CnpjService({ repository, brasilApi, rateLimiter, queue });
});

describe('# CnpjService - constructor', () => {
    it('should build the default repository, BrasilAPI client, rate limiter and queue', () => {
        const defaultService = new CnpjService();

        expect(defaultService.repository).toBeInstanceOf(CnpjRepository);
        expect(defaultService.brasilApi).toBeInstanceOf(BrasilApiService);
        expect(defaultService.rateLimiter).toBeInstanceOf(RateLimiterService);
        expect(defaultService.rateLimiter).toMatchObject({
            key: 'rate-limit:brasilapi',
            max: RateLimitConfig.BRASILAPI.max,
            duration: RateLimitConfig.BRASILAPI.duration,
        });
        expect(defaultService.queue).toBeInstanceOf(CnpjQueue);
    });
});

describe('# CnpjService - enrich', () => {
    it('should create the record when the CNPJ is not stored yet', async () => {
        repository.findByCnpj.mockResolvedValue(null);
        repository.create.mockResolvedValue(storedCnpj);

        const result = await service.enrich(CNPJ);

        expect(result).toEqual({ created: true, message: SUCCESS.CNPJ_SAVED, cnpj: storedCnpj });
        expect(brasilApi.findByCnpj).toHaveBeenCalledWith(CNPJ);
        expect(repository.create).toHaveBeenCalledWith({ ...cnpjData, jobId: null, status: 'completed' });
        expect(queue.add).not.toHaveBeenCalled();
        expect(repository.update).not.toHaveBeenCalled();
    });

    it('should refresh the record when the CNPJ is already stored', async () => {
        repository.findByCnpj.mockResolvedValue(storedCnpj);
        repository.update.mockResolvedValue(storedCnpj);

        const result = await service.enrich(CNPJ);

        expect(result).toEqual({ created: false, message: SUCCESS.CNPJ_REFRESHED, cnpj: storedCnpj });
        expect(repository.update).toHaveBeenCalledWith(CNPJ, { ...cnpjFields, jobId: null, status: 'completed' });
        expect(repository.create).not.toHaveBeenCalled();
    });

    it('should clear the jobId of a finished queued enrichment when refreshing directly', async () => {
        repository.findByCnpj.mockResolvedValue({ ...storedCnpj, jobId: JOB_ID, status: 'failed' });
        repository.update.mockResolvedValue(storedCnpj);

        await service.enrich(CNPJ);

        expect(repository.update).toHaveBeenCalledWith(CNPJ, { ...cnpjFields, jobId: null, status: 'completed' });
    });

    it('should propagate BrasilAPI errors without saving', async () => {
        const brasilApiError = createError(httpStatus.NOT_FOUND, ERROR.BRASILAPI_CNPJ_NOT_FOUND);
        brasilApi.findByCnpj.mockRejectedValue(brasilApiError);

        await expect(service.enrich(CNPJ)).rejects.toBe(brasilApiError);
        expect(repository.create).not.toHaveBeenCalled();
        expect(repository.update).not.toHaveBeenCalled();
    });

    it.each([
        ['the lookup', 'findByCnpj'],
        ['the insert', 'create'],
    ])('should throw 500 with the save error when %s fails', async (_, method) => {
        repository.findByCnpj.mockResolvedValue(null);
        repository[method].mockRejectedValue(new Error('database offline'));

        await expect(service.enrich(CNPJ)).rejects.toMatchObject({
            status: httpStatus.INTERNAL_SERVER_ERROR,
            message: ERROR.SAVE_FAILED,
        });
        expect(loggerErrorMock).toHaveBeenCalledWith('[cnpj] database offline');
    });

    it('should throw 500 with the save error when the refresh fails', async () => {
        repository.findByCnpj.mockResolvedValue(storedCnpj);
        repository.update.mockRejectedValue(new Error('database offline'));

        await expect(service.enrich(CNPJ)).rejects.toMatchObject({
            status: httpStatus.INTERNAL_SERVER_ERROR,
            message: ERROR.SAVE_FAILED,
        });
    });

    it('should throw 500 with the save error when a concurrent insert violates the unique constraint', async () => {
        repository.findByCnpj.mockResolvedValue(null);
        repository.create.mockRejectedValue(prismaError('P2002'));

        await expect(service.enrich(CNPJ)).rejects.toMatchObject({
            status: httpStatus.INTERNAL_SERVER_ERROR,
            message: ERROR.SAVE_FAILED,
        });
    });
});

describe('# CnpjService - enrich over the rate limit', () => {
    beforeEach(() => {
        rateLimiter.tryAcquire.mockResolvedValue({ allowed: false, retryAfterMs: 500 });
    });

    it('should store a new CNPJ as pending, queue it and return the jobId', async () => {
        repository.findByCnpj.mockResolvedValue(null);

        const result = await service.enrich(CNPJ);

        expect(result).toEqual({ queued: true, message: SUCCESS.CNPJ_QUEUED, jobId: UUID, status: 'pending', cnpj: CNPJ });
        expect(repository.create).toHaveBeenCalledWith({ cnpj: CNPJ, jobId: result.jobId, status: 'pending' });
        expect(queue.add).toHaveBeenCalledWith(CNPJ, result.jobId);
        expect(repository.create.mock.invocationCallOrder[0]).toBeLessThan(queue.add.mock.invocationCallOrder[0]);
        expect(brasilApi.findByCnpj).not.toHaveBeenCalled();
    });

    it('should mark an already stored CNPJ as pending, keeping its data', async () => {
        repository.findByCnpj.mockResolvedValue(storedCnpj);

        const result = await service.enrich(CNPJ);

        expect(result.queued).toBe(true);
        expect(repository.update).toHaveBeenCalledWith(CNPJ, { jobId: result.jobId, status: 'pending' });
        expect(repository.create).not.toHaveBeenCalled();
    });

    it('should throw 500 with the save error when the pending record cannot be saved', async () => {
        repository.findByCnpj.mockResolvedValue(null);
        repository.create.mockRejectedValue(new Error('database offline'));

        await expect(service.enrich(CNPJ)).rejects.toMatchObject({
            status: httpStatus.INTERNAL_SERVER_ERROR,
            message: ERROR.SAVE_FAILED,
        });
        expect(queue.add).not.toHaveBeenCalled();
    });

    it('should remove the new pending record and throw 503 when the queue is unavailable', async () => {
        repository.findByCnpj.mockResolvedValue(null);
        queue.add.mockRejectedValue(new Error('redis offline'));

        await expect(service.enrich(CNPJ)).rejects.toMatchObject({
            status: httpStatus.SERVICE_UNAVAILABLE,
            message: ERROR.QUEUE_UNAVAILABLE,
        });
        expect(repository.delete).toHaveBeenCalledWith(CNPJ);
        expect(loggerErrorMock).toHaveBeenCalledWith('[cnpj] redis offline');
    });

    it('should restore the stored record and throw 503 when the queue is unavailable', async () => {
        repository.findByCnpj.mockResolvedValue({ ...storedCnpj, jobId: null, status: 'completed' });
        queue.add.mockRejectedValue(new Error('redis offline'));

        await expect(service.enrich(CNPJ)).rejects.toMatchObject({ status: httpStatus.SERVICE_UNAVAILABLE });
        expect(repository.update).toHaveBeenLastCalledWith(CNPJ, { jobId: null, status: 'completed' });
        expect(repository.delete).not.toHaveBeenCalled();
    });

    it('should log when the rollback of a failed enqueue also fails', async () => {
        repository.findByCnpj.mockResolvedValue(null);
        queue.add.mockRejectedValue(new Error('redis offline'));
        repository.delete.mockRejectedValue(new Error('database offline'));

        await expect(service.enrich(CNPJ)).rejects.toMatchObject({ status: httpStatus.SERVICE_UNAVAILABLE });
        expect(loggerErrorMock).toHaveBeenCalledWith('[cnpj] database offline');
    });
});

describe('# CnpjService - enrich of a CNPJ already queued', () => {
    it.each(['pending', 'processing'])('should return the current job when the CNPJ is %s', async status => {
        repository.findByCnpj.mockResolvedValue({ ...storedCnpj, jobId: JOB_ID, status });

        const result = await service.enrich(CNPJ);

        expect(result).toEqual({ queued: true, message: SUCCESS.CNPJ_ALREADY_QUEUED, jobId: JOB_ID, status, cnpj: CNPJ });
        expect(rateLimiter.tryAcquire).not.toHaveBeenCalled();
        expect(brasilApi.findByCnpj).not.toHaveBeenCalled();
        expect(queue.add).not.toHaveBeenCalled();
    });
});

describe('# CnpjService - enrich without the rate limiter', () => {
    it('should throw 503 when the rate limiter (Redis) is unavailable', async () => {
        repository.findByCnpj.mockResolvedValue(null);
        rateLimiter.tryAcquire.mockRejectedValue(new Error('redis offline'));

        await expect(service.enrich(CNPJ)).rejects.toMatchObject({
            status: httpStatus.SERVICE_UNAVAILABLE,
            message: ERROR.QUEUE_UNAVAILABLE,
        });
        expect(loggerErrorMock).toHaveBeenCalledWith('[cnpj] redis offline');
        expect(brasilApi.findByCnpj).not.toHaveBeenCalled();
    });
});

describe('# CnpjService - processJob', () => {
    it('should mark the CNPJ as processing, fetch it on BrasilAPI and complete it', async () => {
        repository.update.mockResolvedValue(storedCnpj);

        await expect(service.processJob(CNPJ, { lastAttempt: false })).resolves.toEqual(storedCnpj);
        expect(repository.update).toHaveBeenNthCalledWith(1, CNPJ, { status: 'processing' });
        expect(repository.update).toHaveBeenNthCalledWith(2, CNPJ, { ...cnpjFields, status: 'completed' });
    });

    it('should throw 404 when the queued CNPJ was deleted meanwhile', async () => {
        repository.update.mockRejectedValue(prismaError('P2025'));

        await expect(service.processJob(CNPJ)).rejects.toMatchObject({ status: httpStatus.NOT_FOUND });
        expect(brasilApi.findByCnpj).not.toHaveBeenCalled();
    });

    it('should mark the CNPJ as failed when BrasilAPI does not know it, even with attempts left', async () => {
        const brasilApiError = createError(httpStatus.NOT_FOUND, ERROR.BRASILAPI_CNPJ_NOT_FOUND);
        brasilApi.findByCnpj.mockRejectedValue(brasilApiError);

        await expect(service.processJob(CNPJ, { lastAttempt: false })).rejects.toBe(brasilApiError);
        expect(repository.update).toHaveBeenLastCalledWith(CNPJ, { status: 'failed' });
    });

    it('should put the CNPJ back to pending on a transient failure with attempts left', async () => {
        const brasilApiError = createError(httpStatus.BAD_GATEWAY, ERROR.BRASILAPI_REQUEST_FAILED);
        brasilApi.findByCnpj.mockRejectedValue(brasilApiError);

        await expect(service.processJob(CNPJ, { lastAttempt: false })).rejects.toBe(brasilApiError);
        expect(repository.update).toHaveBeenLastCalledWith(CNPJ, { status: 'pending' });
    });

    it('should mark the CNPJ as failed on a transient failure in the last attempt', async () => {
        brasilApi.findByCnpj.mockRejectedValue(createError(httpStatus.GATEWAY_TIMEOUT, ERROR.BRASILAPI_TIMEOUT));

        await expect(service.processJob(CNPJ)).rejects.toMatchObject({ status: httpStatus.GATEWAY_TIMEOUT });
        expect(repository.update).toHaveBeenLastCalledWith(CNPJ, { status: 'failed' });
    });

    it('should throw 500 with the save error and log when the status cannot be updated', async () => {
        repository.update
            .mockResolvedValueOnce(storedCnpj)
            .mockRejectedValueOnce(new Error('database offline'))
            .mockRejectedValueOnce(new Error('still offline'));

        await expect(service.processJob(CNPJ)).rejects.toMatchObject({
            status: httpStatus.INTERNAL_SERVER_ERROR,
            message: ERROR.SAVE_FAILED,
        });
        expect(loggerErrorMock).toHaveBeenCalledWith('[cnpj] still offline');
    });
});

describe('# CnpjService - list', () => {
    it('should return the stored records with the total', async () => {
        repository.findAll.mockResolvedValue([storedCnpj]);

        await expect(service.list()).resolves.toEqual({ message: SUCCESS.CNPJS_LISTED, total: 1, cnpjs: [storedCnpj] });
    });

    it('should throw 500 with the fetch error when the database fails', async () => {
        repository.findAll.mockRejectedValue(new Error('database offline'));

        await expect(service.list()).rejects.toMatchObject({
            status: httpStatus.INTERNAL_SERVER_ERROR,
            message: ERROR.FETCH_FAILED,
        });
        expect(loggerErrorMock).toHaveBeenCalledWith('[cnpj] database offline');
    });
});

describe('# CnpjService - findByCnpj', () => {
    it('should return the stored record', async () => {
        repository.findByCnpj.mockResolvedValue(storedCnpj);

        await expect(service.findByCnpj(CNPJ)).resolves.toEqual({ message: SUCCESS.CNPJ_FOUND, cnpj: storedCnpj });
        expect(repository.findByCnpj).toHaveBeenCalledWith(CNPJ);
    });

    it('should throw 404 when the CNPJ is not stored', async () => {
        repository.findByCnpj.mockResolvedValue(null);

        await expect(service.findByCnpj(CNPJ)).rejects.toMatchObject({
            status: httpStatus.NOT_FOUND,
            message: ERROR.CNPJ_NOT_FOUND,
        });
    });

    it('should throw 500 with the fetch error when the database fails', async () => {
        repository.findByCnpj.mockRejectedValue(new Error('database offline'));

        await expect(service.findByCnpj(CNPJ)).rejects.toMatchObject({
            status: httpStatus.INTERNAL_SERVER_ERROR,
            message: ERROR.FETCH_FAILED,
        });
        expect(loggerErrorMock).toHaveBeenCalledWith('[cnpj] database offline');
    });
});

describe('# CnpjService - update', () => {
    it('should update only the allowed fields that were sent', async () => {
        const updated = { ...storedCnpj, tradeName: 'OKBR', email: null };
        repository.update.mockResolvedValue(updated);

        const result = await service.update(CNPJ, {
            tradeName: 'OKBR',
            email: null,
            cnpj: '00000000000191',
            id: 'x',
            createdAt: '2020-01-01',
        });

        expect(result).toEqual({ message: SUCCESS.CNPJ_UPDATED, cnpj: updated });
        expect(repository.update).toHaveBeenCalledWith(CNPJ, { tradeName: 'OKBR', email: null });
    });

    it('should accept every updatable field', async () => {
        repository.update.mockResolvedValue(storedCnpj);

        await service.update(CNPJ, cnpjFields);

        expect(repository.update).toHaveBeenCalledWith(CNPJ, cnpjFields);
        expect(Object.keys(cnpjFields).sort()).toEqual([...CnpjConstants.UPDATABLE_FIELDS].sort());
    });

    it('should throw 404 when the CNPJ is not stored', async () => {
        repository.update.mockRejectedValue(prismaError('P2025'));

        await expect(service.update(CNPJ, { tradeName: 'OKBR' })).rejects.toMatchObject({
            status: httpStatus.NOT_FOUND,
            message: ERROR.CNPJ_NOT_FOUND,
        });
        expect(loggerErrorMock).not.toHaveBeenCalled();
    });

    it('should throw 500 with the update error when the database fails', async () => {
        repository.update.mockRejectedValue(new Error('database offline'));

        await expect(service.update(CNPJ, { tradeName: 'OKBR' })).rejects.toMatchObject({
            status: httpStatus.INTERNAL_SERVER_ERROR,
            message: ERROR.UPDATE_FAILED,
        });
    });
});

describe('# CnpjService - delete', () => {
    it('should delete and return the removed record', async () => {
        repository.delete.mockResolvedValue(storedCnpj);

        await expect(service.delete(CNPJ)).resolves.toEqual({ message: SUCCESS.CNPJ_DELETED, cnpj: storedCnpj });
        expect(repository.delete).toHaveBeenCalledWith(CNPJ);
    });

    it('should throw 404 when the CNPJ is not stored', async () => {
        repository.delete.mockRejectedValue(prismaError('P2025'));

        await expect(service.delete(CNPJ)).rejects.toMatchObject({
            status: httpStatus.NOT_FOUND,
            message: ERROR.CNPJ_NOT_FOUND,
        });
    });

    it('should throw 500 with the delete error when the database fails', async () => {
        repository.delete.mockRejectedValue(new Error('database offline'));

        await expect(service.delete(CNPJ)).rejects.toMatchObject({
            status: httpStatus.INTERNAL_SERVER_ERROR,
            message: ERROR.DELETE_FAILED,
        });
    });
});
