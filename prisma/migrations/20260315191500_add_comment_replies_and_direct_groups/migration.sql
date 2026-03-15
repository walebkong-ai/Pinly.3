ALTER TABLE "Comment"
ADD COLUMN "parentId" TEXT;

ALTER TABLE "Group"
ADD COLUMN "isDirect" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "directPairKey" TEXT;

CREATE UNIQUE INDEX "Group_directPairKey_key" ON "Group"("directPairKey");
CREATE INDEX "Comment_parentId_createdAt_idx" ON "Comment"("parentId", "createdAt");

ALTER TABLE "Comment"
ADD CONSTRAINT "Comment_parentId_fkey"
FOREIGN KEY ("parentId") REFERENCES "Comment"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;
