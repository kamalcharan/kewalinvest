-- Step 1: Check what's blocking you RIGHT NOW
-- Run this first to see the problem

SELECT
    f.id as file_id,
    f.original_filename,
    f.file_hash,
    f.created_at as uploaded_at,
    s.id as session_id,
    s.session_name,
    s.status as session_status,
    s.current_stage,
    CASE
        WHEN s.status IN ('cancelled', 'failed') THEN '✅ Should allow re-upload'
        WHEN s.status IS NULL THEN '✅ Should allow re-upload (no session)'
        WHEN s.status IN ('completed', 'processing', 'staged') THEN '❌ Will block re-upload'
        ELSE '❓ Unknown status: ' || s.status
    END as should_allow_reupload
FROM t_file_uploads f
LEFT JOIN t_import_sessions s ON s.file_upload_id = f.id
WHERE f.tenant_id = 9  -- Change to your tenant_id if different
  AND f.is_live = true
ORDER BY f.created_at DESC
LIMIT 5;

-- Step 2: If you see blocking records above, run this to CLEAR them
-- UNCOMMENT the DELETE statement below after checking results above:

/*
DELETE FROM t_file_uploads
WHERE id IN (
    SELECT f.id
    FROM t_file_uploads f
    LEFT JOIN t_import_sessions s ON s.file_upload_id = f.id
    WHERE f.tenant_id = 9  -- Change to your tenant_id
      AND f.is_live = true
      AND f.created_at > CURRENT_TIMESTAMP - INTERVAL '2 days'  -- Only last 2 days for safety
);

SELECT 'All recent file records cleared! Try uploading again now.' as result;
*/

-- Alternative: More targeted cleanup - only clear specific filename
-- Replace 'YourFileName.csv' with your actual filename
/*
DELETE FROM t_file_uploads
WHERE original_filename = 'YourFileName.csv'
  AND tenant_id = 9
  AND is_live = true;

SELECT 'File "YourFileName.csv" cleared! Try uploading again.' as result;
*/
