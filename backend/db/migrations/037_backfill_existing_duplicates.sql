-- Migration: 037_backfill_existing_duplicates.sql
-- Description: Backfill duplicate transactions from past imports that were skipped.
--              Re-processes staging records with processing_status='duplicate' and
--              inserts them into t_transaction_table with is_potential_duplicate=true,
--              portfolio_flag=false.
-- Date: 2026-03-31
--
-- IMPORTANT: Run 036_fix_duplicate_transaction_insert.sql FIRST (future prevention).
--            This script handles existing/historical data.
--
-- Steps:
--   1) Find all sessions (across all tenants) that have duplicate staging records
--   2) For each duplicate staging record, resolve customer/scheme/txn_type lookups
--   3) Insert into t_transaction_table with duplicate tagging
--
-- Safe to re-run: uses NOT EXISTS to skip already-backfilled records.

DO $$
DECLARE
    v_staging RECORD;
    v_customer_id INTEGER;
    v_scheme_id INTEGER;
    v_scheme_code VARCHAR;
    v_scheme_name VARCHAR;
    v_bookmark_id INTEGER;
    v_txn_type_id INTEGER;
    v_asset_type_code VARCHAR;
    v_txn_id INTEGER;
    v_inserted_count INTEGER := 0;
    v_skipped_count INTEGER := 0;
    v_failed_count INTEGER := 0;
    v_total_count INTEGER := 0;
BEGIN
    RAISE NOTICE '=== Backfill Existing Duplicates: START ===';

    -- Step 1 & 2: Loop through all staging records marked as 'duplicate' across all sessions/tenants
    FOR v_staging IN (
        SELECT
            sd.id,
            sd.session_id,
            sd.row_number,
            sd.mapped_data,
            sd.tenant_id,
            sd.is_live
        FROM t_import_staging_data sd
        INNER JOIN t_import_sessions s ON s.id = sd.session_id
        WHERE sd.processing_status = 'duplicate'
          AND s.import_type = 'TransactionData'
        ORDER BY sd.session_id, sd.id
    ) LOOP
        v_total_count := v_total_count + 1;
        v_customer_id := NULL;
        v_scheme_id := NULL;
        v_scheme_code := NULL;
        v_scheme_name := NULL;
        v_bookmark_id := NULL;
        v_txn_type_id := NULL;
        v_asset_type_code := NULL;

        BEGIN
            -- CUSTOMER LOOKUP (iwell_code with PAN fallback)
            IF v_staging.mapped_data->>'iwell_code' IS NOT NULL THEN
                SELECT c.id INTO v_customer_id
                FROM t_customers c
                WHERE c.tenant_id = v_staging.tenant_id
                  AND c.is_live = v_staging.is_live
                  AND UPPER(c.iwell_code) = UPPER(v_staging.mapped_data->>'iwell_code')
                  AND c.is_active = true
                LIMIT 1;
            END IF;

            -- PAN fallback
            IF v_customer_id IS NULL AND v_staging.mapped_data->>'pan' IS NOT NULL THEN
                SELECT c.id INTO v_customer_id
                FROM t_customers c
                WHERE c.tenant_id = v_staging.tenant_id
                  AND c.is_live = v_staging.is_live
                  AND UPPER(c.pan) = UPPER(v_staging.mapped_data->>'pan')
                  AND c.is_active = true
                LIMIT 1;
            END IF;

            -- Customer name fallback
            IF v_customer_id IS NULL AND v_staging.mapped_data->>'customer_name' IS NOT NULL THEN
                SELECT c.id INTO v_customer_id
                FROM t_customers c
                INNER JOIN t_contacts ct ON ct.id = c.contact_id
                WHERE c.tenant_id = v_staging.tenant_id
                  AND c.is_live = v_staging.is_live
                  AND ct.normalized_name = normalize_customer_name(v_staging.mapped_data->>'customer_name')
                  AND c.is_active = true
                  AND ct.is_active = true
                LIMIT 1;
            END IF;

            IF v_customer_id IS NULL THEN
                RAISE NOTICE '[Backfill] Staging ID %: Customer not found, skipping', v_staging.id;
                v_skipped_count := v_skipped_count + 1;
                CONTINUE;
            END IF;

            -- TRANSACTION TYPE LOOKUP
            IF v_staging.mapped_data->>'txn_code' IS NOT NULL
               AND TRIM(v_staging.mapped_data->>'txn_code') != '' THEN

                SELECT id INTO v_txn_type_id
                FROM m_transaction_types
                WHERE UPPER(TRIM(txn_code)) = UPPER(TRIM(v_staging.mapped_data->>'txn_code'))
                  AND is_active = true
                LIMIT 1;

                IF v_txn_type_id IS NULL THEN
                    SELECT id INTO v_txn_type_id
                    FROM m_transaction_types
                    WHERE UPPER(TRIM(txn_name)) = UPPER(TRIM(v_staging.mapped_data->>'txn_code'))
                      AND is_active = true
                    LIMIT 1;
                END IF;
            END IF;

            IF v_txn_type_id IS NULL THEN
                RAISE NOTICE '[Backfill] Staging ID %: Txn type not found, skipping', v_staging.id;
                v_skipped_count := v_skipped_count + 1;
                CONTINUE;
            END IF;

            -- SCHEME LOOKUP (alias -> bookmark)
            IF v_staging.mapped_data->>'scheme_name' IS NOT NULL AND
               TRIM(v_staging.mapped_data->>'scheme_name') != '' THEN

                SELECT sa.scheme_id INTO v_scheme_id
                FROM t_scheme_aliases sa
                WHERE sa.is_active = true
                  AND LOWER(TRIM(sa.alias_name)) = LOWER(TRIM(v_staging.mapped_data->>'scheme_name'))
                LIMIT 1;

                IF v_scheme_id IS NOT NULL THEN
                    SELECT sb.id, sb.scheme_code, sb.scheme_name
                    INTO v_bookmark_id, v_scheme_code, v_scheme_name
                    FROM t_scheme_bookmarks sb
                    WHERE sb.tenant_id = v_staging.tenant_id
                      AND sb.is_live = v_staging.is_live
                      AND sb.scheme_id = v_scheme_id
                      AND sb.is_active = true
                    LIMIT 1;

                    IF v_bookmark_id IS NULL THEN
                        SELECT scheme_name INTO v_scheme_name
                        FROM t_scheme_details
                        WHERE id = v_scheme_id;
                    END IF;

                    -- Asset type code lookup
                    SELECT sm.name
                    INTO v_asset_type_code
                    FROM t_scheme_details sd
                    JOIN t_scheme_masters sm ON sd.scheme_type_id = sm.id
                    WHERE sd.id = v_scheme_id;

                    IF v_asset_type_code IS NULL THEN
                        v_asset_type_code := 'Open Ended';
                    END IF;
                END IF;
            END IF;

            IF v_bookmark_id IS NULL OR v_scheme_code IS NULL OR TRIM(v_scheme_code) = '' THEN
                RAISE NOTICE '[Backfill] Staging ID %: Scheme not bookmarked, skipping', v_staging.id;
                v_skipped_count := v_skipped_count + 1;
                CONTINUE;
            END IF;

            -- SAFETY CHECK: Skip if this staging record was already backfilled
            IF EXISTS (
                SELECT 1 FROM t_transaction_table
                WHERE staging_record_id = v_staging.id
                  AND is_potential_duplicate = true
            ) THEN
                RAISE NOTICE '[Backfill] Staging ID %: Already backfilled, skipping', v_staging.id;
                v_skipped_count := v_skipped_count + 1;
                CONTINUE;
            END IF;

            -- Step 3: INSERT the duplicate transaction with tagging
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
                is_potential_duplicate,
                duplicate_reason,
                portfolio_flag,
                created_at,
                updated_at
            ) VALUES (
                v_staging.tenant_id,
                v_staging.is_live,
                true,
                v_customer_id,
                v_scheme_id,
                v_scheme_code,
                v_scheme_name,
                v_staging.mapped_data->>'folio_no',
                v_txn_type_id,
                (v_staging.mapped_data->>'txn_date')::DATE,
                (v_staging.mapped_data->>'total_amount')::NUMERIC,
                NULLIF(v_staging.mapped_data->>'units', '')::NUMERIC,
                NULLIF(v_staging.mapped_data->>'nav', '')::NUMERIC,
                NULLIF(v_staging.mapped_data->>'stamp_duty', '')::NUMERIC,
                NULLIF(v_staging.mapped_data->>'stt', '')::NUMERIC,
                NULLIF(v_staging.mapped_data->>'tds', '')::NUMERIC,
                v_staging.mapped_data->>'txn_description',
                'import',
                v_staging.id,
                v_staging.session_id,
                v_asset_type_code,
                true,
                'Import duplicate: matching customer + scheme + date + amount (backfill from session ' || v_staging.session_id || ')',
                false,
                NOW(),
                NOW()
            ) RETURNING id INTO v_txn_id;

            v_inserted_count := v_inserted_count + 1;

            IF v_inserted_count % 100 = 0 THEN
                RAISE NOTICE '[Backfill] Progress: % inserted so far...', v_inserted_count;
            END IF;

        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE '[Backfill] Staging ID %: ERROR - %', v_staging.id, SQLERRM;
            v_failed_count := v_failed_count + 1;
        END;
    END LOOP;

    RAISE NOTICE '=== Backfill Existing Duplicates: COMPLETE ===';
    RAISE NOTICE 'Total staging duplicates found: %', v_total_count;
    RAISE NOTICE 'Inserted as tagged duplicates:   %', v_inserted_count;
    RAISE NOTICE 'Skipped (no match or already done): %', v_skipped_count;
    RAISE NOTICE 'Failed:                          %', v_failed_count;
END;
$$;
