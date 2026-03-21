-- AlterTable
ALTER TABLE "User"
ADD COLUMN "privacyAcceptedAt" TIMESTAMP(3),
ADD COLUMN "privacyVersion" TEXT,
ADD COLUMN "termsAcceptedAt" TIMESTAMP(3),
ADD COLUMN "termsVersion" TEXT;
