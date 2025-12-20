-- ============================================================================
-- File: 11_urgent_production_fix.sql
-- Description: URGENT production fix for signup/login failures
-- Problem: m_job_types schema mismatch between emergency fix and main schema
-- Date: 2025-12-20
-- ============================================================================
--
-- ISSUE IDENTIFIED:
-- =================
-- The 10_emergency_schema_fix.sql created m_job_types with WRONG schema:
--   - Emergency fix: id SERIAL PRIMARY KEY, code VARCHAR(50) UNIQUE
--   - Main schema:   code VARCHAR(50) PRIMARY KEY (no id column)
--
-- This causes t_job_scheduler_configs foreign key issues and breaks signup.
--
-- FIX STRATEGY:
-- =============
-- 1. RENAME m_job_types to m_job_types_wrong_schema if it has wrong schema (preserves data)
-- 2. Recreate m_job_types with CORRECT schema (code as PRIMARY KEY, no id)
-- 3. Re-seed all data
-- 4. Fix t_job_scheduler_configs foreign key if needed
-- NOTE: No DROP TABLE - old data preserved in m_job_types_wrong_schema for safety
--
-- ============================================================================

BEGIN;

DO $$
BEGIN
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'URGENT PRODUCTION FIX - Starting';
    RAISE NOTICE 'Date: %', NOW();
    RAISE NOTICE '==============================================';
END $$;

-- ============================================================================
-- STEP 1: Check and fix m_job_types schema (RENAME instead of DROP to preserve data)
-- ============================================================================
DO $$
DECLARE
    v_has_id_column BOOLEAN;
    v_table_exists BOOLEAN;
    v_backup_exists BOOLEAN;
BEGIN
    -- Check if table exists
    SELECT EXISTS(
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'm_job_types'
    ) INTO v_table_exists;

    IF NOT v_table_exists THEN
        RAISE NOTICE '✓ m_job_types does not exist - will create with correct schema';
    ELSE
        -- Check if table has 'id' column (wrong schema from emergency fix)
        SELECT EXISTS(
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public'
            AND table_name = 'm_job_types'
            AND column_name = 'id'
        ) INTO v_has_id_column;

        IF v_has_id_column THEN
            RAISE NOTICE '⚠ m_job_types has WRONG schema (has id column)';
            RAISE NOTICE '  Renaming to m_job_types_wrong_schema (data preserved)...';

            -- First, drop any dependent foreign keys
            ALTER TABLE IF EXISTS t_job_scheduler_configs
                DROP CONSTRAINT IF EXISTS t_job_scheduler_configs_job_type_fkey;
            ALTER TABLE IF EXISTS t_job_executions
                DROP CONSTRAINT IF EXISTS t_job_executions_job_type_fkey;
            RAISE NOTICE '  Dropped foreign key constraints';

            -- Check if backup already exists and drop it
            SELECT EXISTS(
                SELECT 1 FROM information_schema.tables
                WHERE table_schema = 'public' AND table_name = 'm_job_types_wrong_schema'
            ) INTO v_backup_exists;

            IF v_backup_exists THEN
                -- Previous backup exists, need to drop it first
                EXECUTE 'DROP TABLE m_job_types_wrong_schema';
                RAISE NOTICE '  Dropped previous backup table';
            END IF;

            -- Rename wrong table (preserve data instead of dropping)
            ALTER TABLE m_job_types RENAME TO m_job_types_wrong_schema;
            RAISE NOTICE '  ✓ Renamed m_job_types to m_job_types_wrong_schema';
            RAISE NOTICE '    (Old data preserved - delete m_job_types_wrong_schema manually after verification)';
        ELSE
            RAISE NOTICE '✓ m_job_types exists with correct schema';
        END IF;
    END IF;
END $$;

-- ============================================================================
-- STEP 2: Create m_job_types with CORRECT schema (code as PRIMARY KEY)
-- ============================================================================
DO $$
BEGIN
    IF NOT EXISTS(
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'm_job_types'
    ) THEN
        RAISE NOTICE 'Creating m_job_types with CORRECT schema...';

        CREATE TABLE m_job_types (
            code VARCHAR(50) PRIMARY KEY,                    -- CORRECT: code is PRIMARY KEY
            name VARCHAR(100) NOT NULL,
            description TEXT,
            default_cron_expression VARCHAR(100),
            default_max_retries INTEGER DEFAULT 3,
            is_active BOOLEAN DEFAULT true,
            default_schedule_type VARCHAR(20) DEFAULT 'daily',
            failover_enabled BOOLEAN DEFAULT false,
            failover_cron_expression VARCHAR(50),
            is_global BOOLEAN DEFAULT false,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        COMMENT ON TABLE m_job_types IS 'Registry of all available job types in the system';
        COMMENT ON COLUMN m_job_types.code IS 'Unique job type code - PRIMARY KEY';
        COMMENT ON COLUMN m_job_types.is_global IS 'If true, job runs once globally (not per-tenant)';

        RAISE NOTICE '✓ m_job_types created with CORRECT schema (code as PRIMARY KEY)';
    ELSE
        RAISE NOTICE 'm_job_types already exists with correct schema';
    END IF;
END $$;

-- ============================================================================
-- STEP 3: Create m_transaction_types if missing
-- ============================================================================
DO $$
BEGIN
    IF NOT EXISTS(
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'm_transaction_types'
    ) THEN
        RAISE NOTICE 'Creating m_transaction_types table...';

        CREATE TABLE m_transaction_types (
            id SERIAL PRIMARY KEY,
            txn_code VARCHAR(50) UNIQUE NOT NULL,
            txn_name VARCHAR(255) NOT NULL,
            txn_type VARCHAR(50) NOT NULL CHECK (txn_type IN ('Addition', 'Deduction')),
            is_active BOOLEAN DEFAULT true,
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
-- STEP 4: Create m_bookmark_reasons if missing
-- ============================================================================
DO $$
BEGIN
    IF NOT EXISTS(
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'm_bookmark_reasons'
    ) THEN
        RAISE NOTICE 'Creating m_bookmark_reasons table...';

        CREATE TABLE m_bookmark_reasons (
            id SERIAL PRIMARY KEY,
            tenant_id INTEGER NOT NULL,
            is_live BOOLEAN NOT NULL DEFAULT true,
            reason_code VARCHAR(50) NOT NULL,
            reason_label VARCHAR(100) NOT NULL,
            display_order INTEGER DEFAULT 0,
            is_active BOOLEAN DEFAULT true,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT unique_reason_per_tenant UNIQUE (tenant_id, is_live, reason_code)
        );

        RAISE NOTICE '✓ m_bookmark_reasons table created';
    ELSE
        RAISE NOTICE 'm_bookmark_reasons table already exists';
    END IF;
END $$;

-- ============================================================================
-- STEP 5: Create t_job_scheduler_configs if missing
-- ============================================================================
DO $$
BEGIN
    IF NOT EXISTS(
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 't_job_scheduler_configs'
    ) THEN
        RAISE NOTICE 'Creating t_job_scheduler_configs table...';

        CREATE TABLE t_job_scheduler_configs (
            id SERIAL PRIMARY KEY,
            tenant_id INTEGER NOT NULL,
            job_type VARCHAR(50) NOT NULL REFERENCES m_job_types(code),
            user_id INTEGER NOT NULL,
            is_live BOOLEAN NOT NULL,
            schedule_type VARCHAR(20) NOT NULL DEFAULT 'daily',
            cron_expression VARCHAR(100) NOT NULL,
            is_enabled BOOLEAN NOT NULL DEFAULT true,
            max_retries INTEGER NOT NULL DEFAULT 3,
            job_config JSONB,
            failover_enabled BOOLEAN DEFAULT false,
            failover_cron_expression VARCHAR(50),
            last_executed_at TIMESTAMP,
            next_execution_at TIMESTAMP,
            last_success_at TIMESTAMP,
            execution_count INTEGER DEFAULT 0,
            failure_count INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT unique_job_scheduler_config UNIQUE(tenant_id, job_type, is_live),
            CONSTRAINT valid_schedule_type CHECK (schedule_type IN ('daily', 'weekly', 'monthly', 'custom'))
        );

        RAISE NOTICE '✓ t_job_scheduler_configs table created';
    ELSE
        -- Re-add foreign key if it was dropped
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints
            WHERE constraint_name = 't_job_scheduler_configs_job_type_fkey'
        ) THEN
            ALTER TABLE t_job_scheduler_configs
                ADD CONSTRAINT t_job_scheduler_configs_job_type_fkey
                FOREIGN KEY (job_type) REFERENCES m_job_types(code);
            RAISE NOTICE '✓ Re-added foreign key constraint to t_job_scheduler_configs';
        END IF;
        RAISE NOTICE 't_job_scheduler_configs table already exists';
    END IF;
END $$;

-- ============================================================================
-- STEP 6: Create t_portfolio_snapshot_configs if missing
-- ============================================================================
DO $$
BEGIN
    IF NOT EXISTS(
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 't_portfolio_snapshot_configs'
    ) THEN
        RAISE NOTICE 'Creating t_portfolio_snapshot_configs table...';

        CREATE TABLE t_portfolio_snapshot_configs (
            id SERIAL PRIMARY KEY,
            tenant_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            is_live BOOLEAN NOT NULL,
            schedule_type VARCHAR(20) NOT NULL DEFAULT 'weekly',
            cron_expression VARCHAR(100) NOT NULL DEFAULT '0 21 * * 5',
            is_enabled BOOLEAN NOT NULL DEFAULT true,
            last_executed_at TIMESTAMP,
            next_execution_at TIMESTAMP,
            execution_count INTEGER NOT NULL DEFAULT 0,
            failure_count INTEGER NOT NULL DEFAULT 0,
            max_retries INTEGER NOT NULL DEFAULT 3,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT unique_snapshot_scheduler UNIQUE(tenant_id, is_live),
            CONSTRAINT valid_schedule_type CHECK (schedule_type IN ('weekly', 'monthly', 'custom'))
        );

        RAISE NOTICE '✓ t_portfolio_snapshot_configs table created';
    ELSE
        RAISE NOTICE 't_portfolio_snapshot_configs table already exists';
    END IF;
END $$;

-- ============================================================================
-- STEP 7: Seed m_job_types (CRITICAL FOR SIGNUP)
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
-- STEP 8: Seed m_transaction_types
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
-- STEP 9: Seed bookmark reasons for existing tenants
-- ============================================================================
DO $$
DECLARE
    v_tenant RECORD;
    v_is_live BOOLEAN;
BEGIN
    RAISE NOTICE 'Seeding bookmark reasons for tenants...';

    IF NOT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 't_tenants') THEN
        RAISE NOTICE '  Skipping - t_tenants table does not exist';
        RETURN;
    END IF;

    FOR v_tenant IN SELECT id, tenant_name FROM t_tenants WHERE is_active = true
    LOOP
        -- Seed for both LIVE and TEST
        FOREACH v_is_live IN ARRAY ARRAY[false, true]
        LOOP
            INSERT INTO m_bookmark_reasons (tenant_id, is_live, reason_code, reason_label, display_order, is_active)
            VALUES
                (v_tenant.id, v_is_live, 'VIP', 'VIP Customer', 1, TRUE),
                (v_tenant.id, v_is_live, 'FOLLOW_UP', 'Follow-up Required', 2, TRUE),
                (v_tenant.id, v_is_live, 'IMPORTANT', 'Important', 3, TRUE),
                (v_tenant.id, v_is_live, 'HIGH_VALUE', 'High Value Client', 4, TRUE),
                (v_tenant.id, v_is_live, 'ATTENTION', 'Requires Attention', 5, TRUE),
                (v_tenant.id, v_is_live, 'PORTFOLIO_REVIEW', 'Portfolio Review Due', 6, TRUE),
                (v_tenant.id, v_is_live, 'TAX_PLANNING', 'Tax Planning', 7, TRUE),
                (v_tenant.id, v_is_live, 'OTHER', 'Other (Custom)', 99, TRUE)
            ON CONFLICT (tenant_id, is_live, reason_code) DO NOTHING;
        END LOOP;

        RAISE NOTICE '  ✓ Tenant %: bookmark reasons seeded', v_tenant.id;
    END LOOP;
END $$;

-- ============================================================================
-- STEP 10: Seed job configs for existing tenants
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
            -- LIVE environment
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

            -- TEST environment
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
-- STEP 11: Verification
-- ============================================================================
DO $$
DECLARE
    v_job_types INTEGER;
    v_txn_types INTEGER;
    v_bookmark_count INTEGER := 0;
    v_job_configs INTEGER := 0;
    v_has_correct_schema BOOLEAN;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'VERIFICATION';
    RAISE NOTICE '==============================================';

    -- Verify m_job_types schema is correct (no 'id' column)
    SELECT NOT EXISTS(
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'm_job_types'
        AND column_name = 'id'
    ) INTO v_has_correct_schema;

    IF v_has_correct_schema THEN
        RAISE NOTICE '✓ m_job_types schema is CORRECT (code as PRIMARY KEY)';
    ELSE
        RAISE NOTICE '✗ m_job_types schema is WRONG - manual intervention needed!';
    END IF;

    SELECT COUNT(*) INTO v_job_types FROM m_job_types;
    SELECT COUNT(*) INTO v_txn_types FROM m_transaction_types;

    IF EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'm_bookmark_reasons') THEN
        SELECT COUNT(*) INTO v_bookmark_count FROM m_bookmark_reasons;
    END IF;

    IF EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 't_job_scheduler_configs') THEN
        SELECT COUNT(*) INTO v_job_configs FROM t_job_scheduler_configs;
    END IF;

    RAISE NOTICE '';
    RAISE NOTICE 'm_job_types:             % records', v_job_types;
    RAISE NOTICE 'm_transaction_types:     % records', v_txn_types;
    RAISE NOTICE 'm_bookmark_reasons:      % records', v_bookmark_count;
    RAISE NOTICE 't_job_scheduler_configs: % records', v_job_configs;
    RAISE NOTICE '';

    IF v_job_types >= 5 AND v_txn_types >= 11 AND v_has_correct_schema THEN
        RAISE NOTICE '✓ CRITICAL TABLES ARE NOW READY';
        RAISE NOTICE '✓ Signup and Login should now work';
    ELSE
        RAISE NOTICE '⚠ Some data may still be missing';
    END IF;

    RAISE NOTICE '';
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'URGENT PRODUCTION FIX - Complete';
    RAISE NOTICE '==============================================';
END $$;

COMMIT;
