-- v1.3-fix-asset-type-mapping.sql
-- Migration: Fix Asset Type Mapping for Scheme Categories
-- Issue: All assets showing as 'Growth' in Asset Allocation chart
-- Root Cause: Transactions have wrong asset_type_code
-- Solution: Use scheme_category_id (already populated) to set correct asset_type_code

BEGIN;

-- ============================================================================
-- STEP 1: Show current state
-- ============================================================================

SELECT 'BEFORE FIX - Transaction Asset Type Distribution:' as info;
SELECT
    COALESCE(asset_type_code, 'NULL (missing)') as asset_type,
    COUNT(*) as txn_count
FROM t_transaction_table
WHERE portfolio_flag = true
GROUP BY asset_type_code
ORDER BY txn_count DESC
LIMIT 20;

-- ============================================================================
-- STEP 2: Update transactions using scheme_category_id directly
-- scheme_category_id → t_scheme_masters.name = the correct category name
-- ============================================================================

UPDATE t_transaction_table tt
SET asset_type_code = sm.name
FROM t_scheme_details sd
JOIN t_scheme_masters sm ON sd.scheme_category_id = sm.id
    AND sm.master_type = 'scheme_category'
WHERE tt.scheme_id = sd.id
  AND tt.portfolio_flag = true
  AND sd.scheme_category_id IS NOT NULL;

SELECT 'STEP 2 COMPLETE - Transactions Updated from scheme_category_id' as info;

-- ============================================================================
-- STEP 3: Show updated state
-- ============================================================================

SELECT 'AFTER FIX - Transaction Asset Type Distribution:' as info;
SELECT
    COALESCE(asset_type_code, 'NULL (missing)') as asset_type,
    COUNT(*) as txn_count
FROM t_transaction_table
WHERE portfolio_flag = true
GROUP BY asset_type_code
ORDER BY txn_count DESC
LIMIT 20;

-- Show sample of updated transactions
SELECT 'SAMPLE - Updated Transactions:' as info;
SELECT DISTINCT
    tt.asset_type_code,
    sd.scheme_name
FROM t_transaction_table tt
JOIN t_scheme_details sd ON tt.scheme_id = sd.id
WHERE tt.portfolio_flag = true
  AND tt.asset_type_code IS NOT NULL
  AND tt.asset_type_code != 'Growth'
LIMIT 10;

COMMIT;

-- ============================================================================
-- STEP 4: NOTE - Portfolio snapshots need to be regenerated
-- ============================================================================

SELECT 'MIGRATION COMPLETE!' as info;
SELECT 'IMPORTANT: Regenerate portfolio snapshots to update Asset Allocation charts' as info;
SELECT 'Run: SELECT regenerate_all_snapshots_for_tenant(tenant_id, is_live);' as info;
