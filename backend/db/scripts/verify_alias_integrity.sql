-- ============================================================================
-- Script: verify_alias_integrity.sql
-- Purpose: Verify data integrity after backfill - check if all schemes have aliases
-- Date: 2025-10-29
-- Usage: Run this after backfill to verify everything worked correctly
-- ============================================================================

DO $$
DECLARE
  total_schemes INTEGER;
  schemes_with_aliases INTEGER;
  schemes_without_aliases INTEGER;
  total_aliases INTEGER;
  avg_aliases_per_scheme NUMERIC;
  orphaned_aliases INTEGER;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Scheme Alias Data Integrity Check';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';

  -- Count total active schemes
  SELECT COUNT(*) INTO total_schemes
  FROM t_scheme_details
  WHERE is_active = true;

  -- Count schemes with aliases
  SELECT COUNT(DISTINCT scheme_id) INTO schemes_with_aliases
  FROM t_scheme_aliases
  WHERE is_active = true;

  -- Calculate schemes without aliases
  schemes_without_aliases := total_schemes - schemes_with_aliases;

  -- Count total aliases
  SELECT COUNT(*) INTO total_aliases
  FROM t_scheme_aliases
  WHERE is_active = true;

  -- Calculate average aliases per scheme
  IF schemes_with_aliases > 0 THEN
    avg_aliases_per_scheme := ROUND(total_aliases::NUMERIC / schemes_with_aliases::NUMERIC, 2);
  ELSE
    avg_aliases_per_scheme := 0;
  END IF;

  -- Count orphaned aliases
  SELECT COUNT(*) INTO orphaned_aliases
  FROM t_scheme_aliases sa
  LEFT JOIN t_scheme_details sd ON sa.scheme_id = sd.id
  WHERE sd.id IS NULL;

  -- Display results
  RAISE NOTICE '📊 COVERAGE STATISTICS:';
  RAISE NOTICE '  ├─ Total active schemes: %', total_schemes;
  RAISE NOTICE '  ├─ Schemes WITH aliases: % (%.1f%%)', schemes_with_aliases,
    (schemes_with_aliases::NUMERIC / total_schemes::NUMERIC * 100);
  RAISE NOTICE '  └─ Schemes WITHOUT aliases: % (%.1f%%)', schemes_without_aliases,
    (schemes_without_aliases::NUMERIC / total_schemes::NUMERIC * 100);
  RAISE NOTICE '';

  RAISE NOTICE '🏷️  ALIAS STATISTICS:';
  RAISE NOTICE '  ├─ Total aliases: %', total_aliases;
  RAISE NOTICE '  └─ Avg aliases per scheme: %', avg_aliases_per_scheme;
  RAISE NOTICE '';

  RAISE NOTICE '🔍 DATA INTEGRITY:';
  IF orphaned_aliases = 0 THEN
    RAISE NOTICE '  ✓ No orphaned aliases found';
  ELSE
    RAISE NOTICE '  ⚠ Found % orphaned aliases (aliases without parent schemes)', orphaned_aliases;
  END IF;
  RAISE NOTICE '';

  -- Status assessment
  RAISE NOTICE '========================================';
  IF schemes_without_aliases = 0 AND orphaned_aliases = 0 THEN
    RAISE NOTICE '✅ STATUS: PERFECT';
    RAISE NOTICE '   All schemes have aliases, no orphans found!';
  ELSIF schemes_without_aliases > 0 THEN
    RAISE NOTICE '⚠️  STATUS: INCOMPLETE';
    RAISE NOTICE '   % schemes still need aliases', schemes_without_aliases;
    RAISE NOTICE '   Run: POST /api/scheme-aliases/backfill';
  ELSIF orphaned_aliases > 0 THEN
    RAISE NOTICE '⚠️  STATUS: DATA INTEGRITY ISSUE';
    RAISE NOTICE '   Found orphaned aliases. Run cleanup script:';
    RAISE NOTICE '   backend/db/scripts/cleanup_orphaned_aliases.sql';
  END IF;
  RAISE NOTICE '========================================';
  RAISE NOTICE '';

  -- List schemes without aliases (first 20)
  IF schemes_without_aliases > 0 THEN
    RAISE NOTICE 'Schemes without aliases (first 20):';
    RAISE NOTICE '------------------------------------';
    FOR rec IN (
      SELECT sd.id, sd.scheme_code, sd.scheme_name
      FROM t_scheme_details sd
      WHERE sd.is_active = true
        AND NOT EXISTS (
          SELECT 1 FROM t_scheme_aliases sa
          WHERE sa.scheme_id = sd.id
        )
      ORDER BY sd.scheme_name
      LIMIT 20
    ) LOOP
      RAISE NOTICE 'ID: %, Code: %, Name: %', rec.id, rec.scheme_code, rec.scheme_name;
    END LOOP;

    IF schemes_without_aliases > 20 THEN
      RAISE NOTICE '... and % more', (schemes_without_aliases - 20);
    END IF;
    RAISE NOTICE '';
  END IF;

END $$;
