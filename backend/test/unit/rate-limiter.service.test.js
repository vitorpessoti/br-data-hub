import { jest } from '@jest/globals';

const redisMock = { eval: jest.fn() };

jest.unstable_mockModule('../../src/config/redis.config.js', () => ({ getRedisClient: () => redisMock }));

const { default: RateLimiterService } = await import('../../src/services/rate-limiter.service.js');

describe('# RateLimiterService - tryAcquire', () => {
    it('should allow the request while the window has slots', async () => {
        redisMock.eval.mockResolvedValue([3, 400]);
        const limiter = new RateLimiterService({ key: 'viacep', max: 3, duration: 1000 });

        await expect(limiter.tryAcquire()).resolves.toEqual({ allowed: true });
        expect(redisMock.eval).toHaveBeenCalledWith(expect.stringContaining('INCR'), 1, 'rate-limit:viacep', 1000);
    });

    it('should deny the request with the time until the next window when the limit is reached', async () => {
        redisMock.eval.mockResolvedValue([4, 400]);
        const limiter = new RateLimiterService({ key: 'viacep', max: 3, duration: 1000 });

        await expect(limiter.tryAcquire()).resolves.toEqual({ allowed: false, retryAfterMs: 400 });
    });

    it('should never return a wait shorter than 1 ms', async () => {
        redisMock.eval.mockResolvedValue([4, 0]);
        const limiter = new RateLimiterService({ key: 'viacep', max: 3, duration: 1000 });

        await expect(limiter.tryAcquire()).resolves.toEqual({ allowed: false, retryAfterMs: 1 });
    });

    it('should use the injected Redis client', async () => {
        const client = { eval: jest.fn().mockResolvedValue([1, 1000]) };
        const limiter = new RateLimiterService({ key: 'brasilapi', max: 3, duration: 1000, client });

        await expect(limiter.tryAcquire()).resolves.toEqual({ allowed: true });
        expect(client.eval).toHaveBeenCalledWith(expect.any(String), 1, 'rate-limit:brasilapi', 1000);
        expect(redisMock.eval).not.toHaveBeenCalled();
    });

    it('should propagate Redis errors', async () => {
        redisMock.eval.mockRejectedValue(new Error('redis offline'));
        const limiter = new RateLimiterService({ key: 'viacep', max: 3, duration: 1000 });

        await expect(limiter.tryAcquire()).rejects.toThrow('redis offline');
    });
});
