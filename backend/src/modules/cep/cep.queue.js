import { getQueue } from '../../services/queue.factory.js';
import RateLimiterService from '../../services/rate-limiter.service.js';
import { RateLimitConfig } from '../../config/rate-limit.config.js';
import { CepConstants } from './cep.constants.js';

// Limits the ViaCEP calls made by the HTTP requests and by the queue worker together.
export const createViaCepRateLimiter = () => new RateLimiterService({
    key: CepConstants.RATE_LIMIT_KEY,
    ...RateLimitConfig.VIACEP,
});

// Producer of the CEP enrichment queue (BullMQ).
export default class CepQueue {
    async add(cep, jobId) {
        return getQueue(CepConstants.QUEUE_NAME).add(CepConstants.JOB_NAME, { cep }, { jobId });
    }
}
