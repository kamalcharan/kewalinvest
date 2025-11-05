-- CRITICAL DIAGNOSTIC QUERY
-- This will show us exactly where the data is being lost

-- Step 1: Get the most recent customer import session
WITH recent_session AS (
    SELECT id
    FROM t_import_sessions
    WHERE import_type = 'CustomerData'
    ORDER BY created_at DESC
    LIMIT 1
)
SELECT
    '=== STAGING DATA ===' as section,
    s.row_number,
    s.mapped_data->>'name' as mapped_name,
    s.mapped_data->>'family_head_name' as mapped_family_name,
    s.mapped_data->>'family_head_iwell_code' as mapped_family_code,
    s.processing_status,
    s.created_record_id as customer_id_created,
    -- Test if JSON extraction works
    CASE
        WHEN s.mapped_data->>'family_head_name' IS NULL THEN 'NULL in JSON'
        WHEN TRIM(s.mapped_data->>'family_head_name') = '' THEN 'EMPTY STRING in JSON'
        ELSE 'Has value: ' || s.mapped_data->>'family_head_name'
    END as family_name_test
FROM t_import_staging_data s
WHERE s.session_id = (SELECT id FROM recent_session)
LIMIT 3

UNION ALL

SELECT
    '=== CUSTOMER DATA ===' as section,
    NULL as row_number,
    ct.name as mapped_name,
    c.family_head_name,
    c.family_head_iwell_code,
    NULL as processing_status,
    c.id as customer_id_created,
    -- Test actual column values
    CASE
        WHEN c.family_head_name IS NULL THEN 'NULL in DB'
        WHEN TRIM(c.family_head_name) = '' THEN 'EMPTY STRING in DB'
        ELSE 'Has value: ' || c.family_head_name
    END as family_name_test
FROM t_customers c
JOIN t_contacts ct ON c.contact_id = ct.id
WHERE c.created_at > NOW() - INTERVAL '30 minutes'
ORDER BY c.created_at DESC
LIMIT 3;
