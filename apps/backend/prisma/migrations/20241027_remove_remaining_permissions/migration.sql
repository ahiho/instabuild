-- Remove any remaining permission-related tables and data
-- This migration ensures complete removal of the permission system

-- Drop any remaining permission-related tables if they exist
DROP TABLE IF EXISTS "user_roles";
DROP TABLE IF EXISTS "permission_matrices";
DROP TABLE IF EXISTS "role_permissions";

-- Drop any remaining indexes related to permissions
DROP INDEX IF EXISTS "tool_permissions_tool_name_idx";
DROP INDEX IF EXISTS "tool_permissions_user_id_idx";
DROP INDEX IF EXISTS "tool_permissions_role_idx";

-- The tool_permissions table was already dropped in the previous migration
-- but we ensure it's gone here as well
DROP TABLE IF EXISTS "tool_permissions";

-- Clean up any permission-related columns from existing tables if they exist
-- (This is a safety measure in case any were added)
ALTER TABLE "tool_executions" DROP COLUMN IF EXISTS "permission_validated";
ALTER TABLE "tool_executions" DROP COLUMN IF EXISTS "user_role";
ALTER TABLE "conversations" DROP COLUMN IF EXISTS "user_role";
ALTER TABLE "chat_messages" DROP COLUMN IF EXISTS "permission_level";