-- ============================================================================
-- File: 09_old_tenant_seed.sql
-- Description: Seed master data for OLD tenants that missed initial seeding
-- Purpose: Run AFTER diagnostic check confirms missing data
-- Date: 2025-12-20
-- ============================================================================
--
-- THIS SCRIPT IS IDEMPOTENT - Safe to run multiple times
-- Uses ON CONFLICT DO NOTHING / UPDATE patterns
--
-- RUN ORDER:
--   1. First run 08_diagnostic_check.sql to identify issues
--   2. Then run this script to fix missing seed data
--   3. Re-run diagnostic to confirm fixes
-- ============================================================================

BEGIN;

DO $$
BEGIN
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'OLD TENANT SEED DATA - Starting';
    RAISE NOTICE 'Date: %', NOW();
    RAISE NOTICE '==============================================';
END $$;

-- ============================================================================
-- SECTION 1: SEED m_job_types (CRITICAL - Required for signup to work)
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '--- SECTION 1: Seeding m_job_types ---';
END $$;

-- Portfolio Snapshot - Friday 9 PM (weekly)
INSERT INTO m_job_types (code, name, description, default_cron_expression, default_max_retries, is_active, default_schedule_type, failover_enabled, failover_cron_expression, is_global)
VALUES ('PORTFOLIO_SNAPSHOT', 'Portfolio Snapshot Generation', 'Generate monthly portfolio snapshots for all customers to enable performance tracking', '0 21 * * 5', 3, true, 'weekly', false, NULL, false)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    default_cron_expression = EXCLUDED.default_cron_expression,
    is_active = EXCLUDED.is_active,
    updated_at = CURRENT_TIMESTAMP;

-- NAV Download - Daily 9 PM (GLOBAL)
INSERT INTO m_job_types (code, name, description, default_cron_expression, default_max_retries, is_active, default_schedule_type, failover_enabled, failover_cron_expression, is_global)
VALUES ('NAV_DOWNLOAD', 'NAV Download', 'Download NAV data for all bookmarked schemes', '0 21 * * *', 3, true, 'daily', true, '0 22 * * *', true)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    is_active = EXCLUDED.is_active,
    updated_at = CURRENT_TIMESTAMP;

-- Market OHLC Download - Daily 9:30 PM (GLOBAL)
INSERT INTO m_job_types (code, name, description, default_cron_expression, default_max_retries, is_active, default_schedule_type, failover_enabled, failover_cron_expression, is_global)
VALUES ('MARKET_OHLC_DOWNLOAD', 'Market OHLC Download', 'Download OHLC data for market indices', '30 21 * * *', 3, true, 'daily', false, NULL, true)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    is_active = EXCLUDED.is_active,
    updated_at = CURRENT_TIMESTAMP;

-- Goal Calculation - Friday 8:30 PM
INSERT INTO m_job_types (code, name, description, default_cron_expression, default_max_retries, is_active, default_schedule_type, failover_enabled, failover_cron_expression, is_global)
VALUES ('GOAL_CALCULATION', 'Goal Calculation', 'Recalculate all customer goals and generate alerts', '30 20 * * 5', 3, true, 'weekly', false, NULL, false)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    is_active = EXCLUDED.is_active,
    updated_at = CURRENT_TIMESTAMP;

-- Daily Alerts - Daily 8 PM
INSERT INTO m_job_types (code, name, description, default_cron_expression, default_max_retries, is_active, default_schedule_type, failover_enabled, failover_cron_expression, is_global)
VALUES ('DAILY_ALERTS', 'Daily Alerts', 'Process and generate daily alert cards for customers', '0 20 * * *', 3, true, 'daily', false, NULL, false)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    is_active = EXCLUDED.is_active,
    updated_at = CURRENT_TIMESTAMP;

DO $$
BEGIN
    RAISE NOTICE '✓ m_job_types seeded: % records', (SELECT COUNT(*) FROM m_job_types);
END $$;

-- ============================================================================
-- SECTION 2: SEED m_transaction_types (Including Migration 026 aliases)
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '--- SECTION 2: Seeding m_transaction_types ---';
END $$;

INSERT INTO m_transaction_types (txn_code, txn_name, txn_type, is_active, description)
VALUES
    -- ADDITION TYPES
    ('SIP', 'Systematic Investment Plan', 'Addition', TRUE, 'Regular systematic investment contributions at fixed intervals'),
    ('STP IN', 'Systematic Transfer Plan - In', 'Addition', TRUE, 'Systematic transfer of funds from another scheme (incoming)'),
    ('PURCHASE', 'One-Time Purchase', 'Addition', TRUE, 'Lump sum purchase or investment transaction'),
    ('SWITCH IN', 'Switch In', 'Addition', TRUE, 'Funds received from switching from another scheme'),
    ('OPENING BALANCE', 'Opening Balance', 'Addition', TRUE, 'Funds added to system portfolio to balance transaction records'),
    ('SYSTEMATIC TRANSFER IN', 'Systematic Transfer In', 'Addition', TRUE, 'Systematic transfer of funds from another scheme (incoming) - alternate code'),

    -- DEDUCTION TYPES
    ('STP OUT', 'Systematic Transfer Plan - Out', 'Deduction', TRUE, 'Systematic transfer of funds to another scheme (outgoing)'),
    ('REDEMPTION', 'Redemption', 'Deduction', TRUE, 'Withdrawal or redemption of invested funds'),
    ('SWITCH OUT', 'Switch Out', 'Deduction', TRUE, 'Funds moved out by switching to another scheme'),
    ('SELL', 'Sell', 'Deduction', TRUE, 'Funds moved out / encashed from the scheme'),
    ('SYSTEMATIC TRANSFER OUT', 'Systematic Transfer Out', 'Deduction', TRUE, 'Systematic transfer of funds to another scheme (outgoing) - alternate code')
ON CONFLICT (txn_code) DO UPDATE
    SET txn_name = EXCLUDED.txn_name,
        txn_type = EXCLUDED.txn_type,
        is_active = EXCLUDED.is_active,
        description = EXCLUDED.description,
        updated_at = CURRENT_TIMESTAMP;

DO $$
BEGIN
    RAISE NOTICE '✓ m_transaction_types seeded: % records', (SELECT COUNT(*) FROM m_transaction_types);
END $$;

-- ============================================================================
-- SECTION 3: SEED m_alert_settings (Migration 023 data)
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '--- SECTION 3: Seeding m_alert_settings ---';
END $$;

-- Only seed if table exists (created by Migration 023)
DO $$
BEGIN
    IF EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'm_alert_settings') THEN
        -- Insert global default settings
        INSERT INTO m_alert_settings (tenant_id, is_live, setting_key, setting_label, days_before, days_after, auto_expire_hours, applies_to_types)
        VALUES
            (NULL, true, 'sip_recurring_default', 'SIP/Recurring Payment Alerts', 3, 10, NULL, ARRAY['goal_sip_plan', 'portfolio_alert']),
            (NULL, true, 'time_based_default', 'Time-Based Reminders', 7, 3, NULL, ARRAY['time_based', 'profile_trigger']),
            (NULL, true, 'import_notification_default', 'Import Notifications', 0, 0, 24, ARRAY['import_notification']),
            (NULL, true, 'general_default', 'General Alerts', 3, 10, NULL, NULL)
        ON CONFLICT (tenant_id, is_live, setting_key) DO NOTHING;

        RAISE NOTICE '✓ m_alert_settings seeded: % records', (SELECT COUNT(*) FROM m_alert_settings);
    ELSE
        RAISE NOTICE '⚠ m_alert_settings table does not exist - run Migration 023 first';
    END IF;
END $$;

-- ============================================================================
-- SECTION 4: SEED m_asset_types (Phase 1 multi-asset support)
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '--- SECTION 4: Seeding m_asset_types ---';
END $$;

DO $$
BEGIN
    IF EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'm_asset_types') THEN
        INSERT INTO m_asset_types (asset_type_code, asset_type_name, category, default_assumption_rate, display_order, is_active, description)
        VALUES
            ('MF', 'Mutual Fund', 'equity', 12.00, 1, true, 'Equity and debt mutual fund schemes with professionally managed portfolios'),
            ('GOLD', 'Gold', 'commodity', 8.00, 2, true, 'Physical gold, gold ETFs, sovereign gold bonds, and gold mutual funds'),
            ('SILVER', 'Silver', 'commodity', 7.00, 3, true, 'Physical silver, silver ETFs, and silver-backed investment products'),
            ('EQUITY', 'Equity', 'equity', 15.00, 4, true, 'Direct equity investments in stocks and shares'),
            ('FD', 'Fixed Deposit', 'fixed_income', 6.50, 5, true, 'Bank and corporate fixed deposits with guaranteed returns'),
            ('PPF', 'Public Provident Fund', 'fixed_income', 7.10, 6, true, 'Government-backed long-term savings scheme with tax benefits'),
            ('EPF', 'Employee Provident Fund', 'fixed_income', 8.25, 7, true, 'Mandatory retirement savings scheme for salaried employees'),
            ('NPS', 'National Pension System', 'equity', 10.00, 8, true, 'Government-sponsored pension scheme with equity and debt options'),
            ('REAL_ESTATE', 'Real Estate', 'real_estate', 8.00, 9, true, 'Property investments including residential and commercial real estate'),
            ('INSURANCE', 'Insurance', 'insurance', 5.00, 10, true, 'Life insurance, term insurance, and insurance-linked investment products')
        ON CONFLICT (asset_type_code) DO NOTHING;

        RAISE NOTICE '✓ m_asset_types seeded: % records', (SELECT COUNT(*) FROM m_asset_types);
    ELSE
        RAISE NOTICE '⚠ m_asset_types table does not exist';
    END IF;
END $$;

-- ============================================================================
-- SECTION 5: SEED BOOKMARK REASONS FOR ALL EXISTING TENANTS
-- ============================================================================
DO $$
DECLARE
    v_tenant RECORD;
    v_count INTEGER;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '--- SECTION 5: Seeding Bookmark Reasons for ALL Tenants ---';

    -- Loop through all tenants
    FOR v_tenant IN SELECT id, tenant_name FROM t_tenants WHERE is_active = true
    LOOP
        -- Seed for LIVE environment
        INSERT INTO m_bookmark_reasons (tenant_id, is_live, reason_code, reason_label, display_order, is_active)
        VALUES
            (v_tenant.id, TRUE, 'VIP', 'VIP Customer', 1, TRUE),
            (v_tenant.id, TRUE, 'FOLLOW_UP', 'Follow-up Required', 2, TRUE),
            (v_tenant.id, TRUE, 'IMPORTANT', 'Important', 3, TRUE),
            (v_tenant.id, TRUE, 'HIGH_VALUE', 'High Value Client', 4, TRUE),
            (v_tenant.id, TRUE, 'ATTENTION', 'Requires Attention', 5, TRUE),
            (v_tenant.id, TRUE, 'PORTFOLIO_REVIEW', 'Portfolio Review Due', 6, TRUE),
            (v_tenant.id, TRUE, 'TAX_PLANNING', 'Tax Planning', 7, TRUE),
            (v_tenant.id, TRUE, 'OTHER', 'Other (Custom)', 99, TRUE)
        ON CONFLICT (tenant_id, is_live, reason_code) DO NOTHING;

        -- Seed for TEST environment
        INSERT INTO m_bookmark_reasons (tenant_id, is_live, reason_code, reason_label, display_order, is_active)
        VALUES
            (v_tenant.id, FALSE, 'VIP', 'VIP Customer', 1, TRUE),
            (v_tenant.id, FALSE, 'FOLLOW_UP', 'Follow-up Required', 2, TRUE),
            (v_tenant.id, FALSE, 'IMPORTANT', 'Important', 3, TRUE),
            (v_tenant.id, FALSE, 'HIGH_VALUE', 'High Value Client', 4, TRUE),
            (v_tenant.id, FALSE, 'ATTENTION', 'Requires Attention', 5, TRUE),
            (v_tenant.id, FALSE, 'PORTFOLIO_REVIEW', 'Portfolio Review Due', 6, TRUE),
            (v_tenant.id, FALSE, 'TAX_PLANNING', 'Tax Planning', 7, TRUE),
            (v_tenant.id, FALSE, 'OTHER', 'Other (Custom)', 99, TRUE)
        ON CONFLICT (tenant_id, is_live, reason_code) DO NOTHING;

        RAISE NOTICE '  ✓ Tenant %: % bookmark reasons seeded', v_tenant.id, v_tenant.tenant_name;
    END LOOP;

    SELECT COUNT(*) INTO v_count FROM m_bookmark_reasons;
    RAISE NOTICE '✓ Total bookmark reasons: %', v_count;
END $$;

-- ============================================================================
-- SECTION 6: SEED JOB SCHEDULER CONFIGS FOR ALL EXISTING TENANTS
-- ============================================================================
DO $$
DECLARE
    v_tenant RECORD;
    v_user_id INTEGER;
    v_job_type RECORD;
    v_next_execution TIMESTAMP;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '--- SECTION 6: Seeding Job Scheduler Configs for ALL Tenants ---';

    -- Loop through all tenants
    FOR v_tenant IN SELECT id, tenant_name FROM t_tenants WHERE is_active = true
    LOOP
        -- Get first user for this tenant (for user_id reference)
        SELECT id INTO v_user_id FROM t_users WHERE tenant_id = v_tenant.id LIMIT 1;

        IF v_user_id IS NULL THEN
            RAISE NOTICE '  ⚠ Tenant %: No users found, skipping job configs', v_tenant.id;
            CONTINUE;
        END IF;

        -- Get per-tenant job types (is_global = false)
        FOR v_job_type IN
            SELECT code, default_cron_expression, default_max_retries, default_schedule_type
            FROM m_job_types
            WHERE is_active = true AND (is_global = false OR is_global IS NULL)
        LOOP
            -- Calculate next execution (simplified: tomorrow at 9 PM)
            v_next_execution := DATE_TRUNC('day', NOW()) + INTERVAL '1 day' + INTERVAL '21 hours';

            -- Seed for LIVE environment
            INSERT INTO t_job_scheduler_configs (
                tenant_id, job_type, user_id, is_live,
                schedule_type, cron_expression, is_enabled, max_retries,
                job_config, next_execution_at
            ) VALUES (
                v_tenant.id,
                v_job_type.code,
                v_user_id,
                TRUE,
                COALESCE(v_job_type.default_schedule_type, 'daily'),
                COALESCE(v_job_type.default_cron_expression, '0 21 * * *'),
                true,
                COALESCE(v_job_type.default_max_retries, 3),
                '{}',
                v_next_execution
            )
            ON CONFLICT (tenant_id, job_type, is_live) DO NOTHING;

            -- Seed for TEST environment
            INSERT INTO t_job_scheduler_configs (
                tenant_id, job_type, user_id, is_live,
                schedule_type, cron_expression, is_enabled, max_retries,
                job_config, next_execution_at
            ) VALUES (
                v_tenant.id,
                v_job_type.code,
                v_user_id,
                FALSE,
                COALESCE(v_job_type.default_schedule_type, 'daily'),
                COALESCE(v_job_type.default_cron_expression, '0 21 * * *'),
                true,
                COALESCE(v_job_type.default_max_retries, 3),
                '{}',
                v_next_execution
            )
            ON CONFLICT (tenant_id, job_type, is_live) DO NOTHING;
        END LOOP;

        RAISE NOTICE '  ✓ Tenant %: Job scheduler configs seeded', v_tenant.id;
    END LOOP;
END $$;

-- ============================================================================
-- SECTION 7: SEED PORTFOLIO SNAPSHOT CONFIGS FOR ALL EXISTING TENANTS
-- ============================================================================
DO $$
DECLARE
    v_tenant RECORD;
    v_user_id INTEGER;
    v_next_friday TIMESTAMP;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '--- SECTION 7: Seeding Portfolio Snapshot Configs for ALL Tenants ---';

    -- Calculate next Friday at 9 PM
    v_next_friday := DATE_TRUNC('week', NOW()) + INTERVAL '4 days' + INTERVAL '21 hours';
    IF v_next_friday < NOW() THEN
        v_next_friday := v_next_friday + INTERVAL '7 days';
    END IF;

    -- Loop through all tenants
    FOR v_tenant IN SELECT id, tenant_name FROM t_tenants WHERE is_active = true
    LOOP
        -- Get first user for this tenant
        SELECT id INTO v_user_id FROM t_users WHERE tenant_id = v_tenant.id LIMIT 1;

        IF v_user_id IS NULL THEN
            RAISE NOTICE '  ⚠ Tenant %: No users found, skipping snapshot configs', v_tenant.id;
            CONTINUE;
        END IF;

        -- Seed for LIVE environment
        INSERT INTO t_portfolio_snapshot_configs (
            tenant_id, user_id, is_live,
            schedule_type, cron_expression, is_enabled,
            next_execution_at, execution_count, failure_count, max_retries
        ) VALUES (
            v_tenant.id,
            v_user_id,
            TRUE,
            'weekly',
            '0 21 * * 5',
            true,
            v_next_friday,
            0,
            0,
            3
        )
        ON CONFLICT (tenant_id, is_live) DO NOTHING;

        -- Seed for TEST environment
        INSERT INTO t_portfolio_snapshot_configs (
            tenant_id, user_id, is_live,
            schedule_type, cron_expression, is_enabled,
            next_execution_at, execution_count, failure_count, max_retries
        ) VALUES (
            v_tenant.id,
            v_user_id,
            FALSE,
            'weekly',
            '0 21 * * 5',
            true,
            v_next_friday,
            0,
            0,
            3
        )
        ON CONFLICT (tenant_id, is_live) DO NOTHING;

        RAISE NOTICE '  ✓ Tenant %: Portfolio snapshot configs seeded', v_tenant.id;
    END LOOP;
END $$;

-- ============================================================================
-- SECTION 8: SEED GLOBAL JOB CONFIGS (tenant_id = 0)
-- ============================================================================
DO $$
DECLARE
    v_user_id INTEGER;
    v_job_type RECORD;
    v_next_execution TIMESTAMP;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '--- SECTION 8: Seeding Global Job Configs (tenant_id=0) ---';

    -- Get any active user for global jobs
    SELECT id INTO v_user_id FROM t_users WHERE is_active = true LIMIT 1;

    IF v_user_id IS NULL THEN
        RAISE NOTICE '  ⚠ No active users found, cannot seed global jobs';
        RETURN;
    END IF;

    -- Calculate next execution
    v_next_execution := DATE_TRUNC('day', NOW()) + INTERVAL '1 day' + INTERVAL '21 hours';

    -- Seed global job types
    FOR v_job_type IN
        SELECT code, default_cron_expression, default_max_retries, default_schedule_type
        FROM m_job_types
        WHERE is_active = true AND is_global = true
    LOOP
        INSERT INTO t_job_scheduler_configs (
            tenant_id, job_type, user_id, is_live,
            schedule_type, cron_expression, is_enabled, max_retries,
            job_config, next_execution_at
        ) VALUES (
            0,  -- Global tenant ID
            v_job_type.code,
            v_user_id,
            TRUE,
            COALESCE(v_job_type.default_schedule_type, 'daily'),
            COALESCE(v_job_type.default_cron_expression, '0 21 * * *'),
            true,
            COALESCE(v_job_type.default_max_retries, 3),
            '{}',
            v_next_execution
        )
        ON CONFLICT (tenant_id, job_type, is_live) DO NOTHING;

        RAISE NOTICE '  ✓ Global job config seeded: %', v_job_type.code;
    END LOOP;
END $$;

-- ============================================================================
-- SECTION 9: VERIFICATION
-- ============================================================================
DO $$
DECLARE
    v_job_types INTEGER;
    v_txn_types INTEGER;
    v_bookmark_count INTEGER;
    v_job_configs INTEGER;
    v_snapshot_configs INTEGER;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'VERIFICATION';
    RAISE NOTICE '==============================================';

    SELECT COUNT(*) INTO v_job_types FROM m_job_types;
    SELECT COUNT(*) INTO v_txn_types FROM m_transaction_types;
    SELECT COUNT(*) INTO v_bookmark_count FROM m_bookmark_reasons;
    SELECT COUNT(*) INTO v_job_configs FROM t_job_scheduler_configs;
    SELECT COUNT(*) INTO v_snapshot_configs FROM t_portfolio_snapshot_configs;

    RAISE NOTICE 'm_job_types: % records', v_job_types;
    RAISE NOTICE 'm_transaction_types: % records', v_txn_types;
    RAISE NOTICE 'm_bookmark_reasons: % records', v_bookmark_count;
    RAISE NOTICE 't_job_scheduler_configs: % records', v_job_configs;
    RAISE NOTICE 't_portfolio_snapshot_configs: % records', v_snapshot_configs;
    RAISE NOTICE '';
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'OLD TENANT SEED DATA - Complete';
    RAISE NOTICE '==============================================';
END $$;

COMMIT;
