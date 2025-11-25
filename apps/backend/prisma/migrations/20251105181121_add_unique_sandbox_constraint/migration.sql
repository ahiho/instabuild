-- Create unique constraint to prevent duplicate READY sandboxes per project
-- This ensures only ONE conversation per project can have sandboxStatus = 'READY'
-- The WHERE clause filters to only READY status, allowing multiple PENDING/FAILED
CREATE UNIQUE INDEX "unique_ready_sandbox_per_project" ON "conversations"("projectId", "sandboxStatus") WHERE "sandboxStatus" = 'READY';
