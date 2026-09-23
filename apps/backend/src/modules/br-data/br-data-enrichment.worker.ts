import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { BR_DATA_SOURCES } from '@br-data-hub/br-data';
import type {
  BrDataEnrichmentRequest,
  BrDataSource,
} from '@br-data-hub/br-data';
import { Worker } from 'bullmq';
import {
  BrDataEnrichmentProcessor,
  BrDataEnrichmentResult,
  BrDataRateLimitedError,
} from './br-data-enrichment.processor';
import {
  BR_DATA_QUEUE_NAMES,
  resolveQueuePrefix,
  resolveRateLimit,
  resolveRateLimitBackoffMs,
  resolveRedisConnection,
} from './br-data-queue.config';

/**
 * Um worker BullMQ por fonte externa, com concorrência 1 e o `limiter` da
 * fonte: o BullMQ garante no máximo `max` jobs por `duration` na fila inteira,
 * mesmo com mais de uma instância do backend.
 *
 * Os workers são criados no `onModuleInit` (e não por decorator) para ler o
 * rate-limit do .env já carregado pelo ConfigModule.
 */
@Injectable()
export class BrDataEnrichmentWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BrDataEnrichmentWorker.name);
  private readonly workers: Worker[] = [];

  constructor(private readonly processor: BrDataEnrichmentProcessor) {}

  onModuleInit(): void {
    for (const source of BR_DATA_SOURCES) {
      this.workers.push(this.createWorker(source));
    }
  }

  async onModuleDestroy(): Promise<void> {
    await Promise.all(this.workers.map((worker) => worker.close()));
  }

  private createWorker(source: BrDataSource): Worker {
    const limiter = resolveRateLimit(source);
    const backoffMs = resolveRateLimitBackoffMs();

    const worker = new Worker<BrDataEnrichmentRequest, BrDataEnrichmentResult>(
      BR_DATA_QUEUE_NAMES[source],
      async (job) => {
        try {
          return await this.processor.process(job);
        } catch (error) {
          if (!(error instanceof BrDataRateLimitedError)) {
            throw error;
          }

          // 429 da fonte: pausa a fila inteira e devolve o job para a espera.
          this.logger.warn(
            `Fila ${source} pausada por ${backoffMs}ms (${error.message}); job ${job.id} volta para a espera.`,
          );
          await worker.rateLimit(backoffMs);
          throw Worker.RateLimitError();
        }
      },
      {
        connection: resolveRedisConnection(),
        prefix: resolveQueuePrefix(),
        concurrency: 1,
        limiter,
      },
    );

    worker.on('failed', (job, error) => {
      this.logger.warn(`Job ${job?.id} (${source}) falhou: ${error.message}`);
    });
    worker.on('error', (error) => {
      this.logger.error(`Worker ${source}: ${error.message}`);
    });

    this.logger.log(
      `Worker ${source} ativo: ${limiter.max} jobs a cada ${limiter.duration}ms.`,
    );

    return worker;
  }
}
