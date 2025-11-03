-- ============================================================================
-- GOALS FUNCTIONALITY - COMPLETE DATABASE SETUP
-- Date: 2025-11-03
-- Purpose: Complete SQL script for goals tracking functionality
-- Usage: Run this script on your local database to enable goals functionality
-- ============================================================================

-- This script includes:
-- 1. Goal-related tables (t_goal_alerts, t_goal_progress_snapshots, t_goal_scheme_allocations)
-- 2. Watchlist columns in t_jtbd_configurations
-- 3. All required indexes
-- 4. Foreign key constraints
-- 5. Comments and documentation

BEGIN;

\echo '========================================';
\echo 'GOALS FUNCTIONALITY SETUP';
\echo '========================================';

-- ============================================================================
-- SECTION 1: UPDATE t_jtbd_configurations FOR GOALS
-- ============================================================================
\echo 'Step 1: Updating t_jtbd_configurations for goals...';

-- Add/Update watchlist columns
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
            ALTER TABLE t_jtbd_configurations
            ADD COLUMN is_in_watchlist BOOLEAN DEFAULT FALSE;

            UPDATE t_jtbd_configurations
            SET is_in_watchlist = is_watchlisted
            WHERE is_watchlisted IS NOT NULL;

            ALTER TABLE t_jtbd_configurations
            DROP COLUMN IF EXISTS is_watchlisted;

            RAISE NOTICE '  ✓ Migrated is_watchlisted to is_in_watchlist';
        ELSE
            ALTER TABLE t_jtbd_configurations
            ADD COLUMN is_in_watchlist BOOLEAN DEFAULT FALSE;

            RAISE NOTICE '  ✓ Added is_in_watchlist column';
        END IF;
    ELSE
        RAISE NOTICE '  → is_in_watchlist already exists';
    END IF;

    -- Add watchlist_reason column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 't_jtbd_configurations'
        AND column_name = 'watchlist_reason'
    ) THEN
        ALTER TABLE t_jtbd_configurations
        ADD COLUMN watchlist_reason TEXT;

        RAISE NOTICE '  ✓ Added watchlist_reason column';
    ELSE
        RAISE NOTICE '  → watchlist_reason already exists';
    END IF;

    -- Ensure watchlist_added_at column exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 't_jtbd_configurations'
        AND column_name = 'watchlist_added_at'
    ) THEN
        ALTER TABLE t_jtbd_configurations
        ADD COLUMN watchlist_added_at TIMESTAMP;

        RAISE NOTICE '  ✓ Added watchlist_added_at column';
    ELSE
        RAISE NOTICE '  → watchlist_added_at already exists';
    END IF;

    -- Drop watchlist_auto_added if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 't_jtbd_configurations'
        AND column_name = 'watchlist_auto_added'
    ) THEN
        ALTER TABLE t_jtbd_configurations
        DROP COLUMN watchlist_auto_added;

        RAISE NOTICE '  ✓ Dropped watchlist_auto_added column';
    END IF;
END $$;

-- Update comments
COMMENT ON TABLE t_jtbd_configurations IS 'Customer alert, reminder, and goal tracking configurations';
COMMENT ON COLUMN t_jtbd_configurations.jtbd_type IS 'Type: portfolio_alert, time_based, profile_trigger, goal_tracking';
COMMENT ON COLUMN t_jtbd_configurations.is_in_watchlist IS 'Whether this goal/JTBD is in watchlist for monitoring';
COMMENT ON COLUMN t_jtbd_configurations.watchlist_reason IS 'Reason for adding to watchlist';
COMMENT ON COLUMN t_jtbd_configurations.watchlist_added_at IS 'Timestamp when added to watchlist';

\echo '  ✓ t_jtbd_configurations updated';

-- ============================================================================
-- SECTION 2: CREATE GOAL-SPECIFIC TABLES
-- ============================================================================
\echo '';
\echo 'Step 2: Creating goal-specific tables...';

-- TABLE: t_goal_alerts
CREATE TABLE IF NOT EXISTS t_goal_alerts (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES t_tenants(id),
    is_live BOOLEAN NOT NULL,
    goal_id INTEGER NOT NULL REFERENCES t_jtbd_configurations(id) ON DELETE CASCADE,
    customer_id INTEGER NOT NULL REFERENCES t_customers(id),
    alert_type VARCHAR(50) NOT NULL,
    severity VARCHAR(20) NOT NULL,
    message TEXT NOT NULL,
    action_required VARCHAR(100),
    action_details JSONB,
    is_acknowledged BOOLEAN DEFAULT FALSE,
    acknowledged_at TIMESTAMP,
    acknowledged_by INTEGER REFERENCES t_users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE t_goal_alerts IS 'Alerts generated for customer goals based on tracking and performance';
COMMENT ON COLUMN t_goal_alerts.alert_type IS 'Types: behind_schedule, low_probability, significant_deviation, milestone_achieved';
COMMENT ON COLUMN t_goal_alerts.severity IS 'Severity: critical, warning, info';
COMMENT ON COLUMN t_goal_alerts.action_details IS 'JSON with recommended actions and calculations';

\echo '  ✓ t_goal_alerts created';

-- TABLE: t_goal_progress_snapshots
CREATE TABLE IF NOT EXISTS t_goal_progress_snapshots (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES t_tenants(id),
    is_live BOOLEAN NOT NULL,
    goal_id INTEGER NOT NULL REFERENCES t_jtbd_configurations(id) ON DELETE CASCADE,
    snapshot_date DATE NOT NULL,
    current_value NUMERIC(15,2) NOT NULL,
    monthly_contribution NUMERIC(15,2) NOT NULL,
    projected_corpus NUMERIC(15,2),
    projected_achievement_date DATE,
    probability_of_success NUMERIC(5,2),
    on_track BOOLEAN,
    deviation_percentage NUMERIC(5,2),
    recalculation_trigger VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_goal_snapshot UNIQUE (goal_id, snapshot_date)
);

COMMENT ON TABLE t_goal_progress_snapshots IS 'Progress snapshots for tracking goal achievement over time';
COMMENT ON COLUMN t_goal_progress_snapshots.recalculation_trigger IS 'Reason: manual, scheduled, portfolio_update, goal_update';
COMMENT ON COLUMN t_goal_progress_snapshots.deviation_percentage IS 'Percentage deviation from expected progress';

\echo '  ✓ t_goal_progress_snapshots created';

-- TABLE: t_goal_scheme_allocations
CREATE TABLE IF NOT EXISTS t_goal_scheme_allocations (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES t_tenants(id),
    is_live BOOLEAN NOT NULL,
    goal_id INTEGER NOT NULL REFERENCES t_jtbd_configurations(id) ON DELETE CASCADE,
    customer_id INTEGER NOT NULL REFERENCES t_customers(id),
    scheme_id INTEGER NOT NULL REFERENCES t_schemes(id),
    allocation_percentage NUMERIC(5,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_goal_scheme_allocation UNIQUE (goal_id, scheme_id)
);

COMMENT ON TABLE t_goal_scheme_allocations IS 'Scheme allocations for each goal (linked_schemes in config_data)';
COMMENT ON COLUMN t_goal_scheme_allocations.allocation_percentage IS 'Percentage of goal allocated to this scheme (must sum to 100 per goal)';

\echo '  ✓ t_goal_scheme_allocations created';

-- ============================================================================
-- SECTION 3: CREATE INDEXES
-- ============================================================================
\echo '';
\echo 'Step 3: Creating indexes for optimal performance...';

-- t_jtbd_configurations indexes for goals
CREATE INDEX IF NOT EXISTS idx_jtbd_configurations_goals
ON t_jtbd_configurations(customer_id, jtbd_type, is_active)
WHERE jtbd_type = 'goal_tracking';

CREATE INDEX IF NOT EXISTS idx_jtbd_configurations_watchlist
ON t_jtbd_configurations(customer_id, is_in_watchlist, watchlist_added_at DESC)
WHERE is_in_watchlist = true;

\echo '  ✓ t_jtbd_configurations indexes created';

-- t_goal_alerts indexes
CREATE INDEX IF NOT EXISTS idx_goal_alerts_goal
ON t_goal_alerts(goal_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_goal_alerts_customer
ON t_goal_alerts(customer_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_goal_alerts_unacknowledged
ON t_goal_alerts(customer_id, is_acknowledged)
WHERE is_acknowledged = false;

CREATE INDEX IF NOT EXISTS idx_goal_alerts_tenant
ON t_goal_alerts(tenant_id, is_live, created_at DESC);

\echo '  ✓ t_goal_alerts indexes created';

-- t_goal_progress_snapshots indexes
CREATE INDEX IF NOT EXISTS idx_goal_snapshots_goal
ON t_goal_progress_snapshots(goal_id, snapshot_date DESC);

CREATE INDEX IF NOT EXISTS idx_goal_snapshots_tenant
ON t_goal_progress_snapshots(tenant_id, is_live);

CREATE INDEX IF NOT EXISTS idx_goal_snapshots_date
ON t_goal_progress_snapshots(snapshot_date DESC);

\echo '  ✓ t_goal_progress_snapshots indexes created';

-- t_goal_scheme_allocations indexes
CREATE INDEX IF NOT EXISTS idx_goal_scheme_allocations_goal
ON t_goal_scheme_allocations(goal_id);

CREATE INDEX IF NOT EXISTS idx_goal_scheme_allocations_customer
ON t_goal_scheme_allocations(customer_id);

CREATE INDEX IF NOT EXISTS idx_goal_scheme_allocations_scheme
ON t_goal_scheme_allocations(scheme_id);

\echo '  ✓ t_goal_scheme_allocations indexes created';

-- ============================================================================
-- SECTION 4: VERIFY INSTALLATION
-- ============================================================================
\echo '';
\echo 'Step 4: Verifying installation...';

DO $$
DECLARE
    v_table_count INTEGER;
    v_index_count INTEGER;
    v_column_count INTEGER;
BEGIN
    -- Check tables
    SELECT COUNT(*) INTO v_table_count
    FROM information_schema.tables
    WHERE table_name IN ('t_goal_alerts', 't_goal_progress_snapshots', 't_goal_scheme_allocations');

    IF v_table_count = 3 THEN
        RAISE NOTICE '  ✓ All 3 goal tables created';
    ELSE
        RAISE WARNING '  ⚠ Only % of 3 goal tables found', v_table_count;
    END IF;

    -- Check columns
    SELECT COUNT(*) INTO v_column_count
    FROM information_schema.columns
    WHERE table_name = 't_jtbd_configurations'
    AND column_name IN ('is_in_watchlist', 'watchlist_reason', 'watchlist_added_at');

    IF v_column_count = 3 THEN
        RAISE NOTICE '  ✓ All 3 watchlist columns added to t_jtbd_configurations';
    ELSE
        RAISE WARNING '  ⚠ Only % of 3 watchlist columns found', v_column_count;
    END IF;

    -- Check indexes
    SELECT COUNT(*) INTO v_index_count
    FROM pg_indexes
    WHERE indexname LIKE '%goal%';

    RAISE NOTICE '  ✓ % goal-related indexes created', v_index_count;
END $$;

COMMIT;

\echo '';
\echo '========================================';
\echo '✓ GOALS FUNCTIONALITY SETUP COMPLETE!';
\echo '========================================';
\echo '';
\echo 'Summary:';
\echo '  • t_jtbd_configurations: Updated with watchlist columns';
\echo '  • t_goal_alerts: Alert system for goals';
\echo '  • t_goal_progress_snapshots: Historical tracking';
\echo '  • t_goal_scheme_allocations: Scheme allocations';
\echo '  • All indexes and constraints created';
\echo '';
\echo 'Next steps:';
\echo '  1. Verify the backend API endpoints at http://localhost:5000/api/goals';
\echo '  2. Check frontend components for goals tracking';
\echo '  3. Test creating a goal through the UI or API';
\echo '';
\echo 'Goal Types Supported:';
\echo '  • time_based_goal: Fixed date, flexible amount (retirement)';
\echo '  • price_based_goal: Fixed amount, flexible timeline (purchases)';
\echo '  • time_and_price_goal: Both fixed with Monte Carlo simulation (education)';
\echo '';
