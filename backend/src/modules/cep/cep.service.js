import { randomUUID } from 'node:crypto';
import httpStatus from 'http-status';
import createError from 'http-errors';
import CepRepository from './cep.repository.js';
import ViaCepService from './viacep.service.js';
import CepQueue, { createViaCepRateLimiter } from './cep.queue.js';
import { CepConstants } from './cep.constants.js';
import { Constants } from '../../utils/constants.util.js';
import { isRetryable } from '../../services/queue.factory.js';
import Logger from '../../services/logger.service.js';

const logger = new Logger({
    dateFormat: process.env.DATE_FORMAT,
    logsPath: process.env.LOGS_PATH
});

const { SUCCESS, ERROR } = CepConstants.MESSAGES;
const { PENDING, PROCESSING, COMPLETED, FAILED } = Constants.ENRICHMENT_STATUS;
const PRISMA_RECORD_NOT_FOUND = 'P2025';

export default class CepService {
    constructor({
        repository = new CepRepository(),
        viaCep = new ViaCepService(),
        rateLimiter = createViaCepRateLimiter(),
        queue = new CepQueue(),
    } = {}) {
        this.repository = repository;
        this.viaCep = viaCep;
        this.rateLimiter = rateLimiter;
        this.queue = queue;
    }

    // Fetches the CEP on ViaCEP and creates (201) or refreshes (200) the stored record.
    // Over the ViaCEP rate limit, the CEP is stored as pending and queued instead (202 with the jobId).
    async enrich(cep) {
        const existing = await this.#persist(() => this.repository.findByCep(cep), ERROR.SAVE_FAILED);
        if (existing?.jobId && [PENDING, PROCESSING].includes(existing.status)) {
            return { queued: true, message: SUCCESS.CEP_ALREADY_QUEUED, jobId: existing.jobId, status: existing.status, cep };
        }

        if (!(await this.#acquireSlot())) {
            return this.#enqueue(cep, existing);
        }

        const { cep: _cep, ...fields } = await this.viaCep.findByCep(cep);
        const data = { ...fields, jobId: null, status: COMPLETED };

        return this.#persist(async () => {
            if (existing) {
                const record = await this.repository.update(cep, data);
                return { created: false, message: SUCCESS.CEP_REFRESHED, cep: record };
            }

            const record = await this.repository.create({ cep, ...data });
            return { created: true, message: SUCCESS.CEP_SAVED, cep: record };
        }, ERROR.SAVE_FAILED);
    }

    // Runs a queued enrichment (BullMQ worker): pending -> processing -> completed | failed.
    // A transient failure that will be retried goes back to pending.
    async processJob(cep, { lastAttempt = true } = {}) {
        await this.#persist(() => this.repository.update(cep, { status: PROCESSING }), ERROR.SAVE_FAILED);

        try {
            const { cep: _cep, ...fields } = await this.viaCep.findByCep(cep);
            return await this.#persist(
                () => this.repository.update(cep, { ...fields, status: COMPLETED }),
                ERROR.SAVE_FAILED
            );
        } catch (error) {
            const status = lastAttempt || !isRetryable(error) ? FAILED : PENDING;
            try {
                await this.repository.update(cep, { status });
            } catch (updateError) {
                logger.error(`[cep] ${updateError.message}`);
            }
            throw error;
        }
    }

    async list() {
        const records = await this.#persist(() => this.repository.findAll(), ERROR.FETCH_FAILED);
        return { message: SUCCESS.CEPS_LISTED, total: records.length, ceps: records };
    }

    async findByCep(cep) {
        let record;
        try {
            record = await this.repository.findByCep(cep);
        } catch (error) {
            throw this.#handleError(error, ERROR.FETCH_FAILED);
        }

        if (!record) {
            throw createError(httpStatus.NOT_FOUND, ERROR.CEP_NOT_FOUND);
        }
        return { message: SUCCESS.CEP_FOUND, cep: record };
    }

    async update(cep, fields) {
        const data = {};
        for (const field of CepConstants.UPDATABLE_FIELDS) {
            if (fields[field] !== undefined) data[field] = fields[field];
        }

        const record = await this.#persist(() => this.repository.update(cep, data), ERROR.UPDATE_FAILED);
        return { message: SUCCESS.CEP_UPDATED, cep: record };
    }

    async delete(cep) {
        const record = await this.#persist(() => this.repository.delete(cep), ERROR.DELETE_FAILED);
        return { message: SUCCESS.CEP_DELETED, cep: record };
    }

    async #acquireSlot() {
        try {
            const { allowed } = await this.rateLimiter.tryAcquire();
            return allowed;
        } catch (error) {
            logger.error(`[cep] ${error.message}`);
            throw createError(httpStatus.SERVICE_UNAVAILABLE, ERROR.QUEUE_UNAVAILABLE);
        }
    }

    // Stores the CEP as pending with the jobId before queueing it, so the worker always finds the record.
    async #enqueue(cep, existing) {
        const jobId = randomUUID();
        const pending = { jobId, status: PENDING };
        await this.#persist(
            () => (existing ? this.repository.update(cep, pending) : this.repository.create({ cep, ...pending })),
            ERROR.SAVE_FAILED
        );

        try {
            await this.queue.add(cep, jobId);
        } catch (error) {
            logger.error(`[cep] ${error.message}`);
            await this.#rollbackEnqueue(cep, existing);
            throw createError(httpStatus.SERVICE_UNAVAILABLE, ERROR.QUEUE_UNAVAILABLE);
        }

        return { queued: true, message: SUCCESS.CEP_QUEUED, jobId, status: PENDING, cep };
    }

    // Restores the record as it was before the failed enqueue.
    async #rollbackEnqueue(cep, existing) {
        try {
            if (existing) {
                await this.repository.update(cep, { jobId: existing.jobId, status: existing.status });
            } else {
                await this.repository.delete(cep);
            }
        } catch (error) {
            logger.error(`[cep] ${error.message}`);
        }
    }

    async #persist(operation, fallbackMessage) {
        try {
            return await operation();
        } catch (error) {
            throw this.#handleError(error, fallbackMessage);
        }
    }

    #handleError(error, fallbackMessage) {
        if (error.code === PRISMA_RECORD_NOT_FOUND) {
            return createError(httpStatus.NOT_FOUND, ERROR.CEP_NOT_FOUND);
        }
        logger.error(`[cep] ${error.message}`);
        return createError(httpStatus.INTERNAL_SERVER_ERROR, fallbackMessage);
    }
}
