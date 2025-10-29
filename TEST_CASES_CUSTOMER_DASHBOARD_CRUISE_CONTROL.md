# Test Cases: Customer Dashboard & Cruise Control Portfolio Snapshots

**Date:** 2025-10-29
**Version:** 1.0
**Prepared By:** QA Team
**Status:** Ready for Testing

---

## Table of Contents

1. [Test Environment Setup](#test-environment-setup)
2. [Pre-requisites](#pre-requisites)
3. [Customer Dashboard Test Cases](#customer-dashboard-test-cases)
4. [Cruise Control Portfolio Snapshots Test Cases](#cruise-control-portfolio-snapshots-test-cases)
5. [Integration Test Cases](#integration-test-cases)
6. [Database Verification](#database-verification)
7. [Test Results Summary](#test-results-summary)

---

## Test Environment Setup

### Backend
- **URL:** http://localhost:8080
- **Database:** PostgreSQL
- **Environment:** Development/Test

### Frontend
- **URL:** http://localhost:3000
- **Browser:** Chrome/Firefox (latest)

### Test Data Required
- **Tenant ID:** _____________
- **Test User:** _____________
- **Test Customer:** _____________
- **Test Schemes:** At least 2-3 schemes with transactions

---

## Pre-requisites

### ✅ Checklist Before Testing

- [ ] Backend server is running (`npm run dev`)
- [ ] Frontend is running (`npm start`)
- [ ] Database is accessible
- [ ] Test tenant account exists
- [ ] Test customer with portfolio data exists
- [ ] At least one scheme has transactions
- [ ] Server logs show: "Generic Job Scheduler Service initialized successfully"

### SQL Pre-check Queries

```sql
-- 1. Check if job types table has data
SELECT COUNT(*) FROM m_job_types WHERE code = 'PORTFOLIO_SNAPSHOT';
-- Expected: 1 row

-- 2. Check if tenant has job configs
SELECT COUNT(*) FROM t_job_scheduler_configs
WHERE tenant_id = <YOUR_TENANT_ID> AND job_type = 'PORTFOLIO_SNAPSHOT';
-- Expected: 2 rows (LIVE + TEST)

-- 3. Check if customer has portfolio data
SELECT COUNT(*) FROM t_transactions
WHERE customer_id = <YOUR_CUSTOMER_ID>;
-- Expected: > 0 rows

-- 4. Check if customer has portfolio holdings
SELECT COUNT(*) FROM t_portfolio_holdings
WHERE customer_id = <YOUR_CUSTOMER_ID>;
-- Expected: > 0 rows
```

---

## Customer Dashboard Test Cases

### Test Suite 1: Customer List & Search

#### TC-CD-001: Navigate to Customers Page

| **Test Case ID** | TC-CD-001 |
|------------------|-----------|
| **Test Case Name** | Navigate to Customers Page |
| **Priority** | High |
| **Pre-condition** | User is logged in |

**Test Steps:**
1. Login to application
2. Click on "Customers" in sidebar/navigation

**Expected Result:**
- Customers page loads successfully
- Customer list is displayed
- Search bar is visible
- Add Customer button is visible

**Actual Result:** _____________

**Status:** [ ] Pass  [ ] Fail

**Comments:** _____________

---

#### TC-CD-002: Search for Customer

| **Test Case ID** | TC-CD-002 |
|------------------|-----------|
| **Test Case Name** | Search for Customer |
| **Priority** | High |

**Test Steps:**
1. Navigate to Customers page
2. Enter customer name in search box
3. Press Enter or click Search

**Expected Result:**
- Search results display matching customers
- Customer cards/rows show:
  - Customer name
  - PAN number
  - IWELL code
  - Current portfolio value (if available)

**Actual Result:** _____________

**Status:** [ ] Pass  [ ] Fail

**Screenshot:** _____________

---

### Test Suite 2: Customer Portfolio View

#### TC-CD-003: Open Customer Portfolio

| **Test Case ID** | TC-CD-003 |
|------------------|-----------|
| **Test Case Name** | Open Customer Portfolio View |
| **Priority** | Critical |

**Test Steps:**
1. Navigate to Customers page
2. Click on a customer with portfolio data
3. Verify Customer Portfolio page loads

**Expected Result:**
- Customer portfolio page opens
- Customer header shows:
  - Customer name
  - PAN number
  - IWELL code
- Portfolio summary cards display:
  - Total Invested
  - Current Value
  - Total Returns
  - Return %

**Actual Result:**
- Total Invested: _____________
- Current Value: _____________
- Total Returns: _____________
- Return %: _____________

**Status:** [ ] Pass  [ ] Fail

**Screenshot:** _____________

---

#### TC-CD-004: Portfolio Holdings Display

| **Test Case ID** | TC-CD-004 |
|------------------|-----------|
| **Test Case Name** | Verify Portfolio Holdings Table |
| **Priority** | Critical |

**Test Steps:**
1. Open customer portfolio view
2. Scroll to Portfolio Holdings section
3. Verify holdings table displays

**Expected Result:**
- Holdings table shows columns:
  - Scheme Name
  - Scheme Code
  - Units
  - NAV (latest)
  - Current Value
  - Invested Amount
  - Returns
  - Return %
- All data is populated correctly
- Values are formatted as currency (₹)

**Actual Result:**

| Scheme Name | Units | NAV | Current Value | Returns | Return % |
|-------------|-------|-----|---------------|---------|----------|
| __________ | _____ | ___ | _____________ | _______ | ________ |
| __________ | _____ | ___ | _____________ | _______ | ________ |

**Status:** [ ] Pass  [ ] Fail

**Screenshot:** _____________

---

#### TC-CD-005: Portfolio Tab Navigation

| **Test Case ID** | TC-CD-005 |
|------------------|-----------|
| **Test Case Name** | Navigate Between Portfolio Tabs |
| **Priority** | Medium |

**Test Steps:**
1. Open customer portfolio view
2. Click on each tab:
   - Portfolio
   - Transactions
   - Goals (if exists)
   - Meetings (if exists)
   - Documents (if exists)

**Expected Result:**
- All tabs are clickable
- Tab content loads without errors
- Active tab is highlighted
- No console errors

**Actual Result:**

| Tab | Loads? | Errors? | Comments |
|-----|--------|---------|----------|
| Portfolio | [ ] Yes [ ] No | [ ] Yes [ ] No | _________ |
| Transactions | [ ] Yes [ ] No | [ ] Yes [ ] No | _________ |
| Goals | [ ] Yes [ ] No | [ ] Yes [ ] No | _________ |
| Meetings | [ ] Yes [ ] No | [ ] Yes [ ] No | _________ |

**Status:** [ ] Pass  [ ] Fail

---

#### TC-CD-006: NAV Tracking Chart

| **Test Case ID** | TC-CD-006 |
|------------------|-----------|
| **Test Case Name** | NAV Tracking Chart Display |
| **Priority** | Medium |

**Test Steps:**
1. Open customer portfolio view
2. Locate NAV Tracking section
3. Select a scheme from dropdown
4. Verify chart displays

**Expected Result:**
- Scheme selector dropdown works
- NAV chart loads after scheme selection
- Chart shows NAV trend over time
- Chart is interactive (hover shows values)
- Time period selector works (if available)

**Actual Result:** _____________

**Chart displays correctly:** [ ] Yes  [ ] No

**Interactive hover works:** [ ] Yes  [ ] No

**Status:** [ ] Pass  [ ] Fail

**Screenshot:** _____________

---

### Test Suite 3: Customer Portfolio Performance

#### TC-CD-007: Calculate Returns Accuracy

| **Test Case ID** | TC-CD-007 |
|------------------|-----------|
| **Test Case Name** | Verify Returns Calculation |
| **Priority** | Critical |

**Test Steps:**
1. Open customer portfolio
2. Note down values:
   - Total Invested: _____________
   - Current Value: _____________
   - Total Returns (displayed): _____________
3. Calculate manually: Returns = Current Value - Invested
4. Compare

**Expected Result:**
- Displayed returns = Current Value - Total Invested
- Return % = (Returns / Total Invested) × 100
- Values match manual calculation

**Manual Calculation:**
- Returns = _____________ - _____________ = _____________
- Return % = (_____________ / _____________) × 100 = _____________%

**System Displayed:**
- Returns: _____________
- Return %: _____________%

**Match:** [ ] Yes  [ ] No

**Status:** [ ] Pass  [ ] Fail

---

#### TC-CD-008: Scheme-wise Returns

| **Test Case ID** | TC-CD-008 |
|------------------|-----------|
| **Test Case Name** | Verify Scheme-wise Returns |
| **Priority** | High |

**Test Steps:**
1. Open customer portfolio holdings table
2. For each scheme, verify:
   - Current Value = Units × Latest NAV
   - Returns = Current Value - Invested Amount
   - Return % = (Returns / Invested) × 100

**Test Data:**

**Scheme 1:**
- Units: _____________
- Latest NAV: _____________
- Current Value (displayed): _____________
- Current Value (calculated): Units × NAV = _____________
- Match: [ ] Yes  [ ] No

**Scheme 2:**
- Units: _____________
- Latest NAV: _____________
- Current Value (displayed): _____________
- Current Value (calculated): Units × NAV = _____________
- Match: [ ] Yes  [ ] No

**Status:** [ ] Pass  [ ] Fail

---

### Test Suite 4: Transactions View

#### TC-CD-009: View Transaction History

| **Test Case ID** | TC-CD-009 |
|------------------|-----------|
| **Test Case Name** | View Customer Transactions |
| **Priority** | High |

**Test Steps:**
1. Open customer portfolio
2. Click "Transactions" tab
3. Verify transaction table displays

**Expected Result:**
- Transaction table shows:
  - Date
  - Scheme Name
  - Transaction Type (Purchase/Redemption)
  - Units
  - NAV
  - Amount
- Transactions are sorted by date (newest first)
- Pagination works (if many transactions)

**Actual Result:**
- Transaction count displayed: _____________
- Sorting: [ ] Correct  [ ] Incorrect
- Pagination: [ ] Works  [ ] Doesn't work  [ ] N/A

**Status:** [ ] Pass  [ ] Fail

**Screenshot:** _____________

---

---

## Cruise Control Portfolio Snapshots Test Cases

### Test Suite 5: Cruise Control Access

#### TC-CC-001: Navigate to Cruise Control

| **Test Case ID** | TC-CC-001 |
|------------------|-----------|
| **Test Case Name** | Access Cruise Control Dashboard |
| **Priority** | Critical |

**Test Steps:**
1. Login as admin user
2. Click "Cruise Control" in navigation menu
3. Verify page loads

**Expected Result:**
- Cruise Control page opens
- Tabs are visible:
  - NAV Downloads
  - Market Downloads
  - Alerts
  - Portfolio Snapshots
- No console errors
- No 404 errors

**Actual Result:**
- Page loaded: [ ] Yes  [ ] No
- Tabs visible: [ ] All  [ ] Some  [ ] None
- Console errors: [ ] Yes  [ ] No

**Status:** [ ] Pass  [ ] Fail

**Screenshot:** _____________

---

#### TC-CC-002: Navigate to Portfolio Snapshots Tab

| **Test Case ID** | TC-CC-002 |
|------------------|-----------|
| **Test Case Name** | Open Portfolio Snapshots Tab |
| **Priority** | Critical |

**Test Steps:**
1. Navigate to Cruise Control
2. Click "Portfolio Snapshots" tab
3. Verify tab content loads

**Expected Result:**
- Portfolio Snapshots tab opens
- Statistics cards are visible
- No 404 errors in console
- No "Failed to load data" errors

**Actual Result:**
- Tab opened: [ ] Yes  [ ] No
- Statistics cards visible: [ ] Yes  [ ] No
- API endpoint called: _____________
- HTTP status: _____________

**Console Errors:**
```
_____________
```

**Status:** [ ] Pass  [ ] Fail

**Screenshot:** _____________

---

### Test Suite 6: Portfolio Snapshots Statistics

#### TC-CC-003: View Job Statistics

| **Test Case ID** | TC-CC-003 |
|------------------|-----------|
| **Test Case Name** | Display Job Statistics Cards |
| **Priority** | High |

**Test Steps:**
1. Open Cruise Control → Portfolio Snapshots
2. Wait for statistics to load (or see loading state)
3. Verify statistics cards display

**Expected Result:**
Statistics cards show:
- Total Executions
- Successful Executions
- Failed Executions
- Last Execution Date/Time
- Next Scheduled Execution

**Actual Result:**

| Statistic | Value Displayed | Comments |
|-----------|----------------|----------|
| Total Executions | _____________ | _________ |
| Successful | _____________ | _________ |
| Failed | _____________ | _________ |
| Last Execution | _____________ | _________ |
| Next Scheduled | _____________ | _________ |

**All cards display:** [ ] Yes  [ ] No

**Values are numbers:** [ ] Yes  [ ] No

**Status:** [ ] Pass  [ ] Fail

**Screenshot:** _____________

---

#### TC-CC-004: Auto-refresh Statistics

| **Test Case ID** | TC-CC-004 |
|------------------|-----------|
| **Test Case Name** | Verify Auto-refresh (Polling) |
| **Priority** | Medium |

**Test Steps:**
1. Open Portfolio Snapshots tab
2. Open browser dev tools → Network tab
3. Wait 30-60 seconds
4. Check if API calls are made periodically

**Expected Result:**
- API endpoint is called automatically every 30-60 seconds
- Endpoint: `/api/jobs/PORTFOLIO_SNAPSHOT/statistics`
- No need to manually refresh page

**Actual Result:**
- Auto-refresh interval: _____________ seconds
- API endpoint called: _____________
- Number of calls in 2 minutes: _____________

**Auto-refresh working:** [ ] Yes  [ ] No

**Status:** [ ] Pass  [ ] Fail

---

### Test Suite 7: Job Execution History

#### TC-CC-005: View Execution History Table

| **Test Case ID** | TC-CC-005 |
|------------------|-----------|
| **Test Case Name** | Display Job Execution History |
| **Priority** | High |

**Test Steps:**
1. Open Portfolio Snapshots tab
2. Scroll to Execution History section
3. Verify table displays

**Expected Result:**
Execution history table shows:
- Execution ID
- Execution Date/Time
- Status (Success/Failed/Running)
- Trigger Source (Manual/Scheduled)
- Duration
- Details (expandable or link)

**Actual Result:**
- Table visible: [ ] Yes  [ ] No
- Number of executions shown: _____________
- Columns present:
  - [ ] Execution ID
  - [ ] Date/Time
  - [ ] Status
  - [ ] Trigger Source
  - [ ] Duration
  - [ ] Details

**Status:** [ ] Pass  [ ] Fail

**Screenshot:** _____________

---

#### TC-CC-006: Execution Status Indicators

| **Test Case ID** | TC-CC-006 |
|------------------|-----------|
| **Test Case Name** | Verify Status Color Coding |
| **Priority** | Medium |

**Test Steps:**
1. View execution history table
2. Check status indicators for different execution statuses

**Expected Result:**
- Success: Green indicator
- Failed: Red indicator
- Running: Yellow/Orange indicator
- Pending: Gray indicator

**Actual Result:**

| Status | Color | Correct? |
|--------|-------|----------|
| Success | _____________ | [ ] Yes [ ] No |
| Failed | _____________ | [ ] Yes [ ] No |
| Running | _____________ | [ ] Yes [ ] No |

**Status:** [ ] Pass  [ ] Fail

**Screenshot:** _____________

---

### Test Suite 8: Manual Job Trigger

#### TC-CC-007: Manual Snapshot Generation (Button Exists)

| **Test Case ID** | TC-CC-007 |
|------------------|-----------|
| **Test Case Name** | Check Manual Trigger Button |
| **Priority** | High |

**Test Steps:**
1. Open Portfolio Snapshots tab
2. Look for "Generate Snapshots" or "Run Now" button
3. Verify button is visible

**Expected Result:**
- Button is visible
- Button is enabled (not disabled)
- Button has clear label
- Tooltip/help text available (optional)

**Actual Result:**
- Button visible: [ ] Yes  [ ] No
- Button text: _____________
- Button enabled: [ ] Yes  [ ] No
- Tooltip text: _____________

**Status:** [ ] Pass  [ ] Fail

**Screenshot:** _____________

---

#### TC-CC-008: Trigger Manual Snapshot Execution

| **Test Case ID** | TC-CC-008 |
|------------------|-----------|
| **Test Case Name** | Execute Manual Snapshot Generation |
| **Priority** | Critical |

**Test Steps:**
1. Open Portfolio Snapshots tab
2. Click "Generate Snapshots" button
3. Observe response

**Expected Result:**
- Button shows loading state
- Success message displayed after execution
- New execution appears in history table
- Execution status starts as "Running" or "Pending"
- After job completes, status changes to "Success"

**Actual Result:**
- Button clicked at: _____________
- Loading state shown: [ ] Yes  [ ] No
- API endpoint called: _____________
- Response status: _____________
- Success message: _____________
- New execution ID: _____________

**Execution appeared in history:** [ ] Yes  [ ] No

**Status changed to Success:** [ ] Yes  [ ] No  [ ] Still running

**Status:** [ ] Pass  [ ] Fail

**Screenshot:** _____________

---

### Test Suite 9: Job Configuration

#### TC-CC-009: View Job Scheduler Configuration

| **Test Case ID** | TC-CC-009 |
|------------------|-----------|
| **Test Case Name** | View Scheduler Settings |
| **Priority** | Medium |

**Test Steps:**
1. Open Portfolio Snapshots tab
2. Look for "Configuration" or "Settings" section
3. Verify scheduler settings are displayed

**Expected Result:**
Scheduler configuration shows:
- Schedule Type (Weekly/Daily/Monthly)
- Cron Expression (`0 21 * * 5`)
- Next Scheduled Run
- Enabled/Disabled toggle
- Max Retries

**Actual Result:**
- Configuration visible: [ ] Yes  [ ] No
- Schedule Type: _____________
- Cron Expression: _____________
- Next Run: _____________
- Enabled: [ ] Yes  [ ] No
- Max Retries: _____________

**Status:** [ ] Pass  [ ] Fail

**Screenshot:** _____________

---

#### TC-CC-010: Enable/Disable Scheduler

| **Test Case ID** | TC-CC-010 |
|------------------|-----------|
| **Test Case Name** | Toggle Scheduler On/Off |
| **Priority** | Medium |

**Test Steps:**
1. Open Portfolio Snapshots tab
2. Locate scheduler toggle (if available)
3. Toggle scheduler off
4. Verify change is saved
5. Toggle back on

**Expected Result:**
- Toggle is visible
- Clicking toggle changes state
- Change is saved to database
- Confirmation message shown

**Actual Result:**
- Toggle visible: [ ] Yes  [ ] No
- State changed: [ ] Yes  [ ] No
- Saved to DB: [ ] Yes  [ ] No
- Confirmation shown: [ ] Yes  [ ] No

**Status:** [ ] Pass  [ ] Fail  [ ] N/A (Feature not available)

---

### Test Suite 10: Job Execution Details

#### TC-CC-011: View Execution Details

| **Test Case ID** | TC-CC-011 |
|------------------|-----------|
| **Test Case Name** | Expand Execution Details |
| **Priority** | Medium |

**Test Steps:**
1. Open execution history table
2. Click on an execution row to expand details
3. Verify details are shown

**Expected Result:**
Execution details show:
- Execution ID
- Start Time
- End Time
- Duration
- Status
- Error message (if failed)
- Execution data:
  - Number of customers processed
  - Number of snapshots created
  - Number of failures

**Actual Result:**

| Detail | Value |
|--------|-------|
| Execution ID | _____________ |
| Start Time | _____________ |
| End Time | _____________ |
| Duration | _____________ |
| Customers Processed | _____________ |
| Snapshots Created | _____________ |
| Failures | _____________ |

**Details expandable:** [ ] Yes  [ ] No

**Status:** [ ] Pass  [ ] Fail

**Screenshot:** _____________

---

---

## Integration Test Cases

### Test Suite 11: End-to-End Flow

#### TC-INT-001: New Tenant Signup → Snapshot Config Created

| **Test Case ID** | TC-INT-001 |
|------------------|-----------|
| **Test Case Name** | Verify Tenant Seeding Creates Job Config |
| **Priority** | Critical |

**Test Steps:**
1. Sign up a new tenant
2. Note tenant ID: _____________
3. Check database for job scheduler configs

**SQL Query:**
```sql
SELECT * FROM t_job_scheduler_configs
WHERE tenant_id = <NEW_TENANT_ID>
  AND job_type = 'PORTFOLIO_SNAPSHOT';
```

**Expected Result:**
- 2 rows returned (LIVE + TEST)
- Both configs have `is_enabled = true`
- Cron expression is `0 21 * * 5`

**Actual Result:**

| is_live | is_enabled | cron_expression | created_at |
|---------|------------|-----------------|------------|
| true | _____________ | _____________ | _____________ |
| false | _____________ | _____________ | _____________ |

**Status:** [ ] Pass  [ ] Fail

---

#### TC-INT-002: Job Execution → Database Snapshot Created

| **Test Case ID** | TC-INT-002 |
|------------------|-----------|
| **Test Case Name** | Verify Job Creates Snapshots in Database |
| **Priority** | Critical |

**Test Steps:**
1. Trigger manual snapshot generation
2. Wait for job to complete
3. Check database for created snapshots

**SQL Query:**
```sql
SELECT
  snapshot_id,
  customer_id,
  snapshot_date,
  total_value,
  created_at
FROM t_monthly_portfolio_snapshots
WHERE created_at >= CURRENT_DATE
ORDER BY created_at DESC
LIMIT 10;
```

**Expected Result:**
- New snapshots are created
- One snapshot per customer
- `snapshot_date` is month-end date
- `total_value` matches customer portfolio value

**Actual Result:**
- Snapshots created: _____________ rows
- Customers processed: _____________
- Sample snapshot:
  - Customer ID: _____________
  - Snapshot Date: _____________
  - Total Value: _____________

**Status:** [ ] Pass  [ ] Fail

---

#### TC-INT-003: Customer Dashboard Shows Snapshot Data

| **Test Case ID** | TC-INT-003 |
|------------------|-----------|
| **Test Case Name** | Verify Snapshots Display in Customer View |
| **Priority** | High |

**Test Steps:**
1. After snapshots are generated
2. Open a customer's portfolio view
3. Check if historical snapshot data is visible

**Expected Result:**
- Customer dashboard may show historical performance
- Charts may use snapshot data
- Performance tracking enabled

**Actual Result:**
- Historical data visible: [ ] Yes  [ ] No
- Charts use snapshots: [ ] Yes  [ ] No
- Performance tracking: [ ] Yes  [ ] No

**Status:** [ ] Pass  [ ] Fail  [ ] N/A (Feature not implemented yet)

---

---

## Database Verification

### Test Suite 12: Database Integrity

#### TC-DB-001: Job Types Table

```sql
-- Run this query
SELECT
  code,
  name,
  is_active,
  default_cron_expression,
  created_at
FROM m_job_types
WHERE code = 'PORTFOLIO_SNAPSHOT';
```

**Expected:** 1 row

**Actual Result:**
```
_____________
```

**Status:** [ ] Pass  [ ] Fail

---

#### TC-DB-002: Job Scheduler Configs

```sql
-- Run this query (replace <TENANT_ID>)
SELECT
  tenant_id,
  job_type,
  is_live,
  is_enabled,
  cron_expression,
  created_at
FROM t_job_scheduler_configs
WHERE tenant_id = <TENANT_ID>
  AND job_type = 'PORTFOLIO_SNAPSHOT';
```

**Expected:** 2 rows (LIVE + TEST)

**Actual Result:**
```
_____________
```

**Status:** [ ] Pass  [ ] Fail

---

#### TC-DB-003: Job Executions

```sql
-- Run this query
SELECT
  id,
  job_type,
  status,
  execution_time,
  execution_data,
  created_at
FROM t_job_executions
WHERE job_type = 'PORTFOLIO_SNAPSHOT'
ORDER BY created_at DESC
LIMIT 5;
```

**Expected:** Rows if jobs have been executed

**Actual Result:**
```
_____________
```

**Status:** [ ] Pass  [ ] Fail

---

#### TC-DB-004: Portfolio Snapshots

```sql
-- Run this query
SELECT
  COUNT(*) as total_snapshots,
  COUNT(DISTINCT customer_id) as unique_customers,
  MAX(created_at) as latest_snapshot
FROM t_monthly_portfolio_snapshots;
```

**Expected:** Snapshots exist if job has run

**Actual Result:**
```
Total Snapshots: _____________
Unique Customers: _____________
Latest Snapshot: _____________
```

**Status:** [ ] Pass  [ ] Fail

---

---

## Test Results Summary

### Overall Test Results

**Total Test Cases:** 35

| Category | Total | Passed | Failed | Blocked | Not Run |
|----------|-------|--------|--------|---------|---------|
| Customer Dashboard | 9 | _____ | _____ | _____ | _____ |
| Cruise Control | 17 | _____ | _____ | _____ | _____ |
| Integration | 3 | _____ | _____ | _____ | _____ |
| Database | 4 | _____ | _____ | _____ | _____ |
| **TOTAL** | **33** | **_____** | **_____** | **_____** | **_____** |

**Pass Rate:** _____________ %

---

### Critical Issues Found

| Issue ID | Severity | Description | Test Case | Status |
|----------|----------|-------------|-----------|--------|
| ISS-001 | [ ] Critical [ ] High [ ] Medium [ ] Low | _____________ | _____________ | _____________ |
| ISS-002 | [ ] Critical [ ] High [ ] Medium [ ] Low | _____________ | _____________ | _____________ |
| ISS-003 | [ ] Critical [ ] High [ ] Medium [ ] Low | _____________ | _____________ | _____________ |

---

### Blockers

| Blocker ID | Description | Impact | Resolution |
|------------|-------------|--------|------------|
| BLK-001 | _____________ | _____________ | _____________ |
| BLK-002 | _____________ | _____________ | _____________ |

---

### Environment Issues

| Issue | Description | Resolution |
|-------|-------------|------------|
| Backend not starting | _____________ | _____________ |
| Database connection | _____________ | _____________ |
| API endpoint 404 | _____________ | _____________ |

---

### Recommendations

1. _____________
2. _____________
3. _____________

---

### Sign-off

**Tested By:** _____________

**Date:** _____________

**Approved By:** _____________

**Date:** _____________

---

**END OF TEST CASES**
