-- CreateTable
CREATE TABLE "UserHistory" (
    "id" SERIAL NOT NULL,
    "wallet" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "block_number" BIGINT NOT NULL,
    "block_time" TIMESTAMP(3) NOT NULL,
    "tx_hash" TEXT NOT NULL,
    "neighbor_address" TEXT NOT NULL,
    "symbol" TEXT NOT NULL DEFAULT '',
    "token_amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "chain" TEXT NOT NULL,

    CONSTRAINT "UserHistory_pkey" PRIMARY KEY ("id")
);
