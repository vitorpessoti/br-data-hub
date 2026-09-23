import { jest } from '@jest/globals';
import httpStatus from 'http-status';

const loggerErrorMock = jest.fn();
const prismaMock = {
    cep: { findUnique: jest.fn() },
    cnpj: { findUnique: jest.fn() },
};

jest.unstable_mockModule('../../../src/services/prisma.service.js', () => ({ default: prismaMock }));
jest.unstable_mockModule('../../../src/services/logger.service.js', () => ({
    default: class {
        error(message) {
            loggerErrorMock(message);
        }
    },
}));

const { default: JobService } = await import('../../../src/modules/job/job.service.js');
const { default: JobRepository } = await import('../../../src/modules/job/job.repository.js');
const { JobConstants } = await import('../../../src/modules/job/job.constants.js');

const { SUCCESS, ERROR } = JobConstants.MESSAGES;
const JOB_ID = '7f1c2d3e-4b5a-4c6d-8e7f-9a0b1c2d3e4f';
const record = { cep: '01001000', jobId: JOB_ID, status: 'failed' };

describe('# JobService', () => {
    it('should build the default repository', () => {
        expect(new JobService().repository).toBeInstanceOf(JobRepository);
    });

    it('should return the record found with its type and status', async () => {
        const repository = { findByJobId: jest.fn().mockResolvedValue({ type: 'cep', record }) };

        await expect(new JobService({ repository }).findByJobId(JOB_ID)).resolves.toEqual({
            message: SUCCESS.JOB_FOUND,
            jobId: JOB_ID,
            type: 'cep',
            status: 'failed',
            cep: record,
        });
        expect(repository.findByJobId).toHaveBeenCalledWith(JOB_ID);
    });

    it('should throw 404 when no record has the jobId', async () => {
        const repository = { findByJobId: jest.fn().mockResolvedValue(null) };

        await expect(new JobService({ repository }).findByJobId(JOB_ID)).rejects.toMatchObject({
            status: httpStatus.NOT_FOUND,
            message: ERROR.JOB_NOT_FOUND,
        });
    });

    it('should throw 500 with the fetch error when the database fails', async () => {
        const repository = { findByJobId: jest.fn().mockRejectedValue(new Error('database offline')) };

        await expect(new JobService({ repository }).findByJobId(JOB_ID)).rejects.toMatchObject({
            status: httpStatus.INTERNAL_SERVER_ERROR,
            message: ERROR.FETCH_FAILED,
        });
        expect(loggerErrorMock).toHaveBeenCalledWith('[job] database offline');
    });
});

describe('# JobRepository', () => {
    const repository = new JobRepository();

    beforeEach(() => {
        prismaMock.cep.findUnique.mockResolvedValue(null);
        prismaMock.cnpj.findUnique.mockResolvedValue(null);
    });

    it('should look for the jobId in the cep and cnpj tables', async () => {
        await expect(repository.findByJobId(JOB_ID)).resolves.toBeNull();
        expect(prismaMock.cep.findUnique).toHaveBeenCalledWith({ where: { jobId: JOB_ID } });
        expect(prismaMock.cnpj.findUnique).toHaveBeenCalledWith({ where: { jobId: JOB_ID } });
    });

    it('should return a CEP record with its type', async () => {
        prismaMock.cep.findUnique.mockResolvedValue(record);

        await expect(repository.findByJobId(JOB_ID)).resolves.toEqual({ type: 'cep', record });
    });

    it('should return a CNPJ record with its type', async () => {
        const cnpj = { cnpj: '19131243000197', jobId: JOB_ID, status: 'pending' };
        prismaMock.cnpj.findUnique.mockResolvedValue(cnpj);

        await expect(repository.findByJobId(JOB_ID)).resolves.toEqual({ type: 'cnpj', record: cnpj });
    });
});
