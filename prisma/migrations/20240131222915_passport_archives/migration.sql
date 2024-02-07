-- AlterTable
ALTER TABLE "Round" ADD COLUMN     "addedLastPassports" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "PassportArchive" (
    "id" SERIAL NOT NULL,
    "userAddress" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "scoreThreshold" DOUBLE PRECISION NOT NULL,
    "scoreTimestamp" BIGINT NOT NULL,
    "updatedAt" INTEGER NOT NULL,
    "stamps" JSONB,
    "roundId" TEXT NOT NULL,

    CONSTRAINT "PassportArchive_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PassportArchive_userAddress_key" ON "PassportArchive"("userAddress");

-- CreateIndex
CREATE UNIQUE INDEX "PassportArchive_userAddress_roundId_key" ON "PassportArchive"("userAddress", "roundId");

-- AddForeignKey
ALTER TABLE "PassportArchive" ADD CONSTRAINT "PassportArchive_userAddress_fkey" FOREIGN KEY ("userAddress") REFERENCES "User"("address") ON DELETE RESTRICT ON UPDATE CASCADE;
