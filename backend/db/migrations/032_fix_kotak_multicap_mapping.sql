-- Migration 032: Fix Kotak Multicap Fund Mapping Error
-- Issue: "Kotak Multicap Fund (G)" mapped to wrong scheme "Kotak Multi Asset Allocation Fund"
-- Date: 2026-01-02
-- Branch: claude/review-26-pdf-gQBfa

-- ============================================================================
-- PROBLEM SUMMARY
-- ============================================================================
-- Transaction scheme_name: "Kotak Multicap Fund (G)"
-- Was mapped to: scheme_code 152065 = "Kotak Multi Asset Allocation Fund" (WRONG)
-- Should be: scheme_code 149182 = "Kotak Multicap Fund-Regular Plan-Growth" (CORRECT)
--
-- These are DIFFERENT funds:
-- - Kotak Multicap Fund: Equity multicap fund
-- - Kotak Multi Asset Allocation Fund: Hybrid fund (equity + debt + gold)

-- ============================================================================
-- AFFECTED CUSTOMERS (11)
-- ============================================================================
-- 1. CHALLA SANJAY KUMAR (1287)
-- 2. DHWANI CHHABHAIYA (1291)
-- 3. GNANA PRASUNA MUKTEVI (1295)
-- 4. LAGISHETTY VENKATESH (1312)
-- 5. MAVANUR RANGARAJU BALAJI (1320)
-- 6. NANDISH T C (1332)
-- 7. PRIYANKA S CHILLERGE (1350)
-- 8. RACHURI RAGHAVENDRA SWAMY (1351)
-- 9. SAMPATH KUMAR TUDGANI (1362)
-- 10. SWETHA KOTTI (1383)
-- 11. V AJAY KUMAR (1387)

-- ============================================================================
-- FIX: Update scheme_code from 152065 to 149182
-- ============================================================================

-- Step 1: Update bookmark
UPDATE t_scheme_bookmarks
SET scheme_code = '149182'
WHERE scheme_code = '152065'
  AND tenant_id = 17;

-- Step 2: Update all transactions
UPDATE t_transaction_table
SET scheme_code = '149182'
WHERE scheme_code = '152065'
  AND tenant_id = 17
  AND is_live = true;

-- Step 3: Delete wrong NAV data (if not used by others)
DELETE FROM t_nav_data
WHERE scheme_code = '152065'
  AND is_live = true
  AND NOT EXISTS (
    SELECT 1 FROM t_transaction_table
    WHERE scheme_code = '152065' AND is_live = true
  );

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify bookmark updated
SELECT id, scheme_code, scheme_name
FROM t_scheme_bookmarks
WHERE scheme_code = '149182'
  AND tenant_id = 17;

-- Verify no transactions remain with old code
SELECT COUNT(*) as remaining
FROM t_transaction_table
WHERE scheme_code = '152065'
  AND tenant_id = 17
  AND is_live = true;
-- Expected: 0

-- Verify affected customers
SELECT DISTINCT c.id, co.name
FROM t_transaction_table t
JOIN t_customers c ON c.id = t.customer_id
JOIN t_contacts co ON co.id = c.contact_id
WHERE t.scheme_code = '149182'
  AND t.tenant_id = 17
  AND t.is_live = true
ORDER BY co.name;
-- Expected: 11 customers

-- ============================================================================
-- POST-MIGRATION STEPS (Manual)
-- ============================================================================
-- 1. Download NAV for scheme 149182 (Kotak Multicap Fund-Regular Plan-Growth)
-- 2. Regenerate portfolio snapshots for all 11 affected customers
-- 3. Verify returns using:
/*
SELECT
    c.id as customer_id,
    co.name as customer_name,
    s.snapshot_month_end,
    s.total_invested,
    s.current_value,
    s.return_percentage
FROM t_monthly_portfolio_snapshots s
JOIN t_customers c ON c.id = s.customer_id
JOIN t_contacts co ON co.id = c.contact_id
WHERE c.id IN (1287, 1291, 1295, 1312, 1320, 1332, 1350, 1351, 1362, 1383, 1387)
  AND s.tenant_id = 17
  AND s.is_live = true
  AND s.snapshot_month_end = (
      SELECT MAX(snapshot_month_end)
      FROM t_monthly_portfolio_snapshots
      WHERE customer_id = s.customer_id
        AND tenant_id = 17
        AND is_live = true
  )
ORDER BY co.name;
*/

-- ============================================================================
-- KNOWN ISSUE: NAV Query Problem
-- ============================================================================
-- NAV data for 149182 exists (540 records per UI) but SQL queries return NULL
-- Possible causes:
-- 1. Data type mismatch (VARCHAR vs INTEGER)
-- 2. Database connection issue
-- 3. Caching layer
--
-- Needs investigation before snapshots can be regenerated correctly
