-- CreateTable
CREATE TABLE "AlphaMatching" (
    "id" BIGSERIAL NOT NULL,
    "round_num" BIGINT,
    "grant_id" VARCHAR(255),
    "title" VARCHAR(255),
    "match_amount_dai" DOUBLE PRECISION,
    "sub_round_slug" VARCHAR(255),

    CONSTRAINT "AlphaMatching_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AlphaRoundGranteeAddresses" (
    "id" BIGSERIAL NOT NULL,
    "title" VARCHAR(255),
    "address" VARCHAR(255),
    "round_name" VARCHAR(255),
    "round_address" VARCHAR(255),

    CONSTRAINT "AlphaRoundGranteeAddresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AlphaRoundsAllDonations" (
    "id" BIGSERIAL NOT NULL,
    "title" VARCHAR(255),
    "round_name" VARCHAR(255),
    "usd_amount" DOUBLE PRECISION,
    "block_time" TIMESTAMPTZ(6),
    "donor" VARCHAR(255),
    "token_quantity" DECIMAL(65,30),

    CONSTRAINT "AlphaRoundsAllDonations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cgrantsContributions" (
    "id" BIGSERIAL NOT NULL,
    "voter_address" TEXT,
    "grant_id" BIGINT,
    "created_on" TIMESTAMP(3),
    "amountUSD" DOUBLE PRECISION,
    "checkout_type" TEXT,
    "tx_id" TEXT,
    "match" BOOLEAN,
    "token_address" TEXT,
    "token_symbol" TEXT,
    "amountToken" DOUBLE PRECISION,
    "gas_price" DOUBLE PRECISION,
    "anonymous" BOOLEAN,

    CONSTRAINT "cgrantsContributions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cgrantsGrants" (
    "id" BIGSERIAL NOT NULL,
    "grantid" BIGINT,
    "createdon" TIMESTAMPTZ(6),
    "name" VARCHAR(255),
    "slug" VARCHAR(255),
    "websiteurl" VARCHAR(255),
    "logo" VARCHAR(255),
    "payoutaddress" VARCHAR(255),
    "newgrantid" TEXT,
    "twitter" VARCHAR(255),
    "github" VARCHAR(255),
    "region" VARCHAR(255),
    "description" TEXT,

    CONSTRAINT "cgrantsGrants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cgrantsMatches" (
    "id" BIGSERIAL NOT NULL,
    "round_num" BIGINT,
    "sub_round_id" BIGINT,
    "sub_round_slug" VARCHAR(255),
    "grant_id" BIGINT,
    "match_amount" DOUBLE PRECISION,

    CONSTRAINT "cgrantsMatches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cgrantsRoundTimings" (
    "id" BIGSERIAL NOT NULL,
    "round_num" BIGINT,
    "start_date" TIMESTAMPTZ(6),
    "end_date" TIMESTAMPTZ(6),

    CONSTRAINT "cgrantsRoundTimings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GrantsProgramRoundsOnGrantsStack" (
    "id" BIGSERIAL NOT NULL,
    "program" VARCHAR(255),
    "type" VARCHAR(255),
    "chain_name" VARCHAR(255),
    "chain_id" BIGINT,
    "round_name" VARCHAR(255),
    "round_id" VARCHAR(255),
    "matching_pool" BIGINT,
    "starting_time" TIMESTAMPTZ(6),

    CONSTRAINT "GrantsProgramRoundsOnGrantsStack_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GrantsByRound" (
    "id" BIGSERIAL NOT NULL,
    "round_num" BIGINT,
    "title" VARCHAR(255),
    "total_unique_contributors" BIGINT,
    "total_contributions" BIGINT,
    "total_crowdfund_amount" DOUBLE PRECISION,
    "total_match_amount" DOUBLE PRECISION,
    "total_funding" DOUBLE PRECISION,
    "themes" VARCHAR(255),

    CONSTRAINT "GrantsByRound_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrgName" (
    "id" BIGSERIAL NOT NULL,
    "round_num" BIGINT,
    "title" VARCHAR(255),
    "total_unique_contributors" BIGINT,
    "total_contributions" BIGINT,
    "total_crowdfund_amount" DOUBLE PRECISION,
    "total_match_amount" DOUBLE PRECISION,
    "total_funding" DOUBLE PRECISION,
    "themes" VARCHAR(255),
    "name" VARCHAR(255),
    "grantid" BIGINT,
    "payoutaddress" VARCHAR(255),
    "github" VARCHAR(255),
    "substring" TEXT,

    CONSTRAINT "OrgName_pkey" PRIMARY KEY ("id")
);
