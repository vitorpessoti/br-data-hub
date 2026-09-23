-- Rename the user and cep columns from snake_case to camelCase (keeps the stored data)
ALTER TABLE "user" RENAME COLUMN "created_at" TO "createdAt";
ALTER TABLE "user" RENAME COLUMN "updated_at" TO "updatedAt";
ALTER TABLE "cep" RENAME COLUMN "ibge_code" TO "ibgeCode";
ALTER TABLE "cep" RENAME COLUMN "gia_code" TO "giaCode";
ALTER TABLE "cep" RENAME COLUMN "siafi_code" TO "siafiCode";
ALTER TABLE "cep" RENAME COLUMN "created_at" TO "createdAt";
ALTER TABLE "cep" RENAME COLUMN "updated_at" TO "updatedAt";
