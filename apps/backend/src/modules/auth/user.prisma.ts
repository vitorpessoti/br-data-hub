import { Injectable } from '@nestjs/common';
import { User, UserPageParams, UserRepository } from '@br-data-hub/auth';
import type { PageResult } from '@br-data-hub/shared';
import { PrismaService } from '../../db/prisma.service';

type UserRow = {
  id: string;
  name: string;
  email: string;
  password: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};

@Injectable()
export class PrismaUserRepository implements UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: User): Promise<User> {
    const created = await this.prisma.user.create({
      data: this.toPersistence(data),
    });

    return this.toDomain(created);
  }

  async update(data: User): Promise<User> {
    const updated = await this.prisma.user.update({
      where: { id: data.id },
      data: this.toPersistence(data),
    });

    return this.toDomain(updated);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.user.delete({
      where: { id },
    });
  }

  async findById(id: string): Promise<User | null> {
    const found = await this.prisma.user.findUnique({
      where: { id },
    });

    return found ? this.toDomain(found) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const found = await this.prisma.user.findUnique({
      where: { email },
    });

    return found ? this.toDomain(found) : null;
  }

  async findPage(params: UserPageParams): Promise<PageResult<User>> {
    const page = Math.max(params.page, 1);
    const perPage = Math.max(params.perPage, 1);
    const skip = (page - 1) * perPage;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        skip,
        take: perPage,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count(),
    ]);

    return {
      items: items.map((item) => this.toDomain(item)),
      page,
      perPage,
      total,
    };
  }

  private toPersistence(user: User) {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      password: user.password,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      deletedAt: user.deletedAt ?? null,
    };
  }

  private toDomain(raw: UserRow): User {
    return new User({
      id: raw.id,
      name: raw.name,
      email: raw.email,
      password: raw.password,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
      deletedAt: raw.deletedAt,
    });
  }
}
