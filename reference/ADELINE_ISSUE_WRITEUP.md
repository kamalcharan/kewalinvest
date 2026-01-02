# ADELINE Data Issue - Root Cause Analysis & Resolution

## Customer Details
- **Name**: ADELINE CATHERINA PEREIRA
- **Customer ID**: 1270
- **IWell Code**: 318924
- **Tenant ID**: 17

## Problem Statement
Customer ADELINE showed **-13.50% return** despite investing via SIP in UTI Flexi Cap Fund for 4+ years (since Feb 2021).

## Investigation Timeline

### Initial Observation
- All monthly snapshots from Feb 2021 to Jun 2025 showed **NEGATIVE returns**
- Returns ranged from -4.99% to -38.16%
- This is statistically improbable for a well-performing equity fund over 4+ years

### NAV Comparison Discovery
| Source | NAV for Feb 2021 |
|--------|------------------|
| Tbook (Import) | 209.38 |
| t_nav_data (System) | 146.05 |

**Key Finding**: The system was using a completely different NAV than what was in the source Tbook.

## Root Cause: Growth vs IDCW Scheme Mismatch

### The Problem
The alias matching system mapped the transaction scheme name to the **wrong variant**:

| Attribute | Wrong (IDCW) | Correct (Growth) |
|-----------|--------------|------------------|
| Scheme Code | 100668 | 100669 |
| Scheme Name | UTI Flexi Cap Fund Reg (IDCW) | UTI Flexi Cap Fund Reg (Growth) |
| NAV (Feb 2021) | ~146 | ~209 |
| NAV (Dec 2025) | ~97 | ~328 |

### Why This Matters
- **IDCW (Income Distribution cum Capital Withdrawal)**: Pays dividends, so NAV stays relatively flat/low
- **Growth**: Reinvests dividends, so NAV compounds over time

The customer invested in the **Growth** variant, but the system downloaded NAV for the **IDCW** variant, causing:
- Artificially low current values
- Negative returns despite actual gains

## Fix Applied

### Step 1: Update Bookmark
```sql
UPDATE t_scheme_bookmarks
SET scheme_code = '100669'
WHERE scheme_code = '100668'
  AND tenant_id = 17;
```

### Step 2: Update All Transactions
```sql
UPDATE t_transaction_table
SET scheme_code = '100669'
WHERE scheme_code = '100668'
  AND tenant_id = 17
  AND is_live = true;
```

### Step 3: Delete Wrong NAV
```sql
DELETE FROM t_nav_data
WHERE scheme_code = '100668'
  AND is_live = true;
```

### Step 4: Download Correct NAV
Downloaded NAV for scheme_code 100669 (Growth variant)

### Step 5: Regenerate Portfolio Snapshots

## Results

### ADELINE's Return After Fix
| Before Fix | After Fix |
|------------|-----------|
| -13.50% | **+28.69%** |

### Other Schemes Fixed (Same Issue)
| Scheme | Wrong Code | Correct Code |
|--------|------------|--------------|
| SBI Focused Equity Fund Reg (G) | 102765 | 102756 |
| Axis Arbitrage Fund Reg (G) | 112087 | 130771 |

### All Affected Customers (6)
| Customer | Return After Fix |
|----------|------------------|
| AARTI B LAGU | +26.99% ✓ |
| ADELINE | +28.69% ✓ |
| PATHI VENKAT SUNIL | +42.22% ✓ |
| SWETHA KOTTI | See Note* |
| VENKATA KRISHNA MOHAN KOTTI | +24.82% ✓ |
| VIVEKANANDA SURI VADDIPARTHI | +34.40% ✓ |

*SWETHA KOTTI had an additional issue with Kotak Multicap Fund (separate fix required)

## Lessons Learned

### 1. Alias Matching Limitation
The current alias matching logic cannot distinguish between Growth and IDCW variants of the same fund, as they have very similar names.

### 2. Suggested Enhancement
Implement **Scheme Alias Verification** feature:
- Before NAV download, require customer/admin to verify all scheme mappings
- Flag schemes where multiple variants exist (Growth/IDCW/Direct/Regular)
- Show NAV preview to catch obvious mismatches early

### 3. Red Flag Indicators
- Long-term SIP with negative returns
- NAV in Tbook doesn't match NAV in system
- Scheme name contains "(G)" but mapped to IDCW variant

## Technical References

### Key Files
- `portfolioSnapshot.service.ts` (lines 752-844): Snapshot calculation
- `RunAlias.sql`: Alias generation logic

### Key Tables
- `t_scheme_bookmarks`: Tenant's tracked schemes
- `t_transaction_table`: Customer transactions
- `t_nav_data`: NAV history by scheme_code
- `t_scheme_details`: Master scheme data with scheme_nav_name
