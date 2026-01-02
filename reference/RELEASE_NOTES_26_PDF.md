# Release Notes - Feature Branch: claude/review-26-pdf-gQBfa

## Summary
Investigation and fixes for Page 4 data issues from 26.pdf feature requests.

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
1. AARTI B LAGU - Return: +26.99% ✓
2. ADELINE - Return: **-13.50% → +28.69%** ✓
3. PATHI VENKAT SUNIL - Return: +42.22% ✓
4. SWETHA KOTTI - ⚠️ (separate issue, see below)
5. VENKATA KRISHNA MOHAN KOTTI - Return: +24.82% ✓
6. VIVEKANANDA SURI VADDIPARTHI - Return: +34.40% ✓

---

## 2. SWETHA KOTTI / Kotak Multicap Fund Fix (Scheme Mapping Error)

### Issue
SWETHA KOTTI showed **-11.38% return** (later -49.07% after partial fix).

### Root Cause
**Wrong scheme mapping** in master data:
- Transaction scheme: "Kotak Multicap Fund (G)"
- Mapped to: scheme_code `152065` = "Kotak Multi Asset Allocation Fund" (WRONG)
- Correct: scheme_code `149182` = "Kotak Multicap Fund-Regular Plan-Growth"

These are completely different funds:
- **Kotak Multicap Fund** - Equity multicap fund
- **Kotak Multi Asset Allocation Fund** - Hybrid fund (equity + debt + gold)

### Fix Applied
- Updated bookmark: 152065 → 149182
- Updated all transactions: 152065 → 149182
- Deleted wrong NAV data for 152065

### Customers Impacted: 11
1. CHALLA SANJAY KUMAR
2. DHWANI CHHABHAIYA
3. GNANA PRASUNA MUKTEVI
4. LAGISHETTY VENKATESH
5. MAVANUR RANGARAJU BALAJI
6. NANDISH T C
7. PRIYANKA S CHILLERGE
8. RACHURI RAGHAVENDRA SWAMY
9. SAMPATH KUMAR TUDGANI
10. SWETHA KOTTI
11. V AJAY KUMAR

---

## 3. BV SRINIVAS Investigation

### Issue
Customer reported "missing data"

### Finding
**Source data issue** - Not an import problem:
- Staging had 23 records, but 13 belonged to different customer (JAHNAVI BOLISETTY with FAMILY_HEAD = "BV SRINIVAS")
- Remaining 10 records matched transactions correctly
- Tbook from IWell source is incomplete (sell transactions ₹25.88L but only ₹5.18L invested)

### Resolution
No fix needed - Data issue at source (IWell Tbook), not import issue.

---

## Pending Items

### Critical - NAV Query Issue
- NAV data for scheme 149182 exists (540 records per UI)
- But SQL queries return NULL
- Need to investigate data type mismatch or connection issue
- **11 customers affected until resolved**

### Verification Needed
After NAV issue resolved:
1. Re-run portfolio snapshots for all 11 Kotak Multicap customers
2. Verify returns are now positive for long-term investors

### Suggested Feature Enhancement
**Scheme Alias Verification** - Make it mandatory for customers to verify all scheme mappings before NAV download to prevent future mismatches.

---

## Technical Details

### Tables Modified
- `t_scheme_bookmarks` - Updated scheme_code mappings
- `t_transaction_table` - Updated scheme_code in transactions
- `t_nav_data` - Deleted incorrect NAV records

### Key Files Referenced
- `/backend/src/services/portfolioSnapshot.service.ts` (lines 752-844) - Snapshot calculation logic
- `/backend/db/distribution scripts/RunAlias.sql` - Alias generation logic
