import { BrData, BrDataEnrichmentPatch, BrDataPageParams, BrDataRepository, BrDataSource } from '@br-data-hub/br-data';
import type { PageResult } from '@br-data-hub/shared';
import { PrismaService } from '../../db/prisma.service';
export declare class PrismaBrDataRepository implements BrDataRepository {
    private readonly prisma;
    constructor(prisma: PrismaService);
    create(data: BrData): Promise<BrData>;
    update(data: BrData): Promise<BrData>;
    updateEnrichment(id: string, source: BrDataSource, patch: BrDataEnrichmentPatch): Promise<void>;
    delete(id: string): Promise<void>;
    findById(id: string): Promise<BrData | null>;
    findPage(params: BrDataPageParams): Promise<PageResult<BrData>>;
    private toPersistence;
    private toDomain;
}
