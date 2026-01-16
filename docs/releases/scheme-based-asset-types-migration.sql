-- ============================================================================
-- MIGRATION: Scheme Category-Based Asset Types
-- Version: 2.0
-- Date: 2026-01-16
-- Description: Replace single 'MF' asset type with 50 scheme categories
--              derived from Scheme Category column in import file
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
-- STEP 1: Expand asset_type_code column in m_asset_types
-- ============================================================================
-- Some scheme category names exceed 50 chars (e.g., "Hybrid Scheme - Dynamic
-- Asset Allocation or Balanced Advantage" = 62 chars)
DO $$
BEGIN
    -- Expand m_asset_types.asset_type_code to VARCHAR(100)
    ALTER TABLE m_asset_types
    ALTER COLUMN asset_type_code TYPE VARCHAR(100);
    RAISE NOTICE '✓ Expanded m_asset_types.asset_type_code to VARCHAR(100)';
EXCEPTION
    WHEN others THEN
        RAISE NOTICE '→ m_asset_types.asset_type_code already expanded or error: %', SQLERRM;
END $$;

-- ============================================================================
-- STEP 2: Add asset_type_code column to t_transaction_table
-- ============================================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 't_transaction_table'
        AND column_name = 'asset_type_code'
    ) THEN
        ALTER TABLE t_transaction_table
        ADD COLUMN asset_type_code VARCHAR(100);

        COMMENT ON COLUMN t_transaction_table.asset_type_code IS
            'Asset type derived from scheme category during import (e.g., Equity Scheme - Large Cap Fund)';

        RAISE NOTICE '✓ Added asset_type_code column to t_transaction_table';
    ELSE
        RAISE NOTICE '→ asset_type_code column already exists in t_transaction_table';
    END IF;
END $$;

-- Also expand t_monthly_portfolio_snapshots.asset_type_code if needed
DO $$
BEGIN
    ALTER TABLE t_monthly_portfolio_snapshots
    ALTER COLUMN asset_type_code TYPE VARCHAR(100);
    RAISE NOTICE '✓ Expanded t_monthly_portfolio_snapshots.asset_type_code to VARCHAR(100)';
EXCEPTION
    WHEN others THEN
        RAISE NOTICE '→ t_monthly_portfolio_snapshots.asset_type_code already expanded or error: %', SQLERRM;
END $$;

-- ============================================================================
-- STEP 3: Insert all 42 scheme categories into t_scheme_masters
-- ============================================================================
INSERT INTO t_scheme_masters (tenant_id, is_live, is_active, master_type, code, name, display_order)
VALUES
    -- Debt Scheme categories (16)
    (1, true, true, 'scheme_category', 'DEBT_BANKING_PSU', 'Debt Scheme - Banking and PSU Fund', 10),
    (1, true, true, 'scheme_category', 'DEBT_CORPORATE_BOND', 'Debt Scheme - Corporate Bond Fund', 11),
    (1, true, true, 'scheme_category', 'DEBT_CREDIT_RISK', 'Debt Scheme - Credit Risk Fund', 12),
    (1, true, true, 'scheme_category', 'DEBT_DYNAMIC_BOND', 'Debt Scheme - Dynamic Bond', 13),
    (1, true, true, 'scheme_category', 'DEBT_FLOATER', 'Debt Scheme - Floater Fund', 14),
    (1, true, true, 'scheme_category', 'DEBT_GILT', 'Debt Scheme - Gilt Fund', 15),
    (1, true, true, 'scheme_category', 'DEBT_GILT_10Y', 'Debt Scheme - Gilt Fund with 10 year constant duration', 16),
    (1, true, true, 'scheme_category', 'DEBT_LIQUID', 'Debt Scheme - Liquid Fund', 17),
    (1, true, true, 'scheme_category', 'DEBT_LONG_DURATION', 'Debt Scheme - Long Duration Fund', 18),
    (1, true, true, 'scheme_category', 'DEBT_LOW_DURATION', 'Debt Scheme - Low Duration Fund', 19),
    (1, true, true, 'scheme_category', 'DEBT_MEDIUM_DURATION', 'Debt Scheme - Medium Duration Fund', 20),
    (1, true, true, 'scheme_category', 'DEBT_MEDIUM_LONG_DURATION', 'Debt Scheme - Medium to Long Duration Fund', 21),
    (1, true, true, 'scheme_category', 'DEBT_MONEY_MARKET', 'Debt Scheme - Money Market Fund', 22),
    (1, true, true, 'scheme_category', 'DEBT_OVERNIGHT', 'Debt Scheme - Overnight Fund', 23),
    (1, true, true, 'scheme_category', 'DEBT_SHORT_DURATION', 'Debt Scheme - Short Duration Fund', 24),
    (1, true, true, 'scheme_category', 'DEBT_ULTRA_SHORT', 'Debt Scheme - Ultra Short Duration Fund', 25),

    -- Equity Scheme categories (12)
    (1, true, true, 'scheme_category', 'EQUITY_CONTRA', 'Equity Scheme - Contra Fund', 30),
    (1, true, true, 'scheme_category', 'EQUITY_DIVIDEND_YIELD', 'Equity Scheme - Dividend Yield Fund', 31),
    (1, true, true, 'scheme_category', 'EQUITY_ELSS', 'Equity Scheme - ELSS', 32),
    (1, true, true, 'scheme_category', 'EQUITY_FLEXI_CAP', 'Equity Scheme - Flexi Cap Fund', 33),
    (1, true, true, 'scheme_category', 'EQUITY_FOCUSED', 'Equity Scheme - Focused Fund', 34),
    (1, true, true, 'scheme_category', 'EQUITY_LARGE_MID_CAP', 'Equity Scheme - Large & Mid Cap Fund', 35),
    (1, true, true, 'scheme_category', 'EQUITY_LARGE_CAP', 'Equity Scheme - Large Cap Fund', 36),
    (1, true, true, 'scheme_category', 'EQUITY_MID_CAP', 'Equity Scheme - Mid Cap Fund', 37),
    (1, true, true, 'scheme_category', 'EQUITY_MULTI_CAP', 'Equity Scheme - Multi Cap Fund', 38),
    (1, true, true, 'scheme_category', 'EQUITY_SECTORAL_THEMATIC', 'Equity Scheme - Sectoral/ Thematic', 39),
    (1, true, true, 'scheme_category', 'EQUITY_SMALL_CAP', 'Equity Scheme - Small Cap Fund', 40),
    (1, true, true, 'scheme_category', 'EQUITY_VALUE', 'Equity Scheme - Value Fund', 41),

    -- Hybrid Scheme categories (7)
    (1, true, true, 'scheme_category', 'HYBRID_AGGRESSIVE', 'Hybrid Scheme - Aggressive Hybrid Fund', 50),
    (1, true, true, 'scheme_category', 'HYBRID_ARBITRAGE', 'Hybrid Scheme - Arbitrage Fund', 51),
    (1, true, true, 'scheme_category', 'HYBRID_BALANCED', 'Hybrid Scheme - Balanced Hybrid Fund', 52),
    (1, true, true, 'scheme_category', 'HYBRID_CONSERVATIVE', 'Hybrid Scheme - Conservative Hybrid Fund', 53),
    (1, true, true, 'scheme_category', 'HYBRID_DYNAMIC_BAF', 'Hybrid Scheme - Dynamic Asset Allocation or Balanced Advantage', 54),
    (1, true, true, 'scheme_category', 'HYBRID_EQUITY_SAVINGS', 'Hybrid Scheme - Equity Savings', 55),
    (1, true, true, 'scheme_category', 'HYBRID_MULTI_ASSET', 'Hybrid Scheme - Multi Asset Allocation', 56),

    -- Other Scheme categories (5)
    (1, true, true, 'scheme_category', 'OTHER_FOF_DOMESTIC', 'Other Scheme - FoF Domestic', 60),
    (1, true, true, 'scheme_category', 'OTHER_FOF_OVERSEAS', 'Other Scheme - FoF Overseas', 61),
    (1, true, true, 'scheme_category', 'OTHER_GOLD_ETF', 'Other Scheme - Gold ETF', 62),
    (1, true, true, 'scheme_category', 'OTHER_INDEX_FUNDS', 'Other Scheme - Index Funds', 63),
    (1, true, true, 'scheme_category', 'OTHER_ETFS', 'Other Scheme - Other  ETFs', 64),

    -- Solution Oriented Scheme categories (2)
    (1, true, true, 'scheme_category', 'SOLUTION_CHILDREN', 'Solution Oriented Scheme - Children s Fund', 70),
    (1, true, true, 'scheme_category', 'SOLUTION_RETIREMENT', 'Solution Oriented Scheme - Retirement Fund', 71)
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
    WHERE master_type = 'scheme_category' AND is_active = true;
    RAISE NOTICE '✓ Scheme categories in t_scheme_masters: %', v_count;
END $$;

-- ============================================================================
-- STEP 4: Add all 42 scheme category asset types to m_asset_types
-- ============================================================================
INSERT INTO m_asset_types (asset_type_code, asset_type_name, category, default_assumption_rate, display_order, is_active, description)
VALUES
    -- Debt Scheme categories (16) - rates: 4.5% - 8%
    ('Debt Scheme - Banking and PSU Fund', 'Banking & PSU Fund', 'debt', 7.00, 10, true,
     'Debt funds investing in banking and PSU securities'),
    ('Debt Scheme - Corporate Bond Fund', 'Corporate Bond Fund', 'debt', 7.50, 11, true,
     'Debt funds investing in high-rated corporate bonds'),
    ('Debt Scheme - Credit Risk Fund', 'Credit Risk Fund', 'debt', 8.00, 12, true,
     'Debt funds investing in lower-rated corporate bonds for higher yield'),
    ('Debt Scheme - Dynamic Bond', 'Dynamic Bond', 'debt', 7.00, 13, true,
     'Debt funds with flexible duration management'),
    ('Debt Scheme - Floater Fund', 'Floater Fund', 'debt', 6.50, 14, true,
     'Debt funds investing in floating rate instruments'),
    ('Debt Scheme - Gilt Fund', 'Gilt Fund', 'debt', 7.00, 15, true,
     'Debt funds investing in government securities'),
    ('Debt Scheme - Gilt Fund with 10 year constant duration', 'Gilt 10Y Duration', 'debt', 7.00, 16, true,
     'Gilt funds maintaining 10-year duration'),
    ('Debt Scheme - Liquid Fund', 'Liquid Fund', 'debt', 5.00, 17, true,
     'Highly liquid debt funds with short maturity'),
    ('Debt Scheme - Long Duration Fund', 'Long Duration Fund', 'debt', 7.50, 18, true,
     'Debt funds with long average maturity'),
    ('Debt Scheme - Low Duration Fund', 'Low Duration Fund', 'debt', 6.00, 19, true,
     'Debt funds with 6-12 month duration'),
    ('Debt Scheme - Medium Duration Fund', 'Medium Duration Fund', 'debt', 6.50, 20, true,
     'Debt funds with 3-4 year duration'),
    ('Debt Scheme - Medium to Long Duration Fund', 'Medium to Long Duration', 'debt', 7.00, 21, true,
     'Debt funds with 4-7 year duration'),
    ('Debt Scheme - Money Market Fund', 'Money Market Fund', 'debt', 5.50, 22, true,
     'Funds investing in money market instruments'),
    ('Debt Scheme - Overnight Fund', 'Overnight Fund', 'debt', 4.50, 23, true,
     'Funds investing in overnight securities'),
    ('Debt Scheme - Short Duration Fund', 'Short Duration Fund', 'debt', 6.00, 24, true,
     'Debt funds with 1-3 year duration'),
    ('Debt Scheme - Ultra Short Duration Fund', 'Ultra Short Duration', 'debt', 5.50, 25, true,
     'Debt funds with 3-6 month duration'),

    -- Equity Scheme categories (12) - rates: 11% - 15%
    ('Equity Scheme - Contra Fund', 'Contra Fund', 'equity', 12.00, 30, true,
     'Equity funds following contrarian investment strategy'),
    ('Equity Scheme - Dividend Yield Fund', 'Dividend Yield Fund', 'equity', 11.00, 31, true,
     'Equity funds focusing on high dividend yield stocks'),
    ('Equity Scheme - ELSS', 'ELSS Tax Saver', 'equity', 12.00, 32, true,
     'Equity Linked Savings Scheme with 3-year lock-in'),
    ('Equity Scheme - Flexi Cap Fund', 'Flexi Cap Fund', 'equity', 12.00, 33, true,
     'Equity funds with flexible market cap allocation'),
    ('Equity Scheme - Focused Fund', 'Focused Fund', 'equity', 13.00, 34, true,
     'Concentrated equity funds with max 30 stocks'),
    ('Equity Scheme - Large & Mid Cap Fund', 'Large & Mid Cap Fund', 'equity', 12.00, 35, true,
     'Equity funds investing in large and mid cap stocks'),
    ('Equity Scheme - Large Cap Fund', 'Large Cap Fund', 'equity', 11.00, 36, true,
     'Equity funds investing in top 100 companies'),
    ('Equity Scheme - Mid Cap Fund', 'Mid Cap Fund', 'equity', 13.00, 37, true,
     'Equity funds investing in mid-sized companies'),
    ('Equity Scheme - Multi Cap Fund', 'Multi Cap Fund', 'equity', 12.00, 38, true,
     'Equity funds with mandatory allocation across market caps'),
    ('Equity Scheme - Sectoral/ Thematic', 'Sectoral/Thematic', 'equity', 14.00, 39, true,
     'Equity funds focused on specific sectors or themes'),
    ('Equity Scheme - Small Cap Fund', 'Small Cap Fund', 'equity', 15.00, 40, true,
     'Equity funds investing in small companies'),
    ('Equity Scheme - Value Fund', 'Value Fund', 'equity', 12.00, 41, true,
     'Equity funds following value investing strategy'),

    -- Hybrid Scheme categories (7) - rates: 6% - 11%
    ('Hybrid Scheme - Aggressive Hybrid Fund', 'Aggressive Hybrid', 'hybrid', 11.00, 50, true,
     'Hybrid funds with 65-80% equity allocation'),
    ('Hybrid Scheme - Arbitrage Fund', 'Arbitrage Fund', 'hybrid', 6.00, 51, true,
     'Funds exploiting price differences across markets'),
    ('Hybrid Scheme - Balanced Hybrid Fund', 'Balanced Hybrid', 'hybrid', 10.00, 52, true,
     'Hybrid funds with 40-60% equity allocation'),
    ('Hybrid Scheme - Conservative Hybrid Fund', 'Conservative Hybrid', 'hybrid', 8.00, 53, true,
     'Hybrid funds with 10-25% equity allocation'),
    ('Hybrid Scheme - Dynamic Asset Allocation or Balanced Advantage', 'Dynamic BAF', 'hybrid', 10.00, 54, true,
     'Funds dynamically managing equity-debt allocation'),
    ('Hybrid Scheme - Equity Savings', 'Equity Savings', 'hybrid', 9.00, 55, true,
     'Funds with equity, arbitrage, and debt components'),
    ('Hybrid Scheme - Multi Asset Allocation', 'Multi Asset', 'hybrid', 10.00, 56, true,
     'Funds investing in at least 3 asset classes'),

    -- Other Scheme categories (5) - rates: 8% - 11%
    ('Other Scheme - FoF Domestic', 'FoF Domestic', 'fof', 10.00, 60, true,
     'Fund of Funds investing in domestic mutual funds'),
    ('Other Scheme - FoF Overseas', 'FoF Overseas', 'fof', 10.00, 61, true,
     'Fund of Funds investing in international funds'),
    ('Other Scheme - Gold ETF', 'Gold ETF', 'commodity', 8.00, 62, true,
     'Exchange Traded Funds tracking gold prices'),
    ('Other Scheme - Index Funds', 'Index Fund', 'equity', 11.00, 63, true,
     'Passively managed funds tracking market indices'),
    ('Other Scheme - Other  ETFs', 'Other ETFs', 'equity', 11.00, 64, true,
     'Other Exchange Traded Funds'),

    -- Solution Oriented Scheme categories (2) - rate: 10%
    ('Solution Oriented Scheme - Children s Fund', 'Children Fund', 'solution', 10.00, 70, true,
     'Long-term funds for children education/marriage'),
    ('Solution Oriented Scheme - Retirement Fund', 'Retirement Fund', 'solution', 10.00, 71, true,
     'Long-term funds for retirement planning')
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
    WHERE asset_type_code LIKE 'Equity Scheme%'
       OR asset_type_code LIKE 'Debt Scheme%'
       OR asset_type_code LIKE 'Hybrid Scheme%'
       OR asset_type_code LIKE 'Other Scheme%'
       OR asset_type_code LIKE 'Solution Oriented%';
    RAISE NOTICE '✓ Scheme category asset types added: %', v_count;
END $$;

-- ============================================================================
-- STEP 5: Backfill asset_type_code for existing transactions
-- ============================================================================
-- This updates all transactions that have a scheme_code linked to a scheme
-- with a known scheme_category. Uses the scheme's scheme_category_id to
-- determine the asset_type_code.

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

    -- Update transactions with scheme_category lookup
    UPDATE t_transaction_table t
    SET asset_type_code = sm.name
    FROM t_scheme_details sd
    JOIN t_scheme_masters sm ON sd.scheme_category_id = sm.id
    WHERE t.scheme_code = sd.scheme_code
      AND t.asset_type_code IS NULL
      AND sm.master_type = 'scheme_category';

    GET DIAGNOSTICS v_updated_count = ROW_COUNT;
    RAISE NOTICE '✓ Updated % transactions with scheme_category lookup', v_updated_count;

    -- Default remaining NULL values to 'Growth' (common legacy category)
    UPDATE t_transaction_table
    SET asset_type_code = 'Growth'
    WHERE asset_type_code IS NULL;

    GET DIAGNOSTICS v_updated_count = ROW_COUNT;
    IF v_updated_count > 0 THEN
        RAISE NOTICE '✓ Defaulted % transactions to Growth (scheme_category not found)', v_updated_count;
    END IF;
END $$;

-- ============================================================================
-- STEP 6: Update existing portfolio snapshots from 'MF' to a default category
-- ============================================================================
-- Since we can't determine original scheme category from aggregated snapshots,
-- we default all 'MF' snapshots to 'Growth' (common legacy category)

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

        -- Update MF to Growth
        UPDATE t_monthly_portfolio_snapshots
        SET asset_type_code = 'Growth'
        WHERE asset_type_code = 'MF';

        GET DIAGNOSTICS v_updated = ROW_COUNT;
        RAISE NOTICE '✓ Updated % snapshots from MF to Growth', v_updated;
    ELSE
        RAISE NOTICE '→ No snapshots with MF found (already migrated or clean DB)';
    END IF;
END $$;

-- ============================================================================
-- STEP 7: Deactivate old 'MF' asset type (if exists)
-- ============================================================================
UPDATE m_asset_types
SET is_active = false,
    description = COALESCE(description, '') || ' [DEPRECATED: Replaced by 50 scheme categories]'
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
-- STEP 8: Update function process_transaction_import_session
-- ============================================================================
-- This requires recreating the function with the new logic
-- The function should already be updated in 04_functions_views_policies.sql
--
-- Key changes to the function:
-- 1. Added variables: v_asset_type_id, v_asset_type_code
-- 2. Added lookup: scheme_category_id -> t_scheme_masters.name -> m_asset_types
-- 3. Added asset_type_code to INSERT statement
--
-- If function not updated, run the distribution script:
-- \i 'backend/db/ditribution scripts/04_functions_views_policies.sql'

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '⚠️  IMPORTANT: Ensure process_transaction_import_session function is updated!';
    RAISE NOTICE '    Run: \i ''backend/db/ditribution scripts/04_functions_views_policies.sql''';
    RAISE NOTICE '';
END $$;

-- ============================================================================
-- STEP 9: Verification
-- ============================================================================
DO $$
DECLARE
    v_txn_null_count INTEGER;
    v_snapshot_mf_count INTEGER;
    v_scheme_categories_count INTEGER;
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

    -- Check scheme categories
    SELECT COUNT(*) INTO v_scheme_categories_count
    FROM t_scheme_masters
    WHERE master_type = 'scheme_category' AND is_active = true;
    RAISE NOTICE '✓ Active scheme categories: %', v_scheme_categories_count;

    -- Check asset types
    SELECT COUNT(*) INTO v_asset_types_count
    FROM m_asset_types
    WHERE (asset_type_code LIKE 'Equity Scheme%'
        OR asset_type_code LIKE 'Debt Scheme%'
        OR asset_type_code LIKE 'Hybrid Scheme%'
        OR asset_type_code LIKE 'Other Scheme%'
        OR asset_type_code LIKE 'Solution Oriented%')
    AND is_active = true;
    RAISE NOTICE '✓ Scheme category asset types active: %', v_asset_types_count;

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
WHERE asset_type_code LIKE 'Equity Scheme%'
   OR asset_type_code LIKE 'Debt Scheme%'
   OR asset_type_code LIKE 'Hybrid Scheme%'
   OR asset_type_code LIKE 'Other Scheme%'
   OR asset_type_code LIKE 'Solution Oriented%'
   OR asset_type_code = 'Growth';

-- Reactivate MF asset type
UPDATE m_asset_types
SET is_active = true,
    description = REPLACE(description, ' [DEPRECATED: Replaced by 50 scheme categories]', '')
WHERE asset_type_code = 'MF';

-- Deactivate new scheme category asset types
UPDATE m_asset_types
SET is_active = false
WHERE asset_type_code LIKE 'Equity Scheme%'
   OR asset_type_code LIKE 'Debt Scheme%'
   OR asset_type_code LIKE 'Hybrid Scheme%'
   OR asset_type_code LIKE 'Other Scheme%'
   OR asset_type_code LIKE 'Solution Oriented%';

-- Deactivate scheme categories in t_scheme_masters
UPDATE t_scheme_masters
SET is_active = false
WHERE master_type = 'scheme_category';

-- Note: Column t_transaction_table.asset_type_code is kept (nullable, harmless)
-- To remove: ALTER TABLE t_transaction_table DROP COLUMN asset_type_code;

COMMIT;

-- RAISE NOTICE 'Rollback completed. MF asset type restored.';
*/
