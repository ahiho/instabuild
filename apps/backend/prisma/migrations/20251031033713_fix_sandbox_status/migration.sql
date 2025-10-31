/*
  Warnings:

  - The `sandboxStatus` column on the `conversations` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "SandboxStatus" AS ENUM ('PENDING', 'READY', 'FAILED');

-- AlterTable
ALTER TABLE "conversations" DROP COLUMN "sandboxStatus",
ADD COLUMN     "sandboxStatus" "SandboxStatus" DEFAULT 'PENDING';

-- CreateIndex
CREATE INDEX "conversations_sandboxStatus_idx" ON "conversations"("sandboxStatus");
