import crypto from 'crypto';
import { jest } from '@jest/globals';
import request from 'supertest';
import httpStatus from 'http-status';

const prismaMock = {
    $queryRaw: jest.fn(),
    user: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
    },
};

const loggerErrorMock = jest.fn();
const emailSendMock = jest.fn().mockResolvedValue({ skipped: true });

jest.unstable_mockModule('../../services/prisma.service.js', () => ({ default: prismaMock }));
jest.unstable_mockModule('../../services/logger.service.js', () => ({
    default: class {
        error(message) {
            loggerErrorMock(message);
        }
    },
}));
jest.unstable_mockModule('../../services/email.service.js', () => ({
    default: class {
        send(...args) {
            return emailSendMock(...args);
        }
    },
}));

const { default: app } = await import('../../app.js');
const { default: bcrypt } = await import('bcrypt');
const { default: jwt } = await import('jsonwebtoken');
const { AuthConstants } = await import('./auth.constants.js');

const { SUCCESS, ERROR } = AuthConstants.MESSAGES;
const basePath = '/api/v1/auth';
const JWT_SECRET = 'test-secret';

const USER_ID = '3f6c1a52-8d1e-4b4e-9d57-6f7e2a1b9c10';
const OTHER_USER_ID = '9a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d';
const PASSWORD = 'strong-password';

const publicUser = {
    id: USER_ID,
    name: 'John Doe',
    email: 'john@example.com',
    active: true,
    createdAt: '2026-09-20T00:00:00.000Z',
    updatedAt: '2026-09-20T00:00:00.000Z',
};

const tokenFor = (id = USER_ID, options = {}) =>
    jwt.sign({ sub: id, email: publicUser.email }, JWT_SECRET, { expiresIn: '1h', ...options });

beforeEach(() => {
    process.env.JWT_SECRET = JWT_SECRET;
    process.env.FRONTEND_URL = 'http://localhost:4000';
    delete process.env.JWT_EXPIRES_IN;
    delete process.env.RESET_PASSWORD_TOKEN_EXPIRES_IN_MINUTES;
});

describe('# Auth - POST /auth/register', () => {
    const payload = { name: 'John Doe', email: 'John@Example.com', password: PASSWORD };

    it('should register a user storing a bcrypt hash of the password', async () => {
        prismaMock.user.findUnique.mockResolvedValue(null);
        prismaMock.user.create.mockResolvedValue(publicUser);

        const response = await request(app).post(`${basePath}/register`).send(payload);

        expect(response.status).toBe(httpStatus.CREATED);
        expect(response.body).toEqual({ message: SUCCESS.USER_REGISTERED, user: publicUser });
        expect(prismaMock.user.findUnique).toHaveBeenCalledWith({ where: { email: 'john@example.com' } });

        const { data, select } = prismaMock.user.create.mock.calls[0][0];
        expect(data.name).toBe('John Doe');
        expect(data.email).toBe('john@example.com');
        expect(data.password).not.toBe(PASSWORD);
        expect(await bcrypt.compare(PASSWORD, data.password)).toBe(true);
        expect(select.password).toBeUndefined();
    });

    it('should return 409 when the email is already registered', async () => {
        prismaMock.user.findUnique.mockResolvedValue({ ...publicUser, password: 'hash' });

        const response = await request(app).post(`${basePath}/register`).send(payload);

        expect(response.status).toBe(httpStatus.CONFLICT);
        expect(response.body.error).toBe(ERROR.EMAIL_ALREADY_IN_USE);
        expect(prismaMock.user.create).not.toHaveBeenCalled();
    });

    it('should return 409 when the database rejects a duplicated email', async () => {
        prismaMock.user.findUnique.mockResolvedValue(null);
        prismaMock.user.create.mockRejectedValue(Object.assign(new Error('Unique constraint'), { code: 'P2002' }));

        const response = await request(app).post(`${basePath}/register`).send(payload);

        expect(response.status).toBe(httpStatus.CONFLICT);
        expect(response.body.error).toBe(ERROR.EMAIL_ALREADY_IN_USE);
    });

    it('should return 500 with the register error message on unexpected failures', async () => {
        prismaMock.user.findUnique.mockRejectedValue(new Error('database offline'));

        const response = await request(app).post(`${basePath}/register`).send(payload);

        expect(response.status).toBe(httpStatus.INTERNAL_SERVER_ERROR);
        expect(response.body.error).toBe(ERROR.REGISTER_FAILED);
        expect(loggerErrorMock).toHaveBeenCalledWith('[auth] database offline');
    });

    it.each([
        ['name is missing', { ...payload, name: undefined }, ERROR.INVALID_NAME],
        ['name is not a string', { ...payload, name: 123 }, ERROR.INVALID_NAME],
        ['name is blank', { ...payload, name: '   ' }, ERROR.INVALID_NAME],
        ['name is too long', { ...payload, name: 'x'.repeat(256) }, ERROR.INVALID_NAME],
        ['email is not a string', { ...payload, email: 123 }, ERROR.INVALID_EMAIL],
        ['email is malformed', { ...payload, email: 'not-an-email' }, ERROR.INVALID_EMAIL],
        ['password is not a string', { ...payload, password: 12345678 }, ERROR.INVALID_PASSWORD],
        ['password is too short', { ...payload, password: 'short' }, ERROR.INVALID_PASSWORD],
        ['password is too long', { ...payload, password: 'x'.repeat(73) }, ERROR.INVALID_PASSWORD],
    ])('should return 400 when %s', async (_, body, message) => {
        const response = await request(app).post(`${basePath}/register`).send(body);

        expect(response.status).toBe(httpStatus.BAD_REQUEST);
        expect(response.body.errors).toEqual([message]);
        expect(prismaMock.user.create).not.toHaveBeenCalled();
    });
});

describe('# Auth - POST /auth/login', () => {
    let storedUser;

    beforeAll(async () => {
        storedUser = {
            ...publicUser,
            password: await bcrypt.hash(PASSWORD, 4),
            resetPasswordTokenHash: 'some-leftover-hash',
            resetPasswordExpiresAt: new Date('2026-09-20T00:00:00.000Z'),
        };
    });

    it('should return a valid token and the user without the password or reset-password fields', async () => {
        prismaMock.user.findUnique.mockResolvedValue(storedUser);

        const response = await request(app)
            .post(`${basePath}/login`)
            .send({ email: publicUser.email, password: PASSWORD });

        expect(response.status).toBe(httpStatus.OK);
        expect(response.body.message).toBe(SUCCESS.LOGIN_SUCCEEDED);
        expect(response.body.tokenType).toBe(AuthConstants.TOKEN_TYPE);
        expect(response.body.user).toEqual(publicUser);
        expect(response.body.user.resetPasswordTokenHash).toBeUndefined();
        expect(response.body.user.resetPasswordExpiresAt).toBeUndefined();

        const payload = jwt.verify(response.body.token, JWT_SECRET);
        expect(payload.sub).toBe(USER_ID);
        expect(payload.email).toBe(publicUser.email);
        expect(payload.exp - payload.iat).toBe(60 * 60);
    });

    it('should use JWT_EXPIRES_IN when configured', async () => {
        process.env.JWT_EXPIRES_IN = '2h';
        prismaMock.user.findUnique.mockResolvedValue(storedUser);

        const response = await request(app)
            .post(`${basePath}/login`)
            .send({ email: publicUser.email, password: PASSWORD });

        const payload = jwt.verify(response.body.token, JWT_SECRET);
        expect(payload.exp - payload.iat).toBe(2 * 60 * 60);
    });

    it('should return 401 when the email is not registered', async () => {
        prismaMock.user.findUnique.mockResolvedValue(null);

        const response = await request(app)
            .post(`${basePath}/login`)
            .send({ email: 'ghost@example.com', password: PASSWORD });

        expect(response.status).toBe(httpStatus.UNAUTHORIZED);
        expect(response.body.error).toBe(ERROR.INVALID_CREDENTIALS);
    });

    it('should return 401 when the password is wrong', async () => {
        prismaMock.user.findUnique.mockResolvedValue(storedUser);

        const response = await request(app)
            .post(`${basePath}/login`)
            .send({ email: publicUser.email, password: 'wrong-password' });

        expect(response.status).toBe(httpStatus.UNAUTHORIZED);
        expect(response.body.error).toBe(ERROR.INVALID_CREDENTIALS);
    });

    it('should return 403 when the user is inactive', async () => {
        prismaMock.user.findUnique.mockResolvedValue({ ...storedUser, active: false });

        const response = await request(app)
            .post(`${basePath}/login`)
            .send({ email: publicUser.email, password: PASSWORD });

        expect(response.status).toBe(httpStatus.FORBIDDEN);
        expect(response.body.error).toBe(ERROR.INACTIVE_USER);
    });

    it('should return 500 when JWT_SECRET is not configured', async () => {
        delete process.env.JWT_SECRET;
        prismaMock.user.findUnique.mockResolvedValue(storedUser);

        const response = await request(app)
            .post(`${basePath}/login`)
            .send({ email: publicUser.email, password: PASSWORD });

        expect(response.status).toBe(httpStatus.INTERNAL_SERVER_ERROR);
        expect(response.body.error).toBe(ERROR.JWT_SECRET_MISSING);
    });

    it('should return 500 with the login error message on unexpected failures', async () => {
        prismaMock.user.findUnique.mockRejectedValue(new Error('database offline'));

        const response = await request(app)
            .post(`${basePath}/login`)
            .send({ email: publicUser.email, password: PASSWORD });

        expect(response.status).toBe(httpStatus.INTERNAL_SERVER_ERROR);
        expect(response.body.error).toBe(ERROR.LOGIN_FAILED);
    });

    it.each([
        ['email is malformed', { email: 'invalid', password: PASSWORD }, ERROR.INVALID_EMAIL],
        ['password is missing', { email: publicUser.email }, ERROR.PASSWORD_REQUIRED],
        ['password is empty', { email: publicUser.email, password: '' }, ERROR.PASSWORD_REQUIRED],
    ])('should return 400 when %s', async (_, body, message) => {
        const response = await request(app).post(`${basePath}/login`).send(body);

        expect(response.status).toBe(httpStatus.BAD_REQUEST);
        expect(response.body.errors).toEqual([message]);
        expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
    });
});

describe('# Auth - POST /auth/forgot-password', () => {
    it('should generate a reset token and send the reset email when the user exists', async () => {
        prismaMock.user.findUnique.mockResolvedValue({ ...publicUser, password: 'hash' });
        prismaMock.user.update.mockResolvedValue({});

        const response = await request(app)
            .post(`${basePath}/forgot-password`)
            .send({ email: 'John@Example.com' });

        expect(response.status).toBe(httpStatus.OK);
        expect(response.body).toEqual({ message: SUCCESS.PASSWORD_RESET_EMAIL_SENT });

        expect(prismaMock.user.update).toHaveBeenCalledWith({
            where: { id: USER_ID },
            data: {
                resetPasswordTokenHash: expect.any(String),
                resetPasswordExpiresAt: expect.any(Date),
            },
        });

        expect(emailSendMock).toHaveBeenCalledTimes(1);
        const emailMessage = emailSendMock.mock.calls[0][0];
        expect(emailMessage.to).toBe(publicUser.email);
        expect(emailMessage.text).toContain('http://localhost:4000/reset-password/confirm?token=');

        const resetTokenHash = prismaMock.user.update.mock.calls[0][0].data.resetPasswordTokenHash;
        const tokenInLink = emailMessage.text.split('token=')[1];
        expect(crypto.createHash('sha256').update(tokenInLink).digest('hex')).toBe(resetTokenHash);
    });

    it('should set an expiration based on RESET_PASSWORD_TOKEN_EXPIRES_IN_MINUTES', async () => {
        process.env.RESET_PASSWORD_TOKEN_EXPIRES_IN_MINUTES = '5';
        prismaMock.user.findUnique.mockResolvedValue({ ...publicUser, password: 'hash' });
        prismaMock.user.update.mockResolvedValue({});

        const before = Date.now();
        await request(app).post(`${basePath}/forgot-password`).send({ email: publicUser.email });

        const { resetPasswordExpiresAt } = prismaMock.user.update.mock.calls[0][0].data;
        const diffMinutes = (resetPasswordExpiresAt.getTime() - before) / 60000;
        expect(diffMinutes).toBeGreaterThan(4.9);
        expect(diffMinutes).toBeLessThan(5.1);
    });

    it('should return the same generic message without sending an email when the address is not registered', async () => {
        prismaMock.user.findUnique.mockResolvedValue(null);

        const response = await request(app)
            .post(`${basePath}/forgot-password`)
            .send({ email: 'ghost@example.com' });

        expect(response.status).toBe(httpStatus.OK);
        expect(response.body).toEqual({ message: SUCCESS.PASSWORD_RESET_EMAIL_SENT });
        expect(emailSendMock).not.toHaveBeenCalled();
        expect(prismaMock.user.update).not.toHaveBeenCalled();
    });

    it('should return 400 when the email is malformed', async () => {
        const response = await request(app)
            .post(`${basePath}/forgot-password`)
            .send({ email: 'not-an-email' });

        expect(response.status).toBe(httpStatus.BAD_REQUEST);
        expect(response.body.errors).toEqual([ERROR.INVALID_EMAIL]);
        expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
    });

    it('should return 500 with the forgot-password error message on unexpected failures', async () => {
        prismaMock.user.findUnique.mockRejectedValue(new Error('database offline'));

        const response = await request(app)
            .post(`${basePath}/forgot-password`)
            .send({ email: publicUser.email });

        expect(response.status).toBe(httpStatus.INTERNAL_SERVER_ERROR);
        expect(response.body.error).toBe(ERROR.FORGOT_PASSWORD_FAILED);
        expect(loggerErrorMock).toHaveBeenCalledWith('[auth] database offline');
    });
});

describe('# Auth - POST /auth/reset-password', () => {
    const NEW_PASSWORD = 'new-strong-password';

    it('should reset the password when the token is valid and not expired', async () => {
        prismaMock.user.findUnique.mockResolvedValue({
            ...publicUser,
            password: 'old-hash',
            resetPasswordExpiresAt: new Date(Date.now() + 60_000),
        });
        prismaMock.user.update.mockResolvedValue(publicUser);

        const response = await request(app)
            .post(`${basePath}/reset-password`)
            .send({ token: 'valid-token', password: NEW_PASSWORD });

        expect(response.status).toBe(httpStatus.OK);
        expect(response.body).toEqual({ message: SUCCESS.PASSWORD_RESET_SUCCEEDED });

        const { data } = prismaMock.user.update.mock.calls[0][0];
        expect(await bcrypt.compare(NEW_PASSWORD, data.password)).toBe(true);
        expect(data.resetPasswordTokenHash).toBeNull();
        expect(data.resetPasswordExpiresAt).toBeNull();
    });

    it('should return 400 when the token does not match any user', async () => {
        prismaMock.user.findUnique.mockResolvedValue(null);

        const response = await request(app)
            .post(`${basePath}/reset-password`)
            .send({ token: 'unknown-token', password: NEW_PASSWORD });

        expect(response.status).toBe(httpStatus.BAD_REQUEST);
        expect(response.body.error).toBe(ERROR.RESET_TOKEN_INVALID);
        expect(prismaMock.user.update).not.toHaveBeenCalled();
    });

    it('should return 400 when the token is expired', async () => {
        prismaMock.user.findUnique.mockResolvedValue({
            ...publicUser,
            password: 'old-hash',
            resetPasswordExpiresAt: new Date(Date.now() - 1000),
        });

        const response = await request(app)
            .post(`${basePath}/reset-password`)
            .send({ token: 'expired-token', password: NEW_PASSWORD });

        expect(response.status).toBe(httpStatus.BAD_REQUEST);
        expect(response.body.error).toBe(ERROR.RESET_TOKEN_INVALID);
        expect(prismaMock.user.update).not.toHaveBeenCalled();
    });

    it.each([
        ['token is missing', { password: NEW_PASSWORD }, ERROR.RESET_TOKEN_REQUIRED],
        ['token is empty', { token: '', password: NEW_PASSWORD }, ERROR.RESET_TOKEN_REQUIRED],
        ['password is too short', { token: 'a-token', password: 'short' }, ERROR.INVALID_PASSWORD],
    ])('should return 400 when %s', async (_, body, message) => {
        const response = await request(app).post(`${basePath}/reset-password`).send(body);

        expect(response.status).toBe(httpStatus.BAD_REQUEST);
        expect(response.body.errors).toEqual([message]);
        expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
    });

    it('should return 500 with the reset-password error message on unexpected failures', async () => {
        prismaMock.user.findUnique.mockRejectedValue(new Error('database offline'));

        const response = await request(app)
            .post(`${basePath}/reset-password`)
            .send({ token: 'a-token', password: NEW_PASSWORD });

        expect(response.status).toBe(httpStatus.INTERNAL_SERVER_ERROR);
        expect(response.body.error).toBe(ERROR.RESET_PASSWORD_FAILED);
        expect(loggerErrorMock).toHaveBeenCalledWith('[auth] database offline');
    });
});

describe('# Auth - PATCH /auth/users/:id', () => {
    const path = `${basePath}/users/${USER_ID}`;
    const authorized = () => request(app).patch(path).set('Authorization', `Bearer ${tokenFor()}`);

    it('should update the name of the authenticated user', async () => {
        const updatedUser = { ...publicUser, name: 'Jane Doe' };
        prismaMock.user.findUnique.mockResolvedValueOnce(publicUser);
        prismaMock.user.update.mockResolvedValue(updatedUser);

        const response = await authorized().send({ name: 'Jane Doe' });

        expect(response.status).toBe(httpStatus.OK);
        expect(response.body).toEqual({ message: SUCCESS.USER_UPDATED, user: updatedUser });
        expect(prismaMock.user.update).toHaveBeenCalledWith(expect.objectContaining({
            where: { id: USER_ID },
            data: { name: 'Jane Doe' },
        }));
    });

    it('should never send the email to the repository, even when it is in the body', async () => {
        prismaMock.user.findUnique.mockResolvedValueOnce(publicUser);
        prismaMock.user.update.mockResolvedValue({ ...publicUser, name: 'Jane Doe' });

        const response = await authorized().send({ name: 'Jane Doe', email: 'other@example.com' });

        expect(response.status).toBe(httpStatus.OK);
        expect(prismaMock.user.update.mock.calls[0][0].data).toEqual({ name: 'Jane Doe' });
        expect(prismaMock.user.findUnique).toHaveBeenCalledTimes(1);
    });

    it('should return 400 when only the email is sent', async () => {
        const response = await authorized().send({ email: 'other@example.com' });

        expect(response.status).toBe(httpStatus.BAD_REQUEST);
        expect(response.body.errors).toEqual([ERROR.EMPTY_UPDATE]);
        expect(prismaMock.user.update).not.toHaveBeenCalled();
    });

    it('should hash the new password', async () => {
        prismaMock.user.findUnique.mockResolvedValueOnce(publicUser);
        prismaMock.user.update.mockResolvedValue(publicUser);

        const response = await authorized().send({ password: 'new-strong-password' });

        expect(response.status).toBe(httpStatus.OK);
        const { data } = prismaMock.user.update.mock.calls[0][0];
        expect(Object.keys(data)).toEqual(['password']);
        expect(await bcrypt.compare('new-strong-password', data.password)).toBe(true);
    });

    it('should return 403 when updating another user', async () => {
        const response = await request(app)
            .patch(`${basePath}/users/${OTHER_USER_ID}`)
            .set('Authorization', `Bearer ${tokenFor()}`)
            .send({ name: 'Hacker' });

        expect(response.status).toBe(httpStatus.FORBIDDEN);
        expect(response.body.error).toBe(ERROR.FORBIDDEN_USER_UPDATE);
        expect(prismaMock.user.update).not.toHaveBeenCalled();
    });

    it('should return 404 when the user does not exist', async () => {
        prismaMock.user.findUnique.mockResolvedValueOnce(null);

        const response = await authorized().send({ name: 'Jane Doe' });

        expect(response.status).toBe(httpStatus.NOT_FOUND);
        expect(response.body.error).toBe(ERROR.USER_NOT_FOUND);
    });

    it('should return 500 with the update error message on unexpected failures', async () => {
        prismaMock.user.findUnique.mockResolvedValueOnce(publicUser);
        prismaMock.user.update.mockRejectedValue(new Error('database offline'));

        const response = await authorized().send({ name: 'Jane Doe' });

        expect(response.status).toBe(httpStatus.INTERNAL_SERVER_ERROR);
        expect(response.body.error).toBe(ERROR.UPDATE_FAILED);
    });

    it.each([
        ['there is no Authorization header', undefined, ERROR.TOKEN_MISSING],
        ['the scheme is not Bearer', 'Basic abc', ERROR.TOKEN_MISSING],
        ['the Bearer token is empty', 'Bearer', ERROR.TOKEN_MISSING],
        ['the token is malformed', 'Bearer not-a-jwt', ERROR.TOKEN_INVALID],
        ['the token has a wrong signature', `Bearer ${jwt.sign({ sub: USER_ID }, 'other-secret')}`, ERROR.TOKEN_INVALID],
        ['the token is expired', `Bearer ${jwt.sign({ sub: USER_ID, exp: 1 }, JWT_SECRET)}`, ERROR.TOKEN_INVALID],
    ])('should return 401 when %s', async (_, authorization, message) => {
        const req = request(app).patch(path);
        if (authorization) req.set('Authorization', authorization);

        const response = await req.send({ name: 'Jane Doe' });

        expect(response.status).toBe(httpStatus.UNAUTHORIZED);
        expect(response.body.error).toBe(message);
    });

    it('should return 500 when JWT_SECRET is not configured', async () => {
        const token = tokenFor();
        delete process.env.JWT_SECRET;

        const response = await request(app)
            .patch(path)
            .set('Authorization', `Bearer ${token}`)
            .send({ name: 'Jane Doe' });

        expect(response.status).toBe(httpStatus.INTERNAL_SERVER_ERROR);
        expect(response.body.error).toBe(ERROR.JWT_SECRET_MISSING);
    });

    it('should return 400 when the id is not a UUID', async () => {
        const response = await request(app)
            .patch(`${basePath}/users/123`)
            .set('Authorization', `Bearer ${tokenFor('123')}`)
            .send({ name: 'Jane Doe' });

        expect(response.status).toBe(httpStatus.BAD_REQUEST);
        expect(response.body.errors).toEqual([ERROR.INVALID_ID]);
    });

    it('should return 400 when no updatable field is sent', async () => {
        const response = await authorized().send({ active: false });

        expect(response.status).toBe(httpStatus.BAD_REQUEST);
        expect(response.body.errors).toEqual([ERROR.EMPTY_UPDATE]);
    });

    it('should return 400 when the request has no body', async () => {
        const response = await authorized();

        expect(response.status).toBe(httpStatus.BAD_REQUEST);
        expect(response.body.errors).toEqual([ERROR.EMPTY_UPDATE]);
    });

    it('should return 400 when the fields are invalid', async () => {
        const response = await authorized().send({ name: '', email: 'invalid', password: 'short' });

        expect(response.status).toBe(httpStatus.BAD_REQUEST);
        expect(response.body.errors).toEqual([ERROR.INVALID_NAME, ERROR.INVALID_PASSWORD]);
    });
});
