import { Cep, CepPageParams, CepRepository } from '@br-data-hub/cep';
import type { PageResult } from '@br-data-hub/shared';
import { PrismaService } from '../../db/prisma.service';
export declare class PrismaCepRepository implements CepRepository {
    private readonly prisma;
    constructor(prisma: PrismaService);
    create(data: Cep): Promise<Cep>;
    update(data: Cep): Promise<Cep>;
    delete(id: string): Promise<void>;
    findById(id: string): Promise<Cep | null>;
    findByCep(cep: string): Promise<Cep | null>;
    findPage(params: CepPageParams): Promise<PageResult<Cep>>;
    private toPersistence;
    private toDomain;
}
