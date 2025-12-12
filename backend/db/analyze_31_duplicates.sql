-- Analysis Script: Why are 31 records failing as duplicates?
-- Run this in your PostgreSQL database

-- ============================================
-- STEP 1: Get the latest import session info
-- ============================================
SELECT
    '=== LATEST IMPORT SESSION ===' as section,
    id as session_id,
    session_name,
    status,
    total_records,
    successful_records,
    failed_records,
    duplicate_records,
    created_at
FROM t_import_sessions
WHERE import_type = 'CustomerData'
ORDER BY created_at DESC
LIMIT 1;

-- ============================================
-- STEP 2: List all 31 duplicate records
-- ============================================
SELECT
    '=== DUPLICATE RECORDS ===' as section,
    s.row_number,
    s.mapped_data->>'name' as customer_name,
    s.mapped_data->>'iwell_code' as iwell_code,
    s.mapped_data->>'email' as email,
    s.mapped_data->>'mobile' as mobile,
    s.mapped_data->>'pan' as pan,
    s.warnings
FROM t_import_staging_data s
JOIN t_import_sessions sess ON s.session_id = sess.id
WHERE sess.id = (
    SELECT id FROM t_import_sessions
    WHERE import_type = 'CustomerData'
    ORDER BY created_at DESC LIMIT 1
)
AND s.processing_status = 'duplicate'
ORDER BY s.row_number;

-- ============================================
-- STEP 3: Check for duplicate EMAILS within the CSV
-- (Same email appearing multiple times)
-- ============================================
SELECT
    '=== DUPLICATE EMAILS IN CSV ===' as section,
    LOWER(TRIM(mapped_data->>'email')) as email,
    COUNT(*) as times_in_csv,
    STRING_AGG(mapped_data->>'name', ' | ' ORDER BY row_number) as customer_names,
    STRING_AGG(row_number::TEXT, ', ' ORDER BY row_number) as row_numbers
FROM t_import_staging_data s
JOIN t_import_sessions sess ON s.session_id = sess.id
WHERE sess.id = (
    SELECT id FROM t_import_sessions
    WHERE import_type = 'CustomerData'
    ORDER BY created_at DESC LIMIT 1
)
AND mapped_data->>'email' IS NOT NULL
AND TRIM(mapped_data->>'email') != ''
GROUP BY LOWER(TRIM(mapped_data->>'email'))
HAVING COUNT(*) > 1
ORDER BY COUNT(*) DESC;

-- ============================================
-- STEP 4: Check for duplicate MOBILES within the CSV
-- (Same mobile appearing multiple times)
-- ============================================
SELECT
    '=== DUPLICATE MOBILES IN CSV ===' as section,
    REGEXP_REPLACE(mapped_data->>'mobile', '[^0-9]', '', 'g') as mobile_cleaned,
    COUNT(*) as times_in_csv,
    STRING_AGG(mapped_data->>'name', ' | ' ORDER BY row_number) as customer_names,
    STRING_AGG(row_number::TEXT, ', ' ORDER BY row_number) as row_numbers
FROM t_import_staging_data s
JOIN t_import_sessions sess ON s.session_id = sess.id
WHERE sess.id = (
    SELECT id FROM t_import_sessions
    WHERE import_type = 'CustomerData'
    ORDER BY created_at DESC LIMIT 1
)
AND mapped_data->>'mobile' IS NOT NULL
AND TRIM(mapped_data->>'mobile') != ''
GROUP BY REGEXP_REPLACE(mapped_data->>'mobile', '[^0-9]', '', 'g')
HAVING COUNT(*) > 1
ORDER BY COUNT(*) DESC;

-- ============================================
-- STEP 5: Analyze the pattern - which got success vs duplicate
-- (First occurrence succeeds, subsequent ones marked duplicate)
-- ============================================
SELECT
    '=== PROCESSING ORDER ANALYSIS ===' as section,
    s.row_number,
    s.mapped_data->>'name' as customer_name,
    s.mapped_data->>'email' as email,
    s.mapped_data->>'mobile' as mobile,
    s.processing_status,
    s.processed_at
FROM t_import_staging_data s
JOIN t_import_sessions sess ON s.session_id = sess.id
WHERE sess.id = (
    SELECT id FROM t_import_sessions
    WHERE import_type = 'CustomerData'
    ORDER BY created_at DESC LIMIT 1
)
AND (
    -- Include rows with shared emails
    LOWER(TRIM(s.mapped_data->>'email')) IN (
        SELECT LOWER(TRIM(mapped_data->>'email'))
        FROM t_import_staging_data s2
        WHERE s2.session_id = s.session_id
        AND mapped_data->>'email' IS NOT NULL
        AND TRIM(mapped_data->>'email') != ''
        GROUP BY LOWER(TRIM(mapped_data->>'email'))
        HAVING COUNT(*) > 1
    )
    OR
    -- Include rows with shared mobiles
    REGEXP_REPLACE(s.mapped_data->>'mobile', '[^0-9]', '', 'g') IN (
        SELECT REGEXP_REPLACE(mapped_data->>'mobile', '[^0-9]', '', 'g')
        FROM t_import_staging_data s2
        WHERE s2.session_id = s.session_id
        AND mapped_data->>'mobile' IS NOT NULL
        AND TRIM(mapped_data->>'mobile') != ''
        GROUP BY REGEXP_REPLACE(mapped_data->>'mobile', '[^0-9]', '', 'g')
        HAVING COUNT(*) > 1
    )
)
ORDER BY s.mapped_data->>'email', s.mapped_data->>'mobile', s.row_number;

-- ============================================
-- STEP 6: Summary - Root Cause (Email duplicates)
-- ============================================
SELECT
    '=== EMAIL DUPLICATES SUMMARY ===' as section,
    COUNT(*) as unique_emails_with_duplicates,
    SUM(cnt) as total_records_with_dup_email,
    SUM(cnt) - COUNT(*) as extra_records_due_to_email
FROM (
    SELECT LOWER(TRIM(mapped_data->>'email')) as email, COUNT(*) as cnt
    FROM t_import_staging_data s
    JOIN t_import_sessions sess ON s.session_id = sess.id
    WHERE sess.id = (SELECT id FROM t_import_sessions WHERE import_type = 'CustomerData' ORDER BY created_at DESC LIMIT 1)
    AND mapped_data->>'email' IS NOT NULL AND TRIM(mapped_data->>'email') != ''
    GROUP BY LOWER(TRIM(mapped_data->>'email'))
    HAVING COUNT(*) > 1
) sub;

-- ============================================
-- STEP 7: Summary - Root Cause (Mobile duplicates)
-- ============================================
SELECT
    '=== MOBILE DUPLICATES SUMMARY ===' as section,
    COUNT(*) as unique_mobiles_with_duplicates,
    SUM(cnt) as total_records_with_dup_mobile,
    SUM(cnt) - COUNT(*) as extra_records_due_to_mobile
FROM (
    SELECT REGEXP_REPLACE(mapped_data->>'mobile', '[^0-9]', '', 'g') as mobile, COUNT(*) as cnt
    FROM t_import_staging_data s
    JOIN t_import_sessions sess ON s.session_id = sess.id
    WHERE sess.id = (SELECT id FROM t_import_sessions WHERE import_type = 'CustomerData' ORDER BY created_at DESC LIMIT 1)
    AND mapped_data->>'mobile' IS NOT NULL AND TRIM(mapped_data->>'mobile') != ''
    GROUP BY REGEXP_REPLACE(mapped_data->>'mobile', '[^0-9]', '', 'g')
    HAVING COUNT(*) > 1
) sub;
