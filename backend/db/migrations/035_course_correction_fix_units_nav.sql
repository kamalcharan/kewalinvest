-- Migration 035: Fix Course Correction to Recalculate Units and NAV
-- Purpose: When scheme_code changes, units must be recalculated using correct scheme's NAV
-- Date: 2026-01-16
--
-- Problem: Previous version only changed scheme_code, leaving units calculated at wrong NAV
-- Solution:
--   1. Backup complete transaction data (id, scheme_code, scheme_name, units, nav, total_amount)
--   2. For each transaction, look up correct scheme's NAV on txn_date
--   3. Recalculate units = total_amount / correct_nav
--   4. Update scheme_code, scheme_name, units, nav
--   5. Rollback restores all fields

-- ============================================================================
-- FUNCTION: Execute course correction v3 (with units/NAV recalculation)
-- ============================================================================

CREATE OR REPLACE FUNCTION execute_course_correction_v2(
    p_correction_id INTEGER
)
RETURNS JSONB AS $$
DECLARE
    v_correction t_course_corrections%ROWTYPE;
    v_backup_data JSONB;
    v_target_scheme_name VARCHAR(255);
    v_updated_count INTEGER := 0;
    v_txn RECORD;
    v_nav_value DECIMAL(15,4);
    v_new_units DECIMAL(15,4);
    v_missing_nav_dates TEXT[];
    v_missing_nav_count INTEGER := 0;
BEGIN
    -- Get the correction record
    SELECT * INTO v_correction
    FROM t_course_corrections
    WHERE id = p_correction_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Correction record not found', 'step', 0);
    END IF;

    IF v_correction.status NOT IN ('pending', 'failed') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Correction is not in pending/failed status', 'step', 0);
    END IF;

    -- Get target scheme name
    SELECT scheme_name INTO v_target_scheme_name
    FROM t_scheme_details
    WHERE scheme_code = v_correction.target_scheme_code
    LIMIT 1;

    -- STEP 6: Backup COMPLETE transaction data (including units and nav)
    BEGIN
        SELECT jsonb_build_object(
            'transactions', COALESCE(jsonb_agg(
                jsonb_build_object(
                    'id', t.id,
                    'original_scheme_code', t.scheme_code,
                    'original_scheme_name', t.scheme_name,
                    'original_units', t.units,
                    'original_nav', t.nav,
                    'total_amount', t.total_amount,
                    'txn_date', t.txn_date
                )
            ), '[]'::jsonb),
            'backup_timestamp', CURRENT_TIMESTAMP,
            'target_scheme_code', v_correction.target_scheme_code,
            'target_scheme_name', v_target_scheme_name
        ) INTO v_backup_data
        FROM t_transaction_table t
        WHERE t.customer_id = v_correction.customer_id
          AND t.scheme_code = v_correction.source_scheme_code
          AND t.tenant_id = v_correction.tenant_id
          AND t.is_live = v_correction.is_live;

        -- Store backup data
        UPDATE t_course_corrections
        SET backup_data = v_backup_data,
            rollback_data = v_backup_data,
            step_6_backup = 'pass'
        WHERE id = p_correction_id;

    EXCEPTION WHEN OTHERS THEN
        UPDATE t_course_corrections
        SET step_6_backup = 'fail',
            status = 'failed',
            error_message = 'Step 6 (Backup): ' || SQLERRM
        WHERE id = p_correction_id;
        RETURN jsonb_build_object('success', false, 'error', SQLERRM, 'step', 6);
    END;

    -- STEP 7: Update transactions with recalculated units
    BEGIN
        -- Initialize missing NAV dates array
        v_missing_nav_dates := ARRAY[]::TEXT[];

        -- Loop through each transaction to update
        FOR v_txn IN
            SELECT t.id, t.txn_date, t.total_amount
            FROM t_transaction_table t
            WHERE t.customer_id = v_correction.customer_id
              AND t.scheme_code = v_correction.source_scheme_code
              AND t.tenant_id = v_correction.tenant_id
              AND t.is_live = v_correction.is_live
        LOOP
            -- Look up the correct scheme's NAV on the transaction date
            -- Try exact date first, then most recent before that date
            SELECT nav_value INTO v_nav_value
            FROM t_nav_data
            WHERE scheme_code = v_correction.target_scheme_code
              AND nav_date <= v_txn.txn_date
            ORDER BY nav_date DESC
            LIMIT 1;

            IF v_nav_value IS NULL OR v_nav_value = 0 THEN
                -- Record missing NAV date but continue
                v_missing_nav_dates := array_append(v_missing_nav_dates, v_txn.txn_date::TEXT);
                v_missing_nav_count := v_missing_nav_count + 1;

                -- Use a fallback: get the earliest available NAV for target scheme
                SELECT nav_value INTO v_nav_value
                FROM t_nav_data
                WHERE scheme_code = v_correction.target_scheme_code
                ORDER BY nav_date ASC
                LIMIT 1;

                IF v_nav_value IS NULL OR v_nav_value = 0 THEN
                    -- No NAV at all for target scheme - critical failure
                    UPDATE t_course_corrections
                    SET step_7_update_txns = 'fail',
                        status = 'failed',
                        error_message = 'Step 7: No NAV data found for target scheme ' || v_correction.target_scheme_code
                    WHERE id = p_correction_id;
                    RETURN jsonb_build_object(
                        'success', false,
                        'error', 'No NAV data available for target scheme ' || v_correction.target_scheme_code,
                        'step', 7
                    );
                END IF;
            END IF;

            -- Calculate new units = total_amount / nav
            v_new_units := ROUND(v_txn.total_amount / v_nav_value, 4);

            -- Update the transaction with new scheme_code, scheme_name, units, nav
            UPDATE t_transaction_table
            SET scheme_code = v_correction.target_scheme_code,
                scheme_name = v_target_scheme_name,
                units = v_new_units,
                nav = v_nav_value,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = v_txn.id;

            v_updated_count := v_updated_count + 1;
        END LOOP;

        -- Update correction record
        UPDATE t_course_corrections
        SET step_7_update_txns = 'pass',
            transaction_count = v_updated_count,
            executed_at = CURRENT_TIMESTAMP
        WHERE id = p_correction_id;

    EXCEPTION WHEN OTHERS THEN
        UPDATE t_course_corrections
        SET step_7_update_txns = 'fail',
            status = 'failed',
            error_message = 'Step 7 (Update): ' || SQLERRM
        WHERE id = p_correction_id;
        RETURN jsonb_build_object('success', false, 'error', SQLERRM, 'step', 7);
    END;

    -- Mark as completed
    UPDATE t_course_corrections
    SET status = 'completed'
    WHERE id = p_correction_id;

    RETURN jsonb_build_object(
        'success', true,
        'updated_transactions', v_updated_count,
        'missing_nav_dates', v_missing_nav_count,
        'step', 7,
        'message', 'Migration completed. Units recalculated using correct NAV.'
    );

EXCEPTION WHEN OTHERS THEN
    UPDATE t_course_corrections
    SET status = 'failed',
        error_message = 'Unexpected error: ' || SQLERRM
    WHERE id = p_correction_id;
    RETURN jsonb_build_object('success', false, 'error', SQLERRM, 'step', 0);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION execute_course_correction_v2 IS 'Executes course correction with units/NAV recalculation (v3 - fixes units bug)';

-- ============================================================================
-- FUNCTION: Rollback course correction v2 (restores units and NAV)
-- ============================================================================

CREATE OR REPLACE FUNCTION rollback_course_correction_v2(
    p_correction_id INTEGER,
    p_user_id INTEGER
)
RETURNS JSONB AS $$
DECLARE
    v_correction t_course_corrections%ROWTYPE;
    v_transaction JSONB;
    v_updated_count INTEGER := 0;
    v_backup JSONB;
BEGIN
    -- Get the correction record
    SELECT * INTO v_correction
    FROM t_course_corrections
    WHERE id = p_correction_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Correction record not found');
    END IF;

    -- Can only rollback if step 7 (update) passed
    IF v_correction.step_7_update_txns != 'pass' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Cannot rollback - transactions were not updated (step 7 not passed)');
    END IF;

    IF v_correction.status = 'rolled_back' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Already rolled back');
    END IF;

    -- Use backup_data or fallback to rollback_data
    v_backup := COALESCE(v_correction.backup_data, v_correction.rollback_data);

    IF v_backup IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'No backup data available');
    END IF;

    -- Restore each transaction to original values (scheme_code, scheme_name, units, nav)
    FOR v_transaction IN SELECT * FROM jsonb_array_elements(v_backup->'transactions')
    LOOP
        UPDATE t_transaction_table
        SET scheme_code = v_transaction->>'original_scheme_code',
            scheme_name = v_transaction->>'original_scheme_name',
            units = COALESCE((v_transaction->>'original_units')::DECIMAL, units),
            nav = COALESCE((v_transaction->>'original_nav')::DECIMAL, nav),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = (v_transaction->>'id')::INTEGER;

        v_updated_count := v_updated_count + 1;
    END LOOP;

    -- Update the correction record
    UPDATE t_course_corrections
    SET status = 'rolled_back',
        rolled_back_at = CURRENT_TIMESTAMP,
        rolled_back_by = p_user_id,
        snapshot_regenerated = false,
        step_8_snapshots = 'pending'
    WHERE id = p_correction_id;

    RETURN jsonb_build_object(
        'success', true,
        'restored_transactions', v_updated_count,
        'message', 'Rollback completed - scheme_code, scheme_name, units, and NAV restored'
    );

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION rollback_course_correction_v2 IS 'Rolls back course correction restoring all fields including units/NAV (v3)';

-- ============================================================================
-- INFO
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE 'Migration 035 applied successfully';
    RAISE NOTICE 'execute_course_correction_v2 now recalculates units using correct NAV';
    RAISE NOTICE 'rollback_course_correction_v2 now restores units and NAV';
END $$;
