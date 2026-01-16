-- ============================================================================
-- File: 05_seed_data.sql
-- Description: Seed data for global master data and admin tenants
-- Purpose: Master data for INITIAL DATABASE SETUP
-- Execution: Run FIFTH (last) after 04_functions_views_policies.sql
-- Author: System
-- Date: 2025-01-08
-- Updated: 2025-12-12 - Added Migration 026 STP aliases, SELL, OPENING BALANCE
-- ============================================================================
--
-- IMPORTANT NOTES:
-- ================
-- 1. GLOBAL MASTER DATA: This script seeds GLOBAL master data shared across
--    all tenants:
--    - Transaction Types (11 types including Migration 026 aliases)
--    - Job Types (5 types)
--    - Market Indices (50 NSE indices)
--    - Asset Types (10 types for multi-asset support)
--
-- 2. ADMIN TENANTS (IDs 1-3): Pre-configured admin/system tenants for
--    deployment with full configuration:
--    - Tenant records (marked with is_admin=true)
--    - Bookmark Reasons (8 reasons × 2 environments per tenant)
--    - IDs 1-3 are reserved for: Kewal, Staging, QA
--
-- 3. CLIENT TENANTS (ID 4+): Created via /register endpoint with automatic
--    seeding via tenantSeed.service.ts:
--    - Bookmark Reasons (8 reasons × 2 environments)
--    - Job Scheduler Configs
--    - Portfolio Snapshot Configs
--
-- 4. MARKET INDICES: Seeded with NULL tracking data. Historical data will be
--    populated when users download data via the Market Indices management UI.
--
-- ============================================================================

-- ============================================================================
-- SECTION 1: CREATE TRANSACTION TYPES TABLE
-- ============================================================================
DO $$ 
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Creating Transaction Types Table';
    RAISE NOTICE '========================================';
END $$;

-- ----------------------------------------------------------------------------
-- TABLE: m_transaction_types
-- Description: Master data for transaction types
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS m_transaction_types (
    id SERIAL PRIMARY KEY,
    txn_code VARCHAR(50) UNIQUE NOT NULL,
    txn_name VARCHAR(255) NOT NULL,
    txn_type VARCHAR(50) NOT NULL CHECK (txn_type IN ('Addition', 'Deduction')),
    is_active BOOLEAN DEFAULT true,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE m_transaction_types IS 'Master data for transaction types (SIP, Purchase, Redemption, etc.)';
COMMENT ON COLUMN m_transaction_types.txn_code IS 'Unique transaction code (e.g., SIP, PURCHASE)';
COMMENT ON COLUMN m_transaction_types.txn_type IS 'Addition or Deduction type';

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_txn_types_updated_at ON m_transaction_types;
CREATE TRIGGER update_txn_types_updated_at 
    BEFORE UPDATE ON m_transaction_types
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_txn_types_code 
    ON m_transaction_types(txn_code);

CREATE INDEX IF NOT EXISTS idx_txn_types_active 
    ON m_transaction_types(is_active) 
    WHERE is_active = true;

-- ============================================================================
-- SECTION 2: SEED TRANSACTION TYPES
-- ============================================================================
DO $$ 
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Seeding Transaction Types';
    RAISE NOTICE '========================================';
END $$;

-- ----------------------------------------------------------------------------
-- Transaction Types (11 total)
-- Includes Migration 026: SYSTEMATIC TRANSFER IN/OUT aliases for import files
-- ----------------------------------------------------------------------------
INSERT INTO m_transaction_types (txn_code, txn_name, txn_type, is_active, description)
VALUES
    -- ADDITION TYPES (6)
    ('SIP', 'Systematic Investment Plan', 'Addition', TRUE, 
     'Regular systematic investment contributions at fixed intervals'),
    
    ('STP IN', 'Systematic Transfer Plan - In', 'Addition', TRUE, 
     'Systematic transfer of funds from another scheme (incoming)'),
    
    ('PURCHASE', 'One-Time Purchase', 'Addition', TRUE, 
     'Lump sum purchase or investment transaction'),
    
    ('SWITCH IN', 'Switch In', 'Addition', TRUE, 
     'Funds received from switching from another scheme'),
    
    ('OPENING BALANCE', 'Opening Balance', 'Addition', TRUE, 
     'Funds added to system portfolio to balance transaction records'),
    
    -- Migration 026: Verbose alias for STP IN (import file compatibility)
    ('SYSTEMATIC TRANSFER IN', 'Systematic Transfer In', 'Addition', TRUE, 
     'Systematic transfer of funds from another scheme (incoming) - alternate code'),
    
    -- DEDUCTION TYPES (5)
    ('STP OUT', 'Systematic Transfer Plan - Out', 'Deduction', TRUE, 
     'Systematic transfer of funds to another scheme (outgoing)'),
    
    ('REDEMPTION', 'Redemption', 'Deduction', TRUE, 
     'Withdrawal or redemption of invested funds'),
    
    ('SWITCH OUT', 'Switch Out', 'Deduction', TRUE, 
     'Funds moved out by switching to another scheme'),
    
    ('SELL', 'Sell', 'Deduction', TRUE, 
     'Funds moved out / encashed from the scheme'),
    
    -- Migration 026: Verbose alias for STP OUT (import file compatibility)
    ('SYSTEMATIC TRANSFER OUT', 'Systematic Transfer Out', 'Deduction', TRUE, 
     'Systematic transfer of funds to another scheme (outgoing) - alternate code')

ON CONFLICT (txn_code) DO UPDATE 
    SET txn_name = EXCLUDED.txn_name,
        txn_type = EXCLUDED.txn_type,
        is_active = EXCLUDED.is_active,
        description = EXCLUDED.description,
        updated_at = CURRENT_TIMESTAMP;

DO $$ 
BEGIN
    RAISE NOTICE 'Transaction Types seeded: % total, % active', 
        (SELECT COUNT(*) FROM m_transaction_types),
        (SELECT COUNT(*) FROM m_transaction_types WHERE is_active = true);
    RAISE NOTICE '  - Addition types: %',
        (SELECT COUNT(*) FROM m_transaction_types WHERE txn_type = 'Addition');
    RAISE NOTICE '  - Deduction types: %',
        (SELECT COUNT(*) FROM m_transaction_types WHERE txn_type = 'Deduction');
END $$;

-- ============================================================================
-- SECTION 3: SEED JOB TYPES
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Seeding Job Types';
    RAISE NOTICE '========================================';
END $$;

-- Portfolio Snapshot - Friday 9 PM (weekly)
INSERT INTO m_job_types (code, name, description, default_cron_expression, default_max_retries, is_active, default_schedule_type, failover_enabled, failover_cron_expression, is_global)
VALUES ('PORTFOLIO_SNAPSHOT', 'Portfolio Snapshot Generation', 'Generate monthly portfolio snapshots for all customers to enable performance tracking', '0 21 * * 5', 3, true, 'weekly', false, NULL, false)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    default_cron_expression = EXCLUDED.default_cron_expression,
    default_max_retries = EXCLUDED.default_max_retries,
    is_active = EXCLUDED.is_active,
    default_schedule_type = EXCLUDED.default_schedule_type,
    failover_enabled = EXCLUDED.failover_enabled,
    failover_cron_expression = EXCLUDED.failover_cron_expression,
    is_global = EXCLUDED.is_global,
    updated_at = CURRENT_TIMESTAMP;

-- NAV Download - Daily 9 PM, failover 10 PM (GLOBAL - runs once for all tenants)
INSERT INTO m_job_types (code, name, description, default_cron_expression, default_max_retries, is_active, default_schedule_type, failover_enabled, failover_cron_expression, is_global)
VALUES ('NAV_DOWNLOAD', 'NAV Download', 'Download NAV data for all bookmarked schemes', '0 21 * * *', 3, true, 'daily', true, '0 22 * * *', true)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    default_cron_expression = EXCLUDED.default_cron_expression,
    default_max_retries = EXCLUDED.default_max_retries,
    is_active = EXCLUDED.is_active,
    default_schedule_type = EXCLUDED.default_schedule_type,
    failover_enabled = EXCLUDED.failover_enabled,
    failover_cron_expression = EXCLUDED.failover_cron_expression,
    is_global = EXCLUDED.is_global,
    updated_at = CURRENT_TIMESTAMP;

-- Market OHLC Download - Daily 9:30 PM (GLOBAL - runs once for all tenants)
INSERT INTO m_job_types (code, name, description, default_cron_expression, default_max_retries, is_active, default_schedule_type, failover_enabled, failover_cron_expression, is_global)
VALUES ('MARKET_OHLC_DOWNLOAD', 'Market OHLC Download', 'Download OHLC data for market indices', '30 21 * * *', 3, true, 'daily', false, NULL, true)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    default_cron_expression = EXCLUDED.default_cron_expression,
    default_max_retries = EXCLUDED.default_max_retries,
    is_active = EXCLUDED.is_active,
    default_schedule_type = EXCLUDED.default_schedule_type,
    failover_enabled = EXCLUDED.failover_enabled,
    failover_cron_expression = EXCLUDED.failover_cron_expression,
    is_global = EXCLUDED.is_global,
    updated_at = CURRENT_TIMESTAMP;

-- Goal Calculation - Friday 8:30 PM
INSERT INTO m_job_types (code, name, description, default_cron_expression, default_max_retries, is_active, default_schedule_type, failover_enabled, failover_cron_expression, is_global)
VALUES ('GOAL_CALCULATION', 'Goal Calculation', 'Recalculate all customer goals and generate alerts', '30 20 * * 5', 3, true, 'weekly', false, NULL, false)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    default_cron_expression = EXCLUDED.default_cron_expression,
    default_max_retries = EXCLUDED.default_max_retries,
    is_active = EXCLUDED.is_active,
    default_schedule_type = EXCLUDED.default_schedule_type,
    failover_enabled = EXCLUDED.failover_enabled,
    failover_cron_expression = EXCLUDED.failover_cron_expression,
    is_global = EXCLUDED.is_global,
    updated_at = CURRENT_TIMESTAMP;

-- Daily Alerts - Daily 8 PM
INSERT INTO m_job_types (code, name, description, default_cron_expression, default_max_retries, is_active, default_schedule_type, failover_enabled, failover_cron_expression, is_global)
VALUES ('DAILY_ALERTS', 'Daily Alerts', 'Process and generate daily alert cards for customers', '0 20 * * *', 3, true, 'daily', false, NULL, false)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    default_cron_expression = EXCLUDED.default_cron_expression,
    default_max_retries = EXCLUDED.default_max_retries,
    is_active = EXCLUDED.is_active,
    default_schedule_type = EXCLUDED.default_schedule_type,
    failover_enabled = EXCLUDED.failover_enabled,
    failover_cron_expression = EXCLUDED.failover_cron_expression,
    is_global = EXCLUDED.is_global,
    updated_at = CURRENT_TIMESTAMP;

DO $$
BEGIN
    RAISE NOTICE 'Job types seeded: % total, % active',
        (SELECT COUNT(*) FROM m_job_types),
        (SELECT COUNT(*) FROM m_job_types WHERE is_active = true);
END $$;

-- ============================================================================
-- SECTION 4: SEED ADMIN TENANTS
-- ============================================================================
DO $$ 
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Seeding Admin Tenants';
    RAISE NOTICE '========================================';
END $$;

-- ----------------------------------------------------------------------------
-- Insert admin tenants for initial deployment
-- NOTE: is_admin flag marks these as system/admin tenants
-- IDs 1-3 are reserved for admin purposes
-- Client tenants created via /register start from ID 4+
-- ----------------------------------------------------------------------------
INSERT INTO t_tenants (id, tenant_name, tenant_code, is_admin, is_active, created_at, updated_at)
VALUES 
    (1, 'Kewal Investments', 'KEWAL', TRUE, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (2, 'Staging Environment', 'STAGING', TRUE, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (3, 'QA Tenant', 'QA', TRUE, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (id) DO UPDATE 
    SET tenant_name = EXCLUDED.tenant_name,
        tenant_code = EXCLUDED.tenant_code,
        is_admin = EXCLUDED.is_admin,
        is_active = EXCLUDED.is_active,
        updated_at = CURRENT_TIMESTAMP;

-- Reset sequence to highest ID to prevent conflicts with client tenants
SELECT setval('t_tenants_id_seq', 
    (SELECT GREATEST(MAX(id), 3) FROM t_tenants), 
    true);

DO $$
BEGIN
    RAISE NOTICE 'Admin Tenants seeded: % total (% marked as admin)',
        (SELECT COUNT(*) FROM t_tenants WHERE id <= 3),
        (SELECT COUNT(*) FROM t_tenants WHERE is_admin = true);
END $$;

-- ============================================================================
-- SECTION 5: SEED BOOKMARK REASONS (ADMIN TENANTS ONLY)
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Seeding Bookmark Reasons for Admin Tenants';
    RAISE NOTICE '========================================';
END $$;

-- ----------------------------------------------------------------------------
-- Insert bookmark reasons for admin tenants (IDs 1-3) in both environments
-- Client tenants (ID 4+) get bookmark reasons via tenantSeed.service.ts
-- ----------------------------------------------------------------------------

-- Bookmark reasons for tenant 1 (Kewal Investments) - LIVE
INSERT INTO m_bookmark_reasons (tenant_id, is_live, reason_code, reason_label, display_order, is_active)
VALUES
    (1, TRUE, 'VIP', 'VIP Customer', 1, TRUE),
    (1, TRUE, 'FOLLOW_UP', 'Follow-up Required', 2, TRUE),
    (1, TRUE, 'IMPORTANT', 'Important', 3, TRUE),
    (1, TRUE, 'HIGH_VALUE', 'High Value Client', 4, TRUE),
    (1, TRUE, 'ATTENTION', 'Requires Attention', 5, TRUE),
    (1, TRUE, 'PORTFOLIO_REVIEW', 'Portfolio Review Due', 6, TRUE),
    (1, TRUE, 'TAX_PLANNING', 'Tax Planning', 7, TRUE),
    (1, TRUE, 'OTHER', 'Other (Custom)', 99, TRUE)
ON CONFLICT (tenant_id, is_live, reason_code) DO UPDATE
    SET reason_label = EXCLUDED.reason_label,
        display_order = EXCLUDED.display_order,
        is_active = EXCLUDED.is_active,
        updated_at = CURRENT_TIMESTAMP;

-- Bookmark reasons for tenant 1 (Kewal Investments) - TEST
INSERT INTO m_bookmark_reasons (tenant_id, is_live, reason_code, reason_label, display_order, is_active)
VALUES
    (1, FALSE, 'VIP', 'VIP Customer', 1, TRUE),
    (1, FALSE, 'FOLLOW_UP', 'Follow-up Required', 2, TRUE),
    (1, FALSE, 'IMPORTANT', 'Important', 3, TRUE),
    (1, FALSE, 'HIGH_VALUE', 'High Value Client', 4, TRUE),
    (1, FALSE, 'ATTENTION', 'Requires Attention', 5, TRUE),
    (1, FALSE, 'PORTFOLIO_REVIEW', 'Portfolio Review Due', 6, TRUE),
    (1, FALSE, 'TAX_PLANNING', 'Tax Planning', 7, TRUE),
    (1, FALSE, 'OTHER', 'Other (Custom)', 99, TRUE)
ON CONFLICT (tenant_id, is_live, reason_code) DO UPDATE
    SET reason_label = EXCLUDED.reason_label,
        display_order = EXCLUDED.display_order,
        is_active = EXCLUDED.is_active,
        updated_at = CURRENT_TIMESTAMP;

-- Bookmark reasons for tenant 2 (Staging) - LIVE
INSERT INTO m_bookmark_reasons (tenant_id, is_live, reason_code, reason_label, display_order, is_active)
VALUES
    (2, TRUE, 'VIP', 'VIP Customer', 1, TRUE),
    (2, TRUE, 'FOLLOW_UP', 'Follow-up Required', 2, TRUE),
    (2, TRUE, 'IMPORTANT', 'Important', 3, TRUE),
    (2, TRUE, 'HIGH_VALUE', 'High Value Client', 4, TRUE),
    (2, TRUE, 'ATTENTION', 'Requires Attention', 5, TRUE),
    (2, TRUE, 'PORTFOLIO_REVIEW', 'Portfolio Review Due', 6, TRUE),
    (2, TRUE, 'TAX_PLANNING', 'Tax Planning', 7, TRUE),
    (2, TRUE, 'OTHER', 'Other (Custom)', 99, TRUE)
ON CONFLICT (tenant_id, is_live, reason_code) DO UPDATE
    SET reason_label = EXCLUDED.reason_label,
        display_order = EXCLUDED.display_order,
        is_active = EXCLUDED.is_active,
        updated_at = CURRENT_TIMESTAMP;

-- Bookmark reasons for tenant 2 (Staging) - TEST
INSERT INTO m_bookmark_reasons (tenant_id, is_live, reason_code, reason_label, display_order, is_active)
VALUES
    (2, FALSE, 'VIP', 'VIP Customer', 1, TRUE),
    (2, FALSE, 'FOLLOW_UP', 'Follow-up Required', 2, TRUE),
    (2, FALSE, 'IMPORTANT', 'Important', 3, TRUE),
    (2, FALSE, 'HIGH_VALUE', 'High Value Client', 4, TRUE),
    (2, FALSE, 'ATTENTION', 'Requires Attention', 5, TRUE),
    (2, FALSE, 'PORTFOLIO_REVIEW', 'Portfolio Review Due', 6, TRUE),
    (2, FALSE, 'TAX_PLANNING', 'Tax Planning', 7, TRUE),
    (2, FALSE, 'OTHER', 'Other (Custom)', 99, TRUE)
ON CONFLICT (tenant_id, is_live, reason_code) DO UPDATE
    SET reason_label = EXCLUDED.reason_label,
        display_order = EXCLUDED.display_order,
        is_active = EXCLUDED.is_active,
        updated_at = CURRENT_TIMESTAMP;

-- Bookmark reasons for tenant 3 (QA) - LIVE
INSERT INTO m_bookmark_reasons (tenant_id, is_live, reason_code, reason_label, display_order, is_active)
VALUES
    (3, TRUE, 'VIP', 'VIP Customer', 1, TRUE),
    (3, TRUE, 'FOLLOW_UP', 'Follow-up Required', 2, TRUE),
    (3, TRUE, 'IMPORTANT', 'Important', 3, TRUE),
    (3, TRUE, 'HIGH_VALUE', 'High Value Client', 4, TRUE),
    (3, TRUE, 'ATTENTION', 'Requires Attention', 5, TRUE),
    (3, TRUE, 'PORTFOLIO_REVIEW', 'Portfolio Review Due', 6, TRUE),
    (3, TRUE, 'TAX_PLANNING', 'Tax Planning', 7, TRUE),
    (3, TRUE, 'OTHER', 'Other (Custom)', 99, TRUE)
ON CONFLICT (tenant_id, is_live, reason_code) DO UPDATE
    SET reason_label = EXCLUDED.reason_label,
        display_order = EXCLUDED.display_order,
        is_active = EXCLUDED.is_active,
        updated_at = CURRENT_TIMESTAMP;

-- Bookmark reasons for tenant 3 (QA) - TEST
INSERT INTO m_bookmark_reasons (tenant_id, is_live, reason_code, reason_label, display_order, is_active)
VALUES
    (3, FALSE, 'VIP', 'VIP Customer', 1, TRUE),
    (3, FALSE, 'FOLLOW_UP', 'Follow-up Required', 2, TRUE),
    (3, FALSE, 'IMPORTANT', 'Important', 3, TRUE),
    (3, FALSE, 'HIGH_VALUE', 'High Value Client', 4, TRUE),
    (3, FALSE, 'ATTENTION', 'Requires Attention', 5, TRUE),
    (3, FALSE, 'PORTFOLIO_REVIEW', 'Portfolio Review Due', 6, TRUE),
    (3, FALSE, 'TAX_PLANNING', 'Tax Planning', 7, TRUE),
    (3, FALSE, 'OTHER', 'Other (Custom)', 99, TRUE)
ON CONFLICT (tenant_id, is_live, reason_code) DO UPDATE
    SET reason_label = EXCLUDED.reason_label,
        display_order = EXCLUDED.display_order,
        is_active = EXCLUDED.is_active,
        updated_at = CURRENT_TIMESTAMP;

DO $$
BEGIN
    RAISE NOTICE 'Bookmark Reasons seeded: % total (8 reasons × 3 tenants × 2 environments)',
        (SELECT COUNT(*) FROM m_bookmark_reasons WHERE tenant_id IN (1, 2, 3));
    RAISE NOTICE 'Active Bookmark Reasons: %',
        (SELECT COUNT(*) FROM m_bookmark_reasons WHERE tenant_id IN (1, 2, 3) AND is_active = true);
END $$;

-- ============================================================================
-- SECTION 6: SEED MARKET INDICES
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Seeding Market Indices';
    RAISE NOTICE '========================================';
END $$;

-- ----------------------------------------------------------------------------
-- Insert all NSE market indices (50 indices)
-- Tracking fields (total_records, dates, download status) are NULL initially
-- Will be populated when users download historical data via UI
-- ----------------------------------------------------------------------------
-- ========================================
-- SEED DATA: Market Indices with Provider Configuration
-- Date: 2025-01-XX
-- Purpose: Insert all 50 NSE indices with provider setup
-- ========================================

INSERT INTO t_market_indices (
    index_code, index_name, yahoo_symbol, category, 
    description, is_active, priority,
    data_provider, provider_symbol, provider_enabled
) VALUES
    -- BROAD MARKET INDICES (Priority 1-15)
    ('NSEI', 'Nifty 50', '^NSEI', 'broad', 
     'Top 50 companies by market cap on NSE', TRUE, 1,
     'yahoo_finance', '^NSEI', TRUE),
    
    ('NSMIDCP', 'Nifty Next 50', '^NSMIDCP', 'broad',
     'Next 50 companies after Nifty 50', TRUE, 2,
     'not_configured', NULL, FALSE),
    
    ('CNX100', 'Nifty 100', '^CNX100', 'broad',
     'Top 100 companies - Nifty 50 + Next 50', TRUE, 3,
     'yahoo_finance', '^CNX100', TRUE),
    
    ('CNX200', 'Nifty 200', '^CNX200', 'broad',
     'Top 200 companies by market cap', TRUE, 4,
     'not_configured', NULL, FALSE),
    
    ('CNX500', 'Nifty 500', '^CNX500', 'broad',
     'Top 500 companies - broad market index', TRUE, 5,
     'not_configured', NULL, FALSE),
    
    ('NIFTYMID50', 'Nifty Midcap 50', '^NSEMDCP50', 'broad',
     'Top 50 mid-cap companies', TRUE, 6,
     'not_configured', NULL, FALSE),
    
    ('NIFTYMID100', 'Nifty Midcap 100', '^NSEMDCP100', 'broad',
     'Top 100 mid-cap companies', TRUE, 7,
     'not_configured', NULL, FALSE),
    
    ('NIFTYMID150', 'Nifty Midcap 150', '^NSEMDCP150', 'broad',
     'Top 150 mid-cap companies', TRUE, 8,
     'not_configured', NULL, FALSE),
    
    ('NIFTYSML50', 'Nifty Smallcap 50', '^NSMCP50', 'broad',
     'Top 50 small-cap companies', TRUE, 9,
     'not_configured', NULL, FALSE),
    
    ('NIFTYSML100', 'Nifty Smallcap 100', '^NSMCP100', 'broad',
     'Top 100 small-cap companies', TRUE, 10,
     'not_configured', NULL, FALSE),
    
    ('NIFTYSML250', 'Nifty Smallcap 250', '^NSMCP250', 'broad',
     'Top 250 small-cap companies', TRUE, 11,
     'not_configured', NULL, FALSE),
    
    ('NIFTYMICRO250', 'Nifty Microcap 250', '^CNXMICRO', 'broad',
     'Top 250 micro-cap companies', TRUE, 12,
     'not_configured', NULL, FALSE),
    
    ('NIFTYLRGMID250', 'Nifty LargeMidcap 250', '^CNXLRGMID', 'broad',
     'Large and mid-cap companies combined', TRUE, 13,
     'not_configured', NULL, FALSE),
    
    ('NIFTYTM', 'Nifty Total Market', '^NIFTYTM', 'broad',
     'Represents entire NSE market', TRUE, 14,
     'not_configured', NULL, FALSE),
    
    ('INDIAVIX', 'India VIX', '^INDIAVIX', 'broad',
     'Volatility Index - market fear gauge', TRUE, 15,
     'not_configured', NULL, FALSE),
    
    -- SECTORAL INDICES (Priority 20-39)
    ('BANKNIFTY', 'Nifty Bank', '^NSEBANK', 'sectoral',
     'Banking sector index', TRUE, 20,
     'not_configured', NULL, FALSE),
    
    ('NIFTYIT', 'Nifty IT', '^CNXIT', 'sectoral',
     'Information Technology sector', TRUE, 21,
     'not_configured', NULL, FALSE),
    
    ('NIFTYAUTO', 'Nifty Auto', '^CNXAUTO', 'sectoral',
     'Automobile sector index', TRUE, 22,
     'not_configured', NULL, FALSE),
    
    ('NIFTYFMCG', 'Nifty FMCG', '^CNXFMCG', 'sectoral',
     'Fast Moving Consumer Goods sector', TRUE, 23,
     'not_configured', NULL, FALSE),
    
    ('NIFTYPHARMA', 'Nifty Pharma', '^CNXPHARMA', 'sectoral',
     'Pharmaceutical sector index', TRUE, 24,
     'not_configured', NULL, FALSE),
    
    ('NIFTYMETAL', 'Nifty Metal', '^CNXMETAL', 'sectoral',
     'Metals and mining sector', TRUE, 25,
     'not_configured', NULL, FALSE),
    
    ('NIFTYREALTY', 'Nifty Realty', '^CNXREALTY', 'sectoral',
     'Real estate sector index', TRUE, 26,
     'not_configured', NULL, FALSE),
    
    ('NIFTYENERGY', 'Nifty Energy', '^CNXENERGY', 'sectoral',
     'Energy sector index', TRUE, 27,
     'not_configured', NULL, FALSE),
    
    ('NIFTYFINSRV', 'Nifty Financial Services', '^CNXFIN', 'sectoral',
     'Financial services sector', TRUE, 28,
     'not_configured', NULL, FALSE),
    
    ('NIFTYMEDIA', 'Nifty Media', '^CNXMEDIA', 'sectoral',
     'Media and entertainment sector', TRUE, 29,
     'not_configured', NULL, FALSE),
    
    ('NIFTYPVTBANK', 'Nifty Private Bank', '^NIFTYPVTBANK', 'sectoral',
     'Private sector banks', TRUE, 30,
     'not_configured', NULL, FALSE),
    
    ('NIFTYPSUBANK', 'Nifty PSU Bank', '^NIFTYPSUBANK', 'sectoral',
     'Public sector banks', TRUE, 31,
     'not_configured', NULL, FALSE),
    
    ('NIFTYOILGAS', 'Nifty Oil & Gas', '^CNXOILGAS', 'sectoral',
     'Oil and gas sector', TRUE, 32,
     'not_configured', NULL, FALSE),
    
    ('NIFTYHEALTH', 'Nifty Healthcare', '^CNXHEALTH', 'sectoral',
     'Healthcare sector index', TRUE, 33,
     'not_configured', NULL, FALSE),
    
    ('NIFTYCONSDUR', 'Nifty Consumer Durables', '^CNXCONSDUR', 'sectoral',
     'Consumer durables sector', TRUE, 34,
     'not_configured', NULL, FALSE),
    
    ('NIFTYCOMMODITIES', 'Nifty Commodities', '^CNXCOMMODITIES', 'sectoral',
     'Commodities sector index', TRUE, 35,
     'not_configured', NULL, FALSE),
    
    ('NIFTYINFRA', 'Nifty Infrastructure', '^CNXINFRA', 'sectoral',
     'Infrastructure sector', TRUE, 36,
     'not_configured', NULL, FALSE),
    
    ('NIFTYSERV', 'Nifty Services', '^CNXSERVICE', 'sectoral',
     'Services sector index', TRUE, 37,
     'not_configured', NULL, FALSE),
    
    ('NIFTYMNC', 'Nifty MNC', '^NIFTYMNC', 'sectoral',
     'Multinational corporations', TRUE, 38,
     'not_configured', NULL, FALSE),
    
    ('NIFTYPSE', 'Nifty PSE', '^NIFTYPSE', 'sectoral',
     'Public sector enterprises', TRUE, 39,
     'not_configured', NULL, FALSE),
    
    -- THEMATIC INDICES (Priority 40-54)
    ('NIFTYDIV50', 'Nifty Dividend Opportunities 50', '^NIFTYDIV50', 'thematic',
     'High dividend yielding stocks', TRUE, 40,
     'not_configured', NULL, FALSE),
    
    ('NIFTYGS15', 'Nifty Growth Sectors 15', '^NIFTYGS15', 'thematic',
     'Growth-oriented sectors', TRUE, 41,
     'not_configured', NULL, FALSE),
    
    ('NIFTYCONSUM', 'Nifty India Consumption', '^NIFTYCONSUM', 'thematic',
     'Consumption theme index', TRUE, 42,
     'not_configured', NULL, FALSE),
    
    ('NIFTYDIGITAL', 'Nifty India Digital', '^NIFTYDIGITAL', 'thematic',
     'Digital economy theme', TRUE, 43,
     'not_configured', NULL, FALSE),
    
    ('NIFTYMFG', 'Nifty India Manufacturing', '^NIFTYMFG', 'thematic',
     'Manufacturing theme index', TRUE, 44,
     'not_configured', NULL, FALSE),
    
    ('NIFTYHOUSING', 'Nifty Housing', '^NIFTYHOUSING', 'thematic',
     'Housing and real estate theme', TRUE, 45,
     'not_configured', NULL, FALSE),
    
    ('NIFTYTRANSPORT', 'Nifty Transport & Logistics', '^NIFTYTRANSPORT', 'thematic',
     'Transportation sector', TRUE, 46,
     'not_configured', NULL, FALSE),
    
    ('NIFTYMOBILITY', 'Nifty Mobility', '^NIFTYMOBILITY', 'thematic',
     'Mobility and transportation theme', TRUE, 47,
     'not_configured', NULL, FALSE),
    
    ('NIFTYMIDSML400', 'Nifty MidSmallcap 400', '^NIFTYMIDSML400', 'thematic',
     'Mid and small-cap combination', TRUE, 48,
     'not_configured', NULL, FALSE),
    
    ('NIFTYQLTY30', 'Nifty Quality 30', '^NIFTYQLTY30', 'thematic',
     'Quality stocks based on ROE, financial leverage, and earnings stability', TRUE, 49,
     'not_configured', NULL, FALSE),
    
    ('NIFTYALPHA50', 'Nifty Alpha 50', '^NIFTYALPHA50', 'thematic',
     'High alpha generating stocks', TRUE, 50,
     'not_configured', NULL, FALSE),
    
    ('NIFTYLOWVOL30', 'Nifty Low Volatility 30', '^NIFTYLOWVOL30', 'thematic',
     'Low volatility stocks', TRUE, 51,
     'not_configured', NULL, FALSE),
    
    ('NIFTYCPSE', 'Nifty CPSE', '^NIFTYCPSE', 'thematic',
     'Central Public Sector Enterprises', TRUE, 52,
     'not_configured', NULL, FALSE),
    
    ('NIFTYSME', 'Nifty SME Emerge', '^NIFTYSME', 'thematic',
     'Small and Medium Enterprises', TRUE, 53,
     'not_configured', NULL, FALSE),
    
    ('NIFTYRURAL', 'Nifty Rural', '^NIFTYRURAL', 'thematic',
     'Rural economy theme index', TRUE, 54,
     'not_configured', NULL, FALSE)

ON CONFLICT (index_code) DO UPDATE 
    SET index_name = EXCLUDED.index_name,
        yahoo_symbol = EXCLUDED.yahoo_symbol,
        category = EXCLUDED.category,
        description = EXCLUDED.description,
        is_active = EXCLUDED.is_active,
        priority = EXCLUDED.priority,
        data_provider = EXCLUDED.data_provider,
        provider_symbol = EXCLUDED.provider_symbol,
        provider_enabled = EXCLUDED.provider_enabled,
        updated_at = CURRENT_TIMESTAMP;

-- ========================================
-- VERIFICATION QUERIES
-- ========================================

-- Count by provider
SELECT 
    data_provider,
    provider_enabled,
    COUNT(*) as count
FROM t_market_indices
GROUP BY data_provider, provider_enabled
ORDER BY data_provider, provider_enabled;

-- Expected output:
-- yahoo_finance  | true  | 2   (NSEI, CNX100)
-- not_configured | false | 48  (all others)

-- List enabled indices
SELECT index_code, index_name, data_provider, provider_symbol
FROM t_market_indices
WHERE provider_enabled = true
ORDER BY priority;

-- Expected output:
-- NSEI    | Nifty 50   | yahoo_finance | ^NSEI
-- CNX100  | Nifty 100  | yahoo_finance | ^CNX100
DO $$
BEGIN
    RAISE NOTICE 'Market Indices seeded: % total (% active)',
        (SELECT COUNT(*) FROM t_market_indices),
        (SELECT COUNT(*) FROM t_market_indices WHERE is_active = true);
    RAISE NOTICE 'Categories: % broad, % sectoral, % thematic',
        (SELECT COUNT(*) FROM t_market_indices WHERE category = 'broad'),
        (SELECT COUNT(*) FROM t_market_indices WHERE category = 'sectoral'),
        (SELECT COUNT(*) FROM t_market_indices WHERE category = 'thematic');
END $$;

-- ============================================================================
-- SECTION 6: SEED SCHEME MASTERS (Scheme Types for Import Mapping)
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Seeding Scheme Masters (Types & Categories)';
    RAISE NOTICE '========================================';
END $$;

-- Insert scheme types that match the Scheme Type column in import data
-- These are used to populate scheme_type_id during scheme data import
-- Note: tenant_id=1, is_live=true for global master data
INSERT INTO t_scheme_masters (tenant_id, is_live, is_active, master_type, code, name, display_order)
VALUES
    (1, true, true, 'scheme_type', 'OPEN_ENDED', 'Open Ended', 1),
    (1, true, true, 'scheme_type', 'CLOSE_ENDED', 'Close Ended', 2),
    (1, true, true, 'scheme_type', 'INTERVAL_FUND', 'Interval Fund', 3)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    display_order = EXCLUDED.display_order,
    is_active = EXCLUDED.is_active,
    updated_at = CURRENT_TIMESTAMP;

-- Insert scheme categories that match the Scheme Category column in import data
-- These are used to populate scheme_category_id during scheme data import
-- Asset type is derived from scheme_category (not scheme_type)
INSERT INTO t_scheme_masters (tenant_id, is_live, is_active, master_type, code, name, display_order)
VALUES
    -- Legacy categories (for backward compatibility)
    (1, true, true, 'scheme_category', 'ASSURED_RETURN', 'Assured Return', 1),
    (1, true, true, 'scheme_category', 'BALANCED', 'Balanced', 2),
    (1, true, true, 'scheme_category', 'ELSS', 'ELSS', 3),
    (1, true, true, 'scheme_category', 'GILT', 'Gilt', 4),
    (1, true, true, 'scheme_category', 'GROWTH', 'Growth', 5),
    (1, true, true, 'scheme_category', 'INCOME', 'Income', 6),
    (1, true, true, 'scheme_category', 'LIQUID', 'Liquid', 7),
    (1, true, true, 'scheme_category', 'MONEY_MARKET', 'Money Market', 8),

    -- Debt Scheme categories
    (1, true, true, 'scheme_category', 'DEBT_BANKING_PSU', 'Debt Scheme - Banking and PSU Fund', 10),
    (1, true, true, 'scheme_category', 'DEBT_CORPORATE_BOND', 'Debt Scheme - Corporate Bond Fund', 11),
    (1, true, true, 'scheme_category', 'DEBT_CREDIT_RISK', 'Debt Scheme - Credit Risk Fund', 12),
    (1, true, true, 'scheme_category', 'DEBT_DYNAMIC_BOND', 'Debt Scheme - Dynamic Bond', 13),
    (1, true, true, 'scheme_category', 'DEBT_FLOATER', 'Debt Scheme - Floater Fund', 14),
    (1, true, true, 'scheme_category', 'DEBT_GILT', 'Debt Scheme - Gilt Fund', 15),
    (1, true, true, 'scheme_category', 'DEBT_GILT_10Y', 'Debt Scheme - Gilt Fund with 10 year constant duration', 16),
    (1, true, true, 'scheme_category', 'DEBT_LIQUID', 'Debt Scheme - Liquid Fund', 17),
    (1, true, true, 'scheme_category', 'DEBT_LONG_DURATION', 'Debt Scheme - Long Duration Fund', 18),
    (1, true, true, 'scheme_category', 'DEBT_LOW_DURATION', 'Debt Scheme - Low Duration Fund', 19),
    (1, true, true, 'scheme_category', 'DEBT_MEDIUM_DURATION', 'Debt Scheme - Medium Duration Fund', 20),
    (1, true, true, 'scheme_category', 'DEBT_MEDIUM_LONG_DURATION', 'Debt Scheme - Medium to Long Duration Fund', 21),
    (1, true, true, 'scheme_category', 'DEBT_MONEY_MARKET', 'Debt Scheme - Money Market Fund', 22),
    (1, true, true, 'scheme_category', 'DEBT_OVERNIGHT', 'Debt Scheme - Overnight Fund', 23),
    (1, true, true, 'scheme_category', 'DEBT_SHORT_DURATION', 'Debt Scheme - Short Duration Fund', 24),
    (1, true, true, 'scheme_category', 'DEBT_ULTRA_SHORT', 'Debt Scheme - Ultra Short Duration Fund', 25),

    -- Equity Scheme categories
    (1, true, true, 'scheme_category', 'EQUITY_CONTRA', 'Equity Scheme - Contra Fund', 30),
    (1, true, true, 'scheme_category', 'EQUITY_DIVIDEND_YIELD', 'Equity Scheme - Dividend Yield Fund', 31),
    (1, true, true, 'scheme_category', 'EQUITY_ELSS', 'Equity Scheme - ELSS', 32),
    (1, true, true, 'scheme_category', 'EQUITY_FLEXI_CAP', 'Equity Scheme - Flexi Cap Fund', 33),
    (1, true, true, 'scheme_category', 'EQUITY_FOCUSED', 'Equity Scheme - Focused Fund', 34),
    (1, true, true, 'scheme_category', 'EQUITY_LARGE_MID_CAP', 'Equity Scheme - Large & Mid Cap Fund', 35),
    (1, true, true, 'scheme_category', 'EQUITY_LARGE_CAP', 'Equity Scheme - Large Cap Fund', 36),
    (1, true, true, 'scheme_category', 'EQUITY_MID_CAP', 'Equity Scheme - Mid Cap Fund', 37),
    (1, true, true, 'scheme_category', 'EQUITY_MULTI_CAP', 'Equity Scheme - Multi Cap Fund', 38),
    (1, true, true, 'scheme_category', 'EQUITY_SECTORAL_THEMATIC', 'Equity Scheme - Sectoral/ Thematic', 39),
    (1, true, true, 'scheme_category', 'EQUITY_SMALL_CAP', 'Equity Scheme - Small Cap Fund', 40),
    (1, true, true, 'scheme_category', 'EQUITY_VALUE', 'Equity Scheme - Value Fund', 41),

    -- Hybrid Scheme categories
    (1, true, true, 'scheme_category', 'HYBRID_AGGRESSIVE', 'Hybrid Scheme - Aggressive Hybrid Fund', 50),
    (1, true, true, 'scheme_category', 'HYBRID_ARBITRAGE', 'Hybrid Scheme - Arbitrage Fund', 51),
    (1, true, true, 'scheme_category', 'HYBRID_BALANCED', 'Hybrid Scheme - Balanced Hybrid Fund', 52),
    (1, true, true, 'scheme_category', 'HYBRID_CONSERVATIVE', 'Hybrid Scheme - Conservative Hybrid Fund', 53),
    (1, true, true, 'scheme_category', 'HYBRID_DYNAMIC_BAF', 'Hybrid Scheme - Dynamic Asset Allocation or Balanced Advantage', 54),
    (1, true, true, 'scheme_category', 'HYBRID_EQUITY_SAVINGS', 'Hybrid Scheme - Equity Savings', 55),
    (1, true, true, 'scheme_category', 'HYBRID_MULTI_ASSET', 'Hybrid Scheme - Multi Asset Allocation', 56),

    -- Other Scheme categories
    (1, true, true, 'scheme_category', 'OTHER_FOF_DOMESTIC', 'Other Scheme - FoF Domestic', 60),
    (1, true, true, 'scheme_category', 'OTHER_FOF_OVERSEAS', 'Other Scheme - FoF Overseas', 61),
    (1, true, true, 'scheme_category', 'OTHER_GOLD_ETF', 'Other Scheme - Gold ETF', 62),
    (1, true, true, 'scheme_category', 'OTHER_INDEX_FUNDS', 'Other Scheme - Index Funds', 63),
    (1, true, true, 'scheme_category', 'OTHER_ETFS', 'Other Scheme - Other  ETFs', 64),

    -- Solution Oriented Scheme categories
    (1, true, true, 'scheme_category', 'SOLUTION_CHILDREN', 'Solution Oriented Scheme - Children s Fund', 70),
    (1, true, true, 'scheme_category', 'SOLUTION_RETIREMENT', 'Solution Oriented Scheme - Retirement Fund', 71)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    display_order = EXCLUDED.display_order,
    is_active = EXCLUDED.is_active,
    updated_at = CURRENT_TIMESTAMP;

-- Verify scheme masters seeded
DO $$
DECLARE
    v_scheme_type_count INTEGER;
    v_scheme_category_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_scheme_type_count
    FROM t_scheme_masters
    WHERE master_type = 'scheme_type' AND is_active = true;

    SELECT COUNT(*) INTO v_scheme_category_count
    FROM t_scheme_masters
    WHERE master_type = 'scheme_category' AND is_active = true;

    RAISE NOTICE '✓ Scheme Types seeded: % types', v_scheme_type_count;
    RAISE NOTICE '    - Open Ended, Close Ended, Interval Fund';
    RAISE NOTICE '✓ Scheme Categories seeded: % categories', v_scheme_category_count;
    RAISE NOTICE '    - Used for asset_type_code during transaction import';
END $$;

-- ============================================================================
-- SECTION 6A: SEED ASSET TYPES (Release 1.1 - Based on Scheme Categories)
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Seeding Asset Types (50 Scheme Categories + Other Assets)';
    RAISE NOTICE '========================================';
END $$;

-- Insert all scheme categories as asset types
-- Asset type code = Scheme Category name (exact match for lookup)
INSERT INTO m_asset_types (asset_type_code, asset_type_name, category, default_assumption_rate, display_order, is_active, description)
VALUES
    -- Legacy categories (backward compatibility)
    ('Assured Return', 'Assured Return', 'debt', 7.00, 1, true, 'Legacy: Assured return schemes'),
    ('Balanced', 'Balanced', 'hybrid', 10.00, 2, true, 'Legacy: Balanced funds'),
    ('ELSS', 'ELSS', 'equity', 12.00, 3, true, 'Legacy: Equity Linked Savings Scheme'),
    ('Gilt', 'Gilt', 'debt', 7.00, 4, true, 'Legacy: Government securities funds'),
    ('Growth', 'Growth', 'equity', 12.00, 5, true, 'Legacy: Growth-oriented funds'),
    ('Income', 'Income', 'debt', 7.50, 6, true, 'Legacy: Income funds'),
    ('Liquid', 'Liquid', 'debt', 5.00, 7, true, 'Legacy: Liquid funds'),
    ('Money Market', 'Money Market', 'debt', 5.50, 8, true, 'Legacy: Money market funds'),

    -- Debt Scheme categories (default 6-7% returns)
    ('Debt Scheme - Banking and PSU Fund', 'Banking & PSU Fund', 'debt', 7.00, 10, true,
     'Debt funds investing in banks and public sector undertakings'),
    ('Debt Scheme - Corporate Bond Fund', 'Corporate Bond Fund', 'debt', 7.50, 11, true,
     'Debt funds primarily investing in AA+ rated corporate bonds'),
    ('Debt Scheme - Credit Risk Fund', 'Credit Risk Fund', 'debt', 8.00, 12, true,
     'Debt funds investing in lower-rated corporate bonds for higher yields'),
    ('Debt Scheme - Dynamic Bond', 'Dynamic Bond', 'debt', 7.00, 13, true,
     'Debt funds with flexible duration based on interest rate outlook'),
    ('Debt Scheme - Floater Fund', 'Floater Fund', 'debt', 6.50, 14, true,
     'Debt funds investing in floating rate instruments'),
    ('Debt Scheme - Gilt Fund', 'Gilt Fund', 'debt', 7.00, 15, true,
     'Debt funds investing in government securities'),
    ('Debt Scheme - Gilt Fund with 10 year constant duration', 'Gilt 10Y Duration', 'debt', 7.00, 16, true,
     'Gilt funds maintaining 10-year constant duration'),
    ('Debt Scheme - Liquid Fund', 'Liquid Fund', 'debt', 5.00, 17, true,
     'Very short-term debt funds for parking surplus cash'),
    ('Debt Scheme - Long Duration Fund', 'Long Duration Fund', 'debt', 7.50, 18, true,
     'Debt funds with Macaulay duration > 7 years'),
    ('Debt Scheme - Low Duration Fund', 'Low Duration Fund', 'debt', 6.00, 19, true,
     'Debt funds with Macaulay duration 6-12 months'),
    ('Debt Scheme - Medium Duration Fund', 'Medium Duration Fund', 'debt', 6.50, 20, true,
     'Debt funds with Macaulay duration 3-4 years'),
    ('Debt Scheme - Medium to Long Duration Fund', 'Medium to Long Duration', 'debt', 7.00, 21, true,
     'Debt funds with Macaulay duration 4-7 years'),
    ('Debt Scheme - Money Market Fund', 'Money Market Fund', 'debt', 5.50, 22, true,
     'Debt funds investing in money market instruments'),
    ('Debt Scheme - Overnight Fund', 'Overnight Fund', 'debt', 4.50, 23, true,
     'Debt funds with 1-day maturity securities'),
    ('Debt Scheme - Short Duration Fund', 'Short Duration Fund', 'debt', 6.00, 24, true,
     'Debt funds with Macaulay duration 1-3 years'),
    ('Debt Scheme - Ultra Short Duration Fund', 'Ultra Short Duration', 'debt', 5.50, 25, true,
     'Debt funds with Macaulay duration 3-6 months'),

    -- Equity Scheme categories (default 12-15% returns)
    ('Equity Scheme - Contra Fund', 'Contra Fund', 'equity', 12.00, 30, true,
     'Equity funds following contrarian investment strategy'),
    ('Equity Scheme - Dividend Yield Fund', 'Dividend Yield Fund', 'equity', 11.00, 31, true,
     'Equity funds investing in high dividend yield stocks'),
    ('Equity Scheme - ELSS', 'ELSS Tax Saver', 'equity', 12.00, 32, true,
     'Equity Linked Savings Scheme with 3-year lock-in'),
    ('Equity Scheme - Flexi Cap Fund', 'Flexi Cap Fund', 'equity', 12.00, 33, true,
     'Equity funds with flexibility to invest across market caps'),
    ('Equity Scheme - Focused Fund', 'Focused Fund', 'equity', 13.00, 34, true,
     'Concentrated equity funds with max 30 stocks'),
    ('Equity Scheme - Large & Mid Cap Fund', 'Large & Mid Cap Fund', 'equity', 12.00, 35, true,
     'Equity funds investing in large and mid cap stocks'),
    ('Equity Scheme - Large Cap Fund', 'Large Cap Fund', 'equity', 11.00, 36, true,
     'Equity funds investing in top 100 companies by market cap'),
    ('Equity Scheme - Mid Cap Fund', 'Mid Cap Fund', 'equity', 13.00, 37, true,
     'Equity funds investing in 101st-250th companies by market cap'),
    ('Equity Scheme - Multi Cap Fund', 'Multi Cap Fund', 'equity', 12.00, 38, true,
     'Equity funds with mandatory allocation across market caps'),
    ('Equity Scheme - Sectoral/ Thematic', 'Sectoral/Thematic', 'equity', 14.00, 39, true,
     'Equity funds focused on specific sectors or themes'),
    ('Equity Scheme - Small Cap Fund', 'Small Cap Fund', 'equity', 15.00, 40, true,
     'Equity funds investing in 251st and smaller companies'),
    ('Equity Scheme - Value Fund', 'Value Fund', 'equity', 12.00, 41, true,
     'Equity funds following value investment strategy'),

    -- Hybrid Scheme categories (default 9-11% returns)
    ('Hybrid Scheme - Aggressive Hybrid Fund', 'Aggressive Hybrid', 'hybrid', 11.00, 50, true,
     'Hybrid funds with 65-80% equity allocation'),
    ('Hybrid Scheme - Arbitrage Fund', 'Arbitrage Fund', 'hybrid', 6.00, 51, true,
     'Hybrid funds exploiting price differentials'),
    ('Hybrid Scheme - Balanced Hybrid Fund', 'Balanced Hybrid', 'hybrid', 10.00, 52, true,
     'Hybrid funds with 40-60% equity allocation'),
    ('Hybrid Scheme - Conservative Hybrid Fund', 'Conservative Hybrid', 'hybrid', 8.00, 53, true,
     'Hybrid funds with 10-25% equity allocation'),
    ('Hybrid Scheme - Dynamic Asset Allocation or Balanced Advantage', 'Dynamic BAF', 'hybrid', 10.00, 54, true,
     'Hybrid funds dynamically managing equity-debt allocation'),
    ('Hybrid Scheme - Equity Savings', 'Equity Savings', 'hybrid', 9.00, 55, true,
     'Hybrid funds with equity, debt, and arbitrage'),
    ('Hybrid Scheme - Multi Asset Allocation', 'Multi Asset', 'hybrid', 10.00, 56, true,
     'Hybrid funds investing in at least 3 asset classes'),

    -- Other Scheme categories (varied returns)
    ('Other Scheme - FoF Domestic', 'FoF Domestic', 'fof', 10.00, 60, true,
     'Fund of funds investing in domestic mutual funds'),
    ('Other Scheme - FoF Overseas', 'FoF Overseas', 'fof', 10.00, 61, true,
     'Fund of funds investing in international funds'),
    ('Other Scheme - Gold ETF', 'Gold ETF', 'commodity', 8.00, 62, true,
     'Exchange traded funds tracking gold prices'),
    ('Other Scheme - Index Funds', 'Index Fund', 'equity', 11.00, 63, true,
     'Passively managed funds tracking market indices'),
    ('Other Scheme - Other  ETFs', 'Other ETFs', 'equity', 11.00, 64, true,
     'Other exchange traded funds'),

    -- Solution Oriented Scheme categories
    ('Solution Oriented Scheme - Children s Fund', 'Children Fund', 'solution', 10.00, 70, true,
     'Funds for children education and welfare with 5-year lock-in'),
    ('Solution Oriented Scheme - Retirement Fund', 'Retirement Fund', 'solution', 10.00, 71, true,
     'Funds for retirement planning with 5-year lock-in'),

    -- Non-MF Asset types (for manual asset tracking)
    ('GOLD', 'Gold', 'commodity', 8.00, 80, true,
     'Physical gold, sovereign gold bonds, and gold investments'),
    ('SILVER', 'Silver', 'commodity', 7.00, 81, true,
     'Physical silver and silver-backed investments'),
    ('EQUITY', 'Direct Equity', 'equity', 15.00, 82, true,
     'Direct equity investments in stocks'),
    ('FD', 'Fixed Deposit', 'fixed_income', 6.50, 83, true,
     'Bank and corporate fixed deposits'),
    ('PPF', 'Public Provident Fund', 'fixed_income', 7.10, 84, true,
     'Government-backed long-term savings scheme'),
    ('EPF', 'Employee Provident Fund', 'fixed_income', 8.25, 85, true,
     'Retirement savings for salaried employees'),
    ('NPS', 'National Pension System', 'pension', 10.00, 86, true,
     'Government pension scheme'),
    ('REAL_ESTATE', 'Real Estate', 'real_estate', 8.00, 87, true,
     'Property investments'),
    ('INSURANCE', 'Insurance', 'insurance', 5.00, 88, true,
     'Insurance-linked investment products')
ON CONFLICT (asset_type_code) DO NOTHING;

-- Verify asset types seeded
DO $$
DECLARE
    v_asset_count INTEGER;
    v_scheme_categories INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_asset_count FROM m_asset_types WHERE is_active = true;
    SELECT COUNT(*) INTO v_scheme_categories FROM m_asset_types
    WHERE is_active = true AND category IN ('equity', 'debt', 'hybrid', 'fof', 'solution');

    RAISE NOTICE '✓ Asset Types seeded: % total active types', v_asset_count;
    RAISE NOTICE '  - Scheme Categories (for MF): %', v_scheme_categories;
    RAISE NOTICE '  Categories breakdown:';
    RAISE NOTICE '    - Equity: %', (SELECT COUNT(*) FROM m_asset_types WHERE category = 'equity' AND is_active = true);
    RAISE NOTICE '    - Debt: %', (SELECT COUNT(*) FROM m_asset_types WHERE category = 'debt' AND is_active = true);
    RAISE NOTICE '    - Hybrid: %', (SELECT COUNT(*) FROM m_asset_types WHERE category = 'hybrid' AND is_active = true);
    RAISE NOTICE '    - FoF: %', (SELECT COUNT(*) FROM m_asset_types WHERE category = 'fof' AND is_active = true);
    RAISE NOTICE '    - Solution: %', (SELECT COUNT(*) FROM m_asset_types WHERE category = 'solution' AND is_active = true);
    RAISE NOTICE '    - Commodity: %', (SELECT COUNT(*) FROM m_asset_types WHERE category = 'commodity' AND is_active = true);
    RAISE NOTICE '    - Fixed Income: %', (SELECT COUNT(*) FROM m_asset_types WHERE category = 'fixed_income' AND is_active = true);
END $$;

-- ============================================================================
-- SECTION 7: VERIFICATION & SUMMARY
-- ============================================================================
DO $$
DECLARE
    v_txn_count INTEGER;
    v_txn_addition INTEGER;
    v_txn_deduction INTEGER;
    v_job_types_count INTEGER;
    v_tenant_count INTEGER;
    v_admin_tenant_count INTEGER;
    v_bookmark_count INTEGER;
    v_active_bookmark INTEGER;
    v_unique_reasons INTEGER;
    v_market_indices_count INTEGER;
    v_active_indices INTEGER;
    v_asset_types_count INTEGER;
BEGIN
    SELECT COUNT(*), 
           COUNT(*) FILTER (WHERE txn_type = 'Addition'),
           COUNT(*) FILTER (WHERE txn_type = 'Deduction')
    INTO v_txn_count, v_txn_addition, v_txn_deduction
    FROM m_transaction_types WHERE is_active = true;
    
    SELECT COUNT(*) INTO v_job_types_count FROM m_job_types WHERE is_active = true;

    SELECT COUNT(*), COUNT(*) FILTER (WHERE is_admin = true)
    INTO v_tenant_count, v_admin_tenant_count
    FROM t_tenants WHERE id <= 3;

    SELECT COUNT(*), COUNT(*) FILTER (WHERE is_active = true), COUNT(DISTINCT reason_code)
    INTO v_bookmark_count, v_active_bookmark, v_unique_reasons
    FROM m_bookmark_reasons
    WHERE tenant_id IN (1, 2, 3);

    SELECT COUNT(*), COUNT(*) FILTER (WHERE is_active = true)
    INTO v_market_indices_count, v_active_indices
    FROM t_market_indices;

    SELECT COUNT(*) INTO v_asset_types_count FROM m_asset_types WHERE is_active = true;

    RAISE NOTICE '========================================';
    RAISE NOTICE '     SEED DATA SUMMARY';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Transaction Types: % active (% Addition, % Deduction)', 
        v_txn_count, v_txn_addition, v_txn_deduction;
    RAISE NOTICE '  - Includes Migration 026: SYSTEMATIC TRANSFER IN/OUT aliases';
    RAISE NOTICE 'Job Types: % active', v_job_types_count;
    RAISE NOTICE 'Admin Tenants: % total (% admin)', v_tenant_count, v_admin_tenant_count;
    RAISE NOTICE 'Bookmark Reasons (Admin Only): % total (% unique × % tenants × 2 envs)',
        v_bookmark_count, v_unique_reasons, v_tenant_count;
    RAISE NOTICE 'Market Indices: % total (% active)', v_market_indices_count, v_active_indices;
    RAISE NOTICE 'Asset Types: % active (includes Open Ended, Close Ended, Interval Fund)', v_asset_types_count;
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Seed data loaded successfully!';
    RAISE NOTICE 'Client tenants (ID 4+) will auto-seed via /register';
    RAISE NOTICE '========================================';
END $$;

-- ============================================================================
-- END OF FILE
-- ============================================================================