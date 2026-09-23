import { Injectable } from '@nestjs/common';
import {
  Cnpj,
  CnpjPageParams,
  CnpjPartner,
  CnpjRepository,
  CnpjSecondaryCnae,
  CnpjTaxRegime,
} from '@br-data-hub/cnpj';
import type { PageResult } from '@br-data-hub/shared';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../db/prisma.service';

type CnpjRow = {
  id: string;
  cnpj: string;
  branchTypeCode: number;
  branchTypeDescription: string | null;
  legalName: string;
  tradeName: string | null;
  registrationStatusCode: number;
  registrationStatusDescription: string | null;
  registrationStatusDate: Date | null;
  registrationStatusReasonCode: number | null;
  registrationStatusReasonDescription: string | null;
  foreignCityName: string | null;
  countryCode: number | null;
  countryName: string | null;
  legalNatureCode: number;
  legalNatureDescription: string | null;
  activityStartDate: Date | null;
  mainCnaeCode: string;
  mainCnaeDescription: string | null;
  streetType: string | null;
  street: string | null;
  addressNumber: string | null;
  complement: string | null;
  neighborhood: string | null;
  zipCode: string | null;
  stateCode: string;
  city: string;
  siafiCode: string | null;
  ibgeCode: string | null;
  primaryPhone: string | null;
  secondaryPhone: string | null;
  fax: string | null;
  email: string | null;
  responsibleQualificationCode: number | null;
  shareCapital: Prisma.Decimal;
  companySizeCode: number | null;
  companySizeDescription: string | null;
  simplesOption: boolean | null;
  simplesOptionDate: Date | null;
  simplesExclusionDate: Date | null;
  meiOption: boolean | null;
  meiOptionDate: Date | null;
  meiExclusionDate: Date | null;
  specialStatus: string | null;
  specialStatusDate: Date | null;
  responsibleFederativeEntity: string | null;
  secondaryCnaes: Prisma.JsonValue;
  partners: Prisma.JsonValue;
  taxRegimes: Prisma.JsonValue;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};

@Injectable()
export class PrismaCnpjRepository implements CnpjRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Cnpj): Promise<Cnpj> {
    const created = await this.prisma.cnpj.create({
      data: this.toPersistence(data),
    });

    return this.toDomain(created);
  }

  async update(data: Cnpj): Promise<Cnpj> {
    const updated = await this.prisma.cnpj.update({
      where: { id: data.id },
      data: this.toPersistence(data),
    });

    return this.toDomain(updated);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.cnpj.delete({
      where: { id },
    });
  }

  async findById(id: string): Promise<Cnpj | null> {
    const found = await this.prisma.cnpj.findUnique({
      where: { id },
    });

    return found ? this.toDomain(found) : null;
  }

  async findByCnpj(cnpj: string): Promise<Cnpj | null> {
    const found = await this.prisma.cnpj.findUnique({
      where: { cnpj },
    });

    return found ? this.toDomain(found) : null;
  }

  async findPage(params: CnpjPageParams): Promise<PageResult<Cnpj>> {
    const page = Math.max(params.page, 1);
    const perPage = Math.max(params.perPage, 1);
    const skip = (page - 1) * perPage;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.cnpj.findMany({
        skip,
        take: perPage,
        orderBy: { cnpj: 'asc' },
      }),
      this.prisma.cnpj.count(),
    ]);

    return {
      items: items.map((item) => this.toDomain(item)),
      page,
      perPage,
      total,
    };
  }

  private toPersistence(cnpj: Cnpj) {
    return {
      id: cnpj.id,
      cnpj: cnpj.cnpj,
      branchTypeCode: cnpj.branchTypeCode,
      branchTypeDescription: cnpj.branchTypeDescription ?? null,
      legalName: cnpj.legalName,
      tradeName: cnpj.tradeName ?? null,
      registrationStatusCode: cnpj.registrationStatusCode,
      registrationStatusDescription: cnpj.registrationStatusDescription ?? null,
      registrationStatusDate: this.toDate(cnpj.registrationStatusDate),
      registrationStatusReasonCode: cnpj.registrationStatusReasonCode ?? null,
      registrationStatusReasonDescription:
        cnpj.registrationStatusReasonDescription ?? null,
      foreignCityName: cnpj.foreignCityName ?? null,
      countryCode: cnpj.countryCode ?? null,
      countryName: cnpj.countryName ?? null,
      legalNatureCode: cnpj.legalNatureCode,
      legalNatureDescription: cnpj.legalNatureDescription ?? null,
      activityStartDate: this.toDate(cnpj.activityStartDate),
      mainCnaeCode: cnpj.mainCnaeCode,
      mainCnaeDescription: cnpj.mainCnaeDescription ?? null,
      streetType: cnpj.streetType ?? null,
      street: cnpj.street ?? null,
      addressNumber: cnpj.addressNumber ?? null,
      complement: cnpj.complement ?? null,
      neighborhood: cnpj.neighborhood ?? null,
      zipCode: cnpj.zipCode ?? null,
      stateCode: cnpj.stateCode,
      city: cnpj.city,
      siafiCode: cnpj.siafiCode ?? null,
      ibgeCode: cnpj.ibgeCode ?? null,
      primaryPhone: cnpj.primaryPhone ?? null,
      secondaryPhone: cnpj.secondaryPhone ?? null,
      fax: cnpj.fax ?? null,
      email: cnpj.email ?? null,
      responsibleQualificationCode: cnpj.responsibleQualificationCode ?? null,
      shareCapital: new Prisma.Decimal(cnpj.shareCapital),
      companySizeCode: cnpj.companySizeCode ?? null,
      companySizeDescription: cnpj.companySizeDescription ?? null,
      simplesOption: cnpj.simplesOption ?? null,
      simplesOptionDate: this.toDate(cnpj.simplesOptionDate),
      simplesExclusionDate: this.toDate(cnpj.simplesExclusionDate),
      meiOption: cnpj.meiOption ?? null,
      meiOptionDate: this.toDate(cnpj.meiOptionDate),
      meiExclusionDate: this.toDate(cnpj.meiExclusionDate),
      specialStatus: cnpj.specialStatus ?? null,
      specialStatusDate: this.toDate(cnpj.specialStatusDate),
      responsibleFederativeEntity: cnpj.responsibleFederativeEntity ?? null,
      secondaryCnaes: this.toJson(cnpj.secondaryCnaes),
      partners: this.toJson(cnpj.partners),
      taxRegimes: this.toJson(cnpj.taxRegimes),
      createdAt: cnpj.createdAt,
      updatedAt: cnpj.updatedAt,
      deletedAt: cnpj.deletedAt ?? null,
    };
  }

  private toDomain(raw: CnpjRow): Cnpj {
    return new Cnpj({
      id: raw.id,
      cnpj: raw.cnpj,
      branchTypeCode: raw.branchTypeCode,
      branchTypeDescription: raw.branchTypeDescription ?? undefined,
      legalName: raw.legalName,
      tradeName: raw.tradeName ?? undefined,
      registrationStatusCode: raw.registrationStatusCode,
      registrationStatusDescription:
        raw.registrationStatusDescription ?? undefined,
      registrationStatusDate: this.fromDate(raw.registrationStatusDate),
      registrationStatusReasonCode:
        raw.registrationStatusReasonCode ?? undefined,
      registrationStatusReasonDescription:
        raw.registrationStatusReasonDescription ?? undefined,
      foreignCityName: raw.foreignCityName ?? undefined,
      countryCode: raw.countryCode ?? undefined,
      countryName: raw.countryName ?? undefined,
      legalNatureCode: raw.legalNatureCode,
      legalNatureDescription: raw.legalNatureDescription ?? undefined,
      activityStartDate: this.fromDate(raw.activityStartDate),
      mainCnaeCode: raw.mainCnaeCode,
      mainCnaeDescription: raw.mainCnaeDescription ?? undefined,
      streetType: raw.streetType ?? undefined,
      street: raw.street ?? undefined,
      addressNumber: raw.addressNumber ?? undefined,
      complement: raw.complement ?? undefined,
      neighborhood: raw.neighborhood ?? undefined,
      zipCode: raw.zipCode ?? undefined,
      stateCode: raw.stateCode,
      city: raw.city,
      siafiCode: raw.siafiCode ?? undefined,
      ibgeCode: raw.ibgeCode ?? undefined,
      primaryPhone: raw.primaryPhone ?? undefined,
      secondaryPhone: raw.secondaryPhone ?? undefined,
      fax: raw.fax ?? undefined,
      email: raw.email ?? undefined,
      responsibleQualificationCode:
        raw.responsibleQualificationCode ?? undefined,
      shareCapital: raw.shareCapital.toNumber(),
      companySizeCode: raw.companySizeCode ?? undefined,
      companySizeDescription: raw.companySizeDescription ?? undefined,
      simplesOption: raw.simplesOption ?? undefined,
      simplesOptionDate: this.fromDate(raw.simplesOptionDate),
      simplesExclusionDate: this.fromDate(raw.simplesExclusionDate),
      meiOption: raw.meiOption ?? undefined,
      meiOptionDate: this.fromDate(raw.meiOptionDate),
      meiExclusionDate: this.fromDate(raw.meiExclusionDate),
      specialStatus: raw.specialStatus ?? undefined,
      specialStatusDate: this.fromDate(raw.specialStatusDate),
      responsibleFederativeEntity: raw.responsibleFederativeEntity ?? undefined,
      secondaryCnaes: raw.secondaryCnaes as unknown as CnpjSecondaryCnae[],
      partners: raw.partners as unknown as CnpjPartner[],
      taxRegimes: raw.taxRegimes as unknown as CnpjTaxRegime[],
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
      deletedAt: raw.deletedAt,
    });
  }

  // Datas do domínio são "YYYY-MM-DD"; no banco ficam como DATE (meia-noite UTC).
  private toDate(value: string | undefined): Date | null {
    return value ? new Date(value) : null;
  }

  private fromDate(value: Date | null): string | undefined {
    return value ? value.toISOString().slice(0, 10) : undefined;
  }

  // Remove chaves undefined dos itens antes de gravar a coluna Json.
  private toJson(value: unknown): Prisma.InputJsonValue {
    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
  }
}
