-- Add columns to track staging data deletion
-- This migration adds fields to t_import_sessions for tracking when staging data is deleted

-- Add staging_data_deleted flag
ALTER TABLE t_import_sessions
ADD COLUMN IF NOT EXISTS staging_data_deleted BOOLEAN DEFAULT FALSE;

-- Add staging deletion timestamp
ALTER TABLE t_import_sessions
ADD COLUMN IF NOT EXISTS staging_deleted_at TIMESTAMP;

-- Add staging deletion user
ALTER TABLE t_import_sessions
ADD COLUMN IF NOT EXISTS staging_deleted_by INTEGER REFERENCES t_user(user_id);

-- Add staging deletion reason
ALTER TABLE t_import_sessions
ADD COLUMN IF NOT EXISTS staging_deleted_reason TEXT;

-- Add index for querying sessions by deletion status
CREATE INDEX IF NOT EXISTS idx_import_sessions_staging_deleted
ON t_import_sessions(staging_data_deleted);

-- Add comment to explain the columns
COMMENT ON COLUMN t_import_sessions.staging_data_deleted IS 'Indicates whether staging data has been deleted (manually or auto-archived)';
COMMENT ON COLUMN t_import_sessions.staging_deleted_at IS 'Timestamp when staging data was deleted';
COMMENT ON COLUMN t_import_sessions.staging_deleted_by IS 'User ID who deleted the staging data';
COMMENT ON COLUMN t_import_sessions.staging_deleted_reason IS 'Reason for deletion: User deleted, Auto-archived after 45 days, etc.';

-- Verify columns were added
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 't_import_sessions'
  AND column_name LIKE 'staging_%'
ORDER BY ordinal_position;
