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
exports.PrismaUserRepository = void 0;
const common_1 = require("@nestjs/common");
const auth_1 = require("@br-data-hub/auth");
const prisma_service_1 = require("../../db/prisma.service");
let PrismaUserRepository = class PrismaUserRepository {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(data) {
        const created = await this.prisma.user.create({
            data: this.toPersistence(data),
        });
        return this.toDomain(created);
    }
    async update(data) {
        const updated = await this.prisma.user.update({
            where: { id: data.id },
            data: this.toPersistence(data),
        });
        return this.toDomain(updated);
    }
    async delete(id) {
        await this.prisma.user.delete({
            where: { id },
        });
    }
    async findById(id) {
        const found = await this.prisma.user.findUnique({
            where: { id },
        });
        return found ? this.toDomain(found) : null;
    }
    async findByEmail(email) {
        const found = await this.prisma.user.findUnique({
            where: { email },
        });
        return found ? this.toDomain(found) : null;
    }
    async findPage(params) {
        const page = Math.max(params.page, 1);
        const perPage = Math.max(params.perPage, 1);
        const skip = (page - 1) * perPage;
        const [items, total] = await this.prisma.$transaction([
            this.prisma.user.findMany({
                skip,
                take: perPage,
                orderBy: { createdAt: 'desc' },
            }),
            this.prisma.user.count(),
        ]);
        return {
            items: items.map((item) => this.toDomain(item)),
            page,
            perPage,
            total,
        };
    }
    toPersistence(user) {
        return {
            id: user.id,
            name: user.name,
            email: user.email,
            password: user.password,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
            deletedAt: user.deletedAt ?? null,
        };
    }
    toDomain(raw) {
        return new auth_1.User({
            id: raw.id,
            name: raw.name,
            email: raw.email,
            password: raw.password,
            createdAt: raw.createdAt,
            updatedAt: raw.updatedAt,
            deletedAt: raw.deletedAt,
        });
    }
};
exports.PrismaUserRepository = PrismaUserRepository;
exports.PrismaUserRepository = PrismaUserRepository = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PrismaUserRepository);
//# sourceMappingURL=user.prisma.js.map