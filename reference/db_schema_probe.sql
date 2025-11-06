-- ============================================================================
-- Database Schema Probe Script
-- Purpose: Extract current database structure to verify/update SQL migrations
-- Output: Complete schema inventory including tables, columns, constraints, etc.
-- Run: psql -U kewal_admin -d kewalinvest -f probe_schema.sql > schema_output.txt
-- ============================================================================

\echo '========================================='
\echo 'DATABASE SCHEMA PROBE'
\echo '========================================='
\echo ''

-- ============================================================================
-- SECTION 1: DATABASE AND EXTENSION INFO
-- ============================================================================
\echo '1. DATABASE INFORMATION'
\echo '---'
SELECT 
    datname as database_name,
    pg_size_pretty(pg_database_size(datname)) as size,
    (SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public') as table_count,
    (SELECT count(*) FROM pg_extension) as extension_count
FROM pg_database 
WHERE datname = current_database();

\echo ''
\echo '2. ENABLED EXTENSIONS'
\echo '---'
SELECT 
    extname as extension,
    extversion as version,
    extnamespace::regnamespace as schema
FROM pg_extension
ORDER BY extname;

-- ============================================================================
-- SECTION 2: TABLE STRUCTURE
-- ============================================================================
\echo ''
\echo '3. ALL TABLES (Ordered by Creation)'
\echo '---'
SELECT 
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
    (SELECT count(*) FROM information_schema.columns WHERE table_name = tablename AND table_schema = 'public') as column_count
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- ============================================================================
-- SECTION 3: TABLE DEFINITIONS (DDL)
-- ============================================================================
\echo ''
\echo '4. TABLE DEFINITIONS (CREATE TABLE statements)'
\echo '---'

DO $$
DECLARE
    r RECORD;
    column_def TEXT;
    constraints_text TEXT;
BEGIN
    FOR r IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public'
        ORDER BY tablename
    LOOP
        RAISE NOTICE 'Table: %', r.tablename;
        
        -- Get table definition
        SELECT string_agg(
            column_name || ' ' || data_type || 
            CASE WHEN character_maximum_length IS NOT NULL 
                THEN '(' || character_maximum_length || ')' 
                ELSE '' 
            END ||
            CASE WHEN is_nullable = 'NO' THEN ' NOT NULL' ELSE '' END,
            ', ' ORDER BY ordinal_position
        ) INTO column_def
        FROM information_schema.columns
        WHERE table_name = r.tablename AND table_schema = 'public';
        
        RAISE NOTICE '  Columns: %', column_def;
        RAISE NOTICE '';
    END LOOP;
END $$;

-- ============================================================================
-- SECTION 4: DETAILED COLUMN INFORMATION
-- ============================================================================
\echo ''
\echo '5. COLUMN DETAILS'
\echo '---'
SELECT 
    t.table_name,
    c.column_name,
    c.data_type,
    CASE WHEN c.character_maximum_length IS NOT NULL 
        THEN '(' || c.character_maximum_length || ')' 
        ELSE '' 
    END as length,
    c.is_nullable,
    c.column_default as default_value
FROM information_schema.tables t
JOIN information_schema.columns c ON t.table_name = c.table_name
WHERE t.table_schema = 'public' AND c.table_schema = 'public'
ORDER BY t.table_name, c.ordinal_position;

-- ============================================================================
-- SECTION 5: PRIMARY KEYS
-- ============================================================================
\echo ''
\echo '6. PRIMARY KEY CONSTRAINTS'
\echo '---'
SELECT 
    t.table_name,
    string_agg(a.attname, ', ' ORDER BY a.attnum) as primary_key_columns
FROM pg_constraint c
JOIN pg_class r ON r.oid = c.conrelid
JOIN pg_attribute a ON a.attrelid = r.oid AND a.attnum = ANY(c.conkey)
JOIN information_schema.tables t ON t.table_name = r.relname
WHERE c.contype = 'p' AND t.table_schema = 'public'
GROUP BY t.table_name
ORDER BY t.table_name;

-- ============================================================================
-- SECTION 6: FOREIGN KEY CONSTRAINTS
-- ============================================================================
\echo ''
\echo '7. FOREIGN KEY CONSTRAINTS'
\echo '---'
SELECT 
    constraint_name,
    table_name,
    column_name,
    foreign_table_name,
    foreign_column_name
FROM (
    SELECT 
        tc.constraint_name,
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage AS ccu ON ccu.constraint_name = tc.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public'
) fks
ORDER BY table_name, constraint_name;

-- ============================================================================
-- SECTION 7: UNIQUE CONSTRAINTS
-- ============================================================================
\echo ''
\echo '8. UNIQUE CONSTRAINTS'
\echo '---'
SELECT 
    constraint_name,
    table_name,
    string_agg(column_name, ', ' ORDER BY ordinal_position) as columns
FROM (
    SELECT 
        tc.constraint_name,
        tc.table_name,
        kcu.column_name,
        kcu.ordinal_position
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu ON tc.constraint_name = kcu.constraint_name
    WHERE tc.constraint_type = 'UNIQUE' AND tc.table_schema = 'public'
) u
GROUP BY constraint_name, table_name
ORDER BY table_name, constraint_name;

-- ============================================================================
-- SECTION 8: CHECK CONSTRAINTS
-- ============================================================================
\echo ''
\echo '9. CHECK CONSTRAINTS'
\echo '---'
SELECT 
    constraint_name,
    table_name,
    check_clause
FROM information_schema.check_constraints
WHERE constraint_schema = 'public'
ORDER BY table_name, constraint_name;

-- ============================================================================
-- SECTION 9: INDEXES
-- ============================================================================
\echo ''
\echo '10. INDEXES'
\echo '---'
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- ============================================================================
-- SECTION 10: VIEWS
-- ============================================================================
\echo ''
\echo '11. VIEWS'
\echo '---'
SELECT 
    table_name as view_name,
    view_definition
FROM information_schema.views
WHERE table_schema = 'public'
ORDER BY table_name;

-- ============================================================================
-- SECTION 11: FUNCTIONS
-- ============================================================================
\echo ''
\echo '12. FUNCTIONS'
\echo '---'
SELECT 
    p.proname as function_name,
    pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
ORDER BY p.proname;

-- ============================================================================
-- SECTION 12: TRIGGERS
-- ============================================================================
\echo ''
\echo '13. TRIGGERS'
\echo '---'
SELECT 
    trigger_name,
    event_object_table as table_name,
    event_manipulation as trigger_event,
    action_statement as trigger_function
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

-- ============================================================================
-- SECTION 13: ROW LEVEL SECURITY POLICIES
-- ============================================================================
\echo ''
\echo '14. RLS POLICIES'
\echo '---'
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- ============================================================================
-- SECTION 14: TABLE COMMENTS
-- ============================================================================
\echo ''
\echo '15. TABLE COMMENTS'
\echo '---'
SELECT 
    t.tablename,
    obj_description((t.schemaname||'.'||t.tablename)::regclass, 'pg_class') as comment
FROM pg_tables t
WHERE t.schemaname = 'public' 
    AND obj_description((t.schemaname||'.'||t.tablename)::regclass, 'pg_class') IS NOT NULL
ORDER BY t.tablename;

-- ============================================================================
-- SECTION 15: COLUMN COMMENTS
-- ============================================================================
\echo ''
\echo '16. COLUMN COMMENTS'
\echo '---'
SELECT 
    table_name,
    column_name,
    col_description((table_name)::regclass, ordinal_position) as comment
FROM information_schema.columns
WHERE table_schema = 'public'
    AND col_description((table_name)::regclass, ordinal_position) IS NOT NULL
ORDER BY table_name, ordinal_position;

-- ============================================================================
-- SECTION 16: SEQUENCE INFORMATION
-- ============================================================================
\echo ''
\echo '17. SEQUENCES (AUTO-INCREMENT)'
\echo '---'
SELECT 
    sequence_schema,
    sequence_name,
    sequence_catalog
FROM information_schema.sequences
WHERE sequence_schema = 'public'
ORDER BY sequence_name;

-- ============================================================================
-- SECTION 17: SUMMARY STATISTICS
-- ============================================================================
\echo ''
\echo '18. SCHEMA SUMMARY STATISTICS'
\echo '---'
SELECT 
    (SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public') as total_tables,
    (SELECT count(*) FROM information_schema.columns WHERE table_schema = 'public') as total_columns,
    (SELECT count(*) FROM information_schema.table_constraints WHERE constraint_schema = 'public') as total_constraints,
    (SELECT count(*) FROM pg_indexes WHERE schemaname = 'public') as total_indexes,
    (SELECT count(*) FROM information_schema.views WHERE table_schema = 'public') as total_views,
    (SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid WHERE n.nspname = 'public') as total_functions,
    (SELECT count(*) FROM pg_trigger WHERE tgisinternal = false) as total_triggers,
    (SELECT count(*) FROM pg_policies WHERE schemaname = 'public') as total_policies;

\echo ''
\echo '========================================='
\echo 'PROBE COMPLETE'
\echo '========================================='