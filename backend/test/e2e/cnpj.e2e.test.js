// End-to-end: real HTTP app, real PostgreSQL (DATABASE_URL from .env) and the real BrasilAPI.
// Run with: npm run test:e2e
import request from 'supertest';
import httpStatus from 'http-status';
import app from '../../src/app.js';
import { authenticatedRequest } from '../helpers/auth.helper.js';
import prisma from '../../src/services/prisma.service.js';
import { getRedisClient, closeRedisClient } from '../../src/config/redis.config.js';
import { CnpjConstants } from '../../src/modules/cnpj/cnpj.constants.js';


const api = authenticatedRequest(app);
const { SUCCESS, ERROR } = CnpjConstants.MESSAGES;
const basePath = '/api/v1/cnpj';

// Open Knowledge Brasil: a stable, well-known CNPJ.
const CNPJ = '19131243000197';
const FORMATTED_CNPJ = '19.131.243/0001-97';
// Receita Federal's alphanumeric example: valid check digits, not registered.
const UNKNOWN_CNPJ = '12ABC34501DE35';

const removeTestData = () => prisma.cnpj.deleteMany({ where: { cnpj: { in: [CNPJ, UNKNOWN_CNPJ] } } });

beforeAll(removeTestData);

// Each request starts on a fresh brasilapi rate limit window, so these direct enrichments are never queued
// (the queue flow is covered by rate-limit.e2e.test.js).
beforeEach(() => getRedisClient().del('rate-limit:brasilapi'));

afterAll(async () => {
    await removeTestData();
    await closeRedisClient();
    await prisma.$disconnect();
});

describe('# Cnpj E2E - full lifecycle', () => {
    it('should return 404 before the CNPJ is enriched', async () => {
        const response = await api.get(`${basePath}/${CNPJ}`);

        expect(response.status).toBe(httpStatus.NOT_FOUND);
        expect(response.body.error).toBe(ERROR.CNPJ_NOT_FOUND);
    });

    it('should fetch the formatted CNPJ on BrasilAPI and save it without formatting', async () => {
        const response = await api.post(basePath).send({ cnpj: FORMATTED_CNPJ });

        expect(response.status).toBe(httpStatus.CREATED);
        expect(response.body.message).toBe(SUCCESS.CNPJ_SAVED);
        expect(response.body.cnpj).toMatchObject({
            cnpj: CNPJ,
            corporateName: 'OPEN KNOWLEDGE BRASIL',
            establishmentType: 'MATRIZ',
            legalNatureCode: 3999,
            activityStartDate: '2013-10-03T00:00:00.000Z',
            cep: '01311902',
            uf: 'SP',
            cityIbgeCode: 3550308,
        });
        expect(response.body.cnpj.id).toEqual(expect.any(String));
        expect(response.body.cnpj.qsa[0]).toEqual(expect.objectContaining({
            partnerName: expect.any(String),
            partnerQualification: expect.any(String),
        }));
        expect(response.body.cnpj.secondaryCnaes[0]).toEqual({ code: expect.any(Number), description: expect.any(String) });
        expect(response.body.cnpj.taxRegimes[0]).toEqual(expect.objectContaining({ year: expect.any(Number) }));

        const stored = await prisma.cnpj.findUnique({ where: { cnpj: CNPJ } });
        expect(stored.corporateName).toBe('OPEN KNOWLEDGE BRASIL');
    });

    it('should return the stored data', async () => {
        const response = await api.get(`${basePath}/${encodeURIComponent(FORMATTED_CNPJ)}`);

        expect(response.status).toBe(httpStatus.OK);
        expect(response.body.message).toBe(SUCCESS.CNPJ_FOUND);
        expect(response.body.cnpj).toMatchObject({ cnpj: CNPJ, corporateName: 'OPEN KNOWLEDGE BRASIL', uf: 'SP' });
    });

    it('should update the stored data', async () => {
        const response = await api
            .patch(`${basePath}/${CNPJ}`)
            .send({ tradeName: 'OKBR', complement: null, shareCapital: 1500.5, activityStartDate: '2013-10-04', qsa: [] });

        expect(response.status).toBe(httpStatus.OK);
        expect(response.body.message).toBe(SUCCESS.CNPJ_UPDATED);
        expect(response.body.cnpj).toMatchObject({
            tradeName: 'OKBR',
            complement: null,
            shareCapital: '1500.5',
            activityStartDate: '2013-10-04T00:00:00.000Z',
            qsa: [],
            corporateName: 'OPEN KNOWLEDGE BRASIL',
        });

        const stored = await prisma.cnpj.findUnique({ where: { cnpj: CNPJ } });
        expect(stored.tradeName).toBe('OKBR');
        expect(stored.complement).toBeNull();
        expect(stored.shareCapital.toString()).toBe('1500.5');
    });

    it('should refresh the stored data from BrasilAPI when enriched again', async () => {
        const response = await api.post(basePath).send({ cnpj: CNPJ });

        expect(response.status).toBe(httpStatus.OK);
        expect(response.body.message).toBe(SUCCESS.CNPJ_REFRESHED);
        expect(response.body.cnpj.tradeName).toBe('REDE PELO CONHECIMENTO LIVRE');
        expect(response.body.cnpj.qsa.length).toBeGreaterThan(0);
        expect(await prisma.cnpj.count({ where: { cnpj: CNPJ } })).toBe(1);
    });

    it('should delete the stored data', async () => {
        const response = await api.delete(`${basePath}/${CNPJ}`);

        expect(response.status).toBe(httpStatus.OK);
        expect(response.body.message).toBe(SUCCESS.CNPJ_DELETED);
        expect(response.body.cnpj.cnpj).toBe(CNPJ);
        expect(await prisma.cnpj.findUnique({ where: { cnpj: CNPJ } })).toBeNull();
    });

    it('should return 404 when updating or deleting a CNPJ that is no longer stored', async () => {
        const update = await api.patch(`${basePath}/${CNPJ}`).send({ tradeName: 'OKBR' });
        const remove = await api.delete(`${basePath}/${CNPJ}`);

        expect(update.status).toBe(httpStatus.NOT_FOUND);
        expect(update.body.error).toBe(ERROR.CNPJ_NOT_FOUND);
        expect(remove.status).toBe(httpStatus.NOT_FOUND);
        expect(remove.body.error).toBe(ERROR.CNPJ_NOT_FOUND);
    });
});

describe('# Cnpj E2E - errors', () => {
    it('should return 404 and store nothing when BrasilAPI does not know the alphanumeric CNPJ', async () => {
        const response = await api.post(basePath).send({ cnpj: '12.ABC.345/01DE-35' });

        expect(response.status).toBe(httpStatus.NOT_FOUND);
        expect(response.body.error).toBe(ERROR.BRASILAPI_CNPJ_NOT_FOUND);
        expect(await prisma.cnpj.findUnique({ where: { cnpj: UNKNOWN_CNPJ } })).toBeNull();
    });

    it('should return 400 for a CNPJ with invalid check digits without calling BrasilAPI', async () => {
        const response = await api.post(basePath).send({ cnpj: '19131243000198' });

        expect(response.status).toBe(httpStatus.BAD_REQUEST);
        expect(response.body.errors).toEqual([ERROR.INVALID_CNPJ]);
    });
});

describe('# Cnpj E2E - authentication', () => {
    it('should return 401 without a token and never reach the database', async () => {
        const response = await request(app).post(basePath).send({ cnpj: '19131243000197' });

        expect(response.status).toBe(httpStatus.UNAUTHORIZED);
        expect(await prisma.cnpj.findUnique({ where: { cnpj: '19131243000197' } })).toBeNull();
    });
});
