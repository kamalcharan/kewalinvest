# Release 26 - Release Notes

**Release Date:** January 2026
**Branch:** `claude/fix-release-26-issues-GEHip`

---

## Summary

This release focuses on Portfolio Snapshots enhancements, Market Data improvements, and performance optimizations. Key features include MoM (Month-over-Month) performance tracking, Asset Allocation tabs, and improved snapshot generation for multi-asset portfolios.

---

## New Features

### 1. Portfolio Snapshots - Total Portfolio MoM
- Added **Total Portfolio Performance (MoM)** summary row at the bottom of the Portfolio Snapshots table
- Shows aggregate MoM performance across all MF schemes
- Highlighted with distinct background color for visibility

### 2. Portfolio Snapshots - Market Performance MoM
- Added **Market Performance (MoM)** row showing benchmark index performance
- Allows comparison of portfolio performance against market index
- Uses Nifty 50 as default benchmark

### 3. Portfolio Snapshots - Asset Allocation Tabs
- Added horizontal tabs: **MF Allocation** | **Asset Allocation**
- **MF Allocation tab**: Shows individual MF schemes with Units, NAV, Market Value, Performance (MoM)
- **Asset Allocation tab**: Shows all asset types (MF, Gold, FD, Real Estate, etc.)
  - Row 1: Market Value for each month
  - Row 2: MoM % for each month
  - Displays 12 months of historical data
  - Non-MF assets shown first, then MF

### 4. NAV Downloads - Run Now Button
- Added **Run Now** button to NAV Downloads tab
- Allows manual triggering of NAV data download
- Fills gaps by downloading historical range when needed

---

## Bug Fixes

### 1. Date Parsing Fix
- **Issue:** Dates were showing as MM-DD instead of DD-MM
- **Fix:** Corrected date parsing in formatters.ts
- **Affected:** SchemeDetailPage, IndexDetailPage

### 2. Market Downloads Improvements
- Fixed gap detection in market data downloads
- Improved EOD (End of Day) button functionality
- Better error handling for Run Now operations

### 3. Date Validation
- Added validation to prevent future dates in market data
- Prevents invalid data from being stored

### 4. Snapshot Generation - Non-MF Assets
- **Issue:** Non-MF assets (Gold, FD, etc.) only had snapshots for months where MF transactions existed
- **Fix:** Modified `getCustomerDateRange` to consider both:
  - MF transaction dates from `t_transaction_table`
  - Non-MF asset `start_date` from `t_customer_asset_assignments`
- Snapshots now generated from the earliest date across all asset types

### 5. Asset Allocation - 12 Months Display
- **Issue:** Asset Allocation tab was only showing 6 months
- **Fix:** Properly padded data to show 12 months of historical values

---

## Performance Optimizations

### Snapshot Generation Optimization
- **Before:** Queried `t_customer_asset_assignments` for every month for every customer
- **After:** Query non-MF plans **once per customer** (not per month)
- **Impact:** For a customer with 36 months of history:
  - Before: 36 database queries per customer
  - After: 1 database query per customer
- Added `generateAssetSnapshotsWithPlans()` method that accepts pre-fetched plans
- Skip non-MF processing entirely for customers without non-MF assets (majority of customers)

---

## Files Changed

### Backend
- `backend/src/services/portfolioSnapshot.service.ts` - Major changes:
  - `getCustomerDateRange()` - Now queries both MF transactions and non-MF asset start dates
  - `generateAssetSnapshotsWithPlans()` - New optimized method
  - `smartBackfill()`, `generateMissingSnapshots()`, `backfillSnapshots()` - Performance optimization
- `backend/src/services/market.service.ts` - Market data improvements
- `backend/src/services/marketDownload.service.ts` - Download enhancements

### Frontend
- `frontend/src/components/portfolio/PortfolioSnapshotsTable.tsx` - Major changes:
  - Added horizontal tabs (MF Allocation / Asset Allocation)
  - Added Total Portfolio MoM row
  - Added Market Performance MoM row
  - Asset Allocation with 2 rows per asset (Value + MoM %)
- `frontend/src/pages/cruiseControl/MarketTab.tsx` - Market tab updates
- `frontend/src/pages/cruiseControl/NavTab.tsx` - Added Run Now button
- `frontend/src/pages/market/IndexDetailPage.tsx` - Date parsing fix
- `frontend/src/pages/nav/SchemeDetailPage.tsx` - Date parsing fix
- `frontend/src/utils/formatters.ts` - Date formatting fixes

---

## Database Migrations

**No new migrations required.**

All required columns already exist from previous migrations:
- Migration 017: `t_customer_asset_assignments.start_date`, `has_started`
- Migration 020: Multi-asset snapshot support columns

---

## Deployment Notes

### Steps
1. Pull latest code from branch `claude/fix-release-26-issues-GEHip`
2. No database migrations needed
3. Restart backend service
4. Clear frontend cache / rebuild frontend

### Post-Deployment
- Run **Regenerate All** from Portfolio Snapshots page for customers with non-MF assets
- This will regenerate snapshots with the corrected date ranges

---

## Testing Checklist

- [ ] Portfolio Snapshots table loads correctly
- [ ] Total Portfolio MoM row displays at bottom
- [ ] Market Performance MoM row displays
- [ ] MF Allocation tab shows individual schemes
- [ ] Asset Allocation tab shows all asset types
- [ ] Asset Allocation shows 12 months of data
- [ ] Collapse All shows only Performance (MoM) row per scheme
- [ ] NAV Downloads Run Now button works
- [ ] Date formats display correctly (DD-MM-YYYY)
- [ ] Snapshot generation includes non-MF assets from their start_date

---

## Known Issues

None

---

## Commits (15 total)

1. `c8e3ba3` - Optimize snapshot generation for customers without non-MF assets
2. `d0cbf24` - Fix snapshot generation to use asset start_date for non-MF assets
3. `18bef22` - Fix Asset Allocation tab to show 12 months of data
4. `680e9cc` - Show 2 rows per asset type in Asset Allocation tab
5. `3336005` - Refactor Asset Allocation tab to show actual asset types
6. `39ae8c2` - Fix Asset Allocation tab to use actual MF categories
7. `be08533` - Add MF Allocation / Asset Allocation tabs to Portfolio Snapshots
8. `5933616` - Increase background color visibility for Total Portfolio and Market MoM rows
9. `c0c9dc7` - Add Market Performance MoM row to Portfolio Snapshots table
10. `33a5aa7` - Add Total Portfolio MoM summary row at bottom of Portfolio Snapshots table
11. `eb1c1ec` - Add Run Now button to NAV Downloads tab
12. `14c1c28` - Fix date parsing bug - dates showing as MM-DD instead of DD-MM
13. `482f82e` - Add date validation to prevent future dates in market data
14. `2e48646` - Fix Run Now to fill gaps by downloading historical range
15. `ad41cc5` - Fix Run Now error handling and button color
16. `4527094` - Fix Market Downloads: gap detection, EOD button, and Run Now
