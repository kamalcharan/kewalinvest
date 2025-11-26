-- ============================================================================
-- File: 04_functions_views_policies.sql
-- Description: Business logic functions, views, and security policies
-- Purpose: Implement data processing, views, and row-level security
-- Execution: Run FOURTH after 03_indexes_triggers.sql
-- Author: System
-- Date: 2025-01-08
-- Updated: 2025-11-08 (Integrated Migration 006, JTBD Consolidation, Migration 007)
-- ============================================================================

-- ============================================================================
-- SECTION 1: UTILITY FUNCTIONS (RLS Support)
-- ============================================================================
DO $$ 
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Creating Utility Functions';
    RAISE NOTICE '========================================';
END $$;

-- ----------------------------------------------------------------------------
-- FUNCTION: current_tenant_id
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION current_tenant_id() 
RETURNS INTEGER AS $$
BEGIN
    RETURN NULLIF(current_setting('app.current_tenant_id', true), '')::INTEGER;
EXCEPTION
    WHEN OTHERS THEN
        RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION current_tenant_id IS 'Get current tenant ID from session for RLS policies';

-- ----------------------------------------------------------------------------
-- FUNCTION: current_environment
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION current_environment() 
RETURNS VARCHAR AS $$
BEGIN
    RETURN COALESCE(current_setting('app.current_environment', true), 'live');
EXCEPTION
    WHEN OTHERS THEN
        RETURN 'live';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION current_environment IS 'Get current environment (live/test) from session';

-- ============================================================================
-- SECTION 1.1: ALERT VISIBILITY FUNCTIONS (Migration 023)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- FUNCTION: get_alert_visibility_settings
-- Description: Returns visibility settings for a specific alert type
-- ----------------------------------------------------------------------------
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

-- ----------------------------------------------------------------------------
-- FUNCTION: is_alert_visible
-- Description: Checks if an alert should be visible based on visibility settings
-- ----------------------------------------------------------------------------
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

-- ----------------------------------------------------------------------------
-- FUNCTION: normalize_customer_name (Migration 006)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION normalize_customer_name(p_name TEXT)
RETURNS TEXT
LANGUAGE plpgsql IMMUTABLE
AS $$
DECLARE
    normalized TEXT;
    salutations TEXT[] := ARRAY['MR', 'MRS', 'MS', 'DR', 'SRI', 'SHRI', 'SMT', 'MISS', 'PROF'];
    salutation TEXT;
BEGIN
    IF p_name IS NULL THEN
        RETURN NULL;
    END IF;

    normalized := UPPER(TRIM(p_name));

    FOREACH salutation IN ARRAY salutations
    LOOP
        IF normalized ~ ('^' || salutation || '\.')
        THEN
            normalized := TRIM(REGEXP_REPLACE(normalized, '^' || salutation || '\.', '', 'i'));
        END IF;

        IF normalized ~ ('^' || salutation || '\s')
        THEN
            normalized := TRIM(REGEXP_REPLACE(normalized, '^' || salutation || '\s+', '', 'i'));
        END IF;

        IF normalized = salutation
        THEN
            normalized := '';
        END IF;
    END LOOP;

    normalized := REGEXP_REPLACE(normalized, '[^A-Z0-9\s]', '', 'g');
    normalized := REGEXP_REPLACE(normalized, '\s+', ' ', 'g');
    normalized := TRIM(normalized);

    IF normalized = '' THEN
        RETURN NULL;
    END IF;

    RETURN normalized;
END;
$$;

COMMENT ON FUNCTION normalize_customer_name IS 'Normalize customer names for matching - removes titles, special chars, standardizes case';

-- ============================================================================
-- SECTION 2: CUSTOMER IMPORT FUNCTIONS
-- ============================================================================
DO $$ 
BEGIN
    RAISE NOTICE 'Creating Customer Import Functions...';
END $$;

-- ----------------------------------------------------------------------------
-- FUNCTION: check_customer_duplicate
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION check_customer_duplicate(
    p_tenant_id INTEGER,
    p_is_live BOOLEAN,
    p_pan VARCHAR,
    p_email VARCHAR,
    p_mobile VARCHAR
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
    v_exists BOOLEAN;
BEGIN
    IF p_pan IS NOT NULL AND p_pan != '' THEN
        SELECT EXISTS(
            SELECT 1 FROM t_customers 
            WHERE pan = UPPER(TRIM(p_pan))
            AND tenant_id = p_tenant_id
            AND is_live = p_is_live
            AND is_active = true
        ) INTO v_exists;
        
        IF v_exists THEN
            RETURN true;
        END IF;
    END IF;
    
    IF p_email IS NOT NULL AND p_email != '' THEN
        SELECT EXISTS(
            SELECT 1 FROM t_contact_channels cc
            JOIN t_contacts c ON cc.contact_id = c.id
            WHERE cc.channel_type = 'email'
            AND cc.channel_value = LOWER(TRIM(p_email))
            AND c.tenant_id = p_tenant_id
            AND c.is_live = p_is_live
            AND cc.is_active = true
        ) INTO v_exists;
        
        IF v_exists THEN
            RETURN true;
        END IF;
    END IF;
    
    IF p_mobile IS NOT NULL AND p_mobile != '' THEN
        SELECT EXISTS(
            SELECT 1 FROM t_contact_channels cc
            JOIN t_contacts c ON cc.contact_id = c.id
            WHERE cc.channel_type = 'mobile'
            AND cc.channel_value = REGEXP_REPLACE(p_mobile, '[^0-9]', '', 'g')
            AND c.tenant_id = p_tenant_id
            AND c.is_live = p_is_live
            AND cc.is_active = true
        ) INTO v_exists;
        
        IF v_exists THEN
            RETURN true;
        END IF;
    END IF;
    
    RETURN false;
END;
$$;

COMMENT ON FUNCTION check_customer_duplicate IS 'Check for duplicate customers using PAN (plain text), email, or mobile';

-- ----------------------------------------------------------------------------
-- FUNCTION: process_single_customer_record
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION process_single_customer_record(p_staging_id INTEGER)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
    v_staging RECORD;
    v_mapped_data JSONB;
    v_contact_id INTEGER;
    v_customer_id INTEGER;
    v_is_duplicate BOOLEAN;
    v_error_messages TEXT[];
    v_clean_prefix VARCHAR(10);
    v_date_of_birth DATE;
    v_anniversary_date DATE;
    v_iwell_code VARCHAR(100);
BEGIN
    SELECT * INTO v_staging
    FROM t_import_staging_data
    WHERE id = p_staging_id;
    
    IF NOT FOUND THEN
        RETURN;
    END IF;
    
    UPDATE t_import_staging_data
    SET processing_status = 'processing'
    WHERE id = p_staging_id;
    
    v_mapped_data := v_staging.mapped_data;
    v_error_messages := ARRAY[]::TEXT[];
    
    BEGIN
        v_is_duplicate := check_customer_duplicate(
            v_staging.tenant_id,
            v_staging.is_live,
            v_mapped_data->>'pan',
            v_mapped_data->>'email',
            v_mapped_data->>'mobile'
        );
        
        IF v_is_duplicate THEN
            UPDATE t_import_staging_data
            SET processing_status = 'duplicate',
                warnings = array_append(warnings, 'Customer already exists'),
                processed_at = CURRENT_TIMESTAMP
            WHERE id = p_staging_id;
            RETURN;
        END IF;
        
        v_clean_prefix := TRIM(v_mapped_data->>'prefix');
        v_clean_prefix := REPLACE(v_clean_prefix, '.', '');
        v_clean_prefix := INITCAP(LOWER(v_clean_prefix));
        
        IF v_clean_prefix IN ('Mr', 'Mrs', 'Ms', 'Dr', 'Prof') THEN
            NULL;
        ELSIF v_clean_prefix = '' OR v_clean_prefix IS NULL THEN
            v_clean_prefix := 'Sri';
        ELSE
            v_clean_prefix := 'Sri';
        END IF;
        
        INSERT INTO t_contacts (
            tenant_id,
            is_live,
            prefix,
            name,
            is_customer,
            created_at
        ) VALUES (
            v_staging.tenant_id,
            v_staging.is_live,
            v_clean_prefix,
            v_mapped_data->>'name',
            true,
            CURRENT_TIMESTAMP
        ) RETURNING id INTO v_contact_id;
        
        IF v_mapped_data->>'email' IS NOT NULL AND TRIM(v_mapped_data->>'email') != '' THEN
            INSERT INTO t_contact_channels (
                contact_id,
                tenant_id,
                is_live,
                channel_type,
                channel_value,
                is_primary
            ) VALUES (
                v_contact_id,
                v_staging.tenant_id,
                v_staging.is_live,
                'email',
                v_mapped_data->>'email',
                true
            );
        END IF;
        
        IF v_mapped_data->>'mobile' IS NOT NULL AND TRIM(v_mapped_data->>'mobile') != '' THEN
            INSERT INTO t_contact_channels (
                contact_id,
                tenant_id,
                is_live,
                channel_type,
                channel_value,
                is_primary
            ) VALUES (
                v_contact_id,
                v_staging.tenant_id,
                v_staging.is_live,
                'mobile',
                v_mapped_data->>'mobile',
                CASE WHEN v_mapped_data->>'email' IS NULL THEN true ELSE false END
            );
        END IF;
        
        v_date_of_birth := NULL;
        IF v_mapped_data->>'date_of_birth' IS NOT NULL AND TRIM(v_mapped_data->>'date_of_birth') != '' THEN
            BEGIN
                v_date_of_birth := TO_DATE(v_mapped_data->>'date_of_birth', 'DD-MM-YYYY');
            EXCEPTION WHEN OTHERS THEN
                BEGIN
                    v_date_of_birth := TO_DATE(v_mapped_data->>'date_of_birth', 'MM-DD-YYYY');
                EXCEPTION WHEN OTHERS THEN
                    BEGIN
                        v_date_of_birth := TO_DATE(v_mapped_data->>'date_of_birth', 'YYYY-MM-DD');
                    EXCEPTION WHEN OTHERS THEN
                        v_date_of_birth := NULL;
                    END;
                END;
            END;
        END IF;
        
        v_anniversary_date := NULL;
        IF v_mapped_data->>'anniversary_date' IS NOT NULL AND TRIM(v_mapped_data->>'anniversary_date') != '' THEN
            BEGIN
                v_anniversary_date := TO_DATE(v_mapped_data->>'anniversary_date', 'DD-MM-YYYY');
            EXCEPTION WHEN OTHERS THEN
                BEGIN
                    v_anniversary_date := TO_DATE(v_mapped_data->>'anniversary_date', 'MM-DD-YYYY');
                EXCEPTION WHEN OTHERS THEN
                    BEGIN
                        v_anniversary_date := TO_DATE(v_mapped_data->>'anniversary_date', 'YYYY-MM-DD');
                    EXCEPTION WHEN OTHERS THEN
                        v_anniversary_date := NULL;
                    END;
                END;
            END;
        END IF;
        
        v_iwell_code := NULLIF(TRIM(v_mapped_data->>'iwell_code'), '');

        INSERT INTO t_customers (
            contact_id,
            tenant_id,
            is_live,
            pan,
            iwell_code,
            date_of_birth,
            anniversary_date,
            family_head_name,
            family_head_iwell_code,
            referred_by_name,
            created_at
        ) VALUES (
            v_contact_id,
            v_staging.tenant_id,
            v_staging.is_live,
            v_mapped_data->>'pan',
            v_iwell_code,
            v_date_of_birth,
            v_anniversary_date,
            v_mapped_data->>'family_head_name',
            v_mapped_data->>'family_head_iwell_code',
            v_mapped_data->>'referred_by_name',
            CURRENT_TIMESTAMP
        ) RETURNING id INTO v_customer_id;

        IF (v_mapped_data->>'address_line1' IS NOT NULL AND TRIM(v_mapped_data->>'address_line1') != '') OR 
           (v_mapped_data->>'city' IS NOT NULL AND TRIM(v_mapped_data->>'city') != '') THEN
            INSERT INTO t_customer_addresses (
                customer_id,
                tenant_id,
                is_live,
                address_type,
                address_line1,
                address_line2,
                city,
                state,
                country,
                pincode,
                is_primary
            ) VALUES (
                v_customer_id,
                v_staging.tenant_id,
                v_staging.is_live,
                'residential',
                COALESCE(NULLIF(TRIM(v_mapped_data->>'address_line1'), ''), 'Not Provided'),
                NULLIF(TRIM(v_mapped_data->>'address_line2'), ''),
                COALESCE(NULLIF(TRIM(v_mapped_data->>'city'), ''), 'Unknown'),
                COALESCE(NULLIF(TRIM(v_mapped_data->>'state'), ''), 'Unknown'),
                COALESCE(NULLIF(TRIM(v_mapped_data->>'country'), ''), 'India'),
                COALESCE(NULLIF(TRIM(v_mapped_data->>'pincode'), ''), '000000'),
                true
            );
        END IF;
        
        UPDATE t_import_staging_data
        SET processing_status = 'success',
            created_record_id = v_customer_id,
            created_record_type = 'customer',
            processed_at = CURRENT_TIMESTAMP
        WHERE id = p_staging_id;
        
    EXCEPTION WHEN OTHERS THEN
        v_error_messages := array_append(v_error_messages, SQLERRM);
        
        UPDATE t_import_staging_data
        SET processing_status = 'failed',
            error_messages = v_error_messages,
            processed_at = CURRENT_TIMESTAMP
        WHERE id = p_staging_id;
        
        IF v_contact_id IS NOT NULL THEN
            DELETE FROM t_contacts WHERE id = v_contact_id;
        END IF;
    END;
END;
$$;

COMMENT ON FUNCTION process_single_customer_record IS 'Process single customer record from staging - normalized_name auto-generated';

-- ----------------------------------------------------------------------------
-- FUNCTION: process_customer_import_with_timing
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION process_customer_import_with_timing(
    p_session_id INTEGER,
    p_target_duration_ms INTEGER DEFAULT 30000
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_session RECORD;
    v_staging_record RECORD;
    v_total_records INTEGER;
    v_records_per_batch INTEGER;
    v_delay_per_batch INTERVAL;
    v_processed_count INTEGER := 0;
    v_success_count INTEGER := 0;
    v_failed_count INTEGER := 0;
    v_duplicate_count INTEGER := 0;
    v_batch_count INTEGER := 0;
    v_start_time TIMESTAMP;
    v_result JSONB;
BEGIN
    v_start_time := CURRENT_TIMESTAMP;
    
    SELECT * INTO v_session
    FROM t_import_sessions
    WHERE id = p_session_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Session % not found', p_session_id;
    END IF;
    
    SELECT COUNT(*) INTO v_total_records
    FROM t_import_staging_data
    WHERE session_id = p_session_id
    AND processing_status = 'pending';
    
    v_records_per_batch := GREATEST(1, v_total_records / 10);
    v_delay_per_batch := (p_target_duration_ms / 10.0 || ' milliseconds')::INTERVAL;
    
    UPDATE t_import_sessions
    SET status = 'processing',
        processing_started_at = CURRENT_TIMESTAMP,
        total_records = v_total_records
    WHERE id = p_session_id;
    
    FOR v_staging_record IN 
        SELECT * FROM t_import_staging_data
        WHERE session_id = p_session_id
        AND processing_status = 'pending'
        ORDER BY row_number
        FOR UPDATE SKIP LOCKED
    LOOP
        PERFORM process_single_customer_record(v_staging_record.id);
        
        SELECT processing_status INTO v_staging_record
        FROM t_import_staging_data
        WHERE id = v_staging_record.id;
        
        v_processed_count := v_processed_count + 1;
        
        CASE v_staging_record.processing_status
            WHEN 'success' THEN v_success_count := v_success_count + 1;
            WHEN 'failed' THEN v_failed_count := v_failed_count + 1;
            WHEN 'duplicate' THEN v_duplicate_count := v_duplicate_count + 1;
        END CASE;
        
        IF v_processed_count % v_records_per_batch = 0 OR v_processed_count = v_total_records THEN
            v_batch_count := v_batch_count + 1;
            
            UPDATE t_import_sessions
            SET processed_records = v_processed_count,
                successful_records = v_success_count,
                failed_records = v_failed_count,
                duplicate_records = v_duplicate_count,
                current_batch = v_batch_count,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = p_session_id;
            
            IF v_processed_count < v_total_records THEN
                PERFORM pg_sleep(EXTRACT(EPOCH FROM v_delay_per_batch));
            END IF;
        END IF;
    END LOOP;
    
    UPDATE t_import_sessions
    SET status = CASE 
            WHEN v_failed_count = 0 THEN 'completed'
            ELSE 'completed_with_errors'
        END,
        processing_completed_at = CURRENT_TIMESTAMP,
        processed_records = v_processed_count,
        successful_records = v_success_count,
        failed_records = v_failed_count,
        duplicate_records = v_duplicate_count
    WHERE id = p_session_id;
    
    v_result := jsonb_build_object(
        'sessionId', p_session_id,
        'totalProcessed', v_processed_count,
        'successful', v_success_count,
        'failed', v_failed_count,
        'duplicates', v_duplicate_count,
        'processingTime', EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - v_start_time)) * 1000,
        'status', CASE 
            WHEN v_failed_count = 0 THEN 'completed'
            ELSE 'completed_with_errors'
        END
    );
    
    RETURN v_result;
END;
$$;

COMMENT ON FUNCTION process_customer_import_with_timing IS 'Process customer import with controlled timing for better UX';

-- ============================================================================
-- SECTION 3: SCHEME IMPORT FUNCTIONS
-- ============================================================================
DO $$ 
BEGIN
    RAISE NOTICE 'Creating Scheme Import Functions...';
END $$;

-- ----------------------------------------------------------------------------
-- FUNCTION: process_single_scheme_record
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION process_single_scheme_record(p_staging_id INTEGER)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
    v_staging RECORD;
    v_mapped_data JSONB;
    v_scheme_id INTEGER;
    v_is_duplicate BOOLEAN;
    v_error_messages TEXT[];
    v_scheme_type_id INTEGER;
    v_scheme_category_id INTEGER;
    v_launch_date DATE;
    v_closure_date DATE;
    v_minimum_amount DECIMAL(15,2);
BEGIN
    SELECT * INTO v_staging
    FROM t_import_staging_data
    WHERE id = p_staging_id;
    
    IF NOT FOUND THEN
        RETURN;
    END IF;
    
    UPDATE t_import_staging_data
    SET processing_status = 'processing'
    WHERE id = p_staging_id;
    
    v_mapped_data := v_staging.mapped_data;
    v_error_messages := ARRAY[]::TEXT[];
    
    BEGIN
        SELECT COUNT(*) > 0 INTO v_is_duplicate
        FROM t_scheme_details
        WHERE scheme_code = v_mapped_data->>'scheme_code'
          AND tenant_id = v_staging.tenant_id
          AND is_live = v_staging.is_live;
        
        IF v_is_duplicate THEN
            UPDATE t_scheme_details
            SET 
                amc_name = COALESCE(NULLIF(TRIM(v_mapped_data->>'amc_name'), ''), amc_name),
                scheme_name = COALESCE(NULLIF(TRIM(v_mapped_data->>'scheme_name'), ''), scheme_name),
                scheme_nav_name = COALESCE(NULLIF(TRIM(v_mapped_data->>'scheme_nav_name'), ''), scheme_nav_name),
                scheme_minimum_amount = CASE 
                    WHEN v_mapped_data->>'scheme_minimum_amount' IS NOT NULL 
                    THEN (v_mapped_data->>'scheme_minimum_amount')::DECIMAL(15,2)
                    ELSE scheme_minimum_amount 
                END,
                isin_div_payout = COALESCE(NULLIF(TRIM(v_mapped_data->>'isin_div_payout'), ''), isin_div_payout),
                isin_growth = COALESCE(NULLIF(TRIM(v_mapped_data->>'isin_growth'), ''), isin_growth),
                isin_div_reinvestment = COALESCE(NULLIF(TRIM(v_mapped_data->>'isin_div_reinvestment'), ''), isin_div_reinvestment),
                updated_at = CURRENT_TIMESTAMP
            WHERE scheme_code = v_mapped_data->>'scheme_code'
              AND tenant_id = v_staging.tenant_id
              AND is_live = v_staging.is_live
            RETURNING id INTO v_scheme_id;
            
            UPDATE t_import_staging_data
            SET processing_status = 'duplicate',
                warnings = array_append(warnings, 'Scheme already exists - updated'),
                created_record_id = v_scheme_id,
                created_record_type = 'scheme',
                processed_at = CURRENT_TIMESTAMP
            WHERE id = p_staging_id;
            
            RETURN;
        END IF;
        
        v_scheme_type_id := NULL;
        IF v_mapped_data->>'scheme_type' IS NOT NULL AND TRIM(v_mapped_data->>'scheme_type') != '' THEN
            SELECT id INTO v_scheme_type_id
            FROM t_scheme_masters
            WHERE LOWER(TRIM(name)) = LOWER(TRIM(v_mapped_data->>'scheme_type'))
              AND master_type = 'scheme_type'
              AND tenant_id = v_staging.tenant_id
              AND is_live = v_staging.is_live
              AND is_active = true
            LIMIT 1;
        END IF;
        
        v_scheme_category_id := NULL;
        IF v_mapped_data->>'scheme_category' IS NOT NULL AND TRIM(v_mapped_data->>'scheme_category') != '' THEN
            SELECT id INTO v_scheme_category_id
            FROM t_scheme_masters
            WHERE LOWER(TRIM(name)) = LOWER(TRIM(v_mapped_data->>'scheme_category'))
              AND master_type = 'scheme_category'
              AND tenant_id = v_staging.tenant_id
              AND is_live = v_staging.is_live
              AND is_active = true
            LIMIT 1;
        END IF;
        
        v_launch_date := NULL;
        IF v_mapped_data->>'launch_date' IS NOT NULL AND TRIM(v_mapped_data->>'launch_date') != '' THEN
            BEGIN
                v_launch_date := TO_DATE(v_mapped_data->>'launch_date', 'YYYY-MM-DD');
            EXCEPTION WHEN OTHERS THEN
                BEGIN
                    v_launch_date := TO_DATE(v_mapped_data->>'launch_date', 'DD-MM-YYYY');
                EXCEPTION WHEN OTHERS THEN
                    BEGIN
                        v_launch_date := TO_DATE(v_mapped_data->>'launch_date', 'MM-DD-YYYY');
                    EXCEPTION WHEN OTHERS THEN
                        v_launch_date := NULL;
                    END;
                END;
            END;
        END IF;
        
        v_closure_date := NULL;
        IF v_mapped_data->>'closure_date' IS NOT NULL AND TRIM(v_mapped_data->>'closure_date') != '' THEN
            BEGIN
                v_closure_date := TO_DATE(v_mapped_data->>'closure_date', 'YYYY-MM-DD');
            EXCEPTION WHEN OTHERS THEN
                BEGIN
                    v_closure_date := TO_DATE(v_mapped_data->>'closure_date', 'DD-MM-YYYY');
                EXCEPTION WHEN OTHERS THEN
                    BEGIN
                        v_closure_date := TO_DATE(v_mapped_data->>'closure_date', 'MM-DD-YYYY');
                    EXCEPTION WHEN OTHERS THEN
                        v_closure_date := NULL;
                    END;
                END;
            END;
        END IF;
        
        v_minimum_amount := NULL;
        IF v_mapped_data->>'scheme_minimum_amount' IS NOT NULL AND TRIM(v_mapped_data->>'scheme_minimum_amount') != '' THEN
            BEGIN
                v_minimum_amount := (v_mapped_data->>'scheme_minimum_amount')::DECIMAL(15,2);
            EXCEPTION WHEN OTHERS THEN
                v_minimum_amount := NULL;
            END;
        END IF;
        
        INSERT INTO t_scheme_details (
            tenant_id,
            is_live,
            amc_name,
            scheme_code,
            scheme_name,
            scheme_type_id,
            scheme_category_id,
            scheme_nav_name,
            scheme_minimum_amount,
            launch_date,
            closure_date,
            isin_div_payout,
            isin_growth,
            isin_div_reinvestment,
            created_at
        ) VALUES (
            v_staging.tenant_id,
            v_staging.is_live,
            NULLIF(TRIM(v_mapped_data->>'amc_name'), ''),
            v_mapped_data->>'scheme_code',
            v_mapped_data->>'scheme_name',
            v_scheme_type_id,
            v_scheme_category_id,
            NULLIF(TRIM(v_mapped_data->>'scheme_nav_name'), ''),
            v_minimum_amount,
            v_launch_date,
            v_closure_date,
            NULLIF(TRIM(v_mapped_data->>'isin_div_payout'), ''),
            NULLIF(TRIM(v_mapped_data->>'isin_growth'), ''),
            NULLIF(TRIM(v_mapped_data->>'isin_div_reinvestment'), ''),
            CURRENT_TIMESTAMP
        ) RETURNING id INTO v_scheme_id;
        
        UPDATE t_import_staging_data
        SET processing_status = 'success',
            created_record_id = v_scheme_id,
            created_record_type = 'scheme',
            processed_at = CURRENT_TIMESTAMP
        WHERE id = p_staging_id;
        
    EXCEPTION WHEN OTHERS THEN
        v_error_messages := array_append(v_error_messages, SQLERRM);
        
        UPDATE t_import_staging_data
        SET processing_status = 'failed',
            error_messages = v_error_messages,
            processed_at = CURRENT_TIMESTAMP
        WHERE id = p_staging_id;
    END;
END;
$$;

COMMENT ON FUNCTION process_single_scheme_record IS 'Process single scheme record from staging';

-- ----------------------------------------------------------------------------
-- FUNCTION: process_scheme_import_with_timing
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION process_scheme_import_with_timing(
    p_session_id INTEGER,
    p_target_duration_ms INTEGER DEFAULT 30000
) RETURNS TABLE(
    processed_count INTEGER,
    success_count INTEGER,
    failed_count INTEGER,
    duplicate_count INTEGER,
    actual_duration_ms INTEGER
) 
LANGUAGE plpgsql
AS $$
DECLARE
    v_start_time TIMESTAMP;
    v_end_time TIMESTAMP;
    v_staging_record RECORD;
    v_processed_count INTEGER := 0;
    v_success_count INTEGER := 0;
    v_failed_count INTEGER := 0;
    v_duplicate_count INTEGER := 0;
    v_batch_size INTEGER := 100;
    v_sleep_ms INTEGER;
BEGIN
    v_start_time := clock_timestamp();
    
    UPDATE t_import_sessions 
    SET status = 'processing',
        processing_started_at = v_start_time
    WHERE id = p_session_id;
    
    FOR v_staging_record IN 
        SELECT id, processing_status
        FROM t_import_staging_data
        WHERE session_id = p_session_id
        AND processing_status = 'pending'
        ORDER BY row_number
    LOOP
        PERFORM process_single_scheme_record(v_staging_record.id);
        
        SELECT processing_status INTO v_staging_record
        FROM t_import_staging_data
        WHERE id = v_staging_record.id;
        
        v_processed_count := v_processed_count + 1;
        
        CASE v_staging_record.processing_status
            WHEN 'success' THEN v_success_count := v_success_count + 1;
            WHEN 'failed' THEN v_failed_count := v_failed_count + 1;
            WHEN 'duplicate' THEN v_duplicate_count := v_duplicate_count + 1;
        END CASE;
        
        IF v_processed_count % 10 = 0 THEN
            v_end_time := clock_timestamp();
            v_sleep_ms := (p_target_duration_ms / v_batch_size) - 
                         EXTRACT(MILLISECOND FROM (v_end_time - v_start_time));
            
            IF v_sleep_ms > 0 THEN
                PERFORM pg_sleep(v_sleep_ms / 1000.0);
            END IF;
        END IF;
    END LOOP;
    
    v_end_time := clock_timestamp();
    
    UPDATE t_import_sessions 
    SET status = CASE 
            WHEN v_failed_count > 0 THEN 'completed_with_errors'
            ELSE 'completed'
        END,
        processed_records = v_processed_count,
        successful_records = v_success_count,
        failed_records = v_failed_count,
        duplicate_records = v_duplicate_count,
        processing_completed_at = v_end_time
    WHERE id = p_session_id;
    
    RETURN QUERY SELECT 
        v_processed_count,
        v_success_count,
        v_failed_count,
        v_duplicate_count,
        EXTRACT(MILLISECOND FROM (v_end_time - v_start_time))::INTEGER;
END;
$$;

COMMENT ON FUNCTION process_scheme_import_with_timing IS 'Process scheme import with controlled timing';

-- ----------------------------------------------------------------------------
-- FUNCTION: lookup_scheme_by_alias
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION lookup_scheme_by_alias(
    p_alias_name VARCHAR
)
RETURNS TABLE(
    scheme_id INTEGER,
    scheme_code VARCHAR,
    scheme_name VARCHAR,
    matched_alias VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        sd.id::INTEGER,
        sd.scheme_code::VARCHAR,
        sd.scheme_name::VARCHAR,
        sa.alias_name::VARCHAR
    FROM t_scheme_aliases sa
    JOIN t_scheme_details sd ON sa.scheme_id = sd.id
    WHERE sa.is_active = true
      AND sd.is_active = true
      AND sa.alias_name_normalized = REGEXP_REPLACE(TRIM(UPPER(p_alias_name)), '\s+', ' ', 'g')
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION lookup_scheme_by_alias IS 'Fast lookup to find scheme by alias name during transaction import';

-- ============================================================================
-- SECTION 4: TRANSACTION IMPORT FUNCTIONS
-- ============================================================================
DO $$ 
BEGIN
    RAISE NOTICE 'Creating Transaction Import Functions...';
END $$;

-- ----------------------------------------------------------------------------
-- FUNCTION: process_transaction_import_session
-- Features: Customer lookup, PAN fallback, orphan tracking, auto MF assignment with alerts
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION process_transaction_import_session(
    p_session_id INTEGER,
    p_customer_lookup_method VARCHAR DEFAULT 'iwell_code'
)
RETURNS TABLE(
    total_processed INTEGER,
    successful INTEGER,
    failed INTEGER,
    duplicates INTEGER,
    orphans INTEGER,
    processing_time_seconds NUMERIC
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_start_time TIMESTAMP := NOW();
    v_batch_size INTEGER := 500;
    v_staging_record RECORD;
    v_success_count INTEGER := 0;
    v_failed_count INTEGER := 0;
    v_duplicate_count INTEGER := 0;
    v_orphan_count INTEGER := 0;
    v_processed_count INTEGER := 0;
    v_customer_id INTEGER;
    v_scheme_id INTEGER;
    v_scheme_code VARCHAR;
    v_scheme_name VARCHAR;
    v_bookmark_id INTEGER;
    v_txn_type_id INTEGER;
    v_error_msg TEXT;
    v_txn_id INTEGER;
    v_session_info RECORD;
    -- Variables for auto-assignment
    v_mf_asset_type_id INTEGER;
    v_existing_assignment_id INTEGER;
    v_customer_name VARCHAR;
    v_new_assignment_id INTEGER;
    v_session_creator_id INTEGER;
    v_txn_amount NUMERIC;
BEGIN
    -- Get session info
    SELECT tenant_id, is_live, created_by
    INTO v_session_info
    FROM t_import_sessions
    WHERE id = p_session_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Session % not found', p_session_id;
    END IF;

    -- Get MF asset type ID
    SELECT id INTO v_mf_asset_type_id
    FROM m_asset_types
    WHERE asset_type_code = 'MF' AND is_active = true
    LIMIT 1;

    -- Get session creator for alert creation
    v_session_creator_id := COALESCE(v_session_info.created_by, 1);

    UPDATE t_import_sessions
    SET status = 'processing',
        processing_started_at = NOW()
    WHERE id = p_session_id;

    RAISE NOTICE '[Session %] Starting processing with lookup method: %', p_session_id, p_customer_lookup_method;

    FOR v_staging_record IN (
        SELECT
            id,
            row_number,
            mapped_data,
            tenant_id,
            is_live
        FROM t_import_staging_data
        WHERE session_id = p_session_id
          AND processing_status = 'pending'
        ORDER BY id
    ) LOOP
        BEGIN
            v_customer_id := NULL;
            v_scheme_id := NULL;
            v_scheme_code := NULL;
            v_scheme_name := NULL;
            v_bookmark_id := NULL;
            v_txn_type_id := NULL;
            v_error_msg := NULL;
            v_customer_name := NULL;
            v_existing_assignment_id := NULL;
            v_new_assignment_id := NULL;
            v_txn_amount := NULL;

            -- CUSTOMER LOOKUP WITH PAN FALLBACK
            IF p_customer_lookup_method = 'iwell_code' THEN
                IF v_staging_record.mapped_data->>'iwell_code' IS NOT NULL THEN
                    SELECT c.id INTO v_customer_id
                    FROM t_customers c
                    WHERE c.tenant_id = v_staging_record.tenant_id
                      AND c.is_live = v_staging_record.is_live
                      AND UPPER(c.iwell_code) = UPPER(v_staging_record.mapped_data->>'iwell_code')
                      AND c.is_active = true
                    LIMIT 1;

                    IF v_customer_id IS NULL AND v_staging_record.mapped_data->>'pan' IS NOT NULL THEN
                        SELECT c.id INTO v_customer_id
                        FROM t_customers c
                        WHERE c.tenant_id = v_staging_record.tenant_id
                          AND c.is_live = v_staging_record.is_live
                          AND UPPER(c.pan) = UPPER(v_staging_record.mapped_data->>'pan')
                          AND c.is_active = true
                        LIMIT 1;

                        IF v_customer_id IS NOT NULL THEN
                            RAISE NOTICE '[Session %] Row %: Found customer via PAN fallback', p_session_id, v_staging_record.row_number;
                        END IF;
                    END IF;

                    IF v_customer_id IS NULL THEN
                        v_error_msg := 'No customer found with IWELL code: ' || (v_staging_record.mapped_data->>'iwell_code');
                        IF v_staging_record.mapped_data->>'pan' IS NOT NULL THEN
                            v_error_msg := v_error_msg || ' or PAN: ' || (v_staging_record.mapped_data->>'pan');
                        END IF;
                    END IF;
                ELSE
                    v_error_msg := 'IWELL code is required but not provided';
                END IF;

            ELSIF p_customer_lookup_method = 'customer_name' THEN
                IF v_staging_record.mapped_data->>'customer_name' IS NOT NULL THEN
                    SELECT c.id INTO v_customer_id
                    FROM t_customers c
                    INNER JOIN t_contacts ct ON ct.id = c.contact_id
                    WHERE c.tenant_id = v_staging_record.tenant_id
                      AND c.is_live = v_staging_record.is_live
                      AND ct.normalized_name = normalize_customer_name(v_staging_record.mapped_data->>'customer_name')
                      AND c.is_active = true
                      AND ct.is_active = true
                    LIMIT 1;

                    IF v_customer_id IS NULL AND v_staging_record.mapped_data->>'pan' IS NOT NULL THEN
                        SELECT c.id INTO v_customer_id
                        FROM t_customers c
                        WHERE c.tenant_id = v_staging_record.tenant_id
                          AND c.is_live = v_staging_record.is_live
                          AND UPPER(c.pan) = UPPER(v_staging_record.mapped_data->>'pan')
                          AND c.is_active = true
                        LIMIT 1;

                        IF v_customer_id IS NOT NULL THEN
                            RAISE NOTICE '[Session %] Row %: Found customer via PAN fallback', p_session_id, v_staging_record.row_number;
                        END IF;
                    END IF;

                    IF v_customer_id IS NULL THEN
                        v_error_msg := 'No customer found with name: ' || (v_staging_record.mapped_data->>'customer_name');
                        IF v_staging_record.mapped_data->>'pan' IS NOT NULL THEN
                            v_error_msg := v_error_msg || ' or PAN: ' || (v_staging_record.mapped_data->>'pan');
                        END IF;
                    END IF;
                ELSE
                    v_error_msg := 'Customer name is required but not provided';
                END IF;

            ELSIF p_customer_lookup_method = 'both' THEN
                IF v_staging_record.mapped_data->>'iwell_code' IS NOT NULL THEN
                    SELECT c.id INTO v_customer_id
                    FROM t_customers c
                    WHERE c.tenant_id = v_staging_record.tenant_id
                      AND c.is_live = v_staging_record.is_live
                      AND UPPER(c.iwell_code) = UPPER(v_staging_record.mapped_data->>'iwell_code')
                      AND c.is_active = true
                    LIMIT 1;
                END IF;

                IF v_customer_id IS NULL AND v_staging_record.mapped_data->>'customer_name' IS NOT NULL THEN
                    SELECT c.id INTO v_customer_id
                    FROM t_customers c
                    INNER JOIN t_contacts ct ON ct.id = c.contact_id
                    WHERE c.tenant_id = v_staging_record.tenant_id
                      AND c.is_live = v_staging_record.is_live
                      AND ct.normalized_name = normalize_customer_name(v_staging_record.mapped_data->>'customer_name')
                      AND c.is_active = true
                      AND ct.is_active = true
                    LIMIT 1;
                END IF;

                IF v_customer_id IS NULL AND v_staging_record.mapped_data->>'pan' IS NOT NULL THEN
                    SELECT c.id INTO v_customer_id
                    FROM t_customers c
                    WHERE c.tenant_id = v_staging_record.tenant_id
                      AND c.is_live = v_staging_record.is_live
                      AND UPPER(c.pan) = UPPER(v_staging_record.mapped_data->>'pan')
                      AND c.is_active = true
                    LIMIT 1;

                    IF v_customer_id IS NOT NULL THEN
                        RAISE NOTICE '[Session %] Row %: Found customer via PAN fallback', p_session_id, v_staging_record.row_number;
                    END IF;
                END IF;

                IF v_customer_id IS NULL THEN
                    v_error_msg := 'No customer found with IWELL code, name, or PAN';
                END IF;
            END IF;

            IF v_customer_id IS NULL THEN
                UPDATE t_import_staging_data
                SET processing_status = 'orphan',
                    error_messages = ARRAY[v_error_msg],
                    processed_at = NOW()
                WHERE id = v_staging_record.id;

                v_orphan_count := v_orphan_count + 1;
                v_processed_count := v_processed_count + 1;
                CONTINUE;
            END IF;

            -- Get customer name for alerts
            SELECT ct.name INTO v_customer_name
            FROM t_customers c
            INNER JOIN t_contacts ct ON ct.id = c.contact_id
            WHERE c.id = v_customer_id;

            -- TRANSACTION TYPE LOOKUP
            IF v_staging_record.mapped_data->>'txn_code' IS NOT NULL
               AND TRIM(v_staging_record.mapped_data->>'txn_code') != '' THEN

                SELECT id INTO v_txn_type_id
                FROM m_transaction_types
                WHERE UPPER(TRIM(txn_code)) = UPPER(TRIM(v_staging_record.mapped_data->>'txn_code'))
                  AND is_active = true
                LIMIT 1;

                IF v_txn_type_id IS NULL THEN
                    SELECT id INTO v_txn_type_id
                    FROM m_transaction_types
                    WHERE UPPER(TRIM(txn_name)) = UPPER(TRIM(v_staging_record.mapped_data->>'txn_code'))
                      AND is_active = true
                    LIMIT 1;
                END IF;

                IF v_txn_type_id IS NULL THEN
                    v_error_msg := 'Invalid transaction type: ' || (v_staging_record.mapped_data->>'txn_code');

                    UPDATE t_import_staging_data
                    SET processing_status = 'failed',
                        error_messages = ARRAY[v_error_msg],
                        processed_at = NOW()
                    WHERE id = v_staging_record.id;

                    v_failed_count := v_failed_count + 1;
                    v_processed_count := v_processed_count + 1;
                    CONTINUE;
                END IF;
            ELSE
                v_error_msg := 'Transaction type (txn_code) is required';

                UPDATE t_import_staging_data
                SET processing_status = 'failed',
                    error_messages = ARRAY[v_error_msg],
                    processed_at = NOW()
                WHERE id = v_staging_record.id;

                v_failed_count := v_failed_count + 1;
                v_processed_count := v_processed_count + 1;
                CONTINUE;
            END IF;

            -- SCHEME LOOKUP
            IF v_staging_record.mapped_data->>'scheme_name' IS NOT NULL AND
               TRIM(v_staging_record.mapped_data->>'scheme_name') != '' THEN

                SELECT sa.scheme_id INTO v_scheme_id
                FROM t_scheme_aliases sa
                WHERE sa.is_active = true
                  AND LOWER(TRIM(sa.alias_name)) = LOWER(TRIM(v_staging_record.mapped_data->>'scheme_name'))
                LIMIT 1;

                IF v_scheme_id IS NOT NULL THEN
                    SELECT
                        sb.id,
                        sb.scheme_code,
                        sb.scheme_name
                    INTO
                        v_bookmark_id,
                        v_scheme_code,
                        v_scheme_name
                    FROM t_scheme_bookmarks sb
                    WHERE sb.tenant_id = v_staging_record.tenant_id
                      AND sb.is_live = v_staging_record.is_live
                      AND sb.scheme_id = v_scheme_id
                      AND sb.is_active = true
                    LIMIT 1;

                    IF v_bookmark_id IS NULL THEN
                        SELECT scheme_name INTO v_scheme_name
                        FROM t_scheme_details
                        WHERE id = v_scheme_id;
                    END IF;
                END IF;
            END IF;

            IF v_bookmark_id IS NULL OR v_scheme_code IS NULL OR TRIM(v_scheme_code) = '' THEN
                v_error_msg := 'Scheme not bookmarked by tenant or has no scheme_code: ' ||
                              COALESCE(v_scheme_name, v_staging_record.mapped_data->>'scheme_name', 'N/A');

                UPDATE t_import_staging_data
                SET processing_status = 'failed',
                    error_messages = ARRAY[v_error_msg],
                    processed_at = NOW()
                WHERE id = v_staging_record.id;

                v_failed_count := v_failed_count + 1;
                v_processed_count := v_processed_count + 1;
                CONTINUE;
            END IF;

            -- DUPLICATE CHECK
            IF EXISTS (
                SELECT 1 FROM t_transaction_table
                WHERE customer_id = v_customer_id
                  AND tenant_id = v_staging_record.tenant_id
                  AND is_live = v_staging_record.is_live
                  AND txn_date = (v_staging_record.mapped_data->>'txn_date')::DATE
                  AND total_amount = (v_staging_record.mapped_data->>'total_amount')::NUMERIC
                  AND scheme_id = v_scheme_id
            ) THEN
                UPDATE t_import_staging_data
                SET processing_status = 'duplicate',
                    processed_at = NOW()
                WHERE id = v_staging_record.id;

                v_duplicate_count := v_duplicate_count + 1;
                v_processed_count := v_processed_count + 1;
                CONTINUE;
            END IF;

            -- Get transaction amount for investment plan
            v_txn_amount := COALESCE(NULLIF(v_staging_record.mapped_data->>'total_amount', '')::NUMERIC, 0);

            -- CREATE/UPDATE PORTFOLIO ENTRY
            INSERT INTO t_customer_master_portfolio (
                tenant_id,
                is_live,
                customer_id,
                scheme_code,
                scheme_name,
                folio_no,
                start_date
            ) VALUES (
                v_staging_record.tenant_id,
                v_staging_record.is_live,
                v_customer_id,
                v_scheme_code,
                v_scheme_name,
                v_staging_record.mapped_data->>'folio_no',
                (v_staging_record.mapped_data->>'txn_date')::DATE
            )
            ON CONFLICT (customer_id, scheme_code, tenant_id, is_live)
            DO UPDATE SET
                scheme_name = EXCLUDED.scheme_name,
                folio_no = COALESCE(EXCLUDED.folio_no, t_customer_master_portfolio.folio_no),
                updated_at = CURRENT_TIMESTAMP;

            -- INSERT TRANSACTION
            INSERT INTO t_transaction_table (
                tenant_id,
                is_live,
                is_active,
                customer_id,
                scheme_id,
                scheme_code,
                scheme_name,
                folio_no,
                txn_type_id,
                txn_date,
                total_amount,
                units,
                nav,
                stamp_duty,
                stt,
                tds,
                txn_description,
                txn_source,
                staging_record_id,
                import_session_id,
                created_at,
                updated_at
            ) VALUES (
                v_staging_record.tenant_id,
                v_staging_record.is_live,
                true,
                v_customer_id,
                v_scheme_id,
                v_scheme_code,
                v_scheme_name,
                v_staging_record.mapped_data->>'folio_no',
                v_txn_type_id,
                (v_staging_record.mapped_data->>'txn_date')::DATE,
                (v_staging_record.mapped_data->>'total_amount')::NUMERIC,
                NULLIF(v_staging_record.mapped_data->>'units', '')::NUMERIC,
                NULLIF(v_staging_record.mapped_data->>'nav', '')::NUMERIC,
                NULLIF(v_staging_record.mapped_data->>'stamp_duty', '')::NUMERIC,
                NULLIF(v_staging_record.mapped_data->>'stt', '')::NUMERIC,
                NULLIF(v_staging_record.mapped_data->>'tds', '')::NUMERIC,
                v_staging_record.mapped_data->>'txn_description',
                'import',
                v_staging_record.id,
                p_session_id,
                NOW(),
                NOW()
            ) RETURNING id INTO v_txn_id;

            -- ============================================================================
            -- AUTO-CREATE INVESTMENT PLAN (MF) AND ALERTS
            -- ============================================================================
            IF v_mf_asset_type_id IS NOT NULL THEN
                -- Check if customer already has this scheme assigned
                SELECT id INTO v_existing_assignment_id
                FROM t_customer_asset_assignments
                WHERE tenant_id = v_staging_record.tenant_id
                  AND is_live = v_staging_record.is_live
                  AND customer_id = v_customer_id
                  AND asset_type_id = v_mf_asset_type_id
                  AND scheme_code = v_scheme_code
                  AND is_active = true
                LIMIT 1;

                IF v_existing_assignment_id IS NULL THEN
                    -- NEW: Create Investment Plan for this MF
                    INSERT INTO t_customer_asset_assignments (
                        tenant_id,
                        is_live,
                        customer_id,
                        asset_type_id,
                        scheme_code,
                        principal_amount,
                        investment_type,
                        recurring_amount,
                        investment_frequency,
                        has_started,
                        custom_assumption_rate,
                        is_active,
                        assigned_by,
                        notes,
                        created_at,
                        updated_at
                    ) VALUES (
                        v_staging_record.tenant_id,
                        v_staging_record.is_live,
                        v_customer_id,
                        v_mf_asset_type_id,
                        v_scheme_code,
                        v_txn_amount,           -- principal_amount = SIP amount
                        'sip',                   -- investment_type
                        v_txn_amount,           -- recurring_amount = SIP amount
                        'monthly',               -- investment_frequency
                        true,                    -- has_started = true
                        12.00,                   -- custom_assumption_rate = 12%
                        true,
                        v_session_creator_id,
                        'Auto-created from transaction import (Session: ' || p_session_id || ')',
                        NOW(),
                        NOW()
                    ) RETURNING id INTO v_new_assignment_id;

                    -- Create Alert: New MF Added
                    INSERT INTO t_jtbd_configurations (
                        tenant_id,
                        is_live,
                        customer_id,
                        jtbd_type,
                        jtbd_category,
                        title,
                        description,
                        priority,
                        is_active,
                        config_data,
                        next_alert_date,
                        created_by,
                        created_at,
                        updated_at
                    ) VALUES (
                        v_staging_record.tenant_id,
                        v_staging_record.is_live,
                        v_customer_id,
                        'import_notification',
                        'alert',
                        COALESCE(v_customer_name, 'Customer') || ' - ' || v_scheme_name,
                        'New Mutual Fund scheme has been added. Please set the start date and review the investment details.',
                        'medium',
                        true,
                        jsonb_build_object(
                            'notification_type', 'new_mf_added',
                            'scheme_code', v_scheme_code,
                            'scheme_name', v_scheme_name,
                            'customer_name', v_customer_name,
                            'sip_amount', v_txn_amount,
                            'assignment_id', v_new_assignment_id,
                            'import_session_id', p_session_id,
                            'transaction_id', v_txn_id
                        ),
                        CURRENT_DATE,  -- Alert is due today
                        v_session_creator_id,
                        NOW(),
                        NOW()
                    );

                    RAISE NOTICE '[Session %] Created new MF assignment for customer % scheme %',
                        p_session_id, v_customer_id, v_scheme_code;
                ELSE
                    -- DUPLICATE: Scheme already assigned, create skip alert
                    INSERT INTO t_jtbd_configurations (
                        tenant_id,
                        is_live,
                        customer_id,
                        jtbd_type,
                        jtbd_category,
                        title,
                        description,
                        priority,
                        is_active,
                        config_data,
                        next_alert_date,
                        created_by,
                        created_at,
                        updated_at
                    ) VALUES (
                        v_staging_record.tenant_id,
                        v_staging_record.is_live,
                        v_customer_id,
                        'import_notification',
                        'alert',
                        'Scheme already assigned - ' || COALESCE(v_customer_name, 'Customer'),
                        'Scheme "' || v_scheme_name || '" is already available for ' || COALESCE(v_customer_name, 'this customer') || ', ignoring duplicate assignment.',
                        'low',
                        true,
                        jsonb_build_object(
                            'notification_type', 'duplicate_mf_skipped',
                            'scheme_code', v_scheme_code,
                            'scheme_name', v_scheme_name,
                            'customer_name', v_customer_name,
                            'existing_assignment_id', v_existing_assignment_id,
                            'import_session_id', p_session_id,
                            'transaction_id', v_txn_id
                        ),
                        CURRENT_DATE,  -- Alert is due today
                        v_session_creator_id,
                        NOW(),
                        NOW()
                    );

                    RAISE NOTICE '[Session %] Scheme % already assigned to customer %, skipped',
                        p_session_id, v_scheme_code, v_customer_id;
                END IF;
            END IF;
            -- ============================================================================

            UPDATE t_import_staging_data
            SET processing_status = 'success',
                created_record_id = v_txn_id,
                created_record_type = 'transaction',
                processed_at = NOW()
            WHERE id = v_staging_record.id;

            v_success_count := v_success_count + 1;
            v_processed_count := v_processed_count + 1;

        EXCEPTION WHEN OTHERS THEN
            UPDATE t_import_staging_data
            SET processing_status = 'failed',
                error_messages = ARRAY[SQLERRM],
                processed_at = NOW()
            WHERE id = v_staging_record.id;

            v_failed_count := v_failed_count + 1;
            v_processed_count := v_processed_count + 1;

            RAISE NOTICE '[Session %] Error processing row %: %', p_session_id, v_staging_record.row_number, SQLERRM;
        END;

        IF v_processed_count % v_batch_size = 0 THEN
            UPDATE t_import_sessions
            SET successful_records = v_success_count,
                failed_records = v_failed_count,
                orphan_records = v_orphan_count,
                duplicate_records = v_duplicate_count,
                processed_records = v_processed_count,
                updated_at = NOW()
            WHERE id = p_session_id;

            RAISE NOTICE '[Session %] Checkpoint: % processed', p_session_id, v_processed_count;
        END IF;
    END LOOP;

    UPDATE t_import_sessions
    SET status = CASE
            WHEN v_failed_count + v_orphan_count > 0 THEN 'completed_with_errors'
            ELSE 'completed'
        END,
        successful_records = v_success_count,
        failed_records = v_failed_count,
        orphan_records = v_orphan_count,
        duplicate_records = v_duplicate_count,
        processed_records = v_processed_count,
        processing_completed_at = NOW(),
        updated_at = NOW()
    WHERE id = p_session_id;

    RETURN QUERY SELECT
        v_processed_count,
        v_success_count,
        v_failed_count,
        v_duplicate_count,
        v_orphan_count,
        EXTRACT(EPOCH FROM (NOW() - v_start_time))::NUMERIC;
END;
$$;

COMMENT ON FUNCTION process_transaction_import_session IS 'Process transaction imports with customer lookup, PAN fallback, orphan tracking, and auto MF assignment with alerts';

-- ============================================================================
-- SECTION 5: CLEANUP FUNCTIONS
-- ============================================================================
DO $$ 
BEGIN
    RAISE NOTICE 'Creating Cleanup Functions...';
END $$;

-- ----------------------------------------------------------------------------
-- FUNCTION: cleanup_old_staging_data
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION cleanup_old_staging_data(
    p_days_to_keep INTEGER DEFAULT 30
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_deleted_sessions INTEGER;
    v_deleted_staging_records INTEGER;
    v_cutoff_date TIMESTAMP;
BEGIN
    v_cutoff_date := CURRENT_TIMESTAMP - (p_days_to_keep || ' days')::INTERVAL;
    
    WITH deleted_staging AS (
        DELETE FROM t_import_staging_data
        WHERE session_id IN (
            SELECT id FROM t_import_sessions
            WHERE status IN ('completed', 'completed_with_errors', 'cancelled')
            AND processing_completed_at < v_cutoff_date
        )
        RETURNING id
    )
    SELECT COUNT(*) INTO v_deleted_staging_records FROM deleted_staging;
    
    WITH deleted_sessions AS (
        DELETE FROM t_import_sessions
        WHERE status IN ('completed', 'completed_with_errors', 'cancelled')
        AND processing_completed_at < v_cutoff_date
        RETURNING id
    )
    SELECT COUNT(*) INTO v_deleted_sessions FROM deleted_sessions;
    
    RETURN jsonb_build_object(
        'deleted_sessions', v_deleted_sessions,
        'deleted_staging_records', v_deleted_staging_records,
        'cutoff_date', v_cutoff_date,
        'execution_time', CURRENT_TIMESTAMP
    );
END;
$$;

COMMENT ON FUNCTION cleanup_old_staging_data IS 'Remove staging data older than specified days';

-- ----------------------------------------------------------------------------
-- FUNCTION: cleanup_session_staging_data
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION cleanup_session_staging_data(
    p_session_id INTEGER,
    p_keep_failed_records BOOLEAN DEFAULT true
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
    v_session RECORD;
BEGIN
    SELECT * INTO v_session
    FROM t_import_sessions
    WHERE id = p_session_id;
    
    IF NOT FOUND THEN
        RAISE NOTICE 'Session % not found', p_session_id;
        RETURN;
    END IF;
    
    IF v_session.status NOT IN ('completed', 'completed_with_errors') THEN
        RAISE NOTICE 'Session % is not completed', p_session_id;
        RETURN;
    END IF;
    
    IF p_keep_failed_records THEN
        DELETE FROM t_import_staging_data
        WHERE session_id = p_session_id
        AND processing_status IN ('success', 'duplicate');
    ELSE
        DELETE FROM t_import_staging_data
        WHERE session_id = p_session_id;
    END IF;
    
    UPDATE t_import_sessions
    SET processing_metadata = COALESCE(processing_metadata, '{}'::jsonb) || 
        jsonb_build_object('staging_cleaned_at', CURRENT_TIMESTAMP)
    WHERE id = p_session_id;
END;
$$;

COMMENT ON FUNCTION cleanup_session_staging_data IS 'Clean up staging data for a completed session';

-- ----------------------------------------------------------------------------
-- FUNCTION: get_staging_storage_stats (UPDATED: Migration 006)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_staging_storage_stats()
RETURNS TABLE (
    total_sessions BIGINT,
    active_sessions BIGINT,
    completed_sessions BIGINT,
    total_staging_records BIGINT,
    pending_records BIGINT,
    processed_records BIGINT,
    failed_records BIGINT,
    orphan_records BIGINT,
    total_size_estimate TEXT,
    oldest_session_date TIMESTAMP,
    newest_session_date TIMESTAMP
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(DISTINCT s.id) as total_sessions,
        COUNT(DISTINCT s.id) FILTER (WHERE s.status IN ('pending', 'staged', 'processing')) as active_sessions,
        COUNT(DISTINCT s.id) FILTER (WHERE s.status IN ('completed', 'completed_with_errors')) as completed_sessions,
        COUNT(st.id) as total_staging_records,
        COUNT(st.id) FILTER (WHERE st.processing_status = 'pending') as pending_records,
        COUNT(st.id) FILTER (WHERE st.processing_status IN ('success', 'duplicate')) as processed_records,
        COUNT(st.id) FILTER (WHERE st.processing_status = 'failed') as failed_records,
        COUNT(st.id) FILTER (WHERE st.processing_status = 'orphan') as orphan_records,
        pg_size_pretty(
            pg_relation_size('t_import_staging_data') + 
            pg_relation_size('t_import_sessions')
        ) as total_size_estimate,
        MIN(s.created_at) as oldest_session_date,
        MAX(s.created_at) as newest_session_date
    FROM t_import_sessions s
    LEFT JOIN t_import_staging_data st ON s.id = st.session_id;
END;
$$;

COMMENT ON FUNCTION get_staging_storage_stats IS 'Get storage statistics for import staging tables including orphan tracking (Migration 006)';

-- ============================================================================
-- SECTION 6: STAGING DATA EDIT HELPER (Migration 006)
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE 'Creating Staging Data Edit Helper Functions...';
END $$;

-- ----------------------------------------------------------------------------
-- FUNCTION: record_staging_edit (Migration 006)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION record_staging_edit(
    p_staging_id INTEGER,
    p_field_name TEXT,
    p_old_value TEXT,
    p_new_value TEXT,
    p_edited_by INTEGER
)
RETURNS VOID AS $$
DECLARE
    v_edit_entry JSONB;
    v_current_history JSONB;
BEGIN
    v_edit_entry := jsonb_build_object(
        'edited_at', NOW(),
        'edited_by', p_edited_by,
        'field', p_field_name,
        'old_value', p_old_value,
        'new_value', p_new_value
    );

    SELECT COALESCE(edit_history, '[]'::jsonb)
    INTO v_current_history
    FROM t_import_staging_data
    WHERE id = p_staging_id;

    UPDATE t_import_staging_data
    SET
        edit_history = v_current_history || v_edit_entry,
        edited_at = NOW(),
        edited_by = p_edited_by
    WHERE id = p_staging_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION record_staging_edit IS 'Records an edit to a staging record in the edit_history array (Migration 006)';

-- ============================================================================
-- SECTION 7: VIEWS
-- ============================================================================
DO $$ 
BEGIN
    RAISE NOTICE 'Creating Views...';
END $$;

-- ----------------------------------------------------------------------------
-- VIEW: v_import_staging_statistics (UPDATED: Migration 006)
-- ----------------------------------------------------------------------------
DROP VIEW IF EXISTS v_import_staging_statistics CASCADE;

CREATE OR REPLACE VIEW v_import_staging_statistics AS
SELECT 
    session_id,
    tenant_id,
    is_live,
    import_type,
    
    COUNT(*) AS total_rows,
    COUNT(*) FILTER (WHERE processing_status = 'pending') AS pending_rows,
    COUNT(*) FILTER (WHERE processing_status = 'processing') AS processing_rows,
    COUNT(*) FILTER (WHERE processing_status = 'success') AS success_rows,
    COUNT(*) FILTER (WHERE processing_status = 'failed') AS failed_rows,
    COUNT(*) FILTER (WHERE processing_status = 'duplicate') AS duplicate_rows,
    COUNT(*) FILTER (WHERE processing_status = 'orphan') AS orphan_rows,
    COUNT(*) FILTER (WHERE processing_status = 'skipped') AS skipped_rows,
    
    MIN(created_at) AS staging_started_at,
    MAX(processed_at) AS last_processed_at,
    
    ROUND(
        COUNT(*) FILTER (WHERE processing_status = 'success')::numeric 
        / NULLIF(COUNT(*), 0)::numeric * 100::numeric, 
        2
    ) AS success_rate,
    
    ROUND(
        (COUNT(*) FILTER (WHERE processing_status IN ('success', 'duplicate'))::numeric)
        / NULLIF(COUNT(*), 0)::numeric * 100::numeric,
        2
    ) AS processing_success_rate,
    
    ROUND(
        (COUNT(*) FILTER (WHERE processing_status IN ('failed', 'orphan'))::numeric) 
        / NULLIF(COUNT(*), 0)::numeric * 100::numeric,
        2
    ) AS error_rate
FROM t_import_staging_data
GROUP BY session_id, tenant_id, is_live, import_type;

COMMENT ON VIEW v_import_staging_statistics IS 'Aggregated statistics for staging table including orphan record tracking (Migration 006)';

-- ----------------------------------------------------------------------------
-- VIEW: v_import_staging_progress (UPDATED: Migration 006)
-- ----------------------------------------------------------------------------
DROP VIEW IF EXISTS v_import_staging_progress CASCADE;

CREATE OR REPLACE VIEW v_import_staging_progress AS
SELECT 
    s.id AS session_id,
    s.session_name,
    s.import_type,
    s.status AS session_status,
    s.staging_total_rows,
    s.current_batch,
    s.total_batches,
    s.last_processed_row,
    
    COALESCE(st.pending_rows, 0::bigint) AS pending_rows,
    COALESCE(st.processing_rows, 0::bigint) AS processing_rows,
    COALESCE(st.success_rows, 0::bigint) AS success_rows,
    COALESCE(st.failed_rows, 0::bigint) AS failed_rows,
    COALESCE(st.duplicate_rows, 0::bigint) AS duplicate_rows,
    COALESCE(st.orphan_rows, 0::bigint) AS orphan_rows,
    COALESCE(st.skipped_rows, 0::bigint) AS skipped_rows,
    
    s.successful_records,
    s.failed_records,
    s.duplicate_records,
    s.orphan_records,
    
    CASE
        WHEN s.staging_total_rows > 0 THEN 
            ROUND(
                COALESCE(st.success_rows + st.failed_rows + st.duplicate_rows + st.orphan_rows + st.skipped_rows, 0::bigint)::numeric 
                / s.staging_total_rows::numeric * 100::numeric, 
                2
            )
        ELSE 0::numeric
    END AS completion_percentage,
    
    s.processing_started_at,
    s.staging_completed_at,
    s.processing_completed_at,
    
    CASE
        WHEN s.processing_started_at IS NOT NULL AND 
             (st.success_rows + st.failed_rows + st.duplicate_rows + st.orphan_rows) > 0 THEN 
            EXTRACT(epoch FROM CURRENT_TIMESTAMP - s.processing_started_at::timestamp with time zone) 
            / NULLIF(st.success_rows + st.failed_rows + st.duplicate_rows + st.orphan_rows, 0)::numeric
        ELSE NULL::numeric
    END AS avg_seconds_per_record,
    
    CASE
        WHEN s.processing_started_at IS NOT NULL AND 
             st.pending_rows > 0 AND
             (st.success_rows + st.failed_rows + st.duplicate_rows + st.orphan_rows) > 0 THEN
            (EXTRACT(epoch FROM CURRENT_TIMESTAMP - s.processing_started_at::timestamp with time zone) 
            / NULLIF(st.success_rows + st.failed_rows + st.duplicate_rows + st.orphan_rows, 0)::numeric) 
            * st.pending_rows
        ELSE NULL::numeric
    END AS estimated_seconds_remaining
    
FROM t_import_sessions s
LEFT JOIN v_import_staging_statistics st ON s.id = st.session_id;

COMMENT ON VIEW v_import_staging_progress IS 'Real-time import progress monitoring with orphan record tracking (Migration 006)';

-- ----------------------------------------------------------------------------
-- VIEW: v_import_records_for_review (NEW: Migration 006)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_import_records_for_review AS
SELECT
    s.id,
    s.session_id AS import_session_id,
    s.tenant_id,
    s.is_live,
    s.row_number,
    s.processing_status AS status,
    s.mapped_data,
    s.error_messages,
    s.warnings,
    s.match_type,
    s.match_confidence,
    s.ambiguous_matches,
    s.requires_review,
    s.edited_at,
    s.edited_by,
    s.reprocess_count,
    s.created_at,
    sess.session_name,
    sess.import_type,
    u.email as edited_by_username
FROM t_import_staging_data s
INNER JOIN t_import_sessions sess ON sess.id = s.session_id
LEFT JOIN t_users u ON u.id = s.edited_by
WHERE s.processing_status IN ('failed', 'orphan', 'duplicate')
   OR s.requires_review = true
ORDER BY s.session_id DESC, s.row_number ASC;

COMMENT ON VIEW v_import_records_for_review IS 'View of all staging records that failed, are orphaned, duplicates, or require manual review (Migration 006)';

-- ----------------------------------------------------------------------------
-- VIEW: v_tenant_customer_schemes
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_tenant_customer_schemes AS
SELECT 
    tt.tenant_id,
    tt.is_live,
    tt.scheme_code,
    tt.scheme_name,
    COUNT(DISTINCT tt.customer_id) as customer_count,
    COUNT(*) as transaction_count,
    SUM(CASE WHEN tt.portfolio_flag = true THEN tt.total_amount ELSE 0 END) as total_invested,
    MAX(tt.txn_date) as last_transaction_date,
    MIN(tt.txn_date) as first_transaction_date
FROM t_transaction_table tt
WHERE tt.is_active = true
GROUP BY tt.tenant_id, tt.is_live, tt.scheme_code, tt.scheme_name;

COMMENT ON VIEW v_tenant_customer_schemes IS 'Unique schemes from customer transactions - used for bookmark gap detection';

-- ============================================================================
-- SECTION 8: REGULAR VIEW - PORTFOLIO TOTALS (Always Fresh)
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE 'Creating Regular View for Portfolio Totals (Always Fresh)...';
END $$;

-- ----------------------------------------------------------------------------
-- VIEW: t_customer_portfolio_totals (UPDATED: Migration 007 - allocation)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW t_customer_portfolio_totals AS
SELECT
    p.tenant_id,
    p.is_live,
    p.customer_id,
    p.scheme_code,
    p.scheme_name,
    p.folio_no,
    p.category,
    p.sub_category,
    p.fund_name,
    p.start_date,
    p.allocation,

    COUNT(DISTINCT t.id) as transaction_count,
    COUNT(DISTINCT CASE WHEN tt.txn_type = 'Addition' THEN t.id END) as purchase_count,
    COUNT(DISTINCT CASE WHEN tt.txn_type = 'Deduction' THEN t.id END) as redemption_count,

    COALESCE(SUM(CASE WHEN tt.txn_type = 'Addition' THEN t.units
                     WHEN tt.txn_type = 'Deduction' THEN -t.units
                     ELSE 0 END), 0) as total_units,

    COALESCE(SUM(CASE WHEN tt.txn_type = 'Addition' THEN t.total_amount ELSE 0 END), 0) -
    COALESCE(SUM(CASE WHEN tt.txn_type = 'Deduction' THEN t.total_amount ELSE 0 END), 0) as total_invested,

    (SELECT nav FROM t_transaction_table
     WHERE customer_id = p.customer_id
       AND scheme_code = p.scheme_code
       AND is_active = true
     ORDER BY txn_date DESC
     LIMIT 1) as latest_nav,

    COALESCE(SUM(CASE WHEN tt.txn_type = 'Addition' THEN t.units
                     WHEN tt.txn_type = 'Deduction' THEN -t.units
                     ELSE 0 END), 0) *
    COALESCE((SELECT nav FROM t_transaction_table
              WHERE customer_id = p.customer_id
                AND scheme_code = p.scheme_code
                AND is_active = true
              ORDER BY txn_date DESC
              LIMIT 1), 0) as current_value,

    (COALESCE(SUM(CASE WHEN tt.txn_type = 'Addition' THEN t.units
                      WHEN tt.txn_type = 'Deduction' THEN -t.units
                      ELSE 0 END), 0) *
     COALESCE((SELECT nav FROM t_transaction_table
               WHERE customer_id = p.customer_id
                 AND scheme_code = p.scheme_code
                 AND is_active = true
               ORDER BY txn_date DESC
               LIMIT 1), 0)) -
    (COALESCE(SUM(CASE WHEN tt.txn_type = 'Addition' THEN t.total_amount ELSE 0 END), 0) -
     COALESCE(SUM(CASE WHEN tt.txn_type = 'Deduction' THEN t.total_amount ELSE 0 END), 0)) as total_returns,

    CASE
        WHEN (COALESCE(SUM(CASE WHEN tt.txn_type = 'Addition' THEN t.total_amount ELSE 0 END), 0) -
              COALESCE(SUM(CASE WHEN tt.txn_type = 'Deduction' THEN t.total_amount ELSE 0 END), 0)) > 0
        THEN ((COALESCE(SUM(CASE WHEN tt.txn_type = 'Addition' THEN t.units
                            WHEN tt.txn_type = 'Deduction' THEN -t.units
                            ELSE 0 END), 0) *
               COALESCE((SELECT nav FROM t_transaction_table
                         WHERE customer_id = p.customer_id
                           AND scheme_code = p.scheme_code
                           AND is_active = true
                         ORDER BY txn_date DESC
                         LIMIT 1), 0)) -
              (COALESCE(SUM(CASE WHEN tt.txn_type = 'Addition' THEN t.total_amount ELSE 0 END), 0) -
               COALESCE(SUM(CASE WHEN tt.txn_type = 'Deduction' THEN t.total_amount ELSE 0 END), 0))) /
              (COALESCE(SUM(CASE WHEN tt.txn_type = 'Addition' THEN t.total_amount ELSE 0 END), 0) -
               COALESCE(SUM(CASE WHEN tt.txn_type = 'Deduction' THEN t.total_amount ELSE 0 END), 0)) * 100
        ELSE 0
    END as return_percentage,

    MAX(t.txn_date) as last_transaction_date,
    p.is_active,
    p.id as portfolio_id,
    NOW() as last_refreshed_at

FROM t_customer_master_portfolio p
LEFT JOIN t_transaction_table t ON
    t.customer_id = p.customer_id
    AND t.scheme_code = p.scheme_code
    AND t.tenant_id = p.tenant_id
    AND t.is_live = p.is_live
    AND t.is_active = true
    AND t.portfolio_flag = true
LEFT JOIN m_transaction_types tt ON t.txn_type_id = tt.id
WHERE p.is_active = true
GROUP BY
    p.id, p.tenant_id, p.is_live, p.customer_id,
    p.scheme_code, p.scheme_name, p.folio_no,
    p.category, p.sub_category, p.fund_name,
    p.start_date, p.is_active, p.allocation;

COMMENT ON VIEW t_customer_portfolio_totals IS 'Real-time portfolio totals with returns and goal allocation (Migration 007) - calculates on-the-fly';

-- ============================================================================
-- SECTION 9: MATERIALIZED VIEW - v_portfolio_current
-- ============================================================================
DO $$ 
BEGIN
    RAISE NOTICE 'Creating v_portfolio_current Materialized View...';
END $$;

CREATE MATERIALIZED VIEW IF NOT EXISTS v_portfolio_current AS
SELECT 
    t.customer_id,
    t.tenant_id,
    t.scheme_code,
    p.scheme_name,
    p.category,
    p.sub_category,
    p.fund_name,
    SUM(t.units) AS total_units,
    
    today_nav.nav_date AS today_nav_date,
    today_nav.nav_value AS today_nav,
    (SUM(t.units) * today_nav.nav_value) AS scheme_value_today,
    
    month_end_nav.nav_date AS month_end_nav_date,
    month_end_nav.nav_value AS month_end_nav,
    (SUM(t.units) * month_end_nav.nav_value) AS scheme_value_month_end,
    
    ((SUM(t.units) * today_nav.nav_value) - (SUM(t.units) * month_end_nav.nav_value)) AS scheme_value_change
    
FROM t_transaction_table t

LEFT JOIN t_customer_master_portfolio p ON 
    t.customer_id = p.customer_id 
    AND t.scheme_code = p.scheme_code 
    AND t.tenant_id = p.tenant_id 
    AND t.is_live = p.is_live

LEFT JOIN LATERAL (
    SELECT nav_date, nav_value
    FROM t_nav_data
    WHERE scheme_code = t.scheme_code
      AND nav_date <= CURRENT_DATE
      AND is_live = true
    ORDER BY nav_date DESC
    LIMIT 1
) today_nav ON true

LEFT JOIN LATERAL (
    SELECT nav_date, nav_value
    FROM t_nav_data
    WHERE scheme_code = t.scheme_code
      AND nav_date <= (DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '1 day')::DATE
      AND is_live = true
    ORDER BY nav_date DESC
    LIMIT 1
) month_end_nav ON true

WHERE t.is_active = true 
  AND t.portfolio_flag = true

GROUP BY 
    t.customer_id, 
    t.tenant_id, 
    t.scheme_code, 
    p.scheme_name, 
    p.category, 
    p.sub_category, 
    p.fund_name, 
    today_nav.nav_date, 
    today_nav.nav_value, 
    month_end_nav.nav_date, 
    month_end_nav.nav_value
WITH NO DATA;

COMMENT ON MATERIALIZED VIEW v_portfolio_current IS 'Current portfolio values with month-end comparison using NAV data';

CREATE UNIQUE INDEX IF NOT EXISTS idx_portfolio_current_unique 
    ON v_portfolio_current(tenant_id, customer_id, scheme_code);

CREATE INDEX IF NOT EXISTS idx_portfolio_current_tenant_customer 
    ON v_portfolio_current(tenant_id, customer_id);

CREATE INDEX IF NOT EXISTS idx_portfolio_current_scheme_code 
    ON v_portfolio_current(scheme_code);

REFRESH MATERIALIZED VIEW v_portfolio_current;

-- ============================================================================
-- SECTION 10: PORTFOLIO VIEW COMPATIBILITY FUNCTIONS
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE 'Creating Portfolio View Compatibility Functions...';
END $$;

CREATE OR REPLACE FUNCTION refresh_portfolio_totals()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE NOTICE 't_customer_portfolio_totals is now a regular VIEW - no refresh needed';
END;
$$;

COMMENT ON FUNCTION refresh_portfolio_totals IS 'NO-OP function for backward compatibility';

-- ============================================================================
-- SECTION 11: ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================
DO $$ 
BEGIN
    RAISE NOTICE 'Creating Row Level Security Policies...';
END $$;

ALTER TABLE t_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE t_chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE t_chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation_users ON t_users;
CREATE POLICY tenant_isolation_users ON t_users
    FOR ALL
    USING (tenant_id = current_tenant_id());

DROP POLICY IF EXISTS tenant_isolation_chat_sessions ON t_chat_sessions;
CREATE POLICY tenant_isolation_chat_sessions ON t_chat_sessions
    FOR ALL
    USING (tenant_id = current_tenant_id());

DROP POLICY IF EXISTS tenant_isolation_chat_messages ON t_chat_messages;
CREATE POLICY tenant_isolation_chat_messages ON t_chat_messages
    FOR ALL
    USING (tenant_id = current_tenant_id());

DROP POLICY IF EXISTS environment_filter_users ON t_users;
CREATE POLICY environment_filter_users ON t_users
    FOR SELECT
    USING (
        CASE 
            WHEN current_environment() = 'live' THEN is_live = true
            WHEN current_environment() = 'test' THEN is_live = false
            ELSE true
        END
    );

DROP POLICY IF EXISTS environment_filter_chat_sessions ON t_chat_sessions;
CREATE POLICY environment_filter_chat_sessions ON t_chat_sessions
    FOR SELECT
    USING (
        CASE 
            WHEN current_environment() = 'live' THEN is_live = true
            WHEN current_environment() = 'test' THEN is_live = false
            ELSE true
        END
    );

DROP POLICY IF EXISTS environment_filter_chat_messages ON t_chat_messages;
CREATE POLICY environment_filter_chat_messages ON t_chat_messages
    FOR SELECT
    USING (
        CASE 
            WHEN current_environment() = 'live' THEN is_live = true
            WHEN current_environment() = 'test' THEN is_live = false
            ELSE true
        END
    );

-- ============================================================================
-- SECTION 12: GRANT PERMISSIONS
-- ============================================================================
DO $$ 
BEGIN
    RAISE NOTICE 'Granting Permissions...';
END $$;

GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO kewal_admin;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO kewal_admin;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO kewal_admin;
GRANT USAGE ON SCHEMA public TO kewal_admin;

GRANT ALL ON TABLE v_import_staging_statistics TO kewal_admin;
GRANT ALL ON TABLE v_import_staging_progress TO kewal_admin;
GRANT ALL ON TABLE v_import_records_for_review TO kewal_admin;
GRANT ALL ON TABLE v_tenant_customer_schemes TO kewal_admin;

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================
DO $$ 
DECLARE
    v_function_count INTEGER;
    v_view_count INTEGER;
    v_policy_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_function_count
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public';
    
    SELECT COUNT(*) INTO v_view_count
    FROM information_schema.views
    WHERE table_schema = 'public';
    
    SELECT COUNT(*) INTO v_policy_count
    FROM pg_policies
    WHERE schemaname = 'public';
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Functions, Views, and Policies created!';
    RAISE NOTICE 'Total functions: %', v_function_count;
    RAISE NOTICE 'Total views: %', v_view_count;
    RAISE NOTICE 'Total RLS policies: %', v_policy_count;
    RAISE NOTICE '========================================';
    RAISE NOTICE 'MIGRATION INTEGRATION SUMMARY:';
    RAISE NOTICE '  ✓ Migration 006: Name normalization';
    RAISE NOTICE '    - normalize_customer_name() function';
    RAISE NOTICE '    - record_staging_edit() helper function';
    RAISE NOTICE '    - v_import_records_for_review view';
    RAISE NOTICE '    - Updated v_import_staging_statistics';
    RAISE NOTICE '    - Updated v_import_staging_progress';
    RAISE NOTICE '    - Updated get_staging_storage_stats()';
    RAISE NOTICE '  ✓ Migration 007: Allocation tracking';
    RAISE NOTICE '    - t_customer_portfolio_totals includes allocation';
    RAISE NOTICE '  ✓ JTBD Consolidation:';
    RAISE NOTICE '    - No additional functions/views required';
    RAISE NOTICE '    - All logic handled via triggers in 03 script';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'DEPLOYMENT NOTES:';
    RAISE NOTICE '  - Orphan tracking fully operational';
    RAISE NOTICE '  - Customer name lookups use normalized_name';
    RAISE NOTICE '  - Staging edit history tracking ready';
    RAISE NOTICE '  - Manual review workflow enabled';
    RAISE NOTICE '  - Goal allocation visible in portfolio views';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Next: Run 05_seed_data.sql';
    RAISE NOTICE '========================================';
END $$;