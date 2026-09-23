import { createEnrichmentWorker } from '../../services/queue.factory.js';
import { RateLimitConfig } from '../../config/rate-limit.config.js';
import CepService from './cep.service.js';
import { createViaCepRateLimiter } from './cep.queue.js';
import { CepConstants } from './cep.constants.js';

// Consumes the CEP enrichment queue within the ViaCEP rate limit.
export const startCepWorker = ({ service = new CepService() } = {}) => createEnrichmentWorker({
    queueName: CepConstants.QUEUE_NAME,
    rateLimiter: createViaCepRateLimiter(),
    limits: RateLimitConfig.VIACEP,
    process: ({ cep }, options) => service.processJob(cep, options),
});
