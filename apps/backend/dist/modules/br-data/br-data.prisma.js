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
exports.PrismaBrDataRepository = void 0;
const common_1 = require("@nestjs/common");
const br_data_1 = require("@br-data-hub/br-data");
const prisma_service_1 = require("../../db/prisma.service");
const ENRICHMENT_COLUMNS = {
    cep: { status: 'cepStatus', jobId: 'cepJobId', error: 'cepError' },
    cnpj: { status: 'cnpjStatus', jobId: 'cnpjJobId', error: 'cnpjError' },
};
let PrismaBrDataRepository = class PrismaBrDataRepository {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(data) {
        const created = await this.prisma.brData.create({
            data: this.toPersistence(data),
        });
        return this.toDomain(created);
    }
    async update(data) {
        const updated = await this.prisma.brData.update({
            where: { id: data.id },
            data: this.toPersistence(data),
        });
        return this.toDomain(updated);
    }
    async updateEnrichment(id, source, patch) {
        const columns = ENRICHMENT_COLUMNS[source];
        const data = { updatedAt: new Date() };
        if (patch.status !== undefined)
            data[columns.status] = patch.status;
        if (patch.jobId !== undefined)
            data[columns.jobId] = patch.jobId;
        if (patch.error !== undefined)
            data[columns.error] = patch.error;
        await this.prisma.brData.update({
            where: { id },
            data: data,
        });
    }
    async delete(id) {
        await this.prisma.brData.delete({
            where: { id },
        });
    }
    async findById(id) {
        const found = await this.prisma.brData.findUnique({
            where: { id },
        });
        return found ? this.toDomain(found) : null;
    }
    async findPage(params) {
        const page = Math.max(params.page, 1);
        const perPage = Math.max(params.perPage, 1);
        const skip = (page - 1) * perPage;
        const where = { userId: params.userId };
        const [items, total] = await this.prisma.$transaction([
            this.prisma.brData.findMany({
                where,
                skip,
                take: perPage,
                orderBy: { createdAt: 'desc' },
            }),
            this.prisma.brData.count({ where }),
        ]);
        return {
            items: items.map((item) => this.toDomain(item)),
            page,
            perPage,
            total,
        };
    }
    toPersistence(brData) {
        return {
            id: brData.id,
            userId: brData.userId,
            cep: brData.cep ?? null,
            cepStatus: brData.cepStatus ?? null,
            cepJobId: brData.cepJobId ?? null,
            cepError: brData.cepError ?? null,
            cnpj: brData.cnpj ?? null,
            cnpjStatus: brData.cnpjStatus ?? null,
            cnpjJobId: brData.cnpjJobId ?? null,
            cnpjError: brData.cnpjError ?? null,
            createdAt: brData.createdAt,
            updatedAt: brData.updatedAt,
            deletedAt: brData.deletedAt ?? null,
        };
    }
    toDomain(raw) {
        return new br_data_1.BrData({
            id: raw.id,
            userId: raw.userId,
            cep: raw.cep ?? undefined,
            cepStatus: raw.cepStatus ?? undefined,
            cepJobId: raw.cepJobId ?? undefined,
            cepError: raw.cepError ?? undefined,
            cnpj: raw.cnpj ?? undefined,
            cnpjStatus: raw.cnpjStatus ?? undefined,
            cnpjJobId: raw.cnpjJobId ?? undefined,
            cnpjError: raw.cnpjError ?? undefined,
            createdAt: raw.createdAt,
            updatedAt: raw.updatedAt,
            deletedAt: raw.deletedAt,
        });
    }
};
exports.PrismaBrDataRepository = PrismaBrDataRepository;
exports.PrismaBrDataRepository = PrismaBrDataRepository = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PrismaBrDataRepository);
//# sourceMappingURL=br-data.prisma.js.map