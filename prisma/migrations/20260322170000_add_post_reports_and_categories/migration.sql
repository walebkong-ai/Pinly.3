CREATE TYPE "ReportCategory" AS ENUM (
  'SPAM',
  'HARASSMENT',
  'HATE_OR_ABUSE',
  'NUDITY_OR_SEXUAL_CONTENT',
  'VIOLENCE_OR_DANGEROUS',
  'IMPERSONATION',
  'PRIVACY_CONCERN',
  'OTHER'
);

ALTER TABLE "Report"
ADD COLUMN "postId" TEXT,
ADD COLUMN "category" "ReportCategory" NOT NULL DEFAULT 'OTHER',
ADD COLUMN "dedupeKey" TEXT;

ALTER TABLE "Report"
ADD CONSTRAINT "Report_postId_fkey"
FOREIGN KEY ("postId") REFERENCES "Post"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

CREATE UNIQUE INDEX "Report_dedupeKey_key" ON "Report"("dedupeKey");
CREATE INDEX "Report_postId_idx" ON "Report"("postId");
CREATE INDEX "Report_category_idx" ON "Report"("category");
