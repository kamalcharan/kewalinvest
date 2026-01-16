-- Fix process_single_scheme_record function to not filter by tenant_id/is_live
-- for scheme_category and scheme_type lookups (they are global AMFI data)
-- Also updates duplicates with scheme_category_id

-- First, ensure the 42 scheme categories exist in t_scheme_masters
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
  ('Solution Oriented Scheme - Childrens Fund'),
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

-- Now fix the function
CREATE OR REPLACE FUNCTION process_single_scheme_record(p_staging_id INTEGER)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
    v_staging RECORD;
    v_mapped_data JSONB;
    v_scheme_id INTEGER;
    v_is_duplicate BOOLEAN;
    v_error_messages TEXT[];
    v_scheme_type_id INTEGER;
    v_scheme_category_id INTEGER;
    v_launch_date DATE;
    v_closure_date DATE;
    v_minimum_amount DECIMAL(15,2);
BEGIN
    -- Get staging record
    SELECT * INTO v_staging
    FROM t_import_staging_data
    WHERE id = p_staging_id;

    IF NOT FOUND THEN
        RETURN;
    END IF;

    -- Mark as processing
    UPDATE t_import_staging_data
    SET processing_status = 'processing'
    WHERE id = p_staging_id;

    v_mapped_data := v_staging.mapped_data;
    v_error_messages := ARRAY[]::TEXT[];

    BEGIN
        -- Get scheme_type_id if scheme_type is provided (global data - no tenant filter)
        v_scheme_type_id := NULL;
        IF v_mapped_data->>'scheme_type' IS NOT NULL AND TRIM(v_mapped_data->>'scheme_type') != '' THEN
            SELECT id INTO v_scheme_type_id
            FROM t_scheme_masters
            WHERE LOWER(TRIM(name)) = LOWER(TRIM(v_mapped_data->>'scheme_type'))
              AND master_type = 'scheme_type'
              AND is_active = true
            LIMIT 1;
        END IF;

        -- Get scheme_category_id if scheme_category is provided (global AMFI data - no tenant filter)
        v_scheme_category_id := NULL;
        IF v_mapped_data->>'scheme_category' IS NOT NULL AND TRIM(v_mapped_data->>'scheme_category') != '' THEN
            SELECT id INTO v_scheme_category_id
            FROM t_scheme_masters
            WHERE LOWER(TRIM(name)) = LOWER(TRIM(v_mapped_data->>'scheme_category'))
              AND master_type = 'scheme_category'
              AND is_active = true
            LIMIT 1;
        END IF;

        -- Check for duplicate by scheme_code
        SELECT COUNT(*) > 0 INTO v_is_duplicate
        FROM t_scheme_details
        WHERE scheme_code = v_mapped_data->>'scheme_code'
          AND tenant_id = v_staging.tenant_id
          AND is_live = v_staging.is_live;

        IF v_is_duplicate THEN
            -- Update existing scheme (including scheme_type_id and scheme_category_id)
            UPDATE t_scheme_details
            SET
                amc_name = COALESCE(NULLIF(TRIM(v_mapped_data->>'amc_name'), ''), amc_name),
                scheme_name = COALESCE(NULLIF(TRIM(v_mapped_data->>'scheme_name'), ''), scheme_name),
                scheme_nav_name = COALESCE(NULLIF(TRIM(v_mapped_data->>'scheme_nav_name'), ''), scheme_nav_name),
                scheme_type_id = COALESCE(v_scheme_type_id, scheme_type_id),
                scheme_category_id = COALESCE(v_scheme_category_id, scheme_category_id),
                scheme_minimum_amount = CASE
                    WHEN v_mapped_data->>'scheme_minimum_amount' IS NOT NULL
                    THEN (v_mapped_data->>'scheme_minimum_amount')::DECIMAL(15,2)
                    ELSE scheme_minimum_amount
                END,
                isin_div_payout = COALESCE(NULLIF(TRIM(v_mapped_data->>'isin_div_payout'), ''), isin_div_payout),
                isin_growth = COALESCE(NULLIF(TRIM(v_mapped_data->>'isin_growth'), ''), isin_growth),
                isin_div_reinvestment = COALESCE(NULLIF(TRIM(v_mapped_data->>'isin_div_reinvestment'), ''), isin_div_reinvestment),
                updated_at = CURRENT_TIMESTAMP
            WHERE scheme_code = v_mapped_data->>'scheme_code'
              AND tenant_id = v_staging.tenant_id
              AND is_live = v_staging.is_live
            RETURNING id INTO v_scheme_id;

            -- Mark as duplicate
            UPDATE t_import_staging_data
            SET processing_status = 'duplicate',
                warnings = array_append(warnings, 'Scheme already exists - updated'),
                created_record_id = v_scheme_id,
                created_record_type = 'scheme',
                processed_at = CURRENT_TIMESTAMP
            WHERE id = p_staging_id;

            RETURN;
        END IF;

        -- Parse launch_date
        v_launch_date := NULL;
        IF v_mapped_data->>'launch_date' IS NOT NULL AND TRIM(v_mapped_data->>'launch_date') != '' THEN
            BEGIN
                v_launch_date := (v_mapped_data->>'launch_date')::DATE;
            EXCEPTION WHEN OTHERS THEN
                v_error_messages := array_append(v_error_messages, 'Invalid launch_date format');
            END;
        END IF;

        -- Parse closure_date
        v_closure_date := NULL;
        IF v_mapped_data->>'closure_date' IS NOT NULL AND TRIM(v_mapped_data->>'closure_date') != '' THEN
            BEGIN
                v_closure_date := (v_mapped_data->>'closure_date')::DATE;
            EXCEPTION WHEN OTHERS THEN
                v_error_messages := array_append(v_error_messages, 'Invalid closure_date format');
            END;
        END IF;

        -- Parse minimum_amount
        v_minimum_amount := NULL;
        IF v_mapped_data->>'scheme_minimum_amount' IS NOT NULL AND TRIM(v_mapped_data->>'scheme_minimum_amount') != '' THEN
            BEGIN
                v_minimum_amount := (v_mapped_data->>'scheme_minimum_amount')::DECIMAL(15,2);
            EXCEPTION WHEN OTHERS THEN
                v_error_messages := array_append(v_error_messages, 'Invalid scheme_minimum_amount format');
            END;
        END IF;

        -- Insert new scheme
        INSERT INTO t_scheme_details (
            tenant_id,
            is_live,
            scheme_code,
            amc_name,
            scheme_name,
            scheme_nav_name,
            scheme_type_id,
            scheme_category_id,
            scheme_minimum_amount,
            launch_date,
            closure_date,
            isin_div_payout,
            isin_growth,
            isin_div_reinvestment,
            is_active,
            created_at
        ) VALUES (
            v_staging.tenant_id,
            v_staging.is_live,
            v_mapped_data->>'scheme_code',
            NULLIF(TRIM(v_mapped_data->>'amc_name'), ''),
            NULLIF(TRIM(v_mapped_data->>'scheme_name'), ''),
            NULLIF(TRIM(v_mapped_data->>'scheme_nav_name'), ''),
            v_scheme_type_id,
            v_scheme_category_id,
            v_minimum_amount,
            v_launch_date,
            v_closure_date,
            NULLIF(TRIM(v_mapped_data->>'isin_div_payout'), ''),
            NULLIF(TRIM(v_mapped_data->>'isin_growth'), ''),
            NULLIF(TRIM(v_mapped_data->>'isin_div_reinvestment'), ''),
            true,
            CURRENT_TIMESTAMP
        )
        RETURNING id INTO v_scheme_id;

        -- Mark as success
        UPDATE t_import_staging_data
        SET processing_status = 'success',
            created_record_id = v_scheme_id,
            created_record_type = 'scheme',
            warnings = CASE WHEN array_length(v_error_messages, 1) > 0 THEN v_error_messages ELSE warnings END,
            processed_at = CURRENT_TIMESTAMP
        WHERE id = p_staging_id;

    EXCEPTION WHEN OTHERS THEN
        -- Mark as failed
        UPDATE t_import_staging_data
        SET processing_status = 'failed',
            error_messages = array_append(COALESCE(error_messages, ARRAY[]::TEXT[]), SQLERRM),
            processed_at = CURRENT_TIMESTAMP
        WHERE id = p_staging_id;
    END;
END;
$$;

-- Verify
SELECT 'Function updated. Run a test import to verify.' as status;
