-- CreateEnum
CREATE TYPE "JobVisibility" AS ENUM ('INTERNAL', 'EXTERNAL', 'CONFIDENTIAL');

-- CreateEnum
CREATE TYPE "JobPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "JobBoardProviderEnum" AS ENUM ('INDEED', 'LINKEDIN', 'GLASSDOOR', 'ZIPRECRUITER');

-- CreateEnum
CREATE TYPE "JobPostingStatusEnum" AS ENUM ('DRAFT', 'PENDING', 'ACTIVE', 'EXPIRED', 'CLOSED', 'FAILED');

-- AlterTable
ALTER TABLE "Job" ADD COLUMN     "assignedRecruiterIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "city" TEXT,
ADD COLUMN     "clientName" TEXT,
ADD COLUMN     "lastActivityAt" TIMESTAMP(3),
ADD COLUMN     "priority" "JobPriority" NOT NULL DEFAULT 'NORMAL',
ADD COLUMN     "visibility" "JobVisibility" NOT NULL DEFAULT 'INTERNAL';

-- CreateTable
CREATE TABLE "JobPosting" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "provider" "JobBoardProviderEnum" NOT NULL,
    "externalId" TEXT,
    "externalUrl" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "JobPostingStatusEnum" NOT NULL DEFAULT 'DRAFT',
    "sponsored" BOOLEAN NOT NULL DEFAULT false,
    "postedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "lastSyncAt" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobPosting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "JobPosting_tenantId_status_idx" ON "JobPosting"("tenantId", "status");

-- CreateIndex
CREATE INDEX "JobPosting_tenantId_jobId_idx" ON "JobPosting"("tenantId", "jobId");

-- CreateIndex
CREATE UNIQUE INDEX "JobPosting_tenantId_jobId_provider_key" ON "JobPosting"("tenantId", "jobId", "provider");

-- AddForeignKey
ALTER TABLE "JobPosting" ADD CONSTRAINT "JobPosting_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobPosting" ADD CONSTRAINT "JobPosting_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;
