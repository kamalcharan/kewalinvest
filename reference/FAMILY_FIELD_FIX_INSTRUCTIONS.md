# Family Field Import Fix - Instructions

## Issue Summary
Customer family fields (`family_head_name`, `family_head_iwell_code`) are being set to NULL during import, even though the data exists in the CSV file and staging table.

## Root Cause Analysis
After thorough investigation, the issue appears to be that the database function `process_single_customer_record()` may not be properly deployed or may have been modified manually in the database. All application code (frontend, backend, staging service) is correct and processing the fields properly.

## Files Modified

### 1. Database Function
**File:** `backend/db/04_functions_views_policies.sql`
- Added debug logging to track family field values before and after INSERT
- Function code remains correct (lines 310-311 properly extract from mapped_data)

### 2. Deployment Script
**File:** `backend/db/fix_family_import.sql`
- Complete function definition with debug logging
- Test queries to verify the fix

## Deployment Steps

### Step 1: Apply the Database Fix

```bash
# Option A: Using the deployment script
psql -U postgres -d kewalinvest -f backend/db/fix_family_import.sql

# Option B: Using Docker
docker exec -i kewalinvest_db psql -U postgres -d kewalinvest < backend/db/fix_family_import.sql
```

### Step 2: Verify Function Deployment

```sql
-- Check function exists and has the correct signature
SELECT
    p.proname AS function_name,
    pg_get_functiondef(p.oid) AS function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname = 'process_single_customer_record';

-- Check for debug logging (should see RAISE NOTICE statements)
SELECT pg_get_functiondef(oid)
FROM pg_proc
WHERE proname = 'process_single_customer_record'
  AND pg_get_functiondef(oid) LIKE '%DEBUG%';
```

### Step 3: Test with New Import

1. Navigate to the import page in the application
2. Upload a CSV file with family fields:
   - Column: "FAMILY HEAD NAME" or "Family Head Name"
   - Column: "FAMILY HEAD IWELL CODE" or "Family Head Code"
3. Map the fields (should auto-map if column names match patterns)
4. Confirm and process the import

### Step 4: Monitor Debug Logs

```bash
# Watch PostgreSQL logs for debug messages
docker logs -f kewalinvest_db 2>&1 | grep -i debug

# You should see messages like:
# NOTICE:  [DEBUG] About to INSERT customer - name: John Doe, family_head_name: Jane Doe, family_head_iwell_code: 123456
# NOTICE:  [DEBUG] Customer 795 created
```

### Step 5: Verify Data

```sql
-- Check the most recent import
SELECT
    s.id as staging_id,
    s.row_number,
    s.mapped_data->>'name' as customer_name,
    s.mapped_data->>'family_head_name' as staged_family_name,
    s.mapped_data->>'family_head_iwell_code' as staged_family_code,
    c.id as customer_id,
    c.family_head_name as actual_family_name,
    c.family_head_iwell_code as actual_family_code,
    CASE
        WHEN c.family_head_name IS NULL THEN '❌ NULL'
        WHEN c.family_head_name = '' THEN '⚠️ Empty'
        ELSE '✅ Has Data'
    END as status
FROM t_import_staging_data s
LEFT JOIN t_customers c ON s.created_record_id = c.id
WHERE s.import_type = 'CustomerData'
  AND s.session_id = (SELECT MAX(session_id) FROM t_import_staging_data WHERE import_type = 'CustomerData')
  AND (s.mapped_data->>'family_head_name' IS NOT NULL
    OR s.mapped_data->>'family_head_iwell_code' IS NOT NULL)
ORDER BY s.row_number
LIMIT 20;
```

## Expected Results

### Before Fix
```
staging_id | staged_family_name       | actual_family_name | status
-----------|--------------------------|--------------------|---------
93109      | MAVANUR RANGARAJU BALAJI | NULL               | ❌ NULL
```

### After Fix
```
staging_id | staged_family_name       | actual_family_name       | status
-----------|--------------------------|--------------------------|------------
93109      | MAVANUR RANGARAJU BALAJI | MAVANUR RANGARAJU BALAJI | ✅ Has Data
```

## Troubleshooting

### Issue: Still seeing NULL values after deployment

1. **Verify function was actually updated:**
   ```sql
   SELECT pg_get_functiondef(oid) FROM pg_proc
   WHERE proname = 'process_single_customer_record'
   LIMIT 1;
   ```
   Look for the debug RAISE NOTICE statements in the output.

2. **Check PostgreSQL logs for debug messages:**
   If you don't see debug messages during import, the old function is still being used.

3. **Restart backend service:**
   ```bash
   docker restart kewalinvest_backend
   ```

4. **Check if there are multiple versions of the function:**
   ```sql
   SELECT proname, pronargs, pg_get_functiondef(oid)
   FROM pg_proc
   WHERE proname LIKE '%customer%record%';
   ```

### Issue: Debug logs show NULL values being extracted

This means the data is NOT in the staging table's `mapped_data` JSON. Check:

1. **Field mappings were saved:**
   ```sql
   SELECT mapping_config
   FROM t_import_sessions
   WHERE id = (SELECT MAX(id) FROM t_import_sessions);
   ```

2. **Staging service logs:**
   ```bash
   docker logs kewalinvest_backend 2>&1 | grep -i "family"
   ```
   Should see:
   - `[StagingService] Family Head IWELL code: XXX***`
   - `[StagingService] Family fields found: {...}`

3. **Verify CSV column names match mapping patterns:**
   Accepted patterns (case-insensitive):
   - "family head name", "family_head_name"
   - "family head code", "family_head_code", "family head iwell code", "family_head_iwell_code"

## Post-Deployment Cleanup

Once verified the fix works, you can optionally remove the debug logging:

1. Edit `backend/db/04_functions_views_policies.sql`
2. Remove the two RAISE NOTICE statements (lines 289-292 and 321-322)
3. Redeploy the function

## Related Files
- Investigation report: `FAMILY_FIELD_IMPORT_ISSUE_REPORT.md`
- Database function: `backend/db/04_functions_views_policies.sql`
- Deployment script: `backend/db/fix_family_import.sql`
- Frontend mapping: `frontend/src/components/ETL/FieldMapping.tsx`
- Staging service: `backend/src/services/staging.service.ts`

## Success Criteria
- ✅ New customer imports have family fields populated (not NULL)
- ✅ Empty family fields in CSV are stored as empty strings, not NULL
- ✅ Non-empty family fields retain their values
- ✅ Debug logs show correct values being extracted from staging
- ✅ Statistics page shows correct family counts

## Contact
If issues persist after following these steps, check the debug logs and staging service logs to identify where the data is being lost.
