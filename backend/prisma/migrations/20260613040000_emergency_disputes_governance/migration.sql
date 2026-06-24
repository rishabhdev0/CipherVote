CREATE TYPE "GovernanceActionStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'EXECUTED', 'EXPIRED');

ALTER TABLE "Dispute" ADD COLUMN "createdById" TEXT;
ALTER TABLE "Dispute" ADD CONSTRAINT "Dispute_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "Dispute_createdById_idx" ON "Dispute"("createdById");

CREATE TABLE "SystemState" (
  "id" TEXT NOT NULL DEFAULT 'global',
  "emergencyPaused" BOOLEAN NOT NULL DEFAULT false,
  "pauseReason" TEXT,
  "pausedById" TEXT,
  "pausedAt" TIMESTAMP(3),
  "resumedById" TEXT,
  "resumedAt" TIMESTAMP(3),
  "chainTxHash" TEXT,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SystemState_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "GovernanceAction" (
  "id" TEXT NOT NULL,
  "actionType" TEXT NOT NULL,
  "resource" TEXT NOT NULL,
  "resourceId" TEXT,
  "payload" JSONB,
  "status" "GovernanceActionStatus" NOT NULL DEFAULT 'PENDING',
  "proposedById" TEXT,
  "approvals" JSONB,
  "requiredApprovals" INTEGER NOT NULL DEFAULT 2,
  "notBefore" TIMESTAMP(3),
  "executedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "GovernanceAction_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "GovernanceAction" ADD CONSTRAINT "GovernanceAction_proposedById_fkey" FOREIGN KEY ("proposedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "GovernanceAction_resource_resourceId_idx" ON "GovernanceAction"("resource", "resourceId");
CREATE INDEX "GovernanceAction_status_idx" ON "GovernanceAction"("status");
