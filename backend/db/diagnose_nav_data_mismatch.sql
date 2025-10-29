-- Diagnose NAV Data Availability Issue
-- Check if scheme_codes match between bookmarks and NAV data

-- Step 1: Check bookmarks for tenant 9
SELECT
    'Bookmarks for Tenant 9:' as info,
    COUNT(*) as total_bookmarks,
    COUNT(DISTINCT scheme_code) as unique_scheme_codes
FROM t_scheme_bookmarks
WHERE tenant_id = 9
  AND is_live = true
  AND is_active = true;

-- Step 2: Check sample scheme codes from bookmarks
SELECT
    'Sample Scheme Codes from Bookmarks:' as info,
    scheme_code,
    scheme_name
FROM t_scheme_bookmarks
WHERE tenant_id = 9
  AND is_live = true
  AND is_active = true
LIMIT 10;

-- Step 3: Check NAV data existence
SELECT
    'NAV Data in Database:' as info,
    is_live,
    COUNT(*) as total_records,
    COUNT(DISTINCT scheme_code) as unique_schemes,
    MIN(nav_date) as oldest_date,
    MAX(nav_date) as latest_date
FROM t_nav_data
GROUP BY is_live;

-- Step 4: Check sample scheme codes from NAV data
SELECT
    'Sample Scheme Codes from NAV Data:' as info,
    scheme_code,
    COUNT(*) as record_count,
    MIN(nav_date) as oldest,
    MAX(nav_date) as latest
FROM t_nav_data
WHERE is_live = true
GROUP BY scheme_code
LIMIT 10;

-- Step 5: CRITICAL CHECK - Do bookmark schemes exist in NAV data?
SELECT
    'Bookmark vs NAV Data Match Check:' as info,
    sb.scheme_code as bookmark_scheme,
    sb.scheme_name,
    CASE
        WHEN nd.scheme_code IS NOT NULL THEN '✅ HAS DATA'
        ELSE '❌ NO DATA'
    END as data_status,
    COUNT(nd.id) as nav_record_count
FROM t_scheme_bookmarks sb
LEFT JOIN t_nav_data nd ON nd.scheme_code = sb.scheme_code AND nd.is_live = sb.is_live
WHERE sb.tenant_id = 9
  AND sb.is_live = true
  AND sb.is_active = true
GROUP BY sb.scheme_code, sb.scheme_name, nd.scheme_code
ORDER BY nav_record_count DESC
LIMIT 20;

-- Step 6: Count of matches
SELECT
    'Summary:' as info,
    COUNT(DISTINCT sb.scheme_code) as total_bookmarked,
    COUNT(DISTINCT CASE WHEN nd.scheme_code IS NOT NULL THEN sb.scheme_code END) as schemes_with_data,
    COUNT(DISTINCT CASE WHEN nd.scheme_code IS NULL THEN sb.scheme_code END) as schemes_without_data
FROM t_scheme_bookmarks sb
LEFT JOIN t_nav_data nd ON nd.scheme_code = sb.scheme_code AND nd.is_live = sb.is_live
WHERE sb.tenant_id = 9
  AND sb.is_live = true
  AND sb.is_active = true;

-- Step 7: Check if scheme_code format is the issue (spaces, case sensitivity, etc)
SELECT
    'Checking for format mismatches:' as info,
    sb.scheme_code as bookmark_code,
    LENGTH(sb.scheme_code) as bookmark_length,
    nd.scheme_code as nav_code,
    LENGTH(nd.scheme_code) as nav_length,
    sb.scheme_code = nd.scheme_code as exact_match,
    UPPER(TRIM(sb.scheme_code)) = UPPER(TRIM(nd.scheme_code)) as trimmed_match
FROM t_scheme_bookmarks sb
CROSS JOIN LATERAL (
    SELECT scheme_code
    FROM t_nav_data
    WHERE is_live = true
    LIMIT 1
) nd
WHERE sb.tenant_id = 9
  AND sb.is_live = true
  AND sb.is_active = true
LIMIT 5;
