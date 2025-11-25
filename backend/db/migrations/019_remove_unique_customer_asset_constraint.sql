-- ============================================================================
-- Migration: 019_remove_unique_customer_asset_constraint.sql
-- Description: Remove unique constraint on t_customer_asset_assignments to allow
--              multiple investments of the same asset type per customer.
--              Validation for duplicate names handled in application layer.
-- Date: 2025-11-25
-- ============================================================================

-- Drop the existing unique constraint
ALTER TABLE t_customer_asset_assignments
DROP CONSTRAINT IF EXISTS unique_customer_asset;

-- Add comment explaining the change
COMMENT ON TABLE t_customer_asset_assignments IS 'Tracks customer investment plans. Multiple investments of same asset type allowed. Duplicate name validation handled in application.';

-- Log the migration
DO $$
BEGIN
    RAISE NOTICE 'Migration 019: Removed unique_customer_asset constraint to allow multiple same asset types per customer';
END $$;
