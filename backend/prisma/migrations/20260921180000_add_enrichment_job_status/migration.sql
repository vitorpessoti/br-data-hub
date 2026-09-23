-- CreateEnum
CREATE TYPE "enrichment_status" AS ENUM ('pending', 'processing', 'completed', 'failed');

-- AlterTable
ALTER TABLE "cep" ADD COLUMN     "jobId" TEXT,
ADD COLUMN     "status" "enrichment_status" NOT NULL DEFAULT 'completed',
ALTER COLUMN "city" DROP NOT NULL,
ALTER COLUMN "uf" DROP NOT NULL;

-- AlterTable
ALTER TABLE "cnpj" ADD COLUMN     "jobId" TEXT,
ADD COLUMN     "status" "enrichment_status" NOT NULL DEFAULT 'completed',
ALTER COLUMN "corporateName" DROP NOT NULL,
ALTER COLUMN "secondaryCnaes" SET DEFAULT '[]',
ALTER COLUMN "taxRegimes" SET DEFAULT '[]',
ALTER COLUMN "qsa" SET DEFAULT '[]';

-- CreateIndex
CREATE UNIQUE INDEX "cep_jobId_key" ON "cep"("jobId");

-- CreateIndex
CREATE UNIQUE INDEX "cnpj_jobId_key" ON "cnpj"("jobId");

