-- ============================================================================
-- File: 05_seed_data.sql
-- Description: Seed data for transaction types and initial tenants
-- Purpose: Master data and test tenants for INITIAL DATABASE SETUP
-- Execution: Run FIFTH (last) after 04_functions_views_policies.sql
-- Author: System
-- Date: 2025-01-08
-- Updated: 2025-01-23 - Added automatic tenant seeding on signup
-- ============================================================================
--
-- IMPORTANT NOTES:
-- ================
-- 1. NEW TENANT SIGNUP: Starting from 2025-01-23, when a new tenant signs up
--    via the /register endpoint, the following data is AUTOMATICALLY seeded:
--    - Transaction types (17 types) for both LIVE and TEST environments
--    - Bookmark reasons (8 reasons) for both LIVE and TEST environments
--    See: backend/src/services/tenantSeed.service.ts
--
-- 2. THIS SCRIPT PURPOSE: This script is now primarily used for:
--    - Initial database setup (fresh deployment)
--    - Seeding pre-existing tenants (Kewal, Staging, QA) during deployment
--    - Backfilling data for tenants created before auto-seeding was implemented
--    - Development/testing environments where you need multiple tenants setup
--
-- 3. DEPLOYMENT: When deploying to a client:
--    - Run this script ONCE during initial setup to seed pre-configured tenants
--    - Future tenants will be automatically seeded via the signup flow
--    - No need to modify this script when adding new tenants via signup
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

INSERT INTO m_transaction_types (txn_code, txn_name, txn_type, is_active, description)
VALUES
    ('SIP', 'Systematic Investment Plan', 'Addition', TRUE, 
     'Regular systematic investment contributions at fixed intervals'),
    
    ('STP IN', 'Systematic Transfer Plan - In', 'Addition', TRUE, 
     'Systematic transfer of funds from another scheme (incoming)'),
    
    ('PURCHASE', 'One-Time Purchase', 'Addition', TRUE, 
     'Lump sum purchase or investment transaction'),
    
    ('SWITCH IN', 'Switch In', 'Addition', TRUE, 
     'Funds received from switching from another scheme'),
    
    ('STP OUT', 'Systematic Transfer Plan - Out', 'Deduction', TRUE, 
     'Systematic transfer of funds to another scheme (outgoing)'),
    
    ('REDEMPTION', 'Redemption', 'Deduction', TRUE, 
     'Withdrawal or redemption of invested funds'),
    
    ('SWITCH OUT', 'Switch Out', 'Deduction', TRUE, 
     'Funds moved out by switching to another scheme')
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
END $$;

-- ============================================================================
-- SECTION 3: SEED TENANTS
-- ============================================================================
DO $$ 
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Seeding Tenants';
    RAISE NOTICE '========================================';
END $$;

-- ----------------------------------------------------------------------------
-- Insert initial tenants
-- ID 1: Primary/Production tenant
-- ID 2: Staging/UAT tenant
-- ID 3: QA/Testing tenant
-- ----------------------------------------------------------------------------
INSERT INTO t_tenants (id, tenant_name, tenant_code, is_active, created_at, updated_at)
VALUES 
    (1, 'Kewal Investments', 'KEWAL', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (2, 'Staging Environment', 'STAGING', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (3, 'QA Tenant', 'QA', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (id) DO UPDATE 
    SET tenant_name = EXCLUDED.tenant_name,
        tenant_code = EXCLUDED.tenant_code,
        is_active = EXCLUDED.is_active,
        updated_at = CURRENT_TIMESTAMP;

-- Reset sequence to highest ID to prevent conflicts
SELECT setval('t_tenants_id_seq', 
    (SELECT GREATEST(MAX(id), 3) FROM t_tenants), 
    true);

DO $$
BEGIN
    RAISE NOTICE 'Tenants seeded: % total, % active',
        (SELECT COUNT(*) FROM t_tenants),
        (SELECT COUNT(*) FROM t_tenants WHERE is_active = true);
END $$;

-- ============================================================================
-- SECTION 4: SEED BOOKMARK REASONS
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Seeding Bookmark Reasons';
    RAISE NOTICE '========================================';
END $$;

-- ----------------------------------------------------------------------------
-- Insert bookmark reasons for all tenants (both live and test environments)
-- Standard bookmark reasons for customer management
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
    RAISE NOTICE 'Bookmark Reasons seeded: % total (% per tenant x 2 environments x 3 tenants)',
        (SELECT COUNT(*) FROM m_bookmark_reasons),
        (SELECT COUNT(DISTINCT reason_code) FROM m_bookmark_reasons);
    RAISE NOTICE 'Active Bookmark Reasons: %',
        (SELECT COUNT(*) FROM m_bookmark_reasons WHERE is_active = true);
END $$;

-- ============================================================================
-- SECTION 5: VERIFICATION & SUMMARY
-- ============================================================================
DO $$
DECLARE
    v_txn_count INTEGER;
    v_tenant_count INTEGER;
    v_active_txn INTEGER;
    v_active_tenant INTEGER;
    v_bookmark_count INTEGER;
    v_active_bookmark INTEGER;
    v_unique_reasons INTEGER;
BEGIN
    SELECT COUNT(*), COUNT(*) FILTER (WHERE is_active = true)
    INTO v_txn_count, v_active_txn
    FROM m_transaction_types;

    SELECT COUNT(*), COUNT(*) FILTER (WHERE is_active = true)
    INTO v_tenant_count, v_active_tenant
    FROM t_tenants;

    SELECT COUNT(*), COUNT(*) FILTER (WHERE is_active = true), COUNT(DISTINCT reason_code)
    INTO v_bookmark_count, v_active_bookmark, v_unique_reasons
    FROM m_bookmark_reasons;

    RAISE NOTICE '========================================';
    RAISE NOTICE '     SEED DATA SUMMARY';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Transaction Types:';
    RAISE NOTICE '  - Total: %', v_txn_count;
    RAISE NOTICE '  - Active: %', v_active_txn;
    RAISE NOTICE '';
    RAISE NOTICE 'Tenants:';
    RAISE NOTICE '  - Total: %', v_tenant_count;
    RAISE NOTICE '  - Active: %', v_active_tenant;
    RAISE NOTICE '';
    RAISE NOTICE 'Bookmark Reasons:';
    RAISE NOTICE '  - Total: % (% unique reasons × % tenants × 2 environments)', v_bookmark_count, v_unique_reasons, v_tenant_count;
    RAISE NOTICE '  - Active: %', v_active_bookmark;
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Seed data loaded successfully!';
    RAISE NOTICE '========================================';
END $$;

-- ============================================================================
-- END OF FILE
-- ============================================================================