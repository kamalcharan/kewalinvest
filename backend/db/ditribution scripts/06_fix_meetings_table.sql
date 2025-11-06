-- ============================================================================
-- FIX: t_customer_meetings table
-- Drop and recreate with correct columns for meeting.service.ts
-- ============================================================================

-- Drop existing table (no data to preserve)
DROP TABLE IF EXISTS t_customer_meetings CASCADE;

-- Create table with correct structure
CREATE TABLE t_customer_meetings (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES t_tenants(id),
    is_live BOOLEAN NOT NULL,
    customer_id INTEGER NOT NULL REFERENCES t_customers(id) ON DELETE CASCADE,

    -- Meeting details
    meeting_type VARCHAR(50) NOT NULL CHECK (meeting_type IN ('review', 'planning', 'onboarding', 'grievance', 'other')),
    meeting_mode VARCHAR(20) NOT NULL CHECK (meeting_mode IN ('in_person', 'video_call', 'phone_call')),

    -- Scheduling
    scheduled_date DATE NOT NULL,
    scheduled_time TIME NOT NULL,
    duration_minutes INTEGER DEFAULT 60,

    -- Status tracking
    status VARCHAR(20) NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled', 'rescheduled')),

    -- Location/Link (based on meeting_mode)
    meeting_location TEXT,  -- For in_person meetings
    meeting_link TEXT,      -- For video_call meetings

    -- Meeting content
    agenda TEXT,
    notes TEXT,
    outcome TEXT,

    -- Completion/Cancellation tracking
    completed_at TIMESTAMP,
    cancelled_at TIMESTAMP,
    cancellation_reason TEXT,

    -- Audit fields
    created_by INTEGER NOT NULL REFERENCES t_users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_customer_meetings_customer ON t_customer_meetings(tenant_id, is_live, customer_id);
CREATE INDEX idx_customer_meetings_scheduled_date ON t_customer_meetings(scheduled_date);
CREATE INDEX idx_customer_meetings_status ON t_customer_meetings(status);
CREATE INDEX idx_customer_meetings_upcoming ON t_customer_meetings(tenant_id, is_live, status, scheduled_date)
    WHERE status = 'scheduled';

-- Comments
COMMENT ON TABLE t_customer_meetings IS 'Customer meeting scheduling, tracking, and follow-up management';
COMMENT ON COLUMN t_customer_meetings.meeting_type IS 'Type: review, planning, onboarding, grievance, other';
COMMENT ON COLUMN t_customer_meetings.meeting_mode IS 'Mode: in_person, video_call, phone_call';
COMMENT ON COLUMN t_customer_meetings.scheduled_date IS 'Date when meeting is scheduled (ISO format)';
COMMENT ON COLUMN t_customer_meetings.scheduled_time IS 'Time when meeting is scheduled (HH:MM format)';
COMMENT ON COLUMN t_customer_meetings.duration_minutes IS 'Meeting duration in minutes (default: 60)';
COMMENT ON COLUMN t_customer_meetings.status IS 'Status: scheduled, completed, cancelled, rescheduled';
COMMENT ON COLUMN t_customer_meetings.meeting_location IS 'Physical location for in-person meetings';
COMMENT ON COLUMN t_customer_meetings.meeting_link IS 'Video call URL for video_call meetings';
COMMENT ON COLUMN t_customer_meetings.outcome IS 'Meeting outcome/summary after completion';
COMMENT ON COLUMN t_customer_meetings.completed_at IS 'Timestamp when meeting was marked as completed';
COMMENT ON COLUMN t_customer_meetings.cancelled_at IS 'Timestamp when meeting was cancelled';
COMMENT ON COLUMN t_customer_meetings.cancellation_reason IS 'Reason for meeting cancellation';

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_customer_meetings_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_customer_meetings_timestamp
    BEFORE UPDATE ON t_customer_meetings
    FOR EACH ROW
    EXECUTE FUNCTION update_customer_meetings_timestamp();

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ t_customer_meetings table created successfully with all required columns';
END $$;
