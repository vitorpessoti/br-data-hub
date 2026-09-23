import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { BR_DATA_SOURCES } from '@br-data-hub/br-data';
import type {
  BrDataEnrichmentProvider,
  BrDataEnrichmentRequest,
  BrDataSource,
} from '@br-data-hub/br-data';
import { Queue, QueueEvents } from 'bullmq';
import { randomUUID } from 'node:crypto';
import type { BrDataEnrichmentResult } from './br-data-enrichment.processor';
import {
  BR_DATA_JOB_OPTIONS,
  BR_DATA_QUEUE_NAMES,
  resolveQueuePrefix,
  resolveRateLimit,
  resolveRedisConnection,
} from './br-data-queue.config';

export interface BrDataPendingJob {
  source: BrDataSource;
  jobId: string;
}

export interface BrDataJob {
  jobId: string;
  source: BrDataSource;
  state: string;
  request: BrDataEnrichmentRequest;
  attemptsMade: number;
  maxAttempts: number;
  rateLimited: boolean;
  result: BrDataEnrichmentResult | null;
  failedReason: string | null;
  createdAt: Date;
  processedAt: Date | null;
  finishedAt: Date | null;
}

type BrDataQueue = Queue<BrDataEnrichmentRequest, BrDataEnrichmentResult>;

/**
 * Agenda o enriquecimento em uma fila BullMQ por fonte externa (ViaCEP e
 * BrasilAPI), cada uma com o próprio rate-limit aplicado pelo worker.
 *
 * O jobId leva a fonte como prefixo (`cep-<uuid>`, `cnpj-<uuid>`) para que a
 * consulta por jobId encontre a fila certa.
 */
@Injectable()
export class BullMqBrDataEnrichmentProvider
  implements BrDataEnrichmentProvider, OnModuleDestroy
{
  private readonly connection = resolveRedisConnection();
  private readonly prefix = resolveQueuePrefix();
  private readonly queues = this.bySource<BrDataQueue>(
    (source) =>
      new Queue(BR_DATA_QUEUE_NAMES[source], {
        connection: this.connection,
        prefix: this.prefix,
        defaultJobOptions: BR_DATA_JOB_OPTIONS,
      }),
  );
  private readonly queueEvents = this.bySource(
    (source) =>
      new QueueEvents(BR_DATA_QUEUE_NAMES[source], {
        connection: this.connection,
        prefix: this.prefix,
      }),
  );

  async enqueue(request: BrDataEnrichmentRequest): Promise<string> {
    const jobId = `${request.source}-${randomUUID()}`;

    await this.queues[request.source].add(request.source, request, { jobId });

    return jobId;
  }

  // TTL > 0 só quando a janela do limiter esgotou (ou a fila foi pausada por um 429).
  async isRateLimited(source: BrDataSource): Promise<boolean> {
    const ttl = await this.queues[source].getRateLimitTtl(
      resolveRateLimit(source).max,
    );

    return ttl > 0;
  }

  // Espera os jobs em paralelo, até `timeoutMs`. Job ainda na espera com a fila
  // travada pelo rate-limit não é esperado: o cliente consulta o jobId depois.
  async waitForJobs(
    jobs: BrDataPendingJob[],
    timeoutMs: number,
  ): Promise<void> {
    await Promise.all(
      jobs.map(async ({ source, jobId }) => {
        const job = await this.queues[source].getJob(jobId);

        if (!job || timeoutMs <= 0) {
          return;
        }

        if (await this.isRateLimitedWhileQueued(source, job)) {
          return;
        }

        // Falha ou tempo esgotado não interrompem a resposta: o status real
        // é lido do pedido gravado no banco.
        await job
          .waitUntilFinished(this.queueEvents[source], timeoutMs)
          .catch(() => undefined);
      }),
    );
  }

  async findJob(jobId: string): Promise<BrDataJob | null> {
    const source = this.sourceOf(jobId);

    if (!source) {
      return null;
    }

    const job = await this.queues[source].getJob(jobId);

    if (!job) {
      return null;
    }

    // Mesma ordem do waitForJobs: TTL antes do estado.
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

  async onModuleDestroy(): Promise<void> {
    await Promise.all([
      ...Object.values(this.queueEvents).map((events) => events.close()),
      ...Object.values(this.queues).map((queue) => queue.close()),
    ]);
  }

  // A ordem das leituras importa: TTL primeiro, estado depois. Lendo o estado
  // antes, o worker pode pegar este mesmo job entre as duas chamadas; ele ocupa
  // a última vaga (TTL > 0) e o job ativo pareceria limitado. Com o TTL já > 0,
  // um job ainda na espera ficou de fora da janela; se o worker o pegou no
  // meio, o estado já vem "active".
  private async isRateLimitedWhileQueued(
    source: BrDataSource,
    job: { getState(): Promise<string> },
  ): Promise<boolean> {
    if (!(await this.isRateLimited(source))) {
      return false;
    }

    return this.isQueued(await job.getState());
  }

  private isQueued(state: string): boolean {
    return ['waiting', 'delayed', 'prioritized'].includes(state);
  }

  private sourceOf(jobId: string): BrDataSource | null {
    const prefix = jobId.split('-', 1)[0];

    return BR_DATA_SOURCES.find((source) => source === prefix) ?? null;
  }

  private bySource<T>(
    factory: (source: BrDataSource) => T,
  ): Record<BrDataSource, T> {
    return { cep: factory('cep'), cnpj: factory('cnpj') };
  }
}
