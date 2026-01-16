-- Migration: 022_auto_mf_assignment_alerts.sql
-- Description: Update process_transaction_import_session to auto-create MF investment plans
--              and generate import notification alerts
-- Date: 2024-12-18

-- ============================================================================
-- UPDATED FUNCTION: process_transaction_import_session
-- New features:
--   1. Auto-creates Investment Plans in t_customer_asset_assignments for MF
--   2. Creates import_notification alerts for new assignments
--   3. Creates import_notification alerts for duplicate/skipped assignments
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
    -- New variables for auto-assignment
    v_asset_type_id INTEGER;
    v_asset_type_code VARCHAR;
    v_existing_assignment_id INTEGER;
    v_customer_name VARCHAR;
    v_new_assignment_id INTEGER;
    v_session_creator_id INTEGER;
    v_txn_amount NUMERIC;
BEGIN
    -- Get session info
    SELECT tenant_id, is_live, created_by
    INTO v_session_info
    FROM t_import_sessions
    WHERE id = p_session_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Session % not found', p_session_id;
    END IF;

    -- Note: Asset type ID is now looked up per-scheme based on scheme_type
    -- (Open Ended, Close Ended, Interval Fund) instead of hardcoded 'MF'

    -- Get session creator for alert creation
    v_session_creator_id := COALESCE(v_session_info.created_by, 1);

    UPDATE t_import_sessions
    SET status = 'processing',
        processing_started_at = NOW()
    WHERE id = p_session_id;

    RAISE NOTICE '[Session %] Starting processing with lookup method: %', p_session_id, p_customer_lookup_method;

    FOR v_staging_record IN (
        SELECT
            id,
            row_number,
            mapped_data,
            tenant_id,
            is_live
        FROM t_import_staging_data
        WHERE session_id = p_session_id
          AND processing_status = 'pending'
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
            v_asset_type_id := NULL;
            v_asset_type_code := NULL;
            v_new_assignment_id := NULL;
            v_txn_amount := NULL;

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

                        IF v_customer_id IS NOT NULL THEN
                            RAISE NOTICE '[Session %] Row %: Found customer via PAN fallback', p_session_id, v_staging_record.row_number;
                        END IF;
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

                        IF v_customer_id IS NOT NULL THEN
                            RAISE NOTICE '[Session %] Row %: Found customer via PAN fallback', p_session_id, v_staging_record.row_number;
                        END IF;
                    END IF;

                    IF v_customer_id IS NULL THEN
                        v_error_msg := 'No customer found with name: ' || (v_staging_record.mapped_data->>'customer_name');
                        IF v_staging_record.mapped_data->>'pan' IS NOT NULL THEN
                            v_error_msg := v_error_msg || ' or PAN: ' || (v_staging_record.mapped_data->>'pan');
                        END IF;
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

                    IF v_customer_id IS NOT NULL THEN
                        RAISE NOTICE '[Session %] Row %: Found customer via PAN fallback', p_session_id, v_staging_record.row_number;
                    END IF;
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

            -- Get customer name for alerts
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
                    SELECT
                        sb.id,
                        sb.scheme_code,
                        sb.scheme_name
                    INTO
                        v_bookmark_id,
                        v_scheme_code,
                        v_scheme_name
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

                    -- LOOKUP ASSET TYPE CODE from scheme's scheme_type
                    -- scheme_type_id -> t_scheme_masters.name -> m_asset_types.asset_type_code
                    SELECT sm.name, mat.id
                    INTO v_asset_type_code, v_asset_type_id
                    FROM t_scheme_details sd
                    JOIN t_scheme_masters sm ON sd.scheme_type_id = sm.id
                    JOIN m_asset_types mat ON mat.asset_type_code = sm.name AND mat.is_active = true
                    WHERE sd.id = v_scheme_id;

                    -- Default to 'Open Ended' if scheme_type not found
                    IF v_asset_type_code IS NULL THEN
                        SELECT asset_type_code, id
                        INTO v_asset_type_code, v_asset_type_id
                        FROM m_asset_types
                        WHERE asset_type_code = 'Open Ended' AND is_active = true
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

            -- Get transaction amount for investment plan
            v_txn_amount := COALESCE(NULLIF(v_staging_record.mapped_data->>'total_amount', '')::NUMERIC, 0);

            -- CREATE/UPDATE PORTFOLIO ENTRY
            INSERT INTO t_customer_master_portfolio (
                tenant_id,
                is_live,
                customer_id,
                scheme_code,
                scheme_name,
                folio_no,
                start_date
            ) VALUES (
                v_staging_record.tenant_id,
                v_staging_record.is_live,
                v_customer_id,
                v_scheme_code,
                v_scheme_name,
                v_staging_record.mapped_data->>'folio_no',
                (v_staging_record.mapped_data->>'txn_date')::DATE
            )
            ON CONFLICT (customer_id, scheme_code, tenant_id, is_live)
            DO UPDATE SET
                scheme_name = EXCLUDED.scheme_name,
                folio_no = COALESCE(EXCLUDED.folio_no, t_customer_master_portfolio.folio_no),
                updated_at = CURRENT_TIMESTAMP;

            -- INSERT TRANSACTION
            INSERT INTO t_transaction_table (
                tenant_id,
                is_live,
                is_active,
                customer_id,
                scheme_id,
                scheme_code,
                scheme_name,
                folio_no,
                txn_type_id,
                txn_date,
                total_amount,
                units,
                nav,
                stamp_duty,
                stt,
                tds,
                txn_description,
                txn_source,
                staging_record_id,
                import_session_id,
                asset_type_code,
                created_at,
                updated_at
            ) VALUES (
                v_staging_record.tenant_id,
                v_staging_record.is_live,
                true,
                v_customer_id,
                v_scheme_id,
                v_scheme_code,
                v_scheme_name,
                v_staging_record.mapped_data->>'folio_no',
                v_txn_type_id,
                (v_staging_record.mapped_data->>'txn_date')::DATE,
                (v_staging_record.mapped_data->>'total_amount')::NUMERIC,
                NULLIF(v_staging_record.mapped_data->>'units', '')::NUMERIC,
                NULLIF(v_staging_record.mapped_data->>'nav', '')::NUMERIC,
                NULLIF(v_staging_record.mapped_data->>'stamp_duty', '')::NUMERIC,
                NULLIF(v_staging_record.mapped_data->>'stt', '')::NUMERIC,
                NULLIF(v_staging_record.mapped_data->>'tds', '')::NUMERIC,
                v_staging_record.mapped_data->>'txn_description',
                'import',
                v_staging_record.id,
                p_session_id,
                v_asset_type_code,
                NOW(),
                NOW()
            ) RETURNING id INTO v_txn_id;

            -- ============================================================================
            -- AUTO-CREATE INVESTMENT PLAN AND ALERTS
            -- (for Open Ended, Close Ended, Interval Fund scheme types)
            -- ============================================================================
            IF v_asset_type_id IS NOT NULL THEN
                -- Check if customer already has this scheme assigned
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
                    -- NEW: Create Investment Plan for this MF
                    INSERT INTO t_customer_asset_assignments (
                        tenant_id,
                        is_live,
                        customer_id,
                        asset_type_id,
                        scheme_code,
                        principal_amount,
                        investment_type,
                        recurring_amount,
                        investment_frequency,
                        has_started,
                        custom_assumption_rate,
                        is_active,
                        assigned_by,
                        notes,
                        created_at,
                        updated_at
                    ) VALUES (
                        v_staging_record.tenant_id,
                        v_staging_record.is_live,
                        v_customer_id,
                        v_asset_type_id,
                        v_scheme_code,
                        v_txn_amount,           -- principal_amount = SIP amount
                        'sip',                   -- investment_type
                        v_txn_amount,           -- recurring_amount = SIP amount
                        'monthly',               -- investment_frequency
                        true,                    -- has_started = true
                        12.00,                   -- custom_assumption_rate = 12%
                        true,
                        v_session_creator_id,
                        'Auto-created from transaction import (Session: ' || p_session_id || ')',
                        NOW(),
                        NOW()
                    ) RETURNING id INTO v_new_assignment_id;

                    -- Create Alert: New MF Added
                    INSERT INTO t_jtbd_configurations (
                        tenant_id,
                        is_live,
                        customer_id,
                        jtbd_type,
                        jtbd_category,
                        title,
                        description,
                        priority,
                        is_active,
                        config_data,
                        next_alert_date,
                        created_by,
                        created_at,
                        updated_at
                    ) VALUES (
                        v_staging_record.tenant_id,
                        v_staging_record.is_live,
                        v_customer_id,
                        'import_notification',
                        'alert',
                        COALESCE(v_customer_name, 'Customer') || ' - ' || v_scheme_name,
                        'New Mutual Fund scheme has been added. Please set the start date and review the investment details.',
                        'medium',
                        true,
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
                        CURRENT_DATE,  -- Alert is due today
                        v_session_creator_id,
                        NOW(),
                        NOW()
                    );

                    RAISE NOTICE '[Session %] Created new MF assignment for customer % scheme %',
                        p_session_id, v_customer_id, v_scheme_code;
                ELSE
                    -- DUPLICATE: Scheme already assigned, create skip alert
                    INSERT INTO t_jtbd_configurations (
                        tenant_id,
                        is_live,
                        customer_id,
                        jtbd_type,
                        jtbd_category,
                        title,
                        description,
                        priority,
                        is_active,
                        config_data,
                        next_alert_date,
                        created_by,
                        created_at,
                        updated_at
                    ) VALUES (
                        v_staging_record.tenant_id,
                        v_staging_record.is_live,
                        v_customer_id,
                        'import_notification',
                        'alert',
                        'Scheme already assigned - ' || COALESCE(v_customer_name, 'Customer'),
                        'Scheme "' || v_scheme_name || '" is already available for ' || COALESCE(v_customer_name, 'this customer') || ', ignoring duplicate assignment.',
                        'low',
                        true,
                        jsonb_build_object(
                            'notification_type', 'duplicate_mf_skipped',
                            'scheme_code', v_scheme_code,
                            'scheme_name', v_scheme_name,
                            'customer_name', v_customer_name,
                            'existing_assignment_id', v_existing_assignment_id,
                            'import_session_id', p_session_id,
                            'transaction_id', v_txn_id
                        ),
                        CURRENT_DATE,  -- Alert is due today
                        v_session_creator_id,
                        NOW(),
                        NOW()
                    );

                    RAISE NOTICE '[Session %] Scheme % already assigned to customer %, skipped',
                        p_session_id, v_scheme_code, v_customer_id;
                END IF;
            END IF;
            -- ============================================================================

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

            RAISE NOTICE '[Session %] Error processing row %: %', p_session_id, v_staging_record.row_number, SQLERRM;
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

            RAISE NOTICE '[Session %] Checkpoint: % processed', p_session_id, v_processed_count;
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

COMMENT ON FUNCTION process_transaction_import_session IS 'Process transaction imports with customer lookup, PAN fallback, orphan tracking, and auto MF assignment with alerts';
