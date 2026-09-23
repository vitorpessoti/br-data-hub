import { jest } from '@jest/globals';
import request from 'supertest';
import httpStatus from 'http-status';

const prismaMock = {
    cep: { findUnique: jest.fn() },
    cnpj: { findUnique: jest.fn() },
};

const loggerErrorMock = jest.fn();

jest.unstable_mockModule('../../services/prisma.service.js', () => ({ default: prismaMock }));
jest.unstable_mockModule('../../services/logger.service.js', () => ({
    default: class {
        error(message) {
            loggerErrorMock(message);
        }
    },
}));

const { default: app } = await import('../../app.js');
const { authenticatedRequest } = await import('../../../test/helpers/auth.helper.js');

const api = authenticatedRequest(app);
const { JobConstants } = await import('./job.constants.js');

const { SUCCESS, ERROR } = JobConstants.MESSAGES;
const basePath = '/api/v1/jobs';
const JOB_ID = '7f1c2d3e-4b5a-4c6d-8e7f-9a0b1c2d3e4f';

const storedCep = { id: 'b3c9f5a2-1d2e-4f3a-9b8c-7d6e5f4a3b2c', cep: '01001000', city: null, jobId: JOB_ID, status: 'pending' };
const storedCnpj = { id: 'c4d0a6b3-2e3f-4a4b-8c9d-8e7f6a5b4c3d', cnpj: '19131243000197', jobId: JOB_ID, status: 'completed' };

beforeEach(() => {
    prismaMock.cep.findUnique.mockResolvedValue(null);
    prismaMock.cnpj.findUnique.mockResolvedValue(null);
});

describe('# Job - GET /jobs/:jobId', () => {
    it('should return the queued CEP with its enrichment status', async () => {
        prismaMock.cep.findUnique.mockResolvedValue(storedCep);

        const response = await api.get(`${basePath}/${JOB_ID}`);

        expect(response.status).toBe(httpStatus.OK);
        expect(response.body).toEqual({
            message: SUCCESS.JOB_FOUND,
            jobId: JOB_ID,
            type: 'cep',
            status: 'pending',
            cep: storedCep,
        });
        expect(prismaMock.cep.findUnique).toHaveBeenCalledWith({ where: { jobId: JOB_ID } });
        expect(prismaMock.cnpj.findUnique).toHaveBeenCalledWith({ where: { jobId: JOB_ID } });
    });

    it('should return the queued CNPJ with its enrichment status', async () => {
        prismaMock.cnpj.findUnique.mockResolvedValue(storedCnpj);

        const response = await api.get(`${basePath}/${JOB_ID}`);

        expect(response.status).toBe(httpStatus.OK);
        expect(response.body).toEqual({
            message: SUCCESS.JOB_FOUND,
            jobId: JOB_ID,
            type: 'cnpj',
            status: 'completed',
            cnpj: storedCnpj,
        });
    });

    it('should accept the jobId in upper case', async () => {
        prismaMock.cep.findUnique.mockResolvedValue(storedCep);

        const response = await api.get(`${basePath}/${JOB_ID.toUpperCase()}`);

        expect(response.status).toBe(httpStatus.OK);
        expect(prismaMock.cep.findUnique).toHaveBeenCalledWith({ where: { jobId: JOB_ID } });
    });

    it('should return 404 when no record has the jobId', async () => {
        const response = await api.get(`${basePath}/${JOB_ID}`);

        expect(response.status).toBe(httpStatus.NOT_FOUND);
        expect(response.body.error).toBe(ERROR.JOB_NOT_FOUND);
    });

    it('should return 500 with the fetch error when the database fails', async () => {
        prismaMock.cnpj.findUnique.mockRejectedValue(new Error('database offline'));

        const response = await api.get(`${basePath}/${JOB_ID}`);

        expect(response.status).toBe(httpStatus.INTERNAL_SERVER_ERROR);
        expect(response.body.error).toBe(ERROR.FETCH_FAILED);
        expect(loggerErrorMock).toHaveBeenCalledWith('[job] database offline');
    });

    it.each([
        ['is not a UUID', 'abc'],
        ['is a number', '123'],
        ['has an extra character', `${JOB_ID}0`],
    ])('should return 400 when the jobId %s', async (_, jobId) => {
        const response = await api.get(`${basePath}/${jobId}`);

        expect(response.status).toBe(httpStatus.BAD_REQUEST);
        expect(response.body.errors).toEqual([ERROR.INVALID_JOB_ID]);
        expect(prismaMock.cep.findUnique).not.toHaveBeenCalled();
    });
});

describe('# Job - authentication', () => {
    it.each([
        ['GET', 'get', `${basePath}/${JOB_ID}`],
    ])('should return 401 on %s without a token', async (_, method, path) => {
        const response = await request(app)[method](path).send({});

        expect(response.status).toBe(httpStatus.UNAUTHORIZED);
        expect(response.body.error).toBe('Authentication token was not provided.');
        expect(prismaMock.cep.findUnique).not.toHaveBeenCalled();
    });

    it('should return 401 when the token is invalid', async () => {
        const response = await request(app).get(`${basePath}/${JOB_ID}`).set('Authorization', 'Bearer not-a-jwt');

        expect(response.status).toBe(httpStatus.UNAUTHORIZED);
        expect(response.body.error).toBe('Authentication token is invalid or expired.');
    });
});
