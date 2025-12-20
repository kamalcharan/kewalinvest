-- ============================================================================
-- File: 12_comprehensive_schema_sync.sql
-- Description: Comprehensive schema sync for OLD databases connected to NEW code
-- Problem: Database created with old schema, missing tables/columns for new features
-- Date: 2025-12-20
-- ============================================================================
--
-- This script brings an OLD database up to sync with the CURRENT schema.
-- Safe to run multiple times (uses IF NOT EXISTS / IF EXISTS patterns)
--
-- ============================================================================

BEGIN;

DO $$
BEGIN
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'COMPREHENSIVE SCHEMA SYNC - Starting';
    RAISE NOTICE 'Date: %', NOW();
    RAISE NOTICE '==============================================';
END $$;

-- ============================================================================
-- PART 1: ADD MISSING COLUMNS TO EXISTING TABLES
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=== PART 1: Adding missing columns to existing tables ===';
END $$;

-- t_tenants: Add is_admin column
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 't_tenants' AND column_name = 'is_admin') THEN
        ALTER TABLE t_tenants ADD COLUMN is_admin BOOLEAN DEFAULT false;
        RAISE NOTICE '✓ Added t_tenants.is_admin';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 't_tenants' AND column_name = 'default_comparison_index_id') THEN
        ALTER TABLE t_tenants ADD COLUMN default_comparison_index_id INTEGER;
        RAISE NOTICE '✓ Added t_tenants.default_comparison_index_id';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 't_tenants' AND column_name = 'settings') THEN
        ALTER TABLE t_tenants ADD COLUMN settings JSONB DEFAULT '{}'::jsonb;
        RAISE NOTICE '✓ Added t_tenants.settings';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 't_tenants' AND column_name = 'subscription_plan') THEN
        ALTER TABLE t_tenants ADD COLUMN subscription_plan VARCHAR(50) DEFAULT 'basic';
        RAISE NOTICE '✓ Added t_tenants.subscription_plan';
    END IF;
END $$;

-- t_contacts: Add normalized_name column (Migration 006)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 't_contacts') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 't_contacts' AND column_name = 'normalized_name') THEN
            ALTER TABLE t_contacts ADD COLUMN normalized_name VARCHAR(255);
            RAISE NOTICE '✓ Added t_contacts.normalized_name';
        END IF;
    END IF;
END $$;

-- t_jtbd_configurations: Add missing columns (Migration 023, 027)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 't_jtbd_configurations') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 't_jtbd_configurations' AND column_name = 'completed_at') THEN
            ALTER TABLE t_jtbd_configurations ADD COLUMN completed_at TIMESTAMP;
            RAISE NOTICE '✓ Added t_jtbd_configurations.completed_at';
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 't_jtbd_configurations' AND column_name = 'completed_by') THEN
            ALTER TABLE t_jtbd_configurations ADD COLUMN completed_by INTEGER;
            RAISE NOTICE '✓ Added t_jtbd_configurations.completed_by';
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 't_jtbd_configurations' AND column_name = 'completion_source') THEN
            ALTER TABLE t_jtbd_configurations ADD COLUMN completion_source VARCHAR(50);
            RAISE NOTICE '✓ Added t_jtbd_configurations.completion_source';
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 't_jtbd_configurations' AND column_name = 'auto_expire_at') THEN
            ALTER TABLE t_jtbd_configurations ADD COLUMN auto_expire_at TIMESTAMP;
            RAISE NOTICE '✓ Added t_jtbd_configurations.auto_expire_at';
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 't_jtbd_configurations' AND column_name = 'is_watchlisted') THEN
            ALTER TABLE t_jtbd_configurations ADD COLUMN is_watchlisted BOOLEAN DEFAULT false;
            RAISE NOTICE '✓ Added t_jtbd_configurations.is_watchlisted';
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 't_jtbd_configurations' AND column_name = 'watchlist_reason') THEN
            ALTER TABLE t_jtbd_configurations ADD COLUMN watchlist_reason TEXT;
            RAISE NOTICE '✓ Added t_jtbd_configurations.watchlist_reason';
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 't_jtbd_configurations' AND column_name = 'jtbd_category') THEN
            ALTER TABLE t_jtbd_configurations ADD COLUMN jtbd_category VARCHAR(50);
            RAISE NOTICE '✓ Added t_jtbd_configurations.jtbd_category';
        END IF;
    END IF;
END $$;

-- t_nav_data: Add metrics columns (Migration 028)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 't_nav_data') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 't_nav_data' AND column_name = 'daily_return') THEN
            ALTER TABLE t_nav_data ADD COLUMN daily_return NUMERIC(10,4);
            RAISE NOTICE '✓ Added t_nav_data.daily_return';
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 't_nav_data' AND column_name = 'return_1y') THEN
            ALTER TABLE t_nav_data ADD COLUMN return_1y NUMERIC(10,4);
            RAISE NOTICE '✓ Added t_nav_data.return_1y';
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 't_nav_data' AND column_name = 'sharpe_ratio') THEN
            ALTER TABLE t_nav_data ADD COLUMN sharpe_ratio NUMERIC(10,4);
            RAISE NOTICE '✓ Added t_nav_data.sharpe_ratio';
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 't_nav_data' AND column_name = 'metrics_calculated_at') THEN
            ALTER TABLE t_nav_data ADD COLUMN metrics_calculated_at TIMESTAMP;
            RAISE NOTICE '✓ Added t_nav_data.metrics_calculated_at';
        END IF;
    END IF;
END $$;

-- ============================================================================
-- PART 2: CREATE MISSING TABLES
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=== PART 2: Creating missing tables ===';
END $$;

-- m_job_types (CRITICAL for signup)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'm_job_types') THEN
        CREATE TABLE m_job_types (
            code VARCHAR(50) PRIMARY KEY,
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
        RAISE NOTICE '✓ Created m_job_types table';
    ELSE
        RAISE NOTICE 'm_job_types already exists';
    END IF;
END $$;

-- m_bookmark_reasons
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'm_bookmark_reasons') THEN
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
        RAISE NOTICE '✓ Created m_bookmark_reasons table';
    ELSE
        RAISE NOTICE 'm_bookmark_reasons already exists';
    END IF;
END $$;

-- t_customer_bookmarks
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 't_customer_bookmarks') THEN
        CREATE TABLE t_customer_bookmarks (
            id SERIAL PRIMARY KEY,
            tenant_id INTEGER NOT NULL,
            is_live BOOLEAN NOT NULL DEFAULT true,
            customer_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            reason_id INTEGER,
            custom_reason TEXT,
            notes TEXT,
            is_active BOOLEAN DEFAULT true,
            bookmarked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT unique_customer_bookmark UNIQUE (tenant_id, is_live, customer_id, user_id)
        );
        RAISE NOTICE '✓ Created t_customer_bookmarks table';
    ELSE
        RAISE NOTICE 't_customer_bookmarks already exists';
    END IF;
END $$;

-- m_asset_types
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'm_asset_types') THEN
        CREATE TABLE m_asset_types (
            id SERIAL PRIMARY KEY,
            asset_type_code VARCHAR(50) UNIQUE NOT NULL,
            asset_type_name VARCHAR(100) NOT NULL,
            category VARCHAR(50),
            default_assumption_rate NUMERIC(5,2) DEFAULT 10.00,
            display_order INTEGER DEFAULT 0,
            is_active BOOLEAN DEFAULT true,
            description TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        RAISE NOTICE '✓ Created m_asset_types table';
    ELSE
        RAISE NOTICE 'm_asset_types already exists';
    END IF;
END $$;

-- t_customer_asset_assignments
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 't_customer_asset_assignments') THEN
        CREATE TABLE t_customer_asset_assignments (
            id SERIAL PRIMARY KEY,
            tenant_id INTEGER NOT NULL,
            is_live BOOLEAN NOT NULL DEFAULT true,
            customer_id INTEGER NOT NULL,
            asset_type_id INTEGER,
            scheme_code VARCHAR(100),
            principal_amount NUMERIC(15,2),
            investment_type VARCHAR(50) DEFAULT 'lumpsum',
            recurring_amount NUMERIC(15,2),
            investment_frequency VARCHAR(20) DEFAULT 'monthly',
            has_started BOOLEAN DEFAULT false,
            start_date DATE,
            custom_assumption_rate NUMERIC(5,2),
            is_active BOOLEAN DEFAULT true,
            assigned_by INTEGER,
            notes TEXT,
            alerts_enabled BOOLEAN DEFAULT true,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        RAISE NOTICE '✓ Created t_customer_asset_assignments table';
    ELSE
        -- Add alerts_enabled if missing
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 't_customer_asset_assignments' AND column_name = 'alerts_enabled') THEN
            ALTER TABLE t_customer_asset_assignments ADD COLUMN alerts_enabled BOOLEAN DEFAULT true;
            RAISE NOTICE '✓ Added t_customer_asset_assignments.alerts_enabled';
        END IF;
        RAISE NOTICE 't_customer_asset_assignments already exists';
    END IF;
END $$;

-- m_alert_settings
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'm_alert_settings') THEN
        CREATE TABLE m_alert_settings (
            id SERIAL PRIMARY KEY,
            tenant_id INTEGER,
            is_live BOOLEAN DEFAULT true,
            setting_key VARCHAR(100) NOT NULL,
            setting_label VARCHAR(255) NOT NULL,
            days_before INTEGER NOT NULL DEFAULT 3,
            days_after INTEGER NOT NULL DEFAULT 10,
            auto_expire_hours INTEGER,
            applies_to_types TEXT[],
            is_active BOOLEAN DEFAULT true,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT unique_alert_setting UNIQUE (tenant_id, is_live, setting_key)
        );
        RAISE NOTICE '✓ Created m_alert_settings table';
    ELSE
        RAISE NOTICE 'm_alert_settings already exists';
    END IF;
END $$;

-- t_job_scheduler_configs
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 't_job_scheduler_configs') THEN
        CREATE TABLE t_job_scheduler_configs (
            id SERIAL PRIMARY KEY,
            tenant_id INTEGER NOT NULL,
            job_type VARCHAR(50) NOT NULL,
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
            CONSTRAINT unique_job_scheduler_config UNIQUE(tenant_id, job_type, is_live)
        );
        RAISE NOTICE '✓ Created t_job_scheduler_configs table';
    ELSE
        RAISE NOTICE 't_job_scheduler_configs already exists';
    END IF;
END $$;

-- t_market_indices
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 't_market_indices') THEN
        CREATE TABLE t_market_indices (
            id SERIAL PRIMARY KEY,
            index_code VARCHAR(50) UNIQUE NOT NULL,
            index_name VARCHAR(255) NOT NULL,
            description TEXT,
            data_provider VARCHAR(50) DEFAULT 'NSE',
            provider_symbol VARCHAR(100),
            is_active BOOLEAN DEFAULT true,
            display_order INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        RAISE NOTICE '✓ Created t_market_indices table';
    ELSE
        RAISE NOTICE 't_market_indices already exists';
    END IF;
END $$;

-- t_customer_aliases (Migration 024)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 't_customer_aliases') THEN
        CREATE TABLE t_customer_aliases (
            id SERIAL PRIMARY KEY,
            tenant_id INTEGER NOT NULL,
            is_live BOOLEAN NOT NULL DEFAULT true,
            alias_name VARCHAR(255) NOT NULL,
            description TEXT,
            created_by INTEGER,
            is_active BOOLEAN DEFAULT true,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT unique_alias_name UNIQUE (tenant_id, is_live, alias_name)
        );
        RAISE NOTICE '✓ Created t_customer_aliases table';
    ELSE
        RAISE NOTICE 't_customer_aliases already exists';
    END IF;
END $$;

-- t_customer_alias_members (Migration 024)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 't_customer_alias_members') THEN
        CREATE TABLE t_customer_alias_members (
            id SERIAL PRIMARY KEY,
            alias_id INTEGER NOT NULL,
            customer_id INTEGER NOT NULL,
            is_primary BOOLEAN DEFAULT false,
            added_by INTEGER,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT unique_alias_member UNIQUE (alias_id, customer_id)
        );
        RAISE NOTICE '✓ Created t_customer_alias_members table';
    ELSE
        RAISE NOTICE 't_customer_alias_members already exists';
    END IF;
END $$;

-- t_portfolio_snapshot_configs (if missing)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 't_portfolio_snapshot_configs') THEN
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
            CONSTRAINT unique_snapshot_scheduler UNIQUE(tenant_id, is_live)
        );
        RAISE NOTICE '✓ Created t_portfolio_snapshot_configs table';
    ELSE
        RAISE NOTICE 't_portfolio_snapshot_configs already exists';
    END IF;
END $$;

-- ============================================================================
-- PART 3: SEED REQUIRED DATA
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=== PART 3: Seeding required data ===';
END $$;

-- Seed m_job_types
INSERT INTO m_job_types (code, name, description, default_cron_expression, default_max_retries, is_active, default_schedule_type, failover_enabled, failover_cron_expression, is_global)
VALUES
    ('PORTFOLIO_SNAPSHOT', 'Portfolio Snapshot Generation', 'Generate monthly portfolio snapshots', '0 21 * * 5', 3, true, 'weekly', false, NULL, false),
    ('NAV_DOWNLOAD', 'NAV Download', 'Download NAV data for bookmarked schemes', '0 21 * * *', 3, true, 'daily', true, '0 22 * * *', true),
    ('MARKET_OHLC_DOWNLOAD', 'Market OHLC Download', 'Download OHLC data for market indices', '30 21 * * *', 3, true, 'daily', false, NULL, true),
    ('GOAL_CALCULATION', 'Goal Calculation', 'Recalculate customer goals and alerts', '30 20 * * 5', 3, true, 'weekly', false, NULL, false),
    ('DAILY_ALERTS', 'Daily Alerts', 'Process daily alert cards', '0 20 * * *', 3, true, 'daily', false, NULL, false)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    is_active = EXCLUDED.is_active,
    updated_at = CURRENT_TIMESTAMP;

DO $$
BEGIN
    RAISE NOTICE '✓ m_job_types: % records', (SELECT COUNT(*) FROM m_job_types);
END $$;

-- Seed m_asset_types
INSERT INTO m_asset_types (asset_type_code, asset_type_name, category, default_assumption_rate, display_order, is_active)
VALUES
    ('MF', 'Mutual Fund', 'equity', 12.00, 1, true),
    ('GOLD', 'Gold', 'commodity', 8.00, 2, true),
    ('SILVER', 'Silver', 'commodity', 7.00, 3, true),
    ('EQUITY', 'Equity', 'equity', 15.00, 4, true),
    ('FD', 'Fixed Deposit', 'fixed_income', 6.50, 5, true),
    ('PPF', 'Public Provident Fund', 'fixed_income', 7.10, 6, true),
    ('EPF', 'Employee Provident Fund', 'fixed_income', 8.25, 7, true),
    ('NPS', 'National Pension System', 'equity', 10.00, 8, true),
    ('REAL_ESTATE', 'Real Estate', 'real_estate', 8.00, 9, true),
    ('INSURANCE', 'Insurance', 'insurance', 5.00, 10, true)
ON CONFLICT (asset_type_code) DO NOTHING;

DO $$
BEGIN
    RAISE NOTICE '✓ m_asset_types: % records', (SELECT COUNT(*) FROM m_asset_types);
END $$;

-- Seed m_transaction_types (add missing ones)
INSERT INTO m_transaction_types (txn_code, txn_name, txn_type, is_active, description)
VALUES
    ('SIP', 'Systematic Investment Plan', 'Addition', TRUE, 'Regular systematic investment'),
    ('STP IN', 'Systematic Transfer Plan - In', 'Addition', TRUE, 'Transfer from another scheme'),
    ('PURCHASE', 'One-Time Purchase', 'Addition', TRUE, 'Lump sum purchase'),
    ('SWITCH IN', 'Switch In', 'Addition', TRUE, 'Funds from switching'),
    ('OPENING BALANCE', 'Opening Balance', 'Addition', TRUE, 'Initial balance'),
    ('SYSTEMATIC TRANSFER IN', 'Systematic Transfer In', 'Addition', TRUE, 'STP incoming'),
    ('STP OUT', 'Systematic Transfer Plan - Out', 'Deduction', TRUE, 'Transfer to another scheme'),
    ('REDEMPTION', 'Redemption', 'Deduction', TRUE, 'Withdrawal'),
    ('SWITCH OUT', 'Switch Out', 'Deduction', TRUE, 'Funds moved by switching'),
    ('SELL', 'Sell', 'Deduction', TRUE, 'Encashed from scheme'),
    ('SYSTEMATIC TRANSFER OUT', 'Systematic Transfer Out', 'Deduction', TRUE, 'STP outgoing')
ON CONFLICT (txn_code) DO NOTHING;

DO $$
BEGIN
    RAISE NOTICE '✓ m_transaction_types: % records', (SELECT COUNT(*) FROM m_transaction_types);
END $$;

-- Seed m_alert_settings (global defaults)
INSERT INTO m_alert_settings (tenant_id, is_live, setting_key, setting_label, days_before, days_after, auto_expire_hours, applies_to_types)
VALUES
    (NULL, true, 'sip_recurring_default', 'SIP/Recurring Payment Alerts', 3, 10, NULL, ARRAY['goal_sip_plan', 'portfolio_alert']),
    (NULL, true, 'time_based_default', 'Time-Based Reminders', 7, 3, NULL, ARRAY['time_based', 'profile_trigger']),
    (NULL, true, 'import_notification_default', 'Import Notifications', 0, 0, 24, ARRAY['import_notification']),
    (NULL, true, 'general_default', 'General Alerts', 3, 10, NULL, NULL)
ON CONFLICT (tenant_id, is_live, setting_key) DO NOTHING;

DO $$
BEGIN
    RAISE NOTICE '✓ m_alert_settings: % records', (SELECT COUNT(*) FROM m_alert_settings);
END $$;

-- Seed t_market_indices
INSERT INTO t_market_indices (index_code, index_name, data_provider, provider_symbol, is_active, display_order)
VALUES
    ('NIFTY50', 'NIFTY 50', 'NSE', 'NIFTY 50', true, 1),
    ('SENSEX', 'S&P BSE SENSEX', 'BSE', 'SENSEX', true, 2),
    ('NIFTY_NEXT50', 'NIFTY Next 50', 'NSE', 'NIFTY NEXT 50', true, 3),
    ('NIFTY_BANK', 'NIFTY Bank', 'NSE', 'NIFTY BANK', true, 4),
    ('NIFTY_IT', 'NIFTY IT', 'NSE', 'NIFTY IT', true, 5)
ON CONFLICT (index_code) DO NOTHING;

DO $$
BEGIN
    RAISE NOTICE '✓ t_market_indices: % records', (SELECT COUNT(*) FROM t_market_indices);
END $$;

-- Seed bookmark reasons for existing tenants
DO $$
DECLARE
    v_tenant RECORD;
    v_is_live BOOLEAN;
BEGIN
    FOR v_tenant IN SELECT id FROM t_tenants WHERE is_active = true
    LOOP
        FOREACH v_is_live IN ARRAY ARRAY[false, true]
        LOOP
            INSERT INTO m_bookmark_reasons (tenant_id, is_live, reason_code, reason_label, display_order)
            VALUES
                (v_tenant.id, v_is_live, 'VIP', 'VIP Customer', 1),
                (v_tenant.id, v_is_live, 'FOLLOW_UP', 'Follow-up Required', 2),
                (v_tenant.id, v_is_live, 'IMPORTANT', 'Important', 3),
                (v_tenant.id, v_is_live, 'HIGH_VALUE', 'High Value Client', 4),
                (v_tenant.id, v_is_live, 'ATTENTION', 'Requires Attention', 5),
                (v_tenant.id, v_is_live, 'PORTFOLIO_REVIEW', 'Portfolio Review Due', 6),
                (v_tenant.id, v_is_live, 'TAX_PLANNING', 'Tax Planning', 7),
                (v_tenant.id, v_is_live, 'OTHER', 'Other (Custom)', 99)
            ON CONFLICT (tenant_id, is_live, reason_code) DO NOTHING;
        END LOOP;
        RAISE NOTICE '✓ Tenant %: bookmark reasons seeded', v_tenant.id;
    END LOOP;
END $$;

-- ============================================================================
-- PART 4: VERIFICATION
-- ============================================================================

DO $$
DECLARE
    v_count INTEGER;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'VERIFICATION';
    RAISE NOTICE '==============================================';

    -- Check critical columns
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 't_tenants' AND column_name = 'is_admin') THEN
        RAISE NOTICE '✓ t_tenants.is_admin exists';
    ELSE
        RAISE NOTICE '✗ t_tenants.is_admin MISSING';
    END IF;

    -- Check critical tables
    SELECT COUNT(*) INTO v_count FROM information_schema.tables WHERE table_name = 'm_job_types';
    RAISE NOTICE '✓ m_job_types: % (table exists: %)', (SELECT COUNT(*) FROM m_job_types), v_count > 0;

    SELECT COUNT(*) INTO v_count FROM information_schema.tables WHERE table_name = 'm_bookmark_reasons';
    RAISE NOTICE '✓ m_bookmark_reasons: % (table exists: %)', (SELECT COUNT(*) FROM m_bookmark_reasons), v_count > 0;

    SELECT COUNT(*) INTO v_count FROM information_schema.tables WHERE table_name = 't_customer_bookmarks';
    RAISE NOTICE '✓ t_customer_bookmarks exists: %', v_count > 0;

    SELECT COUNT(*) INTO v_count FROM information_schema.tables WHERE table_name = 'm_asset_types';
    RAISE NOTICE '✓ m_asset_types: % (table exists: %)', (SELECT COUNT(*) FROM m_asset_types), v_count > 0;

    SELECT COUNT(*) INTO v_count FROM information_schema.tables WHERE table_name = 't_market_indices';
    RAISE NOTICE '✓ t_market_indices: % (table exists: %)', (SELECT COUNT(*) FROM t_market_indices), v_count > 0;

    RAISE NOTICE '';
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'COMPREHENSIVE SCHEMA SYNC - Complete';
    RAISE NOTICE '==============================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Please test:';
    RAISE NOTICE '  1. Login - should work now';
    RAISE NOTICE '  2. Signup - should work now';
    RAISE NOTICE '  3. Customer bookmarks feature';
    RAISE NOTICE '==============================================';
END $$;

COMMIT;
