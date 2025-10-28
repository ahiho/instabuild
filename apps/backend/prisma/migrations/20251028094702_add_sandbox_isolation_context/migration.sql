-- AlterTable
ALTER TABLE "conversations" ADD COLUMN     "sandboxCreatedAt" TIMESTAMP(3),
ADD COLUMN     "sandboxId" TEXT,
ADD COLUMN     "sandboxStatus" VARCHAR(50);

-- CreateTable
CREATE TABLE "tool_analytics" (
    "id" TEXT NOT NULL,
    "toolName" VARCHAR(100) NOT NULL,
    "date" DATE NOT NULL,
    "executionCount" INTEGER NOT NULL DEFAULT 0,
    "successCount" INTEGER NOT NULL DEFAULT 0,
    "totalExecutionTimeMs" BIGINT NOT NULL DEFAULT 0,
    "errorCount" INTEGER NOT NULL DEFAULT 0,
    "uniqueUsers" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tool_analytics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tool_safety_constraints" (
    "id" TEXT NOT NULL,
    "toolName" VARCHAR(100),
    "constraintType" VARCHAR(50) NOT NULL,
    "resourcePattern" VARCHAR(500),
    "constraintConfig" JSONB,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tool_safety_constraints_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "model_usage" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "modelName" VARCHAR(100) NOT NULL,
    "modelTier" VARCHAR(20) NOT NULL,
    "complexityLevel" VARCHAR(20) NOT NULL,
    "tokenCount" INTEGER,
    "estimatedCost" DECIMAL(10,6),
    "executionTimeMs" INTEGER,
    "success" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "model_usage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tool_analytics_toolName_date_key" ON "tool_analytics"("toolName", "date");

-- CreateIndex
CREATE INDEX "tool_safety_constraints_toolName_idx" ON "tool_safety_constraints"("toolName");

-- CreateIndex
CREATE INDEX "tool_safety_constraints_constraintType_idx" ON "tool_safety_constraints"("constraintType");

-- CreateIndex
CREATE INDEX "tool_safety_constraints_enabled_idx" ON "tool_safety_constraints"("enabled");

-- CreateIndex
CREATE INDEX "model_usage_conversationId_idx" ON "model_usage"("conversationId");

-- CreateIndex
CREATE INDEX "model_usage_modelName_idx" ON "model_usage"("modelName");

-- CreateIndex
CREATE INDEX "model_usage_createdAt_idx" ON "model_usage"("createdAt");

-- CreateIndex
CREATE INDEX "conversations_sandboxId_idx" ON "conversations"("sandboxId");

-- CreateIndex
CREATE INDEX "tool_executions_toolName_idx" ON "tool_executions"("toolName");

-- CreateIndex
CREATE INDEX "tool_executions_status_idx" ON "tool_executions"("status");

-- CreateIndex
CREATE INDEX "tool_executions_startTime_idx" ON "tool_executions"("startTime");

-- CreateIndex
CREATE INDEX "tool_executions_userId_idx" ON "tool_executions"("userId");

-- AddForeignKey
ALTER TABLE "model_usage" ADD CONSTRAINT "model_usage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
