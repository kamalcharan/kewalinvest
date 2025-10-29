-- Investigate the 31 "duplicate" records in fresh tenant import
-- This should help us understand WHY they were marked as duplicate

-- Step 1: Get the latest import session
SELECT
    'Latest Import Session:' as info,
    id as session_id,
    session_name,
    status,
    total_records,
    successful_records,
    duplicate_records,
    tenant_id,
    is_live,
    created_at
FROM t_import_sessions
WHERE tenant_id = 9  -- Change if different
  AND is_live = true
ORDER BY created_at DESC
LIMIT 1;

-- Step 2: Check which records were marked as duplicate
SELECT
    'Records marked as DUPLICATE:' as info,
    s.row_number,
    s.mapped_data->>'name' as customer_name,
    s.mapped_data->>'pan' as pan,
    s.mapped_data->>'email' as email,
    s.mapped_data->>'mobile' as mobile,
    s.mapped_data->>'iwell_code' as iwell_code,
    s.processing_status,
    s.warnings
FROM t_import_staging_data s
WHERE s.session_id = (SELECT MAX(id) FROM t_import_sessions WHERE tenant_id = 9 AND is_live = true)
  AND s.processing_status = 'duplicate'
ORDER BY s.row_number;

-- Step 3: Check if these "duplicates" actually exist in customers table
SELECT
    'Checking if duplicates really exist in t_customers:' as info,
    s.row_number,
    s.mapped_data->>'name' as staged_name,
    s.mapped_data->>'pan' as staged_pan,
    c.id as existing_customer_id,
    ct.name as existing_customer_name,
    c.pan as existing_pan,
    c.created_at as existing_created_at
FROM t_import_staging_data s
LEFT JOIN t_customers c ON (
    (c.pan = UPPER(TRIM(s.mapped_data->>'pan')) AND c.pan IS NOT NULL AND c.pan != '')
    AND c.tenant_id = 9
    AND c.is_live = true
)
LEFT JOIN t_contacts ct ON c.contact_id = ct.id
WHERE s.session_id = (SELECT MAX(id) FROM t_import_sessions WHERE tenant_id = 9 AND is_live = true)
  AND s.processing_status = 'duplicate'
ORDER BY s.row_number;

-- Step 4: Check for duplicate PANs WITHIN the CSV file itself
SELECT
    'Duplicate PANs WITHIN the CSV file:' as info,
    mapped_data->>'pan' as pan_value,
    COUNT(*) as count_in_csv,
    STRING_AGG(row_number::TEXT, ', ') as row_numbers
FROM t_import_staging_data
WHERE session_id = (SELECT MAX(id) FROM t_import_sessions WHERE tenant_id = 9 AND is_live = true)
  AND mapped_data->>'pan' IS NOT NULL
  AND mapped_data->>'pan' != ''
GROUP BY mapped_data->>'pan'
HAVING COUNT(*) > 1
ORDER BY count_in_csv DESC;

-- Step 5: Check for duplicate emails WITHIN the CSV file
SELECT
    'Duplicate EMAILs WITHIN the CSV file:' as info,
    mapped_data->>'email' as email_value,
    COUNT(*) as count_in_csv,
    STRING_AGG(row_number::TEXT, ', ') as row_numbers
FROM t_import_staging_data
WHERE session_id = (SELECT MAX(id) FROM t_import_sessions WHERE tenant_id = 9 AND is_live = true)
  AND mapped_data->>'email' IS NOT NULL
  AND mapped_data->>'email' != ''
GROUP BY mapped_data->>'email'
HAVING COUNT(*) > 1
ORDER BY count_in_csv DESC;

-- Step 6: Check for duplicate mobiles WITHIN the CSV file
SELECT
    'Duplicate MOBILEs WITHIN the CSV file:' as info,
    mapped_data->>'mobile' as mobile_value,
    COUNT(*) as count_in_csv,
    STRING_AGG(row_number::TEXT, ', ') as row_numbers
FROM t_import_staging_data
WHERE session_id = (SELECT MAX(id) FROM t_import_sessions WHERE tenant_id = 9 AND is_live = true)
  AND mapped_data->>'mobile' IS NOT NULL
  AND mapped_data->>'mobile' != ''
GROUP BY mapped_data->>'mobile'
HAVING COUNT(*) > 1
ORDER BY count_in_csv DESC;

-- Step 7: Analyze the pattern - when were records processed?
SELECT
    'Processing timeline (successful vs duplicate):' as info,
    processing_status,
    COUNT(*) as count,
    MIN(processed_at) as first_processed,
    MAX(processed_at) as last_processed
FROM t_import_staging_data
WHERE session_id = (SELECT MAX(id) FROM t_import_sessions WHERE tenant_id = 9 AND is_live = true)
GROUP BY processing_status
ORDER BY first_processed;
