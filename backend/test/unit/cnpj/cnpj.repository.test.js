import { jest } from '@jest/globals';

const prismaMock = {
    cnpj: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
    },
};

jest.unstable_mockModule('../../../src/services/prisma.service.js', () => ({ default: prismaMock }));

const { default: CnpjRepository } = await import('../../../src/modules/cnpj/cnpj.repository.js');

const CNPJ = '19131243000197';
const record = { id: 'b3c9f5a2-1d2e-4f3a-9b8c-7d6e5f4a3b2c', cnpj: CNPJ, corporateName: 'OPEN KNOWLEDGE BRASIL' };

describe('# CnpjRepository', () => {
    const repository = new CnpjRepository();

    it('should list every record newest first', async () => {
        prismaMock.cnpj.findMany.mockResolvedValue([record]);

        await expect(repository.findAll()).resolves.toEqual([record]);
        expect(prismaMock.cnpj.findMany).toHaveBeenCalledWith({ orderBy: { createdAt: 'desc' } });
    });

    it('should find a record by its CNPJ', async () => {
        prismaMock.cnpj.findUnique.mockResolvedValue(record);

        await expect(repository.findByCnpj(CNPJ)).resolves.toBe(record);
        expect(prismaMock.cnpj.findUnique).toHaveBeenCalledWith({ where: { cnpj: CNPJ } });
    });

    it('should create a record', async () => {
        prismaMock.cnpj.create.mockResolvedValue(record);

        await expect(repository.create({ cnpj: CNPJ, corporateName: 'OPEN KNOWLEDGE BRASIL' })).resolves.toBe(record);
        expect(prismaMock.cnpj.create).toHaveBeenCalledWith({ data: { cnpj: CNPJ, corporateName: 'OPEN KNOWLEDGE BRASIL' } });
    });

    it('should update a record by its CNPJ', async () => {
        prismaMock.cnpj.update.mockResolvedValue(record);

        await expect(repository.update(CNPJ, { tradeName: 'OKBR' })).resolves.toBe(record);
        expect(prismaMock.cnpj.update).toHaveBeenCalledWith({ where: { cnpj: CNPJ }, data: { tradeName: 'OKBR' } });
    });

    it('should delete a record by its CNPJ', async () => {
        prismaMock.cnpj.delete.mockResolvedValue(record);

        await expect(repository.delete(CNPJ)).resolves.toBe(record);
        expect(prismaMock.cnpj.delete).toHaveBeenCalledWith({ where: { cnpj: CNPJ } });
    });
});
