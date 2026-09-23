-- CreateTable
CREATE TABLE "br_data" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "cep" TEXT,
    "cepStatus" TEXT,
    "cepJobId" TEXT,
    "cepError" TEXT,
    "cnpj" TEXT,
    "cnpjStatus" TEXT,
    "cnpjJobId" TEXT,
    "cnpjError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "br_data_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "br_data_userId_createdAt_idx" ON "br_data"("userId", "createdAt");
