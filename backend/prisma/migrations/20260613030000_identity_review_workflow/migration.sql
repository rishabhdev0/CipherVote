CREATE TYPE "IdentityReviewStatus" AS ENUM ('PENDING', 'IN_REVIEW', 'APPROVED', 'REJECTED', 'NEEDS_MANUAL_REVIEW');

CREATE TABLE "IdentityVerificationReview" (
  "id" TEXT NOT NULL,
  "voterId" TEXT NOT NULL,
  "provider" TEXT NOT NULL DEFAULT 'MANUAL',
  "status" "IdentityReviewStatus" NOT NULL DEFAULT 'PENDING',
  "faceVerified" BOOLEAN NOT NULL DEFAULT false,
  "idVerified" BOOLEAN NOT NULL DEFAULT false,
  "livenessVerified" BOOLEAN NOT NULL DEFAULT false,
  "faceMatchScore" DOUBLE PRECISION,
  "riskScore" INTEGER NOT NULL DEFAULT 0,
  "reviewerId" TEXT,
  "decisionReason" TEXT,
  "providerReference" TEXT,
  "evidence" JSONB,
  "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reviewedAt" TIMESTAMP(3),
  CONSTRAINT "IdentityVerificationReview_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "IdentityVerificationReview"
  ADD CONSTRAINT "IdentityVerificationReview_voterId_fkey"
  FOREIGN KEY ("voterId") REFERENCES "Voter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "IdentityVerificationReview_voterId_status_idx" ON "IdentityVerificationReview"("voterId", "status");
CREATE INDEX "IdentityVerificationReview_providerReference_idx" ON "IdentityVerificationReview"("providerReference");
