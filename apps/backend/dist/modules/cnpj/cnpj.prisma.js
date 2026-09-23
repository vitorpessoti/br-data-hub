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
exports.PrismaCnpjRepository = void 0;
const common_1 = require("@nestjs/common");
const cnpj_1 = require("@br-data-hub/cnpj");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../../db/prisma.service");
let PrismaCnpjRepository = class PrismaCnpjRepository {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(data) {
        const created = await this.prisma.cnpj.create({
            data: this.toPersistence(data),
        });
        return this.toDomain(created);
    }
    async update(data) {
        const updated = await this.prisma.cnpj.update({
            where: { id: data.id },
            data: this.toPersistence(data),
        });
        return this.toDomain(updated);
    }
    async delete(id) {
        await this.prisma.cnpj.delete({
            where: { id },
        });
    }
    async findById(id) {
        const found = await this.prisma.cnpj.findUnique({
            where: { id },
        });
        return found ? this.toDomain(found) : null;
    }
    async findByCnpj(cnpj) {
        const found = await this.prisma.cnpj.findUnique({
            where: { cnpj },
        });
        return found ? this.toDomain(found) : null;
    }
    async findPage(params) {
        const page = Math.max(params.page, 1);
        const perPage = Math.max(params.perPage, 1);
        const skip = (page - 1) * perPage;
        const [items, total] = await this.prisma.$transaction([
            this.prisma.cnpj.findMany({
                skip,
                take: perPage,
                orderBy: { cnpj: 'asc' },
            }),
            this.prisma.cnpj.count(),
        ]);
        return {
            items: items.map((item) => this.toDomain(item)),
            page,
            perPage,
            total,
        };
    }
    toPersistence(cnpj) {
        return {
            id: cnpj.id,
            cnpj: cnpj.cnpj,
            branchTypeCode: cnpj.branchTypeCode,
            branchTypeDescription: cnpj.branchTypeDescription ?? null,
            legalName: cnpj.legalName,
            tradeName: cnpj.tradeName ?? null,
            registrationStatusCode: cnpj.registrationStatusCode,
            registrationStatusDescription: cnpj.registrationStatusDescription ?? null,
            registrationStatusDate: this.toDate(cnpj.registrationStatusDate),
            registrationStatusReasonCode: cnpj.registrationStatusReasonCode ?? null,
            registrationStatusReasonDescription: cnpj.registrationStatusReasonDescription ?? null,
            foreignCityName: cnpj.foreignCityName ?? null,
            countryCode: cnpj.countryCode ?? null,
            countryName: cnpj.countryName ?? null,
            legalNatureCode: cnpj.legalNatureCode,
            legalNatureDescription: cnpj.legalNatureDescription ?? null,
            activityStartDate: this.toDate(cnpj.activityStartDate),
            mainCnaeCode: cnpj.mainCnaeCode,
            mainCnaeDescription: cnpj.mainCnaeDescription ?? null,
            streetType: cnpj.streetType ?? null,
            street: cnpj.street ?? null,
            addressNumber: cnpj.addressNumber ?? null,
            complement: cnpj.complement ?? null,
            neighborhood: cnpj.neighborhood ?? null,
            zipCode: cnpj.zipCode ?? null,
            stateCode: cnpj.stateCode,
            city: cnpj.city,
            siafiCode: cnpj.siafiCode ?? null,
            ibgeCode: cnpj.ibgeCode ?? null,
            primaryPhone: cnpj.primaryPhone ?? null,
            secondaryPhone: cnpj.secondaryPhone ?? null,
            fax: cnpj.fax ?? null,
            email: cnpj.email ?? null,
            responsibleQualificationCode: cnpj.responsibleQualificationCode ?? null,
            shareCapital: new client_1.Prisma.Decimal(cnpj.shareCapital),
            companySizeCode: cnpj.companySizeCode ?? null,
            companySizeDescription: cnpj.companySizeDescription ?? null,
            simplesOption: cnpj.simplesOption ?? null,
            simplesOptionDate: this.toDate(cnpj.simplesOptionDate),
            simplesExclusionDate: this.toDate(cnpj.simplesExclusionDate),
            meiOption: cnpj.meiOption ?? null,
            meiOptionDate: this.toDate(cnpj.meiOptionDate),
            meiExclusionDate: this.toDate(cnpj.meiExclusionDate),
            specialStatus: cnpj.specialStatus ?? null,
            specialStatusDate: this.toDate(cnpj.specialStatusDate),
            responsibleFederativeEntity: cnpj.responsibleFederativeEntity ?? null,
            secondaryCnaes: this.toJson(cnpj.secondaryCnaes),
            partners: this.toJson(cnpj.partners),
            taxRegimes: this.toJson(cnpj.taxRegimes),
            createdAt: cnpj.createdAt,
            updatedAt: cnpj.updatedAt,
            deletedAt: cnpj.deletedAt ?? null,
        };
    }
    toDomain(raw) {
        return new cnpj_1.Cnpj({
            id: raw.id,
            cnpj: raw.cnpj,
            branchTypeCode: raw.branchTypeCode,
            branchTypeDescription: raw.branchTypeDescription ?? undefined,
            legalName: raw.legalName,
            tradeName: raw.tradeName ?? undefined,
            registrationStatusCode: raw.registrationStatusCode,
            registrationStatusDescription: raw.registrationStatusDescription ?? undefined,
            registrationStatusDate: this.fromDate(raw.registrationStatusDate),
            registrationStatusReasonCode: raw.registrationStatusReasonCode ?? undefined,
            registrationStatusReasonDescription: raw.registrationStatusReasonDescription ?? undefined,
            foreignCityName: raw.foreignCityName ?? undefined,
            countryCode: raw.countryCode ?? undefined,
            countryName: raw.countryName ?? undefined,
            legalNatureCode: raw.legalNatureCode,
            legalNatureDescription: raw.legalNatureDescription ?? undefined,
            activityStartDate: this.fromDate(raw.activityStartDate),
            mainCnaeCode: raw.mainCnaeCode,
            mainCnaeDescription: raw.mainCnaeDescription ?? undefined,
            streetType: raw.streetType ?? undefined,
            street: raw.street ?? undefined,
            addressNumber: raw.addressNumber ?? undefined,
            complement: raw.complement ?? undefined,
            neighborhood: raw.neighborhood ?? undefined,
            zipCode: raw.zipCode ?? undefined,
            stateCode: raw.stateCode,
            city: raw.city,
            siafiCode: raw.siafiCode ?? undefined,
            ibgeCode: raw.ibgeCode ?? undefined,
            primaryPhone: raw.primaryPhone ?? undefined,
            secondaryPhone: raw.secondaryPhone ?? undefined,
            fax: raw.fax ?? undefined,
            email: raw.email ?? undefined,
            responsibleQualificationCode: raw.responsibleQualificationCode ?? undefined,
            shareCapital: raw.shareCapital.toNumber(),
            companySizeCode: raw.companySizeCode ?? undefined,
            companySizeDescription: raw.companySizeDescription ?? undefined,
            simplesOption: raw.simplesOption ?? undefined,
            simplesOptionDate: this.fromDate(raw.simplesOptionDate),
            simplesExclusionDate: this.fromDate(raw.simplesExclusionDate),
            meiOption: raw.meiOption ?? undefined,
            meiOptionDate: this.fromDate(raw.meiOptionDate),
            meiExclusionDate: this.fromDate(raw.meiExclusionDate),
            specialStatus: raw.specialStatus ?? undefined,
            specialStatusDate: this.fromDate(raw.specialStatusDate),
            responsibleFederativeEntity: raw.responsibleFederativeEntity ?? undefined,
            secondaryCnaes: raw.secondaryCnaes,
            partners: raw.partners,
            taxRegimes: raw.taxRegimes,
            createdAt: raw.createdAt,
            updatedAt: raw.updatedAt,
            deletedAt: raw.deletedAt,
        });
    }
    toDate(value) {
        return value ? new Date(value) : null;
    }
    fromDate(value) {
        return value ? value.toISOString().slice(0, 10) : undefined;
    }
    toJson(value) {
        return JSON.parse(JSON.stringify(value));
    }
};
exports.PrismaCnpjRepository = PrismaCnpjRepository;
exports.PrismaCnpjRepository = PrismaCnpjRepository = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PrismaCnpjRepository);
//# sourceMappingURL=cnpj.prisma.js.map