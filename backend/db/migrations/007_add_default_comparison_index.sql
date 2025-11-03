-- Migration: Add default_comparison_index_id column to t_tenants table
-- Date: 2025-11-03
-- Description: Adds a column to store tenant's preferred default index for portfolio comparison charts

-- Add column to t_tenants table
ALTER TABLE t_tenants
ADD COLUMN IF NOT EXISTS default_comparison_index_id INTEGER;

-- Add foreign key constraint to t_market_indices
ALTER TABLE t_tenants
ADD CONSTRAINT fk_default_comparison_index
FOREIGN KEY (default_comparison_index_id)
REFERENCES t_market_indices(id)
ON DELETE SET NULL;

-- Add comment
COMMENT ON COLUMN t_tenants.default_comparison_index_id IS 'Tenant preference for default market index to compare against portfolio performance charts';

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_tenants_default_comparison_index
ON t_tenants(default_comparison_index_id)
WHERE default_comparison_index_id IS NOT NULL;
