import prisma from '../../services/prisma.service.js';

export default class JobRepository {
    // The jobId is a UUID unique across both tables, so at most one record matches.
    async findByJobId(jobId) {
        const [cep, cnpj] = await Promise.all([
            prisma.cep.findUnique({ where: { jobId } }),
            prisma.cnpj.findUnique({ where: { jobId } }),
        ]);

        if (cep) return { type: 'cep', record: cep };
        if (cnpj) return { type: 'cnpj', record: cnpj };
        return null;
    }
}
