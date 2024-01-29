-- CreateTable
CREATE TABLE "Erc20TransferHistory" (
    "id" SERIAL NOT NULL,
    "token_name" TEXT NOT NULL,
    "token_symbol" TEXT NOT NULL,
    "token_decimals" INTEGER NOT NULL,
    "from_address" TEXT NOT NULL,
    "from_address_label" TEXT,
    "to_address" TEXT NOT NULL,
    "to_address_label" TEXT,
    "address" TEXT NOT NULL,
    "block_hash" TEXT NOT NULL,
    "block_number" INTEGER NOT NULL,
    "block_timestamp" TIMESTAMP(3) NOT NULL,
    "transaction_hash" TEXT NOT NULL,
    "transaction_index" INTEGER NOT NULL,
    "log_index" INTEGER NOT NULL,
    "value" DECIMAL NOT NULL,
    "possible_spam" BOOLEAN NOT NULL,
    "value_decimal" DECIMAL NOT NULL,
    "verified_contract" BOOLEAN NOT NULL,
    "chainId" INTEGER NOT NULL,

    CONSTRAINT "Erc20TransferHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NftTransferHistory" (
    "id" SERIAL NOT NULL,
    "block_number" INTEGER NOT NULL,
    "block_timestamp" TIMESTAMP(3) NOT NULL,
    "block_hash" TEXT NOT NULL,
    "transaction_hash" TEXT NOT NULL,
    "transaction_index" INTEGER NOT NULL,
    "log_index" INTEGER NOT NULL,
    "value" DECIMAL NOT NULL,
    "contract_type" TEXT NOT NULL,
    "transaction_type" TEXT NOT NULL,
    "token_address" TEXT NOT NULL,
    "token_id" TEXT NOT NULL,
    "from_address" TEXT NOT NULL,
    "from_address_label" TEXT,
    "to_address" TEXT NOT NULL,
    "to_address_label" TEXT,
    "amount" INTEGER NOT NULL,
    "verified" INTEGER NOT NULL,
    "operator" TEXT,
    "possible_spam" BOOLEAN NOT NULL,
    "verified_collection" BOOLEAN NOT NULL,
    "chainId" INTEGER NOT NULL,

    CONSTRAINT "NftTransferHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Erc20TransferHistory_from_address_to_address_address_log_in_key" ON "Erc20TransferHistory"("from_address", "to_address", "address", "log_index", "block_number");

-- CreateIndex
CREATE UNIQUE INDEX "NftTransferHistory_from_address_to_address_token_address_lo_key" ON "NftTransferHistory"("from_address", "to_address", "token_address", "log_index", "block_number", "chainId");
