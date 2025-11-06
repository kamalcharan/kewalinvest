-- Debug script to check family field import issue
-- Run this after importing customer data

-- 1. Check the most recent import session
SELECT
    id,
    session_name,
    import_type,
    status,
    total_records,
    successful_records,
    created_at
FROM t_import_sessions
WHERE import_type = 'CustomerData'
ORDER BY created_at DESC
LIMIT 5;

-- 2. Check staging data - inspect mapped_data JSON to see if family fields are present
-- Replace <session_id> with the session ID from above
SELECT
    row_number,
    raw_data->>'Family Head Name' as raw_family_head_name,
    raw_data->>'Family Head Code' as raw_family_head_code,
    raw_data->>'Family Head' as raw_family_head,
    mapped_data->>'family_head_name' as mapped_family_head_name,
    mapped_data->>'family_head_iwell_code' as mapped_family_head_code,
    mapped_data->>'name' as customer_name,
    processing_status
FROM t_import_staging_data
WHERE session_id = <session_id>  -- Replace with actual session ID
LIMIT 10;

-- 3. Check if data was inserted into t_customers table
SELECT
    c.id,
    ct.name as customer_name,
    c.family_head_name,
    c.family_head_iwell_code,
    c.iwell_code,
    c.created_at
FROM t_customers c
JOIN t_contacts ct ON c.contact_id = ct.id
WHERE c.created_at > NOW() - INTERVAL '1 hour'  -- Customers created in last hour
ORDER BY c.created_at DESC
LIMIT 10;

-- 4. Check the field mappings that were used
SELECT
    field_mappings
FROM t_import_field_mappings
WHERE import_type = 'CustomerData'
    AND is_active = true
ORDER BY created_at DESC
LIMIT 3;
