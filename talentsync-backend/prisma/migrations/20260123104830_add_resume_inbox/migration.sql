-- CreateEnum
CREATE TYPE "InboxEmailStatus" AS ENUM ('PENDING', 'PROCESSING', 'PARSED', 'CANDIDATE_CREATED', 'SKIPPED', 'FAILED', 'NO_RESUME');

-- CreateTable
CREATE TABLE "ResumeInbox" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "imapHost" TEXT NOT NULL,
    "imapPort" INTEGER NOT NULL DEFAULT 993,
    "imapUser" TEXT NOT NULL,
    "imapPassword" TEXT NOT NULL,
    "useTls" BOOLEAN NOT NULL DEFAULT true,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "lastPolledAt" TIMESTAMP(3),
    "pollInterval" INTEGER NOT NULL DEFAULT 5,
    "autoProcess" BOOLEAN NOT NULL DEFAULT false,
    "autoCreate" BOOLEAN NOT NULL DEFAULT false,
    "defaultJobId" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResumeInbox_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InboxEmail" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "resumeInboxId" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "fromAddress" TEXT NOT NULL,
    "fromName" TEXT,
    "subject" TEXT NOT NULL,
    "bodyPreview" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL,
    "status" "InboxEmailStatus" NOT NULL DEFAULT 'PENDING',
    "attachments" JSONB NOT NULL DEFAULT '[]',
    "parsedData" JSONB,
    "candidateId" TEXT,
    "error" TEXT,
    "processedAt" TIMESTAMP(3),
    "processedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InboxEmail_pkey" PRIMARY KEY ("id")
);

-- CreateIndex

-- CreateIndex
CREATE INDEX "ResumeInbox_tenantId_enabled_idx" ON "ResumeInbox"("tenantId", "enabled");

-- CreateIndex
CREATE UNIQUE INDEX "ResumeInbox_tenantId_email_key" ON "ResumeInbox"("tenantId", "email");

-- CreateIndex
CREATE INDEX "InboxEmail_tenantId_status_idx" ON "InboxEmail"("tenantId", "status");

-- CreateIndex
CREATE INDEX "InboxEmail_resumeInboxId_status_idx" ON "InboxEmail"("resumeInboxId", "status");

-- CreateIndex
CREATE INDEX "InboxEmail_tenantId_receivedAt_idx" ON "InboxEmail"("tenantId", "receivedAt");

-- CreateIndex
CREATE UNIQUE INDEX "InboxEmail_resumeInboxId_messageId_key" ON "InboxEmail"("resumeInboxId", "messageId");

-- AddForeignKey

-- AddForeignKey
ALTER TABLE "ResumeInbox" ADD CONSTRAINT "ResumeInbox_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResumeInbox" ADD CONSTRAINT "ResumeInbox_defaultJobId_fkey" FOREIGN KEY ("defaultJobId") REFERENCES "Job"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InboxEmail" ADD CONSTRAINT "InboxEmail_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InboxEmail" ADD CONSTRAINT "InboxEmail_resumeInboxId_fkey" FOREIGN KEY ("resumeInboxId") REFERENCES "ResumeInbox"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InboxEmail" ADD CONSTRAINT "InboxEmail_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
