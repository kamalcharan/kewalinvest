-- CLEAR ALL IMPORT SESSIONS AND FILE UPLOADS FOR ALL TENANTS
-- This will unblock everyone completely

BEGIN;

-- Show what will be deleted (grouped by tenant)
SELECT
    'Sessions to delete by tenant:' as info,
    tenant_id,
    is_live,
    COUNT(*) as count
FROM t_import_sessions
GROUP BY tenant_id, is_live
ORDER BY tenant_id, is_live;

SELECT
    'File uploads to delete by tenant:' as info,
    tenant_id,
    is_live,
    COUNT(*) as count
FROM t_file_uploads
GROUP BY tenant_id, is_live
ORDER BY tenant_id, is_live;

SELECT
    'Staging data to delete by tenant:' as info,
    tenant_id,
    is_live,
    COUNT(*) as count
FROM t_import_staging_data
GROUP BY tenant_id, is_live
ORDER BY tenant_id, is_live;

-- Delete staging data (no foreign keys blocking)
DELETE FROM t_import_staging_data;

-- Delete import sessions (foreign key to file_uploads)
DELETE FROM t_import_sessions;

-- Delete file uploads
DELETE FROM t_file_uploads;

COMMIT;

-- Verify everything is cleared
SELECT 'CLEARED FOR ALL TENANTS!' as status;

SELECT
    'Remaining sessions:' as check,
    COUNT(*) as count
FROM t_import_sessions;

SELECT
    'Remaining file uploads:' as check,
    COUNT(*) as count
FROM t_file_uploads;

SELECT
    'Remaining staging data:' as check,
    COUNT(*) as count
FROM t_import_staging_data;

SELECT 'ALL TENANTS UNBLOCKED! Everyone can upload now.' as message;
