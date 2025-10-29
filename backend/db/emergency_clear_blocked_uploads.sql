-- EMERGENCY: Manually clear blocked file uploads
-- Use this when you're stuck with SHA duplicate error

-- Step 1: Check what's blocking you
SELECT
    f.id as file_id,
    f.original_filename,
    f.file_hash,
    f.created_at as uploaded_at,
    s.id as session_id,
    s.session_name,
    s.status as session_status,
    s.current_stage,
    f.tenant_id,
    f.is_live
FROM t_file_uploads f
LEFT JOIN t_import_sessions s ON s.file_upload_id = f.id
WHERE f.tenant_id = 9  -- CHANGE THIS to your tenant_id if different
  AND f.is_live = true
ORDER BY f.created_at DESC
LIMIT 10;

-- Step 2: Delete the blocking file record(s)
-- UNCOMMENT and run this after checking the results above:

/*
DELETE FROM t_file_uploads
WHERE id IN (
    SELECT f.id
    FROM t_file_uploads f
    LEFT JOIN t_import_sessions s ON s.file_upload_id = f.id
    WHERE f.tenant_id = 9  -- CHANGE THIS to your tenant_id
      AND f.is_live = true
      AND (s.status IS NULL OR s.status IN ('cancelled', 'failed'))
      AND f.created_at > CURRENT_TIMESTAMP - INTERVAL '1 day'  -- Only last 24 hours
);
*/

-- Step 3: Verify the deletion
SELECT 'Check above - if no rows, you are unblocked!' as message;

-- Step 4: Show remaining file uploads
SELECT
    f.id as file_id,
    f.original_filename,
    f.created_at,
    s.status as session_status
FROM t_file_uploads f
LEFT JOIN t_import_sessions s ON s.file_upload_id = f.id
WHERE f.tenant_id = 9
  AND f.is_live = true
ORDER BY f.created_at DESC
LIMIT 5;
