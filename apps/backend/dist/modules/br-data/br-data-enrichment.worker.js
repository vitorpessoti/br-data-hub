"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var BrDataEnrichmentWorker_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.BrDataEnrichmentWorker = void 0;
const common_1 = require("@nestjs/common");
const br_data_1 = require("@br-data-hub/br-data");
const bullmq_1 = require("bullmq");
const br_data_enrichment_processor_1 = require("./br-data-enrichment.processor");
const br_data_queue_config_1 = require("./br-data-queue.config");
let BrDataEnrichmentWorker = BrDataEnrichmentWorker_1 = class BrDataEnrichmentWorker {
    processor;
    logger = new common_1.Logger(BrDataEnrichmentWorker_1.name);
    workers = [];
    constructor(processor) {
        this.processor = processor;
    }
    onModuleInit() {
        for (const source of br_data_1.BR_DATA_SOURCES) {
            this.workers.push(this.createWorker(source));
        }
    }
    async onModuleDestroy() {
        await Promise.all(this.workers.map((worker) => worker.close()));
    }
    createWorker(source) {
        const limiter = (0, br_data_queue_config_1.resolveRateLimit)(source);
        const backoffMs = (0, br_data_queue_config_1.resolveRateLimitBackoffMs)();
        const worker = new bullmq_1.Worker(br_data_queue_config_1.BR_DATA_QUEUE_NAMES[source], async (job) => {
            try {
                return await this.processor.process(job);
            }
            catch (error) {
                if (!(error instanceof br_data_enrichment_processor_1.BrDataRateLimitedError)) {
                    throw error;
                }
                this.logger.warn(`Fila ${source} pausada por ${backoffMs}ms (${error.message}); job ${job.id} volta para a espera.`);
                await worker.rateLimit(backoffMs);
                throw bullmq_1.Worker.RateLimitError();
            }
        }, {
            connection: (0, br_data_queue_config_1.resolveRedisConnection)(),
            prefix: (0, br_data_queue_config_1.resolveQueuePrefix)(),
            concurrency: 1,
            limiter,
        });
        worker.on('failed', (job, error) => {
            this.logger.warn(`Job ${job?.id} (${source}) falhou: ${error.message}`);
        });
        worker.on('error', (error) => {
            this.logger.error(`Worker ${source}: ${error.message}`);
        });
        this.logger.log(`Worker ${source} ativo: ${limiter.max} jobs a cada ${limiter.duration}ms.`);
        return worker;
    }
};
exports.BrDataEnrichmentWorker = BrDataEnrichmentWorker;
exports.BrDataEnrichmentWorker = BrDataEnrichmentWorker = BrDataEnrichmentWorker_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [br_data_enrichment_processor_1.BrDataEnrichmentProcessor])
], BrDataEnrichmentWorker);
//# sourceMappingURL=br-data-enrichment.worker.js.map