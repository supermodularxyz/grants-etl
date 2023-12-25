-- CreateTable
CREATE TABLE "MatchingDistribution" (
    "id" SERIAL NOT NULL,
    "contributionsCount" INTEGER NOT NULL,
    "projectPayoutAddress" TEXT NOT NULL,
    "applicationId" INTEGER NOT NULL,
    "projectId" TEXT NOT NULL,
    "matchPoolPercentage" DOUBLE PRECISION NOT NULL,
    "projectName" TEXT NOT NULL,
    "matchAmountInTokenHex" TEXT NOT NULL,
    "matchAmountInToken" TEXT NOT NULL,
    "originalMatchAmountInTokenHex" TEXT NOT NULL,
    "originalMatchAmountInToken" TEXT NOT NULL,
    "index" INTEGER NOT NULL,
    "chainId" INTEGER NOT NULL,
    "roundId" INTEGER NOT NULL,

    CONSTRAINT "MatchingDistribution_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MatchingDistribution_projectName_projectId_applicationId_ma_key" ON "MatchingDistribution"("projectName", "projectId", "applicationId", "matchPoolPercentage", "contributionsCount");

-- AddForeignKey
ALTER TABLE "MatchingDistribution" ADD CONSTRAINT "MatchingDistribution_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "Round"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
