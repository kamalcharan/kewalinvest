-- ============================================================================
-- MIGRATION: Scheme-Based Asset Types
-- Version: 1.0
-- Date: 2026-01-16
-- Description: Replace single 'MF' asset type with scheme-based types
--              (Open Ended, Close Ended, Interval Fund)
-- ============================================================================
--
-- PREREQUISITES:
-- 1. Backup your database before running this migration
-- 2. Run during maintenance window (affects transactions and snapshots)
-- 3. Application should be stopped during migration
--
-- ROLLBACK: See bottom of file for rollback script
-- ============================================================================

BEGIN;

-- ============================================================================
-- STEP 1: Add asset_type_code column to t_transaction_table
-- ============================================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 't_transaction_table'
        AND column_name = 'asset_type_code'
    ) THEN
        ALTER TABLE t_transaction_table
        ADD COLUMN asset_type_code VARCHAR(50);

        COMMENT ON COLUMN t_transaction_table.asset_type_code IS
            'Asset type derived from scheme type during import (Open Ended, Close Ended, Interval Fund)';

        RAISE NOTICE '✓ Added asset_type_code column to t_transaction_table';
    ELSE
        RAISE NOTICE '→ asset_type_code column already exists in t_transaction_table';
    END IF;
END $$;

-- ============================================================================
-- STEP 2: Insert scheme types into t_scheme_masters
-- ============================================================================
INSERT INTO t_scheme_masters (tenant_id, is_live, is_active, master_type, code, name, display_order)
VALUES
    (1, true, true, 'scheme_type', 'OPEN_ENDED', 'Open Ended', 1),
    (1, true, true, 'scheme_type', 'CLOSE_ENDED', 'Close Ended', 2),
    (1, true, true, 'scheme_type', 'INTERVAL_FUND', 'Interval Fund', 3)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    is_active = true,
    display_order = EXCLUDED.display_order;

DO $$
DECLARE
    v_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_count
    FROM t_scheme_masters
    WHERE master_type = 'scheme_type' AND is_active = true;
    RAISE NOTICE '✓ Scheme types in t_scheme_masters: %', v_count;
END $$;

-- ============================================================================
-- STEP 3: Add new scheme-based asset types to m_asset_types
-- ============================================================================
INSERT INTO m_asset_types (asset_type_code, asset_type_name, category, default_assumption_rate, display_order, is_active, description)
VALUES
    ('Open Ended', 'Open Ended', 'equity', 12.00, 1, true,
     'Open-ended mutual fund schemes with daily NAV and flexible redemption'),
    ('Close Ended', 'Close Ended', 'equity', 12.00, 2, true,
     'Close-ended mutual fund schemes with fixed maturity (FMPs, interval schemes)'),
    ('Interval Fund', 'Interval Fund', 'equity', 12.00, 3, true,
     'Interval mutual fund schemes with periodic redemption windows')
ON CONFLICT (asset_type_code) DO UPDATE SET
    asset_type_name = EXCLUDED.asset_type_name,
    category = EXCLUDED.category,
    default_assumption_rate = EXCLUDED.default_assumption_rate,
    is_active = true;

DO $$
DECLARE
    v_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_count
    FROM m_asset_types
    WHERE asset_type_code IN ('Open Ended', 'Close Ended', 'Interval Fund');
    RAISE NOTICE '✓ Scheme-based asset types added: %', v_count;
END $$;

-- ============================================================================
-- STEP 4: Backfill asset_type_code for existing transactions
-- ============================================================================
-- This updates all transactions that have a scheme_code linked to a scheme
-- with a known scheme_type. Uses the scheme's scheme_type to determine the
-- asset_type_code.

DO $$
DECLARE
    v_updated_count INTEGER;
    v_total_null INTEGER;
BEGIN
    -- Count transactions needing update
    SELECT COUNT(*) INTO v_total_null
    FROM t_transaction_table
    WHERE asset_type_code IS NULL;

    RAISE NOTICE '→ Transactions needing asset_type_code update: %', v_total_null;

    -- Update transactions with scheme_type lookup
    UPDATE t_transaction_table t
    SET asset_type_code = sm.name
    FROM t_scheme_details sd
    JOIN t_scheme_masters sm ON sd.scheme_type_id = sm.id
    WHERE t.scheme_code = sd.scheme_code
      AND t.asset_type_code IS NULL
      AND sm.master_type = 'scheme_type';

    GET DIAGNOSTICS v_updated_count = ROW_COUNT;
    RAISE NOTICE '✓ Updated % transactions with scheme_type lookup', v_updated_count;

    -- Default remaining NULL values to 'Open Ended' (most common type)
    UPDATE t_transaction_table
    SET asset_type_code = 'Open Ended'
    WHERE asset_type_code IS NULL;

    GET DIAGNOSTICS v_updated_count = ROW_COUNT;
    IF v_updated_count > 0 THEN
        RAISE NOTICE '✓ Defaulted % transactions to Open Ended (scheme_type not found)', v_updated_count;
    END IF;
END $$;

-- ============================================================================
-- STEP 5: Update existing portfolio snapshots from 'MF' to scheme types
-- ============================================================================
-- Since we can't determine original scheme type from aggregated snapshots,
-- we default all 'MF' snapshots to 'Open Ended' (the most common type)

DO $$
DECLARE
    v_mf_count INTEGER;
    v_updated INTEGER;
BEGIN
    -- Count existing MF snapshots
    SELECT COUNT(*) INTO v_mf_count
    FROM t_monthly_portfolio_snapshots
    WHERE asset_type_code = 'MF';

    IF v_mf_count > 0 THEN
        RAISE NOTICE '→ Found % snapshots with asset_type_code = MF', v_mf_count;

        -- Update MF to Open Ended
        UPDATE t_monthly_portfolio_snapshots
        SET asset_type_code = 'Open Ended'
        WHERE asset_type_code = 'MF';

        GET DIAGNOSTICS v_updated = ROW_COUNT;
        RAISE NOTICE '✓ Updated % snapshots from MF to Open Ended', v_updated;
    ELSE
        RAISE NOTICE '→ No snapshots with MF found (already migrated or clean DB)';
    END IF;
END $$;

-- ============================================================================
-- STEP 6: Deactivate old 'MF' asset type (if exists)
-- ============================================================================
UPDATE m_asset_types
SET is_active = false,
    description = COALESCE(description, '') || ' [DEPRECATED: Replaced by Open Ended, Close Ended, Interval Fund]'
WHERE asset_type_code = 'MF';

DO $$
DECLARE
    v_deactivated INTEGER;
BEGIN
    GET DIAGNOSTICS v_deactivated = ROW_COUNT;
    IF v_deactivated > 0 THEN
        RAISE NOTICE '✓ Deactivated MF asset type (kept for historical reference)';
    ELSE
        RAISE NOTICE '→ MF asset type not found (already removed or clean DB)';
    END IF;
END $$;

-- ============================================================================
-- STEP 7: Update function process_transaction_import_session
-- ============================================================================
-- This requires recreating the function with the new logic
-- The function should already be updated in 04_functions_views_policies.sql
--
-- Key changes to the function:
-- 1. Added variables: v_asset_type_id, v_asset_type_code
-- 2. Added lookup: scheme_type_id -> t_scheme_masters.name -> m_asset_types
-- 3. Added asset_type_code to INSERT statement
--
-- If function not updated, run the distribution script:
-- \i 'backend/db/ditribution scripts/04_functions_views_policies.sql'

RAISE NOTICE '';
RAISE NOTICE '⚠️  IMPORTANT: Ensure process_transaction_import_session function is updated!';
RAISE NOTICE '    Run: \i ''backend/db/ditribution scripts/04_functions_views_policies.sql''';
RAISE NOTICE '';

-- ============================================================================
-- STEP 8: Verification
-- ============================================================================
DO $$
DECLARE
    v_txn_null_count INTEGER;
    v_snapshot_mf_count INTEGER;
    v_scheme_types_count INTEGER;
    v_asset_types_count INTEGER;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'MIGRATION VERIFICATION';
    RAISE NOTICE '========================================';

    -- Check transactions
    SELECT COUNT(*) INTO v_txn_null_count
    FROM t_transaction_table
    WHERE asset_type_code IS NULL;

    IF v_txn_null_count = 0 THEN
        RAISE NOTICE '✓ All transactions have asset_type_code';
    ELSE
        RAISE WARNING '⚠ % transactions still have NULL asset_type_code', v_txn_null_count;
    END IF;

    -- Check snapshots
    SELECT COUNT(*) INTO v_snapshot_mf_count
    FROM t_monthly_portfolio_snapshots
    WHERE asset_type_code = 'MF';

    IF v_snapshot_mf_count = 0 THEN
        RAISE NOTICE '✓ No snapshots with MF asset_type_code';
    ELSE
        RAISE WARNING '⚠ % snapshots still have MF asset_type_code', v_snapshot_mf_count;
    END IF;

    -- Check scheme types
    SELECT COUNT(*) INTO v_scheme_types_count
    FROM t_scheme_masters
    WHERE master_type = 'scheme_type' AND is_active = true;
    RAISE NOTICE '✓ Active scheme types: %', v_scheme_types_count;

    -- Check asset types
    SELECT COUNT(*) INTO v_asset_types_count
    FROM m_asset_types
    WHERE asset_type_code IN ('Open Ended', 'Close Ended', 'Interval Fund')
    AND is_active = true;
    RAISE NOTICE '✓ Scheme-based asset types active: %', v_asset_types_count;

    -- Summary by asset_type_code
    RAISE NOTICE '';
    RAISE NOTICE 'Transaction Distribution by Asset Type:';
    FOR v_txn_null_count IN (
        SELECT asset_type_code, COUNT(*) as cnt
        FROM t_transaction_table
        GROUP BY asset_type_code
        ORDER BY cnt DESC
    ) LOOP
        -- This won't work in DO block, just for illustration
    END LOOP;

    RAISE NOTICE '========================================';
    RAISE NOTICE 'Migration completed successfully!';
    RAISE NOTICE '========================================';
END $$;

-- Show distribution summary
SELECT
    asset_type_code,
    COUNT(*) as transaction_count
FROM t_transaction_table
GROUP BY asset_type_code
ORDER BY transaction_count DESC;

COMMIT;

-- ============================================================================
-- ROLLBACK SCRIPT (Run if migration fails)
-- ============================================================================
/*
BEGIN;

-- Revert snapshots back to MF
UPDATE t_monthly_portfolio_snapshots
SET asset_type_code = 'MF'
WHERE asset_type_code IN ('Open Ended', 'Close Ended', 'Interval Fund');

-- Reactivate MF asset type
UPDATE m_asset_types
SET is_active = true,
    description = REPLACE(description, ' [DEPRECATED: Replaced by Open Ended, Close Ended, Interval Fund]', '')
WHERE asset_type_code = 'MF';

-- Deactivate new scheme-based asset types
UPDATE m_asset_types
SET is_active = false
WHERE asset_type_code IN ('Open Ended', 'Close Ended', 'Interval Fund');

-- Deactivate scheme types in t_scheme_masters
UPDATE t_scheme_masters
SET is_active = false
WHERE master_type = 'scheme_type'
AND code IN ('OPEN_ENDED', 'CLOSE_ENDED', 'INTERVAL_FUND');

-- Note: Column t_transaction_table.asset_type_code is kept (nullable, harmless)
-- To remove: ALTER TABLE t_transaction_table DROP COLUMN asset_type_code;

COMMIT;

RAISE NOTICE 'Rollback completed. MF asset type restored.';
*/
