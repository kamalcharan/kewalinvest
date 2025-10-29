-- Migration: Portfolio Snapshot Scheduler
-- Description: Add tables and indexes for automated portfolio snapshot generation
-- Date: 2025-10-27
-- Related Feature: Cruise Control - Portfolio Snapshots

-- ============================================================================
-- PORTFOLIO SNAPSHOT SCHEDULER TABLES
-- ============================================================================

-- Scheduler configuration table (tenant-isolated)
CREATE TABLE IF NOT EXISTS t_portfolio_snapshot_configs (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES t_tenants(id),
    user_id INTEGER NOT NULL REFERENCES t_users(id),
    is_live BOOLEAN NOT NULL,
    schedule_type VARCHAR(20) NOT NULL DEFAULT 'weekly',
    cron_expression VARCHAR(100) NOT NULL DEFAULT '0 21 * * 5',  -- Friday 9 PM
    is_enabled BOOLEAN NOT NULL DEFAULT true,
    last_executed_at TIMESTAMP,
    next_execution_at TIMESTAMP,
    execution_count INTEGER NOT NULL DEFAULT 0,
    failure_count INTEGER NOT NULL DEFAULT 0,
    max_retries INTEGER NOT NULL DEFAULT 3,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_snapshot_scheduler UNIQUE(tenant_id, is_live),
    CONSTRAINT valid_schedule_type CHECK (schedule_type IN ('weekly', 'monthly', 'custom'))
);

COMMENT ON TABLE t_portfolio_snapshot_configs IS 'Scheduler configurations for automated portfolio snapshot generation - tenant isolated';
COMMENT ON COLUMN t_portfolio_snapshot_configs.schedule_type IS 'Type of schedule: weekly (default: Friday 9 PM), monthly, or custom cron';
COMMENT ON COLUMN t_portfolio_snapshot_configs.cron_expression IS 'Cron expression for schedule. Default: 0 21 * * 5 (Friday 9 PM)';
COMMENT ON COLUMN t_portfolio_snapshot_configs.max_retries IS 'Maximum retry attempts on failure. Default: 3';

-- Execution history tracking
CREATE TABLE IF NOT EXISTS t_portfolio_snapshot_executions (
    id SERIAL PRIMARY KEY,
    scheduler_config_id INTEGER NOT NULL REFERENCES t_portfolio_snapshot_configs(id) ON DELETE CASCADE,
    tenant_id INTEGER NOT NULL,
    is_live BOOLEAN NOT NULL,
    execution_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) NOT NULL,
    trigger_source VARCHAR(20) NOT NULL,
    snapshot_month_end DATE,
    customers_processed INTEGER DEFAULT 0,
    customers_failed INTEGER DEFAULT 0,
    snapshots_created INTEGER DEFAULT 0,
    snapshots_updated INTEGER DEFAULT 0,
    retry_attempt INTEGER DEFAULT 0,
    error_message TEXT,
    error_details JSONB,
    execution_duration_ms INTEGER,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_status CHECK (status IN ('success', 'failed', 'running', 'retrying', 'skipped')),
    CONSTRAINT valid_trigger_source CHECK (trigger_source IN ('scheduled', 'manual'))
);

COMMENT ON TABLE t_portfolio_snapshot_executions IS 'Execution history and audit log for portfolio snapshot jobs';
COMMENT ON COLUMN t_portfolio_snapshot_executions.snapshot_month_end IS 'The month-end date for which snapshots were generated';
COMMENT ON COLUMN t_portfolio_snapshot_executions.retry_attempt IS 'Which retry attempt this is (0 = first attempt, 1-3 = retries)';
COMMENT ON COLUMN t_portfolio_snapshot_executions.trigger_source IS 'Whether this was scheduled or manually triggered';

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_snapshot_configs_tenant
ON t_portfolio_snapshot_configs(tenant_id, is_live);

CREATE INDEX IF NOT EXISTS idx_snapshot_configs_enabled
ON t_portfolio_snapshot_configs(is_enabled)
WHERE is_enabled = true;

CREATE INDEX IF NOT EXISTS idx_snapshot_configs_next_execution
ON t_portfolio_snapshot_configs(next_execution_at)
WHERE is_enabled = true AND next_execution_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_snapshot_executions_config
ON t_portfolio_snapshot_executions(scheduler_config_id);

CREATE INDEX IF NOT EXISTS idx_snapshot_executions_tenant
ON t_portfolio_snapshot_executions(tenant_id, is_live, execution_time DESC);

CREATE INDEX IF NOT EXISTS idx_snapshot_executions_status
ON t_portfolio_snapshot_executions(status, execution_time DESC);

CREATE INDEX IF NOT EXISTS idx_snapshot_executions_month
ON t_portfolio_snapshot_executions(snapshot_month_end, tenant_id, is_live);

-- ============================================================================
-- DEFAULT CONFIGURATIONS (Optional - run after tenant creation)
-- ============================================================================

-- This section provides a template for creating default configs for existing tenants
-- Uncomment and modify as needed

/*
-- Example: Create default configs for existing tenants
INSERT INTO t_portfolio_snapshot_configs (
    tenant_id,
    user_id,
    is_live,
    schedule_type,
    cron_expression,
    is_enabled,
    max_retries,
    created_at
)
SELECT
    t.id as tenant_id,
    (SELECT id FROM t_users WHERE tenant_id = t.id AND role = 'admin' LIMIT 1) as user_id,
    true as is_live,
    'weekly' as schedule_type,
    '0 21 * * 5' as cron_expression,  -- Friday 9 PM
    true as is_enabled,
    3 as max_retries,
    CURRENT_TIMESTAMP as created_at
FROM t_tenants t
WHERE NOT EXISTS (
    SELECT 1 FROM t_portfolio_snapshot_configs
    WHERE tenant_id = t.id AND is_live = true
);
*/

-- ============================================================================
-- MIGRATION VERIFICATION
-- ============================================================================

DO $$
BEGIN
    -- Verify tables exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 't_portfolio_snapshot_configs') THEN
        RAISE EXCEPTION 'Migration failed: t_portfolio_snapshot_configs table not created';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 't_portfolio_snapshot_executions') THEN
        RAISE EXCEPTION 'Migration failed: t_portfolio_snapshot_executions table not created';
    END IF;

    RAISE NOTICE '✓ Portfolio Snapshot Scheduler migration completed successfully';
    RAISE NOTICE '  - t_portfolio_snapshot_configs table created';
    RAISE NOTICE '  - t_portfolio_snapshot_executions table created';
    RAISE NOTICE '  - Indexes created for performance optimization';
    RAISE NOTICE '  - Default schedule: Friday 9 PM with 3 retries';
END $$;
