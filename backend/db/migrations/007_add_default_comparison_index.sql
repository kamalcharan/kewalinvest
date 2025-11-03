-- Migration: Add default_comparison_index_id column to t_users table
-- Date: 2025-11-03
-- Description: Adds a column to store user's preferred default index for portfolio comparison charts

-- Add column to t_users table
ALTER TABLE t_users
ADD COLUMN IF NOT EXISTS default_comparison_index_id INTEGER;

-- Add foreign key constraint to m_market_indices
ALTER TABLE t_users
ADD CONSTRAINT fk_default_comparison_index
FOREIGN KEY (default_comparison_index_id)
REFERENCES m_market_indices(id)
ON DELETE SET NULL;

-- Add comment
COMMENT ON COLUMN t_users.default_comparison_index_id IS 'User preference for default market index to compare against portfolio performance charts';

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_default_comparison_index
ON t_users(default_comparison_index_id)
WHERE default_comparison_index_id IS NOT NULL;
