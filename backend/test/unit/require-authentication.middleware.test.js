import { jest } from '@jest/globals';

const authenticateMock = jest.fn();

jest.unstable_mockModule('../../src/modules/auth/auth.middleware.js', () => ({ default: authenticateMock }));

const { default: requireAuthentication } = await import('../../src/middlewares/require-authentication.middleware.js');

const middleware = requireAuthentication(['POST /api/v1/auth/login']);
const run = (method, path) => {
    const req = { method, path };
    const res = {};
    const next = jest.fn();
    middleware(req, res, next);
    return { req, res, next };
};

describe('# requireAuthentication middleware', () => {
    it.each([
        ['the exact public route', 'POST', '/api/v1/auth/login'],
        ['a trailing slash', 'POST', '/api/v1/auth/login/'],
        ['another letter case', 'post', '/API/v1/Auth/LOGIN'],
    ])('should skip the authentication on %s', (_, method, path) => {
        const { next } = run(method, path);

        expect(next).toHaveBeenCalledWith();
        expect(authenticateMock).not.toHaveBeenCalled();
    });

    it.each([
        ['another method on a public path', 'GET', '/api/v1/auth/login'],
        ['a private route', 'GET', '/api/v1/cep/01001000'],
        ['the root', 'GET', '/'],
    ])('should authenticate %s', (_, method, path) => {
        const { req, res, next } = run(method, path);

        expect(authenticateMock).toHaveBeenCalledWith(req, res, next);
        expect(next).not.toHaveBeenCalled();
    });
});
