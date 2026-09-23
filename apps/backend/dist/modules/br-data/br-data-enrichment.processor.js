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
Object.defineProperty(exports, "__esModule", { value: true });
exports.BrDataEnrichmentProcessor = exports.BrDataRateLimitedError = void 0;
const common_1 = require("@nestjs/common");
const br_data_1 = require("@br-data-hub/br-data");
const cep_1 = require("@br-data-hub/cep");
const cnpj_1 = require("@br-data-hub/cnpj");
const shared_1 = require("@br-data-hub/shared");
const bullmq_1 = require("bullmq");
const cep_prisma_1 = require("../cep/cep.prisma");
const viacep_cep_1 = require("../cep/viacep.cep");
const brasilapi_cnpj_1 = require("../cnpj/brasilapi.cnpj");
const cnpj_prisma_1 = require("../cnpj/cnpj.prisma");
const br_data_prisma_1 = require("./br-data.prisma");
const ERROR_MAX_LENGTH = 255;
class BrDataRateLimitedError extends Error {
}
exports.BrDataRateLimitedError = BrDataRateLimitedError;
let BrDataEnrichmentProcessor = class BrDataEnrichmentProcessor {
    cepProvider;
    cepRepository;
    cnpjProvider;
    cnpjRepository;
    brDataRepository;
    constructor(cepProvider, cepRepository, cnpjProvider, cnpjRepository, brDataRepository) {
        this.cepProvider = cepProvider;
        this.cepRepository = cepRepository;
        this.cnpjProvider = cnpjProvider;
        this.cnpjRepository = cnpjRepository;
        this.brDataRepository = brDataRepository;
    }
    async process(job) {
        const { brDataId, source, document } = job.data;
        const result = await this.sync(job);
        const useCase = new br_data_1.UpdateBrDataEnrichment(this.brDataRepository);
        await useCase.execute({ brDataId, source, document, ...result });
        if (result.status === 'failed') {
            throw new bullmq_1.UnrecoverableError(result.error);
        }
        return result;
    }
    async sync(job) {
        const { source, document } = job.data;
        try {
            if (source === 'cep') {
                const useCase = new cep_1.SyncCep(this.cepProvider, this.cepRepository);
                await useCase.execute({ cep: document });
            }
            else {
                const useCase = new cnpj_1.SyncCnpj(this.cnpjProvider, this.cnpjRepository);
                await useCase.execute({ cnpj: document });
            }
            return { status: 'completed' };
        }
        catch (error) {
            return this.handleSyncError(job, error);
        }
    }
    handleSyncError(job, error) {
        if (error instanceof shared_1.DomainError && error.statusCode === 429) {
            throw new BrDataRateLimitedError(error.message);
        }
        if (error instanceof shared_1.DomainError &&
            error.message === `${job.data.source}.not.found`) {
            return { status: 'not_found', error: error.message };
        }
        const isTransient = !(error instanceof shared_1.DomainError) || error.statusCode >= 500;
        const isLastAttempt = job.attemptsMade + 1 >= (job.opts.attempts ?? 1);
        if (isTransient && !isLastAttempt) {
            throw error;
        }
        return { status: 'failed', error: this.describe(error) };
    }
    describe(error) {
        let message = 'br-data.enrichment.failed';
        if (error instanceof shared_1.ValidationException) {
            message = error.errors.map((item) => item.message).join(',');
        }
        else if (error instanceof shared_1.DomainError) {
            message = error.message;
        }
        return message.slice(0, ERROR_MAX_LENGTH);
    }
};
exports.BrDataEnrichmentProcessor = BrDataEnrichmentProcessor;
exports.BrDataEnrichmentProcessor = BrDataEnrichmentProcessor = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [viacep_cep_1.ViaCepProvider,
        cep_prisma_1.PrismaCepRepository,
        brasilapi_cnpj_1.BrasilApiCnpjProvider,
        cnpj_prisma_1.PrismaCnpjRepository,
        br_data_prisma_1.PrismaBrDataRepository])
], BrDataEnrichmentProcessor);
//# sourceMappingURL=br-data-enrichment.processor.js.map