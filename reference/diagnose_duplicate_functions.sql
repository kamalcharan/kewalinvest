-- Diagnose duplicate function issue

-- Show ALL versions of check_customer_duplicate that exist
SELECT
    p.oid,
    p.proname as function_name,
    pg_get_function_identity_arguments(p.oid) as arguments,
    pg_get_function_result(p.oid) as return_type,
    n.nspname as schema,
    p.prosrc as source_code_snippet
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname = 'check_customer_duplicate'
ORDER BY p.oid;

-- Show which version process_single_customer_record is trying to call
SELECT
    p.proname,
    pg_get_functiondef(p.oid) as full_definition
FROM pg_proc p
WHERE p.proname = 'process_single_customer_record'
LIMIT 1;
