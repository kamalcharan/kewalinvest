-- Migration: Generic Jobs System
-- Description: Refactor portfolio snapshot scheduler into generic jobs infrastructure
-- Date: 2025-10-27
-- Related: JOBS_SYSTEM_REFACTORING_PLAN.md

-- ============================================================================
-- STEP 1: CREATE GENERIC JOBS TABLES
-- ============================================================================

-- Job Types Registry (Master table)
CREATE TABLE IF NOT EXISTS m_job_types (
    code VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    default_cron_expression VARCHAR(100),
    default_max_retries INTEGER DEFAULT 3,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE m_job_types IS 'Registry of all available job types in the system';
COMMENT ON COLUMN m_job_types.code IS 'Unique job type identifier (e.g., PORTFOLIO_SNAPSHOT)';
COMMENT ON COLUMN m_job_types.default_cron_expression IS 'Default schedule for this job type';

-- Insert initial job types
INSERT INTO m_job_types (code, name, description, default_cron_expression, default_max_retries) VALUES
('PORTFOLIO_SNAPSHOT', 'Portfolio Snapshot Generation', 'Generate monthly portfolio snapshots for all customers to enable performance tracking', '0 21 * * 5', 3)
ON CONFLICT (code) DO NOTHING;

-- Generic Job Scheduler Configurations (replaces t_portfolio_snapshot_configs)
CREATE TABLE IF NOT EXISTS t_job_scheduler_configs (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES t_tenants(id),
    job_type VARCHAR(50) NOT NULL REFERENCES m_job_types(code),
    user_id INTEGER NOT NULL REFERENCES t_users(id),
    is_live BOOLEAN NOT NULL,
    schedule_type VARCHAR(20) NOT NULL DEFAULT 'weekly',
    cron_expression VARCHAR(100) NOT NULL,
    is_enabled BOOLEAN NOT NULL DEFAULT true,
    max_retries INTEGER NOT NULL DEFAULT 3,
    job_config JSONB,
    last_executed_at TIMESTAMP,
    next_execution_at TIMESTAMP,
    execution_count INTEGER DEFAULT 0,
    failure_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_job_scheduler_config UNIQUE(tenant_id, job_type, is_live),
    CONSTRAINT valid_schedule_type CHECK (schedule_type IN ('daily', 'weekly', 'monthly', 'custom'))
);

COMMENT ON TABLE t_job_scheduler_configs IS 'Scheduler configurations for all job types - tenant isolated';
COMMENT ON COLUMN t_job_scheduler_configs.job_type IS 'Type of job (references m_job_types.code)';
COMMENT ON COLUMN t_job_scheduler_configs.job_config IS 'Job-specific configuration as JSON (flexible per job type)';

-- Generic Job Executions (replaces t_portfolio_snapshot_executions)
CREATE TABLE IF NOT EXISTS t_job_executions (
    id SERIAL PRIMARY KEY,
    scheduler_config_id INTEGER NOT NULL REFERENCES t_job_scheduler_configs(id) ON DELETE CASCADE,
    job_type VARCHAR(50) NOT NULL REFERENCES m_job_types(code),
    tenant_id INTEGER NOT NULL,
    is_live BOOLEAN NOT NULL,
    execution_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) NOT NULL,
    trigger_source VARCHAR(20) NOT NULL,
    retry_attempt INTEGER DEFAULT 0,
    execution_data JSONB,
    error_message TEXT,
    error_details JSONB,
    execution_duration_ms INTEGER,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_status CHECK (status IN ('success', 'failed', 'running', 'retrying', 'skipped')),
    CONSTRAINT valid_trigger_source CHECK (trigger_source IN ('scheduled', 'manual'))
);

COMMENT ON TABLE t_job_executions IS 'Execution history and audit log for all job types';
COMMENT ON COLUMN t_job_executions.execution_data IS 'Job-specific execution results/metrics as JSON (flexible per job type)';

-- ============================================================================
-- STEP 2: MIGRATE EXISTING PORTFOLIO SNAPSHOT DATA
-- ============================================================================

-- Migrate configurations from old table to new generic table
INSERT INTO t_job_scheduler_configs (
    tenant_id,
    job_type,
    user_id,
    is_live,
    schedule_type,
    cron_expression,
    is_enabled,
    max_retries,
    job_config,
    last_executed_at,
    next_execution_at,
    execution_count,
    failure_count,
    created_at,
    updated_at
)
SELECT
    tenant_id,
    'PORTFOLIO_SNAPSHOT' as job_type,
    user_id,
    is_live,
    schedule_type,
    cron_expression,
    is_enabled,
    max_retries,
    NULL as job_config,  -- No job-specific config for now
    last_executed_at,
    next_execution_at,
    execution_count,
    failure_count,
    created_at,
    updated_at
FROM t_portfolio_snapshot_configs
WHERE EXISTS (SELECT 1 FROM t_portfolio_snapshot_configs)
ON CONFLICT (tenant_id, job_type, is_live) DO NOTHING;

-- Migrate executions from old table to new generic table
INSERT INTO t_job_executions (
    scheduler_config_id,
    job_type,
    tenant_id,
    is_live,
    execution_time,
    status,
    trigger_source,
    retry_attempt,
    execution_data,
    error_message,
    error_details,
    execution_duration_ms,
    started_at,
    completed_at,
    created_at
)
SELECT
    -- Map old config id to new config id
    (SELECT jsc.id FROM t_job_scheduler_configs jsc
     WHERE jsc.tenant_id = old_exec.tenant_id
     AND jsc.job_type = 'PORTFOLIO_SNAPSHOT'
     AND jsc.is_live = old_exec.is_live
     LIMIT 1) as scheduler_config_id,
    'PORTFOLIO_SNAPSHOT' as job_type,
    old_exec.tenant_id,
    old_exec.is_live,
    old_exec.execution_time,
    old_exec.status,
    old_exec.trigger_source,
    old_exec.retry_attempt,
    -- Convert portfolio-specific fields to generic execution_data JSON
    jsonb_build_object(
        'snapshot_month_end', old_exec.snapshot_month_end,
        'customers_processed', old_exec.customers_processed,
        'customers_failed', old_exec.customers_failed,
        'snapshots_created', old_exec.snapshots_created,
        'snapshots_updated', old_exec.snapshots_updated
    ) as execution_data,
    old_exec.error_message,
    old_exec.error_details,
    old_exec.execution_duration_ms,
    old_exec.started_at,
    old_exec.completed_at,
    old_exec.created_at
FROM t_portfolio_snapshot_executions old_exec
WHERE EXISTS (SELECT 1 FROM t_portfolio_snapshot_executions)
AND EXISTS (
    SELECT 1 FROM t_job_scheduler_configs jsc
    WHERE jsc.tenant_id = old_exec.tenant_id
    AND jsc.job_type = 'PORTFOLIO_SNAPSHOT'
    AND jsc.is_live = old_exec.is_live
)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- STEP 3: CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_job_configs_tenant
ON t_job_scheduler_configs(tenant_id, is_live, job_type);

CREATE INDEX IF NOT EXISTS idx_job_configs_enabled
ON t_job_scheduler_configs(is_enabled)
WHERE is_enabled = true;

CREATE INDEX IF NOT EXISTS idx_job_configs_next_execution
ON t_job_scheduler_configs(next_execution_at)
WHERE is_enabled = true AND next_execution_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_job_executions_config
ON t_job_executions(scheduler_config_id);

CREATE INDEX IF NOT EXISTS idx_job_executions_tenant
ON t_job_executions(tenant_id, is_live, job_type, execution_time DESC);

CREATE INDEX IF NOT EXISTS idx_job_executions_status
ON t_job_executions(job_type, status, execution_time DESC);

CREATE INDEX IF NOT EXISTS idx_job_types_active
ON m_job_types(is_active)
WHERE is_active = true;

-- ============================================================================
-- STEP 4: DROP OLD TABLES (Optional - uncomment when ready)
-- ============================================================================

-- IMPORTANT: Only drop old tables after confirming migration worked!
-- Uncomment these lines after verifying the new system works:

-- DROP TABLE IF EXISTS t_portfolio_snapshot_executions CASCADE;
-- DROP TABLE IF EXISTS t_portfolio_snapshot_configs CASCADE;

-- For now, we'll keep them for safety. You can manually drop later.

-- ============================================================================
-- STEP 5: VERIFICATION
-- ============================================================================

DO $$
BEGIN
    -- Verify tables exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'm_job_types') THEN
        RAISE EXCEPTION 'Migration failed: m_job_types table not created';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 't_job_scheduler_configs') THEN
        RAISE EXCEPTION 'Migration failed: t_job_scheduler_configs table not created';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 't_job_executions') THEN
        RAISE EXCEPTION 'Migration failed: t_job_executions table not created';
    END IF;

    -- Verify migration
    RAISE NOTICE '✓ Generic Jobs System migration completed successfully';
    RAISE NOTICE '  - m_job_types: Registry created';
    RAISE NOTICE '  - t_job_scheduler_configs: Generic scheduler table created';
    RAISE NOTICE '  - t_job_executions: Generic execution history created';
    RAISE NOTICE '  - Existing portfolio snapshot data migrated';
    RAISE NOTICE '  - Indexes created for performance';
    RAISE NOTICE '';
    RAISE NOTICE 'Old tables preserved for safety:';
    RAISE NOTICE '  - t_portfolio_snapshot_configs (can be dropped later)';
    RAISE NOTICE '  - t_portfolio_snapshot_executions (can be dropped later)';
END $$;
