/*
  Warnings:

  - You are about to drop the column `roundId` on the `MatchingDistribution` table. All the data in the column will be lost.
  - Added the required column `roundKey` to the `MatchingDistribution` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "MatchingDistribution" DROP CONSTRAINT "MatchingDistribution_roundId_fkey";

-- AlterTable
ALTER TABLE "MatchingDistribution" DROP COLUMN "roundId",
ADD COLUMN     "roundKey" INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE "MatchingDistribution" ADD CONSTRAINT "MatchingDistribution_roundKey_fkey" FOREIGN KEY ("roundKey") REFERENCES "Round"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
