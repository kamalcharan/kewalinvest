-- ============================================================================
-- Migration: 004_scheme_aliases.sql
-- Purpose: Create global scheme alias mapping system for flexible transaction imports
-- Date: 2025-10-28
-- Description: Implements alias system to handle multiple scheme name variations.
--              Aliases are GLOBAL (shared across all tenants) for consistency.
-- ============================================================================

-- =====================================================
-- Table: t_scheme_aliases
-- Purpose: Store multiple name variations for each scheme
-- Scope: GLOBAL (no tenant_id - all tenants share aliases)
-- =====================================================

CREATE TABLE IF NOT EXISTS t_scheme_aliases (
  id SERIAL PRIMARY KEY,

  -- Reference to scheme in t_scheme_details
  scheme_id INTEGER NOT NULL REFERENCES t_scheme_details(id) ON DELETE CASCADE,

  -- Denormalized for faster lookups
  scheme_code VARCHAR(100),

  -- The alias name (variation of scheme name)
  alias_name VARCHAR(500) NOT NULL,

  -- Auto-normalized version for case-insensitive matching
  alias_name_normalized VARCHAR(500) NOT NULL,

  -- Source of this alias (for tracking)
  source VARCHAR(50) DEFAULT 'manual' CHECK (source IN ('auto', 'manual', 'import')),

  -- Metadata
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by INTEGER REFERENCES t_users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Global uniqueness: one alias can only map to ONE scheme
  CONSTRAINT unique_alias_global UNIQUE (alias_name_normalized)
);

-- =====================================================
-- Indexes for Performance
-- =====================================================

-- Primary lookup index for transaction imports (most critical)
CREATE INDEX idx_scheme_aliases_lookup
ON t_scheme_aliases(alias_name_normalized)
WHERE is_active = true;

-- Index for scheme-based queries (show all aliases for a scheme)
CREATE INDEX idx_scheme_aliases_scheme
ON t_scheme_aliases(scheme_id, is_active);

-- Index for admin queries (all active aliases)
CREATE INDEX idx_scheme_aliases_active
ON t_scheme_aliases(is_active, created_at DESC);

-- =====================================================
-- Trigger: Auto-update updated_at timestamp
-- =====================================================

CREATE OR REPLACE FUNCTION update_scheme_alias_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_scheme_alias_timestamp
BEFORE UPDATE ON t_scheme_aliases
FOR EACH ROW
EXECUTE FUNCTION update_scheme_alias_timestamp();

-- =====================================================
-- Trigger: Auto-normalize alias names
-- =====================================================

CREATE OR REPLACE FUNCTION normalize_alias_name()
RETURNS TRIGGER AS $$
BEGIN
  -- Normalize: uppercase, trim, collapse multiple spaces into single space
  NEW.alias_name_normalized = REGEXP_REPLACE(
    TRIM(UPPER(NEW.alias_name)),
    '\s+',
    ' ',
    'g'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_normalize_alias_name
BEFORE INSERT OR UPDATE ON t_scheme_aliases
FOR EACH ROW
EXECUTE FUNCTION normalize_alias_name();

-- =====================================================
-- Function: Fast lookup scheme by alias
-- Returns: scheme_id, scheme_code, scheme_name, matched_alias
-- =====================================================

CREATE OR REPLACE FUNCTION lookup_scheme_by_alias(
  p_alias_name VARCHAR
)
RETURNS TABLE(
  scheme_id INTEGER,
  scheme_code VARCHAR,
  scheme_name VARCHAR,
  matched_alias VARCHAR
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    sd.id::INTEGER,
    sd.scheme_code::VARCHAR,
    sd.scheme_name::VARCHAR,
    sa.alias_name::VARCHAR
  FROM t_scheme_aliases sa
  JOIN t_scheme_details sd ON sa.scheme_id = sd.id
  WHERE sa.is_active = true
    AND sd.is_active = true
    AND sa.alias_name_normalized = REGEXP_REPLACE(TRIM(UPPER(p_alias_name)), '\s+', ' ', 'g')
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- Seed Data: Auto-populate aliases from existing schemes
-- =====================================================

-- Insert scheme_name as primary alias for all active schemes
INSERT INTO t_scheme_aliases (
  scheme_id,
  scheme_code,
  alias_name,
  source,
  is_active
)
SELECT
  sd.id,
  sd.scheme_code,
  sd.scheme_name,
  'auto',
  true
FROM t_scheme_details sd
WHERE sd.is_active = true
  AND sd.scheme_name IS NOT NULL
  AND TRIM(sd.scheme_name) != ''
ON CONFLICT (alias_name_normalized) DO NOTHING;

-- Insert scheme_nav_name as additional alias (if different from scheme_name)
INSERT INTO t_scheme_aliases (
  scheme_id,
  scheme_code,
  alias_name,
  source,
  is_active
)
SELECT
  sd.id,
  sd.scheme_code,
  sd.scheme_nav_name,
  'auto',
  true
FROM t_scheme_details sd
WHERE sd.is_active = true
  AND sd.scheme_nav_name IS NOT NULL
  AND TRIM(sd.scheme_nav_name) != ''
  -- Only if different from scheme_name
  AND REGEXP_REPLACE(TRIM(UPPER(sd.scheme_nav_name)), '\s+', ' ', 'g') !=
      REGEXP_REPLACE(TRIM(UPPER(sd.scheme_name)), '\s+', ' ', 'g')
ON CONFLICT (alias_name_normalized) DO NOTHING;

-- =====================================================
-- Comments for Documentation
-- =====================================================

COMMENT ON TABLE t_scheme_aliases IS 'Global scheme alias mapping - stores multiple name variations for flexible transaction imports. Aliases are shared across all tenants.';
COMMENT ON COLUMN t_scheme_aliases.alias_name IS 'The actual alias variation (e.g., "ICICI Pru MNC Fund Reg (G)")';
COMMENT ON COLUMN t_scheme_aliases.alias_name_normalized IS 'Normalized version for matching: uppercase, trimmed, single spaces';
COMMENT ON COLUMN t_scheme_aliases.source IS 'How this alias was created: auto (seeded), manual (user added), import (from CSV)';
COMMENT ON FUNCTION lookup_scheme_by_alias IS 'Fast lookup to find scheme by alias name during transaction import';

-- =====================================================
-- Grant permissions (if needed)
-- =====================================================

-- Grant to application user (adjust username as needed)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON t_scheme_aliases TO kewalinvest_user;
-- GRANT USAGE, SELECT ON SEQUENCE t_scheme_aliases_id_seq TO kewalinvest_user;

-- =====================================================
-- Verification Query
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '✓ Migration 004_scheme_aliases.sql completed successfully';
  RAISE NOTICE '✓ Created table: t_scheme_aliases';
  RAISE NOTICE '✓ Created function: lookup_scheme_by_alias()';
  RAISE NOTICE '✓ Seeded aliases from existing schemes';
  RAISE NOTICE 'Total aliases created: %', (SELECT COUNT(*) FROM t_scheme_aliases);
END $$;
