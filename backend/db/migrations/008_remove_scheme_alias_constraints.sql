-- ============================================================================
-- Migration: 008_remove_scheme_alias_constraints.sql
-- Purpose: Remove uniqueness constraints from t_scheme_aliases to allow ambiguous matches
-- Date: 2025-10-30
-- Description: Drops constraints to allow multiple schemes to share the same alias.
--              This enables detection of ambiguous matches during imports for manual resolution.
-- ============================================================================

-- =====================================================
-- STEP 1: Drop CHECK constraint on source column
-- =====================================================

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 't_scheme_aliases_source_check'
    ) THEN
        ALTER TABLE t_scheme_aliases
        DROP CONSTRAINT t_scheme_aliases_source_check;
        RAISE NOTICE '✓ Dropped CHECK constraint on source column';
    ELSE
        RAISE NOTICE '⊘ CHECK constraint on source column does not exist';
    END IF;
END $$;

-- =====================================================
-- STEP 2: Drop unique constraint on scheme+alias
-- =====================================================

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'unique_scheme_alias'
    ) THEN
        ALTER TABLE t_scheme_aliases
        DROP CONSTRAINT unique_scheme_alias;
        RAISE NOTICE '✓ Dropped unique_scheme_alias constraint';
    ELSE
        RAISE NOTICE '⊘ unique_scheme_alias constraint does not exist';
    END IF;
END $$;

-- =====================================================
-- STEP 3: Drop unique constraint on normalized alias
-- =====================================================

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname IN ('unique_alias_global', 't_scheme_aliases_alias_name_normalized_key')
    ) THEN
        ALTER TABLE t_scheme_aliases
        DROP CONSTRAINT IF EXISTS unique_alias_global;

        ALTER TABLE t_scheme_aliases
        DROP CONSTRAINT IF EXISTS t_scheme_aliases_alias_name_normalized_key;

        RAISE NOTICE '✓ Dropped unique constraint on alias_name_normalized';
    ELSE
        RAISE NOTICE '⊘ Unique constraint on alias_name_normalized does not exist';
    END IF;
END $$;

-- =====================================================
-- STEP 4: Drop composite unique constraint (if exists)
-- =====================================================

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 't_scheme_aliases_scheme_id_alias_name_normalized_key'
    ) THEN
        ALTER TABLE t_scheme_aliases
        DROP CONSTRAINT t_scheme_aliases_scheme_id_alias_name_normalized_key;
        RAISE NOTICE '✓ Dropped composite unique constraint';
    ELSE
        RAISE NOTICE '⊘ Composite unique constraint does not exist';
    END IF;
END $$;

-- =====================================================
-- STEP 5: Keep primary key (required for performance)
-- =====================================================

-- Primary key is kept intentionally for:
-- 1. Index performance
-- 2. Foreign key references
-- 3. Row identification
--
-- DO NOT DROP: t_scheme_aliases_pkey

-- =====================================================
-- STEP 6: Verification
-- =====================================================

DO $$
DECLARE
    v_constraint_count INTEGER;
BEGIN
    -- Count remaining constraints (should only be PK and FK)
    SELECT COUNT(*) INTO v_constraint_count
    FROM pg_constraint
    WHERE conrelid = 't_scheme_aliases'::regclass
    AND contype IN ('u', 'c'); -- unique or check constraints

    RAISE NOTICE '========================================';
    RAISE NOTICE '✓ Migration 008 completed successfully';
    RAISE NOTICE '✓ Removed uniqueness constraints from t_scheme_aliases';
    RAISE NOTICE '✓ Aliases can now be ambiguous (multiple schemes per alias)';
    RAISE NOTICE 'Remaining unique/check constraints: %', v_constraint_count;
    RAISE NOTICE '========================================';
END $$;

-- =====================================================
-- Comments for Documentation
-- =====================================================

COMMENT ON TABLE t_scheme_aliases IS 'Global scheme alias mapping - multiple schemes can share the same alias for ambiguous match detection. Aliases are shared across all tenants.';
