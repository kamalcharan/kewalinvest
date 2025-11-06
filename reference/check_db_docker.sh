#!/bin/bash

echo "=== Checking t_customers table schema ==="
docker exec kewalinvest_db psql -U kewal_admin -d kewalinvest -c "\d t_customers" 2>/dev/null | grep -E "family|iwell" || echo "Could not connect to database"

echo ""
echo "=== Checking most recent import sessions ==="
docker exec kewalinvest_db psql -U kewal_admin -d kewalinvest -c "
SELECT id, session_name, import_type, status, total_records, successful_records, created_at
FROM t_import_sessions
WHERE import_type = 'CustomerData'
ORDER BY created_at DESC
LIMIT 3;
" 2>/dev/null || echo "Could not query sessions"

echo ""
echo "=== Getting latest session ID ==="
SESSION_ID=$(docker exec kewalinvest_db psql -U kewal_admin -d kewalinvest -t -c "
SELECT id FROM t_import_sessions
WHERE import_type = 'CustomerData'
ORDER BY created_at DESC
LIMIT 1;
" 2>/dev/null | tr -d ' ')

if [ ! -z "$SESSION_ID" ]; then
    echo "Found Session ID: $SESSION_ID"
    echo ""
    echo "=== Checking staging mapped_data for session $SESSION_ID ==="
    docker exec kewalinvest_db psql -U kewal_admin -d kewalinvest -c "
    SELECT
        row_number,
        mapped_data->>'name' as customer_name,
        mapped_data->>'family_head_name' as family_head_name,
        mapped_data->>'family_head_iwell_code' as family_head_code,
        mapped_data->>'iwell_code' as iwell_code,
        processing_status
    FROM t_import_staging_data
    WHERE session_id = $SESSION_ID
    LIMIT 5;
    " 2>/dev/null
    
    echo ""
    echo "=== Checking customers created recently ==="
    docker exec kewalinvest_db psql -U kewal_admin -d kewalinvest -c "
    SELECT
        c.id,
        ct.name as customer_name,
        c.family_head_name,
        c.family_head_iwell_code,
        c.iwell_code
    FROM t_customers c
    JOIN t_contacts ct ON c.contact_id = ct.id
    WHERE c.created_at > NOW() - INTERVAL '1 hour'
    ORDER BY c.created_at DESC
    LIMIT 5;
    " 2>/dev/null
else
    echo "No recent customer import sessions found"
fi
