-- Explicit per-election voter roll controlled by Election Commission.
-- This keeps identity verification separate from election eligibility:
-- a voter can be verified globally but selected/rejected for a specific election.

CREATE TYPE "ElectionVoterSelectionStatus" AS ENUM ('SELECTED', 'REJECTED', 'REVOKED');

CREATE TABLE "ElectionVoterSelection" (
  "id" TEXT NOT NULL,
  "electionId" TEXT NOT NULL,
  "voterId" TEXT NOT NULL,
  "status" "ElectionVoterSelectionStatus" NOT NULL DEFAULT 'SELECTED',
  "selectedById" TEXT,
  "rejectedById" TEXT,
  "revokedById" TEXT,
  "reason" TEXT,
  "selectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "rejectedAt" TIMESTAMP(3),
  "revokedAt" TIMESTAMP(3),
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ElectionVoterSelection_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ElectionVoterSelection_electionId_voterId_key"
  ON "ElectionVoterSelection"("electionId", "voterId");

CREATE INDEX "ElectionVoterSelection_electionId_status_idx"
  ON "ElectionVoterSelection"("electionId", "status");

CREATE INDEX "ElectionVoterSelection_voterId_status_idx"
  ON "ElectionVoterSelection"("voterId", "status");

ALTER TABLE "ElectionVoterSelection"
  ADD CONSTRAINT "ElectionVoterSelection_electionId_fkey"
  FOREIGN KEY ("electionId") REFERENCES "Election"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ElectionVoterSelection"
  ADD CONSTRAINT "ElectionVoterSelection_voterId_fkey"
  FOREIGN KEY ("voterId") REFERENCES "Voter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
