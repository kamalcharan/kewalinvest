-- v1.3-fix-asset-type-mapping.sql
-- Migration: Fix Asset Type Mapping for Scheme Categories
-- Issue: All assets showing as 'Growth' in Asset Allocation chart
-- Solution:
--   1. Update process_transaction_import_session to use scheme_category_id
--   2. Backfill existing transactions with correct asset_type_code

BEGIN;

-- ============================================================================
-- PART 1: BACKFILL EXISTING TRANSACTIONS
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

-- Update existing transactions using scheme_category_id directly
UPDATE t_transaction_table tt
SET asset_type_code = sm.name
FROM t_scheme_details sd
JOIN t_scheme_masters sm ON sd.scheme_category_id = sm.id
    AND sm.master_type = 'scheme_category'
WHERE tt.scheme_id = sd.id
  AND tt.portfolio_flag = true
  AND sd.scheme_category_id IS NOT NULL;

SELECT 'BACKFILL COMPLETE - Existing Transactions Updated' as info;

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
-- PART 2: UPDATE FUNCTION FOR FUTURE IMPORTS
-- Replace asset_type_id lookup with scheme_category_id lookup
-- ============================================================================

CREATE OR REPLACE FUNCTION process_transaction_import_session(
    p_session_id INTEGER,
    p_customer_lookup_method VARCHAR DEFAULT 'iwell_code'
)
RETURNS TABLE (
    total_processed INTEGER,
    successful INTEGER,
    failed INTEGER,
    duplicates INTEGER,
    orphans INTEGER,
    elapsed_seconds NUMERIC
) AS $$
DECLARE
    v_staging_record RECORD;
    v_customer_id INTEGER;
    v_processed_count INTEGER := 0;
    v_success_count INTEGER := 0;
    v_failed_count INTEGER := 0;
    v_duplicate_count INTEGER := 0;
    v_orphan_count INTEGER := 0;
    v_start_time TIMESTAMP := NOW();
    v_scheme_id INTEGER;
    v_scheme_code VARCHAR;
    v_scheme_name VARCHAR;
    v_bookmark_id INTEGER;
    v_txn_type_id INTEGER;
    v_error_msg TEXT;
    v_txn_id INTEGER;
    v_session_info RECORD;
    -- Variables for auto-assignment
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
        RAISE EXCEPTION 'Import session % not found', p_session_id;
    END IF;

    v_session_creator_id := v_session_info.created_by;

    -- Process each staging record
    FOR v_staging_record IN
        SELECT *
        FROM t_import_staging_data
        WHERE import_session_id = p_session_id
          AND record_type = 'transaction'
          AND processing_status = 'validated'
        ORDER BY id
    LOOP
        -- Reset variables for each record
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
            END IF;

            -- PAN fallback if iwell_code not found
            IF v_customer_id IS NULL AND v_staging_record.mapped_data->>'pan' IS NOT NULL THEN
                SELECT c.id INTO v_customer_id
                FROM t_customers c
                WHERE c.tenant_id = v_staging_record.tenant_id
                  AND c.is_live = v_staging_record.is_live
                  AND UPPER(c.pan) = UPPER(v_staging_record.mapped_data->>'pan')
                  AND c.is_active = true
                LIMIT 1;
            END IF;
        ELSIF p_customer_lookup_method = 'pan' THEN
            IF v_staging_record.mapped_data->>'pan' IS NOT NULL THEN
                SELECT c.id INTO v_customer_id
                FROM t_customers c
                WHERE c.tenant_id = v_staging_record.tenant_id
                  AND c.is_live = v_staging_record.is_live
                  AND UPPER(c.pan) = UPPER(v_staging_record.mapped_data->>'pan')
                  AND c.is_active = true
                LIMIT 1;
            END IF;
        END IF;

        IF v_customer_id IS NULL THEN
            v_error_msg := 'Customer not found: ' ||
                          COALESCE(v_staging_record.mapped_data->>'iwell_code', 'N/A') ||
                          ' / PAN: ' || COALESCE(v_staging_record.mapped_data->>'pan', 'N/A');

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
        SELECT full_name INTO v_customer_name
        FROM t_customers
        WHERE id = v_customer_id;

        -- TRANSACTION TYPE LOOKUP
        IF v_staging_record.mapped_data->>'txn_type' IS NOT NULL THEN
            SELECT id INTO v_txn_type_id
            FROM m_transaction_types
            WHERE LOWER(TRIM(txn_description)) = LOWER(TRIM(v_staging_record.mapped_data->>'txn_type'))
               OR LOWER(TRIM(txn_type)) = LOWER(TRIM(v_staging_record.mapped_data->>'txn_type'))
            LIMIT 1;

            IF v_txn_type_id IS NULL THEN
                SELECT id INTO v_txn_type_id
                FROM m_transaction_types
                WHERE LOWER(TRIM(txn_type)) LIKE '%' || LOWER(TRIM(v_staging_record.mapped_data->>'txn_type')) || '%'
                   OR LOWER(TRIM(txn_description)) LIKE '%' || LOWER(TRIM(v_staging_record.mapped_data->>'txn_type')) || '%'
                LIMIT 1;
            END IF;
        END IF;

        IF v_txn_type_id IS NULL THEN
            v_txn_type_id := 1; -- Default to first transaction type
        END IF;

        -- SCHEME LOOKUP VIA BOOKMARKS (tenant-specific)
        IF v_staging_record.mapped_data->>'scheme_code' IS NOT NULL THEN
            -- First try exact scheme_code match in bookmarks
            SELECT sb.id, sb.scheme_id, sd.scheme_code, sd.scheme_name
            INTO v_bookmark_id, v_scheme_id, v_scheme_code, v_scheme_name
            FROM t_scheme_bookmarks sb
            JOIN t_scheme_details sd ON sb.scheme_id = sd.id
            WHERE sb.tenant_id = v_staging_record.tenant_id
              AND sb.is_live = v_staging_record.is_live
              AND sd.scheme_code = v_staging_record.mapped_data->>'scheme_code'
              AND sb.is_active = true
            LIMIT 1;

            -- If not found, try alias lookup
            IF v_bookmark_id IS NULL THEN
                SELECT sb.id, sb.scheme_id, sd.scheme_code, sd.scheme_name
                INTO v_bookmark_id, v_scheme_id, v_scheme_code, v_scheme_name
                FROM t_scheme_aliases sa
                JOIN t_scheme_bookmarks sb ON sa.bookmark_id = sb.id
                JOIN t_scheme_details sd ON sb.scheme_id = sd.id
                WHERE sb.tenant_id = v_staging_record.tenant_id
                  AND sb.is_live = v_staging_record.is_live
                  AND sa.alias_name_normalized = UPPER(REPLACE(v_staging_record.mapped_data->>'scheme_code', ' ', ''))
                  AND sb.is_active = true
                LIMIT 1;
            END IF;

            -- If still not found but we have scheme_id, get scheme details
            IF v_bookmark_id IS NULL AND v_scheme_id IS NOT NULL THEN
                SELECT scheme_code, scheme_name INTO v_scheme_code, v_scheme_name
                FROM t_scheme_details
                WHERE id = v_scheme_id;
            END IF;

            -- If we have a scheme, try to find or create bookmark
            IF v_scheme_id IS NULL AND v_staging_record.mapped_data->>'scheme_code' IS NOT NULL THEN
                -- Try to find scheme in scheme_details
                SELECT id, scheme_code, scheme_name INTO v_scheme_id, v_scheme_code, v_scheme_name
                FROM t_scheme_details
                WHERE scheme_code = v_staging_record.mapped_data->>'scheme_code'
                  AND tenant_id = v_staging_record.tenant_id
                  AND is_live = v_staging_record.is_live
                LIMIT 1;

                IF v_scheme_id IS NOT NULL THEN
                    SELECT scheme_name INTO v_scheme_name
                    FROM t_scheme_details
                    WHERE id = v_scheme_id;
                END IF;
            END IF;

            -- ============================================================
            -- LOOKUP ASSET TYPE using scheme_category_id (FIXED!)
            -- Uses t_scheme_masters.name instead of m_asset_types
            -- ============================================================
            IF v_bookmark_id IS NOT NULL AND v_scheme_id IS NOT NULL THEN
                SELECT sm.name
                INTO v_asset_type_code
                FROM t_scheme_details sd
                JOIN t_scheme_masters sm ON sd.scheme_category_id = sm.id
                    AND sm.master_type = 'scheme_category'
                WHERE sd.id = v_scheme_id;

                -- Default to 'Growth' if scheme_category_id not set
                IF v_asset_type_code IS NULL THEN
                    v_asset_type_code := 'Growth';
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
                warnings = array_append(COALESCE(warnings, ARRAY[]::TEXT[]), 'Duplicate transaction detected'),
                processed_at = NOW()
            WHERE id = v_staging_record.id;

            v_duplicate_count := v_duplicate_count + 1;
            v_processed_count := v_processed_count + 1;
            CONTINUE;
        END IF;

        -- INSERT TRANSACTION
        BEGIN
            INSERT INTO t_transaction_table (
                tenant_id,
                is_live,
                portfolio_flag,
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
            -- MARK SIP ALERTS AS COMPLETE (if matching transaction)
            -- ============================================================================
            PERFORM mark_sip_alert_complete_on_transaction(
                v_staging_record.tenant_id,
                v_staging_record.is_live,
                v_customer_id,
                v_scheme_id,
                (v_staging_record.mapped_data->>'txn_date')::DATE,
                (v_staging_record.mapped_data->>'total_amount')::NUMERIC
            );

            -- ============================================================================
            -- AUTO MF ASSIGNMENT & ALERTS
            -- ============================================================================
            v_txn_amount := (v_staging_record.mapped_data->>'total_amount')::NUMERIC;

            -- Check if customer already has an MF assignment for this scheme
            SELECT id INTO v_existing_assignment_id
            FROM t_customer_asset_assignments
            WHERE tenant_id = v_staging_record.tenant_id
              AND is_live = v_staging_record.is_live
              AND customer_id = v_customer_id
              AND scheme_id = v_scheme_id
              AND is_active = true
            LIMIT 1;

            IF v_existing_assignment_id IS NULL THEN
                -- Get MF asset type id
                SELECT id INTO v_asset_type_id
                FROM m_asset_types
                WHERE asset_type_code = 'MF' AND is_active = true
                LIMIT 1;

                -- If no MF type, try to get the first active asset type
                IF v_asset_type_id IS NULL THEN
                    SELECT id INTO v_asset_type_id
                    FROM m_asset_types
                    WHERE is_active = true
                    ORDER BY id
                    LIMIT 1;
                END IF;

                IF v_asset_type_id IS NOT NULL THEN
                    -- Create new MF assignment
                    INSERT INTO t_customer_asset_assignments (
                        tenant_id, is_live, customer_id, asset_type_id, scheme_id,
                        principal_amount, start_date, is_active, created_by, created_at
                    ) VALUES (
                        v_staging_record.tenant_id, v_staging_record.is_live, v_customer_id,
                        v_asset_type_id, v_scheme_id, v_txn_amount,
                        (v_staging_record.mapped_data->>'txn_date')::DATE,
                        true, v_session_creator_id, NOW()
                    ) RETURNING id INTO v_new_assignment_id;

                    -- Create alert for new assignment
                    INSERT INTO t_alerts (
                        tenant_id, is_live, alert_type, severity, title, message,
                        entity_type, entity_id, customer_id, action_url, is_read, created_at
                    ) VALUES (
                        v_staging_record.tenant_id, v_staging_record.is_live,
                        'new_mf_assignment', 'info',
                        'New MF Investment Detected',
                        'Customer ' || COALESCE(v_customer_name, 'Unknown') || ' has a new investment in ' || COALESCE(v_scheme_name, v_scheme_code),
                        'assignment', v_new_assignment_id, v_customer_id,
                        '/customers/' || v_customer_id || '/investments',
                        false, NOW()
                    );
                END IF;
            ELSE
                -- Update existing assignment principal
                UPDATE t_customer_asset_assignments
                SET principal_amount = principal_amount + v_txn_amount,
                    updated_at = NOW()
                WHERE id = v_existing_assignment_id;
            END IF;

            -- Mark staging record as successful
            UPDATE t_import_staging_data
            SET processing_status = 'completed',
                created_record_id = v_txn_id,
                created_record_type = 'transaction',
                processed_at = NOW()
            WHERE id = v_staging_record.id;

            v_success_count := v_success_count + 1;

        EXCEPTION WHEN OTHERS THEN
            v_error_msg := SQLERRM;

            UPDATE t_import_staging_data
            SET processing_status = 'failed',
                error_messages = ARRAY[v_error_msg],
                processed_at = NOW()
            WHERE id = v_staging_record.id;

            v_failed_count := v_failed_count + 1;
        END;

        v_processed_count := v_processed_count + 1;
    END LOOP;

    -- Return summary
    RETURN QUERY SELECT
        v_processed_count,
        v_success_count,
        v_failed_count,
        v_duplicate_count,
        v_orphan_count,
        EXTRACT(EPOCH FROM (NOW() - v_start_time))::NUMERIC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION process_transaction_import_session IS
'Process transaction imports with customer lookup, PAN fallback, orphan tracking.
UPDATED v1.3: Uses scheme_category_id from t_scheme_masters for asset_type_code instead of m_asset_types.';

COMMIT;

SELECT 'MIGRATION COMPLETE!' as info;
SELECT 'Function updated: process_transaction_import_session now uses scheme_category_id' as info;
SELECT 'Existing transactions have been backfilled with correct asset_type_code' as info;
SELECT 'IMPORTANT: Regenerate portfolio snapshots to update Asset Allocation charts' as info;
