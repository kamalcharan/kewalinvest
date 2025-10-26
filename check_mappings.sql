-- Compare field mappings between working (tenant 2) and broken (tenant 9) imports
-- Find sessions for tenant 2
SELECT 
    'TENANT 2 (working)' as label,
    id as session_id,
    session_name,
    created_at
FROM t_import_sessions
WHERE tenant_id = 2 AND import_type = 'CustomerData'
ORDER BY created_at DESC
LIMIT 3;

-- Find sessions for tenant 9  
SELECT 
    'TENANT 9 (broken)' as label,
    id as session_id,
    session_name,
    created_at
FROM t_import_sessions
WHERE tenant_id = 9 AND import_type = 'CustomerData'
ORDER BY created_at DESC
LIMIT 3;
