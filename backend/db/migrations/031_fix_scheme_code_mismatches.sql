-- Migration 031: Fix Scheme Code Mismatches (Growth vs IDCW)
-- Issue: Customers showing negative returns due to wrong scheme_code mapping
-- Date: 2026-01-02
-- Branch: claude/review-26-pdf-gQBfa

-- ============================================================================
-- PART 1: UTI Flexi Cap Fund (IDCW → Growth)
-- Wrong: 100668 (IDCW variant, NAV ~146)
-- Correct: 100669 (Growth variant, NAV ~328)
-- ============================================================================

-- Step 1.1: Update bookmark
UPDATE t_scheme_bookmarks
SET scheme_code = '100669'
WHERE scheme_code = '100668'
  AND tenant_id = 17;

-- Step 1.2: Update transactions
UPDATE t_transaction_table
SET scheme_code = '100669'
WHERE scheme_code = '100668'
  AND tenant_id = 17
  AND is_live = true;

-- Step 1.3: Delete wrong NAV (only if no other tenants use it)
-- Check first: SELECT COUNT(*) FROM t_transaction_table WHERE scheme_code = '100668';
-- If 0, run:
DELETE FROM t_nav_data
WHERE scheme_code = '100668'
  AND is_live = true
  AND NOT EXISTS (
    SELECT 1 FROM t_transaction_table
    WHERE scheme_code = '100668' AND is_live = true
  );

-- ============================================================================
-- PART 2: SBI Focused Equity Fund (IDCW → Growth)
-- Wrong: 102765
-- Correct: 102756
-- ============================================================================

UPDATE t_scheme_bookmarks
SET scheme_code = '102756'
WHERE scheme_code = '102765'
  AND tenant_id = 17;

UPDATE t_transaction_table
SET scheme_code = '102756'
WHERE scheme_code = '102765'
  AND tenant_id = 17
  AND is_live = true;

DELETE FROM t_nav_data
WHERE scheme_code = '102765'
  AND is_live = true
  AND NOT EXISTS (
    SELECT 1 FROM t_transaction_table
    WHERE scheme_code = '102765' AND is_live = true
  );

-- ============================================================================
-- PART 3: Axis Arbitrage Fund (IDCW → Growth)
-- Wrong: 112087
-- Correct: 130771
-- ============================================================================

UPDATE t_scheme_bookmarks
SET scheme_code = '130771'
WHERE scheme_code = '112087'
  AND tenant_id = 17;

UPDATE t_transaction_table
SET scheme_code = '130771'
WHERE scheme_code = '112087'
  AND tenant_id = 17
  AND is_live = true;

DELETE FROM t_nav_data
WHERE scheme_code = '112087'
  AND is_live = true
  AND NOT EXISTS (
    SELECT 1 FROM t_transaction_table
    WHERE scheme_code = '112087' AND is_live = true
  );

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify no transactions remain with old codes
SELECT scheme_code, COUNT(*) as count
FROM t_transaction_table
WHERE scheme_code IN ('100668', '102765', '112087')
  AND tenant_id = 17
  AND is_live = true
GROUP BY scheme_code;
-- Expected: Empty result

-- Verify affected customers (6 customers)
SELECT DISTINCT c.id, co.name, t.scheme_code
FROM t_transaction_table t
JOIN t_customers c ON c.id = t.customer_id
JOIN t_contacts co ON co.id = c.contact_id
WHERE t.scheme_code IN ('100669', '102756', '130771')
  AND t.tenant_id = 17
  AND t.is_live = true
ORDER BY co.name;

-- ============================================================================
-- POST-MIGRATION STEPS (Manual)
-- ============================================================================
-- 1. Download NAV for schemes: 100669, 102756, 130771
-- 2. Regenerate portfolio snapshots for affected customers
-- 3. Verify returns are now positive
