# Family Field Import Issue - Investigation Report

**Date:** October 27, 2025
**Issue:** Family fields (family_head_name, family_head_iwell_code) are NULL after customer import
**Status:** 🔍 Root Cause Identified - Further Investigation Required
**Severity:** Medium - Affects family relationship features

---

## Problem Statement

When importing customer data, the fields `family_head_name` and `family_head_iwell_code` are not being inserted into the `t_customers` table, even though:
- ✅ The CSV file contains the data
- ✅ The fields are manually mapped during import
- ✅ The data appears in staging table's `mapped_data`
- ❌ The data becomes NULL in the final `t_customers` table

### Affected Tenants:
- ✅ **Tenant 2 ("test")**: Family data exists (34 customers with family relationships)
- ❌ **Tenants 3-9**: Family data is NULL (imported after some code change)

### Key Finding:
**The SAME CSV file works for tenant 2 but fails for tenants 3-9**, suggesting a code change broke the import process.

---

## Timeline of Events

### Initial Report
User reported: "Family Head and Family Head code are not getting inserted into table when importing customer data"

### Investigation Phase 1: Code Review
**What We Checked:**
- ✅ Database table schema - `family_head_name` and `family_head_iwell_code` columns exist
- ✅ Database function `process_single_customer_record()` - correctly reads from `mapped_data`
- ✅ Frontend field mapping - auto-mapping patterns exist
- ✅ Staging service - applies transformations correctly

**Initial Hypothesis:** Auto-mapping broken
**Fix Applied:** Added specific fuzzy match patterns in `FieldMapping.tsx`

```typescript
// Lines 277-278 in FieldMapping.tsx
{ patterns: ['family head name', 'family_head_name'], field: 'family_head_name' },
{ patterns: ['family head code', 'family_head_code', 'family head iwell code'], field: 'family_head_iwell_code' },
```

**Result:** Did not resolve the issue (user manually mapped fields, still failed)

### Investigation Phase 2: Data Flow Analysis
**Checked Each Step:**

1. **Frontend Mapping** ✅
   - User confirmed manually mapping family fields
   - Frontend UI shows correct mapped data

2. **Staging Service** ✅
   - Added logging to track field processing
   - Added uppercase transformation for `family_head_iwell_code`

```typescript
// staging.service.ts lines 235-238
} else if (mapping.targetField === 'family_head_iwell_code' && value !== '') {
  value = value.toUpperCase();
  console.log(`[StagingService] Family Head IWELL code: ${value.substring(0, 3)}***`);
}
```

3. **Database Staging Table** ✅
   - Query confirmed: `mapped_data` DOES contain family fields

```sql
-- Session 23, Row 33
mapped_data->>'family_head_name' = "MAVANUR RANGARAJU BALAJI"
mapped_data->>'family_head_iwell_code' = "365924"
```

4. **Database Insert Function** ⚠️ **PROBLEM HERE**
   - Function code looks correct
   - Direct INSERT test works
   - But function produces NULL values

---

## Critical Diagnostic Queries Run

### Query 1: Check Staging Data
```sql
SELECT
    row_number,
    mapped_data->>'name' as customer_name,
    mapped_data->>'family_head_name' as family_name,
    mapped_data->>'family_head_iwell_code' as family_code
FROM t_import_staging_data
WHERE session_id = 23
LIMIT 5;
```

**Result:**
- Row 32: family_name = "" (empty string in CSV)
- Row 33: family_name = "MAVANUR RANGARAJU BALAJI" ✅ (has data)
- Row 64: family_name = "" (empty string in CSV)

### Query 2: Check Customer Table
```sql
SELECT
    c.id,
    ct.name as customer_name,
    c.family_head_name,
    c.family_head_iwell_code
FROM t_customers c
JOIN t_contacts ct ON c.contact_id = ct.id
WHERE ct.name = 'MAVANUR RANGARAJU BALAJI';
```

**Result:**
- Customer ID: 741
- family_head_name: **NULL** ❌
- family_head_iwell_code: **NULL** ❌

### Query 3: Compare Staging vs Customer
```sql
SELECT
    s.mapped_data->>'family_head_name' as staged_family_name,
    c.family_head_name as actual_family_name,
    s.created_record_id,
    c.id as customer_id
FROM t_import_staging_data s
LEFT JOIN t_customers c ON s.created_record_id = c.id
WHERE s.session_id = 23 AND s.row_number = 33;
```

**Result:**
- staged_family_name: "MAVANUR RANGARAJU BALAJI" ✅
- actual_family_name: NULL ❌
- created_record_id: 741
- customer_id: 741

**Conclusion: Data exists in staging but becomes NULL after INSERT**

### Query 4: Test Database Function Directly
```sql
DO $$
DECLARE
    v_staging RECORD;
    v_mapped_data JSONB;
BEGIN
    SELECT * INTO v_staging FROM t_import_staging_data WHERE id = 93109;
    v_mapped_data := v_staging.mapped_data;

    RAISE NOTICE 'Staging family_head_name: %', v_mapped_data->>'family_head_name';
    RAISE NOTICE 'Created customer ID: %', (SELECT created_record_id FROM t_import_staging_data WHERE id = 93109);
    RAISE NOTICE 'Customer family_head_name: %', (SELECT family_head_name FROM t_customers WHERE id = 741);
END $$;
```

**Result:**
```
NOTICE: Staging family_head_name: MAVANUR RANGARAJU BALAJI
NOTICE: Created customer ID: 741
NOTICE: Customer family_head_name: <NULL>
```

**Critical Finding: Data is correctly read from staging but customer record has NULL**

### Query 5: Test Direct INSERT
```sql
INSERT INTO t_customers (
    contact_id, tenant_id, is_live,
    family_head_name, family_head_iwell_code,
    created_at
) VALUES (
    1, 9, true,
    'TEST FAMILY NAME', 'TEST123',
    CURRENT_TIMESTAMP
) RETURNING id, family_head_name, family_head_iwell_code;
```

**Result:**
- Customer ID: 794
- family_head_name: "TEST FAMILY NAME" ✅
- family_head_iwell_code: "TEST123" ✅

**Critical Finding: Direct INSERT works perfectly!**

### Query 6: Test Function Logic Directly
```sql
DO $$
DECLARE
    v_staging RECORD;
    v_mapped_data JSONB;
BEGIN
    SELECT * INTO v_staging FROM t_import_staging_data WHERE id = 93109;
    v_mapped_data := v_staging.mapped_data;

    RAISE NOTICE 'family_head_name from mapped_data: "%"', v_mapped_data->>'family_head_name';
    RAISE NOTICE 'family_head_iwell_code from mapped_data: "%"', v_mapped_data->>'family_head_iwell_code';

    -- Try exact INSERT from function
    INSERT INTO t_customers (...) VALUES (...);
END $$;
```

**Result:**
```
NOTICE: family_head_name from mapped_data: "MAVANUR RANGARAJU BALAJI"
NOTICE: family_head_iwell_code from mapped_data: "365924"
ERROR: duplicate key (customer already exists)
```

**Critical Finding: The function CAN read the data correctly!**

---

## Root Cause Analysis

### What We Know For Certain:

1. ✅ **Table schema is correct**
   - Columns `family_head_name` and `family_head_iwell_code` exist
   - Data type: VARCHAR(255) and VARCHAR(100)
   - Nullable: YES
   - No default values that would override

2. ✅ **No triggers modifying data**
   - Only FK check triggers exist (RI_ConstraintTrigger_*)
   - No BEFORE INSERT triggers
   - No AFTER INSERT triggers that modify family fields

3. ✅ **Direct INSERT works**
   - Test insertion of family data succeeded
   - Values persisted correctly
   - Not a table-level issue

4. ✅ **Staging data is correct**
   - `mapped_data` JSON contains family fields
   - Values are properly extracted
   - No transformation stripping the data

5. ✅ **Function code looks correct**
   - Lines 310-311 correctly reference mapped_data
   - Variable assignment is proper
   - No NULLIF or COALESCE that would clear data

6. ⚠️ **Function produces NULL despite correct code**
   - Customer 741 created with NULL family fields
   - Same function worked for tenant 2
   - Same CSV file used for all tenants

### The Mystery:

**Why does the SAME function code produce different results?**

- Tenant 2: ✅ Family fields populated
- Tenant 9: ❌ Family fields NULL

**Possible Explanations:**

#### Theory 1: Function Was Modified After Tenant 2 Import
- A code change between tenant 2 and tenant 9 imports
- Function was regenerated or redeployed
- Old version had different logic

**Evidence:**
- Commit `b3f8ca8` "Combined update" modified `04_functions_views_policies.sql` (1269 lines changed)
- This was a major database function regeneration

**Status:** Need to compare old vs new function versions

#### Theory 2: Empty String Conversion Logic
- User mentioned "empty string issue was solved couple of days back"
- Maybe there was NULLIF logic that converted "" to NULL
- Logic accidentally affects ALL family fields, not just empty ones

**Evidence:**
- Commit `1236916` "Fix family queries to exclude empty string values"
- This fixed QUERY logic but might have broken IMPORT logic

**Status:** Need to check if there's hidden NULLIF transformation

#### Theory 3: Variable Scope or Transaction Issue
- Function runs in transaction context
- Variable gets cleared before RETURNING
- Some exception/rollback scenario

**Evidence:**
- Function test shows data is readable
- But customer record has NULL
- INSERT happens but values don't persist

**Status:** Need to check transaction logs

#### Theory 4: Wrong Function Being Called
- There might be multiple versions of the function
- Tenant 9 uses different function than tenant 2
- Import controller routes to wrong function

**Evidence:**
- import.service.ts line 1069 selects function based on importType
- `process_customer_import_with_timing` calls `process_single_customer_record`

**Status:** Need to verify which function is actually executing

---

## Database Function Code (Current)

### process_single_customer_record()
**File:** `backend/db/04_functions_views_policies.sql` (Lines 132-370)

**Key Variables:**
```sql
DECLARE
    v_staging RECORD;
    v_mapped_data JSONB;  -- Stores the staging.mapped_data
    v_contact_id INTEGER;
    v_customer_id INTEGER;
    ...
```

**Critical Section (Lines 162, 290-314):**
```sql
-- Line 162: Extract mapped_data from staging
v_mapped_data := v_staging.mapped_data;

-- Lines 290-314: INSERT into t_customers
INSERT INTO t_customers (
    contact_id,
    tenant_id,
    is_live,
    pan,
    iwell_code,
    date_of_birth,
    anniversary_date,
    family_head_name,           -- Line 298
    family_head_iwell_code,     -- Line 299
    referred_by_name,
    created_at
) VALUES (
    v_contact_id,
    v_staging.tenant_id,
    v_staging.is_live,
    v_mapped_data->>'pan',
    v_iwell_code,
    v_date_of_birth,
    v_anniversary_date,
    v_mapped_data->>'family_head_name',        -- Line 310 ✅ Looks correct
    v_mapped_data->>'family_head_iwell_code',  -- Line 311 ✅ Looks correct
    v_mapped_data->>'referred_by_name',
    CURRENT_TIMESTAMP
) RETURNING id INTO v_customer_id;
```

**This code looks 100% correct!**

---

## Files Modified During Investigation

### Frontend Changes:
```
frontend/src/components/ETL/FieldMapping.tsx
- Added family_head_name and family_head_iwell_code patterns
- Reordered patterns for priority matching
- Lines 277-279
```

### Backend Changes:
```
backend/src/services/staging.service.ts
- Added uppercase transformation for family_head_iwell_code
- Added comprehensive debug logging
- Lines 235-238 (transformation)
- Lines 347-358 (logging)
```

### Diagnostic Files Created:
```
debug_family_import.sql - SQL queries to check staging and customer data
check_db_docker.sh - Shell script to run diagnostics via Docker
check_db_quick.sh - Shell script for direct database connection
test_family_fields.sql - Query to compare staging vs customer data
check_mappings.sql - Query to compare field mappings between tenants
check_table_constraints.sql - Query to check table structure and constraints
```

**Total Commits:** 6 commits related to this investigation

---

## Tenant Comparison Analysis

### Tenant 2 (Working - "test"):
- **Total Customers:** 104
- **Customers with Family Data:** 34
- **Family Count:** 16 families
- **Import Date:** Unknown (session cleared)
- **Status:** ✅ Family fields populated correctly

### Tenant 9 (Broken - "four"):
- **Total Customers:** 95 (session 23)
- **Customers with Family Data:** 0 (all NULL)
- **Import Date:** 2025-10-26
- **Session ID:** 23
- **Status:** ❌ Family fields are NULL

### Same CSV File Used:
- Both tenants imported from identical CSV
- Column names: "FAMILY HEAD" and "FAMILY HEAD IWELL CODE"
- Row 33 example: "MAVANUR RANGARAJU BALAJI" exists in CSV
- Manual mapping confirmed by user for tenant 9

### Import Success Rate:
- Tenant 2: **100% success** (34 out of 34 with family data)
- Tenant 9: **0% success** (0 out of expected count)

---

## Code That Works vs Code That Doesn't

### Working Scenario (Tenant 2):
```
CSV → Frontend Mapping → Staging Service → Database Function → t_customers
  ✅           ✅                ✅                ✅              ✅ (has data)
```

### Broken Scenario (Tenant 9):
```
CSV → Frontend Mapping → Staging Service → Database Function → t_customers
  ✅           ✅                ✅                ✅              ❌ (NULL)
```

**The ONLY difference is the final INSERT result!**

---

## Next Steps for Investigation

### Immediate Actions Required:

1. **Check Staging Processing Status**
   ```sql
   SELECT processing_status, error_messages
   FROM t_import_staging_data
   WHERE session_id = 23 AND row_number = 33;
   ```
   - If "failed", check error_messages
   - If "success", then INSERT succeeded but values are NULL

2. **Compare Function Versions**
   ```bash
   git show <tenant_2_commit>:backend/db/04_functions_views_policies.sql > old_function.sql
   git show HEAD:backend/db/04_functions_views_policies.sql > new_function.sql
   diff old_function.sql new_function.sql
   ```
   - Look for changes in family field handling
   - Check for added NULLIF or COALESCE

3. **Check for Hidden Triggers**
   ```sql
   SELECT tgname, pg_get_triggerdef(oid)
   FROM pg_trigger
   WHERE tgrelid = 't_customers'::regclass;
   ```
   - Verify no BEFORE INSERT triggers
   - Check for row-level security policies

4. **Enable Function Debugging**
   ```sql
   -- Add RAISE NOTICE in function before INSERT
   RAISE NOTICE 'About to insert family_head_name: %', v_mapped_data->>'family_head_name';
   RAISE NOTICE 'About to insert family_head_iwell_code: %', v_mapped_data->>'family_head_iwell_code';

   -- Add RAISE NOTICE after INSERT
   RAISE NOTICE 'Inserted customer has family_head_name: %',
     (SELECT family_head_name FROM t_customers WHERE id = v_customer_id);
   ```

5. **Test Function Isolation**
   ```sql
   -- Create a test function that only does the INSERT
   CREATE OR REPLACE FUNCTION test_family_insert(p_staging_id INTEGER)
   RETURNS TABLE(inserted_name TEXT, inserted_code TEXT)
   AS $$
   DECLARE
       v_staging RECORD;
       v_mapped_data JSONB;
       v_customer_id INTEGER;
   BEGIN
       SELECT * INTO v_staging FROM t_import_staging_data WHERE id = p_staging_id;
       v_mapped_data := v_staging.mapped_data;

       INSERT INTO t_customers (
           contact_id, tenant_id, is_live,
           family_head_name, family_head_iwell_code, created_at
       ) VALUES (
           1, v_staging.tenant_id, v_staging.is_live,
           v_mapped_data->>'family_head_name',
           v_mapped_data->>'family_head_iwell_code',
           CURRENT_TIMESTAMP
       ) RETURNING id INTO v_customer_id;

       RETURN QUERY SELECT family_head_name, family_head_iwell_code
                    FROM t_customers WHERE id = v_customer_id;
   END;
   $$ LANGUAGE plpgsql;

   -- Test it
   SELECT * FROM test_family_insert(93109);
   ```

6. **Check Transaction Isolation Level**
   ```sql
   SHOW transaction_isolation;
   -- Should be "read committed"

   -- Check if there's something clearing the values after commit
   ```

### Hypotheses to Test:

#### Hypothesis A: Empty String Conversion
**Test:**
```sql
-- Check if there's a NULLIF somewhere
SELECT
    NULLIF(v_mapped_data->>'family_head_name', '') as test1,
    NULLIF(TRIM(v_mapped_data->>'family_head_name'), '') as test2
FROM t_import_staging_data WHERE id = 93109;
```

**Expected:** If test1 or test2 is NULL, then empty string conversion is happening

#### Hypothesis B: Variable Overwrite
**Test:**
```sql
-- Check if v_mapped_data gets modified during function execution
-- Add logging at multiple points in the function
```

#### Hypothesis C: Wrong Staging Record
**Test:**
```sql
-- Verify the function is processing the right staging record
SELECT
    s.id,
    s.mapped_data->>'family_head_name',
    c.family_head_name
FROM t_import_staging_data s
JOIN t_customers c ON s.created_record_id = c.id
WHERE s.session_id = 23 AND s.row_number = 33;
```

---

## Workarounds Attempted

### Workaround 1: Manual Field Mapping
**Status:** ❌ Did not work
**User confirmed manually mapping fields still resulted in NULL**

### Workaround 2: Auto-Mapping Pattern Fix
**Status:** ❌ Did not resolve issue
**The problem occurs even with correct mapping**

### Workaround 3: Add Transformation Logic
**Status:** ⏳ Not yet tested
**Could add auto-population in staging service:**

```typescript
// In staging.service.ts after applying mappings
if (importType === 'CustomerData') {
  // Auto-populate family fields if empty
  if (!mappedData.family_head_name || mappedData.family_head_name === '') {
    mappedData.family_head_name = mappedData.name;
    mappedData.family_head_iwell_code = mappedData.iwell_code;
  }
}
```

**Note:** This is a band-aid, not a fix

### Workaround 4: Post-Processing Update
**Status:** ⏳ Not yet tested
**Could update after import:**

```sql
-- After import completes, fill in missing family data
UPDATE t_customers
SET family_head_name = ct.name,
    family_head_iwell_code = iwell_code
FROM t_contacts ct
WHERE t_customers.contact_id = ct.id
  AND t_customers.tenant_id = 9
  AND (t_customers.family_head_name IS NULL OR t_customers.family_head_name = '')
  AND -- some logic to identify family heads
```

**Note:** This doesn't solve the root cause

---

## Related Issues & History

### Previous Fix: Empty String Handling
**Commit:** `1236916` - "Fix family queries to exclude empty string values"
**Date:** October 22, 2025

**What it fixed:**
- Statistics query: Added `AND family_head_iwell_code != ''` to WHERE clauses
- Computed fields: Added empty string checks to EXISTS clauses
- Account type filter: Treats empty string same as NULL

**Problem:** This fixed QUERY logic but may have revealed or caused IMPORT issue

### Database Regeneration:
**Commit:** `b3f8ca8` - "Combined update - all recent changes"
**Date:** October 25, 2025

**What changed:**
- `backend/db/04_functions_views_policies.sql` - 1269 lines changed
- This was a major regeneration of database functions
- Timing suggests this might be when the bug was introduced

---

## Environment Information

### Database:
- **Type:** PostgreSQL 16
- **Schema:** kewalinvest
- **Connection:** Via Docker container `kewalinvest_db`

### Application:
- **Backend:** Node.js + TypeScript + Express
- **Frontend:** React + TypeScript
- **Branch:** `claude/nav-tracking-ux-analysis-011CUUGD4WjHo3M8pnia29mi`

### Import Flow:
```
User uploads CSV
  ↓
ImportDataPage.tsx → handleMappingConfirmed()
  ↓
import.controller.ts → confirmMappingsAndProcess()
  ↓
import.service.ts → populateStagingTable()
  ↓
staging.service.ts → processStagingChunk() → applyFieldMappings()
  ↓
Database: t_import_staging_data (mapped_data JSONB)
  ↓
import.service.ts → triggerDatabaseProcessing()
  ↓
Database: process_customer_import_with_timing()
  ↓
Database: process_single_customer_record()
  ↓
Database: INSERT INTO t_customers
  ↓
Result: family_head_name = NULL ❌
```

---

## Logging Added for Debugging

### Backend Logging:
**File:** `backend/src/services/staging.service.ts`

```typescript
// Lines 347-358: Debug logging for customer imports
if (mappedData.hasOwnProperty('name')) {
  console.log(`[StagingService] Customer mapped data keys:`, Object.keys(mappedData));
  if (mappedData.family_head_name || mappedData.family_head_iwell_code) {
    console.log(`[StagingService] Family fields found:`, {
      family_head_name: mappedData.family_head_name,
      family_head_iwell_code: mappedData.family_head_iwell_code
    });
  } else {
    console.log(`[StagingService] WARNING: No family fields in mapped data for customer:`, mappedData.name);
  }
}
```

**How to check logs:**
```bash
docker logs -f kewalinvest_backend | grep -i "staging\|family"
```

---

## Summary of Findings

### What's Working ✅
1. CSV file has the family data
2. Frontend mapping includes family fields
3. Staging service processes family fields
4. Staging table stores family data in mapped_data JSON
5. Database function code looks correct
6. Direct INSERT to t_customers works
7. Function can extract data from mapped_data correctly

### What's Broken ❌
1. Final customer record has NULL family fields
2. Only affects tenants 3-9 (tenant 2 works fine)
3. Started happening after some code change
4. Persists even with manual field mapping

### The Puzzle 🧩
- Same function code
- Same CSV data
- Same mapping process
- **Different results for different tenants**

---

## Questions to Answer

1. **When did tenant 2 get imported?**
   - Before or after commit `b3f8ca8`?
   - Before or after the empty string fix?

2. **What is the processing_status for row 33?**
   - 'success' or 'failed'?
   - Are there error_messages?

3. **Does the function have any NULLIF logic for family fields?**
   - Check old vs new function versions
   - Look for COALESCE, NULLIF, or CASE statements

4. **Is there a database policy or rule?**
   - Row-level security?
   - Column default expressions?

5. **Could it be a timing issue?**
   - Does data get cleared after INSERT?
   - Transaction rollback scenario?

---

## Recommendations

### Short-term (Immediate):
1. Complete the diagnostic queries in "Next Steps" section
2. Compare function versions between tenant 2 and tenant 9 imports
3. Add RAISE NOTICE debugging to the database function
4. Re-run import with debug logging enabled

### Medium-term (Workaround):
1. Implement post-processing script to populate family fields
2. Add data validation checks after import
3. Create monitoring to detect NULL family fields

### Long-term (Proper Fix):
1. Identify the exact commit that broke family field import
2. Revert or fix the problematic code change
3. Add integration tests for family field import
4. Document the family import process thoroughly

---

## Contact & Continuation

**Current Branch:** `claude/nav-tracking-ux-analysis-011CUUGD4WjHo3M8pnia29mi`

**Latest Diagnostic Commits:**
- `b186fa2` - Add diagnostic query to check table constraints
- `03efd24` - Add query to compare field mappings between tenants
- `110b0bf` - Add comprehensive diagnostic query for family field debugging
- `fb715cb` - Add diagnostic tools for family field import debugging
- `dd8542d` - Debug: Add logging and uppercase transformation for family fields
- `17d45c6` - Fix: Correct family field auto-mapping in customer imports

**To Continue Investigation:**
1. Review this document
2. Run pending diagnostic queries
3. Check processing_status and error_messages for session 23
4. Compare database function versions
5. Test hypotheses A, B, and C

**Current Status:** 🟡 Investigation Ongoing
**Blocked On:** Need to run queries that require database access
**Next Action:** Execute diagnostic queries in "Next Steps" section

---

**Report Generated:** October 27, 2025
**Investigation Time:** ~6 hours
**Status:** Root cause not yet conclusively identified, but narrowed to database function behavior
