ALTER TABLE "User" ADD COLUMN "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN "loginLockedUntil" TIMESTAMP(3);

ALTER TABLE "Vote" ADD COLUMN "blockNumber" INTEGER;
ALTER TABLE "Vote" ADD COLUMN "logIndex" INTEGER;
ALTER TABLE "Vote" ADD COLUMN "chainId" INTEGER;
ALTER TABLE "Vote" ADD COLUMN "confirmations" INTEGER;

CREATE TABLE "WalletNonce" (
  "id" TEXT NOT NULL,
  "userId" TEXT,
  "walletAddress" TEXT NOT NULL,
  "nonceHash" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "purpose" TEXT NOT NULL DEFAULT 'LOGIN',
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "usedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WalletNonce_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OtpChallenge" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "otpHash" TEXT NOT NULL,
  "purpose" TEXT NOT NULL,
  "channel" TEXT NOT NULL DEFAULT 'EMAIL',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "maxAttempts" INTEGER NOT NULL DEFAULT 5,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "usedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OtpChallenge_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RefreshSession" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "userAgent" TEXT,
  "ipAddress" TEXT,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "revokedAt" TIMESTAMP(3),
  "replacedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "rotatedAt" TIMESTAMP(3),
  CONSTRAINT "RefreshSession_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "WalletNonce_walletAddress_idx" ON "WalletNonce"("walletAddress");
CREATE INDEX "OtpChallenge_userId_purpose_idx" ON "OtpChallenge"("userId", "purpose");
CREATE UNIQUE INDEX "RefreshSession_tokenHash_key" ON "RefreshSession"("tokenHash");

ALTER TABLE "WalletNonce" ADD CONSTRAINT "WalletNonce_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "OtpChallenge" ADD CONSTRAINT "OtpChallenge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RefreshSession" ADD CONSTRAINT "RefreshSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
