/*
  Warnings:

  - A unique constraint covering the columns `[fancy_id,owner,tokenId]` on the table `Poap` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Poap_fancy_id_owner_tokenId_key" ON "Poap"("fancy_id", "owner", "tokenId");
