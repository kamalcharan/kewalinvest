# Session Handover: Scheme-Based Asset Types Migration

## Branch Information
- **Feature Branch:** `claude/fix-issues-9opJt`
- **Base Branch:** Main branch
- **Last Commit:** Fix script for transaction asset_type_code backfill

## Feature Summary
Replace single 'MF' asset type with 42 scheme categories (from Scheme Category column in AMFI data) for proper asset allocation tracking.

---

## What Was Completed

### 1. Database Schema Changes
- Added `asset_type_id INTEGER REFERENCES m_asset_types(id)` to `t_scheme_details`
- Added `asset_type_code VARCHAR(100)` to `t_transaction_table`
- `m_asset_types` table already has all 42 scheme categories seeded

### 2. Import Functions Updated
**File:** `docs/releases/update-import-functions-only.sql`
- `process_single_scheme_record`: Now looks up `asset_type_id` from `m_asset_types` using scheme_category
- `process_transaction_import_session`: Now sets `asset_type_code` on transactions from scheme's asset_type
- `mark_sip_alert_complete_on_transaction`: Included for dependency
- Fixed VARCHAR type mismatch (VARCHAR → VARCHAR(100))

### 3. Backend Services Updated
- `portfolioSnapshot.service.ts`: Updated to generate separate snapshots per scheme category
- `networth.service.ts`: Updated queries to aggregate scheme categories correctly
- `portfolio.service.ts`: Updated performance/daily change queries
- Fixed `include_in_portfolio` → `portfolio_flag` column name bug

### 4. Fix Scripts Created
| Script | Purpose |
|--------|---------|
| `update-import-functions-only.sql` | Updates import functions only (safe to run) |
| `fix-transaction-asset-type-code.sql` | Backfills asset_type_code on existing transactions |
| `fix-asset-allocation.sql` | Quick fix for asset allocation (may be obsolete) |
| `scheme-based-asset-types-migration.sql` | Full migration with schema changes |

---

## Known Issue (CRITICAL - Needs Testing)

### Networth Calculation Bug
**Symptom:** Total networth shows wrong value (e.g., 8L instead of 18.5L), fluctuates on regeneration

**Root Cause:** Phase 3 changes added `AND t.asset_type_code = $5` filter to snapshot calculation. Transactions with NULL or 'MF' asset_type_code are invisible.

**Fix Created:** `fix-transaction-asset-type-code.sql`
- Backfills asset_type_id on schemes from scheme_category
- Backfills asset_type_code on transactions from scheme's asset_type
- Defaults to 'Growth' for any remaining records

**Status:** Script created but NOT YET TESTED by user

---

## Files Modified in This Branch

### Database Scripts
```
docs/releases/update-import-functions-only.sql     # Import functions
docs/releases/fix-transaction-asset-type-code.sql  # Backfill script (NEW)
docs/releases/fix-asset-allocation.sql             # Quick fix
docs/releases/scheme-based-asset-types-migration.sql
```

### Backend Services
```
backend/src/services/portfolioSnapshot.service.ts  # Snapshot generation
backend/src/services/networth.service.ts           # Networth aggregation
backend/src/services/portfolio.service.ts          # Portfolio queries
```

### Distribution Scripts (Need Update)
```
backend/db/ditribution scripts/02_tables.sql       # Has asset_type_id column
backend/db/ditribution scripts/04_functions_views_policies.sql  # Needs function updates
```

---

## Next Session Tasks

### 1. Test the Fix
```bash
# User should run:
psql -f docs/releases/fix-transaction-asset-type-code.sql
# Then regenerate snapshots from UI
# Verify networth shows correct values
```

### 2. Create Release Notes
Once testing passes, create `docs/releases/RELEASE-scheme-based-asset-types.md`:
- Feature description
- Breaking changes
- Migration steps
- Rollback procedure

### 3. Create Single Patch Migration
Consolidate all scripts into ONE migration file:
`docs/releases/patch-001-scheme-based-asset-types.sql`

Should include:
1. Schema changes (add columns)
2. Function updates (process_single_scheme_record, process_transaction_import_session)
3. Data backfill (schemes and transactions)
4. Verification queries

### 4. Update Distribution Scripts
Update for fresh installations:
- `02_tables.sql`: Ensure asset_type_id and asset_type_code columns exist
- `04_functions_views_policies.sql`: Include updated functions

---

## Key Technical Details

### How Asset Type Lookup Works
1. **Scheme Import:** `scheme_category` from file → lookup in `m_asset_types.asset_type_code` → save as `t_scheme_details.asset_type_id`
2. **Transaction Import:** `t_scheme_details.asset_type_id` → `m_asset_types.asset_type_code` → save as `t_transaction_table.asset_type_code`
3. **Snapshot Calculation:** Group transactions by `asset_type_code`, calculate separately

### m_asset_types Table
- GLOBAL table (no tenant_id)
- Contains 42 scheme categories + non-scheme types (GOLD, FD, etc.)
- Old 'MF' type is DEPRECATED (id=1)
- 'Growth' is the default fallback

### Non-Scheme Asset Types List
```javascript
['GOLD', 'SILVER', 'EQUITY', 'FD', 'PPF', 'EPF', 'NPS', 'REAL_ESTATE', 'INSURANCE', 'NSC', 'BONDS', 'OTHER', 'Growth']
```

---

## Git Commands for Next Session

```bash
# Checkout the feature branch
git checkout claude/fix-issues-9opJt
git pull origin claude/fix-issues-9opJt

# View recent commits
git log --oneline -10

# After all testing passes, create PR or merge
```

---

## Contact Points in Code

| Area | File | Key Function/Section |
|------|------|---------------------|
| Scheme Import | update-import-functions-only.sql | `process_single_scheme_record` lines 131-148 |
| Transaction Import | update-import-functions-only.sql | `process_transaction_import_session` lines 556-570 |
| Snapshot Calculation | portfolioSnapshot.service.ts | `calculateSnapshotData` lines 847-956 |
| Networth Display | networth.service.ts | `getSummary` lines 70-240 |
| UI Display | CustomerMetricsBar.tsx | Lines 123 (totalNetworth) and 136 (MF value) |

---

## Summary for Next Session

1. **Branch:** `claude/fix-issues-9opJt`
2. **First Task:** User tests `fix-transaction-asset-type-code.sql` and verifies networth
3. **If Pass:** Create release notes, patch migration, update distribution scripts
4. **If Fail:** Debug further based on error messages

The core changes are complete. Main remaining work is testing, documentation, and consolidation.
