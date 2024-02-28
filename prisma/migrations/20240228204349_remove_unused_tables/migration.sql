/*
  Warnings:

  - You are about to drop the `Erc20TransferHistory` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `EthStaker` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `NftTransferHistory` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PassportArchive` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Stamp` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `UserHistory` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `UserInternalTx` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `UserTx` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "PassportArchive" DROP CONSTRAINT "PassportArchive_userAddress_fkey";

-- DropTable
DROP TABLE "Erc20TransferHistory";

-- DropTable
DROP TABLE "EthStaker";

-- DropTable
DROP TABLE "NftTransferHistory";

-- DropTable
DROP TABLE "PassportArchive";

-- DropTable
DROP TABLE "Stamp";

-- DropTable
DROP TABLE "UserHistory";

-- DropTable
DROP TABLE "UserInternalTx";

-- DropTable
DROP TABLE "UserTx";
