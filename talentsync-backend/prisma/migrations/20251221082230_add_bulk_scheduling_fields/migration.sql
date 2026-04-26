-- CreateEnum
CREATE TYPE "BulkMode" AS ENUM ('SEQUENTIAL', 'GROUP');

-- AlterTable
ALTER TABLE "Interview" ADD COLUMN     "bulkBatchId" TEXT,
ADD COLUMN     "bulkMode" "BulkMode",
ADD COLUMN     "candidateIds" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateIndex
CREATE INDEX "Interview_bulkBatchId_idx" ON "Interview"("bulkBatchId");
