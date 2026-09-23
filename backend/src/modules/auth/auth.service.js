import crypto from 'crypto';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import httpStatus from 'http-status';
import createError from 'http-errors';
import AuthRepository from './auth.repository.js';
import { AuthConstants } from './auth.constants.js';
import Logger from '../../services/logger.service.js';
import EmailService from '../../services/email.service.js';

const logger = new Logger({
    dateFormat: process.env.DATE_FORMAT,
    logsPath: process.env.LOGS_PATH
});

const { SUCCESS, ERROR } = AuthConstants.MESSAGES;
const PRISMA_UNIQUE_CONSTRAINT = 'P2002';

export default class AuthService {
    constructor() {
        this.repository = new AuthRepository();
        this.emailService = new EmailService();
    }

    async register({ name, email, password }) {
        try {
            if (await this.repository.findByEmail(email)) {
                throw createError(httpStatus.CONFLICT, ERROR.EMAIL_ALREADY_IN_USE);
            }

            const hashedPassword = await bcrypt.hash(password, AuthConstants.SALT_ROUNDS);
            const user = await this.repository.create({ name, email, password: hashedPassword });

            return { message: SUCCESS.USER_REGISTERED, user };
        } catch (error) {
            throw this.#handleError(error, ERROR.REGISTER_FAILED);
        }
    }

    async login({ email, password }) {
        try {
            const user = await this.repository.findByEmail(email);
            const passwordMatches = user ? await bcrypt.compare(password, user.password) : false;

            if (!passwordMatches) {
                throw createError(httpStatus.UNAUTHORIZED, ERROR.INVALID_CREDENTIALS);
            }
            if (!user.active) {
                throw createError(httpStatus.FORBIDDEN, ERROR.INACTIVE_USER);
            }

            const {
                password: _password,
                resetPasswordTokenHash: _resetPasswordTokenHash,
                resetPasswordExpiresAt: _resetPasswordExpiresAt,
                ...publicUser
            } = user;

            return {
                message: SUCCESS.LOGIN_SUCCEEDED,
                tokenType: AuthConstants.TOKEN_TYPE,
                token: AuthService.signToken(publicUser),
                user: publicUser,
            };
        } catch (error) {
            throw this.#handleError(error, ERROR.LOGIN_FAILED);
        }
    }

    // Only the updatable fields reach the repository: the email is unique and
    // immutable, so it is ignored even when sent in the request body.
    async update(id, { name, password }, authenticatedUser) {
        try {
            if (authenticatedUser.id !== id) {
                throw createError(httpStatus.FORBIDDEN, ERROR.FORBIDDEN_USER_UPDATE);
            }
            if (!(await this.repository.findById(id))) {
                throw createError(httpStatus.NOT_FOUND, ERROR.USER_NOT_FOUND);
            }

            const data = {};
            if (name !== undefined) data.name = name;
            if (password !== undefined) data.password = await bcrypt.hash(password, AuthConstants.SALT_ROUNDS);

            const user = await this.repository.update(id, data);

            return { message: SUCCESS.USER_UPDATED, user };
        } catch (error) {
            throw this.#handleError(error, ERROR.UPDATE_FAILED);
        }
    }

    async forgotPassword({ email }) {
        try {
            const user = await this.repository.findByEmail(email);

            if (user) {
                const resetToken = crypto.randomBytes(AuthConstants.RESET_TOKEN_BYTES).toString('hex');
                const resetPasswordExpiresAt = new Date(
                    Date.now() + AuthService.#getResetTokenExpiresInMinutes() * 60 * 1000
                );

                await this.repository.setResetPasswordToken(user.id, {
                    resetPasswordTokenHash: AuthService.#hashResetToken(resetToken),
                    resetPasswordExpiresAt,
                });

                await this.#sendResetPasswordEmail(user, resetToken);
            }

            return { message: SUCCESS.PASSWORD_RESET_EMAIL_SENT };
        } catch (error) {
            throw this.#handleError(error, ERROR.FORGOT_PASSWORD_FAILED);
        }
    }

    async resetPassword({ token, password }) {
        try {
            const user = await this.repository.findByResetPasswordTokenHash(AuthService.#hashResetToken(token));

            if (!user || !user.resetPasswordExpiresAt || user.resetPasswordExpiresAt.getTime() < Date.now()) {
                throw createError(httpStatus.BAD_REQUEST, ERROR.RESET_TOKEN_INVALID);
            }

            const hashedPassword = await bcrypt.hash(password, AuthConstants.SALT_ROUNDS);
            await this.repository.resetPassword(user.id, hashedPassword);

            return { message: SUCCESS.PASSWORD_RESET_SUCCEEDED };
        } catch (error) {
            throw this.#handleError(error, ERROR.RESET_PASSWORD_FAILED);
        }
    }

    async #sendResetPasswordEmail(user, resetToken) {
        const resetLink = `${process.env.FRONTEND_URL}/reset-password/confirm?token=${resetToken}`;

        await this.emailService.send({
            to: user.email,
            subject: 'Redefinição de senha - BR Data Hub',
            text: `Olá, ${user.name}. Use o link a seguir para redefinir sua senha: ${resetLink}`,
            html: `<p>Olá, ${user.name}.</p><p>Use o link a seguir para redefinir sua senha:</p><p><a href="${resetLink}">${resetLink}</a></p>`,
        });
    }

    static #hashResetToken(token) {
        return crypto.createHash('sha256').update(token).digest('hex');
    }

    static #getResetTokenExpiresInMinutes() {
        return Number(process.env.RESET_PASSWORD_TOKEN_EXPIRES_IN_MINUTES) || AuthConstants.DEFAULT_RESET_TOKEN_EXPIRES_IN_MINUTES;
    }

    static signToken(user) {
        return jwt.sign(
            { sub: user.id, email: user.email },
            AuthService.#getSecret(),
            { expiresIn: process.env.JWT_EXPIRES_IN || AuthConstants.DEFAULT_TOKEN_EXPIRES_IN }
        );
    }

    static verifyToken(token) {
        const secret = AuthService.#getSecret();
        try {
            const payload = jwt.verify(token, secret);
            return { id: payload.sub, email: payload.email };
        } catch {
            throw createError(httpStatus.UNAUTHORIZED, ERROR.TOKEN_INVALID);
        }
    }

    static #getSecret() {
        if (!process.env.JWT_SECRET) {
            throw createError(httpStatus.INTERNAL_SERVER_ERROR, ERROR.JWT_SECRET_MISSING);
        }
        return process.env.JWT_SECRET;
    }

    #handleError(error, fallbackMessage) {
        if (error.code === PRISMA_UNIQUE_CONSTRAINT) {
            return createError(httpStatus.CONFLICT, ERROR.EMAIL_ALREADY_IN_USE);
        }
        if (createError.isHttpError(error)) {
            return error;
        }
        logger.error(`[auth] ${error.message}`);
        return createError(httpStatus.INTERNAL_SERVER_ERROR, fallbackMessage);
    }
}
