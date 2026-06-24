ALTER TABLE "CandidateApplication"
  ADD COLUMN "partyLogoUrl" TEXT;

ALTER TABLE "Candidate"
  ADD COLUMN "partyLogoUrl" TEXT;

ALTER TABLE "Election"
  ADD COLUMN "notaVotes" INTEGER NOT NULL DEFAULT 0;
