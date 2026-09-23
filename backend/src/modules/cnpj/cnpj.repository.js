import prisma from '../../services/prisma.service.js';

export default class CnpjRepository {
    // Newest first.
    async findAll() {
        return prisma.cnpj.findMany({ orderBy: { createdAt: 'desc' } });
    }

    async findByCnpj(cnpj) {
        return prisma.cnpj.findUnique({ where: { cnpj } });
    }

    async create(data) {
        return prisma.cnpj.create({ data });
    }

    async update(cnpj, data) {
        return prisma.cnpj.update({ where: { cnpj }, data });
    }

    async delete(cnpj) {
        return prisma.cnpj.delete({ where: { cnpj } });
    }
}
