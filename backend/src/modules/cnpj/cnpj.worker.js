import { createEnrichmentWorker } from '../../services/queue.factory.js';
import { RateLimitConfig } from '../../config/rate-limit.config.js';
import CnpjService from './cnpj.service.js';
import { createBrasilApiRateLimiter } from './cnpj.queue.js';
import { CnpjConstants } from './cnpj.constants.js';

// Consumes the CNPJ enrichment queue within the BrasilAPI rate limit.
export const startCnpjWorker = ({ service = new CnpjService() } = {}) => createEnrichmentWorker({
    queueName: CnpjConstants.QUEUE_NAME,
    rateLimiter: createBrasilApiRateLimiter(),
    limits: RateLimitConfig.BRASILAPI,
    process: ({ cnpj }, options) => service.processJob(cnpj, options),
});
