import httpStatus from 'http-status';
import createError from 'http-errors';
import JobRepository from './job.repository.js';
import { JobConstants } from './job.constants.js';
import Logger from '../../services/logger.service.js';

const logger = new Logger({
    dateFormat: process.env.DATE_FORMAT,
    logsPath: process.env.LOGS_PATH
});

const { SUCCESS, ERROR } = JobConstants.MESSAGES;

export default class JobService {
    constructor({ repository = new JobRepository() } = {}) {
        this.repository = repository;
    }

    // Returns the enrichment status of a queued CEP/CNPJ (and its data, once completed).
    async findByJobId(jobId) {
        let found;
        try {
            found = await this.repository.findByJobId(jobId);
        } catch (error) {
            logger.error(`[job] ${error.message}`);
            throw createError(httpStatus.INTERNAL_SERVER_ERROR, ERROR.FETCH_FAILED);
        }

        if (!found) {
            throw createError(httpStatus.NOT_FOUND, ERROR.JOB_NOT_FOUND);
        }

        const { type, record } = found;
        return { message: SUCCESS.JOB_FOUND, jobId, type, status: record.status, [type]: record };
    }
}
