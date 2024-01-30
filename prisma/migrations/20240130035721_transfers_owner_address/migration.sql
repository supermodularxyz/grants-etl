/*
  Warnings:

  - Added the required column `ownerAddress` to the `Erc20TransferHistory` table without a default value. This is not possible if the table is not empty.
  - Added the required column `ownerAddress` to the `NftTransferHistory` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Erc20TransferHistory" ADD COLUMN     "ownerAddress" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "NftTransferHistory" ADD COLUMN     "ownerAddress" TEXT NOT NULL;
