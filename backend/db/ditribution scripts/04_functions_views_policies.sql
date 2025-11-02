-- ============================================================================
-- File: 04_functions_views_policies.sql
-- Description: Business logic functions, views, and security policies
-- Purpose: Implement data processing, views, and row-level security
-- Execution: Run FOURTH after 03_indexes_triggers.sql
-- Author: System
-- Date: 2025-01-08
-- Updated: 2025-01-09 (Added transaction import, materialized view, refresh function)
-- Updated: 2025-01-15 (Added v_tenant_customer_schemes view for NAV refactor)
-- Updated: 2025-11-02 (Added orphan status tracking, PAN fallback, customer name lookup)
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

-- ----------------------------------------------------------------------------
-- FUNCTION: normalize_customer_name
-- Description: Normalize customer names for matching during imports
-- Purpose: Remove titles, special chars, standardize for lookups
-- NEW: Added for customer name-based lookup support
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION normalize_customer_name(p_name TEXT)
RETURNS TEXT
LANGUAGE plpgsql IMMUTABLE
AS $$
BEGIN
    IF p_name IS NULL OR TRIM(p_name) = '' THEN
        RETURN NULL;
    END IF;
    
    -- Remove titles (MR, MRS, MS, DR, PROF, SRI, SMT)
    -- Remove special characters
    -- Normalize whitespace
    -- Convert to uppercase
    RETURN UPPER(
        REGEXP_REPLACE(
            REGEXP_REPLACE(
                REGEXP_REPLACE(p_name, '^(MR|MRS|MS|DR|PROF|SRI|SMT)\.?\s+', '', 'i'),
                '[^A-Z0-9\s]', '', 'g'
            ),
            '\s+', ' ', 'g'
        )
    );
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
-- Description: Check if customer already exists by PAN, email, or mobile
-- NOTE: Uses PLAIN TEXT pan field (not encrypted)
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
    -- Check by PAN if provided (PLAIN TEXT comparison)
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
    
    -- Check by email
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
    
    -- Check by mobile
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
            normalized_name,
            is_customer,
            created_at
        ) VALUES (
            v_staging.tenant_id,
            v_staging.is_live,
            v_clean_prefix,
            v_mapped_data->>'name',
            normalize_customer_name(v_mapped_data->>'name'),
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

COMMENT ON FUNCTION process_single_customer_record IS 'Process single customer record from staging - uses plain text PAN/IWELL and normalized names';

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

-- ----------------------------------------------------------------------------
-- FUNCTION: lookup_scheme_by_alias
-- Description: Fast lookup to find scheme by alias name during transaction import
-- Returns: scheme_id, scheme_code, scheme_name, matched_alias
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
-- Description: Process transaction imports with flexible customer lookup methods
-- Methods: iwell_code (default), customer_name, both
-- Features: PAN fallback, orphan tracking, scheme alias lookup
-- NEW: Replaces process_transaction_import_with_timing with enhanced features
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
BEGIN
    -- Get session info
    SELECT tenant_id, is_live INTO v_session_info
    FROM t_import_sessions
    WHERE id = p_session_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Session % not found', p_session_id;
    END IF;

    -- Update session status to processing
    UPDATE t_import_sessions
    SET status = 'processing',
        processing_started_at = NOW()
    WHERE id = p_session_id;

    RAISE NOTICE '[Session %] Starting processing with lookup method: %', p_session_id, p_customer_lookup_method;

    -- Process all pending records
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

            -- ==================================================
            -- CUSTOMER LOOKUP WITH PAN FALLBACK
            -- ==================================================

            -- Method 1: IWELL Code (with PAN fallback)
            IF p_customer_lookup_method = 'iwell_code' THEN
                IF v_staging_record.mapped_data->>'iwell_code' IS NOT NULL THEN
                    SELECT c.id INTO v_customer_id
                    FROM t_customers c
                    WHERE c.tenant_id = v_staging_record.tenant_id
                      AND c.is_live = v_staging_record.is_live
                      AND UPPER(c.iwell_code) = UPPER(v_staging_record.mapped_data->>'iwell_code')
                      AND c.is_active = true
                    LIMIT 1;

                    -- PAN FALLBACK if IWELL not found
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

            -- Method 2: Customer Name (with PAN fallback)
            ELSIF p_customer_lookup_method = 'customer_name' THEN
                IF v_staging_record.mapped_data->>'customer_name' IS NOT NULL THEN
                    -- Try normalized name match
                    SELECT c.id INTO v_customer_id
                    FROM t_customers c
                    INNER JOIN t_contacts ct ON ct.id = c.contact_id
                    WHERE c.tenant_id = v_staging_record.tenant_id
                      AND c.is_live = v_staging_record.is_live
                      AND ct.normalized_name = normalize_customer_name(v_staging_record.mapped_data->>'customer_name')
                      AND c.is_active = true
                      AND ct.is_active = true
                    LIMIT 1;

                    -- PAN FALLBACK if name not found
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

            -- Method 3: Both (try IWELL first, fallback to name, then PAN)
            ELSIF p_customer_lookup_method = 'both' THEN
                -- Try IWELL code first
                IF v_staging_record.mapped_data->>'iwell_code' IS NOT NULL THEN
                    SELECT c.id INTO v_customer_id
                    FROM t_customers c
                    WHERE c.tenant_id = v_staging_record.tenant_id
                      AND c.is_live = v_staging_record.is_live
                      AND UPPER(c.iwell_code) = UPPER(v_staging_record.mapped_data->>'iwell_code')
                      AND c.is_active = true
                    LIMIT 1;
                END IF;

                -- Fallback to customer name
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

                -- Final fallback to PAN
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

            -- If no customer found, mark as orphan and continue
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

            -- ==================================================
            -- TRANSACTION TYPE LOOKUP & VALIDATION
            -- ==================================================
            IF v_staging_record.mapped_data->>'txn_code' IS NOT NULL
               AND TRIM(v_staging_record.mapped_data->>'txn_code') != '' THEN

                -- Look up transaction type by txn_code
                SELECT id INTO v_txn_type_id
                FROM m_transaction_types
                WHERE UPPER(TRIM(txn_code)) = UPPER(TRIM(v_staging_record.mapped_data->>'txn_code'))
                  AND is_active = true
                LIMIT 1;

                -- If not found by txn_code, try txn_name
                IF v_txn_type_id IS NULL THEN
                    SELECT id INTO v_txn_type_id
                    FROM m_transaction_types
                    WHERE UPPER(TRIM(txn_name)) = UPPER(TRIM(v_staging_record.mapped_data->>'txn_code'))
                      AND is_active = true
                    LIMIT 1;
                END IF;

                -- If still not found, FAIL the record
                IF v_txn_type_id IS NULL THEN
                    v_error_msg := 'Invalid transaction type: ' ||
                                  (v_staging_record.mapped_data->>'txn_code') ||
                                  '. Valid types: SIP, PURCHASE, REDEMPTION, SWITCH IN, SWITCH OUT, STP IN, STP OUT, SELL, OPENING BALANCE';

                    UPDATE t_import_staging_data
                    SET processing_status = 'failed',
                        error_messages = ARRAY[v_error_msg],
                        processed_at = NOW()
                    WHERE id = v_staging_record.id;

                    v_failed_count := v_failed_count + 1;
                    v_processed_count := v_processed_count + 1;
                    RAISE NOTICE '[Session %] Row %: FAILED - %',
                        p_session_id, v_staging_record.row_number, v_error_msg;
                    CONTINUE;
                END IF;
            ELSE
                -- txn_code is required
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

            -- ==================================================
            -- SCHEME LOOKUP - MUST BE IN TENANT'S BOOKMARKS
            -- ==================================================
            IF v_staging_record.mapped_data->>'scheme_name' IS NOT NULL AND
               TRIM(v_staging_record.mapped_data->>'scheme_name') != '' THEN

                -- Step 1: Find scheme_id from alias table
                SELECT sa.scheme_id INTO v_scheme_id
                FROM t_scheme_aliases sa
                WHERE sa.is_active = true
                  AND LOWER(TRIM(sa.alias_name)) = LOWER(TRIM(v_staging_record.mapped_data->>'scheme_name'))
                LIMIT 1;

                -- Step 2: Check if tenant has bookmarked this scheme
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

                    -- If not found in bookmarks, try to get from t_scheme_details as fallback
                    IF v_bookmark_id IS NULL THEN
                        SELECT scheme_name INTO v_scheme_name
                        FROM t_scheme_details
                        WHERE id = v_scheme_id;
                    END IF;
                END IF;
            END IF;

            -- ==================================================
            -- CRITICAL: FAIL IF SCHEME NOT BOOKMARKED OR NO SCHEME_CODE
            -- ==================================================
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
                RAISE NOTICE '[Session %] Row %: FAILED - %',
                    p_session_id, v_staging_record.row_number, v_error_msg;
                CONTINUE;
            END IF;

            -- ==================================================
            -- DUPLICATE CHECK
            -- ==================================================
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

            -- ==================================================
            -- CREATE/UPDATE PORTFOLIO ENTRY
            -- CRITICAL: Use v_scheme_code from bookmark lookup, NOT mapped_data
            -- This is REQUIRED for materialized view t_customer_portfolio_totals
            -- ==================================================
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
                v_scheme_code,                    -- ← From bookmark lookup
                v_scheme_name,                    -- ← From bookmark lookup
                v_staging_record.mapped_data->>'folio_no',
                (v_staging_record.mapped_data->>'txn_date')::DATE
            )
            ON CONFLICT (customer_id, scheme_code, tenant_id, is_live)
            DO UPDATE SET
                scheme_name = EXCLUDED.scheme_name,
                folio_no = COALESCE(EXCLUDED.folio_no, t_customer_master_portfolio.folio_no),
                updated_at = CURRENT_TIMESTAMP;

            -- ==================================================
            -- INSERT TRANSACTION WITH BOOKMARKED SCHEME DATA
            -- ==================================================
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
                v_scheme_code,                    -- ← From bookmarks
                v_scheme_name,                    -- ← From bookmarks
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

            -- Mark as success
            UPDATE t_import_staging_data
            SET processing_status = 'success',
                created_record_id = v_txn_id,
                created_record_type = 'transaction',
                processed_at = NOW()
            WHERE id = v_staging_record.id;

            v_success_count := v_success_count + 1;
            v_processed_count := v_processed_count + 1;

        EXCEPTION WHEN OTHERS THEN
            -- Mark as failed with error
            UPDATE t_import_staging_data
            SET processing_status = 'failed',
                error_messages = ARRAY[SQLERRM],
                processed_at = NOW()
            WHERE id = v_staging_record.id;

            v_failed_count := v_failed_count + 1;
            v_processed_count := v_processed_count + 1;

            RAISE NOTICE '[Session %] Error processing row %: %', p_session_id, v_staging_record.row_number, SQLERRM;
        END;

        -- Checkpoint every batch_size records
        IF v_processed_count % v_batch_size = 0 THEN
            UPDATE t_import_sessions
            SET successful_records = v_success_count,
                failed_records = v_failed_count,
                orphan_records = v_orphan_count,
                duplicate_records = v_duplicate_count,
                processed_records = v_processed_count,
                updated_at = NOW()
            WHERE id = p_session_id;

            RAISE NOTICE '[Session %] Checkpoint: % processed (% success, % failed, % orphan, % duplicate)',
                p_session_id, v_processed_count, v_success_count, v_failed_count, v_orphan_count, v_duplicate_count;
        END IF;
    END LOOP;

    -- Final session update
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

    RAISE NOTICE '[Session %] Completed: % total (% success, % failed, % orphan, % duplicate) in % seconds',
        p_session_id, v_processed_count, v_success_count, v_failed_count, v_orphan_count, v_duplicate_count,
        EXTRACT(EPOCH FROM (NOW() - v_start_time));

    -- Return summary
    RETURN QUERY SELECT
        v_processed_count,
        v_success_count,
        v_failed_count,
        v_duplicate_count,
        v_orphan_count,
        EXTRACT(EPOCH FROM (NOW() - v_start_time))::NUMERIC;
END;
$$;

COMMENT ON FUNCTION process_transaction_import_session IS 'Process transaction imports - validates against tenant bookmarks, requires valid scheme_code and txn_type_id, and maintains t_customer_master_portfolio for materialized view';

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

COMMENT ON FUNCTION get_staging_storage_stats IS 'Get storage statistics for import staging tables including orphan tracking';

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
-- UPDATED: Added orphan_rows tracking and enhanced metrics
-- ----------------------------------------------------------------------------
DROP VIEW IF EXISTS v_import_staging_statistics CASCADE;

CREATE OR REPLACE VIEW v_import_staging_statistics AS
SELECT 
    session_id,
    tenant_id,
    is_live,
    import_type,
    
    -- Total and status counts
    COUNT(*) AS total_rows,
    COUNT(*) FILTER (WHERE processing_status = 'pending') AS pending_rows,
    COUNT(*) FILTER (WHERE processing_status = 'processing') AS processing_rows,
    COUNT(*) FILTER (WHERE processing_status = 'success') AS success_rows,
    COUNT(*) FILTER (WHERE processing_status = 'failed') AS failed_rows,
    COUNT(*) FILTER (WHERE processing_status = 'duplicate') AS duplicate_rows,
    COUNT(*) FILTER (WHERE processing_status = 'orphan') AS orphan_rows,
    COUNT(*) FILTER (WHERE processing_status = 'skipped') AS skipped_rows,
    
    -- Timestamps
    MIN(created_at) AS staging_started_at,
    MAX(processed_at) AS last_processed_at,
    
    -- Success rate calculation
    ROUND(
        COUNT(*) FILTER (WHERE processing_status = 'success')::numeric 
        / NULLIF(COUNT(*), 0)::numeric * 100::numeric, 
        2
    ) AS success_rate,
    
    -- Processing success rate (successful + duplicates) / total
    ROUND(
        (COUNT(*) FILTER (WHERE processing_status IN ('success', 'duplicate'))::numeric)
        / NULLIF(COUNT(*), 0)::numeric * 100::numeric,
        2
    ) AS processing_success_rate,
    
    -- Error rate (failed + orphan) / total
    ROUND(
        (COUNT(*) FILTER (WHERE processing_status IN ('failed', 'orphan'))::numeric) 
        / NULLIF(COUNT(*), 0)::numeric * 100::numeric,
        2
    ) AS error_rate
FROM t_import_staging_data
GROUP BY session_id, tenant_id, is_live, import_type;

COMMENT ON VIEW v_import_staging_statistics IS 'Aggregated statistics for staging table by session including orphan record tracking';

-- ----------------------------------------------------------------------------
-- VIEW: v_import_staging_progress
-- Description: Real-time import progress monitoring
-- UPDATED: Added orphan tracking and enhanced progress metrics
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
    
    -- Real-time counts from staging table
    COALESCE(st.pending_rows, 0::bigint) AS pending_rows,
    COALESCE(st.processing_rows, 0::bigint) AS processing_rows,
    COALESCE(st.success_rows, 0::bigint) AS success_rows,
    COALESCE(st.failed_rows, 0::bigint) AS failed_rows,
    COALESCE(st.duplicate_rows, 0::bigint) AS duplicate_rows,
    COALESCE(st.orphan_rows, 0::bigint) AS orphan_rows,
    COALESCE(st.skipped_rows, 0::bigint) AS skipped_rows,
    
    -- Session-level counts (final after processing completes)
    s.successful_records,
    s.failed_records,
    s.duplicate_records,
    s.orphan_records,
    
    -- Progress calculation
    CASE
        WHEN s.staging_total_rows > 0 THEN 
            ROUND(
                COALESCE(st.success_rows + st.failed_rows + st.duplicate_rows + st.orphan_rows + st.skipped_rows, 0::bigint)::numeric 
                / s.staging_total_rows::numeric * 100::numeric, 
                2
            )
        ELSE 0::numeric
    END AS completion_percentage,
    
    -- Timestamps
    s.processing_started_at,
    s.staging_completed_at,
    s.processing_completed_at,
    
    -- Performance metrics
    CASE
        WHEN s.processing_started_at IS NOT NULL AND 
             (st.success_rows + st.failed_rows + st.duplicate_rows + st.orphan_rows) > 0 THEN 
            EXTRACT(epoch FROM CURRENT_TIMESTAMP - s.processing_started_at::timestamp with time zone) 
            / NULLIF(st.success_rows + st.failed_rows + st.duplicate_rows + st.orphan_rows, 0)::numeric
        ELSE NULL::numeric
    END AS avg_seconds_per_record,
    
    -- Estimated time remaining (in seconds)
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

COMMENT ON VIEW v_import_staging_progress IS 'Real-time import progress monitoring view with orphan record tracking';

-- ----------------------------------------------------------------------------
-- VIEW: v_tenant_customer_schemes
-- Description: Identify unique schemes used across customer portfolios per tenant
-- Purpose: Compare with t_scheme_bookmarks to detect unbookmarked schemes
-- Usage: Find schemes customers use that aren't bookmarked for NAV tracking
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
-- ----------------------------------------------------------------------------
CREATE MATERIALIZED VIEW IF NOT EXISTS t_customer_portfolio_totals AS
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
    
    -- Units Totals
    COALESCE(SUM(CASE WHEN tt.txn_type = 'Addition' THEN t.units 
                     WHEN tt.txn_type = 'Deduction' THEN -t.units 
                     ELSE 0 END), 0) as total_units,
    
    -- Investment Amount
    COALESCE(SUM(CASE WHEN tt.txn_type = 'Addition' THEN t.total_amount ELSE 0 END), 0) - 
    COALESCE(SUM(CASE WHEN tt.txn_type = 'Deduction' THEN t.total_amount ELSE 0 END), 0) as total_invested,
    
    -- Latest NAV
    (SELECT nav FROM t_transaction_table 
     WHERE customer_id = p.customer_id 
       AND scheme_code = p.scheme_code 
       AND is_active = true 
     ORDER BY txn_date DESC 
     LIMIT 1) as latest_nav,
    
    -- Current Value
    COALESCE(SUM(CASE WHEN tt.txn_type = 'Addition' THEN t.units 
                     WHEN tt.txn_type = 'Deduction' THEN -t.units 
                     ELSE 0 END), 0) * 
    COALESCE((SELECT nav FROM t_transaction_table 
              WHERE customer_id = p.customer_id 
                AND scheme_code = p.scheme_code 
                AND is_active = true 
              ORDER BY txn_date DESC 
              LIMIT 1), 0) as current_value,
    
    -- Total Returns
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
    
    -- Return Percentage
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
CREATE UNIQUE INDEX IF NOT EXISTS idx_portfolio_totals_pk 
    ON t_customer_portfolio_totals(customer_id, scheme_code, tenant_id, is_live);

-- Create additional indexes for performance
CREATE INDEX IF NOT EXISTS idx_portfolio_totals_customer 
    ON t_customer_portfolio_totals(customer_id);

CREATE INDEX IF NOT EXISTS idx_portfolio_totals_scheme 
    ON t_customer_portfolio_totals(scheme_code);

CREATE INDEX IF NOT EXISTS idx_portfolio_totals_tenant 
    ON t_customer_portfolio_totals(tenant_id, is_live);

CREATE INDEX IF NOT EXISTS idx_portfolio_totals_category 
    ON t_customer_portfolio_totals(category);

CREATE INDEX IF NOT EXISTS idx_portfolio_totals_value 
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
CREATE UNIQUE INDEX IF NOT EXISTS idx_portfolio_current_unique 
    ON v_portfolio_current(tenant_id, customer_id, scheme_code);

-- Create additional indexes for performance
CREATE INDEX IF NOT EXISTS idx_portfolio_current_tenant_customer 
    ON v_portfolio_current(tenant_id, customer_id);

CREATE INDEX IF NOT EXISTS idx_portfolio_current_scheme_code 
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

-- ----------------------------------------------------------------------------
-- RLS POLICIES: Environment Filtering (Live/Test)
-- ----------------------------------------------------------------------------
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

-- Grant usage on schema
GRANT USAGE ON SCHEMA public TO kewal_admin;

-- Grant specific permissions on views
GRANT ALL ON TABLE v_import_staging_statistics TO kewal_admin;
GRANT ALL ON TABLE v_import_staging_progress TO kewal_admin;
GRANT ALL ON TABLE v_tenant_customer_schemes TO kewal_admin;

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
    RAISE NOTICE '========================================';
    RAISE NOTICE 'UPDATE NOTES (2025-11-02):';
    RAISE NOTICE '  ✓ Added orphan status tracking';
    RAISE NOTICE '  ✓ Added normalize_customer_name() function';
    RAISE NOTICE '  ✓ Added process_transaction_import_session() with:';
    RAISE NOTICE '    - Multiple customer lookup methods';
    RAISE NOTICE '    - PAN fallback for all lookup methods';
    RAISE NOTICE '    - Scheme alias lookup support';
    RAISE NOTICE '    - Enhanced orphan detection';
    RAISE NOTICE '    - Batch checkpoint logging';
    RAISE NOTICE '  ✓ Updated customer import to store normalized names';
    RAISE NOTICE '  ✓ Updated v_import_staging_statistics view';
    RAISE NOTICE '  ✓ Updated v_import_staging_progress view';
    RAISE NOTICE '  ✓ Updated get_staging_storage_stats()';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'DEPLOYMENT NOTES:';
    RAISE NOTICE '  - Ensure t_import_sessions has orphan_records column';
    RAISE NOTICE '  - Ensure t_import_staging_data allows "orphan" status';
    RAISE NOTICE '  - Ensure t_contacts has normalized_name TEXT column';
    RAISE NOTICE '  - Test transaction import with all lookup methods';
    RAISE NOTICE '  - Verify PAN fallback logic works correctly';
    RAISE NOTICE '  - Test scheme alias matching';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'USAGE:';
    RAISE NOTICE '  Transaction Import Methods:';
    RAISE NOTICE '  - iwell_code (default): Lookup by IWELL code with PAN fallback';
    RAISE NOTICE '  - customer_name: Lookup by normalized name with PAN fallback';
    RAISE NOTICE '  - both: Try IWELL → Name → PAN in sequence';
    RAISE NOTICE '';
    RAISE NOTICE '  Example:';
    RAISE NOTICE '  SELECT * FROM process_transaction_import_session(123, ''both'');';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Next: Run 05_seed_data.sql';
    RAISE NOTICE '========================================';
END $$;