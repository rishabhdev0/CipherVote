ALTER TABLE "FraudLog" ADD COLUMN "reviewStatus" TEXT NOT NULL DEFAULT 'OPEN';
ALTER TABLE "FraudLog" ADD COLUMN "reviewNotes" TEXT;
ALTER TABLE "FraudLog" ADD COLUMN "reviewedBy" TEXT;
ALTER TABLE "FraudLog" ADD COLUMN "reviewedAt" TIMESTAMP(3);

CREATE TABLE "AuditAnchor" (
  "id" TEXT NOT NULL,
  "fromLogId" TEXT,
  "toLogId" TEXT,
  "rootHash" TEXT NOT NULL,
  "logCount" INTEGER NOT NULL,
  "anchoredTxHash" TEXT,
  "chainId" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuditAnchor_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AuditAnchor_rootHash_idx" ON "AuditAnchor"("rootHash");
