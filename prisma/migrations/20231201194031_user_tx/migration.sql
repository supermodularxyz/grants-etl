-- CreateTable
CREATE TABLE "UserTx" (
    "id" SERIAL NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "block" BIGINT NOT NULL,
    "status" TEXT NOT NULL,
    "method" TEXT,
    "hash" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "toName" TEXT NOT NULL DEFAULT '',
    "fromName" TEXT NOT NULL DEFAULT '',
    "to" TEXT NOT NULL,
    "from" TEXT NOT NULL,
    "gasUsed" BIGINT NOT NULL,
    "nonce" INTEGER NOT NULL,
    "chainId" TEXT NOT NULL,

    CONSTRAINT "UserTx_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserTx_hash_nonce_from_chainId_key" ON "UserTx"("hash", "nonce", "from", "chainId");
