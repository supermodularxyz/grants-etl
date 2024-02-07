/*
  Warnings:

  - Added the required column `chainId` to the `PassportArchive` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "PassportArchive" ADD COLUMN     "chainId" INTEGER NOT NULL;
