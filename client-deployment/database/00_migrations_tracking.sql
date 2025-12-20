-- ============================================================================
-- File: 00_migrations_tracking.sql
-- Description: Creates migration tracking table (run once, before all migrations)
-- Purpose: Track which migrations have been applied to this database
-- Date: 2025-12-20
-- ============================================================================
-- This file should be run FIRST before any other migrations
-- The migrate.sh script will auto-run this if t_migrations doesn't exist
-- ============================================================================

-- Migration tracking table
CREATE TABLE IF NOT EXISTS t_migrations (
    id SERIAL PRIMARY KEY,
    version VARCHAR(10) NOT NULL,              -- '023', '024', '025', '028'
    filename VARCHAR(255) NOT NULL,            -- '023_alert_system_enhancements.sql'
    name VARCHAR(255),                         -- 'Alert System Enhancements'
    description TEXT,
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    applied_by VARCHAR(100) DEFAULT 'system',  -- 'system' or user identifier
    execution_time_ms INTEGER,                 -- How long it took to run
    status VARCHAR(20) DEFAULT 'success',      -- 'success', 'failed', 'rolled_back'
    error_message TEXT,                        -- If failed, store error
    checksum VARCHAR(64),                      -- MD5 hash of file (detect changes)

    CONSTRAINT unique_migration_version UNIQUE(version)
);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_migrations_version ON t_migrations(version);
CREATE INDEX IF NOT EXISTS idx_migrations_status ON t_migrations(status);

-- Comments
COMMENT ON TABLE t_migrations IS 'Tracks all database migrations applied to this instance';
COMMENT ON COLUMN t_migrations.version IS 'Migration version number extracted from filename (e.g., 023 from 023_alert_system.sql)';
COMMENT ON COLUMN t_migrations.filename IS 'Original filename of the migration script';
COMMENT ON COLUMN t_migrations.checksum IS 'MD5 hash of migration file to detect if file was modified after applying';

-- Helper function to get current DB version
CREATE OR REPLACE FUNCTION get_db_version()
RETURNS VARCHAR(10) AS $$
BEGIN
    RETURN (
        SELECT COALESCE(MAX(version), '000')
        FROM t_migrations
        WHERE status = 'success'
    );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_db_version() IS 'Returns the highest successfully applied migration version';

-- Helper function to check if migration is applied
CREATE OR REPLACE FUNCTION is_migration_applied(p_version VARCHAR(10))
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM t_migrations
        WHERE version = p_version
        AND status = 'success'
    );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION is_migration_applied(VARCHAR) IS 'Checks if a specific migration version has been successfully applied';

-- View for migration status summary
CREATE OR REPLACE VIEW v_migration_status AS
SELECT
    version,
    filename,
    name,
    applied_at,
    status,
    execution_time_ms,
    CASE
        WHEN status = 'success' THEN '✓'
        WHEN status = 'failed' THEN '✗'
        ELSE '?'
    END as status_icon
FROM t_migrations
ORDER BY version DESC;

COMMENT ON VIEW v_migration_status IS 'Summary view of all applied migrations';

-- Log this tracking table creation
INSERT INTO t_migrations (version, filename, name, description, status)
VALUES (
    '000',
    '00_migrations_tracking.sql',
    'Migration Tracking Setup',
    'Creates t_migrations table to track all database migrations',
    'success'
)
ON CONFLICT (version) DO NOTHING;

-- Output
DO $$
BEGIN
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'Migration tracking table created successfully';
    RAISE NOTICE 'Current DB version: %', get_db_version();
    RAISE NOTICE '==============================================';
END $$;
