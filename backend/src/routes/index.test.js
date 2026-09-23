import { jest } from '@jest/globals';
import request from 'supertest';
import httpStatus from 'http-status';

const prismaMock = {
    $queryRaw: jest.fn().mockResolvedValue([1]),
    user: { findUnique: jest.fn(), create: jest.fn() },
};

jest.unstable_mockModule('../services/prisma.service.js', () => ({ default: prismaMock }));
jest.unstable_mockModule('../services/logger.service.js', () => ({
    default: class {
        error() {}
    },
}));

const { default: app } = await import('../app.js');
const { PUBLIC_ROUTES } = await import('./index.js');
const { authenticatedRequest } = await import('../../test/helpers/auth.helper.js');
const { AuthConstants } = await import('../modules/auth/auth.constants.js');

const { ERROR } = AuthConstants.MESSAGES;
const api = authenticatedRequest(app);

describe('# Routes - authentication', () => {
    it('should keep only register, login, forgot-password and reset-password public', () => {
        expect(PUBLIC_ROUTES).toEqual([
            'POST /api/v1/auth/register',
            'POST /api/v1/auth/login',
            'POST /api/v1/auth/forgot-password',
            'POST /api/v1/auth/reset-password',
        ]);
    });

    it.each([
        ['register', '/api/v1/auth/register'],
        ['login', '/api/v1/auth/login'],
        ['login with a trailing slash', '/api/v1/auth/login/'],
        ['forgot-password', '/api/v1/auth/forgot-password'],
        ['reset-password', '/api/v1/auth/reset-password'],
    ])('should let an unauthenticated user reach %s', async (_, path) => {
        const response = await request(app).post(path).send({});

        expect(response.status).toBe(httpStatus.BAD_REQUEST);
        expect(response.body.errors).toEqual(expect.any(Array));
    });

    it.each([
        ['GET the status', 'get', '/api/v1/status'],
        ['GET login (only POST is public)', 'get', '/api/v1/auth/login'],
        ['PATCH a user', 'patch', '/api/v1/auth/users/3f6c1a52-8d1e-4b4e-9d57-6f7e2a1b9c10'],
        ['an unknown route', 'get', '/api/v1/unknown'],
        ['an unknown route outside the API', 'get', '/'],
    ])('should return 401 to an unauthenticated user on %s', async (_, method, path) => {
        const response = await request(app)[method](path);

        expect(response.status).toBe(httpStatus.UNAUTHORIZED);
        expect(response.body.error).toBe(ERROR.TOKEN_MISSING);
    });

    it('should return 401 when the token is invalid', async () => {
        const response = await request(app).get('/api/v1/status').set('Authorization', 'Bearer not-a-jwt');

        expect(response.status).toBe(httpStatus.UNAUTHORIZED);
        expect(response.body.error).toBe(ERROR.TOKEN_INVALID);
    });

    it('should return the status to an authenticated user', async () => {
        const response = await api.get('/api/v1/status');

        expect(response.status).toBe(httpStatus.OK);
        expect(response.body).toMatchObject({ projectName: 'br-data-hub-v2', isDatabaseAlive: true });
    });

    it('should return 404 for an unknown route only to an authenticated user', async () => {
        const response = await api.get('/api/v1/unknown');

        expect(response.status).toBe(httpStatus.NOT_FOUND);
    });
});
