-- AlterTable
ALTER TABLE "user" ADD COLUMN     "resetPasswordExpiresAt" TIMESTAMP(3),
ADD COLUMN     "resetPasswordTokenHash" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "user_resetPasswordTokenHash_key" ON "user"("resetPasswordTokenHash");

