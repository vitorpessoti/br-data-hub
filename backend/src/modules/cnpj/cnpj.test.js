import { jest } from '@jest/globals';
import request from 'supertest';
import httpStatus from 'http-status';
import { CNPJ, FORMATTED_CNPJ, brasilApiPayload, cnpjData, storedCnpj } from '../../../test/fixtures/cnpj.fixture.js';

const prismaMock = {
    cnpj: {
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
const { CnpjConstants } = await import('./cnpj.constants.js');

const { SUCCESS, ERROR } = CnpjConstants.MESSAGES;
const basePath = '/api/v1/cnpj';
const ALPHANUMERIC_CNPJ = '12ABC34501DE35';
// Formatted CNPJs carry a "/", so they must be URL-encoded when sent as a path param.
const ENCODED_CNPJ = encodeURIComponent(FORMATTED_CNPJ);

const { cnpj: _cnpj, ...cnpjFields } = cnpjData;

const prismaError = code => Object.assign(new Error(`prisma ${code}`), { code });
const jsonResponse = (body, init = {}) => ({ ok: true, status: 200, json: async () => body, ...init });

const invalidCnpjs = [
    ['has less than 14 characters', '1913124300019'],
    ['has more than 14 characters', '191312430001970'],
    ['has letters in the check digits', '191312430001AB'],
    ['has symbols', '19131243000!97'],
    ['is partially formatted', '19.131.2430001-97'],
    ['has the separators in the wrong place', '191.312.43/0001-97'],
    ['has invalid check digits', '19131243000198'],
    ['has invalid alphanumeric check digits', '12ABC34501DE36'],
    ['is a repeated digit', '11111111111111'],
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

describe('# Cnpj - POST /cnpj', () => {
    it('should fetch the CNPJ on BrasilAPI, save it and return 201', async () => {
        fetchMock.mockResolvedValue(jsonResponse(brasilApiPayload));
        prismaMock.cnpj.findUnique.mockResolvedValue(null);
        prismaMock.cnpj.create.mockResolvedValue(storedCnpj);

        const response = await api.post(basePath).send({ cnpj: CNPJ });

        expect(response.status).toBe(httpStatus.CREATED);
        expect(response.body).toEqual({ message: SUCCESS.CNPJ_SAVED, cnpj: storedCnpj });
        expect(fetchMock.mock.calls[0][0]).toBe(`https://brasilapi.com.br/api/cnpj/v1/${CNPJ}`);
        expect(prismaMock.cnpj.create).toHaveBeenCalledWith({ data: { ...cnpjData, jobId: null, status: 'completed' } });
    });

    it.each([
        ['formatted', FORMATTED_CNPJ, CNPJ],
        ['formatted with surrounding spaces', `  ${FORMATTED_CNPJ} `, CNPJ],
        ['alphanumeric', ALPHANUMERIC_CNPJ, ALPHANUMERIC_CNPJ],
        ['alphanumeric, formatted and lowercase', '12.abc.345/01de-35', ALPHANUMERIC_CNPJ],
    ])('should accept the CNPJ %s and remove the formatting', async (_, cnpj, normalized) => {
        fetchMock.mockResolvedValue(jsonResponse({ ...brasilApiPayload, cnpj: normalized }));
        prismaMock.cnpj.findUnique.mockResolvedValue(null);
        prismaMock.cnpj.create.mockResolvedValue(storedCnpj);

        const response = await api.post(basePath).send({ cnpj });

        expect(response.status).toBe(httpStatus.CREATED);
        expect(fetchMock.mock.calls[0][0]).toBe(`https://brasilapi.com.br/api/cnpj/v1/${normalized}`);
        expect(prismaMock.cnpj.findUnique).toHaveBeenCalledWith({ where: { cnpj: normalized } });
        expect(prismaMock.cnpj.create.mock.calls[0][0].data.cnpj).toBe(normalized);
    });

    it('should refresh an already stored CNPJ and return 200', async () => {
        fetchMock.mockResolvedValue(jsonResponse(brasilApiPayload));
        prismaMock.cnpj.findUnique.mockResolvedValue(storedCnpj);
        prismaMock.cnpj.update.mockResolvedValue(storedCnpj);

        const response = await api.post(basePath).send({ cnpj: CNPJ });

        expect(response.status).toBe(httpStatus.OK);
        expect(response.body).toEqual({ message: SUCCESS.CNPJ_REFRESHED, cnpj: storedCnpj });
        expect(prismaMock.cnpj.update).toHaveBeenCalledWith({ where: { cnpj: CNPJ }, data: { ...cnpjFields, jobId: null, status: 'completed' } });
        expect(prismaMock.cnpj.create).not.toHaveBeenCalled();
    });

    it('should return 404 when BrasilAPI does not know the CNPJ', async () => {
        fetchMock.mockResolvedValue(jsonResponse({ type: 'not_found' }, { ok: false, status: 404 }));

        const response = await api.post(basePath).send({ cnpj: ALPHANUMERIC_CNPJ });

        expect(response.status).toBe(httpStatus.NOT_FOUND);
        expect(response.body.error).toBe(ERROR.BRASILAPI_CNPJ_NOT_FOUND);
        expect(prismaMock.cnpj.create).not.toHaveBeenCalled();
    });

    it('should return 400 when BrasilAPI rejects the CNPJ', async () => {
        fetchMock.mockResolvedValue(jsonResponse({ type: 'bad_request' }, { ok: false, status: 400 }));

        const response = await api.post(basePath).send({ cnpj: CNPJ });

        expect(response.status).toBe(httpStatus.BAD_REQUEST);
        expect(response.body.error).toBe(ERROR.BRASILAPI_CNPJ_REJECTED);
    });

    it('should return 502 when BrasilAPI fails', async () => {
        fetchMock.mockResolvedValue(jsonResponse({}, { ok: false, status: 500 }));

        const response = await api.post(basePath).send({ cnpj: CNPJ });

        expect(response.status).toBe(httpStatus.BAD_GATEWAY);
        expect(response.body.error).toBe(ERROR.BRASILAPI_REQUEST_FAILED);
    });

    it('should return 502 when BrasilAPI is unreachable', async () => {
        fetchMock.mockRejectedValue(new TypeError('fetch failed'));

        const response = await api.post(basePath).send({ cnpj: CNPJ });

        expect(response.status).toBe(httpStatus.BAD_GATEWAY);
        expect(response.body.error).toBe(ERROR.BRASILAPI_REQUEST_FAILED);
    });

    it('should return 504 when BrasilAPI times out', async () => {
        fetchMock.mockRejectedValue(new DOMException('The operation timed out.', 'TimeoutError'));

        const response = await api.post(basePath).send({ cnpj: CNPJ });

        expect(response.status).toBe(httpStatus.GATEWAY_TIMEOUT);
        expect(response.body.error).toBe(ERROR.BRASILAPI_TIMEOUT);
    });

    it('should return 500 with the save error when persistence fails', async () => {
        fetchMock.mockResolvedValue(jsonResponse(brasilApiPayload));
        prismaMock.cnpj.findUnique.mockResolvedValue(null);
        prismaMock.cnpj.create.mockRejectedValue(new Error('database offline'));

        const response = await api.post(basePath).send({ cnpj: CNPJ });

        expect(response.status).toBe(httpStatus.INTERNAL_SERVER_ERROR);
        expect(response.body.error).toBe(ERROR.SAVE_FAILED);
        expect(loggerErrorMock).toHaveBeenCalledWith('[cnpj] database offline');
    });

    it.each([
        ['is missing', {}],
        ['is not a string', { cnpj: 19131243000197 }],
        ...invalidCnpjs.map(([label, cnpj]) => [label, { cnpj }]),
    ])('should return 400 when the cnpj %s', async (_, body) => {
        const response = await api.post(basePath).send(body);

        expect(response.status).toBe(httpStatus.BAD_REQUEST);
        expect(response.body.errors).toEqual([ERROR.INVALID_CNPJ]);
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('should return 400 when the request has no body', async () => {
        const response = await api.post(basePath);

        expect(response.status).toBe(httpStatus.BAD_REQUEST);
        expect(response.body.errors).toEqual([ERROR.INVALID_CNPJ]);
    });
});

describe('# Cnpj - POST /cnpj over the BrasilAPI rate limit', () => {
    const JOB_ID = '7f1c2d3e-4b5a-4c6d-8e7f-9a0b1c2d3e4f';
    const UUID = expect.stringMatching(/^[0-9a-f-]{36}$/);

    beforeEach(() => {
        rateLimitMock.mockResolvedValue({ allowed: false, retryAfterMs: 500 });
    });

    it('should store the CNPJ as pending, queue it and return 202 with the jobId', async () => {
        prismaMock.cnpj.findUnique.mockResolvedValue(null);
        prismaMock.cnpj.create.mockResolvedValue({});

        const response = await api.post(basePath).send({ cnpj: CNPJ });

        expect(response.status).toBe(httpStatus.ACCEPTED);
        expect(response.body).toEqual({ message: SUCCESS.CNPJ_QUEUED, jobId: UUID, status: 'pending', cnpj: CNPJ });
        expect(prismaMock.cnpj.create).toHaveBeenCalledWith({
            data: { cnpj: CNPJ, jobId: response.body.jobId, status: 'pending' },
        });
        expect(queueAddMock).toHaveBeenCalledWith('enrich-cnpj', { cnpj: CNPJ }, { jobId: response.body.jobId });
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('should mark an already stored CNPJ as pending and return 202', async () => {
        prismaMock.cnpj.findUnique.mockResolvedValue(storedCnpj);
        prismaMock.cnpj.update.mockResolvedValue(storedCnpj);

        const response = await api.post(basePath).send({ cnpj: CNPJ });

        expect(response.status).toBe(httpStatus.ACCEPTED);
        expect(prismaMock.cnpj.update).toHaveBeenCalledWith({
            where: { cnpj: CNPJ },
            data: { jobId: response.body.jobId, status: 'pending' },
        });
    });

    it('should return 202 with the current jobId when the CNPJ is already queued', async () => {
        prismaMock.cnpj.findUnique.mockResolvedValue({ ...storedCnpj, jobId: JOB_ID, status: 'processing' });

        const response = await api.post(basePath).send({ cnpj: CNPJ });

        expect(response.status).toBe(httpStatus.ACCEPTED);
        expect(response.body).toEqual({
            message: SUCCESS.CNPJ_ALREADY_QUEUED,
            jobId: JOB_ID,
            status: 'processing',
            cnpj: CNPJ,
        });
        expect(queueAddMock).not.toHaveBeenCalled();
    });

    it('should return 503 and remove the pending record when the queue is unavailable', async () => {
        prismaMock.cnpj.findUnique.mockResolvedValue(null);
        prismaMock.cnpj.create.mockResolvedValue({});
        queueAddMock.mockRejectedValue(new Error('redis offline'));

        const response = await api.post(basePath).send({ cnpj: CNPJ });

        expect(response.status).toBe(httpStatus.SERVICE_UNAVAILABLE);
        expect(response.body.error).toBe(ERROR.QUEUE_UNAVAILABLE);
        expect(prismaMock.cnpj.delete).toHaveBeenCalledWith({ where: { cnpj: CNPJ } });
    });

    it('should return 503 when the rate limiter is unavailable', async () => {
        prismaMock.cnpj.findUnique.mockResolvedValue(null);
        rateLimitMock.mockRejectedValue(new Error('redis offline'));

        const response = await api.post(basePath).send({ cnpj: CNPJ });

        expect(response.status).toBe(httpStatus.SERVICE_UNAVAILABLE);
        expect(response.body.error).toBe(ERROR.QUEUE_UNAVAILABLE);
        expect(loggerErrorMock).toHaveBeenCalledWith('[cnpj] redis offline');
    });
});

describe('# Cnpj - GET /cnpj', () => {
    it('should list the stored CNPJs newest first', async () => {
        prismaMock.cnpj.findMany.mockResolvedValue([storedCnpj]);

        const response = await api.get(basePath);

        expect(response.status).toBe(httpStatus.OK);
        expect(response.body).toEqual({ message: SUCCESS.CNPJS_LISTED, total: 1, cnpjs: [storedCnpj] });
        expect(prismaMock.cnpj.findMany).toHaveBeenCalledWith({ orderBy: { createdAt: 'desc' } });
    });

    it('should return an empty list when nothing is stored', async () => {
        prismaMock.cnpj.findMany.mockResolvedValue([]);

        const response = await api.get(basePath);

        expect(response.status).toBe(httpStatus.OK);
        expect(response.body).toEqual({ message: SUCCESS.CNPJS_LISTED, total: 0, cnpjs: [] });
    });

    it('should return 500 with the fetch error when the database fails', async () => {
        prismaMock.cnpj.findMany.mockRejectedValue(new Error('database offline'));

        const response = await api.get(basePath);

        expect(response.status).toBe(httpStatus.INTERNAL_SERVER_ERROR);
        expect(response.body.error).toBe(ERROR.FETCH_FAILED);
    });
});

describe('# Cnpj - GET /cnpj/:cnpj', () => {
    it('should return the stored CNPJ data', async () => {
        prismaMock.cnpj.findUnique.mockResolvedValue(storedCnpj);

        const response = await api.get(`${basePath}/${CNPJ}`);

        expect(response.status).toBe(httpStatus.OK);
        expect(response.body).toEqual({ message: SUCCESS.CNPJ_FOUND, cnpj: storedCnpj });
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it.each([
        ['formatted (URL-encoded)', ENCODED_CNPJ, CNPJ],
        ['alphanumeric in lowercase', '12abc34501de35', ALPHANUMERIC_CNPJ],
    ])('should accept the CNPJ %s', async (_, cnpj, normalized) => {
        prismaMock.cnpj.findUnique.mockResolvedValue(storedCnpj);

        const response = await api.get(`${basePath}/${cnpj}`);

        expect(response.status).toBe(httpStatus.OK);
        expect(prismaMock.cnpj.findUnique).toHaveBeenCalledWith({ where: { cnpj: normalized } });
    });

    it('should return 404 when the CNPJ is not stored', async () => {
        prismaMock.cnpj.findUnique.mockResolvedValue(null);

        const response = await api.get(`${basePath}/${CNPJ}`);

        expect(response.status).toBe(httpStatus.NOT_FOUND);
        expect(response.body.error).toBe(ERROR.CNPJ_NOT_FOUND);
    });

    it('should return 500 with the fetch error when the database fails', async () => {
        prismaMock.cnpj.findUnique.mockRejectedValue(new Error('database offline'));

        const response = await api.get(`${basePath}/${CNPJ}`);

        expect(response.status).toBe(httpStatus.INTERNAL_SERVER_ERROR);
        expect(response.body.error).toBe(ERROR.FETCH_FAILED);
    });

    it.each(invalidCnpjs)('should return 400 when the cnpj %s', async (_, cnpj) => {
        const response = await api.get(`${basePath}/${encodeURIComponent(cnpj)}`);

        expect(response.status).toBe(httpStatus.BAD_REQUEST);
        expect(response.body.errors).toEqual([ERROR.INVALID_CNPJ]);
        expect(prismaMock.cnpj.findUnique).not.toHaveBeenCalled();
    });
});

describe('# Cnpj - PATCH /cnpj/:cnpj', () => {
    const path = `${basePath}/${CNPJ}`;

    it('should update the sent fields, normalizing and ignoring non-updatable ones', async () => {
        const updated = { ...storedCnpj, tradeName: 'OKBR', uf: 'RJ', fax: null };
        prismaMock.cnpj.update.mockResolvedValue(updated);

        const response = await api.patch(path).send({
            tradeName: '  OKBR  ',
            uf: 'rj',
            fax: '',
            cep: '01311-902',
            shareCapital: 1500.5,
            activityStartDate: '2013-10-04',
            cnpj: '00000000000191',
            id: 'ignored',
            createdAt: '2020-01-01',
        });

        expect(response.status).toBe(httpStatus.OK);
        expect(response.body).toEqual({ message: SUCCESS.CNPJ_UPDATED, cnpj: updated });
        expect(prismaMock.cnpj.update).toHaveBeenCalledWith({
            where: { cnpj: CNPJ },
            data: {
                tradeName: 'OKBR',
                fax: null,
                activityStartDate: new Date('2013-10-04'),
                cep: '01311902',
                uf: 'RJ',
                shareCapital: '1500.5',
            },
        });
    });

    it('should accept every updatable field', async () => {
        prismaMock.cnpj.update.mockResolvedValue(storedCnpj);
        const body = {
            ...JSON.parse(JSON.stringify(cnpjFields)),
            registrationStatusDate: '2013-10-03',
            activityStartDate: '2013-10-03',
            email: 'contact@ok.org.br',
            shareCapital: '1000.00',
        };

        const response = await api.patch(`${basePath}/${ENCODED_CNPJ}`).send(body);

        expect(response.status).toBe(httpStatus.OK);
        expect(prismaMock.cnpj.update).toHaveBeenCalledWith({
            where: { cnpj: CNPJ },
            data: {
                ...cnpjFields,
                email: 'contact@ok.org.br',
                shareCapital: '1000.00',
            },
        });
    });

    it('should accept null for every optional field', async () => {
        prismaMock.cnpj.update.mockResolvedValue(storedCnpj);
        const { FIELDS } = CnpjConstants;
        const nullableFields = [...FIELDS.TEXT, ...FIELDS.INTEGER, ...FIELDS.DATE, ...FIELDS.BOOLEAN, 'cep', 'uf', 'email', 'shareCapital'];
        const body = Object.fromEntries(nullableFields.map(field => [field, null]));

        const response = await api.patch(path).send(body);

        expect(response.status).toBe(httpStatus.OK);
        expect(prismaMock.cnpj.update).toHaveBeenCalledWith({ where: { cnpj: CNPJ }, data: body });
    });

    it('should accept empty lists', async () => {
        prismaMock.cnpj.update.mockResolvedValue(storedCnpj);

        const response = await api.patch(path).send({ qsa: [], secondaryCnaes: [], taxRegimes: [] });

        expect(response.status).toBe(httpStatus.OK);
        expect(prismaMock.cnpj.update).toHaveBeenCalledWith({
            where: { cnpj: CNPJ },
            data: { qsa: [], secondaryCnaes: [], taxRegimes: [] },
        });
    });

    it('should return 404 when the CNPJ is not stored', async () => {
        prismaMock.cnpj.update.mockRejectedValue(prismaError('P2025'));

        const response = await api.patch(path).send({ tradeName: 'OKBR' });

        expect(response.status).toBe(httpStatus.NOT_FOUND);
        expect(response.body.error).toBe(ERROR.CNPJ_NOT_FOUND);
    });

    it('should return 500 with the update error when the database fails', async () => {
        prismaMock.cnpj.update.mockRejectedValue(new Error('database offline'));

        const response = await api.patch(path).send({ tradeName: 'OKBR' });

        expect(response.status).toBe(httpStatus.INTERNAL_SERVER_ERROR);
        expect(response.body.error).toBe(ERROR.UPDATE_FAILED);
    });

    it.each(invalidCnpjs)('should return 400 when the cnpj param %s', async (_, cnpj) => {
        const response = await api.patch(`${basePath}/${encodeURIComponent(cnpj)}`).send({ tradeName: 'OKBR' });

        expect(response.status).toBe(httpStatus.BAD_REQUEST);
        expect(response.body.errors).toEqual([ERROR.INVALID_CNPJ]);
    });

    it.each([
        ['corporateName is null', { corporateName: null }, ERROR.INVALID_CORPORATE_NAME],
        ['corporateName is blank', { corporateName: '   ' }, ERROR.INVALID_CORPORATE_NAME],
        ['corporateName is too long', { corporateName: 'x'.repeat(256) }, ERROR.INVALID_CORPORATE_NAME],
        ['corporateName is not a string', { corporateName: 1 }, ERROR.INVALID_CORPORATE_NAME],
        ['tradeName is not a string', { tradeName: 1 }, ERROR.INVALID_TEXT_FIELD('tradeName')],
        ['street is too long', { street: 'x'.repeat(256) }, ERROR.INVALID_TEXT_FIELD('street')],
        ['primaryPhone is a number', { primaryPhone: 1123851939 }, ERROR.INVALID_TEXT_FIELD('primaryPhone')],
        ['mainCnaeCode is a string', { mainCnaeCode: '9430800' }, ERROR.INVALID_INTEGER_FIELD('mainCnaeCode')],
        ['cityCode is a decimal', { cityCode: 71.07 }, ERROR.INVALID_INTEGER_FIELD('cityCode')],
        ['countryCode is negative', { countryCode: -1 }, ERROR.INVALID_INTEGER_FIELD('countryCode')],
        ['cityIbgeCode is too big', { cityIbgeCode: 2147483648 }, ERROR.INVALID_INTEGER_FIELD('cityIbgeCode')],
        ['activityStartDate is not a string', { activityStartDate: 20131003 }, ERROR.INVALID_DATE_FIELD('activityStartDate')],
        ['activityStartDate is in another format', { activityStartDate: '03/10/2013' }, ERROR.INVALID_DATE_FIELD('activityStartDate')],
        ['meiOptionDate has a time', { meiOptionDate: '2013-10-03T10:00:00Z' }, ERROR.INVALID_DATE_FIELD('meiOptionDate')],
        ['specialStatusDate does not exist', { specialStatusDate: '2023-02-30' }, ERROR.INVALID_DATE_FIELD('specialStatusDate')],
        ['optedForSimples is a string', { optedForSimples: 'true' }, ERROR.INVALID_BOOLEAN_FIELD('optedForSimples')],
        ['optedForMei is a number', { optedForMei: 1 }, ERROR.INVALID_BOOLEAN_FIELD('optedForMei')],
        ['qsa is null', { qsa: null }, ERROR.INVALID_LIST_FIELD('qsa')],
        ['qsa is an object', { qsa: { partnerName: 'X' } }, ERROR.INVALID_LIST_FIELD('qsa')],
        ['secondaryCnaes has a non-object item', { secondaryCnaes: [{ code: 1 }, 'x'] }, ERROR.INVALID_LIST_FIELD('secondaryCnaes')],
        ['taxRegimes has a null item', { taxRegimes: [null] }, ERROR.INVALID_LIST_FIELD('taxRegimes')],
        ['taxRegimes has a list item', { taxRegimes: [[]] }, ERROR.INVALID_LIST_FIELD('taxRegimes')],
        ['cep is not a string', { cep: 1311902 }, ERROR.INVALID_CEP],
        ['cep has 7 digits', { cep: '0131190' }, ERROR.INVALID_CEP],
        ['uf is not a string', { uf: 12 }, ERROR.INVALID_UF],
        ['uf has 3 letters', { uf: 'SPP' }, ERROR.INVALID_UF],
        ['email is not a string', { email: 1 }, ERROR.INVALID_EMAIL],
        ['email is invalid', { email: 'not-an-email' }, ERROR.INVALID_EMAIL],
        ['shareCapital is negative', { shareCapital: -1 }, ERROR.INVALID_SHARE_CAPITAL],
        ['shareCapital has 3 decimal places', { shareCapital: '10.123' }, ERROR.INVALID_SHARE_CAPITAL],
        ['shareCapital is not numeric', { shareCapital: 'ten' }, ERROR.INVALID_SHARE_CAPITAL],
        ['shareCapital is too big', { shareCapital: 1e21 }, ERROR.INVALID_SHARE_CAPITAL],
        ['shareCapital is a boolean', { shareCapital: true }, ERROR.INVALID_SHARE_CAPITAL],
    ])('should return 400 when %s', async (_, body, message) => {
        const response = await api.patch(path).send(body);

        expect(response.status).toBe(httpStatus.BAD_REQUEST);
        expect(response.body.errors).toEqual([message]);
        expect(prismaMock.cnpj.update).not.toHaveBeenCalled();
    });

    it('should return every validation error at once', async () => {
        const response = await api.patch(path).send({ corporateName: '', mainCnaeCode: 'x', uf: 'X' });

        expect(response.status).toBe(httpStatus.BAD_REQUEST);
        expect(response.body.errors).toEqual([
            ERROR.INVALID_CORPORATE_NAME,
            ERROR.INVALID_INTEGER_FIELD('mainCnaeCode'),
            ERROR.INVALID_UF,
        ]);
    });

    it('should return 400 when no updatable field is sent', async () => {
        const response = await api.patch(path).send({ cnpj: '00000000000191', id: 'x' });

        expect(response.status).toBe(httpStatus.BAD_REQUEST);
        expect(response.body.errors).toEqual([ERROR.EMPTY_UPDATE]);
    });

    it('should return 400 when the request has no body', async () => {
        const response = await api.patch(path);

        expect(response.status).toBe(httpStatus.BAD_REQUEST);
        expect(response.body.errors).toEqual([ERROR.EMPTY_UPDATE]);
    });
});

describe('# Cnpj - DELETE /cnpj/:cnpj', () => {
    it('should delete the stored CNPJ and return it', async () => {
        prismaMock.cnpj.delete.mockResolvedValue(storedCnpj);

        const response = await api.delete(`${basePath}/${ENCODED_CNPJ}`);

        expect(response.status).toBe(httpStatus.OK);
        expect(response.body).toEqual({ message: SUCCESS.CNPJ_DELETED, cnpj: storedCnpj });
        expect(prismaMock.cnpj.delete).toHaveBeenCalledWith({ where: { cnpj: CNPJ } });
    });

    it('should return 404 when the CNPJ is not stored', async () => {
        prismaMock.cnpj.delete.mockRejectedValue(prismaError('P2025'));

        const response = await api.delete(`${basePath}/${CNPJ}`);

        expect(response.status).toBe(httpStatus.NOT_FOUND);
        expect(response.body.error).toBe(ERROR.CNPJ_NOT_FOUND);
    });

    it('should return 500 with the delete error when the database fails', async () => {
        prismaMock.cnpj.delete.mockRejectedValue(new Error('database offline'));

        const response = await api.delete(`${basePath}/${CNPJ}`);

        expect(response.status).toBe(httpStatus.INTERNAL_SERVER_ERROR);
        expect(response.body.error).toBe(ERROR.DELETE_FAILED);
    });

    it.each(invalidCnpjs)('should return 400 when the cnpj %s', async (_, cnpj) => {
        const response = await api.delete(`${basePath}/${encodeURIComponent(cnpj)}`);

        expect(response.status).toBe(httpStatus.BAD_REQUEST);
        expect(response.body.errors).toEqual([ERROR.INVALID_CNPJ]);
        expect(prismaMock.cnpj.delete).not.toHaveBeenCalled();
    });
});

describe('# Cnpj - authentication', () => {
    it.each([
        ['POST', 'post', basePath],
        ['GET', 'get', `${basePath}/${CNPJ}`],
        ['PATCH', 'patch', `${basePath}/${CNPJ}`],
        ['DELETE', 'delete', `${basePath}/${CNPJ}`],
    ])('should return 401 on %s without a token', async (_, method, path) => {
        const response = await request(app)[method](path).send({});

        expect(response.status).toBe(httpStatus.UNAUTHORIZED);
        expect(response.body.error).toBe('Authentication token was not provided.');
        expect(prismaMock.cnpj.findUnique).not.toHaveBeenCalled();
    });

    it('should return 401 when the token is invalid', async () => {
        const response = await request(app).get(`${basePath}/${CNPJ}`).set('Authorization', 'Bearer not-a-jwt');

        expect(response.status).toBe(httpStatus.UNAUTHORIZED);
        expect(response.body.error).toBe('Authentication token is invalid or expired.');
    });
});
