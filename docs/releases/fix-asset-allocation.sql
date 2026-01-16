-- ============================================================================
-- FIX: Asset Allocation not showing after transaction import
-- Run this if schemes don't appear in Asset Allocation tab
-- ============================================================================

-- STEP 1: Ensure 'Growth' asset type exists
INSERT INTO m_asset_types (asset_type_code, asset_type_name, category, default_assumption_rate, display_order, is_active, description)
VALUES ('Growth', 'Growth', 'equity', 12.00, 5, true, 'Legacy/Default: Growth-oriented funds')
ON CONFLICT (asset_type_code) DO UPDATE SET is_active = true;

-- STEP 2: Set asset_type_id for all schemes that don't have it
UPDATE t_scheme_details
SET asset_type_id = (SELECT id FROM m_asset_types WHERE asset_type_code = 'Growth' AND is_active = true LIMIT 1)
WHERE asset_type_id IS NULL;

-- Show count of updated schemes
DO $$
DECLARE
    v_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_count FROM t_scheme_details WHERE asset_type_id IS NOT NULL;
    RAISE NOTICE 'Schemes with asset_type_id set: %', v_count;

    SELECT COUNT(*) INTO v_count FROM t_scheme_details WHERE asset_type_id IS NULL;
    IF v_count > 0 THEN
        RAISE WARNING 'Schemes still without asset_type_id: %', v_count;
    END IF;
END $$;

-- STEP 3: Create investment plans for transactions that don't have them
-- This creates entries in t_customer_asset_assignments for each unique
-- customer + scheme combination from transactions

INSERT INTO t_customer_asset_assignments (
    tenant_id,
    is_live,
    customer_id,
    asset_type_id,
    scheme_code,
    principal_amount,
    investment_type,
    recurring_amount,
    investment_frequency,
    has_started,
    custom_assumption_rate,
    is_active,
    notes,
    created_at,
    updated_at
)
SELECT DISTINCT ON (t.tenant_id, t.is_live, t.customer_id, t.scheme_code)
    t.tenant_id,
    t.is_live,
    t.customer_id,
    COALESCE(sd.asset_type_id, (SELECT id FROM m_asset_types WHERE asset_type_code = 'Growth' LIMIT 1)),
    t.scheme_code,
    t.total_amount,
    'sip',
    t.total_amount,
    'monthly',
    true,
    12.00,
    true,
    'Backfilled from existing transactions',
    NOW(),
    NOW()
FROM t_transaction_table t
LEFT JOIN t_scheme_details sd ON t.scheme_id = sd.id
WHERE t.customer_id IS NOT NULL
  AND t.scheme_code IS NOT NULL
  AND NOT EXISTS (
      SELECT 1 FROM t_customer_asset_assignments caa
      WHERE caa.tenant_id = t.tenant_id
        AND caa.is_live = t.is_live
        AND caa.customer_id = t.customer_id
        AND caa.scheme_code = t.scheme_code
        AND caa.is_active = true
  )
ORDER BY t.tenant_id, t.is_live, t.customer_id, t.scheme_code, t.created_at DESC;

-- Show result
DO $$
DECLARE
    v_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_count FROM t_customer_asset_assignments WHERE is_active = true;
    RAISE NOTICE 'Total active investment plans: %', v_count;
END $$;

-- STEP 4: Verify - show investment plans per tenant
SELECT
    tenant_id,
    COUNT(*) as investment_plans,
    COUNT(DISTINCT customer_id) as customers
FROM t_customer_asset_assignments
WHERE is_active = true
GROUP BY tenant_id
ORDER BY tenant_id;
