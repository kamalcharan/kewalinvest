-- ============================================================================
-- File: 08_diagnostic_check.sql
-- Description: Diagnostic script to check migration status for old tenants
-- Purpose: Run this FIRST to identify what's missing before applying fixes
-- Date: 2025-12-20
-- ============================================================================
-- RUN THIS SCRIPT ON THE CLIENT DATABASE TO CHECK STATUS
-- ============================================================================

DO $$
DECLARE
    v_result RECORD;
BEGIN
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'KEWAL INVEST - DATABASE DIAGNOSTIC CHECK';
    RAISE NOTICE 'Date: %', NOW();
    RAISE NOTICE '==============================================';
    RAISE NOTICE '';
END $$;

-- ============================================================================
-- SECTION 1: CHECK CORE MASTER TABLES EXIST
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE '--- SECTION 1: CORE MASTER TABLES ---';
END $$;

SELECT
    'MASTER TABLES CHECK' as check_type,
    jsonb_build_object(
        'm_job_types', EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'm_job_types'),
        'm_transaction_types', EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'm_transaction_types'),
        'm_alert_settings', EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'm_alert_settings'),
        'm_bookmark_reasons', EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'm_bookmark_reasons'),
        'm_asset_types', EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'm_asset_types'),
        't_market_indices', EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 't_market_indices')
    ) as table_exists;

-- ============================================================================
-- SECTION 2: CHECK m_job_types DATA (CRITICAL FOR SIGNUP)
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '--- SECTION 2: m_job_types DATA CHECK ---';
END $$;

SELECT
    'JOB TYPES' as check_type,
    CASE WHEN EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'm_job_types')
    THEN (
        SELECT jsonb_build_object(
            'total_count', COUNT(*),
            'active_count', COUNT(*) FILTER (WHERE is_active = true),
            'codes', jsonb_agg(code ORDER BY code)
        ) FROM m_job_types
    )
    ELSE '{"error": "TABLE_NOT_EXISTS"}'::jsonb
    END as status;

-- ============================================================================
-- SECTION 3: CHECK m_transaction_types DATA
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '--- SECTION 3: m_transaction_types DATA CHECK ---';
END $$;

SELECT
    'TRANSACTION TYPES' as check_type,
    CASE WHEN EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'm_transaction_types')
    THEN (
        SELECT jsonb_build_object(
            'total_count', COUNT(*),
            'addition_count', COUNT(*) FILTER (WHERE txn_type = 'Addition'),
            'deduction_count', COUNT(*) FILTER (WHERE txn_type = 'Deduction'),
            'has_stp_aliases', EXISTS(SELECT 1 FROM m_transaction_types WHERE txn_code IN ('SYSTEMATIC TRANSFER IN', 'SYSTEMATIC TRANSFER OUT'))
        ) FROM m_transaction_types
    )
    ELSE '{"error": "TABLE_NOT_EXISTS"}'::jsonb
    END as status;

-- ============================================================================
-- SECTION 4: CHECK MIGRATION 023 - ALERT SYSTEM ENHANCEMENTS
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '--- SECTION 4: MIGRATION 023 CHECK (Alert System) ---';
END $$;

SELECT
    'MIGRATION 023' as check_type,
    jsonb_build_object(
        'm_alert_settings_exists', EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'm_alert_settings'),
        'm_alert_settings_count', (SELECT COUNT(*) FROM m_alert_settings WHERE EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'm_alert_settings')),
        't_jtbd_configurations.completed_at', EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 't_jtbd_configurations' AND column_name = 'completed_at'),
        't_jtbd_configurations.completed_by', EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 't_jtbd_configurations' AND column_name = 'completed_by'),
        't_jtbd_configurations.completion_source', EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 't_jtbd_configurations' AND column_name = 'completion_source'),
        't_jtbd_configurations.auto_expire_at', EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 't_jtbd_configurations' AND column_name = 'auto_expire_at'),
        't_customer_asset_assignments.alerts_enabled', EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 't_customer_asset_assignments' AND column_name = 'alerts_enabled')
    ) as status;

-- ============================================================================
-- SECTION 5: CHECK MIGRATION 024 - CUSTOMER ALIASES
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '--- SECTION 5: MIGRATION 024 CHECK (Customer Aliases) ---';
END $$;

SELECT
    'MIGRATION 024' as check_type,
    jsonb_build_object(
        't_customer_aliases_exists', EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 't_customer_aliases'),
        't_customer_alias_members_exists', EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 't_customer_alias_members')
    ) as status;

-- ============================================================================
-- SECTION 6: CHECK MIGRATION 025 - DROP PAN CONSTRAINT
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '--- SECTION 6: MIGRATION 025 CHECK (PAN Constraint) ---';
END $$;

SELECT
    'MIGRATION 025' as check_type,
    jsonb_build_object(
        'unique_customer_pan_exists', EXISTS(SELECT 1 FROM pg_constraint WHERE conname = 'unique_customer_pan'),
        'idx_customers_pan_exists', EXISTS(SELECT 1 FROM pg_indexes WHERE indexname = 'idx_customers_pan'),
        'check_customer_duplicate_function', EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'check_customer_duplicate')
    ) as status;

-- ============================================================================
-- SECTION 7: CHECK MIGRATION 027 - GOAL WATCHLIST COLUMNS
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '--- SECTION 7: MIGRATION 027 CHECK (Watchlist Columns) ---';
END $$;

SELECT
    'MIGRATION 027' as check_type,
    jsonb_build_object(
        't_jtbd_configurations.is_watchlisted', EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 't_jtbd_configurations' AND column_name = 'is_watchlisted'),
        't_jtbd_configurations.watchlist_reason', EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 't_jtbd_configurations' AND column_name = 'watchlist_reason')
    ) as status;

-- ============================================================================
-- SECTION 8: CHECK MIGRATION 028 - NAV METRICS COLUMNS
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '--- SECTION 8: MIGRATION 028 CHECK (NAV Metrics) ---';
END $$;

SELECT
    'MIGRATION 028' as check_type,
    jsonb_build_object(
        't_nav_data.daily_return', EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 't_nav_data' AND column_name = 'daily_return'),
        't_nav_data.return_1y', EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 't_nav_data' AND column_name = 'return_1y'),
        't_nav_data.sharpe_ratio', EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 't_nav_data' AND column_name = 'sharpe_ratio'),
        't_nav_data.metrics_calculated_at', EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 't_nav_data' AND column_name = 'metrics_calculated_at')
    ) as status;

-- ============================================================================
-- SECTION 9: CHECK TENANT DATA (Bookmark Reasons, Job Configs)
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '--- SECTION 9: TENANT DATA CHECK ---';
END $$;

-- List all tenants and their data status
SELECT
    t.id as tenant_id,
    t.tenant_name,
    t.tenant_code,
    t.is_admin,
    (SELECT COUNT(*) FROM m_bookmark_reasons WHERE tenant_id = t.id) as bookmark_reasons_count,
    (SELECT COUNT(*) FROM t_job_scheduler_configs WHERE tenant_id = t.id) as job_configs_count,
    (SELECT COUNT(*) FROM t_portfolio_snapshot_configs WHERE tenant_id = t.id) as snapshot_configs_count
FROM t_tenants t
ORDER BY t.id;

-- ============================================================================
-- SECTION 10: SUMMARY
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'DIAGNOSTIC CHECK COMPLETE';
    RAISE NOTICE '==============================================';
    RAISE NOTICE '';
    RAISE NOTICE 'INTERPRETATION:';
    RAISE NOTICE '  - true  = EXISTS/APPLIED';
    RAISE NOTICE '  - false = MISSING/NEEDS FIX';
    RAISE NOTICE '';
    RAISE NOTICE 'NEXT STEPS:';
    RAISE NOTICE '  1. If m_job_types is empty -> Run seed data';
    RAISE NOTICE '  2. If migrations show false -> Run that migration';
    RAISE NOTICE '  3. If tenant has 0 job_configs -> Run tenant init';
    RAISE NOTICE '==============================================';
END $$;
