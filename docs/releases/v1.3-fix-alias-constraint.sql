-- ============================================================================
-- MIGRATION: Fix Alias Constraint for Multi-Scheme Support
-- Version: 1.3
-- Date: 2026-01-17
--
-- Issue: Same scheme name (alias) for different schemes was blocked by
--        UNIQUE(alias_name_normalized) constraint. Transaction import picked
--        wrong scheme_id causing incorrect NAV lookups and return calculations.
--
-- Fix:
--   1. Change constraint to UNIQUE(scheme_id, alias_name_normalized)
--   2. Update transaction import to prioritize bookmarked schemes
--
-- Affected Customers: 5+ with incorrect returns (-49% to -38% instead of +5% to +42%)
-- Root Cause: Same alias name mapped to wrong scheme_id
-- ============================================================================

BEGIN;

-- ============================================================================
-- STEP 1: Fix the alias constraint
-- ============================================================================
-- Old: UNIQUE(alias_name_normalized) - only ONE alias per name globally
-- New: UNIQUE(scheme_id, alias_name_normalized) - same name can map to different schemes

DO $$
BEGIN
    -- Drop old constraint if it exists
    IF EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'unique_alias_global'
        AND conrelid = 't_scheme_aliases'::regclass
    ) THEN
        ALTER TABLE t_scheme_aliases DROP CONSTRAINT unique_alias_global;
        RAISE NOTICE 'Dropped old constraint: unique_alias_global';
    END IF;

    -- Add new constraint if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'unique_scheme_alias'
        AND conrelid = 't_scheme_aliases'::regclass
    ) THEN
        ALTER TABLE t_scheme_aliases
        ADD CONSTRAINT unique_scheme_alias UNIQUE (scheme_id, alias_name_normalized);
        RAISE NOTICE 'Added new constraint: unique_scheme_alias (scheme_id, alias_name_normalized)';
    ELSE
        RAISE NOTICE 'Constraint unique_scheme_alias already exists';
    END IF;
END $$;

-- ============================================================================
-- STEP 2: Update process_transaction_import_session function
-- ============================================================================
-- Change: Alias lookup now joins with bookmarks to find the scheme that's
--         actually bookmarked by the tenant, not just any matching alias.

-- Note: The full function is in update-import-functions-only.sql
-- This is a targeted update to just the scheme lookup portion.
-- For production, run the full function update from update-import-functions-only.sql

RAISE NOTICE 'IMPORTANT: Run update-import-functions-only.sql to update the transaction import function';

-- ============================================================================
-- STEP 3: Verification
-- ============================================================================

-- Verify constraint change
SELECT conname, pg_get_constraintdef(oid) as constraint_def
FROM pg_constraint
WHERE conrelid = 't_scheme_aliases'::regclass
AND contype = 'u';

COMMIT;

-- ============================================================================
-- POST-MIGRATION STEPS (Run after this script)
-- ============================================================================
-- 1. Run update-import-functions-only.sql to update the transaction import function
-- 2. Re-import bookmarks for affected tenants to create missing aliases
-- 3. Reprocess failed transactions

-- Example: Reprocess failed transactions for tenant 25, session 65
-- UPDATE t_import_staging_data
-- SET processing_status = 'pending'
-- WHERE session_id = 65 AND tenant_id = 25 AND processing_status = 'failed';
-- Then re-run: SELECT process_transaction_import_session(65);
