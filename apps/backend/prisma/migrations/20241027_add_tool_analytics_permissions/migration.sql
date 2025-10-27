-- Add tool analytics aggregation table
CREATE TABLE "tool_analytics" (
  "id" TEXT NOT NULL,
  "tool_name" VARCHAR(100) NOT NULL,
  "date" DATE NOT NULL,
  "execution_count" INTEGER NOT NULL DEFAULT 0,
  "success_count" INTEGER NOT NULL DEFAULT 0,
  "total_execution_time_ms" BIGINT NOT NULL DEFAULT 0,
  "error_count" INTEGER NOT NULL DEFAULT 0,
  "unique_users" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "tool_analytics_pkey" PRIMARY KEY ("id")
);

-- Add tool permissions table
CREATE TABLE "tool_permissions" (
  "id" TEXT NOT NULL,
  "tool_name" VARCHAR(100) NOT NULL,
  "permission_type" VARCHAR(50) NOT NULL,
  "resource_pattern" VARCHAR(500),
  "user_id" VARCHAR(100),
  "role" VARCHAR(50),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "tool_permissions_pkey" PRIMARY KEY ("id")
);

-- Add model usage tracking table
CREATE TABLE "model_usage" (
  "id" TEXT NOT NULL,
  "conversation_id" TEXT NOT NULL,
  "model_name" VARCHAR(100) NOT NULL,
  "model_tier" VARCHAR(20) NOT NULL,
  "complexity_level" VARCHAR(20) NOT NULL,
  "token_count" INTEGER,
  "estimated_cost" DECIMAL(10,6),
  "execution_time_ms" INTEGER,
  "success" BOOLEAN NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "model_usage_pkey" PRIMARY KEY ("id")
);

-- Add indexes for performance
CREATE UNIQUE INDEX "tool_analytics_tool_name_date_key" ON "tool_analytics"("tool_name", "date");
CREATE INDEX "tool_permissions_tool_name_idx" ON "tool_permissions"("tool_name");
CREATE INDEX "tool_permissions_user_id_idx" ON "tool_permissions"("user_id");
CREATE INDEX "tool_permissions_role_idx" ON "tool_permissions"("role");
CREATE INDEX "model_usage_conversation_id_idx" ON "model_usage"("conversation_id");
CREATE INDEX "model_usage_model_name_idx" ON "model_usage"("model_name");
CREATE INDEX "model_usage_created_at_idx" ON "model_usage"("created_at");

-- Add foreign key constraints
ALTER TABLE "model_usage" ADD CONSTRAINT "model_usage_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add additional indexes to existing tool_executions table for analytics
CREATE INDEX IF NOT EXISTS "tool_executions_tool_name_idx" ON "tool_executions"("toolName");
CREATE INDEX IF NOT EXISTS "tool_executions_status_idx" ON "tool_executions"("status");
CREATE INDEX IF NOT EXISTS "tool_executions_start_time_idx" ON "tool_executions"("startTime");
CREATE INDEX IF NOT EXISTS "tool_executions_user_id_idx" ON "tool_executions"("userId");