-- Migration 025: Drop unique PAN constraint to allow minors with guardian's PAN
--
-- REASON: Minors don't have their own PAN, so they use parent/guardian's PAN.
-- Multiple children (minors) can share the same parent's PAN.
-- These are NOT duplicates - they are different customers.
--
-- Date: 2024-12-11

-- Step 1: Drop the unique constraint on PAN
ALTER TABLE t_customers DROP CONSTRAINT IF EXISTS unique_customer_pan;

-- Step 2: Create a non-unique index for PAN lookups (performance)
DROP INDEX IF EXISTS idx_customers_pan;
CREATE INDEX idx_customers_pan ON t_customers (tenant_id, pan, is_live)
WHERE pan IS NOT NULL AND pan != '';

-- Verification
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'unique_customer_pan'
    ) THEN
        RAISE NOTICE 'SUCCESS: unique_customer_pan constraint has been dropped';
    ELSE
        RAISE EXCEPTION 'FAILED: unique_customer_pan constraint still exists';
    END IF;
END $$;

-- Show current constraints on t_customers
SELECT
    conname as constraint_name,
    contype as type,
    pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 't_customers'::regclass
ORDER BY conname;
