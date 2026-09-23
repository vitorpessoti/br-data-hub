import { User, UserPageParams, UserRepository } from '@br-data-hub/auth';
import type { PageResult } from '@br-data-hub/shared';
import { PrismaService } from '../../db/prisma.service';
export declare class PrismaUserRepository implements UserRepository {
    private readonly prisma;
    constructor(prisma: PrismaService);
    create(data: User): Promise<User>;
    update(data: User): Promise<User>;
    delete(id: string): Promise<void>;
    findById(id: string): Promise<User | null>;
    findByEmail(email: string): Promise<User | null>;
    findPage(params: UserPageParams): Promise<PageResult<User>>;
    private toPersistence;
    private toDomain;
}
