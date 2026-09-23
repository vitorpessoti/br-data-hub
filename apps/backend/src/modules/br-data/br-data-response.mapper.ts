import type { BrData } from '@br-data-hub/br-data';
import type { Cep } from '@br-data-hub/cep';
import type { Cnpj } from '@br-data-hub/cnpj';
import type { BrDataJob } from './bullmq.br-data-enrichment';

// Entidades de domínio guardam os campos em `props` com getters de prototype,
// que serializam como `{}`. Toda resposta de leitura passa por estes mapeamentos
// explícitos para objetos simples.

export interface BrDataEnrichedData {
  cep: Cep | null;
  cnpj: Cnpj | null;
}

export function toBrDataView(brData: BrData, enriched?: BrDataEnrichedData) {
  return {
    id: brData.id,
    cep: brData.cep ?? null,
    cnpj: brData.cnpj ?? null,
    enrichment: {
      cep: brData.cep
        ? {
            status: brData.cepStatus,
            jobId: brData.cepJobId ?? null,
            error: brData.cepError ?? null,
            ...(enriched && {
              data: enriched.cep ? toCepView(enriched.cep) : null,
            }),
          }
        : null,
      cnpj: brData.cnpj
        ? {
            status: brData.cnpjStatus,
            jobId: brData.cnpjJobId ?? null,
            error: brData.cnpjError ?? null,
            ...(enriched && {
              data: enriched.cnpj ? toCnpjView(enriched.cnpj) : null,
            }),
          }
        : null,
    },
    createdAt: brData.createdAt,
    updatedAt: brData.updatedAt,
  };
}

export function toCepView(cep: Cep) {
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
  };
}

export function toCnpjView(cnpj: Cnpj) {
  return {
    id: cnpj.id,
    cnpj: cnpj.cnpj,
    branchTypeCode: cnpj.branchTypeCode,
    branchTypeDescription: cnpj.branchTypeDescription ?? null,
    legalName: cnpj.legalName,
    tradeName: cnpj.tradeName ?? null,
    registrationStatusCode: cnpj.registrationStatusCode,
    registrationStatusDescription: cnpj.registrationStatusDescription ?? null,
    registrationStatusDate: cnpj.registrationStatusDate ?? null,
    registrationStatusReasonCode: cnpj.registrationStatusReasonCode ?? null,
    registrationStatusReasonDescription:
      cnpj.registrationStatusReasonDescription ?? null,
    foreignCityName: cnpj.foreignCityName ?? null,
    countryCode: cnpj.countryCode ?? null,
    countryName: cnpj.countryName ?? null,
    legalNatureCode: cnpj.legalNatureCode,
    legalNatureDescription: cnpj.legalNatureDescription ?? null,
    activityStartDate: cnpj.activityStartDate ?? null,
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
    shareCapital: cnpj.shareCapital,
    companySizeCode: cnpj.companySizeCode ?? null,
    companySizeDescription: cnpj.companySizeDescription ?? null,
    simplesOption: cnpj.simplesOption ?? null,
    simplesOptionDate: cnpj.simplesOptionDate ?? null,
    simplesExclusionDate: cnpj.simplesExclusionDate ?? null,
    meiOption: cnpj.meiOption ?? null,
    meiOptionDate: cnpj.meiOptionDate ?? null,
    meiExclusionDate: cnpj.meiExclusionDate ?? null,
    specialStatus: cnpj.specialStatus ?? null,
    specialStatusDate: cnpj.specialStatusDate ?? null,
    responsibleFederativeEntity: cnpj.responsibleFederativeEntity ?? null,
    secondaryCnaes: cnpj.secondaryCnaes.map((item) => ({ ...item })),
    partners: cnpj.partners.map((item) => ({ ...item })),
    taxRegimes: cnpj.taxRegimes.map((item) => ({ ...item })),
    createdAt: cnpj.createdAt,
    updatedAt: cnpj.updatedAt,
  };
}

export function toBrDataJobView(job: BrDataJob) {
  return {
    jobId: job.jobId,
    source: job.source,
    state: job.state,
    brDataId: job.request.brDataId,
    document: job.request.document,
    attemptsMade: job.attemptsMade,
    maxAttempts: job.maxAttempts,
    rateLimited: job.rateLimited,
    result: job.result,
    failedReason: job.failedReason,
    createdAt: job.createdAt,
    processedAt: job.processedAt,
    finishedAt: job.finishedAt,
  };
}
