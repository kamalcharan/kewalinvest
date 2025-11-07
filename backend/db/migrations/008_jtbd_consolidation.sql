-- Migration: JTBD Consolidation - Add category, create executions table
-- Date: 2025-11-06
-- Description:
--   1. Add jtbd_category column to t_jtbd_configurations for categorization
--   2. Create t_jtbd_executions table for tracking meetings, SIP plans, and other execution instances
--   3. Add indexes for performance optimization
-- Purpose: Consolidate meetings and execution tracking into unified JTBD system

-- ============================================================================
-- STEP 1: Add jtbd_category column to t_jtbd_configurations
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Adding jtbd_category to t_jtbd_configurations';
    RAISE NOTICE '========================================';
END $$;

-- Add category column
ALTER TABLE t_jtbd_configurations
ADD COLUMN IF NOT EXISTS jtbd_category VARCHAR(50);

-- Set default values for existing records
-- All existing records are alerts (portfolio_alert, time_based, profile_trigger)
UPDATE t_jtbd_configurations
SET jtbd_category = CASE
    WHEN jtbd_type = 'goal_tracking' THEN 'transactional'
    WHEN jtbd_type IN ('portfolio_alert', 'time_based', 'profile_trigger', 'goal_sip_plan') THEN 'alert'
    ELSE 'alert'
END
WHERE jtbd_category IS NULL;

-- Make column NOT NULL after setting defaults
ALTER TABLE t_jtbd_configurations
ALTER COLUMN jtbd_category SET NOT NULL;

-- Add column comment
COMMENT ON COLUMN t_jtbd_configurations.jtbd_category IS
  'Category: transactional (goals), alert (reminders, SIPs), meeting (client meetings)';

-- Update table comment to reflect new structure
COMMENT ON TABLE t_jtbd_configurations IS
  'Unified JTBD configurations - Goals, Alerts, and Meeting templates. Use jtbd_category to filter.';

-- ============================================================================
-- STEP 2: Create t_jtbd_executions table
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Creating t_jtbd_executions table';
    RAISE NOTICE '========================================';
END $$;

CREATE TABLE IF NOT EXISTS t_jtbd_executions (
    id SERIAL PRIMARY KEY,

    -- Multi-tenancy
    tenant_id INTEGER NOT NULL REFERENCES t_tenants(id),
    is_live BOOLEAN NOT NULL DEFAULT true,

    -- Link to configuration (optional - some executions like meetings might be standalone)
    config_id INTEGER REFERENCES t_jtbd_configurations(id) ON DELETE CASCADE,

    -- Customer link
    customer_id INTEGER NOT NULL REFERENCES t_customers(id) ON DELETE CASCADE,

    -- Execution type (e.g., 'goal_sip_plan', 'client_meeting', 'portfolio_review')
    execution_type VARCHAR(50) NOT NULL,

    -- Title and description
    title VARCHAR(255) NOT NULL,
    description TEXT,

    -- Priority
    priority VARCHAR(20) NOT NULL DEFAULT 'medium',

    -- Scheduling
    scheduled_date DATE NOT NULL,
    scheduled_time TIME,

    -- Execution tracking
    execution_status VARCHAR(50) NOT NULL DEFAULT 'planned',
    execution_date DATE,
    execution_time TIME,
    deviation_days INTEGER, -- How many days late/early (negative = early, positive = late)

    -- Execution data (flexible JSON for type-specific data)
    execution_data JSONB DEFAULT '{}'::jsonb,

    -- Meeting-specific fields (stored in execution_data JSONB):
    -- - location: string
    -- - meeting_notes: string
    -- - agenda: string
    -- - attendees: array
    -- - outcome: string
    -- - follow_up_required: boolean
    -- - follow_up_date: date

    -- SIP Plan-specific fields (stored in execution_data JSONB):
    -- - amount: number
    -- - scheme_code: string
    -- - scheme_name: string
    -- - month_number: number (1-120)
    -- - total_months: number (120)
    -- - transaction_id: string (after completion)

    -- Audit fields
    created_by INTEGER NOT NULL REFERENCES t_users(id),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_by INTEGER REFERENCES t_users(id),
    completed_at TIMESTAMP
);

-- Add table comment
COMMENT ON TABLE t_jtbd_executions IS
  'JTBD execution instances - Tracks meetings, SIP plans, and other execution records. Linked to configs via config_id.';

-- Add column comments
COMMENT ON COLUMN t_jtbd_executions.config_id IS
  'Optional link to parent configuration. NULL for standalone executions like one-time meetings.';

COMMENT ON COLUMN t_jtbd_executions.execution_type IS
  'Type: goal_sip_plan, client_meeting, portfolio_review, goal_review, etc.';

COMMENT ON COLUMN t_jtbd_executions.execution_status IS
  'Status: planned, due, completed, not_executed, delayed, failed, cancelled';

COMMENT ON COLUMN t_jtbd_executions.deviation_days IS
  'Days difference between scheduled and actual execution. Negative=early, Positive=late';

COMMENT ON COLUMN t_jtbd_executions.execution_data IS
  'Flexible JSONB for type-specific data: meeting notes, SIP details, transaction IDs, etc.';

-- ============================================================================
-- STEP 3: Create indexes for performance
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Creating performance indexes';
    RAISE NOTICE '========================================';
END $$;

-- Index on jtbd_category for filtering
CREATE INDEX IF NOT EXISTS idx_jtbd_config_category
ON t_jtbd_configurations(tenant_id, is_live, jtbd_category)
WHERE is_active = true;

-- Index on jtbd_category + jtbd_type for specific queries
CREATE INDEX IF NOT EXISTS idx_jtbd_config_category_type
ON t_jtbd_configurations(tenant_id, is_live, jtbd_category, jtbd_type)
WHERE is_active = true;

-- Index on customer for customer-specific JTBD queries
CREATE INDEX IF NOT EXISTS idx_jtbd_config_customer
ON t_jtbd_configurations(tenant_id, is_live, customer_id, jtbd_category);

-- ============================================================================
-- STEP 4: Create indexes for t_jtbd_executions
-- ============================================================================

-- Primary query index: tenant + environment + status + date
CREATE INDEX IF NOT EXISTS idx_jtbd_exec_tenant_status_date
ON t_jtbd_executions(tenant_id, is_live, execution_status, scheduled_date);

-- Customer-specific executions
CREATE INDEX IF NOT EXISTS idx_jtbd_exec_customer
ON t_jtbd_executions(tenant_id, is_live, customer_id, execution_status);

-- Execution type filtering
CREATE INDEX IF NOT EXISTS idx_jtbd_exec_type
ON t_jtbd_executions(tenant_id, is_live, execution_type, scheduled_date);

-- Config link for related executions
CREATE INDEX IF NOT EXISTS idx_jtbd_exec_config
ON t_jtbd_executions(config_id)
WHERE config_id IS NOT NULL;

-- Date range queries (for timeline view)
CREATE INDEX IF NOT EXISTS idx_jtbd_exec_date_range
ON t_jtbd_executions(tenant_id, is_live, scheduled_date)
WHERE execution_status IN ('planned', 'due');

-- Note: Overdue filtering is done at query time with scheduled_date < CURRENT_DATE
-- We cannot use CURRENT_DATE in index predicates (volatile expression)
-- The idx_jtbd_exec_date_range index above will be used for overdue queries

-- ============================================================================
-- STEP 5: Create trigger for updated_at timestamp
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Creating updated_at trigger';
    RAISE NOTICE '========================================';
END $$;

-- Create trigger function if not exists (reuse existing function)
-- The function update_updated_at_column() should already exist from init scripts

-- Create trigger for t_jtbd_executions
DROP TRIGGER IF EXISTS update_jtbd_executions_updated_at ON t_jtbd_executions;
CREATE TRIGGER update_jtbd_executions_updated_at
    BEFORE UPDATE ON t_jtbd_executions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- STEP 6: Verify changes
-- ============================================================================

DO $$
DECLARE
    v_config_count INTEGER;
    v_execution_count INTEGER;
    v_index_count INTEGER;
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Verification Summary';
    RAISE NOTICE '========================================';

    -- Count existing configurations
    SELECT COUNT(*) INTO v_config_count FROM t_jtbd_configurations;
    RAISE NOTICE 'Total JTBD configurations: %', v_config_count;

    -- Count executions (should be 0 for new table)
    SELECT COUNT(*) INTO v_execution_count FROM t_jtbd_executions;
    RAISE NOTICE 'Total JTBD executions: %', v_execution_count;

    -- Count new indexes
    SELECT COUNT(*) INTO v_index_count
    FROM pg_indexes
    WHERE schemaname = 'public'
    AND tablename IN ('t_jtbd_configurations', 't_jtbd_executions')
    AND indexname LIKE 'idx_jtbd_%';
    RAISE NOTICE 'Total JTBD indexes created: %', v_index_count;

    RAISE NOTICE '========================================';
    RAISE NOTICE 'Migration completed successfully!';
    RAISE NOTICE '========================================';
END $$;

-- ============================================================================
-- USAGE EXAMPLES (commented out - for documentation)
-- ============================================================================

/*
-- Example 1: Insert a meeting execution
INSERT INTO t_jtbd_executions (
    tenant_id, is_live, customer_id, execution_type,
    title, scheduled_date, execution_status,
    execution_data, created_by
) VALUES (
    1, true, 123, 'client_meeting',
    'Q1 Portfolio Review',
    '2025-01-15',
    'planned',
    '{"location": "Office", "agenda": "Review portfolio performance"}'::jsonb,
    1
);

-- Example 2: Insert a goal SIP plan execution
INSERT INTO t_jtbd_executions (
    tenant_id, is_live, config_id, customer_id, execution_type,
    title, scheduled_date, execution_status,
    execution_data, created_by
) VALUES (
    1, true, 456, 123, 'goal_sip_plan',
    'Monthly SIP - Retirement Goal',
    '2025-01-10',
    'planned',
    '{"amount": 20000, "scheme_code": "HDFC123", "month_number": 1, "total_months": 120}'::jsonb,
    1
);

-- Example 3: Query upcoming meetings
SELECT
    id, title, scheduled_date, execution_status,
    execution_data->>'location' as location
FROM t_jtbd_executions
WHERE tenant_id = 1
AND is_live = true
AND execution_type IN ('client_meeting', 'portfolio_review')
AND scheduled_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'
ORDER BY scheduled_date;

-- Example 4: Query overdue SIP executions
SELECT
    id, title, customer_id, scheduled_date,
    (CURRENT_DATE - scheduled_date) as days_overdue,
    execution_data->>'amount' as sip_amount
FROM t_jtbd_executions
WHERE tenant_id = 1
AND is_live = true
AND execution_type = 'goal_sip_plan'
AND execution_status IN ('planned', 'due')
AND scheduled_date < CURRENT_DATE
ORDER BY scheduled_date;

-- Example 5: Mark execution as completed
UPDATE t_jtbd_executions
SET
    execution_status = 'completed',
    execution_date = '2025-01-15',
    deviation_days = EXTRACT(DAY FROM ('2025-01-15'::date - scheduled_date)),
    execution_data = execution_data || '{"meeting_notes": "Great discussion", "outcome": "Positive"}'::jsonb,
    completed_by = 1,
    completed_at = CURRENT_TIMESTAMP
WHERE id = 123;
*/
