-- AlterTable
ALTER TABLE "conversations" ADD COLUMN     "lastAccessedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "conversations_sandboxStatus_idx" ON "conversations"("sandboxStatus");

-- CreateIndex
CREATE INDEX "conversations_lastAccessedAt_idx" ON "conversations"("lastAccessedAt");
