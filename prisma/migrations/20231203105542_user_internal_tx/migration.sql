-- CreateTable
CREATE TABLE "UserInternalTx" (
    "id" SERIAL NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "block" BIGINT NOT NULL,
    "success" BOOLEAN NOT NULL DEFAULT false,
    "hash" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "from" TEXT NOT NULL,
    "to" TEXT NOT NULL,
    "fromName" TEXT NOT NULL DEFAULT '',
    "toName" TEXT NOT NULL DEFAULT '',
    "gasLimit" INTEGER NOT NULL,
    "chainId" INTEGER NOT NULL,

    CONSTRAINT "UserInternalTx_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserInternalTx_hash_to_from_chainId_key" ON "UserInternalTx"("hash", "to", "from", "chainId");
