-- v1.3-fix-asset-type-mapping.sql
-- Migration: Fix Asset Type Mapping for Scheme Categories
-- Issue: All assets showing as 'Growth' in Asset Allocation
-- Root Cause: Code used asset_type_id instead of scheme_category_id
-- Solution: Use scheme_category_id which is already populated

BEGIN;

-- ============================================================================
-- PART 1: FIX EXISTING DATA
-- ============================================================================

-- 1a. Fix t_transaction_table.asset_type_code
UPDATE t_transaction_table tt
SET asset_type_code = mat.asset_type_code
FROM t_scheme_details sd
JOIN m_asset_types mat ON mat.id = sd.scheme_category_id
WHERE tt.scheme_id = sd.id
  AND tt.portfolio_flag = true
  AND sd.scheme_category_id IS NOT NULL;

-- 1b. Fix t_customer_asset_assignments.asset_type_id
UPDATE t_customer_asset_assignments caa
SET asset_type_id = sd.scheme_category_id
FROM t_scheme_details sd
WHERE caa.scheme_code = sd.scheme_code
  AND sd.scheme_category_id IS NOT NULL;

-- ============================================================================
-- PART 2: UPDATE RPC FUNCTION FOR FUTURE IMPORTS
-- Change: sd.asset_type_id → sd.scheme_category_id
-- ============================================================================

-- The function process_transaction_import_session needs this change at line ~1345:
-- OLD: JOIN m_asset_types mat ON sd.asset_type_id = mat.id
-- NEW: JOIN m_asset_types mat ON sd.scheme_category_id = mat.id

-- Run the updated function from 04_functions_views_policies.sql
-- or apply this specific change:

/*
UPDATE the LOOKUP ASSET TYPE section in process_transaction_import_session:

                -- LOOKUP ASSET TYPE using scheme_category_id (v1.3 fix)
                IF v_bookmark_id IS NOT NULL THEN
                    SELECT mat.asset_type_code, mat.id
                    INTO v_asset_type_code, v_asset_type_id
                    FROM t_scheme_details sd
                    JOIN m_asset_types mat ON sd.scheme_category_id = mat.id AND mat.is_active = true
                    WHERE sd.id = v_scheme_id;

                    -- Default to 'Growth' if scheme_category_id not set on scheme
                    IF v_asset_type_code IS NULL THEN
                        SELECT asset_type_code, id
                        INTO v_asset_type_code, v_asset_type_id
                        FROM m_asset_types
                        WHERE asset_type_code = 'Growth' AND is_active = true
                        LIMIT 1;
                    END IF;
                END IF;
*/

COMMIT;

SELECT 'v1.3 Migration Complete' as status;
SELECT 'Fixed: t_transaction_table.asset_type_code' as fix1;
SELECT 'Fixed: t_customer_asset_assignments.asset_type_id' as fix2;
SELECT 'NOTE: Run updated process_transaction_import_session from 04_functions_views_policies.sql' as note;
