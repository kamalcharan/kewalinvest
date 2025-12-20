-- ============================================================================
-- File: 08_diagnostic_check.sql
-- Description: Diagnostic script to check migration status for old tenants
-- Purpose: Run this FIRST to identify what's missing before applying fixes
-- Date: 2025-12-20 (v2 - Fixed to handle missing tables)
-- ============================================================================
-- RUN THIS SCRIPT ON THE CLIENT DATABASE TO CHECK STATUS
-- ============================================================================

-- ============================================================================
-- HEADER
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'KEWAL INVEST - DATABASE DIAGNOSTIC CHECK v2';
    RAISE NOTICE 'Date: %', NOW();
    RAISE NOTICE '==============================================';
    RAISE NOTICE '';
END $$;

-- ============================================================================
-- SECTION 1: CHECK CORE MASTER TABLES EXIST
-- ============================================================================
DO $$
DECLARE
    v_m_job_types BOOLEAN;
    v_m_transaction_types BOOLEAN;
    v_m_alert_settings BOOLEAN;
    v_m_bookmark_reasons BOOLEAN;
    v_m_asset_types BOOLEAN;
    v_t_market_indices BOOLEAN;
    v_t_tenants BOOLEAN;
    v_t_users BOOLEAN;
    v_t_customers BOOLEAN;
    v_t_job_scheduler_configs BOOLEAN;
BEGIN
    RAISE NOTICE '=== SECTION 1: CORE TABLES CHECK ===';

    SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'm_job_types') INTO v_m_job_types;
    SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'm_transaction_types') INTO v_m_transaction_types;
    SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'm_alert_settings') INTO v_m_alert_settings;
    SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'm_bookmark_reasons') INTO v_m_bookmark_reasons;
    SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'm_asset_types') INTO v_m_asset_types;
    SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 't_market_indices') INTO v_t_market_indices;
    SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 't_tenants') INTO v_t_tenants;
    SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 't_users') INTO v_t_users;
    SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 't_customers') INTO v_t_customers;
    SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 't_job_scheduler_configs') INTO v_t_job_scheduler_configs;

    RAISE NOTICE '';
    RAISE NOTICE 'Master Tables:';
    RAISE NOTICE '  m_job_types:          % %', CASE WHEN v_m_job_types THEN '✓' ELSE '✗' END, CASE WHEN v_m_job_types THEN 'EXISTS' ELSE 'MISSING - CRITICAL!' END;
    RAISE NOTICE '  m_transaction_types:  % %', CASE WHEN v_m_transaction_types THEN '✓' ELSE '✗' END, CASE WHEN v_m_transaction_types THEN 'EXISTS' ELSE 'MISSING' END;
    RAISE NOTICE '  m_bookmark_reasons:   % %', CASE WHEN v_m_bookmark_reasons THEN '✓' ELSE '✗' END, CASE WHEN v_m_bookmark_reasons THEN 'EXISTS' ELSE 'MISSING' END;
    RAISE NOTICE '  m_alert_settings:     % %', CASE WHEN v_m_alert_settings THEN '✓' ELSE '✗' END, CASE WHEN v_m_alert_settings THEN 'EXISTS' ELSE 'MISSING (Migration 023)' END;
    RAISE NOTICE '  m_asset_types:        % %', CASE WHEN v_m_asset_types THEN '✓' ELSE '✗' END, CASE WHEN v_m_asset_types THEN 'EXISTS' ELSE 'MISSING' END;

    RAISE NOTICE '';
    RAISE NOTICE 'Core Tables:';
    RAISE NOTICE '  t_tenants:            % %', CASE WHEN v_t_tenants THEN '✓' ELSE '✗' END, CASE WHEN v_t_tenants THEN 'EXISTS' ELSE 'MISSING - CRITICAL!' END;
    RAISE NOTICE '  t_users:              % %', CASE WHEN v_t_users THEN '✓' ELSE '✗' END, CASE WHEN v_t_users THEN 'EXISTS' ELSE 'MISSING - CRITICAL!' END;
    RAISE NOTICE '  t_customers:          % %', CASE WHEN v_t_customers THEN '✓' ELSE '✗' END, CASE WHEN v_t_customers THEN 'EXISTS' ELSE 'MISSING' END;
    RAISE NOTICE '  t_market_indices:     % %', CASE WHEN v_t_market_indices THEN '✓' ELSE '✗' END, CASE WHEN v_t_market_indices THEN 'EXISTS' ELSE 'MISSING' END;
    RAISE NOTICE '  t_job_scheduler_configs: % %', CASE WHEN v_t_job_scheduler_configs THEN '✓' ELSE '✗' END, CASE WHEN v_t_job_scheduler_configs THEN 'EXISTS' ELSE 'MISSING' END;

    -- Critical check
    IF NOT v_m_job_types THEN
        RAISE NOTICE '';
        RAISE NOTICE '!!! CRITICAL: m_job_types table is MISSING !!!';
        RAISE NOTICE 'This table is required for signup/registration to work.';
        RAISE NOTICE 'You need to run the full schema setup (02_tables.sql) first.';
    END IF;

    RAISE NOTICE '';
END $$;

-- ============================================================================
-- SECTION 2: CHECK m_job_types DATA (Only if table exists)
-- ============================================================================
DO $$
DECLARE
    v_count INTEGER;
    v_active_count INTEGER;
    v_codes TEXT;
BEGIN
    RAISE NOTICE '=== SECTION 2: m_job_types DATA ===';

    IF NOT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'm_job_types') THEN
        RAISE NOTICE '  TABLE DOES NOT EXIST - Cannot check data';
        RAISE NOTICE '  ACTION: Run 02_tables.sql to create schema';
        RAISE NOTICE '';
        RETURN;
    END IF;

    SELECT COUNT(*), COUNT(*) FILTER (WHERE is_active = true) INTO v_count, v_active_count FROM m_job_types;
    SELECT string_agg(code, ', ' ORDER BY code) INTO v_codes FROM m_job_types;

    RAISE NOTICE '  Total records: %', v_count;
    RAISE NOTICE '  Active records: %', v_active_count;
    RAISE NOTICE '  Codes: %', COALESCE(v_codes, '(none)');

    IF v_count = 0 THEN
        RAISE NOTICE '';
        RAISE NOTICE '  !!! WARNING: m_job_types is EMPTY !!!';
        RAISE NOTICE '  Signup will fail without job types.';
        RAISE NOTICE '  ACTION: Run 09_old_tenant_seed.sql';
    ELSIF v_count < 5 THEN
        RAISE NOTICE '';
        RAISE NOTICE '  !!! WARNING: m_job_types has only % records (expected 5) !!!', v_count;
        RAISE NOTICE '  ACTION: Run 09_old_tenant_seed.sql to add missing types';
    ELSE
        RAISE NOTICE '  Status: OK (5 required, % found)', v_count;
    END IF;

    RAISE NOTICE '';
END $$;

-- ============================================================================
-- SECTION 3: CHECK m_transaction_types DATA (Only if table exists)
-- ============================================================================
DO $$
DECLARE
    v_count INTEGER;
    v_addition_count INTEGER;
    v_deduction_count INTEGER;
    v_has_stp BOOLEAN;
BEGIN
    RAISE NOTICE '=== SECTION 3: m_transaction_types DATA ===';

    IF NOT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'm_transaction_types') THEN
        RAISE NOTICE '  TABLE DOES NOT EXIST - Cannot check data';
        RAISE NOTICE '  ACTION: Run 02_tables.sql to create schema';
        RAISE NOTICE '';
        RETURN;
    END IF;

    SELECT
        COUNT(*),
        COUNT(*) FILTER (WHERE txn_type = 'Addition'),
        COUNT(*) FILTER (WHERE txn_type = 'Deduction'),
        EXISTS(SELECT 1 FROM m_transaction_types WHERE txn_code IN ('SYSTEMATIC TRANSFER IN', 'SYSTEMATIC TRANSFER OUT'))
    INTO v_count, v_addition_count, v_deduction_count, v_has_stp
    FROM m_transaction_types;

    RAISE NOTICE '  Total records: %', v_count;
    RAISE NOTICE '  Addition types: %', v_addition_count;
    RAISE NOTICE '  Deduction types: %', v_deduction_count;
    RAISE NOTICE '  Has STP aliases: %', v_has_stp;

    IF v_count = 0 THEN
        RAISE NOTICE '  !!! WARNING: m_transaction_types is EMPTY !!!';
        RAISE NOTICE '  ACTION: Run 09_old_tenant_seed.sql';
    ELSIF v_count < 11 THEN
        RAISE NOTICE '  !!! WARNING: Missing some transaction types (expected 11) !!!';
        RAISE NOTICE '  ACTION: Run 09_old_tenant_seed.sql to add missing types';
    ELSE
        RAISE NOTICE '  Status: OK';
    END IF;

    RAISE NOTICE '';
END $$;

-- ============================================================================
-- SECTION 4: CHECK MIGRATION 023 - ALERT SYSTEM
-- ============================================================================
DO $$
DECLARE
    v_alert_settings BOOLEAN;
    v_completed_at BOOLEAN;
    v_completed_by BOOLEAN;
    v_auto_expire_at BOOLEAN;
    v_alerts_enabled BOOLEAN;
BEGIN
    RAISE NOTICE '=== SECTION 4: MIGRATION 023 (Alert System) ===';

    SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'm_alert_settings') INTO v_alert_settings;
    SELECT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 't_jtbd_configurations' AND column_name = 'completed_at') INTO v_completed_at;
    SELECT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 't_jtbd_configurations' AND column_name = 'completed_by') INTO v_completed_by;
    SELECT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 't_jtbd_configurations' AND column_name = 'auto_expire_at') INTO v_auto_expire_at;
    SELECT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 't_customer_asset_assignments' AND column_name = 'alerts_enabled') INTO v_alerts_enabled;

    RAISE NOTICE '  m_alert_settings table:          % %', CASE WHEN v_alert_settings THEN '✓' ELSE '✗' END, CASE WHEN v_alert_settings THEN '' ELSE 'MISSING' END;
    RAISE NOTICE '  t_jtbd.completed_at column:      % %', CASE WHEN v_completed_at THEN '✓' ELSE '✗' END, CASE WHEN v_completed_at THEN '' ELSE 'MISSING' END;
    RAISE NOTICE '  t_jtbd.completed_by column:      % %', CASE WHEN v_completed_by THEN '✓' ELSE '✗' END, CASE WHEN v_completed_by THEN '' ELSE 'MISSING' END;
    RAISE NOTICE '  t_jtbd.auto_expire_at column:    % %', CASE WHEN v_auto_expire_at THEN '✓' ELSE '✗' END, CASE WHEN v_auto_expire_at THEN '' ELSE 'MISSING' END;
    RAISE NOTICE '  t_customer_asset.alerts_enabled: % %', CASE WHEN v_alerts_enabled THEN '✓' ELSE '✗' END, CASE WHEN v_alerts_enabled THEN '' ELSE 'MISSING' END;

    IF v_alert_settings AND v_completed_at AND v_auto_expire_at THEN
        RAISE NOTICE '  Status: APPLIED';
    ELSE
        RAISE NOTICE '  Status: NOT APPLIED - Run migrations/023_alert_system_enhancements.sql';
    END IF;

    RAISE NOTICE '';
END $$;

-- ============================================================================
-- SECTION 5: CHECK MIGRATION 024 - CUSTOMER ALIASES
-- ============================================================================
DO $$
DECLARE
    v_aliases BOOLEAN;
    v_alias_members BOOLEAN;
BEGIN
    RAISE NOTICE '=== SECTION 5: MIGRATION 024 (Customer Aliases) ===';

    SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 't_customer_aliases') INTO v_aliases;
    SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 't_customer_alias_members') INTO v_alias_members;

    RAISE NOTICE '  t_customer_aliases table:        % %', CASE WHEN v_aliases THEN '✓' ELSE '✗' END, CASE WHEN v_aliases THEN '' ELSE 'MISSING' END;
    RAISE NOTICE '  t_customer_alias_members table:  % %', CASE WHEN v_alias_members THEN '✓' ELSE '✗' END, CASE WHEN v_alias_members THEN '' ELSE 'MISSING' END;

    IF v_aliases AND v_alias_members THEN
        RAISE NOTICE '  Status: APPLIED';
    ELSE
        RAISE NOTICE '  Status: NOT APPLIED - Run migrations/024_customer_aliases.sql';
    END IF;

    RAISE NOTICE '';
END $$;

-- ============================================================================
-- SECTION 6: CHECK MIGRATION 027 - WATCHLIST COLUMNS
-- ============================================================================
DO $$
DECLARE
    v_is_watchlisted BOOLEAN;
    v_watchlist_reason BOOLEAN;
BEGIN
    RAISE NOTICE '=== SECTION 6: MIGRATION 027 (Watchlist) ===';

    SELECT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 't_jtbd_configurations' AND column_name = 'is_watchlisted') INTO v_is_watchlisted;
    SELECT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 't_jtbd_configurations' AND column_name = 'watchlist_reason') INTO v_watchlist_reason;

    RAISE NOTICE '  t_jtbd.is_watchlisted column:    % %', CASE WHEN v_is_watchlisted THEN '✓' ELSE '✗' END, CASE WHEN v_is_watchlisted THEN '' ELSE 'MISSING' END;
    RAISE NOTICE '  t_jtbd.watchlist_reason column:  % %', CASE WHEN v_watchlist_reason THEN '✓' ELSE '✗' END, CASE WHEN v_watchlist_reason THEN '' ELSE 'MISSING' END;

    IF v_is_watchlisted AND v_watchlist_reason THEN
        RAISE NOTICE '  Status: APPLIED';
    ELSE
        RAISE NOTICE '  Status: NOT APPLIED - Run migrations/027_fix_goal_watchlist_columns.sql';
    END IF;

    RAISE NOTICE '';
END $$;

-- ============================================================================
-- SECTION 7: CHECK MIGRATION 028 - NAV METRICS
-- ============================================================================
DO $$
DECLARE
    v_daily_return BOOLEAN;
    v_return_1y BOOLEAN;
    v_sharpe_ratio BOOLEAN;
BEGIN
    RAISE NOTICE '=== SECTION 7: MIGRATION 028 (NAV Metrics) ===';

    SELECT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 't_nav_data' AND column_name = 'daily_return') INTO v_daily_return;
    SELECT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 't_nav_data' AND column_name = 'return_1y') INTO v_return_1y;
    SELECT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 't_nav_data' AND column_name = 'sharpe_ratio') INTO v_sharpe_ratio;

    RAISE NOTICE '  t_nav_data.daily_return column:  % %', CASE WHEN v_daily_return THEN '✓' ELSE '✗' END, CASE WHEN v_daily_return THEN '' ELSE 'MISSING' END;
    RAISE NOTICE '  t_nav_data.return_1y column:     % %', CASE WHEN v_return_1y THEN '✓' ELSE '✗' END, CASE WHEN v_return_1y THEN '' ELSE 'MISSING' END;
    RAISE NOTICE '  t_nav_data.sharpe_ratio column:  % %', CASE WHEN v_sharpe_ratio THEN '✓' ELSE '✗' END, CASE WHEN v_sharpe_ratio THEN '' ELSE 'MISSING' END;

    IF v_daily_return AND v_return_1y AND v_sharpe_ratio THEN
        RAISE NOTICE '  Status: APPLIED';
    ELSE
        RAISE NOTICE '  Status: NOT APPLIED - Run migrations/028_add_nav_metrics_columns.sql';
    END IF;

    RAISE NOTICE '';
END $$;

-- ============================================================================
-- SECTION 8: CHECK TENANT DATA
-- ============================================================================
DO $$
DECLARE
    v_tenant RECORD;
    v_has_tenants BOOLEAN;
    v_has_bookmark_reasons BOOLEAN;
    v_has_job_configs BOOLEAN;
BEGIN
    RAISE NOTICE '=== SECTION 8: TENANT DATA STATUS ===';

    SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 't_tenants') INTO v_has_tenants;
    SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'm_bookmark_reasons') INTO v_has_bookmark_reasons;
    SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 't_job_scheduler_configs') INTO v_has_job_configs;

    IF NOT v_has_tenants THEN
        RAISE NOTICE '  t_tenants table DOES NOT EXIST - Cannot check tenants';
        RAISE NOTICE '';
        RETURN;
    END IF;

    RAISE NOTICE '';
    RAISE NOTICE '  Tenant ID | Name                | Code     | Bookmarks | Jobs | Status';
    RAISE NOTICE '  ----------|---------------------|----------|-----------|------|-------';

    FOR v_tenant IN
        SELECT
            id,
            tenant_name,
            tenant_code,
            CASE WHEN v_has_bookmark_reasons
                 THEN (SELECT COUNT(*) FROM m_bookmark_reasons WHERE tenant_id = t.id)
                 ELSE 0
            END as bookmark_count,
            CASE WHEN v_has_job_configs
                 THEN (SELECT COUNT(*) FROM t_job_scheduler_configs WHERE tenant_id = t.id)
                 ELSE 0
            END as job_count
        FROM t_tenants t
        ORDER BY id
    LOOP
        RAISE NOTICE '  % | % | % | % | % | %',
            LPAD(v_tenant.id::TEXT, 9),
            RPAD(LEFT(v_tenant.tenant_name, 19), 19),
            RPAD(v_tenant.tenant_code, 8),
            LPAD(v_tenant.bookmark_count::TEXT, 9),
            LPAD(v_tenant.job_count::TEXT, 4),
            CASE
                WHEN v_tenant.bookmark_count >= 8 AND v_tenant.job_count >= 3 THEN 'OK'
                WHEN v_tenant.bookmark_count > 0 OR v_tenant.job_count > 0 THEN 'PARTIAL'
                ELSE 'NOT INIT'
            END;
    END LOOP;

    RAISE NOTICE '';
END $$;

-- ============================================================================
-- SECTION 9: SUMMARY & RECOMMENDATIONS
-- ============================================================================
DO $$
DECLARE
    v_m_job_types BOOLEAN;
    v_m_transaction_types BOOLEAN;
    v_has_issues BOOLEAN := FALSE;
BEGIN
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'DIAGNOSTIC SUMMARY';
    RAISE NOTICE '==============================================';
    RAISE NOTICE '';

    SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'm_job_types') INTO v_m_job_types;
    SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'm_transaction_types') INTO v_m_transaction_types;

    IF NOT v_m_job_types THEN
        RAISE NOTICE '!!! CRITICAL: m_job_types table is MISSING !!!';
        RAISE NOTICE '';
        RAISE NOTICE 'REQUIRED ACTIONS:';
        RAISE NOTICE '  1. Run the full database setup:';
        RAISE NOTICE '     - 01_extensions.sql';
        RAISE NOTICE '     - 02_tables.sql';
        RAISE NOTICE '     - 03_functions.sql';
        RAISE NOTICE '     - 04_rls_policies.sql';
        RAISE NOTICE '     - 05_seed_data.sql';
        RAISE NOTICE '';
        RAISE NOTICE '  OR run the combined setup script if available.';
        v_has_issues := TRUE;
    ELSIF NOT v_m_transaction_types THEN
        RAISE NOTICE '!!! WARNING: Some master tables are MISSING !!!';
        RAISE NOTICE '';
        RAISE NOTICE 'REQUIRED ACTIONS:';
        RAISE NOTICE '  1. Run 02_tables.sql to create missing tables';
        RAISE NOTICE '  2. Run 05_seed_data.sql or 09_old_tenant_seed.sql';
        v_has_issues := TRUE;
    END IF;

    IF NOT v_has_issues THEN
        RAISE NOTICE 'Core tables exist. Check sections above for:';
        RAISE NOTICE '  - Empty master data tables -> Run 09_old_tenant_seed.sql';
        RAISE NOTICE '  - Missing migrations -> Run the specific migration file';
        RAISE NOTICE '  - Tenant NOT INIT status -> Run 09_old_tenant_seed.sql';
    END IF;

    RAISE NOTICE '';
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'DIAGNOSTIC CHECK COMPLETE';
    RAISE NOTICE '==============================================';
END $$;
