-- Migration: 020_multi_asset_snapshots.sql
-- Description: Extend t_monthly_portfolio_snapshots for multi-asset type support
-- Date: 2024-11-25
-- Author: System
--
-- This migration adds support for tracking snapshots of all asset types (not just MF)
-- Enables NetworthViewer functionality with consumed/projected time analysis

-- ============================================================================
-- STEP 1: Add new columns to t_monthly_portfolio_snapshots
-- ============================================================================

-- Asset type code (MF, RE, GOLD, FD, etc.)
-- Default 'MF' ensures existing records are properly tagged
ALTER TABLE t_monthly_portfolio_snapshots
ADD COLUMN IF NOT EXISTS asset_type_code VARCHAR(50) DEFAULT 'MF';

-- Reference to specific investment plan (for non-MF assets)
-- NULL for MF aggregated snapshots, populated for individual asset plans
ALTER TABLE t_monthly_portfolio_snapshots
ADD COLUMN IF NOT EXISTS investment_plan_id INTEGER;

-- How the current_value was calculated
-- 'NAV' = NAV × Units (for MF)
-- 'ASSUMPTION' = Principal × (1 + rate)^time (for RE, Gold, FD, etc.)
ALTER TABLE t_monthly_portfolio_snapshots
ADD COLUMN IF NOT EXISTS calculation_method VARCHAR(20) DEFAULT 'NAV';

-- The growth rate used for assumption-based calculations
-- Stored for audit trail and recalculation purposes
ALTER TABLE t_monthly_portfolio_snapshots
ADD COLUMN IF NOT EXISTS growth_rate_applied NUMERIC(5,2);

-- User-entered actual amount (override for assumption-based value)
-- When populated, this takes precedence over calculated current_value
-- Use case: Customer gets property valued, enters actual market value
ALTER TABLE t_monthly_portfolio_snapshots
ADD COLUMN IF NOT EXISTS actual_amount NUMERIC(18,2);

-- ============================================================================
-- STEP 2: Update existing records to have proper values
-- ============================================================================

-- Tag all existing records as MF with NAV calculation method
UPDATE t_monthly_portfolio_snapshots
SET
    asset_type_code = 'MF',
    calculation_method = 'NAV'
WHERE asset_type_code IS NULL OR asset_type_code = '';

-- ============================================================================
-- STEP 3: Make MF-specific columns nullable (for non-MF assets)
-- ============================================================================

-- total_units only applies to MF (units of mutual fund)
-- For RE, Gold, FD - this will be NULL
ALTER TABLE t_monthly_portfolio_snapshots
ALTER COLUMN total_units DROP NOT NULL;

-- total_schemes only applies to MF (count of different MF schemes)
-- For non-MF, this will be NULL or 0
ALTER TABLE t_monthly_portfolio_snapshots
ALTER COLUMN total_schemes DROP NOT NULL;

-- ============================================================================
-- STEP 4: Add foreign key constraint for investment_plan_id
-- ============================================================================

-- Add FK to t_customer_asset_assignments (investment plans)
-- This links non-MF snapshots to their source investment plan
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_snapshot_investment_plan'
        AND table_name = 't_monthly_portfolio_snapshots'
    ) THEN
        ALTER TABLE t_monthly_portfolio_snapshots
        ADD CONSTRAINT fk_snapshot_investment_plan
        FOREIGN KEY (investment_plan_id)
        REFERENCES t_customer_asset_assignments(id)
        ON DELETE SET NULL;
    END IF;
END $$;

-- ============================================================================
-- STEP 5: Create unique index for multi-asset support
-- ============================================================================

-- Create unique index to enforce one snapshot per customer/month/asset_type/plan
-- This allows MULTIPLE snapshots per customer per month (one per asset type/plan)
--
-- For MF: (tenant, is_live, customer, month_end, 'MF', NULL) - aggregated MF
-- For RE: (tenant, is_live, customer, month_end, 'RE', plan_id) - per plan
-- For Gold: (tenant, is_live, customer, month_end, 'GOLD', plan_id) - per plan
--
-- Using COALESCE to handle NULL investment_plan_id in unique constraint
-- (PostgreSQL treats NULL != NULL, so we convert NULL to 0 for uniqueness check)
DROP INDEX IF EXISTS idx_monthly_portfolio_snapshots_unique;
CREATE UNIQUE INDEX idx_monthly_portfolio_snapshots_unique
ON t_monthly_portfolio_snapshots (
    tenant_id,
    is_live,
    customer_id,
    snapshot_month_end,
    asset_type_code,
    COALESCE(investment_plan_id, 0)  -- Treat NULL as 0 for uniqueness
);

-- ============================================================================
-- STEP 6: Add performance indexes
-- ============================================================================

-- Index for querying by asset type
DROP INDEX IF EXISTS idx_snapshots_asset_type;
CREATE INDEX idx_snapshots_asset_type
ON t_monthly_portfolio_snapshots (tenant_id, is_live, customer_id, asset_type_code);

-- Index for querying by investment plan
DROP INDEX IF EXISTS idx_snapshots_investment_plan;
CREATE INDEX idx_snapshots_investment_plan
ON t_monthly_portfolio_snapshots (investment_plan_id)
WHERE investment_plan_id IS NOT NULL;

-- Index for networth calculations (all assets for a customer)
DROP INDEX IF EXISTS idx_snapshots_networth;
CREATE INDEX idx_snapshots_networth
ON t_monthly_portfolio_snapshots (tenant_id, is_live, customer_id, snapshot_month_end);

-- ============================================================================
-- STEP 7: Add comments for documentation
-- ============================================================================

COMMENT ON COLUMN t_monthly_portfolio_snapshots.asset_type_code IS
'Asset type code (MF, RE, GOLD, FD, etc.). Default MF for backward compatibility.';

COMMENT ON COLUMN t_monthly_portfolio_snapshots.investment_plan_id IS
'Reference to t_customer_asset_assignments. NULL for MF aggregated snapshots, populated for individual asset plans.';

COMMENT ON COLUMN t_monthly_portfolio_snapshots.calculation_method IS
'How current_value was calculated: NAV (units × nav_value) or ASSUMPTION (principal × growth_rate).';

COMMENT ON COLUMN t_monthly_portfolio_snapshots.growth_rate_applied IS
'Annual growth rate used for assumption-based calculations (e.g., 8.00 for 8%).';

COMMENT ON COLUMN t_monthly_portfolio_snapshots.actual_amount IS
'User-entered actual market value. When set, overrides calculated current_value for display.';

-- ============================================================================
-- STEP 8: Add check constraint for calculation_method
-- ============================================================================

ALTER TABLE t_monthly_portfolio_snapshots
DROP CONSTRAINT IF EXISTS chk_calculation_method;

ALTER TABLE t_monthly_portfolio_snapshots
ADD CONSTRAINT chk_calculation_method
CHECK (calculation_method IN ('NAV', 'ASSUMPTION'));

-- ============================================================================
-- VERIFICATION QUERIES (run manually to verify migration)
-- ============================================================================

-- Check new columns exist:
-- SELECT column_name, data_type, column_default
-- FROM information_schema.columns
-- WHERE table_name = 't_monthly_portfolio_snapshots'
-- ORDER BY ordinal_position;

-- Check existing records are tagged:
-- SELECT asset_type_code, calculation_method, COUNT(*)
-- FROM t_monthly_portfolio_snapshots
-- GROUP BY asset_type_code, calculation_method;

-- Check unique index:
-- SELECT indexname, indexdef
-- FROM pg_indexes
-- WHERE tablename = 't_monthly_portfolio_snapshots';

-- ============================================================================
-- ROLLBACK SCRIPT (if needed)
-- ============================================================================
--
-- -- Remove new indexes
-- DROP INDEX IF EXISTS idx_monthly_portfolio_snapshots_unique;
-- DROP INDEX IF EXISTS idx_snapshots_asset_type;
-- DROP INDEX IF EXISTS idx_snapshots_investment_plan;
-- DROP INDEX IF EXISTS idx_snapshots_networth;
--
-- -- Remove constraints
-- ALTER TABLE t_monthly_portfolio_snapshots DROP CONSTRAINT IF EXISTS chk_calculation_method;
-- ALTER TABLE t_monthly_portfolio_snapshots DROP CONSTRAINT IF EXISTS fk_snapshot_investment_plan;
--
-- -- Remove new columns
-- ALTER TABLE t_monthly_portfolio_snapshots DROP COLUMN IF EXISTS actual_amount;
-- ALTER TABLE t_monthly_portfolio_snapshots DROP COLUMN IF EXISTS growth_rate_applied;
-- ALTER TABLE t_monthly_portfolio_snapshots DROP COLUMN IF EXISTS calculation_method;
-- ALTER TABLE t_monthly_portfolio_snapshots DROP COLUMN IF EXISTS investment_plan_id;
-- ALTER TABLE t_monthly_portfolio_snapshots DROP COLUMN IF EXISTS asset_type_code;
