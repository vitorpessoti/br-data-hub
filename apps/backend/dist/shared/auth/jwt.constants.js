"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JWT_DEFAULT_EXPIRES_IN = void 0;
exports.resolveJwtSecret = resolveJwtSecret;
exports.resolveJwtExpiresIn = resolveJwtExpiresIn;
exports.JWT_DEFAULT_EXPIRES_IN = '1d';
function resolveJwtSecret() {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        throw new Error('JWT_SECRET environment variable is not defined.');
    }
    return secret;
}
function resolveJwtExpiresIn() {
    return (process.env.JWT_EXPIRES_IN ??
        exports.JWT_DEFAULT_EXPIRES_IN);
}
//# sourceMappingURL=jwt.constants.js.map