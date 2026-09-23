import { getRedisClient } from '../config/redis.config.js';

// Fixed window counter: increments the window and returns [requests in the window, window ttl in ms].
const ACQUIRE_SCRIPT = `
local current = redis.call('INCR', KEYS[1])
local ttl = redis.call('PTTL', KEYS[1])
if ttl < 0 then
    redis.call('PEXPIRE', KEYS[1], ARGV[1])
    ttl = tonumber(ARGV[1])
end
return { current, ttl }
`;

// Rate limiter shared (through Redis) by the HTTP requests and the BullMQ workers of one external API,
// so both together never go over `max` calls per `duration` ms.
export default class RateLimiterService {
    constructor({ key, max, duration, client }) {
        this.key = `rate-limit:${key}`;
        this.max = max;
        this.duration = duration;
        this.client = client;
    }

    // Takes a slot of the current window. When there is none, returns how long until the next window.
    async tryAcquire() {
        const redis = this.client ?? getRedisClient();
        const [count, ttl] = await redis.eval(ACQUIRE_SCRIPT, 1, this.key, this.duration);
        return count <= this.max ? { allowed: true } : { allowed: false, retryAfterMs: Math.max(ttl, 1) };
    }
}
