/*
  Warnings:

  - You are about to drop the column `stamps` on the `Passport` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Passport" DROP COLUMN "stamps";

-- CreateTable
CREATE TABLE "Stamp" (
    "id" SERIAL NOT NULL,
    "address" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "stamp" JSONB NOT NULL,
    "created_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "Stamp_pkey" PRIMARY KEY ("id")
);
