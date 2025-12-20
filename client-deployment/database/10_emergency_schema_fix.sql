-- ============================================================================
-- File: 10_emergency_schema_fix.sql
-- Description: Emergency fix for databases missing critical tables
-- Purpose: Creates missing master tables so signup/login can work
-- Date: 2025-12-20
-- ============================================================================
--
-- USE THIS SCRIPT IF:
--   - 08_diagnostic_check.sql shows "m_job_types table is MISSING"
--   - Customer cannot sign up or login
--
-- This script ONLY creates the minimum tables needed.
-- For full setup, run: 02_tables.sql + 05_seed_data.sql
-- ============================================================================

BEGIN;

DO $$
BEGIN
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'EMERGENCY SCHEMA FIX - Starting';
    RAISE NOTICE 'Date: %', NOW();
    RAISE NOTICE '==============================================';
END $$;

-- ============================================================================
-- 1. CREATE m_job_types IF MISSING
-- ============================================================================
DO $$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'm_job_types') THEN
        RAISE NOTICE 'Creating m_job_types table...';

        CREATE TABLE m_job_types (
            id SERIAL PRIMARY KEY,
            code VARCHAR(50) NOT NULL UNIQUE,
            name VARCHAR(100) NOT NULL,
            description TEXT,
            default_cron_expression VARCHAR(100),
            default_max_retries INTEGER DEFAULT 3,
            is_active BOOLEAN DEFAULT TRUE,
            default_schedule_type VARCHAR(20) DEFAULT 'daily',
            failover_enabled BOOLEAN DEFAULT FALSE,
            failover_cron_expression VARCHAR(100),
            is_global BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        RAISE NOTICE '✓ m_job_types table created';
    ELSE
        RAISE NOTICE 'm_job_types table already exists';
    END IF;
END $$;

-- ============================================================================
-- 2. CREATE m_transaction_types IF MISSING
-- ============================================================================
DO $$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'm_transaction_types') THEN
        RAISE NOTICE 'Creating m_transaction_types table...';

        CREATE TABLE m_transaction_types (
            id SERIAL PRIMARY KEY,
            txn_code VARCHAR(50) NOT NULL UNIQUE,
            txn_name VARCHAR(100) NOT NULL,
            txn_type VARCHAR(20) NOT NULL CHECK (txn_type IN ('Addition', 'Deduction')),
            is_active BOOLEAN DEFAULT TRUE,
            description TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        RAISE NOTICE '✓ m_transaction_types table created';
    ELSE
        RAISE NOTICE 'm_transaction_types table already exists';
    END IF;
END $$;

-- ============================================================================
-- 3. CREATE m_bookmark_reasons IF MISSING
-- ============================================================================
DO $$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'm_bookmark_reasons') THEN
        RAISE NOTICE 'Creating m_bookmark_reasons table...';

        CREATE TABLE m_bookmark_reasons (
            id SERIAL PRIMARY KEY,
            tenant_id INTEGER NOT NULL,
            is_live BOOLEAN DEFAULT TRUE,
            reason_code VARCHAR(50) NOT NULL,
            reason_label VARCHAR(100) NOT NULL,
            display_order INTEGER DEFAULT 0,
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT unique_bookmark_reason UNIQUE (tenant_id, is_live, reason_code)
        );

        RAISE NOTICE '✓ m_bookmark_reasons table created';
    ELSE
        RAISE NOTICE 'm_bookmark_reasons table already exists';
    END IF;
END $$;

-- ============================================================================
-- 4. CREATE t_job_scheduler_configs IF MISSING
-- ============================================================================
DO $$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 't_job_scheduler_configs') THEN
        RAISE NOTICE 'Creating t_job_scheduler_configs table...';

        CREATE TABLE t_job_scheduler_configs (
            id SERIAL PRIMARY KEY,
            tenant_id INTEGER NOT NULL,
            job_type VARCHAR(50) NOT NULL,
            user_id INTEGER,
            is_live BOOLEAN DEFAULT TRUE,
            schedule_type VARCHAR(20) DEFAULT 'daily',
            cron_expression VARCHAR(100),
            is_enabled BOOLEAN DEFAULT TRUE,
            max_retries INTEGER DEFAULT 3,
            job_config JSONB DEFAULT '{}',
            next_execution_at TIMESTAMP,
            last_execution_at TIMESTAMP,
            last_status VARCHAR(20),
            execution_count INTEGER DEFAULT 0,
            failure_count INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT unique_job_config UNIQUE (tenant_id, job_type, is_live)
        );

        RAISE NOTICE '✓ t_job_scheduler_configs table created';
    ELSE
        RAISE NOTICE 't_job_scheduler_configs table already exists';
    END IF;
END $$;

-- ============================================================================
-- 5. CREATE t_portfolio_snapshot_configs IF MISSING
-- ============================================================================
DO $$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 't_portfolio_snapshot_configs') THEN
        RAISE NOTICE 'Creating t_portfolio_snapshot_configs table...';

        CREATE TABLE t_portfolio_snapshot_configs (
            id SERIAL PRIMARY KEY,
            tenant_id INTEGER NOT NULL,
            user_id INTEGER,
            is_live BOOLEAN DEFAULT TRUE,
            schedule_type VARCHAR(20) DEFAULT 'weekly',
            cron_expression VARCHAR(100) DEFAULT '0 21 * * 5',
            is_enabled BOOLEAN DEFAULT TRUE,
            next_execution_at TIMESTAMP,
            last_execution_at TIMESTAMP,
            execution_count INTEGER DEFAULT 0,
            failure_count INTEGER DEFAULT 0,
            max_retries INTEGER DEFAULT 3,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT unique_snapshot_config UNIQUE (tenant_id, is_live)
        );

        RAISE NOTICE '✓ t_portfolio_snapshot_configs table created';
    ELSE
        RAISE NOTICE 't_portfolio_snapshot_configs table already exists';
    END IF;
END $$;

-- ============================================================================
-- 6. SEED m_job_types (CRITICAL FOR SIGNUP)
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE 'Seeding m_job_types...';
END $$;

INSERT INTO m_job_types (code, name, description, default_cron_expression, default_max_retries, is_active, default_schedule_type, failover_enabled, failover_cron_expression, is_global)
VALUES
    ('PORTFOLIO_SNAPSHOT', 'Portfolio Snapshot Generation', 'Generate monthly portfolio snapshots for all customers', '0 21 * * 5', 3, true, 'weekly', false, NULL, false),
    ('NAV_DOWNLOAD', 'NAV Download', 'Download NAV data for all bookmarked schemes', '0 21 * * *', 3, true, 'daily', true, '0 22 * * *', true),
    ('MARKET_OHLC_DOWNLOAD', 'Market OHLC Download', 'Download OHLC data for market indices', '30 21 * * *', 3, true, 'daily', false, NULL, true),
    ('GOAL_CALCULATION', 'Goal Calculation', 'Recalculate all customer goals and generate alerts', '30 20 * * 5', 3, true, 'weekly', false, NULL, false),
    ('DAILY_ALERTS', 'Daily Alerts', 'Process and generate daily alert cards for customers', '0 20 * * *', 3, true, 'daily', false, NULL, false)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    is_active = EXCLUDED.is_active,
    updated_at = CURRENT_TIMESTAMP;

DO $$
BEGIN
    RAISE NOTICE '✓ m_job_types: % records', (SELECT COUNT(*) FROM m_job_types);
END $$;

-- ============================================================================
-- 7. SEED m_transaction_types
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE 'Seeding m_transaction_types...';
END $$;

INSERT INTO m_transaction_types (txn_code, txn_name, txn_type, is_active, description)
VALUES
    ('SIP', 'Systematic Investment Plan', 'Addition', TRUE, 'Regular systematic investment contributions'),
    ('STP IN', 'Systematic Transfer Plan - In', 'Addition', TRUE, 'Transfer from another scheme (incoming)'),
    ('PURCHASE', 'One-Time Purchase', 'Addition', TRUE, 'Lump sum purchase'),
    ('SWITCH IN', 'Switch In', 'Addition', TRUE, 'Funds received from switching'),
    ('OPENING BALANCE', 'Opening Balance', 'Addition', TRUE, 'Initial balance'),
    ('SYSTEMATIC TRANSFER IN', 'Systematic Transfer In', 'Addition', TRUE, 'STP incoming alternate'),
    ('STP OUT', 'Systematic Transfer Plan - Out', 'Deduction', TRUE, 'Transfer to another scheme (outgoing)'),
    ('REDEMPTION', 'Redemption', 'Deduction', TRUE, 'Withdrawal of funds'),
    ('SWITCH OUT', 'Switch Out', 'Deduction', TRUE, 'Funds moved by switching'),
    ('SELL', 'Sell', 'Deduction', TRUE, 'Encashed from scheme'),
    ('SYSTEMATIC TRANSFER OUT', 'Systematic Transfer Out', 'Deduction', TRUE, 'STP outgoing alternate')
ON CONFLICT (txn_code) DO UPDATE SET
    txn_name = EXCLUDED.txn_name,
    txn_type = EXCLUDED.txn_type,
    is_active = EXCLUDED.is_active,
    updated_at = CURRENT_TIMESTAMP;

DO $$
BEGIN
    RAISE NOTICE '✓ m_transaction_types: % records', (SELECT COUNT(*) FROM m_transaction_types);
END $$;

-- ============================================================================
-- 8. SEED BOOKMARK REASONS FOR EXISTING TENANTS
-- ============================================================================
DO $$
DECLARE
    v_tenant RECORD;
BEGIN
    RAISE NOTICE 'Seeding bookmark reasons for tenants...';

    IF NOT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 't_tenants') THEN
        RAISE NOTICE '  Skipping - t_tenants table does not exist';
        RETURN;
    END IF;

    FOR v_tenant IN SELECT id, tenant_name FROM t_tenants WHERE is_active = true
    LOOP
        -- Seed for both LIVE and TEST
        FOR is_live IN FALSE..TRUE LOOP
            INSERT INTO m_bookmark_reasons (tenant_id, is_live, reason_code, reason_label, display_order, is_active)
            VALUES
                (v_tenant.id, is_live, 'VIP', 'VIP Customer', 1, TRUE),
                (v_tenant.id, is_live, 'FOLLOW_UP', 'Follow-up Required', 2, TRUE),
                (v_tenant.id, is_live, 'IMPORTANT', 'Important', 3, TRUE),
                (v_tenant.id, is_live, 'HIGH_VALUE', 'High Value Client', 4, TRUE),
                (v_tenant.id, is_live, 'ATTENTION', 'Requires Attention', 5, TRUE),
                (v_tenant.id, is_live, 'PORTFOLIO_REVIEW', 'Portfolio Review Due', 6, TRUE),
                (v_tenant.id, is_live, 'TAX_PLANNING', 'Tax Planning', 7, TRUE),
                (v_tenant.id, is_live, 'OTHER', 'Other (Custom)', 99, TRUE)
            ON CONFLICT (tenant_id, is_live, reason_code) DO NOTHING;
        END LOOP;

        RAISE NOTICE '  ✓ Tenant %: bookmark reasons seeded', v_tenant.id;
    END LOOP;
END $$;

-- ============================================================================
-- 9. SEED JOB CONFIGS FOR EXISTING TENANTS
-- ============================================================================
DO $$
DECLARE
    v_tenant RECORD;
    v_user_id INTEGER;
    v_job_type RECORD;
    v_next_execution TIMESTAMP;
BEGIN
    RAISE NOTICE 'Seeding job scheduler configs for tenants...';

    IF NOT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 't_tenants') THEN
        RAISE NOTICE '  Skipping - t_tenants table does not exist';
        RETURN;
    END IF;

    IF NOT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 't_users') THEN
        RAISE NOTICE '  Skipping - t_users table does not exist';
        RETURN;
    END IF;

    v_next_execution := DATE_TRUNC('day', NOW()) + INTERVAL '1 day' + INTERVAL '21 hours';

    FOR v_tenant IN SELECT id, tenant_name FROM t_tenants WHERE is_active = true
    LOOP
        SELECT id INTO v_user_id FROM t_users WHERE tenant_id = v_tenant.id LIMIT 1;

        IF v_user_id IS NULL THEN
            RAISE NOTICE '  ⚠ Tenant %: No users, skipping', v_tenant.id;
            CONTINUE;
        END IF;

        FOR v_job_type IN
            SELECT code, default_cron_expression, default_max_retries, default_schedule_type
            FROM m_job_types
            WHERE is_active = true AND (is_global = false OR is_global IS NULL)
        LOOP
            INSERT INTO t_job_scheduler_configs (
                tenant_id, job_type, user_id, is_live,
                schedule_type, cron_expression, is_enabled, max_retries,
                job_config, next_execution_at
            ) VALUES (
                v_tenant.id, v_job_type.code, v_user_id, TRUE,
                COALESCE(v_job_type.default_schedule_type, 'daily'),
                COALESCE(v_job_type.default_cron_expression, '0 21 * * *'),
                true, COALESCE(v_job_type.default_max_retries, 3),
                '{}', v_next_execution
            )
            ON CONFLICT (tenant_id, job_type, is_live) DO NOTHING;

            INSERT INTO t_job_scheduler_configs (
                tenant_id, job_type, user_id, is_live,
                schedule_type, cron_expression, is_enabled, max_retries,
                job_config, next_execution_at
            ) VALUES (
                v_tenant.id, v_job_type.code, v_user_id, FALSE,
                COALESCE(v_job_type.default_schedule_type, 'daily'),
                COALESCE(v_job_type.default_cron_expression, '0 21 * * *'),
                true, COALESCE(v_job_type.default_max_retries, 3),
                '{}', v_next_execution
            )
            ON CONFLICT (tenant_id, job_type, is_live) DO NOTHING;
        END LOOP;

        RAISE NOTICE '  ✓ Tenant %: job configs seeded', v_tenant.id;
    END LOOP;
END $$;

-- ============================================================================
-- 10. VERIFICATION
-- ============================================================================
DO $$
DECLARE
    v_job_types INTEGER;
    v_txn_types INTEGER;
    v_bookmark_count INTEGER := 0;
    v_job_configs INTEGER := 0;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'VERIFICATION';
    RAISE NOTICE '==============================================';

    SELECT COUNT(*) INTO v_job_types FROM m_job_types;
    SELECT COUNT(*) INTO v_txn_types FROM m_transaction_types;

    IF EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'm_bookmark_reasons') THEN
        SELECT COUNT(*) INTO v_bookmark_count FROM m_bookmark_reasons;
    END IF;

    IF EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 't_job_scheduler_configs') THEN
        SELECT COUNT(*) INTO v_job_configs FROM t_job_scheduler_configs;
    END IF;

    RAISE NOTICE '';
    RAISE NOTICE 'm_job_types:            % records', v_job_types;
    RAISE NOTICE 'm_transaction_types:    % records', v_txn_types;
    RAISE NOTICE 'm_bookmark_reasons:     % records', v_bookmark_count;
    RAISE NOTICE 't_job_scheduler_configs: % records', v_job_configs;
    RAISE NOTICE '';

    IF v_job_types >= 5 AND v_txn_types >= 11 THEN
        RAISE NOTICE '✓ CRITICAL TABLES ARE NOW READY';
        RAISE NOTICE '✓ Signup and Login should now work';
    ELSE
        RAISE NOTICE '⚠ Some data may still be missing';
    END IF;

    RAISE NOTICE '';
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'EMERGENCY SCHEMA FIX - Complete';
    RAISE NOTICE '==============================================';
END $$;

COMMIT;
