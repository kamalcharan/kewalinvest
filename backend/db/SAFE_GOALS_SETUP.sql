-- ============================================================================
-- SAFE GOALS SETUP - Checks before adding columns
-- Run this script - it will skip columns that already exist
-- ============================================================================

BEGIN;

-- Step 1: Add watchlist columns to t_jtbd_configurations (safe - checks first)
DO $$
BEGIN
    -- Add is_in_watchlist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 't_jtbd_configurations'
        AND column_name = 'is_in_watchlist'
    ) THEN
        ALTER TABLE t_jtbd_configurations
        ADD COLUMN is_in_watchlist BOOLEAN DEFAULT FALSE;
        RAISE NOTICE '✓ Added is_in_watchlist column';
    ELSE
        RAISE NOTICE '→ is_in_watchlist already exists, skipping';
    END IF;

    -- Add watchlist_reason
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 't_jtbd_configurations'
        AND column_name = 'watchlist_reason'
    ) THEN
        ALTER TABLE t_jtbd_configurations
        ADD COLUMN watchlist_reason TEXT;
        RAISE NOTICE '✓ Added watchlist_reason column';
    ELSE
        RAISE NOTICE '→ watchlist_reason already exists, skipping';
    END IF;

    -- Add watchlist_added_at
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 't_jtbd_configurations'
        AND column_name = 'watchlist_added_at'
    ) THEN
        ALTER TABLE t_jtbd_configurations
        ADD COLUMN watchlist_added_at TIMESTAMP;
        RAISE NOTICE '✓ Added watchlist_added_at column';
    ELSE
        RAISE NOTICE '→ watchlist_added_at already exists, skipping';
    END IF;
END $$;

-- Step 2: Create t_goal_alerts (safe - uses IF NOT EXISTS)
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

-- Step 3: Create t_goal_progress_snapshots (safe - uses IF NOT EXISTS)
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
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add unique constraint if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'unique_goal_snapshot'
    ) THEN
        ALTER TABLE t_goal_progress_snapshots
        ADD CONSTRAINT unique_goal_snapshot UNIQUE (goal_id, snapshot_date);
        RAISE NOTICE '✓ Added unique_goal_snapshot constraint';
    ELSE
        RAISE NOTICE '→ unique_goal_snapshot constraint already exists';
    END IF;
END $$;

-- Step 4: Create t_goal_scheme_allocations (safe - uses IF NOT EXISTS)
CREATE TABLE IF NOT EXISTS t_goal_scheme_allocations (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES t_tenants(id),
    is_live BOOLEAN NOT NULL,
    goal_id INTEGER NOT NULL REFERENCES t_jtbd_configurations(id) ON DELETE CASCADE,
    customer_id INTEGER NOT NULL REFERENCES t_customers(id),
    scheme_id INTEGER NOT NULL REFERENCES t_schemes(id),
    allocation_percentage NUMERIC(5,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add unique constraint if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'unique_goal_scheme_allocation'
    ) THEN
        ALTER TABLE t_goal_scheme_allocations
        ADD CONSTRAINT unique_goal_scheme_allocation UNIQUE (goal_id, scheme_id);
        RAISE NOTICE '✓ Added unique_goal_scheme_allocation constraint';
    ELSE
        RAISE NOTICE '→ unique_goal_scheme_allocation constraint already exists';
    END IF;
END $$;

-- Step 5: Create indexes (safe - uses IF NOT EXISTS)
\echo 'Creating indexes...';

-- t_jtbd_configurations indexes
CREATE INDEX IF NOT EXISTS idx_jtbd_configurations_goals
ON t_jtbd_configurations(customer_id, jtbd_type, is_active)
WHERE jtbd_type = 'goal_tracking';

CREATE INDEX IF NOT EXISTS idx_jtbd_configurations_watchlist
ON t_jtbd_configurations(customer_id, is_in_watchlist, watchlist_added_at DESC)
WHERE is_in_watchlist = true;

-- t_goal_alerts indexes
CREATE INDEX IF NOT EXISTS idx_goal_alerts_goal
ON t_goal_alerts(goal_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_goal_alerts_customer
ON t_goal_alerts(customer_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_goal_alerts_unacknowledged
ON t_goal_alerts(customer_id, is_acknowledged)
WHERE is_acknowledged = false;

-- t_goal_progress_snapshots indexes
CREATE INDEX IF NOT EXISTS idx_goal_snapshots_goal
ON t_goal_progress_snapshots(goal_id, snapshot_date DESC);

CREATE INDEX IF NOT EXISTS idx_goal_snapshots_tenant
ON t_goal_progress_snapshots(tenant_id, is_live);

-- t_goal_scheme_allocations indexes
CREATE INDEX IF NOT EXISTS idx_goal_scheme_allocations_goal
ON t_goal_scheme_allocations(goal_id);

CREATE INDEX IF NOT EXISTS idx_goal_scheme_allocations_customer
ON t_goal_scheme_allocations(customer_id);

CREATE INDEX IF NOT EXISTS idx_goal_scheme_allocations_scheme
ON t_goal_scheme_allocations(scheme_id);

-- Step 6: Verify installation
\echo '';
\echo 'Verifying installation...';

DO $$
DECLARE
    v_table_count INTEGER;
    v_column_count INTEGER;
BEGIN
    -- Check tables
    SELECT COUNT(*) INTO v_table_count
    FROM information_schema.tables
    WHERE table_name IN ('t_goal_alerts', 't_goal_progress_snapshots', 't_goal_scheme_allocations');

    RAISE NOTICE '✓ Found % of 3 goal tables', v_table_count;

    -- Check columns
    SELECT COUNT(*) INTO v_column_count
    FROM information_schema.columns
    WHERE table_name = 't_jtbd_configurations'
    AND column_name IN ('is_in_watchlist', 'watchlist_reason', 'watchlist_added_at');

    RAISE NOTICE '✓ Found % of 3 watchlist columns in t_jtbd_configurations', v_column_count;
END $$;

COMMIT;

\echo '';
\echo '========================================';
\echo '✓ GOALS SETUP COMPLETE!';
\echo '========================================';
\echo 'You can now test the goals functionality';
\echo '';
