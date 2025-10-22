-- ============================================================================
-- File: 04_functions_views_policies.sql
-- Description: Business logic functions, views, and security policies
-- Purpose: Implement data processing, views, and row-level security
-- Execution: Run FOURTH after 03_indexes_triggers.sql
-- Author: System
-- Date: 2025-01-08
-- Updated: 2025-10-22 (COMPLETE REGENERATION - 100% coverage from current_schema_utf8.sql)
-- ============================================================================

-- ============================================================================
-- SECTION 1: INFORMATION & INITIALIZATION
-- ============================================================================
DO $$ 
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Creating Functions, Views, and Policies';
    RAISE NOTICE 'Database: kewalinvest';
    RAISE NOTICE 'Complete regeneration with 100% coverage';
    RAISE NOTICE '========================================';
END $$;

-- ============================================================================
-- SECTION 2: TRIGGER FUNCTIONS
-- ============================================================================
DO $$ 
BEGIN
    RAISE NOTICE 'Creating Trigger Functions...';
    RAISE NOTICE 'Total trigger functions: 3';
END $$;

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_updated_at_column() OWNER TO kewal_admin;

--
-- Name: FUNCTION update_updated_at_column(); Type: COMMENT; Schema: public; Owner: kewal_admin
--

COMMENT ON FUNCTION public.update_updated_at_column() IS 'Automatically update updated_at timestamp on row update';


CREATE FUNCTION public.update_staging_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_staging_updated_at() OWNER TO kewal_admin;

CREATE FUNCTION public.update_market_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_market_updated_at() OWNER TO kewal_admin;


-- ============================================================================
-- SECTION 3: UTILITY FUNCTIONS (RLS Support)
-- ============================================================================
DO $$ 
BEGIN
    RAISE NOTICE 'Creating Utility Functions...';
END $$;

CREATE FUNCTION public.current_tenant_id() RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    RETURN NULLIF(current_setting('app.current_tenant_id', true), '')::INTEGER;
EXCEPTION
    WHEN OTHERS THEN
        RETURN NULL;
END;
$$;


ALTER FUNCTION public.current_tenant_id() OWNER TO kewal_admin;

--
-- Name: FUNCTION current_tenant_id(); Type: COMMENT; Schema: public; Owner: kewal_admin
--

COMMENT ON FUNCTION public.current_tenant_id() IS 'Get current tenant ID from session for RLS policies';

CREATE FUNCTION public.current_environment() RETURNS character varying
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    RETURN COALESCE(current_setting('app.current_environment', true), 'live');
EXCEPTION
    WHEN OTHERS THEN
        RETURN 'live';
END;
$$;


ALTER FUNCTION public.current_environment() OWNER TO kewal_admin;

--
-- Name: FUNCTION current_environment(); Type: COMMENT; Schema: public; Owner: kewal_admin
--

COMMENT ON FUNCTION public.current_environment() IS 'Get current environment (live/test) from session';


-- ============================================================================
-- SECTION 4: CUSTOMER IMPORT FUNCTIONS
-- ============================================================================
DO $$ 
BEGIN
    RAISE NOTICE 'Creating Customer Import Functions...';
END $$;

CREATE FUNCTION public.check_customer_duplicate(p_pan character varying, p_email character varying, p_mobile character varying) RETURNS boolean
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


ALTER FUNCTION public.check_customer_duplicate(p_pan character varying, p_email character varying, p_mobile character varying) OWNER TO kewal_admin;

--
-- Name: FUNCTION check_customer_duplicate(p_pan character varying, p_email character varying, p_mobile character varying); Type: COMMENT; Schema: public; Owner: kewal_admin
--

COMMENT ON FUNCTION public.check_customer_duplicate(p_pan character varying, p_email character varying, p_mobile character varying) IS 'Check for duplicate customers using PAN (plain text), email, or mobile';

CREATE FUNCTION public.process_single_customer_record(p_staging_id integer) RETURNS void
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


ALTER FUNCTION public.process_single_customer_record(p_staging_id integer) OWNER TO kewal_admin;

--
-- Name: FUNCTION process_single_customer_record(p_staging_id integer); Type: COMMENT; Schema: public; Owner: kewal_admin
--

COMMENT ON FUNCTION public.process_single_customer_record(p_staging_id integer) IS 'Process single customer record from staging - uses plain text PAN/IWELL';


--
-- Name: process_single_scheme_record(integer); Type: FUNCTION; Schema: public; Owner: kewal_admin
--

CREATE FUNCTION public.process_customer_import_with_timing(p_session_id integer, p_target_duration_ms integer DEFAULT 30000) RETURNS jsonb
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


ALTER FUNCTION public.process_customer_import_with_timing(p_session_id integer, p_target_duration_ms integer) OWNER TO kewal_admin;

--
-- Name: FUNCTION process_customer_import_with_timing(p_session_id integer, p_target_duration_ms integer); Type: COMMENT; Schema: public; Owner: kewal_admin
--

COMMENT ON FUNCTION public.process_customer_import_with_timing(p_session_id integer, p_target_duration_ms integer) IS 'Process customer import with controlled timing for better UX';


--
-- Name: process_scheme_import_with_timing(integer, integer); Type: FUNCTION; Schema: public; Owner: kewal_admin
--


-- ============================================================================
-- SECTION 5: SCHEME IMPORT FUNCTIONS
-- ============================================================================
DO $$ 
BEGIN
    RAISE NOTICE 'Creating Scheme Import Functions...';
END $$;

CREATE FUNCTION public.process_single_scheme_record(p_staging_id integer) RETURNS void
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


ALTER FUNCTION public.process_single_scheme_record(p_staging_id integer) OWNER TO kewal_admin;

--
-- Name: FUNCTION process_single_scheme_record(p_staging_id integer); Type: COMMENT; Schema: public; Owner: kewal_admin
--

COMMENT ON FUNCTION public.process_single_scheme_record(p_staging_id integer) IS 'Process single scheme record from staging';


--
-- Name: process_transaction_import_with_timing(integer, integer); Type: FUNCTION; Schema: public; Owner: kewal_admin
--

CREATE FUNCTION public.process_scheme_import_with_timing(p_session_id integer, p_target_duration_ms integer DEFAULT 30000) RETURNS TABLE(processed_count integer, success_count integer, failed_count integer, duplicate_count integer, actual_duration_ms integer)
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


ALTER FUNCTION public.process_scheme_import_with_timing(p_session_id integer, p_target_duration_ms integer) OWNER TO kewal_admin;

--
-- Name: FUNCTION process_scheme_import_with_timing(p_session_id integer, p_target_duration_ms integer); Type: COMMENT; Schema: public; Owner: kewal_admin
--

COMMENT ON FUNCTION public.process_scheme_import_with_timing(p_session_id integer, p_target_duration_ms integer) IS 'Process scheme import with controlled timing';


--
-- Name: process_single_customer_record(integer); Type: FUNCTION; Schema: public; Owner: kewal_admin
--


-- ============================================================================
-- SECTION 6: TRANSACTION IMPORT FUNCTIONS
-- ============================================================================
DO $$ 
BEGIN
    RAISE NOTICE 'Creating Transaction Import Functions...';
END $$;

CREATE FUNCTION public.process_transaction_import_with_timing(p_session_id integer, p_target_duration_ms integer DEFAULT 35000) RETURNS TABLE(total_processed integer, successful integer, failed integer, duplicates integer, orphans integer, duration_ms integer)
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
    v_orphans INTEGER := 0;
    v_batch_size INTEGER;
    v_sleep_per_batch NUMERIC;
    v_staging_record RECORD;
    v_customer_id INTEGER;
    v_txn_type_id INTEGER;
    v_txn_type VARCHAR(20);
    v_portfolio_id INTEGER;
    v_is_duplicate BOOLEAN;
    v_error_msg TEXT;
    
    -- NEW: Scheme resolution variables
    v_scheme_code VARCHAR(100);
    v_scheme_id INTEGER;
    v_scheme_name_input VARCHAR(500);
    v_is_orphan BOOLEAN;
BEGIN
    v_start_time := clock_timestamp();
    
    -- Get total rows to process
    SELECT COUNT(*) INTO v_total_rows
    FROM t_import_staging_data
    WHERE session_id = p_session_id
        AND processing_status = 'pending';
    
    -- Calculate batch size and sleep time
    IF v_total_rows > 0 THEN
        v_batch_size := GREATEST(10, v_total_rows / 20);
        v_sleep_per_batch := (p_target_duration_ms / 20.0) / 1000.0;
    ELSE
        RETURN QUERY SELECT 0, 0, 0, 0, 0, 0;
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
            v_is_orphan := false;
            v_scheme_code := NULL;
            v_scheme_id := NULL;
            
            -- ================================================================
            -- STEP 1: SCHEME RESOLUTION (NEW LOGIC)
            -- ================================================================
            v_scheme_name_input := TRIM(v_staging_record.mapped_data->>'scheme_name');
            
            -- Try to match scheme by alias_name in bookmarks
            SELECT 
                sb.scheme_code,
                sb.scheme_id,
                sb.scheme_name
            INTO 
                v_scheme_code,
                v_scheme_id,
                v_scheme_name_input
            FROM t_scheme_bookmarks sb
            WHERE sb.tenant_id = v_staging_record.tenant_id
                AND sb.is_live = v_staging_record.is_live
                AND sb.is_active = true
                AND (
                    -- Try exact match on alias_name first
                    LOWER(TRIM(sb.alias_name)) = LOWER(v_scheme_name_input)
                    OR
                    -- Fallback to scheme_name if alias is NULL
                    (sb.alias_name IS NULL AND LOWER(TRIM(sb.scheme_name)) = LOWER(v_scheme_name_input))
                )
            LIMIT 1;
            
            -- If scheme not found in bookmarks ΓåÆ ORPHAN
            IF v_scheme_code IS NULL THEN
                v_is_orphan := true;
                v_error_msg := 'Scheme not found in tenant bookmarks: ' || v_scheme_name_input;
                
                -- Update staging as orphan
                UPDATE t_import_staging_data
                SET processing_status = 'orphan',
                    error_messages = ARRAY[v_error_msg],
                    warnings = ARRAY['No matching scheme bookmark found for: ' || v_scheme_name_input],
                    processed_at = clock_timestamp()
                WHERE id = v_staging_record.id;
                
                v_orphans := v_orphans + 1;
                v_processed := v_processed + 1;
                CONTINUE; -- Skip to next record
            END IF;
            
            -- ================================================================
            -- STEP 2: VALIDATE CUSTOMER (by IWELL code)
            -- ================================================================
            SELECT c.id INTO v_customer_id
            FROM t_customers c
            WHERE c.iwell_code = v_staging_record.mapped_data->>'iwell_code'
                AND c.tenant_id = v_staging_record.tenant_id
                AND c.is_live = v_staging_record.is_live
                AND c.is_active = true;
            
            IF v_customer_id IS NULL THEN
                v_error_msg := 'Customer not found - IWELL code: ' || (v_staging_record.mapped_data->>'iwell_code');
                RAISE EXCEPTION '%', v_error_msg;
            END IF;
            
            -- ================================================================
            -- STEP 3: VALIDATE TRANSACTION TYPE
            -- ================================================================
            SELECT id, txn_type INTO v_txn_type_id, v_txn_type
            FROM m_transaction_types
            WHERE UPPER(txn_code) = UPPER(v_staging_record.mapped_data->>'txn_code')
                AND is_active = true;
            
            IF v_txn_type_id IS NULL THEN
                v_error_msg := 'Invalid transaction type: ' || (v_staging_record.mapped_data->>'txn_code');
                RAISE EXCEPTION '%', v_error_msg;
            END IF;
            
            -- ================================================================
            -- STEP 4: CHECK FOR DUPLICATE
            -- ================================================================
            SELECT EXISTS (
                SELECT 1 FROM t_transaction_table
                WHERE customer_id = v_customer_id
                    AND scheme_code = v_scheme_code -- Use resolved scheme_code
                    AND txn_date = (v_staging_record.mapped_data->>'txn_date')::DATE
                    AND total_amount = (v_staging_record.mapped_data->>'total_amount')::DECIMAL
                    AND txn_type_id = v_txn_type_id
                    AND is_active = true
            ) INTO v_is_duplicate;
            
            -- ================================================================
            -- STEP 5: CREATE/UPDATE PORTFOLIO ENTRY
            -- ================================================================
            INSERT INTO t_customer_master_portfolio (
                tenant_id, is_live, customer_id, 
                scheme_code, -- Use resolved scheme_code
                scheme_name, -- Use official scheme_name from bookmark
                folio_no, category, sub_category, fund_name, start_date
            ) VALUES (
                v_staging_record.tenant_id,
                v_staging_record.is_live,
                v_customer_id,
                v_scheme_code, -- Resolved code
                v_scheme_name_input, -- Official name from bookmark
                v_staging_record.mapped_data->>'folio_no',
                v_staging_record.mapped_data->>'category',
                v_staging_record.mapped_data->>'sub_category',
                v_staging_record.mapped_data->>'fund_name',
                (v_staging_record.mapped_data->>'txn_date')::DATE
            )
            ON CONFLICT (customer_id, scheme_code, tenant_id, is_live)
            DO UPDATE SET
                scheme_name = EXCLUDED.scheme_name,
                folio_no = COALESCE(EXCLUDED.folio_no, t_customer_master_portfolio.folio_no),
                updated_at = CURRENT_TIMESTAMP
            RETURNING id INTO v_portfolio_id;
            
            -- ================================================================
            -- STEP 6: INSERT TRANSACTION
            -- ================================================================
            INSERT INTO t_transaction_table (
                tenant_id, is_live, customer_id, 
                scheme_code, -- Resolved code
                scheme_id, -- NEW: Link to scheme_details
                scheme_name, -- Official name
                folio_no,
                txn_type_id, txn_date, total_amount, units, nav, stamp_duty,
                staging_record_id, import_session_id,
                is_potential_duplicate, portfolio_flag, duplicate_reason,
                txn_description, txn_source, -- Additional fields
                stt, tds -- Tax fields
            ) VALUES (
                v_staging_record.tenant_id,
                v_staging_record.is_live,
                v_customer_id,
                v_scheme_code, -- Resolved
                v_scheme_id, -- Resolved
                v_scheme_name_input,
                v_staging_record.mapped_data->>'folio_no',
                v_txn_type_id,
                (v_staging_record.mapped_data->>'txn_date')::DATE,
                (v_staging_record.mapped_data->>'total_amount')::DECIMAL,
                (v_staging_record.mapped_data->>'units')::DECIMAL,
                (v_staging_record.mapped_data->>'nav')::DECIMAL,
                COALESCE((v_staging_record.mapped_data->>'stamp_duty')::DECIMAL, 0),
                v_staging_record.id,
                p_session_id,
                v_is_duplicate,
                true,
                CASE WHEN v_is_duplicate 
                    THEN 'Duplicate transaction detected: same customer, scheme, date, amount, and type' 
                    ELSE NULL 
                END,
                v_staging_record.mapped_data->>'txn_description',
                v_staging_record.mapped_data->>'txn_source',
                COALESCE((v_staging_record.mapped_data->>'stt')::DECIMAL, 0),
                COALESCE((v_staging_record.mapped_data->>'tds')::DECIMAL, 0)
            );
            
            -- ================================================================
            -- STEP 7: UPDATE STAGING RECORD
            -- ================================================================
            UPDATE t_import_staging_data
            SET processing_status = CASE WHEN v_is_duplicate THEN 'duplicate' ELSE 'success' END,
                processed_at = clock_timestamp(),
                created_record_type = 'transaction',
                -- Store resolved scheme_code in metadata
                processing_metadata = jsonb_build_object(
                    'resolved_scheme_code', v_scheme_code,
                    'resolved_scheme_id', v_scheme_id,
                    'input_scheme_name', v_scheme_name_input
                )
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
        
        -- Update session progress every 10 records
        IF v_processed % 10 = 0 THEN
            UPDATE t_import_sessions
            SET processed_records = v_processed,
                successful_records = v_success,
                failed_records = v_failed,
                duplicate_records = v_duplicates,
                -- NEW: Track orphan count
                processing_metadata = COALESCE(processing_metadata, '{}'::jsonb) || 
                    jsonb_build_object('orphan_records', v_orphans)
            WHERE id = p_session_id;
        END IF;
        
        -- Sleep between batches
        IF v_processed % v_batch_size = 0 THEN
            PERFORM pg_sleep(v_sleep_per_batch);
        END IF;
    END LOOP;
    
    v_end_time := clock_timestamp();
    
    -- Final session update
    UPDATE t_import_sessions
    SET status = CASE 
            WHEN v_failed > 0 OR v_orphans > 0 THEN 'completed_with_errors'
            ELSE 'completed'
        END,
        processed_records = v_processed,
        successful_records = v_success,
        failed_records = v_failed,
        duplicate_records = v_duplicates,
        processing_completed_at = v_end_time,
        -- Store orphan count in metadata
        processing_metadata = COALESCE(processing_metadata, '{}'::jsonb) || 
            jsonb_build_object(
                'orphan_records', v_orphans,
                'total_records', v_total_rows,
                'orphan_percentage', ROUND((v_orphans::DECIMAL / NULLIF(v_total_rows, 0)) * 100, 2)
            )
    WHERE id = p_session_id;
    
    -- Refresh materialized view
    PERFORM refresh_portfolio_totals();
    
    RETURN QUERY SELECT 
        v_processed,
        v_success,
        v_failed,
        v_duplicates,
        v_orphans,
        EXTRACT(EPOCH FROM (v_end_time - v_start_time))::INTEGER * 1000;
END;
$$;


ALTER FUNCTION public.process_transaction_import_with_timing(p_session_id integer, p_target_duration_ms integer) OWNER TO kewal_admin;

--
-- Name: FUNCTION process_transaction_import_with_timing(p_session_id integer, p_target_duration_ms integer); Type: COMMENT; Schema: public; Owner: kewal_admin
--

COMMENT ON FUNCTION public.process_transaction_import_with_timing(p_session_id integer, p_target_duration_ms integer) IS 'Process transaction imports with scheme resolution via bookmarks. Handles orphan records when scheme not found. Returns: total_processed, successful, failed, duplicates, orphans, duration_ms.';


--
-- Name: refresh_portfolio_totals(); Type: FUNCTION; Schema: public; Owner: kewal_admin
--


-- ============================================================================
-- SECTION 7: CLEANUP FUNCTIONS
-- ============================================================================
DO $$ 
BEGIN
    RAISE NOTICE 'Creating Cleanup Functions...';
END $$;

CREATE FUNCTION public.cleanup_old_staging_data(p_days_to_keep integer DEFAULT 30) RETURNS jsonb
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


ALTER FUNCTION public.cleanup_old_staging_data(p_days_to_keep integer) OWNER TO kewal_admin;

--
-- Name: FUNCTION cleanup_old_staging_data(p_days_to_keep integer); Type: COMMENT; Schema: public; Owner: kewal_admin
--

COMMENT ON FUNCTION public.cleanup_old_staging_data(p_days_to_keep integer) IS 'Remove staging data older than specified days';

CREATE FUNCTION public.cleanup_session_staging_data(p_session_id integer, p_keep_failed_records boolean DEFAULT true) RETURNS void
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


ALTER FUNCTION public.cleanup_session_staging_data(p_session_id integer, p_keep_failed_records boolean) OWNER TO kewal_admin;

--
-- Name: FUNCTION cleanup_session_staging_data(p_session_id integer, p_keep_failed_records boolean); Type: COMMENT; Schema: public; Owner: kewal_admin
--

COMMENT ON FUNCTION public.cleanup_session_staging_data(p_session_id integer, p_keep_failed_records boolean) IS 'Clean up staging data for a completed session';

CREATE FUNCTION public.get_staging_storage_stats() RETURNS TABLE(total_sessions bigint, active_sessions bigint, completed_sessions bigint, total_staging_records bigint, pending_records bigint, processed_records bigint, failed_records bigint, total_size_estimate text, oldest_session_date timestamp without time zone, newest_session_date timestamp without time zone)
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


ALTER FUNCTION public.get_staging_storage_stats() OWNER TO kewal_admin;

--
-- Name: FUNCTION get_staging_storage_stats(); Type: COMMENT; Schema: public; Owner: kewal_admin
--

COMMENT ON FUNCTION public.get_staging_storage_stats() IS 'Get storage statistics for import staging tables';


-- ============================================================================
-- SECTION 8: BOOKMARK SEEDING FUNCTION
-- ============================================================================
DO $$ 
BEGIN
    RAISE NOTICE 'Creating Bookmark Seeding Function...';
END $$;

CREATE FUNCTION public.seed_bookmark_reasons_for_tenant(p_tenant_id integer, p_is_live boolean) RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
    INSERT INTO m_bookmark_reasons (
        tenant_id, 
        is_live, 
        reason_code, 
        reason_label, 
        display_order, 
        is_active
    )
    VALUES
        (p_tenant_id, p_is_live, 'VIP', 'VIP Customer', 1, true),
        (p_tenant_id, p_is_live, 'FOLLOW_UP', 'Follow-up Required', 2, true),
        (p_tenant_id, p_is_live, 'IMPORTANT', 'Important', 3, true),
        (p_tenant_id, p_is_live, 'HIGH_VALUE', 'High Value Client', 4, true),
        (p_tenant_id, p_is_live, 'ATTENTION', 'Requires Attention', 5, true),
        (p_tenant_id, p_is_live, 'PORTFOLIO_REVIEW', 'Portfolio Review Due', 6, true),
        (p_tenant_id, p_is_live, 'TAX_PLANNING', 'Tax Planning', 7, true),
        (p_tenant_id, p_is_live, 'OTHER', 'Other (Custom)', 99, true)
    ON CONFLICT (tenant_id, is_live, reason_code) DO NOTHING;
    
    RAISE NOTICE 'Seeded bookmark reasons for tenant_id=%, is_live=%', p_tenant_id, p_is_live;
END;
$$;


ALTER FUNCTION public.seed_bookmark_reasons_for_tenant(p_tenant_id integer, p_is_live boolean) OWNER TO kewal_admin;

--
-- Name: FUNCTION seed_bookmark_reasons_for_tenant(p_tenant_id integer, p_is_live boolean); Type: COMMENT; Schema: public; Owner: kewal_admin
--

COMMENT ON FUNCTION public.seed_bookmark_reasons_for_tenant(p_tenant_id integer, p_is_live boolean) IS 'Seed default bookmark reasons for a tenant and environment';


--
-- Name: update_market_updated_at(); Type: FUNCTION; Schema: public; Owner: kewal_admin
--


-- ============================================================================
-- SECTION 9: VIEWS
-- ============================================================================
DO $$ 
BEGIN
    RAISE NOTICE 'Creating Views...';
    RAISE NOTICE 'Total views: 5 (2 materialized, 3 regular)';
END $$;

CREATE MATERIALIZED VIEW public.t_customer_portfolio_totals AS
 SELECT p.tenant_id,
    p.is_live,
    p.customer_id,
    p.scheme_code,
    p.scheme_name,
    p.folio_no,
    p.category,
    p.sub_category,
    p.fund_name,
    p.start_date,
    count(DISTINCT t.id) AS transaction_count,
    count(DISTINCT
        CASE
            WHEN ((tt.txn_type)::text = 'Addition'::text) THEN t.id
            ELSE NULL::integer
        END) AS purchase_count,
    count(DISTINCT
        CASE
            WHEN ((tt.txn_type)::text = 'Deduction'::text) THEN t.id
            ELSE NULL::integer
        END) AS redemption_count,
    COALESCE(sum(
        CASE
            WHEN ((tt.txn_type)::text = 'Addition'::text) THEN t.units
            WHEN ((tt.txn_type)::text = 'Deduction'::text) THEN (- t.units)
            ELSE (0)::numeric
        END), (0)::numeric) AS total_units,
    (COALESCE(sum(
        CASE
            WHEN ((tt.txn_type)::text = 'Addition'::text) THEN t.total_amount
            ELSE (0)::numeric
        END), (0)::numeric) - COALESCE(sum(
        CASE
            WHEN ((tt.txn_type)::text = 'Deduction'::text) THEN t.total_amount
            ELSE (0)::numeric
        END), (0)::numeric)) AS total_invested,
    ( SELECT t_transaction_table.nav
           FROM public.t_transaction_table
          WHERE ((t_transaction_table.customer_id = p.customer_id) AND ((t_transaction_table.scheme_code)::text = (p.scheme_code)::text) AND (t_transaction_table.is_active = true))
          ORDER BY t_transaction_table.txn_date DESC
         LIMIT 1) AS latest_nav,
    (COALESCE(sum(
        CASE
            WHEN ((tt.txn_type)::text = 'Addition'::text) THEN t.units
            WHEN ((tt.txn_type)::text = 'Deduction'::text) THEN (- t.units)
            ELSE (0)::numeric
        END), (0)::numeric) * COALESCE(( SELECT t_transaction_table.nav
           FROM public.t_transaction_table
          WHERE ((t_transaction_table.customer_id = p.customer_id) AND ((t_transaction_table.scheme_code)::text = (p.scheme_code)::text) AND (t_transaction_table.is_active = true))
          ORDER BY t_transaction_table.txn_date DESC
         LIMIT 1), (0)::numeric)) AS current_value,
    ((COALESCE(sum(
        CASE
            WHEN ((tt.txn_type)::text = 'Addition'::text) THEN t.units
            WHEN ((tt.txn_type)::text = 'Deduction'::text) THEN (- t.units)
            ELSE (0)::numeric
        END), (0)::numeric) * COALESCE(( SELECT t_transaction_table.nav
           FROM public.t_transaction_table
          WHERE ((t_transaction_table.customer_id = p.customer_id) AND ((t_transaction_table.scheme_code)::text = (p.scheme_code)::text) AND (t_transaction_table.is_active = true))
          ORDER BY t_transaction_table.txn_date DESC
         LIMIT 1), (0)::numeric)) - (COALESCE(sum(
        CASE
            WHEN ((tt.txn_type)::text = 'Addition'::text) THEN t.total_amount
            ELSE (0)::numeric
        END), (0)::numeric) - COALESCE(sum(
        CASE
            WHEN ((tt.txn_type)::text = 'Deduction'::text) THEN t.total_amount
            ELSE (0)::numeric
        END), (0)::numeric))) AS total_returns,
        CASE
            WHEN ((COALESCE(sum(
            CASE
                WHEN ((tt.txn_type)::text = 'Addition'::text) THEN t.total_amount
                ELSE (0)::numeric
            END), (0)::numeric) - COALESCE(sum(
            CASE
                WHEN ((tt.txn_type)::text = 'Deduction'::text) THEN t.total_amount
                ELSE (0)::numeric
            END), (0)::numeric)) > (0)::numeric) THEN ((((COALESCE(sum(
            CASE
                WHEN ((tt.txn_type)::text = 'Addition'::text) THEN t.units
                WHEN ((tt.txn_type)::text = 'Deduction'::text) THEN (- t.units)
                ELSE (0)::numeric
            END), (0)::numeric) * COALESCE(( SELECT t_transaction_table.nav
               FROM public.t_transaction_table
              WHERE ((t_transaction_table.customer_id = p.customer_id) AND ((t_transaction_table.scheme_code)::text = (p.scheme_code)::text) AND (t_transaction_table.is_active = true))
              ORDER BY t_transaction_table.txn_date DESC
             LIMIT 1), (0)::numeric)) - (COALESCE(sum(
            CASE
                WHEN ((tt.txn_type)::text = 'Addition'::text) THEN t.total_amount
                ELSE (0)::numeric
            END), (0)::numeric) - COALESCE(sum(
            CASE
                WHEN ((tt.txn_type)::text = 'Deduction'::text) THEN t.total_amount
                ELSE (0)::numeric
            END), (0)::numeric))) / (COALESCE(sum(
            CASE
                WHEN ((tt.txn_type)::text = 'Addition'::text) THEN t.total_amount
                ELSE (0)::numeric
            END), (0)::numeric) - COALESCE(sum(
            CASE
                WHEN ((tt.txn_type)::text = 'Deduction'::text) THEN t.total_amount
                ELSE (0)::numeric
            END), (0)::numeric))) * (100)::numeric)
            ELSE (0)::numeric
        END AS return_percentage,
    max(t.txn_date) AS last_transaction_date,
    p.is_active,
    p.id AS portfolio_id,
    now() AS last_refreshed_at
   FROM ((public.t_customer_master_portfolio p
     LEFT JOIN public.t_transaction_table t ON (((t.customer_id = p.customer_id) AND ((t.scheme_code)::text = (p.scheme_code)::text) AND (t.tenant_id = p.tenant_id) AND (t.is_live = p.is_live) AND (t.is_active = true) AND (t.portfolio_flag = true))))
     LEFT JOIN public.m_transaction_types tt ON ((t.txn_type_id = tt.id)))
  WHERE (p.is_active = true)
  GROUP BY p.id, p.tenant_id, p.is_live, p.customer_id, p.scheme_code, p.scheme_name, p.folio_no, p.category, p.sub_category, p.fund_name, p.start_date, p.is_active
  WITH NO DATA;


ALTER MATERIALIZED VIEW public.t_customer_portfolio_totals OWNER TO kewal_admin;

--
-- Name: MATERIALIZED VIEW t_customer_portfolio_totals; Type: COMMENT; Schema: public; Owner: kewal_admin
--

COMMENT ON MATERIALIZED VIEW public.t_customer_portfolio_totals IS 'Pre-calculated portfolio totals with returns and performance metrics';

CREATE VIEW public.v_import_staging_statistics AS
 SELECT session_id,
    tenant_id,
    is_live,
    import_type,
    count(*) AS total_rows,
    count(*) FILTER (WHERE ((processing_status)::text = 'pending'::text)) AS pending_rows,
    count(*) FILTER (WHERE ((processing_status)::text = 'processing'::text)) AS processing_rows,
    count(*) FILTER (WHERE ((processing_status)::text = 'success'::text)) AS success_rows,
    count(*) FILTER (WHERE ((processing_status)::text = 'failed'::text)) AS failed_rows,
    count(*) FILTER (WHERE ((processing_status)::text = 'duplicate'::text)) AS duplicate_rows,
    count(*) FILTER (WHERE ((processing_status)::text = 'skipped'::text)) AS skipped_rows,
    min(created_at) AS staging_started_at,
    max(processed_at) AS last_processed_at,
    round((((count(*) FILTER (WHERE ((processing_status)::text = 'success'::text)))::numeric / (NULLIF(count(*), 0))::numeric) * (100)::numeric), 2) AS success_rate
   FROM public.t_import_staging_data
  GROUP BY session_id, tenant_id, is_live, import_type;


ALTER VIEW public.v_import_staging_statistics OWNER TO kewal_admin;

--
-- Name: VIEW v_import_staging_statistics; Type: COMMENT; Schema: public; Owner: kewal_admin
--

COMMENT ON VIEW public.v_import_staging_statistics IS 'Aggregated statistics for staging table by session';

CREATE VIEW public.v_import_staging_progress AS
 SELECT s.id AS session_id,
    s.session_name,
    s.import_type,
    s.status AS session_status,
    s.staging_total_rows,
    s.current_batch,
    s.total_batches,
    s.last_processed_row,
    COALESCE(st.pending_rows, (0)::bigint) AS pending_rows,
    COALESCE(st.processing_rows, (0)::bigint) AS processing_rows,
    COALESCE(st.success_rows, (0)::bigint) AS success_rows,
    COALESCE(st.failed_rows, (0)::bigint) AS failed_rows,
        CASE
            WHEN (s.staging_total_rows > 0) THEN round((((COALESCE(((st.success_rows + st.failed_rows) + st.skipped_rows), (0)::bigint))::numeric / (s.staging_total_rows)::numeric) * (100)::numeric), 2)
            ELSE (0)::numeric
        END AS completion_percentage,
    s.processing_started_at,
    s.staging_completed_at,
        CASE
            WHEN ((s.processing_started_at IS NOT NULL) AND (st.processing_rows > 0)) THEN (EXTRACT(epoch FROM (CURRENT_TIMESTAMP - (s.processing_started_at)::timestamp with time zone)) / (NULLIF((st.success_rows + st.failed_rows), 0))::numeric)
            ELSE NULL::numeric
        END AS avg_seconds_per_record
   FROM (public.t_import_sessions s
     LEFT JOIN public.v_import_staging_statistics st ON ((s.id = st.session_id)));


ALTER VIEW public.v_import_staging_progress OWNER TO kewal_admin;

--
-- Name: VIEW v_import_staging_progress; Type: COMMENT; Schema: public; Owner: kewal_admin
--

COMMENT ON VIEW public.v_import_staging_progress IS 'Real-time import progress monitoring view';

CREATE MATERIALIZED VIEW public.v_portfolio_current AS
 SELECT t.customer_id,
    t.tenant_id,
    t.scheme_code,
    p.scheme_name,
    p.category,
    p.sub_category,
    p.fund_name,
    sum(t.units) AS total_units,
    today_nav.nav_date AS today_nav_date,
    today_nav.nav_value AS today_nav,
    (sum(t.units) * today_nav.nav_value) AS scheme_value_today,
    month_end_nav.nav_date AS month_end_nav_date,
    month_end_nav.nav_value AS month_end_nav,
    (sum(t.units) * month_end_nav.nav_value) AS scheme_value_month_end,
    ((sum(t.units) * today_nav.nav_value) - (sum(t.units) * month_end_nav.nav_value)) AS scheme_value_change
   FROM (((public.t_transaction_table t
     LEFT JOIN public.t_customer_master_portfolio p ON (((t.customer_id = p.customer_id) AND ((t.scheme_code)::text = (p.scheme_code)::text) AND (t.tenant_id = p.tenant_id) AND (t.is_live = p.is_live))))
     LEFT JOIN LATERAL ( SELECT t_nav_data.nav_date,
            t_nav_data.nav_value
           FROM public.t_nav_data
          WHERE (((t_nav_data.scheme_code)::text = (t.scheme_code)::text) AND (t_nav_data.nav_date <= CURRENT_DATE) AND (t_nav_data.is_live = true))
          ORDER BY t_nav_data.nav_date DESC
         LIMIT 1) today_nav ON (true))
     LEFT JOIN LATERAL ( SELECT t_nav_data.nav_date,
            t_nav_data.nav_value
           FROM public.t_nav_data
          WHERE (((t_nav_data.scheme_code)::text = (t.scheme_code)::text) AND (t_nav_data.nav_date <= ((date_trunc('month'::text, (CURRENT_DATE)::timestamp with time zone) - '1 day'::interval))::date) AND (t_nav_data.is_live = true))
          ORDER BY t_nav_data.nav_date DESC
         LIMIT 1) month_end_nav ON (true))
  WHERE ((t.is_active = true) AND (t.portfolio_flag = true))
  GROUP BY t.customer_id, t.tenant_id, t.scheme_code, p.scheme_name, p.category, p.sub_category, p.fund_name, today_nav.nav_date, today_nav.nav_value, month_end_nav.nav_date, month_end_nav.nav_value
  WITH NO DATA;


ALTER MATERIALIZED VIEW public.v_portfolio_current OWNER TO kewal_admin;

CREATE VIEW public.v_tenant_customer_schemes AS
 SELECT tenant_id,
    is_live,
    scheme_code,
    scheme_name,
    count(DISTINCT customer_id) AS customer_count,
    count(*) AS transaction_count,
    sum(
        CASE
            WHEN (portfolio_flag = true) THEN total_amount
            ELSE (0)::numeric
        END) AS total_invested,
    max(txn_date) AS last_transaction_date,
    min(txn_date) AS first_transaction_date
   FROM public.t_transaction_table tt
  WHERE (is_active = true)
  GROUP BY tenant_id, is_live, scheme_code, scheme_name;


ALTER VIEW public.v_tenant_customer_schemes OWNER TO kewal_admin;

--
-- Name: VIEW v_tenant_customer_schemes; Type: COMMENT; Schema: public; Owner: kewal_admin
--

COMMENT ON VIEW public.v_tenant_customer_schemes IS 'Unique schemes from customer transactions - used for bookmark gap detection';


-- ============================================================================
-- SECTION 10: MATERIALIZED VIEW REFRESH FUNCTION
-- ============================================================================
DO $$ 
BEGIN
    RAISE NOTICE 'Creating Materialized View Refresh Function...';
END $$;

CREATE FUNCTION public.refresh_portfolio_totals() RETURNS void
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


ALTER FUNCTION public.refresh_portfolio_totals() OWNER TO kewal_admin;

--
-- Name: FUNCTION refresh_portfolio_totals(); Type: COMMENT; Schema: public; Owner: kewal_admin
--

COMMENT ON FUNCTION public.refresh_portfolio_totals() IS 'Refreshes the t_customer_portfolio_totals materialized view. Attempts concurrent refresh first.';


--
-- Name: seed_bookmark_reasons_for_tenant(integer, boolean); Type: FUNCTION; Schema: public; Owner: kewal_admin
--


-- ============================================================================
-- SECTION 11: ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================
DO $$ 
BEGIN
    RAISE NOTICE 'Creating Row Level Security Policies...';
END $$;

-- Enable RLS on core tables
ALTER TABLE t_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE t_chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE t_chat_messages ENABLE ROW LEVEL SECURITY;

-- Tenant Isolation Policies
CREATE POLICY tenant_isolation_users ON t_users
    FOR ALL
    USING (tenant_id = current_tenant_id());

CREATE POLICY tenant_isolation_chat_sessions ON t_chat_sessions
    FOR ALL
    USING (tenant_id = current_tenant_id());

CREATE POLICY tenant_isolation_chat_messages ON t_chat_messages
    FOR ALL
    USING (tenant_id = current_tenant_id());

-- Environment Filtering Policies
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
-- SECTION 12: GRANT PERMISSIONS
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

-- ============================================================================
-- SECTION 13: VERIFICATION & COMPLETION
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
    RAISE NOTICE 'COMPLETE REGENERATION with 100%% coverage';
    RAISE NOTICE 'Source: current_schema_utf8.sql';
    RAISE NOTICE 'All functions included (16 total)';
    RAISE NOTICE 'All views included (5 total)';
    RAISE NOTICE 'Missing from gap analysis: INCLUDED';
    RAISE NOTICE '  - 3 trigger functions (moved from file 03)';
    RAISE NOTICE '  - v_portfolio_current view';
    RAISE NOTICE '  - v_tenant_customer_schemes view';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Business logic ready!';
    RAISE NOTICE 'Next: Run 05_seed_data.sql';
    RAISE NOTICE '========================================';
END $$;
