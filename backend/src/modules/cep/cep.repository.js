import prisma from '../../services/prisma.service.js';

export default class CepRepository {
    // Newest first.
    async findAll() {
        return prisma.cep.findMany({ orderBy: { createdAt: 'desc' } });
    }

    async findByCep(cep) {
        return prisma.cep.findUnique({ where: { cep } });
    }

    async create(data) {
        return prisma.cep.create({ data });
    }

    async update(cep, data) {
        return prisma.cep.update({ where: { cep }, data });
    }

    async delete(cep) {
        return prisma.cep.delete({ where: { cep } });
    }
}
