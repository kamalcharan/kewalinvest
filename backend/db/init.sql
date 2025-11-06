-- ============================================================================
-- Kewalinvest Database Initialization Script
-- This script sets up a fresh database with all necessary schema, functions,
-- views, and initial data for the Kewalinvest application
-- ============================================================================

-- ============================================================================
-- SECTION 1: Extensions and Schema Setup
-- ============================================================================

-- Create n8n schema for workflow automation
CREATE SCHEMA IF NOT EXISTS n8n;

-- Install required PostgreSQL extensions
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA public;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA n8n;

COMMENT ON EXTENSION pg_trgm IS 'text similarity measurement and index searching based on trigrams';
COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';

-- ============================================================================
-- NOTE: The full schema will be loaded from current_schema_utf8.sql
-- This file applies critical fixes and patches on top of the base schema
-- ============================================================================

-- For fresh database setup, this init.sql should be combined with the full schema.
-- Run this script AFTER loading the base schema to apply necessary patches.

-- ============================================================================
-- CRITICAL FIX 1: Update t_import_sessions status constraint
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE 'Applying fix for t_import_sessions status constraint...';

    -- Drop old constraint if exists
    IF EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 't_import_sessions_status_check'
    ) THEN
        ALTER TABLE t_import_sessions DROP CONSTRAINT t_import_sessions_status_check;
        RAISE NOTICE '  ✓ Dropped old constraint';
    END IF;

    -- Add updated constraint with all required statuses including 'pending_processing'
    ALTER TABLE t_import_sessions
    ADD CONSTRAINT t_import_sessions_status_check
    CHECK (status IN ('pending', 'staged', 'pending_processing', 'processing', 'completed', 'completed_with_errors', 'failed', 'cancelled'));

    RAISE NOTICE '  ✓ Added updated constraint with pending_processing status';

EXCEPTION
    WHEN undefined_table THEN
        RAISE NOTICE '  ⚠ Table t_import_sessions does not exist yet - constraint will be applied when schema is loaded';
    WHEN OTHERS THEN
        RAISE NOTICE '  ⚠ Error applying constraint fix: %', SQLERRM;
END $$;

-- ============================================================================
-- CRITICAL FIX 2: Ensure v_import_staging_progress view exists
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE 'Checking and creating v_import_staging_progress view...';
END $$;

-- First ensure v_import_staging_statistics view exists (dependency)
CREATE OR REPLACE VIEW v_import_staging_statistics AS
SELECT
    session_id,
    tenant_id,
    is_live,
    import_type,
    COUNT(*) as total_records,
    COUNT(*) FILTER (WHERE processing_status = 'pending') as pending_count,
    COUNT(*) FILTER (WHERE processing_status = 'processing') as processing_count,
    COUNT(*) FILTER (WHERE processing_status = 'completed') as completed_count,
    COUNT(*) FILTER (WHERE processing_status = 'error') as error_count,
    COUNT(*) FILTER (WHERE processing_status = 'skipped') as skipped_count,
    COUNT(*) FILTER (WHERE processing_status = 'duplicate') as duplicate_count,
    COUNT(*) FILTER (WHERE processing_status = 'orphan') as orphan_count,
    ROUND(
        (COUNT(*) FILTER (WHERE processing_status IN ('completed', 'skipped', 'duplicate'))::NUMERIC /
        NULLIF(COUNT(*)::NUMERIC, 0)) * 100,
        2
    ) as success_rate,
    MIN(processed_at) as first_processed_at,
    MAX(processed_at) as last_processed_at,
    MAX(retry_count) as max_retries
FROM t_import_staging_data
GROUP BY session_id, tenant_id, is_live, import_type;

COMMENT ON VIEW v_import_staging_statistics IS 'Aggregated statistics for staging table by session including orphan record tracking';

-- Now create the main progress view
CREATE OR REPLACE VIEW v_import_staging_progress AS
SELECT
    s.id AS session_id,
    s.session_name,
    s.import_type,
    s.status AS session_status,
    s.staging_total_rows,
    s.staging_processed_rows,
    s.staging_successful_rows,
    s.staging_failed_rows,
    s.staging_skipped_rows,
    COALESCE(st.orphan_count, 0) as orphan_records,

    -- Progress calculation
    CASE
        WHEN s.staging_total_rows > 0
        THEN ROUND((s.staging_processed_rows::NUMERIC / s.staging_total_rows::NUMERIC) * 100, 2)
        ELSE 0
    END AS progress_percentage,

    -- Processing rate
    CASE
        WHEN s.processing_started_at IS NOT NULL AND s.staging_processed_rows > 0
        THEN EXTRACT(EPOCH FROM (COALESCE(s.processing_completed_at, NOW()) - s.processing_started_at)) / s.staging_processed_rows
        ELSE NULL
    END AS avg_seconds_per_record,

    -- Estimated completion time
    CASE
        WHEN s.processing_started_at IS NOT NULL
        AND s.staging_processed_rows > 0
        AND s.staging_total_rows > s.staging_processed_rows
        AND s.status = 'processing'
        THEN
            ROUND(
                (EXTRACT(EPOCH FROM (NOW() - s.processing_started_at)) / s.staging_processed_rows)
                * (s.staging_total_rows - s.staging_processed_rows)
            )
        ELSE NULL
    END AS estimated_seconds_remaining

FROM t_import_sessions s
LEFT JOIN v_import_staging_statistics st ON s.id = st.session_id;

COMMENT ON VIEW v_import_staging_progress IS 'Real-time import progress monitoring view with orphan record tracking';

DO $$
BEGIN
    RAISE NOTICE '  ✓ Views created successfully';
END $$;

-- ============================================================================
-- Verification and Completion
-- ============================================================================

DO $$
DECLARE
    v_constraint_exists BOOLEAN;
    v_view_exists BOOLEAN;
BEGIN
    RAISE NOTICE '============================================================================';
    RAISE NOTICE 'Database initialization patches applied';
    RAISE NOTICE '============================================================================';

    -- Check if constraint exists
    SELECT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 't_import_sessions_status_check'
    ) INTO v_constraint_exists;

    -- Check if view exists
    SELECT EXISTS (
        SELECT 1 FROM pg_views
        WHERE viewname = 'v_import_staging_progress'
    ) INTO v_view_exists;

    IF v_constraint_exists THEN
        RAISE NOTICE '✓ Status constraint fixed';
    ELSE
        RAISE NOTICE '⚠ Status constraint not found (table may not exist yet)';
    END IF;

    IF v_view_exists THEN
        RAISE NOTICE '✓ Progress view created';
    ELSE
        RAISE NOTICE '⚠ Progress view not found';
    END IF;

    RAISE NOTICE '============================================================================';
    RAISE NOTICE 'IMPORTANT: This script should be run AFTER loading the base schema';
    RAISE NOTICE 'If tables do not exist yet, please load current_schema_utf8.sql first';
    RAISE NOTICE '============================================================================';

EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Verification completed with warnings: %', SQLERRM;
END $$;
