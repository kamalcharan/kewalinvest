-- ============================================================================
-- File: 04_functions_views_policies.sql
-- Description: Business logic functions, views, and security policies
-- Purpose: Implement data processing, views, and row-level security
-- Execution: Run FOURTH after 03_indexes_triggers.sql
-- Author: System
-- Date: 2025-01-08
-- Updated: 2025-01-09 (Added transaction import, materialized view, refresh function)
-- Updated: 2025-01-15 (Added v_tenant_customer_schemes view for NAV refactor)
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
-- Description: Get current tenant_id from session context for RLS
-- Usage: Set with: SET app.current_tenant_id = '2';
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
-- Description: Get current environment (live/test) from session context
-- Usage: SET app.current_environment = 'live';
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
-- SECTION 2: CUSTOMER IMPORT FUNCTIONS
-- ============================================================================
DO $$ 
BEGIN
    RAISE NOTICE 'Creating Customer Import Functions...';
END $$;

-- ----------------------------------------------------------------------------
-- FUNCTION: check_customer_duplicate
-- Description: Check if customer already exists by PAN, email, or mobile
-- NOTE: Uses PLAIN TEXT pan field (not encrypted)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION check_customer_duplicate(
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
    -- Check by PAN if provided (PLAIN TEXT comparison)
    IF p_pan IS NOT NULL AND p_pan != '' THEN
        SELECT EXISTS(
            SELECT 1 FROM t_customers 
            WHERE pan = UPPER(TRIM(p_pan))
            AND is_active = true
        ) INTO v_exists;
        
        IF v_exists THEN
            RETURN true;
        END IF;
    END IF;
    
    -- Check by email
    IF p_email IS NOT NULL AND p_email != '' THEN
        SELECT EXISTS(
            SELECT 1 FROM t_contact_channels
            WHERE channel_type = 'email'
            AND channel_value = LOWER(TRIM(p_email))
            AND is_active = true
        ) INTO v_exists;
        
        IF v_exists THEN
            RETURN true;
        END IF;
    END IF;
    
    -- Check by mobile
    IF p_mobile IS NOT NULL AND p_mobile != '' THEN
        SELECT EXISTS(
            SELECT 1 FROM t_contact_channels
            WHERE channel_type = 'mobile'
            AND channel_value = REGEXP_REPLACE(p_mobile, '[^0-9]', '', 'g')
            AND is_active = true
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
-- Description: Process a single customer record from staging
-- NOTE: Uses PLAIN TEXT for pan and iwell_code (no encryption)
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
    -- Get staging record
    SELECT * INTO v_staging
    FROM t_import_staging_data
    WHERE id = p_staging_id;
    
    IF NOT FOUND THEN
        RETURN;
    END IF;
    
    -- Mark as processing
    UPDATE t_import_staging_data
    SET processing_status = 'processing'
    WHERE id = p_staging_id;
    
    v_mapped_data := v_staging.mapped_data;
    v_error_messages := ARRAY[]::TEXT[];
    
    BEGIN
        -- Check for duplicates
        v_is_duplicate := check_customer_duplicate(
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
        
        -- Clean and validate prefix
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
        
        -- Create contact with cleaned prefix
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
        
        -- Create contact channels (email)
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
        
        -- Create contact channels (mobile)
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
        
        -- Handle date conversion for DD-MM-YYYY format
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
        
        -- Handle anniversary date
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
        
        -- Extract iwell_code (already uppercase from transformation)
        v_iwell_code := NULLIF(TRIM(v_mapped_data->>'iwell_code'), '');

        -- DEBUG: Log family field values before INSERT
        RAISE NOTICE '[DEBUG] About to INSERT customer - family_head_name: %, family_head_iwell_code: %',
            v_mapped_data->>'family_head_name',
            v_mapped_data->>'family_head_iwell_code';

        -- Create customer record with PLAIN TEXT fields
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

        -- DEBUG: Verify what was actually inserted
        RAISE NOTICE '[DEBUG] Customer % created', v_customer_id;

        -- Create address if provided
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
        
        -- Mark as success
        UPDATE t_import_staging_data
        SET processing_status = 'success',
            created_record_id = v_customer_id,
            created_record_type = 'customer',
            processed_at = CURRENT_TIMESTAMP
        WHERE id = p_staging_id;
        
    EXCEPTION WHEN OTHERS THEN
        -- Handle errors
        v_error_messages := array_append(v_error_messages, SQLERRM);
        
        UPDATE t_import_staging_data
        SET processing_status = 'failed',
            error_messages = v_error_messages,
            processed_at = CURRENT_TIMESTAMP
        WHERE id = p_staging_id;
        
        -- Cleanup partial records if any
        IF v_contact_id IS NOT NULL THEN
            DELETE FROM t_contacts WHERE id = v_contact_id;
        END IF;
    END;
END;
$$;

COMMENT ON FUNCTION process_single_customer_record IS 'Process single customer record from staging - uses plain text PAN/IWELL';

-- ----------------------------------------------------------------------------
-- FUNCTION: process_customer_import_with_timing
-- Description: Process customer import with controlled timing
-- Returns: JSONB with processing results
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
    
    -- Get session details
    SELECT * INTO v_session
    FROM t_import_sessions
    WHERE id = p_session_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Session % not found', p_session_id;
    END IF;
    
    -- Get total record count
    SELECT COUNT(*) INTO v_total_records
    FROM t_import_staging_data
    WHERE session_id = p_session_id
    AND processing_status = 'pending';
    
    -- Calculate batch size and delays for target duration
    v_records_per_batch := GREATEST(1, v_total_records / 10);
    v_delay_per_batch := (p_target_duration_ms / 10.0 || ' milliseconds')::INTERVAL;
    
    -- Update session to processing
    UPDATE t_import_sessions
    SET status = 'processing',
        processing_started_at = CURRENT_TIMESTAMP,
        total_records = v_total_records
    WHERE id = p_session_id;
    
    -- Process records in batches
    FOR v_staging_record IN 
        SELECT * FROM t_import_staging_data
        WHERE session_id = p_session_id
        AND processing_status = 'pending'
        ORDER BY row_number
        FOR UPDATE SKIP LOCKED
    LOOP
        -- Process individual record
        PERFORM process_single_customer_record(v_staging_record.id);
        
        -- Update counters based on result
        SELECT processing_status INTO v_staging_record
        FROM t_import_staging_data
        WHERE id = v_staging_record.id;
        
        v_processed_count := v_processed_count + 1;
        
        CASE v_staging_record.processing_status
            WHEN 'success' THEN v_success_count := v_success_count + 1;
            WHEN 'failed' THEN v_failed_count := v_failed_count + 1;
            WHEN 'duplicate' THEN v_duplicate_count := v_duplicate_count + 1;
        END CASE;
        
        -- Update progress every batch
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
            
            -- Add delay between batches (except for last batch)
            IF v_processed_count < v_total_records THEN
                PERFORM pg_sleep(EXTRACT(EPOCH FROM v_delay_per_batch));
            END IF;
        END IF;
    END LOOP;
    
    -- Final session update
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
    
    -- Return summary
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
-- Description: Process a single scheme record from staging
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
    -- Get staging record
    SELECT * INTO v_staging
    FROM t_import_staging_data
    WHERE id = p_staging_id;
    
    IF NOT FOUND THEN
        RETURN;
    END IF;
    
    -- Mark as processing
    UPDATE t_import_staging_data
    SET processing_status = 'processing'
    WHERE id = p_staging_id;
    
    v_mapped_data := v_staging.mapped_data;
    v_error_messages := ARRAY[]::TEXT[];
    
    BEGIN
        -- Check for duplicate by scheme_code
        SELECT COUNT(*) > 0 INTO v_is_duplicate
        FROM t_scheme_details
        WHERE scheme_code = v_mapped_data->>'scheme_code'
          AND tenant_id = v_staging.tenant_id
          AND is_live = v_staging.is_live;
        
        IF v_is_duplicate THEN
            -- Update existing scheme
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
            
            -- Mark as duplicate
            UPDATE t_import_staging_data
            SET processing_status = 'duplicate',
                warnings = array_append(warnings, 'Scheme already exists - updated'),
                created_record_id = v_scheme_id,
                created_record_type = 'scheme',
                processed_at = CURRENT_TIMESTAMP
            WHERE id = p_staging_id;
            
            RETURN;
        END IF;
        
        -- Get scheme_type_id if scheme_type is provided
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
        
        -- Get scheme_category_id if scheme_category is provided
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
        
        -- Parse launch_date
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
        
        -- Parse closure_date
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
        
        -- Parse minimum amount
        v_minimum_amount := NULL;
        IF v_mapped_data->>'scheme_minimum_amount' IS NOT NULL AND TRIM(v_mapped_data->>'scheme_minimum_amount') != '' THEN
            BEGIN
                v_minimum_amount := (v_mapped_data->>'scheme_minimum_amount')::DECIMAL(15,2);
            EXCEPTION WHEN OTHERS THEN
                v_minimum_amount := NULL;
            END;
        END IF;
        
        -- Create new scheme record
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
        
        -- Mark as success
        UPDATE t_import_staging_data
        SET processing_status = 'success',
            created_record_id = v_scheme_id,
            created_record_type = 'scheme',
            processed_at = CURRENT_TIMESTAMP
        WHERE id = p_staging_id;
        
    EXCEPTION WHEN OTHERS THEN
        -- Handle errors
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
-- Description: Process scheme import with controlled timing
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
    
    -- Update session status to processing
    UPDATE t_import_sessions 
    SET status = 'processing',
        processing_started_at = v_start_time
    WHERE id = p_session_id;
    
    -- Process records in batches
    FOR v_staging_record IN 
        SELECT id, processing_status
        FROM t_import_staging_data
        WHERE session_id = p_session_id
        AND processing_status = 'pending'
        ORDER BY row_number
    LOOP
        -- Process single record
        PERFORM process_single_scheme_record(v_staging_record.id);
        
        -- Get the updated status
        SELECT processing_status INTO v_staging_record
        FROM t_import_staging_data
        WHERE id = v_staging_record.id;
        
        -- Update counters
        v_processed_count := v_processed_count + 1;
        
        CASE v_staging_record.processing_status
            WHEN 'success' THEN v_success_count := v_success_count + 1;
            WHEN 'failed' THEN v_failed_count := v_failed_count + 1;
            WHEN 'duplicate' THEN v_duplicate_count := v_duplicate_count + 1;
        END CASE;
        
        -- Check if we should sleep
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
    
    -- Update session with final statistics
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

-- ============================================================================
-- SECTION 4: TRANSACTION IMPORT FUNCTIONS
-- ============================================================================
DO $$ 
BEGIN
    RAISE NOTICE 'Creating Transaction Import Functions...';
END $$;

-- ----------------------------------------------------------------------------
-- FUNCTION: process_transaction_import_with_timing
-- Description: Process transaction imports from staging with controlled timing
-- Target Duration: 30-45 seconds
-- NEW FUNCTION: Added for transaction import support
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION process_transaction_import_with_timing(
    p_session_id INTEGER, 
    p_target_duration_ms INTEGER DEFAULT 35000
) 
RETURNS TABLE(
    total_processed INTEGER,
    successful INTEGER, 
    failed INTEGER,
    duplicates INTEGER,
    duration_ms INTEGER
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_start_time TIMESTAMP;
    v_end_time TIMESTAMP;
    v_total_rows INTEGER;
    v_processed INTEGER := 0;
    v_success INTEGER := 0;
    v_failed INTEGER := 0;
    v_duplicates INTEGER := 0;
    v_batch_size INTEGER;
    v_sleep_per_batch NUMERIC;
    v_staging_record RECORD;
    v_customer_id INTEGER;
    v_txn_type_id INTEGER;
    v_txn_type VARCHAR(20);
    v_portfolio_id INTEGER;
    v_is_duplicate BOOLEAN;
    v_error_msg TEXT;
BEGIN
    v_start_time := clock_timestamp();
    
    -- Get total rows to process
    SELECT COUNT(*) INTO v_total_rows
    FROM t_import_staging_data
    WHERE session_id = p_session_id
        AND processing_status = 'pending';
    
    -- Calculate batch size and sleep time to target duration
    IF v_total_rows > 0 THEN
        v_batch_size := GREATEST(10, v_total_rows / 20); -- Process in ~20 batches
        v_sleep_per_batch := (p_target_duration_ms / 20.0) / 1000.0; -- Sleep between batches in seconds
    ELSE
        -- No rows to process
        RETURN QUERY SELECT 0, 0, 0, 0, 0;
        RETURN;
    END IF;
    
    -- Update session status
    UPDATE t_import_sessions
    SET status = 'processing',
        processing_started_at = v_start_time,
        total_records = v_total_rows
    WHERE id = p_session_id;
    
    -- Process each staging record
    FOR v_staging_record IN
        SELECT * FROM t_import_staging_data
        WHERE session_id = p_session_id
            AND processing_status = 'pending'
        ORDER BY row_number
    LOOP
        BEGIN
            v_error_msg := NULL;
            v_is_duplicate := false;
            
            -- 1. VALIDATE CUSTOMER (by IWELL code) - PLAIN TEXT
            SELECT c.id INTO v_customer_id
            FROM t_customers c
            WHERE c.iwell_code = v_staging_record.mapped_data->>'iwell_code'
                AND c.tenant_id = v_staging_record.tenant_id
                AND c.is_live = v_staging_record.is_live
                AND c.is_active = true;
            
            IF v_customer_id IS NULL THEN
                v_error_msg := 'Customer data not found for import - IWELL code not matched';
                RAISE EXCEPTION '%', v_error_msg;
            END IF;
            
            -- 2. VALIDATE TRANSACTION TYPE
            SELECT id, txn_type INTO v_txn_type_id, v_txn_type
            FROM m_transaction_types
            WHERE UPPER(txn_code) = UPPER(v_staging_record.mapped_data->>'txn_code')
                AND is_active = true;
            
            IF v_txn_type_id IS NULL THEN
                v_error_msg := 'Invalid transaction type: ' || (v_staging_record.mapped_data->>'txn_code');
                RAISE EXCEPTION '%', v_error_msg;
            END IF;
            
            -- 3. CHECK FOR DUPLICATE
            SELECT EXISTS (
                SELECT 1 FROM t_transaction_table
                WHERE customer_id = v_customer_id
                    AND scheme_code = v_staging_record.mapped_data->>'scheme_code'
                    AND txn_date = (v_staging_record.mapped_data->>'txn_date')::DATE
                    AND total_amount = (v_staging_record.mapped_data->>'total_amount')::DECIMAL
                    AND txn_type_id = v_txn_type_id
                    AND is_active = true
            ) INTO v_is_duplicate;
            
            -- 4. CREATE/UPDATE PORTFOLIO ENTRY (if not exists)
            INSERT INTO t_customer_master_portfolio (
                tenant_id, is_live, customer_id, scheme_code, scheme_name,
                folio_no, category, sub_category, fund_name, start_date
            ) VALUES (
                v_staging_record.tenant_id,
                v_staging_record.is_live,
                v_customer_id,
                v_staging_record.mapped_data->>'scheme_code',
                v_staging_record.mapped_data->>'scheme_name',
                v_staging_record.mapped_data->>'folio_no',
                v_staging_record.mapped_data->>'category',
                v_staging_record.mapped_data->>'sub_category',
                v_staging_record.mapped_data->>'fund_name',
                (v_staging_record.mapped_data->>'txn_date')::DATE
            )
            ON CONFLICT (customer_id, scheme_code, tenant_id, is_live)
            DO NOTHING
            RETURNING id INTO v_portfolio_id;
            
            -- 5. INSERT TRANSACTION
            INSERT INTO t_transaction_table (
                tenant_id, is_live, customer_id, scheme_code, scheme_name, folio_no,
                txn_type_id, txn_date, total_amount, units, nav, stamp_duty,
                staging_record_id, import_session_id,
                is_potential_duplicate, portfolio_flag,
                duplicate_reason
            ) VALUES (
                v_staging_record.tenant_id,
                v_staging_record.is_live,
                v_customer_id,
                v_staging_record.mapped_data->>'scheme_code',
                v_staging_record.mapped_data->>'scheme_name',
                v_staging_record.mapped_data->>'folio_no',
                v_txn_type_id,
                (v_staging_record.mapped_data->>'txn_date')::DATE,
                (v_staging_record.mapped_data->>'total_amount')::DECIMAL,
                (v_staging_record.mapped_data->>'units')::DECIMAL,
                (v_staging_record.mapped_data->>'nav')::DECIMAL,
                (v_staging_record.mapped_data->>'stamp_duty')::DECIMAL,
                v_staging_record.id,
                p_session_id,
                v_is_duplicate,
                NOT v_is_duplicate, -- portfolio_flag: EXCLUDED for duplicates by default, included for normal records
                CASE WHEN v_is_duplicate THEN 'Duplicate transaction detected: same customer, scheme, date, amount, and type' ELSE NULL END
            );
            
            -- 6. UPDATE STAGING RECORD
            UPDATE t_import_staging_data
            SET processing_status = CASE WHEN v_is_duplicate THEN 'duplicate' ELSE 'success' END,
                processed_at = clock_timestamp(),
                created_record_type = 'transaction'
            WHERE id = v_staging_record.id;
            
            IF v_is_duplicate THEN
                v_duplicates := v_duplicates + 1;
            ELSE
                v_success := v_success + 1;
            END IF;
            
        EXCEPTION WHEN OTHERS THEN
            -- Handle errors
            v_error_msg := COALESCE(v_error_msg, SQLERRM);
            
            UPDATE t_import_staging_data
            SET processing_status = 'failed',
                error_messages = ARRAY[v_error_msg],
                processed_at = clock_timestamp()
            WHERE id = v_staging_record.id;
            
            v_failed := v_failed + 1;
        END;
        
        v_processed := v_processed + 1;
        
        -- Update session progress
        IF v_processed % 10 = 0 THEN
            UPDATE t_import_sessions
            SET processed_records = v_processed,
                successful_records = v_success,
                failed_records = v_failed,
                duplicate_records = v_duplicates
            WHERE id = p_session_id;
        END IF;
        
        -- Sleep between batches to control duration
        IF v_processed % v_batch_size = 0 THEN
            PERFORM pg_sleep(v_sleep_per_batch);
        END IF;
    END LOOP;
    
    v_end_time := clock_timestamp();
    
    -- Final session update
    UPDATE t_import_sessions
    SET status = CASE 
            WHEN v_failed > 0 THEN 'completed_with_errors'
            ELSE 'completed'
        END,
        processed_records = v_processed,
        successful_records = v_success,
        failed_records = v_failed,
        duplicate_records = v_duplicates,
        processing_completed_at = v_end_time
    WHERE id = p_session_id;
    
    -- Refresh materialized view
    PERFORM refresh_portfolio_totals();
    
    RETURN QUERY SELECT 
        v_processed,
        v_success,
        v_failed,
        v_duplicates,
        EXTRACT(EPOCH FROM (v_end_time - v_start_time))::INTEGER * 1000;
END;
$$;

COMMENT ON FUNCTION process_transaction_import_with_timing IS 
'Process transaction imports from staging with controlled timing (30-45 seconds target). Uses plain text iwell_code for customer lookup.';

-- ============================================================================
-- SECTION 5: CLEANUP FUNCTIONS
-- ============================================================================
DO $$ 
BEGIN
    RAISE NOTICE 'Creating Cleanup Functions...';
END $$;

-- ----------------------------------------------------------------------------
-- FUNCTION: cleanup_old_staging_data
-- Description: Remove old staging data after retention period
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
    
    -- Delete old staging data for completed sessions
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
    
    -- Delete old completed sessions
    WITH deleted_sessions AS (
        DELETE FROM t_import_sessions
        WHERE status IN ('completed', 'completed_with_errors', 'cancelled')
        AND processing_completed_at < v_cutoff_date
        RETURNING id
    )
    SELECT COUNT(*) INTO v_deleted_sessions FROM deleted_sessions;
    
    -- Return summary
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
-- Description: Clean up staging data immediately after successful import
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
    -- Get session details
    SELECT * INTO v_session
    FROM t_import_sessions
    WHERE id = p_session_id;
    
    IF NOT FOUND THEN
        RAISE NOTICE 'Session % not found', p_session_id;
        RETURN;
    END IF;
    
    -- Only clean up completed sessions
    IF v_session.status NOT IN ('completed', 'completed_with_errors') THEN
        RAISE NOTICE 'Session % is not completed (status: %)', p_session_id, v_session.status;
        RETURN;
    END IF;
    
    IF p_keep_failed_records THEN
        -- Delete only successful records to save space
        DELETE FROM t_import_staging_data
        WHERE session_id = p_session_id
        AND processing_status IN ('success', 'duplicate');
    ELSE
        -- Delete all staging records for this session
        DELETE FROM t_import_staging_data
        WHERE session_id = p_session_id;
    END IF;
    
    -- Update session to indicate staging data was cleaned
    UPDATE t_import_sessions
    SET processing_metadata = COALESCE(processing_metadata, '{}'::jsonb) || 
        jsonb_build_object('staging_cleaned_at', CURRENT_TIMESTAMP)
    WHERE id = p_session_id;
END;
$$;

COMMENT ON FUNCTION cleanup_session_staging_data IS 'Clean up staging data for a completed session';

-- ----------------------------------------------------------------------------
-- FUNCTION: get_staging_storage_stats
-- Description: Get staging storage statistics
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

COMMENT ON FUNCTION get_staging_storage_stats IS 'Get storage statistics for import staging tables';

-- ============================================================================
-- SECTION 6: VIEWS
-- ============================================================================
DO $$ 
BEGIN
    RAISE NOTICE 'Creating Views...';
END $$;

-- ----------------------------------------------------------------------------
-- VIEW: v_import_staging_statistics
-- Description: Aggregated statistics for staging table by session
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_import_staging_statistics AS
SELECT 
    session_id,
    tenant_id,
    is_live,
    import_type,
    COUNT(*) as total_rows,
    COUNT(*) FILTER (WHERE processing_status = 'pending') as pending_rows,
    COUNT(*) FILTER (WHERE processing_status = 'processing') as processing_rows,
    COUNT(*) FILTER (WHERE processing_status = 'success') as success_rows,
    COUNT(*) FILTER (WHERE processing_status = 'failed') as failed_rows,
    COUNT(*) FILTER (WHERE processing_status = 'duplicate') as duplicate_rows,
    COUNT(*) FILTER (WHERE processing_status = 'skipped') as skipped_rows,
    MIN(created_at) as staging_started_at,
    MAX(processed_at) as last_processed_at,
    ROUND(
        CAST(COUNT(*) FILTER (WHERE processing_status = 'success') AS DECIMAL) / 
        NULLIF(COUNT(*), 0) * 100, 2
    ) as success_rate
FROM t_import_staging_data
GROUP BY session_id, tenant_id, is_live, import_type;

COMMENT ON VIEW v_import_staging_statistics IS 'Aggregated statistics for staging table by session';

-- ----------------------------------------------------------------------------
-- VIEW: v_import_staging_progress
-- Description: Real-time import progress monitoring
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_import_staging_progress AS
SELECT 
    s.id as session_id,
    s.session_name,
    s.import_type,
    s.status as session_status,
    s.staging_total_rows,
    s.current_batch,
    s.total_batches,
    s.last_processed_row,
    COALESCE(st.pending_rows, 0) as pending_rows,
    COALESCE(st.processing_rows, 0) as processing_rows,
    COALESCE(st.success_rows, 0) as success_rows,
    COALESCE(st.failed_rows, 0) as failed_rows,
    CASE 
        WHEN s.staging_total_rows > 0 THEN 
            ROUND(CAST(COALESCE(st.success_rows + st.failed_rows + st.skipped_rows, 0) AS DECIMAL) / 
                  s.staging_total_rows * 100, 2)
        ELSE 0 
    END as completion_percentage,
    s.processing_started_at,
    s.staging_completed_at,
    CASE 
        WHEN s.processing_started_at IS NOT NULL AND st.processing_rows > 0 THEN
            EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - s.processing_started_at)) / 
            NULLIF(st.success_rows + st.failed_rows, 0)
        ELSE NULL
    END as avg_seconds_per_record
FROM t_import_sessions s
LEFT JOIN v_import_staging_statistics st ON s.id = st.session_id;

COMMENT ON VIEW v_import_staging_progress IS 'Real-time import progress monitoring view';

-- ----------------------------------------------------------------------------
-- VIEW: v_tenant_customer_schemes
-- Description: Identify unique schemes used across customer portfolios per tenant
-- Purpose: Compare with t_scheme_bookmarks to detect unbookmarked schemes
-- Usage: Find schemes customers use that aren't bookmarked for NAV tracking
-- NEW: Added for NAV schema refactor
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

COMMENT ON VIEW v_tenant_customer_schemes IS 
'Unique schemes from customer transactions - used for bookmark gap detection';

COMMENT ON COLUMN v_tenant_customer_schemes.customer_count IS 
'Number of distinct customers holding this scheme';

COMMENT ON COLUMN v_tenant_customer_schemes.transaction_count IS 
'Total transactions across all customers for this scheme';

COMMENT ON COLUMN v_tenant_customer_schemes.total_invested IS 
'Sum of amounts where portfolio_flag = true';

-- ============================================================================
-- SECTION 7: MATERIALIZED VIEW - PORTFOLIO TOTALS
-- ============================================================================
DO $$ 
BEGIN
    RAISE NOTICE 'Creating Materialized View for Portfolio Totals...';
END $$;

-- ----------------------------------------------------------------------------
-- MATERIALIZED VIEW: t_customer_portfolio_totals
-- Description: Pre-calculated portfolio totals with returns
-- NEW: Added complete materialized view for portfolio calculations
-- ----------------------------------------------------------------------------
CREATE MATERIALIZED VIEW t_customer_portfolio_totals AS
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
    
    -- Transaction Counts
    COUNT(DISTINCT t.id) as transaction_count,
    COUNT(DISTINCT CASE WHEN tt.txn_type = 'Addition' THEN t.id END) as purchase_count,
    COUNT(DISTINCT CASE WHEN tt.txn_type = 'Deduction' THEN t.id END) as redemption_count,
    
    -- Units Totals - FIXED
    COALESCE(SUM(CASE WHEN tt.txn_type = 'Addition' THEN t.units 
                     WHEN tt.txn_type = 'Deduction' THEN -t.units 
                     ELSE 0 END), 0) as total_units,
    
    -- Investment Amount - FIXED
    COALESCE(SUM(CASE WHEN tt.txn_type = 'Addition' THEN t.total_amount ELSE 0 END), 0) - 
    COALESCE(SUM(CASE WHEN tt.txn_type = 'Deduction' THEN t.total_amount ELSE 0 END), 0) as total_invested,
    
    -- Latest NAV
    (SELECT nav FROM t_transaction_table 
     WHERE customer_id = p.customer_id 
       AND scheme_code = p.scheme_code 
       AND is_active = true 
     ORDER BY txn_date DESC 
     LIMIT 1) as latest_nav,
    
    -- Current Value - FIXED
    COALESCE(SUM(CASE WHEN tt.txn_type = 'Addition' THEN t.units 
                     WHEN tt.txn_type = 'Deduction' THEN -t.units 
                     ELSE 0 END), 0) * 
    COALESCE((SELECT nav FROM t_transaction_table 
              WHERE customer_id = p.customer_id 
                AND scheme_code = p.scheme_code 
                AND is_active = true 
              ORDER BY txn_date DESC 
              LIMIT 1), 0) as current_value,
    
    -- Total Returns - FIXED
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
    
    -- Return Percentage - FIXED
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
    p.start_date, p.is_active;

COMMENT ON MATERIALIZED VIEW t_customer_portfolio_totals IS 'Pre-calculated portfolio totals with returns and performance metrics';

-- Create unique index for concurrent refresh
CREATE UNIQUE INDEX idx_portfolio_totals_pk 
    ON t_customer_portfolio_totals(customer_id, scheme_code, tenant_id, is_live);

-- Create additional indexes for performance
CREATE INDEX idx_portfolio_totals_customer 
    ON t_customer_portfolio_totals(customer_id);

CREATE INDEX idx_portfolio_totals_scheme 
    ON t_customer_portfolio_totals(scheme_code);

CREATE INDEX idx_portfolio_totals_tenant 
    ON t_customer_portfolio_totals(tenant_id, is_live);

CREATE INDEX idx_portfolio_totals_category 
    ON t_customer_portfolio_totals(category);

CREATE INDEX idx_portfolio_totals_value 
    ON t_customer_portfolio_totals(current_value DESC);

-- Initial population of materialized view
REFRESH MATERIALIZED VIEW t_customer_portfolio_totals;

-- ============================================================================
-- SECTION 7B: v_portfolio_current MATERIALIZED VIEW
-- ============================================================================
DO $$ 
BEGIN
    RAISE NOTICE 'Creating v_portfolio_current Materialized View...';
END $$;

-- ----------------------------------------------------------------------------
-- MATERIALIZED VIEW: v_portfolio_current
-- Description: Current portfolio values with month-end comparison using NAV data
-- Purpose: Calculate current portfolio values using latest NAV and compare with month-end
-- ----------------------------------------------------------------------------
CREATE MATERIALIZED VIEW v_portfolio_current AS
SELECT 
    t.customer_id,
    t.tenant_id,
    t.scheme_code,
    p.scheme_name,
    p.category,
    p.sub_category,
    p.fund_name,
    SUM(t.units) AS total_units,
    
    -- Today's NAV (latest available)
    today_nav.nav_date AS today_nav_date,
    today_nav.nav_value AS today_nav,
    (SUM(t.units) * today_nav.nav_value) AS scheme_value_today,
    
    -- Month-end NAV (last day of previous month)
    month_end_nav.nav_date AS month_end_nav_date,
    month_end_nav.nav_value AS month_end_nav,
    (SUM(t.units) * month_end_nav.nav_value) AS scheme_value_month_end,
    
    -- Change in value since month-end
    ((SUM(t.units) * today_nav.nav_value) - (SUM(t.units) * month_end_nav.nav_value)) AS scheme_value_change
    
FROM t_transaction_table t

-- Join portfolio details
LEFT JOIN t_customer_master_portfolio p ON 
    t.customer_id = p.customer_id 
    AND t.scheme_code = p.scheme_code 
    AND t.tenant_id = p.tenant_id 
    AND t.is_live = p.is_live

-- Get today's NAV (latest available NAV <= today)
LEFT JOIN LATERAL (
    SELECT nav_date, nav_value
    FROM t_nav_data
    WHERE scheme_code = t.scheme_code
      AND nav_date <= CURRENT_DATE
      AND is_live = true
    ORDER BY nav_date DESC
    LIMIT 1
) today_nav ON true

-- Get month-end NAV (latest NAV <= last day of previous month)
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

COMMENT ON MATERIALIZED VIEW v_portfolio_current IS 
'Current portfolio values with month-end comparison using NAV data from t_nav_data';

-- Create unique index for concurrent refresh
CREATE UNIQUE INDEX idx_portfolio_current_unique 
    ON v_portfolio_current(tenant_id, customer_id, scheme_code);

-- Create additional indexes for performance
CREATE INDEX idx_portfolio_current_tenant_customer 
    ON v_portfolio_current(tenant_id, customer_id);

CREATE INDEX idx_portfolio_current_scheme_code 
    ON v_portfolio_current(scheme_code);

-- Initial population of materialized view
REFRESH MATERIALIZED VIEW v_portfolio_current;

-- ============================================================================
-- SECTION 8: MATERIALIZED VIEW REFRESH FUNCTION
-- ============================================================================
DO $$ 
BEGIN
    RAISE NOTICE 'Creating Materialized View Refresh Function...';
END $$;

-- ----------------------------------------------------------------------------
-- FUNCTION: refresh_portfolio_totals
-- Description: Refresh the portfolio totals materialized view
-- NEW FUNCTION: Added for materialized view refresh
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION refresh_portfolio_totals()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    -- Refresh the materialized view concurrently (if possible)
    -- CONCURRENTLY allows reads during refresh but requires unique index
    REFRESH MATERIALIZED VIEW CONCURRENTLY t_customer_portfolio_totals;
    
EXCEPTION WHEN OTHERS THEN
    -- If concurrent refresh fails (e.g., no unique index), do regular refresh
    REFRESH MATERIALIZED VIEW t_customer_portfolio_totals;
END;
$$;

COMMENT ON FUNCTION refresh_portfolio_totals IS 
'Refreshes the t_customer_portfolio_totals materialized view. Attempts concurrent refresh first.';

-- ============================================================================
-- SECTION 9: ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================
DO $$ 
BEGIN
    RAISE NOTICE 'Creating Row Level Security Policies...';
END $$;

-- Enable RLS on core tables
ALTER TABLE t_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE t_chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE t_chat_messages ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- RLS POLICIES: Tenant Isolation
-- ----------------------------------------------------------------------------
CREATE POLICY tenant_isolation_users ON t_users
    FOR ALL
    USING (tenant_id = current_tenant_id());

CREATE POLICY tenant_isolation_chat_sessions ON t_chat_sessions
    FOR ALL
    USING (tenant_id = current_tenant_id());

CREATE POLICY tenant_isolation_chat_messages ON t_chat_messages
    FOR ALL
    USING (tenant_id = current_tenant_id());

-- ----------------------------------------------------------------------------
-- RLS POLICIES: Environment Filtering (Live/Test)
-- ----------------------------------------------------------------------------
CREATE POLICY environment_filter_users ON t_users
    FOR SELECT
    USING (
        CASE 
            WHEN current_environment() = 'live' THEN is_live = true
            WHEN current_environment() = 'test' THEN is_live = false
            ELSE true
        END
    );

CREATE POLICY environment_filter_chat_sessions ON t_chat_sessions
    FOR SELECT
    USING (
        CASE 
            WHEN current_environment() = 'live' THEN is_live = true
            WHEN current_environment() = 'test' THEN is_live = false
            ELSE true
        END
    );

CREATE POLICY environment_filter_chat_messages ON t_chat_messages
    FOR SELECT
    USING (
        CASE 
            WHEN current_environment() = 'live' THEN is_live = true
            WHEN current_environment() = 'test' THEN is_live = false
            ELSE true
        END
    );

COMMENT ON POLICY tenant_isolation_users ON t_users IS 'Isolate users by tenant_id';
COMMENT ON POLICY environment_filter_users ON t_users IS 'Filter users by environment (live/test)';

-- ============================================================================
-- SECTION 10: GRANT PERMISSIONS
-- ============================================================================
DO $$ 
BEGIN
    RAISE NOTICE 'Granting Permissions...';
END $$;

-- Grant permissions on all tables
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO kewal_admin;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO kewal_admin;

-- Grant execute on all functions
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO kewal_admin;

-- Grant execute on specific utility functions
GRANT EXECUTE ON FUNCTION current_tenant_id() TO kewal_admin;
GRANT EXECUTE ON FUNCTION current_environment() TO kewal_admin;

-- Grant execute on import functions
GRANT EXECUTE ON FUNCTION check_customer_duplicate TO kewal_admin;
GRANT EXECUTE ON FUNCTION process_single_customer_record TO kewal_admin;
GRANT EXECUTE ON FUNCTION process_customer_import_with_timing TO kewal_admin;
GRANT EXECUTE ON FUNCTION process_single_scheme_record TO kewal_admin;
GRANT EXECUTE ON FUNCTION process_scheme_import_with_timing TO kewal_admin;
GRANT EXECUTE ON FUNCTION process_transaction_import_with_timing TO kewal_admin;

-- Grant execute on cleanup functions
GRANT EXECUTE ON FUNCTION cleanup_old_staging_data TO kewal_admin;
GRANT EXECUTE ON FUNCTION cleanup_session_staging_data TO kewal_admin;
GRANT EXECUTE ON FUNCTION get_staging_storage_stats TO kewal_admin;

-- Grant execute on materialized view refresh function
GRANT EXECUTE ON FUNCTION refresh_portfolio_totals TO kewal_admin;

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================
DO $$ 
DECLARE
    v_function_count INTEGER;
    v_view_count INTEGER;
    v_policy_count INTEGER;
    v_mat_view_count INTEGER;
BEGIN
    -- Count functions
    SELECT COUNT(*) INTO v_function_count
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public';
    
    -- Count views
    SELECT COUNT(*) INTO v_view_count
    FROM information_schema.views
    WHERE table_schema = 'public';
    
    -- Count materialized views
    SELECT COUNT(*) INTO v_mat_view_count
    FROM pg_matviews
    WHERE schemaname = 'public';
    
    -- Count policies
    SELECT COUNT(*) INTO v_policy_count
    FROM pg_policies
    WHERE schemaname = 'public';
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Functions, Views, and Policies created!';
    RAISE NOTICE 'Total functions: %', v_function_count;
    RAISE NOTICE 'Total views: %', v_view_count;
    RAISE NOTICE 'Total materialized views: %', v_mat_view_count;
    RAISE NOTICE 'Total RLS policies: %', v_policy_count;
    RAISE NOTICE 'Updates included:';
    RAISE NOTICE '  - Added process_transaction_import_with_timing()';
    RAISE NOTICE '  - Added t_customer_portfolio_totals materialized view';
    RAISE NOTICE '  - Added refresh_portfolio_totals() function';
    RAISE NOTICE '  - Added v_tenant_customer_schemes view (NAV refactor)';
    RAISE NOTICE '  - Added v_portfolio_current materialized view (NAV-based valuations)';
    RAISE NOTICE 'Next: Run 05_seed_data.sql';
    RAISE NOTICE '========================================';
END $$;