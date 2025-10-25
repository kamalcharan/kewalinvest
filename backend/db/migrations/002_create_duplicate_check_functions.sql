-- Migration: Create duplicate detection functions
-- Date: 2025-10-25
-- Description: Create PostgreSQL functions for filename and session-level duplicate detection

-- ============================================================================
-- FUNCTION: check_filename_duplicate
-- Purpose: Check if same filename + file size was uploaded within 24 hours
-- ============================================================================
CREATE OR REPLACE FUNCTION check_filename_duplicate(
    p_tenant_id INTEGER,
    p_is_live BOOLEAN,
    p_filename VARCHAR,
    p_file_size INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_duplicate_count INTEGER;
    v_matched_session RECORD;
    v_result JSONB;
BEGIN
    -- Find duplicate within last 24 hours
    SELECT COUNT(*),
           MAX(created_at) as latest_upload
    INTO v_duplicate_count, v_matched_session
    FROM t_import_sessions s
    INNER JOIN t_file_uploads f ON s.file_upload_id = f.id
    WHERE s.tenant_id = p_tenant_id
      AND s.is_live = p_is_live
      AND f.original_filename = p_filename
      AND f.file_size = p_file_size
      AND s.created_at > NOW() - INTERVAL '24 hours';

    IF v_duplicate_count > 0 THEN
        -- Duplicate found
        SELECT jsonb_build_object(
            'isDuplicate', true,
            'severity', 'critical',
            'canProceed', false,
            'matchedFile', jsonb_build_object(
                'filename', f.original_filename,
                'fileSize', f.file_size,
                'uploadedAt', s.created_at,
                'status', s.status,
                'sessionName', s.session_name
            ),
            'message', 'This exact file (same name and size) was uploaded within the last 24 hours.',
            'userGuidance', 'Please verify this is not a duplicate upload. If you need to re-import, please rename the file or wait 24 hours.'
        ) INTO v_result
        FROM t_import_sessions s
        INNER JOIN t_file_uploads f ON s.file_upload_id = f.id
        WHERE s.tenant_id = p_tenant_id
          AND s.is_live = p_is_live
          AND f.original_filename = p_filename
          AND f.file_size = p_file_size
          AND s.created_at > NOW() - INTERVAL '24 hours'
        ORDER BY s.created_at DESC
        LIMIT 1;
    ELSE
        -- No duplicate
        v_result := jsonb_build_object(
            'isDuplicate', false,
            'severity', 'none',
            'canProceed', true,
            'message', 'No recent duplicate detected.'
        );
    END IF;

    RETURN v_result;
END;
$$;

COMMENT ON FUNCTION check_filename_duplicate IS 'Check for filename + file size duplicates within 24 hours';

-- ============================================================================
-- FUNCTION: check_session_duplicate_percentage
-- Purpose: Check session-level duplicate percentage for customer imports
-- ============================================================================
CREATE OR REPLACE FUNCTION check_session_duplicate_percentage(
    p_tenant_id INTEGER,
    p_is_live BOOLEAN,
    p_session_id INTEGER,
    p_comparison_days INTEGER DEFAULT 30
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_import_type VARCHAR;
    v_total_records INTEGER;
    v_duplicate_count INTEGER;
    v_percentage NUMERIC(5,2);
    v_severity VARCHAR(20);
    v_should_block BOOLEAN;
    v_requires_decision BOOLEAN;
    v_message TEXT;
    v_guidance TEXT;
    v_sample_duplicates JSONB;
    v_result JSONB;
BEGIN
    -- Get import type
    SELECT import_type INTO v_import_type
    FROM t_import_sessions
    WHERE id = p_session_id;

    -- Skip check for TransactionData
    IF v_import_type = 'TransactionData' THEN
        RETURN jsonb_build_object(
            'checked', false,
            'skipped', true,
            'reason', 'Session-level duplicate check skipped for transaction imports'
        );
    END IF;

    -- Count total staging records
    SELECT COUNT(*) INTO v_total_records
    FROM t_import_staging_data
    WHERE session_id = p_session_id;

    IF v_total_records = 0 THEN
        RETURN jsonb_build_object(
            'checked', false,
            'error', 'No staging data found for session'
        );
    END IF;

    -- Count duplicates in customer data (last 30 days)
    -- Match on PAN, Email, or Mobile
    SELECT COUNT(DISTINCT stg.id) INTO v_duplicate_count
    FROM t_import_staging_data stg
    WHERE stg.session_id = p_session_id
      AND stg.import_type = 'CustomerData'
      AND EXISTS (
          SELECT 1
          FROM t_customers c
          WHERE c.tenant_id = p_tenant_id
            AND c.is_live = p_is_live
            AND c.created_at > NOW() - (p_comparison_days || ' days')::INTERVAL
            AND (
                (stg.mapped_data->>'pan' IS NOT NULL AND c.pan = stg.mapped_data->>'pan')
                OR (stg.mapped_data->>'email' IS NOT NULL AND c.email = stg.mapped_data->>'email')
                OR (stg.mapped_data->>'mobile' IS NOT NULL AND c.mobile = stg.mapped_data->>'mobile')
            )
      );

    -- Calculate percentage
    v_percentage := ROUND((v_duplicate_count::NUMERIC / v_total_records::NUMERIC) * 100, 2);

    -- Determine severity and actions
    IF v_percentage >= 50 THEN
        v_severity := 'critical';
        v_should_block := true;
        v_requires_decision := true;
        v_message := 'Critical: ' || v_percentage::TEXT || '% of records match existing data. Import blocked.';
        v_guidance := 'More than half of the records already exist. Please review the import data or check if this is a duplicate upload.';
    ELSIF v_percentage >= 5 THEN
        v_severity := 'warning';
        v_should_block := false;
        v_requires_decision := true;
        v_message := 'Warning: ' || v_percentage::TEXT || '% of records may be duplicates.';
        v_guidance := 'Some records match existing data. Please classify whether this is intentional (legitimate corrections) or accidental (duplicate import).';
    ELSE
        v_severity := 'none';
        v_should_block := false;
        v_requires_decision := false;
        v_message := 'Low duplicate rate: ' || v_percentage::TEXT || '%. Import can proceed.';
        v_guidance := NULL;
    END IF;

    -- Get sample duplicates (first 10)
    SELECT jsonb_agg(
        jsonb_build_object(
            'rowNumber', stg.row_number,
            'pan', stg.mapped_data->>'pan',
            'name', stg.mapped_data->>'name',
            'email', stg.mapped_data->>'email',
            'mobile', stg.mapped_data->>'mobile'
        )
    ) INTO v_sample_duplicates
    FROM (
        SELECT DISTINCT ON (stg.id) stg.id, stg.row_number, stg.mapped_data
        FROM t_import_staging_data stg
        WHERE stg.session_id = p_session_id
          AND stg.import_type = 'CustomerData'
          AND EXISTS (
              SELECT 1
              FROM t_customers c
              WHERE c.tenant_id = p_tenant_id
                AND c.is_live = p_is_live
                AND c.created_at > NOW() - (p_comparison_days || ' days')::INTERVAL
                AND (
                    (stg.mapped_data->>'pan' IS NOT NULL AND c.pan = stg.mapped_data->>'pan')
                    OR (stg.mapped_data->>'email' IS NOT NULL AND c.email = stg.mapped_data->>'email')
                    OR (stg.mapped_data->>'mobile' IS NOT NULL AND c.mobile = stg.mapped_data->>'mobile')
                )
          )
        LIMIT 10
    ) stg;

    -- Build final result
    v_result := jsonb_build_object(
        'checked', true,
        'matchPercentage', v_percentage,
        'matchCount', v_duplicate_count,
        'totalRecords', v_total_records,
        'severity', v_severity,
        'shouldBlock', v_should_block,
        'requiresUserDecision', v_requires_decision,
        'message', v_message,
        'userGuidance', v_guidance,
        'sampleDuplicates', COALESCE(v_sample_duplicates, '[]'::jsonb),
        'comparisonDays', p_comparison_days
    );

    RETURN v_result;
END;
$$;

COMMENT ON FUNCTION check_session_duplicate_percentage IS 'Check percentage of duplicate records in customer import session';

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION check_filename_duplicate TO PUBLIC;
GRANT EXECUTE ON FUNCTION check_session_duplicate_percentage TO PUBLIC;
