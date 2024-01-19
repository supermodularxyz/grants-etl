/*
  Warnings:

  - You are about to drop the column `internalTxIndexed` on the `UserInternalTx` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "UserInternalTx" DROP COLUMN "internalTxIndexed";

-- AlterTable
ALTER TABLE "UserTx" ADD COLUMN     "internalTxIndexed" BOOLEAN NOT NULL DEFAULT false;
