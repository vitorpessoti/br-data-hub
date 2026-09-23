import { PrismaClient } from '@prisma/client';

// Instância única do PrismaClient compartilhada pelos repositories.
const prisma = new PrismaClient();

export default prisma;
