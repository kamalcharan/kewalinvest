--
-- PostgreSQL database dump
--

\restrict 7s2wbljIDUM366A7IfXcKUpB8Ldbd7vMqYPU7aVksCs3oGPecgV8kYjezvMUwXf

-- Dumped from database version 16.10
-- Dumped by pg_dump version 16.10

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: n8n; Type: SCHEMA; Schema: -; Owner: kewal_admin
--

CREATE SCHEMA n8n;


ALTER SCHEMA n8n OWNER TO kewal_admin;

--
-- Name: pg_trgm; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA public;


--
-- Name: EXTENSION pg_trgm; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pg_trgm IS 'text similarity measurement and index searching based on trigrams';


--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA n8n;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: check_customer_duplicate(character varying, character varying, character varying); Type: FUNCTION; Schema: public; Owner: kewal_admin
--

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


--
-- Name: cleanup_old_staging_data(integer); Type: FUNCTION; Schema: public; Owner: kewal_admin
--

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


--
-- Name: cleanup_session_staging_data(integer, boolean); Type: FUNCTION; Schema: public; Owner: kewal_admin
--

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


--
-- Name: current_environment(); Type: FUNCTION; Schema: public; Owner: kewal_admin
--

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


--
-- Name: current_tenant_id(); Type: FUNCTION; Schema: public; Owner: kewal_admin
--

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


--
-- Name: get_staging_storage_stats(); Type: FUNCTION; Schema: public; Owner: kewal_admin
--

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


--
-- Name: process_customer_import_with_timing(integer, integer); Type: FUNCTION; Schema: public; Owner: kewal_admin
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

CREATE FUNCTION public.update_market_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_market_updated_at() OWNER TO kewal_admin;

--
-- Name: update_staging_updated_at(); Type: FUNCTION; Schema: public; Owner: kewal_admin
--

CREATE FUNCTION public.update_staging_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_staging_updated_at() OWNER TO kewal_admin;

--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: kewal_admin
--

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


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: annotation_tag_entity; Type: TABLE; Schema: n8n; Owner: kewal_admin
--

CREATE TABLE n8n.annotation_tag_entity (
    id character varying(16) NOT NULL,
    name character varying(24) NOT NULL,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP(3) NOT NULL,
    "updatedAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP(3) NOT NULL
);


ALTER TABLE n8n.annotation_tag_entity OWNER TO kewal_admin;

--
-- Name: auth_identity; Type: TABLE; Schema: n8n; Owner: kewal_admin
--

CREATE TABLE n8n.auth_identity (
    "userId" uuid,
    "providerId" character varying(64) NOT NULL,
    "providerType" character varying(32) NOT NULL,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP(3) NOT NULL,
    "updatedAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP(3) NOT NULL
);


ALTER TABLE n8n.auth_identity OWNER TO kewal_admin;

--
-- Name: auth_provider_sync_history; Type: TABLE; Schema: n8n; Owner: kewal_admin
--

CREATE TABLE n8n.auth_provider_sync_history (
    id integer NOT NULL,
    "providerType" character varying(32) NOT NULL,
    "runMode" text NOT NULL,
    status text NOT NULL,
    "startedAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "endedAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    scanned integer NOT NULL,
    created integer NOT NULL,
    updated integer NOT NULL,
    disabled integer NOT NULL,
    error text
);


ALTER TABLE n8n.auth_provider_sync_history OWNER TO kewal_admin;

--
-- Name: auth_provider_sync_history_id_seq; Type: SEQUENCE; Schema: n8n; Owner: kewal_admin
--

CREATE SEQUENCE n8n.auth_provider_sync_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE n8n.auth_provider_sync_history_id_seq OWNER TO kewal_admin;

--
-- Name: auth_provider_sync_history_id_seq; Type: SEQUENCE OWNED BY; Schema: n8n; Owner: kewal_admin
--

ALTER SEQUENCE n8n.auth_provider_sync_history_id_seq OWNED BY n8n.auth_provider_sync_history.id;


--
-- Name: credentials_entity; Type: TABLE; Schema: n8n; Owner: kewal_admin
--

CREATE TABLE n8n.credentials_entity (
    name character varying(128) NOT NULL,
    data text NOT NULL,
    type character varying(128) NOT NULL,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP(3) NOT NULL,
    "updatedAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP(3) NOT NULL,
    id character varying(36) NOT NULL,
    "isManaged" boolean DEFAULT false NOT NULL
);


ALTER TABLE n8n.credentials_entity OWNER TO kewal_admin;

--
-- Name: data_table; Type: TABLE; Schema: n8n; Owner: kewal_admin
--

CREATE TABLE n8n.data_table (
    id character varying(36) NOT NULL,
    name character varying(128) NOT NULL,
    "projectId" character varying(36) NOT NULL,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP(3) NOT NULL,
    "updatedAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP(3) NOT NULL
);


ALTER TABLE n8n.data_table OWNER TO kewal_admin;

--
-- Name: data_table_column; Type: TABLE; Schema: n8n; Owner: kewal_admin
--

CREATE TABLE n8n.data_table_column (
    id character varying(36) NOT NULL,
    name character varying(128) NOT NULL,
    type character varying(32) NOT NULL,
    index integer NOT NULL,
    "dataTableId" character varying(36) NOT NULL,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP(3) NOT NULL,
    "updatedAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP(3) NOT NULL
);


ALTER TABLE n8n.data_table_column OWNER TO kewal_admin;

--
-- Name: COLUMN data_table_column.type; Type: COMMENT; Schema: n8n; Owner: kewal_admin
--

COMMENT ON COLUMN n8n.data_table_column.type IS 'Expected: string, number, boolean, or date (not enforced as a constraint)';


--
-- Name: COLUMN data_table_column.index; Type: COMMENT; Schema: n8n; Owner: kewal_admin
--

COMMENT ON COLUMN n8n.data_table_column.index IS 'Column order, starting from 0 (0 = first column)';


--
-- Name: event_destinations; Type: TABLE; Schema: n8n; Owner: kewal_admin
--

CREATE TABLE n8n.event_destinations (
    id uuid NOT NULL,
    destination jsonb NOT NULL,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP(3) NOT NULL,
    "updatedAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP(3) NOT NULL
);


ALTER TABLE n8n.event_destinations OWNER TO kewal_admin;

--
-- Name: execution_annotation_tags; Type: TABLE; Schema: n8n; Owner: kewal_admin
--

CREATE TABLE n8n.execution_annotation_tags (
    "annotationId" integer NOT NULL,
    "tagId" character varying(24) NOT NULL
);


ALTER TABLE n8n.execution_annotation_tags OWNER TO kewal_admin;

--
-- Name: execution_annotations; Type: TABLE; Schema: n8n; Owner: kewal_admin
--

CREATE TABLE n8n.execution_annotations (
    id integer NOT NULL,
    "executionId" integer NOT NULL,
    vote character varying(6),
    note text,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP(3) NOT NULL,
    "updatedAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP(3) NOT NULL
);


ALTER TABLE n8n.execution_annotations OWNER TO kewal_admin;

--
-- Name: execution_annotations_id_seq; Type: SEQUENCE; Schema: n8n; Owner: kewal_admin
--

CREATE SEQUENCE n8n.execution_annotations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE n8n.execution_annotations_id_seq OWNER TO kewal_admin;

--
-- Name: execution_annotations_id_seq; Type: SEQUENCE OWNED BY; Schema: n8n; Owner: kewal_admin
--

ALTER SEQUENCE n8n.execution_annotations_id_seq OWNED BY n8n.execution_annotations.id;


--
-- Name: execution_data; Type: TABLE; Schema: n8n; Owner: kewal_admin
--

CREATE TABLE n8n.execution_data (
    "executionId" integer NOT NULL,
    "workflowData" json NOT NULL,
    data text NOT NULL
);


ALTER TABLE n8n.execution_data OWNER TO kewal_admin;

--
-- Name: execution_entity; Type: TABLE; Schema: n8n; Owner: kewal_admin
--

CREATE TABLE n8n.execution_entity (
    id integer NOT NULL,
    finished boolean NOT NULL,
    mode character varying NOT NULL,
    "retryOf" character varying,
    "retrySuccessId" character varying,
    "startedAt" timestamp(3) with time zone,
    "stoppedAt" timestamp(3) with time zone,
    "waitTill" timestamp(3) with time zone,
    status character varying NOT NULL,
    "workflowId" character varying(36) NOT NULL,
    "deletedAt" timestamp(3) with time zone,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP(3) NOT NULL
);


ALTER TABLE n8n.execution_entity OWNER TO kewal_admin;

--
-- Name: execution_entity_id_seq; Type: SEQUENCE; Schema: n8n; Owner: kewal_admin
--

CREATE SEQUENCE n8n.execution_entity_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE n8n.execution_entity_id_seq OWNER TO kewal_admin;

--
-- Name: execution_entity_id_seq; Type: SEQUENCE OWNED BY; Schema: n8n; Owner: kewal_admin
--

ALTER SEQUENCE n8n.execution_entity_id_seq OWNED BY n8n.execution_entity.id;


--
-- Name: execution_metadata; Type: TABLE; Schema: n8n; Owner: kewal_admin
--

CREATE TABLE n8n.execution_metadata (
    id integer NOT NULL,
    "executionId" integer NOT NULL,
    key character varying(255) NOT NULL,
    value text NOT NULL
);


ALTER TABLE n8n.execution_metadata OWNER TO kewal_admin;

--
-- Name: execution_metadata_temp_id_seq; Type: SEQUENCE; Schema: n8n; Owner: kewal_admin
--

CREATE SEQUENCE n8n.execution_metadata_temp_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE n8n.execution_metadata_temp_id_seq OWNER TO kewal_admin;

--
-- Name: execution_metadata_temp_id_seq; Type: SEQUENCE OWNED BY; Schema: n8n; Owner: kewal_admin
--

ALTER SEQUENCE n8n.execution_metadata_temp_id_seq OWNED BY n8n.execution_metadata.id;


--
-- Name: folder; Type: TABLE; Schema: n8n; Owner: kewal_admin
--

CREATE TABLE n8n.folder (
    id character varying(36) NOT NULL,
    name character varying(128) NOT NULL,
    "parentFolderId" character varying(36),
    "projectId" character varying(36) NOT NULL,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP(3) NOT NULL,
    "updatedAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP(3) NOT NULL
);


ALTER TABLE n8n.folder OWNER TO kewal_admin;

--
-- Name: folder_tag; Type: TABLE; Schema: n8n; Owner: kewal_admin
--

CREATE TABLE n8n.folder_tag (
    "folderId" character varying(36) NOT NULL,
    "tagId" character varying(36) NOT NULL
);


ALTER TABLE n8n.folder_tag OWNER TO kewal_admin;

--
-- Name: insights_by_period; Type: TABLE; Schema: n8n; Owner: kewal_admin
--

CREATE TABLE n8n.insights_by_period (
    id integer NOT NULL,
    "metaId" integer NOT NULL,
    type integer NOT NULL,
    value integer NOT NULL,
    "periodUnit" integer NOT NULL,
    "periodStart" timestamp(0) with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE n8n.insights_by_period OWNER TO kewal_admin;

--
-- Name: COLUMN insights_by_period.type; Type: COMMENT; Schema: n8n; Owner: kewal_admin
--

COMMENT ON COLUMN n8n.insights_by_period.type IS '0: time_saved_minutes, 1: runtime_milliseconds, 2: success, 3: failure';


--
-- Name: COLUMN insights_by_period."periodUnit"; Type: COMMENT; Schema: n8n; Owner: kewal_admin
--

COMMENT ON COLUMN n8n.insights_by_period."periodUnit" IS '0: hour, 1: day, 2: week';


--
-- Name: insights_by_period_id_seq; Type: SEQUENCE; Schema: n8n; Owner: kewal_admin
--

ALTER TABLE n8n.insights_by_period ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME n8n.insights_by_period_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: insights_metadata; Type: TABLE; Schema: n8n; Owner: kewal_admin
--

CREATE TABLE n8n.insights_metadata (
    "metaId" integer NOT NULL,
    "workflowId" character varying(16),
    "projectId" character varying(36),
    "workflowName" character varying(128) NOT NULL,
    "projectName" character varying(255) NOT NULL
);


ALTER TABLE n8n.insights_metadata OWNER TO kewal_admin;

--
-- Name: insights_metadata_metaId_seq; Type: SEQUENCE; Schema: n8n; Owner: kewal_admin
--

ALTER TABLE n8n.insights_metadata ALTER COLUMN "metaId" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME n8n."insights_metadata_metaId_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: insights_raw; Type: TABLE; Schema: n8n; Owner: kewal_admin
--

CREATE TABLE n8n.insights_raw (
    id integer NOT NULL,
    "metaId" integer NOT NULL,
    type integer NOT NULL,
    value integer NOT NULL,
    "timestamp" timestamp(0) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE n8n.insights_raw OWNER TO kewal_admin;

--
-- Name: COLUMN insights_raw.type; Type: COMMENT; Schema: n8n; Owner: kewal_admin
--

COMMENT ON COLUMN n8n.insights_raw.type IS '0: time_saved_minutes, 1: runtime_milliseconds, 2: success, 3: failure';


--
-- Name: insights_raw_id_seq; Type: SEQUENCE; Schema: n8n; Owner: kewal_admin
--

ALTER TABLE n8n.insights_raw ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME n8n.insights_raw_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: installed_nodes; Type: TABLE; Schema: n8n; Owner: kewal_admin
--

CREATE TABLE n8n.installed_nodes (
    name character varying(200) NOT NULL,
    type character varying(200) NOT NULL,
    "latestVersion" integer DEFAULT 1 NOT NULL,
    package character varying(241) NOT NULL
);


ALTER TABLE n8n.installed_nodes OWNER TO kewal_admin;

--
-- Name: installed_packages; Type: TABLE; Schema: n8n; Owner: kewal_admin
--

CREATE TABLE n8n.installed_packages (
    "packageName" character varying(214) NOT NULL,
    "installedVersion" character varying(50) NOT NULL,
    "authorName" character varying(70),
    "authorEmail" character varying(70),
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP(3) NOT NULL,
    "updatedAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP(3) NOT NULL
);


ALTER TABLE n8n.installed_packages OWNER TO kewal_admin;

--
-- Name: invalid_auth_token; Type: TABLE; Schema: n8n; Owner: kewal_admin
--

CREATE TABLE n8n.invalid_auth_token (
    token character varying(512) NOT NULL,
    "expiresAt" timestamp(3) with time zone NOT NULL
);


ALTER TABLE n8n.invalid_auth_token OWNER TO kewal_admin;

--
-- Name: migrations; Type: TABLE; Schema: n8n; Owner: kewal_admin
--

CREATE TABLE n8n.migrations (
    id integer NOT NULL,
    "timestamp" bigint NOT NULL,
    name character varying NOT NULL
);


ALTER TABLE n8n.migrations OWNER TO kewal_admin;

--
-- Name: migrations_id_seq; Type: SEQUENCE; Schema: n8n; Owner: kewal_admin
--

CREATE SEQUENCE n8n.migrations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE n8n.migrations_id_seq OWNER TO kewal_admin;

--
-- Name: migrations_id_seq; Type: SEQUENCE OWNED BY; Schema: n8n; Owner: kewal_admin
--

ALTER SEQUENCE n8n.migrations_id_seq OWNED BY n8n.migrations.id;


--
-- Name: processed_data; Type: TABLE; Schema: n8n; Owner: kewal_admin
--

CREATE TABLE n8n.processed_data (
    "workflowId" character varying(36) NOT NULL,
    context character varying(255) NOT NULL,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP(3) NOT NULL,
    "updatedAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP(3) NOT NULL,
    value text NOT NULL
);


ALTER TABLE n8n.processed_data OWNER TO kewal_admin;

--
-- Name: project; Type: TABLE; Schema: n8n; Owner: kewal_admin
--

CREATE TABLE n8n.project (
    id character varying(36) NOT NULL,
    name character varying(255) NOT NULL,
    type character varying(36) NOT NULL,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP(3) NOT NULL,
    "updatedAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP(3) NOT NULL,
    icon json,
    description character varying(512)
);


ALTER TABLE n8n.project OWNER TO kewal_admin;

--
-- Name: project_relation; Type: TABLE; Schema: n8n; Owner: kewal_admin
--

CREATE TABLE n8n.project_relation (
    "projectId" character varying(36) NOT NULL,
    "userId" uuid NOT NULL,
    role character varying NOT NULL,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP(3) NOT NULL,
    "updatedAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP(3) NOT NULL
);


ALTER TABLE n8n.project_relation OWNER TO kewal_admin;

--
-- Name: role; Type: TABLE; Schema: n8n; Owner: kewal_admin
--

CREATE TABLE n8n.role (
    slug character varying(128) NOT NULL,
    "displayName" text,
    description text,
    "roleType" text,
    "systemRole" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP(3) NOT NULL,
    "updatedAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP(3) NOT NULL
);


ALTER TABLE n8n.role OWNER TO kewal_admin;

--
-- Name: COLUMN role.slug; Type: COMMENT; Schema: n8n; Owner: kewal_admin
--

COMMENT ON COLUMN n8n.role.slug IS 'Unique identifier of the role for example: "global:owner"';


--
-- Name: COLUMN role."displayName"; Type: COMMENT; Schema: n8n; Owner: kewal_admin
--

COMMENT ON COLUMN n8n.role."displayName" IS 'Name used to display in the UI';


--
-- Name: COLUMN role.description; Type: COMMENT; Schema: n8n; Owner: kewal_admin
--

COMMENT ON COLUMN n8n.role.description IS 'Text describing the scope in more detail of users';


--
-- Name: COLUMN role."roleType"; Type: COMMENT; Schema: n8n; Owner: kewal_admin
--

COMMENT ON COLUMN n8n.role."roleType" IS 'Type of the role, e.g., global, project, or workflow';


--
-- Name: COLUMN role."systemRole"; Type: COMMENT; Schema: n8n; Owner: kewal_admin
--

COMMENT ON COLUMN n8n.role."systemRole" IS 'Indicates if the role is managed by the system and cannot be edited';


--
-- Name: role_scope; Type: TABLE; Schema: n8n; Owner: kewal_admin
--

CREATE TABLE n8n.role_scope (
    "roleSlug" character varying(128) NOT NULL,
    "scopeSlug" character varying(128) NOT NULL
);


ALTER TABLE n8n.role_scope OWNER TO kewal_admin;

--
-- Name: scope; Type: TABLE; Schema: n8n; Owner: kewal_admin
--

CREATE TABLE n8n.scope (
    slug character varying(128) NOT NULL,
    "displayName" text,
    description text
);


ALTER TABLE n8n.scope OWNER TO kewal_admin;

--
-- Name: COLUMN scope.slug; Type: COMMENT; Schema: n8n; Owner: kewal_admin
--

COMMENT ON COLUMN n8n.scope.slug IS 'Unique identifier of the scope for example: "project:create"';


--
-- Name: COLUMN scope."displayName"; Type: COMMENT; Schema: n8n; Owner: kewal_admin
--

COMMENT ON COLUMN n8n.scope."displayName" IS 'Name used to display in the UI';


--
-- Name: COLUMN scope.description; Type: COMMENT; Schema: n8n; Owner: kewal_admin
--

COMMENT ON COLUMN n8n.scope.description IS 'Text describing the scope in more detail of users';


--
-- Name: settings; Type: TABLE; Schema: n8n; Owner: kewal_admin
--

CREATE TABLE n8n.settings (
    key character varying(255) NOT NULL,
    value text NOT NULL,
    "loadOnStartup" boolean DEFAULT false NOT NULL
);


ALTER TABLE n8n.settings OWNER TO kewal_admin;

--
-- Name: shared_credentials; Type: TABLE; Schema: n8n; Owner: kewal_admin
--

CREATE TABLE n8n.shared_credentials (
    "credentialsId" character varying(36) NOT NULL,
    "projectId" character varying(36) NOT NULL,
    role text NOT NULL,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP(3) NOT NULL,
    "updatedAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP(3) NOT NULL
);


ALTER TABLE n8n.shared_credentials OWNER TO kewal_admin;

--
-- Name: shared_workflow; Type: TABLE; Schema: n8n; Owner: kewal_admin
--

CREATE TABLE n8n.shared_workflow (
    "workflowId" character varying(36) NOT NULL,
    "projectId" character varying(36) NOT NULL,
    role text NOT NULL,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP(3) NOT NULL,
    "updatedAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP(3) NOT NULL
);


ALTER TABLE n8n.shared_workflow OWNER TO kewal_admin;

--
-- Name: tag_entity; Type: TABLE; Schema: n8n; Owner: kewal_admin
--

CREATE TABLE n8n.tag_entity (
    name character varying(24) NOT NULL,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP(3) NOT NULL,
    "updatedAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP(3) NOT NULL,
    id character varying(36) NOT NULL
);


ALTER TABLE n8n.tag_entity OWNER TO kewal_admin;

--
-- Name: test_case_execution; Type: TABLE; Schema: n8n; Owner: kewal_admin
--

CREATE TABLE n8n.test_case_execution (
    id character varying(36) NOT NULL,
    "testRunId" character varying(36) NOT NULL,
    "executionId" integer,
    status character varying NOT NULL,
    "runAt" timestamp(3) with time zone,
    "completedAt" timestamp(3) with time zone,
    "errorCode" character varying,
    "errorDetails" json,
    metrics json,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP(3) NOT NULL,
    "updatedAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP(3) NOT NULL,
    inputs json,
    outputs json
);


ALTER TABLE n8n.test_case_execution OWNER TO kewal_admin;

--
-- Name: test_run; Type: TABLE; Schema: n8n; Owner: kewal_admin
--

CREATE TABLE n8n.test_run (
    id character varying(36) NOT NULL,
    "workflowId" character varying(36) NOT NULL,
    status character varying NOT NULL,
    "errorCode" character varying,
    "errorDetails" json,
    "runAt" timestamp(3) with time zone,
    "completedAt" timestamp(3) with time zone,
    metrics json,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP(3) NOT NULL,
    "updatedAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP(3) NOT NULL
);


ALTER TABLE n8n.test_run OWNER TO kewal_admin;

--
-- Name: user; Type: TABLE; Schema: n8n; Owner: kewal_admin
--

CREATE TABLE n8n."user" (
    id uuid DEFAULT uuid_in((OVERLAY(OVERLAY(md5((((random())::text || ':'::text) || (clock_timestamp())::text)) PLACING '4'::text FROM 13) PLACING to_hex((floor(((random() * (((11 - 8) + 1))::double precision) + (8)::double precision)))::integer) FROM 17))::cstring) NOT NULL,
    email character varying(255),
    "firstName" character varying(32),
    "lastName" character varying(32),
    password character varying(255),
    "personalizationAnswers" json,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP(3) NOT NULL,
    "updatedAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP(3) NOT NULL,
    settings json,
    disabled boolean DEFAULT false NOT NULL,
    "mfaEnabled" boolean DEFAULT false NOT NULL,
    "mfaSecret" text,
    "mfaRecoveryCodes" text,
    "lastActiveAt" date,
    "roleSlug" character varying(128) DEFAULT 'global:member'::character varying NOT NULL
);


ALTER TABLE n8n."user" OWNER TO kewal_admin;

--
-- Name: user_api_keys; Type: TABLE; Schema: n8n; Owner: kewal_admin
--

CREATE TABLE n8n.user_api_keys (
    id character varying(36) NOT NULL,
    "userId" uuid NOT NULL,
    label character varying(100) NOT NULL,
    "apiKey" character varying NOT NULL,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP(3) NOT NULL,
    "updatedAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP(3) NOT NULL,
    scopes json
);


ALTER TABLE n8n.user_api_keys OWNER TO kewal_admin;

--
-- Name: variables; Type: TABLE; Schema: n8n; Owner: kewal_admin
--

CREATE TABLE n8n.variables (
    key character varying(50) NOT NULL,
    type character varying(50) DEFAULT 'string'::character varying NOT NULL,
    value character varying(255),
    id character varying(36) NOT NULL
);


ALTER TABLE n8n.variables OWNER TO kewal_admin;

--
-- Name: webhook_entity; Type: TABLE; Schema: n8n; Owner: kewal_admin
--

CREATE TABLE n8n.webhook_entity (
    "webhookPath" character varying NOT NULL,
    method character varying NOT NULL,
    node character varying NOT NULL,
    "webhookId" character varying,
    "pathLength" integer,
    "workflowId" character varying(36) NOT NULL
);


ALTER TABLE n8n.webhook_entity OWNER TO kewal_admin;

--
-- Name: workflow_entity; Type: TABLE; Schema: n8n; Owner: kewal_admin
--

CREATE TABLE n8n.workflow_entity (
    name character varying(128) NOT NULL,
    active boolean NOT NULL,
    nodes json NOT NULL,
    connections json NOT NULL,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP(3) NOT NULL,
    "updatedAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP(3) NOT NULL,
    settings json,
    "staticData" json,
    "pinData" json,
    "versionId" character(36),
    "triggerCount" integer DEFAULT 0 NOT NULL,
    id character varying(36) NOT NULL,
    meta json,
    "parentFolderId" character varying(36) DEFAULT NULL::character varying,
    "isArchived" boolean DEFAULT false NOT NULL
);


ALTER TABLE n8n.workflow_entity OWNER TO kewal_admin;

--
-- Name: workflow_history; Type: TABLE; Schema: n8n; Owner: kewal_admin
--

CREATE TABLE n8n.workflow_history (
    "versionId" character varying(36) NOT NULL,
    "workflowId" character varying(36) NOT NULL,
    authors character varying(255) NOT NULL,
    "createdAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP(3) NOT NULL,
    "updatedAt" timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP(3) NOT NULL,
    nodes json NOT NULL,
    connections json NOT NULL
);


ALTER TABLE n8n.workflow_history OWNER TO kewal_admin;

--
-- Name: workflow_statistics; Type: TABLE; Schema: n8n; Owner: kewal_admin
--

CREATE TABLE n8n.workflow_statistics (
    count integer DEFAULT 0,
    "latestEvent" timestamp(3) with time zone,
    name character varying(128) NOT NULL,
    "workflowId" character varying(36) NOT NULL,
    "rootCount" integer DEFAULT 0
);


ALTER TABLE n8n.workflow_statistics OWNER TO kewal_admin;

--
-- Name: workflows_tags; Type: TABLE; Schema: n8n; Owner: kewal_admin
--

CREATE TABLE n8n.workflows_tags (
    "workflowId" character varying(36) NOT NULL,
    "tagId" character varying(36) NOT NULL
);


ALTER TABLE n8n.workflows_tags OWNER TO kewal_admin;

--
-- Name: m_bookmark_reasons; Type: TABLE; Schema: public; Owner: kewal_admin
--

CREATE TABLE public.m_bookmark_reasons (
    id integer NOT NULL,
    tenant_id integer NOT NULL,
    is_live boolean DEFAULT true NOT NULL,
    reason_code character varying(50) NOT NULL,
    reason_label character varying(100) NOT NULL,
    display_order integer DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.m_bookmark_reasons OWNER TO kewal_admin;

--
-- Name: TABLE m_bookmark_reasons; Type: COMMENT; Schema: public; Owner: kewal_admin
--

COMMENT ON TABLE public.m_bookmark_reasons IS 'Tenant-specific bookmark reason master data - managed via backend';


--
-- Name: COLUMN m_bookmark_reasons.reason_code; Type: COMMENT; Schema: public; Owner: kewal_admin
--

COMMENT ON COLUMN public.m_bookmark_reasons.reason_code IS 'Unique code within tenant (e.g., VIP, FOLLOW_UP)';


--
-- Name: COLUMN m_bookmark_reasons.reason_label; Type: COMMENT; Schema: public; Owner: kewal_admin
--

COMMENT ON COLUMN public.m_bookmark_reasons.reason_label IS 'Display label for UI (e.g., VIP Customer)';


--
-- Name: COLUMN m_bookmark_reasons.display_order; Type: COMMENT; Schema: public; Owner: kewal_admin
--

COMMENT ON COLUMN public.m_bookmark_reasons.display_order IS 'Sort order in dropdown (lower = higher priority)';


--
-- Name: m_bookmark_reasons_id_seq; Type: SEQUENCE; Schema: public; Owner: kewal_admin
--

CREATE SEQUENCE public.m_bookmark_reasons_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.m_bookmark_reasons_id_seq OWNER TO kewal_admin;

--
-- Name: m_bookmark_reasons_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: kewal_admin
--

ALTER SEQUENCE public.m_bookmark_reasons_id_seq OWNED BY public.m_bookmark_reasons.id;


--
-- Name: m_transaction_types; Type: TABLE; Schema: public; Owner: kewal_admin
--

CREATE TABLE public.m_transaction_types (
    id integer NOT NULL,
    txn_code character varying(50) NOT NULL,
    txn_name character varying(255) NOT NULL,
    txn_type character varying(50) NOT NULL,
    is_active boolean DEFAULT true,
    description text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT m_transaction_types_txn_type_check CHECK (((txn_type)::text = ANY ((ARRAY['Addition'::character varying, 'Deduction'::character varying])::text[])))
);


ALTER TABLE public.m_transaction_types OWNER TO kewal_admin;

--
-- Name: TABLE m_transaction_types; Type: COMMENT; Schema: public; Owner: kewal_admin
--

COMMENT ON TABLE public.m_transaction_types IS 'Master data for transaction types (SIP, Purchase, Redemption, etc.)';


--
-- Name: COLUMN m_transaction_types.txn_code; Type: COMMENT; Schema: public; Owner: kewal_admin
--

COMMENT ON COLUMN public.m_transaction_types.txn_code IS 'Unique transaction code (e.g., SIP, PURCHASE)';


--
-- Name: COLUMN m_transaction_types.txn_name; Type: COMMENT; Schema: public; Owner: kewal_admin
--

COMMENT ON COLUMN public.m_transaction_types.txn_name IS 'Full name of transaction type';


--
-- Name: COLUMN m_transaction_types.txn_type; Type: COMMENT; Schema: public; Owner: kewal_admin
--

COMMENT ON COLUMN public.m_transaction_types.txn_type IS 'Addition or Deduction type';


--
-- Name: m_transaction_types_id_seq; Type: SEQUENCE; Schema: public; Owner: kewal_admin
--

CREATE SEQUENCE public.m_transaction_types_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.m_transaction_types_id_seq OWNER TO kewal_admin;

--
-- Name: m_transaction_types_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: kewal_admin
--

ALTER SEQUENCE public.m_transaction_types_id_seq OWNED BY public.m_transaction_types.id;


--
-- Name: t_chat_messages; Type: TABLE; Schema: public; Owner: kewal_admin
--

CREATE TABLE public.t_chat_messages (
    id integer NOT NULL,
    tenant_id integer DEFAULT 1,
    session_id integer,
    message_type character varying(20) NOT NULL,
    content text NOT NULL,
    metadata jsonb,
    is_live boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.t_chat_messages OWNER TO kewal_admin;

--
-- Name: TABLE t_chat_messages; Type: COMMENT; Schema: public; Owner: kewal_admin
--

COMMENT ON TABLE public.t_chat_messages IS 'Individual messages in AI chat sessions';


--
-- Name: COLUMN t_chat_messages.message_type; Type: COMMENT; Schema: public; Owner: kewal_admin
--

COMMENT ON COLUMN public.t_chat_messages.message_type IS 'Type: user, assistant, system';


--
-- Name: t_chat_messages_id_seq; Type: SEQUENCE; Schema: public; Owner: kewal_admin
--

CREATE SEQUENCE public.t_chat_messages_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.t_chat_messages_id_seq OWNER TO kewal_admin;

--
-- Name: t_chat_messages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: kewal_admin
--

ALTER SEQUENCE public.t_chat_messages_id_seq OWNED BY public.t_chat_messages.id;


--
-- Name: t_chat_sessions; Type: TABLE; Schema: public; Owner: kewal_admin
--

CREATE TABLE public.t_chat_sessions (
    id integer NOT NULL,
    tenant_id integer DEFAULT 1,
    user_id integer,
    session_name character varying(255),
    is_live boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_tenant_consistency CHECK (((tenant_id IS NOT NULL) AND (user_id IS NOT NULL)))
);


ALTER TABLE public.t_chat_sessions OWNER TO kewal_admin;

--
-- Name: TABLE t_chat_sessions; Type: COMMENT; Schema: public; Owner: kewal_admin
--

COMMENT ON TABLE public.t_chat_sessions IS 'AI chat conversation sessions for tracking context';


--
-- Name: t_chat_sessions_id_seq; Type: SEQUENCE; Schema: public; Owner: kewal_admin
--

CREATE SEQUENCE public.t_chat_sessions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.t_chat_sessions_id_seq OWNER TO kewal_admin;

--
-- Name: t_chat_sessions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: kewal_admin
--

ALTER SEQUENCE public.t_chat_sessions_id_seq OWNED BY public.t_chat_sessions.id;


--
-- Name: t_contact_channels; Type: TABLE; Schema: public; Owner: kewal_admin
--

CREATE TABLE public.t_contact_channels (
    id integer NOT NULL,
    contact_id integer,
    tenant_id integer DEFAULT 1,
    is_live boolean DEFAULT true,
    is_active boolean DEFAULT true,
    channel_type character varying(50) NOT NULL,
    channel_value character varying(255) NOT NULL,
    channel_subtype character varying(50) DEFAULT 'personal'::character varying,
    is_primary boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT t_contact_channels_channel_subtype_check CHECK (((channel_subtype)::text = ANY ((ARRAY['personal'::character varying, 'work'::character varying, 'other'::character varying])::text[]))),
    CONSTRAINT t_contact_channels_channel_type_check CHECK (((channel_type)::text = ANY ((ARRAY['email'::character varying, 'mobile'::character varying, 'whatsapp'::character varying, 'instagram'::character varying, 'twitter'::character varying, 'linkedin'::character varying, 'other'::character varying])::text[])))
);


ALTER TABLE public.t_contact_channels OWNER TO kewal_admin;

--
-- Name: TABLE t_contact_channels; Type: COMMENT; Schema: public; Owner: kewal_admin
--

COMMENT ON TABLE public.t_contact_channels IS 'Flexible communication channels for contacts';


--
-- Name: COLUMN t_contact_channels.channel_type; Type: COMMENT; Schema: public; Owner: kewal_admin
--

COMMENT ON COLUMN public.t_contact_channels.channel_type IS 'Type: email, mobile, whatsapp, social media';


--
-- Name: COLUMN t_contact_channels.is_primary; Type: COMMENT; Schema: public; Owner: kewal_admin
--

COMMENT ON COLUMN public.t_contact_channels.is_primary IS 'Primary channel for this type';


--
-- Name: t_contact_channels_id_seq; Type: SEQUENCE; Schema: public; Owner: kewal_admin
--

CREATE SEQUENCE public.t_contact_channels_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.t_contact_channels_id_seq OWNER TO kewal_admin;

--
-- Name: t_contact_channels_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: kewal_admin
--

ALTER SEQUENCE public.t_contact_channels_id_seq OWNED BY public.t_contact_channels.id;


--
-- Name: t_contacts; Type: TABLE; Schema: public; Owner: kewal_admin
--

CREATE TABLE public.t_contacts (
    id integer NOT NULL,
    tenant_id integer DEFAULT 1,
    is_live boolean DEFAULT true,
    is_active boolean DEFAULT true,
    is_customer boolean DEFAULT false,
    prefix character varying(10) NOT NULL,
    name character varying(255) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    created_by integer,
    CONSTRAINT t_contacts_prefix_check CHECK (((prefix)::text = ANY ((ARRAY['Mr'::character varying, 'Mrs'::character varying, 'Ms'::character varying, 'Dr'::character varying, 'Prof'::character varying, 'Sri'::character varying])::text[])))
);


ALTER TABLE public.t_contacts OWNER TO kewal_admin;

--
-- Name: TABLE t_contacts; Type: COMMENT; Schema: public; Owner: kewal_admin
--

COMMENT ON TABLE public.t_contacts IS 'Base contact information - extended by customers table';


--
-- Name: COLUMN t_contacts.is_customer; Type: COMMENT; Schema: public; Owner: kewal_admin
--

COMMENT ON COLUMN public.t_contacts.is_customer IS 'Flag to indicate if contact is also a customer';


--
-- Name: COLUMN t_contacts.prefix; Type: COMMENT; Schema: public; Owner: kewal_admin
--

COMMENT ON COLUMN public.t_contacts.prefix IS 'Title: Mr, Mrs, Ms, Dr, Prof, Sri';


--
-- Name: t_contacts_id_seq; Type: SEQUENCE; Schema: public; Owner: kewal_admin
--

CREATE SEQUENCE public.t_contacts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.t_contacts_id_seq OWNER TO kewal_admin;

--
-- Name: t_contacts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: kewal_admin
--

ALTER SEQUENCE public.t_contacts_id_seq OWNED BY public.t_contacts.id;


--
-- Name: t_customer_addresses; Type: TABLE; Schema: public; Owner: kewal_admin
--

CREATE TABLE public.t_customer_addresses (
    id integer NOT NULL,
    customer_id integer,
    tenant_id integer DEFAULT 1,
    is_live boolean DEFAULT true,
    is_active boolean DEFAULT true,
    address_type character varying(50) DEFAULT 'residential'::character varying,
    address_line1 character varying(255) NOT NULL,
    address_line2 character varying(255),
    city character varying(100) NOT NULL,
    state character varying(100) NOT NULL,
    country character varying(100) DEFAULT 'India'::character varying,
    pincode character varying(20) NOT NULL,
    is_primary boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT t_customer_addresses_address_type_check CHECK (((address_type)::text = ANY ((ARRAY['residential'::character varying, 'office'::character varying, 'mailing'::character varying, 'permanent'::character varying, 'temporary'::character varying, 'other'::character varying])::text[])))
);


ALTER TABLE public.t_customer_addresses OWNER TO kewal_admin;

--
-- Name: TABLE t_customer_addresses; Type: COMMENT; Schema: public; Owner: kewal_admin
--

COMMENT ON TABLE public.t_customer_addresses IS 'Multiple addresses per customer with type classification';


--
-- Name: COLUMN t_customer_addresses.is_primary; Type: COMMENT; Schema: public; Owner: kewal_admin
--

COMMENT ON COLUMN public.t_customer_addresses.is_primary IS 'Primary address for the customer';


--
-- Name: t_customer_addresses_id_seq; Type: SEQUENCE; Schema: public; Owner: kewal_admin
--

CREATE SEQUENCE public.t_customer_addresses_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.t_customer_addresses_id_seq OWNER TO kewal_admin;

--
-- Name: t_customer_addresses_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: kewal_admin
--

ALTER SEQUENCE public.t_customer_addresses_id_seq OWNED BY public.t_customer_addresses.id;


--
-- Name: t_customer_bookmarks; Type: TABLE; Schema: public; Owner: kewal_admin
--

CREATE TABLE public.t_customer_bookmarks (
    id integer NOT NULL,
    tenant_id integer NOT NULL,
    is_live boolean DEFAULT true NOT NULL,
    customer_id integer NOT NULL,
    user_id integer NOT NULL,
    reason_id integer,
    custom_reason character varying(100),
    notes text,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_bookmark_reason CHECK (((reason_id IS NOT NULL) OR (custom_reason IS NOT NULL)))
);


ALTER TABLE public.t_customer_bookmarks OWNER TO kewal_admin;

--
-- Name: TABLE t_customer_bookmarks; Type: COMMENT; Schema: public; Owner: kewal_admin
--

COMMENT ON TABLE public.t_customer_bookmarks IS 'User bookmarks for tracking important customers with reasons/tags';


--
-- Name: COLUMN t_customer_bookmarks.reason_id; Type: COMMENT; Schema: public; Owner: kewal_admin
--

COMMENT ON COLUMN public.t_customer_bookmarks.reason_id IS 'FK to master reasons - preferred for predefined tags';


--
-- Name: COLUMN t_customer_bookmarks.custom_reason; Type: COMMENT; Schema: public; Owner: kewal_admin
--

COMMENT ON COLUMN public.t_customer_bookmarks.custom_reason IS 'Free text when user selects "Other" or custom tag';


--
-- Name: COLUMN t_customer_bookmarks.notes; Type: COMMENT; Schema: public; Owner: kewal_admin
--

COMMENT ON COLUMN public.t_customer_bookmarks.notes IS 'Optional notes about why customer is bookmarked';


--
-- Name: t_customer_bookmarks_id_seq; Type: SEQUENCE; Schema: public; Owner: kewal_admin
--

CREATE SEQUENCE public.t_customer_bookmarks_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.t_customer_bookmarks_id_seq OWNER TO kewal_admin;

--
-- Name: t_customer_bookmarks_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: kewal_admin
--

ALTER SEQUENCE public.t_customer_bookmarks_id_seq OWNED BY public.t_customer_bookmarks.id;


--
-- Name: t_customer_master_portfolio; Type: TABLE; Schema: public; Owner: kewal_admin
--

CREATE TABLE public.t_customer_master_portfolio (
    id integer NOT NULL,
    customer_id integer,
    scheme_code character varying(50),
    scheme_name character varying(255),
    folio_no character varying(100),
    category character varying(100),
    sub_category character varying(100),
    fund_name character varying(255),
    start_date date,
    tenant_id integer,
    is_live boolean,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.t_customer_master_portfolio OWNER TO kewal_admin;

--
-- Name: TABLE t_customer_master_portfolio; Type: COMMENT; Schema: public; Owner: kewal_admin
--

COMMENT ON TABLE public.t_customer_master_portfolio IS 'Customer portfolio master records with categorization';


--
-- Name: COLUMN t_customer_master_portfolio.category; Type: COMMENT; Schema: public; Owner: kewal_admin
--

COMMENT ON COLUMN public.t_customer_master_portfolio.category IS 'Fund category (e.g., Equity, Debt, Hybrid)';


--
-- Name: COLUMN t_customer_master_portfolio.sub_category; Type: COMMENT; Schema: public; Owner: kewal_admin
--

COMMENT ON COLUMN public.t_customer_master_portfolio.sub_category IS 'Fund sub-category (e.g., Large Cap, Mid Cap)';


--
-- Name: COLUMN t_customer_master_portfolio.fund_name; Type: COMMENT; Schema: public; Owner: kewal_admin
--

COMMENT ON COLUMN public.t_customer_master_portfolio.fund_name IS 'Full fund name';


--
-- Name: COLUMN t_customer_master_portfolio.start_date; Type: COMMENT; Schema: public; Owner: kewal_admin
--

COMMENT ON COLUMN public.t_customer_master_portfolio.start_date IS 'Date of first transaction in this portfolio';


--
-- Name: t_customer_master_portfolio_id_seq; Type: SEQUENCE; Schema: public; Owner: kewal_admin
--

CREATE SEQUENCE public.t_customer_master_portfolio_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.t_customer_master_portfolio_id_seq OWNER TO kewal_admin;

--
-- Name: t_customer_master_portfolio_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: kewal_admin
--

ALTER SEQUENCE public.t_customer_master_portfolio_id_seq OWNED BY public.t_customer_master_portfolio.id;


--
-- Name: t_transaction_table; Type: TABLE; Schema: public; Owner: kewal_admin
--

CREATE TABLE public.t_transaction_table (
    id integer NOT NULL,
    customer_id integer,
    scheme_code character varying(50),
    scheme_name character varying(255),
    folio_no character varying(100),
    txn_type_id integer,
    txn_date date,
    total_amount numeric(15,2),
    units numeric(15,4),
    nav numeric(10,4),
    stamp_duty numeric(10,2),
    is_potential_duplicate boolean DEFAULT false,
    portfolio_flag boolean DEFAULT true,
    staging_record_id integer,
    import_session_id integer,
    duplicate_reason text,
    tenant_id integer,
    is_live boolean,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    scheme_id integer,
    txn_description text,
    txn_source character varying(100),
    stt numeric(15,2) DEFAULT 0,
    tds numeric(15,2) DEFAULT 0
);


ALTER TABLE public.t_transaction_table OWNER TO kewal_admin;

--
-- Name: TABLE t_transaction_table; Type: COMMENT; Schema: public; Owner: kewal_admin
--

COMMENT ON TABLE public.t_transaction_table IS 'Investment transaction records with import tracking';


--
-- Name: COLUMN t_transaction_table.portfolio_flag; Type: COMMENT; Schema: public; Owner: kewal_admin
--

COMMENT ON COLUMN public.t_transaction_table.portfolio_flag IS 'Include/exclude from portfolio totals';


--
-- Name: COLUMN t_transaction_table.staging_record_id; Type: COMMENT; Schema: public; Owner: kewal_admin
--

COMMENT ON COLUMN public.t_transaction_table.staging_record_id IS 'Reference to the staging record that created this transaction';


--
-- Name: COLUMN t_transaction_table.import_session_id; Type: COMMENT; Schema: public; Owner: kewal_admin
--

COMMENT ON COLUMN public.t_transaction_table.import_session_id IS 'Reference to the import session that created this transaction';


--
-- Name: COLUMN t_transaction_table.duplicate_reason; Type: COMMENT; Schema: public; Owner: kewal_admin
--

COMMENT ON COLUMN public.t_transaction_table.duplicate_reason IS 'Explanation if this transaction is marked as a potential duplicate';


--
-- Name: t_customer_portfolio_totals; Type: MATERIALIZED VIEW; Schema: public; Owner: kewal_admin
--

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


--
-- Name: t_customers; Type: TABLE; Schema: public; Owner: kewal_admin
--

CREATE TABLE public.t_customers (
    id integer NOT NULL,
    contact_id integer,
    tenant_id integer DEFAULT 1,
    is_live boolean DEFAULT true,
    is_active boolean DEFAULT true,
    pan character varying(10),
    iwell_code character varying(100),
    date_of_birth date,
    anniversary_date date,
    survival_status character varying(20) DEFAULT 'alive'::character varying,
    date_of_death date,
    family_head_name character varying(255),
    family_head_iwell_code character varying(100),
    referred_by integer,
    referred_by_name character varying(255),
    onboarding_form_id integer,
    onboarding_status character varying(50) DEFAULT 'pending'::character varying,
    jtbd_count integer DEFAULT 0,
    has_jtbd_setup boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    created_by integer,
    CONSTRAINT death_date_logic CHECK (((((survival_status)::text = 'alive'::text) AND (date_of_death IS NULL)) OR (((survival_status)::text = 'deceased'::text) AND (date_of_death IS NOT NULL)))),
    CONSTRAINT t_customers_onboarding_status_check CHECK (((onboarding_status)::text = ANY ((ARRAY['pending'::character varying, 'in_progress'::character varying, 'completed'::character varying, 'cancelled'::character varying])::text[]))),
    CONSTRAINT t_customers_survival_status_check CHECK (((survival_status)::text = ANY ((ARRAY['alive'::character varying, 'deceased'::character varying])::text[])))
);


ALTER TABLE public.t_customers OWNER TO kewal_admin;

--
-- Name: TABLE t_customers; Type: COMMENT; Schema: public; Owner: kewal_admin
--

COMMENT ON TABLE public.t_customers IS 'Customer records with financial and personal data';


--
-- Name: COLUMN t_customers.pan; Type: COMMENT; Schema: public; Owner: kewal_admin
--

COMMENT ON COLUMN public.t_customers.pan IS 'PAN card number - stored as PLAIN TEXT';


--
-- Name: COLUMN t_customers.iwell_code; Type: COMMENT; Schema: public; Owner: kewal_admin
--

COMMENT ON COLUMN public.t_customers.iwell_code IS 'IWELL code - stored as PLAIN TEXT';


--
-- Name: COLUMN t_customers.survival_status; Type: COMMENT; Schema: public; Owner: kewal_admin
--

COMMENT ON COLUMN public.t_customers.survival_status IS 'Alive or deceased status for tracking';


--
-- Name: COLUMN t_customers.jtbd_count; Type: COMMENT; Schema: public; Owner: kewal_admin
--

COMMENT ON COLUMN public.t_customers.jtbd_count IS 'Count of active JTBD configurations for this customer';


--
-- Name: COLUMN t_customers.has_jtbd_setup; Type: COMMENT; Schema: public; Owner: kewal_admin
--

COMMENT ON COLUMN public.t_customers.has_jtbd_setup IS 'Flag indicating if customer has any JTBD configurations';


--
-- Name: t_customers_id_seq; Type: SEQUENCE; Schema: public; Owner: kewal_admin
--

CREATE SEQUENCE public.t_customers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.t_customers_id_seq OWNER TO kewal_admin;

--
-- Name: t_customers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: kewal_admin
--

ALTER SEQUENCE public.t_customers_id_seq OWNED BY public.t_customers.id;


--
-- Name: t_file_uploads; Type: TABLE; Schema: public; Owner: kewal_admin
--

CREATE TABLE public.t_file_uploads (
    id integer NOT NULL,
    tenant_id integer DEFAULT 1,
    is_live boolean DEFAULT true,
    is_active boolean DEFAULT true,
    file_type character varying(50) NOT NULL,
    original_filename character varying(255) NOT NULL,
    stored_filename character varying(255) NOT NULL,
    file_path character varying(500) NOT NULL,
    folder_path character varying(500),
    file_size bigint,
    mime_type character varying(100),
    customer_id integer,
    processing_status character varying(50) DEFAULT 'pending'::character varying,
    processed_records integer DEFAULT 0,
    failed_records integer DEFAULT 0,
    error_details text,
    is_processed boolean DEFAULT false,
    processed_folder_path character varying(500),
    uploaded_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    processed_at timestamp without time zone,
    CONSTRAINT t_file_uploads_processing_status_check CHECK (((processing_status)::text = ANY ((ARRAY['pending'::character varying, 'processing'::character varying, 'completed'::character varying, 'failed'::character varying])::text[])))
);


ALTER TABLE public.t_file_uploads OWNER TO kewal_admin;

--
-- Name: TABLE t_file_uploads; Type: COMMENT; Schema: public; Owner: kewal_admin
--

COMMENT ON TABLE public.t_file_uploads IS 'Track all uploaded files for import and document management';


--
-- Name: COLUMN t_file_uploads.file_type; Type: COMMENT; Schema: public; Owner: kewal_admin
--

COMMENT ON COLUMN public.t_file_uploads.file_type IS 'Type: customer_import, transaction_import, customer_document, scheme_import';


--
-- Name: COLUMN t_file_uploads.updated_at; Type: COMMENT; Schema: public; Owner: kewal_admin
--

COMMENT ON COLUMN public.t_file_uploads.updated_at IS 'Timestamp of last update to this record';


--
-- Name: t_file_uploads_id_seq; Type: SEQUENCE; Schema: public; Owner: kewal_admin
--

CREATE SEQUENCE public.t_file_uploads_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.t_file_uploads_id_seq OWNER TO kewal_admin;

--
-- Name: t_file_uploads_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: kewal_admin
--

ALTER SEQUENCE public.t_file_uploads_id_seq OWNED BY public.t_file_uploads.id;


--
-- Name: t_goal_alerts; Type: TABLE; Schema: public; Owner: kewal_admin
--

CREATE TABLE public.t_goal_alerts (
    id integer NOT NULL,
    tenant_id integer NOT NULL,
    is_live boolean NOT NULL,
    goal_id integer NOT NULL,
    customer_id integer NOT NULL,
    alert_type character varying(50) NOT NULL,
    severity character varying(20) NOT NULL,
    message text NOT NULL,
    action_required character varying(100),
    action_details jsonb,
    is_acknowledged boolean DEFAULT false,
    acknowledged_at timestamp without time zone,
    acknowledged_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.t_goal_alerts OWNER TO kewal_admin;

--
-- Name: t_goal_alerts_id_seq; Type: SEQUENCE; Schema: public; Owner: kewal_admin
--

CREATE SEQUENCE public.t_goal_alerts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.t_goal_alerts_id_seq OWNER TO kewal_admin;

--
-- Name: t_goal_alerts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: kewal_admin
--

ALTER SEQUENCE public.t_goal_alerts_id_seq OWNED BY public.t_goal_alerts.id;


--
-- Name: t_goal_progress_snapshots; Type: TABLE; Schema: public; Owner: kewal_admin
--

CREATE TABLE public.t_goal_progress_snapshots (
    id integer NOT NULL,
    tenant_id integer NOT NULL,
    is_live boolean NOT NULL,
    goal_id integer NOT NULL,
    snapshot_date date NOT NULL,
    current_value numeric(15,2) NOT NULL,
    monthly_contribution numeric(15,2) NOT NULL,
    projected_corpus numeric(15,2),
    projected_achievement_date date,
    probability_of_success numeric(5,2),
    on_track boolean,
    deviation_percentage numeric(5,2),
    recalculation_trigger character varying(50),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.t_goal_progress_snapshots OWNER TO kewal_admin;

--
-- Name: t_goal_progress_snapshots_id_seq; Type: SEQUENCE; Schema: public; Owner: kewal_admin
--

CREATE SEQUENCE public.t_goal_progress_snapshots_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.t_goal_progress_snapshots_id_seq OWNER TO kewal_admin;

--
-- Name: t_goal_progress_snapshots_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: kewal_admin
--

ALTER SEQUENCE public.t_goal_progress_snapshots_id_seq OWNED BY public.t_goal_progress_snapshots.id;


--
-- Name: t_import_field_mappings; Type: TABLE; Schema: public; Owner: kewal_admin
--

CREATE TABLE public.t_import_field_mappings (
    id integer NOT NULL,
    tenant_id integer DEFAULT 1,
    is_live boolean DEFAULT true,
    is_active boolean DEFAULT true,
    import_type character varying(50) NOT NULL,
    template_name character varying(255) NOT NULL,
    template_version integer DEFAULT 1,
    field_mappings jsonb NOT NULL,
    validation_rules jsonb,
    is_default boolean DEFAULT false,
    created_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.t_import_field_mappings OWNER TO kewal_admin;

--
-- Name: TABLE t_import_field_mappings; Type: COMMENT; Schema: public; Owner: kewal_admin
--

COMMENT ON TABLE public.t_import_field_mappings IS 'Field mapping templates for different import types';


--
-- Name: COLUMN t_import_field_mappings.import_type; Type: COMMENT; Schema: public; Owner: kewal_admin
--

COMMENT ON COLUMN public.t_import_field_mappings.import_type IS 'Type: CustomerData, TransactionData, SchemeData, or custom types';


--
-- Name: COLUMN t_import_field_mappings.field_mappings; Type: COMMENT; Schema: public; Owner: kewal_admin
--

COMMENT ON COLUMN public.t_import_field_mappings.field_mappings IS 'JSON structure defining source to target field mappings';


--
-- Name: t_import_field_mappings_id_seq; Type: SEQUENCE; Schema: public; Owner: kewal_admin
--

CREATE SEQUENCE public.t_import_field_mappings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.t_import_field_mappings_id_seq OWNER TO kewal_admin;

--
-- Name: t_import_field_mappings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: kewal_admin
--

ALTER SEQUENCE public.t_import_field_mappings_id_seq OWNED BY public.t_import_field_mappings.id;


--
-- Name: t_import_logs; Type: TABLE; Schema: public; Owner: kewal_admin
--

CREATE TABLE public.t_import_logs (
    id integer NOT NULL,
    file_upload_id integer,
    tenant_id integer DEFAULT 1,
    is_live boolean DEFAULT true,
    import_type character varying(50) NOT NULL,
    total_records integer,
    successful_records integer,
    failed_records integer,
    duplicate_records integer,
    import_summary jsonb,
    error_details text,
    started_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    completed_at timestamp without time zone,
    imported_by integer
);


ALTER TABLE public.t_import_logs OWNER TO kewal_admin;

--
-- Name: TABLE t_import_logs; Type: COMMENT; Schema: public; Owner: kewal_admin
--

COMMENT ON TABLE public.t_import_logs IS 'Audit trail for import operations';


--
-- Name: t_import_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: kewal_admin
--

CREATE SEQUENCE public.t_import_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.t_import_logs_id_seq OWNER TO kewal_admin;

--
-- Name: t_import_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: kewal_admin
--

ALTER SEQUENCE public.t_import_logs_id_seq OWNED BY public.t_import_logs.id;


--
-- Name: t_import_record_results; Type: TABLE; Schema: public; Owner: kewal_admin
--

CREATE TABLE public.t_import_record_results (
    id integer NOT NULL,
    import_session_id integer,
    tenant_id integer DEFAULT 1,
    is_live boolean DEFAULT true,
    row_number integer NOT NULL,
    raw_data jsonb NOT NULL,
    status character varying(50) NOT NULL,
    error_messages text[],
    warnings text[],
    created_contact_id integer,
    created_customer_id integer,
    processed_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT t_import_record_results_status_check CHECK (((status)::text = ANY ((ARRAY['success'::character varying, 'failed'::character varying, 'duplicate'::character varying, 'skipped'::character varying])::text[])))
);


ALTER TABLE public.t_import_record_results OWNER TO kewal_admin;

--
-- Name: TABLE t_import_record_results; Type: COMMENT; Schema: public; Owner: kewal_admin
--

COMMENT ON TABLE public.t_import_record_results IS 'Detailed results for each imported record';


--
-- Name: t_import_record_results_id_seq; Type: SEQUENCE; Schema: public; Owner: kewal_admin
--

CREATE SEQUENCE public.t_import_record_results_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.t_import_record_results_id_seq OWNER TO kewal_admin;

--
-- Name: t_import_record_results_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: kewal_admin
--

ALTER SEQUENCE public.t_import_record_results_id_seq OWNED BY public.t_import_record_results.id;


--
-- Name: t_import_sessions; Type: TABLE; Schema: public; Owner: kewal_admin
--

CREATE TABLE public.t_import_sessions (
    id integer NOT NULL,
    session_name character varying(255) NOT NULL,
    file_upload_id integer,
    tenant_id integer DEFAULT 1,
    is_live boolean DEFAULT true,
    import_type character varying(50) NOT NULL,
    status character varying(50) DEFAULT 'pending'::character varying,
    total_records integer DEFAULT 0,
    processed_records integer DEFAULT 0,
    successful_records integer DEFAULT 0,
    failed_records integer DEFAULT 0,
    duplicate_records integer DEFAULT 0,
    staging_completed_at timestamp without time zone,
    staging_total_rows integer DEFAULT 0,
    batch_size integer DEFAULT 100,
    current_batch integer DEFAULT 0,
    total_batches integer DEFAULT 0,
    last_processed_row integer DEFAULT 0,
    processing_metadata jsonb,
    processing_started_at timestamp without time zone,
    processing_completed_at timestamp without time zone,
    error_summary text,
    n8n_webhook_id character varying(255),
    n8n_execution_id character varying(255),
    created_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT t_import_sessions_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'staged'::character varying, 'processing'::character varying, 'completed'::character varying, 'completed_with_errors'::character varying, 'failed'::character varying, 'cancelled'::character varying])::text[])))
);


ALTER TABLE public.t_import_sessions OWNER TO kewal_admin;

--
-- Name: TABLE t_import_sessions; Type: COMMENT; Schema: public; Owner: kewal_admin
--

COMMENT ON TABLE public.t_import_sessions IS 'Track import processing sessions with batch progress';


--
-- Name: COLUMN t_import_sessions.import_type; Type: COMMENT; Schema: public; Owner: kewal_admin
--

COMMENT ON COLUMN public.t_import_sessions.import_type IS 'Type: CustomerData, TransactionData, SchemeData, or custom types';


--
-- Name: COLUMN t_import_sessions.status; Type: COMMENT; Schema: public; Owner: kewal_admin
--

COMMENT ON COLUMN public.t_import_sessions.status IS 'Status: pending, staged, processing, completed, completed_with_errors, failed, cancelled';


--
-- Name: COLUMN t_import_sessions.staging_total_rows; Type: COMMENT; Schema: public; Owner: kewal_admin
--

COMMENT ON COLUMN public.t_import_sessions.staging_total_rows IS 'Total rows inserted into staging table';


--
-- Name: t_import_sessions_id_seq; Type: SEQUENCE; Schema: public; Owner: kewal_admin
--

CREATE SEQUENCE public.t_import_sessions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.t_import_sessions_id_seq OWNER TO kewal_admin;

--
-- Name: t_import_sessions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: kewal_admin
--

ALTER SEQUENCE public.t_import_sessions_id_seq OWNED BY public.t_import_sessions.id;


--
-- Name: t_import_staging_data; Type: TABLE; Schema: public; Owner: kewal_admin
--

CREATE TABLE public.t_import_staging_data (
    id integer NOT NULL,
    tenant_id integer NOT NULL,
    is_live boolean DEFAULT false,
    session_id integer NOT NULL,
    import_type character varying(50) NOT NULL,
    row_number integer NOT NULL,
    raw_data jsonb NOT NULL,
    mapped_data jsonb,
    processing_status character varying(20) DEFAULT 'pending'::character varying,
    error_messages text[],
    warnings text[],
    created_record_id integer,
    created_record_type character varying(50),
    processed_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    processing_metadata jsonb DEFAULT '{}'::jsonb,
    CONSTRAINT chk_processing_status CHECK (((processing_status)::text = ANY ((ARRAY['pending'::character varying, 'processing'::character varying, 'success'::character varying, 'failed'::character varying, 'duplicate'::character varying, 'skipped'::character varying, 'orphan'::character varying])::text[]))),
    CONSTRAINT t_import_staging_data_processing_status_check CHECK (((processing_status)::text = ANY ((ARRAY['pending'::character varying, 'processing'::character varying, 'success'::character varying, 'failed'::character varying, 'skipped'::character varying, 'duplicate'::character varying])::text[])))
);


ALTER TABLE public.t_import_staging_data OWNER TO kewal_admin;

--
-- Name: TABLE t_import_staging_data; Type: COMMENT; Schema: public; Owner: kewal_admin
--

COMMENT ON TABLE public.t_import_staging_data IS 'Staging table for ETL import processing';


--
-- Name: COLUMN t_import_staging_data.import_type; Type: COMMENT; Schema: public; Owner: kewal_admin
--

COMMENT ON COLUMN public.t_import_staging_data.import_type IS 'Type: CustomerData, TransactionData, SchemeData, or custom types';


--
-- Name: COLUMN t_import_staging_data.raw_data; Type: COMMENT; Schema: public; Owner: kewal_admin
--

COMMENT ON COLUMN public.t_import_staging_data.raw_data IS 'Original row data as received from uploaded file';


--
-- Name: COLUMN t_import_staging_data.mapped_data; Type: COMMENT; Schema: public; Owner: kewal_admin
--

COMMENT ON COLUMN public.t_import_staging_data.mapped_data IS 'Transformed data after applying field mappings';


--
-- Name: t_import_staging_data_id_seq; Type: SEQUENCE; Schema: public; Owner: kewal_admin
--

CREATE SEQUENCE public.t_import_staging_data_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.t_import_staging_data_id_seq OWNER TO kewal_admin;

--
-- Name: t_import_staging_data_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: kewal_admin
--

ALTER SEQUENCE public.t_import_staging_data_id_seq OWNED BY public.t_import_staging_data.id;


--
-- Name: t_jtbd_configurations; Type: TABLE; Schema: public; Owner: kewal_admin
--

CREATE TABLE public.t_jtbd_configurations (
    id integer NOT NULL,
    tenant_id integer NOT NULL,
    is_live boolean DEFAULT true NOT NULL,
    customer_id integer NOT NULL,
    jtbd_type character varying(50) NOT NULL,
    title character varying(255) NOT NULL,
    description text,
    priority character varying(20) DEFAULT 'medium'::character varying NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    config_data jsonb NOT NULL,
    next_alert_date date,
    created_by integer NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.t_jtbd_configurations OWNER TO kewal_admin;

--
-- Name: TABLE t_jtbd_configurations; Type: COMMENT; Schema: public; Owner: kewal_admin
--

COMMENT ON TABLE public.t_jtbd_configurations IS 'Customer alert and reminder configurations';


--
-- Name: COLUMN t_jtbd_configurations.jtbd_type; Type: COMMENT; Schema: public; Owner: kewal_admin
--

COMMENT ON COLUMN public.t_jtbd_configurations.jtbd_type IS 'Type: portfolio_alert, time_based, profile_trigger';


--
-- Name: t_jtbd_configurations_id_seq; Type: SEQUENCE; Schema: public; Owner: kewal_admin
--

CREATE SEQUENCE public.t_jtbd_configurations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.t_jtbd_configurations_id_seq OWNER TO kewal_admin;

--
-- Name: t_jtbd_configurations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: kewal_admin
--

ALTER SEQUENCE public.t_jtbd_configurations_id_seq OWNED BY public.t_jtbd_configurations.id;


--
-- Name: t_market_data_records; Type: TABLE; Schema: public; Owner: kewal_admin
--

CREATE TABLE public.t_market_data_records (
    id integer NOT NULL,
    index_id integer NOT NULL,
    date date NOT NULL,
    open numeric(15,2) NOT NULL,
    high numeric(15,2) NOT NULL,
    low numeric(15,2) NOT NULL,
    close numeric(15,2) NOT NULL,
    volume bigint,
    adj_close numeric(15,2),
    data_source character varying(50) DEFAULT 'yahoo_finance'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    daily_return numeric(10,4),
    return_1w numeric(10,4),
    return_1m numeric(10,4),
    return_3m numeric(10,4),
    return_6m numeric(10,4),
    return_1y numeric(10,4),
    return_ytd numeric(10,4),
    return_all numeric(10,4),
    sd_7d numeric(10,4),
    sd_14d numeric(10,4),
    sd_21d numeric(10,4),
    sd_42d numeric(10,4),
    sd_3m numeric(10,4),
    sd_6m numeric(10,4),
    count_3m integer,
    count_42d integer,
    sharpe_ratio numeric(10,4),
    max_drawdown numeric(10,4),
    total_risk numeric(10,4),
    cagr numeric(10,4),
    metrics_calculated_at timestamp without time zone
);


ALTER TABLE public.t_market_data_records OWNER TO kewal_admin;

--
-- Name: TABLE t_market_data_records; Type: COMMENT; Schema: public; Owner: kewal_admin
--

COMMENT ON TABLE public.t_market_data_records IS 'Historical OHLCV data for market indices';


--
-- Name: COLUMN t_market_data_records.adj_close; Type: COMMENT; Schema: public; Owner: kewal_admin
--

COMMENT ON COLUMN public.t_market_data_records.adj_close IS 'Adjusted close price (for splits/dividends)';


--
-- Name: t_market_data_records_id_seq; Type: SEQUENCE; Schema: public; Owner: kewal_admin
--

CREATE SEQUENCE public.t_market_data_records_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.t_market_data_records_id_seq OWNER TO kewal_admin;

--
-- Name: t_market_data_records_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: kewal_admin
--

ALTER SEQUENCE public.t_market_data_records_id_seq OWNED BY public.t_market_data_records.id;


--
-- Name: t_market_download_jobs; Type: TABLE; Schema: public; Owner: kewal_admin
--

CREATE TABLE public.t_market_download_jobs (
    id integer NOT NULL,
    job_type character varying(20) NOT NULL,
    index_id integer NOT NULL,
    start_date date,
    end_date date,
    status character varying(20) DEFAULT 'pending'::character varying,
    error_details text,
    records_inserted integer DEFAULT 0,
    records_updated integer DEFAULT 0,
    records_skipped integer DEFAULT 0,
    execution_time_ms integer,
    triggered_by character varying(50),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    completed_at timestamp without time zone
);


ALTER TABLE public.t_market_download_jobs OWNER TO kewal_admin;

--
-- Name: TABLE t_market_download_jobs; Type: COMMENT; Schema: public; Owner: kewal_admin
--

COMMENT ON TABLE public.t_market_download_jobs IS 'Tracks download jobs for market data';


--
-- Name: t_market_download_jobs_id_seq; Type: SEQUENCE; Schema: public; Owner: kewal_admin
--

CREATE SEQUENCE public.t_market_download_jobs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.t_market_download_jobs_id_seq OWNER TO kewal_admin;

--
-- Name: t_market_download_jobs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: kewal_admin
--

ALTER SEQUENCE public.t_market_download_jobs_id_seq OWNED BY public.t_market_download_jobs.id;


--
-- Name: t_market_download_logs; Type: TABLE; Schema: public; Owner: kewal_admin
--

CREATE TABLE public.t_market_download_logs (
    id integer NOT NULL,
    index_id integer,
    job_id integer,
    download_type character varying(20),
    status character varying(20),
    records_processed integer DEFAULT 0,
    date_range_start date,
    date_range_end date,
    error_message text,
    duration_seconds integer,
    triggered_by character varying(50),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.t_market_download_logs OWNER TO kewal_admin;

--
-- Name: TABLE t_market_download_logs; Type: COMMENT; Schema: public; Owner: kewal_admin
--

COMMENT ON TABLE public.t_market_download_logs IS 'Audit log for all download activities';


--
-- Name: t_market_download_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: kewal_admin
--

CREATE SEQUENCE public.t_market_download_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.t_market_download_logs_id_seq OWNER TO kewal_admin;

--
-- Name: t_market_download_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: kewal_admin
--

ALTER SEQUENCE public.t_market_download_logs_id_seq OWNED BY public.t_market_download_logs.id;


--
-- Name: t_market_eod_scheduler; Type: TABLE; Schema: public; Owner: kewal_admin
--

CREATE TABLE public.t_market_eod_scheduler (
    id integer NOT NULL,
    is_enabled boolean DEFAULT true,
    download_time time without time zone DEFAULT '20:00:00'::time without time zone,
    retry_interval_minutes integer DEFAULT 30,
    max_retries integer DEFAULT 6,
    retry_cutoff_time time without time zone DEFAULT '23:00:00'::time without time zone,
    last_execution_at timestamp without time zone,
    next_execution_at timestamp without time zone,
    execution_count integer DEFAULT 0,
    failure_count integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.t_market_eod_scheduler OWNER TO kewal_admin;

--
-- Name: TABLE t_market_eod_scheduler; Type: COMMENT; Schema: public; Owner: kewal_admin
--

COMMENT ON TABLE public.t_market_eod_scheduler IS 'Global EOD scheduler configuration';


--
-- Name: t_market_eod_scheduler_id_seq; Type: SEQUENCE; Schema: public; Owner: kewal_admin
--

CREATE SEQUENCE public.t_market_eod_scheduler_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.t_market_eod_scheduler_id_seq OWNER TO kewal_admin;

--
-- Name: t_market_eod_scheduler_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: kewal_admin
--

ALTER SEQUENCE public.t_market_eod_scheduler_id_seq OWNED BY public.t_market_eod_scheduler.id;


--
-- Name: t_market_indices; Type: TABLE; Schema: public; Owner: kewal_admin
--

CREATE TABLE public.t_market_indices (
    id integer NOT NULL,
    index_code character varying(50) NOT NULL,
    index_name character varying(200) NOT NULL,
    yahoo_symbol character varying(50) NOT NULL,
    category character varying(50) NOT NULL,
    description text,
    is_active boolean DEFAULT true,
    priority integer DEFAULT 0,
    total_records integer DEFAULT 0,
    earliest_date date,
    latest_date date,
    last_download_status character varying(20),
    last_download_at timestamp without time zone,
    last_download_error text,
    historical_data_available boolean DEFAULT false,
    next_eod_retry_at timestamp without time zone,
    eod_retry_count integer DEFAULT 0,
    last_successful_eod_download_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.t_market_indices OWNER TO kewal_admin;

--
-- Name: TABLE t_market_indices; Type: COMMENT; Schema: public; Owner: kewal_admin
--

COMMENT ON TABLE public.t_market_indices IS 'Master table for NSE market indices with Yahoo Finance integration';


--
-- Name: COLUMN t_market_indices.yahoo_symbol; Type: COMMENT; Schema: public; Owner: kewal_admin
--

COMMENT ON COLUMN public.t_market_indices.yahoo_symbol IS 'Yahoo Finance symbol (e.g., ^NSEI for Nifty 50)';


--
-- Name: COLUMN t_market_indices.eod_retry_count; Type: COMMENT; Schema: public; Owner: kewal_admin
--

COMMENT ON COLUMN public.t_market_indices.eod_retry_count IS 'Current retry count for today EOD download (resets daily)';


--
-- Name: t_market_indices_id_seq; Type: SEQUENCE; Schema: public; Owner: kewal_admin
--

CREATE SEQUENCE public.t_market_indices_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.t_market_indices_id_seq OWNER TO kewal_admin;

--
-- Name: t_market_indices_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: kewal_admin
--

ALTER SEQUENCE public.t_market_indices_id_seq OWNED BY public.t_market_indices.id;


--
-- Name: t_monthly_portfolio_snapshots; Type: TABLE; Schema: public; Owner: kewal_admin
--

CREATE TABLE public.t_monthly_portfolio_snapshots (
    id integer NOT NULL,
    tenant_id integer NOT NULL,
    is_live boolean NOT NULL,
    customer_id integer NOT NULL,
    snapshot_month_end date NOT NULL,
    total_invested numeric(18,2),
    current_value numeric(18,2),
    total_returns numeric(18,2),
    return_percentage numeric(10,2),
    total_units numeric(18,4),
    total_schemes integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.t_monthly_portfolio_snapshots OWNER TO kewal_admin;

--
-- Name: t_monthly_portfolio_snapshots_id_seq; Type: SEQUENCE; Schema: public; Owner: kewal_admin
--

CREATE SEQUENCE public.t_monthly_portfolio_snapshots_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.t_monthly_portfolio_snapshots_id_seq OWNER TO kewal_admin;

--
-- Name: t_monthly_portfolio_snapshots_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: kewal_admin
--

ALTER SEQUENCE public.t_monthly_portfolio_snapshots_id_seq OWNED BY public.t_monthly_portfolio_snapshots.id;


--
-- Name: t_nav_data; Type: TABLE; Schema: public; Owner: kewal_admin
--

CREATE TABLE public.t_nav_data (
    id integer NOT NULL,
    scheme_id integer NOT NULL,
    scheme_code character varying(100) NOT NULL,
    nav_date date NOT NULL,
    nav_value numeric(15,4) NOT NULL,
    repurchase_price numeric(15,4),
    sale_price numeric(15,4),
    is_live boolean DEFAULT true,
    data_source character varying(20) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    daily_return numeric(10,4),
    return_1w numeric(10,4),
    return_1m numeric(10,4),
    return_3m numeric(10,4),
    return_6m numeric(10,4),
    return_1y numeric(10,4),
    return_ytd numeric(10,4),
    return_all numeric(10,4),
    sd_7d numeric(10,4),
    sd_14d numeric(10,4),
    sd_21d numeric(10,4),
    sd_42d numeric(10,4),
    sd_3m numeric(10,4),
    sd_6m numeric(10,4),
    count_3m integer,
    count_42d integer,
    sharpe_ratio numeric(10,4),
    max_drawdown numeric(10,4),
    total_risk numeric(10,4),
    cagr numeric(10,4),
    metrics_calculated_at timestamp without time zone,
    CONSTRAINT t_nav_data_data_source_check CHECK (((data_source)::text = ANY ((ARRAY['daily'::character varying, 'historical'::character varying, 'weekly'::character varying])::text[])))
);


ALTER TABLE public.t_nav_data OWNER TO kewal_admin;

--
-- Name: TABLE t_nav_data; Type: COMMENT; Schema: public; Owner: kewal_admin
--

COMMENT ON TABLE public.t_nav_data IS 'Historical NAV data for mutual fund schemes';


--
-- Name: COLUMN t_nav_data.daily_return; Type: COMMENT; Schema: public; Owner: kewal_admin
--

COMMENT ON COLUMN public.t_nav_data.daily_return IS 'Daily return percentage (today vs yesterday)';


--
-- Name: COLUMN t_nav_data.return_1w; Type: COMMENT; Schema: public; Owner: kewal_admin
--

COMMENT ON COLUMN public.t_nav_data.return_1w IS '1-week return percentage';


--
-- Name: COLUMN t_nav_data.return_1m; Type: COMMENT; Schema: public; Owner: kewal_admin
--

COMMENT ON COLUMN public.t_nav_data.return_1m IS '1-month return percentage';


--
-- Name: COLUMN t_nav_data.return_3m; Type: COMMENT; Schema: public; Owner: kewal_admin
--

COMMENT ON COLUMN public.t_nav_data.return_3m IS '3-month return percentage';


--
-- Name: COLUMN t_nav_data.return_6m; Type: COMMENT; Schema: public; Owner: kewal_admin
--

COMMENT ON COLUMN public.t_nav_data.return_6m IS '6-month return percentage';


--
-- Name: COLUMN t_nav_data.return_1y; Type: COMMENT; Schema: public; Owner: kewal_admin
--

COMMENT ON COLUMN public.t_nav_data.return_1y IS '1-year return percentage';


--
-- Name: COLUMN t_nav_data.return_ytd; Type: COMMENT; Schema: public; Owner: kewal_admin
--

COMMENT ON COLUMN public.t_nav_data.return_ytd IS 'Year-to-date return percentage';


--
-- Name: COLUMN t_nav_data.return_all; Type: COMMENT; Schema: public; Owner: kewal_admin
--

COMMENT ON COLUMN public.t_nav_data.return_all IS 'All-time return percentage (since inception)';


--
-- Name: COLUMN t_nav_data.sd_7d; Type: COMMENT; Schema: public; Owner: kewal_admin
--

COMMENT ON COLUMN public.t_nav_data.sd_7d IS '7-day rolling standard deviation (volatility)';


--
-- Name: COLUMN t_nav_data.sd_14d; Type: COMMENT; Schema: public; Owner: kewal_admin
--

COMMENT ON COLUMN public.t_nav_data.sd_14d IS '14-day rolling standard deviation (volatility)';


--
-- Name: COLUMN t_nav_data.sd_21d; Type: COMMENT; Schema: public; Owner: kewal_admin
--

COMMENT ON COLUMN public.t_nav_data.sd_21d IS '21-day rolling standard deviation (volatility)';


--
-- Name: COLUMN t_nav_data.sd_42d; Type: COMMENT; Schema: public; Owner: kewal_admin
--

COMMENT ON COLUMN public.t_nav_data.sd_42d IS '42-day rolling standard deviation (volatility)';


--
-- Name: COLUMN t_nav_data.sd_3m; Type: COMMENT; Schema: public; Owner: kewal_admin
--

COMMENT ON COLUMN public.t_nav_data.sd_3m IS '3-month rolling standard deviation (volatility)';


--
-- Name: COLUMN t_nav_data.sd_6m; Type: COMMENT; Schema: public; Owner: kewal_admin
--

COMMENT ON COLUMN public.t_nav_data.sd_6m IS '6-month rolling standard deviation (volatility)';


--
-- Name: COLUMN t_nav_data.count_3m; Type: COMMENT; Schema: public; Owner: kewal_admin
--

COMMENT ON COLUMN public.t_nav_data.count_3m IS 'Number of data points available in 3-month period';


--
-- Name: COLUMN t_nav_data.count_42d; Type: COMMENT; Schema: public; Owner: kewal_admin
--

COMMENT ON COLUMN public.t_nav_data.count_42d IS 'Number of data points available in 42-day period';


--
-- Name: COLUMN t_nav_data.sharpe_ratio; Type: COMMENT; Schema: public; Owner: kewal_admin
--

COMMENT ON COLUMN public.t_nav_data.sharpe_ratio IS 'Sharpe ratio (risk-adjusted return metric)';


--
-- Name: COLUMN t_nav_data.max_drawdown; Type: COMMENT; Schema: public; Owner: kewal_admin
--

COMMENT ON COLUMN public.t_nav_data.max_drawdown IS 'Maximum drawdown percentage (largest peak-to-trough decline)';


--
-- Name: COLUMN t_nav_data.total_risk; Type: COMMENT; Schema: public; Owner: kewal_admin
--

COMMENT ON COLUMN public.t_nav_data.total_risk IS 'Total risk metric (composite volatility measure)';


--
-- Name: COLUMN t_nav_data.cagr; Type: COMMENT; Schema: public; Owner: kewal_admin
--

COMMENT ON COLUMN public.t_nav_data.cagr IS 'Compound Annual Growth Rate percentage';


--
-- Name: COLUMN t_nav_data.metrics_calculated_at; Type: COMMENT; Schema: public; Owner: kewal_admin
--

COMMENT ON COLUMN public.t_nav_data.metrics_calculated_at IS 'Timestamp when metrics were last calculated';


--
-- Name: t_nav_data_id_seq; Type: SEQUENCE; Schema: public; Owner: kewal_admin
--

CREATE SEQUENCE public.t_nav_data_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.t_nav_data_id_seq OWNER TO kewal_admin;

--
-- Name: t_nav_data_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: kewal_admin
--

ALTER SEQUENCE public.t_nav_data_id_seq OWNED BY public.t_nav_data.id;


--
-- Name: t_nav_download_jobs; Type: TABLE; Schema: public; Owner: kewal_admin
--

CREATE TABLE public.t_nav_download_jobs (
    id integer NOT NULL,
    tenant_id integer DEFAULT 1 NOT NULL,
    job_type character varying(20) NOT NULL,
    scheme_ids integer[] NOT NULL,
    scheduled_date timestamp without time zone NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying,
    start_date date,
    end_date date,
    n8n_execution_id character varying(255),
    result_summary jsonb,
    error_details text,
    is_live boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    created_by integer,
    CONSTRAINT t_nav_download_jobs_job_type_check CHECK (((job_type)::text = ANY ((ARRAY['daily'::character varying, 'historical'::character varying, 'weekly'::character varying])::text[]))),
    CONSTRAINT t_nav_download_jobs_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'running'::character varying, 'completed'::character varying, 'failed'::character varying, 'cancelled'::character varying])::text[])))
);


ALTER TABLE public.t_nav_download_jobs OWNER TO kewal_admin;

--
-- Name: TABLE t_nav_download_jobs; Type: COMMENT; Schema: public; Owner: kewal_admin
--

COMMENT ON TABLE public.t_nav_download_jobs IS 'Track NAV download jobs for schemes';


--
-- Name: t_nav_download_jobs_id_seq; Type: SEQUENCE; Schema: public; Owner: kewal_admin
--

CREATE SEQUENCE public.t_nav_download_jobs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.t_nav_download_jobs_id_seq OWNER TO kewal_admin;

--
-- Name: t_nav_download_jobs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: kewal_admin
--

ALTER SEQUENCE public.t_nav_download_jobs_id_seq OWNED BY public.t_nav_download_jobs.id;


--
-- Name: t_nav_schedule_executions; Type: TABLE; Schema: public; Owner: kewal_admin
--

CREATE TABLE public.t_nav_schedule_executions (
    id integer NOT NULL,
    scheduler_config_id integer NOT NULL,
    execution_time timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    status character varying(20) NOT NULL,
    job_id integer,
    n8n_execution_id character varying(100),
    error_message text,
    execution_duration_ms integer,
    CONSTRAINT t_nav_schedule_executions_status_check CHECK (((status)::text = ANY ((ARRAY['success'::character varying, 'failed'::character varying, 'skipped'::character varying, 'running'::character varying])::text[])))
);


ALTER TABLE public.t_nav_schedule_executions OWNER TO kewal_admin;

--
-- Name: TABLE t_nav_schedule_executions; Type: COMMENT; Schema: public; Owner: kewal_admin
--

COMMENT ON TABLE public.t_nav_schedule_executions IS 'Execution history for NAV scheduler';


--
-- Name: t_nav_schedule_executions_id_seq; Type: SEQUENCE; Schema: public; Owner: kewal_admin
--

CREATE SEQUENCE public.t_nav_schedule_executions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.t_nav_schedule_executions_id_seq OWNER TO kewal_admin;

--
-- Name: t_nav_schedule_executions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: kewal_admin
--

ALTER SEQUENCE public.t_nav_schedule_executions_id_seq OWNED BY public.t_nav_schedule_executions.id;


--
-- Name: t_nav_scheduler_configs; Type: TABLE; Schema: public; Owner: kewal_admin
--

CREATE TABLE public.t_nav_scheduler_configs (
    id integer NOT NULL,
    tenant_id integer NOT NULL,
    user_id integer NOT NULL,
    is_live boolean NOT NULL,
    schedule_type character varying(20) NOT NULL,
    cron_expression character varying(100) NOT NULL,
    download_time character varying(5) NOT NULL,
    is_enabled boolean DEFAULT true NOT NULL,
    n8n_webhook_url text,
    last_executed_at timestamp without time zone,
    next_execution_at timestamp without time zone,
    execution_count integer DEFAULT 0 NOT NULL,
    failure_count integer DEFAULT 0 NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT t_nav_scheduler_configs_schedule_type_check CHECK (((schedule_type)::text = ANY ((ARRAY['daily'::character varying, 'weekly'::character varying, 'custom'::character varying])::text[])))
);


ALTER TABLE public.t_nav_scheduler_configs OWNER TO kewal_admin;

--
-- Name: TABLE t_nav_scheduler_configs; Type: COMMENT; Schema: public; Owner: kewal_admin
--

COMMENT ON TABLE public.t_nav_scheduler_configs IS 'Scheduler configurations for NAV downloads';


--
-- Name: t_nav_scheduler_configs_id_seq; Type: SEQUENCE; Schema: public; Owner: kewal_admin
--

CREATE SEQUENCE public.t_nav_scheduler_configs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.t_nav_scheduler_configs_id_seq OWNER TO kewal_admin;

--
-- Name: t_nav_scheduler_configs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: kewal_admin
--

ALTER SEQUENCE public.t_nav_scheduler_configs_id_seq OWNED BY public.t_nav_scheduler_configs.id;


--
-- Name: t_scheme_bookmarks; Type: TABLE; Schema: public; Owner: kewal_admin
--

CREATE TABLE public.t_scheme_bookmarks (
    id integer NOT NULL,
    tenant_id integer DEFAULT 1 NOT NULL,
    user_id integer NOT NULL,
    scheme_id integer NOT NULL,
    scheme_code character varying(100) NOT NULL,
    scheme_name character varying(500) NOT NULL,
    amc_name character varying(255),
    is_live boolean DEFAULT true,
    is_active boolean DEFAULT true,
    daily_download_enabled boolean DEFAULT false,
    download_time character varying(5) DEFAULT '22:00'::character varying,
    historical_download_completed boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    alias_name character varying(255)
);


ALTER TABLE public.t_scheme_bookmarks OWNER TO kewal_admin;

--
-- Name: TABLE t_scheme_bookmarks; Type: COMMENT; Schema: public; Owner: kewal_admin
--

COMMENT ON TABLE public.t_scheme_bookmarks IS 'User bookmarks for tracking specific schemes';


--
-- Name: COLUMN t_scheme_bookmarks.alias_name; Type: COMMENT; Schema: public; Owner: kewal_admin
--

COMMENT ON COLUMN public.t_scheme_bookmarks.alias_name IS 'Custom scheme name (tenant preference). Falls back to scheme_name if NULL';


--
-- Name: t_scheme_bookmarks_id_seq; Type: SEQUENCE; Schema: public; Owner: kewal_admin
--

CREATE SEQUENCE public.t_scheme_bookmarks_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.t_scheme_bookmarks_id_seq OWNER TO kewal_admin;

--
-- Name: t_scheme_bookmarks_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: kewal_admin
--

ALTER SEQUENCE public.t_scheme_bookmarks_id_seq OWNED BY public.t_scheme_bookmarks.id;


--
-- Name: t_scheme_details; Type: TABLE; Schema: public; Owner: kewal_admin
--

CREATE TABLE public.t_scheme_details (
    id integer NOT NULL,
    tenant_id integer,
    is_live boolean DEFAULT true,
    is_active boolean DEFAULT true,
    amc_name character varying(255),
    scheme_code character varying(100),
    scheme_name character varying(500) NOT NULL,
    scheme_type_id integer,
    scheme_category_id integer,
    scheme_nav_name character varying(500),
    scheme_minimum_amount numeric(15,2),
    launch_date date,
    closure_date date,
    isin_div_payout character varying(50),
    isin_growth character varying(50),
    isin_div_reinvestment character varying(50),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    created_by integer,
    last_nav_download_date date,
    last_nav_download_status character varying(20),
    last_nav_download_error text,
    historical_data_available boolean DEFAULT false,
    earliest_nav_date date,
    latest_nav_date date,
    total_nav_records integer DEFAULT 0,
    CONSTRAINT t_scheme_details_last_nav_download_status_check CHECK (((last_nav_download_status)::text = ANY ((ARRAY['success'::character varying, 'failed'::character varying, 'in_progress'::character varying, NULL::character varying])::text[])))
);


ALTER TABLE public.t_scheme_details OWNER TO kewal_admin;

--
-- Name: TABLE t_scheme_details; Type: COMMENT; Schema: public; Owner: kewal_admin
--

COMMENT ON TABLE public.t_scheme_details IS 'Mutual fund scheme details and metadata';


--
-- Name: COLUMN t_scheme_details.scheme_code; Type: COMMENT; Schema: public; Owner: kewal_admin
--

COMMENT ON COLUMN public.t_scheme_details.scheme_code IS 'Unique scheme identifier from AMFI';


--
-- Name: COLUMN t_scheme_details.last_nav_download_date; Type: COMMENT; Schema: public; Owner: kewal_admin
--

COMMENT ON COLUMN public.t_scheme_details.last_nav_download_date IS 'Last NAV download attempt date (global)';


--
-- Name: COLUMN t_scheme_details.historical_data_available; Type: COMMENT; Schema: public; Owner: kewal_admin
--

COMMENT ON COLUMN public.t_scheme_details.historical_data_available IS 'Whether historical NAV data has been downloaded';


--
-- Name: COLUMN t_scheme_details.total_nav_records; Type: COMMENT; Schema: public; Owner: kewal_admin
--

COMMENT ON COLUMN public.t_scheme_details.total_nav_records IS 'Count of NAV records in t_nav_data';


--
-- Name: t_scheme_details_id_seq; Type: SEQUENCE; Schema: public; Owner: kewal_admin
--

CREATE SEQUENCE public.t_scheme_details_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.t_scheme_details_id_seq OWNER TO kewal_admin;

--
-- Name: t_scheme_details_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: kewal_admin
--

ALTER SEQUENCE public.t_scheme_details_id_seq OWNED BY public.t_scheme_details.id;


--
-- Name: t_scheme_masters; Type: TABLE; Schema: public; Owner: kewal_admin
--

CREATE TABLE public.t_scheme_masters (
    id integer NOT NULL,
    tenant_id integer DEFAULT 1,
    is_live boolean DEFAULT true,
    is_active boolean DEFAULT true,
    master_type character varying(50),
    code character varying(50),
    name character varying(255) NOT NULL,
    display_order integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT t_scheme_masters_master_type_check CHECK (((master_type)::text = ANY ((ARRAY['scheme_type'::character varying, 'scheme_category'::character varying])::text[])))
);


ALTER TABLE public.t_scheme_masters OWNER TO kewal_admin;

--
-- Name: TABLE t_scheme_masters; Type: COMMENT; Schema: public; Owner: kewal_admin
--

COMMENT ON TABLE public.t_scheme_masters IS 'Master data for scheme types and categories';


--
-- Name: COLUMN t_scheme_masters.master_type; Type: COMMENT; Schema: public; Owner: kewal_admin
--

COMMENT ON COLUMN public.t_scheme_masters.master_type IS 'Type: scheme_type or scheme_category';


--
-- Name: t_scheme_masters_id_seq; Type: SEQUENCE; Schema: public; Owner: kewal_admin
--

CREATE SEQUENCE public.t_scheme_masters_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.t_scheme_masters_id_seq OWNER TO kewal_admin;

--
-- Name: t_scheme_masters_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: kewal_admin
--

ALTER SEQUENCE public.t_scheme_masters_id_seq OWNED BY public.t_scheme_masters.id;


--
-- Name: t_system_logs; Type: TABLE; Schema: public; Owner: kewal_admin
--

CREATE TABLE public.t_system_logs (
    id bigint NOT NULL,
    level character varying(10) NOT NULL,
    source character varying(50) NOT NULL,
    message text NOT NULL,
    context text,
    user_id integer,
    tenant_id integer,
    metadata jsonb DEFAULT '{}'::jsonb,
    stack_trace text,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT t_system_logs_level_check CHECK (((level)::text = ANY ((ARRAY['error'::character varying, 'warn'::character varying, 'info'::character varying])::text[])))
);


ALTER TABLE public.t_system_logs OWNER TO kewal_admin;

--
-- Name: TABLE t_system_logs; Type: COMMENT; Schema: public; Owner: kewal_admin
--

COMMENT ON TABLE public.t_system_logs IS 'System-wide logs for errors, warnings, and info messages';


--
-- Name: COLUMN t_system_logs.level; Type: COMMENT; Schema: public; Owner: kewal_admin
--

COMMENT ON COLUMN public.t_system_logs.level IS 'Log level: error, warn, or info';


--
-- Name: COLUMN t_system_logs.source; Type: COMMENT; Schema: public; Owner: kewal_admin
--

COMMENT ON COLUMN public.t_system_logs.source IS 'Source of the log entry (e.g., backend, frontend, n8n)';


--
-- Name: COLUMN t_system_logs.context; Type: COMMENT; Schema: public; Owner: kewal_admin
--

COMMENT ON COLUMN public.t_system_logs.context IS 'Contextual information about where the log occurred';


--
-- Name: COLUMN t_system_logs.metadata; Type: COMMENT; Schema: public; Owner: kewal_admin
--

COMMENT ON COLUMN public.t_system_logs.metadata IS 'Additional structured data in JSON format';


--
-- Name: COLUMN t_system_logs.stack_trace; Type: COMMENT; Schema: public; Owner: kewal_admin
--

COMMENT ON COLUMN public.t_system_logs.stack_trace IS 'Stack trace for error-level logs';


--
-- Name: t_system_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: kewal_admin
--

CREATE SEQUENCE public.t_system_logs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.t_system_logs_id_seq OWNER TO kewal_admin;

--
-- Name: t_system_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: kewal_admin
--

ALTER SEQUENCE public.t_system_logs_id_seq OWNED BY public.t_system_logs.id;


--
-- Name: t_tenants; Type: TABLE; Schema: public; Owner: kewal_admin
--

CREATE TABLE public.t_tenants (
    id integer NOT NULL,
    tenant_code character varying(50) NOT NULL,
    tenant_name character varying(255) NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    settings jsonb DEFAULT '{}'::jsonb,
    subscription_plan character varying(50) DEFAULT 'basic'::character varying,
    is_admin boolean DEFAULT false
);


ALTER TABLE public.t_tenants OWNER TO kewal_admin;

--
-- Name: TABLE t_tenants; Type: COMMENT; Schema: public; Owner: kewal_admin
--

COMMENT ON TABLE public.t_tenants IS 'Multi-tenant isolation - each client has separate data';


--
-- Name: COLUMN t_tenants.tenant_code; Type: COMMENT; Schema: public; Owner: kewal_admin
--

COMMENT ON COLUMN public.t_tenants.tenant_code IS 'Unique identifier for tenant (e.g., kewal, localsing)';


--
-- Name: COLUMN t_tenants.settings; Type: COMMENT; Schema: public; Owner: kewal_admin
--

COMMENT ON COLUMN public.t_tenants.settings IS 'JSON configuration for tenant-specific settings';


--
-- Name: COLUMN t_tenants.is_admin; Type: COMMENT; Schema: public; Owner: kewal_admin
--

COMMENT ON COLUMN public.t_tenants.is_admin IS 'System admin tenant flag - only ONE tenant should have this as true (SaaS owner)';


--
-- Name: t_tenants_id_seq; Type: SEQUENCE; Schema: public; Owner: kewal_admin
--

CREATE SEQUENCE public.t_tenants_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.t_tenants_id_seq OWNER TO kewal_admin;

--
-- Name: t_tenants_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: kewal_admin
--

ALTER SEQUENCE public.t_tenants_id_seq OWNED BY public.t_tenants.id;


--
-- Name: t_transaction_table_id_seq; Type: SEQUENCE; Schema: public; Owner: kewal_admin
--

CREATE SEQUENCE public.t_transaction_table_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.t_transaction_table_id_seq OWNER TO kewal_admin;

--
-- Name: t_transaction_table_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: kewal_admin
--

ALTER SEQUENCE public.t_transaction_table_id_seq OWNED BY public.t_transaction_table.id;


--
-- Name: t_user_chart_preferences; Type: TABLE; Schema: public; Owner: kewal_admin
--

CREATE TABLE public.t_user_chart_preferences (
    id integer NOT NULL,
    user_id integer NOT NULL,
    index_id integer NOT NULL,
    line_color character varying(7) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_hex_color CHECK (((line_color)::text ~ '^#[0-9A-Fa-f]{6}$'::text))
);


ALTER TABLE public.t_user_chart_preferences OWNER TO kewal_admin;

--
-- Name: TABLE t_user_chart_preferences; Type: COMMENT; Schema: public; Owner: kewal_admin
--

COMMENT ON TABLE public.t_user_chart_preferences IS 'Stores user-specific chart visualization preferences per index';


--
-- Name: COLUMN t_user_chart_preferences.line_color; Type: COMMENT; Schema: public; Owner: kewal_admin
--

COMMENT ON COLUMN public.t_user_chart_preferences.line_color IS 'Hex color code for chart line. Falls back to theme default if not set.';


--
-- Name: t_user_chart_preferences_id_seq; Type: SEQUENCE; Schema: public; Owner: kewal_admin
--

CREATE SEQUENCE public.t_user_chart_preferences_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.t_user_chart_preferences_id_seq OWNER TO kewal_admin;

--
-- Name: t_user_chart_preferences_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: kewal_admin
--

ALTER SEQUENCE public.t_user_chart_preferences_id_seq OWNED BY public.t_user_chart_preferences.id;


--
-- Name: t_users; Type: TABLE; Schema: public; Owner: kewal_admin
--

CREATE TABLE public.t_users (
    id integer NOT NULL,
    tenant_id integer DEFAULT 1,
    email character varying(255) NOT NULL,
    password_hash character varying(255) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    is_active boolean DEFAULT true,
    theme_preference character varying(50) DEFAULT 'techy-simple'::character varying,
    environment_preference character varying(10) DEFAULT 'live'::character varying,
    is_live boolean DEFAULT true
);


ALTER TABLE public.t_users OWNER TO kewal_admin;

--
-- Name: TABLE t_users; Type: COMMENT; Schema: public; Owner: kewal_admin
--

COMMENT ON TABLE public.t_users IS 'User accounts with role-based access';


--
-- Name: COLUMN t_users.environment_preference; Type: COMMENT; Schema: public; Owner: kewal_admin
--

COMMENT ON COLUMN public.t_users.environment_preference IS 'User default: live or test environment';


--
-- Name: COLUMN t_users.is_live; Type: COMMENT; Schema: public; Owner: kewal_admin
--

COMMENT ON COLUMN public.t_users.is_live IS 'Data environment flag: true=production, false=test';


--
-- Name: t_users_id_seq; Type: SEQUENCE; Schema: public; Owner: kewal_admin
--

CREATE SEQUENCE public.t_users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.t_users_id_seq OWNER TO kewal_admin;

--
-- Name: t_users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: kewal_admin
--

ALTER SEQUENCE public.t_users_id_seq OWNED BY public.t_users.id;


--
-- Name: v_import_staging_statistics; Type: VIEW; Schema: public; Owner: kewal_admin
--

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


--
-- Name: v_import_staging_progress; Type: VIEW; Schema: public; Owner: kewal_admin
--

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


--
-- Name: v_portfolio_current; Type: MATERIALIZED VIEW; Schema: public; Owner: kewal_admin
--

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

--
-- Name: v_tenant_customer_schemes; Type: VIEW; Schema: public; Owner: kewal_admin
--

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


--
-- Name: COLUMN v_tenant_customer_schemes.customer_count; Type: COMMENT; Schema: public; Owner: kewal_admin
--

COMMENT ON COLUMN public.v_tenant_customer_schemes.customer_count IS 'Number of distinct customers holding this scheme';


--
-- Name: COLUMN v_tenant_customer_schemes.transaction_count; Type: COMMENT; Schema: public; Owner: kewal_admin
--

COMMENT ON COLUMN public.v_tenant_customer_schemes.transaction_count IS 'Total transactions across all customers for this scheme';


--
-- Name: COLUMN v_tenant_customer_schemes.total_invested; Type: COMMENT; Schema: public; Owner: kewal_admin
--

COMMENT ON COLUMN public.v_tenant_customer_schemes.total_invested IS 'Sum of amounts where portfolio_flag = true';


--
-- Name: auth_provider_sync_history id; Type: DEFAULT; Schema: n8n; Owner: kewal_admin
--

ALTER TABLE ONLY n8n.auth_provider_sync_history ALTER COLUMN id SET DEFAULT nextval('n8n.auth_provider_sync_history_id_seq'::regclass);


--
-- Name: execution_annotations id; Type: DEFAULT; Schema: n8n; Owner: kewal_admin
--

ALTER TABLE ONLY n8n.execution_annotations ALTER COLUMN id SET DEFAULT nextval('n8n.execution_annotations_id_seq'::regclass);


--
-- Name: execution_entity id; Type: DEFAULT; Schema: n8n; Owner: kewal_admin
--

ALTER TABLE ONLY n8n.execution_entity ALTER COLUMN id SET DEFAULT nextval('n8n.execution_entity_id_seq'::regclass);


--
-- Name: execution_metadata id; Type: DEFAULT; Schema: n8n; Owner: kewal_admin
--

ALTER TABLE ONLY n8n.execution_metadata ALTER COLUMN id SET DEFAULT nextval('n8n.execution_metadata_temp_id_seq'::regclass);


--
-- Name: migrations id; Type: DEFAULT; Schema: n8n; Owner: kewal_admin
--

ALTER TABLE ONLY n8n.migrations ALTER COLUMN id SET DEFAULT nextval('n8n.migrations_id_seq'::regclass);


--
-- Name: m_bookmark_reasons id; Type: DEFAULT; Schema: public; Owner: kewal_admin
--

ALTER TABLE ONLY public.m_bookmark_reasons ALTER COLUMN id SET DEFAULT nextval('public.m_bookmark_reasons_id_seq'::regclass);


--
-- Name: m_transaction_types id; Type: DEFAULT; Schema: public; Owner: kewal_admin
--

ALTER TABLE ONLY public.m_transaction_types ALTER COLUMN id SET DEFAULT nextval('public.m_transaction_types_id_seq'::regclass);


--
-- Name: t_chat_messages id; Type: DEFAULT; Schema: public; Owner: kewal_admin
--

ALTER TABLE ONLY public.t_chat_messages ALTER COLUMN id SET DEFAULT nextval('public.t_chat_messages_id_seq'::regclass);


--
-- Name: t_chat_sessions id; Type: DEFAULT; Schema: public; Owner: kewal_admin
--

ALTER TABLE ONLY public.t_chat_sessions ALTER COLUMN id SET DEFAULT nextval('public.t_chat_sessions_id_seq'::regclass);


--
-- Name: t_contact_channels id; Type: DEFAULT; Schema: public; Owner: kewal_admin
--

ALTER TABLE ONLY public.t_contact_channels ALTER COLUMN id SET DEFAULT nextval('public.t_contact_channels_id_seq'::regclass);


--
-- Name: t_contacts id; Type: DEFAULT; Schema: public; Owner: kewal_admin
--

ALTER TABLE ONLY public.t_contacts ALTER COLUMN id SET DEFAULT nextval('public.t_contacts_id_seq'::regclass);


--
-- Name: t_customer_addresses id; Type: DEFAULT; Schema: public; Owner: kewal_admin
--

ALTER TABLE ONLY public.t_customer_addresses ALTER COLUMN id SET DEFAULT nextval('public.t_customer_addresses_id_seq'::regclass);


--
-- Name: t_customer_bookmarks id; Type: DEFAULT; Schema: public; Owner: kewal_admin
--

ALTER TABLE ONLY public.t_customer_bookmarks ALTER COLUMN id SET DEFAULT nextval('public.t_customer_bookmarks_id_seq'::regclass);


--
-- Name: t_customer_master_portfolio id; Type: DEFAULT; Schema: public; Owner: kewal_admin
--

ALTER TABLE ONLY public.t_customer_master_portfolio ALTER COLUMN id SET DEFAULT nextval('public.t_customer_master_portfolio_id_seq'::regclass);


--
-- Name: t_customers id; Type: DEFAULT; Schema: public; Owner: kewal_admin
--

ALTER TABLE ONLY public.t_customers ALTER COLUMN id SET DEFAULT nextval('public.t_customers_id_seq'::regclass);


--
-- Name: t_file_uploads id; Type: DEFAULT; Schema: public; Owner: kewal_admin
--

ALTER TABLE ONLY public.t_file_uploads ALTER COLUMN id SET DEFAULT nextval('public.t_file_uploads_id_seq'::regclass);


--
-- Name: t_goal_alerts id; Type: DEFAULT; Schema: public; Owner: kewal_admin
--

ALTER TABLE ONLY public.t_goal_alerts ALTER COLUMN id SET DEFAULT nextval('public.t_goal_alerts_id_seq'::regclass);


--
-- Name: t_goal_progress_snapshots id; Type: DEFAULT; Schema: public; Owner: kewal_admin
--

ALTER TABLE ONLY public.t_goal_progress_snapshots ALTER COLUMN id SET DEFAULT nextval('public.t_goal_progress_snapshots_id_seq'::regclass);


--
-- Name: t_import_field_mappings id; Type: DEFAULT; Schema: public; Owner: kewal_admin
--

ALTER TABLE ONLY public.t_import_field_mappings ALTER COLUMN id SET DEFAULT nextval('public.t_import_field_mappings_id_seq'::regclass);


--
-- Name: t_import_logs id; Type: DEFAULT; Schema: public; Owner: kewal_admin
--

ALTER TABLE ONLY public.t_import_logs ALTER COLUMN id SET DEFAULT nextval('public.t_import_logs_id_seq'::regclass);


--
-- Name: t_import_record_results id; Type: DEFAULT; Schema: public; Owner: kewal_admin
--

ALTER TABLE ONLY public.t_import_record_results ALTER COLUMN id SET DEFAULT nextval('public.t_import_record_results_id_seq'::regclass);


--
-- Name: t_import_sessions id; Type: DEFAULT; Schema: public; Owner: kewal_admin
--

ALTER TABLE ONLY public.t_import_sessions ALTER COLUMN id SET DEFAULT nextval('public.t_import_sessions_id_seq'::regclass);


--
-- Name: t_import_staging_data id; Type: DEFAULT; Schema: public; Owner: kewal_admin
--

ALTER TABLE ONLY public.t_import_staging_data ALTER COLUMN id SET DEFAULT nextval('public.t_import_staging_data_id_seq'::regclass);


--
-- Name: t_jtbd_configurations id; Type: DEFAULT; Schema: public; Owner: kewal_admin
--

ALTER TABLE ONLY public.t_jtbd_configurations ALTER COLUMN id SET DEFAULT nextval('public.t_jtbd_configurations_id_seq'::regclass);


--
-- Name: t_market_data_records id; Type: DEFAULT; Schema: public; Owner: kewal_admin
--

ALTER TABLE ONLY public.t_market_data_records ALTER COLUMN id SET DEFAULT nextval('public.t_market_data_records_id_seq'::regclass);


--
-- Name: t_market_download_jobs id; Type: DEFAULT; Schema: public; Owner: kewal_admin
--

ALTER TABLE ONLY public.t_market_download_jobs ALTER COLUMN id SET DEFAULT nextval('public.t_market_download_jobs_id_seq'::regclass);


--
-- Name: t_market_download_logs id; Type: DEFAULT; Schema: public; Owner: kewal_admin
--

ALTER TABLE ONLY public.t_market_download_logs ALTER COLUMN id SET DEFAULT nextval('public.t_market_download_logs_id_seq'::regclass);


--
-- Name: t_market_eod_scheduler id; Type: DEFAULT; Schema: public; Owner: kewal_admin
--

ALTER TABLE ONLY public.t_market_eod_scheduler ALTER COLUMN id SET DEFAULT nextval('public.t_market_eod_scheduler_id_seq'::regclass);


--
-- Name: t_market_indices id; Type: DEFAULT; Schema: public; Owner: kewal_admin
--

ALTER TABLE ONLY public.t_market_indices ALTER COLUMN id SET DEFAULT nextval('public.t_market_indices_id_seq'::regclass);


--
-- Name: t_monthly_portfolio_snapshots id; Type: DEFAULT; Schema: public; Owner: kewal_admin
--

ALTER TABLE ONLY public.t_monthly_portfolio_snapshots ALTER COLUMN id SET DEFAULT nextval('public.t_monthly_portfolio_snapshots_id_seq'::regclass);


--
-- Name: t_nav_data id; Type: DEFAULT; Schema: public; Owner: kewal_admin
--

ALTER TABLE ONLY public.t_nav_data ALTER COLUMN id SET DEFAULT nextval('public.t_nav_data_id_seq'::regclass);


--
-- Name: t_nav_download_jobs id; Type: DEFAULT; Schema: public; Owner: kewal_admin
--

ALTER TABLE ONLY public.t_nav_download_jobs ALTER COLUMN id SET DEFAULT nextval('public.t_nav_download_jobs_id_seq'::regclass);


--
-- Name: t_nav_schedule_executions id; Type: DEFAULT; Schema: public; Owner: kewal_admin
--

ALTER TABLE ONLY public.t_nav_schedule_executions ALTER COLUMN id SET DEFAULT nextval('public.t_nav_schedule_executions_id_seq'::regclass);


--
-- Name: t_nav_scheduler_configs id; Type: DEFAULT; Schema: public; Owner: kewal_admin
--

ALTER TABLE ONLY public.t_nav_scheduler_configs ALTER COLUMN id SET DEFAULT nextval('public.t_nav_scheduler_configs_id_seq'::regclass);


--
-- Name: t_scheme_bookmarks id; Type: DEFAULT; Schema: public; Owner: kewal_admin
--

ALTER TABLE ONLY public.t_scheme_bookmarks ALTER COLUMN id SET DEFAULT nextval('public.t_scheme_bookmarks_id_seq'::regclass);


--
-- Name: t_scheme_details id; Type: DEFAULT; Schema: public; Owner: kewal_admin
--

ALTER TABLE ONLY public.t_scheme_details ALTER COLUMN id SET DEFAULT nextval('public.t_scheme_details_id_seq'::regclass);


--
-- Name: t_scheme_masters id; Type: DEFAULT; Schema: public; Owner: kewal_admin
--

ALTER TABLE ONLY public.t_scheme_masters ALTER COLUMN id SET DEFAULT nextval('public.t_scheme_masters_id_seq'::regclass);


--
-- Name: t_system_logs id; Type: DEFAULT; Schema: public; Owner: kewal_admin
--

ALTER TABLE ONLY public.t_system_logs ALTER COLUMN id SET DEFAULT nextval('public.t_system_logs_id_seq'::regclass);


--
-- Name: t_tenants id; Type: DEFAULT; Schema: public; Owner: kewal_admin
--

ALTER TABLE ONLY public.t_tenants ALTER COLUMN id SET DEFAULT nextval('public.t_tenants_id_seq'::regclass);


--
-- Name: t_transaction_table id; Type: DEFAULT; Schema: public; Owner: kewal_admin
--

ALTER TABLE ONLY public.t_transaction_table ALTER COLUMN id SET DEFAULT nextval('public.t_transaction_table_id_seq'::regclass);


--
-- Name: t_user_chart_preferences id; Type: DEFAULT; Schema: public; Owner: kewal_admin
--

ALTER TABLE ONLY public.t_user_chart_preferences ALTER COLUMN id SET DEFAULT nextval('public.t_user_chart_preferences_id_seq'::regclass);


--
-- Name: t_users id; Type: DEFAULT; Schema: public; Owner: kewal_admin
--

ALTER TABLE ONLY public.t_users ALTER COLUMN id SET DEFAULT nextval('public.t_users_id_seq'::regclass);


--
-- Name: test_run PK_011c050f566e9db509a0fadb9b9; Type: CONSTRAINT; Schema: n8n; Owner: kewal_admin
--

ALTER TABLE ONLY n8n.test_run
    ADD CONSTRAINT "PK_011c050f566e9db509a0fadb9b9" PRIMARY KEY (id);


--
-- Name: installed_packages PK_08cc9197c39b028c1e9beca225940576fd1a5804; Type: CONSTRAINT; Schema: n8n; Owner: kewal_admin
--

ALTER TABLE ONLY n8n.installed_packages
    ADD CONSTRAINT "PK_08cc9197c39b028c1e9beca225940576fd1a5804" PRIMARY KEY ("packageName");


--
-- Name: execution_metadata PK_17a0b6284f8d626aae88e1c16e4; Type: CONSTRAINT; Schema: n8n; Owner: kewal_admin
--

ALTER TABLE ONLY n8n.execution_metadata
    ADD CONSTRAINT "PK_17a0b6284f8d626aae88e1c16e4" PRIMARY KEY (id);


--
-- Name: project_relation PK_1caaa312a5d7184a003be0f0cb6; Type: CONSTRAINT; Schema: n8n; Owner: kewal_admin
--

ALTER TABLE ONLY n8n.project_relation
    ADD CONSTRAINT "PK_1caaa312a5d7184a003be0f0cb6" PRIMARY KEY ("projectId", "userId");


--
-- Name: folder_tag PK_27e4e00852f6b06a925a4d83a3e; Type: CONSTRAINT; Schema: n8n; Owner: kewal_admin
--

ALTER TABLE ONLY n8n.folder_tag
    ADD CONSTRAINT "PK_27e4e00852f6b06a925a4d83a3e" PRIMARY KEY ("folderId", "tagId");


--
-- Name: role PK_35c9b140caaf6da09cfabb0d675; Type: CONSTRAINT; Schema: n8n; Owner: kewal_admin
--

ALTER TABLE ONLY n8n.role
    ADD CONSTRAINT "PK_35c9b140caaf6da09cfabb0d675" PRIMARY KEY (slug);


--
-- Name: project PK_4d68b1358bb5b766d3e78f32f57; Type: CONSTRAINT; Schema: n8n; Owner: kewal_admin
--

ALTER TABLE ONLY n8n.project
    ADD CONSTRAINT "PK_4d68b1358bb5b766d3e78f32f57" PRIMARY KEY (id);


--
-- Name: invalid_auth_token PK_5779069b7235b256d91f7af1a15; Type: CONSTRAINT; Schema: n8n; Owner: kewal_admin
--

ALTER TABLE ONLY n8n.invalid_auth_token
    ADD CONSTRAINT "PK_5779069b7235b256d91f7af1a15" PRIMARY KEY (token);


--
-- Name: shared_workflow PK_5ba87620386b847201c9531c58f; Type: CONSTRAINT; Schema: n8n; Owner: kewal_admin
--

ALTER TABLE ONLY n8n.shared_workflow
    ADD CONSTRAINT "PK_5ba87620386b847201c9531c58f" PRIMARY KEY ("workflowId", "projectId");


--
-- Name: folder PK_6278a41a706740c94c02e288df8; Type: CONSTRAINT; Schema: n8n; Owner: kewal_admin
--

ALTER TABLE ONLY n8n.folder
    ADD CONSTRAINT "PK_6278a41a706740c94c02e288df8" PRIMARY KEY (id);


--
-- Name: data_table_column PK_673cb121ee4a8a5e27850c72c51; Type: CONSTRAINT; Schema: n8n; Owner: kewal_admin
--

ALTER TABLE ONLY n8n.data_table_column
    ADD CONSTRAINT "PK_673cb121ee4a8a5e27850c72c51" PRIMARY KEY (id);


--
-- Name: annotation_tag_entity PK_69dfa041592c30bbc0d4b84aa00; Type: CONSTRAINT; Schema: n8n; Owner: kewal_admin
--

ALTER TABLE ONLY n8n.annotation_tag_entity
    ADD CONSTRAINT "PK_69dfa041592c30bbc0d4b84aa00" PRIMARY KEY (id);


--
-- Name: execution_annotations PK_7afcf93ffa20c4252869a7c6a23; Type: CONSTRAINT; Schema: n8n; Owner: kewal_admin
--

ALTER TABLE ONLY n8n.execution_annotations
    ADD CONSTRAINT "PK_7afcf93ffa20c4252869a7c6a23" PRIMARY KEY (id);


--
-- Name: migrations PK_8c82d7f526340ab734260ea46be; Type: CONSTRAINT; Schema: n8n; Owner: kewal_admin
--

ALTER TABLE ONLY n8n.migrations
    ADD CONSTRAINT "PK_8c82d7f526340ab734260ea46be" PRIMARY KEY (id);


--
-- Name: installed_nodes PK_8ebd28194e4f792f96b5933423fc439df97d9689; Type: CONSTRAINT; Schema: n8n; Owner: kewal_admin
--

ALTER TABLE ONLY n8n.installed_nodes
    ADD CONSTRAINT "PK_8ebd28194e4f792f96b5933423fc439df97d9689" PRIMARY KEY (name);


--
-- Name: shared_credentials PK_8ef3a59796a228913f251779cff; Type: CONSTRAINT; Schema: n8n; Owner: kewal_admin
--

ALTER TABLE ONLY n8n.shared_credentials
    ADD CONSTRAINT "PK_8ef3a59796a228913f251779cff" PRIMARY KEY ("credentialsId", "projectId");


--
-- Name: test_case_execution PK_90c121f77a78a6580e94b794bce; Type: CONSTRAINT; Schema: n8n; Owner: kewal_admin
--

ALTER TABLE ONLY n8n.test_case_execution
    ADD CONSTRAINT "PK_90c121f77a78a6580e94b794bce" PRIMARY KEY (id);


--
-- Name: user_api_keys PK_978fa5caa3468f463dac9d92e69; Type: CONSTRAINT; Schema: n8n; Owner: kewal_admin
--

ALTER TABLE ONLY n8n.user_api_keys
    ADD CONSTRAINT "PK_978fa5caa3468f463dac9d92e69" PRIMARY KEY (id);


--
-- Name: execution_annotation_tags PK_979ec03d31294cca484be65d11f; Type: CONSTRAINT; Schema: n8n; Owner: kewal_admin
--

ALTER TABLE ONLY n8n.execution_annotation_tags
    ADD CONSTRAINT "PK_979ec03d31294cca484be65d11f" PRIMARY KEY ("annotationId", "tagId");


--
-- Name: webhook_entity PK_b21ace2e13596ccd87dc9bf4ea6; Type: CONSTRAINT; Schema: n8n; Owner: kewal_admin
--

ALTER TABLE ONLY n8n.webhook_entity
    ADD CONSTRAINT "PK_b21ace2e13596ccd87dc9bf4ea6" PRIMARY KEY ("webhookPath", method);


--
-- Name: insights_by_period PK_b606942249b90cc39b0265f0575; Type: CONSTRAINT; Schema: n8n; Owner: kewal_admin
--

ALTER TABLE ONLY n8n.insights_by_period
    ADD CONSTRAINT "PK_b606942249b90cc39b0265f0575" PRIMARY KEY (id);


--
-- Name: workflow_history PK_b6572dd6173e4cd06fe79937b58; Type: CONSTRAINT; Schema: n8n; Owner: kewal_admin
--

ALTER TABLE ONLY n8n.workflow_history
    ADD CONSTRAINT "PK_b6572dd6173e4cd06fe79937b58" PRIMARY KEY ("versionId");


--
-- Name: scope PK_bfc45df0481abd7f355d6187da1; Type: CONSTRAINT; Schema: n8n; Owner: kewal_admin
--

ALTER TABLE ONLY n8n.scope
    ADD CONSTRAINT "PK_bfc45df0481abd7f355d6187da1" PRIMARY KEY (slug);


--
-- Name: processed_data PK_ca04b9d8dc72de268fe07a65773; Type: CONSTRAINT; Schema: n8n; Owner: kewal_admin
--

ALTER TABLE ONLY n8n.processed_data
    ADD CONSTRAINT "PK_ca04b9d8dc72de268fe07a65773" PRIMARY KEY ("workflowId", context);


--
-- Name: settings PK_dc0fe14e6d9943f268e7b119f69ab8bd; Type: CONSTRAINT; Schema: n8n; Owner: kewal_admin
--

ALTER TABLE ONLY n8n.settings
    ADD CONSTRAINT "PK_dc0fe14e6d9943f268e7b119f69ab8bd" PRIMARY KEY (key);


--
-- Name: data_table PK_e226d0001b9e6097cbfe70617cb; Type: CONSTRAINT; Schema: n8n; Owner: kewal_admin
--

ALTER TABLE ONLY n8n.data_table
    ADD CONSTRAINT "PK_e226d0001b9e6097cbfe70617cb" PRIMARY KEY (id);


--
-- Name: user PK_ea8f538c94b6e352418254ed6474a81f; Type: CONSTRAINT; Schema: n8n; Owner: kewal_admin
--

ALTER TABLE ONLY n8n."user"
    ADD CONSTRAINT "PK_ea8f538c94b6e352418254ed6474a81f" PRIMARY KEY (id);


--
-- Name: insights_raw PK_ec15125755151e3a7e00e00014f; Type: CONSTRAINT; Schema: n8n; Owner: kewal_admin
--

ALTER TABLE ONLY n8n.insights_raw
    ADD CONSTRAINT "PK_ec15125755151e3a7e00e00014f" PRIMARY KEY (id);


--
-- Name: insights_metadata PK_f448a94c35218b6208ce20cf5a1; Type: CONSTRAINT; Schema: n8n; Owner: kewal_admin
--

ALTER TABLE ONLY n8n.insights_metadata
    ADD CONSTRAINT "PK_f448a94c35218b6208ce20cf5a1" PRIMARY KEY ("metaId");


--
-- Name: role_scope PK_role_scope; Type: CONSTRAINT; Schema: n8n; Owner: kewal_admin
--

ALTER TABLE ONLY n8n.role_scope
    ADD CONSTRAINT "PK_role_scope" PRIMARY KEY ("roleSlug", "scopeSlug");


--
-- Name: data_table_column UQ_8082ec4890f892f0bc77473a123; Type: CONSTRAINT; Schema: n8n; Owner: kewal_admin
--

ALTER TABLE ONLY n8n.data_table_column
    ADD CONSTRAINT "UQ_8082ec4890f892f0bc77473a123" UNIQUE ("dataTableId", name);


--
-- Name: data_table UQ_b23096ef747281ac944d28e8b0d; Type: CONSTRAINT; Schema: n8n; Owner: kewal_admin
--

ALTER TABLE ONLY n8n.data_table
    ADD CONSTRAINT "UQ_b23096ef747281ac944d28e8b0d" UNIQUE ("projectId", name);


--
-- Name: user UQ_e12875dfb3b1d92d7d7c5377e2; Type: CONSTRAINT; Schema: n8n; Owner: kewal_admin
--

ALTER TABLE ONLY n8n."user"
    ADD CONSTRAINT "UQ_e12875dfb3b1d92d7d7c5377e2" UNIQUE (email);


--
-- Name: auth_identity auth_identity_pkey; Type: CONSTRAINT; Schema: n8n; Owner: kewal_admin
--

ALTER TABLE ONLY n8n.auth_identity
    ADD CONSTRAINT auth_identity_pkey PRIMARY KEY ("providerId", "providerType");


--
-- Name: auth_provider_sync_history auth_provider_sync_history_pkey; Type: CONSTRAINT; Schema: n8n; Owner: kewal_admin
--

ALTER TABLE ONLY n8n.auth_provider_sync_history
    ADD CONSTRAINT auth_provider_sync_history_pkey PRIMARY KEY (id);


--
-- Name: credentials_entity credentials_entity_pkey; Type: CONSTRAINT; Schema: n8n; Owner: kewal_admin
--

ALTER TABLE ONLY n8n.credentials_entity
    ADD CONSTRAINT credentials_entity_pkey PRIMARY KEY (id);


--
-- Name: event_destinations event_destinations_pkey; Type: CONSTRAINT; Schema: n8n; Owner: kewal_admin
--

ALTER TABLE ONLY n8n.event_destinations
    ADD CONSTRAINT event_destinations_pkey PRIMARY KEY (id);


--
-- Name: execution_data execution_data_pkey; Type: CONSTRAINT; Schema: n8n; Owner: kewal_admin
--

ALTER TABLE ONLY n8n.execution_data
    ADD CONSTRAINT execution_data_pkey PRIMARY KEY ("executionId");


--
-- Name: execution_entity pk_e3e63bbf986767844bbe1166d4e; Type: CONSTRAINT; Schema: n8n; Owner: kewal_admin
--

ALTER TABLE ONLY n8n.execution_entity
    ADD CONSTRAINT pk_e3e63bbf986767844bbe1166d4e PRIMARY KEY (id);


--
-- Name: workflow_statistics pk_workflow_statistics; Type: CONSTRAINT; Schema: n8n; Owner: kewal_admin
--

ALTER TABLE ONLY n8n.workflow_statistics
    ADD CONSTRAINT pk_workflow_statistics PRIMARY KEY ("workflowId", name);


--
-- Name: workflows_tags pk_workflows_tags; Type: CONSTRAINT; Schema: n8n; Owner: kewal_admin
--

ALTER TABLE ONLY n8n.workflows_tags
    ADD CONSTRAINT pk_workflows_tags PRIMARY KEY ("workflowId", "tagId");


--
-- Name: tag_entity tag_entity_pkey; Type: CONSTRAINT; Schema: n8n; Owner: kewal_admin
--

ALTER TABLE ONLY n8n.tag_entity
    ADD CONSTRAINT tag_entity_pkey PRIMARY KEY (id);


--
-- Name: variables variables_key_key; Type: CONSTRAINT; Schema: n8n; Owner: kewal_admin
--

ALTER TABLE ONLY n8n.variables
    ADD CONSTRAINT variables_key_key UNIQUE (key);


--
-- Name: variables variables_pkey; Type: CONSTRAINT; Schema: n8n; Owner: kewal_admin
--

ALTER TABLE ONLY n8n.variables
    ADD CONSTRAINT variables_pkey PRIMARY KEY (id);


--
-- Name: workflow_entity workflow_entity_pkey; Type: CONSTRAINT; Schema: n8n; Owner: kewal_admin
--

ALTER TABLE ONLY n8n.workflow_entity
    ADD CONSTRAINT workflow_entity_pkey PRIMARY KEY (id);


--
-- Name: t_import_staging_data idx_unique_session_row; Type: CONSTRAINT; Schema: public; Owner: kewal_admin
--

ALTER TABLE ONLY public.t_import_staging_data
    ADD CONSTRAINT idx_unique_session_row UNIQUE (session_id, row_number);


--
-- Name: m_bookmark_reasons m_bookmark_reasons_pkey; Type: CONSTRAINT; Schema: public; Owner: kewal_admin
--

ALTER TABLE ONLY public.m_bookmark_reasons
    ADD CONSTRAINT m_bookmark_reasons_pkey PRIMARY KEY (id);


--
-- Name: m_transaction_types m_transaction_types_pkey; Type: CONSTRAINT; Schema: public; Owner: kewal_admin
--

ALTER TABLE ONLY public.m_transaction_types
    ADD CONSTRAINT m_transaction_types_pkey PRIMARY KEY (id);


--
-- Name: m_transaction_types m_transaction_types_txn_code_key; Type: CONSTRAINT; Schema: public; Owner: kewal_admin
--

ALTER TABLE ONLY public.m_transaction_types
    ADD CONSTRAINT m_transaction_types_txn_code_key UNIQUE (txn_code);


--
-- Name: t_chat_messages t_chat_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: kewal_admin
--

ALTER TABLE ONLY public.t_chat_messages
    ADD CONSTRAINT t_chat_messages_pkey PRIMARY KEY (id);


--
-- Name: t_chat_sessions t_chat_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: kewal_admin
--

ALTER TABLE ONLY public.t_chat_sessions
    ADD CONSTRAINT t_chat_sessions_pkey PRIMARY KEY (id);


--
-- Name: t_contact_channels t_contact_channels_pkey; Type: CONSTRAINT; Schema: public; Owner: kewal_admin
--

ALTER TABLE ONLY public.t_contact_channels
    ADD CONSTRAINT t_contact_channels_pkey PRIMARY KEY (id);


--
-- Name: t_contacts t_contacts_pkey; Type: CONSTRAINT; Schema: public; Owner: kewal_admin
--

ALTER TABLE ONLY public.t_contacts
    ADD CONSTRAINT t_contacts_pkey PRIMARY KEY (id);


--
-- Name: t_customer_addresses t_customer_addresses_pkey; Type: CONSTRAINT; Schema: public; Owner: kewal_admin
--

ALTER TABLE ONLY public.t_customer_addresses
    ADD CONSTRAINT t_customer_addresses_pkey PRIMARY KEY (id);


--
-- Name: t_customer_bookmarks t_customer_bookmarks_pkey; Type: CONSTRAINT; Schema: public; Owner: kewal_admin
--

ALTER TABLE ONLY public.t_customer_bookmarks
    ADD CONSTRAINT t_customer_bookmarks_pkey PRIMARY KEY (id);


--
-- Name: t_customer_master_portfolio t_customer_master_portfolio_customer_id_scheme_code_tenant__key; Type: CONSTRAINT; Schema: public; Owner: kewal_admin
--

ALTER TABLE ONLY public.t_customer_master_portfolio
    ADD CONSTRAINT t_customer_master_portfolio_customer_id_scheme_code_tenant__key UNIQUE (customer_id, scheme_code, tenant_id, is_live);


--
-- Name: t_customer_master_portfolio t_customer_master_portfolio_pkey; Type: CONSTRAINT; Schema: public; Owner: kewal_admin
--

ALTER TABLE ONLY public.t_customer_master_portfolio
    ADD CONSTRAINT t_customer_master_portfolio_pkey PRIMARY KEY (id);


--
-- Name: t_customers t_customers_pkey; Type: CONSTRAINT; Schema: public; Owner: kewal_admin
--

ALTER TABLE ONLY public.t_customers
    ADD CONSTRAINT t_customers_pkey PRIMARY KEY (id);


--
-- Name: t_file_uploads t_file_uploads_pkey; Type: CONSTRAINT; Schema: public; Owner: kewal_admin
--

ALTER TABLE ONLY public.t_file_uploads
    ADD CONSTRAINT t_file_uploads_pkey PRIMARY KEY (id);


--
-- Name: t_goal_alerts t_goal_alerts_pkey; Type: CONSTRAINT; Schema: public; Owner: kewal_admin
--

ALTER TABLE ONLY public.t_goal_alerts
    ADD CONSTRAINT t_goal_alerts_pkey PRIMARY KEY (id);


--
-- Name: t_goal_progress_snapshots t_goal_progress_snapshots_pkey; Type: CONSTRAINT; Schema: public; Owner: kewal_admin
--

ALTER TABLE ONLY public.t_goal_progress_snapshots
    ADD CONSTRAINT t_goal_progress_snapshots_pkey PRIMARY KEY (id);


--
-- Name: t_import_field_mappings t_import_field_mappings_pkey; Type: CONSTRAINT; Schema: public; Owner: kewal_admin
--

ALTER TABLE ONLY public.t_import_field_mappings
    ADD CONSTRAINT t_import_field_mappings_pkey PRIMARY KEY (id);


--
-- Name: t_import_logs t_import_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: kewal_admin
--

ALTER TABLE ONLY public.t_import_logs
    ADD CONSTRAINT t_import_logs_pkey PRIMARY KEY (id);


--
-- Name: t_import_record_results t_import_record_results_pkey; Type: CONSTRAINT; Schema: public; Owner: kewal_admin
--

ALTER TABLE ONLY public.t_import_record_results
    ADD CONSTRAINT t_import_record_results_pkey PRIMARY KEY (id);


--
-- Name: t_import_sessions t_import_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: kewal_admin
--

ALTER TABLE ONLY public.t_import_sessions
    ADD CONSTRAINT t_import_sessions_pkey PRIMARY KEY (id);


--
-- Name: t_import_staging_data t_import_staging_data_pkey; Type: CONSTRAINT; Schema: public; Owner: kewal_admin
--

ALTER TABLE ONLY public.t_import_staging_data
    ADD CONSTRAINT t_import_staging_data_pkey PRIMARY KEY (id);


--
-- Name: t_jtbd_configurations t_jtbd_configurations_pkey; Type: CONSTRAINT; Schema: public; Owner: kewal_admin
--

ALTER TABLE ONLY public.t_jtbd_configurations
    ADD CONSTRAINT t_jtbd_configurations_pkey PRIMARY KEY (id);


--
-- Name: t_market_data_records t_market_data_records_index_id_date_key; Type: CONSTRAINT; Schema: public; Owner: kewal_admin
--

ALTER TABLE ONLY public.t_market_data_records
    ADD CONSTRAINT t_market_data_records_index_id_date_key UNIQUE (index_id, date);


--
-- Name: t_market_data_records t_market_data_records_pkey; Type: CONSTRAINT; Schema: public; Owner: kewal_admin
--

ALTER TABLE ONLY public.t_market_data_records
    ADD CONSTRAINT t_market_data_records_pkey PRIMARY KEY (id);


--
-- Name: t_market_download_jobs t_market_download_jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: kewal_admin
--

ALTER TABLE ONLY public.t_market_download_jobs
    ADD CONSTRAINT t_market_download_jobs_pkey PRIMARY KEY (id);


--
-- Name: t_market_download_logs t_market_download_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: kewal_admin
--

ALTER TABLE ONLY public.t_market_download_logs
    ADD CONSTRAINT t_market_download_logs_pkey PRIMARY KEY (id);


--
-- Name: t_market_eod_scheduler t_market_eod_scheduler_pkey; Type: CONSTRAINT; Schema: public; Owner: kewal_admin
--

ALTER TABLE ONLY public.t_market_eod_scheduler
    ADD CONSTRAINT t_market_eod_scheduler_pkey PRIMARY KEY (id);


--
-- Name: t_market_indices t_market_indices_index_code_key; Type: CONSTRAINT; Schema: public; Owner: kewal_admin
--

ALTER TABLE ONLY public.t_market_indices
    ADD CONSTRAINT t_market_indices_index_code_key UNIQUE (index_code);


--
-- Name: t_market_indices t_market_indices_pkey; Type: CONSTRAINT; Schema: public; Owner: kewal_admin
--

ALTER TABLE ONLY public.t_market_indices
    ADD CONSTRAINT t_market_indices_pkey PRIMARY KEY (id);


--
-- Name: t_monthly_portfolio_snapshots t_monthly_portfolio_snapshots_pkey; Type: CONSTRAINT; Schema: public; Owner: kewal_admin
--

ALTER TABLE ONLY public.t_monthly_portfolio_snapshots
    ADD CONSTRAINT t_monthly_portfolio_snapshots_pkey PRIMARY KEY (id);


--
-- Name: t_monthly_portfolio_snapshots t_monthly_portfolio_snapshots_tenant_id_is_live_customer_id_key; Type: CONSTRAINT; Schema: public; Owner: kewal_admin
--

ALTER TABLE ONLY public.t_monthly_portfolio_snapshots
    ADD CONSTRAINT t_monthly_portfolio_snapshots_tenant_id_is_live_customer_id_key UNIQUE (tenant_id, is_live, customer_id, snapshot_month_end);


--
-- Name: t_nav_data t_nav_data_pkey; Type: CONSTRAINT; Schema: public; Owner: kewal_admin
--

ALTER TABLE ONLY public.t_nav_data
    ADD CONSTRAINT t_nav_data_pkey PRIMARY KEY (id);


--
-- Name: t_nav_data t_nav_data_scheme_id_nav_date_is_live_key; Type: CONSTRAINT; Schema: public; Owner: kewal_admin
--

ALTER TABLE ONLY public.t_nav_data
    ADD CONSTRAINT t_nav_data_scheme_id_nav_date_is_live_key UNIQUE (scheme_id, nav_date, is_live);


--
-- Name: t_nav_download_jobs t_nav_download_jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: kewal_admin
--

ALTER TABLE ONLY public.t_nav_download_jobs
    ADD CONSTRAINT t_nav_download_jobs_pkey PRIMARY KEY (id);


--
-- Name: t_nav_schedule_executions t_nav_schedule_executions_pkey; Type: CONSTRAINT; Schema: public; Owner: kewal_admin
--

ALTER TABLE ONLY public.t_nav_schedule_executions
    ADD CONSTRAINT t_nav_schedule_executions_pkey PRIMARY KEY (id);


--
-- Name: t_nav_scheduler_configs t_nav_scheduler_configs_pkey; Type: CONSTRAINT; Schema: public; Owner: kewal_admin
--

ALTER TABLE ONLY public.t_nav_scheduler_configs
    ADD CONSTRAINT t_nav_scheduler_configs_pkey PRIMARY KEY (id);


--
-- Name: t_nav_scheduler_configs t_nav_scheduler_configs_tenant_id_user_id_is_live_key; Type: CONSTRAINT; Schema: public; Owner: kewal_admin
--

ALTER TABLE ONLY public.t_nav_scheduler_configs
    ADD CONSTRAINT t_nav_scheduler_configs_tenant_id_user_id_is_live_key UNIQUE (tenant_id, user_id, is_live);


--
-- Name: t_scheme_bookmarks t_scheme_bookmarks_pkey; Type: CONSTRAINT; Schema: public; Owner: kewal_admin
--

ALTER TABLE ONLY public.t_scheme_bookmarks
    ADD CONSTRAINT t_scheme_bookmarks_pkey PRIMARY KEY (id);


--
-- Name: t_scheme_details t_scheme_details_pkey; Type: CONSTRAINT; Schema: public; Owner: kewal_admin
--

ALTER TABLE ONLY public.t_scheme_details
    ADD CONSTRAINT t_scheme_details_pkey PRIMARY KEY (id);


--
-- Name: t_scheme_details t_scheme_details_scheme_code_key; Type: CONSTRAINT; Schema: public; Owner: kewal_admin
--

ALTER TABLE ONLY public.t_scheme_details
    ADD CONSTRAINT t_scheme_details_scheme_code_key UNIQUE (scheme_code);


--
-- Name: t_scheme_masters t_scheme_masters_code_key; Type: CONSTRAINT; Schema: public; Owner: kewal_admin
--

ALTER TABLE ONLY public.t_scheme_masters
    ADD CONSTRAINT t_scheme_masters_code_key UNIQUE (code);


--
-- Name: t_scheme_masters t_scheme_masters_pkey; Type: CONSTRAINT; Schema: public; Owner: kewal_admin
--

ALTER TABLE ONLY public.t_scheme_masters
    ADD CONSTRAINT t_scheme_masters_pkey PRIMARY KEY (id);


--
-- Name: t_system_logs t_system_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: kewal_admin
--

ALTER TABLE ONLY public.t_system_logs
    ADD CONSTRAINT t_system_logs_pkey PRIMARY KEY (id);


--
-- Name: t_tenants t_tenants_pkey; Type: CONSTRAINT; Schema: public; Owner: kewal_admin
--

ALTER TABLE ONLY public.t_tenants
    ADD CONSTRAINT t_tenants_pkey PRIMARY KEY (id);


--
-- Name: t_tenants t_tenants_tenant_code_key; Type: CONSTRAINT; Schema: public; Owner: kewal_admin
--

ALTER TABLE ONLY public.t_tenants
    ADD CONSTRAINT t_tenants_tenant_code_key UNIQUE (tenant_code);


--
-- Name: t_transaction_table t_transaction_table_pkey; Type: CONSTRAINT; Schema: public; Owner: kewal_admin
--

ALTER TABLE ONLY public.t_transaction_table
    ADD CONSTRAINT t_transaction_table_pkey PRIMARY KEY (id);


--
-- Name: t_user_chart_preferences t_user_chart_preferences_pkey; Type: CONSTRAINT; Schema: public; Owner: kewal_admin
--

ALTER TABLE ONLY public.t_user_chart_preferences
    ADD CONSTRAINT t_user_chart_preferences_pkey PRIMARY KEY (id);


--
-- Name: t_users t_users_pkey; Type: CONSTRAINT; Schema: public; Owner: kewal_admin
--

ALTER TABLE ONLY public.t_users
    ADD CONSTRAINT t_users_pkey PRIMARY KEY (id);


--
-- Name: t_customer_addresses unique_address_type_per_customer; Type: CONSTRAINT; Schema: public; Owner: kewal_admin
--

ALTER TABLE ONLY public.t_customer_addresses
    ADD CONSTRAINT unique_address_type_per_customer UNIQUE (customer_id, address_type, is_live);


--
-- Name: t_customer_bookmarks unique_bookmark_per_user_customer; Type: CONSTRAINT; Schema: public; Owner: kewal_admin
--

ALTER TABLE ONLY public.t_customer_bookmarks
    ADD CONSTRAINT unique_bookmark_per_user_customer UNIQUE (tenant_id, is_live, customer_id, user_id);


--
-- Name: t_contact_channels unique_channel_per_contact; Type: CONSTRAINT; Schema: public; Owner: kewal_admin
--

ALTER TABLE ONLY public.t_contact_channels
    ADD CONSTRAINT unique_channel_per_contact UNIQUE (contact_id, channel_type, channel_value, is_live);


--
-- Name: t_customers unique_customer_pan; Type: CONSTRAINT; Schema: public; Owner: kewal_admin
--

ALTER TABLE ONLY public.t_customers
    ADD CONSTRAINT unique_customer_pan UNIQUE (tenant_id, pan, is_live);


--
-- Name: t_users unique_email_per_tenant; Type: CONSTRAINT; Schema: public; Owner: kewal_admin
--

ALTER TABLE ONLY public.t_users
    ADD CONSTRAINT unique_email_per_tenant UNIQUE (tenant_id, email);


--
-- Name: t_goal_progress_snapshots unique_goal_snapshot; Type: CONSTRAINT; Schema: public; Owner: kewal_admin
--

ALTER TABLE ONLY public.t_goal_progress_snapshots
    ADD CONSTRAINT unique_goal_snapshot UNIQUE (goal_id, snapshot_date);


--
-- Name: t_nav_data unique_nav_record; Type: CONSTRAINT; Schema: public; Owner: kewal_admin
--

ALTER TABLE ONLY public.t_nav_data
    ADD CONSTRAINT unique_nav_record UNIQUE (scheme_id, nav_date, is_live);


--
-- Name: m_bookmark_reasons unique_reason_per_tenant; Type: CONSTRAINT; Schema: public; Owner: kewal_admin
--

ALTER TABLE ONLY public.m_bookmark_reasons
    ADD CONSTRAINT unique_reason_per_tenant UNIQUE (tenant_id, is_live, reason_code);


--
-- Name: t_import_field_mappings unique_template_per_type; Type: CONSTRAINT; Schema: public; Owner: kewal_admin
--

ALTER TABLE ONLY public.t_import_field_mappings
    ADD CONSTRAINT unique_template_per_type UNIQUE (tenant_id, import_type, template_name, is_live);


--
-- Name: t_scheme_bookmarks unique_tenant_bookmark; Type: CONSTRAINT; Schema: public; Owner: kewal_admin
--

ALTER TABLE ONLY public.t_scheme_bookmarks
    ADD CONSTRAINT unique_tenant_bookmark UNIQUE (tenant_id, scheme_id, is_live);


--
-- Name: t_user_chart_preferences unique_user_index_pref; Type: CONSTRAINT; Schema: public; Owner: kewal_admin
--

ALTER TABLE ONLY public.t_user_chart_preferences
    ADD CONSTRAINT unique_user_index_pref UNIQUE (user_id, index_id);


--
-- Name: IDX_14f68deffaf858465715995508; Type: INDEX; Schema: n8n; Owner: kewal_admin
--

CREATE UNIQUE INDEX "IDX_14f68deffaf858465715995508" ON n8n.folder USING btree ("projectId", id);


--
-- Name: IDX_1d8ab99d5861c9388d2dc1cf73; Type: INDEX; Schema: n8n; Owner: kewal_admin
--

CREATE UNIQUE INDEX "IDX_1d8ab99d5861c9388d2dc1cf73" ON n8n.insights_metadata USING btree ("workflowId");


--
-- Name: IDX_1e31657f5fe46816c34be7c1b4; Type: INDEX; Schema: n8n; Owner: kewal_admin
--

CREATE INDEX "IDX_1e31657f5fe46816c34be7c1b4" ON n8n.workflow_history USING btree ("workflowId");


--
-- Name: IDX_1ef35bac35d20bdae979d917a3; Type: INDEX; Schema: n8n; Owner: kewal_admin
--

CREATE UNIQUE INDEX "IDX_1ef35bac35d20bdae979d917a3" ON n8n.user_api_keys USING btree ("apiKey");


--
-- Name: IDX_5f0643f6717905a05164090dde; Type: INDEX; Schema: n8n; Owner: kewal_admin
--

CREATE INDEX "IDX_5f0643f6717905a05164090dde" ON n8n.project_relation USING btree ("userId");


--
-- Name: IDX_60b6a84299eeb3f671dfec7693; Type: INDEX; Schema: n8n; Owner: kewal_admin
--

CREATE UNIQUE INDEX "IDX_60b6a84299eeb3f671dfec7693" ON n8n.insights_by_period USING btree ("periodStart", type, "periodUnit", "metaId");


--
-- Name: IDX_61448d56d61802b5dfde5cdb00; Type: INDEX; Schema: n8n; Owner: kewal_admin
--

CREATE INDEX "IDX_61448d56d61802b5dfde5cdb00" ON n8n.project_relation USING btree ("projectId");


--
-- Name: IDX_63d7bbae72c767cf162d459fcc; Type: INDEX; Schema: n8n; Owner: kewal_admin
--

CREATE UNIQUE INDEX "IDX_63d7bbae72c767cf162d459fcc" ON n8n.user_api_keys USING btree ("userId", label);


--
-- Name: IDX_8e4b4774db42f1e6dda3452b2a; Type: INDEX; Schema: n8n; Owner: kewal_admin
--

CREATE INDEX "IDX_8e4b4774db42f1e6dda3452b2a" ON n8n.test_case_execution USING btree ("testRunId");


--
-- Name: IDX_97f863fa83c4786f1956508496; Type: INDEX; Schema: n8n; Owner: kewal_admin
--

CREATE UNIQUE INDEX "IDX_97f863fa83c4786f1956508496" ON n8n.execution_annotations USING btree ("executionId");


--
-- Name: IDX_a3697779b366e131b2bbdae297; Type: INDEX; Schema: n8n; Owner: kewal_admin
--

CREATE INDEX "IDX_a3697779b366e131b2bbdae297" ON n8n.execution_annotation_tags USING btree ("tagId");


--
-- Name: IDX_ae51b54c4bb430cf92f48b623f; Type: INDEX; Schema: n8n; Owner: kewal_admin
--

CREATE UNIQUE INDEX "IDX_ae51b54c4bb430cf92f48b623f" ON n8n.annotation_tag_entity USING btree (name);


--
-- Name: IDX_c1519757391996eb06064f0e7c; Type: INDEX; Schema: n8n; Owner: kewal_admin
--

CREATE INDEX "IDX_c1519757391996eb06064f0e7c" ON n8n.execution_annotation_tags USING btree ("annotationId");


--
-- Name: IDX_cec8eea3bf49551482ccb4933e; Type: INDEX; Schema: n8n; Owner: kewal_admin
--

CREATE UNIQUE INDEX "IDX_cec8eea3bf49551482ccb4933e" ON n8n.execution_metadata USING btree ("executionId", key);


--
-- Name: IDX_d6870d3b6e4c185d33926f423c; Type: INDEX; Schema: n8n; Owner: kewal_admin
--

CREATE INDEX "IDX_d6870d3b6e4c185d33926f423c" ON n8n.test_run USING btree ("workflowId");


--
-- Name: IDX_execution_entity_deletedAt; Type: INDEX; Schema: n8n; Owner: kewal_admin
--

CREATE INDEX "IDX_execution_entity_deletedAt" ON n8n.execution_entity USING btree ("deletedAt");


--
-- Name: IDX_role_scope_scopeSlug; Type: INDEX; Schema: n8n; Owner: kewal_admin
--

CREATE INDEX "IDX_role_scope_scopeSlug" ON n8n.role_scope USING btree ("scopeSlug");


--
-- Name: IDX_workflow_entity_name; Type: INDEX; Schema: n8n; Owner: kewal_admin
--

CREATE INDEX "IDX_workflow_entity_name" ON n8n.workflow_entity USING btree (name);


--
-- Name: idx_07fde106c0b471d8cc80a64fc8; Type: INDEX; Schema: n8n; Owner: kewal_admin
--

CREATE INDEX idx_07fde106c0b471d8cc80a64fc8 ON n8n.credentials_entity USING btree (type);


--
-- Name: idx_16f4436789e804e3e1c9eeb240; Type: INDEX; Schema: n8n; Owner: kewal_admin
--

CREATE INDEX idx_16f4436789e804e3e1c9eeb240 ON n8n.webhook_entity USING btree ("webhookId", method, "pathLength");


--
-- Name: idx_812eb05f7451ca757fb98444ce; Type: INDEX; Schema: n8n; Owner: kewal_admin
--

CREATE UNIQUE INDEX idx_812eb05f7451ca757fb98444ce ON n8n.tag_entity USING btree (name);


--
-- Name: idx_execution_entity_stopped_at_status_deleted_at; Type: INDEX; Schema: n8n; Owner: kewal_admin
--

CREATE INDEX idx_execution_entity_stopped_at_status_deleted_at ON n8n.execution_entity USING btree ("stoppedAt", status, "deletedAt") WHERE (("stoppedAt" IS NOT NULL) AND ("deletedAt" IS NULL));


--
-- Name: idx_execution_entity_wait_till_status_deleted_at; Type: INDEX; Schema: n8n; Owner: kewal_admin
--

CREATE INDEX idx_execution_entity_wait_till_status_deleted_at ON n8n.execution_entity USING btree ("waitTill", status, "deletedAt") WHERE (("waitTill" IS NOT NULL) AND ("deletedAt" IS NULL));


--
-- Name: idx_execution_entity_workflow_id_started_at; Type: INDEX; Schema: n8n; Owner: kewal_admin
--

CREATE INDEX idx_execution_entity_workflow_id_started_at ON n8n.execution_entity USING btree ("workflowId", "startedAt") WHERE (("startedAt" IS NOT NULL) AND ("deletedAt" IS NULL));


--
-- Name: idx_workflows_tags_workflow_id; Type: INDEX; Schema: n8n; Owner: kewal_admin
--

CREATE INDEX idx_workflows_tags_workflow_id ON n8n.workflows_tags USING btree ("workflowId");


--
-- Name: pk_credentials_entity_id; Type: INDEX; Schema: n8n; Owner: kewal_admin
--

CREATE UNIQUE INDEX pk_credentials_entity_id ON n8n.credentials_entity USING btree (id);


--
-- Name: pk_tag_entity_id; Type: INDEX; Schema: n8n; Owner: kewal_admin
--

CREATE UNIQUE INDEX pk_tag_entity_id ON n8n.tag_entity USING btree (id);


--
-- Name: pk_variables_id; Type: INDEX; Schema: n8n; Owner: kewal_admin
--

CREATE UNIQUE INDEX pk_variables_id ON n8n.variables USING btree (id);


--
-- Name: pk_workflow_entity_id; Type: INDEX; Schema: n8n; Owner: kewal_admin
--

CREATE UNIQUE INDEX pk_workflow_entity_id ON n8n.workflow_entity USING btree (id);


--
-- Name: project_relation_role_idx; Type: INDEX; Schema: n8n; Owner: kewal_admin
--

CREATE INDEX project_relation_role_idx ON n8n.project_relation USING btree (role);


--
-- Name: project_relation_role_project_idx; Type: INDEX; Schema: n8n; Owner: kewal_admin
--

CREATE INDEX project_relation_role_project_idx ON n8n.project_relation USING btree ("projectId", role);


--
-- Name: user_role_idx; Type: INDEX; Schema: n8n; Owner: kewal_admin
--

CREATE INDEX user_role_idx ON n8n."user" USING btree ("roleSlug");


--
-- Name: idx_addresses_city; Type: INDEX; Schema: public; Owner: kewal_admin
--

CREATE INDEX idx_addresses_city ON public.t_customer_addresses USING btree (city);


--
-- Name: idx_addresses_customer; Type: INDEX; Schema: public; Owner: kewal_admin
--

CREATE INDEX idx_addresses_customer ON public.t_customer_addresses USING btree (customer_id);


--
-- Name: idx_addresses_pincode; Type: INDEX; Schema: public; Owner: kewal_admin
--

CREATE INDEX idx_addresses_pincode ON public.t_customer_addresses USING btree (pincode);


--
-- Name: idx_addresses_primary; Type: INDEX; Schema: public; Owner: kewal_admin
--

CREATE INDEX idx_addresses_primary ON public.t_customer_addresses USING btree (customer_id, is_primary) WHERE (is_primary = true);


--
-- Name: idx_bookmark_reasons_active; Type: INDEX; Schema: public; Owner: kewal_admin
--

CREATE INDEX idx_bookmark_reasons_active ON public.m_bookmark_reasons USING btree (tenant_id, is_live, display_order) WHERE (is_active = true);


--
-- Name: INDEX idx_bookmark_reasons_active; Type: COMMENT; Schema: public; Owner: kewal_admin
--

COMMENT ON INDEX public.idx_bookmark_reasons_active IS 'Retrieve active reasons sorted by display order';


--
-- Name: idx_bookmark_reasons_code; Type: INDEX; Schema: public; Owner: kewal_admin
--

CREATE INDEX idx_bookmark_reasons_code ON public.m_bookmark_reasons USING btree (tenant_id, is_live, reason_code);


--
-- Name: INDEX idx_bookmark_reasons_code; Type: COMMENT; Schema: public; Owner: kewal_admin
--

COMMENT ON INDEX public.idx_bookmark_reasons_code IS 'Fast lookup by reason code';


--
-- Name: idx_bookmark_reasons_tenant; Type: INDEX; Schema: public; Owner: kewal_admin
--

CREATE INDEX idx_bookmark_reasons_tenant ON public.m_bookmark_reasons USING btree (tenant_id, is_live, is_active);


--
-- Name: INDEX idx_bookmark_reasons_tenant; Type: COMMENT; Schema: public; Owner: kewal_admin
--

COMMENT ON INDEX public.idx_bookmark_reasons_tenant IS 'Fast lookup of reasons by tenant and environment';


--
-- Name: idx_bookmarks_active; Type: INDEX; Schema: public; Owner: kewal_admin
--

CREATE INDEX idx_bookmarks_active ON public.t_scheme_bookmarks USING btree (is_active) WHERE (is_active = true);


--
-- Name: idx_bookmarks_daily_download; Type: INDEX; Schema: public; Owner: kewal_admin
--

CREATE INDEX idx_bookmarks_daily_download ON public.t_scheme_bookmarks USING btree (daily_download_enabled) WHERE (daily_download_enabled = true);


--
-- Name: idx_bookmarks_scheme; Type: INDEX; Schema: public; Owner: kewal_admin
--

CREATE INDEX idx_bookmarks_scheme ON public.t_scheme_bookmarks USING btree (scheme_id);


--
-- Name: idx_bookmarks_tenant_live_active; Type: INDEX; Schema: public; Owner: kewal_admin
--

CREATE INDEX idx_bookmarks_tenant_live_active ON public.t_scheme_bookmarks USING btree (tenant_id, is_live, is_active) WHERE (is_active = true);


--
-- Name: idx_bookmarks_user; Type: INDEX; Schema: public; Owner: kewal_admin
--

CREATE INDEX idx_bookmarks_user ON public.t_scheme_bookmarks USING btree (user_id, tenant_id, is_live);


--
-- Name: idx_channels_contact; Type: INDEX; Schema: public; Owner: kewal_admin
--

CREATE INDEX idx_channels_contact ON public.t_contact_channels USING btree (contact_id);


--
-- Name: idx_channels_email; Type: INDEX; Schema: public; Owner: kewal_admin
--

CREATE INDEX idx_channels_email ON public.t_contact_channels USING btree (channel_value) WHERE (((channel_type)::text = 'email'::text) AND (is_active = true));


--
-- Name: INDEX idx_channels_email; Type: COMMENT; Schema: public; Owner: kewal_admin
--

COMMENT ON INDEX public.idx_channels_email IS 'Fast email lookup for duplicate checking';


--
-- Name: idx_channels_mobile; Type: INDEX; Schema: public; Owner: kewal_admin
--

CREATE INDEX idx_channels_mobile ON public.t_contact_channels USING btree (channel_value) WHERE (((channel_type)::text = 'mobile'::text) AND (is_active = true));


--
-- Name: INDEX idx_channels_mobile; Type: COMMENT; Schema: public; Owner: kewal_admin
--

COMMENT ON INDEX public.idx_channels_mobile IS 'Fast mobile lookup for duplicate checking';


--
-- Name: idx_channels_primary; Type: INDEX; Schema: public; Owner: kewal_admin
--

CREATE INDEX idx_channels_primary ON public.t_contact_channels USING btree (contact_id, channel_type, is_primary) WHERE (is_primary = true);


--
-- Name: idx_channels_type_value; Type: INDEX; Schema: public; Owner: kewal_admin
--

CREATE INDEX idx_channels_type_value ON public.t_contact_channels USING btree (channel_type, channel_value);


--
-- Name: idx_chat_messages_session; Type: INDEX; Schema: public; Owner: kewal_admin
--

CREATE INDEX idx_chat_messages_session ON public.t_chat_messages USING btree (session_id);


--
-- Name: idx_chat_messages_session_time; Type: INDEX; Schema: public; Owner: kewal_admin
--

CREATE INDEX idx_chat_messages_session_time ON public.t_chat_messages USING btree (session_id, created_at);


--
-- Name: idx_chat_sessions_tenant; Type: INDEX; Schema: public; Owner: kewal_admin
--

CREATE INDEX idx_chat_sessions_tenant ON public.t_chat_sessions USING btree (tenant_id, is_live);


--
-- Name: idx_chat_sessions_user; Type: INDEX; Schema: public; Owner: kewal_admin
--

CREATE INDEX idx_chat_sessions_user ON public.t_chat_sessions USING btree (user_id);


--
-- Name: idx_chat_sessions_user_recent; Type: INDEX; Schema: public; Owner: kewal_admin
--

CREATE INDEX idx_chat_sessions_user_recent ON public.t_chat_sessions USING btree (user_id, created_at DESC);


--
-- Name: idx_contacts_active; Type: INDEX; Schema: public; Owner: kewal_admin
--

CREATE INDEX idx_contacts_active ON public.t_contacts USING btree (tenant_id, is_active, is_live);


--
-- Name: idx_contacts_is_customer; Type: INDEX; Schema: public; Owner: kewal_admin
--

CREATE INDEX idx_contacts_is_customer ON public.t_contacts USING btree (is_customer) WHERE (is_customer = true);


--
-- Name: idx_contacts_name; Type: INDEX; Schema: public; Owner: kewal_admin
--

CREATE INDEX idx_contacts_name ON public.t_contacts USING btree (name);


--
-- Name: idx_contacts_tenant; Type: INDEX; Schema: public; Owner: kewal_admin
--

CREATE INDEX idx_contacts_tenant ON public.t_contacts USING btree (tenant_id, is_live);


--
-- Name: idx_customer_bookmarks_active; Type: INDEX; Schema: public; Owner: kewal_admin
--

CREATE INDEX idx_customer_bookmarks_active ON public.t_customer_bookmarks USING btree (is_active, created_at DESC) WHERE (is_active = true);


--
-- Name: INDEX idx_customer_bookmarks_active; Type: COMMENT; Schema: public; Owner: kewal_admin
--

COMMENT ON INDEX public.idx_customer_bookmarks_active IS 'Recent bookmarks query optimization';


--
-- Name: idx_customer_bookmarks_customer; Type: INDEX; Schema: public; Owner: kewal_admin
--

CREATE INDEX idx_customer_bookmarks_customer ON public.t_customer_bookmarks USING btree (customer_id, is_active);


--
-- Name: INDEX idx_customer_bookmarks_customer; Type: COMMENT; Schema: public; Owner: kewal_admin
--

COMMENT ON INDEX public.idx_customer_bookmarks_customer IS 'Fast lookup of bookmarks for a customer';


--
-- Name: idx_customer_bookmarks_reason; Type: INDEX; Schema: public; Owner: kewal_admin
--

CREATE INDEX idx_customer_bookmarks_reason ON public.t_customer_bookmarks USING btree (reason_id) WHERE (reason_id IS NOT NULL);


--
-- Name: INDEX idx_customer_bookmarks_reason; Type: COMMENT; Schema: public; Owner: kewal_admin
--

COMMENT ON INDEX public.idx_customer_bookmarks_reason IS 'Fast filtering by bookmark reason';


--
-- Name: idx_customer_bookmarks_tenant; Type: INDEX; Schema: public; Owner: kewal_admin
--

CREATE INDEX idx_customer_bookmarks_tenant ON public.t_customer_bookmarks USING btree (tenant_id, is_live, is_active);


--
-- Name: idx_customer_bookmarks_user; Type: INDEX; Schema: public; Owner: kewal_admin
--

CREATE INDEX idx_customer_bookmarks_user ON public.t_customer_bookmarks USING btree (user_id, tenant_id, is_live, is_active);


--
-- Name: INDEX idx_customer_bookmarks_user; Type: COMMENT; Schema: public; Owner: kewal_admin
--

COMMENT ON INDEX public.idx_customer_bookmarks_user IS 'Fast lookup of user bookmarks';


--
-- Name: idx_customers_active; Type: INDEX; Schema: public; Owner: kewal_admin
--

CREATE INDEX idx_customers_active ON public.t_customers USING btree (tenant_id, is_active, is_live);


--
-- Name: idx_customers_contact; Type: INDEX; Schema: public; Owner: kewal_admin
--

CREATE INDEX idx_customers_contact ON public.t_customers USING btree (contact_id);


--
-- Name: idx_customers_dob; Type: INDEX; Schema: public; Owner: kewal_admin
--

CREATE INDEX idx_customers_dob ON public.t_customers USING btree (date_of_birth) WHERE (date_of_birth IS NOT NULL);


--
-- Name: idx_customers_iwell_code; Type: INDEX; Schema: public; Owner: kewal_admin
--

CREATE INDEX idx_customers_iwell_code ON public.t_customers USING btree (iwell_code) WHERE ((is_live = true) AND (iwell_code IS NOT NULL));


--
-- Name: INDEX idx_customers_iwell_code; Type: COMMENT; Schema: public; Owner: kewal_admin
--

COMMENT ON INDEX public.idx_customers_iwell_code IS 'Fast IWELL code lookup - PLAIN TEXT';


--
-- Name: idx_customers_jtbd_setup; Type: INDEX; Schema: public; Owner: kewal_admin
--

CREATE INDEX idx_customers_jtbd_setup ON public.t_customers USING btree (has_jtbd_setup) WHERE (has_jtbd_setup = true);


--
-- Name: INDEX idx_customers_jtbd_setup; Type: COMMENT; Schema: public; Owner: kewal_admin
--

COMMENT ON INDEX public.idx_customers_jtbd_setup IS 'Fast lookup of customers with JTBD configurations';


--
-- Name: idx_customers_onboarding; Type: INDEX; Schema: public; Owner: kewal_admin
--

CREATE INDEX idx_customers_onboarding ON public.t_customers USING btree (onboarding_status) WHERE (is_active = true);


--
-- Name: idx_customers_pan; Type: INDEX; Schema: public; Owner: kewal_admin
--

CREATE INDEX idx_customers_pan ON public.t_customers USING btree (pan) WHERE ((is_live = true) AND (pan IS NOT NULL));


--
-- Name: INDEX idx_customers_pan; Type: COMMENT; Schema: public; Owner: kewal_admin
--

COMMENT ON INDEX public.idx_customers_pan IS 'Fast PAN lookup for duplicate checking - PLAIN TEXT';


--
-- Name: idx_customers_referred_by; Type: INDEX; Schema: public; Owner: kewal_admin
--

CREATE INDEX idx_customers_referred_by ON public.t_customers USING btree (referred_by) WHERE (referred_by IS NOT NULL);


--
-- Name: idx_customers_survival; Type: INDEX; Schema: public; Owner: kewal_admin
--

CREATE INDEX idx_customers_survival ON public.t_customers USING btree (survival_status) WHERE (is_active = true);


--
-- Name: idx_customers_tenant; Type: INDEX; Schema: public; Owner: kewal_admin
--

CREATE INDEX idx_customers_tenant ON public.t_customers USING btree (tenant_id, is_live);


--
-- Name: idx_field_mappings_active; Type: INDEX; Schema: public; Owner: kewal_admin
--

CREATE INDEX idx_field_mappings_active ON public.t_import_field_mappings USING btree (is_active) WHERE (is_active = true);


--
-- Name: idx_field_mappings_default; Type: INDEX; Schema: public; Owner: kewal_admin
--

CREATE INDEX idx_field_mappings_default ON public.t_import_field_mappings USING btree (import_type, is_default) WHERE (is_default = true);


--
-- Name: idx_field_mappings_type; Type: INDEX; Schema: public; Owner: kewal_admin
--

CREATE INDEX idx_field_mappings_type ON public.t_import_field_mappings USING btree (tenant_id, import_type, is_live);


--
-- Name: idx_file_uploads_customer; Type: INDEX; Schema: public; Owner: kewal_admin
--

CREATE INDEX idx_file_uploads_customer ON public.t_file_uploads USING btree (customer_id) WHERE (customer_id IS NOT NULL);


--
-- Name: idx_file_uploads_status; Type: INDEX; Schema: public; Owner: kewal_admin
--

CREATE INDEX idx_file_uploads_status ON public.t_file_uploads USING btree (processing_status);


--
-- Name: idx_file_uploads_tenant; Type: INDEX; Schema: public; Owner: kewal_admin
--

CREATE INDEX idx_file_uploads_tenant ON public.t_file_uploads USING btree (tenant_id, is_live);


--
-- Name: idx_file_uploads_type; Type: INDEX; Schema: public; Owner: kewal_admin
--

CREATE INDEX idx_file_uploads_type ON public.t_file_uploads USING btree (file_type);


--
-- Name: idx_goal_alerts_goal; Type: INDEX; Schema: public; Owner: kewal_admin
--

CREATE INDEX idx_goal_alerts_goal ON public.t_goal_alerts USING btree (goal_id, created_at DESC);


--
-- Name: idx_goal_alerts_unacknowledged; Type: INDEX; Schema: public; Owner: kewal_admin
--

CREATE INDEX idx_goal_alerts_unacknowledged ON public.t_goal_alerts USING btree (customer_id, is_acknowledged) WHERE (is_acknowledged = false);


--
-- Name: idx_goal_snapshots_goal; Type: INDEX; Schema: public; Owner: kewal_admin
--

CREATE INDEX idx_goal_snapshots_goal ON public.t_goal_progress_snapshots USING btree (goal_id, snapshot_date DESC);


--
-- Name: idx_goal_snapshots_tenant; Type: INDEX; Schema: public; Owner: kewal_admin
--

CREATE INDEX idx_goal_snapshots_tenant ON public.t_goal_progress_snapshots USING btree (tenant_id, is_live);


--
-- Name: idx_import_logs_file; Type: INDEX; Schema: public; Owner: kewal_admin
--

CREATE INDEX idx_import_logs_file ON public.t_import_logs USING btree (file_upload_id);


--
-- Name: idx_import_logs_tenant; Type: INDEX; Schema: public; Owner: kewal_admin
--

CREATE INDEX idx_import_logs_tenant ON public.t_import_logs USING btree (tenant_id, is_live);


--
-- Name: idx_import_logs_type; Type: INDEX; Schema: public; Owner: kewal_admin
--

CREATE INDEX idx_import_logs_type ON public.t_import_logs USING btree (import_type);


--
-- Name: idx_import_sessions_file; Type: INDEX; Schema: public; Owner: kewal_admin
--

CREATE INDEX idx_import_sessions_file ON public.t_import_sessions USING btree (file_upload_id);


--
-- Name: idx_import_sessions_n8n_execution; Type: INDEX; Schema: public; Owner: kewal_admin
--

CREATE INDEX idx_import_sessions_n8n_execution ON public.t_import_sessions USING btree (n8n_execution_id) WHERE (n8n_execution_id IS NOT NULL);


--
-- Name: idx_import_sessions_processing; Type: INDEX; Schema: public; Owner: kewal_admin
--

CREATE INDEX idx_import_sessions_processing ON public.t_import_sessions USING btree (status) WHERE ((status)::text = ANY ((ARRAY['processing'::character varying, 'pending'::character varying])::text[]));


--
-- Name: idx_import_sessions_staged; Type: INDEX; Schema: public; Owner: kewal_admin
--

CREATE INDEX idx_import_sessions_staged ON public.t_import_sessions USING btree (status) WHERE ((status)::text = 'staged'::text);


--
-- Name: INDEX idx_import_sessions_staged; Type: COMMENT; Schema: public; Owner: kewal_admin
--

COMMENT ON INDEX public.idx_import_sessions_staged IS 'Find sessions ready for processing';


--
-- Name: idx_import_sessions_status; Type: INDEX; Schema: public; Owner: kewal_admin
--

CREATE INDEX idx_import_sessions_status ON public.t_import_sessions USING btree (status);


--
-- Name: idx_import_sessions_tenant_type; Type: INDEX; Schema: public; Owner: kewal_admin
--

CREATE INDEX idx_import_sessions_tenant_type ON public.t_import_sessions USING btree (tenant_id, import_type, is_live);


--
-- Name: idx_import_sessions_type; Type: INDEX; Schema: public; Owner: kewal_admin
--

CREATE INDEX idx_import_sessions_type ON public.t_import_sessions USING btree (import_type);


--
-- Name: idx_jtbd_active; Type: INDEX; Schema: public; Owner: kewal_admin
--

CREATE INDEX idx_jtbd_active ON public.t_jtbd_configurations USING btree (is_active, tenant_id, is_live);


--
-- Name: idx_jtbd_customer; Type: INDEX; Schema: public; Owner: kewal_admin
--

CREATE INDEX idx_jtbd_customer ON public.t_jtbd_configurations USING btree (customer_id, tenant_id, is_live);


--
-- Name: idx_jtbd_next_date; Type: INDEX; Schema: public; Owner: kewal_admin
--

CREATE INDEX idx_jtbd_next_date ON public.t_jtbd_configurations USING btree (next_alert_date) WHERE (is_active = true);


--
-- Name: idx_jtbd_priority; Type: INDEX; Schema: public; Owner: kewal_admin
--

CREATE INDEX idx_jtbd_priority ON public.t_jtbd_configurations USING btree (priority, is_active);


--
-- Name: idx_jtbd_type; Type: INDEX; Schema: public; Owner: kewal_admin
--

CREATE INDEX idx_jtbd_type ON public.t_jtbd_configurations USING btree (jtbd_type);


--
-- Name: idx_market_data_date; Type: INDEX; Schema: public; Owner: kewal_admin
--

CREATE INDEX idx_market_data_date ON public.t_market_data_records USING btree (date DESC);


--
-- Name: idx_market_data_index_date; Type: INDEX; Schema: public; Owner: kewal_admin
--

CREATE INDEX idx_market_data_index_date ON public.t_market_data_records USING btree (index_id, date DESC);


--
-- Name: idx_market_data_records_index_date; Type: INDEX; Schema: public; Owner: kewal_admin
--

CREATE INDEX idx_market_data_records_index_date ON public.t_market_data_records USING btree (index_id, date DESC);


--
-- Name: idx_market_data_records_metrics_calculated_at; Type: INDEX; Schema: public; Owner: kewal_admin
--

CREATE INDEX idx_market_data_records_metrics_calculated_at ON public.t_market_data_records USING btree (metrics_calculated_at DESC);


--
-- Name: idx_market_indices_active; Type: INDEX; Schema: public; Owner: kewal_admin
--

CREATE INDEX idx_market_indices_active ON public.t_market_indices USING btree (is_active);


--
-- Name: idx_market_indices_category; Type: INDEX; Schema: public; Owner: kewal_admin
--

CREATE INDEX idx_market_indices_category ON public.t_market_indices USING btree (category);


--
-- Name: idx_market_indices_status; Type: INDEX; Schema: public; Owner: kewal_admin
--

CREATE INDEX idx_market_indices_status ON public.t_market_indices USING btree (last_download_status);


--
-- Name: idx_market_jobs_index; Type: INDEX; Schema: public; Owner: kewal_admin
--

CREATE INDEX idx_market_jobs_index ON public.t_market_download_jobs USING btree (index_id, created_at DESC);


--
-- Name: idx_market_jobs_status; Type: INDEX; Schema: public; Owner: kewal_admin
--

CREATE INDEX idx_market_jobs_status ON public.t_market_download_jobs USING btree (status, created_at DESC);


--
-- Name: idx_market_logs_index; Type: INDEX; Schema: public; Owner: kewal_admin
--

CREATE INDEX idx_market_logs_index ON public.t_market_download_logs USING btree (index_id, created_at DESC);


--
-- Name: idx_monthly_snapshots; Type: INDEX; Schema: public; Owner: kewal_admin
--

CREATE INDEX idx_monthly_snapshots ON public.t_monthly_portfolio_snapshots USING btree (tenant_id, is_live, customer_id, snapshot_month_end);


--
-- Name: idx_nav_code_date; Type: INDEX; Schema: public; Owner: kewal_admin
--

CREATE INDEX idx_nav_code_date ON public.t_nav_data USING btree (scheme_code, nav_date DESC);


--
-- Name: idx_nav_data_date; Type: INDEX; Schema: public; Owner: kewal_admin
--

CREATE INDEX idx_nav_data_date ON public.t_nav_data USING btree (nav_date DESC);


--
-- Name: idx_nav_data_date_range_metrics; Type: INDEX; Schema: public; Owner: kewal_admin
--

CREATE INDEX idx_nav_data_date_range_metrics ON public.t_nav_data USING btree (nav_date, scheme_id, is_live) WHERE (metrics_calculated_at IS NOT NULL);


--
-- Name: idx_nav_data_metrics_calculated; Type: INDEX; Schema: public; Owner: kewal_admin
--

CREATE INDEX idx_nav_data_metrics_calculated ON public.t_nav_data USING btree (scheme_id, nav_date, metrics_calculated_at) WHERE (metrics_calculated_at IS NOT NULL);


--
-- Name: idx_nav_data_missing_metrics; Type: INDEX; Schema: public; Owner: kewal_admin
--

CREATE INDEX idx_nav_data_missing_metrics ON public.t_nav_data USING btree (scheme_id, nav_date, is_live) WHERE (metrics_calculated_at IS NULL);


--
-- Name: idx_nav_data_scheme_date; Type: INDEX; Schema: public; Owner: kewal_admin
--

CREATE INDEX idx_nav_data_scheme_date ON public.t_nav_data USING btree (scheme_id, nav_date DESC);


--
-- Name: idx_nav_data_scheme_date_live; Type: INDEX; Schema: public; Owner: kewal_admin
--

CREATE INDEX idx_nav_data_scheme_date_live ON public.t_nav_data USING btree (scheme_id, nav_date, is_live);


--
-- Name: idx_nav_data_scheme_latest_metrics; Type: INDEX; Schema: public; Owner: kewal_admin
--

CREATE INDEX idx_nav_data_scheme_latest_metrics ON public.t_nav_data USING btree (scheme_id, nav_date DESC, is_live) WHERE (metrics_calculated_at IS NOT NULL);


--
-- Name: idx_nav_data_scheme_live; Type: INDEX; Schema: public; Owner: kewal_admin
--

CREATE INDEX idx_nav_data_scheme_live ON public.t_nav_data USING btree (scheme_id, is_live, nav_date DESC);


--
-- Name: idx_nav_date; Type: INDEX; Schema: public; Owner: kewal_admin
--

CREATE INDEX idx_nav_date ON public.t_nav_data USING btree (nav_date DESC);


--
-- Name: idx_nav_jobs_pending; Type: INDEX; Schema: public; Owner: kewal_admin
--

CREATE INDEX idx_nav_jobs_pending ON public.t_nav_download_jobs USING btree (status, scheduled_date) WHERE ((status)::text = 'pending'::text);


--
-- Name: idx_nav_jobs_scheduled; Type: INDEX; Schema: public; Owner: kewal_admin
--

CREATE INDEX idx_nav_jobs_scheduled ON public.t_nav_download_jobs USING btree (scheduled_date);


--
-- Name: idx_nav_jobs_status; Type: INDEX; Schema: public; Owner: kewal_admin
--

CREATE INDEX idx_nav_jobs_status ON public.t_nav_download_jobs USING btree (status);


--
-- Name: idx_nav_jobs_type; Type: INDEX; Schema: public; Owner: kewal_admin
--

CREATE INDEX idx_nav_jobs_type ON public.t_nav_download_jobs USING btree (job_type);


--
-- Name: idx_nav_schedule_executions_config_id; Type: INDEX; Schema: public; Owner: kewal_admin
--

CREATE INDEX idx_nav_schedule_executions_config_id ON public.t_nav_schedule_executions USING btree (scheduler_config_id);


--
-- Name: idx_nav_schedule_executions_status; Type: INDEX; Schema: public; Owner: kewal_admin
--

CREATE INDEX idx_nav_schedule_executions_status ON public.t_nav_schedule_executions USING btree (status);


--
-- Name: idx_nav_schedule_executions_time; Type: INDEX; Schema: public; Owner: kewal_admin
--

CREATE INDEX idx_nav_schedule_executions_time ON public.t_nav_schedule_executions USING btree (execution_time);


--
-- Name: idx_nav_scheme_date; Type: INDEX; Schema: public; Owner: kewal_admin
--

CREATE INDEX idx_nav_scheme_date ON public.t_nav_data USING btree (scheme_id, nav_date DESC);


--
-- Name: INDEX idx_nav_scheme_date; Type: COMMENT; Schema: public; Owner: kewal_admin
--

COMMENT ON INDEX public.idx_nav_scheme_date IS 'Fast NAV lookups by scheme and date';


--
-- Name: idx_nav_source; Type: INDEX; Schema: public; Owner: kewal_admin
--

CREATE INDEX idx_nav_source ON public.t_nav_data USING btree (data_source);


--
-- Name: idx_portfolio_active; Type: INDEX; Schema: public; Owner: kewal_admin
--

CREATE INDEX idx_portfolio_active ON public.t_customer_master_portfolio USING btree (customer_id, is_active) WHERE (is_active = true);


--
-- Name: idx_portfolio_category; Type: INDEX; Schema: public; Owner: kewal_admin
--

CREATE INDEX idx_portfolio_category ON public.t_customer_master_portfolio USING btree (category);


--
-- Name: INDEX idx_portfolio_category; Type: COMMENT; Schema: public; Owner: kewal_admin
--

COMMENT ON INDEX public.idx_portfolio_category IS 'Fast filtering by fund category (Equity, Debt, Hybrid)';


--
-- Name: idx_portfolio_current_scheme_code; Type: INDEX; Schema: public; Owner: kewal_admin
--

CREATE INDEX idx_portfolio_current_scheme_code ON public.v_portfolio_current USING btree (scheme_code);


--
-- Name: idx_portfolio_current_tenant_customer; Type: INDEX; Schema: public; Owner: kewal_admin
--

CREATE INDEX idx_portfolio_current_tenant_customer ON public.v_portfolio_current USING btree (tenant_id, customer_id);


--
-- Name: idx_portfolio_current_unique; Type: INDEX; Schema: public; Owner: kewal_admin
--

CREATE UNIQUE INDEX idx_portfolio_current_unique ON public.v_portfolio_current USING btree (tenant_id, customer_id, scheme_code);


--
-- Name: idx_portfolio_customer; Type: INDEX; Schema: public; Owner: kewal_admin
--

CREATE INDEX idx_portfolio_customer ON public.t_customer_master_portfolio USING btree (customer_id);


--
-- Name: idx_portfolio_folio; Type: INDEX; Schema: public; Owner: kewal_admin
--

CREATE INDEX idx_portfolio_folio ON public.t_customer_master_portfolio USING btree (folio_no);


--
-- Name: idx_portfolio_fund_name; Type: INDEX; Schema: public; Owner: kewal_admin
--

CREATE INDEX idx_portfolio_fund_name ON public.t_customer_master_portfolio USING btree (fund_name);


--
-- Name: INDEX idx_portfolio_fund_name; Type: COMMENT; Schema: public; Owner: kewal_admin
--

COMMENT ON INDEX public.idx_portfolio_fund_name IS 'Fast searching by fund name';


--
-- Name: idx_portfolio_scheme; Type: INDEX; Schema: public; Owner: kewal_admin
--

CREATE INDEX idx_portfolio_scheme ON public.t_customer_master_portfolio USING btree (scheme_code);


--
-- Name: idx_portfolio_tenant; Type: INDEX; Schema: public; Owner: kewal_admin
--

CREATE INDEX idx_portfolio_tenant ON public.t_customer_master_portfolio USING btree (tenant_id, is_live);


--
-- Name: idx_portfolio_totals_category; Type: INDEX; Schema: public; Owner: kewal_admin
--

CREATE INDEX idx_portfolio_totals_category ON public.t_customer_portfolio_totals USING btree (category);


--
-- Name: idx_portfolio_totals_customer; Type: INDEX; Schema: public; Owner: kewal_admin
--

CREATE INDEX idx_portfolio_totals_customer ON public.t_customer_portfolio_totals USING btree (customer_id);


--
-- Name: idx_portfolio_totals_pk; Type: INDEX; Schema: public; Owner: kewal_admin
--

CREATE UNIQUE INDEX idx_portfolio_totals_pk ON public.t_customer_portfolio_totals USING btree (customer_id, scheme_code, tenant_id, is_live);


--
-- Name: idx_portfolio_totals_scheme; Type: INDEX; Schema: public; Owner: kewal_admin
--

CREATE INDEX idx_portfolio_totals_scheme ON public.t_customer_portfolio_totals USING btree (scheme_code);


--
-- Name: idx_portfolio_totals_tenant; Type: INDEX; Schema: public; Owner: kewal_admin
--

CREATE INDEX idx_portfolio_totals_tenant ON public.t_customer_portfolio_totals USING btree (tenant_id, is_live);


--
-- Name: idx_portfolio_totals_value; Type: INDEX; Schema: public; Owner: kewal_admin
--

CREATE INDEX idx_portfolio_totals_value ON public.t_customer_portfolio_totals USING btree (current_value DESC);


--
-- Name: idx_record_results_customer; Type: INDEX; Schema: public; Owner: kewal_admin
--

CREATE INDEX idx_record_results_customer ON public.t_import_record_results USING btree (created_customer_id) WHERE (created_customer_id IS NOT NULL);


--
-- Name: idx_record_results_session; Type: INDEX; Schema: public; Owner: kewal_admin
--

CREATE INDEX idx_record_results_session ON public.t_import_record_results USING btree (import_session_id);


--
-- Name: idx_record_results_status; Type: INDEX; Schema: public; Owner: kewal_admin
--

CREATE INDEX idx_record_results_status ON public.t_import_record_results USING btree (status);


--
-- Name: idx_scheduler_configs_enabled; Type: INDEX; Schema: public; Owner: kewal_admin
--

CREATE INDEX idx_scheduler_configs_enabled ON public.t_nav_scheduler_configs USING btree (is_enabled) WHERE (is_enabled = true);


--
-- Name: idx_scheduler_configs_next_execution; Type: INDEX; Schema: public; Owner: kewal_admin
--

CREATE INDEX idx_scheduler_configs_next_execution ON public.t_nav_scheduler_configs USING btree (next_execution_at) WHERE (is_enabled = true);


--
-- Name: idx_scheduler_configs_tenant_user; Type: INDEX; Schema: public; Owner: kewal_admin
--

CREATE INDEX idx_scheduler_configs_tenant_user ON public.t_nav_scheduler_configs USING btree (tenant_id, user_id, is_live);


--
-- Name: idx_scheme_details_active; Type: INDEX; Schema: public; Owner: kewal_admin
--

CREATE INDEX idx_scheme_details_active ON public.t_scheme_details USING btree (tenant_id, is_active, is_live);


--
-- Name: idx_scheme_details_amc; Type: INDEX; Schema: public; Owner: kewal_admin
--

CREATE INDEX idx_scheme_details_amc ON public.t_scheme_details USING btree (amc_name);


--
-- Name: idx_scheme_details_category; Type: INDEX; Schema: public; Owner: kewal_admin
--

CREATE INDEX idx_scheme_details_category ON public.t_scheme_details USING btree (scheme_category_id);


--
-- Name: idx_scheme_details_code; Type: INDEX; Schema: public; Owner: kewal_admin
--

CREATE INDEX idx_scheme_details_code ON public.t_scheme_details USING btree (scheme_code);


--
-- Name: idx_scheme_details_name; Type: INDEX; Schema: public; Owner: kewal_admin
--

CREATE INDEX idx_scheme_details_name ON public.t_scheme_details USING btree (scheme_name);


--
-- Name: idx_scheme_details_nav_available; Type: INDEX; Schema: public; Owner: kewal_admin
--

CREATE INDEX idx_scheme_details_nav_available ON public.t_scheme_details USING btree (historical_data_available, is_active) WHERE ((historical_data_available = true) AND (is_active = true));


--
-- Name: idx_scheme_details_type; Type: INDEX; Schema: public; Owner: kewal_admin
--

CREATE INDEX idx_scheme_details_type ON public.t_scheme_details USING btree (scheme_type_id);


--
-- Name: idx_scheme_masters_active; Type: INDEX; Schema: public; Owner: kewal_admin
--

CREATE INDEX idx_scheme_masters_active ON public.t_scheme_masters USING btree (master_type, is_active) WHERE (is_active = true);


--
-- Name: idx_scheme_masters_code; Type: INDEX; Schema: public; Owner: kewal_admin
--

CREATE INDEX idx_scheme_masters_code ON public.t_scheme_masters USING btree (code);


--
-- Name: idx_scheme_masters_type; Type: INDEX; Schema: public; Owner: kewal_admin
--

CREATE INDEX idx_scheme_masters_type ON public.t_scheme_masters USING btree (master_type);


--
-- Name: idx_sessions_cleanup; Type: INDEX; Schema: public; Owner: kewal_admin
--

CREATE INDEX idx_sessions_cleanup ON public.t_import_sessions USING btree (status, processing_completed_at) WHERE ((status)::text = ANY ((ARRAY['completed'::character varying, 'completed_with_errors'::character varying, 'cancelled'::character varying])::text[]));


--
-- Name: INDEX idx_sessions_cleanup; Type: COMMENT; Schema: public; Owner: kewal_admin
--

COMMENT ON INDEX public.idx_sessions_cleanup IS 'Support cleanup of old completed sessions';


--
-- Name: idx_staging_created_record; Type: INDEX; Schema: public; Owner: kewal_admin
--

CREATE INDEX idx_staging_created_record ON public.t_import_staging_data USING btree (created_record_type, created_record_id) WHERE (created_record_id IS NOT NULL);


--
-- Name: idx_staging_pending; Type: INDEX; Schema: public; Owner: kewal_admin
--

CREATE INDEX idx_staging_pending ON public.t_import_staging_data USING btree (processing_status, import_type) WHERE ((processing_status)::text = 'pending'::text);


--
-- Name: INDEX idx_staging_pending; Type: COMMENT; Schema: public; Owner: kewal_admin
--

COMMENT ON INDEX public.idx_staging_pending IS 'Fast lookup of pending records for processing';


--
-- Name: idx_staging_processing_status; Type: INDEX; Schema: public; Owner: kewal_admin
--

CREATE INDEX idx_staging_processing_status ON public.t_import_staging_data USING btree (processing_status);


--
-- Name: idx_staging_session_processing; Type: INDEX; Schema: public; Owner: kewal_admin
--

CREATE INDEX idx_staging_session_processing ON public.t_import_staging_data USING btree (session_id) WHERE ((processing_status)::text = ANY ((ARRAY['pending'::character varying, 'processing'::character varying])::text[]));


--
-- Name: idx_staging_session_status; Type: INDEX; Schema: public; Owner: kewal_admin
--

CREATE INDEX idx_staging_session_status ON public.t_import_staging_data USING btree (session_id, processing_status);


--
-- Name: idx_staging_tenant; Type: INDEX; Schema: public; Owner: kewal_admin
--

CREATE INDEX idx_staging_tenant ON public.t_import_staging_data USING btree (tenant_id, is_live);


--
-- Name: idx_staging_view_support; Type: INDEX; Schema: public; Owner: kewal_admin
--

CREATE INDEX idx_staging_view_support ON public.t_import_staging_data USING btree (session_id, processing_status);


--
-- Name: idx_system_logs_created_at; Type: INDEX; Schema: public; Owner: kewal_admin
--

CREATE INDEX idx_system_logs_created_at ON public.t_system_logs USING btree (created_at DESC);


--
-- Name: INDEX idx_system_logs_created_at; Type: COMMENT; Schema: public; Owner: kewal_admin
--

COMMENT ON INDEX public.idx_system_logs_created_at IS 'Fast retrieval of recent logs';


--
-- Name: idx_system_logs_level; Type: INDEX; Schema: public; Owner: kewal_admin
--

CREATE INDEX idx_system_logs_level ON public.t_system_logs USING btree (level);


--
-- Name: INDEX idx_system_logs_level; Type: COMMENT; Schema: public; Owner: kewal_admin
--

COMMENT ON INDEX public.idx_system_logs_level IS 'Filter logs by severity level';


--
-- Name: idx_system_logs_level_created_at; Type: INDEX; Schema: public; Owner: kewal_admin
--

CREATE INDEX idx_system_logs_level_created_at ON public.t_system_logs USING btree (level, created_at DESC);


--
-- Name: INDEX idx_system_logs_level_created_at; Type: COMMENT; Schema: public; Owner: kewal_admin
--

COMMENT ON INDEX public.idx_system_logs_level_created_at IS 'Common query pattern: logs by level and time';


--
-- Name: idx_system_logs_source; Type: INDEX; Schema: public; Owner: kewal_admin
--

CREATE INDEX idx_system_logs_source ON public.t_system_logs USING btree (source);


--
-- Name: INDEX idx_system_logs_source; Type: COMMENT; Schema: public; Owner: kewal_admin
--

COMMENT ON INDEX public.idx_system_logs_source IS 'Filter logs by source system';


--
-- Name: idx_system_logs_tenant_id; Type: INDEX; Schema: public; Owner: kewal_admin
--

CREATE INDEX idx_system_logs_tenant_id ON public.t_system_logs USING btree (tenant_id);


--
-- Name: idx_system_logs_user_id; Type: INDEX; Schema: public; Owner: kewal_admin
--

CREATE INDEX idx_system_logs_user_id ON public.t_system_logs USING btree (user_id);


--
-- Name: idx_tenants_active; Type: INDEX; Schema: public; Owner: kewal_admin
--

CREATE INDEX idx_tenants_active ON public.t_tenants USING btree (is_active);


--
-- Name: idx_tenants_code; Type: INDEX; Schema: public; Owner: kewal_admin
--

CREATE INDEX idx_tenants_code ON public.t_tenants USING btree (tenant_code) WHERE (is_active = true);


--
-- Name: idx_tenants_is_admin; Type: INDEX; Schema: public; Owner: kewal_admin
--

CREATE INDEX idx_tenants_is_admin ON public.t_tenants USING btree (is_admin) WHERE (is_admin = true);


--
-- Name: idx_transaction_duplicates; Type: INDEX; Schema: public; Owner: kewal_admin
--

CREATE INDEX idx_transaction_duplicates ON public.t_transaction_table USING btree (is_potential_duplicate) WHERE (is_potential_duplicate = true);


--
-- Name: INDEX idx_transaction_duplicates; Type: COMMENT; Schema: public; Owner: kewal_admin
--

COMMENT ON INDEX public.idx_transaction_duplicates IS 'Fast lookup of potential duplicate transactions';


--
-- Name: idx_transaction_import_session; Type: INDEX; Schema: public; Owner: kewal_admin
--

CREATE INDEX idx_transaction_import_session ON public.t_transaction_table USING btree (import_session_id);


--
-- Name: INDEX idx_transaction_import_session; Type: COMMENT; Schema: public; Owner: kewal_admin
--

COMMENT ON INDEX public.idx_transaction_import_session IS 'Find all transactions from specific import session';


--
-- Name: idx_transaction_scheme_id; Type: INDEX; Schema: public; Owner: kewal_admin
--

CREATE INDEX idx_transaction_scheme_id ON public.t_transaction_table USING btree (scheme_id);


--
-- Name: idx_transaction_staging_record; Type: INDEX; Schema: public; Owner: kewal_admin
--

CREATE INDEX idx_transaction_staging_record ON public.t_transaction_table USING btree (staging_record_id);


--
-- Name: INDEX idx_transaction_staging_record; Type: COMMENT; Schema: public; Owner: kewal_admin
--

COMMENT ON INDEX public.idx_transaction_staging_record IS 'Link transactions back to staging records';


--
-- Name: idx_transactions_customer; Type: INDEX; Schema: public; Owner: kewal_admin
--

CREATE INDEX idx_transactions_customer ON public.t_transaction_table USING btree (customer_id);


--
-- Name: idx_transactions_customer_date; Type: INDEX; Schema: public; Owner: kewal_admin
--

CREATE INDEX idx_transactions_customer_date ON public.t_transaction_table USING btree (customer_id, txn_date DESC);


--
-- Name: idx_transactions_date; Type: INDEX; Schema: public; Owner: kewal_admin
--

CREATE INDEX idx_transactions_date ON public.t_transaction_table USING btree (txn_date DESC);


--
-- Name: idx_transactions_folio; Type: INDEX; Schema: public; Owner: kewal_admin
--

CREATE INDEX idx_transactions_folio ON public.t_transaction_table USING btree (folio_no);


--
-- Name: idx_transactions_portfolio_flag; Type: INDEX; Schema: public; Owner: kewal_admin
--

CREATE INDEX idx_transactions_portfolio_flag ON public.t_transaction_table USING btree (portfolio_flag) WHERE (portfolio_flag = true);


--
-- Name: idx_transactions_scheme; Type: INDEX; Schema: public; Owner: kewal_admin
--

CREATE INDEX idx_transactions_scheme ON public.t_transaction_table USING btree (scheme_code);


--
-- Name: idx_transactions_tenant; Type: INDEX; Schema: public; Owner: kewal_admin
--

CREATE INDEX idx_transactions_tenant ON public.t_transaction_table USING btree (tenant_id, is_live);


--
-- Name: idx_txn_types_active; Type: INDEX; Schema: public; Owner: kewal_admin
--

CREATE INDEX idx_txn_types_active ON public.m_transaction_types USING btree (is_active) WHERE (is_active = true);


--
-- Name: INDEX idx_txn_types_active; Type: COMMENT; Schema: public; Owner: kewal_admin
--

COMMENT ON INDEX public.idx_txn_types_active IS 'Fast lookup of active transaction types';


--
-- Name: idx_txn_types_code; Type: INDEX; Schema: public; Owner: kewal_admin
--

CREATE INDEX idx_txn_types_code ON public.m_transaction_types USING btree (txn_code);


--
-- Name: INDEX idx_txn_types_code; Type: COMMENT; Schema: public; Owner: kewal_admin
--

COMMENT ON INDEX public.idx_txn_types_code IS 'Fast lookup by transaction code';


--
-- Name: idx_txn_types_type; Type: INDEX; Schema: public; Owner: kewal_admin
--

CREATE INDEX idx_txn_types_type ON public.m_transaction_types USING btree (txn_type);


--
-- Name: INDEX idx_txn_types_type; Type: COMMENT; Schema: public; Owner: kewal_admin
--

COMMENT ON INDEX public.idx_txn_types_type IS 'Filter by transaction type (purchase/redemption)';


--
-- Name: idx_user_chart_prefs_user_index; Type: INDEX; Schema: public; Owner: kewal_admin
--

CREATE INDEX idx_user_chart_prefs_user_index ON public.t_user_chart_preferences USING btree (user_id, index_id);


--
-- Name: idx_users_email; Type: INDEX; Schema: public; Owner: kewal_admin
--

CREATE INDEX idx_users_email ON public.t_users USING btree (email);


--
-- Name: INDEX idx_users_email; Type: COMMENT; Schema: public; Owner: kewal_admin
--

COMMENT ON INDEX public.idx_users_email IS 'Fast email lookup for authentication';


--
-- Name: idx_users_environment; Type: INDEX; Schema: public; Owner: kewal_admin
--

CREATE INDEX idx_users_environment ON public.t_users USING btree (environment_preference, is_live);


--
-- Name: idx_users_tenant; Type: INDEX; Schema: public; Owner: kewal_admin
--

CREATE INDEX idx_users_tenant ON public.t_users USING btree (tenant_id);


--
-- Name: INDEX idx_users_tenant; Type: COMMENT; Schema: public; Owner: kewal_admin
--

COMMENT ON INDEX public.idx_users_tenant IS 'Tenant isolation queries';


--
-- Name: idx_users_tenant_active; Type: INDEX; Schema: public; Owner: kewal_admin
--

CREATE INDEX idx_users_tenant_active ON public.t_users USING btree (tenant_id, is_active) WHERE (is_active = true);


--
-- Name: t_market_data_records trg_market_data_updated_at; Type: TRIGGER; Schema: public; Owner: kewal_admin
--

CREATE TRIGGER trg_market_data_updated_at BEFORE UPDATE ON public.t_market_data_records FOR EACH ROW EXECUTE FUNCTION public.update_market_updated_at();


--
-- Name: t_market_indices trg_market_indices_updated_at; Type: TRIGGER; Schema: public; Owner: kewal_admin
--

CREATE TRIGGER trg_market_indices_updated_at BEFORE UPDATE ON public.t_market_indices FOR EACH ROW EXECUTE FUNCTION public.update_market_updated_at();


--
-- Name: t_market_download_jobs trg_market_jobs_updated_at; Type: TRIGGER; Schema: public; Owner: kewal_admin
--

CREATE TRIGGER trg_market_jobs_updated_at BEFORE UPDATE ON public.t_market_download_jobs FOR EACH ROW EXECUTE FUNCTION public.update_market_updated_at();


--
-- Name: t_market_eod_scheduler trg_market_scheduler_updated_at; Type: TRIGGER; Schema: public; Owner: kewal_admin
--

CREATE TRIGGER trg_market_scheduler_updated_at BEFORE UPDATE ON public.t_market_eod_scheduler FOR EACH ROW EXECUTE FUNCTION public.update_market_updated_at();


--
-- Name: t_import_staging_data trigger_staging_updated_at; Type: TRIGGER; Schema: public; Owner: kewal_admin
--

CREATE TRIGGER trigger_staging_updated_at BEFORE UPDATE ON public.t_import_staging_data FOR EACH ROW EXECUTE FUNCTION public.update_staging_updated_at();


--
-- Name: m_bookmark_reasons update_bookmark_reasons_updated_at; Type: TRIGGER; Schema: public; Owner: kewal_admin
--

CREATE TRIGGER update_bookmark_reasons_updated_at BEFORE UPDATE ON public.m_bookmark_reasons FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: t_contacts update_contacts_updated_at; Type: TRIGGER; Schema: public; Owner: kewal_admin
--

CREATE TRIGGER update_contacts_updated_at BEFORE UPDATE ON public.t_contacts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: t_customer_bookmarks update_customer_bookmarks_updated_at; Type: TRIGGER; Schema: public; Owner: kewal_admin
--

CREATE TRIGGER update_customer_bookmarks_updated_at BEFORE UPDATE ON public.t_customer_bookmarks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: t_customers update_customers_updated_at; Type: TRIGGER; Schema: public; Owner: kewal_admin
--

CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON public.t_customers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: t_import_field_mappings update_field_mappings_updated_at; Type: TRIGGER; Schema: public; Owner: kewal_admin
--

CREATE TRIGGER update_field_mappings_updated_at BEFORE UPDATE ON public.t_import_field_mappings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: t_file_uploads update_file_uploads_updated_at; Type: TRIGGER; Schema: public; Owner: kewal_admin
--

CREATE TRIGGER update_file_uploads_updated_at BEFORE UPDATE ON public.t_file_uploads FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: t_import_sessions update_import_sessions_updated_at; Type: TRIGGER; Schema: public; Owner: kewal_admin
--

CREATE TRIGGER update_import_sessions_updated_at BEFORE UPDATE ON public.t_import_sessions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: t_jtbd_configurations update_jtbd_updated_at; Type: TRIGGER; Schema: public; Owner: kewal_admin
--

CREATE TRIGGER update_jtbd_updated_at BEFORE UPDATE ON public.t_jtbd_configurations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: t_nav_data update_nav_data_updated_at; Type: TRIGGER; Schema: public; Owner: kewal_admin
--

CREATE TRIGGER update_nav_data_updated_at BEFORE UPDATE ON public.t_nav_data FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: t_nav_download_jobs update_nav_jobs_updated_at; Type: TRIGGER; Schema: public; Owner: kewal_admin
--

CREATE TRIGGER update_nav_jobs_updated_at BEFORE UPDATE ON public.t_nav_download_jobs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: t_customer_master_portfolio update_portfolio_updated_at; Type: TRIGGER; Schema: public; Owner: kewal_admin
--

CREATE TRIGGER update_portfolio_updated_at BEFORE UPDATE ON public.t_customer_master_portfolio FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: t_nav_scheduler_configs update_scheduler_configs_updated_at; Type: TRIGGER; Schema: public; Owner: kewal_admin
--

CREATE TRIGGER update_scheduler_configs_updated_at BEFORE UPDATE ON public.t_nav_scheduler_configs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: t_scheme_bookmarks update_scheme_bookmarks_updated_at; Type: TRIGGER; Schema: public; Owner: kewal_admin
--

CREATE TRIGGER update_scheme_bookmarks_updated_at BEFORE UPDATE ON public.t_scheme_bookmarks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: t_scheme_details update_scheme_details_updated_at; Type: TRIGGER; Schema: public; Owner: kewal_admin
--

CREATE TRIGGER update_scheme_details_updated_at BEFORE UPDATE ON public.t_scheme_details FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: t_scheme_masters update_scheme_masters_updated_at; Type: TRIGGER; Schema: public; Owner: kewal_admin
--

CREATE TRIGGER update_scheme_masters_updated_at BEFORE UPDATE ON public.t_scheme_masters FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: t_tenants update_tenants_updated_at; Type: TRIGGER; Schema: public; Owner: kewal_admin
--

CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON public.t_tenants FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: t_transaction_table update_transactions_updated_at; Type: TRIGGER; Schema: public; Owner: kewal_admin
--

CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON public.t_transaction_table FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: m_transaction_types update_txn_types_updated_at; Type: TRIGGER; Schema: public; Owner: kewal_admin
--

CREATE TRIGGER update_txn_types_updated_at BEFORE UPDATE ON public.m_transaction_types FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: t_user_chart_preferences update_user_chart_preferences_updated_at; Type: TRIGGER; Schema: public; Owner: kewal_admin
--

CREATE TRIGGER update_user_chart_preferences_updated_at BEFORE UPDATE ON public.t_user_chart_preferences FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: t_users update_users_updated_at; Type: TRIGGER; Schema: public; Owner: kewal_admin
--

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.t_users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: processed_data FK_06a69a7032c97a763c2c7599464; Type: FK CONSTRAINT; Schema: n8n; Owner: kewal_admin
--

ALTER TABLE ONLY n8n.processed_data
    ADD CONSTRAINT "FK_06a69a7032c97a763c2c7599464" FOREIGN KEY ("workflowId") REFERENCES n8n.workflow_entity(id) ON DELETE CASCADE;


--
-- Name: insights_metadata FK_1d8ab99d5861c9388d2dc1cf733; Type: FK CONSTRAINT; Schema: n8n; Owner: kewal_admin
--

ALTER TABLE ONLY n8n.insights_metadata
    ADD CONSTRAINT "FK_1d8ab99d5861c9388d2dc1cf733" FOREIGN KEY ("workflowId") REFERENCES n8n.workflow_entity(id) ON DELETE SET NULL;


--
-- Name: workflow_history FK_1e31657f5fe46816c34be7c1b4b; Type: FK CONSTRAINT; Schema: n8n; Owner: kewal_admin
--

ALTER TABLE ONLY n8n.workflow_history
    ADD CONSTRAINT "FK_1e31657f5fe46816c34be7c1b4b" FOREIGN KEY ("workflowId") REFERENCES n8n.workflow_entity(id) ON DELETE CASCADE;


--
-- Name: insights_metadata FK_2375a1eda085adb16b24615b69c; Type: FK CONSTRAINT; Schema: n8n; Owner: kewal_admin
--

ALTER TABLE ONLY n8n.insights_metadata
    ADD CONSTRAINT "FK_2375a1eda085adb16b24615b69c" FOREIGN KEY ("projectId") REFERENCES n8n.project(id) ON DELETE SET NULL;


--
-- Name: execution_metadata FK_31d0b4c93fb85ced26f6005cda3; Type: FK CONSTRAINT; Schema: n8n; Owner: kewal_admin
--

ALTER TABLE ONLY n8n.execution_metadata
    ADD CONSTRAINT "FK_31d0b4c93fb85ced26f6005cda3" FOREIGN KEY ("executionId") REFERENCES n8n.execution_entity(id) ON DELETE CASCADE;


--
-- Name: shared_credentials FK_416f66fc846c7c442970c094ccf; Type: FK CONSTRAINT; Schema: n8n; Owner: kewal_admin
--

ALTER TABLE ONLY n8n.shared_credentials
    ADD CONSTRAINT "FK_416f66fc846c7c442970c094ccf" FOREIGN KEY ("credentialsId") REFERENCES n8n.credentials_entity(id) ON DELETE CASCADE;


--
-- Name: project_relation FK_5f0643f6717905a05164090dde7; Type: FK CONSTRAINT; Schema: n8n; Owner: kewal_admin
--

ALTER TABLE ONLY n8n.project_relation
    ADD CONSTRAINT "FK_5f0643f6717905a05164090dde7" FOREIGN KEY ("userId") REFERENCES n8n."user"(id) ON DELETE CASCADE;


--
-- Name: project_relation FK_61448d56d61802b5dfde5cdb002; Type: FK CONSTRAINT; Schema: n8n; Owner: kewal_admin
--

ALTER TABLE ONLY n8n.project_relation
    ADD CONSTRAINT "FK_61448d56d61802b5dfde5cdb002" FOREIGN KEY ("projectId") REFERENCES n8n.project(id) ON DELETE CASCADE;


--
-- Name: insights_by_period FK_6414cfed98daabbfdd61a1cfbc0; Type: FK CONSTRAINT; Schema: n8n; Owner: kewal_admin
--

ALTER TABLE ONLY n8n.insights_by_period
    ADD CONSTRAINT "FK_6414cfed98daabbfdd61a1cfbc0" FOREIGN KEY ("metaId") REFERENCES n8n.insights_metadata("metaId") ON DELETE CASCADE;


--
-- Name: insights_raw FK_6e2e33741adef2a7c5d66befa4e; Type: FK CONSTRAINT; Schema: n8n; Owner: kewal_admin
--

ALTER TABLE ONLY n8n.insights_raw
    ADD CONSTRAINT "FK_6e2e33741adef2a7c5d66befa4e" FOREIGN KEY ("metaId") REFERENCES n8n.insights_metadata("metaId") ON DELETE CASCADE;


--
-- Name: installed_nodes FK_73f857fc5dce682cef8a99c11dbddbc969618951; Type: FK CONSTRAINT; Schema: n8n; Owner: kewal_admin
--

ALTER TABLE ONLY n8n.installed_nodes
    ADD CONSTRAINT "FK_73f857fc5dce682cef8a99c11dbddbc969618951" FOREIGN KEY (package) REFERENCES n8n.installed_packages("packageName") ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: folder FK_804ea52f6729e3940498bd54d78; Type: FK CONSTRAINT; Schema: n8n; Owner: kewal_admin
--

ALTER TABLE ONLY n8n.folder
    ADD CONSTRAINT "FK_804ea52f6729e3940498bd54d78" FOREIGN KEY ("parentFolderId") REFERENCES n8n.folder(id) ON DELETE CASCADE;


--
-- Name: shared_credentials FK_812c2852270da1247756e77f5a4; Type: FK CONSTRAINT; Schema: n8n; Owner: kewal_admin
--

ALTER TABLE ONLY n8n.shared_credentials
    ADD CONSTRAINT "FK_812c2852270da1247756e77f5a4" FOREIGN KEY ("projectId") REFERENCES n8n.project(id) ON DELETE CASCADE;


--
-- Name: test_case_execution FK_8e4b4774db42f1e6dda3452b2af; Type: FK CONSTRAINT; Schema: n8n; Owner: kewal_admin
--

ALTER TABLE ONLY n8n.test_case_execution
    ADD CONSTRAINT "FK_8e4b4774db42f1e6dda3452b2af" FOREIGN KEY ("testRunId") REFERENCES n8n.test_run(id) ON DELETE CASCADE;


--
-- Name: data_table_column FK_930b6e8faaf88294cef23484160; Type: FK CONSTRAINT; Schema: n8n; Owner: kewal_admin
--

ALTER TABLE ONLY n8n.data_table_column
    ADD CONSTRAINT "FK_930b6e8faaf88294cef23484160" FOREIGN KEY ("dataTableId") REFERENCES n8n.data_table(id) ON DELETE CASCADE;


--
-- Name: folder_tag FK_94a60854e06f2897b2e0d39edba; Type: FK CONSTRAINT; Schema: n8n; Owner: kewal_admin
--

ALTER TABLE ONLY n8n.folder_tag
    ADD CONSTRAINT "FK_94a60854e06f2897b2e0d39edba" FOREIGN KEY ("folderId") REFERENCES n8n.folder(id) ON DELETE CASCADE;


--
-- Name: execution_annotations FK_97f863fa83c4786f19565084960; Type: FK CONSTRAINT; Schema: n8n; Owner: kewal_admin
--

ALTER TABLE ONLY n8n.execution_annotations
    ADD CONSTRAINT "FK_97f863fa83c4786f19565084960" FOREIGN KEY ("executionId") REFERENCES n8n.execution_entity(id) ON DELETE CASCADE;


--
-- Name: execution_annotation_tags FK_a3697779b366e131b2bbdae2976; Type: FK CONSTRAINT; Schema: n8n; Owner: kewal_admin
--

ALTER TABLE ONLY n8n.execution_annotation_tags
    ADD CONSTRAINT "FK_a3697779b366e131b2bbdae2976" FOREIGN KEY ("tagId") REFERENCES n8n.annotation_tag_entity(id) ON DELETE CASCADE;


--
-- Name: shared_workflow FK_a45ea5f27bcfdc21af9b4188560; Type: FK CONSTRAINT; Schema: n8n; Owner: kewal_admin
--

ALTER TABLE ONLY n8n.shared_workflow
    ADD CONSTRAINT "FK_a45ea5f27bcfdc21af9b4188560" FOREIGN KEY ("projectId") REFERENCES n8n.project(id) ON DELETE CASCADE;


--
-- Name: folder FK_a8260b0b36939c6247f385b8221; Type: FK CONSTRAINT; Schema: n8n; Owner: kewal_admin
--

ALTER TABLE ONLY n8n.folder
    ADD CONSTRAINT "FK_a8260b0b36939c6247f385b8221" FOREIGN KEY ("projectId") REFERENCES n8n.project(id) ON DELETE CASCADE;


--
-- Name: execution_annotation_tags FK_c1519757391996eb06064f0e7c8; Type: FK CONSTRAINT; Schema: n8n; Owner: kewal_admin
--

ALTER TABLE ONLY n8n.execution_annotation_tags
    ADD CONSTRAINT "FK_c1519757391996eb06064f0e7c8" FOREIGN KEY ("annotationId") REFERENCES n8n.execution_annotations(id) ON DELETE CASCADE;


--
-- Name: data_table FK_c2a794257dee48af7c9abf681de; Type: FK CONSTRAINT; Schema: n8n; Owner: kewal_admin
--

ALTER TABLE ONLY n8n.data_table
    ADD CONSTRAINT "FK_c2a794257dee48af7c9abf681de" FOREIGN KEY ("projectId") REFERENCES n8n.project(id) ON DELETE CASCADE;


--
-- Name: project_relation FK_c6b99592dc96b0d836d7a21db91; Type: FK CONSTRAINT; Schema: n8n; Owner: kewal_admin
--

ALTER TABLE ONLY n8n.project_relation
    ADD CONSTRAINT "FK_c6b99592dc96b0d836d7a21db91" FOREIGN KEY (role) REFERENCES n8n.role(slug);


--
-- Name: test_run FK_d6870d3b6e4c185d33926f423c8; Type: FK CONSTRAINT; Schema: n8n; Owner: kewal_admin
--

ALTER TABLE ONLY n8n.test_run
    ADD CONSTRAINT "FK_d6870d3b6e4c185d33926f423c8" FOREIGN KEY ("workflowId") REFERENCES n8n.workflow_entity(id) ON DELETE CASCADE;


--
-- Name: shared_workflow FK_daa206a04983d47d0a9c34649ce; Type: FK CONSTRAINT; Schema: n8n; Owner: kewal_admin
--

ALTER TABLE ONLY n8n.shared_workflow
    ADD CONSTRAINT "FK_daa206a04983d47d0a9c34649ce" FOREIGN KEY ("workflowId") REFERENCES n8n.workflow_entity(id) ON DELETE CASCADE;


--
-- Name: folder_tag FK_dc88164176283de80af47621746; Type: FK CONSTRAINT; Schema: n8n; Owner: kewal_admin
--

ALTER TABLE ONLY n8n.folder_tag
    ADD CONSTRAINT "FK_dc88164176283de80af47621746" FOREIGN KEY ("tagId") REFERENCES n8n.tag_entity(id) ON DELETE CASCADE;


--
-- Name: user_api_keys FK_e131705cbbc8fb589889b02d457; Type: FK CONSTRAINT; Schema: n8n; Owner: kewal_admin
--

ALTER TABLE ONLY n8n.user_api_keys
    ADD CONSTRAINT "FK_e131705cbbc8fb589889b02d457" FOREIGN KEY ("userId") REFERENCES n8n."user"(id) ON DELETE CASCADE;


--
-- Name: test_case_execution FK_e48965fac35d0f5b9e7f51d8c44; Type: FK CONSTRAINT; Schema: n8n; Owner: kewal_admin
--

ALTER TABLE ONLY n8n.test_case_execution
    ADD CONSTRAINT "FK_e48965fac35d0f5b9e7f51d8c44" FOREIGN KEY ("executionId") REFERENCES n8n.execution_entity(id) ON DELETE SET NULL;


--
-- Name: user FK_eaea92ee7bfb9c1b6cd01505d56; Type: FK CONSTRAINT; Schema: n8n; Owner: kewal_admin
--

ALTER TABLE ONLY n8n."user"
    ADD CONSTRAINT "FK_eaea92ee7bfb9c1b6cd01505d56" FOREIGN KEY ("roleSlug") REFERENCES n8n.role(slug);


--
-- Name: role_scope FK_role; Type: FK CONSTRAINT; Schema: n8n; Owner: kewal_admin
--

ALTER TABLE ONLY n8n.role_scope
    ADD CONSTRAINT "FK_role" FOREIGN KEY ("roleSlug") REFERENCES n8n.role(slug) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: role_scope FK_scope; Type: FK CONSTRAINT; Schema: n8n; Owner: kewal_admin
--

ALTER TABLE ONLY n8n.role_scope
    ADD CONSTRAINT "FK_scope" FOREIGN KEY ("scopeSlug") REFERENCES n8n.scope(slug) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: auth_identity auth_identity_userId_fkey; Type: FK CONSTRAINT; Schema: n8n; Owner: kewal_admin
--

ALTER TABLE ONLY n8n.auth_identity
    ADD CONSTRAINT "auth_identity_userId_fkey" FOREIGN KEY ("userId") REFERENCES n8n."user"(id);


--
-- Name: execution_data execution_data_fk; Type: FK CONSTRAINT; Schema: n8n; Owner: kewal_admin
--

ALTER TABLE ONLY n8n.execution_data
    ADD CONSTRAINT execution_data_fk FOREIGN KEY ("executionId") REFERENCES n8n.execution_entity(id) ON DELETE CASCADE;


--
-- Name: execution_entity fk_execution_entity_workflow_id; Type: FK CONSTRAINT; Schema: n8n; Owner: kewal_admin
--

ALTER TABLE ONLY n8n.execution_entity
    ADD CONSTRAINT fk_execution_entity_workflow_id FOREIGN KEY ("workflowId") REFERENCES n8n.workflow_entity(id) ON DELETE CASCADE;


--
-- Name: webhook_entity fk_webhook_entity_workflow_id; Type: FK CONSTRAINT; Schema: n8n; Owner: kewal_admin
--

ALTER TABLE ONLY n8n.webhook_entity
    ADD CONSTRAINT fk_webhook_entity_workflow_id FOREIGN KEY ("workflowId") REFERENCES n8n.workflow_entity(id) ON DELETE CASCADE;


--
-- Name: workflow_entity fk_workflow_parent_folder; Type: FK CONSTRAINT; Schema: n8n; Owner: kewal_admin
--

ALTER TABLE ONLY n8n.workflow_entity
    ADD CONSTRAINT fk_workflow_parent_folder FOREIGN KEY ("parentFolderId") REFERENCES n8n.folder(id) ON DELETE CASCADE;


--
-- Name: workflow_statistics fk_workflow_statistics_workflow_id; Type: FK CONSTRAINT; Schema: n8n; Owner: kewal_admin
--

ALTER TABLE ONLY n8n.workflow_statistics
    ADD CONSTRAINT fk_workflow_statistics_workflow_id FOREIGN KEY ("workflowId") REFERENCES n8n.workflow_entity(id) ON DELETE CASCADE;


--
-- Name: workflows_tags fk_workflows_tags_tag_id; Type: FK CONSTRAINT; Schema: n8n; Owner: kewal_admin
--

ALTER TABLE ONLY n8n.workflows_tags
    ADD CONSTRAINT fk_workflows_tags_tag_id FOREIGN KEY ("tagId") REFERENCES n8n.tag_entity(id) ON DELETE CASCADE;


--
-- Name: workflows_tags fk_workflows_tags_workflow_id; Type: FK CONSTRAINT; Schema: n8n; Owner: kewal_admin
--

ALTER TABLE ONLY n8n.workflows_tags
    ADD CONSTRAINT fk_workflows_tags_workflow_id FOREIGN KEY ("workflowId") REFERENCES n8n.workflow_entity(id) ON DELETE CASCADE;


--
-- Name: t_goal_alerts fk_goal_alerts_customer; Type: FK CONSTRAINT; Schema: public; Owner: kewal_admin
--

ALTER TABLE ONLY public.t_goal_alerts
    ADD CONSTRAINT fk_goal_alerts_customer FOREIGN KEY (customer_id) REFERENCES public.t_customers(id) ON DELETE CASCADE;


--
-- Name: t_transaction_table fk_import_session; Type: FK CONSTRAINT; Schema: public; Owner: kewal_admin
--

ALTER TABLE ONLY public.t_transaction_table
    ADD CONSTRAINT fk_import_session FOREIGN KEY (import_session_id) REFERENCES public.t_import_sessions(id) ON DELETE SET NULL;


--
-- Name: t_transaction_table fk_staging_record; Type: FK CONSTRAINT; Schema: public; Owner: kewal_admin
--

ALTER TABLE ONLY public.t_transaction_table
    ADD CONSTRAINT fk_staging_record FOREIGN KEY (staging_record_id) REFERENCES public.t_import_staging_data(id) ON DELETE SET NULL;


--
-- Name: m_bookmark_reasons m_bookmark_reasons_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kewal_admin
--

ALTER TABLE ONLY public.m_bookmark_reasons
    ADD CONSTRAINT m_bookmark_reasons_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.t_tenants(id);


--
-- Name: t_chat_messages t_chat_messages_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kewal_admin
--

ALTER TABLE ONLY public.t_chat_messages
    ADD CONSTRAINT t_chat_messages_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.t_chat_sessions(id);


--
-- Name: t_chat_messages t_chat_messages_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kewal_admin
--

ALTER TABLE ONLY public.t_chat_messages
    ADD CONSTRAINT t_chat_messages_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.t_tenants(id);


--
-- Name: t_chat_sessions t_chat_sessions_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kewal_admin
--

ALTER TABLE ONLY public.t_chat_sessions
    ADD CONSTRAINT t_chat_sessions_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.t_tenants(id);


--
-- Name: t_chat_sessions t_chat_sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kewal_admin
--

ALTER TABLE ONLY public.t_chat_sessions
    ADD CONSTRAINT t_chat_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.t_users(id);


--
-- Name: t_contact_channels t_contact_channels_contact_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kewal_admin
--

ALTER TABLE ONLY public.t_contact_channels
    ADD CONSTRAINT t_contact_channels_contact_id_fkey FOREIGN KEY (contact_id) REFERENCES public.t_contacts(id) ON DELETE CASCADE;


--
-- Name: t_contact_channels t_contact_channels_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kewal_admin
--

ALTER TABLE ONLY public.t_contact_channels
    ADD CONSTRAINT t_contact_channels_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.t_tenants(id);


--
-- Name: t_contacts t_contacts_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kewal_admin
--

ALTER TABLE ONLY public.t_contacts
    ADD CONSTRAINT t_contacts_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.t_users(id);


--
-- Name: t_contacts t_contacts_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kewal_admin
--

ALTER TABLE ONLY public.t_contacts
    ADD CONSTRAINT t_contacts_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.t_tenants(id);


--
-- Name: t_customer_addresses t_customer_addresses_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kewal_admin
--

ALTER TABLE ONLY public.t_customer_addresses
    ADD CONSTRAINT t_customer_addresses_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.t_customers(id) ON DELETE CASCADE;


--
-- Name: t_customer_addresses t_customer_addresses_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kewal_admin
--

ALTER TABLE ONLY public.t_customer_addresses
    ADD CONSTRAINT t_customer_addresses_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.t_tenants(id);


--
-- Name: t_customer_bookmarks t_customer_bookmarks_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kewal_admin
--

ALTER TABLE ONLY public.t_customer_bookmarks
    ADD CONSTRAINT t_customer_bookmarks_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.t_customers(id) ON DELETE CASCADE;


--
-- Name: t_customer_bookmarks t_customer_bookmarks_reason_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kewal_admin
--

ALTER TABLE ONLY public.t_customer_bookmarks
    ADD CONSTRAINT t_customer_bookmarks_reason_id_fkey FOREIGN KEY (reason_id) REFERENCES public.m_bookmark_reasons(id);


--
-- Name: t_customer_bookmarks t_customer_bookmarks_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kewal_admin
--

ALTER TABLE ONLY public.t_customer_bookmarks
    ADD CONSTRAINT t_customer_bookmarks_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.t_tenants(id);


--
-- Name: t_customer_bookmarks t_customer_bookmarks_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kewal_admin
--

ALTER TABLE ONLY public.t_customer_bookmarks
    ADD CONSTRAINT t_customer_bookmarks_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.t_users(id) ON DELETE CASCADE;


--
-- Name: t_customer_master_portfolio t_customer_master_portfolio_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kewal_admin
--

ALTER TABLE ONLY public.t_customer_master_portfolio
    ADD CONSTRAINT t_customer_master_portfolio_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.t_customers(id);


--
-- Name: t_customers t_customers_contact_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kewal_admin
--

ALTER TABLE ONLY public.t_customers
    ADD CONSTRAINT t_customers_contact_id_fkey FOREIGN KEY (contact_id) REFERENCES public.t_contacts(id) ON DELETE CASCADE;


--
-- Name: t_customers t_customers_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kewal_admin
--

ALTER TABLE ONLY public.t_customers
    ADD CONSTRAINT t_customers_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.t_users(id);


--
-- Name: t_customers t_customers_referred_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kewal_admin
--

ALTER TABLE ONLY public.t_customers
    ADD CONSTRAINT t_customers_referred_by_fkey FOREIGN KEY (referred_by) REFERENCES public.t_contacts(id);


--
-- Name: t_customers t_customers_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kewal_admin
--

ALTER TABLE ONLY public.t_customers
    ADD CONSTRAINT t_customers_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.t_tenants(id);


--
-- Name: t_file_uploads t_file_uploads_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kewal_admin
--

ALTER TABLE ONLY public.t_file_uploads
    ADD CONSTRAINT t_file_uploads_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.t_customers(id);


--
-- Name: t_file_uploads t_file_uploads_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kewal_admin
--

ALTER TABLE ONLY public.t_file_uploads
    ADD CONSTRAINT t_file_uploads_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.t_tenants(id);


--
-- Name: t_file_uploads t_file_uploads_uploaded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kewal_admin
--

ALTER TABLE ONLY public.t_file_uploads
    ADD CONSTRAINT t_file_uploads_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.t_users(id);


--
-- Name: t_goal_alerts t_goal_alerts_goal_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kewal_admin
--

ALTER TABLE ONLY public.t_goal_alerts
    ADD CONSTRAINT t_goal_alerts_goal_id_fkey FOREIGN KEY (goal_id) REFERENCES public.t_jtbd_configurations(id) ON DELETE CASCADE;


--
-- Name: t_goal_progress_snapshots t_goal_progress_snapshots_goal_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kewal_admin
--

ALTER TABLE ONLY public.t_goal_progress_snapshots
    ADD CONSTRAINT t_goal_progress_snapshots_goal_id_fkey FOREIGN KEY (goal_id) REFERENCES public.t_jtbd_configurations(id) ON DELETE CASCADE;


--
-- Name: t_import_field_mappings t_import_field_mappings_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kewal_admin
--

ALTER TABLE ONLY public.t_import_field_mappings
    ADD CONSTRAINT t_import_field_mappings_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.t_users(id);


--
-- Name: t_import_field_mappings t_import_field_mappings_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kewal_admin
--

ALTER TABLE ONLY public.t_import_field_mappings
    ADD CONSTRAINT t_import_field_mappings_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.t_tenants(id);


--
-- Name: t_import_logs t_import_logs_file_upload_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kewal_admin
--

ALTER TABLE ONLY public.t_import_logs
    ADD CONSTRAINT t_import_logs_file_upload_id_fkey FOREIGN KEY (file_upload_id) REFERENCES public.t_file_uploads(id);


--
-- Name: t_import_logs t_import_logs_imported_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kewal_admin
--

ALTER TABLE ONLY public.t_import_logs
    ADD CONSTRAINT t_import_logs_imported_by_fkey FOREIGN KEY (imported_by) REFERENCES public.t_users(id);


--
-- Name: t_import_logs t_import_logs_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kewal_admin
--

ALTER TABLE ONLY public.t_import_logs
    ADD CONSTRAINT t_import_logs_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.t_tenants(id);


--
-- Name: t_import_record_results t_import_record_results_created_contact_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kewal_admin
--

ALTER TABLE ONLY public.t_import_record_results
    ADD CONSTRAINT t_import_record_results_created_contact_id_fkey FOREIGN KEY (created_contact_id) REFERENCES public.t_contacts(id);


--
-- Name: t_import_record_results t_import_record_results_created_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kewal_admin
--

ALTER TABLE ONLY public.t_import_record_results
    ADD CONSTRAINT t_import_record_results_created_customer_id_fkey FOREIGN KEY (created_customer_id) REFERENCES public.t_customers(id);


--
-- Name: t_import_record_results t_import_record_results_import_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kewal_admin
--

ALTER TABLE ONLY public.t_import_record_results
    ADD CONSTRAINT t_import_record_results_import_session_id_fkey FOREIGN KEY (import_session_id) REFERENCES public.t_import_sessions(id) ON DELETE CASCADE;


--
-- Name: t_import_record_results t_import_record_results_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kewal_admin
--

ALTER TABLE ONLY public.t_import_record_results
    ADD CONSTRAINT t_import_record_results_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.t_tenants(id);


--
-- Name: t_import_sessions t_import_sessions_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kewal_admin
--

ALTER TABLE ONLY public.t_import_sessions
    ADD CONSTRAINT t_import_sessions_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.t_users(id);


--
-- Name: t_import_sessions t_import_sessions_file_upload_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kewal_admin
--

ALTER TABLE ONLY public.t_import_sessions
    ADD CONSTRAINT t_import_sessions_file_upload_id_fkey FOREIGN KEY (file_upload_id) REFERENCES public.t_file_uploads(id);


--
-- Name: t_import_sessions t_import_sessions_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kewal_admin
--

ALTER TABLE ONLY public.t_import_sessions
    ADD CONSTRAINT t_import_sessions_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.t_tenants(id);


--
-- Name: t_import_staging_data t_import_staging_data_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kewal_admin
--

ALTER TABLE ONLY public.t_import_staging_data
    ADD CONSTRAINT t_import_staging_data_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.t_import_sessions(id) ON DELETE CASCADE;


--
-- Name: t_jtbd_configurations t_jtbd_configurations_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kewal_admin
--

ALTER TABLE ONLY public.t_jtbd_configurations
    ADD CONSTRAINT t_jtbd_configurations_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.t_users(id);


--
-- Name: t_jtbd_configurations t_jtbd_configurations_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kewal_admin
--

ALTER TABLE ONLY public.t_jtbd_configurations
    ADD CONSTRAINT t_jtbd_configurations_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.t_customers(id);


--
-- Name: t_jtbd_configurations t_jtbd_configurations_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kewal_admin
--

ALTER TABLE ONLY public.t_jtbd_configurations
    ADD CONSTRAINT t_jtbd_configurations_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.t_tenants(id);


--
-- Name: t_market_data_records t_market_data_records_index_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kewal_admin
--

ALTER TABLE ONLY public.t_market_data_records
    ADD CONSTRAINT t_market_data_records_index_id_fkey FOREIGN KEY (index_id) REFERENCES public.t_market_indices(id) ON DELETE CASCADE;


--
-- Name: t_market_download_jobs t_market_download_jobs_index_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kewal_admin
--

ALTER TABLE ONLY public.t_market_download_jobs
    ADD CONSTRAINT t_market_download_jobs_index_id_fkey FOREIGN KEY (index_id) REFERENCES public.t_market_indices(id) ON DELETE CASCADE;


--
-- Name: t_market_download_logs t_market_download_logs_index_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kewal_admin
--

ALTER TABLE ONLY public.t_market_download_logs
    ADD CONSTRAINT t_market_download_logs_index_id_fkey FOREIGN KEY (index_id) REFERENCES public.t_market_indices(id) ON DELETE CASCADE;


--
-- Name: t_market_download_logs t_market_download_logs_job_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kewal_admin
--

ALTER TABLE ONLY public.t_market_download_logs
    ADD CONSTRAINT t_market_download_logs_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.t_market_download_jobs(id) ON DELETE SET NULL;


--
-- Name: t_monthly_portfolio_snapshots t_monthly_portfolio_snapshots_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kewal_admin
--

ALTER TABLE ONLY public.t_monthly_portfolio_snapshots
    ADD CONSTRAINT t_monthly_portfolio_snapshots_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.t_customers(id);


--
-- Name: t_nav_data t_nav_data_scheme_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kewal_admin
--

ALTER TABLE ONLY public.t_nav_data
    ADD CONSTRAINT t_nav_data_scheme_id_fkey FOREIGN KEY (scheme_id) REFERENCES public.t_scheme_details(id);


--
-- Name: t_nav_schedule_executions t_nav_schedule_executions_scheduler_config_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kewal_admin
--

ALTER TABLE ONLY public.t_nav_schedule_executions
    ADD CONSTRAINT t_nav_schedule_executions_scheduler_config_id_fkey FOREIGN KEY (scheduler_config_id) REFERENCES public.t_nav_scheduler_configs(id) ON DELETE CASCADE;


--
-- Name: t_nav_scheduler_configs t_nav_scheduler_configs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kewal_admin
--

ALTER TABLE ONLY public.t_nav_scheduler_configs
    ADD CONSTRAINT t_nav_scheduler_configs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.t_users(id);


--
-- Name: t_scheme_bookmarks t_scheme_bookmarks_scheme_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kewal_admin
--

ALTER TABLE ONLY public.t_scheme_bookmarks
    ADD CONSTRAINT t_scheme_bookmarks_scheme_id_fkey FOREIGN KEY (scheme_id) REFERENCES public.t_scheme_details(id);


--
-- Name: t_scheme_bookmarks t_scheme_bookmarks_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kewal_admin
--

ALTER TABLE ONLY public.t_scheme_bookmarks
    ADD CONSTRAINT t_scheme_bookmarks_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.t_users(id);


--
-- Name: t_scheme_details t_scheme_details_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kewal_admin
--

ALTER TABLE ONLY public.t_scheme_details
    ADD CONSTRAINT t_scheme_details_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.t_users(id);


--
-- Name: t_scheme_details t_scheme_details_scheme_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kewal_admin
--

ALTER TABLE ONLY public.t_scheme_details
    ADD CONSTRAINT t_scheme_details_scheme_category_id_fkey FOREIGN KEY (scheme_category_id) REFERENCES public.t_scheme_masters(id);


--
-- Name: t_scheme_details t_scheme_details_scheme_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kewal_admin
--

ALTER TABLE ONLY public.t_scheme_details
    ADD CONSTRAINT t_scheme_details_scheme_type_id_fkey FOREIGN KEY (scheme_type_id) REFERENCES public.t_scheme_masters(id);


--
-- Name: t_scheme_details t_scheme_details_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kewal_admin
--

ALTER TABLE ONLY public.t_scheme_details
    ADD CONSTRAINT t_scheme_details_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.t_tenants(id);


--
-- Name: t_scheme_masters t_scheme_masters_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kewal_admin
--

ALTER TABLE ONLY public.t_scheme_masters
    ADD CONSTRAINT t_scheme_masters_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.t_tenants(id);


--
-- Name: t_transaction_table t_transaction_table_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kewal_admin
--

ALTER TABLE ONLY public.t_transaction_table
    ADD CONSTRAINT t_transaction_table_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.t_customers(id);


--
-- Name: t_transaction_table t_transaction_table_scheme_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kewal_admin
--

ALTER TABLE ONLY public.t_transaction_table
    ADD CONSTRAINT t_transaction_table_scheme_id_fkey FOREIGN KEY (scheme_id) REFERENCES public.t_scheme_details(id);


--
-- Name: t_user_chart_preferences t_user_chart_preferences_index_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kewal_admin
--

ALTER TABLE ONLY public.t_user_chart_preferences
    ADD CONSTRAINT t_user_chart_preferences_index_id_fkey FOREIGN KEY (index_id) REFERENCES public.t_market_indices(id) ON DELETE CASCADE;


--
-- Name: t_user_chart_preferences t_user_chart_preferences_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kewal_admin
--

ALTER TABLE ONLY public.t_user_chart_preferences
    ADD CONSTRAINT t_user_chart_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.t_users(id) ON DELETE CASCADE;


--
-- Name: t_users t_users_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: kewal_admin
--

ALTER TABLE ONLY public.t_users
    ADD CONSTRAINT t_users_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.t_tenants(id);


--
-- Name: t_chat_messages environment_filter_chat_messages; Type: POLICY; Schema: public; Owner: kewal_admin
--

CREATE POLICY environment_filter_chat_messages ON public.t_chat_messages FOR SELECT USING (
CASE
    WHEN ((public.current_environment())::text = 'live'::text) THEN (is_live = true)
    WHEN ((public.current_environment())::text = 'test'::text) THEN (is_live = false)
    ELSE true
END);


--
-- Name: t_chat_sessions environment_filter_chat_sessions; Type: POLICY; Schema: public; Owner: kewal_admin
--

CREATE POLICY environment_filter_chat_sessions ON public.t_chat_sessions FOR SELECT USING (
CASE
    WHEN ((public.current_environment())::text = 'live'::text) THEN (is_live = true)
    WHEN ((public.current_environment())::text = 'test'::text) THEN (is_live = false)
    ELSE true
END);


--
-- Name: t_users environment_filter_users; Type: POLICY; Schema: public; Owner: kewal_admin
--

CREATE POLICY environment_filter_users ON public.t_users FOR SELECT USING (
CASE
    WHEN ((public.current_environment())::text = 'live'::text) THEN (is_live = true)
    WHEN ((public.current_environment())::text = 'test'::text) THEN (is_live = false)
    ELSE true
END);


--
-- Name: POLICY environment_filter_users ON t_users; Type: COMMENT; Schema: public; Owner: kewal_admin
--

COMMENT ON POLICY environment_filter_users ON public.t_users IS 'Filter users by environment (live/test)';


--
-- Name: t_chat_messages; Type: ROW SECURITY; Schema: public; Owner: kewal_admin
--

ALTER TABLE public.t_chat_messages ENABLE ROW LEVEL SECURITY;

--
-- Name: t_chat_sessions; Type: ROW SECURITY; Schema: public; Owner: kewal_admin
--

ALTER TABLE public.t_chat_sessions ENABLE ROW LEVEL SECURITY;

--
-- Name: t_users; Type: ROW SECURITY; Schema: public; Owner: kewal_admin
--

ALTER TABLE public.t_users ENABLE ROW LEVEL SECURITY;

--
-- Name: t_chat_messages tenant_isolation_chat_messages; Type: POLICY; Schema: public; Owner: kewal_admin
--

CREATE POLICY tenant_isolation_chat_messages ON public.t_chat_messages USING ((tenant_id = public.current_tenant_id()));


--
-- Name: t_chat_sessions tenant_isolation_chat_sessions; Type: POLICY; Schema: public; Owner: kewal_admin
--

CREATE POLICY tenant_isolation_chat_sessions ON public.t_chat_sessions USING ((tenant_id = public.current_tenant_id()));


--
-- Name: t_users tenant_isolation_users; Type: POLICY; Schema: public; Owner: kewal_admin
--

CREATE POLICY tenant_isolation_users ON public.t_users USING ((tenant_id = public.current_tenant_id()));


--
-- Name: POLICY tenant_isolation_users ON t_users; Type: COMMENT; Schema: public; Owner: kewal_admin
--

COMMENT ON POLICY tenant_isolation_users ON public.t_users IS 'Isolate users by tenant_id';


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: pg_database_owner
--

GRANT ALL ON SCHEMA public TO kewal_admin;


--
-- PostgreSQL database dump complete
--

\unrestrict 7s2wbljIDUM366A7IfXcKUpB8Ldbd7vMqYPU7aVksCs3oGPecgV8kYjezvMUwXf

