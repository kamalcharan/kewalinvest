-- Remove the processing_status CHECK constraint from t_import_staging_data
-- This allows more flexibility for evolving status values without database migrations

-- Drop the constraint
ALTER TABLE t_import_staging_data
DROP CONSTRAINT IF EXISTS t_import_staging_data_processing_status_check;

-- Verify the constraint is gone
SELECT
    conname AS constraint_name,
    contype AS constraint_type,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 't_import_staging_data'::regclass
  AND conname LIKE '%processing_status%';

-- Show current column definition
SELECT
    column_name,
    data_type,
    character_maximum_length,
    column_default,
    is_nullable
FROM information_schema.columns
WHERE table_name = 't_import_staging_data'
  AND column_name = 'processing_status';

-- (Optional) Query to see what status values are currently in use
SELECT
    processing_status,
    COUNT(*) as count
FROM t_import_staging_data
GROUP BY processing_status
ORDER BY count DESC;

COMMENT ON COLUMN t_import_staging_data.processing_status IS
'Processing status: pending, processing, success, failed, skipped, duplicate, orphan.
Validation enforced at application level for flexibility.';
