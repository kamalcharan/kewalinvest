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

-- ============================================================================
-- STEP 6: Fix Transaction Import - Use scheme_category_id (v1.3 fix)
-- Key change: sd.asset_type_id → sd.scheme_category_id
-- The RPC function now uses scheme_category_id to lookup asset_type_code
-- ============================================================================
CREATE OR REPLACE FUNCTION process_transaction_import_session(
    p_session_id INTEGER,
    p_customer_lookup_method VARCHAR DEFAULT 'iwell_code'
)
RETURNS TABLE(
    total_processed INTEGER,
    successful INTEGER,
    failed INTEGER,
    duplicates INTEGER,
    orphans INTEGER,
    processing_time_seconds NUMERIC
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_start_time TIMESTAMP := NOW();
    v_batch_size INTEGER := 500;
    v_staging_record RECORD;
    v_success_count INTEGER := 0;
    v_failed_count INTEGER := 0;
    v_duplicate_count INTEGER := 0;
    v_orphan_count INTEGER := 0;
    v_processed_count INTEGER := 0;
    v_customer_id INTEGER;
    v_scheme_id INTEGER;
    v_scheme_code VARCHAR;
    v_scheme_name VARCHAR;
    v_bookmark_id INTEGER;
    v_txn_type_id INTEGER;
    v_error_msg TEXT;
    v_txn_id INTEGER;
    v_session_info RECORD;
    v_asset_type_id INTEGER;
    v_asset_type_code VARCHAR;
    v_existing_assignment_id INTEGER;
    v_customer_name VARCHAR;
    v_new_assignment_id INTEGER;
    v_session_creator_id INTEGER;
    v_txn_amount NUMERIC;
BEGIN
    SELECT tenant_id, is_live, created_by INTO v_session_info
    FROM t_import_sessions WHERE id = p_session_id;

    IF NOT FOUND THEN RAISE EXCEPTION 'Session % not found', p_session_id; END IF;

    v_session_creator_id := COALESCE(v_session_info.created_by, 1);

    UPDATE t_import_sessions SET status = 'processing', processing_started_at = NOW()
    WHERE id = p_session_id;

    FOR v_staging_record IN (
        SELECT id, row_number, mapped_data, tenant_id, is_live
        FROM t_import_staging_data
        WHERE session_id = p_session_id AND processing_status = 'pending'
        ORDER BY id
    ) LOOP
        BEGIN
            v_customer_id := NULL; v_scheme_id := NULL; v_scheme_code := NULL;
            v_scheme_name := NULL; v_bookmark_id := NULL; v_txn_type_id := NULL;
            v_error_msg := NULL; v_customer_name := NULL; v_existing_assignment_id := NULL;
            v_new_assignment_id := NULL; v_txn_amount := NULL;
            v_asset_type_id := NULL; v_asset_type_code := NULL;

            -- CUSTOMER LOOKUP
            IF p_customer_lookup_method = 'iwell_code' THEN
                IF v_staging_record.mapped_data->>'iwell_code' IS NOT NULL THEN
                    SELECT c.id INTO v_customer_id FROM t_customers c
                    WHERE c.tenant_id = v_staging_record.tenant_id
                      AND c.is_live = v_staging_record.is_live
                      AND UPPER(c.iwell_code) = UPPER(v_staging_record.mapped_data->>'iwell_code')
                      AND c.is_active = true LIMIT 1;

                    IF v_customer_id IS NULL AND v_staging_record.mapped_data->>'pan' IS NOT NULL THEN
                        SELECT c.id INTO v_customer_id FROM t_customers c
                        WHERE c.tenant_id = v_staging_record.tenant_id
                          AND c.is_live = v_staging_record.is_live
                          AND UPPER(c.pan) = UPPER(v_staging_record.mapped_data->>'pan')
                          AND c.is_active = true LIMIT 1;
                    END IF;

                    IF v_customer_id IS NULL THEN
                        v_error_msg := 'No customer found with IWELL code: ' || (v_staging_record.mapped_data->>'iwell_code');
                    END IF;
                ELSE
                    v_error_msg := 'IWELL code is required';
                END IF;
            ELSIF p_customer_lookup_method = 'customer_name' THEN
                IF v_staging_record.mapped_data->>'customer_name' IS NOT NULL THEN
                    SELECT c.id INTO v_customer_id FROM t_customers c
                    INNER JOIN t_contacts ct ON ct.id = c.contact_id
                    WHERE c.tenant_id = v_staging_record.tenant_id
                      AND c.is_live = v_staging_record.is_live
                      AND ct.normalized_name = normalize_customer_name(v_staging_record.mapped_data->>'customer_name')
                      AND c.is_active = true LIMIT 1;

                    IF v_customer_id IS NULL AND v_staging_record.mapped_data->>'pan' IS NOT NULL THEN
                        SELECT c.id INTO v_customer_id FROM t_customers c
                        WHERE c.tenant_id = v_staging_record.tenant_id
                          AND c.is_live = v_staging_record.is_live
                          AND UPPER(c.pan) = UPPER(v_staging_record.mapped_data->>'pan')
                          AND c.is_active = true LIMIT 1;
                    END IF;

                    IF v_customer_id IS NULL THEN
                        v_error_msg := 'No customer found with name: ' || (v_staging_record.mapped_data->>'customer_name');
                    END IF;
                ELSE
                    v_error_msg := 'Customer name is required';
                END IF;
            ELSIF p_customer_lookup_method = 'both' THEN
                IF v_staging_record.mapped_data->>'iwell_code' IS NOT NULL THEN
                    SELECT c.id INTO v_customer_id FROM t_customers c
                    WHERE c.tenant_id = v_staging_record.tenant_id
                      AND c.is_live = v_staging_record.is_live
                      AND UPPER(c.iwell_code) = UPPER(v_staging_record.mapped_data->>'iwell_code')
                      AND c.is_active = true LIMIT 1;
                END IF;

                IF v_customer_id IS NULL AND v_staging_record.mapped_data->>'customer_name' IS NOT NULL THEN
                    SELECT c.id INTO v_customer_id FROM t_customers c
                    INNER JOIN t_contacts ct ON ct.id = c.contact_id
                    WHERE c.tenant_id = v_staging_record.tenant_id
                      AND c.is_live = v_staging_record.is_live
                      AND ct.normalized_name = normalize_customer_name(v_staging_record.mapped_data->>'customer_name')
                      AND c.is_active = true LIMIT 1;
                END IF;

                IF v_customer_id IS NULL AND v_staging_record.mapped_data->>'pan' IS NOT NULL THEN
                    SELECT c.id INTO v_customer_id FROM t_customers c
                    WHERE c.tenant_id = v_staging_record.tenant_id
                      AND c.is_live = v_staging_record.is_live
                      AND UPPER(c.pan) = UPPER(v_staging_record.mapped_data->>'pan')
                      AND c.is_active = true LIMIT 1;
                END IF;

                IF v_customer_id IS NULL THEN v_error_msg := 'No customer found'; END IF;
            END IF;

            IF v_customer_id IS NULL THEN
                UPDATE t_import_staging_data SET processing_status = 'orphan',
                    error_messages = ARRAY[v_error_msg], processed_at = NOW()
                WHERE id = v_staging_record.id;
                v_orphan_count := v_orphan_count + 1;
                v_processed_count := v_processed_count + 1;
                CONTINUE;
            END IF;

            SELECT ct.name INTO v_customer_name FROM t_customers c
            INNER JOIN t_contacts ct ON ct.id = c.contact_id WHERE c.id = v_customer_id;

            -- TRANSACTION TYPE LOOKUP
            IF v_staging_record.mapped_data->>'txn_code' IS NOT NULL
               AND TRIM(v_staging_record.mapped_data->>'txn_code') != '' THEN
                SELECT id INTO v_txn_type_id FROM m_transaction_types
                WHERE UPPER(TRIM(txn_code)) = UPPER(TRIM(v_staging_record.mapped_data->>'txn_code'))
                  AND is_active = true LIMIT 1;

                IF v_txn_type_id IS NULL THEN
                    SELECT id INTO v_txn_type_id FROM m_transaction_types
                    WHERE UPPER(TRIM(txn_name)) = UPPER(TRIM(v_staging_record.mapped_data->>'txn_code'))
                      AND is_active = true LIMIT 1;
                END IF;

                IF v_txn_type_id IS NULL THEN
                    UPDATE t_import_staging_data SET processing_status = 'failed',
                        error_messages = ARRAY['Invalid txn_code: ' || v_staging_record.mapped_data->>'txn_code'],
                        processed_at = NOW() WHERE id = v_staging_record.id;
                    v_failed_count := v_failed_count + 1;
                    v_processed_count := v_processed_count + 1;
                    CONTINUE;
                END IF;
            ELSE
                UPDATE t_import_staging_data SET processing_status = 'failed',
                    error_messages = ARRAY['txn_code is required'], processed_at = NOW()
                WHERE id = v_staging_record.id;
                v_failed_count := v_failed_count + 1;
                v_processed_count := v_processed_count + 1;
                CONTINUE;
            END IF;

            -- SCHEME LOOKUP
            IF v_staging_record.mapped_data->>'scheme_name' IS NOT NULL THEN
                SELECT sa.scheme_id, sb.id, sb.scheme_code, sb.scheme_name
                INTO v_scheme_id, v_bookmark_id, v_scheme_code, v_scheme_name
                FROM t_scheme_aliases sa
                JOIN t_scheme_bookmarks sb ON sb.scheme_id = sa.scheme_id
                    AND sb.tenant_id = v_staging_record.tenant_id
                    AND sb.is_live = v_staging_record.is_live AND sb.is_active = true
                WHERE sa.is_active = true
                  AND LOWER(TRIM(sa.alias_name)) = LOWER(TRIM(v_staging_record.mapped_data->>'scheme_name'))
                LIMIT 1;

                IF v_scheme_id IS NULL THEN
                    SELECT sa.scheme_id INTO v_scheme_id FROM t_scheme_aliases sa
                    WHERE sa.is_active = true
                      AND LOWER(TRIM(sa.alias_name)) = LOWER(TRIM(v_staging_record.mapped_data->>'scheme_name'))
                    LIMIT 1;
                    IF v_scheme_id IS NOT NULL THEN
                        SELECT scheme_name INTO v_scheme_name FROM t_scheme_details WHERE id = v_scheme_id;
                    END IF;
                END IF;

                -- v1.3 FIX: Use scheme_category_id instead of asset_type_id
                IF v_bookmark_id IS NOT NULL THEN
                    SELECT mat.asset_type_code, mat.id INTO v_asset_type_code, v_asset_type_id
                    FROM t_scheme_details sd
                    JOIN m_asset_types mat ON sd.scheme_category_id = mat.id AND mat.is_active = true
                    WHERE sd.id = v_scheme_id;

                    IF v_asset_type_code IS NULL THEN
                        SELECT asset_type_code, id INTO v_asset_type_code, v_asset_type_id
                        FROM m_asset_types WHERE asset_type_code = 'Growth' AND is_active = true LIMIT 1;
                    END IF;
                END IF;
            END IF;

            IF v_bookmark_id IS NULL OR v_scheme_code IS NULL THEN
                UPDATE t_import_staging_data SET processing_status = 'failed',
                    error_messages = ARRAY['Scheme not bookmarked: ' || COALESCE(v_scheme_name, v_staging_record.mapped_data->>'scheme_name', 'N/A')],
                    processed_at = NOW() WHERE id = v_staging_record.id;
                v_failed_count := v_failed_count + 1;
                v_processed_count := v_processed_count + 1;
                CONTINUE;
            END IF;

            -- DUPLICATE CHECK
            IF EXISTS (SELECT 1 FROM t_transaction_table
                WHERE customer_id = v_customer_id AND tenant_id = v_staging_record.tenant_id
                  AND is_live = v_staging_record.is_live
                  AND txn_date = (v_staging_record.mapped_data->>'txn_date')::DATE
                  AND total_amount = (v_staging_record.mapped_data->>'total_amount')::NUMERIC
                  AND scheme_id = v_scheme_id) THEN
                UPDATE t_import_staging_data SET processing_status = 'duplicate', processed_at = NOW()
                WHERE id = v_staging_record.id;
                v_duplicate_count := v_duplicate_count + 1;
                v_processed_count := v_processed_count + 1;
                CONTINUE;
            END IF;

            v_txn_amount := COALESCE(NULLIF(v_staging_record.mapped_data->>'total_amount', '')::NUMERIC, 0);

            -- PORTFOLIO ENTRY
            INSERT INTO t_customer_master_portfolio (tenant_id, is_live, customer_id, scheme_code, scheme_name, folio_no, start_date)
            VALUES (v_staging_record.tenant_id, v_staging_record.is_live, v_customer_id, v_scheme_code, v_scheme_name,
                v_staging_record.mapped_data->>'folio_no', (v_staging_record.mapped_data->>'txn_date')::DATE)
            ON CONFLICT (customer_id, scheme_code, tenant_id, is_live) DO UPDATE SET
                scheme_name = EXCLUDED.scheme_name,
                folio_no = COALESCE(EXCLUDED.folio_no, t_customer_master_portfolio.folio_no),
                updated_at = CURRENT_TIMESTAMP;

            -- INSERT TRANSACTION
            INSERT INTO t_transaction_table (tenant_id, is_live, is_active, customer_id, scheme_id, scheme_code,
                scheme_name, folio_no, txn_type_id, txn_date, total_amount, units, nav, stamp_duty, stt, tds,
                txn_description, txn_source, staging_record_id, import_session_id, asset_type_code, created_at, updated_at)
            VALUES (v_staging_record.tenant_id, v_staging_record.is_live, true, v_customer_id, v_scheme_id, v_scheme_code,
                v_scheme_name, v_staging_record.mapped_data->>'folio_no', v_txn_type_id,
                (v_staging_record.mapped_data->>'txn_date')::DATE, (v_staging_record.mapped_data->>'total_amount')::NUMERIC,
                NULLIF(v_staging_record.mapped_data->>'units', '')::NUMERIC,
                NULLIF(v_staging_record.mapped_data->>'nav', '')::NUMERIC,
                NULLIF(v_staging_record.mapped_data->>'stamp_duty', '')::NUMERIC,
                NULLIF(v_staging_record.mapped_data->>'stt', '')::NUMERIC,
                NULLIF(v_staging_record.mapped_data->>'tds', '')::NUMERIC,
                v_staging_record.mapped_data->>'txn_description', 'import',
                v_staging_record.id, p_session_id, v_asset_type_code, NOW(), NOW())
            RETURNING id INTO v_txn_id;

            PERFORM mark_sip_alert_complete_on_transaction(v_staging_record.tenant_id, v_staging_record.is_live,
                v_customer_id, v_scheme_code, (v_staging_record.mapped_data->>'txn_date')::DATE, v_txn_amount);

            -- AUTO-CREATE INVESTMENT PLAN
            IF v_asset_type_id IS NOT NULL THEN
                SELECT id INTO v_existing_assignment_id FROM t_customer_asset_assignments
                WHERE tenant_id = v_staging_record.tenant_id AND is_live = v_staging_record.is_live
                  AND customer_id = v_customer_id AND asset_type_id = v_asset_type_id
                  AND scheme_code = v_scheme_code AND is_active = true LIMIT 1;

                IF v_existing_assignment_id IS NULL THEN
                    INSERT INTO t_customer_asset_assignments (tenant_id, is_live, customer_id, asset_type_id,
                        scheme_code, principal_amount, investment_type, recurring_amount, investment_frequency,
                        has_started, custom_assumption_rate, is_active, assigned_by, notes, created_at, updated_at)
                    VALUES (v_staging_record.tenant_id, v_staging_record.is_live, v_customer_id, v_asset_type_id,
                        v_scheme_code, v_txn_amount, 'sip', v_txn_amount, 'monthly', true, 12.00, true,
                        v_session_creator_id, 'Auto-created from import', NOW(), NOW())
                    RETURNING id INTO v_new_assignment_id;

                    INSERT INTO t_jtbd_configurations (tenant_id, is_live, customer_id, jtbd_type, jtbd_category,
                        title, description, priority, is_active, config_data, next_alert_date, created_by, created_at, updated_at)
                    VALUES (v_staging_record.tenant_id, v_staging_record.is_live, v_customer_id, 'import_notification',
                        'alert', COALESCE(v_customer_name, 'Customer') || ' - ' || v_scheme_name,
                        'New MF scheme added.', 'medium', true,
                        jsonb_build_object('notification_type', 'new_mf_added', 'scheme_code', v_scheme_code,
                            'assignment_id', v_new_assignment_id), CURRENT_DATE, v_session_creator_id, NOW(), NOW());
                END IF;
            END IF;

            UPDATE t_import_staging_data SET processing_status = 'success',
                created_record_id = v_txn_id, created_record_type = 'transaction', processed_at = NOW()
            WHERE id = v_staging_record.id;
            v_success_count := v_success_count + 1;
            v_processed_count := v_processed_count + 1;

        EXCEPTION WHEN OTHERS THEN
            UPDATE t_import_staging_data SET processing_status = 'failed',
                error_messages = ARRAY[SQLERRM], processed_at = NOW()
            WHERE id = v_staging_record.id;
            v_failed_count := v_failed_count + 1;
            v_processed_count := v_processed_count + 1;
        END;

        IF v_processed_count % v_batch_size = 0 THEN
            UPDATE t_import_sessions SET successful_records = v_success_count,
                failed_records = v_failed_count, orphan_records = v_orphan_count,
                duplicate_records = v_duplicate_count, processed_records = v_processed_count
            WHERE id = p_session_id;
        END IF;
    END LOOP;

    UPDATE t_import_sessions SET
        status = CASE WHEN v_failed_count + v_orphan_count > 0 THEN 'completed_with_errors' ELSE 'completed' END,
        successful_records = v_success_count, failed_records = v_failed_count,
        orphan_records = v_orphan_count, duplicate_records = v_duplicate_count,
        processed_records = v_processed_count, processing_completed_at = NOW()
    WHERE id = p_session_id;

    RETURN QUERY SELECT v_processed_count, v_success_count, v_failed_count,
        v_duplicate_count, v_orphan_count, EXTRACT(EPOCH FROM (NOW() - v_start_time))::NUMERIC;
END;
$$;

COMMENT ON FUNCTION process_transaction_import_session IS
'v1.3: Uses scheme_category_id for asset_type lookup instead of asset_type_id';

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
