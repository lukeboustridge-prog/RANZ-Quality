-- CreateEnum
CREATE TYPE "AuthMode" AS ENUM ('CLERK', 'CUSTOM', 'MIGRATING');

-- AlterTable
ALTER TABLE "AuthUser" ADD COLUMN "authMode" "AuthMode" NOT NULL DEFAULT 'CLERK';
ALTER TABLE "AuthUser" ADD COLUMN "migratedAt" TIMESTAMP(3);
ALTER TABLE "AuthUser" ADD COLUMN "migratedBy" TEXT;
ALTER TABLE "AuthUser" ADD COLUMN "migrationNotes" TEXT;
ALTER TABLE "AuthUser" ADD COLUMN "clerkMetadata" JSONB;

-- CreateIndex
CREATE INDEX "AuthUser_authMode_idx" ON "AuthUser"("authMode");
