"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BullMqBrDataEnrichmentProvider = void 0;
const common_1 = require("@nestjs/common");
const br_data_1 = require("@br-data-hub/br-data");
const bullmq_1 = require("bullmq");
const node_crypto_1 = require("node:crypto");
const br_data_queue_config_1 = require("./br-data-queue.config");
let BullMqBrDataEnrichmentProvider = class BullMqBrDataEnrichmentProvider {
    connection = (0, br_data_queue_config_1.resolveRedisConnection)();
    prefix = (0, br_data_queue_config_1.resolveQueuePrefix)();
    queues = this.bySource((source) => new bullmq_1.Queue(br_data_queue_config_1.BR_DATA_QUEUE_NAMES[source], {
        connection: this.connection,
        prefix: this.prefix,
        defaultJobOptions: br_data_queue_config_1.BR_DATA_JOB_OPTIONS,
    }));
    queueEvents = this.bySource((source) => new bullmq_1.QueueEvents(br_data_queue_config_1.BR_DATA_QUEUE_NAMES[source], {
        connection: this.connection,
        prefix: this.prefix,
    }));
    async enqueue(request) {
        const jobId = `${request.source}-${(0, node_crypto_1.randomUUID)()}`;
        await this.queues[request.source].add(request.source, request, { jobId });
        return jobId;
    }
    async isRateLimited(source) {
        const ttl = await this.queues[source].getRateLimitTtl((0, br_data_queue_config_1.resolveRateLimit)(source).max);
        return ttl > 0;
    }
    async waitForJobs(jobs, timeoutMs) {
        await Promise.all(jobs.map(async ({ source, jobId }) => {
            const job = await this.queues[source].getJob(jobId);
            if (!job || timeoutMs <= 0) {
                return;
            }
            if (await this.isRateLimitedWhileQueued(source, job)) {
                return;
            }
            await job
                .waitUntilFinished(this.queueEvents[source], timeoutMs)
                .catch(() => undefined);
        }));
    }
    async findJob(jobId) {
        const source = this.sourceOf(jobId);
        if (!source) {
            return null;
        }
        const job = await this.queues[source].getJob(jobId);
        if (!job) {
            return null;
        }
        const windowExhausted = await this.isRateLimited(source);
        const state = await job.getState();
        return {
            jobId,
            source,
            state,
            request: job.data,
            attemptsMade: job.attemptsMade,
            maxAttempts: job.opts.attempts ?? 1,
            rateLimited: windowExhausted && this.isQueued(state),
            result: job.returnvalue ?? null,
            failedReason: job.failedReason || null,
            createdAt: new Date(job.timestamp),
            processedAt: job.processedOn ? new Date(job.processedOn) : null,
            finishedAt: job.finishedOn ? new Date(job.finishedOn) : null,
        };
    }
    async onModuleDestroy() {
        await Promise.all([
            ...Object.values(this.queueEvents).map((events) => events.close()),
            ...Object.values(this.queues).map((queue) => queue.close()),
        ]);
    }
    async isRateLimitedWhileQueued(source, job) {
        if (!(await this.isRateLimited(source))) {
            return false;
        }
        return this.isQueued(await job.getState());
    }
    isQueued(state) {
        return ['waiting', 'delayed', 'prioritized'].includes(state);
    }
    sourceOf(jobId) {
        const prefix = jobId.split('-', 1)[0];
        return br_data_1.BR_DATA_SOURCES.find((source) => source === prefix) ?? null;
    }
    bySource(factory) {
        return { cep: factory('cep'), cnpj: factory('cnpj') };
    }
};
exports.BullMqBrDataEnrichmentProvider = BullMqBrDataEnrichmentProvider;
exports.BullMqBrDataEnrichmentProvider = BullMqBrDataEnrichmentProvider = __decorate([
    (0, common_1.Injectable)()
], BullMqBrDataEnrichmentProvider);
//# sourceMappingURL=bullmq.br-data-enrichment.js.map