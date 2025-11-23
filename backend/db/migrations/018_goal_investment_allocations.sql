-- ============================================================================
-- Migration: 018_goal_investment_allocations.sql
-- Description: Phase 2 - Replace goal-scheme allocations with goal-investment allocations
-- Purpose: Enable multi-asset goal tracking by linking goals to investment plans
-- Author: Release 1.1 - Phase 2
-- Date: 2025-11-23
-- ============================================================================

-- ============================================================================
-- SECTION 1: CREATE NEW TABLE - t_goal_investment_allocations
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Phase 2: Goal Investment Allocations';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Creating t_goal_investment_allocations table...';
END $$;

-- TABLE: t_goal_investment_allocations
-- Links goals (in t_jtbd_configurations) to investment plans (in t_customer_asset_assignments)
-- Replaces old t_goal_scheme_allocations which only linked to MF schemes
CREATE TABLE IF NOT EXISTS t_goal_investment_allocations (
    id SERIAL PRIMARY KEY,

    -- Multi-tenancy
    tenant_id INTEGER NOT NULL REFERENCES t_tenants(id),
    is_live BOOLEAN NOT NULL DEFAULT true,

    -- Goal reference (stored in t_jtbd_configurations)
    goal_id INTEGER NOT NULL REFERENCES t_jtbd_configurations(id) ON DELETE CASCADE,

    -- Investment Plan reference (from Phase 1 - t_customer_asset_assignments)
    investment_plan_id INTEGER NOT NULL REFERENCES t_customer_asset_assignments(id) ON DELETE CASCADE,

    -- Allocation details
    allocated_percentage DECIMAL(5,2) CHECK (allocated_percentage >= 0 AND allocated_percentage <= 100),
    allocated_amount DECIMAL(15,2),

    -- Notes
    notes TEXT,

    -- Audit fields
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES t_users(id),

    -- Constraints
    CONSTRAINT unique_goal_investment_allocation UNIQUE (goal_id, investment_plan_id)
);

COMMENT ON TABLE t_goal_investment_allocations IS 'Phase 2: Links goals to investment plans (multi-asset support). Replaces scheme-only allocations.';
COMMENT ON COLUMN t_goal_investment_allocations.goal_id IS 'Reference to goal in t_jtbd_configurations (where jtbd_category = ''transactional'')';
COMMENT ON COLUMN t_goal_investment_allocations.investment_plan_id IS 'Reference to investment plan in t_customer_asset_assignments (Phase 1)';
COMMENT ON COLUMN t_goal_investment_allocations.allocated_percentage IS 'Percentage of this investment allocated to goal (0-100%). Allows partial allocations.';
COMMENT ON COLUMN t_goal_investment_allocations.allocated_amount IS 'Fixed amount allocated (alternative to percentage). Usually NULL if percentage is used.';

-- ============================================================================
-- SECTION 2: CREATE INDEXES
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE 'Creating indexes for t_goal_investment_allocations...';
END $$;

-- Index for finding all allocations for a specific goal
CREATE INDEX IF NOT EXISTS idx_goal_investments_goal
    ON t_goal_investment_allocations(goal_id);

-- Index for finding all goals linked to a specific investment plan
CREATE INDEX IF NOT EXISTS idx_goal_investments_plan
    ON t_goal_investment_allocations(investment_plan_id);

-- Index for tenant isolation and environment filtering
CREATE INDEX IF NOT EXISTS idx_goal_investments_tenant
    ON t_goal_investment_allocations(tenant_id, is_live);

-- Composite index for quick lookups
CREATE INDEX IF NOT EXISTS idx_goal_investments_composite
    ON t_goal_investment_allocations(tenant_id, is_live, goal_id);

-- ============================================================================
-- SECTION 3: CREATE TRIGGER FOR updated_at
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE 'Creating trigger for automatic updated_at timestamp...';
END $$;

CREATE TRIGGER trigger_update_goal_investments_updated_at
    BEFORE UPDATE ON t_goal_investment_allocations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- SECTION 4: DATA MIGRATION (Optional - if old data exists)
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Data Migration Section';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Checking for data in t_goal_scheme_allocations...';
END $$;

-- Note: We cannot automatically migrate from scheme allocations to investment allocations
-- because schemes and investment plans are different entities.
-- This would require manual data mapping or customer re-configuration.
-- For now, we'll just log the count of existing allocations.

DO $$
DECLARE
    v_old_allocations_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_old_allocations_count
    FROM t_goal_scheme_allocations;

    RAISE NOTICE 'Found % existing goal-scheme allocations', v_old_allocations_count;

    IF v_old_allocations_count > 0 THEN
        RAISE WARNING 'Old goal-scheme allocations exist but cannot be auto-migrated.';
        RAISE WARNING 'Users will need to re-configure goal allocations with investment plans.';
        RAISE WARNING 'Consider archiving this data before dropping the table.';
    END IF;
END $$;

-- ============================================================================
-- SECTION 5: DROP OLD TABLE (COMMENTED OUT - Uncomment after verification)
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Old Table Cleanup (DEFERRED)';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'NOT dropping t_goal_scheme_allocations yet.';
    RAISE NOTICE 'Verify new system works first, then run:';
    RAISE NOTICE '  DROP TABLE IF EXISTS t_goal_scheme_allocations CASCADE;';
END $$;

-- Uncomment this after verifying Phase 2 works correctly:
-- DROP TABLE IF EXISTS t_goal_scheme_allocations CASCADE;

-- ============================================================================
-- SECTION 6: VERIFICATION
-- ============================================================================
DO $$
DECLARE
    v_new_table_exists BOOLEAN;
    v_index_count INTEGER;
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Verification';
    RAISE NOTICE '========================================';

    -- Check table exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 't_goal_investment_allocations'
    ) INTO v_new_table_exists;

    IF v_new_table_exists THEN
        RAISE NOTICE '✓ Table t_goal_investment_allocations created successfully';
    ELSE
        RAISE EXCEPTION '✗ Failed to create t_goal_investment_allocations';
    END IF;

    -- Check indexes
    SELECT COUNT(*) INTO v_index_count
    FROM pg_indexes
    WHERE tablename = 't_goal_investment_allocations';

    RAISE NOTICE '✓ Created % indexes', v_index_count;

    -- Check trigger
    IF EXISTS (
        SELECT 1 FROM information_schema.triggers
        WHERE trigger_name = 'trigger_update_goal_investments_updated_at'
    ) THEN
        RAISE NOTICE '✓ Trigger created successfully';
    END IF;

END $$;

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Migration 018 Completed Successfully!';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Next Steps:';
    RAISE NOTICE '1. Update backend services (goalTracking, goalCalculation)';
    RAISE NOTICE '2. Update frontend components (GoalForm, GoalCard)';
    RAISE NOTICE '3. Test goal allocation with investment plans';
    RAISE NOTICE '4. After verification, drop t_goal_scheme_allocations';
    RAISE NOTICE '========================================';
END $$;
