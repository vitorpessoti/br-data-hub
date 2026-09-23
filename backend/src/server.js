import app from './app.js';
import Logger from './services/logger.service.js';
import prisma from './services/prisma.service.js';
import { closeQueues } from './services/queue.factory.js';
import { closeRedisClient } from './config/redis.config.js';
import { startCepWorker } from './modules/cep/cep.worker.js';
import { startCnpjWorker } from './modules/cnpj/cnpj.worker.js';

const port = process.env.PORT || 3000;
const logger = new Logger({
    dateFormat: process.env.DATE_FORMAT,
    logsPath: process.env.LOGS_PATH
});

const server = app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});

// BullMQ workers that process the CEP/CNPJ enrichments queued over the rate limit.
const workers = [startCepWorker(), startCnpjWorker()];
for (const worker of workers) {
    worker.on('error', error => logger.error(`[worker ${worker.name}] ${error.message}`));
}

const shutdown = async () => {
    server.close();
    await Promise.all(workers.map(worker => worker.close()));
    await closeQueues();
    await closeRedisClient();
    await prisma.$disconnect();
    process.exit(0);
};

process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);
