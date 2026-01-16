-- ============================================================================
-- FIX: Backfill asset_type_code on transactions
-- ============================================================================
-- This script fixes transactions that have NULL asset_type_code by looking up
-- the scheme's asset_type_id and getting the corresponding asset_type_code
-- from m_asset_types.
--
-- Run this AFTER running update-import-functions-only.sql
-- ============================================================================

-- Step 1: Check current state
DO $$
DECLARE
    v_null_count INTEGER;
    v_total_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_null_count FROM t_transaction_table WHERE asset_type_code IS NULL;
    SELECT COUNT(*) INTO v_total_count FROM t_transaction_table;
    RAISE NOTICE 'Transactions with NULL asset_type_code: % out of %', v_null_count, v_total_count;
END $$;

-- Step 2: First, ensure schemes have asset_type_id set
-- This updates schemes based on their scheme_category from t_scheme_masters
DO $$
DECLARE
    v_updated INTEGER := 0;
    v_scheme RECORD;
    v_asset_type_id INTEGER;
BEGIN
    RAISE NOTICE 'Updating scheme asset_type_id from scheme_category...';

    FOR v_scheme IN
        SELECT sd.id, sd.scheme_code, sm.name as scheme_category
        FROM t_scheme_details sd
        LEFT JOIN t_scheme_masters sm ON sd.scheme_category_id = sm.id
        WHERE sd.asset_type_id IS NULL
          AND sm.name IS NOT NULL
    LOOP
        -- Look up asset_type from m_asset_types using scheme_category name
        SELECT id INTO v_asset_type_id
        FROM m_asset_types
        WHERE LOWER(TRIM(asset_type_code)) = LOWER(TRIM(v_scheme.scheme_category))
          AND is_active = true
        LIMIT 1;

        IF v_asset_type_id IS NOT NULL THEN
            UPDATE t_scheme_details SET asset_type_id = v_asset_type_id WHERE id = v_scheme.id;
            v_updated := v_updated + 1;
        END IF;
    END LOOP;

    RAISE NOTICE 'Updated % schemes with asset_type_id from scheme_category', v_updated;
END $$;

-- Step 3: Set default asset_type_id for schemes that still don't have one
UPDATE t_scheme_details
SET asset_type_id = (
    SELECT id FROM m_asset_types
    WHERE asset_type_code = 'Growth' AND is_active = true
    LIMIT 1
)
WHERE asset_type_id IS NULL;

-- Step 4: Now backfill asset_type_code on transactions
-- This uses the scheme's asset_type_id to get the asset_type_code from m_asset_types
UPDATE t_transaction_table tt
SET asset_type_code = mat.asset_type_code
FROM t_scheme_details sd
JOIN m_asset_types mat ON sd.asset_type_id = mat.id
WHERE tt.scheme_id = sd.id
  AND (tt.asset_type_code IS NULL OR tt.asset_type_code = 'MF')
  AND mat.asset_type_code IS NOT NULL;

-- Step 5: Handle transactions without scheme_id (fallback using scheme_code)
UPDATE t_transaction_table tt
SET asset_type_code = mat.asset_type_code
FROM t_scheme_details sd
JOIN m_asset_types mat ON sd.asset_type_id = mat.id
WHERE tt.scheme_code = sd.scheme_code
  AND tt.tenant_id = sd.tenant_id
  AND tt.is_live = sd.is_live
  AND (tt.asset_type_code IS NULL OR tt.asset_type_code = 'MF')
  AND mat.asset_type_code IS NOT NULL;

-- Step 6: Set default for any remaining transactions without asset_type_code
UPDATE t_transaction_table
SET asset_type_code = 'Growth'
WHERE asset_type_code IS NULL OR asset_type_code = '';

-- Step 7: Verify results
DO $$
DECLARE
    v_null_count INTEGER;
    v_mf_count INTEGER;
    v_total_count INTEGER;
    v_distinct_codes TEXT;
BEGIN
    SELECT COUNT(*) INTO v_null_count FROM t_transaction_table WHERE asset_type_code IS NULL;
    SELECT COUNT(*) INTO v_mf_count FROM t_transaction_table WHERE asset_type_code = 'MF';
    SELECT COUNT(*) INTO v_total_count FROM t_transaction_table;
    SELECT string_agg(DISTINCT asset_type_code, ', ') INTO v_distinct_codes FROM t_transaction_table;

    RAISE NOTICE '=== RESULTS ===';
    RAISE NOTICE 'Transactions with NULL asset_type_code: % (should be 0)', v_null_count;
    RAISE NOTICE 'Transactions with MF asset_type_code: % (should be 0)', v_mf_count;
    RAISE NOTICE 'Total transactions: %', v_total_count;
    RAISE NOTICE 'Distinct asset_type_codes: %', v_distinct_codes;
END $$;

-- Step 8: Now regenerate snapshots to fix networth
-- After running this script, regenerate snapshots from the UI to see correct values
RAISE NOTICE 'Script complete. Please regenerate snapshots from the UI to update networth values.';
