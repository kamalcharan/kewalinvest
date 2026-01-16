-- ============================================================================
-- UPDATE: Import Functions Only
-- Date: 2026-01-16
-- Description: Updates ONLY the scheme and transaction import functions to use
--              m_asset_types directly for asset_type_id lookup (GLOBAL table)
-- ============================================================================
--
-- This file updates ONLY 3 functions:
-- 1. mark_sip_alert_complete_on_transaction - helper function for SIP alerts
-- 2. process_single_scheme_record - sets asset_type_id during scheme import
-- 3. process_transaction_import_session - uses asset_type_id for investment plans
--
-- SAFE TO RUN: Does not modify any other functions
-- ============================================================================

BEGIN;

-- ============================================================================
-- FUNCTION 0: mark_sip_alert_complete_on_transaction (dependency)
-- ============================================================================
-- This function is called by process_transaction_import_session

CREATE OR REPLACE FUNCTION mark_sip_alert_complete_on_transaction(
    p_tenant_id INTEGER,
    p_is_live BOOLEAN,
    p_customer_id INTEGER,
    p_scheme_code VARCHAR(50),
    p_transaction_date DATE,
    p_transaction_amount NUMERIC
)
RETURNS INTEGER AS $$
DECLARE
    v_alert_id INTEGER;
    v_alerts_marked INTEGER := 0;
    v_alert_record RECORD;
BEGIN
    -- Find active SIP alerts for this customer/scheme that are due around this transaction date
    -- Window: transaction_date should be within 7 days before to 7 days after the next_alert_date
    FOR v_alert_record IN
        SELECT j.id, j.next_alert_date, j.config_data
        FROM t_jtbd_configurations j
        WHERE j.tenant_id = p_tenant_id
          AND j.is_live = p_is_live
          AND j.customer_id = p_customer_id
          AND j.is_active = true
          AND j.completed_at IS NULL
          AND j.jtbd_type IN ('goal_sip_plan', 'portfolio_alert')
          -- Match scheme from config_data
          AND (
              j.config_data->>'scheme_code' = p_scheme_code
              OR j.config_data->>'fund_code' = p_scheme_code
              OR j.config_data->'asset_assignment'->>'scheme_code' = p_scheme_code
          )
          -- Match date window: 7 days before to 7 days after
          AND j.next_alert_date IS NOT NULL
          AND p_transaction_date BETWEEN (j.next_alert_date - 7) AND (j.next_alert_date + 7)
        ORDER BY ABS(j.next_alert_date - p_transaction_date)  -- Closest match first
        LIMIT 1  -- Only mark one alert per transaction
    LOOP
        -- Mark the alert as completed
        UPDATE t_jtbd_configurations
        SET completed_at = NOW(),
            completed_by = NULL,  -- System completion
            completion_source = 'transaction_import',
            updated_at = NOW()
        WHERE id = v_alert_record.id;

        v_alerts_marked := v_alerts_marked + 1;

        RAISE NOTICE 'Marked SIP alert % as complete (scheme: %, txn_date: %, alert_date: %)',
            v_alert_record.id, p_scheme_code, p_transaction_date, v_alert_record.next_alert_date;
    END LOOP;

    RETURN v_alerts_marked;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION mark_sip_alert_complete_on_transaction IS 'Marks matching SIP alerts as complete when a transaction is imported';

-- ============================================================================
-- FUNCTION 1: process_single_scheme_record
-- ============================================================================
-- Changes: Looks up asset_type_id from m_asset_types using scheme_category name

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
    v_asset_type_id INTEGER;
    v_launch_date DATE;
    v_closure_date DATE;
    v_minimum_amount DECIMAL(15,2);
BEGIN
    SELECT * INTO v_staging
    FROM t_import_staging_data
    WHERE id = p_staging_id;

    IF NOT FOUND THEN
        RETURN;
    END IF;

    UPDATE t_import_staging_data
    SET processing_status = 'processing'
    WHERE id = p_staging_id;

    v_mapped_data := v_staging.mapped_data;
    v_error_messages := ARRAY[]::TEXT[];

    BEGIN
        -- Look up scheme_type_id from t_scheme_masters (tenant-specific)
        v_scheme_type_id := NULL;
        IF v_mapped_data->>'scheme_type' IS NOT NULL AND TRIM(v_mapped_data->>'scheme_type') != '' THEN
            SELECT id INTO v_scheme_type_id
            FROM t_scheme_masters
            WHERE LOWER(TRIM(name)) = LOWER(TRIM(v_mapped_data->>'scheme_type'))
              AND master_type = 'scheme_type'
              AND tenant_id = v_staging.tenant_id
              AND is_live = v_staging.is_live
              AND is_active = true
            LIMIT 1;
        END IF;

        -- Look up asset_type_id directly from m_asset_types (GLOBAL, not tenant-specific)
        -- The scheme_category from import file matches m_asset_types.asset_type_code
        v_asset_type_id := NULL;
        IF v_mapped_data->>'scheme_category' IS NOT NULL AND TRIM(v_mapped_data->>'scheme_category') != '' THEN
            SELECT id INTO v_asset_type_id
            FROM m_asset_types
            WHERE LOWER(TRIM(asset_type_code)) = LOWER(TRIM(v_mapped_data->>'scheme_category'))
              AND is_active = true
            LIMIT 1;
        END IF;

        -- Fallback to 'Growth' if scheme_category not found in m_asset_types
        IF v_asset_type_id IS NULL THEN
            SELECT id INTO v_asset_type_id
            FROM m_asset_types
            WHERE asset_type_code = 'Growth' AND is_active = true
            LIMIT 1;
        END IF;

        -- Check for duplicate scheme
        SELECT COUNT(*) > 0 INTO v_is_duplicate
        FROM t_scheme_details
        WHERE scheme_code = v_mapped_data->>'scheme_code'
          AND tenant_id = v_staging.tenant_id
          AND is_live = v_staging.is_live;

        IF v_is_duplicate THEN
            UPDATE t_scheme_details
            SET
                amc_name = COALESCE(NULLIF(TRIM(v_mapped_data->>'amc_name'), ''), amc_name),
                scheme_name = COALESCE(NULLIF(TRIM(v_mapped_data->>'scheme_name'), ''), scheme_name),
                scheme_nav_name = COALESCE(NULLIF(TRIM(v_mapped_data->>'scheme_nav_name'), ''), scheme_nav_name),
                scheme_minimum_amount = CASE
                    WHEN v_mapped_data->>'scheme_minimum_amount' IS NOT NULL
                    THEN (v_mapped_data->>'scheme_minimum_amount')::DECIMAL(15,2)
                    ELSE scheme_minimum_amount
                END,
                isin_div_payout = COALESCE(NULLIF(TRIM(v_mapped_data->>'isin_div_payout'), ''), isin_div_payout),
                isin_growth = COALESCE(NULLIF(TRIM(v_mapped_data->>'isin_growth'), ''), isin_growth),
                isin_div_reinvestment = COALESCE(NULLIF(TRIM(v_mapped_data->>'isin_div_reinvestment'), ''), isin_div_reinvestment),
                asset_type_id = COALESCE(v_asset_type_id, asset_type_id),
                updated_at = CURRENT_TIMESTAMP
            WHERE scheme_code = v_mapped_data->>'scheme_code'
              AND tenant_id = v_staging.tenant_id
              AND is_live = v_staging.is_live
            RETURNING id INTO v_scheme_id;

            UPDATE t_import_staging_data
            SET processing_status = 'duplicate',
                warnings = array_append(warnings, 'Scheme already exists - updated'),
                created_record_id = v_scheme_id,
                created_record_type = 'scheme',
                processed_at = CURRENT_TIMESTAMP
            WHERE id = p_staging_id;

            RETURN;
        END IF;

        v_launch_date := NULL;
        IF v_mapped_data->>'launch_date' IS NOT NULL AND TRIM(v_mapped_data->>'launch_date') != '' THEN
            BEGIN
                v_launch_date := TO_DATE(v_mapped_data->>'launch_date', 'YYYY-MM-DD');
            EXCEPTION WHEN OTHERS THEN
                BEGIN
                    v_launch_date := TO_DATE(v_mapped_data->>'launch_date', 'DD-MM-YYYY');
                EXCEPTION WHEN OTHERS THEN
                    BEGIN
                        v_launch_date := TO_DATE(v_mapped_data->>'launch_date', 'MM-DD-YYYY');
                    EXCEPTION WHEN OTHERS THEN
                        v_launch_date := NULL;
                    END;
                END;
            END;
        END IF;

        v_closure_date := NULL;
        IF v_mapped_data->>'closure_date' IS NOT NULL AND TRIM(v_mapped_data->>'closure_date') != '' THEN
            BEGIN
                v_closure_date := TO_DATE(v_mapped_data->>'closure_date', 'YYYY-MM-DD');
            EXCEPTION WHEN OTHERS THEN
                BEGIN
                    v_closure_date := TO_DATE(v_mapped_data->>'closure_date', 'DD-MM-YYYY');
                EXCEPTION WHEN OTHERS THEN
                    BEGIN
                        v_closure_date := TO_DATE(v_mapped_data->>'closure_date', 'MM-DD-YYYY');
                    EXCEPTION WHEN OTHERS THEN
                        v_closure_date := NULL;
                    END;
                END;
            END;
        END IF;

        v_minimum_amount := NULL;
        IF v_mapped_data->>'scheme_minimum_amount' IS NOT NULL AND TRIM(v_mapped_data->>'scheme_minimum_amount') != '' THEN
            BEGIN
                v_minimum_amount := (v_mapped_data->>'scheme_minimum_amount')::DECIMAL(15,2);
            EXCEPTION WHEN OTHERS THEN
                v_minimum_amount := NULL;
            END;
        END IF;

        INSERT INTO t_scheme_details (
            tenant_id,
            is_live,
            amc_name,
            scheme_code,
            scheme_name,
            scheme_type_id,
            asset_type_id,
            scheme_nav_name,
            scheme_minimum_amount,
            launch_date,
            closure_date,
            isin_div_payout,
            isin_growth,
            isin_div_reinvestment,
            created_at
        ) VALUES (
            v_staging.tenant_id,
            v_staging.is_live,
            NULLIF(TRIM(v_mapped_data->>'amc_name'), ''),
            v_mapped_data->>'scheme_code',
            v_mapped_data->>'scheme_name',
            v_scheme_type_id,
            v_asset_type_id,
            NULLIF(TRIM(v_mapped_data->>'scheme_nav_name'), ''),
            v_minimum_amount,
            v_launch_date,
            v_closure_date,
            NULLIF(TRIM(v_mapped_data->>'isin_div_payout'), ''),
            NULLIF(TRIM(v_mapped_data->>'isin_growth'), ''),
            NULLIF(TRIM(v_mapped_data->>'isin_div_reinvestment'), ''),
            CURRENT_TIMESTAMP
        ) RETURNING id INTO v_scheme_id;

        UPDATE t_import_staging_data
        SET processing_status = 'success',
            created_record_id = v_scheme_id,
            created_record_type = 'scheme',
            processed_at = CURRENT_TIMESTAMP
        WHERE id = p_staging_id;

    EXCEPTION WHEN OTHERS THEN
        v_error_messages := array_append(v_error_messages, SQLERRM);

        UPDATE t_import_staging_data
        SET processing_status = 'failed',
            error_messages = v_error_messages,
            processed_at = CURRENT_TIMESTAMP
        WHERE id = p_staging_id;
    END;
END;
$$;

COMMENT ON FUNCTION process_single_scheme_record IS 'Process single scheme record from staging - sets asset_type_id from m_asset_types';

-- ============================================================================
-- FUNCTION 2: process_transaction_import_session
-- ============================================================================
-- Changes: Uses t_scheme_details.asset_type_id directly for investment plan creation

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
    v_scheme_code VARCHAR(100);
    v_scheme_name VARCHAR(500);
    v_bookmark_id INTEGER;
    v_txn_type_id INTEGER;
    v_error_msg TEXT;
    v_txn_id INTEGER;
    v_session_info RECORD;
    v_asset_type_id INTEGER;
    v_asset_type_code VARCHAR(100);
    v_existing_assignment_id INTEGER;
    v_customer_name VARCHAR(500);
    v_new_assignment_id INTEGER;
    v_session_creator_id INTEGER;
    v_txn_amount NUMERIC;
BEGIN
    SELECT tenant_id, is_live, created_by
    INTO v_session_info
    FROM t_import_sessions
    WHERE id = p_session_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Session % not found', p_session_id;
    END IF;

    v_session_creator_id := COALESCE(v_session_info.created_by, 1);

    UPDATE t_import_sessions
    SET status = 'processing',
        processing_started_at = NOW()
    WHERE id = p_session_id;

    RAISE NOTICE '[Session %] Starting processing with lookup method: %', p_session_id, p_customer_lookup_method;

    FOR v_staging_record IN (
        SELECT id, row_number, mapped_data, tenant_id, is_live
        FROM t_import_staging_data
        WHERE session_id = p_session_id AND processing_status = 'pending'
        ORDER BY id
    ) LOOP
        BEGIN
            v_customer_id := NULL;
            v_scheme_id := NULL;
            v_scheme_code := NULL;
            v_scheme_name := NULL;
            v_bookmark_id := NULL;
            v_txn_type_id := NULL;
            v_error_msg := NULL;
            v_customer_name := NULL;
            v_existing_assignment_id := NULL;
            v_new_assignment_id := NULL;
            v_txn_amount := NULL;
            v_asset_type_id := NULL;
            v_asset_type_code := NULL;

            -- CUSTOMER LOOKUP WITH PAN FALLBACK
            IF p_customer_lookup_method = 'iwell_code' THEN
                IF v_staging_record.mapped_data->>'iwell_code' IS NOT NULL THEN
                    SELECT c.id INTO v_customer_id
                    FROM t_customers c
                    WHERE c.tenant_id = v_staging_record.tenant_id
                      AND c.is_live = v_staging_record.is_live
                      AND UPPER(c.iwell_code) = UPPER(v_staging_record.mapped_data->>'iwell_code')
                      AND c.is_active = true
                    LIMIT 1;

                    IF v_customer_id IS NULL AND v_staging_record.mapped_data->>'pan' IS NOT NULL THEN
                        SELECT c.id INTO v_customer_id
                        FROM t_customers c
                        WHERE c.tenant_id = v_staging_record.tenant_id
                          AND c.is_live = v_staging_record.is_live
                          AND UPPER(c.pan) = UPPER(v_staging_record.mapped_data->>'pan')
                          AND c.is_active = true
                        LIMIT 1;
                    END IF;

                    IF v_customer_id IS NULL THEN
                        v_error_msg := 'No customer found with IWELL code: ' || (v_staging_record.mapped_data->>'iwell_code');
                        IF v_staging_record.mapped_data->>'pan' IS NOT NULL THEN
                            v_error_msg := v_error_msg || ' or PAN: ' || (v_staging_record.mapped_data->>'pan');
                        END IF;
                    END IF;
                ELSE
                    v_error_msg := 'IWELL code is required but not provided';
                END IF;

            ELSIF p_customer_lookup_method = 'customer_name' THEN
                IF v_staging_record.mapped_data->>'customer_name' IS NOT NULL THEN
                    SELECT c.id INTO v_customer_id
                    FROM t_customers c
                    INNER JOIN t_contacts ct ON ct.id = c.contact_id
                    WHERE c.tenant_id = v_staging_record.tenant_id
                      AND c.is_live = v_staging_record.is_live
                      AND ct.normalized_name = normalize_customer_name(v_staging_record.mapped_data->>'customer_name')
                      AND c.is_active = true
                      AND ct.is_active = true
                    LIMIT 1;

                    IF v_customer_id IS NULL AND v_staging_record.mapped_data->>'pan' IS NOT NULL THEN
                        SELECT c.id INTO v_customer_id
                        FROM t_customers c
                        WHERE c.tenant_id = v_staging_record.tenant_id
                          AND c.is_live = v_staging_record.is_live
                          AND UPPER(c.pan) = UPPER(v_staging_record.mapped_data->>'pan')
                          AND c.is_active = true
                        LIMIT 1;
                    END IF;

                    IF v_customer_id IS NULL THEN
                        v_error_msg := 'No customer found with name: ' || (v_staging_record.mapped_data->>'customer_name');
                    END IF;
                ELSE
                    v_error_msg := 'Customer name is required but not provided';
                END IF;

            ELSIF p_customer_lookup_method = 'both' THEN
                IF v_staging_record.mapped_data->>'iwell_code' IS NOT NULL THEN
                    SELECT c.id INTO v_customer_id
                    FROM t_customers c
                    WHERE c.tenant_id = v_staging_record.tenant_id
                      AND c.is_live = v_staging_record.is_live
                      AND UPPER(c.iwell_code) = UPPER(v_staging_record.mapped_data->>'iwell_code')
                      AND c.is_active = true
                    LIMIT 1;
                END IF;

                IF v_customer_id IS NULL AND v_staging_record.mapped_data->>'customer_name' IS NOT NULL THEN
                    SELECT c.id INTO v_customer_id
                    FROM t_customers c
                    INNER JOIN t_contacts ct ON ct.id = c.contact_id
                    WHERE c.tenant_id = v_staging_record.tenant_id
                      AND c.is_live = v_staging_record.is_live
                      AND ct.normalized_name = normalize_customer_name(v_staging_record.mapped_data->>'customer_name')
                      AND c.is_active = true
                      AND ct.is_active = true
                    LIMIT 1;
                END IF;

                IF v_customer_id IS NULL AND v_staging_record.mapped_data->>'pan' IS NOT NULL THEN
                    SELECT c.id INTO v_customer_id
                    FROM t_customers c
                    WHERE c.tenant_id = v_staging_record.tenant_id
                      AND c.is_live = v_staging_record.is_live
                      AND UPPER(c.pan) = UPPER(v_staging_record.mapped_data->>'pan')
                      AND c.is_active = true
                    LIMIT 1;
                END IF;

                IF v_customer_id IS NULL THEN
                    v_error_msg := 'No customer found with IWELL code, name, or PAN';
                END IF;
            END IF;

            IF v_customer_id IS NULL THEN
                UPDATE t_import_staging_data
                SET processing_status = 'orphan',
                    error_messages = ARRAY[v_error_msg],
                    processed_at = NOW()
                WHERE id = v_staging_record.id;

                v_orphan_count := v_orphan_count + 1;
                v_processed_count := v_processed_count + 1;
                CONTINUE;
            END IF;

            SELECT ct.name INTO v_customer_name
            FROM t_customers c
            INNER JOIN t_contacts ct ON ct.id = c.contact_id
            WHERE c.id = v_customer_id;

            -- TRANSACTION TYPE LOOKUP
            IF v_staging_record.mapped_data->>'txn_code' IS NOT NULL
               AND TRIM(v_staging_record.mapped_data->>'txn_code') != '' THEN

                SELECT id INTO v_txn_type_id
                FROM m_transaction_types
                WHERE UPPER(TRIM(txn_code)) = UPPER(TRIM(v_staging_record.mapped_data->>'txn_code'))
                  AND is_active = true
                LIMIT 1;

                IF v_txn_type_id IS NULL THEN
                    SELECT id INTO v_txn_type_id
                    FROM m_transaction_types
                    WHERE UPPER(TRIM(txn_name)) = UPPER(TRIM(v_staging_record.mapped_data->>'txn_code'))
                      AND is_active = true
                    LIMIT 1;
                END IF;

                IF v_txn_type_id IS NULL THEN
                    v_error_msg := 'Invalid transaction type: ' || (v_staging_record.mapped_data->>'txn_code');

                    UPDATE t_import_staging_data
                    SET processing_status = 'failed',
                        error_messages = ARRAY[v_error_msg],
                        processed_at = NOW()
                    WHERE id = v_staging_record.id;

                    v_failed_count := v_failed_count + 1;
                    v_processed_count := v_processed_count + 1;
                    CONTINUE;
                END IF;
            ELSE
                v_error_msg := 'Transaction type (txn_code) is required';

                UPDATE t_import_staging_data
                SET processing_status = 'failed',
                    error_messages = ARRAY[v_error_msg],
                    processed_at = NOW()
                WHERE id = v_staging_record.id;

                v_failed_count := v_failed_count + 1;
                v_processed_count := v_processed_count + 1;
                CONTINUE;
            END IF;

            -- SCHEME LOOKUP
            IF v_staging_record.mapped_data->>'scheme_name' IS NOT NULL AND
               TRIM(v_staging_record.mapped_data->>'scheme_name') != '' THEN

                SELECT sa.scheme_id INTO v_scheme_id
                FROM t_scheme_aliases sa
                WHERE sa.is_active = true
                  AND LOWER(TRIM(sa.alias_name)) = LOWER(TRIM(v_staging_record.mapped_data->>'scheme_name'))
                LIMIT 1;

                IF v_scheme_id IS NOT NULL THEN
                    SELECT sb.id, sb.scheme_code, sb.scheme_name
                    INTO v_bookmark_id, v_scheme_code, v_scheme_name
                    FROM t_scheme_bookmarks sb
                    WHERE sb.tenant_id = v_staging_record.tenant_id
                      AND sb.is_live = v_staging_record.is_live
                      AND sb.scheme_id = v_scheme_id
                      AND sb.is_active = true
                    LIMIT 1;

                    IF v_bookmark_id IS NULL THEN
                        SELECT scheme_name INTO v_scheme_name
                        FROM t_scheme_details
                        WHERE id = v_scheme_id;
                    END IF;

                    -- LOOKUP ASSET TYPE directly from t_scheme_details.asset_type_id (references m_asset_types)
                    SELECT mat.asset_type_code, mat.id
                    INTO v_asset_type_code, v_asset_type_id
                    FROM t_scheme_details sd
                    JOIN m_asset_types mat ON sd.asset_type_id = mat.id AND mat.is_active = true
                    WHERE sd.id = v_scheme_id;

                    -- Default to 'Growth' if asset_type_id not set on scheme
                    IF v_asset_type_code IS NULL THEN
                        SELECT asset_type_code, id
                        INTO v_asset_type_code, v_asset_type_id
                        FROM m_asset_types
                        WHERE asset_type_code = 'Growth' AND is_active = true
                        LIMIT 1;
                    END IF;
                END IF;
            END IF;

            IF v_bookmark_id IS NULL OR v_scheme_code IS NULL OR TRIM(v_scheme_code) = '' THEN
                v_error_msg := 'Scheme not bookmarked by tenant or has no scheme_code: ' ||
                              COALESCE(v_scheme_name, v_staging_record.mapped_data->>'scheme_name', 'N/A');

                UPDATE t_import_staging_data
                SET processing_status = 'failed',
                    error_messages = ARRAY[v_error_msg],
                    processed_at = NOW()
                WHERE id = v_staging_record.id;

                v_failed_count := v_failed_count + 1;
                v_processed_count := v_processed_count + 1;
                CONTINUE;
            END IF;

            -- DUPLICATE CHECK
            IF EXISTS (
                SELECT 1 FROM t_transaction_table
                WHERE customer_id = v_customer_id
                  AND tenant_id = v_staging_record.tenant_id
                  AND is_live = v_staging_record.is_live
                  AND txn_date = (v_staging_record.mapped_data->>'txn_date')::DATE
                  AND total_amount = (v_staging_record.mapped_data->>'total_amount')::NUMERIC
                  AND scheme_id = v_scheme_id
            ) THEN
                UPDATE t_import_staging_data
                SET processing_status = 'duplicate',
                    processed_at = NOW()
                WHERE id = v_staging_record.id;

                v_duplicate_count := v_duplicate_count + 1;
                v_processed_count := v_processed_count + 1;
                CONTINUE;
            END IF;

            v_txn_amount := COALESCE(NULLIF(v_staging_record.mapped_data->>'total_amount', '')::NUMERIC, 0);

            -- CREATE/UPDATE PORTFOLIO ENTRY
            INSERT INTO t_customer_master_portfolio (
                tenant_id, is_live, customer_id, scheme_code, scheme_name, folio_no, start_date
            ) VALUES (
                v_staging_record.tenant_id, v_staging_record.is_live, v_customer_id,
                v_scheme_code, v_scheme_name, v_staging_record.mapped_data->>'folio_no',
                (v_staging_record.mapped_data->>'txn_date')::DATE
            )
            ON CONFLICT (customer_id, scheme_code, tenant_id, is_live)
            DO UPDATE SET
                scheme_name = EXCLUDED.scheme_name,
                folio_no = COALESCE(EXCLUDED.folio_no, t_customer_master_portfolio.folio_no),
                updated_at = CURRENT_TIMESTAMP;

            -- INSERT TRANSACTION
            INSERT INTO t_transaction_table (
                tenant_id, is_live, is_active, customer_id, scheme_id, scheme_code, scheme_name,
                folio_no, txn_type_id, txn_date, total_amount, units, nav, stamp_duty, stt, tds,
                txn_description, txn_source, staging_record_id, import_session_id, asset_type_code,
                created_at, updated_at
            ) VALUES (
                v_staging_record.tenant_id, v_staging_record.is_live, true, v_customer_id,
                v_scheme_id, v_scheme_code, v_scheme_name, v_staging_record.mapped_data->>'folio_no',
                v_txn_type_id, (v_staging_record.mapped_data->>'txn_date')::DATE,
                (v_staging_record.mapped_data->>'total_amount')::NUMERIC,
                NULLIF(v_staging_record.mapped_data->>'units', '')::NUMERIC,
                NULLIF(v_staging_record.mapped_data->>'nav', '')::NUMERIC,
                NULLIF(v_staging_record.mapped_data->>'stamp_duty', '')::NUMERIC,
                NULLIF(v_staging_record.mapped_data->>'stt', '')::NUMERIC,
                NULLIF(v_staging_record.mapped_data->>'tds', '')::NUMERIC,
                v_staging_record.mapped_data->>'txn_description', 'import',
                v_staging_record.id, p_session_id, v_asset_type_code, NOW(), NOW()
            ) RETURNING id INTO v_txn_id;

            -- MARK SIP ALERTS AS COMPLETE
            PERFORM mark_sip_alert_complete_on_transaction(
                v_staging_record.tenant_id, v_staging_record.is_live, v_customer_id,
                v_scheme_code, (v_staging_record.mapped_data->>'txn_date')::DATE, v_txn_amount
            );

            -- AUTO-CREATE INVESTMENT PLAN AND ALERTS
            IF v_asset_type_id IS NOT NULL THEN
                SELECT id INTO v_existing_assignment_id
                FROM t_customer_asset_assignments
                WHERE tenant_id = v_staging_record.tenant_id
                  AND is_live = v_staging_record.is_live
                  AND customer_id = v_customer_id
                  AND asset_type_id = v_asset_type_id
                  AND scheme_code = v_scheme_code
                  AND is_active = true
                LIMIT 1;

                IF v_existing_assignment_id IS NULL THEN
                    INSERT INTO t_customer_asset_assignments (
                        tenant_id, is_live, customer_id, asset_type_id, scheme_code,
                        principal_amount, investment_type, recurring_amount, investment_frequency,
                        has_started, custom_assumption_rate, is_active, assigned_by, notes,
                        created_at, updated_at
                    ) VALUES (
                        v_staging_record.tenant_id, v_staging_record.is_live, v_customer_id,
                        v_asset_type_id, v_scheme_code, v_txn_amount, 'sip', v_txn_amount,
                        'monthly', true, 12.00, true, v_session_creator_id,
                        'Auto-created from transaction import (Session: ' || p_session_id || ')',
                        NOW(), NOW()
                    ) RETURNING id INTO v_new_assignment_id;

                    INSERT INTO t_jtbd_configurations (
                        tenant_id, is_live, customer_id, jtbd_type, jtbd_category, title,
                        description, priority, is_active, config_data, next_alert_date,
                        created_by, created_at, updated_at
                    ) VALUES (
                        v_staging_record.tenant_id, v_staging_record.is_live, v_customer_id,
                        'import_notification', 'alert',
                        COALESCE(v_customer_name, 'Customer') || ' - ' || v_scheme_name,
                        'New Mutual Fund scheme has been added. Please set the start date and review the investment details.',
                        'medium', true,
                        jsonb_build_object(
                            'notification_type', 'new_mf_added',
                            'scheme_code', v_scheme_code,
                            'scheme_name', v_scheme_name,
                            'customer_name', v_customer_name,
                            'sip_amount', v_txn_amount,
                            'assignment_id', v_new_assignment_id,
                            'import_session_id', p_session_id,
                            'transaction_id', v_txn_id
                        ),
                        CURRENT_DATE, v_session_creator_id, NOW(), NOW()
                    );

                    RAISE NOTICE '[Session %] Created new MF assignment for customer % scheme %',
                        p_session_id, v_customer_id, v_scheme_code;
                ELSE
                    INSERT INTO t_jtbd_configurations (
                        tenant_id, is_live, customer_id, jtbd_type, jtbd_category, title,
                        description, priority, is_active, config_data, next_alert_date,
                        created_by, created_at, updated_at
                    ) VALUES (
                        v_staging_record.tenant_id, v_staging_record.is_live, v_customer_id,
                        'import_notification', 'alert',
                        'Scheme already assigned - ' || COALESCE(v_customer_name, 'Customer'),
                        'Scheme "' || v_scheme_name || '" is already available for ' || COALESCE(v_customer_name, 'this customer') || ', ignoring duplicate assignment.',
                        'low', true,
                        jsonb_build_object(
                            'notification_type', 'duplicate_mf_skipped',
                            'scheme_code', v_scheme_code,
                            'scheme_name', v_scheme_name,
                            'customer_name', v_customer_name,
                            'existing_assignment_id', v_existing_assignment_id,
                            'import_session_id', p_session_id,
                            'transaction_id', v_txn_id
                        ),
                        CURRENT_DATE, v_session_creator_id, NOW(), NOW()
                    );
                END IF;
            END IF;

            UPDATE t_import_staging_data
            SET processing_status = 'success',
                created_record_id = v_txn_id,
                created_record_type = 'transaction',
                processed_at = NOW()
            WHERE id = v_staging_record.id;

            v_success_count := v_success_count + 1;
            v_processed_count := v_processed_count + 1;

        EXCEPTION WHEN OTHERS THEN
            UPDATE t_import_staging_data
            SET processing_status = 'failed',
                error_messages = ARRAY[SQLERRM],
                processed_at = NOW()
            WHERE id = v_staging_record.id;

            v_failed_count := v_failed_count + 1;
            v_processed_count := v_processed_count + 1;
        END;

        IF v_processed_count % v_batch_size = 0 THEN
            UPDATE t_import_sessions
            SET successful_records = v_success_count,
                failed_records = v_failed_count,
                orphan_records = v_orphan_count,
                duplicate_records = v_duplicate_count,
                processed_records = v_processed_count,
                updated_at = NOW()
            WHERE id = p_session_id;
        END IF;
    END LOOP;

    UPDATE t_import_sessions
    SET status = CASE
            WHEN v_failed_count + v_orphan_count > 0 THEN 'completed_with_errors'
            ELSE 'completed'
        END,
        successful_records = v_success_count,
        failed_records = v_failed_count,
        orphan_records = v_orphan_count,
        duplicate_records = v_duplicate_count,
        processed_records = v_processed_count,
        processing_completed_at = NOW(),
        updated_at = NOW()
    WHERE id = p_session_id;

    RETURN QUERY SELECT
        v_processed_count,
        v_success_count,
        v_failed_count,
        v_duplicate_count,
        v_orphan_count,
        EXTRACT(EPOCH FROM (NOW() - v_start_time))::NUMERIC;
END;
$$;

COMMENT ON FUNCTION process_transaction_import_session IS 'Process transaction imports - uses asset_type_id from scheme for investment plan creation';

-- ============================================================================
-- VERIFICATION
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'FUNCTIONS UPDATED SUCCESSFULLY';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✓ process_single_scheme_record - now sets asset_type_id from m_asset_types';
    RAISE NOTICE '✓ process_transaction_import_session - uses asset_type_id for investment plans';
    RAISE NOTICE '';
    RAISE NOTICE 'NEXT STEPS:';
    RAISE NOTICE '1. Run fix-asset-allocation.sql to backfill existing data';
    RAISE NOTICE '2. Re-upload scheme master (to set asset_type_id)';
    RAISE NOTICE '3. Re-upload transactions (to create investment plans)';
    RAISE NOTICE '========================================';
END $$;

COMMIT;
