-- CreateEnum
CREATE TYPE "AuthUserType" AS ENUM ('MEMBER_COMPANY_ADMIN', 'MEMBER_COMPANY_USER', 'RANZ_ADMIN', 'RANZ_STAFF', 'RANZ_INSPECTOR', 'EXTERNAL_INSPECTOR');

-- CreateEnum
CREATE TYPE "AuthUserStatus" AS ENUM ('PENDING_ACTIVATION', 'ACTIVE', 'SUSPENDED', 'DEACTIVATED');

-- CreateEnum
CREATE TYPE "AuthCompanyStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'DEACTIVATED');

-- CreateEnum
CREATE TYPE "AuthApplicationType" AS ENUM ('QUALITY_PROGRAM', 'ROOFING_REPORT', 'MOBILE');

-- CreateEnum
CREATE TYPE "AuthPermission" AS ENUM (
  'QP_VIEW_DASHBOARD', 'QP_MANAGE_DOCUMENTS', 'QP_MANAGE_INSURANCE', 'QP_MANAGE_PERSONNEL',
  'QP_VIEW_AUDITS', 'QP_MANAGE_PROJECTS', 'QP_ADMIN_USERS', 'QP_ADMIN_COMPANIES',
  'QP_ADMIN_AUDITS', 'QP_ADMIN_REPORTS',
  'RR_CREATE_REPORTS', 'RR_VIEW_OWN_REPORTS', 'RR_VIEW_ALL_REPORTS', 'RR_MANAGE_INSPECTORS', 'RR_ADMIN',
  'MOBILE_PHOTO_CAPTURE', 'MOBILE_SYNC'
);

-- CreateTable
CREATE TABLE "AuthCompany" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tradingName" TEXT,
    "organizationId" TEXT,
    "status" "AuthCompanyStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AuthCompany_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuthUser" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "phone" TEXT,
    "userType" "AuthUserType" NOT NULL,
    "companyId" TEXT,
    "status" "AuthUserStatus" NOT NULL DEFAULT 'PENDING_ACTIVATION',
    "deactivatedAt" TIMESTAMP(3),
    "deactivatedBy" TEXT,
    "deactivationReason" TEXT,
    "passwordChangedAt" TIMESTAMP(3),
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT true,
    "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),
    "lastLoginAt" TIMESTAMP(3),
    "lastLoginIp" TEXT,
    "ssoId" TEXT,
    "ssoProvider" TEXT,
    "clerkUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,

    CONSTRAINT "AuthUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuthSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "application" "AuthApplicationType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "lastActiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    "revokedBy" TEXT,
    "revokedReason" TEXT,

    CONSTRAINT "AuthSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuthPasswordReset" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "requestedIp" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "usedIp" TEXT,

    CONSTRAINT "AuthPasswordReset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuthUserPermission" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "application" "AuthApplicationType" NOT NULL,
    "permission" "AuthPermission" NOT NULL,
    "companyId" TEXT,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "grantedBy" TEXT NOT NULL,

    CONSTRAINT "AuthUserPermission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuthAuditLog" (
    "id" BIGSERIAL NOT NULL,
    "eventId" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "actorId" TEXT,
    "actorEmail" TEXT,
    "actorRole" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "action" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT,
    "previousState" JSONB,
    "newState" JSONB,
    "metadata" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuthAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AuthCompany_organizationId_key" ON "AuthCompany"("organizationId");
CREATE INDEX "AuthCompany_name_idx" ON "AuthCompany"("name");
CREATE INDEX "AuthCompany_organizationId_idx" ON "AuthCompany"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "AuthUser_email_key" ON "AuthUser"("email");
CREATE UNIQUE INDEX "AuthUser_ssoId_key" ON "AuthUser"("ssoId");
CREATE UNIQUE INDEX "AuthUser_clerkUserId_key" ON "AuthUser"("clerkUserId");
CREATE INDEX "AuthUser_email_idx" ON "AuthUser"("email");
CREATE INDEX "AuthUser_companyId_idx" ON "AuthUser"("companyId");
CREATE INDEX "AuthUser_status_idx" ON "AuthUser"("status");
CREATE INDEX "AuthUser_clerkUserId_idx" ON "AuthUser"("clerkUserId");
CREATE INDEX "AuthUser_ssoId_idx" ON "AuthUser"("ssoId");

-- CreateIndex
CREATE UNIQUE INDEX "AuthSession_tokenHash_key" ON "AuthSession"("tokenHash");
CREATE INDEX "AuthSession_userId_idx" ON "AuthSession"("userId");
CREATE INDEX "AuthSession_expiresAt_idx" ON "AuthSession"("expiresAt");
CREATE INDEX "AuthSession_tokenHash_idx" ON "AuthSession"("tokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "AuthPasswordReset_tokenHash_key" ON "AuthPasswordReset"("tokenHash");
CREATE INDEX "AuthPasswordReset_userId_idx" ON "AuthPasswordReset"("userId");
CREATE INDEX "AuthPasswordReset_tokenHash_idx" ON "AuthPasswordReset"("tokenHash");
CREATE INDEX "AuthPasswordReset_expiresAt_idx" ON "AuthPasswordReset"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "AuthUserPermission_userId_application_permission_companyId_key" ON "AuthUserPermission"("userId", "application", "permission", "companyId");
CREATE INDEX "AuthUserPermission_userId_idx" ON "AuthUserPermission"("userId");

-- CreateIndex
CREATE INDEX "AuthAuditLog_resourceType_resourceId_idx" ON "AuthAuditLog"("resourceType", "resourceId");
CREATE INDEX "AuthAuditLog_actorId_timestamp_idx" ON "AuthAuditLog"("actorId", "timestamp");
CREATE INDEX "AuthAuditLog_timestamp_idx" ON "AuthAuditLog"("timestamp");
CREATE INDEX "AuthAuditLog_action_idx" ON "AuthAuditLog"("action");

-- AddForeignKey
ALTER TABLE "AuthUser" ADD CONSTRAINT "AuthUser_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "AuthCompany"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuthSession" ADD CONSTRAINT "AuthSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "AuthUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuthPasswordReset" ADD CONSTRAINT "AuthPasswordReset_userId_fkey" FOREIGN KEY ("userId") REFERENCES "AuthUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuthUserPermission" ADD CONSTRAINT "AuthUserPermission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "AuthUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
