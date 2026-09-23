import { Injectable } from '@nestjs/common';
import { Cep, CepPageParams, CepRepository } from '@br-data-hub/cep';
import type { PageResult } from '@br-data-hub/shared';
import { PrismaService } from '../../db/prisma.service';

type CepRow = {
  id: string;
  cep: string;
  street: string | null;
  complement: string | null;
  unit: string | null;
  neighborhood: string | null;
  city: string;
  stateCode: string;
  stateName: string;
  region: string;
  ibgeCode: string;
  giaCode: string | null;
  areaCode: string;
  siafiCode: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};

@Injectable()
export class PrismaCepRepository implements CepRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Cep): Promise<Cep> {
    const created = await this.prisma.cep.create({
      data: this.toPersistence(data),
    });

    return this.toDomain(created);
  }

  async update(data: Cep): Promise<Cep> {
    const updated = await this.prisma.cep.update({
      where: { id: data.id },
      data: this.toPersistence(data),
    });

    return this.toDomain(updated);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.cep.delete({
      where: { id },
    });
  }

  async findById(id: string): Promise<Cep | null> {
    const found = await this.prisma.cep.findUnique({
      where: { id },
    });

    return found ? this.toDomain(found) : null;
  }

  async findByCep(cep: string): Promise<Cep | null> {
    const found = await this.prisma.cep.findUnique({
      where: { cep },
    });

    return found ? this.toDomain(found) : null;
  }

  async findPage(params: CepPageParams): Promise<PageResult<Cep>> {
    const page = Math.max(params.page, 1);
    const perPage = Math.max(params.perPage, 1);
    const skip = (page - 1) * perPage;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.cep.findMany({
        skip,
        take: perPage,
        orderBy: { cep: 'asc' },
      }),
      this.prisma.cep.count(),
    ]);

    return {
      items: items.map((item) => this.toDomain(item)),
      page,
      perPage,
      total,
    };
  }

  private toPersistence(cep: Cep) {
    return {
      id: cep.id,
      cep: cep.cep,
      street: cep.street ?? null,
      complement: cep.complement ?? null,
      unit: cep.unit ?? null,
      neighborhood: cep.neighborhood ?? null,
      city: cep.city,
      stateCode: cep.stateCode,
      stateName: cep.stateName,
      region: cep.region,
      ibgeCode: cep.ibgeCode,
      giaCode: cep.giaCode ?? null,
      areaCode: cep.areaCode,
      siafiCode: cep.siafiCode,
      createdAt: cep.createdAt,
      updatedAt: cep.updatedAt,
      deletedAt: cep.deletedAt ?? null,
    };
  }

  private toDomain(raw: CepRow): Cep {
    return new Cep({
      id: raw.id,
      cep: raw.cep,
      street: raw.street ?? undefined,
      complement: raw.complement ?? undefined,
      unit: raw.unit ?? undefined,
      neighborhood: raw.neighborhood ?? undefined,
      city: raw.city,
      stateCode: raw.stateCode,
      stateName: raw.stateName,
      region: raw.region,
      ibgeCode: raw.ibgeCode,
      giaCode: raw.giaCode ?? undefined,
      areaCode: raw.areaCode,
      siafiCode: raw.siafiCode,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
      deletedAt: raw.deletedAt,
    });
  }
}
