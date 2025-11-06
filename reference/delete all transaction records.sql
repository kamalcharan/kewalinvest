BEGIN;  -- Start transaction (allows rollback if needed)

-- Check what will be deleted
SELECT 
  'Before deletion' as status,
  (SELECT COUNT(*) FROM t_transaction_table) as transactions,
  (SELECT COUNT(*) FROM t_import_staging_data) as staging,
  (SELECT COUNT(*) FROM t_import_sessions) as sessions,
  (SELECT COUNT(*) FROM t_file_uploads) as files;

-- Delete in correct order (respects foreign key constraints)
DELETE FROM t_import_staging_data;
DELETE FROM t_transaction_table;
DELETE FROM t_import_sessions;
DELETE FROM t_file_uploads;

-- Verify everything is deleted
SELECT 
  'After deletion' as status,
  (SELECT COUNT(*) FROM t_transaction_table) as transactions,
  (SELECT COUNT(*) FROM t_import_staging_data) as staging,
  (SELECT COUNT(*) FROM t_import_sessions) as sessions,
  (SELECT COUNT(*) FROM t_file_uploads) as files;

-- If counts are all 0, commit the changes
COMMIT;

-- If something looks wrong, run this instead:
-- ROLLBACK;