import { jest } from '@jest/globals';

jest.unstable_mockModule('../../src/services/prisma.service.js', () => ({
    default: { $queryRaw: jest.fn().mockRejectedValue(new Error('offline')) },
}));

const { default: StatusService } = await import('../../src/services/status.service.js');

describe('# StatusService', () => {
    it('should return project info', async () => {
        const status = await new StatusService().execute();
        expect(status.projectName).toBeDefined();
        expect(status.nodeVersion).toBe(process.version);
        expect(status.isDatabaseAlive).toBe(false);
    });
});
