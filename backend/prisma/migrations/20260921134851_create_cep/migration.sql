-- CreateTable
CREATE TABLE "cep" (
    "id" UUID NOT NULL,
    "cep" VARCHAR(8) NOT NULL,
    "street" TEXT,
    "complement" TEXT,
    "unit" TEXT,
    "neighborhood" TEXT,
    "city" TEXT NOT NULL,
    "uf" VARCHAR(2) NOT NULL,
    "state" TEXT,
    "region" TEXT,
    "ibge_code" VARCHAR(7),
    "gia_code" TEXT,
    "ddd" VARCHAR(2),
    "siafi_code" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cep_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "cep_cep_key" ON "cep"("cep");
