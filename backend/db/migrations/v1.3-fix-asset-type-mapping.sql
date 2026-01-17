-- v1.3-fix-asset-type-mapping.sql
-- Migration: Fix Asset Type Mapping for Scheme Categories
-- Issue: All assets showing as 'Growth' in Asset Allocation chart
-- Root Cause: t_scheme_details.asset_type_id not linked to m_asset_types
-- Solution: Map scheme_category from t_scheme_masters to asset_type_id in m_asset_types

-- ============================================================================
-- STEP 1: Update t_scheme_details.asset_type_id based on scheme_category_id
-- The scheme category name in t_scheme_masters should match asset_type_code in m_asset_types
-- ============================================================================

BEGIN;

-- First, let's see current state
SELECT 'BEFORE FIX - Scheme Details Asset Type Distribution:' as info;
SELECT
    COALESCE(mat.asset_type_code, 'NULL (missing)') as asset_type,
    COUNT(*) as scheme_count
FROM t_scheme_details sd
LEFT JOIN m_asset_types mat ON sd.asset_type_id = mat.id
GROUP BY mat.asset_type_code
ORDER BY scheme_count DESC;

-- Update asset_type_id by matching scheme category name to m_asset_types.asset_type_code
UPDATE t_scheme_details sd
SET asset_type_id = mat.id
FROM t_scheme_masters sm
JOIN m_asset_types mat ON LOWER(TRIM(mat.asset_type_code)) = LOWER(TRIM(sm.name))
    AND mat.is_active = true
WHERE sd.scheme_category_id = sm.id
  AND sm.master_type = 'scheme_category'
  AND sm.is_active = true;

SELECT 'STEP 1 COMPLETE - Scheme Details Updated' as info;

-- Show updated distribution
SELECT 'AFTER FIX - Scheme Details Asset Type Distribution:' as info;
SELECT
    COALESCE(mat.asset_type_code, 'NULL (missing)') as asset_type,
    COUNT(*) as scheme_count
FROM t_scheme_details sd
LEFT JOIN m_asset_types mat ON sd.asset_type_id = mat.id
GROUP BY mat.asset_type_code
ORDER BY scheme_count DESC;

-- ============================================================================
-- STEP 2: Update t_transaction_table.asset_type_code based on scheme's asset type
-- This fixes existing transactions that were incorrectly tagged as 'Growth'
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

-- Update transaction asset_type_code from scheme's mapped asset type
UPDATE t_transaction_table tt
SET asset_type_code = mat.asset_type_code
FROM t_scheme_details sd
JOIN m_asset_types mat ON sd.asset_type_id = mat.id AND mat.is_active = true
WHERE tt.scheme_id = sd.id
  AND tt.portfolio_flag = true
  AND (tt.asset_type_code IS NULL OR tt.asset_type_code = 'Growth' OR tt.asset_type_code = 'Open Ended');

SELECT 'STEP 2 COMPLETE - Transactions Updated' as info;

-- Show updated distribution
SELECT 'AFTER FIX - Transaction Asset Type Distribution:' as info;
SELECT
    COALESCE(asset_type_code, 'NULL (missing)') as asset_type,
    COUNT(*) as txn_count
FROM t_transaction_table
WHERE portfolio_flag = true
GROUP BY asset_type_code
ORDER BY txn_count DESC
LIMIT 20;

-- ============================================================================
-- STEP 3: Fix schemes that have scheme_category but no scheme_category_id
-- Some schemes may have category in a different format
-- ============================================================================

-- Try to match schemes by scheme_code lookup to known AMFI categories
-- This is for schemes imported before the backfill ran

-- Show schemes still without asset_type_id
SELECT 'SCHEMES STILL WITHOUT ASSET TYPE:' as info;
SELECT
    sd.scheme_code,
    sd.scheme_name,
    sm.name as scheme_category_name
FROM t_scheme_details sd
LEFT JOIN t_scheme_masters sm ON sd.scheme_category_id = sm.id AND sm.master_type = 'scheme_category'
WHERE sd.asset_type_id IS NULL
LIMIT 20;

COMMIT;

-- ============================================================================
-- STEP 4: NOTE - Portfolio snapshots need to be regenerated
-- After this migration, run the snapshot regeneration job to update asset allocation
-- ============================================================================

SELECT 'MIGRATION COMPLETE!' as info;
SELECT 'IMPORTANT: Regenerate portfolio snapshots to update Asset Allocation charts' as info;
SELECT 'Run: SELECT regenerate_all_snapshots_for_tenant(tenant_id, is_live);' as info;
