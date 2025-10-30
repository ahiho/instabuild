-- AlterTable
ALTER TABLE "conversations" ADD COLUMN     "sandboxPort" INTEGER,
ADD COLUMN     "sandboxPublicUrl" TEXT;

-- CreateIndex
CREATE INDEX "conversations_sandboxPort_idx" ON "conversations"("sandboxPort");
