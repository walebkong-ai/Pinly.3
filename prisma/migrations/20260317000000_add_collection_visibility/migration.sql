-- CreateEnum
CREATE TYPE "CollectionVisibility" AS ENUM ('public', 'friends', 'private');

-- AlterTable
ALTER TABLE "PostCollection" ADD COLUMN "visibility" "CollectionVisibility" NOT NULL DEFAULT 'private';

-- CreateIndex
CREATE INDEX "PostCollection_userId_visibility_idx" ON "PostCollection"("userId", "visibility");
