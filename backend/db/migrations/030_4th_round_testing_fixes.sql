-- Migration: 030_4th_round_testing_fixes.sql
-- Date: 2025-12-12
-- Description: 4th Round Testing Fixes
--   - Add SYSTEMATIC TRANSFER IN/OUT transaction types
--   - No schema changes required (all fixes are code-level)

-- =====================================================
-- 1. ADD NEW TRANSACTION TYPES
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
--
-- Portfolio Module:
--   - Portfolio snapshots include historical data
--   - NAV query removed is_live filter (NAV is global)
--   - Estimated NAV indicator for incomplete months
--   - Negative market value handled for exited investors
--   - MoM calculation fixed
--   - Networth 24M projection fixed
-- =====================================================
