import { jest } from '@jest/globals';

const prismaMock = {
    cep: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
    },
};

jest.unstable_mockModule('../../../src/services/prisma.service.js', () => ({ default: prismaMock }));

const { default: CepRepository } = await import('../../../src/modules/cep/cep.repository.js');

const CEP = '01001000';
const record = { id: 'b3c9f5a2-1d2e-4f3a-9b8c-7d6e5f4a3b2c', cep: CEP, city: 'São Paulo', uf: 'SP' };

describe('# CepRepository', () => {
    const repository = new CepRepository();

    it('should list every record newest first', async () => {
        prismaMock.cep.findMany.mockResolvedValue([record]);

        await expect(repository.findAll()).resolves.toEqual([record]);
        expect(prismaMock.cep.findMany).toHaveBeenCalledWith({ orderBy: { createdAt: 'desc' } });
    });

    it('should find a record by its CEP', async () => {
        prismaMock.cep.findUnique.mockResolvedValue(record);

        await expect(repository.findByCep(CEP)).resolves.toBe(record);
        expect(prismaMock.cep.findUnique).toHaveBeenCalledWith({ where: { cep: CEP } });
    });

    it('should create a record', async () => {
        prismaMock.cep.create.mockResolvedValue(record);

        await expect(repository.create({ cep: CEP, city: 'São Paulo', uf: 'SP' })).resolves.toBe(record);
        expect(prismaMock.cep.create).toHaveBeenCalledWith({ data: { cep: CEP, city: 'São Paulo', uf: 'SP' } });
    });

    it('should update a record by its CEP', async () => {
        prismaMock.cep.update.mockResolvedValue(record);

        await expect(repository.update(CEP, { city: 'Santos' })).resolves.toBe(record);
        expect(prismaMock.cep.update).toHaveBeenCalledWith({ where: { cep: CEP }, data: { city: 'Santos' } });
    });

    it('should delete a record by its CEP', async () => {
        prismaMock.cep.delete.mockResolvedValue(record);

        await expect(repository.delete(CEP)).resolves.toBe(record);
        expect(prismaMock.cep.delete).toHaveBeenCalledWith({ where: { cep: CEP } });
    });
});
