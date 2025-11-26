-- Migration 023: Alert System Enhancements
-- Date: 2025-11-26
-- Description: Adds alert completion tracking, visibility settings, and investment plan alert toggle
-- Related Feature: Cruise Control Alerts System Completion

-- ============================================================================
-- SECTION 1: ALERT VISIBILITY SETTINGS TABLE (Master Data)
-- ============================================================================

-- Create master table for alert visibility settings
-- This allows users to configure how many days before/after an alert should be visible
CREATE TABLE IF NOT EXISTS m_alert_settings (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER REFERENCES t_tenants(id),
    is_live BOOLEAN DEFAULT true,

    -- Setting identification
    setting_key VARCHAR(100) NOT NULL,
    setting_label VARCHAR(255) NOT NULL,

    -- Visibility window configuration
    days_before INTEGER NOT NULL DEFAULT 3,      -- Show alert X days before scheduled date
    days_after INTEGER NOT NULL DEFAULT 10,      -- Keep alert visible X days after scheduled date

    -- Auto-expire configuration (for notifications)
    auto_expire_hours INTEGER,                   -- NULL = never auto-expire

    -- Which alert types this setting applies to
    applies_to_types TEXT[],                     -- Array of jtbd_type values, NULL = all types

    -- Metadata
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Unique constraint per tenant (or global if tenant_id is NULL)
    CONSTRAINT unique_alert_setting UNIQUE (tenant_id, is_live, setting_key)
);

COMMENT ON TABLE m_alert_settings IS 'Configurable alert visibility settings - determines when alerts appear and expire';
COMMENT ON COLUMN m_alert_settings.tenant_id IS 'NULL for global defaults, tenant_id for tenant-specific overrides';
COMMENT ON COLUMN m_alert_settings.days_before IS 'Number of days before next_alert_date to start showing the alert';
COMMENT ON COLUMN m_alert_settings.days_after IS 'Number of days after next_alert_date to keep showing the alert';
COMMENT ON COLUMN m_alert_settings.auto_expire_hours IS 'For notifications: auto-deactivate after X hours from creation';
COMMENT ON COLUMN m_alert_settings.applies_to_types IS 'Array of jtbd_type values this setting applies to. NULL = all types.';

-- ============================================================================
-- SECTION 2: SEED DEFAULT ALERT SETTINGS
-- ============================================================================

-- Insert global default settings (tenant_id = NULL means global)
INSERT INTO m_alert_settings (tenant_id, is_live, setting_key, setting_label, days_before, days_after, auto_expire_hours, applies_to_types)
VALUES
    -- Default for SIP/Recurring alerts (show 3 days before, keep 10 days after)
    (NULL, true, 'sip_recurring_default', 'SIP/Recurring Payment Alerts', 3, 10, NULL, ARRAY['goal_sip_plan', 'portfolio_alert']),

    -- Default for time-based alerts (birthday, anniversary - show 7 days before, keep 3 days after)
    (NULL, true, 'time_based_default', 'Time-Based Reminders', 7, 3, NULL, ARRAY['time_based', 'profile_trigger']),

    -- Default for import notifications (auto-expire after 24 hours)
    (NULL, true, 'import_notification_default', 'Import Notifications', 0, 0, 24, ARRAY['import_notification']),

    -- Default fallback for any other alert types
    (NULL, true, 'general_default', 'General Alerts', 3, 10, NULL, NULL)
ON CONFLICT (tenant_id, is_live, setting_key) DO NOTHING;

-- ============================================================================
-- SECTION 3: ADD COMPLETION TRACKING TO t_jtbd_configurations
-- ============================================================================

-- Add completion tracking columns
ALTER TABLE t_jtbd_configurations
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS completed_by INTEGER REFERENCES t_users(id),
ADD COLUMN IF NOT EXISTS completion_source VARCHAR(50);

-- Add constraint for completion_source
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_completion_source'
    ) THEN
        ALTER TABLE t_jtbd_configurations
        ADD CONSTRAINT chk_completion_source CHECK (
            completion_source IS NULL OR
            completion_source IN ('manual', 'transaction_import', 'auto_expire', 'system')
        );
    END IF;
END $$;

-- Add auto_expire_at column for timed notifications
ALTER TABLE t_jtbd_configurations
ADD COLUMN IF NOT EXISTS auto_expire_at TIMESTAMP;

COMMENT ON COLUMN t_jtbd_configurations.completed_at IS 'Timestamp when the alert was marked as completed';
COMMENT ON COLUMN t_jtbd_configurations.completed_by IS 'User who completed the alert (NULL for system/auto)';
COMMENT ON COLUMN t_jtbd_configurations.completion_source IS 'How alert was completed: manual, transaction_import, auto_expire, system';
COMMENT ON COLUMN t_jtbd_configurations.auto_expire_at IS 'For notifications: auto-deactivate after this timestamp';

-- ============================================================================
-- SECTION 4: ADD ALERTS TOGGLE TO t_customer_asset_assignments
-- ============================================================================

-- Add alerts_enabled column to investment plans
ALTER TABLE t_customer_asset_assignments
ADD COLUMN IF NOT EXISTS alerts_enabled BOOLEAN DEFAULT true;

COMMENT ON COLUMN t_customer_asset_assignments.alerts_enabled IS 'Toggle to enable/disable automatic alert generation for this investment plan';

-- ============================================================================
-- SECTION 5: CREATE INDEX FOR EFFICIENT ALERT QUERIES
-- ============================================================================

-- Index for finding alerts within visibility window
CREATE INDEX IF NOT EXISTS idx_jtbd_alert_visibility
ON t_jtbd_configurations (tenant_id, is_live, is_active, next_alert_date, completed_at)
WHERE is_active = true AND completed_at IS NULL;

-- Index for auto-expire processing
CREATE INDEX IF NOT EXISTS idx_jtbd_auto_expire
ON t_jtbd_configurations (auto_expire_at)
WHERE auto_expire_at IS NOT NULL AND is_active = true AND completed_at IS NULL;

-- Index for investment plan alerts lookup
CREATE INDEX IF NOT EXISTS idx_asset_assignments_alerts
ON t_customer_asset_assignments (tenant_id, is_live, is_active, alerts_enabled)
WHERE is_active = true AND alerts_enabled = true;

-- ============================================================================
-- SECTION 6: FUNCTION TO GET ALERT VISIBILITY SETTINGS
-- ============================================================================

CREATE OR REPLACE FUNCTION get_alert_visibility_settings(
    p_tenant_id INTEGER,
    p_is_live BOOLEAN,
    p_jtbd_type VARCHAR(50)
)
RETURNS TABLE (
    days_before INTEGER,
    days_after INTEGER,
    auto_expire_hours INTEGER
) AS $$
BEGIN
    -- First try tenant-specific setting for this type
    RETURN QUERY
    SELECT s.days_before, s.days_after, s.auto_expire_hours
    FROM m_alert_settings s
    WHERE s.tenant_id = p_tenant_id
      AND s.is_live = p_is_live
      AND s.is_active = true
      AND (s.applies_to_types IS NULL OR p_jtbd_type = ANY(s.applies_to_types))
    ORDER BY
        CASE WHEN s.applies_to_types IS NOT NULL THEN 0 ELSE 1 END  -- Specific types first
    LIMIT 1;

    -- If no tenant-specific, use global defaults
    IF NOT FOUND THEN
        RETURN QUERY
        SELECT s.days_before, s.days_after, s.auto_expire_hours
        FROM m_alert_settings s
        WHERE s.tenant_id IS NULL
          AND s.is_active = true
          AND (s.applies_to_types IS NULL OR p_jtbd_type = ANY(s.applies_to_types))
        ORDER BY
            CASE WHEN s.applies_to_types IS NOT NULL THEN 0 ELSE 1 END
        LIMIT 1;
    END IF;

    -- Final fallback: return hardcoded defaults
    IF NOT FOUND THEN
        RETURN QUERY SELECT 3::INTEGER, 10::INTEGER, NULL::INTEGER;
    END IF;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_alert_visibility_settings IS 'Returns visibility settings for a specific alert type, checking tenant overrides first, then global defaults';

-- ============================================================================
-- SECTION 7: FUNCTION TO CHECK IF ALERT IS VISIBLE
-- ============================================================================

CREATE OR REPLACE FUNCTION is_alert_visible(
    p_tenant_id INTEGER,
    p_is_live BOOLEAN,
    p_jtbd_type VARCHAR(50),
    p_next_alert_date DATE,
    p_created_at TIMESTAMP,
    p_auto_expire_at TIMESTAMP,
    p_completed_at TIMESTAMP
)
RETURNS BOOLEAN AS $$
DECLARE
    v_days_before INTEGER;
    v_days_after INTEGER;
    v_auto_expire_hours INTEGER;
    v_today DATE := CURRENT_DATE;
BEGIN
    -- Already completed = not visible
    IF p_completed_at IS NOT NULL THEN
        RETURN FALSE;
    END IF;

    -- Check auto-expire timestamp
    IF p_auto_expire_at IS NOT NULL AND p_auto_expire_at <= NOW() THEN
        RETURN FALSE;
    END IF;

    -- Get visibility settings
    SELECT * INTO v_days_before, v_days_after, v_auto_expire_hours
    FROM get_alert_visibility_settings(p_tenant_id, p_is_live, p_jtbd_type);

    -- For import notifications with auto_expire_hours, check creation time
    IF v_auto_expire_hours IS NOT NULL AND p_created_at IS NOT NULL THEN
        IF p_created_at + (v_auto_expire_hours || ' hours')::INTERVAL <= NOW() THEN
            RETURN FALSE;
        END IF;
    END IF;

    -- Check date window if next_alert_date is set
    IF p_next_alert_date IS NOT NULL THEN
        -- Alert is visible if: (next_alert_date - days_before) <= today <= (next_alert_date + days_after)
        RETURN (p_next_alert_date - v_days_before) <= v_today
           AND v_today <= (p_next_alert_date + v_days_after);
    END IF;

    -- No date constraint = always visible (until expired or completed)
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION is_alert_visible IS 'Checks if an alert should be visible based on visibility settings, expiry, and completion status';

-- ============================================================================
-- SECTION 8: FUNCTION TO MARK SIP ALERTS COMPLETE ON TRANSACTION IMPORT
-- ============================================================================

CREATE OR REPLACE FUNCTION mark_sip_alert_complete_on_transaction(
    p_tenant_id INTEGER,
    p_is_live BOOLEAN,
    p_customer_id INTEGER,
    p_scheme_code VARCHAR(50),
    p_transaction_date DATE,
    p_transaction_amount NUMERIC
)
RETURNS INTEGER AS $$
DECLARE
    v_alert_id INTEGER;
    v_alerts_marked INTEGER := 0;
    v_alert_record RECORD;
BEGIN
    -- Find active SIP alerts for this customer/scheme that are due around this transaction date
    -- Window: transaction_date should be within 7 days before to 7 days after the next_alert_date
    FOR v_alert_record IN
        SELECT j.id, j.next_alert_date, j.config_data
        FROM t_jtbd_configurations j
        WHERE j.tenant_id = p_tenant_id
          AND j.is_live = p_is_live
          AND j.customer_id = p_customer_id
          AND j.is_active = true
          AND j.completed_at IS NULL
          AND j.jtbd_type IN ('goal_sip_plan', 'portfolio_alert')
          -- Match scheme from config_data
          AND (
              j.config_data->>'scheme_code' = p_scheme_code
              OR j.config_data->>'fund_code' = p_scheme_code
              OR j.config_data->'asset_assignment'->>'scheme_code' = p_scheme_code
          )
          -- Match date window: 7 days before to 7 days after
          AND j.next_alert_date IS NOT NULL
          AND p_transaction_date BETWEEN (j.next_alert_date - 7) AND (j.next_alert_date + 7)
        ORDER BY ABS(j.next_alert_date - p_transaction_date)  -- Closest match first
        LIMIT 1  -- Only mark one alert per transaction
    LOOP
        -- Mark the alert as completed
        UPDATE t_jtbd_configurations
        SET completed_at = NOW(),
            completed_by = NULL,  -- System completion
            completion_source = 'transaction_import',
            updated_at = NOW()
        WHERE id = v_alert_record.id;

        v_alerts_marked := v_alerts_marked + 1;

        RAISE NOTICE 'Marked SIP alert % as complete (scheme: %, txn_date: %, alert_date: %)',
            v_alert_record.id, p_scheme_code, p_transaction_date, v_alert_record.next_alert_date;
    END LOOP;

    RETURN v_alerts_marked;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION mark_sip_alert_complete_on_transaction IS 'Marks matching SIP alerts as complete when a transaction is imported for the same scheme/customer within date window';

-- ============================================================================
-- SECTION 9: UPDATE EXISTING IMPORT NOTIFICATIONS WITH AUTO_EXPIRE_AT
-- ============================================================================

-- Set auto_expire_at for existing import notifications (24 hours from creation)
UPDATE t_jtbd_configurations
SET auto_expire_at = created_at + INTERVAL '24 hours'
WHERE jtbd_type = 'import_notification'
  AND auto_expire_at IS NULL;

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Migration 023 completed successfully!';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Changes applied:';
    RAISE NOTICE '  ✓ Created m_alert_settings table';
    RAISE NOTICE '  ✓ Seeded default alert visibility settings';
    RAISE NOTICE '  ✓ Added completion tracking to t_jtbd_configurations';
    RAISE NOTICE '  ✓ Added alerts_enabled to t_customer_asset_assignments';
    RAISE NOTICE '  ✓ Created visibility helper functions';
    RAISE NOTICE '  ✓ Created indexes for efficient queries';
    RAISE NOTICE '========================================';
END $$;
