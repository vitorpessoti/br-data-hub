"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var DomainExceptionFilter_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DomainExceptionFilter = void 0;
const common_1 = require("@nestjs/common");
const shared_1 = require("@br-data-hub/shared");
let DomainExceptionFilter = DomainExceptionFilter_1 = class DomainExceptionFilter {
    logger = new common_1.Logger(DomainExceptionFilter_1.name);
    catch(exception, host) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse();
        const request = ctx.getRequest();
        const body = this.toErrorResponse(exception, request);
        if (body.statusCode >= common_1.HttpStatus.INTERNAL_SERVER_ERROR) {
            this.logger.error(`${request.method} ${request.url} -> ${body.statusCode}`, exception instanceof Error ? exception.stack : String(exception));
        }
        response.status(body.statusCode).json(body);
    }
    toErrorResponse(exception, request) {
        const base = {
            timestamp: new Date().toISOString(),
            path: request.url,
        };
        if (exception instanceof shared_1.ValidationException) {
            return {
                ...base,
                statusCode: exception.statusCode,
                message: exception.message,
                errors: exception.errors.map((item) => item.message),
            };
        }
        if (exception instanceof shared_1.ValidationError) {
            return {
                ...base,
                statusCode: exception.statusCode,
                message: exception.message,
                errors: [exception.message],
            };
        }
        if (exception instanceof shared_1.DomainError) {
            return {
                ...base,
                statusCode: exception.statusCode,
                message: exception.message,
            };
        }
        if (exception instanceof common_1.HttpException) {
            return {
                ...base,
                statusCode: exception.getStatus(),
                ...this.normalizeHttpPayload(exception.getResponse(), exception.message),
            };
        }
        return {
            ...base,
            statusCode: common_1.HttpStatus.INTERNAL_SERVER_ERROR,
            message: 'Internal server error',
        };
    }
    normalizeHttpPayload(payload, fallback) {
        if (typeof payload === 'string') {
            return { message: payload };
        }
        const record = payload;
        const rawMessage = record.message ?? fallback;
        if (Array.isArray(rawMessage)) {
            return { message: fallback, errors: rawMessage.map(String) };
        }
        const result = {
            message: String(rawMessage),
        };
        if (Array.isArray(record.errors)) {
            result.errors = record.errors.map(String);
        }
        return result;
    }
};
exports.DomainExceptionFilter = DomainExceptionFilter;
exports.DomainExceptionFilter = DomainExceptionFilter = DomainExceptionFilter_1 = __decorate([
    (0, common_1.Catch)()
], DomainExceptionFilter);
//# sourceMappingURL=domain-exception.filter.js.map