-- ============================================================================
-- Migration: 021_scheduler_enhancements.sql
-- Description: Enhance job scheduler with failover support and new job types
-- Date: 2025-11-25
-- ============================================================================

-- ============================================================================
-- STEP 1: Add new columns to t_job_scheduler_configs
-- ============================================================================

-- Failover support columns
ALTER TABLE t_job_scheduler_configs
ADD COLUMN IF NOT EXISTS failover_enabled BOOLEAN DEFAULT false;

ALTER TABLE t_job_scheduler_configs
ADD COLUMN IF NOT EXISTS failover_cron_expression VARCHAR(50);

ALTER TABLE t_job_scheduler_configs
ADD COLUMN IF NOT EXISTS last_success_at TIMESTAMP;

-- Add comments
COMMENT ON COLUMN t_job_scheduler_configs.failover_enabled IS 'Enable failover execution if primary execution fails';
COMMENT ON COLUMN t_job_scheduler_configs.failover_cron_expression IS 'Cron expression for failover time (e.g., 0 22 * * * for 10 PM)';
COMMENT ON COLUMN t_job_scheduler_configs.last_success_at IS 'Timestamp of last successful execution';

-- ============================================================================
-- STEP 2: Add new columns to m_job_types for defaults
-- ============================================================================

ALTER TABLE m_job_types
ADD COLUMN IF NOT EXISTS default_schedule_type VARCHAR(20) DEFAULT 'daily';

ALTER TABLE m_job_types
ADD COLUMN IF NOT EXISTS failover_enabled BOOLEAN DEFAULT false;

ALTER TABLE m_job_types
ADD COLUMN IF NOT EXISTS failover_cron_expression VARCHAR(50);

ALTER TABLE m_job_types
ADD COLUMN IF NOT EXISTS is_global BOOLEAN DEFAULT false;

COMMENT ON COLUMN m_job_types.default_schedule_type IS 'Default schedule type: daily, weekly, monthly';
COMMENT ON COLUMN m_job_types.failover_enabled IS 'Default failover enabled setting';
COMMENT ON COLUMN m_job_types.failover_cron_expression IS 'Default failover cron expression';
COMMENT ON COLUMN m_job_types.is_global IS 'If true, job runs once globally (not per-tenant) - e.g., NAV/Market downloads';

-- ============================================================================
-- STEP 3: Insert/Update job types with is_global flag
-- ============================================================================

-- NAV Download - Daily 9 PM, failover 10 PM (GLOBAL)
INSERT INTO m_job_types (code, name, description, default_cron_expression, default_max_retries, is_active, default_schedule_type, failover_enabled, failover_cron_expression, is_global)
VALUES ('NAV_DOWNLOAD', 'NAV Download', 'Download NAV data for all bookmarked schemes', '0 21 * * *', 3, true, 'daily', true, '0 22 * * *', true)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    default_cron_expression = EXCLUDED.default_cron_expression,
    default_max_retries = EXCLUDED.default_max_retries,
    is_active = EXCLUDED.is_active,
    default_schedule_type = EXCLUDED.default_schedule_type,
    failover_enabled = EXCLUDED.failover_enabled,
    failover_cron_expression = EXCLUDED.failover_cron_expression,
    is_global = EXCLUDED.is_global,
    updated_at = CURRENT_TIMESTAMP;

-- Market OHLC Download - Daily 9:30 PM (GLOBAL)
INSERT INTO m_job_types (code, name, description, default_cron_expression, default_max_retries, is_active, default_schedule_type, failover_enabled, failover_cron_expression, is_global)
VALUES ('MARKET_OHLC_DOWNLOAD', 'Market OHLC Download', 'Download OHLC data for market indices', '30 21 * * *', 3, true, 'daily', false, NULL, true)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    default_cron_expression = EXCLUDED.default_cron_expression,
    default_max_retries = EXCLUDED.default_max_retries,
    is_active = EXCLUDED.is_active,
    default_schedule_type = EXCLUDED.default_schedule_type,
    failover_enabled = EXCLUDED.failover_enabled,
    failover_cron_expression = EXCLUDED.failover_cron_expression,
    is_global = EXCLUDED.is_global,
    updated_at = CURRENT_TIMESTAMP;

-- Goal Calculation - Friday 8:30 PM (per-tenant)
INSERT INTO m_job_types (code, name, description, default_cron_expression, default_max_retries, is_active, default_schedule_type, failover_enabled, failover_cron_expression, is_global)
VALUES ('GOAL_CALCULATION', 'Goal Calculation', 'Recalculate all customer goals and generate alerts', '30 20 * * 5', 3, true, 'weekly', false, NULL, false)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    default_cron_expression = EXCLUDED.default_cron_expression,
    default_max_retries = EXCLUDED.default_max_retries,
    is_active = EXCLUDED.is_active,
    default_schedule_type = EXCLUDED.default_schedule_type,
    failover_enabled = EXCLUDED.failover_enabled,
    failover_cron_expression = EXCLUDED.failover_cron_expression,
    is_global = EXCLUDED.is_global,
    updated_at = CURRENT_TIMESTAMP;

-- Daily Alerts - Daily 8 PM (per-tenant)
INSERT INTO m_job_types (code, name, description, default_cron_expression, default_max_retries, is_active, default_schedule_type, failover_enabled, failover_cron_expression, is_global)
VALUES ('DAILY_ALERTS', 'Daily Alerts', 'Process and generate daily alert cards for customers', '0 20 * * *', 3, true, 'daily', false, NULL, false)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    default_cron_expression = EXCLUDED.default_cron_expression,
    default_max_retries = EXCLUDED.default_max_retries,
    is_active = EXCLUDED.is_active,
    default_schedule_type = EXCLUDED.default_schedule_type,
    failover_enabled = EXCLUDED.failover_enabled,
    failover_cron_expression = EXCLUDED.failover_cron_expression,
    is_global = EXCLUDED.is_global,
    updated_at = CURRENT_TIMESTAMP;

-- Update Portfolio Snapshot to use weekly schedule type (per-tenant)
UPDATE m_job_types
SET default_schedule_type = 'weekly', failover_enabled = false, failover_cron_expression = NULL, is_global = false
WHERE code = 'PORTFOLIO_SNAPSHOT';

-- ============================================================================
-- STEP 4: Log migration
-- ============================================================================

DO $$
DECLARE
    v_job_count INTEGER;
    v_global_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_job_count FROM m_job_types WHERE is_active = true;
    SELECT COUNT(*) INTO v_global_count FROM m_job_types WHERE is_active = true AND is_global = true;
    RAISE NOTICE 'Migration 021 complete: % active job types (% global)', v_job_count, v_global_count;
END $$;
