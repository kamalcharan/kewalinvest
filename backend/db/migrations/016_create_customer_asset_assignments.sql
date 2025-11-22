-- Migration: Create Customer Asset Assignments Table
-- Description: Create table to assign asset types to customers
-- Date: 2025-11-22
-- Related Feature: Release 1.1 - Phase 1 - Multi-Asset Portfolio Support
-- Author: System

-- ============================================================================
-- CREATE CUSTOMER ASSET ASSIGNMENTS TABLE
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Migration 016: Creating Customer Asset Assignments Table';
    RAISE NOTICE '========================================';
END $$;

-- ----------------------------------------------------------------------------
-- TABLE: t_customer_asset_assignments
-- Description: Tracks which asset types are assigned to each customer
-- Note: Tenant-isolated table
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS t_customer_asset_assignments (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES t_tenants(id),
    is_live BOOLEAN NOT NULL DEFAULT true,
    customer_id INTEGER NOT NULL REFERENCES t_customers(id) ON DELETE CASCADE,
    asset_type_id INTEGER NOT NULL REFERENCES m_asset_types(id),
    is_active BOOLEAN DEFAULT true,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    assigned_by INTEGER REFERENCES t_users(id),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Constraints
    CONSTRAINT unique_customer_asset UNIQUE(tenant_id, is_live, customer_id, asset_type_id)
);

COMMENT ON TABLE t_customer_asset_assignments IS 'Tracks asset type assignments for each customer - tenant isolated';
COMMENT ON COLUMN t_customer_asset_assignments.customer_id IS 'Reference to customer in t_customers';
COMMENT ON COLUMN t_customer_asset_assignments.asset_type_id IS 'Reference to asset type in m_asset_types (master data)';
COMMENT ON COLUMN t_customer_asset_assignments.is_active IS 'Whether this assignment is currently active';
COMMENT ON COLUMN t_customer_asset_assignments.assigned_by IS 'User who made the assignment';
COMMENT ON COLUMN t_customer_asset_assignments.notes IS 'Optional notes about why this asset was assigned';

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Index for customer lookup
CREATE INDEX IF NOT EXISTS idx_customer_assets_customer
ON t_customer_asset_assignments(customer_id, is_active)
WHERE is_active = true;

-- Index for tenant-based queries
CREATE INDEX IF NOT EXISTS idx_customer_assets_tenant
ON t_customer_asset_assignments(tenant_id, is_live, customer_id);

-- Index for asset type lookup (to find all customers with a specific asset type)
CREATE INDEX IF NOT EXISTS idx_customer_assets_asset_type
ON t_customer_asset_assignments(asset_type_id, is_active)
WHERE is_active = true;

-- Index for assigned_by (audit trail)
CREATE INDEX IF NOT EXISTS idx_customer_assets_assigned_by
ON t_customer_asset_assignments(assigned_by, assigned_at DESC);

COMMENT ON INDEX idx_customer_assets_customer IS 'Fast lookup of active asset assignments for a customer';
COMMENT ON INDEX idx_customer_assets_tenant IS 'Tenant-isolated queries for asset assignments';
COMMENT ON INDEX idx_customer_assets_asset_type IS 'Find all customers assigned to a specific asset type';
COMMENT ON INDEX idx_customer_assets_assigned_by IS 'Audit trail for who assigned which assets';

-- ============================================================================
-- TRIGGER: Auto-update updated_at timestamp
-- ============================================================================

CREATE OR REPLACE FUNCTION update_customer_assets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_customer_assets_updated_at
    BEFORE UPDATE ON t_customer_asset_assignments
    FOR EACH ROW
    EXECUTE FUNCTION update_customer_assets_updated_at();

-- ============================================================================
-- HELPER FUNCTION: Get Customer's Asset Types
-- ============================================================================

CREATE OR REPLACE FUNCTION get_customer_asset_types(p_customer_id INTEGER)
RETURNS TABLE (
    asset_type_code VARCHAR(50),
    asset_type_name VARCHAR(100),
    category VARCHAR(50),
    default_assumption_rate DECIMAL(5,2),
    assigned_at TIMESTAMP
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        at.asset_type_code,
        at.asset_type_name,
        at.category,
        at.default_assumption_rate,
        caa.assigned_at
    FROM t_customer_asset_assignments caa
    JOIN m_asset_types at ON caa.asset_type_id = at.id
    WHERE caa.customer_id = p_customer_id
    AND caa.is_active = true
    AND at.is_active = true
    ORDER BY at.display_order;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_customer_asset_types(INTEGER) IS 'Get all active asset types assigned to a customer';

-- ============================================================================
-- HELPER FUNCTION: Get Family Asset Types (Aggregated)
-- ============================================================================

CREATE OR REPLACE FUNCTION get_family_asset_types(p_family_head_iwell_code VARCHAR(100))
RETURNS TABLE (
    asset_type_code VARCHAR(50),
    asset_type_name VARCHAR(100),
    category VARCHAR(50),
    family_member_count INTEGER,
    member_names TEXT[]
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        at.asset_type_code,
        at.asset_type_name,
        at.category,
        COUNT(DISTINCT caa.customer_id)::INTEGER as family_member_count,
        ARRAY_AGG(DISTINCT c.name) as member_names
    FROM t_customer_asset_assignments caa
    JOIN t_customers cust ON caa.customer_id = cust.id
    JOIN t_contacts c ON cust.contact_id = c.id
    JOIN m_asset_types at ON caa.asset_type_id = at.id
    WHERE cust.family_head_iwell_code = p_family_head_iwell_code
    AND caa.is_active = true
    AND at.is_active = true
    GROUP BY at.asset_type_code, at.asset_type_name, at.category, at.display_order
    ORDER BY at.display_order;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_family_asset_types(VARCHAR) IS 'Get aggregated asset types across all family members';

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
DECLARE
    v_index_count INTEGER;
BEGIN
    -- Verify table exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 't_customer_asset_assignments') THEN
        RAISE EXCEPTION 'Migration failed: t_customer_asset_assignments table not created';
    END IF;

    -- Verify foreign key constraints
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_name = 't_customer_asset_assignments'
        AND constraint_type = 'FOREIGN KEY'
    ) THEN
        RAISE WARNING 'Foreign key constraints may not be properly created';
    END IF;

    -- Verify unique constraint
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_name = 't_customer_asset_assignments'
        AND constraint_name = 'unique_customer_asset'
    ) THEN
        RAISE WARNING 'Unique constraint not found';
    END IF;

    -- Count indexes
    SELECT COUNT(*) INTO v_index_count
    FROM pg_indexes
    WHERE tablename = 't_customer_asset_assignments';

    RAISE NOTICE '✓ Migration 016 completed successfully';
    RAISE NOTICE '  - t_customer_asset_assignments table created';
    RAISE NOTICE '  - % indexes created', v_index_count;
    RAISE NOTICE '  - Triggers created for updated_at';
    RAISE NOTICE '  - Helper functions created:';
    RAISE NOTICE '    • get_customer_asset_types(customer_id)';
    RAISE NOTICE '    • get_family_asset_types(family_head_iwell_code)';
    RAISE NOTICE '========================================';
END $$;
