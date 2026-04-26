-- CreateEnum
CREATE TYPE "PortalLinkStatus" AS ENUM ('NOT_SENT', 'SENT', 'OPENED', 'COMPLETED', 'EXPIRED');

-- AlterTable
ALTER TABLE "Candidate" ADD COLUMN     "portalLinkStatus" "PortalLinkStatus" NOT NULL DEFAULT 'NOT_SENT';
