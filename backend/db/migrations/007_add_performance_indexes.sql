-- ============================================================================
-- Migration: 007_add_performance_indexes.sql
-- Purpose: Add performance indexes for scheme aliases and bookmarks
-- Date: 2025-10-30
-- Description: Adds indexes to improve JOIN performance and text search performance
--              for scheme alias lookups and bookmark searches
-- ============================================================================

-- =====================================================
-- SCHEME ALIASES INDEXES
-- =====================================================

-- Index for alias search (JOIN performance)
-- Used when joining t_scheme_aliases with t_scheme_details
CREATE INDEX IF NOT EXISTS idx_scheme_aliases_scheme_id_active
ON t_scheme_aliases(scheme_id, is_active)
WHERE is_active = true;

-- Index for text search on aliases (for ILIKE queries)
-- Used when searching aliases with pattern matching
CREATE INDEX IF NOT EXISTS idx_scheme_aliases_alias_name_text
ON t_scheme_aliases(alias_name)
WHERE is_active = true;

-- =====================================================
-- SCHEME BOOKMARKS INDEXES
-- =====================================================

-- Index for text search on bookmarks
-- Used for searching schemes by name, code, or AMC in bookmark imports
CREATE INDEX IF NOT EXISTS idx_scheme_bookmarks_search_fields
ON t_scheme_bookmarks(scheme_name, scheme_code, amc_name)
WHERE is_active = true;

-- =====================================================
-- Comments for Documentation
-- =====================================================

COMMENT ON INDEX idx_scheme_aliases_scheme_id_active IS 'Performance index for scheme alias JOINs - filters by active records';
COMMENT ON INDEX idx_scheme_aliases_alias_name_text IS 'Performance index for ILIKE text searches on alias names';
COMMENT ON INDEX idx_scheme_bookmarks_search_fields IS 'Composite index for searching bookmarks by scheme name, code, or AMC';

-- =====================================================
-- Verification
-- =====================================================

DO $$
DECLARE
  v_index_count INTEGER;
BEGIN
  -- Count newly created indexes
  SELECT COUNT(*) INTO v_index_count
  FROM pg_indexes
  WHERE indexname IN (
    'idx_scheme_aliases_scheme_id_active',
    'idx_scheme_aliases_alias_name_text',
    'idx_scheme_bookmarks_search_fields'
  );

  RAISE NOTICE '✓ Migration 007_add_performance_indexes.sql completed successfully';
  RAISE NOTICE '✓ Created % performance indexes', v_index_count;
  RAISE NOTICE '  - idx_scheme_aliases_scheme_id_active (JOIN performance)';
  RAISE NOTICE '  - idx_scheme_aliases_alias_name_text (text search)';
  RAISE NOTICE '  - idx_scheme_bookmarks_search_fields (bookmark search)';
END $$;
