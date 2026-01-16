-- ============================================================================
-- COURSE CORRECTION v2.0 - COMBINED MIGRATION SCRIPT
-- ============================================================================
-- Release Date: January 16, 2026
--
-- This script combines migrations 034 and 035 into a single file.
-- Run this script ONCE on your database.
--
-- Features:
--   1. 8-step tracking for better debugging
--   2. Complete backup (includes units, nav, total_amount)
--   3. Units recalculation using correct scheme's NAV
--   4. Full rollback capability (restores units and NAV)
--
-- Usage:
--   psql -U your_user -d your_database -f course-correction-v2-migration.sql
-- ============================================================================

-- ============================================================================
-- PART 1: ADD STEP TRACKING COLUMNS
-- ============================================================================

DO $$ BEGIN RAISE NOTICE 'Adding step tracking columns...'; END $$;

-- Step 1: Check for existing migrations
ALTER TABLE t_course_corrections
ADD COLUMN IF NOT EXISTS step_1_check_existing VARCHAR(10) DEFAULT 'pending';

-- Add check constraint if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 't_course_corrections_step_1_check_existing_check'
    ) THEN
        ALTER TABLE t_course_corrections
        ADD CONSTRAINT t_course_corrections_step_1_check_existing_check
        CHECK (step_1_check_existing IN ('pending', 'pass', 'fail'));
    END IF;
END $$;

-- Step 2: Get customer name
ALTER TABLE t_course_corrections
ADD COLUMN IF NOT EXISTS step_2_get_customer VARCHAR(10) DEFAULT 'pending';

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 't_course_corrections_step_2_get_customer_check'
    ) THEN
        ALTER TABLE t_course_corrections
        ADD CONSTRAINT t_course_corrections_step_2_get_customer_check
        CHECK (step_2_get_customer IN ('pending', 'pass', 'fail'));
    END IF;
END $$;

-- Step 3: Get source scheme name
ALTER TABLE t_course_corrections
ADD COLUMN IF NOT EXISTS step_3_get_source_scheme VARCHAR(10) DEFAULT 'pending';

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 't_course_corrections_step_3_get_source_scheme_check'
    ) THEN
        ALTER TABLE t_course_corrections
        ADD CONSTRAINT t_course_corrections_step_3_get_source_scheme_check
        CHECK (step_3_get_source_scheme IN ('pending', 'pass', 'fail'));
    END IF;
END $$;

-- Step 4: Get target scheme name
ALTER TABLE t_course_corrections
ADD COLUMN IF NOT EXISTS step_4_get_target_scheme VARCHAR(10) DEFAULT 'pending';

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 't_course_corrections_step_4_get_target_scheme_check'
    ) THEN
        ALTER TABLE t_course_corrections
        ADD CONSTRAINT t_course_corrections_step_4_get_target_scheme_check
        CHECK (step_4_get_target_scheme IN ('pending', 'pass', 'fail'));
    END IF;
END $$;

-- Step 5: Count transactions
ALTER TABLE t_course_corrections
ADD COLUMN IF NOT EXISTS step_5_count_txns VARCHAR(10) DEFAULT 'pending';

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 't_course_corrections_step_5_count_txns_check'
    ) THEN
        ALTER TABLE t_course_corrections
        ADD CONSTRAINT t_course_corrections_step_5_count_txns_check
        CHECK (step_5_count_txns IN ('pending', 'pass', 'fail'));
    END IF;
END $$;

-- Step 6: Backup transactions
ALTER TABLE t_course_corrections
ADD COLUMN IF NOT EXISTS step_6_backup VARCHAR(10) DEFAULT 'pending';

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 't_course_corrections_step_6_backup_check'
    ) THEN
        ALTER TABLE t_course_corrections
        ADD CONSTRAINT t_course_corrections_step_6_backup_check
        CHECK (step_6_backup IN ('pending', 'pass', 'fail'));
    END IF;
END $$;

-- Step 7: Update transactions
ALTER TABLE t_course_corrections
ADD COLUMN IF NOT EXISTS step_7_update_txns VARCHAR(10) DEFAULT 'pending';

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 't_course_corrections_step_7_update_txns_check'
    ) THEN
        ALTER TABLE t_course_corrections
        ADD CONSTRAINT t_course_corrections_step_7_update_txns_check
        CHECK (step_7_update_txns IN ('pending', 'pass', 'fail'));
    END IF;
END $$;

-- Step 8: Regenerate snapshots
ALTER TABLE t_course_corrections
ADD COLUMN IF NOT EXISTS step_8_snapshots VARCHAR(10) DEFAULT 'pending';

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 't_course_corrections_step_8_snapshots_check'
    ) THEN
        ALTER TABLE t_course_corrections
        ADD CONSTRAINT t_course_corrections_step_8_snapshots_check
        CHECK (step_8_snapshots IN ('pending', 'pass', 'fail'));
    END IF;
END $$;

-- Add backup_data column
ALTER TABLE t_course_corrections
ADD COLUMN IF NOT EXISTS backup_data JSONB;

DO $$ BEGIN RAISE NOTICE 'Step tracking columns added.'; END $$;

-- ============================================================================
-- PART 2: ADD COLUMN COMMENTS
-- ============================================================================

COMMENT ON COLUMN t_course_corrections.step_1_check_existing IS 'Step 1: Check for existing completed migrations';
COMMENT ON COLUMN t_course_corrections.step_2_get_customer IS 'Step 2: Fetch customer name';
COMMENT ON COLUMN t_course_corrections.step_3_get_source_scheme IS 'Step 3: Fetch source scheme name';
COMMENT ON COLUMN t_course_corrections.step_4_get_target_scheme IS 'Step 4: Fetch target scheme name';
COMMENT ON COLUMN t_course_corrections.step_5_count_txns IS 'Step 5: Count transactions to migrate';
COMMENT ON COLUMN t_course_corrections.step_6_backup IS 'Step 6: Backup transaction data (rollback point)';
COMMENT ON COLUMN t_course_corrections.step_7_update_txns IS 'Step 7: Update transaction scheme codes, units, NAV';
COMMENT ON COLUMN t_course_corrections.step_8_snapshots IS 'Step 8: Regenerate portfolio snapshots';
COMMENT ON COLUMN t_course_corrections.backup_data IS 'JSONB backup of complete transaction data for rollback';

-- ============================================================================
-- PART 3: UPDATE EXISTING COMPLETED RECORDS
-- ============================================================================

DO $$ BEGIN RAISE NOTICE 'Updating existing completed records...'; END $$;

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
WHERE status = 'completed'
  AND step_1_check_existing IS NULL;

-- Copy existing rollback_data to backup_data
UPDATE t_course_corrections
SET backup_data = rollback_data
WHERE rollback_data IS NOT NULL AND backup_data IS NULL;

DO $$ BEGIN RAISE NOTICE 'Existing records updated.'; END $$;

-- ============================================================================
-- PART 4: CREATE/REPLACE EXECUTE FUNCTION
-- With units/NAV recalculation
-- ============================================================================

DO $$ BEGIN RAISE NOTICE 'Creating execute_course_correction_v2 function...'; END $$;

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

COMMENT ON FUNCTION execute_course_correction_v2 IS 'Executes course correction with units/NAV recalculation (v2.0)';

DO $$ BEGIN RAISE NOTICE 'execute_course_correction_v2 function created.'; END $$;

-- ============================================================================
-- PART 5: CREATE/REPLACE ROLLBACK FUNCTION
-- Restores all fields including units and NAV
-- ============================================================================

DO $$ BEGIN RAISE NOTICE 'Creating rollback_course_correction_v2 function...'; END $$;

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

COMMENT ON FUNCTION rollback_course_correction_v2 IS 'Rolls back course correction restoring all fields including units/NAV (v2.0)';

DO $$ BEGIN RAISE NOTICE 'rollback_course_correction_v2 function created.'; END $$;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '============================================================';
    RAISE NOTICE 'COURSE CORRECTION v2.0 MIGRATION COMPLETE';
    RAISE NOTICE '============================================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Changes applied:';
    RAISE NOTICE '  1. Added 8 step tracking columns (step_1 through step_8)';
    RAISE NOTICE '  2. Added backup_data column for complete transaction backup';
    RAISE NOTICE '  3. Created execute_course_correction_v2 with units recalculation';
    RAISE NOTICE '  4. Created rollback_course_correction_v2 with full restore';
    RAISE NOTICE '';
    RAISE NOTICE 'Key features:';
    RAISE NOTICE '  - Units recalculated: new_units = total_amount / correct_nav';
    RAISE NOTICE '  - Backup stores: id, scheme_code, scheme_name, units, nav, amount';
    RAISE NOTICE '  - Rollback restores all fields including units and NAV';
    RAISE NOTICE '============================================================';
END $$;
