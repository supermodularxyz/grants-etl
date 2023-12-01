/*
  Warnings:

  - Changed the type of `chainId` on the `UserTx` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "UserTx" DROP COLUMN "chainId",
ADD COLUMN     "chainId" INTEGER NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "UserTx_hash_nonce_from_chainId_key" ON "UserTx"("hash", "nonce", "from", "chainId");
