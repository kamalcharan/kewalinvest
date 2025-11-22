-- Migration: Create Asset Types Master Table
-- Description: Create global asset types master data table with seed data
-- Date: 2025-11-22
-- Related Feature: Release 1.1 - Phase 1 - Multi-Asset Portfolio Support
-- Author: System

-- ============================================================================
-- CREATE ASSET TYPES MASTER TABLE
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Migration 015: Creating Asset Types Master Table';
    RAISE NOTICE '========================================';
END $$;

-- ----------------------------------------------------------------------------
-- TABLE: m_asset_types
-- Description: Global master data for all supported asset types
-- Note: This is NOT tenant-isolated (master data shared across all tenants)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS m_asset_types (
    id SERIAL PRIMARY KEY,
    asset_type_code VARCHAR(50) NOT NULL UNIQUE,
    asset_type_name VARCHAR(100) NOT NULL,
    category VARCHAR(50), -- equity, debt, commodity, real_estate, fixed_income
    default_assumption_rate DECIMAL(5,2), -- Default expected growth rate (e.g., 8.00 for 8% per year)
    is_active BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE m_asset_types IS 'Master data table for all supported asset types - global across all tenants';
COMMENT ON COLUMN m_asset_types.asset_type_code IS 'Unique code identifier (e.g., MF, GOLD, EQUITY, FD)';
COMMENT ON COLUMN m_asset_types.asset_type_name IS 'Display name for the asset type';
COMMENT ON COLUMN m_asset_types.category IS 'Asset category: equity, debt, commodity, real_estate, fixed_income';
COMMENT ON COLUMN m_asset_types.default_assumption_rate IS 'Default expected annual growth rate percentage (e.g., 8.00 for 8%)';
COMMENT ON COLUMN m_asset_types.display_order IS 'Display order in UI (lower numbers first)';

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_asset_types_code
ON m_asset_types(asset_type_code);

CREATE INDEX IF NOT EXISTS idx_asset_types_active
ON m_asset_types(is_active, display_order)
WHERE is_active = true;

COMMENT ON INDEX idx_asset_types_code IS 'Fast lookup by asset type code';
COMMENT ON INDEX idx_asset_types_active IS 'Fast lookup of active asset types ordered for display';

-- ============================================================================
-- SEED DATA: Initial Asset Types
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE 'Inserting seed data for asset types...';
END $$;

INSERT INTO m_asset_types (
    asset_type_code,
    asset_type_name,
    category,
    default_assumption_rate,
    is_active,
    display_order,
    description
) VALUES
    (
        'MF',
        'Mutual Fund',
        'equity/debt',
        12.00,
        true,
        1,
        'Equity and debt mutual funds managed by professional fund managers'
    ),
    (
        'GOLD',
        'Gold',
        'commodity',
        8.00,
        true,
        2,
        'Physical gold, gold ETFs, sovereign gold bonds'
    ),
    (
        'SILVER',
        'Silver',
        'commodity',
        8.00,
        true,
        3,
        'Physical silver, silver ETFs'
    ),
    (
        'EQUITY',
        'Equity/Stocks',
        'equity',
        15.00,
        true,
        4,
        'Direct equity holdings in stocks and shares'
    ),
    (
        'FD',
        'Fixed Deposit',
        'fixed_income',
        7.00,
        true,
        5,
        'Bank fixed deposits with guaranteed returns'
    ),
    (
        'PPF',
        'Public Provident Fund',
        'fixed_income',
        7.10,
        true,
        6,
        'Government-backed long-term savings scheme with tax benefits'
    ),
    (
        'NSC',
        'National Savings Certificate',
        'fixed_income',
        7.70,
        true,
        7,
        'Government-backed fixed income savings certificate'
    ),
    (
        'RE',
        'Real Estate',
        'real_estate',
        10.00,
        true,
        8,
        'Residential and commercial property investments'
    ),
    (
        'BONDS',
        'Bonds',
        'debt',
        8.50,
        true,
        9,
        'Corporate bonds, government bonds, and debentures'
    )
ON CONFLICT (asset_type_code) DO NOTHING;

-- ============================================================================
-- TRIGGER: Auto-update updated_at timestamp
-- ============================================================================

CREATE OR REPLACE FUNCTION update_asset_types_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_asset_types_updated_at
    BEFORE UPDATE ON m_asset_types
    FOR EACH ROW
    EXECUTE FUNCTION update_asset_types_updated_at();

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
DECLARE
    v_count INTEGER;
BEGIN
    -- Verify table exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'm_asset_types') THEN
        RAISE EXCEPTION 'Migration failed: m_asset_types table not created';
    END IF;

    -- Verify seed data
    SELECT COUNT(*) INTO v_count FROM m_asset_types WHERE is_active = true;

    IF v_count < 9 THEN
        RAISE WARNING 'Expected 9 active asset types, found %', v_count;
    END IF;

    RAISE NOTICE '✓ Migration 015 completed successfully';
    RAISE NOTICE '  - m_asset_types table created';
    RAISE NOTICE '  - % active asset types loaded', v_count;
    RAISE NOTICE '  - Indexes created';
    RAISE NOTICE '  - Trigger created for updated_at';
    RAISE NOTICE '========================================';
END $$;
