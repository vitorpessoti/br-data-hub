import { Injectable } from '@nestjs/common';
import { UpdateBrDataEnrichment } from '@br-data-hub/br-data';
import type {
  BrDataEnrichmentRequest,
  UpdateBrDataEnrichmentIn,
} from '@br-data-hub/br-data';
import { SyncCep } from '@br-data-hub/cep';
import { SyncCnpj } from '@br-data-hub/cnpj';
import { DomainError, ValidationException } from '@br-data-hub/shared';
import { UnrecoverableError } from 'bullmq';
import { PrismaCepRepository } from '../cep/cep.prisma';
import { ViaCepProvider } from '../cep/viacep.cep';
import { BrasilApiCnpjProvider } from '../cnpj/brasilapi.cnpj';
import { PrismaCnpjRepository } from '../cnpj/cnpj.prisma';
import { PrismaBrDataRepository } from './br-data.prisma';

const ERROR_MAX_LENGTH = 255;

// Recorte do Job do BullMQ usado pelo processamento.
export interface BrDataEnrichmentJob {
  data: BrDataEnrichmentRequest;
  attemptsMade: number;
  opts: { attempts?: number };
}

export interface BrDataEnrichmentResult {
  status: UpdateBrDataEnrichmentIn['status'];
  error?: string;
}

// A fonte externa respondeu 429: o worker pausa a fila e devolve o job para a
// espera, sem gastar uma tentativa.
export class BrDataRateLimitedError extends Error {}

/**
 * Processa um job de enriquecimento: consulta a fonte externa, persiste os
 * dados (upsert em ceps/cnpjs) e grava o status da fonte no pedido.
 */
@Injectable()
export class BrDataEnrichmentProcessor {
  constructor(
    private readonly cepProvider: ViaCepProvider,
    private readonly cepRepository: PrismaCepRepository,
    private readonly cnpjProvider: BrasilApiCnpjProvider,
    private readonly cnpjRepository: PrismaCnpjRepository,
    private readonly brDataRepository: PrismaBrDataRepository,
  ) {}

  async process(job: BrDataEnrichmentJob): Promise<BrDataEnrichmentResult> {
    const { brDataId, source, document } = job.data;
    const result = await this.sync(job);
    const useCase = new UpdateBrDataEnrichment(this.brDataRepository);

    await useCase.execute({ brDataId, source, document, ...result });

    // Falha definitiva já registrada no pedido: o job termina como "failed"
    // sem novas tentativas.
    if (result.status === 'failed') {
      throw new UnrecoverableError(result.error);
    }

    return result;
  }

  private async sync(
    job: BrDataEnrichmentJob,
  ): Promise<BrDataEnrichmentResult> {
    const { source, document } = job.data;

    try {
      if (source === 'cep') {
        const useCase = new SyncCep(this.cepProvider, this.cepRepository);
        await useCase.execute({ cep: document });
      } else {
        const useCase = new SyncCnpj(this.cnpjProvider, this.cnpjRepository);
        await useCase.execute({ cnpj: document });
      }

      return { status: 'completed' };
    } catch (error) {
      return this.handleSyncError(job, error);
    }
  }

  private handleSyncError(
    job: BrDataEnrichmentJob,
    error: unknown,
  ): BrDataEnrichmentResult {
    if (error instanceof DomainError && error.statusCode === 429) {
      throw new BrDataRateLimitedError(error.message);
    }

    if (
      error instanceof DomainError &&
      error.message === `${job.data.source}.not.found`
    ) {
      return { status: 'not_found', error: error.message };
    }

    // Rede, timeout ou 5xx da fonte são transitórios: a fila tenta de novo com
    // backoff. Erros 4xx/validação não mudam numa nova tentativa.
    const isTransient =
      !(error instanceof DomainError) || error.statusCode >= 500;
    const isLastAttempt = job.attemptsMade + 1 >= (job.opts.attempts ?? 1);

    if (isTransient && !isLastAttempt) {
      throw error;
    }

    return { status: 'failed', error: this.describe(error) };
  }

  private describe(error: unknown): string {
    let message = 'br-data.enrichment.failed';

    if (error instanceof ValidationException) {
      message = error.errors.map((item) => item.message).join(',');
    } else if (error instanceof DomainError) {
      message = error.message;
    }

    return message.slice(0, ERROR_MAX_LENGTH);
  }
}
