import { Injectable } from '@nestjs/common';
import {
  BrData,
  BrDataEnrichmentPatch,
  BrDataEnrichmentStatus,
  BrDataPageParams,
  BrDataRepository,
  BrDataSource,
} from '@br-data-hub/br-data';
import type { PageResult } from '@br-data-hub/shared';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../db/prisma.service';

type BrDataRow = {
  id: string;
  userId: string;
  cep: string | null;
  cepStatus: string | null;
  cepJobId: string | null;
  cepError: string | null;
  cnpj: string | null;
  cnpjStatus: string | null;
  cnpjJobId: string | null;
  cnpjError: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};

const ENRICHMENT_COLUMNS = {
  cep: { status: 'cepStatus', jobId: 'cepJobId', error: 'cepError' },
  cnpj: { status: 'cnpjStatus', jobId: 'cnpjJobId', error: 'cnpjError' },
} as const;

@Injectable()
export class PrismaBrDataRepository implements BrDataRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: BrData): Promise<BrData> {
    const created = await this.prisma.brData.create({
      data: this.toPersistence(data),
    });

    return this.toDomain(created);
  }

  async update(data: BrData): Promise<BrData> {
    const updated = await this.prisma.brData.update({
      where: { id: data.id },
      data: this.toPersistence(data),
    });

    return this.toDomain(updated);
  }

  // Update parcial: só as colunas da fonte, para o job de CEP e o de CNPJ não
  // sobrescreverem um ao outro.
  async updateEnrichment(
    id: string,
    source: BrDataSource,
    patch: BrDataEnrichmentPatch,
  ): Promise<void> {
    const columns = ENRICHMENT_COLUMNS[source];
    const data: Record<string, unknown> = { updatedAt: new Date() };

    if (patch.status !== undefined) data[columns.status] = patch.status;
    if (patch.jobId !== undefined) data[columns.jobId] = patch.jobId;
    if (patch.error !== undefined) data[columns.error] = patch.error;

    await this.prisma.brData.update({
      where: { id },
      data: data as Prisma.BrDataUpdateInput,
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.brData.delete({
      where: { id },
    });
  }

  async findById(id: string): Promise<BrData | null> {
    const found = await this.prisma.brData.findUnique({
      where: { id },
    });

    return found ? this.toDomain(found) : null;
  }

  async findPage(params: BrDataPageParams): Promise<PageResult<BrData>> {
    const page = Math.max(params.page, 1);
    const perPage = Math.max(params.perPage, 1);
    const skip = (page - 1) * perPage;
    const where = { userId: params.userId };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.brData.findMany({
        where,
        skip,
        take: perPage,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.brData.count({ where }),
    ]);

    return {
      items: items.map((item) => this.toDomain(item)),
      page,
      perPage,
      total,
    };
  }

  private toPersistence(brData: BrData) {
    return {
      id: brData.id,
      userId: brData.userId,
      cep: brData.cep ?? null,
      cepStatus: brData.cepStatus ?? null,
      cepJobId: brData.cepJobId ?? null,
      cepError: brData.cepError ?? null,
      cnpj: brData.cnpj ?? null,
      cnpjStatus: brData.cnpjStatus ?? null,
      cnpjJobId: brData.cnpjJobId ?? null,
      cnpjError: brData.cnpjError ?? null,
      createdAt: brData.createdAt,
      updatedAt: brData.updatedAt,
      deletedAt: brData.deletedAt ?? null,
    };
  }

  private toDomain(raw: BrDataRow): BrData {
    return new BrData({
      id: raw.id,
      userId: raw.userId,
      cep: raw.cep ?? undefined,
      cepStatus: (raw.cepStatus as BrDataEnrichmentStatus | null) ?? undefined,
      cepJobId: raw.cepJobId ?? undefined,
      cepError: raw.cepError ?? undefined,
      cnpj: raw.cnpj ?? undefined,
      cnpjStatus:
        (raw.cnpjStatus as BrDataEnrichmentStatus | null) ?? undefined,
      cnpjJobId: raw.cnpjJobId ?? undefined,
      cnpjError: raw.cnpjError ?? undefined,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
      deletedAt: raw.deletedAt,
    });
  }
}
