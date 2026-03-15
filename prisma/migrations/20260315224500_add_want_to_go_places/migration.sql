-- CreateTable
CREATE TABLE "WantToGoPlace" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "placeKey" TEXT NOT NULL,
    "placeName" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WantToGoPlace_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WantToGoPlace_userId_placeKey_key" ON "WantToGoPlace"("userId", "placeKey");

-- CreateIndex
CREATE INDEX "WantToGoPlace_userId_createdAt_idx" ON "WantToGoPlace"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "WantToGoPlace_latitude_longitude_idx" ON "WantToGoPlace"("latitude", "longitude");

-- AddForeignKey
ALTER TABLE "WantToGoPlace" ADD CONSTRAINT "WantToGoPlace_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
