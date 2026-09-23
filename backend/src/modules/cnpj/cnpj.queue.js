import { getQueue } from '../../services/queue.factory.js';
import RateLimiterService from '../../services/rate-limiter.service.js';
import { RateLimitConfig } from '../../config/rate-limit.config.js';
import { CnpjConstants } from './cnpj.constants.js';

// Limits the BrasilAPI calls made by the HTTP requests and by the queue worker together.
export const createBrasilApiRateLimiter = () => new RateLimiterService({
    key: CnpjConstants.RATE_LIMIT_KEY,
    ...RateLimitConfig.BRASILAPI,
});

// Producer of the CNPJ enrichment queue (BullMQ).
export default class CnpjQueue {
    async add(cnpj, jobId) {
        return getQueue(CnpjConstants.QUEUE_NAME).add(CnpjConstants.JOB_NAME, { cnpj }, { jobId });
    }
}
