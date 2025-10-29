-- ============================================================================
-- Comprehensive Scheme Alias Population (CORRECTED - Valid source values)
-- ============================================================================

BEGIN;

-- ============================================================================
-- LAYER 1: Master Data Aliases (ALL 16,050 schemes)
-- ============================================================================

-- 1A: Create aliases from scheme_name
INSERT INTO t_scheme_aliases (scheme_id, scheme_code, alias_name, source)
SELECT 
  sd.id,
  sd.scheme_code,
  sd.scheme_name,
  'auto'  -- FIXED: Use valid source value
FROM t_scheme_details sd
WHERE sd.is_active = true
  AND sd.scheme_name IS NOT NULL
  AND TRIM(sd.scheme_name) != ''
ON CONFLICT ON CONSTRAINT unique_scheme_alias DO NOTHING;

-- 1B: Create aliases from scheme_nav_name (if different from scheme_name)
INSERT INTO t_scheme_aliases (scheme_id, scheme_code, alias_name, source)
SELECT 
  sd.id,
  sd.scheme_code,
  sd.scheme_nav_name,
  'auto'  -- FIXED: Use valid source value
FROM t_scheme_details sd
WHERE sd.is_active = true
  AND sd.scheme_nav_name IS NOT NULL
  AND TRIM(sd.scheme_nav_name) != ''
  -- Only insert if different from scheme_name
  AND REGEXP_REPLACE(TRIM(UPPER(sd.scheme_nav_name)), '\s+', ' ', 'g') 
      != REGEXP_REPLACE(TRIM(UPPER(sd.scheme_name)), '\s+', ' ', 'g')
ON CONFLICT ON CONSTRAINT unique_scheme_alias DO NOTHING;

-- Log Layer 1 results
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count FROM t_scheme_aliases 
  WHERE source = 'auto';
  RAISE NOTICE 'Layer 1 Complete: % aliases from master data', v_count;
END $$;

-- ============================================================================
-- LAYER 2: Bookmark Aliases (189 tracked schemes)
-- ============================================================================

-- 2A: Create aliases from bookmark scheme_name (if different from master)
INSERT INTO t_scheme_aliases (scheme_id, scheme_code, alias_name, source)
SELECT DISTINCT
  b.scheme_id,
  b.scheme_code,
  b.scheme_name,
  'auto'  -- FIXED: Use valid source value (or 'manual' if you prefer)
FROM t_scheme_bookmarks b
WHERE b.is_active = true
  AND b.scheme_id IS NOT NULL
  AND b.scheme_name IS NOT NULL
  AND TRIM(b.scheme_name) != ''
  -- Only insert if different from existing aliases for this scheme
  AND NOT EXISTS (
    SELECT 1 FROM t_scheme_aliases sa
    WHERE sa.scheme_id = b.scheme_id
      AND sa.alias_name_normalized = REGEXP_REPLACE(TRIM(UPPER(b.scheme_name)), '\s+', ' ', 'g')
  )
ON CONFLICT ON CONSTRAINT unique_scheme_alias DO NOTHING;

-- Log Layer 2 results
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count FROM t_scheme_aliases;
  RAISE NOTICE 'Layer 2 Complete: % total aliases created', v_count;
END $$;

-- ============================================================================
-- VERIFICATION & STATISTICS
-- ============================================================================

-- Show total coverage
SELECT 
  COUNT(*) as total_aliases,
  COUNT(DISTINCT scheme_id) as unique_schemes_with_aliases,
  (SELECT COUNT(*) FROM t_scheme_details WHERE is_active = true) as total_schemes_in_master
FROM t_scheme_aliases;

-- Show schemes with multiple aliases
SELECT 
  sd.scheme_code,
  sd.scheme_name as master_name,
  COUNT(*) as alias_count,
  STRING_AGG(sa.alias_name, ' | ') as all_aliases
FROM t_scheme_details sd
JOIN t_scheme_aliases sa ON sa.scheme_id = sd.id
GROUP BY sd.id, sd.scheme_code, sd.scheme_name
HAVING COUNT(*) > 1
ORDER BY alias_count DESC
LIMIT 20;

COMMIT;