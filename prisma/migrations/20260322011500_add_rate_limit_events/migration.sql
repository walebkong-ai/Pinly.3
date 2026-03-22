-- CreateTable
CREATE TABLE "RateLimitEvent" (
    "id" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "bucketKeyHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RateLimitEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RateLimitEvent_scope_bucketKeyHash_createdAt_idx" ON "RateLimitEvent"("scope", "bucketKeyHash", "createdAt");

-- CreateIndex
CREATE INDEX "RateLimitEvent_expiresAt_idx" ON "RateLimitEvent"("expiresAt");
