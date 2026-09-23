"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var ViaCepProvider_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ViaCepProvider = void 0;
const common_1 = require("@nestjs/common");
const shared_1 = require("@br-data-hub/shared");
const DEFAULT_BASE_URL = 'https://viacep.com.br/ws';
const REQUEST_TIMEOUT_MS = 10_000;
const CEP_PATTERN = /^(\d{5})-?(\d{3})$/;
let ViaCepProvider = ViaCepProvider_1 = class ViaCepProvider {
    logger = new common_1.Logger(ViaCepProvider_1.name);
    baseUrl = (process.env.VIACEP_BASE_URL?.trim() || DEFAULT_BASE_URL).replace(/\/+$/, '');
    async findByCep(cep) {
        const digits = this.toDigits(cep);
        const body = await this.request(`${this.baseUrl}/${digits}/json/`);
        if (body.erro === true || body.erro === 'true') {
            return null;
        }
        return this.toCepData(body);
    }
    toDigits(cep) {
        const match = CEP_PATTERN.exec(typeof cep === 'string' ? cep.trim() : '');
        if (!match) {
            throw new shared_1.DomainError('cep.invalid', 400);
        }
        return `${match[1]}${match[2]}`;
    }
    async request(url) {
        try {
            const response = await fetch(url, {
                headers: { Accept: 'application/json' },
                signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
            });
            if (response.status === 429) {
                this.logger.warn(`Limite de requisições da ViaCEP atingido (${url})`);
                throw new shared_1.DomainError('cep.provider.rate.limited', 429);
            }
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            return (await response.json());
        }
        catch (error) {
            if (error instanceof shared_1.DomainError) {
                throw error;
            }
            const reason = error instanceof Error ? error.message : String(error);
            this.logger.error(`Falha ao consultar a ViaCEP (${url}): ${reason}`);
            throw new shared_1.DomainError('cep.provider.failed', 502);
        }
    }
    toCepData(body) {
        return {
            cep: this.text(body.cep),
            street: this.optionalText(body.logradouro),
            complement: this.optionalText(body.complemento),
            unit: this.optionalText(body.unidade),
            neighborhood: this.optionalText(body.bairro),
            city: this.text(body.localidade),
            stateCode: this.text(body.uf),
            stateName: this.text(body.estado),
            region: this.text(body.regiao),
            ibgeCode: this.text(body.ibge),
            giaCode: this.optionalText(body.gia),
            areaCode: this.text(body.ddd),
            siafiCode: this.text(body.siafi),
        };
    }
    text(value) {
        return (value ?? '').trim();
    }
    optionalText(value) {
        return this.text(value) || undefined;
    }
};
exports.ViaCepProvider = ViaCepProvider;
exports.ViaCepProvider = ViaCepProvider = ViaCepProvider_1 = __decorate([
    (0, common_1.Injectable)()
], ViaCepProvider);
//# sourceMappingURL=viacep.cep.js.map