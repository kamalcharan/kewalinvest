-- Fix processing_status check constraint for t_import_staging_data
-- This ensures the constraint allows all valid status values

-- Drop the old constraint if it exists
ALTER TABLE t_import_staging_data
DROP CONSTRAINT IF EXISTS t_import_staging_data_processing_status_check;

-- Add the correct constraint with all valid values
ALTER TABLE t_import_staging_data
ADD CONSTRAINT t_import_staging_data_processing_status_check
CHECK (processing_status IN ('pending', 'processing', 'success', 'failed', 'skipped', 'duplicate', 'orphan'));

-- Verify the constraint
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conname = 't_import_staging_data_processing_status_check';
