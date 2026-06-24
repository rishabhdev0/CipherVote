-- Remove candidate choice and request telemetry from the voter-linked Vote row.
-- Candidate totals remain aggregate-only on Candidate.voteCount; fraud telemetry moves
-- to VotePrivacySignal without voterId or candidateId.
ALTER TABLE "Vote" DROP CONSTRAINT IF EXISTS "Vote_candidateId_fkey";

ALTER TABLE "Vote"
  DROP COLUMN IF EXISTS "candidateId",
  DROP COLUMN IF EXISTS "salt",
  DROP COLUMN IF EXISTS "commitment",
  DROP COLUMN IF EXISTS "nullifier",
  DROP COLUMN IF EXISTS "ipAddress",
  DROP COLUMN IF EXISTS "deviceId";

CREATE TABLE "VotePrivacySignal" (
  "id" TEXT NOT NULL,
  "electionId" TEXT NOT NULL,
  "ipHash" TEXT,
  "deviceHash" TEXT,
  "userAgentHash" TEXT,
  "castAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "VotePrivacySignal_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "VotePrivacySignal_electionId_idx" ON "VotePrivacySignal"("electionId");
CREATE INDEX "VotePrivacySignal_ipHash_castAt_idx" ON "VotePrivacySignal"("ipHash", "castAt");
CREATE INDEX "VotePrivacySignal_deviceHash_castAt_idx" ON "VotePrivacySignal"("deviceHash", "castAt");
