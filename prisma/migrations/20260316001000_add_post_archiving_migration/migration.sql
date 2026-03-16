ALTER TABLE "Post"
ADD COLUMN IF NOT EXISTS "isArchived" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS "Post_userId_isArchived_createdAt_idx"
ON "Post"("userId", "isArchived", "createdAt");

CREATE INDEX IF NOT EXISTS "Post_userId_isArchived_visitedAt_idx"
ON "Post"("userId", "isArchived", "visitedAt");
