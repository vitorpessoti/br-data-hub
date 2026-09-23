"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.signUserToken = signUserToken;
const jsonwebtoken_1 = require("jsonwebtoken");
const EXPIRES_IN = '7d';
function signUserToken(user, secret) {
    return (0, jsonwebtoken_1.sign)({ sub: user.id, name: user.name, email: user.email }, secret, {
        expiresIn: EXPIRES_IN,
    });
}
//# sourceMappingURL=jwt.util.js.map