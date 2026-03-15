CREATE TABLE "PostVisitTag" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PostVisitTag_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PostVisitTag_postId_userId_key" ON "PostVisitTag"("postId", "userId");
CREATE INDEX "PostVisitTag_postId_createdAt_idx" ON "PostVisitTag"("postId", "createdAt");
CREATE INDEX "PostVisitTag_userId_idx" ON "PostVisitTag"("userId");

ALTER TABLE "PostVisitTag"
ADD CONSTRAINT "PostVisitTag_postId_fkey"
FOREIGN KEY ("postId") REFERENCES "Post"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

ALTER TABLE "PostVisitTag"
ADD CONSTRAINT "PostVisitTag_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;
