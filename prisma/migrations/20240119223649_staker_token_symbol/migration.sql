/*
  Warnings:

  - Added the required column `symbol` to the `EthStaker` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "EthStaker" ADD COLUMN     "symbol" TEXT NOT NULL;
