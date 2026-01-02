# Pending Items - Feature Branch: claude/review-26-pdf-gQBfa

## Critical Issues

### 1. NAV Query Issue for Scheme 149182 (Kotak Multicap Fund)
**Status**: BLOCKING

**Problem**:
- NAV data exists in database (540 records per UI)
- UI shows date range: 3/10/2023 to 11/12/2025
- API returns 409 Conflict (overlap detected)
- BUT SQL queries return NULL

**Impact**:
- 11 customers have wrong/missing values for Kotak Multicap Fund
- SWETHA KOTTI showing -49.07% return (should be positive)

**Affected Customers**:
1. CHALLA SANJAY KUMAR (1287)
2. DHWANI CHHABHAIYA (1291)
3. GNANA PRASUNA MUKTEVI (1295)
4. LAGISHETTY VENKATESH (1312)
5. MAVANUR RANGARAJU BALAJI (1320)
6. NANDISH T C (1332)
7. PRIYANKA S CHILLERGE (1350)
8. RACHURI RAGHAVENDRA SWAMY (1351)
9. SAMPATH KUMAR TUDGANI (1362)
10. SWETHA KOTTI (1383)
11. V AJAY KUMAR (1387)

**Diagnostic Queries Tried**:
```sql
-- All returned NULL despite data existing in UI
SELECT * FROM t_nav_data WHERE scheme_code = '149182';
SELECT * FROM t_nav_data WHERE scheme_code = 149182;  -- without quotes
SELECT * FROM t_nav_data WHERE scheme_code::text = '149182';
SELECT * FROM t_nav_data WHERE CAST(scheme_code AS TEXT) = '149182';
```

**Possible Causes**:
1. Data type mismatch (VARCHAR vs INTEGER)
2. Different database connection (dev vs prod)
3. Caching layer between API and DB
4. is_live flag issue
5. Schema/tenant isolation

**Next Steps**:
1. Check database connection string in API vs direct DB tool
2. Check if data is in a different schema
3. Investigate caching layer (Redis?)
4. Check API code for NAV data retrieval

---

## Verification Pending

### 2. Regenerate Snapshots for 11 Kotak Multicap Customers
**Status**: BLOCKED by Issue #1

After NAV issue is resolved:
```sql
-- Verification query
SELECT
    c.id as customer_id,
    co.name as customer_name,
    s.snapshot_month_end,
    s.total_invested,
    s.current_value,
    s.return_percentage
FROM t_monthly_portfolio_snapshots s
JOIN t_customers c ON c.id = s.customer_id
JOIN t_contacts co ON co.id = c.contact_id
WHERE c.id IN (1287, 1291, 1295, 1312, 1320, 1332, 1350, 1351, 1362, 1383, 1387)
  AND s.tenant_id = 17
  AND s.is_live = true
  AND s.snapshot_month_end = (
      SELECT MAX(snapshot_month_end)
      FROM t_monthly_portfolio_snapshots
      WHERE customer_id = s.customer_id
        AND tenant_id = 17
        AND is_live = true
  )
ORDER BY co.name;
```

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
