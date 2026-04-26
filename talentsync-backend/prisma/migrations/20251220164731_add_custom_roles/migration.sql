/*
  Warnings:

  - A unique constraint covering the columns `[tenantId,name,channel,version]` on the table `MessageTemplate` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "AutomationActionType" AS ENUM ('SEND_COMMUNICATION', 'UPDATE_STAGE');

-- CreateEnum
CREATE TYPE "SSOProviderType" AS ENUM ('SAML', 'GOOGLE', 'MICROSOFT');

-- CreateEnum
CREATE TYPE "SyncDirection" AS ENUM ('OUTBOUND', 'INBOUND');

-- CreateEnum
CREATE TYPE "SyncLogStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'SUCCESS', 'FAILED', 'RETRYING');

-- CreateEnum
CREATE TYPE "PermissionLevel" AS ENUM ('SYSTEM', 'TENANT');

-- CreateEnum
CREATE TYPE "RoleType" AS ENUM ('SYSTEM', 'CUSTOM');

-- AlterEnum
ALTER TYPE "AutomationTrigger" ADD VALUE 'INTERVIEW_NO_SHOW';

-- DropForeignKey
ALTER TABLE "AutomationRule" DROP CONSTRAINT "AutomationRule_templateId_fkey";

-- DropIndex
DROP INDEX "AutomationRule_tenantId_trigger_channel_key";

-- DropIndex
DROP INDEX "MessageTemplate_tenantId_name_channel_key";

-- AlterTable
ALTER TABLE "AutomationRule" ADD COLUMN     "actionData" JSONB,
ADD COLUMN     "actionType" "AutomationActionType" NOT NULL DEFAULT 'SEND_COMMUNICATION',
ALTER COLUMN "channel" DROP NOT NULL,
ALTER COLUMN "templateId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Candidate" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Interview" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "isNoShow" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "RefreshToken" ADD COLUMN     "deviceName" TEXT,
ADD COLUMN     "lastUsedAt" TIMESTAMP(3),
ADD COLUMN     "revokedReason" TEXT;

-- AlterTable
ALTER TABLE "TenantSecurityPolicy" ADD COLUMN     "enforce2FA" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "enforce2FAForAdmins" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "recoveryCodes" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "twoFactorSecret" TEXT;

-- CreateTable
CREATE TABLE "HiringStage" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "color" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isTerminal" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HiringStage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CandidateStageHistory" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "previousStage" TEXT NOT NULL,
    "newStage" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "triggeredBy" TEXT NOT NULL,
    "actorId" TEXT,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CandidateStageHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecycleBinItem" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "itemSnapshot" JSONB NOT NULL,
    "deletedBy" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "restoredAt" TIMESTAMP(3),
    "purgedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "RecycleBinItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IdentityProvider" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "providerType" "SSOProviderType" NOT NULL,
    "clientId" TEXT,
    "clientSecret" TEXT,
    "redirectUri" TEXT,
    "domainRestriction" TEXT,
    "samlMetadataUrl" TEXT,
    "samlEntityId" TEXT,
    "samlCertificate" TEXT,
    "samlAcsUrl" TEXT,
    "samlSsoUrl" TEXT,
    "samlLogoutUrl" TEXT,
    "autoProvision" BOOLEAN NOT NULL DEFAULT false,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IdentityProvider_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CandidateNote" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CandidateNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InterviewNote" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "interviewId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InterviewNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntegrationSyncLog" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "direction" "SyncDirection" NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "externalId" TEXT,
    "payload" JSONB,
    "response" JSONB,
    "status" "SyncLogStatus" NOT NULL DEFAULT 'PENDING',
    "errorMessage" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "IntegrationSyncLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntegrationMapping" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IntegrationMapping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Permission" (
    "id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "level" "PermissionLevel" NOT NULL DEFAULT 'TENANT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomRole" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "RoleType" NOT NULL DEFAULT 'CUSTOM',
    "permissions" TEXT[],
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,

    CONSTRAINT "CustomRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserCustomRole" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserCustomRole_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HiringStage_tenantId_order_idx" ON "HiringStage"("tenantId", "order");

-- CreateIndex
CREATE INDEX "HiringStage_tenantId_isActive_idx" ON "HiringStage"("tenantId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "HiringStage_tenantId_key_key" ON "HiringStage"("tenantId", "key");

-- CreateIndex
CREATE INDEX "CandidateStageHistory_tenantId_candidateId_idx" ON "CandidateStageHistory"("tenantId", "candidateId");

-- CreateIndex
CREATE INDEX "CandidateStageHistory_candidateId_createdAt_idx" ON "CandidateStageHistory"("candidateId", "createdAt");

-- CreateIndex
CREATE INDEX "RecycleBinItem_tenantId_idx" ON "RecycleBinItem"("tenantId");

-- CreateIndex
CREATE INDEX "RecycleBinItem_deletedBy_idx" ON "RecycleBinItem"("deletedBy");

-- CreateIndex
CREATE INDEX "RecycleBinItem_module_idx" ON "RecycleBinItem"("module");

-- CreateIndex
CREATE INDEX "RecycleBinItem_tenantId_deletedBy_idx" ON "RecycleBinItem"("tenantId", "deletedBy");

-- CreateIndex
CREATE INDEX "IdentityProvider_tenantId_idx" ON "IdentityProvider"("tenantId");

-- CreateIndex
CREATE INDEX "IdentityProvider_providerType_idx" ON "IdentityProvider"("providerType");

-- CreateIndex
CREATE UNIQUE INDEX "IdentityProvider_tenantId_providerType_key" ON "IdentityProvider"("tenantId", "providerType");

-- CreateIndex
CREATE INDEX "CandidateNote_tenantId_candidateId_idx" ON "CandidateNote"("tenantId", "candidateId");

-- CreateIndex
CREATE INDEX "CandidateNote_authorId_idx" ON "CandidateNote"("authorId");

-- CreateIndex
CREATE INDEX "InterviewNote_tenantId_interviewId_idx" ON "InterviewNote"("tenantId", "interviewId");

-- CreateIndex
CREATE INDEX "InterviewNote_authorId_idx" ON "InterviewNote"("authorId");

-- CreateIndex
CREATE INDEX "IntegrationSyncLog_tenantId_provider_idx" ON "IntegrationSyncLog"("tenantId", "provider");

-- CreateIndex
CREATE INDEX "IntegrationSyncLog_tenantId_status_idx" ON "IntegrationSyncLog"("tenantId", "status");

-- CreateIndex
CREATE INDEX "IntegrationSyncLog_tenantId_createdAt_idx" ON "IntegrationSyncLog"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "IntegrationSyncLog_entityType_entityId_idx" ON "IntegrationSyncLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "IntegrationMapping_tenantId_provider_idx" ON "IntegrationMapping"("tenantId", "provider");

-- CreateIndex
CREATE INDEX "IntegrationMapping_externalId_idx" ON "IntegrationMapping"("externalId");

-- CreateIndex
CREATE UNIQUE INDEX "IntegrationMapping_tenantId_provider_entityType_entityId_key" ON "IntegrationMapping"("tenantId", "provider", "entityType", "entityId");

-- CreateIndex
CREATE INDEX "Permission_category_idx" ON "Permission"("category");

-- CreateIndex
CREATE INDEX "Permission_level_idx" ON "Permission"("level");

-- CreateIndex
CREATE INDEX "CustomRole_tenantId_idx" ON "CustomRole"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "CustomRole_tenantId_name_key" ON "CustomRole"("tenantId", "name");

-- CreateIndex
CREATE INDEX "UserCustomRole_userId_idx" ON "UserCustomRole"("userId");

-- CreateIndex
CREATE INDEX "UserCustomRole_roleId_idx" ON "UserCustomRole"("roleId");

-- CreateIndex
CREATE INDEX "UserCustomRole_tenantId_idx" ON "UserCustomRole"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "UserCustomRole_userId_roleId_tenantId_key" ON "UserCustomRole"("userId", "roleId", "tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "MessageTemplate_tenantId_name_channel_version_key" ON "MessageTemplate"("tenantId", "name", "channel", "version");

-- AddForeignKey
ALTER TABLE "HiringStage" ADD CONSTRAINT "HiringStage_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateStageHistory" ADD CONSTRAINT "CandidateStageHistory_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutomationRule" ADD CONSTRAINT "AutomationRule_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "MessageTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IdentityProvider" ADD CONSTRAINT "IdentityProvider_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateNote" ADD CONSTRAINT "CandidateNote_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateNote" ADD CONSTRAINT "CandidateNote_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewNote" ADD CONSTRAINT "InterviewNote_interviewId_fkey" FOREIGN KEY ("interviewId") REFERENCES "Interview"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewNote" ADD CONSTRAINT "InterviewNote_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomRole" ADD CONSTRAINT "CustomRole_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserCustomRole" ADD CONSTRAINT "UserCustomRole_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserCustomRole" ADD CONSTRAINT "UserCustomRole_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "CustomRole"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
