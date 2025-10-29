-- ============================================================================
-- Script: truncate_scheme_aliases.sql
-- Purpose: Full cleanup - remove ALL data from t_scheme_aliases table
-- Date: 2025-10-29
-- WARNING: This will DELETE ALL ALIASES! Use with caution!
-- Usage: Run this when you want to start fresh and re-populate all aliases
-- ============================================================================

DO $$
DECLARE
  alias_count INTEGER;
  scheme_count INTEGER;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '⚠⚠⚠  WARNING: FULL ALIAS TABLE CLEANUP  ⚠⚠⚠';
  RAISE NOTICE '========================================';

  -- Count current data
  SELECT COUNT(*) INTO alias_count FROM t_scheme_aliases;
  SELECT COUNT(DISTINCT scheme_id) INTO scheme_count FROM t_scheme_aliases;

  RAISE NOTICE 'Current state:';
  RAISE NOTICE '  - Total aliases: %', alias_count;
  RAISE NOTICE '  - Schemes with aliases: %', scheme_count;
  RAISE NOTICE '';
  RAISE NOTICE 'This will DELETE ALL % aliases!', alias_count;
  RAISE NOTICE '';

  -- Truncate table
  RAISE NOTICE 'Truncating t_scheme_aliases table...';
  TRUNCATE TABLE t_scheme_aliases RESTART IDENTITY CASCADE;

  RAISE NOTICE '✓ All aliases deleted successfully';
  RAISE NOTICE '✓ Identity counter reset';
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Next Steps:';
  RAISE NOTICE '========================================';
  RAISE NOTICE '1. Verify table is empty:';
  RAISE NOTICE '   SELECT COUNT(*) FROM t_scheme_aliases;';
  RAISE NOTICE '';
  RAISE NOTICE '2. Run backfill to populate all schemes:';
  RAISE NOTICE '   POST /api/scheme-aliases/backfill';
  RAISE NOTICE '';
  RAISE NOTICE '3. Verify all schemes got aliases:';
  RAISE NOTICE '   SELECT COUNT(DISTINCT scheme_id) FROM t_scheme_aliases;';
  RAISE NOTICE '   (Should show ~16,701 schemes)';
  RAISE NOTICE '========================================';
END $$;
