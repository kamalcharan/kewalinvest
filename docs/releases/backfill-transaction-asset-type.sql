-- Backfill asset_type_code for t_transaction_table
-- Run AFTER backfill-scheme-category.sql
-- This updates transactions to use the scheme's category instead of 'Growth'

BEGIN;

-- Step 1: Update asset_type_code from scheme's scheme_category
-- Join transaction -> scheme_details -> scheme_masters to get the category name
UPDATE t_transaction_table t
SET asset_type_code = sm.name
FROM t_scheme_details sd
JOIN t_scheme_masters sm ON sd.scheme_category_id = sm.id
WHERE t.scheme_code = sd.scheme_code
  AND sd.scheme_category_id IS NOT NULL
  AND (t.asset_type_code IS NULL OR t.asset_type_code = 'Growth');

-- Step 2: Show distribution after update
SELECT
    COALESCE(asset_type_code, 'NULL') as asset_type_code,
    COUNT(*) as count
FROM t_transaction_table
WHERE portfolio_flag = true
GROUP BY asset_type_code
ORDER BY count DESC
LIMIT 20;

COMMIT;
