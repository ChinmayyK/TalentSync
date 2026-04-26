-- AlterTable
ALTER TABLE "CandidatePortalToken" ADD COLUMN     "channel" "Channel",
ADD COLUMN     "lastSentAt" TIMESTAMP(3),
ADD COLUMN     "sendCount" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "SubmissionRun" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "triggeredBy" TEXT NOT NULL,
    "triggeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalScanned" INTEGER NOT NULL,
    "totalSubmitted" INTEGER NOT NULL,
    "totalSkipped" INTEGER NOT NULL,
    "errors" JSONB,
    "remarks" TEXT,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "SubmissionRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SubmissionRun_tenantId_triggeredAt_idx" ON "SubmissionRun"("tenantId", "triggeredAt");
