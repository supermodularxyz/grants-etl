/*
  Warnings:

  - Added the required column `created` to the `Poap` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Poap" ADD COLUMN     "created" TIMESTAMP(3) NOT NULL;
