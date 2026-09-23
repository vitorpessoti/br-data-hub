import type { BrDataEnrichmentRequest, UpdateBrDataEnrichmentIn } from '@br-data-hub/br-data';
import { PrismaCepRepository } from '../cep/cep.prisma';
import { ViaCepProvider } from '../cep/viacep.cep';
import { BrasilApiCnpjProvider } from '../cnpj/brasilapi.cnpj';
import { PrismaCnpjRepository } from '../cnpj/cnpj.prisma';
import { PrismaBrDataRepository } from './br-data.prisma';
export interface BrDataEnrichmentJob {
    data: BrDataEnrichmentRequest;
    attemptsMade: number;
    opts: {
        attempts?: number;
    };
}
export interface BrDataEnrichmentResult {
    status: UpdateBrDataEnrichmentIn['status'];
    error?: string;
}
export declare class BrDataRateLimitedError extends Error {
}
export declare class BrDataEnrichmentProcessor {
    private readonly cepProvider;
    private readonly cepRepository;
    private readonly cnpjProvider;
    private readonly cnpjRepository;
    private readonly brDataRepository;
    constructor(cepProvider: ViaCepProvider, cepRepository: PrismaCepRepository, cnpjProvider: BrasilApiCnpjProvider, cnpjRepository: PrismaCnpjRepository, brDataRepository: PrismaBrDataRepository);
    process(job: BrDataEnrichmentJob): Promise<BrDataEnrichmentResult>;
    private sync;
    private handleSyncError;
    private describe;
}
