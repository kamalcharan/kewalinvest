-- ============================================================================
-- Script: cleanup_orphaned_aliases.sql
-- Purpose: Find and remove orphaned aliases (aliases without parent schemes)
-- Date: 2025-10-29
-- Usage: Run this to clean up data integrity issues
-- ============================================================================

DO $$
DECLARE
  orphaned_count INTEGER;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Finding Orphaned Aliases...';
  RAISE NOTICE '========================================';

  -- Count orphaned aliases
  SELECT COUNT(*) INTO orphaned_count
  FROM t_scheme_aliases sa
  LEFT JOIN t_scheme_details sd ON sa.scheme_id = sd.id
  WHERE sd.id IS NULL;

  IF orphaned_count > 0 THEN
    RAISE NOTICE '⚠ Found % orphaned aliases (aliases without parent schemes)', orphaned_count;

    -- Show sample orphaned aliases
    RAISE NOTICE '';
    RAISE NOTICE 'Sample orphaned aliases:';
    RAISE NOTICE '------------------------';

    FOR rec IN (
      SELECT sa.id, sa.scheme_id, sa.alias_name
      FROM t_scheme_aliases sa
      LEFT JOIN t_scheme_details sd ON sa.scheme_id = sd.id
      WHERE sd.id IS NULL
      LIMIT 10
    ) LOOP
      RAISE NOTICE 'ID: %, Scheme ID: %, Alias: %', rec.id, rec.scheme_id, rec.alias_name;
    END LOOP;

    -- Delete orphaned aliases
    RAISE NOTICE '';
    RAISE NOTICE 'Deleting orphaned aliases...';

    DELETE FROM t_scheme_aliases
    WHERE id IN (
      SELECT sa.id
      FROM t_scheme_aliases sa
      LEFT JOIN t_scheme_details sd ON sa.scheme_id = sd.id
      WHERE sd.id IS NULL
    );

    RAISE NOTICE '✓ Deleted % orphaned aliases', orphaned_count;
  ELSE
    RAISE NOTICE '✓ No orphaned aliases found';
  END IF;

  RAISE NOTICE '========================================';
  RAISE NOTICE 'Cleanup Complete!';
  RAISE NOTICE '========================================';
END $$;
