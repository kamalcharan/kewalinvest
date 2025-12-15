-- Migration: Customer Aliases
-- Description: Create tables for customer alias feature (virtual grouping of duplicate profiles)
-- Date: 2025-12-12
-- ============================================================================
-- t_customer_aliases: Stores alias definitions
-- ============================================================================
CREATE TABLE IF NOT EXISTS t_customer_aliases (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES t_tenants(id),
    alias_name VARCHAR(255) NOT NULL,
    description TEXT,
    created_by INTEGER NOT NULL REFERENCES t_users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    -- Ensure unique alias names per tenant
    CONSTRAINT uq_alias_name_tenant UNIQUE (tenant_id, alias_name)
);
-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_customer_aliases_tenant ON t_customer_aliases(tenant_id);
CREATE INDEX IF NOT EXISTS idx_customer_aliases_created_by ON t_customer_aliases(created_by);
-- ============================================================================
-- t_customer_alias_members: Links customers to aliases
-- ============================================================================
CREATE TABLE IF NOT EXISTS t_customer_alias_members (
    id SERIAL PRIMARY KEY,
    alias_id INTEGER NOT NULL REFERENCES t_customer_aliases(id) ON DELETE CASCADE,
    customer_id INTEGER NOT NULL REFERENCES t_customers(id) ON DELETE CASCADE,
    is_primary BOOLEAN DEFAULT false,
    added_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    added_by INTEGER NOT NULL REFERENCES t_users(id),
    -- Each customer can only be in one alias (prevent double-counting)
    CONSTRAINT uq_customer_alias UNIQUE (customer_id),
    -- Each alias can only have one primary customer
    CONSTRAINT uq_alias_primary EXCLUDE (alias_id WITH =) WHERE (is_primary = true)
);
-- Indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_alias_members_alias ON t_customer_alias_members(alias_id);
CREATE INDEX IF NOT EXISTS idx_alias_members_customer ON t_customer_alias_members(customer_id);
-- ============================================================================
-- Trigger to update updated_at timestamp
-- ============================================================================
CREATE OR REPLACE FUNCTION update_alias_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trigger_update_alias_timestamp ON t_customer_aliases;
CREATE TRIGGER trigger_update_alias_timestamp
    BEFORE UPDATE ON t_customer_aliases
    FOR EACH ROW
    EXECUTE FUNCTION update_alias_updated_at();
-- ============================================================================
-- Comments for documentation
-- ============================================================================
COMMENT ON TABLE t_customer_aliases IS 'Stores alias definitions for virtually grouping duplicate customer profiles';
COMMENT ON TABLE t_customer_alias_members IS 'Links customers to their alias group';
COMMENT ON COLUMN t_customer_alias_members.is_primary IS 'Identifies the primary customer record in the alias for display purposes';
COMMENT ON CONSTRAINT uq_customer_alias ON t_customer_alias_members IS 'Each customer can only belong to one alias to prevent double-counting in aggregations';
