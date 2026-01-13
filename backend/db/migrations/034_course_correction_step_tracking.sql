-- Migration 034: Course Correction Step Tracking
-- Purpose: Add step-by-step status tracking for better debugging and rollback control
-- Date: 2026-01-13

-- ============================================================================
-- ADD STEP STATUS COLUMNS
-- Each step tracks: pending (not started) / pass (success) / fail (error)
-- ============================================================================

-- Step 1: Check for existing migrations
ALTER TABLE t_course_corrections
ADD COLUMN IF NOT EXISTS step_1_check_existing VARCHAR(10) DEFAULT 'pending'
CHECK (step_1_check_existing IN ('pending', 'pass', 'fail'));

-- Step 2: Get customer name
ALTER TABLE t_course_corrections
ADD COLUMN IF NOT EXISTS step_2_get_customer VARCHAR(10) DEFAULT 'pending'
CHECK (step_2_get_customer IN ('pending', 'pass', 'fail'));

-- Step 3: Get source scheme name
ALTER TABLE t_course_corrections
ADD COLUMN IF NOT EXISTS step_3_get_source_scheme VARCHAR(10) DEFAULT 'pending'
CHECK (step_3_get_source_scheme IN ('pending', 'pass', 'fail'));

-- Step 4: Get target scheme name
ALTER TABLE t_course_corrections
ADD COLUMN IF NOT EXISTS step_4_get_target_scheme VARCHAR(10) DEFAULT 'pending'
CHECK (step_4_get_target_scheme IN ('pending', 'pass', 'fail'));

-- Step 5: Count transactions
ALTER TABLE t_course_corrections
ADD COLUMN IF NOT EXISTS step_5_count_txns VARCHAR(10) DEFAULT 'pending'
CHECK (step_5_count_txns IN ('pending', 'pass', 'fail'));

-- Step 6: Backup transactions (data change starts here)
ALTER TABLE t_course_corrections
ADD COLUMN IF NOT EXISTS step_6_backup VARCHAR(10) DEFAULT 'pending'
CHECK (step_6_backup IN ('pending', 'pass', 'fail'));

-- Step 7: Update transactions
ALTER TABLE t_course_corrections
ADD COLUMN IF NOT EXISTS step_7_update_txns VARCHAR(10) DEFAULT 'pending'
CHECK (step_7_update_txns IN ('pending', 'pass', 'fail'));

-- Step 8: Regenerate snapshots
ALTER TABLE t_course_corrections
ADD COLUMN IF NOT EXISTS step_8_snapshots VARCHAR(10) DEFAULT 'pending'
CHECK (step_8_snapshots IN ('pending', 'pass', 'fail'));

-- Rename rollback_data to backup_data for clarity (keep both for compatibility)
ALTER TABLE t_course_corrections
ADD COLUMN IF NOT EXISTS backup_data JSONB;

-- Copy existing rollback_data to backup_data
UPDATE t_course_corrections
SET backup_data = rollback_data
WHERE rollback_data IS NOT NULL AND backup_data IS NULL;

-- ============================================================================
-- UPDATE COMMENTS
-- ============================================================================

COMMENT ON COLUMN t_course_corrections.step_1_check_existing IS 'Step 1: Check for existing completed migrations';
COMMENT ON COLUMN t_course_corrections.step_2_get_customer IS 'Step 2: Fetch customer name';
COMMENT ON COLUMN t_course_corrections.step_3_get_source_scheme IS 'Step 3: Fetch source scheme name';
COMMENT ON COLUMN t_course_corrections.step_4_get_target_scheme IS 'Step 4: Fetch target scheme name';
COMMENT ON COLUMN t_course_corrections.step_5_count_txns IS 'Step 5: Count transactions to migrate';
COMMENT ON COLUMN t_course_corrections.step_6_backup IS 'Step 6: Backup transaction data (rollback point)';
COMMENT ON COLUMN t_course_corrections.step_7_update_txns IS 'Step 7: Update transaction scheme codes';
COMMENT ON COLUMN t_course_corrections.step_8_snapshots IS 'Step 8: Regenerate portfolio snapshots';
COMMENT ON COLUMN t_course_corrections.backup_data IS 'JSONB backup of original transaction data for rollback';

-- ============================================================================
-- UPDATE EXISTING COMPLETED RECORDS
-- Set all steps to 'pass' for already completed migrations
-- ============================================================================

UPDATE t_course_corrections
SET
    step_1_check_existing = 'pass',
    step_2_get_customer = 'pass',
    step_3_get_source_scheme = 'pass',
    step_4_get_target_scheme = 'pass',
    step_5_count_txns = 'pass',
    step_6_backup = 'pass',
    step_7_update_txns = 'pass',
    step_8_snapshots = CASE WHEN snapshot_regenerated THEN 'pass' ELSE 'pending' END
WHERE status = 'completed';

-- ============================================================================
-- FUNCTION: Execute course correction (step-by-step version)
-- Each step is recorded individually for debugging
-- ============================================================================

CREATE OR REPLACE FUNCTION execute_course_correction_v2(
    p_correction_id INTEGER
)
RETURNS JSONB AS $$
DECLARE
    v_correction t_course_corrections%ROWTYPE;
    v_backup_data JSONB;
    v_updated_count INTEGER;
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

    -- STEP 6: Backup transactions
    BEGIN
        SELECT jsonb_build_object(
            'transactions', COALESCE(jsonb_agg(
                jsonb_build_object(
                    'id', t.id,
                    'original_scheme_code', t.scheme_code,
                    'original_scheme_name', t.scheme_name
                )
            ), '[]'::jsonb),
            'backup_timestamp', CURRENT_TIMESTAMP
        ) INTO v_backup_data
        FROM t_transaction_table t
        WHERE t.customer_id = v_correction.customer_id
          AND t.scheme_code = v_correction.source_scheme_code
          AND t.tenant_id = v_correction.tenant_id
          AND t.is_live = v_correction.is_live;

        -- Store backup data
        UPDATE t_course_corrections
        SET backup_data = v_backup_data,
            rollback_data = v_backup_data, -- Keep for backward compatibility
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

    -- STEP 7: Update transactions
    BEGIN
        UPDATE t_transaction_table
        SET scheme_code = v_correction.target_scheme_code,
            updated_at = CURRENT_TIMESTAMP
        WHERE customer_id = v_correction.customer_id
          AND scheme_code = v_correction.source_scheme_code
          AND tenant_id = v_correction.tenant_id
          AND is_live = v_correction.is_live;

        GET DIAGNOSTICS v_updated_count = ROW_COUNT;

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

    -- Mark as completed (Step 8 - snapshots - handled in application layer)
    UPDATE t_course_corrections
    SET status = 'completed'
    WHERE id = p_correction_id;

    RETURN jsonb_build_object(
        'success', true,
        'updated_transactions', v_updated_count,
        'step', 7,
        'message', 'Migration steps 6-7 completed. Step 8 (snapshots) pending.'
    );

EXCEPTION WHEN OTHERS THEN
    UPDATE t_course_corrections
    SET status = 'failed',
        error_message = 'Unexpected error: ' || SQLERRM
    WHERE id = p_correction_id;
    RETURN jsonb_build_object('success', false, 'error', SQLERRM, 'step', 0);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION execute_course_correction_v2 IS 'Executes course correction with step-by-step tracking (v2)';

-- ============================================================================
-- FUNCTION: Rollback course correction (updated for backup_data)
-- Now uses backup_data column
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
        RETURN jsonb_build_object('success', false, 'error', 'Cannot rollback - transactions were not updated');
    END IF;

    IF v_correction.status = 'rolled_back' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Already rolled back');
    END IF;

    -- Use backup_data or fallback to rollback_data
    v_backup := COALESCE(v_correction.backup_data, v_correction.rollback_data);

    IF v_backup IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'No backup data available');
    END IF;

    -- Restore each transaction to original scheme code
    FOR v_transaction IN SELECT * FROM jsonb_array_elements(v_backup->'transactions')
    LOOP
        UPDATE t_transaction_table
        SET scheme_code = v_transaction->>'original_scheme_code',
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
        step_8_snapshots = 'pending' -- Need to regenerate after rollback
    WHERE id = p_correction_id;

    RETURN jsonb_build_object(
        'success', true,
        'restored_transactions', v_updated_count,
        'message', 'Rollback completed successfully'
    );

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION rollback_course_correction_v2 IS 'Rolls back a course correction using backup_data (v2)';
