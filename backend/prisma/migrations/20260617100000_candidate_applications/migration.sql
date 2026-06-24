CREATE TYPE "CandidateApplicationStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'WITHDRAWN');

ALTER TABLE "Candidate"
  ADD COLUMN "applicationId" TEXT;

CREATE TABLE "CandidateApplication" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "electionId" TEXT,
  "candidateId" TEXT,
  "fullName" TEXT NOT NULL,
  "party" TEXT NOT NULL,
  "constituency" TEXT NOT NULL,
  "manifesto" TEXT,
  "contactEmail" TEXT,
  "contactPhone" TEXT,
  "documentHash" TEXT,
  "status" "CandidateApplicationStatus" NOT NULL DEFAULT 'SUBMITTED',
  "reviewReason" TEXT,
  "reviewedById" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "CandidateApplication_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Candidate_applicationId_key" ON "Candidate"("applicationId");
CREATE INDEX "CandidateApplication_userId_status_idx" ON "CandidateApplication"("userId", "status");
CREATE INDEX "CandidateApplication_electionId_status_idx" ON "CandidateApplication"("electionId", "status");
CREATE INDEX "CandidateApplication_constituency_status_idx" ON "CandidateApplication"("constituency", "status");

ALTER TABLE "CandidateApplication"
  ADD CONSTRAINT "CandidateApplication_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "CandidateApplication"
  ADD CONSTRAINT "CandidateApplication_electionId_fkey"
  FOREIGN KEY ("electionId") REFERENCES "Election"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Candidate"
  ADD CONSTRAINT "Candidate_applicationId_fkey"
  FOREIGN KEY ("applicationId") REFERENCES "CandidateApplication"("id") ON DELETE SET NULL ON UPDATE CASCADE;
