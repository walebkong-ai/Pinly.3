-- CreateTable
CREATE TABLE "PostCollection" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PostCollection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PostCollectionItem" (
    "id" TEXT NOT NULL,
    "collectionId" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PostCollectionItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PostCollection_userId_updatedAt_idx" ON "PostCollection"("userId", "updatedAt");

-- CreateIndex
CREATE INDEX "PostCollection_userId_createdAt_idx" ON "PostCollection"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PostCollectionItem_collectionId_postId_key" ON "PostCollectionItem"("collectionId", "postId");

-- CreateIndex
CREATE INDEX "PostCollectionItem_postId_idx" ON "PostCollectionItem"("postId");

-- CreateIndex
CREATE INDEX "PostCollectionItem_collectionId_createdAt_idx" ON "PostCollectionItem"("collectionId", "createdAt");

-- AddForeignKey
ALTER TABLE "PostCollection" ADD CONSTRAINT "PostCollection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostCollectionItem" ADD CONSTRAINT "PostCollectionItem_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "PostCollection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostCollectionItem" ADD CONSTRAINT "PostCollectionItem_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;
