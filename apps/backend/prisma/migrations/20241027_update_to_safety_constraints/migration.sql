-- Drop the old tool_permissions table
DROP TABLE IF EXISTS "tool_permissions";

-- Create tool_safety_constraints table
CREATE TABLE "tool_safety_constraints" (
  "id" TEXT NOT NULL,
  "tool_name" VARCHAR(100) NOT NULL,
  "constraint_type" VARCHAR(50) NOT NULL,
  "resource_pattern" VARCHAR(500),
  "constraint_config" JSONB,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "tool_safety_constraints_pkey" PRIMARY KEY ("id")
);

-- Add indexes for performance
CREATE INDEX "tool_safety_constraints_tool_name_idx" ON "tool_safety_constraints"("tool_name");
CREATE INDEX "tool_safety_constraints_constraint_type_idx" ON "tool_safety_constraints"("constraint_type");
CREATE INDEX "tool_safety_constraints_enabled_idx" ON "tool_safety_constraints"("enabled");

-- Insert default safety constraints
INSERT INTO "tool_safety_constraints" ("id", "tool_name", "constraint_type", "resource_pattern", "constraint_config", "enabled") VALUES
  ('sc_fs_read_001', NULL, 'path_validation', 'files:src/**,docs/**,public/**', '{"allowedPaths": ["src/**", "docs/**", "public/**"]}', true),
  ('sc_fs_write_001', NULL, 'path_validation', 'files:src/**,docs/**', '{"allowedPaths": ["src/**", "docs/**"], "blockedPaths": ["node_modules/**", ".git/**"]}', true),
  ('sc_fs_write_002', NULL, 'size_limit', NULL, '{"maxSizeBytes": 1048576}', true),
  ('sc_fs_delete_001', NULL, 'path_validation', 'files:src/**,docs/**', '{"allowedPaths": ["src/**", "docs/**"], "blockedPaths": ["src/core/**", "package.json", "package-lock.json"]}', true),
  ('sc_upload_001', NULL, 'size_limit', NULL, '{"maxSizeBytes": 10485760}', true),
  ('sc_upload_002', NULL, 'content_filter', NULL, '{"allowedTypes": ["image/jpeg", "image/png", "image/gif", "image/webp", "text/plain", "application/json"]}', true),
  ('sc_rate_limit_001', NULL, 'rate_limit', NULL, '{"maxRequestsPerMinute": 60}', true);