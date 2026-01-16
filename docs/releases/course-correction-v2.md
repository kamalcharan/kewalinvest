# Course Correction v2.0 - Release Notes

**Release Date:** January 16, 2026
**Branch:** `claude/init-and-notify-d81ic`

---

## Overview

Complete rewrite of the Course Correction feature to properly handle scheme code migrations with full data integrity. This release fixes critical bugs where units were not recalculated and adds comprehensive step tracking for better debugging and rollback capabilities.

---

## Key Features

### 1. Units & NAV Recalculation (Critical Fix)

**Problem:** Previous version only changed `scheme_code`, leaving `units` and `nav` calculated at wrong scheme's NAV. This caused portfolio values to be completely wrong after migration.

**Solution:** Migration now:
- Looks up correct scheme's NAV on each transaction date
- Recalculates: `new_units = total_amount / correct_nav`
- Updates: `scheme_code`, `scheme_name`, `units`, and `nav`

**Example:**
| Field | Before (Wrong) | After (Correct) |
|-------|----------------|-----------------|
| scheme_code | 100668 | 100669 |
| units | 19,999 (at NAV 10) | 635.38 (at NAV 314.77) |
| nav | 10.00 | 314.77 |

### 2. Complete Backup for Rollback

**Problem:** Old backup only stored `id`, `scheme_code`, `scheme_name` - couldn't restore units/NAV on rollback.

**Solution:** Backup now stores complete transaction data:
```json
{
  "id": 28364,
  "original_scheme_code": "152988",
  "original_scheme_name": "Edelweiss Nifty500...",
  "original_units": 19999.0000,
  "original_nav": 10.0000,
  "total_amount": 200000.00,
  "txn_date": "2024-10-31"
}
```

### 3. 8-Step Migration Tracking

Each migration now tracks 8 discrete steps with individual pass/fail status:

| Step | Name | Description |
|------|------|-------------|
| 1 | Check Existing | Verify no blocking migrations |
| 2 | Get Customer | Fetch customer name |
| 3 | Get Source Scheme | Fetch source scheme name |
| 4 | Get Target Scheme | Fetch target scheme name |
| 5 | Count Transactions | Count transactions to migrate |
| 6 | Backup | Backup complete transaction data |
| 7 | Update Transactions | Update scheme_code, units, nav |
| 8 | Regenerate Snapshots | Recalculate portfolio snapshots |

### 4. Rollback with Snapshot Regeneration

Rollback now:
- Restores all fields: `scheme_code`, `scheme_name`, `units`, `nav`
- Automatically regenerates portfolio snapshots after restore
- Returns `snapshots_regenerated` count

### 5. Animated Step Progress UI

Migration modal shows step-by-step progress with visual animation:
- Steps 1-5 (Validation): 400ms delay each
- Steps 6-8 (Migration): 800ms delay each
- Provides clear visual feedback during processing

### 6. Custom Confirmation Dialogs

Replaced browser `window.confirm()` with styled modal dialogs:
- **Rollback:** Orange icon with warning message
- **Delete:** Red icon with confirmation
- Shows loading spinner while processing

### 7. Compact Modal Layout

Modal redesigned to fit in single view without scrolling:
- 2-column grid for steps (Validation | Execution)
- Compact summary with inline stats
- Smaller icons and reduced padding

---

## Database Changes

### New Migration File
`backend/db/migrations/035_course_correction_fix_units_nav.sql`

Run this migration to update the DB functions:
```bash
psql -f backend/db/migrations/035_course_correction_fix_units_nav.sql
```

### Updated Functions
- `execute_course_correction_v2()` - Now recalculates units using correct NAV
- `rollback_course_correction_v2()` - Now restores units and NAV

---

## Files Changed

| File | Changes |
|------|---------|
| `backend/db/migrations/035_course_correction_fix_units_nav.sql` | New migration for units/NAV fix |
| `backend/src/services/courseCorrection.service.ts` | Rollback now regenerates snapshots |
| `backend/src/routes/courseCorrection.routes.ts` | Deprecated old create/execute routes |
| `frontend/src/pages/dataops/CourseCorrectionPage.tsx` | Animated steps, compact layout, custom dialogs |

---

## Commits

```
6e8f6e5 UX: Compact modal layout + Rollback snapshot regeneration
5032aaf UX: Add animated steps and custom confirmation dialogs
c54a405 Fix: Course Correction now recalculates units using correct NAV
0bcafd2 Fix: Remove deprecated createCorrection and executeCorrection routes
bbc5c67 Fix: Use correct step property name for snapshot status check
```

---

## Testing Checklist

- [ ] Run migration 035 on database
- [ ] Test new migration with a test customer
- [ ] Verify units are recalculated (units = total_amount / nav)
- [ ] Verify backup contains units and nav
- [ ] Test rollback - verify units/nav restored
- [ ] Test rollback - verify snapshots regenerated
- [ ] Test UI animation during processing
- [ ] Test custom rollback/delete dialogs
- [ ] Verify modal fits in single view

---

## Known Issues

- **ANAND DESAI (id=3):** Cannot be rolled back properly - old backup doesn't have units/nav data (migrated before this fix)
- **ADELINE CATHERINA PEREIRA (id=2):** Same issue - backup incomplete

For these records, manual data correction may be needed if rollback is required.

---

## Upgrade Instructions

1. Pull latest code:
   ```bash
   git pull origin claude/init-and-notify-d81ic
   ```

2. Run database migration:
   ```bash
   psql -U kewal_app_user -d kewalinvest -f backend/db/migrations/035_course_correction_fix_units_nav.sql
   ```

3. Restart backend (nodemon should auto-restart)

4. Test with a new migration to verify everything works
