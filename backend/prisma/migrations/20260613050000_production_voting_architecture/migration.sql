CREATE TYPE "IdentityAppealStatus" AS ENUM ('FILED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED');

ALTER TABLE "Election"
  ADD COLUMN "privacyMode" TEXT NOT NULL DEFAULT 'ENCRYPTED_BALLOT',
  ADD COLUMN "challengeStartsAt" TIMESTAMP(3),
  ADD COLUMN "challengeEndsAt" TIMESTAMP(3),
  ADD COLUMN "certifiedAt" TIMESTAMP(3),
  ADD COLUMN "certifiedById" TEXT,
  ADD COLUMN "certificationNotes" TEXT,
  ADD COLUMN "tallyPublicKey" TEXT;

ALTER TABLE "VoteReceipt"
  ALTER COLUMN "blockchainTxHash" DROP NOT NULL,
  ALTER COLUMN "blockNumber" DROP NOT NULL,
  ALTER COLUMN "logIndex" DROP NOT NULL,
  ALTER COLUMN "chainId" DROP NOT NULL,
  ADD COLUMN "finalizedAt" TIMESTAMP(3),
  ADD COLUMN "isCanonical" BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE "EncryptedBallot" (
  "id" TEXT NOT NULL,
  "electionId" TEXT NOT NULL,
  "ballotCommitment" TEXT NOT NULL,
  "nullifierHash" TEXT NOT NULL,
  "encryptedPayload" TEXT NOT NULL,
  "encryptionScheme" TEXT NOT NULL DEFAULT 'X25519-XSALSA20POLY1305',
  "proofCommitment" TEXT,
  "eligibilityRoot" TEXT,
  "receiptHash" TEXT NOT NULL,
  "status" "VoteStatus" NOT NULL DEFAULT 'CONFIRMED',
  "blockchainTxHash" TEXT,
  "blockNumber" INTEGER,
  "logIndex" INTEGER,
  "chainId" INTEGER,
  "confirmations" INTEGER NOT NULL DEFAULT 0,
  "finalizedAt" TIMESTAMP(3),
  "isCanonical" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EncryptedBallot_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EligibilityCommitment" (
  "id" TEXT NOT NULL,
  "electionId" TEXT NOT NULL,
  "voterId" TEXT NOT NULL,
  "commitment" TEXT NOT NULL,
  "leaf" TEXT NOT NULL,
  "merklePath" JSONB,
  "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "revokedAt" TIMESTAMP(3),
  CONSTRAINT "EligibilityCommitment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "IdentityAppeal" (
  "id" TEXT NOT NULL,
  "voterId" TEXT NOT NULL,
  "filedById" TEXT,
  "status" "IdentityAppealStatus" NOT NULL DEFAULT 'FILED',
  "reason" TEXT NOT NULL,
  "evidence" JSONB,
  "reviewerId" TEXT,
  "decisionReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reviewedAt" TIMESTAMP(3),
  CONSTRAINT "IdentityAppeal_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EncryptedBallot_ballotCommitment_key" ON "EncryptedBallot"("ballotCommitment");
CREATE UNIQUE INDEX "EncryptedBallot_nullifierHash_key" ON "EncryptedBallot"("nullifierHash");
CREATE UNIQUE INDEX "EncryptedBallot_receiptHash_key" ON "EncryptedBallot"("receiptHash");
CREATE INDEX "EncryptedBallot_electionId_idx" ON "EncryptedBallot"("electionId");

CREATE UNIQUE INDEX "EligibilityCommitment_electionId_voterId_key" ON "EligibilityCommitment"("electionId","voterId");
CREATE UNIQUE INDEX "EligibilityCommitment_electionId_commitment_key" ON "EligibilityCommitment"("electionId","commitment");
CREATE INDEX "EligibilityCommitment_electionId_idx" ON "EligibilityCommitment"("electionId");

CREATE INDEX "IdentityAppeal_voterId_status_idx" ON "IdentityAppeal"("voterId","status");

ALTER TABLE "EncryptedBallot" ADD CONSTRAINT "EncryptedBallot_electionId_fkey" FOREIGN KEY ("electionId") REFERENCES "Election"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EligibilityCommitment" ADD CONSTRAINT "EligibilityCommitment_electionId_fkey" FOREIGN KEY ("electionId") REFERENCES "Election"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EligibilityCommitment" ADD CONSTRAINT "EligibilityCommitment_voterId_fkey" FOREIGN KEY ("voterId") REFERENCES "Voter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "IdentityAppeal" ADD CONSTRAINT "IdentityAppeal_voterId_fkey" FOREIGN KEY ("voterId") REFERENCES "Voter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
