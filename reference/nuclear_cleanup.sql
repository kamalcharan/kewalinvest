-- COMPREHENSIVE DIAGNOSTIC - Run this to understand the block

-- 1. Check what files exist in database
SELECT
    'Database File Records:' as section,
    f.id,
    f.original_filename,
    f.file_hash,
    f.created_at,
    s.status as session_status,
    f.tenant_id,
    f.is_live
FROM t_file_uploads f
LEFT JOIN t_import_sessions s ON s.file_upload_id = f.id
WHERE f.tenant_id = 9 AND f.is_live = true
ORDER BY f.created_at DESC
LIMIT 10;

-- 2. Check import sessions
SELECT
    'Import Sessions:' as section,
    s.id,
    s.session_name,
    s.status,
    s.current_stage,
    s.file_upload_id,
    s.created_at
FROM t_import_sessions s
WHERE s.tenant_id = 9 AND s.is_live = true
ORDER BY s.created_at DESC
LIMIT 10;

-- 3. NUCLEAR OPTION - Clear EVERYTHING (last 7 days)
-- This will unblock you for sure
-- UNCOMMENT and run if you want to clear everything:

/*
-- Delete import sessions first (foreign key constraint)
DELETE FROM t_import_sessions
WHERE tenant_id = 9
  AND is_live = true
  AND created_at > CURRENT_TIMESTAMP - INTERVAL '7 days';

-- Delete staging data
DELETE FROM t_import_staging_data
WHERE tenant_id = 9
  AND is_live = true
  AND created_at > CURRENT_TIMESTAMP - INTERVAL '7 days';

-- Delete file uploads
DELETE FROM t_file_uploads
WHERE tenant_id = 9
  AND is_live = true
  AND created_at > CURRENT_TIMESTAMP - INTERVAL '7 days';

SELECT 'NUCLEAR CLEANUP COMPLETE - Everything cleared!' as result;
*/
