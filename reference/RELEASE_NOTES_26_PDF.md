# Release Notes - Feature Branch: claude/review-26-pdf-gQBfa

## Summary
Investigation and fixes for Page 4 data issues from 26.pdf feature requests, plus Cruise Control enhancements.

---

## 1. ADELINE Data Fix (Scheme Code Mismatch - Growth vs IDCW)

### Issue
Customer ADELINE showed **negative returns (-13.50%)** despite 4+ years of SIP investments in UTI Flexi Cap Fund.

### Root Cause
**Scheme code mismatch** - The system was using IDCW (dividend) variant NAV instead of Growth variant:
- Wrong: scheme_code `100668` = UTI Flexi Cap Fund Reg (IDCW) - NAV ~146
- Correct: scheme_code `100669` = UTI Flexi Cap Fund Reg (Growth) - NAV ~328

### Fix Applied
Updated 3 schemes with Growth/IDCW mismatch:

| Scheme Name | Wrong Code | Correct Code |
|-------------|------------|--------------|
| UTI Flexi Cap Fund Reg (G) | 100668 | 100669 |
| SBI Focused Equity Fund Reg (G) | 102765 | 102756 |
| Axis Arbitrage Fund Reg (G) | 112087 | 130771 |

### Customers Impacted: 6
All verified with positive returns after fix.

---

## 2. SWETHA KOTTI / Kotak Multicap Fund Fix (Scheme Mapping Error)

### Issue
SWETHA KOTTI showed **-11.38% return** (later -49.07% after partial fix).

### Root Cause
**Two issues found:**
1. **Wrong scheme mapping**: scheme_code `152065` (Kotak Multi Asset Allocation) instead of `149182` (Kotak Multicap Fund)
2. **scheme_id mismatch**: Bookmark had wrong `scheme_id` (14398 instead of 12445)

NAV queries use `scheme_id` (internal ID), NOT `scheme_code` - this caused NULL NAV values.

### Fix Applied
- Updated scheme_code: 152065 → 149182
- Updated scheme_id: 14398 → 12445
- Regenerated portfolio snapshots

### Customers Impacted: 11
| Customer | Return After Fix |
|----------|------------------|
| CHALLA SANJAY KUMAR | +7.19% |
| DHWANI CHHABHAIYA | +6.15% |
| GNANA PRASUNA MUKTEVI | +6.56% |
| LAGISHETTY VENKATESH | +8.49% |
| MAVANUR RANGARAJU BALAJI | +2.77% |
| NANDISH T C | +9.39% |
| PRIYANKA S CHILLERGE | +6.61% |
| RACHURI RAGHAVENDRA SWAMY | +6.42% |
| SAMPATH KUMAR TUDGANI | +7.40% |
| SWETHA KOTTI | +5.24% |
| V AJAY KUMAR | +9.19% |

---

## 3. Root Cause Analysis - Source Data Issue

### Finding
The wrong scheme_codes originated from the **customer's bookmark CSV file**, not from system logic.

CSV contained:
- `152065` for "Kotak Multicap Fund (G)" - should be `149182`
- `100668` for "UTI Flexi Cap Fund Reg (G)" - should be `100669`
- `102765` for "SBI Focused Equity Fund Reg (G)" - should be `102756`

### System Behavior
The import validates that scheme_code exists in master data, but doesn't verify if the scheme name matches. This is by design (flexible alias matching).

### Recommendation
Customer should verify scheme mappings in their source data before import.

---

## 4. Market Downloads - Bug Fix & Feature Enhancement

### Bug Fixed: Gap Detection Not Working
**Issue:** Gap detection showed "no gaps" despite 24 days of missing data (last download: Dec 12, now: Jan 5)

**Root Cause:** `market.service.ts:1632` - Gap detection loop end date was set to `latestDate` (from DB) instead of TODAY.

```javascript
// Before (BUG):
const end = new Date(latestDate);  // Dec 15 - loop never runs since start > end

// After (FIXED):
const end = new Date();  // TODAY - correctly detects gaps to current date
```

### Feature Added: "Run Now" Button
Added manual trigger button (similar to Alerts tab) that:
- Triggers `MARKET_OHLC_DOWNLOAD` job
- Downloads EOD data for all indices with gaps
- Calculates metrics after download
- Shows progress with loading spinner

---

## Migration Files

| File | Purpose |
|------|---------|
| `031_fix_growth_idcw_scheme_codes.sql` | Fix Growth/IDCW scheme code mismatches |
| `032_fix_kotak_multicap_mapping.sql` | Fix Kotak Multicap scheme_code AND scheme_id |

---

## Files Modified

### Backend
- `backend/src/services/market.service.ts` - Gap detection fix (line 1632-1637)

### Frontend
- `frontend/src/pages/cruiseControl/MarketTab.tsx` - Added "Run Now" button

---

## Commits
1. `705763f` - Add documentation and migration files for Page 4 data fixes
2. `e222c26` - Fix Kotak Multicap bookmark scheme_id mismatch
3. `30d0856` - Fix Market Downloads gap detection and add Run Now button
