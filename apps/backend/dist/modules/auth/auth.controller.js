"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const auth_1 = require("@br-data-hub/auth");
const bcrypt_crypto_1 = require("./bcrypt.crypto");
const jwt_util_1 = require("./jwt.util");
const user_prisma_1 = require("./user.prisma");
let AuthController = class AuthController {
    cryptoProvider;
    userRepository;
    configService;
    constructor(cryptoProvider, userRepository, configService) {
        this.cryptoProvider = cryptoProvider;
        this.userRepository = userRepository;
        this.configService = configService;
    }
    async registerUser(body) {
        const useCase = new auth_1.RegisterUser(this.cryptoProvider, this.userRepository);
        await useCase.execute(body);
        return { message: 'User registered successfully' };
    }
    async loginUser(body) {
        const useCase = new auth_1.LoginUser(this.cryptoProvider, this.userRepository);
        const user = await useCase.execute(body);
        const token = (0, jwt_util_1.signUserToken)(user, this.resolveJwtSecret());
        return { token, user };
    }
    resolveJwtSecret() {
        const secret = this.configService.get('JWT_SECRET');
        if (!secret) {
            throw new Error('JWT_SECRET environment variable is not defined.');
        }
        return secret;
    }
};
exports.AuthController = AuthController;
__decorate([
    (0, common_1.Post)('/register'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "registerUser", null);
__decorate([
    (0, common_1.Post)('/login'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "loginUser", null);
exports.AuthController = AuthController = __decorate([
    (0, common_1.Controller)('auth'),
    __metadata("design:paramtypes", [bcrypt_crypto_1.BcryptCryptoProvider,
        user_prisma_1.PrismaUserRepository,
        config_1.ConfigService])
], AuthController);
//# sourceMappingURL=auth.controller.js.map