-- Migration: 003_generic_jobs_system_clean.sql
-- Description: Create generic jobs system tables (clean install, no data migration)
-- Date: 2025-10-27

BEGIN;

-- ============================================================================
-- STEP 1: Create master table for job types
-- ============================================================================

CREATE TABLE IF NOT EXISTS m_job_types (
    code VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    default_cron_expression VARCHAR(100) NOT NULL,
    default_max_retries INTEGER NOT NULL DEFAULT 3,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Insert job type: Portfolio Snapshot
INSERT INTO m_job_types (code, name, description, default_cron_expression, default_max_retries, is_active)
VALUES (
    'PORTFOLIO_SNAPSHOT',
    'Portfolio Snapshot Generation',
    'Generates monthly portfolio snapshots for all customers. Snapshots capture portfolio value, returns, and holdings as of the end of the previous month.',
    '0 21 * * 5',  -- Every Friday at 9:00 PM
    3,
    true
) ON CONFLICT (code) DO NOTHING;

-- ============================================================================
-- STEP 2: Create generic scheduler configuration table
-- ============================================================================

CREATE TABLE IF NOT EXISTS t_job_scheduler_configs (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES t_tenants(id) ON DELETE CASCADE,
    job_type VARCHAR(50) NOT NULL REFERENCES m_job_types(code),
    user_id INTEGER NOT NULL REFERENCES t_users(id),
    is_live BOOLEAN NOT NULL,
    schedule_type VARCHAR(20) NOT NULL DEFAULT 'weekly',
    cron_expression VARCHAR(100) NOT NULL,
    is_enabled BOOLEAN NOT NULL DEFAULT true,
    max_retries INTEGER NOT NULL DEFAULT 3,
    job_config JSONB,  -- Job-specific flexible configuration
    last_executed_at TIMESTAMP,
    next_execution_at TIMESTAMP,
    execution_count INTEGER NOT NULL DEFAULT 0,
    failure_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_job_scheduler_config UNIQUE(tenant_id, job_type, is_live),
    CONSTRAINT valid_schedule_type CHECK (schedule_type IN ('daily', 'weekly', 'monthly', 'custom'))
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_job_scheduler_configs_tenant ON t_job_scheduler_configs(tenant_id, is_live);
CREATE INDEX IF NOT EXISTS idx_job_scheduler_configs_job_type ON t_job_scheduler_configs(job_type);
CREATE INDEX IF NOT EXISTS idx_job_scheduler_configs_enabled ON t_job_scheduler_configs(is_enabled);
CREATE INDEX IF NOT EXISTS idx_job_scheduler_configs_next_exec ON t_job_scheduler_configs(next_execution_at) WHERE is_enabled = true;

-- ============================================================================
-- STEP 3: Create generic job executions table
-- ============================================================================

CREATE TABLE IF NOT EXISTS t_job_executions (
    id SERIAL PRIMARY KEY,
    scheduler_config_id INTEGER NOT NULL REFERENCES t_job_scheduler_configs(id) ON DELETE CASCADE,
    job_type VARCHAR(50) NOT NULL REFERENCES m_job_types(code),
    tenant_id INTEGER NOT NULL REFERENCES t_tenants(id) ON DELETE CASCADE,
    is_live BOOLEAN NOT NULL,
    execution_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) NOT NULL DEFAULT 'running',
    trigger_source VARCHAR(20) NOT NULL,
    retry_attempt INTEGER NOT NULL DEFAULT 0,
    execution_data JSONB,  -- Job-specific execution results (flexible)
    error_message TEXT,
    error_details JSONB,
    execution_duration_ms INTEGER,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_status CHECK (status IN ('success', 'failed', 'running', 'retrying', 'skipped')),
    CONSTRAINT valid_trigger_source CHECK (trigger_source IN ('scheduled', 'manual'))
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_job_executions_config ON t_job_executions(scheduler_config_id);
CREATE INDEX IF NOT EXISTS idx_job_executions_tenant ON t_job_executions(tenant_id, is_live, job_type);
CREATE INDEX IF NOT EXISTS idx_job_executions_time ON t_job_executions(execution_time DESC);
CREATE INDEX IF NOT EXISTS idx_job_executions_status ON t_job_executions(status);
CREATE INDEX IF NOT EXISTS idx_job_executions_job_type ON t_job_executions(job_type);

-- ============================================================================
-- STEP 4: Create update trigger for scheduler configs
-- ============================================================================

CREATE OR REPLACE FUNCTION update_job_scheduler_config_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_job_scheduler_config_timestamp ON t_job_scheduler_configs;

CREATE TRIGGER trigger_update_job_scheduler_config_timestamp
    BEFORE UPDATE ON t_job_scheduler_configs
    FOR EACH ROW
    EXECUTE FUNCTION update_job_scheduler_config_timestamp();

-- ============================================================================
-- STEP 5: Grant permissions
-- ============================================================================

-- Grant permissions to application user (adjust username as needed)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'kewal_user') THEN
        GRANT SELECT, INSERT, UPDATE, DELETE ON m_job_types TO kewal_user;
        GRANT SELECT, INSERT, UPDATE, DELETE ON t_job_scheduler_configs TO kewal_user;
        GRANT SELECT, INSERT, UPDATE, DELETE ON t_job_executions TO kewal_user;
        GRANT USAGE, SELECT ON SEQUENCE t_job_scheduler_configs_id_seq TO kewal_user;
        GRANT USAGE, SELECT ON SEQUENCE t_job_executions_id_seq TO kewal_user;
    END IF;
END $$;

-- ============================================================================
-- STEP 6: Insert default configurations for testing
-- ============================================================================

-- Create default PORTFOLIO_SNAPSHOT configuration for each tenant (both live and test)
-- This ensures tenants can immediately test the feature
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
    next_execution_at,
    created_at,
    updated_at
)
SELECT
    t.id as tenant_id,
    'PORTFOLIO_SNAPSHOT' as job_type,
    u.id as user_id,
    env.is_live,
    'weekly' as schedule_type,
    '0 21 * * 5' as cron_expression,  -- Every Friday at 9:00 PM
    true as is_enabled,
    3 as max_retries,
    NULL as job_config,
    -- Calculate next Friday 9 PM
    (CURRENT_DATE + ((12 - EXTRACT(DOW FROM CURRENT_DATE))::INTEGER % 7) * INTERVAL '1 day' + INTERVAL '21 hours') as next_execution_at,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM t_tenants t
CROSS JOIN (VALUES (true), (false)) AS env(is_live)
CROSS JOIN LATERAL (
    SELECT id FROM t_users
    WHERE tenant_id = t.id
    AND is_active = true
    ORDER BY id
    LIMIT 1
) u
WHERE t.is_active = true
ON CONFLICT (tenant_id, job_type, is_live) DO NOTHING;

COMMIT;

-- ============================================================================
-- Migration complete!
-- ============================================================================

-- Summary:
-- ✅ Created m_job_types table with PORTFOLIO_SNAPSHOT job type
-- ✅ Created t_job_scheduler_configs table for generic scheduler configurations
-- ✅ Created t_job_executions table for generic execution history
-- ✅ Created indexes for performance
-- ✅ Created update trigger for timestamp management
-- ✅ Granted permissions to application user
-- ✅ Created default weekly configurations for all active tenants (both live and test)

-- Next steps:
-- 1. Restart your backend server
-- 2. The jobs scheduler will initialize automatically
-- 3. Access Cruise Control > Portfolio Snapshots tab - default configuration is ready!
-- 4. You can manually trigger or wait for the weekly schedule (Friday 9 PM)
