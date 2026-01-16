-- Seed Scheme Categories for a Specific Tenant
-- Run this script when setting up a new tenant to enable scheme category lookups
-- Replace {{TENANT_ID}} with the actual tenant_id (e.g., 20)
-- Replace {{IS_LIVE}} with true for production, false for test data

-- Step 1: Insert scheme categories for the new tenant
-- These must exist for scheme_category_id lookup during scheme data import

INSERT INTO t_scheme_masters (tenant_id, is_live, is_active, master_type, code, name, display_order)
SELECT
    {{TENANT_ID}} as tenant_id,
    {{IS_LIVE}} as is_live,
    is_active,
    master_type,
    code,
    name,
    display_order
FROM t_scheme_masters
WHERE tenant_id = 1
  AND is_live = true
  AND master_type = 'scheme_category'
ON CONFLICT (code) DO NOTHING;

-- Step 2: Verify the scheme categories were seeded
SELECT
    COUNT(*) as category_count,
    tenant_id,
    is_live
FROM t_scheme_masters
WHERE tenant_id = {{TENANT_ID}}
  AND master_type = 'scheme_category'
GROUP BY tenant_id, is_live;

-- Expected output: 42 scheme categories for the tenant

-- Note: After running this script:
-- 1. Upload scheme master data (from CSV with Scheme Category column)
-- 2. Upload customer transaction data
-- 3. Asset allocation will automatically work based on scheme categories
