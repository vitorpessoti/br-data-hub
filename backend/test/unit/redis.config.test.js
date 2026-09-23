import { jest } from '@jest/globals';

const redisInstances = [];
const loggerErrorMock = jest.fn();

class RedisMock {
    constructor(options) {
        this.options = options;
        this.handlers = {};
        this.quit = jest.fn();
        redisInstances.push(this);
    }

    on(event, handler) {
        this.handlers[event] = handler;
    }
}

jest.unstable_mockModule('ioredis', () => ({ Redis: RedisMock }));
jest.unstable_mockModule('../../src/services/logger.service.js', () => ({
    default: class {
        error(message) {
            loggerErrorMock(message);
        }
    },
}));

const { redisConfig, workerRedisConfig, getRedisClient, closeRedisClient } =
    await import('../../src/config/redis.config.js');

afterEach(async () => {
    await closeRedisClient();
    redisInstances.length = 0;
});

describe('# redis.config', () => {
    it('should read the connection from the environment, with local defaults', () => {
        expect(redisConfig).toEqual({
            host: process.env.REDIS_HOST || 'localhost',
            port: Number(process.env.REDIS_PORT) || 6379,
            password: process.env.REDIS_PASSWORD || undefined,
            db: Number(process.env.REDIS_DB) || 0,
        });
    });

    it('should let the workers retry forever', () => {
        expect(workerRedisConfig).toEqual({ ...redisConfig, maxRetriesPerRequest: null });
    });

    it('should create the shared client once, failing fast', () => {
        const client = getRedisClient();

        expect(getRedisClient()).toBe(client);
        expect(redisInstances).toHaveLength(1);
        expect(client.options).toEqual({ ...redisConfig, maxRetriesPerRequest: 1 });
    });

    it('should log the connection errors of the shared client', () => {
        getRedisClient().handlers.error(new Error('connect ECONNREFUSED'));

        expect(loggerErrorMock).toHaveBeenCalledWith('[redis] connect ECONNREFUSED');
    });

    it('should close the shared client and create a new one afterwards', async () => {
        const client = getRedisClient();

        await closeRedisClient();

        expect(client.quit).toHaveBeenCalled();
        expect(getRedisClient()).not.toBe(client);
    });

    it('should do nothing when closing without a client', async () => {
        await expect(closeRedisClient()).resolves.toBeUndefined();
    });
});
