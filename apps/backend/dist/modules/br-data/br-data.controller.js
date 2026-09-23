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
exports.BrDataController = void 0;
const common_1 = require("@nestjs/common");
const br_data_1 = require("@br-data-hub/br-data");
const shared_1 = require("@br-data-hub/shared");
const node_crypto_1 = require("node:crypto");
const jwt_auth_guard_1 = require("../../shared/auth/jwt-auth.guard");
const current_user_decorator_1 = require("../../shared/decorators/current-user.decorator");
const cep_prisma_1 = require("../cep/cep.prisma");
const cnpj_prisma_1 = require("../cnpj/cnpj.prisma");
const br_data_queue_config_1 = require("./br-data-queue.config");
const br_data_response_mapper_1 = require("./br-data-response.mapper");
const br_data_prisma_1 = require("./br-data.prisma");
const bullmq_br_data_enrichment_1 = require("./bullmq.br-data-enrichment");
const DEFAULT_PER_PAGE = 20;
const MAX_PER_PAGE = 100;
let BrDataController = class BrDataController {
    brDataRepository;
    enrichmentProvider;
    cepRepository;
    cnpjRepository;
    constructor(brDataRepository, enrichmentProvider, cepRepository, cnpjRepository) {
        this.brDataRepository = brDataRepository;
        this.enrichmentProvider = enrichmentProvider;
        this.cepRepository = cepRepository;
        this.cnpjRepository = cnpjRepository;
    }
    async saveBrData(userId, body, response) {
        const id = (0, node_crypto_1.randomUUID)();
        const useCase = new br_data_1.SaveBrData(this.brDataRepository, this.enrichmentProvider);
        await useCase.execute({ id, userId, cep: body?.cep, cnpj: body?.cnpj });
        const saved = await this.findOwnedBrData(id, userId);
        await this.enrichmentProvider.waitForJobs(this.pendingJobs(saved), (0, br_data_queue_config_1.resolveSyncWaitMs)());
        const current = await this.findOwnedBrData(id, userId);
        const view = await this.toDetailView(current);
        const pendingJobs = this.pendingJobs(current);
        if (pendingJobs.length > 0) {
            response.status(common_1.HttpStatus.ACCEPTED);
            return { ...view, pendingJobs };
        }
        return view;
    }
    async findBrDataPage(userId, page, perPage) {
        const result = await this.brDataRepository.findPage({
            userId,
            page: this.toPositiveInteger(page, 1),
            perPage: Math.min(this.toPositiveInteger(perPage, DEFAULT_PER_PAGE), MAX_PER_PAGE),
        });
        return {
            items: result.items.map((item) => (0, br_data_response_mapper_1.toBrDataView)(item)),
            page: result.page,
            perPage: result.perPage,
            total: result.total,
        };
    }
    async findJob(userId, jobId) {
        const job = await this.enrichmentProvider.findJob(jobId);
        if (!job || job.request.userId !== userId) {
            throw new shared_1.DomainError('br-data.job.not.found', 404);
        }
        return (0, br_data_response_mapper_1.toBrDataJobView)(job);
    }
    async findBrDataById(userId, id) {
        const brData = await this.findOwnedBrData(id, userId);
        return this.toDetailView(brData);
    }
    async findOwnedBrData(id, userId) {
        const brData = await this.brDataRepository.findById(id);
        if (!brData || brData.userId !== userId) {
            throw new shared_1.DomainError('br-data.not.found', 404);
        }
        return brData;
    }
    async toDetailView(brData) {
        const [cep, cnpj] = await Promise.all([
            brData.cep ? this.cepRepository.findByCep(brData.cep) : null,
            brData.cnpj ? this.cnpjRepository.findByCnpj(brData.cnpj) : null,
        ]);
        return (0, br_data_response_mapper_1.toBrDataView)(brData, { cep, cnpj });
    }
    pendingJobs(brData) {
        const jobs = [];
        if (brData.cepStatus === 'pending' && brData.cepJobId) {
            jobs.push({ source: 'cep', jobId: brData.cepJobId });
        }
        if (brData.cnpjStatus === 'pending' && brData.cnpjJobId) {
            jobs.push({ source: 'cnpj', jobId: brData.cnpjJobId });
        }
        return jobs;
    }
    toPositiveInteger(value, fallback) {
        const parsed = Number(value);
        return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
    }
};
exports.BrDataController = BrDataController;
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], BrDataController.prototype, "saveBrData", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)('id')),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('perPage')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], BrDataController.prototype, "findBrDataPage", null);
__decorate([
    (0, common_1.Get)('jobs/:jobId'),
    __param(0, (0, current_user_decorator_1.CurrentUser)('id')),
    __param(1, (0, common_1.Param)('jobId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], BrDataController.prototype, "findJob", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, current_user_decorator_1.CurrentUser)('id')),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], BrDataController.prototype, "findBrDataById", null);
exports.BrDataController = BrDataController = __decorate([
    (0, common_1.Controller)('br-data'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [br_data_prisma_1.PrismaBrDataRepository,
        bullmq_br_data_enrichment_1.BullMqBrDataEnrichmentProvider,
        cep_prisma_1.PrismaCepRepository,
        cnpj_prisma_1.PrismaCnpjRepository])
], BrDataController);
//# sourceMappingURL=br-data.controller.js.map