# Pending Items - Feature Branch: claude/review-26-pdf-gQBfa

## Resolved Issues

### 1. NAV Query Issue for Scheme 149182 (Kotak Multicap Fund)
**Status**: ✅ RESOLVED

**Root Cause Found**:
The bookmark had `scheme_code = '149182'` but `scheme_id = 14398` (wrong internal ID).
The correct `scheme_id` for scheme_code 149182 is **12445**.

NAV queries use `scheme_id` (internal ID), NOT `scheme_code` - that's why queries returned NULL.

**Fix Applied**:
```sql
UPDATE t_scheme_bookmarks
SET scheme_id = 12445
WHERE id = 2058 AND tenant_id = 17;
```

**Results After Fix** (11 customers):
| Customer | Before | After |
|----------|--------|-------|
| CHALLA SANJAY KUMAR | +24.86% | +36.35% |
| LAGISHETTY VENKATESH | -20.40% | +8.83% |
| NANDISH T C | -20.30% | +7.52% |
| PRIYANKA S CHILLERGE | -10.32% | +22.83% |
| SAMPATH KUMAR TUDGANI | -15.54% | +5.35% |
| SWETHA KOTTI | -49.07% | +5.24% |
| V AJAY KUMAR | +8.00% | +22.89% |

---

## Feature Enhancement Suggestions

### 3. Scheme Alias Verification Feature
**Status**: SUGGESTED (from user)

**Problem**: Current alias matching cannot distinguish between Growth/IDCW variants

**Proposed Solution**:
- Add mandatory verification step before NAV download
- Customer/admin must confirm all scheme mappings
- Flag schemes with multiple variants
- Show NAV preview to catch mismatches early

---

## Completed Items

### ✓ ADELINE Fix (Growth vs IDCW)
- 3 schemes corrected
- 6 customers verified with positive returns
- Migration file: `031_fix_scheme_code_mismatches.sql`

### ✓ Kotak Multicap Mapping Fix
- Bookmark updated: 152065 → 149182
- Transactions updated for 11 customers
- Wrong NAV deleted
- Migration file: `032_fix_kotak_multicap_mapping.sql`
- **PENDING**: NAV download verification

### ✓ BV SRINIVAS Investigation
- Confirmed as source data issue (IWell Tbook incomplete)
- No fix needed in system

---

## Files Created This Session

1. `/reference/RELEASE_NOTES_26_PDF.md` - Complete release notes
2. `/reference/ADELINE_ISSUE_WRITEUP.md` - Detailed explanation
3. `/reference/PENDING_ITEMS.md` - This file
4. `/backend/db/migrations/031_fix_scheme_code_mismatches.sql` - Adeline fix
5. `/backend/db/migrations/032_fix_kotak_multicap_mapping.sql` - Kotak fix
