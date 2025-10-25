-- Migration: Add duplicate detection columns to t_import_sessions
-- Date: 2025-10-25
-- Description: Add columns for filename and session-level duplicate detection

-- Add duplicate detection columns to t_import_sessions
ALTER TABLE t_import_sessions
ADD COLUMN IF NOT EXISTS file_hash VARCHAR(64),
ADD COLUMN IF NOT EXISTS current_stage VARCHAR(50),
ADD COLUMN IF NOT EXISTS duplicate_check_result JSONB,
ADD COLUMN IF NOT EXISTS duplicate_classification VARCHAR(50),
ADD COLUMN IF NOT EXISTS duplicate_user_decision_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS filename_duplicate_check JSONB;

-- Add comments for documentation
COMMENT ON COLUMN t_import_sessions.file_hash IS 'SHA256 hash of uploaded file for duplicate detection';
COMMENT ON COLUMN t_import_sessions.current_stage IS 'Current import stage: parsing, staging, validating, processing, completed';
COMMENT ON COLUMN t_import_sessions.duplicate_check_result IS 'JSONB result from session-level duplicate check';
COMMENT ON COLUMN t_import_sessions.duplicate_classification IS 'User classification: user_marked_duplicate, user_marked_legitimate, system_skipped';
COMMENT ON COLUMN t_import_sessions.duplicate_user_decision_at IS 'Timestamp when user made duplicate classification decision';
COMMENT ON COLUMN t_import_sessions.filename_duplicate_check IS 'JSONB result from filename duplicate check';

-- Add index for file_hash lookups
CREATE INDEX IF NOT EXISTS idx_import_sessions_file_hash ON t_import_sessions(file_hash) WHERE file_hash IS NOT NULL;

-- Add index for current_stage tracking
CREATE INDEX IF NOT EXISTS idx_import_sessions_current_stage ON t_import_sessions(current_stage) WHERE current_stage IS NOT NULL;

-- Add index for duplicate classification queries
CREATE INDEX IF NOT EXISTS idx_import_sessions_duplicate_classification ON t_import_sessions(duplicate_classification) WHERE duplicate_classification IS NOT NULL;

COMMENT ON INDEX idx_import_sessions_file_hash IS 'Fast lookup for filename duplicate detection';
COMMENT ON INDEX idx_import_sessions_current_stage IS 'Track import progress by stage';
COMMENT ON INDEX idx_import_sessions_duplicate_classification IS 'Analyze user duplicate decisions';
