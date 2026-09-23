// End-to-end: real HTTP app, real PostgreSQL (DATABASE_URL from .env) and the real ViaCEP API.
// Run with: npm run test:e2e
import request from 'supertest';
import httpStatus from 'http-status';
import app from '../../src/app.js';
import { authenticatedRequest } from '../helpers/auth.helper.js';
import prisma from '../../src/services/prisma.service.js';
import { getRedisClient, closeRedisClient } from '../../src/config/redis.config.js';
import { CepConstants } from '../../src/modules/cep/cep.constants.js';


const api = authenticatedRequest(app);
const { SUCCESS, ERROR } = CepConstants.MESSAGES;
const basePath = '/api/v1/cep';

// Praça da Sé, São Paulo/SP: a stable, well-known CEP.
const CEP = '01001000';
const UNKNOWN_CEP = '99999999';

const removeTestData = () => prisma.cep.deleteMany({ where: { cep: { in: [CEP, UNKNOWN_CEP] } } });

beforeAll(removeTestData);

// Each request starts on a fresh viacep rate limit window, so these direct enrichments are never queued
// (the queue flow is covered by rate-limit.e2e.test.js).
beforeEach(() => getRedisClient().del('rate-limit:viacep'));

afterAll(async () => {
    await removeTestData();
    await closeRedisClient();
    await prisma.$disconnect();
});

describe('# Cep E2E - full lifecycle', () => {
    it('should return 404 before the CEP is enriched', async () => {
        const response = await api.get(`${basePath}/${CEP}`);

        expect(response.status).toBe(httpStatus.NOT_FOUND);
        expect(response.body.error).toBe(ERROR.CEP_NOT_FOUND);
    });

    it('should fetch the CEP on ViaCEP and save it', async () => {
        const response = await api.post(basePath).send({ cep: '01001-000' });

        expect(response.status).toBe(httpStatus.CREATED);
        expect(response.body.message).toBe(SUCCESS.CEP_SAVED);
        expect(response.body.cep).toMatchObject({
            cep: CEP,
            street: 'Praça da Sé',
            neighborhood: 'Sé',
            city: 'São Paulo',
            uf: 'SP',
            state: 'São Paulo',
            region: 'Sudeste',
            ibgeCode: '3550308',
            ddd: '11',
            siafiCode: '7107',
        });
        expect(response.body.cep.id).toEqual(expect.any(String));

        const stored = await prisma.cep.findUnique({ where: { cep: CEP } });
        expect(stored.city).toBe('São Paulo');
    });

    it('should return the stored data', async () => {
        const response = await api.get(`${basePath}/01001-000`);

        expect(response.status).toBe(httpStatus.OK);
        expect(response.body.message).toBe(SUCCESS.CEP_FOUND);
        expect(response.body.cep).toMatchObject({ cep: CEP, city: 'São Paulo', uf: 'SP' });
    });

    it('should update the stored data', async () => {
        const response = await api
            .patch(`${basePath}/${CEP}`)
            .send({ street: 'Updated street', complement: null });

        expect(response.status).toBe(httpStatus.OK);
        expect(response.body.message).toBe(SUCCESS.CEP_UPDATED);
        expect(response.body.cep).toMatchObject({ street: 'Updated street', complement: null, city: 'São Paulo' });

        const stored = await prisma.cep.findUnique({ where: { cep: CEP } });
        expect(stored.street).toBe('Updated street');
        expect(stored.complement).toBeNull();
    });

    it('should refresh the stored data from ViaCEP when enriched again', async () => {
        const response = await api.post(basePath).send({ cep: CEP });

        expect(response.status).toBe(httpStatus.OK);
        expect(response.body.message).toBe(SUCCESS.CEP_REFRESHED);
        expect(response.body.cep.street).toBe('Praça da Sé');
        expect(await prisma.cep.count({ where: { cep: CEP } })).toBe(1);
    });

    it('should delete the stored data', async () => {
        const response = await api.delete(`${basePath}/${CEP}`);

        expect(response.status).toBe(httpStatus.OK);
        expect(response.body.message).toBe(SUCCESS.CEP_DELETED);
        expect(response.body.cep.cep).toBe(CEP);
        expect(await prisma.cep.findUnique({ where: { cep: CEP } })).toBeNull();
    });

    it('should return 404 when updating or deleting a CEP that is no longer stored', async () => {
        const update = await api.patch(`${basePath}/${CEP}`).send({ city: 'Santos' });
        const remove = await api.delete(`${basePath}/${CEP}`);

        expect(update.status).toBe(httpStatus.NOT_FOUND);
        expect(update.body.error).toBe(ERROR.CEP_NOT_FOUND);
        expect(remove.status).toBe(httpStatus.NOT_FOUND);
        expect(remove.body.error).toBe(ERROR.CEP_NOT_FOUND);
    });
});

describe('# Cep E2E - errors', () => {
    it('should return 404 and store nothing when ViaCEP does not know the CEP', async () => {
        const response = await api.post(basePath).send({ cep: UNKNOWN_CEP });

        expect(response.status).toBe(httpStatus.NOT_FOUND);
        expect(response.body.error).toBe(ERROR.VIACEP_CEP_NOT_FOUND);
        expect(await prisma.cep.findUnique({ where: { cep: UNKNOWN_CEP } })).toBeNull();
    });

    it('should return 400 for an invalid CEP without calling ViaCEP', async () => {
        const response = await api.post(basePath).send({ cep: '123' });

        expect(response.status).toBe(httpStatus.BAD_REQUEST);
        expect(response.body.errors).toEqual([ERROR.INVALID_CEP]);
    });
});

describe('# Cep E2E - authentication', () => {
    it('should return 401 without a token and never reach the database', async () => {
        const response = await request(app).post(basePath).send({ cep: '01001000' });

        expect(response.status).toBe(httpStatus.UNAUTHORIZED);
        expect(await prisma.cep.findUnique({ where: { cep: '01001000' } })).toBeNull();
    });
});
