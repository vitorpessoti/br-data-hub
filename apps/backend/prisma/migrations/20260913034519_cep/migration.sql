-- CreateTable
CREATE TABLE "ceps" (
    "id" TEXT NOT NULL,
    "cep" TEXT NOT NULL,
    "street" TEXT,
    "complement" TEXT,
    "unit" TEXT,
    "neighborhood" TEXT,
    "city" TEXT NOT NULL,
    "stateCode" TEXT NOT NULL,
    "stateName" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "ibgeCode" TEXT NOT NULL,
    "giaCode" TEXT,
    "areaCode" TEXT NOT NULL,
    "siafiCode" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ceps_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ceps_cep_key" ON "ceps"("cep");
