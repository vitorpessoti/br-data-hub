import './env.js';
import { Redis } from 'ioredis';
import Logger from '../services/logger.service.js';

const logger = new Logger({
    dateFormat: process.env.DATE_FORMAT,
    logsPath: process.env.LOGS_PATH
});

// Connection to the Redis that stores the BullMQ queues/jobs and the rate-limit counters
// (local instance: docker compose up -d redis).
export const redisConfig = {
    host: process.env.REDIS_HOST || 'localhost',
    port: Number(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    db: Number(process.env.REDIS_DB) || 0,
};

// Workers use blocking commands, so BullMQ requires them to retry forever.
export const workerRedisConfig = { ...redisConfig, maxRetriesPerRequest: null };

let client;

// Shared connection for the HTTP side (queues and rate limiters). It fails fast when Redis is down,
// so a request is answered with an error instead of hanging.
export const getRedisClient = () => {
    if (!client) {
        client = new Redis({ ...redisConfig, maxRetriesPerRequest: 1 });
        client.on('error', error => logger.error(`[redis] ${error.message}`));
    }
    return client;
};

export const closeRedisClient = async () => {
    if (!client) return;
    await client.quit();
    client = undefined;
};
