-- Migration 027: Fix Goal Watchlist Columns
-- Adds missing watchlist_reason column and creates alias for is_watchlisted

-- Add watchlist_reason column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 't_jtbd_configurations'
        AND column_name = 'watchlist_reason'
    ) THEN
        ALTER TABLE t_jtbd_configurations
        ADD COLUMN watchlist_reason TEXT;

        COMMENT ON COLUMN t_jtbd_configurations.watchlist_reason IS 'Reason for adding the goal to watchlist';

        RAISE NOTICE 'Added watchlist_reason column to t_jtbd_configurations';
    ELSE
        RAISE NOTICE 'watchlist_reason column already exists';
    END IF;
END $$;

-- Verify the migration
DO $$
DECLARE
    v_has_watchlist_reason BOOLEAN;
    v_has_is_watchlisted BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 't_jtbd_configurations'
        AND column_name = 'watchlist_reason'
    ) INTO v_has_watchlist_reason;

    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 't_jtbd_configurations'
        AND column_name = 'is_watchlisted'
    ) INTO v_has_is_watchlisted;

    IF v_has_watchlist_reason AND v_has_is_watchlisted THEN
        RAISE NOTICE 'Migration 027 completed successfully';
        RAISE NOTICE '  - is_watchlisted: exists';
        RAISE NOTICE '  - watchlist_reason: exists';
    ELSE
        RAISE EXCEPTION 'Migration 027 verification failed';
    END IF;
END $$;
