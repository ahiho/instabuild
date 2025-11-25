-- CreateIndex
CREATE INDEX "conversations_projectId_sandboxStatus_idx" ON "conversations"("projectId", "sandboxStatus");

-- CreateIndex
CREATE INDEX "conversations_projectId_sandboxStatus_sandboxCreatedAt_idx" ON "conversations"("projectId", "sandboxStatus", "sandboxCreatedAt");
