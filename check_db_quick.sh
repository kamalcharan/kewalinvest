#!/bin/bash

# Quick database check script
export PGPASSWORD='kewal_secure_pass_2024'

echo "=== Checking t_customers table schema ==="
psql -h localhost -U kewal_admin -d kewalinvest -c "\d t_customers" | grep -E "family|iwell"

echo ""
echo "=== Checking most recent import session ==="
psql -h localhost -U kewal_admin -d kewalinvest -c "
SELECT id, session_name, import_type, status, total_records, successful_records, created_at
FROM t_import_sessions
WHERE import_type = 'CustomerData'
ORDER BY created_at DESC
LIMIT 3;
"

echo ""
echo "=== Getting latest session ID for detailed check ==="
SESSION_ID=$(psql -h localhost -U kewal_admin -d kewalinvest -t -c "
SELECT id FROM t_import_sessions
WHERE import_type = 'CustomerData'
ORDER BY created_at DESC
LIMIT 1;
" | tr -d ' ')

if [ ! -z "$SESSION_ID" ]; then
    echo "Session ID: $SESSION_ID"
    echo ""
    echo "=== Checking staging data for session $SESSION_ID ==="
    psql -h localhost -U kewal_admin -d kewalinvest -c "
    SELECT
        row_number,
        LEFT(mapped_data::text, 200) as mapped_data_preview,
        mapped_data->>'name' as customer_name,
        mapped_data->>'family_head_name' as family_head_name,
        mapped_data->>'family_head_iwell_code' as family_head_code,
        processing_status
    FROM t_import_staging_data
    WHERE session_id = $SESSION_ID
    LIMIT 5;
    "
    
    echo ""
    echo "=== Checking customers created from this import ==="
    psql -h localhost -U kewal_admin -d kewalinvest -c "
    SELECT
        c.id,
        ct.name as customer_name,
        c.family_head_name,
        c.family_head_iwell_code,
        c.iwell_code
    FROM t_customers c
    JOIN t_contacts ct ON c.contact_id = ct.id
    WHERE c.created_at > NOW() - INTERVAL '10 minutes'
    ORDER BY c.created_at DESC
    LIMIT 5;
    "
fi

unset PGPASSWORD
