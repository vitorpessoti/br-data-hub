import { jest } from '@jest/globals';
import httpStatus from 'http-status';
import createError from 'http-errors';

const loggerErrorMock = jest.fn();

jest.unstable_mockModule('../../../src/services/prisma.service.js', () => ({ default: {} }));
jest.unstable_mockModule('../../../src/services/logger.service.js', () => ({
    default: class {
        error(message) {
            loggerErrorMock(message);
        }
    },
}));

const { default: CepService } = await import('../../../src/modules/cep/cep.service.js');
const { default: CepRepository } = await import('../../../src/modules/cep/cep.repository.js');
const { default: ViaCepService } = await import('../../../src/modules/cep/viacep.service.js');
const { default: CepQueue } = await import('../../../src/modules/cep/cep.queue.js');
const { default: RateLimiterService } = await import('../../../src/services/rate-limiter.service.js');
const { CepConstants } = await import('../../../src/modules/cep/cep.constants.js');
const { RateLimitConfig } = await import('../../../src/config/rate-limit.config.js');

const { SUCCESS, ERROR } = CepConstants.MESSAGES;
const CEP = '01001000';

const cepData = {
    cep: CEP,
    street: 'Praça da Sé',
    complement: 'lado ímpar',
    unit: null,
    neighborhood: 'Sé',
    city: 'São Paulo',
    uf: 'SP',
    state: 'São Paulo',
    region: 'Sudeste',
    ibgeCode: '3550308',
    giaCode: '1004',
    ddd: '11',
    siafiCode: '7107',
};
const { cep: _cep, ...cepFields } = cepData;
const storedCep = { id: 'b3c9f5a2-1d2e-4f3a-9b8c-7d6e5f4a3b2c', ...cepData };

const prismaError = code => Object.assign(new Error(`prisma ${code}`), { code });
const UUID = expect.stringMatching(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
const JOB_ID = '7f1c2d3e-4b5a-4c6d-8e7f-9a0b1c2d3e4f';

let repository;
let viaCep;
let rateLimiter;
let queue;
let service;

beforeEach(() => {
    repository = {
        findAll: jest.fn(),
        findByCep: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
    };
    viaCep = { findByCep: jest.fn().mockResolvedValue(cepData) };
    rateLimiter = { tryAcquire: jest.fn().mockResolvedValue({ allowed: true }) };
    queue = { add: jest.fn().mockResolvedValue({ id: JOB_ID }) };
    service = new CepService({ repository, viaCep, rateLimiter, queue });
});

describe('# CepService - constructor', () => {
    it('should build the default repository, ViaCEP client, rate limiter and queue', () => {
        const defaultService = new CepService();

        expect(defaultService.repository).toBeInstanceOf(CepRepository);
        expect(defaultService.viaCep).toBeInstanceOf(ViaCepService);
        expect(defaultService.rateLimiter).toBeInstanceOf(RateLimiterService);
        expect(defaultService.rateLimiter).toMatchObject({
            key: 'rate-limit:viacep',
            max: RateLimitConfig.VIACEP.max,
            duration: RateLimitConfig.VIACEP.duration,
        });
        expect(defaultService.queue).toBeInstanceOf(CepQueue);
    });
});

describe('# CepService - enrich', () => {
    it('should create the record when the CEP is not stored yet', async () => {
        repository.findByCep.mockResolvedValue(null);
        repository.create.mockResolvedValue(storedCep);

        const result = await service.enrich(CEP);

        expect(result).toEqual({ created: true, message: SUCCESS.CEP_SAVED, cep: storedCep });
        expect(viaCep.findByCep).toHaveBeenCalledWith(CEP);
        expect(repository.create).toHaveBeenCalledWith({ ...cepData, jobId: null, status: 'completed' });
        expect(queue.add).not.toHaveBeenCalled();
        expect(repository.update).not.toHaveBeenCalled();
    });

    it('should refresh the record when the CEP is already stored', async () => {
        repository.findByCep.mockResolvedValue(storedCep);
        repository.update.mockResolvedValue(storedCep);

        const result = await service.enrich(CEP);

        expect(result).toEqual({ created: false, message: SUCCESS.CEP_REFRESHED, cep: storedCep });
        expect(repository.update).toHaveBeenCalledWith(CEP, { ...cepFields, jobId: null, status: 'completed' });
        expect(repository.create).not.toHaveBeenCalled();
    });

    it('should clear the jobId of a finished queued enrichment when refreshing directly', async () => {
        repository.findByCep.mockResolvedValue({ ...storedCep, jobId: JOB_ID, status: 'failed' });
        repository.update.mockResolvedValue(storedCep);

        await service.enrich(CEP);

        expect(repository.update).toHaveBeenCalledWith(CEP, { ...cepFields, jobId: null, status: 'completed' });
    });

    it('should propagate ViaCEP errors without saving', async () => {
        const viaCepError = createError(httpStatus.NOT_FOUND, ERROR.VIACEP_CEP_NOT_FOUND);
        viaCep.findByCep.mockRejectedValue(viaCepError);

        await expect(service.enrich(CEP)).rejects.toBe(viaCepError);
        expect(repository.create).not.toHaveBeenCalled();
        expect(repository.update).not.toHaveBeenCalled();
    });

    it.each([
        ['the lookup', 'findByCep'],
        ['the insert', 'create'],
    ])('should throw 500 with the save error when %s fails', async (_, method) => {
        repository.findByCep.mockResolvedValue(null);
        repository[method].mockRejectedValue(new Error('database offline'));

        await expect(service.enrich(CEP)).rejects.toMatchObject({
            status: httpStatus.INTERNAL_SERVER_ERROR,
            message: ERROR.SAVE_FAILED,
        });
        expect(loggerErrorMock).toHaveBeenCalledWith('[cep] database offline');
    });

    it('should throw 500 with the save error when a concurrent insert violates the unique constraint', async () => {
        repository.findByCep.mockResolvedValue(null);
        repository.create.mockRejectedValue(prismaError('P2002'));

        await expect(service.enrich(CEP)).rejects.toMatchObject({
            status: httpStatus.INTERNAL_SERVER_ERROR,
            message: ERROR.SAVE_FAILED,
        });
    });
});

describe('# CepService - enrich over the rate limit', () => {
    beforeEach(() => {
        rateLimiter.tryAcquire.mockResolvedValue({ allowed: false, retryAfterMs: 500 });
    });

    it('should store a new CEP as pending, queue it and return the jobId', async () => {
        repository.findByCep.mockResolvedValue(null);

        const result = await service.enrich(CEP);

        expect(result).toEqual({ queued: true, message: SUCCESS.CEP_QUEUED, jobId: UUID, status: 'pending', cep: CEP });
        expect(repository.create).toHaveBeenCalledWith({ cep: CEP, jobId: result.jobId, status: 'pending' });
        expect(queue.add).toHaveBeenCalledWith(CEP, result.jobId);
        expect(repository.create.mock.invocationCallOrder[0]).toBeLessThan(queue.add.mock.invocationCallOrder[0]);
        expect(viaCep.findByCep).not.toHaveBeenCalled();
    });

    it('should mark an already stored CEP as pending, keeping its data', async () => {
        repository.findByCep.mockResolvedValue(storedCep);

        const result = await service.enrich(CEP);

        expect(result.queued).toBe(true);
        expect(repository.update).toHaveBeenCalledWith(CEP, { jobId: result.jobId, status: 'pending' });
        expect(repository.create).not.toHaveBeenCalled();
    });

    it('should throw 500 with the save error when the pending record cannot be saved', async () => {
        repository.findByCep.mockResolvedValue(null);
        repository.create.mockRejectedValue(new Error('database offline'));

        await expect(service.enrich(CEP)).rejects.toMatchObject({
            status: httpStatus.INTERNAL_SERVER_ERROR,
            message: ERROR.SAVE_FAILED,
        });
        expect(queue.add).not.toHaveBeenCalled();
    });

    it('should remove the new pending record and throw 503 when the queue is unavailable', async () => {
        repository.findByCep.mockResolvedValue(null);
        queue.add.mockRejectedValue(new Error('redis offline'));

        await expect(service.enrich(CEP)).rejects.toMatchObject({
            status: httpStatus.SERVICE_UNAVAILABLE,
            message: ERROR.QUEUE_UNAVAILABLE,
        });
        expect(repository.delete).toHaveBeenCalledWith(CEP);
        expect(loggerErrorMock).toHaveBeenCalledWith('[cep] redis offline');
    });

    it('should restore the stored record and throw 503 when the queue is unavailable', async () => {
        repository.findByCep.mockResolvedValue({ ...storedCep, jobId: null, status: 'completed' });
        queue.add.mockRejectedValue(new Error('redis offline'));

        await expect(service.enrich(CEP)).rejects.toMatchObject({ status: httpStatus.SERVICE_UNAVAILABLE });
        expect(repository.update).toHaveBeenLastCalledWith(CEP, { jobId: null, status: 'completed' });
        expect(repository.delete).not.toHaveBeenCalled();
    });

    it('should log when the rollback of a failed enqueue also fails', async () => {
        repository.findByCep.mockResolvedValue(null);
        queue.add.mockRejectedValue(new Error('redis offline'));
        repository.delete.mockRejectedValue(new Error('database offline'));

        await expect(service.enrich(CEP)).rejects.toMatchObject({ status: httpStatus.SERVICE_UNAVAILABLE });
        expect(loggerErrorMock).toHaveBeenCalledWith('[cep] database offline');
    });
});

describe('# CepService - enrich of a CEP already queued', () => {
    it.each(['pending', 'processing'])('should return the current job when the CEP is %s', async status => {
        repository.findByCep.mockResolvedValue({ ...storedCep, jobId: JOB_ID, status });

        const result = await service.enrich(CEP);

        expect(result).toEqual({ queued: true, message: SUCCESS.CEP_ALREADY_QUEUED, jobId: JOB_ID, status, cep: CEP });
        expect(rateLimiter.tryAcquire).not.toHaveBeenCalled();
        expect(viaCep.findByCep).not.toHaveBeenCalled();
        expect(queue.add).not.toHaveBeenCalled();
    });
});

describe('# CepService - enrich without the rate limiter', () => {
    it('should throw 503 when the rate limiter (Redis) is unavailable', async () => {
        repository.findByCep.mockResolvedValue(null);
        rateLimiter.tryAcquire.mockRejectedValue(new Error('redis offline'));

        await expect(service.enrich(CEP)).rejects.toMatchObject({
            status: httpStatus.SERVICE_UNAVAILABLE,
            message: ERROR.QUEUE_UNAVAILABLE,
        });
        expect(loggerErrorMock).toHaveBeenCalledWith('[cep] redis offline');
        expect(viaCep.findByCep).not.toHaveBeenCalled();
    });
});

describe('# CepService - processJob', () => {
    it('should mark the CEP as processing, fetch it on ViaCEP and complete it', async () => {
        repository.update.mockResolvedValue(storedCep);

        await expect(service.processJob(CEP, { lastAttempt: false })).resolves.toEqual(storedCep);
        expect(repository.update).toHaveBeenNthCalledWith(1, CEP, { status: 'processing' });
        expect(repository.update).toHaveBeenNthCalledWith(2, CEP, { ...cepFields, status: 'completed' });
    });

    it('should throw 404 when the queued CEP was deleted meanwhile', async () => {
        repository.update.mockRejectedValue(prismaError('P2025'));

        await expect(service.processJob(CEP)).rejects.toMatchObject({ status: httpStatus.NOT_FOUND });
        expect(viaCep.findByCep).not.toHaveBeenCalled();
    });

    it('should mark the CEP as failed when ViaCEP does not know it, even with attempts left', async () => {
        const viaCepError = createError(httpStatus.NOT_FOUND, ERROR.VIACEP_CEP_NOT_FOUND);
        viaCep.findByCep.mockRejectedValue(viaCepError);

        await expect(service.processJob(CEP, { lastAttempt: false })).rejects.toBe(viaCepError);
        expect(repository.update).toHaveBeenLastCalledWith(CEP, { status: 'failed' });
    });

    it('should put the CEP back to pending on a transient failure with attempts left', async () => {
        const viaCepError = createError(httpStatus.BAD_GATEWAY, ERROR.VIACEP_REQUEST_FAILED);
        viaCep.findByCep.mockRejectedValue(viaCepError);

        await expect(service.processJob(CEP, { lastAttempt: false })).rejects.toBe(viaCepError);
        expect(repository.update).toHaveBeenLastCalledWith(CEP, { status: 'pending' });
    });

    it('should mark the CEP as failed on a transient failure in the last attempt', async () => {
        viaCep.findByCep.mockRejectedValue(createError(httpStatus.GATEWAY_TIMEOUT, ERROR.VIACEP_TIMEOUT));

        await expect(service.processJob(CEP)).rejects.toMatchObject({ status: httpStatus.GATEWAY_TIMEOUT });
        expect(repository.update).toHaveBeenLastCalledWith(CEP, { status: 'failed' });
    });

    it('should throw 500 with the save error and log when the status cannot be updated', async () => {
        repository.update
            .mockResolvedValueOnce(storedCep)
            .mockRejectedValueOnce(new Error('database offline'))
            .mockRejectedValueOnce(new Error('still offline'));

        await expect(service.processJob(CEP)).rejects.toMatchObject({
            status: httpStatus.INTERNAL_SERVER_ERROR,
            message: ERROR.SAVE_FAILED,
        });
        expect(loggerErrorMock).toHaveBeenCalledWith('[cep] still offline');
    });
});

describe('# CepService - list', () => {
    it('should return the stored records with the total', async () => {
        repository.findAll.mockResolvedValue([storedCep]);

        await expect(service.list()).resolves.toEqual({ message: SUCCESS.CEPS_LISTED, total: 1, ceps: [storedCep] });
    });

    it('should throw 500 with the fetch error when the database fails', async () => {
        repository.findAll.mockRejectedValue(new Error('database offline'));

        await expect(service.list()).rejects.toMatchObject({
            status: httpStatus.INTERNAL_SERVER_ERROR,
            message: ERROR.FETCH_FAILED,
        });
        expect(loggerErrorMock).toHaveBeenCalledWith('[cep] database offline');
    });
});

describe('# CepService - findByCep', () => {
    it('should return the stored record', async () => {
        repository.findByCep.mockResolvedValue(storedCep);

        await expect(service.findByCep(CEP)).resolves.toEqual({ message: SUCCESS.CEP_FOUND, cep: storedCep });
        expect(repository.findByCep).toHaveBeenCalledWith(CEP);
    });

    it('should throw 404 when the CEP is not stored', async () => {
        repository.findByCep.mockResolvedValue(null);

        await expect(service.findByCep(CEP)).rejects.toMatchObject({
            status: httpStatus.NOT_FOUND,
            message: ERROR.CEP_NOT_FOUND,
        });
    });

    it('should throw 500 with the fetch error when the database fails', async () => {
        repository.findByCep.mockRejectedValue(new Error('database offline'));

        await expect(service.findByCep(CEP)).rejects.toMatchObject({
            status: httpStatus.INTERNAL_SERVER_ERROR,
            message: ERROR.FETCH_FAILED,
        });
        expect(loggerErrorMock).toHaveBeenCalledWith('[cep] database offline');
    });
});

describe('# CepService - update', () => {
    it('should update only the allowed fields that were sent', async () => {
        const updated = { ...storedCep, street: 'Rua Nova', ddd: null };
        repository.update.mockResolvedValue(updated);

        const result = await service.update(CEP, { street: 'Rua Nova', ddd: null, cep: '99999999', id: 'x' });

        expect(result).toEqual({ message: SUCCESS.CEP_UPDATED, cep: updated });
        expect(repository.update).toHaveBeenCalledWith(CEP, { street: 'Rua Nova', ddd: null });
    });

    it('should throw 404 when the CEP is not stored', async () => {
        repository.update.mockRejectedValue(prismaError('P2025'));

        await expect(service.update(CEP, { city: 'Santos' })).rejects.toMatchObject({
            status: httpStatus.NOT_FOUND,
            message: ERROR.CEP_NOT_FOUND,
        });
        expect(loggerErrorMock).not.toHaveBeenCalled();
    });

    it('should throw 500 with the update error when the database fails', async () => {
        repository.update.mockRejectedValue(new Error('database offline'));

        await expect(service.update(CEP, { city: 'Santos' })).rejects.toMatchObject({
            status: httpStatus.INTERNAL_SERVER_ERROR,
            message: ERROR.UPDATE_FAILED,
        });
    });
});

describe('# CepService - delete', () => {
    it('should delete and return the removed record', async () => {
        repository.delete.mockResolvedValue(storedCep);

        await expect(service.delete(CEP)).resolves.toEqual({ message: SUCCESS.CEP_DELETED, cep: storedCep });
        expect(repository.delete).toHaveBeenCalledWith(CEP);
    });

    it('should throw 404 when the CEP is not stored', async () => {
        repository.delete.mockRejectedValue(prismaError('P2025'));

        await expect(service.delete(CEP)).rejects.toMatchObject({
            status: httpStatus.NOT_FOUND,
            message: ERROR.CEP_NOT_FOUND,
        });
    });

    it('should throw 500 with the delete error when the database fails', async () => {
        repository.delete.mockRejectedValue(new Error('database offline'));

        await expect(service.delete(CEP)).rejects.toMatchObject({
            status: httpStatus.INTERNAL_SERVER_ERROR,
            message: ERROR.DELETE_FAILED,
        });
    });
});
