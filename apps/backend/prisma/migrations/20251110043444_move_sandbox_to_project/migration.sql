/*
  Warnings:

  - You are about to drop the column `sandboxCreatedAt` on the `conversations` table. All the data in the column will be lost.
  - You are about to drop the column `sandboxId` on the `conversations` table. All the data in the column will be lost.
  - You are about to drop the column `sandboxPort` on the `conversations` table. All the data in the column will be lost.
  - You are about to drop the column `sandboxPublicUrl` on the `conversations` table. All the data in the column will be lost.
  - You are about to drop the column `sandboxStatus` on the `conversations` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "public"."conversations_projectId_sandboxStatus_idx";

-- DropIndex
DROP INDEX "public"."conversations_projectId_sandboxStatus_sandboxCreatedAt_idx";

-- AlterTable
ALTER TABLE "conversations" DROP COLUMN "sandboxCreatedAt",
DROP COLUMN "sandboxId",
DROP COLUMN "sandboxPort",
DROP COLUMN "sandboxPublicUrl",
DROP COLUMN "sandboxStatus";

-- AlterTable
ALTER TABLE "landing_pages" ADD COLUMN     "commitSha" TEXT,
ADD COLUMN     "currentVersionNumber" INTEGER NOT NULL DEFAULT 0,
ALTER COLUMN "githubRepoUrl" DROP NOT NULL;

-- AlterTable
ALTER TABLE "projects" ADD COLUMN     "sandboxCreatedAt" TIMESTAMP(3),
ADD COLUMN     "sandboxId" TEXT,
ADD COLUMN     "sandboxPort" INTEGER,
ADD COLUMN     "sandboxPublicUrl" TEXT,
ADD COLUMN     "sandboxStatus" "SandboxStatus";

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "maxConcurrentSandboxes" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "subscriptionTier" TEXT NOT NULL DEFAULT 'free';

-- CreateIndex
CREATE INDEX "projects_userId_sandboxStatus_idx" ON "projects"("userId", "sandboxStatus");
