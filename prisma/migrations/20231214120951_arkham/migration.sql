-- CreateTable
CREATE TABLE "Arkham" (
    "id" SERIAL NOT NULL,
    "address" TEXT NOT NULL,
    "chain" TEXT NOT NULL,
    "entity_name" TEXT,
    "entity_note" TEXT,
    "entity_id" TEXT,
    "entity_type" TEXT,
    "entity_service" TEXT,
    "entity_addresses" JSONB,
    "entity_website" TEXT,
    "entity_twitter" TEXT,
    "entity_crunchbase" TEXT,
    "entity_linkedin" TEXT,
    "label_name" TEXT,
    "label_address" TEXT,
    "label_chainType" TEXT,
    "contract" BOOLEAN NOT NULL,
    "isUserAddress" BOOLEAN NOT NULL,

    CONSTRAINT "Arkham_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Arkham_address_chain_key" ON "Arkham"("address", "chain");

-- AddForeignKey
ALTER TABLE "Arkham" ADD CONSTRAINT "Arkham_address_fkey" FOREIGN KEY ("address") REFERENCES "User"("address") ON DELETE RESTRICT ON UPDATE CASCADE;
