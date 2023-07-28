-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "address" TEXT NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Program" (
    "id" SERIAL NOT NULL,
    "programAddress" TEXT NOT NULL,

    CONSTRAINT "Program_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Round" (
    "id" SERIAL NOT NULL,
    "amountUSD" INTEGER NOT NULL,
    "votes" INTEGER NOT NULL,
    "token" TEXT NOT NULL,
    "matchAmount" TEXT NOT NULL,
    "matchAmountUSD" DOUBLE PRECISION NOT NULL,
    "uniqueContributors" INTEGER NOT NULL,
    "applicationMetaPtr" TEXT NOT NULL,
    "applicationMetadata" JSONB NOT NULL,
    "metaPtr" TEXT NOT NULL,
    "metadata" JSONB NOT NULL,
    "applicationsStartTime" BIGINT NOT NULL,
    "applicationsEndTime" BIGINT NOT NULL,
    "roundStartTime" BIGINT NOT NULL,
    "roundEndTime" BIGINT NOT NULL,
    "createdAtBlock" INTEGER NOT NULL,
    "updatedAtBlock" INTEGER NOT NULL,
    "chainId" INTEGER NOT NULL,
    "roundId" TEXT NOT NULL,
    "programContractAddress" TEXT,

    CONSTRAINT "Round_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectsInRounds" (
    "roundId" INTEGER NOT NULL,
    "projectId" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "amountUSD" DOUBLE PRECISION NOT NULL,
    "votes" INTEGER NOT NULL,
    "uniqueContributors" INTEGER NOT NULL,
    "project_name" TEXT NOT NULL,
    "project_desc" TEXT NOT NULL,
    "project_website" TEXT NOT NULL,
    "applicationMetadata" JSONB,

    CONSTRAINT "ProjectsInRounds_pkey" PRIMARY KEY ("roundId","projectId")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" SERIAL NOT NULL,
    "projectKey" TEXT NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vote" (
    "id" SERIAL NOT NULL,
    "transaction" TEXT NOT NULL,
    "blockNumber" INTEGER NOT NULL,
    "projectId" INTEGER NOT NULL,
    "applicationId" TEXT,
    "roundId" INTEGER NOT NULL,
    "voter" TEXT NOT NULL,
    "grantAddress" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "amount" TEXT NOT NULL,
    "amountUSD" DOUBLE PRECISION NOT NULL,
    "amountRoundToken" TEXT NOT NULL,

    CONSTRAINT "Vote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_address_key" ON "User"("address");

-- CreateIndex
CREATE UNIQUE INDEX "Program_programAddress_key" ON "Program"("programAddress");

-- CreateIndex
CREATE UNIQUE INDEX "Round_chainId_roundId_key" ON "Round"("chainId", "roundId");

-- CreateIndex
CREATE UNIQUE INDEX "Project_projectKey_key" ON "Project"("projectKey");

-- CreateIndex
CREATE UNIQUE INDEX "Vote_transaction_roundId_key" ON "Vote"("transaction", "roundId");

-- AddForeignKey
ALTER TABLE "Round" ADD CONSTRAINT "Round_programContractAddress_fkey" FOREIGN KEY ("programContractAddress") REFERENCES "Program"("programAddress") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectsInRounds" ADD CONSTRAINT "ProjectsInRounds_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "Round"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectsInRounds" ADD CONSTRAINT "ProjectsInRounds_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vote" ADD CONSTRAINT "Vote_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vote" ADD CONSTRAINT "Vote_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "Round"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vote" ADD CONSTRAINT "Vote_voter_fkey" FOREIGN KEY ("voter") REFERENCES "User"("address") ON DELETE RESTRICT ON UPDATE CASCADE;
