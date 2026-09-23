import { jest } from '@jest/globals';
import request from 'supertest';
import httpStatus from 'http-status';

const prismaMock = {
    cep: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
    },
};

const loggerErrorMock = jest.fn();

const rateLimitMock = jest.fn();
const queueAddMock = jest.fn();

jest.unstable_mockModule('../../services/rate-limiter.service.js', () => ({
    default: class {
        tryAcquire() {
            return rateLimitMock();
        }
    },
}));
jest.unstable_mockModule('../../services/queue.factory.js', () => ({
    getQueue: () => ({ add: queueAddMock }),
    isRetryable: error => !(error.status >= 400 && error.status < 500),
}));
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
const { CepConstants } = await import('./cep.constants.js');

const { SUCCESS, ERROR } = CepConstants.MESSAGES;
const basePath = '/api/v1/cep';
const CEP = '01001000';

const viaCepPayload = {
    cep: '01001-000',
    logradouro: 'Praça da Sé',
    complemento: 'lado ímpar',
    unidade: '',
    bairro: 'Sé',
    localidade: 'São Paulo',
    uf: 'SP',
    estado: 'São Paulo',
    regiao: 'Sudeste',
    ibge: '3550308',
    gia: '1004',
    ddd: '11',
    siafi: '7107',
};

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

const storedCep = {
    id: 'b3c9f5a2-1d2e-4f3a-9b8c-7d6e5f4a3b2c',
    ...cepData,
    createdAt: '2026-09-21T00:00:00.000Z',
    updatedAt: '2026-09-21T00:00:00.000Z',
};

const prismaError = code => Object.assign(new Error(`prisma ${code}`), { code });
const jsonResponse = (body, init = {}) => ({ ok: true, status: 200, json: async () => body, ...init });

const invalidCeps = [
    ['has less than 8 digits', '0100100'],
    ['has more than 8 digits', '010010000'],
    ['has letters', '0100100a'],
    ['has the hyphen in the wrong place', '0100-1000'],
];

let fetchMock;

beforeEach(() => {
    fetchMock = jest.spyOn(globalThis, 'fetch');
    rateLimitMock.mockResolvedValue({ allowed: true });
    queueAddMock.mockResolvedValue({});
});

afterEach(() => {
    fetchMock.mockRestore();
});

describe('# Cep - POST /cep', () => {
    it('should fetch the CEP on ViaCEP, save it and return 201', async () => {
        fetchMock.mockResolvedValue(jsonResponse(viaCepPayload));
        prismaMock.cep.findUnique.mockResolvedValue(null);
        prismaMock.cep.create.mockResolvedValue(storedCep);

        const response = await api.post(basePath).send({ cep: CEP });

        expect(response.status).toBe(httpStatus.CREATED);
        expect(response.body).toEqual({ message: SUCCESS.CEP_SAVED, cep: storedCep });
        expect(fetchMock.mock.calls[0][0]).toBe(`https://viacep.com.br/ws/${CEP}/json/`);
        expect(prismaMock.cep.create).toHaveBeenCalledWith({ data: { ...cepData, jobId: null, status: 'completed' } });
    });

    it('should accept the CEP with hyphen and surrounding spaces', async () => {
        fetchMock.mockResolvedValue(jsonResponse(viaCepPayload));
        prismaMock.cep.findUnique.mockResolvedValue(null);
        prismaMock.cep.create.mockResolvedValue(storedCep);

        const response = await api.post(basePath).send({ cep: ' 01001-000 ' });

        expect(response.status).toBe(httpStatus.CREATED);
        expect(fetchMock.mock.calls[0][0]).toBe(`https://viacep.com.br/ws/${CEP}/json/`);
        expect(prismaMock.cep.findUnique).toHaveBeenCalledWith({ where: { cep: CEP } });
    });

    it('should refresh an already stored CEP and return 200', async () => {
        fetchMock.mockResolvedValue(jsonResponse(viaCepPayload));
        prismaMock.cep.findUnique.mockResolvedValue(storedCep);
        prismaMock.cep.update.mockResolvedValue(storedCep);

        const response = await api.post(basePath).send({ cep: CEP });

        expect(response.status).toBe(httpStatus.OK);
        expect(response.body).toEqual({ message: SUCCESS.CEP_REFRESHED, cep: storedCep });
        expect(prismaMock.cep.update).toHaveBeenCalledWith({ where: { cep: CEP }, data: { ...cepFields, jobId: null, status: 'completed' } });
        expect(prismaMock.cep.create).not.toHaveBeenCalled();
    });

    it('should return 404 when ViaCEP does not know the CEP', async () => {
        fetchMock.mockResolvedValue(jsonResponse({ erro: 'true' }));

        const response = await api.post(basePath).send({ cep: '99999999' });

        expect(response.status).toBe(httpStatus.NOT_FOUND);
        expect(response.body.error).toBe(ERROR.VIACEP_CEP_NOT_FOUND);
        expect(prismaMock.cep.create).not.toHaveBeenCalled();
    });

    it('should return 502 when ViaCEP fails', async () => {
        fetchMock.mockResolvedValue(jsonResponse({}, { ok: false, status: 500 }));

        const response = await api.post(basePath).send({ cep: CEP });

        expect(response.status).toBe(httpStatus.BAD_GATEWAY);
        expect(response.body.error).toBe(ERROR.VIACEP_REQUEST_FAILED);
    });

    it('should return 502 when ViaCEP is unreachable', async () => {
        fetchMock.mockRejectedValue(new TypeError('fetch failed'));

        const response = await api.post(basePath).send({ cep: CEP });

        expect(response.status).toBe(httpStatus.BAD_GATEWAY);
        expect(response.body.error).toBe(ERROR.VIACEP_REQUEST_FAILED);
    });

    it('should return 504 when ViaCEP times out', async () => {
        fetchMock.mockRejectedValue(new DOMException('The operation timed out.', 'TimeoutError'));

        const response = await api.post(basePath).send({ cep: CEP });

        expect(response.status).toBe(httpStatus.GATEWAY_TIMEOUT);
        expect(response.body.error).toBe(ERROR.VIACEP_TIMEOUT);
    });

    it('should return 500 with the save error when persistence fails', async () => {
        fetchMock.mockResolvedValue(jsonResponse(viaCepPayload));
        prismaMock.cep.findUnique.mockResolvedValue(null);
        prismaMock.cep.create.mockRejectedValue(new Error('database offline'));

        const response = await api.post(basePath).send({ cep: CEP });

        expect(response.status).toBe(httpStatus.INTERNAL_SERVER_ERROR);
        expect(response.body.error).toBe(ERROR.SAVE_FAILED);
        expect(loggerErrorMock).toHaveBeenCalledWith('[cep] database offline');
    });

    it.each([
        ['is missing', {}],
        ['is not a string', { cep: 1001000 }],
        ...invalidCeps.map(([label, cep]) => [label, { cep }]),
    ])('should return 400 when the cep %s', async (_, body) => {
        const response = await api.post(basePath).send(body);

        expect(response.status).toBe(httpStatus.BAD_REQUEST);
        expect(response.body.errors).toEqual([ERROR.INVALID_CEP]);
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('should return 400 when the request has no body', async () => {
        const response = await api.post(basePath);

        expect(response.status).toBe(httpStatus.BAD_REQUEST);
        expect(response.body.errors).toEqual([ERROR.INVALID_CEP]);
    });
});

describe('# Cep - POST /cep over the ViaCEP rate limit', () => {
    const JOB_ID = '7f1c2d3e-4b5a-4c6d-8e7f-9a0b1c2d3e4f';
    const UUID = expect.stringMatching(/^[0-9a-f-]{36}$/);

    beforeEach(() => {
        rateLimitMock.mockResolvedValue({ allowed: false, retryAfterMs: 500 });
    });

    it('should store the CEP as pending, queue it and return 202 with the jobId', async () => {
        prismaMock.cep.findUnique.mockResolvedValue(null);
        prismaMock.cep.create.mockResolvedValue({});

        const response = await api.post(basePath).send({ cep: CEP });

        expect(response.status).toBe(httpStatus.ACCEPTED);
        expect(response.body).toEqual({ message: SUCCESS.CEP_QUEUED, jobId: UUID, status: 'pending', cep: CEP });
        expect(prismaMock.cep.create).toHaveBeenCalledWith({
            data: { cep: CEP, jobId: response.body.jobId, status: 'pending' },
        });
        expect(queueAddMock).toHaveBeenCalledWith('enrich-cep', { cep: CEP }, { jobId: response.body.jobId });
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('should mark an already stored CEP as pending and return 202', async () => {
        prismaMock.cep.findUnique.mockResolvedValue(storedCep);
        prismaMock.cep.update.mockResolvedValue(storedCep);

        const response = await api.post(basePath).send({ cep: CEP });

        expect(response.status).toBe(httpStatus.ACCEPTED);
        expect(prismaMock.cep.update).toHaveBeenCalledWith({
            where: { cep: CEP },
            data: { jobId: response.body.jobId, status: 'pending' },
        });
    });

    it('should return 202 with the current jobId when the CEP is already queued', async () => {
        prismaMock.cep.findUnique.mockResolvedValue({ ...storedCep, jobId: JOB_ID, status: 'processing' });

        const response = await api.post(basePath).send({ cep: CEP });

        expect(response.status).toBe(httpStatus.ACCEPTED);
        expect(response.body).toEqual({
            message: SUCCESS.CEP_ALREADY_QUEUED,
            jobId: JOB_ID,
            status: 'processing',
            cep: CEP,
        });
        expect(queueAddMock).not.toHaveBeenCalled();
    });

    it('should return 503 and remove the pending record when the queue is unavailable', async () => {
        prismaMock.cep.findUnique.mockResolvedValue(null);
        prismaMock.cep.create.mockResolvedValue({});
        queueAddMock.mockRejectedValue(new Error('redis offline'));

        const response = await api.post(basePath).send({ cep: CEP });

        expect(response.status).toBe(httpStatus.SERVICE_UNAVAILABLE);
        expect(response.body.error).toBe(ERROR.QUEUE_UNAVAILABLE);
        expect(prismaMock.cep.delete).toHaveBeenCalledWith({ where: { cep: CEP } });
    });

    it('should return 503 when the rate limiter is unavailable', async () => {
        prismaMock.cep.findUnique.mockResolvedValue(null);
        rateLimitMock.mockRejectedValue(new Error('redis offline'));

        const response = await api.post(basePath).send({ cep: CEP });

        expect(response.status).toBe(httpStatus.SERVICE_UNAVAILABLE);
        expect(response.body.error).toBe(ERROR.QUEUE_UNAVAILABLE);
        expect(loggerErrorMock).toHaveBeenCalledWith('[cep] redis offline');
    });
});

describe('# Cep - GET /cep', () => {
    it('should list the stored CEPs newest first', async () => {
        prismaMock.cep.findMany.mockResolvedValue([storedCep]);

        const response = await api.get(basePath);

        expect(response.status).toBe(httpStatus.OK);
        expect(response.body).toEqual({ message: SUCCESS.CEPS_LISTED, total: 1, ceps: [storedCep] });
        expect(prismaMock.cep.findMany).toHaveBeenCalledWith({ orderBy: { createdAt: 'desc' } });
    });

    it('should return an empty list when nothing is stored', async () => {
        prismaMock.cep.findMany.mockResolvedValue([]);

        const response = await api.get(basePath);

        expect(response.status).toBe(httpStatus.OK);
        expect(response.body).toEqual({ message: SUCCESS.CEPS_LISTED, total: 0, ceps: [] });
    });

    it('should return 500 with the fetch error when the database fails', async () => {
        prismaMock.cep.findMany.mockRejectedValue(new Error('database offline'));

        const response = await api.get(basePath);

        expect(response.status).toBe(httpStatus.INTERNAL_SERVER_ERROR);
        expect(response.body.error).toBe(ERROR.FETCH_FAILED);
    });
});

describe('# Cep - GET /cep/:cep', () => {
    it('should return the stored CEP data', async () => {
        prismaMock.cep.findUnique.mockResolvedValue(storedCep);

        const response = await api.get(`${basePath}/${CEP}`);

        expect(response.status).toBe(httpStatus.OK);
        expect(response.body).toEqual({ message: SUCCESS.CEP_FOUND, cep: storedCep });
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('should accept the CEP with hyphen', async () => {
        prismaMock.cep.findUnique.mockResolvedValue(storedCep);

        const response = await api.get(`${basePath}/01001-000`);

        expect(response.status).toBe(httpStatus.OK);
        expect(prismaMock.cep.findUnique).toHaveBeenCalledWith({ where: { cep: CEP } });
    });

    it('should return 404 when the CEP is not stored', async () => {
        prismaMock.cep.findUnique.mockResolvedValue(null);

        const response = await api.get(`${basePath}/${CEP}`);

        expect(response.status).toBe(httpStatus.NOT_FOUND);
        expect(response.body.error).toBe(ERROR.CEP_NOT_FOUND);
    });

    it('should return 500 with the fetch error when the database fails', async () => {
        prismaMock.cep.findUnique.mockRejectedValue(new Error('database offline'));

        const response = await api.get(`${basePath}/${CEP}`);

        expect(response.status).toBe(httpStatus.INTERNAL_SERVER_ERROR);
        expect(response.body.error).toBe(ERROR.FETCH_FAILED);
    });

    it.each(invalidCeps)('should return 400 when the cep %s', async (_, cep) => {
        const response = await api.get(`${basePath}/${cep}`);

        expect(response.status).toBe(httpStatus.BAD_REQUEST);
        expect(response.body.errors).toEqual([ERROR.INVALID_CEP]);
        expect(prismaMock.cep.findUnique).not.toHaveBeenCalled();
    });
});

describe('# Cep - PATCH /cep/:cep', () => {
    const path = `${basePath}/${CEP}`;

    it('should update the sent fields, normalizing and ignoring non-updatable ones', async () => {
        const updated = { ...storedCep, street: 'Rua Nova', uf: 'RJ', unit: null, ddd: '21' };
        prismaMock.cep.update.mockResolvedValue(updated);

        const response = await api.patch(path).send({
            street: '  Rua Nova  ',
            uf: 'rj',
            unit: '',
            ddd: '21',
            cep: '99999999',
            id: 'ignored',
        });

        expect(response.status).toBe(httpStatus.OK);
        expect(response.body).toEqual({ message: SUCCESS.CEP_UPDATED, cep: updated });
        expect(prismaMock.cep.update).toHaveBeenCalledWith({
            where: { cep: CEP },
            data: { street: 'Rua Nova', unit: null, uf: 'RJ', ddd: '21' },
        });
    });

    it('should accept every updatable field, including null for the optional ones', async () => {
        prismaMock.cep.update.mockResolvedValue(storedCep);
        const body = {
            street: null,
            complement: null,
            unit: null,
            neighborhood: null,
            city: 'Santos',
            uf: 'SP',
            state: null,
            region: null,
            ibgeCode: '3548500',
            giaCode: null,
            ddd: null,
            siafiCode: null,
        };

        const response = await api.patch(`${basePath}/01001-000`).send(body);

        expect(response.status).toBe(httpStatus.OK);
        expect(prismaMock.cep.update).toHaveBeenCalledWith({ where: { cep: CEP }, data: body });
    });

    it('should return 404 when the CEP is not stored', async () => {
        prismaMock.cep.update.mockRejectedValue(prismaError('P2025'));

        const response = await api.patch(path).send({ city: 'Santos' });

        expect(response.status).toBe(httpStatus.NOT_FOUND);
        expect(response.body.error).toBe(ERROR.CEP_NOT_FOUND);
    });

    it('should return 500 with the update error when the database fails', async () => {
        prismaMock.cep.update.mockRejectedValue(new Error('database offline'));

        const response = await api.patch(path).send({ city: 'Santos' });

        expect(response.status).toBe(httpStatus.INTERNAL_SERVER_ERROR);
        expect(response.body.error).toBe(ERROR.UPDATE_FAILED);
    });

    it.each(invalidCeps)('should return 400 when the cep param %s', async (_, cep) => {
        const response = await api.patch(`${basePath}/${cep}`).send({ city: 'Santos' });

        expect(response.status).toBe(httpStatus.BAD_REQUEST);
        expect(response.body.errors).toEqual([ERROR.INVALID_CEP]);
    });

    it.each([
        ['street is not a string', { street: 1 }, ERROR.INVALID_TEXT_FIELD('street')],
        ['complement is too long', { complement: 'x'.repeat(256) }, ERROR.INVALID_TEXT_FIELD('complement')],
        ['neighborhood is not a string', { neighborhood: true }, ERROR.INVALID_TEXT_FIELD('neighborhood')],
        ['giaCode is not a string', { giaCode: 1004 }, ERROR.INVALID_TEXT_FIELD('giaCode')],
        ['city is null', { city: null }, ERROR.INVALID_CITY],
        ['city is blank', { city: '   ' }, ERROR.INVALID_CITY],
        ['city is too long', { city: 'x'.repeat(256) }, ERROR.INVALID_CITY],
        ['uf is not a string', { uf: 12 }, ERROR.INVALID_UF],
        ['uf has 3 letters', { uf: 'SPP' }, ERROR.INVALID_UF],
        ['uf has digits', { uf: 'S1' }, ERROR.INVALID_UF],
        ['ibgeCode is not a string', { ibgeCode: 3550308 }, ERROR.INVALID_IBGE_CODE],
        ['ibgeCode has 6 digits', { ibgeCode: '355030' }, ERROR.INVALID_IBGE_CODE],
        ['ddd is not a string', { ddd: 11 }, ERROR.INVALID_DDD],
        ['ddd has letters', { ddd: '1a' }, ERROR.INVALID_DDD],
        ['siafiCode is not a string', { siafiCode: 7107 }, ERROR.INVALID_SIAFI_CODE],
        ['siafiCode is blank', { siafiCode: '' }, ERROR.INVALID_SIAFI_CODE],
        ['siafiCode is too long', { siafiCode: 'x'.repeat(11) }, ERROR.INVALID_SIAFI_CODE],
    ])('should return 400 when %s', async (_, body, message) => {
        const response = await api.patch(path).send(body);

        expect(response.status).toBe(httpStatus.BAD_REQUEST);
        expect(response.body.errors).toEqual([message]);
        expect(prismaMock.cep.update).not.toHaveBeenCalled();
    });

    it('should return every validation error at once', async () => {
        const response = await api.patch(path).send({ city: '', uf: 'X', ddd: 'x' });

        expect(response.status).toBe(httpStatus.BAD_REQUEST);
        expect(response.body.errors).toEqual([ERROR.INVALID_CITY, ERROR.INVALID_UF, ERROR.INVALID_DDD]);
    });

    it('should return 400 when no updatable field is sent', async () => {
        const response = await api.patch(path).send({ cep: '99999999' });

        expect(response.status).toBe(httpStatus.BAD_REQUEST);
        expect(response.body.errors).toEqual([ERROR.EMPTY_UPDATE]);
    });

    it('should return 400 when the request has no body', async () => {
        const response = await api.patch(path);

        expect(response.status).toBe(httpStatus.BAD_REQUEST);
        expect(response.body.errors).toEqual([ERROR.EMPTY_UPDATE]);
    });
});

describe('# Cep - DELETE /cep/:cep', () => {
    it('should delete the stored CEP and return it', async () => {
        prismaMock.cep.delete.mockResolvedValue(storedCep);

        const response = await api.delete(`${basePath}/01001-000`);

        expect(response.status).toBe(httpStatus.OK);
        expect(response.body).toEqual({ message: SUCCESS.CEP_DELETED, cep: storedCep });
        expect(prismaMock.cep.delete).toHaveBeenCalledWith({ where: { cep: CEP } });
    });

    it('should return 404 when the CEP is not stored', async () => {
        prismaMock.cep.delete.mockRejectedValue(prismaError('P2025'));

        const response = await api.delete(`${basePath}/${CEP}`);

        expect(response.status).toBe(httpStatus.NOT_FOUND);
        expect(response.body.error).toBe(ERROR.CEP_NOT_FOUND);
    });

    it('should return 500 with the delete error when the database fails', async () => {
        prismaMock.cep.delete.mockRejectedValue(new Error('database offline'));

        const response = await api.delete(`${basePath}/${CEP}`);

        expect(response.status).toBe(httpStatus.INTERNAL_SERVER_ERROR);
        expect(response.body.error).toBe(ERROR.DELETE_FAILED);
    });

    it.each(invalidCeps)('should return 400 when the cep %s', async (_, cep) => {
        const response = await api.delete(`${basePath}/${cep}`);

        expect(response.status).toBe(httpStatus.BAD_REQUEST);
        expect(response.body.errors).toEqual([ERROR.INVALID_CEP]);
        expect(prismaMock.cep.delete).not.toHaveBeenCalled();
    });
});

describe('# Cep - authentication', () => {
    it.each([
        ['POST', 'post', basePath],
        ['GET', 'get', `${basePath}/${CEP}`],
        ['PATCH', 'patch', `${basePath}/${CEP}`],
        ['DELETE', 'delete', `${basePath}/${CEP}`],
    ])('should return 401 on %s without a token', async (_, method, path) => {
        const response = await request(app)[method](path).send({});

        expect(response.status).toBe(httpStatus.UNAUTHORIZED);
        expect(response.body.error).toBe('Authentication token was not provided.');
        expect(prismaMock.cep.findUnique).not.toHaveBeenCalled();
    });

    it('should return 401 when the token is invalid', async () => {
        const response = await request(app).get(`${basePath}/${CEP}`).set('Authorization', 'Bearer not-a-jwt');

        expect(response.status).toBe(httpStatus.UNAUTHORIZED);
        expect(response.body.error).toBe('Authentication token is invalid or expired.');
    });
});
