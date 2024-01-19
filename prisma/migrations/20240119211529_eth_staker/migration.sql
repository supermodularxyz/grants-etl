-- CreateTable
CREATE TABLE "EthStaker" (
    "id" SERIAL NOT NULL,
    "wallet" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "balance" NUMERIC NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EthStaker_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EthStaker_wallet_token_key" ON "EthStaker"("wallet", "token");
