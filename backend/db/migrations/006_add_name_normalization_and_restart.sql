-- Migration: 006_add_name_normalization_and_restart.sql
-- Purpose: Add name normalization for customer lookups and restart capability for import sessions
-- Date: 2025-10-29

-- ============================================================================
-- PART 1: Name Normalization Function and Computed Column
-- ============================================================================

-- Create function to normalize customer names for matching
-- Rules: Remove salutations, keep middle initials, uppercase, remove special chars
CREATE OR REPLACE FUNCTION normalize_customer_name(name_input TEXT)
RETURNS TEXT AS $$
DECLARE
  normalized TEXT;
  salutations TEXT[] := ARRAY['MR', 'MRS', 'MS', 'DR', 'SRI', 'SHRI', 'SMT', 'MISS', 'PROF'];
  salutation TEXT;
BEGIN
  -- Return NULL for NULL input
  IF name_input IS NULL THEN
    RETURN NULL;
  END IF;

  -- Convert to uppercase
  normalized := UPPER(TRIM(name_input));

  -- Remove salutations from the beginning of the name
  FOREACH salutation IN ARRAY salutations
  LOOP
    -- Remove salutation with dot (e.g., "MR.", "DR.")
    IF normalized ~ ('^' || salutation || '\.')
    THEN
      normalized := TRIM(REGEXP_REPLACE(normalized, '^' || salutation || '\.', '', 'i'));
    END IF;

    -- Remove salutation with space (e.g., "MR ", "DR ")
    IF normalized ~ ('^' || salutation || '\s')
    THEN
      normalized := TRIM(REGEXP_REPLACE(normalized, '^' || salutation || '\s+', '', 'i'));
    END IF;

    -- Remove salutation at the exact beginning (e.g., "MR" when followed by nothing)
    IF normalized = salutation
    THEN
      normalized := '';
    END IF;
  END LOOP;

  -- Remove special characters but keep spaces (to preserve middle initials)
  -- Keep only alphanumeric and spaces
  normalized := REGEXP_REPLACE(normalized, '[^A-Z0-9\s]', '', 'g');

  -- Remove multiple spaces
  normalized := REGEXP_REPLACE(normalized, '\s+', ' ', 'g');

  -- Final trim
  normalized := TRIM(normalized);

  -- Return NULL for empty result
  IF normalized = '' THEN
    RETURN NULL;
  END IF;

  RETURN normalized;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Add comment to the function
COMMENT ON FUNCTION normalize_customer_name(TEXT) IS
'Normalizes customer name for matching: removes salutations (Mr, Mrs, etc), converts to uppercase, removes special characters, keeps middle initials and spaces';

-- Add normalized_name computed column to t_contacts table
ALTER TABLE t_contacts
ADD COLUMN IF NOT EXISTS normalized_name TEXT
GENERATED ALWAYS AS (normalize_customer_name(name)) STORED;

-- Add comment to the column
COMMENT ON COLUMN t_contacts.normalized_name IS
'Normalized version of name for fast customer lookups. Auto-generated via normalize_customer_name() function';

-- Create index for fast name lookups
CREATE INDEX IF NOT EXISTS idx_contacts_normalized_name
ON t_contacts(normalized_name)
WHERE is_active = true;

-- Note: PAN is in t_customers table, not t_contacts, so we don't create a composite index here
-- The customer lookup will join t_contacts (for name) with t_customers (for PAN)

-- ============================================================================
-- PART 2: Update Import Sessions Schema for Restart Capability
-- ============================================================================

-- Add columns for restart tracking and checkpoint management
ALTER TABLE t_import_sessions
ADD COLUMN IF NOT EXISTS restart_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_restart_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS can_restart BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS last_processed_staging_id INTEGER,
ADD COLUMN IF NOT EXISTS processing_checkpoint JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS customer_lookup_method VARCHAR(50) DEFAULT 'iwell_code' CHECK (customer_lookup_method IN ('iwell_code', 'customer_name', 'both'));

-- Add comments
COMMENT ON COLUMN t_import_sessions.restart_count IS
'Number of times this session has been restarted after timeout or failure';

COMMENT ON COLUMN t_import_sessions.last_restart_at IS
'Timestamp of the last restart attempt';

COMMENT ON COLUMN t_import_sessions.can_restart IS
'Whether this session can be restarted (false for cancelled/completed sessions)';

COMMENT ON COLUMN t_import_sessions.last_processed_staging_id IS
'ID of last successfully processed staging record, used as checkpoint for restart';

COMMENT ON COLUMN t_import_sessions.processing_checkpoint IS
'JSON object storing checkpoint data: {batch_number, records_in_batch, last_row_number, phase}';

COMMENT ON COLUMN t_import_sessions.customer_lookup_method IS
'Method used for customer lookup in transaction imports: iwell_code (default), customer_name, or both';

-- Update status column to support new states
-- Current valid statuses: 'pending', 'processing', 'completed', 'completed_with_errors', 'failed', 'cancelled'
-- Add new status: 'staged' (Phase 1 complete), 'pending_processing' (ready for Phase 2)
ALTER TABLE t_import_sessions
DROP CONSTRAINT IF EXISTS t_import_sessions_status_check;

ALTER TABLE t_import_sessions
ADD CONSTRAINT t_import_sessions_status_check
CHECK (status IN ('pending', 'staged', 'pending_processing', 'processing', 'completed', 'completed_with_errors', 'failed', 'cancelled'));

-- ============================================================================
-- PART 3: Update Staging Data Schema for Match Tracking and Edit History
-- ============================================================================

-- Add columns for tracking customer/scheme matches and edits
ALTER TABLE t_import_staging_data
ADD COLUMN IF NOT EXISTS match_type VARCHAR(50),
ADD COLUMN IF NOT EXISTS match_confidence VARCHAR(20),
ADD COLUMN IF NOT EXISTS ambiguous_matches JSONB,
ADD COLUMN IF NOT EXISTS requires_review BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS edit_history JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS edited_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS edited_by INTEGER,
ADD COLUMN IF NOT EXISTS reprocess_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_reprocess_at TIMESTAMP WITH TIME ZONE;

-- Add comments
COMMENT ON COLUMN t_import_staging_data.match_type IS
'Type of match found: exact_iwell, exact_name, name_with_pan, scheme_alias, etc';

COMMENT ON COLUMN t_import_staging_data.match_confidence IS
'Confidence level: high, medium, low, ambiguous, not_found';

COMMENT ON COLUMN t_import_staging_data.ambiguous_matches IS
'JSON array of potential matches when multiple customers/schemes match: [{id, name, pan, confidence}, ...]';

COMMENT ON COLUMN t_import_staging_data.requires_review IS
'Flag indicating this record needs manual review (ambiguous match, missing data, etc)';

COMMENT ON COLUMN t_import_staging_data.edit_history IS
'JSON array tracking all edits: [{edited_at, edited_by, field, old_value, new_value}, ...]';

COMMENT ON COLUMN t_import_staging_data.edited_at IS
'Timestamp of last edit';

COMMENT ON COLUMN t_import_staging_data.edited_by IS
'User ID who last edited this record';

COMMENT ON COLUMN t_import_staging_data.reprocess_count IS
'Number of times this record has been reprocessed after edits';

COMMENT ON COLUMN t_import_staging_data.last_reprocess_at IS
'Timestamp of last reprocess attempt';

-- Update processing_status column to support new states
-- Current: 'pending', 'processing', 'success', 'failed', 'skipped', 'duplicate', 'orphan'
-- Add: 'pending_process' (staged, waiting for Phase 2)
ALTER TABLE t_import_staging_data
DROP CONSTRAINT IF EXISTS t_import_staging_data_processing_status_check;

-- Drop the inline constraint from table creation if it exists
ALTER TABLE t_import_staging_data
DROP CONSTRAINT IF EXISTS t_import_staging_data_processing_status_check1;

-- Add new constraint with all existing statuses plus new one
ALTER TABLE t_import_staging_data
ADD CONSTRAINT t_import_staging_data_processing_status_check
CHECK (processing_status IN ('pending', 'pending_process', 'processing', 'success', 'failed', 'duplicate', 'orphan', 'skipped'));

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_staging_requires_review
ON t_import_staging_data(session_id, requires_review)
WHERE requires_review = true;

CREATE INDEX IF NOT EXISTS idx_staging_processing_status_session
ON t_import_staging_data(session_id, processing_status);

CREATE INDEX IF NOT EXISTS idx_staging_edited
ON t_import_staging_data(session_id, edited_at)
WHERE edited_at IS NOT NULL;

-- ============================================================================
-- PART 4: Add Foreign Key Constraint for edited_by
-- ============================================================================

ALTER TABLE t_import_staging_data
ADD CONSTRAINT fk_staging_edited_by
FOREIGN KEY (edited_by)
REFERENCES t_users(id)
ON DELETE SET NULL;

-- ============================================================================
-- PART 5: Create Helper Function for Recording Edits
-- ============================================================================

CREATE OR REPLACE FUNCTION record_staging_edit(
  p_staging_id INTEGER,
  p_field_name TEXT,
  p_old_value TEXT,
  p_new_value TEXT,
  p_edited_by INTEGER
)
RETURNS VOID AS $$
DECLARE
  v_edit_entry JSONB;
  v_current_history JSONB;
BEGIN
  -- Build edit entry
  v_edit_entry := jsonb_build_object(
    'edited_at', NOW(),
    'edited_by', p_edited_by,
    'field', p_field_name,
    'old_value', p_old_value,
    'new_value', p_new_value
  );

  -- Get current edit history
  SELECT COALESCE(edit_history, '[]'::jsonb)
  INTO v_current_history
  FROM t_import_staging_data
  WHERE id = p_staging_id;

  -- Append new edit to history
  UPDATE t_import_staging_data
  SET
    edit_history = v_current_history || v_edit_entry,
    edited_at = NOW(),
    edited_by = p_edited_by
  WHERE id = p_staging_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION record_staging_edit IS
'Records an edit to a staging record in the edit_history array';

-- ============================================================================
-- PART 6: Create View for Failed/Reviewable Records
-- ============================================================================

CREATE OR REPLACE VIEW v_import_records_for_review AS
SELECT
  s.id,
  s.import_session_id,
  s.tenant_id,
  s.is_live,
  s.row_number,
  s.status,
  s.mapped_data,
  s.error_messages,
  s.warnings,
  s.match_type,
  s.match_confidence,
  s.ambiguous_matches,
  s.requires_review,
  s.edited_at,
  s.edited_by,
  s.reprocess_count,
  s.created_at,
  sess.session_name,
  sess.import_type,
  u.username as edited_by_username
FROM t_import_staging_data s
INNER JOIN t_import_sessions sess ON sess.id = s.import_session_id
LEFT JOIN t_users u ON u.id = s.edited_by
WHERE s.status IN ('failed', 'orphan', 'duplicate')
   OR s.requires_review = true
ORDER BY s.import_session_id DESC, s.row_number ASC;

COMMENT ON VIEW v_import_records_for_review IS
'View of all staging records that failed, are orphaned, duplicates, or require manual review';

-- ============================================================================
-- PART 7: Migration Rollback Script (for reference)
-- ============================================================================

-- To rollback this migration, run:
/*
-- Remove view
DROP VIEW IF EXISTS v_import_records_for_review;

-- Remove helper function
DROP FUNCTION IF EXISTS record_staging_edit;

-- Remove foreign key
ALTER TABLE t_import_staging_data DROP CONSTRAINT IF EXISTS fk_staging_edited_by;

-- Remove staging indexes
DROP INDEX IF EXISTS idx_staging_edited;
DROP INDEX IF EXISTS idx_staging_status_session;
DROP INDEX IF EXISTS idx_staging_requires_review;

-- Remove staging columns
ALTER TABLE t_import_staging_data
DROP COLUMN IF EXISTS last_reprocess_at,
DROP COLUMN IF EXISTS reprocess_count,
DROP COLUMN IF EXISTS edited_by,
DROP COLUMN IF EXISTS edited_at,
DROP COLUMN IF EXISTS edit_history,
DROP COLUMN IF EXISTS requires_review,
DROP COLUMN IF EXISTS ambiguous_matches,
DROP COLUMN IF EXISTS match_confidence,
DROP COLUMN IF EXISTS match_type;

-- Remove session columns
ALTER TABLE t_import_sessions
DROP COLUMN IF EXISTS customer_lookup_method,
DROP COLUMN IF EXISTS processing_checkpoint,
DROP COLUMN IF EXISTS last_processed_staging_id,
DROP COLUMN IF EXISTS can_restart,
DROP COLUMN IF EXISTS last_restart_at,
DROP COLUMN IF EXISTS restart_count;

-- Remove contact indexes
DROP INDEX IF EXISTS idx_contacts_normalized_name;

-- Remove normalized_name column
ALTER TABLE t_contacts DROP COLUMN IF EXISTS normalized_name;

-- Remove normalize function
DROP FUNCTION IF EXISTS normalize_customer_name;
*/
