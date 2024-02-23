-- AlterTable
ALTER TABLE "Round" ALTER COLUMN "applicationsStartTime" DROP NOT NULL,
ALTER COLUMN "applicationsEndTime" DROP NOT NULL,
ALTER COLUMN "roundStartTime" DROP NOT NULL,
ALTER COLUMN "roundEndTime" DROP NOT NULL;
