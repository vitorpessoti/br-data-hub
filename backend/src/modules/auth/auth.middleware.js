import httpStatus from 'http-status';
import createError from 'http-errors';
import AuthService from './auth.service.js';
import { AuthConstants } from './auth.constants.js';

// Requires "Authorization: Bearer <token>" and exposes the authenticated user on req.user.
const authenticate = (req, res, next) => {
    const [type, token] = (req.headers.authorization ?? '').split(' ');

    if (type !== AuthConstants.TOKEN_TYPE || !token) {
        return next(createError(httpStatus.UNAUTHORIZED, AuthConstants.MESSAGES.ERROR.TOKEN_MISSING));
    }

    try {
        req.user = AuthService.verifyToken(token);
        next();
    } catch (error) {
        next(error);
    }
};

export default authenticate;
