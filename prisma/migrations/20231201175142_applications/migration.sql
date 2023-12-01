/*
  Warnings:

  - You are about to drop the `ProjectsInRounds` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "ProjectsInRounds" DROP CONSTRAINT "ProjectsInRounds_projectId_fkey";

-- DropForeignKey
ALTER TABLE "ProjectsInRounds" DROP CONSTRAINT "ProjectsInRounds_roundId_fkey";

-- DropTable
DROP TABLE "ProjectsInRounds";

-- CreateTable
CREATE TABLE "ApplicationsInRounds" (
    "roundId" INTEGER NOT NULL,
    "projectId" INTEGER NOT NULL,
    "applicationId" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "amountUSD" DOUBLE PRECISION NOT NULL,
    "votes" INTEGER NOT NULL,
    "payoutAddress" TEXT NOT NULL,
    "uniqueContributors" INTEGER NOT NULL,
    "project_name" TEXT NOT NULL,
    "project_desc" TEXT NOT NULL,
    "project_website" TEXT NOT NULL,
    "user_github" TEXT,
    "project_github" TEXT,
    "applicationMetadata" JSONB,
    "transaction" TEXT NOT NULL,
    "tx_gasPrice" BIGINT,
    "tx_gasSpent" BIGINT,

    CONSTRAINT "ApplicationsInRounds_pkey" PRIMARY KEY ("roundId","projectId","applicationId")
);

-- AddForeignKey
ALTER TABLE "ApplicationsInRounds" ADD CONSTRAINT "ApplicationsInRounds_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "Round"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationsInRounds" ADD CONSTRAINT "ApplicationsInRounds_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
