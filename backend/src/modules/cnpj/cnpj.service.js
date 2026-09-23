import { randomUUID } from 'node:crypto';
import httpStatus from 'http-status';
import createError from 'http-errors';
import CnpjRepository from './cnpj.repository.js';
import BrasilApiService from './brasilapi.service.js';
import CnpjQueue, { createBrasilApiRateLimiter } from './cnpj.queue.js';
import { CnpjConstants } from './cnpj.constants.js';
import { Constants } from '../../utils/constants.util.js';
import { isRetryable } from '../../services/queue.factory.js';
import Logger from '../../services/logger.service.js';

const logger = new Logger({
    dateFormat: process.env.DATE_FORMAT,
    logsPath: process.env.LOGS_PATH
});

const { SUCCESS, ERROR } = CnpjConstants.MESSAGES;
const { PENDING, PROCESSING, COMPLETED, FAILED } = Constants.ENRICHMENT_STATUS;
const PRISMA_RECORD_NOT_FOUND = 'P2025';

export default class CnpjService {
    constructor({
        repository = new CnpjRepository(),
        brasilApi = new BrasilApiService(),
        rateLimiter = createBrasilApiRateLimiter(),
        queue = new CnpjQueue(),
    } = {}) {
        this.repository = repository;
        this.brasilApi = brasilApi;
        this.rateLimiter = rateLimiter;
        this.queue = queue;
    }

    // Fetches the CNPJ on BrasilAPI and creates (201) or refreshes (200) the stored record.
    // Over the BrasilAPI rate limit, the CNPJ is stored as pending and queued instead (202 with the jobId).
    async enrich(cnpj) {
        const existing = await this.#persist(() => this.repository.findByCnpj(cnpj), ERROR.SAVE_FAILED);
        if (existing?.jobId && [PENDING, PROCESSING].includes(existing.status)) {
            return { queued: true, message: SUCCESS.CNPJ_ALREADY_QUEUED, jobId: existing.jobId, status: existing.status, cnpj };
        }

        if (!(await this.#acquireSlot())) {
            return this.#enqueue(cnpj, existing);
        }

        const { cnpj: _cnpj, ...fields } = await this.brasilApi.findByCnpj(cnpj);
        const data = { ...fields, jobId: null, status: COMPLETED };

        return this.#persist(async () => {
            if (existing) {
                const record = await this.repository.update(cnpj, data);
                return { created: false, message: SUCCESS.CNPJ_REFRESHED, cnpj: record };
            }

            const record = await this.repository.create({ cnpj, ...data });
            return { created: true, message: SUCCESS.CNPJ_SAVED, cnpj: record };
        }, ERROR.SAVE_FAILED);
    }

    // Runs a queued enrichment (BullMQ worker): pending -> processing -> completed | failed.
    // A transient failure that will be retried goes back to pending.
    async processJob(cnpj, { lastAttempt = true } = {}) {
        await this.#persist(() => this.repository.update(cnpj, { status: PROCESSING }), ERROR.SAVE_FAILED);

        try {
            const { cnpj: _cnpj, ...fields } = await this.brasilApi.findByCnpj(cnpj);
            return await this.#persist(
                () => this.repository.update(cnpj, { ...fields, status: COMPLETED }),
                ERROR.SAVE_FAILED
            );
        } catch (error) {
            const status = lastAttempt || !isRetryable(error) ? FAILED : PENDING;
            try {
                await this.repository.update(cnpj, { status });
            } catch (updateError) {
                logger.error(`[cnpj] ${updateError.message}`);
            }
            throw error;
        }
    }

    async list() {
        const records = await this.#persist(() => this.repository.findAll(), ERROR.FETCH_FAILED);
        return { message: SUCCESS.CNPJS_LISTED, total: records.length, cnpjs: records };
    }

    async findByCnpj(cnpj) {
        let record;
        try {
            record = await this.repository.findByCnpj(cnpj);
        } catch (error) {
            throw this.#handleError(error, ERROR.FETCH_FAILED);
        }

        if (!record) {
            throw createError(httpStatus.NOT_FOUND, ERROR.CNPJ_NOT_FOUND);
        }
        return { message: SUCCESS.CNPJ_FOUND, cnpj: record };
    }

    async update(cnpj, fields) {
        const data = {};
        for (const field of CnpjConstants.UPDATABLE_FIELDS) {
            if (fields[field] !== undefined) data[field] = fields[field];
        }

        const record = await this.#persist(() => this.repository.update(cnpj, data), ERROR.UPDATE_FAILED);
        return { message: SUCCESS.CNPJ_UPDATED, cnpj: record };
    }

    async delete(cnpj) {
        const record = await this.#persist(() => this.repository.delete(cnpj), ERROR.DELETE_FAILED);
        return { message: SUCCESS.CNPJ_DELETED, cnpj: record };
    }

    async #acquireSlot() {
        try {
            const { allowed } = await this.rateLimiter.tryAcquire();
            return allowed;
        } catch (error) {
            logger.error(`[cnpj] ${error.message}`);
            throw createError(httpStatus.SERVICE_UNAVAILABLE, ERROR.QUEUE_UNAVAILABLE);
        }
    }

    // Stores the CNPJ as pending with the jobId before queueing it, so the worker always finds the record.
    async #enqueue(cnpj, existing) {
        const jobId = randomUUID();
        const pending = { jobId, status: PENDING };
        await this.#persist(
            () => (existing ? this.repository.update(cnpj, pending) : this.repository.create({ cnpj, ...pending })),
            ERROR.SAVE_FAILED
        );

        try {
            await this.queue.add(cnpj, jobId);
        } catch (error) {
            logger.error(`[cnpj] ${error.message}`);
            await this.#rollbackEnqueue(cnpj, existing);
            throw createError(httpStatus.SERVICE_UNAVAILABLE, ERROR.QUEUE_UNAVAILABLE);
        }

        return { queued: true, message: SUCCESS.CNPJ_QUEUED, jobId, status: PENDING, cnpj };
    }

    // Restores the record as it was before the failed enqueue.
    async #rollbackEnqueue(cnpj, existing) {
        try {
            if (existing) {
                await this.repository.update(cnpj, { jobId: existing.jobId, status: existing.status });
            } else {
                await this.repository.delete(cnpj);
            }
        } catch (error) {
            logger.error(`[cnpj] ${error.message}`);
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
            return createError(httpStatus.NOT_FOUND, ERROR.CNPJ_NOT_FOUND);
        }
        logger.error(`[cnpj] ${error.message}`);
        return createError(httpStatus.INTERNAL_SERVER_ERROR, fallbackMessage);
    }
}
