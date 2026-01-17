-- ============================================================================
-- MIGRATION: Scheme-Based Asset Types
-- Version: 1.2
-- Date: 2026-01-17
--
-- Prerequisites:
--   1. DELETE from t_scheme_bookmarks
--   2. DELETE from t_nav_data
--   3. DELETE from t_transaction_table
--   4. DELETE from t_scheme_details
--
-- This migration:
--   - Inserts 42 scheme categories into m_asset_types
--   - Deactivates legacy 'MF' asset type
--   - Updates FK constraint to point to m_asset_types
--   - Updates process_single_scheme_record function
-- ============================================================================

BEGIN;

-- ============================================================================
-- STEP 1: Insert 42 Scheme Categories into m_asset_types
-- ============================================================================

-- Deactivate legacy MF asset type
UPDATE m_asset_types
SET is_active = false,
    description = COALESCE(description, '') || ' [DEPRECATED: Replaced by 42 scheme categories]',
    updated_at = CURRENT_TIMESTAMP
WHERE asset_type_code = 'MF';

-- Insert Debt Scheme categories
INSERT INTO m_asset_types (asset_type_code, asset_type_name, category, default_assumption_rate, is_active, display_order, description)
VALUES
  ('Debt Scheme - Banking and PSU Fund', 'Banking & PSU Fund', 'debt', 7, true, 101, 'Debt funds investing in banking and PSU securities'),
  ('Debt Scheme - Corporate Bond Fund', 'Corporate Bond Fund', 'debt', 7.5, true, 102, 'Debt funds investing in high-rated corporate bonds'),
  ('Debt Scheme - Credit Risk Fund', 'Credit Risk Fund', 'debt', 8, true, 103, 'Debt funds investing in lower-rated corporate bonds'),
  ('Debt Scheme - Dynamic Bond', 'Dynamic Bond', 'debt', 7, true, 104, 'Debt funds with flexible duration management'),
  ('Debt Scheme - Floater Fund', 'Floater Fund', 'debt', 6.5, true, 105, 'Debt funds investing in floating rate instruments'),
  ('Debt Scheme - Gilt Fund', 'Gilt Fund', 'debt', 7, true, 106, 'Debt funds investing in government securities'),
  ('Debt Scheme - Gilt Fund with 10 year constant duration', 'Gilt 10Y Duration', 'debt', 7, true, 107, 'Gilt funds maintaining 10-year duration'),
  ('Debt Scheme - Liquid Fund', 'Liquid Fund', 'debt', 5, true, 108, 'Highly liquid debt funds with short maturity'),
  ('Debt Scheme - Long Duration Fund', 'Long Duration Fund', 'debt', 7.5, true, 109, 'Debt funds with long average maturity'),
  ('Debt Scheme - Low Duration Fund', 'Low Duration Fund', 'debt', 6, true, 110, 'Debt funds with 6-12 month duration'),
  ('Debt Scheme - Medium Duration Fund', 'Medium Duration Fund', 'debt', 6.5, true, 111, 'Debt funds with 3-4 year duration'),
  ('Debt Scheme - Medium to Long Duration Fund', 'Medium to Long Duration', 'debt', 7, true, 112, 'Debt funds with 4-7 year duration'),
  ('Debt Scheme - Money Market Fund', 'Money Market Fund', 'debt', 5.5, true, 113, 'Funds investing in money market instruments'),
  ('Debt Scheme - Overnight Fund', 'Overnight Fund', 'debt', 4.5, true, 114, 'Funds investing in overnight securities'),
  ('Debt Scheme - Short Duration Fund', 'Short Duration Fund', 'debt', 6, true, 115, 'Debt funds with 1-3 year duration'),
  ('Debt Scheme - Ultra Short Duration Fund', 'Ultra Short Duration', 'debt', 5.5, true, 116, 'Debt funds with 3-6 month duration')
ON CONFLICT (asset_type_code) DO UPDATE SET
  asset_type_name = EXCLUDED.asset_type_name,
  category = EXCLUDED.category,
  default_assumption_rate = EXCLUDED.default_assumption_rate,
  is_active = EXCLUDED.is_active,
  updated_at = CURRENT_TIMESTAMP;

-- Insert Equity Scheme categories
INSERT INTO m_asset_types (asset_type_code, asset_type_name, category, default_assumption_rate, is_active, display_order, description)
VALUES
  ('Equity Scheme - Contra Fund', 'Contra Fund', 'equity', 12, true, 201, 'Equity funds following contrarian investment strategy'),
  ('Equity Scheme - Dividend Yield Fund', 'Dividend Yield Fund', 'equity', 11, true, 202, 'Equity funds focusing on high dividend yield stocks'),
  ('Equity Scheme - ELSS', 'ELSS Tax Saver', 'equity', 12, true, 203, 'Equity Linked Savings Scheme with 3-year lock-in'),
  ('Equity Scheme - Flexi Cap Fund', 'Flexi Cap Fund', 'equity', 12, true, 204, 'Equity funds with flexible market cap allocation'),
  ('Equity Scheme - Focused Fund', 'Focused Fund', 'equity', 13, true, 205, 'Concentrated equity funds with max 30 stocks'),
  ('Equity Scheme - Large & Mid Cap Fund', 'Large & Mid Cap Fund', 'equity', 12, true, 206, 'Equity funds investing in large and mid cap stocks'),
  ('Equity Scheme - Large Cap Fund', 'Large Cap Fund', 'equity', 11, true, 207, 'Equity funds investing in top 100 companies'),
  ('Equity Scheme - Mid Cap Fund', 'Mid Cap Fund', 'equity', 13, true, 208, 'Equity funds investing in mid-sized companies'),
  ('Equity Scheme - Multi Cap Fund', 'Multi Cap Fund', 'equity', 12, true, 209, 'Equity funds with mandatory allocation across market caps'),
  ('Equity Scheme - Sectoral/ Thematic', 'Sectoral/Thematic', 'equity', 14, true, 210, 'Equity funds focused on specific sectors or themes'),
  ('Equity Scheme - Small Cap Fund', 'Small Cap Fund', 'equity', 15, true, 211, 'Equity funds investing in small companies'),
  ('Equity Scheme - Value Fund', 'Value Fund', 'equity', 12, true, 212, 'Equity funds following value investing strategy')
ON CONFLICT (asset_type_code) DO UPDATE SET
  asset_type_name = EXCLUDED.asset_type_name,
  category = EXCLUDED.category,
  default_assumption_rate = EXCLUDED.default_assumption_rate,
  is_active = EXCLUDED.is_active,
  updated_at = CURRENT_TIMESTAMP;

-- Insert Hybrid Scheme categories
INSERT INTO m_asset_types (asset_type_code, asset_type_name, category, default_assumption_rate, is_active, display_order, description)
VALUES
  ('Hybrid Scheme - Aggressive Hybrid Fund', 'Aggressive Hybrid', 'hybrid', 11, true, 301, 'Hybrid funds with 65-80% equity allocation'),
  ('Hybrid Scheme - Arbitrage Fund', 'Arbitrage Fund', 'hybrid', 6, true, 302, 'Funds exploiting price differences across markets'),
  ('Hybrid Scheme - Balanced Hybrid Fund', 'Balanced Hybrid', 'hybrid', 10, true, 303, 'Hybrid funds with 40-60% equity allocation'),
  ('Hybrid Scheme - Conservative Hybrid Fund', 'Conservative Hybrid', 'hybrid', 8, true, 304, 'Hybrid funds with 10-25% equity allocation'),
  ('Hybrid Scheme - Dynamic Asset Allocation or Balanced Advantage', 'Dynamic BAF', 'hybrid', 10, true, 305, 'Funds dynamically managing equity-debt allocation'),
  ('Hybrid Scheme - Equity Savings', 'Equity Savings', 'hybrid', 9, true, 306, 'Funds with equity, arbitrage, and debt components'),
  ('Hybrid Scheme - Multi Asset Allocation', 'Multi Asset', 'hybrid', 10, true, 307, 'Funds investing in at least 3 asset classes')
ON CONFLICT (asset_type_code) DO UPDATE SET
  asset_type_name = EXCLUDED.asset_type_name,
  category = EXCLUDED.category,
  default_assumption_rate = EXCLUDED.default_assumption_rate,
  is_active = EXCLUDED.is_active,
  updated_at = CURRENT_TIMESTAMP;

-- Insert Other Scheme categories
INSERT INTO m_asset_types (asset_type_code, asset_type_name, category, default_assumption_rate, is_active, display_order, description)
VALUES
  ('Other Scheme - FoF Domestic', 'FoF Domestic', 'fof', 10, true, 401, 'Fund of Funds investing in domestic mutual funds'),
  ('Other Scheme - FoF Overseas', 'FoF Overseas', 'fof', 10, true, 402, 'Fund of Funds investing in international funds'),
  ('Other Scheme - Gold ETF', 'Gold ETF', 'commodity', 8, true, 403, 'Exchange Traded Funds tracking gold prices'),
  ('Other Scheme - Index Funds', 'Index Fund', 'equity', 11, true, 404, 'Passively managed funds tracking market indices'),
  ('Other Scheme - Other  ETFs', 'Other ETFs', 'equity', 11, true, 405, 'Other Exchange Traded Funds')
ON CONFLICT (asset_type_code) DO UPDATE SET
  asset_type_name = EXCLUDED.asset_type_name,
  category = EXCLUDED.category,
  default_assumption_rate = EXCLUDED.default_assumption_rate,
  is_active = EXCLUDED.is_active,
  updated_at = CURRENT_TIMESTAMP;

-- Insert Solution Oriented Scheme categories
INSERT INTO m_asset_types (asset_type_code, asset_type_name, category, default_assumption_rate, is_active, display_order, description)
VALUES
  ('Solution Oriented Scheme - Children s Fund', 'Children Fund', 'solution', 10, true, 501, 'Long-term funds for children education/marriage'),
  ('Solution Oriented Scheme - Retirement Fund', 'Retirement Fund', 'solution', 10, true, 502, 'Long-term funds for retirement planning')
ON CONFLICT (asset_type_code) DO UPDATE SET
  asset_type_name = EXCLUDED.asset_type_name,
  category = EXCLUDED.category,
  default_assumption_rate = EXCLUDED.default_assumption_rate,
  is_active = EXCLUDED.is_active,
  updated_at = CURRENT_TIMESTAMP;

-- Insert Legacy categories (for backward compatibility)
INSERT INTO m_asset_types (asset_type_code, asset_type_name, category, default_assumption_rate, is_active, display_order, description)
VALUES
  ('Growth', 'Growth', 'equity', 12, true, 601, 'Legacy/Default: Growth-oriented funds'),
  ('Income', 'Income', 'debt', 7.5, true, 602, 'Legacy: Income funds')
ON CONFLICT (asset_type_code) DO UPDATE SET
  is_active = EXCLUDED.is_active,
  updated_at = CURRENT_TIMESTAMP;

-- ============================================================================
-- STEP 2: Verify Seed Data
-- ============================================================================
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count FROM m_asset_types
  WHERE asset_type_code LIKE 'Debt Scheme%'
     OR asset_type_code LIKE 'Equity Scheme%'
     OR asset_type_code LIKE 'Hybrid Scheme%'
     OR asset_type_code LIKE 'Other Scheme%'
     OR asset_type_code LIKE 'Solution Oriented%'
     OR asset_type_code IN ('Growth', 'Income');

  IF v_count < 42 THEN
    RAISE EXCEPTION 'Expected at least 42 scheme categories, found %', v_count;
  END IF;

  RAISE NOTICE 'SUCCESS: % scheme categories found in m_asset_types', v_count;
END $$;

-- ============================================================================
-- STEP 3: Update FK Constraint
-- ============================================================================
ALTER TABLE t_scheme_details DROP CONSTRAINT IF EXISTS t_scheme_details_scheme_category_id_fkey;
ALTER TABLE t_scheme_details ADD CONSTRAINT t_scheme_details_scheme_category_id_fkey
  FOREIGN KEY (scheme_category_id) REFERENCES m_asset_types(id);

-- ============================================================================
-- STEP 4: Update process_single_scheme_record Function
-- ============================================================================
CREATE OR REPLACE FUNCTION process_single_scheme_record(p_staging_id INTEGER)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
    v_staging RECORD;
    v_mapped_data JSONB;
    v_scheme_id INTEGER;
    v_is_duplicate BOOLEAN;
    v_scheme_category_id INTEGER;
    v_launch_date DATE;
    v_closure_date DATE;
    v_minimum_amount DECIMAL(15,2);
BEGIN
    SELECT * INTO v_staging FROM t_import_staging_data WHERE id = p_staging_id;
    IF NOT FOUND THEN RETURN; END IF;

    UPDATE t_import_staging_data SET processing_status = 'processing' WHERE id = p_staging_id;
    v_mapped_data := v_staging.mapped_data;

    BEGIN
        -- Lookup scheme_category_id from m_asset_types
        v_scheme_category_id := NULL;
        IF v_mapped_data->>'scheme_category' IS NOT NULL AND TRIM(v_mapped_data->>'scheme_category') != '' THEN
            SELECT id INTO v_scheme_category_id FROM m_asset_types
            WHERE LOWER(TRIM(asset_type_code)) = LOWER(TRIM(v_mapped_data->>'scheme_category'))
              AND is_active = true LIMIT 1;
        END IF;

        -- Check duplicate
        SELECT COUNT(*) > 0 INTO v_is_duplicate FROM t_scheme_details
        WHERE scheme_code = v_mapped_data->>'scheme_code'
          AND tenant_id = v_staging.tenant_id AND is_live = v_staging.is_live;

        IF v_is_duplicate THEN
            UPDATE t_scheme_details SET
                amc_name = COALESCE(NULLIF(TRIM(v_mapped_data->>'amc_name'), ''), amc_name),
                scheme_name = COALESCE(NULLIF(TRIM(v_mapped_data->>'scheme_name'), ''), scheme_name),
                scheme_nav_name = COALESCE(NULLIF(TRIM(v_mapped_data->>'scheme_nav_name'), ''), scheme_nav_name),
                scheme_category_id = COALESCE(v_scheme_category_id, scheme_category_id),
                scheme_minimum_amount = CASE WHEN v_mapped_data->>'scheme_minimum_amount' IS NOT NULL
                    THEN (v_mapped_data->>'scheme_minimum_amount')::DECIMAL(15,2) ELSE scheme_minimum_amount END,
                isin_div_payout = COALESCE(NULLIF(TRIM(v_mapped_data->>'isin_div_payout'), ''), isin_div_payout),
                isin_growth = COALESCE(NULLIF(TRIM(v_mapped_data->>'isin_growth'), ''), isin_growth),
                isin_div_reinvestment = COALESCE(NULLIF(TRIM(v_mapped_data->>'isin_div_reinvestment'), ''), isin_div_reinvestment),
                updated_at = CURRENT_TIMESTAMP
            WHERE scheme_code = v_mapped_data->>'scheme_code'
              AND tenant_id = v_staging.tenant_id AND is_live = v_staging.is_live
            RETURNING id INTO v_scheme_id;

            UPDATE t_import_staging_data SET processing_status = 'duplicate',
                warnings = array_append(warnings, 'Scheme already exists - updated'),
                created_record_id = v_scheme_id, created_record_type = 'scheme',
                processed_at = CURRENT_TIMESTAMP WHERE id = p_staging_id;
            RETURN;
        END IF;

        -- Parse dates
        v_launch_date := NULL;
        IF v_mapped_data->>'launch_date' IS NOT NULL AND TRIM(v_mapped_data->>'launch_date') != '' THEN
            BEGIN v_launch_date := (v_mapped_data->>'launch_date')::DATE;
            EXCEPTION WHEN OTHERS THEN v_launch_date := NULL; END;
        END IF;

        v_closure_date := NULL;
        IF v_mapped_data->>'closure_date' IS NOT NULL AND TRIM(v_mapped_data->>'closure_date') != '' THEN
            BEGIN v_closure_date := (v_mapped_data->>'closure_date')::DATE;
            EXCEPTION WHEN OTHERS THEN v_closure_date := NULL; END;
        END IF;

        v_minimum_amount := NULL;
        IF v_mapped_data->>'scheme_minimum_amount' IS NOT NULL AND TRIM(v_mapped_data->>'scheme_minimum_amount') != '' THEN
            BEGIN v_minimum_amount := (v_mapped_data->>'scheme_minimum_amount')::DECIMAL(15,2);
            EXCEPTION WHEN OTHERS THEN v_minimum_amount := NULL; END;
        END IF;

        -- Insert new scheme
        INSERT INTO t_scheme_details (tenant_id, is_live, scheme_code, amc_name, scheme_name,
            scheme_nav_name, scheme_category_id, scheme_minimum_amount,
            launch_date, closure_date, isin_div_payout, isin_growth, isin_div_reinvestment,
            is_active, created_at)
        VALUES (v_staging.tenant_id, v_staging.is_live, v_mapped_data->>'scheme_code',
            NULLIF(TRIM(v_mapped_data->>'amc_name'), ''), NULLIF(TRIM(v_mapped_data->>'scheme_name'), ''),
            NULLIF(TRIM(v_mapped_data->>'scheme_nav_name'), ''), v_scheme_category_id,
            v_minimum_amount, v_launch_date, v_closure_date,
            NULLIF(TRIM(v_mapped_data->>'isin_div_payout'), ''),
            NULLIF(TRIM(v_mapped_data->>'isin_growth'), ''),
            NULLIF(TRIM(v_mapped_data->>'isin_div_reinvestment'), ''), true, CURRENT_TIMESTAMP)
        RETURNING id INTO v_scheme_id;

        UPDATE t_import_staging_data SET processing_status = 'success',
            created_record_id = v_scheme_id, created_record_type = 'scheme',
            processed_at = CURRENT_TIMESTAMP WHERE id = p_staging_id;

    EXCEPTION WHEN OTHERS THEN
        UPDATE t_import_staging_data SET processing_status = 'failed',
            error_messages = array_append(COALESCE(error_messages, ARRAY[]::TEXT[]), SQLERRM),
            processed_at = CURRENT_TIMESTAMP WHERE id = p_staging_id;
    END;
END;
$$;

-- ============================================================================
-- STEP 5: Final Verification
-- ============================================================================
DO $$
DECLARE
  v_mf_active BOOLEAN;
  v_fk_target TEXT;
BEGIN
  -- Check MF is inactive
  SELECT is_active INTO v_mf_active FROM m_asset_types WHERE asset_type_code = 'MF';
  IF v_mf_active THEN
    RAISE WARNING 'MF asset type is still active';
  ELSE
    RAISE NOTICE 'SUCCESS: MF asset type is inactive';
  END IF;

  -- Check FK target
  SELECT confrelid::regclass::text INTO v_fk_target
  FROM pg_constraint WHERE conname = 't_scheme_details_scheme_category_id_fkey';

  IF v_fk_target = 'm_asset_types' THEN
    RAISE NOTICE 'SUCCESS: FK points to m_asset_types';
  ELSE
    RAISE WARNING 'FK points to %, expected m_asset_types', v_fk_target;
  END IF;
END $$;

COMMIT;

-- ============================================================================
-- POST-MIGRATION VERIFICATION QUERIES (run manually)
-- ============================================================================
-- SELECT COUNT(*) as scheme_category_count FROM m_asset_types
-- WHERE asset_type_code LIKE '%Scheme%' OR asset_type_code IN ('Growth', 'Income');
--
-- SELECT * FROM m_asset_types WHERE asset_type_code = 'MF';
--
-- SELECT conname, confrelid::regclass FROM pg_constraint
-- WHERE conname = 't_scheme_details_scheme_category_id_fkey';
