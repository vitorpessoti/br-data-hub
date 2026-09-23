import jwt from 'jsonwebtoken';
import request from 'supertest';

export const TEST_JWT_SECRET = 'test-secret';
export const TEST_USER = { id: '3f6c1a52-8d1e-4b4e-9d57-6f7e2a1b9c10', email: 'tester@example.com' };

// Uses the JWT_SECRET of the environment (.env in the E2E tests) or the test secret.
export const signTestToken = () => {
    process.env.JWT_SECRET ||= TEST_JWT_SECRET;
    return jwt.sign({ sub: TEST_USER.id, email: TEST_USER.email }, process.env.JWT_SECRET, { expiresIn: '1h' });
};

// supertest with "Authorization: Bearer <token>" on every request (every route but register/login needs it).
export const authenticatedRequest = app => Object.fromEntries(
    ['get', 'post', 'patch', 'put', 'delete'].map(method => [
        method,
        path => request(app)[method](path).set('Authorization', `Bearer ${signTestToken()}`),
    ])
);
