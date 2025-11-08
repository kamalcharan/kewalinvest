-- Migration 007: Add allocation column to t_customer_master_portfolio and create sync trigger
-- This column tracks the percentage of each scheme allocated to goals (0-100%)
-- Automatically updated via trigger when goals are created/updated/deleted

-- ==================== STEP 1: Add allocation column ====================
ALTER TABLE t_customer_master_portfolio
ADD COLUMN IF NOT EXISTS allocation DECIMAL(5,2) DEFAULT 0.00 CHECK (allocation >= 0 AND allocation <= 100);

COMMENT ON COLUMN t_customer_master_portfolio.allocation IS
'Percentage of this scheme allocated to goals (0-100%). Auto-updated via trigger from t_jtbd_configurations.';

-- ==================== STEP 2: Create trigger function ====================
CREATE OR REPLACE FUNCTION update_scheme_allocation()
RETURNS TRIGGER AS $$
DECLARE
  v_tenant_id INTEGER;
  v_is_live BOOLEAN;
  v_customer_id INTEGER;
BEGIN
  -- Get context from the modified row
  IF TG_OP = 'DELETE' THEN
    v_tenant_id := OLD.tenant_id;
    v_is_live := OLD.is_live;
    v_customer_id := OLD.customer_id;
  ELSE
    v_tenant_id := NEW.tenant_id;
    v_is_live := NEW.is_live;
    v_customer_id := NEW.customer_id;
  END IF;

  -- Recalculate allocation for all schemes of this customer
  WITH goal_allocations AS (
    SELECT
      scheme_code,
      SUM(allocation_pct::decimal) AS total_allocated
    FROM (
      SELECT
        (jsonb_array_elements(config_data->'linked_schemes')->>'scheme_code') AS scheme_code,
        (jsonb_array_elements(config_data->'linked_schemes')->>'allocation_percentage') AS allocation_pct
      FROM t_jtbd_configurations
      WHERE tenant_id = v_tenant_id
        AND is_live = v_is_live
        AND customer_id = v_customer_id
        AND jtbd_type = 'goal_tracking'
        AND is_active = true
    ) AS scheme_allocs
    GROUP BY scheme_code
  )
  UPDATE t_customer_master_portfolio p
  SET allocation = LEAST(COALESCE(ga.total_allocated, 0), 100.00)
  FROM goal_allocations ga
  WHERE p.scheme_code = ga.scheme_code
    AND p.tenant_id = v_tenant_id
    AND p.is_live = v_is_live
    AND p.customer_id = v_customer_id;

  -- Reset allocation for schemes no longer in any active goal
  UPDATE t_customer_master_portfolio
  SET allocation = 0
  WHERE tenant_id = v_tenant_id
    AND is_live = v_is_live
    AND customer_id = v_customer_id
    AND scheme_code NOT IN (
      SELECT DISTINCT (jsonb_array_elements(config_data->'linked_schemes')->>'scheme_code')
      FROM t_jtbd_configurations
      WHERE tenant_id = v_tenant_id
        AND is_live = v_is_live
        AND customer_id = v_customer_id
        AND jtbd_type = 'goal_tracking'
        AND is_active = true
    );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_scheme_allocation() IS
'Automatically recalculates scheme allocation percentages when goals are created/updated/deleted';

-- ==================== STEP 3: Create triggers ====================

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS trg_update_allocation_after_goal_insert ON t_jtbd_configurations;
DROP TRIGGER IF EXISTS trg_update_allocation_after_goal_update ON t_jtbd_configurations;
DROP TRIGGER IF EXISTS trg_update_allocation_after_goal_delete ON t_jtbd_configurations;

-- Insert trigger
CREATE TRIGGER trg_update_allocation_after_goal_insert
AFTER INSERT ON t_jtbd_configurations
FOR EACH ROW
WHEN (NEW.jtbd_type = 'goal_tracking')
EXECUTE FUNCTION update_scheme_allocation();

-- Update trigger
CREATE TRIGGER trg_update_allocation_after_goal_update
AFTER UPDATE ON t_jtbd_configurations
FOR EACH ROW
WHEN (NEW.jtbd_type = 'goal_tracking')
EXECUTE FUNCTION update_scheme_allocation();

-- Delete trigger
CREATE TRIGGER trg_update_allocation_after_goal_delete
AFTER DELETE ON t_jtbd_configurations
FOR EACH ROW
WHEN (OLD.jtbd_type = 'goal_tracking')
EXECUTE FUNCTION update_scheme_allocation();

-- ==================== STEP 4: Update materialized view ====================
-- Add allocation column to t_customer_portfolio_totals materialized view

DROP MATERIALIZED VIEW IF EXISTS t_customer_portfolio_totals CASCADE;

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
    p.allocation, -- NEW: Goal allocation percentage
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
    p.start_date, p.is_active, p.allocation; -- Added allocation to GROUP BY

-- Create index on allocation for filtering
CREATE INDEX IF NOT EXISTS idx_portfolio_totals_allocation
ON t_customer_portfolio_totals(allocation);

-- ==================== STEP 5: Verification queries ====================
-- Run these to verify the migration worked correctly

-- Check column was added
-- SELECT column_name, data_type, column_default, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 't_customer_master_portfolio' AND column_name = 'allocation';

-- Check triggers were created
-- SELECT trigger_name, event_manipulation, event_object_table, action_statement
-- FROM information_schema.triggers
-- WHERE trigger_name LIKE 'trg_update_allocation%';

-- View current allocations (should all be 0 initially)
-- SELECT scheme_code, scheme_name, allocation
-- FROM t_customer_master_portfolio
-- WHERE customer_id = <YOUR_TEST_CUSTOMER_ID>
-- ORDER BY allocation DESC;

-- Check materialized view includes allocation
-- SELECT scheme_code, scheme_name, allocation
-- FROM t_customer_portfolio_totals
-- LIMIT 5;
