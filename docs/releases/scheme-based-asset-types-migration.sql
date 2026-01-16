-- ============================================================================
-- MIGRATION: Scheme Category-Based Asset Types
-- Version: 3.0
-- Date: 2026-01-16
-- Description: Add 42 scheme categories for MF asset type classification
--              derived from Scheme Category column in import file
-- ============================================================================
--
-- PREREQUISITES:
-- 1. Backup your database before running this migration
-- 2. Run during maintenance window
--
-- WHAT THIS MIGRATION DOES:
-- 1. Expands VARCHAR columns to accommodate long scheme category names
-- 2. Adds asset_type_code column to transactions table
-- 3. Seeds 42 scheme categories in t_scheme_masters
-- 4. Seeds 42 scheme category asset types in m_asset_types
--
-- AFTER MIGRATION:
-- - For NEW TENANTS: Run seed-scheme-categories-for-tenant.sql
-- - Upload scheme master data (with Scheme Category column)
-- - Upload customer transactions
-- ============================================================================

BEGIN;

-- ============================================================================
-- STEP 1: Expand asset_type_code columns to VARCHAR(100)
-- ============================================================================
-- Some scheme category names are long, e.g.:
-- "Hybrid Scheme - Dynamic Asset Allocation or Balanced Advantage" = 62 chars

DO $$
BEGIN
    -- Expand m_asset_types.asset_type_code
    ALTER TABLE m_asset_types
    ALTER COLUMN asset_type_code TYPE VARCHAR(100);
    RAISE NOTICE '✓ Expanded m_asset_types.asset_type_code to VARCHAR(100)';
EXCEPTION
    WHEN others THEN
        RAISE NOTICE '→ m_asset_types.asset_type_code: %', SQLERRM;
END $$;

-- Expand t_monthly_portfolio_snapshots.asset_type_code
DO $$
BEGIN
    ALTER TABLE t_monthly_portfolio_snapshots
    ALTER COLUMN asset_type_code TYPE VARCHAR(100);
    RAISE NOTICE '✓ Expanded t_monthly_portfolio_snapshots.asset_type_code to VARCHAR(100)';
EXCEPTION
    WHEN others THEN
        RAISE NOTICE '→ t_monthly_portfolio_snapshots.asset_type_code: %', SQLERRM;
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
            'Asset type derived from scheme category (e.g., Equity Scheme - Large Cap Fund)';

        RAISE NOTICE '✓ Added asset_type_code column to t_transaction_table';
    ELSE
        -- Ensure column is wide enough
        ALTER TABLE t_transaction_table
        ALTER COLUMN asset_type_code TYPE VARCHAR(100);
        RAISE NOTICE '→ asset_type_code column already exists, expanded to VARCHAR(100)';
    END IF;
END $$;

-- ============================================================================
-- STEP 3: Insert 42 scheme categories into t_scheme_masters
-- ============================================================================
-- These are seeded for tenant_id=1. For other tenants, run:
-- seed-scheme-categories-for-tenant.sql

INSERT INTO t_scheme_masters (tenant_id, is_live, is_active, master_type, code, name, display_order)
VALUES
    -- Legacy categories (8) - for backward compatibility
    (1, true, true, 'scheme_category', 'ASSURED_RETURN', 'Assured Return', 1),
    (1, true, true, 'scheme_category', 'BALANCED', 'Balanced', 2),
    (1, true, true, 'scheme_category', 'ELSS', 'ELSS', 3),
    (1, true, true, 'scheme_category', 'GILT', 'Gilt', 4),
    (1, true, true, 'scheme_category', 'GROWTH', 'Growth', 5),
    (1, true, true, 'scheme_category', 'INCOME', 'Income', 6),
    (1, true, true, 'scheme_category', 'LIQUID', 'Liquid', 7),
    (1, true, true, 'scheme_category', 'MONEY_MARKET', 'Money Market', 8),

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
    RAISE NOTICE '✓ Scheme categories seeded: % (for tenant_id=1)', v_count;
END $$;

-- ============================================================================
-- STEP 4: Add 42 scheme category asset types to m_asset_types
-- ============================================================================
INSERT INTO m_asset_types (asset_type_code, asset_type_name, category, default_assumption_rate, display_order, is_active, description)
VALUES
    -- Legacy categories (8)
    ('Assured Return', 'Assured Return', 'debt', 7.00, 1, true, 'Legacy: Assured return schemes'),
    ('Balanced', 'Balanced', 'hybrid', 10.00, 2, true, 'Legacy: Balanced funds'),
    ('ELSS', 'ELSS', 'equity', 12.00, 3, true, 'Legacy: Equity Linked Savings Scheme'),
    ('Gilt', 'Gilt', 'debt', 7.00, 4, true, 'Legacy: Government securities funds'),
    ('Growth', 'Growth', 'equity', 12.00, 5, true, 'Legacy: Growth-oriented funds'),
    ('Income', 'Income', 'debt', 7.50, 6, true, 'Legacy: Income funds'),
    ('Liquid', 'Liquid', 'debt', 5.00, 7, true, 'Legacy: Liquid funds'),
    ('Money Market', 'Money Market', 'debt', 5.50, 8, true, 'Legacy: Money market funds'),

    -- Debt Scheme categories (16)
    ('Debt Scheme - Banking and PSU Fund', 'Banking & PSU Fund', 'debt', 7.00, 10, true,
     'Debt funds investing in banking and PSU securities'),
    ('Debt Scheme - Corporate Bond Fund', 'Corporate Bond Fund', 'debt', 7.50, 11, true,
     'Debt funds investing in high-rated corporate bonds'),
    ('Debt Scheme - Credit Risk Fund', 'Credit Risk Fund', 'debt', 8.00, 12, true,
     'Debt funds investing in lower-rated corporate bonds'),
    ('Debt Scheme - Dynamic Bond', 'Dynamic Bond', 'debt', 7.00, 13, true,
     'Debt funds with flexible duration management'),
    ('Debt Scheme - Floater Fund', 'Floater Fund', 'debt', 6.50, 14, true,
     'Debt funds investing in floating rate instruments'),
    ('Debt Scheme - Gilt Fund', 'Gilt Fund', 'debt', 7.00, 15, true,
     'Debt funds investing in government securities'),
    ('Debt Scheme - Gilt Fund with 10 year constant duration', 'Gilt 10Y Duration', 'debt', 7.00, 16, true,
     'Gilt funds maintaining 10-year duration'),
    ('Debt Scheme - Liquid Fund', 'Liquid Fund', 'debt', 5.00, 17, true,
     'Highly liquid debt funds'),
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

    -- Equity Scheme categories (12)
    ('Equity Scheme - Contra Fund', 'Contra Fund', 'equity', 12.00, 30, true,
     'Equity funds following contrarian strategy'),
    ('Equity Scheme - Dividend Yield Fund', 'Dividend Yield Fund', 'equity', 11.00, 31, true,
     'Equity funds focusing on dividend yield'),
    ('Equity Scheme - ELSS', 'ELSS Tax Saver', 'equity', 12.00, 32, true,
     'Equity Linked Savings Scheme with 3-year lock-in'),
    ('Equity Scheme - Flexi Cap Fund', 'Flexi Cap Fund', 'equity', 12.00, 33, true,
     'Equity funds with flexible market cap'),
    ('Equity Scheme - Focused Fund', 'Focused Fund', 'equity', 13.00, 34, true,
     'Concentrated equity funds with max 30 stocks'),
    ('Equity Scheme - Large & Mid Cap Fund', 'Large & Mid Cap Fund', 'equity', 12.00, 35, true,
     'Equity funds investing in large and mid caps'),
    ('Equity Scheme - Large Cap Fund', 'Large Cap Fund', 'equity', 11.00, 36, true,
     'Equity funds investing in top 100 companies'),
    ('Equity Scheme - Mid Cap Fund', 'Mid Cap Fund', 'equity', 13.00, 37, true,
     'Equity funds investing in mid-sized companies'),
    ('Equity Scheme - Multi Cap Fund', 'Multi Cap Fund', 'equity', 12.00, 38, true,
     'Equity funds with mandatory cross-cap allocation'),
    ('Equity Scheme - Sectoral/ Thematic', 'Sectoral/Thematic', 'equity', 14.00, 39, true,
     'Equity funds focused on sectors/themes'),
    ('Equity Scheme - Small Cap Fund', 'Small Cap Fund', 'equity', 15.00, 40, true,
     'Equity funds investing in small companies'),
    ('Equity Scheme - Value Fund', 'Value Fund', 'equity', 12.00, 41, true,
     'Equity funds following value investing'),

    -- Hybrid Scheme categories (7)
    ('Hybrid Scheme - Aggressive Hybrid Fund', 'Aggressive Hybrid', 'hybrid', 11.00, 50, true,
     'Hybrid funds with 65-80% equity'),
    ('Hybrid Scheme - Arbitrage Fund', 'Arbitrage Fund', 'hybrid', 6.00, 51, true,
     'Funds exploiting price differences'),
    ('Hybrid Scheme - Balanced Hybrid Fund', 'Balanced Hybrid', 'hybrid', 10.00, 52, true,
     'Hybrid funds with 40-60% equity'),
    ('Hybrid Scheme - Conservative Hybrid Fund', 'Conservative Hybrid', 'hybrid', 8.00, 53, true,
     'Hybrid funds with 10-25% equity'),
    ('Hybrid Scheme - Dynamic Asset Allocation or Balanced Advantage', 'Dynamic BAF', 'hybrid', 10.00, 54, true,
     'Funds dynamically managing equity-debt'),
    ('Hybrid Scheme - Equity Savings', 'Equity Savings', 'hybrid', 9.00, 55, true,
     'Funds with equity, arbitrage, debt'),
    ('Hybrid Scheme - Multi Asset Allocation', 'Multi Asset', 'hybrid', 10.00, 56, true,
     'Funds investing in 3+ asset classes'),

    -- Other Scheme categories (5)
    ('Other Scheme - FoF Domestic', 'FoF Domestic', 'fof', 10.00, 60, true,
     'Fund of Funds - domestic'),
    ('Other Scheme - FoF Overseas', 'FoF Overseas', 'fof', 10.00, 61, true,
     'Fund of Funds - international'),
    ('Other Scheme - Gold ETF', 'Gold ETF', 'commodity', 8.00, 62, true,
     'ETFs tracking gold prices'),
    ('Other Scheme - Index Funds', 'Index Fund', 'equity', 11.00, 63, true,
     'Passively managed index funds'),
    ('Other Scheme - Other  ETFs', 'Other ETFs', 'equity', 11.00, 64, true,
     'Other Exchange Traded Funds'),

    -- Solution Oriented Scheme categories (2)
    ('Solution Oriented Scheme - Children s Fund', 'Children Fund', 'solution', 10.00, 70, true,
     'Funds for children education'),
    ('Solution Oriented Scheme - Retirement Fund', 'Retirement Fund', 'solution', 10.00, 71, true,
     'Funds for retirement planning')
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
    WHERE (asset_type_code LIKE 'Equity Scheme%'
        OR asset_type_code LIKE 'Debt Scheme%'
        OR asset_type_code LIKE 'Hybrid Scheme%'
        OR asset_type_code LIKE 'Other Scheme%'
        OR asset_type_code LIKE 'Solution Oriented%'
        OR asset_type_code IN ('Assured Return', 'Balanced', 'ELSS', 'Gilt', 'Growth', 'Income', 'Liquid', 'Money Market'))
    AND is_active = true;
    RAISE NOTICE '✓ Scheme category asset types seeded: %', v_count;
END $$;

-- ============================================================================
-- VERIFICATION
-- ============================================================================
DO $$
DECLARE
    v_scheme_categories INTEGER;
    v_asset_types INTEGER;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'MIGRATION COMPLETE';
    RAISE NOTICE '========================================';

    SELECT COUNT(*) INTO v_scheme_categories
    FROM t_scheme_masters
    WHERE master_type = 'scheme_category' AND is_active = true;
    RAISE NOTICE '✓ Scheme categories in t_scheme_masters: %', v_scheme_categories;

    SELECT COUNT(*) INTO v_asset_types
    FROM m_asset_types WHERE is_active = true;
    RAISE NOTICE '✓ Asset types in m_asset_types: %', v_asset_types;

    RAISE NOTICE '';
    RAISE NOTICE 'NEXT STEPS:';
    RAISE NOTICE '1. For NEW TENANTS: Run seed-scheme-categories-for-tenant.sql';
    RAISE NOTICE '2. Upload scheme master data (CSV with Scheme Category column)';
    RAISE NOTICE '3. Upload customer transactions';
    RAISE NOTICE '========================================';
END $$;

COMMIT;
