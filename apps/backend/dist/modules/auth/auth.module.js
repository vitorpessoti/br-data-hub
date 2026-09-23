"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthModule = void 0;
const common_1 = require("@nestjs/common");
const db_module_1 = require("../../db/db.module");
const auth_controller_1 = require("./auth.controller");
const bcrypt_crypto_1 = require("./bcrypt.crypto");
const user_prisma_1 = require("./user.prisma");
let AuthModule = class AuthModule {
};
exports.AuthModule = AuthModule;
exports.AuthModule = AuthModule = __decorate([
    (0, common_1.Module)({
        imports: [db_module_1.DbModule],
        controllers: [auth_controller_1.AuthController],
        providers: [user_prisma_1.PrismaUserRepository, bcrypt_crypto_1.BcryptCryptoProvider],
        exports: [user_prisma_1.PrismaUserRepository, bcrypt_crypto_1.BcryptCryptoProvider],
    })
], AuthModule);
//# sourceMappingURL=auth.module.js.map