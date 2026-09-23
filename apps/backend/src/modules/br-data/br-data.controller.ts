import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Param,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { SaveBrData } from '@br-data-hub/br-data';
import type { BrData, SaveBrDataIn } from '@br-data-hub/br-data';
import { DomainError } from '@br-data-hub/shared';
import type { Response } from 'express';
import { randomUUID } from 'node:crypto';
import { JwtAuthGuard } from '../../shared/auth/jwt-auth.guard';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { PrismaCepRepository } from '../cep/cep.prisma';
import { PrismaCnpjRepository } from '../cnpj/cnpj.prisma';
import { resolveSyncWaitMs } from './br-data-queue.config';
import { toBrDataJobView, toBrDataView } from './br-data-response.mapper';
import { PrismaBrDataRepository } from './br-data.prisma';
import {
  BrDataPendingJob,
  BullMqBrDataEnrichmentProvider,
} from './bullmq.br-data-enrichment';

type BrDataBody = Pick<SaveBrDataIn, 'cep' | 'cnpj'>;

const DEFAULT_PER_PAGE = 20;
const MAX_PER_PAGE = 100;

@Controller('br-data')
@UseGuards(JwtAuthGuard)
export class BrDataController {
  constructor(
    private readonly brDataRepository: PrismaBrDataRepository,
    private readonly enrichmentProvider: BullMqBrDataEnrichmentProvider,
    private readonly cepRepository: PrismaCepRepository,
    private readonly cnpjRepository: PrismaCnpjRepository,
  ) {}

  // Recebe CEP e/ou CNPJ, grava o pedido e enfileira as consultas. Espera os
  // jobs por até BR_DATA_SYNC_WAIT_MS: concluídos -> 201 com os dados; algum
  // ainda na fila (rate-limit ou tempo esgotado) -> 202 com os jobIds.
  @Post()
  async saveBrData(
    @CurrentUser('id') userId: string,
    @Body() body: BrDataBody | undefined,
    @Res({ passthrough: true }) response: Response,
  ) {
    const id = randomUUID();
    const useCase = new SaveBrData(
      this.brDataRepository,
      this.enrichmentProvider,
    );

    await useCase.execute({ id, userId, cep: body?.cep, cnpj: body?.cnpj });

    const saved = await this.findOwnedBrData(id, userId);

    await this.enrichmentProvider.waitForJobs(
      this.pendingJobs(saved),
      resolveSyncWaitMs(),
    );

    const current = await this.findOwnedBrData(id, userId);
    const view = await this.toDetailView(current);
    const pendingJobs = this.pendingJobs(current);

    if (pendingJobs.length > 0) {
      response.status(HttpStatus.ACCEPTED);

      return { ...view, pendingJobs };
    }

    return view;
  }

  @Get()
  async findBrDataPage(
    @CurrentUser('id') userId: string,
    @Query('page') page?: string,
    @Query('perPage') perPage?: string,
  ) {
    const result = await this.brDataRepository.findPage({
      userId,
      page: this.toPositiveInteger(page, 1),
      perPage: Math.min(
        this.toPositiveInteger(perPage, DEFAULT_PER_PAGE),
        MAX_PER_PAGE,
      ),
    });

    return {
      items: result.items.map((item) => toBrDataView(item)),
      page: result.page,
      perPage: result.perPage,
      total: result.total,
    };
  }

  @Get('jobs/:jobId')
  async findJob(
    @CurrentUser('id') userId: string,
    @Param('jobId') jobId: string,
  ) {
    const job = await this.enrichmentProvider.findJob(jobId);

    // Job de outro usuário responde 404, para não revelar que ele existe.
    if (!job || job.request.userId !== userId) {
      throw new DomainError('br-data.job.not.found', 404);
    }

    return toBrDataJobView(job);
  }

  @Get(':id')
  async findBrDataById(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    const brData = await this.findOwnedBrData(id, userId);

    return this.toDetailView(brData);
  }

  // Pedido de outro usuário responde 404, para não revelar que ele existe.
  private async findOwnedBrData(id: string, userId: string): Promise<BrData> {
    const brData = await this.brDataRepository.findById(id);

    if (!brData || brData.userId !== userId) {
      throw new DomainError('br-data.not.found', 404);
    }

    return brData;
  }

  // Os dados enriquecidos vêm das tabelas ceps/cnpjs; ficam null enquanto a
  // consulta não gravou nada.
  private async toDetailView(brData: BrData) {
    const [cep, cnpj] = await Promise.all([
      brData.cep ? this.cepRepository.findByCep(brData.cep) : null,
      brData.cnpj ? this.cnpjRepository.findByCnpj(brData.cnpj) : null,
    ]);

    return toBrDataView(brData, { cep, cnpj });
  }

  private pendingJobs(brData: BrData): BrDataPendingJob[] {
    const jobs: BrDataPendingJob[] = [];

    if (brData.cepStatus === 'pending' && brData.cepJobId) {
      jobs.push({ source: 'cep', jobId: brData.cepJobId });
    }

    if (brData.cnpjStatus === 'pending' && brData.cnpjJobId) {
      jobs.push({ source: 'cnpj', jobId: brData.cnpjJobId });
    }

    return jobs;
  }

  private toPositiveInteger(
    value: string | undefined,
    fallback: number,
  ): number {
    const parsed = Number(value);

    return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
  }
}
