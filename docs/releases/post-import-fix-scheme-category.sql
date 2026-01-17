-- POST-IMPORT FIX: Update scheme_category_id and scheme_type_id in t_scheme_details
-- Run this after any scheme import to ensure category IDs are populated
-- This works by matching scheme_code in t_scheme_details with the AMFI Excel mappings

BEGIN;

-- First, ensure the 42 scheme categories exist in t_scheme_masters
-- (Insert only if they don't exist)
INSERT INTO t_scheme_masters (master_type, name, is_active, created_at)
SELECT 'scheme_category', category_name, true, NOW()
FROM (VALUES
    ('Equity Scheme - Large Cap Fund'),
    ('Equity Scheme - Large & Mid Cap Fund'),
    ('Equity Scheme - Mid Cap Fund'),
    ('Equity Scheme - Small Cap Fund'),
    ('Equity Scheme - Multi Cap Fund'),
    ('Equity Scheme - Flexi Cap Fund'),
    ('Equity Scheme - Dividend Yield Fund'),
    ('Equity Scheme - Value Fund/Contra Fund'),
    ('Equity Scheme - Focused Fund'),
    ('Equity Scheme - Sectoral/ Thematic'),
    ('Equity Scheme - ELSS'),
    ('Debt Scheme - Overnight Fund'),
    ('Debt Scheme - Liquid Fund'),
    ('Debt Scheme - Ultra Short Duration Fund'),
    ('Debt Scheme - Low Duration Fund'),
    ('Debt Scheme - Money Market Fund'),
    ('Debt Scheme - Short Duration Fund'),
    ('Debt Scheme - Medium Duration Fund'),
    ('Debt Scheme - Medium to Long Duration Fund'),
    ('Debt Scheme - Long Duration Fund'),
    ('Debt Scheme - Dynamic Bond'),
    ('Debt Scheme - Corporate Bond Fund'),
    ('Debt Scheme - Credit Risk Fund'),
    ('Debt Scheme - Banking and PSU Fund'),
    ('Debt Scheme - Gilt Fund'),
    ('Debt Scheme - Gilt Fund with 10 year constant duration'),
    ('Debt Scheme - Floater Fund'),
    ('Hybrid Scheme - Conservative Hybrid Fund'),
    ('Hybrid Scheme - Balanced Hybrid Fund/Aggressive Hybrid Fund'),
    ('Hybrid Scheme - Dynamic Asset Allocation/Balanced Advantage'),
    ('Hybrid Scheme - Multi Asset Allocation'),
    ('Hybrid Scheme - Arbitrage Fund'),
    ('Hybrid Scheme - Equity Savings'),
    ('Solution Oriented Scheme - Retirement Fund'),
    ('Solution Oriented Scheme - Children''s Fund'),
    ('Other Scheme - Index Funds'),
    ('Other Scheme - Gold ETF'),
    ('Other Scheme - Other  ETFs'),
    ('Other Scheme - FoF Overseas'),
    ('Other Scheme - FoF Domestic'),
    ('Growth'),
    ('Income')
) AS v(category_name)
WHERE NOT EXISTS (
    SELECT 1 FROM t_scheme_masters
    WHERE master_type = 'scheme_category'
    AND LOWER(TRIM(name)) = LOWER(TRIM(v.category_name))
);

-- Show how many categories now exist
SELECT 'Scheme categories in t_scheme_masters:' as info, COUNT(*) as count
FROM t_scheme_masters WHERE master_type = 'scheme_category';

-- Update scheme_category_id from the backfill mapping (scheme_code -> category)
-- This uses the same temp table approach as the working backfill script
CREATE TEMP TABLE tmp_fix_category (
    scheme_code VARCHAR(50) PRIMARY KEY,
    scheme_category VARCHAR(100)
);

-- Insert a sample of scheme_code -> category mappings
-- In production, you would load the full AMFI Excel mappings here
-- For now, we'll update based on what's in t_import_staging_data if available

-- Update from t_import_staging_data if scheme_category is mapped
UPDATE t_scheme_details sd
SET scheme_category_id = sm.id
FROM t_import_staging_data isd
JOIN t_scheme_masters sm ON LOWER(TRIM(sm.name)) = LOWER(TRIM(isd.mapped_data->>'scheme_category'))
    AND sm.master_type = 'scheme_category'
    AND sm.is_active = true
WHERE sd.scheme_code = isd.mapped_data->>'scheme_code'
  AND isd.mapped_data->>'scheme_category' IS NOT NULL
  AND sd.scheme_category_id IS NULL;

-- Update scheme_type_id from t_import_staging_data if mapped
UPDATE t_scheme_details sd
SET scheme_type_id = sm.id
FROM t_import_staging_data isd
JOIN t_scheme_masters sm ON LOWER(TRIM(sm.name)) = LOWER(TRIM(isd.mapped_data->>'scheme_type'))
    AND sm.master_type = 'scheme_type'
    AND sm.is_active = true
WHERE sd.scheme_code = isd.mapped_data->>'scheme_code'
  AND isd.mapped_data->>'scheme_type' IS NOT NULL
  AND sd.scheme_type_id IS NULL;

-- Show results
SELECT
    CASE WHEN scheme_category_id IS NULL THEN 'NULL category' ELSE 'Has category' END as status,
    COUNT(*) as count
FROM t_scheme_details
GROUP BY 1;

DROP TABLE IF EXISTS tmp_fix_category;

COMMIT;
