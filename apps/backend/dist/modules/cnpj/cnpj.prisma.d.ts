import { Cnpj, CnpjPageParams, CnpjRepository } from '@br-data-hub/cnpj';
import type { PageResult } from '@br-data-hub/shared';
import { PrismaService } from '../../db/prisma.service';
export declare class PrismaCnpjRepository implements CnpjRepository {
    private readonly prisma;
    constructor(prisma: PrismaService);
    create(data: Cnpj): Promise<Cnpj>;
    update(data: Cnpj): Promise<Cnpj>;
    delete(id: string): Promise<void>;
    findById(id: string): Promise<Cnpj | null>;
    findByCnpj(cnpj: string): Promise<Cnpj | null>;
    findPage(params: CnpjPageParams): Promise<PageResult<Cnpj>>;
    private toPersistence;
    private toDomain;
    private toDate;
    private fromDate;
    private toJson;
}
