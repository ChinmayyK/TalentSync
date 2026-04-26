/*
  Warnings:

  - A unique constraint covering the columns `[tenantId,externalId,externalSource]` on the table `Candidate` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Candidate" ADD COLUMN     "externalId" TEXT,
ADD COLUMN     "externalSource" TEXT,
ADD COLUMN     "photoUrl" TEXT,
ADD COLUMN     "rawExternalData" JSONB;

-- AlterTable
ALTER TABLE "Integration" ADD COLUMN     "instanceUrl" TEXT;

-- AlterTable
ALTER TABLE "_UserTeams" ADD CONSTRAINT "_UserTeams_AB_pkey" PRIMARY KEY ("A", "B");

-- DropIndex
DROP INDEX "_UserTeams_AB_unique";

-- CreateTable
CREATE TABLE "CandidatePortalToken" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "CandidatePortalToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OpportunityContext" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "stageName" TEXT,
    "accountId" TEXT,
    "accountName" TEXT,
    "ownerId" TEXT,
    "ownerName" TEXT,
    "amount" DOUBLE PRECISION,
    "closeDate" TIMESTAMP(3),
    "probability" DOUBLE PRECISION,
    "rawData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OpportunityContext_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CandidateOpportunity" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "opportunityContextId" TEXT NOT NULL,
    "associationType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CandidateOpportunity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExternalFeedbackContext" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "interviewerName" TEXT,
    "interviewType" TEXT,
    "interviewDate" TIMESTAMP(3),
    "overallScore" TEXT,
    "scorecard" JSONB,
    "comments" TEXT,
    "recommendation" TEXT,
    "rawData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExternalFeedbackContext_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FieldMapping" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "integrationId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "externalField" TEXT NOT NULL,
    "internalField" TEXT NOT NULL,
    "dataType" TEXT NOT NULL,
    "transform" TEXT,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FieldMapping_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CandidatePortalToken_tokenHash_key" ON "CandidatePortalToken"("tokenHash");

-- CreateIndex
CREATE INDEX "CandidatePortalToken_candidateId_idx" ON "CandidatePortalToken"("candidateId");

-- CreateIndex
CREATE INDEX "CandidatePortalToken_tokenHash_idx" ON "CandidatePortalToken"("tokenHash");

-- CreateIndex
CREATE INDEX "CandidatePortalToken_tenantId_expiresAt_idx" ON "CandidatePortalToken"("tenantId", "expiresAt");

-- CreateIndex
CREATE INDEX "OpportunityContext_tenantId_idx" ON "OpportunityContext"("tenantId");

-- CreateIndex
CREATE INDEX "OpportunityContext_tenantId_provider_idx" ON "OpportunityContext"("tenantId", "provider");

-- CreateIndex
CREATE UNIQUE INDEX "OpportunityContext_tenantId_provider_externalId_key" ON "OpportunityContext"("tenantId", "provider", "externalId");

-- CreateIndex
CREATE INDEX "CandidateOpportunity_candidateId_idx" ON "CandidateOpportunity"("candidateId");

-- CreateIndex
CREATE INDEX "CandidateOpportunity_opportunityContextId_idx" ON "CandidateOpportunity"("opportunityContextId");

-- CreateIndex
CREATE UNIQUE INDEX "CandidateOpportunity_candidateId_opportunityContextId_key" ON "CandidateOpportunity"("candidateId", "opportunityContextId");

-- CreateIndex
CREATE INDEX "ExternalFeedbackContext_candidateId_idx" ON "ExternalFeedbackContext"("candidateId");

-- CreateIndex
CREATE INDEX "ExternalFeedbackContext_tenantId_provider_idx" ON "ExternalFeedbackContext"("tenantId", "provider");

-- CreateIndex
CREATE UNIQUE INDEX "ExternalFeedbackContext_tenantId_provider_externalId_key" ON "ExternalFeedbackContext"("tenantId", "provider", "externalId");

-- CreateIndex
CREATE INDEX "FieldMapping_tenantId_provider_idx" ON "FieldMapping"("tenantId", "provider");

-- CreateIndex
CREATE UNIQUE INDEX "FieldMapping_tenantId_integrationId_externalField_key" ON "FieldMapping"("tenantId", "integrationId", "externalField");

-- CreateIndex
CREATE INDEX "idx_candidate_external" ON "Candidate"("tenantId", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "Candidate_tenantId_externalId_externalSource_key" ON "Candidate"("tenantId", "externalId", "externalSource");

-- AddForeignKey
ALTER TABLE "CandidatePortalToken" ADD CONSTRAINT "CandidatePortalToken_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OpportunityContext" ADD CONSTRAINT "OpportunityContext_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateOpportunity" ADD CONSTRAINT "CandidateOpportunity_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateOpportunity" ADD CONSTRAINT "CandidateOpportunity_opportunityContextId_fkey" FOREIGN KEY ("opportunityContextId") REFERENCES "OpportunityContext"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExternalFeedbackContext" ADD CONSTRAINT "ExternalFeedbackContext_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExternalFeedbackContext" ADD CONSTRAINT "ExternalFeedbackContext_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
