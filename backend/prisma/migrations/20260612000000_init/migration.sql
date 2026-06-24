CREATE TABLE "User" (
  "id" TEXT NOT NULL,
  "email" TEXT,
  "phone" TEXT,
  "passwordHash" TEXT,
  "role" TEXT NOT NULL DEFAULT 'VOTER',
  "walletAddress" TEXT,
  "isEmailVerified" BOOLEAN NOT NULL DEFAULT false,
  "isPhoneVerified" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Voter" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "firstName" TEXT NOT NULL,
  "lastName" TEXT NOT NULL,
  "dateOfBirth" TIMESTAMP(3) NOT NULL,
  "age" INTEGER,
  "gender" TEXT,
  "constituency" TEXT NOT NULL,
  "voterIdNumber" TEXT,
  "walletAddress" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "faceVerified" BOOLEAN NOT NULL DEFAULT false,
  "idVerified" BOOLEAN NOT NULL DEFAULT false,
  "livenessVerified" BOOLEAN NOT NULL DEFAULT false,
  "faceMatchScore" DOUBLE PRECISION,
  "riskScore" INTEGER NOT NULL DEFAULT 0,
  "isFlagged" BOOLEAN NOT NULL DEFAULT false,
  "flagReason" TEXT,
  "isBlacklisted" BOOLEAN NOT NULL DEFAULT false,
  "blacklistReason" TEXT,
  "blacklistedAt" TIMESTAMP(3),
  "nftTokenId" TEXT,
  "nftTier" TEXT NOT NULL DEFAULT 'BRONZE',
  "blockchainTxHash" TEXT,
  "identityHash" TEXT,
  "rejectionReason" TEXT,
  "registeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "verifiedAt" TIMESTAMP(3),
  CONSTRAINT "Voter_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Election" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "constituency" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "blockchainId" INTEGER,
  "startTime" TIMESTAMP(3) NOT NULL,
  "endTime" TIMESTAMP(3) NOT NULL,
  "totalRegistered" INTEGER NOT NULL DEFAULT 0,
  "totalVotesCast" INTEGER NOT NULL DEFAULT 0,
  "merkleRoot" TEXT,
  "blockchainTxHash" TEXT,
  "createdBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Election_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Candidate" (
  "id" TEXT NOT NULL,
  "electionId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "party" TEXT NOT NULL,
  "constituency" TEXT,
  "manifesto" TEXT,
  "photoUrl" TEXT,
  "blockchainId" INTEGER,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "voteCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Candidate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Vote" (
  "id" TEXT NOT NULL,
  "electionId" TEXT NOT NULL,
  "voterId" TEXT NOT NULL,
  "candidateId" TEXT NOT NULL,
  "voteHash" TEXT,
  "receiptHash" TEXT,
  "salt" TEXT,
  "commitment" TEXT,
  "nullifier" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "blockchainTxHash" TEXT,
  "ipAddress" TEXT,
  "deviceId" TEXT,
  "constituency" TEXT,
  "zkpVerified" BOOLEAN NOT NULL DEFAULT false,
  "castAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "confirmedAt" TIMESTAMP(3),
  CONSTRAINT "Vote_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FraudLog" (
  "id" TEXT NOT NULL,
  "electionId" TEXT,
  "voterId" TEXT,
  "fraudType" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "severity" TEXT NOT NULL DEFAULT 'MEDIUM',
  "riskScore" INTEGER NOT NULL DEFAULT 0,
  "ipAddress" TEXT,
  "metadata" JSONB,
  "isResolved" BOOLEAN NOT NULL DEFAULT false,
  "resolvedBy" TEXT,
  "resolvedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FraudLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AuditLog" (
  "id" TEXT NOT NULL,
  "userId" TEXT,
  "action" TEXT NOT NULL,
  "resource" TEXT,
  "resourceId" TEXT,
  "description" TEXT,
  "severity" TEXT NOT NULL DEFAULT 'INFO',
  "ipAddress" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Dispute" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "disputeType" TEXT NOT NULL DEFAULT 'OTHER',
  "status" TEXT NOT NULL DEFAULT 'FILED',
  "isPublic" BOOLEAN NOT NULL DEFAULT true,
  "resolution" TEXT,
  "actionTaken" TEXT,
  "evidenceCount" INTEGER NOT NULL DEFAULT 0,
  "supportVotes" INTEGER NOT NULL DEFAULT 0,
  "oppositionVotes" INTEGER NOT NULL DEFAULT 0,
  "resolvedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Dispute_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Notification" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "isRead" BOOLEAN NOT NULL DEFAULT false,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BlockchainSync" (
  "id" TEXT NOT NULL,
  "contractName" TEXT NOT NULL,
  "lastSyncedBlock" INTEGER NOT NULL DEFAULT 0,
  "lastSyncedAt" TIMESTAMP(3),
  "isSyncing" BOOLEAN NOT NULL DEFAULT false,
  "syncErrors" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "BlockchainSync_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");
CREATE UNIQUE INDEX "User_walletAddress_key" ON "User"("walletAddress");
CREATE UNIQUE INDEX "Voter_userId_key" ON "Voter"("userId");
CREATE UNIQUE INDEX "Voter_walletAddress_key" ON "Voter"("walletAddress");
CREATE UNIQUE INDEX "Vote_voteHash_key" ON "Vote"("voteHash");
CREATE UNIQUE INDEX "Vote_receiptHash_key" ON "Vote"("receiptHash");
CREATE UNIQUE INDEX "Vote_voterId_electionId_key" ON "Vote"("voterId", "electionId");
CREATE UNIQUE INDEX "BlockchainSync_contractName_key" ON "BlockchainSync"("contractName");

ALTER TABLE "Voter" ADD CONSTRAINT "Voter_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Candidate" ADD CONSTRAINT "Candidate_electionId_fkey" FOREIGN KEY ("electionId") REFERENCES "Election"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Vote" ADD CONSTRAINT "Vote_electionId_fkey" FOREIGN KEY ("electionId") REFERENCES "Election"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Vote" ADD CONSTRAINT "Vote_voterId_fkey" FOREIGN KEY ("voterId") REFERENCES "Voter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Vote" ADD CONSTRAINT "Vote_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
