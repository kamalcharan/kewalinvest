-- Migration 017: Add Investment Plan Fields to Customer Asset Assignments
-- Release 1.1 - Phase 1: Complete Investment Plan Tracking
-- This migration adds all required fields for tracking detailed investment plans

-- Add new columns for investment plan details
ALTER TABLE t_customer_asset_assignments
ADD COLUMN IF NOT EXISTS principal_amount DECIMAL(15,2),
ADD COLUMN IF NOT EXISTS start_date DATE,
ADD COLUMN IF NOT EXISTS has_started BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS duration_months INTEGER,
ADD COLUMN IF NOT EXISTS duration_years INTEGER,
ADD COLUMN IF NOT EXISTS investment_type VARCHAR(20),
ADD COLUMN IF NOT EXISTS recurring_amount DECIMAL(15,2),
ADD COLUMN IF NOT EXISTS investment_frequency VARCHAR(20),
ADD COLUMN IF NOT EXISTS custom_assumption_rate DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS scheme_code VARCHAR(50);

-- Add check constraints for data integrity
ALTER TABLE t_customer_asset_assignments
ADD CONSTRAINT chk_investment_type
CHECK (investment_type IN ('one_time', 'sip', 'recurring'));

ALTER TABLE t_customer_asset_assignments
ADD CONSTRAINT chk_investment_frequency
CHECK (investment_frequency IS NULL OR investment_frequency IN ('monthly', 'quarterly', 'yearly'));

ALTER TABLE t_customer_asset_assignments
ADD CONSTRAINT chk_duration
CHECK (
  (duration_months IS NOT NULL AND duration_years IS NULL) OR
  (duration_months IS NULL AND duration_years IS NOT NULL) OR
  (duration_months IS NULL AND duration_years IS NULL)
);

-- Add comment explaining the table structure
COMMENT ON TABLE t_customer_asset_assignments IS 'Tracks customer investment plans with detailed information including principal, duration, investment type, and growth assumptions';

-- Add column comments for clarity
COMMENT ON COLUMN t_customer_asset_assignments.principal_amount IS 'Initial investment amount or current principal value';
COMMENT ON COLUMN t_customer_asset_assignments.start_date IS 'Date when the investment starts or started';
COMMENT ON COLUMN t_customer_asset_assignments.has_started IS 'Whether the investment has actually started (vs planned)';
COMMENT ON COLUMN t_customer_asset_assignments.duration_months IS 'Investment duration in months (use either months or years, not both)';
COMMENT ON COLUMN t_customer_asset_assignments.duration_years IS 'Investment duration in years (use either months or years, not both)';
COMMENT ON COLUMN t_customer_asset_assignments.investment_type IS 'Type of investment: one_time, sip, or recurring';
COMMENT ON COLUMN t_customer_asset_assignments.recurring_amount IS 'For SIP/recurring: amount invested per period';
COMMENT ON COLUMN t_customer_asset_assignments.investment_frequency IS 'For SIP/recurring: monthly, quarterly, or yearly';
COMMENT ON COLUMN t_customer_asset_assignments.custom_assumption_rate IS 'Custom growth rate percentage (overrides asset type default)';
COMMENT ON COLUMN t_customer_asset_assignments.scheme_code IS 'For MF: scheme code from bookmarked funds';

-- Create index on scheme_code for MF lookups
CREATE INDEX IF NOT EXISTS idx_customer_assets_scheme_code
ON t_customer_asset_assignments(scheme_code)
WHERE scheme_code IS NOT NULL;

-- Create index on investment_type for filtering
CREATE INDEX IF NOT EXISTS idx_customer_assets_investment_type
ON t_customer_asset_assignments(investment_type);

-- Create index on has_started for active investment queries
CREATE INDEX IF NOT EXISTS idx_customer_assets_has_started
ON t_customer_asset_assignments(has_started)
WHERE is_active = true;
