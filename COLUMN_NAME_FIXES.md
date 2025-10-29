# Column Name Fixes

## Issue
Migration and code were using incorrect column names that don't match the actual database schema.

## Errors Found and Fixed

### 1. t_import_staging_data Table

**Error:** Code used `status` column
**Reality:** Column is named `processing_status`

#### Files Fixed:

**backend/db/migrations/006_add_name_normalization_and_restart.sql**
- Line 174-187: Changed constraint from `status` to `processing_status`
- Line 190-199: Fixed index column names:
  - `import_session_id` → `session_id`
  - `status` → `processing_status`

**backend/src/services/stagingProcessor.service.ts**
- Line 36: Interface property `status` → `processing_status`
- Line 557: SELECT column `status` → `processing_status`
- Line 559: WHERE clause `import_session_id` → `session_id`
- Line 561: WHERE clause `status` → `processing_status`
- Line 589: UPDATE SET `status` → `processing_status`

**backend/src/services/staging.service.ts**
- Line 181: INSERT column list `status` → `processing_status`

**backend/src/services/import.service.ts**
- Line 1471: UPDATE SET `status` → `processing_status`

### 2. Constraint Names

**Error:** Migration referenced non-existent constraints
**Fix:** Used correct constraint name from actual schema

- Constraint: `t_import_staging_data_processing_status_check` (not `t_import_staging_data_status_check`)

### 3. Processing Status Values

**Existing statuses in schema:**
- 'pending'
- 'processing'
- 'success'
- 'failed'
- 'skipped'
- 'duplicate'
- 'orphan'

**New status added:**
- 'pending_process' (for records staged and waiting for Phase 2 processing)

## Impact

All SQL queries and constraints now correctly reference:
- ✅ `processing_status` column (not `status`)
- ✅ `session_id` column (not `import_session_id`)
- ✅ Correct constraint name: `t_import_staging_data_processing_status_check`
- ✅ All existing statuses preserved + new 'pending_process' status added

## Testing Required

1. Run migration to verify no SQL errors
2. Test Phase 1 staging (should set processing_status to 'pending_process')
3. Test Phase 2 processing (should read processing_status = 'pending_process')
4. Test edit and reprocess functionality
