import packageJson from '../../package.json' with { type: 'json' };
import prisma from './prisma.service.js';

class StatusService {
    async execute() {
        return {
            projectName: packageJson.name,
            projectVersion: packageJson.version,
            environment: process.env.ENVIRONMENT,
            nodeVersion: process.version,
            isDatabaseAlive: await this.isDatabaseAlive(),
        };
    }

    async isDatabaseAlive() {
        try {
            await prisma.$queryRaw`SELECT 1`;
            return true;
        } catch {
            return false;
        }
    }
}

export default StatusService;
