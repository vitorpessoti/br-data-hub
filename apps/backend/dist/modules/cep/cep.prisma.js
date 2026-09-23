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
exports.PrismaCepRepository = void 0;
const common_1 = require("@nestjs/common");
const cep_1 = require("@br-data-hub/cep");
const prisma_service_1 = require("../../db/prisma.service");
let PrismaCepRepository = class PrismaCepRepository {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(data) {
        const created = await this.prisma.cep.create({
            data: this.toPersistence(data),
        });
        return this.toDomain(created);
    }
    async update(data) {
        const updated = await this.prisma.cep.update({
            where: { id: data.id },
            data: this.toPersistence(data),
        });
        return this.toDomain(updated);
    }
    async delete(id) {
        await this.prisma.cep.delete({
            where: { id },
        });
    }
    async findById(id) {
        const found = await this.prisma.cep.findUnique({
            where: { id },
        });
        return found ? this.toDomain(found) : null;
    }
    async findByCep(cep) {
        const found = await this.prisma.cep.findUnique({
            where: { cep },
        });
        return found ? this.toDomain(found) : null;
    }
    async findPage(params) {
        const page = Math.max(params.page, 1);
        const perPage = Math.max(params.perPage, 1);
        const skip = (page - 1) * perPage;
        const [items, total] = await this.prisma.$transaction([
            this.prisma.cep.findMany({
                skip,
                take: perPage,
                orderBy: { cep: 'asc' },
            }),
            this.prisma.cep.count(),
        ]);
        return {
            items: items.map((item) => this.toDomain(item)),
            page,
            perPage,
            total,
        };
    }
    toPersistence(cep) {
        return {
            id: cep.id,
            cep: cep.cep,
            street: cep.street ?? null,
            complement: cep.complement ?? null,
            unit: cep.unit ?? null,
            neighborhood: cep.neighborhood ?? null,
            city: cep.city,
            stateCode: cep.stateCode,
            stateName: cep.stateName,
            region: cep.region,
            ibgeCode: cep.ibgeCode,
            giaCode: cep.giaCode ?? null,
            areaCode: cep.areaCode,
            siafiCode: cep.siafiCode,
            createdAt: cep.createdAt,
            updatedAt: cep.updatedAt,
            deletedAt: cep.deletedAt ?? null,
        };
    }
    toDomain(raw) {
        return new cep_1.Cep({
            id: raw.id,
            cep: raw.cep,
            street: raw.street ?? undefined,
            complement: raw.complement ?? undefined,
            unit: raw.unit ?? undefined,
            neighborhood: raw.neighborhood ?? undefined,
            city: raw.city,
            stateCode: raw.stateCode,
            stateName: raw.stateName,
            region: raw.region,
            ibgeCode: raw.ibgeCode,
            giaCode: raw.giaCode ?? undefined,
            areaCode: raw.areaCode,
            siafiCode: raw.siafiCode,
            createdAt: raw.createdAt,
            updatedAt: raw.updatedAt,
            deletedAt: raw.deletedAt,
        });
    }
};
exports.PrismaCepRepository = PrismaCepRepository;
exports.PrismaCepRepository = PrismaCepRepository = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PrismaCepRepository);
//# sourceMappingURL=cep.prisma.js.map