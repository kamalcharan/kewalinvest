-- Migration: 030_4th_round_testing_fixes.sql
-- Date: 2025-12-12
-- Description: 4th Round Testing Fixes - Comprehensive Migration
--   - Customer duplicate check function (iwell_code only)
--   - Drop unique PAN constraint (minors use guardian PAN)
--   - Add SYSTEMATIC TRANSFER IN/OUT transaction types

-- =====================================================
-- 1. DROP UNIQUE PAN CONSTRAINT
-- =====================================================
-- REASON: Minors don't have their own PAN, so they use parent/guardian's PAN.
-- Multiple children (minors) can share the same parent's PAN.
-- These are NOT duplicates - they are different customers.

ALTER TABLE t_customers DROP CONSTRAINT IF EXISTS unique_customer_pan;

-- Create a non-unique index for PAN lookups (performance)
DROP INDEX IF EXISTS idx_customers_pan;
CREATE INDEX IF NOT EXISTS idx_customers_pan ON t_customers (tenant_id, pan, is_live)
WHERE pan IS NOT NULL AND pan != '';

-- =====================================================
-- 2. UPDATE CUSTOMER DUPLICATE CHECK FUNCTION
-- =====================================================
-- CHANGE: Now only checks iwell_code (unique identifier from source system)
-- REMOVED: PAN, email, mobile checks (caused false positives for minors)

-- Drop all existing signatures
DROP FUNCTION IF EXISTS check_customer_duplicate(VARCHAR, VARCHAR, VARCHAR);
DROP FUNCTION IF EXISTS check_customer_duplicate(VARCHAR, INTEGER, BOOLEAN);

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

    -- No iwell_code provided - cannot determine duplicate
    RETURN false;
END;
$$;

-- =====================================================
-- 3. ADD NEW TRANSACTION TYPES
-- =====================================================
-- These transaction type codes are found in import files and need to be available
-- for proper transaction processing

INSERT INTO m_transaction_types (txn_code, txn_name, txn_type, is_active, description)
VALUES
    ('SYSTEMATIC TRANSFER OUT', 'Systematic Transfer Out', 'Deduction', TRUE,
     'Systematic transfer of funds to another scheme (outgoing) - alternate code'),
    ('SYSTEMATIC TRANSFER IN', 'Systematic Transfer In', 'Addition', TRUE,
     'Systematic transfer of funds from another scheme (incoming) - alternate code')
ON CONFLICT (txn_code) DO UPDATE
    SET txn_name = EXCLUDED.txn_name,
        txn_type = EXCLUDED.txn_type,
        is_active = EXCLUDED.is_active,
        description = EXCLUDED.description,
        updated_at = CURRENT_TIMESTAMP;

-- =====================================================
-- VERIFICATION
-- =====================================================
DO $$
BEGIN
    -- Verify PAN constraint dropped
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'unique_customer_pan'
    ) THEN
        RAISE NOTICE 'SUCCESS: unique_customer_pan constraint has been dropped';
    ELSE
        RAISE WARNING 'WARNING: unique_customer_pan constraint still exists';
    END IF;

    -- Verify function exists
    IF EXISTS (
        SELECT 1 FROM pg_proc
        WHERE proname = 'check_customer_duplicate'
    ) THEN
        RAISE NOTICE 'SUCCESS: check_customer_duplicate function exists';
    ELSE
        RAISE WARNING 'WARNING: check_customer_duplicate function not found';
    END IF;

    -- Verify transaction types
    IF EXISTS (
        SELECT 1 FROM m_transaction_types
        WHERE txn_code IN ('SYSTEMATIC TRANSFER IN', 'SYSTEMATIC TRANSFER OUT')
    ) THEN
        RAISE NOTICE 'SUCCESS: SYSTEMATIC TRANSFER transaction types exist';
    ELSE
        RAISE WARNING 'WARNING: SYSTEMATIC TRANSFER transaction types not found';
    END IF;
END $$;

-- =====================================================
-- NOTES: Code-level fixes (no migration needed)
-- =====================================================
-- The following issues were fixed in application code only:
--
-- Contact Module:
--   - Contact to customer conversion now uses proper hook
--   - Primary channel enforcement (one overall, not per type)
--   - Primary checkbox untick functionality
--
-- Customer Module:
--   - Customer edit now updates contact table for name/prefix
--   - Alert creation includes jtbd_category in INSERT
--
-- Import Dashboard:
--   - Pagination now handles offset/limit params
--   - Orphans count extracted from processing_metadata
--
-- Transaction Module:
--   - Scheme search uses ILIKE on code AND name
--   - Sort dropdown uses selected value (not toggle)
--   - Transaction reprocessing now calls process_transaction_import_session function
--
-- Portfolio Module:
--   - Portfolio snapshots include historical data
--   - NAV query removed is_live filter (NAV is global)
--   - Estimated NAV indicator for incomplete months
--   - Negative market value handled for exited investors
--   - MoM calculation fixed
--   - Networth 24M projection fixed
-- =====================================================
