-- Migration: Add watchlist columns to t_jtbd_configurations for goal tracking
-- Date: 2025-11-03
-- Description: Adds is_in_watchlist, watchlist_reason columns and renames is_watchlisted
--              to support goal watchlist functionality

-- ============================================================================
-- Step 1: Add new watchlist columns if they don't exist
-- ============================================================================
DO $$
BEGIN
    -- Add is_in_watchlist column (replaces is_watchlisted)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 't_jtbd_configurations'
        AND column_name = 'is_in_watchlist'
    ) THEN
        -- Check if old column exists and migrate data
        IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 't_jtbd_configurations'
            AND column_name = 'is_watchlisted'
        ) THEN
            -- Add new column and migrate data
            ALTER TABLE t_jtbd_configurations
            ADD COLUMN is_in_watchlist BOOLEAN DEFAULT FALSE;

            -- Migrate existing data
            UPDATE t_jtbd_configurations
            SET is_in_watchlist = is_watchlisted
            WHERE is_watchlisted IS NOT NULL;

            -- Drop old column
            ALTER TABLE t_jtbd_configurations
            DROP COLUMN IF EXISTS is_watchlisted;

            RAISE NOTICE 'Migrated is_watchlisted to is_in_watchlist';
        ELSE
            -- Just add the new column
            ALTER TABLE t_jtbd_configurations
            ADD COLUMN is_in_watchlist BOOLEAN DEFAULT FALSE;

            RAISE NOTICE 'Added is_in_watchlist column';
        END IF;
    ELSE
        RAISE NOTICE 'Column is_in_watchlist already exists';
    END IF;

    -- Add watchlist_reason column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 't_jtbd_configurations'
        AND column_name = 'watchlist_reason'
    ) THEN
        ALTER TABLE t_jtbd_configurations
        ADD COLUMN watchlist_reason TEXT;

        RAISE NOTICE 'Added watchlist_reason column';
    ELSE
        RAISE NOTICE 'Column watchlist_reason already exists';
    END IF;

    -- Ensure watchlist_added_at column exists (it should from previous schema)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 't_jtbd_configurations'
        AND column_name = 'watchlist_added_at'
    ) THEN
        ALTER TABLE t_jtbd_configurations
        ADD COLUMN watchlist_added_at TIMESTAMP;

        RAISE NOTICE 'Added watchlist_added_at column';
    ELSE
        RAISE NOTICE 'Column watchlist_added_at already exists';
    END IF;

    -- Drop watchlist_auto_added if it exists (no longer needed)
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 't_jtbd_configurations'
        AND column_name = 'watchlist_auto_added'
    ) THEN
        ALTER TABLE t_jtbd_configurations
        DROP COLUMN watchlist_auto_added;

        RAISE NOTICE 'Dropped watchlist_auto_added column';
    END IF;
END $$;

-- ============================================================================
-- Step 2: Update table and column comments
-- ============================================================================
COMMENT ON TABLE t_jtbd_configurations IS 'Customer alert, reminder, and goal tracking configurations';
COMMENT ON COLUMN t_jtbd_configurations.jtbd_type IS 'Type: portfolio_alert, time_based, profile_trigger, goal_tracking';
COMMENT ON COLUMN t_jtbd_configurations.is_in_watchlist IS 'Whether this goal/JTBD is in watchlist for monitoring';
COMMENT ON COLUMN t_jtbd_configurations.watchlist_reason IS 'Reason for adding to watchlist';
COMMENT ON COLUMN t_jtbd_configurations.watchlist_added_at IS 'Timestamp when added to watchlist';

-- ============================================================================
-- Step 3: Add index for watchlist queries (if not exists)
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_jtbd_configurations_watchlist
ON t_jtbd_configurations(customer_id, is_in_watchlist, watchlist_added_at DESC)
WHERE is_in_watchlist = true;

RAISE NOTICE '✓ Migration 006: Goal watchlist columns completed successfully';
