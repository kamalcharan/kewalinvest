-- CLEAR ALL IMPORT SESSIONS AND FILE UPLOADS
-- This will unblock you completely

BEGIN;

-- Show what will be deleted
SELECT
    'Sessions to delete:' as info,
    COUNT(*) as count
FROM t_import_sessions
WHERE tenant_id = 9 AND is_live = true;

SELECT
    'File uploads to delete:' as info,
    COUNT(*) as count
FROM t_file_uploads
WHERE tenant_id = 9 AND is_live = true;

SELECT
    'Staging data to delete:' as info,
    COUNT(*) as count
FROM t_import_staging_data
WHERE tenant_id = 9 AND is_live = true;

-- Delete staging data (no foreign keys blocking)
DELETE FROM t_import_staging_data
WHERE tenant_id = 9 AND is_live = true;

-- Delete import sessions (foreign key to file_uploads)
DELETE FROM t_import_sessions
WHERE tenant_id = 9 AND is_live = true;

-- Delete file uploads
DELETE FROM t_file_uploads
WHERE tenant_id = 9 AND is_live = true;

COMMIT;

-- Verify everything is cleared
SELECT 'CLEARED!' as status;

SELECT
    'Remaining sessions:' as check,
    COUNT(*) as count
FROM t_import_sessions
WHERE tenant_id = 9 AND is_live = true;

SELECT
    'Remaining file uploads:' as check,
    COUNT(*) as count
FROM t_file_uploads
WHERE tenant_id = 9 AND is_live = true;

SELECT 'You are now UNBLOCKED! Try uploading your file.' as message;
