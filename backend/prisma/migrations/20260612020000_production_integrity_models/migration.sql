CREATE TYPE "UserRole" AS ENUM ('VOTER', 'SUPER_ADMIN', 'ELECTION_COMMISSION', 'AUDITOR', 'FRAUD_ANALYST');
CREATE TYPE "VoterStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED', 'BLACKLISTED');
CREATE TYPE "ElectionStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'CLOSED', 'RESULTS_DECLARED');
CREATE TYPE "VoteStatus" AS ENUM ('PENDING', 'CONFIRMED', 'FAILED');
CREATE TYPE "DisputeStatus" AS ENUM ('FILED', 'UNDER_REVIEW', 'RESOLVED', 'REJECTED');
CREATE TYPE "DelegationStatus" AS ENUM ('ACTIVE', 'REVOKED', 'EXPIRED');
CREATE TYPE "DocumentType" AS ENUM ('FACE_IMAGE', 'ID_DOCUMENT', 'DISPUTE_EVIDENCE', 'OTHER');

ALTER TABLE "User" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN "role" TYPE "UserRole" USING "role"::"UserRole";
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'VOTER';

ALTER TABLE "Voter" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Voter" ALTER COLUMN "status" TYPE "VoterStatus" USING "status"::"VoterStatus";
ALTER TABLE "Voter" ALTER COLUMN "status" SET DEFAULT 'PENDING';

ALTER TABLE "Election" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Election" ALTER COLUMN "status" TYPE "ElectionStatus" USING "status"::"ElectionStatus";
ALTER TABLE "Election" ALTER COLUMN "status" SET DEFAULT 'DRAFT';

ALTER TABLE "Vote" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Vote" ALTER COLUMN "status" TYPE "VoteStatus" USING "status"::"VoteStatus";
ALTER TABLE "Vote" ALTER COLUMN "status" SET DEFAULT 'PENDING';

ALTER TABLE "Dispute" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Dispute" ALTER COLUMN "status" TYPE "DisputeStatus" USING "status"::"DisputeStatus";
ALTER TABLE "Dispute" ALTER COLUMN "status" SET DEFAULT 'FILED';

ALTER TABLE "AuditLog" ADD COLUMN "previousHash" TEXT;
ALTER TABLE "AuditLog" ADD COLUMN "entryHash" TEXT;
CREATE UNIQUE INDEX "AuditLog_entryHash_key" ON "AuditLog"("entryHash");
CREATE INDEX "AuditLog_entryHash_idx" ON "AuditLog"("entryHash");

CREATE UNIQUE INDEX "Voter_voterIdNumber_key" ON "Voter"("voterIdNumber");

CREATE TABLE "VoteReceipt" (
  "id" TEXT NOT NULL,
  "voteId" TEXT NOT NULL,
  "electionId" TEXT NOT NULL,
  "publicReceiptHash" TEXT NOT NULL,
  "blockchainTxHash" TEXT NOT NULL,
  "blockNumber" INTEGER NOT NULL,
  "logIndex" INTEGER NOT NULL,
  "chainId" INTEGER NOT NULL,
  "confirmations" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "VoteReceipt_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "VoteReceipt_voteId_key" ON "VoteReceipt"("voteId");
CREATE UNIQUE INDEX "VoteReceipt_publicReceiptHash_key" ON "VoteReceipt"("publicReceiptHash");
CREATE INDEX "VoteReceipt_electionId_idx" ON "VoteReceipt"("electionId");
CREATE INDEX "VoteReceipt_chainId_blockNumber_logIndex_idx" ON "VoteReceipt"("chainId","blockNumber","logIndex");
ALTER TABLE "VoteReceipt" ADD CONSTRAINT "VoteReceipt_voteId_fkey" FOREIGN KEY ("voteId") REFERENCES "Vote"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "VoteReceipt" ADD CONSTRAINT "VoteReceipt_electionId_fkey" FOREIGN KEY ("electionId") REFERENCES "Election"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "UploadedDocument" (
  "id" TEXT NOT NULL,
  "userId" TEXT,
  "voterId" TEXT,
  "type" "DocumentType" NOT NULL DEFAULT 'OTHER',
  "storagePath" TEXT NOT NULL,
  "originalName" TEXT,
  "mimeType" TEXT,
  "sizeBytes" INTEGER,
  "sha256" TEXT NOT NULL,
  "encrypted" BOOLEAN NOT NULL DEFAULT false,
  "encryptionKeyRef" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UploadedDocument_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "UploadedDocument_userId_idx" ON "UploadedDocument"("userId");
CREATE INDEX "UploadedDocument_voterId_idx" ON "UploadedDocument"("voterId");
CREATE INDEX "UploadedDocument_sha256_idx" ON "UploadedDocument"("sha256");
ALTER TABLE "UploadedDocument" ADD CONSTRAINT "UploadedDocument_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "UploadedDocument" ADD CONSTRAINT "UploadedDocument_voterId_fkey" FOREIGN KEY ("voterId") REFERENCES "Voter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "DisputeEvidence" (
  "id" TEXT NOT NULL,
  "disputeId" TEXT NOT NULL,
  "uploadedById" TEXT,
  "documentId" TEXT,
  "description" TEXT,
  "hash" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DisputeEvidence_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "DisputeEvidence" ADD CONSTRAINT "DisputeEvidence_disputeId_fkey" FOREIGN KEY ("disputeId") REFERENCES "Dispute"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DisputeEvidence" ADD CONSTRAINT "DisputeEvidence_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "UploadedDocument"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "Delegation" (
  "id" TEXT NOT NULL,
  "electionId" TEXT NOT NULL,
  "delegatorUserId" TEXT NOT NULL,
  "delegateUserId" TEXT NOT NULL,
  "delegatorVoterId" TEXT,
  "delegateVoterId" TEXT,
  "status" "DelegationStatus" NOT NULL DEFAULT 'ACTIVE',
  "reason" TEXT,
  "revokedAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Delegation_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Delegation_electionId_delegatorUserId_key" ON "Delegation"("electionId","delegatorUserId");
CREATE INDEX "Delegation_delegateUserId_idx" ON "Delegation"("delegateUserId");
ALTER TABLE "Delegation" ADD CONSTRAINT "Delegation_electionId_fkey" FOREIGN KEY ("electionId") REFERENCES "Election"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Delegation" ADD CONSTRAINT "Delegation_delegatorUserId_fkey" FOREIGN KEY ("delegatorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Delegation" ADD CONSTRAINT "Delegation_delegateUserId_fkey" FOREIGN KEY ("delegateUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Delegation" ADD CONSTRAINT "Delegation_delegatorVoterId_fkey" FOREIGN KEY ("delegatorVoterId") REFERENCES "Voter"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Delegation" ADD CONSTRAINT "Delegation_delegateVoterId_fkey" FOREIGN KEY ("delegateVoterId") REFERENCES "Voter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "ChainEvent" (
  "id" TEXT NOT NULL,
  "contractName" TEXT NOT NULL,
  "eventName" TEXT NOT NULL,
  "electionId" TEXT,
  "chainId" INTEGER NOT NULL,
  "blockNumber" INTEGER NOT NULL,
  "transactionHash" TEXT NOT NULL,
  "logIndex" INTEGER NOT NULL,
  "args" JSONB,
  "processed" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ChainEvent_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ChainEvent_chainId_transactionHash_logIndex_key" ON "ChainEvent"("chainId","transactionHash","logIndex");
CREATE INDEX "ChainEvent_contractName_eventName_idx" ON "ChainEvent"("contractName","eventName");
ALTER TABLE "ChainEvent" ADD CONSTRAINT "ChainEvent_electionId_fkey" FOREIGN KEY ("electionId") REFERENCES "Election"("id") ON DELETE SET NULL ON UPDATE CASCADE;
