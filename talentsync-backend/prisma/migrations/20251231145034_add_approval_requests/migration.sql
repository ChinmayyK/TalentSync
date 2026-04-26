-- CreateEnum
CREATE TYPE "ApprovalEntityType" AS ENUM ('CANDIDATE', 'SUBMISSION', 'JOB', 'OTHER');

-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "ApprovalRequest" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "entityType" "ApprovalEntityType" NOT NULL DEFAULT 'CANDIDATE',
    "approvalStatus" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "submissionStatus" TEXT,
    "recruiterId" TEXT,
    "recruiterName" TEXT,
    "candidateId" TEXT,
    "candidateFirstName" TEXT,
    "candidateLastName" TEXT,
    "candidateEmail" TEXT,
    "interviewId" TEXT,
    "interviewDate" TIMESTAMP(3),
    "clientName" TEXT,
    "positionAppliedFor" TEXT,
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectedBy" TEXT,
    "rejectedAt" TIMESTAMP(3),
    "remarks" TEXT,
    "metadata" JSONB,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApprovalRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ApprovalRequest_tenantId_approvalStatus_idx" ON "ApprovalRequest"("tenantId", "approvalStatus");

-- CreateIndex
CREATE INDEX "ApprovalRequest_tenantId_submittedAt_idx" ON "ApprovalRequest"("tenantId", "submittedAt");

-- CreateIndex
CREATE INDEX "ApprovalRequest_tenantId_interviewDate_idx" ON "ApprovalRequest"("tenantId", "interviewDate");
