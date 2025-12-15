-- ============================================================================
-- Release: V1.1
-- Date: 2025-12-12
-- Description: Customer import fixes for minors + STP transaction aliases
-- ============================================================================
-- CONTENTS:
--   Migration 025: Drop PAN unique constraint (minors share parent PAN)
--   Migration 025: Update check_customer_duplicate function (iwell_code only)
--   Migration 025: Update process_single_customer_record function
--   Migration 026: Add STP transaction type aliases
-- ============================================================================

BEGIN;

-- ============================================================================
-- MIGRATION 025: DROP PAN UNIQUE CONSTRAINT
-- ============================================================================
-- REASON: Minors don't have their own PAN, so they use parent/guardian's PAN.
-- Multiple children (minors) can share the same parent's PAN.
-- These are NOT duplicates - they are different customers with unique iwell_code.
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Release V1.1 - Starting Migration';
    RAISE NOTICE '========================================';
END $$;

-- Step 1: Drop the unique constraint on PAN
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'unique_customer_pan'
    ) THEN
        ALTER TABLE t_customers DROP CONSTRAINT unique_customer_pan;
        RAISE NOTICE '[Migration 025] Dropped unique_customer_pan constraint';
    ELSE
        RAISE NOTICE '[Migration 025] Constraint unique_customer_pan does not exist - skipping';
    END IF;
END $$;

-- Step 2: Create non-unique index for PAN lookup performance (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'idx_customers_pan'
    ) THEN
        CREATE INDEX idx_customers_pan ON t_customers (tenant_id, pan, is_live);
        RAISE NOTICE '[Migration 025] Created non-unique index idx_customers_pan';
    ELSE
        RAISE NOTICE '[Migration 025] Index idx_customers_pan already exists - skipping';
    END IF;
END $$;

-- Step 3: Update column comment
COMMENT ON COLUMN t_customers.pan IS 'PAN number (plain text) - NOT unique, minors share guardian PAN';

-- ============================================================================
-- MIGRATION 025: UPDATE check_customer_duplicate FUNCTION
-- ============================================================================
-- OLD: check_customer_duplicate(p_tenant_id, p_is_live, p_pan, p_email, p_mobile)
-- NEW: check_customer_duplicate(p_iwell_code, p_tenant_id, p_is_live)
-- ============================================================================

-- Drop existing function (all overloads)
DROP FUNCTION IF EXISTS check_customer_duplicate(INTEGER, BOOLEAN, VARCHAR, VARCHAR, VARCHAR);
DROP FUNCTION IF EXISTS check_customer_duplicate(VARCHAR, INTEGER, BOOLEAN);

-- Create new function with iwell_code-only duplicate detection
CREATE OR REPLACE FUNCTION check_customer_duplicate(
    p_iwell_code VARCHAR,
    p_tenant_id INTEGER,
    p_is_live BOOLEAN
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
    v_exists BOOLEAN;
BEGIN
    -- Duplicate check is ONLY based on iwell_code
    -- PAN, email, mobile are NOT used because:
    -- - Minors share parent's PAN
    -- - Minors share parent's email
    -- - Minors share parent's mobile
    -- iwell_code is the unique identifier from source system
    
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
    
    -- If no iwell_code provided, not a duplicate
    RETURN false;
END;
$$;

COMMENT ON FUNCTION check_customer_duplicate(VARCHAR, INTEGER, BOOLEAN) IS 
'Check for duplicate customers using iwell_code only (Migration 025) - PAN/email/mobile not used as minors share parent credentials';

DO $$
BEGIN
    RAISE NOTICE '[Migration 025] Created check_customer_duplicate function (iwell_code only)';
END $$;

-- ============================================================================
-- MIGRATION 025: UPDATE process_single_customer_record FUNCTION
-- ============================================================================

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
    
    -- DEBUG: Log the entire mapped_data JSON
    RAISE NOTICE '[DEBUG] Processing staging_id: %, mapped_data keys: %', 
        p_staging_id, 
        (SELECT array_agg(key) FROM jsonb_object_keys(v_mapped_data) AS key);
    
    BEGIN
        -- Migration 025: Check for duplicates using iwell_code ONLY
        -- PAN/email/mobile not used - minors share parent credentials
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
        
        -- Date parsing with multiple format fallbacks
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

        -- DEBUG: Log family field values before INSERT
        RAISE NOTICE '[DEBUG] About to INSERT customer - name: %, family_head_name: %, family_head_iwell_code: %',
            v_mapped_data->>'name',
            v_mapped_data->>'family_head_name',
            v_mapped_data->>'family_head_iwell_code';

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
        
        -- Cleanup partial record on failure
        IF v_contact_id IS NOT NULL THEN
            DELETE FROM t_contacts WHERE id = v_contact_id;
        END IF;
    END;
END;
$$;

COMMENT ON FUNCTION process_single_customer_record(INTEGER) IS 
'Process single customer record from staging - uses iwell_code for duplicate detection (Migration 025), plain text family fields, with debug logging';

DO $$
BEGIN
    RAISE NOTICE '[Migration 025] Updated process_single_customer_record function';
END $$;

-- ============================================================================
-- MIGRATION 026: ADD STP TRANSACTION TYPE ALIASES
-- ============================================================================
-- REASON: Import files use verbose "SYSTEMATIC TRANSFER OUT/IN" 
-- instead of "STP-OUT/STP-IN". Accept both formats natively.
-- ============================================================================

-- Insert SYSTEMATIC TRANSFER OUT (alias for STP-OUT)
INSERT INTO m_transaction_types (txn_code, txn_name, txn_type, is_active)
SELECT 'SYSTEMATIC TRANSFER OUT', 'Systematic Transfer Out', 'Deduction', true
WHERE NOT EXISTS (
    SELECT 1 FROM m_transaction_types 
    WHERE txn_code = 'SYSTEMATIC TRANSFER OUT'
);

-- Insert SYSTEMATIC TRANSFER IN (alias for STP-IN)
INSERT INTO m_transaction_types (txn_code, txn_name, txn_type, is_active)
SELECT 'SYSTEMATIC TRANSFER IN', 'Systematic Transfer In', 'Addition', true
WHERE NOT EXISTS (
    SELECT 1 FROM m_transaction_types 
    WHERE txn_code = 'SYSTEMATIC TRANSFER IN'
);

DO $$
DECLARE
    v_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_count 
    FROM m_transaction_types 
    WHERE txn_code IN ('SYSTEMATIC TRANSFER OUT', 'SYSTEMATIC TRANSFER IN');
    
    RAISE NOTICE '[Migration 026] STP aliases present: % of 2', v_count;
END $$;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
DECLARE
    v_constraint_exists BOOLEAN;
    v_index_exists BOOLEAN;
    v_function_exists BOOLEAN;
    v_stp_count INTEGER;
BEGIN
    -- Check constraint removed
    SELECT EXISTS(
        SELECT 1 FROM pg_constraint WHERE conname = 'unique_customer_pan'
    ) INTO v_constraint_exists;
    
    -- Check index exists
    SELECT EXISTS(
        SELECT 1 FROM pg_indexes WHERE indexname = 'idx_customers_pan'
    ) INTO v_index_exists;
    
    -- Check function exists with new signature
    SELECT EXISTS(
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public' 
        AND p.proname = 'check_customer_duplicate'
    ) INTO v_function_exists;
    
    -- Check STP aliases
    SELECT COUNT(*) INTO v_stp_count 
    FROM m_transaction_types 
    WHERE txn_code IN ('SYSTEMATIC TRANSFER OUT', 'SYSTEMATIC TRANSFER IN');
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'VERIFICATION RESULTS:';
    RAISE NOTICE '========================================';
    RAISE NOTICE '  PAN unique constraint removed: %', NOT v_constraint_exists;
    RAISE NOTICE '  PAN index created: %', v_index_exists;
    RAISE NOTICE '  check_customer_duplicate exists: %', v_function_exists;
    RAISE NOTICE '  STP aliases added: %/2', v_stp_count;
    RAISE NOTICE '========================================';
    
    IF v_constraint_exists THEN
        RAISE WARNING 'PAN unique constraint still exists!';
    END IF;
    
    IF NOT v_index_exists THEN
        RAISE WARNING 'PAN index not created!';
    END IF;
    
    IF v_stp_count < 2 THEN
        RAISE WARNING 'Not all STP aliases were inserted!';
    END IF;
END $$;

-- ============================================================================
-- COMPLETION
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Release V1.1 - Migration Complete';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Changes Applied:';
    RAISE NOTICE '  [025] Dropped unique_customer_pan constraint';
    RAISE NOTICE '  [025] Created idx_customers_pan (non-unique)';
    RAISE NOTICE '  [025] Updated check_customer_duplicate()';
    RAISE NOTICE '        → Now uses iwell_code ONLY';
    RAISE NOTICE '        → PAN/email/mobile ignored (minors)';
    RAISE NOTICE '  [025] Updated process_single_customer_record()';
    RAISE NOTICE '        → Calls new duplicate function';
    RAISE NOTICE '        → Debug logging added';
    RAISE NOTICE '  [026] Added SYSTEMATIC TRANSFER OUT alias';
    RAISE NOTICE '  [026] Added SYSTEMATIC TRANSFER IN alias';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'ROLLBACK INSTRUCTIONS (if needed):';
    RAISE NOTICE '  1. Add constraint back:';
    RAISE NOTICE '     ALTER TABLE t_customers ADD CONSTRAINT';
    RAISE NOTICE '       unique_customer_pan UNIQUE (tenant_id, pan, is_live);';
    RAISE NOTICE '  2. Delete STP aliases:';
    RAISE NOTICE '     DELETE FROM m_transaction_types';
    RAISE NOTICE '       WHERE txn_code IN (''SYSTEMATIC TRANSFER OUT'',';
    RAISE NOTICE '                          ''SYSTEMATIC TRANSFER IN'');';
    RAISE NOTICE '========================================';
END $$;

COMMIT;
