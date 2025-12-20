-- ============================================================================
-- Migration: 07_migration.sql
-- Description: V1.1 - PAN constraint removal, duplicate check update, STP aliases
-- Date: 2025-12-12
-- ============================================================================

-- ============================================================================
-- Drop PAN unique constraint (minors share parent PAN)
-- ============================================================================
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'unique_customer_pan') THEN
        ALTER TABLE t_customers DROP CONSTRAINT unique_customer_pan;
        RAISE NOTICE 'Dropped unique_customer_pan constraint';
    END IF;
END $$;

-- Create non-unique index for PAN lookup
CREATE INDEX IF NOT EXISTS idx_customers_pan ON t_customers (tenant_id, pan, is_live);

-- ============================================================================
-- Update check_customer_duplicate function (iwell_code only)
-- ============================================================================
DROP FUNCTION IF EXISTS check_customer_duplicate(INTEGER, BOOLEAN, VARCHAR, VARCHAR, VARCHAR);
DROP FUNCTION IF EXISTS check_customer_duplicate(VARCHAR, INTEGER, BOOLEAN);

CREATE OR REPLACE FUNCTION check_customer_duplicate(
    p_iwell_code VARCHAR,
    p_tenant_id INTEGER,
    p_is_live BOOLEAN
) RETURNS BOOLEAN LANGUAGE plpgsql AS $$
DECLARE
    v_exists BOOLEAN;
BEGIN
    IF p_iwell_code IS NOT NULL AND TRIM(p_iwell_code) != '' THEN
        SELECT EXISTS(
            SELECT 1 FROM t_customers 
            WHERE iwell_code = UPPER(TRIM(p_iwell_code))
            AND tenant_id = p_tenant_id
            AND is_live = p_is_live
            AND is_active = true
        ) INTO v_exists;
        RETURN v_exists;
    END IF;
    RETURN false;
END;
$$;

-- ============================================================================
-- Update process_single_customer_record function
-- ============================================================================
CREATE OR REPLACE FUNCTION process_single_customer_record(p_staging_id INTEGER)
RETURNS VOID LANGUAGE plpgsql AS $$
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
    SELECT * INTO v_staging FROM t_import_staging_data WHERE id = p_staging_id;
    IF NOT FOUND THEN RETURN; END IF;
    
    UPDATE t_import_staging_data SET processing_status = 'processing' WHERE id = p_staging_id;
    v_mapped_data := v_staging.mapped_data;
    v_error_messages := ARRAY[]::TEXT[];
    
    BEGIN
        -- Check duplicates using iwell_code only
        v_is_duplicate := check_customer_duplicate(
            v_mapped_data->>'iwell_code',
            v_staging.tenant_id,
            v_staging.is_live
        );
        
        IF v_is_duplicate THEN
            UPDATE t_import_staging_data
            SET processing_status = 'duplicate',
                warnings = array_append(warnings, 'Customer already exists with this iwell_code'),
                processed_at = CURRENT_TIMESTAMP
            WHERE id = p_staging_id;
            RETURN;
        END IF;
        
        -- Clean prefix
        v_clean_prefix := TRIM(v_mapped_data->>'prefix');
        v_clean_prefix := REPLACE(v_clean_prefix, '.', '');
        v_clean_prefix := INITCAP(LOWER(v_clean_prefix));
        IF v_clean_prefix IN ('Mr', 'Mrs', 'Ms', 'Dr', 'Prof') THEN NULL;
        ELSIF v_clean_prefix = '' OR v_clean_prefix IS NULL THEN v_clean_prefix := 'Sri';
        ELSE v_clean_prefix := 'Sri';
        END IF;
        
        -- Create contact
        INSERT INTO t_contacts (tenant_id, is_live, prefix, name, is_customer, created_at)
        VALUES (v_staging.tenant_id, v_staging.is_live, v_clean_prefix, v_mapped_data->>'name', true, CURRENT_TIMESTAMP)
        RETURNING id INTO v_contact_id;
        
        -- Create email channel
        IF v_mapped_data->>'email' IS NOT NULL AND TRIM(v_mapped_data->>'email') != '' THEN
            INSERT INTO t_contact_channels (contact_id, tenant_id, is_live, channel_type, channel_value, is_primary)
            VALUES (v_contact_id, v_staging.tenant_id, v_staging.is_live, 'email', v_mapped_data->>'email', true);
        END IF;
        
        -- Create mobile channel
        IF v_mapped_data->>'mobile' IS NOT NULL AND TRIM(v_mapped_data->>'mobile') != '' THEN
            INSERT INTO t_contact_channels (contact_id, tenant_id, is_live, channel_type, channel_value, is_primary)
            VALUES (v_contact_id, v_staging.tenant_id, v_staging.is_live, 'mobile', v_mapped_data->>'mobile',
                CASE WHEN v_mapped_data->>'email' IS NULL THEN true ELSE false END);
        END IF;
        
        -- Parse date of birth
        v_date_of_birth := NULL;
        IF v_mapped_data->>'date_of_birth' IS NOT NULL AND TRIM(v_mapped_data->>'date_of_birth') != '' THEN
            BEGIN v_date_of_birth := TO_DATE(v_mapped_data->>'date_of_birth', 'DD-MM-YYYY');
            EXCEPTION WHEN OTHERS THEN
                BEGIN v_date_of_birth := TO_DATE(v_mapped_data->>'date_of_birth', 'MM-DD-YYYY');
                EXCEPTION WHEN OTHERS THEN
                    BEGIN v_date_of_birth := TO_DATE(v_mapped_data->>'date_of_birth', 'YYYY-MM-DD');
                    EXCEPTION WHEN OTHERS THEN v_date_of_birth := NULL;
                    END;
                END;
            END;
        END IF;
        
        -- Parse anniversary date
        v_anniversary_date := NULL;
        IF v_mapped_data->>'anniversary_date' IS NOT NULL AND TRIM(v_mapped_data->>'anniversary_date') != '' THEN
            BEGIN v_anniversary_date := TO_DATE(v_mapped_data->>'anniversary_date', 'DD-MM-YYYY');
            EXCEPTION WHEN OTHERS THEN
                BEGIN v_anniversary_date := TO_DATE(v_mapped_data->>'anniversary_date', 'MM-DD-YYYY');
                EXCEPTION WHEN OTHERS THEN
                    BEGIN v_anniversary_date := TO_DATE(v_mapped_data->>'anniversary_date', 'YYYY-MM-DD');
                    EXCEPTION WHEN OTHERS THEN v_anniversary_date := NULL;
                    END;
                END;
            END;
        END IF;
        
        v_iwell_code := NULLIF(TRIM(v_mapped_data->>'iwell_code'), '');
        
        -- Create customer
        INSERT INTO t_customers (
            contact_id, tenant_id, is_live, pan, iwell_code, date_of_birth, anniversary_date,
            family_head_name, family_head_iwell_code, referred_by_name, created_at
        ) VALUES (
            v_contact_id, v_staging.tenant_id, v_staging.is_live, v_mapped_data->>'pan', v_iwell_code,
            v_date_of_birth, v_anniversary_date, v_mapped_data->>'family_head_name',
            v_mapped_data->>'family_head_iwell_code', v_mapped_data->>'referred_by_name', CURRENT_TIMESTAMP
        ) RETURNING id INTO v_customer_id;
        
        -- Create address
        IF (v_mapped_data->>'address_line1' IS NOT NULL AND TRIM(v_mapped_data->>'address_line1') != '') OR
           (v_mapped_data->>'city' IS NOT NULL AND TRIM(v_mapped_data->>'city') != '') THEN
            INSERT INTO t_customer_addresses (
                customer_id, tenant_id, is_live, address_type, address_line1, address_line2,
                city, state, country, pincode, is_primary
            ) VALUES (
                v_customer_id, v_staging.tenant_id, v_staging.is_live, 'residential',
                COALESCE(NULLIF(TRIM(v_mapped_data->>'address_line1'), ''), 'Not Provided'),
                NULLIF(TRIM(v_mapped_data->>'address_line2'), ''),
                COALESCE(NULLIF(TRIM(v_mapped_data->>'city'), ''), 'Unknown'),
                COALESCE(NULLIF(TRIM(v_mapped_data->>'state'), ''), 'Unknown'),
                COALESCE(NULLIF(TRIM(v_mapped_data->>'country'), ''), 'India'),
                COALESCE(NULLIF(TRIM(v_mapped_data->>'pincode'), ''), '000000'),
                true
            );
        END IF;
        
        -- Mark success
        UPDATE t_import_staging_data
        SET processing_status = 'success', created_record_id = v_customer_id,
            created_record_type = 'customer', processed_at = CURRENT_TIMESTAMP
        WHERE id = p_staging_id;
        
    EXCEPTION WHEN OTHERS THEN
        v_error_messages := array_append(v_error_messages, SQLERRM);
        UPDATE t_import_staging_data
        SET processing_status = 'failed', error_messages = v_error_messages, processed_at = CURRENT_TIMESTAMP
        WHERE id = p_staging_id;
        IF v_contact_id IS NOT NULL THEN DELETE FROM t_contacts WHERE id = v_contact_id; END IF;
    END;
END;
$$;

-- ============================================================================
-- Add STP transaction type aliases
-- ============================================================================
INSERT INTO m_transaction_types (txn_code, txn_name, txn_type, is_active)
SELECT 'SYSTEMATIC TRANSFER OUT', 'Systematic Transfer Out', 'Deduction', true
WHERE NOT EXISTS (SELECT 1 FROM m_transaction_types WHERE txn_code = 'SYSTEMATIC TRANSFER OUT');

INSERT INTO m_transaction_types (txn_code, txn_name, txn_type, is_active)
SELECT 'SYSTEMATIC TRANSFER IN', 'Systematic Transfer In', 'Addition', true
WHERE NOT EXISTS (SELECT 1 FROM m_transaction_types WHERE txn_code = 'SYSTEMATIC TRANSFER IN');

-- ============================================================================
-- Add is_admin column to t_tenants if missing
-- ============================================================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 't_tenants' AND column_name = 'is_admin') THEN
        ALTER TABLE t_tenants ADD COLUMN is_admin BOOLEAN DEFAULT false;
        RAISE NOTICE 'Added is_admin column to t_tenants';
    END IF;
END $$;
