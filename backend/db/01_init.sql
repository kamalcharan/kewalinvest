-- ============================================================================
-- File: 01_init.sql
-- Description: Foundation setup - Clean slate and prepare database
-- Purpose: Drop all existing objects and create necessary extensions
-- Execution: Run FIRST before any other migration files
-- Author: System
-- Date: 2025-01-08
-- Updated: 2025-10-22 (Synced with live database schema - current_schema.sql)
-- ============================================================================

-- ============================================================================
-- SECTION 1: INFORMATION
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Starting Database Initialization';
    RAISE NOTICE 'Database: kewalinvest';
    RAISE NOTICE 'This will DROP ALL existing objects';
    RAISE NOTICE '========================================';
END $$;

-- ============================================================================
-- SECTION 2: DROP ALL VIEWS (Must drop before tables)
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE 'Dropping all views...';
END $$;

-- Regular views
DROP VIEW IF EXISTS v_tenant_customer_schemes CASCADE;
DROP VIEW IF EXISTS v_import_staging_progress CASCADE;
DROP VIEW IF EXISTS v_import_staging_statistics CASCADE;

-- Materialized views
DROP MATERIALIZED VIEW IF EXISTS v_portfolio_current CASCADE;
DROP MATERIALIZED VIEW IF EXISTS t_customer_portfolio_totals CASCADE;

-- ============================================================================
-- SECTION 3: DROP ALL FUNCTIONS (Must drop before triggers)
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE 'Dropping all functions...';
END $$;

-- Trigger functions
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS update_staging_updated_at() CASCADE;
DROP FUNCTION IF EXISTS update_market_updated_at() CASCADE;

-- Customer import functions
DROP FUNCTION IF EXISTS process_customer_import_with_timing(INTEGER, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS process_single_customer_record(INTEGER) CASCADE;
DROP FUNCTION IF EXISTS check_customer_duplicate(VARCHAR, VARCHAR, VARCHAR) CASCADE;

-- Scheme import functions
DROP FUNCTION IF EXISTS process_single_scheme_record(INTEGER) CASCADE;
DROP FUNCTION IF EXISTS process_scheme_import_with_timing(INTEGER, INTEGER) CASCADE;

-- Transaction import functions
DROP FUNCTION IF EXISTS process_transaction_import_with_timing(INTEGER, INTEGER) CASCADE;

-- Cleanup functions
DROP FUNCTION IF EXISTS cleanup_old_staging_data(INTEGER) CASCADE;
DROP FUNCTION IF EXISTS cleanup_session_staging_data(INTEGER, BOOLEAN) CASCADE;
DROP FUNCTION IF EXISTS get_staging_storage_stats() CASCADE;

-- Utility functions
DROP FUNCTION IF EXISTS current_tenant_id() CASCADE;
DROP FUNCTION IF EXISTS current_environment() CASCADE;
DROP FUNCTION IF EXISTS refresh_portfolio_totals() CASCADE;
DROP FUNCTION IF EXISTS seed_bookmark_reasons_for_tenant(INTEGER, BOOLEAN) CASCADE;

-- ============================================================================
-- SECTION 4: DROP ALL TABLES (In reverse dependency order)
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE 'Dropping all tables...';
END $$;

-- Drop goal/JTBD tables
DROP TABLE IF EXISTS t_goal_progress_snapshots CASCADE;
DROP TABLE IF EXISTS t_goal_alerts CASCADE;
DROP TABLE IF EXISTS t_jtbd_configurations CASCADE;

-- Drop market data tables
DROP TABLE IF EXISTS t_market_download_logs CASCADE;
DROP TABLE IF EXISTS t_market_download_jobs CASCADE;
DROP TABLE IF EXISTS t_market_eod_scheduler CASCADE;
DROP TABLE IF EXISTS t_market_data_records CASCADE;
DROP TABLE IF EXISTS t_market_indices CASCADE;

-- Drop user preference tables
DROP TABLE IF EXISTS t_user_chart_preferences CASCADE;

-- Drop portfolio snapshot tables
DROP TABLE IF EXISTS t_monthly_portfolio_snapshots CASCADE;

-- Drop NAV tables
DROP TABLE IF EXISTS t_nav_schedule_executions CASCADE;
DROP TABLE IF EXISTS t_nav_scheduler_configs CASCADE;
DROP TABLE IF EXISTS t_nav_download_jobs CASCADE;
DROP TABLE IF EXISTS t_nav_data CASCADE;
DROP TABLE IF EXISTS t_scheme_bookmarks CASCADE;

-- Drop scheme tables
DROP TABLE IF EXISTS t_scheme_details CASCADE;
DROP TABLE IF EXISTS t_scheme_masters CASCADE;

-- Drop transaction tables
DROP TABLE IF EXISTS t_transaction_table CASCADE;
DROP TABLE IF EXISTS t_customer_master_portfolio CASCADE;
DROP TABLE IF EXISTS m_transaction_types CASCADE;

-- Drop import tables
DROP TABLE IF EXISTS t_import_record_results CASCADE;
DROP TABLE IF EXISTS t_import_staging_data CASCADE;
DROP TABLE IF EXISTS t_import_field_mappings CASCADE;
DROP TABLE IF EXISTS t_import_sessions CASCADE;
DROP TABLE IF EXISTS t_import_logs CASCADE;
DROP TABLE IF EXISTS t_file_uploads CASCADE;

-- Drop customer tables
DROP TABLE IF EXISTS t_customer_bookmarks CASCADE;
DROP TABLE IF EXISTS t_customer_addresses CASCADE;
DROP TABLE IF EXISTS t_customers CASCADE;
DROP TABLE IF EXISTS t_contact_channels CASCADE;
DROP TABLE IF EXISTS t_contacts CASCADE;

-- Drop chat tables
DROP TABLE IF EXISTS t_chat_messages CASCADE;
DROP TABLE IF EXISTS t_chat_sessions CASCADE;

-- Drop user tables
DROP TABLE IF EXISTS t_users CASCADE;

-- Drop bookmark reasons master
DROP TABLE IF EXISTS m_bookmark_reasons CASCADE;

-- Drop system logs
DROP TABLE IF EXISTS t_system_logs CASCADE;

-- Drop tenant table (last, as everything references it)
DROP TABLE IF EXISTS t_tenants CASCADE;

-- ============================================================================
-- SECTION 5: DROP ALL INDEXES (Dynamic Cleanup)
-- ============================================================================
DO $$
DECLARE
    r RECORD;
    v_dropped_count INTEGER := 0;
BEGIN
    RAISE NOTICE 'Dropping all custom indexes...';

    -- Drop all indexes that start with 'idx_' or 'm_' (our custom indexes)
    FOR r IN (
        SELECT schemaname, indexname
        FROM pg_indexes
        WHERE schemaname = 'public'
        AND (indexname LIKE 'idx_%' OR indexname LIKE 'm_%')
        ORDER BY indexname
    ) LOOP
        BEGIN
            EXECUTE 'DROP INDEX IF EXISTS ' || quote_ident(r.schemaname) || '.' || quote_ident(r.indexname) || ' CASCADE';
            v_dropped_count := v_dropped_count + 1;
        EXCEPTION WHEN OTHERS THEN
            NULL;
        END;
    END LOOP;

    RAISE NOTICE 'Dropped % custom indexes', v_dropped_count;
END $$;

-- ============================================================================
-- SECTION 6: DROP ALL TRIGGERS (Dynamic Cleanup)
-- ============================================================================
DO $$
DECLARE
    r RECORD;
    v_dropped_count INTEGER := 0;
BEGIN
    RAISE NOTICE 'Dropping all triggers...';

    -- Drop all non-internal triggers
    FOR r IN (
        SELECT tgname, relname
        FROM pg_trigger t
        JOIN pg_class c ON t.tgrelid = c.oid
        JOIN pg_namespace n ON c.relnamespace = n.oid
        WHERE n.nspname = 'public'
        AND NOT t.tgisinternal
        ORDER BY tgname
    ) LOOP
        BEGIN
            EXECUTE 'DROP TRIGGER IF EXISTS ' || quote_ident(r.tgname) ||
                    ' ON ' || quote_ident(r.relname) || ' CASCADE';
            v_dropped_count := v_dropped_count + 1;
        EXCEPTION WHEN OTHERS THEN
            NULL;
        END;
    END LOOP;

    RAISE NOTICE 'Dropped % triggers', v_dropped_count;
END $$;

-- ============================================================================
-- SECTION 7: DROP ALL POLICIES (Row Level Security)
-- ============================================================================
DO $$
DECLARE
    r RECORD;
    v_dropped_count INTEGER := 0;
BEGIN
    RAISE NOTICE 'Dropping all RLS policies...';

    -- Drop all policies in public schema
    FOR r IN (
        SELECT schemaname, tablename, policyname
        FROM pg_policies
        WHERE schemaname = 'public'
        ORDER BY tablename, policyname
    ) LOOP
        BEGIN
            EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) ||
                    ' ON ' || quote_ident(r.schemaname) || '.' || quote_ident(r.tablename) || ' CASCADE';
            v_dropped_count := v_dropped_count + 1;
        EXCEPTION WHEN OTHERS THEN
            NULL;
        END;
    END LOOP;

    RAISE NOTICE 'Dropped % RLS policies', v_dropped_count;
END $$;

-- Disable RLS on any remaining tables
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT tablename
        FROM pg_tables
        WHERE schemaname = 'public'
    ) LOOP
        BEGIN
            EXECUTE 'ALTER TABLE IF EXISTS ' || quote_ident(r.tablename) || ' DISABLE ROW LEVEL SECURITY';
        EXCEPTION WHEN OTHERS THEN
            NULL;
        END;
    END LOOP;
END $$;

-- ============================================================================
-- SECTION 8: CREATE EXTENSIONS
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE 'Creating required extensions...';
END $$;

-- UUID extension for unique identifiers
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- pg_trgm for fuzzy text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ============================================================================
-- SECTION 9: CREATE N8N SCHEMA (for n8n integration)
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE 'Creating n8n schema...';
END $$;

CREATE SCHEMA IF NOT EXISTS n8n;
ALTER SCHEMA n8n OWNER TO kewal_admin;

-- ============================================================================
-- SECTION 10: VERIFY CLEAN STATE
-- ============================================================================
DO $$
DECLARE
    v_table_count INTEGER;
    v_function_count INTEGER;
    v_view_count INTEGER;
    v_index_count INTEGER;
    v_trigger_count INTEGER;
    v_policy_count INTEGER;
    rec RECORD;
BEGIN
    -- Count remaining tables
    SELECT COUNT(*) INTO v_table_count
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_type = 'BASE TABLE';

    -- Count remaining functions
    SELECT COUNT(*) INTO v_function_count
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND p.prokind = 'f';

    -- Count remaining views
    SELECT COUNT(*) INTO v_view_count
    FROM information_schema.views
    WHERE table_schema = 'public';

    -- Count custom indexes
    SELECT COUNT(*) INTO v_index_count
    FROM pg_indexes
    WHERE schemaname = 'public'
    AND (indexname LIKE 'idx_%' OR indexname LIKE 'm_%');

    -- Count triggers
    SELECT COUNT(*) INTO v_trigger_count
    FROM pg_trigger
    WHERE tgisinternal = false;

    -- Count policies
    SELECT COUNT(*) INTO v_policy_count
    FROM pg_policies
    WHERE schemaname = 'public';

    RAISE NOTICE '========================================';
    RAISE NOTICE 'Cleanup Summary:';
    RAISE NOTICE 'Tables remaining: %', v_table_count;
    RAISE NOTICE 'Functions remaining: %', v_function_count;
    RAISE NOTICE 'Views remaining: %', v_view_count;
    RAISE NOTICE 'Custom indexes remaining: %', v_index_count;
    RAISE NOTICE 'Triggers remaining: %', v_trigger_count;
    RAISE NOTICE 'RLS policies remaining: %', v_policy_count;
    RAISE NOTICE '========================================';

    -- List any remaining tables (for debugging)
    IF v_table_count > 0 THEN
        RAISE NOTICE 'Remaining tables:';
        FOR rec IN
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
            AND table_type = 'BASE TABLE'
            ORDER BY table_name
        LOOP
            RAISE NOTICE '  - %', rec.table_name;
        END LOOP;
    END IF;

    -- Warn if custom indexes remain
    IF v_index_count > 0 THEN
        RAISE WARNING '% custom indexes still exist after cleanup', v_index_count;
    END IF;
END $$;

-- ============================================================================
-- SECTION 11: GRANT PERMISSIONS
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE 'Setting up permissions...';
END $$;

GRANT ALL ON SCHEMA public TO kewal_admin;
GRANT ALL ON SCHEMA n8n TO kewal_admin;

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Database initialization completed!';
    RAISE NOTICE 'Database is now ready for table creation';
    RAISE NOTICE 'Next: Run 02_tables.sql';
    RAISE NOTICE '========================================';
END $$;
