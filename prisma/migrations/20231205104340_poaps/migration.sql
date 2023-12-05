-- CreateTable
CREATE TABLE "Poap" (
    "id" SERIAL NOT NULL,
    "poapId" INTEGER NOT NULL,
    "fancy_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "event_url" TEXT NOT NULL,
    "image_url" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "expiry_date" DATE NOT NULL,
    "supply" INTEGER NOT NULL,
    "tokenId" TEXT NOT NULL,
    "owner" TEXT NOT NULL,
    "chain" TEXT NOT NULL,

    CONSTRAINT "Poap_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Poap" ADD CONSTRAINT "Poap_owner_fkey" FOREIGN KEY ("owner") REFERENCES "User"("address") ON DELETE RESTRICT ON UPDATE CASCADE;
