-- ============================================================================
-- File: 05_seed_data.sql
-- Description: Seed data for transaction types and initial tenants
-- Purpose: Master data and test tenants
-- Execution: Run FIFTH (last) after 04_functions_views_policies.sql
-- Author: System
-- Date: 2025-01-08
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
-- SECTION 4: VERIFICATION & SUMMARY
-- ============================================================================
DO $$ 
DECLARE
    v_txn_count INTEGER;
    v_tenant_count INTEGER;
    v_active_txn INTEGER;
    v_active_tenant INTEGER;
BEGIN
    SELECT COUNT(*), COUNT(*) FILTER (WHERE is_active = true)
    INTO v_txn_count, v_active_txn
    FROM m_transaction_types;
    
    SELECT COUNT(*), COUNT(*) FILTER (WHERE is_active = true)
    INTO v_tenant_count, v_active_tenant
    FROM t_tenants;
    
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
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Seed data loaded successfully!';
    RAISE NOTICE '========================================';
END $$;

-- ============================================================================
-- END OF FILE
-- ============================================================================