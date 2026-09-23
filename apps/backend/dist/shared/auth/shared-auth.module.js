"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SharedAuthModule = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const jwt_auth_guard_1 = require("./jwt-auth.guard");
const jwt_constants_1 = require("./jwt.constants");
let SharedAuthModule = class SharedAuthModule {
};
exports.SharedAuthModule = SharedAuthModule;
exports.SharedAuthModule = SharedAuthModule = __decorate([
    (0, common_1.Global)(),
    (0, common_1.Module)({
        imports: [
            jwt_1.JwtModule.registerAsync({
                useFactory: () => ({
                    secret: (0, jwt_constants_1.resolveJwtSecret)(),
                    signOptions: { expiresIn: (0, jwt_constants_1.resolveJwtExpiresIn)() },
                }),
            }),
        ],
        providers: [jwt_auth_guard_1.JwtAuthGuard],
        exports: [jwt_1.JwtModule, jwt_auth_guard_1.JwtAuthGuard],
    })
], SharedAuthModule);
//# sourceMappingURL=shared-auth.module.js.map