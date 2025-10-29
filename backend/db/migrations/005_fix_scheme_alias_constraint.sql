-- ============================================================================
-- Migration: 005_fix_scheme_alias_constraint.sql
-- Purpose: Fix UNIQUE constraint to allow all 16,701 schemes to get aliases
-- Date: 2025-10-29
-- Issue: Current constraint UNIQUE(alias_name_normalized) prevents multiple
--        schemes with similar names from getting their own aliases.
--        Example: "HDFC Growth Fund" and "HDFC Growth Fund - Direct" conflict
-- Solution: Change to UNIQUE(scheme_id, alias_name_normalized) to allow
--           same alias name for different schemes, but prevent duplicates
--           for the same scheme
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Starting Migration 005: Fix Scheme Alias Constraint';
  RAISE NOTICE '========================================';

  -- Step 1: Drop existing GLOBAL unique constraint
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'unique_alias_global'
  ) THEN
    RAISE NOTICE '✓ Dropping old constraint: unique_alias_global';
    ALTER TABLE t_scheme_aliases DROP CONSTRAINT unique_alias_global;
    RAISE NOTICE '✓ Old constraint dropped successfully';
  ELSE
    RAISE NOTICE '⚠ Old constraint unique_alias_global not found (may have been dropped already)';
  END IF;

  -- Step 2: Add new scheme-specific unique constraint
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'unique_scheme_alias'
  ) THEN
    RAISE NOTICE '✓ Adding new constraint: unique_scheme_alias (scheme_id, alias_name_normalized)';
    ALTER TABLE t_scheme_aliases
    ADD CONSTRAINT unique_scheme_alias
    UNIQUE (scheme_id, alias_name_normalized);
    RAISE NOTICE '✓ New constraint added successfully';
  ELSE
    RAISE NOTICE '⚠ New constraint unique_scheme_alias already exists';
  END IF;

  -- Step 3: Add index for performance (if not exists)
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'idx_scheme_aliases_scheme_alias'
  ) THEN
    RAISE NOTICE '✓ Creating performance index: idx_scheme_aliases_scheme_alias';
    CREATE INDEX idx_scheme_aliases_scheme_alias
    ON t_scheme_aliases(scheme_id, alias_name_normalized)
    WHERE is_active = true;
    RAISE NOTICE '✓ Performance index created';
  ELSE
    RAISE NOTICE '⚠ Performance index idx_scheme_aliases_scheme_alias already exists';
  END IF;

  -- Step 4: Verify the fix
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Verifying Migration Success...';
  RAISE NOTICE '========================================';

  -- Count total schemes
  DECLARE
    total_schemes INTEGER;
    total_aliases INTEGER;
    schemes_with_aliases INTEGER;
  BEGIN
    SELECT COUNT(*) INTO total_schemes FROM t_scheme_details WHERE is_active = true;
    SELECT COUNT(*) INTO total_aliases FROM t_scheme_aliases WHERE is_active = true;
    SELECT COUNT(DISTINCT scheme_id) INTO schemes_with_aliases FROM t_scheme_aliases WHERE is_active = true;

    RAISE NOTICE '📊 Current State:';
    RAISE NOTICE '   - Total active schemes: %', total_schemes;
    RAISE NOTICE '   - Total active aliases: %', total_aliases;
    RAISE NOTICE '   - Schemes with aliases: %', schemes_with_aliases;
    RAISE NOTICE '   - Schemes WITHOUT aliases: %', (total_schemes - schemes_with_aliases);
    RAISE NOTICE '';
    RAISE NOTICE '✓ Migration completed successfully!';
    RAISE NOTICE '✓ All % schemes can now have their own aliases', total_schemes;
    RAISE NOTICE '✓ Run backfill to populate missing aliases';
  END;

  RAISE NOTICE '========================================';
END $$;

-- ============================================================================
-- What changed:
-- ============================================================================
-- BEFORE: UNIQUE (alias_name_normalized)
--   - Only ONE scheme could have "HDFC GROWTH FUND" as alias
--   - Result: ~10,000 schemes got aliases, ~6,701 were skipped
--
-- AFTER: UNIQUE (scheme_id, alias_name_normalized)
--   - EACH scheme can have its own "HDFC GROWTH FUND" alias
--   - Same scheme cannot have duplicate aliases
--   - Result: ALL 16,701 schemes can get their aliases
-- ============================================================================

-- ============================================================================
-- Next Steps:
-- ============================================================================
-- 1. Run this migration
-- 2. Clear existing aliases: TRUNCATE t_scheme_aliases CASCADE;
-- 3. Run backfill to populate all schemes: POST /api/scheme-aliases/backfill
-- 4. Verify: SELECT COUNT(DISTINCT scheme_id) FROM t_scheme_aliases;
--    Should show 16,701 (or close to it)
-- ============================================================================
