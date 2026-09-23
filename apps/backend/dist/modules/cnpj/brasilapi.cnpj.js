"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var BrasilApiCnpjProvider_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.BrasilApiCnpjProvider = void 0;
const common_1 = require("@nestjs/common");
const cnpj_1 = require("@br-data-hub/cnpj");
const shared_1 = require("@br-data-hub/shared");
const DEFAULT_BASE_URL = 'https://brasilapi.com.br/api';
const REQUEST_TIMEOUT_MS = 10_000;
const USER_AGENT = 'br-data-hub';
const CNPJ_RULE = new shared_1.CnpjRule();
let BrasilApiCnpjProvider = BrasilApiCnpjProvider_1 = class BrasilApiCnpjProvider {
    logger = new common_1.Logger(BrasilApiCnpjProvider_1.name);
    baseUrl = (process.env.BRASILAPI_BASE_URL?.trim() || DEFAULT_BASE_URL).replace(/\/+$/, '');
    async findByCnpj(cnpj) {
        const normalized = this.toNormalizedCnpj(cnpj);
        const body = await this.request(`${this.baseUrl}/cnpj/v1/${normalized}`);
        return body ? this.toCnpjData(body) : null;
    }
    toNormalizedCnpj(cnpj) {
        const normalized = typeof cnpj === 'string' ? (0, cnpj_1.normalizeCnpj)(cnpj) : '';
        if (!normalized || CNPJ_RULE.validate(normalized) !== null) {
            throw new shared_1.DomainError('cnpj.invalid', 400);
        }
        return normalized;
    }
    async request(url) {
        try {
            const response = await fetch(url, {
                headers: { Accept: 'application/json', 'User-Agent': USER_AGENT },
                signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
            });
            if (response.status === 404) {
                return null;
            }
            if (response.status === 429) {
                this.logger.warn(`Limite de requisições da BrasilAPI atingido (${url})`);
                throw new shared_1.DomainError('cnpj.provider.rate.limited', 429);
            }
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            const body = await response.json();
            if (typeof body !== 'object' || body === null || Array.isArray(body)) {
                throw new Error('corpo da resposta não é um objeto json');
            }
            return body;
        }
        catch (error) {
            if (error instanceof shared_1.DomainError) {
                throw error;
            }
            const reason = error instanceof Error ? error.message : String(error);
            this.logger.error(`Falha ao consultar a BrasilAPI (${url}): ${reason}`);
            throw new shared_1.DomainError('cnpj.provider.failed', 502);
        }
    }
    toCnpjData(body) {
        return {
            cnpj: (0, cnpj_1.normalizeCnpj)(this.text(body.cnpj)),
            branchTypeCode: this.requiredNumber(body.identificador_matriz_filial),
            branchTypeDescription: this.optionalText(body.descricao_identificador_matriz_filial),
            legalName: this.text(body.razao_social),
            tradeName: this.optionalText(body.nome_fantasia),
            registrationStatusCode: this.requiredNumber(body.situacao_cadastral),
            registrationStatusDescription: this.optionalText(body.descricao_situacao_cadastral),
            registrationStatusDate: this.optionalText(body.data_situacao_cadastral),
            registrationStatusReasonCode: this.optionalNumber(body.motivo_situacao_cadastral),
            registrationStatusReasonDescription: this.optionalText(body.descricao_motivo_situacao_cadastral),
            foreignCityName: this.optionalText(body.nome_cidade_no_exterior),
            countryCode: this.optionalNumber(body.codigo_pais),
            countryName: this.optionalText(body.pais),
            legalNatureCode: this.requiredNumber(body.codigo_natureza_juridica),
            legalNatureDescription: this.optionalText(body.natureza_juridica),
            activityStartDate: this.optionalText(body.data_inicio_atividade),
            mainCnaeCode: this.code(body.cnae_fiscal, 7) ?? '',
            mainCnaeDescription: this.optionalText(body.cnae_fiscal_descricao),
            streetType: this.optionalText(body.descricao_tipo_de_logradouro),
            street: this.optionalText(body.logradouro),
            addressNumber: this.optionalText(body.numero),
            complement: this.optionalText(body.complemento),
            neighborhood: this.optionalText(body.bairro),
            zipCode: this.zipCode(body.cep),
            stateCode: this.text(body.uf),
            city: this.text(body.municipio),
            siafiCode: this.code(body.codigo_municipio, 4),
            ibgeCode: this.code(body.codigo_municipio_ibge, 7),
            primaryPhone: this.optionalText(body.ddd_telefone_1),
            secondaryPhone: this.optionalText(body.ddd_telefone_2),
            fax: this.optionalText(body.ddd_fax),
            email: this.optionalText(body.email),
            responsibleQualificationCode: this.optionalNumber(body.qualificacao_do_responsavel),
            shareCapital: this.requiredNumber(body.capital_social),
            companySizeCode: this.optionalNumber(body.codigo_porte),
            companySizeDescription: this.optionalText(body.porte),
            simplesOption: this.optionalBoolean(body.opcao_pelo_simples),
            simplesOptionDate: this.optionalText(body.data_opcao_pelo_simples),
            simplesExclusionDate: this.optionalText(body.data_exclusao_do_simples),
            meiOption: this.optionalBoolean(body.opcao_pelo_mei),
            meiOptionDate: this.optionalText(body.data_opcao_pelo_mei),
            meiExclusionDate: this.optionalText(body.data_exclusao_do_mei),
            specialStatus: this.optionalText(body.situacao_especial),
            specialStatusDate: this.optionalText(body.data_situacao_especial),
            responsibleFederativeEntity: this.optionalText(body.ente_federativo_responsavel),
            secondaryCnaes: this.list(body.cnaes_secundarios)
                .map((item) => this.toSecondaryCnae(item))
                .filter((item) => item !== null),
            partners: this.list(body.qsa).map((item) => this.toPartner(item)),
            taxRegimes: this.list(body.regime_tributario).map((item) => this.toTaxRegime(item)),
        };
    }
    toSecondaryCnae(item) {
        const code = this.code(item.codigo, 7);
        return code ? { code, description: this.text(item.descricao) } : null;
    }
    toPartner(item) {
        return {
            typeCode: this.requiredNumber(item.identificador_de_socio),
            name: this.text(item.nome_socio),
            document: this.optionalText(item.cnpj_cpf_do_socio),
            qualificationCode: this.requiredNumber(item.codigo_qualificacao_socio),
            qualificationDescription: this.optionalText(item.qualificacao_socio),
            joinedAt: this.optionalText(item.data_entrada_sociedade),
            countryCode: this.optionalNumber(item.codigo_pais),
            countryName: this.optionalText(item.pais),
            ageRangeCode: this.optionalNumber(item.codigo_faixa_etaria),
            ageRangeDescription: this.optionalText(item.faixa_etaria),
            legalRepresentativeDocument: this.optionalText(item.cpf_representante_legal),
            legalRepresentativeName: this.optionalText(item.nome_representante_legal),
            legalRepresentativeQualificationCode: this.optionalNumber(item.codigo_qualificacao_representante_legal),
            legalRepresentativeQualificationDescription: this.optionalText(item.qualificacao_representante_legal),
        };
    }
    toTaxRegime(item) {
        return {
            year: this.requiredNumber(item.ano),
            taxationForm: this.text(item.forma_de_tributacao),
            scpCnpj: this.optionalText(item.cnpj_da_scp),
            bookkeepingCount: this.optionalNumber(item.quantidade_de_escrituracoes),
        };
    }
    list(value) {
        return Array.isArray(value)
            ? value.filter((item) => typeof item === 'object' && item !== null)
            : [];
    }
    text(value) {
        return typeof value === 'string' ? value.trim() : '';
    }
    optionalText(value) {
        return this.text(value) || undefined;
    }
    optionalNumber(value) {
        return typeof value === 'number' && Number.isFinite(value)
            ? value
            : undefined;
    }
    requiredNumber(value) {
        return this.optionalNumber(value) ?? Number.NaN;
    }
    optionalBoolean(value) {
        return typeof value === 'boolean' ? value : undefined;
    }
    code(value, length) {
        const text = typeof value === 'number' ? String(value) : this.text(value);
        return /^\d+$/.test(text) && Number(text) > 0
            ? text.padStart(length, '0')
            : undefined;
    }
    zipCode(value) {
        const match = /^(\d{5})-?(\d{3})$/.exec(this.text(value));
        return match ? `${match[1]}-${match[2]}` : this.optionalText(value);
    }
};
exports.BrasilApiCnpjProvider = BrasilApiCnpjProvider;
exports.BrasilApiCnpjProvider = BrasilApiCnpjProvider = BrasilApiCnpjProvider_1 = __decorate([
    (0, common_1.Injectable)()
], BrasilApiCnpjProvider);
//# sourceMappingURL=brasilapi.cnpj.js.map