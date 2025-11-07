# KewalInvest System Architecture - Complete Guide

## 1. Donut Chart Issue - Single Line Without Division

### Problem
The donut chart in the Overview window shows only a single line without division of slices.

### Root Cause
This happens when:

**A) All holdings belong to ONE category**
```javascript
// If portfolio.allocation looks like:
[
  { category: "Equity", percentage: 100, current_value: 500000 }
]
// Result: Single slice = full circle = appears as a line
```

**B) Data has zero/negative percentages**
```javascript
// Lines 52-53 in PortfolioDonutChart.tsx:
const data = allocation
  .filter(item => item.percentage > 0 && item.current_value > 0)
```

**C) Category field is missing/null in database**
```sql
-- Check t_customer_master_portfolio table:
SELECT category, COUNT(*)
FROM t_customer_master_portfolio
WHERE customer_id = X
GROUP BY category;

-- If all are NULL or same category, donut will be single color
```

### Solution
1. **Check Data in Database**:
   ```sql
   -- Verify scheme categorization
   SELECT
     cmp.scheme_code,
     cmp.scheme_name,
     cmp.category,
     cmp.sub_category
   FROM t_customer_master_portfolio cmp
   WHERE cmp.customer_id = YOUR_CUSTOMER_ID;
   ```

2. **Update Missing Categories**:
   ```sql
   -- Update from scheme master
   UPDATE t_customer_master_portfolio cmp
   SET category = sm.category,
       sub_category = sm.sub_category
   FROM t_scheme_masters sm
   WHERE cmp.scheme_code = sm.scheme_code
   AND cmp.category IS NULL;
   ```

3. **Frontend Fix** (if data is correct but still not showing):
   - Check browser console for errors
   - Verify `portfolio.allocation` has multiple categories with percentages
   - Clear cache and hard refresh (Ctrl+Shift+R)

### How Allocation is Calculated

File: `backend/src/utils/portfolio.util.ts` (lines 169-220)

```typescript
static calculateCategoryAllocation(holdings, totalValue) {
  // 1. Group by category
  const categoryMap = new Map();

  holdings.forEach(holding => {
    const category = holding.category || 'Uncategorized';
    // Aggregate total_invested, current_value, scheme_count
  });

  // 2. Calculate percentages
  return categories.map(cat => ({
    category: cat.name,
    percentage: (cat.current_value / totalValue) * 100,
    current_value: cat.current_value,
    // ... other fields
  }));
}
```

---

## 2. Tsheet Upload - Tables and Flow

### When Tsheet (Transaction Sheet) is Uploaded:

#### Step 1: File Upload
**Table**: `t_file_uploads`
```sql
CREATE TABLE t_file_uploads (
    id SERIAL PRIMARY KEY,
    file_name VARCHAR(255),
    file_size INTEGER,
    file_type VARCHAR(50),
    uploaded_by INTEGER,
    tenant_id INTEGER,
    is_live BOOLEAN,
    created_at TIMESTAMP
);
```

#### Step 2: Import Session Creation
**Table**: `t_import_sessions`
```sql
CREATE TABLE t_import_sessions (
    id SERIAL PRIMARY KEY,
    file_upload_id INTEGER REFERENCES t_file_uploads(id),
    session_type VARCHAR(50), -- 'transaction', 'customer', 'scheme'
    status VARCHAR(50), -- 'pending', 'processing', 'completed', 'failed'
    total_rows INTEGER,
    processed_rows INTEGER,
    success_count INTEGER,
    error_count INTEGER,
    duplicate_count INTEGER,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    tenant_id INTEGER,
    is_live BOOLEAN
);
```

#### Step 3: Staging Data
**Table**: `t_import_staging_data`
```sql
CREATE TABLE t_import_staging_data (
    id SERIAL PRIMARY KEY,
    session_id INTEGER REFERENCES t_import_sessions(id),
    row_number INTEGER,
    raw_data JSONB, -- Original CSV row data
    mapped_data JSONB, -- After field mapping
    validation_status VARCHAR(50),
    validation_errors JSONB,
    processing_status VARCHAR(50),
    processing_result TEXT,
    tenant_id INTEGER,
    is_live BOOLEAN,
    created_at TIMESTAMP
);
```

#### Step 4: Field Mappings
**Table**: `t_import_field_mappings`
```sql
CREATE TABLE t_import_field_mappings (
    id SERIAL PRIMARY KEY,
    session_id INTEGER REFERENCES t_import_sessions(id),
    csv_field VARCHAR(255), -- Header from CSV
    db_field VARCHAR(255), -- Database column name
    mapping_config JSONB, -- Transform rules
    tenant_id INTEGER,
    is_live BOOLEAN
);
```

#### Step 5: Final Transaction Records
**Table**: `t_transaction_table`
```sql
CREATE TABLE t_transaction_table (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES t_customers(id),
    scheme_code VARCHAR(50),
    scheme_name VARCHAR(255),
    folio_no VARCHAR(100),
    txn_type_id INTEGER, -- References m_transaction_types
    txn_date DATE,
    total_amount DECIMAL(15,2),
    units DECIMAL(15,4),
    nav DECIMAL(10,4),
    stamp_duty DECIMAL(10,2),
    is_potential_duplicate BOOLEAN,
    portfolio_flag BOOLEAN, -- Include in portfolio calculations

    -- Import tracking
    staging_record_id INTEGER REFERENCES t_import_staging_data(id),
    import_session_id INTEGER REFERENCES t_import_sessions(id),
    duplicate_reason TEXT,

    tenant_id INTEGER,
    is_live BOOLEAN,
    created_at TIMESTAMP
);
```

#### Step 6: Portfolio Master Update
**Table**: `t_customer_master_portfolio`
```sql
CREATE TABLE t_customer_master_portfolio (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER,
    scheme_code VARCHAR(50),
    scheme_name VARCHAR(255),
    folio_no VARCHAR(100),

    -- Categorization (from scheme master)
    category VARCHAR(100), -- Equity, Debt, Hybrid, etc.
    sub_category VARCHAR(100), -- Large Cap, Mid Cap, etc.
    fund_name VARCHAR(255),
    start_date DATE, -- First transaction date

    tenant_id INTEGER,
    is_live BOOLEAN,
    UNIQUE(customer_id, scheme_code, tenant_id, is_live)
);
```

### Complete Tsheet Upload Flow:

```
1. Upload Excel/CSV
   └─> t_file_uploads (record created)

2. Create Import Session
   └─> t_import_sessions (status: 'pending')

3. Parse & Stage Data
   └─> t_import_staging_data (each row stored with raw_data)

4. Map Fields
   └─> t_import_field_mappings (CSV headers → DB columns)

5. Validate Data
   └─> t_import_staging_data.validation_status updated
   └─> Checks: customer exists, scheme valid, date format, etc.

6. Process Valid Records
   For each valid row:
     a) Create/Update Customer (if needed)
        └─> t_customers

     b) Create Transaction
        └─> t_transaction_table (with staging_record_id)

     c) Update Portfolio Master
        └─> t_customer_master_portfolio (UPSERT by customer+scheme)
        └─> Enriches with category/sub_category from t_scheme_masters

7. Log Results
   └─> t_import_record_results (success/failure for each record)
   └─> t_import_sessions (final counts updated)
```

---

## 3. Portfolio Storage - Tables

### Primary Tables:

#### A) `t_customer_master_portfolio`
- **Purpose**: Master list of all scheme holdings per customer
- **What it stores**:
  - Customer-Scheme relationship
  - Category (Equity/Debt/Hybrid)
  - Sub-category (Large Cap, etc.)
  - Folio numbers
  - Start date

#### B) `t_transaction_table`
- **Purpose**: All buy/sell/dividend transactions
- **What it stores**:
  - Transaction details (amount, units, NAV, date)
  - Transaction type (Purchase/Redemption/Dividend)
  - Links to import session
  - Duplicate detection flags
  - `portfolio_flag` (include/exclude from calculations)

#### C) `t_scheme_masters`
- **Purpose**: Master scheme information
- **What it stores**:
  - Scheme metadata
  - Category/Sub-category
  - AMC details
  - Scheme type

#### D) `t_nav_data`
- **Purpose**: Daily NAV values for schemes
- **What it stores**:
  - Scheme code
  - Date
  - NAV value
  - Used for current value calculations

---

## 4. Portfolio Calculations

### What is Calculated:

File: `backend/src/services/portfolio.service.ts`

#### A) **Customer Portfolio Summary**
```typescript
// Calculated from t_transaction_table where portfolio_flag = true

1. Total Invested (SUM of all Purchase transactions)
2. Current Value (Units × Latest NAV from t_nav_data)
3. Returns (Current Value - Total Invested)
4. Return % ((Returns / Total Invested) × 100)
5. Day Change (Current NAV - Previous NAV)
```

#### B) **Per-Scheme Holdings**
For each scheme in customer portfolio:
```typescript
{
  scheme_code: string,
  scheme_name: string,
  folio_no: string,
  category: string, // From t_customer_master_portfolio

  // Calculated from transactions:
  total_invested: SUM(purchase_amount) - SUM(redemption_amount),
  total_units: SUM(purchase_units) - SUM(redemption_units),

  // From latest NAV:
  current_nav: Latest NAV from t_nav_data,
  current_value: total_units × current_nav,

  // Derived:
  returns: current_value - total_invested,
  return_percentage: (returns / total_invested) × 100,
  allocation_percentage: (current_value / total_portfolio_value) × 100
}
```

#### C) **Category Allocation**
```typescript
// File: backend/src/utils/portfolio.util.ts
// Function: calculateCategoryAllocation()

// Groups holdings by category:
{
  category: "Equity",
  total_invested: SUM(all equity holdings invested),
  current_value: SUM(all equity holdings current value),
  percentage: (current_value / total_portfolio) × 100,
  scheme_count: COUNT of schemes in this category,
  returns: current_value - total_invested,
  return_percentage: (returns / total_invested) × 100
}
```

#### D) **Performance Metrics**
```typescript
// Calculated over time periods (1M, 3M, 6M, 1Y, 3Y):

XIRR (Extended Internal Rate of Return):
- Uses all transactions with dates
- Calculates annualized return considering timing of cash flows

Absolute Returns:
- (Current Value - Invested) / Invested × 100

Day Change:
- (Today's NAV - Yesterday's NAV) / Yesterday's NAV × 100
```

### Calculation Queries:

**Get Total Invested:**
```sql
SELECT
  SUM(CASE WHEN txn_type = 'Purchase' THEN total_amount ELSE 0 END) as invested,
  SUM(CASE WHEN txn_type = 'Redemption' THEN total_amount ELSE 0 END) as redeemed
FROM t_transaction_table
WHERE customer_id = ?
  AND portfolio_flag = true;
```

**Get Current Value:**
```sql
SELECT
  tt.scheme_code,
  SUM(CASE WHEN txn_type = 'Purchase' THEN units
           WHEN txn_type = 'Redemption' THEN -units
           ELSE 0 END) as total_units,
  nd.nav as current_nav,
  (total_units * nd.nav) as current_value
FROM t_transaction_table tt
LEFT JOIN LATERAL (
  SELECT nav
  FROM t_nav_data
  WHERE scheme_code = tt.scheme_code
  ORDER BY nav_date DESC
  LIMIT 1
) nd ON true
WHERE tt.customer_id = ?
  AND tt.portfolio_flag = true
GROUP BY tt.scheme_code, nd.nav;
```

---

## 5. Goal Allocation Percentages - Storage

### Tables Involved:

#### A) `t_jtbd_configurations` (Goals are stored here)
```sql
-- Goals are a type of JTBD configuration
SELECT * FROM t_jtbd_configurations
WHERE jtbd_category = 'transactional'
  AND jtbd_type = 'goal_tracking';

-- config_data JSONB structure for goals:
{
  "goal_type": "time_based" | "price_based" | "time_and_price",
  "target_amount": 5000000,
  "target_date": "2030-12-31",
  "monthly_contribution": 25000,
  "risk_profile": "moderate",

  // Asset Allocation Percentages:
  "asset_allocation": {
    "Equity": 60,
    "Debt": 30,
    "Hybrid": 10
  },

  // Scheme-wise allocation (if manual):
  "scheme_allocations": [
    {
      "scheme_code": "INF123456",
      "scheme_name": "ABC Equity Fund",
      "allocation_percentage": 40,
      "category": "Equity"
    },
    {
      "scheme_code": "INF789012",
      "scheme_name": "XYZ Debt Fund",
      "allocation_percentage": 30,
      "category": "Debt"
    }
  ]
}
```

#### B) `t_jtbd_executions` (SIP execution tracking)
```sql
-- When monthly_contribution is set, 120 execution records are created
SELECT * FROM t_jtbd_executions
WHERE config_id = ? -- goal ID
  AND execution_type = 'goal_sip_plan';

-- execution_data JSONB for SIP:
{
  "amount": 25000,
  "month_number": 1, // 1-120
  "total_months": 120,

  // Distributed by allocation %:
  "allocations": [
    {
      "scheme_code": "INF123456",
      "amount": 10000, // 40% of 25000
      "percentage": 40
    },
    {
      "scheme_code": "INF789012",
      "amount": 7500, // 30% of 25000
      "percentage": 30
    }
  ]
}
```

### How Goal Allocations Work:

**1. Creating a Goal with Allocations:**
```typescript
// Frontend: GoalSetupModal.tsx
// User specifies:
- Target amount: ₹50L
- Monthly SIP: ₹25,000
- Allocation:
  * Equity schemes: 60% (₹15,000/month)
  * Debt schemes: 30% (₹7,500/month)
  * Others: 10% (₹2,500/month)

// Saved to:
t_jtbd_configurations.config_data.asset_allocation = {
  "Equity": 60,
  "Debt": 30,
  "Others": 10
}
```

**2. Backend Processing:**
```typescript
// File: backend/src/services/goal.service.ts
// When creating goal with monthly_contribution:

async createGoal(data) {
  // 1. Create goal record in t_jtbd_configurations
  const goal = await createJTBDConfig({
    jtbd_category: 'transactional',
    jtbd_type: 'goal_tracking',
    config_data: {
      target_amount: data.target_amount,
      monthly_contribution: data.monthly_contribution,
      asset_allocation: data.asset_allocation // The % allocations
    }
  });

  // 2. Auto-create 120 SIP execution records
  for (let month = 1; month <= 120; month++) {
    await createExecution({
      config_id: goal.id,
      execution_type: 'goal_sip_plan',
      scheduled_date: addMonths(startDate, month),
      execution_data: {
        amount: data.monthly_contribution,
        month_number: month,
        allocations: distributeByPercentage(
          data.monthly_contribution,
          data.asset_allocation
        )
      }
    });
  }
}
```

**3. Tracking Actual Investments:**
```typescript
// When user makes actual SIP payment:
// Update execution record:
UPDATE t_jtbd_executions
SET
  execution_status = 'completed',
  execution_date = '2025-11-07',
  execution_data = jsonb_set(
    execution_data,
    '{transaction_id}',
    '"TXN123456"' // Link to t_transaction_table
  )
WHERE id = ?;
```

**4. Goal Progress Calculation:**
```typescript
// File: backend/src/services/goal.service.ts
// Function: calculateGoalProgress()

// Fetches:
1. Target amount from config_data.target_amount
2. Current allocation from config_data.asset_allocation
3. Actual invested = SUM of completed executions
4. Current value = Fetch from portfolio holdings matching allocated schemes

// Returns:
{
  goal_id: 123,
  target_amount: 5000000,
  current_value: 750000,
  progress_percentage: 15, // (750000 / 5000000) × 100
  months_elapsed: 30,
  months_remaining: 90,
  on_track: true/false, // Based on expected vs actual

  allocation_utilization: {
    "Equity": {
      target_percentage: 60,
      actual_percentage: 58,
      target_amount: 3000000,
      current_amount: 435000,
      variance: -2 // Percentage points off
    }
  }
}
```

### Where to Find Allocation Percentages:

**In Database:**
```sql
-- Get goal with allocations
SELECT
  id,
  title,
  config_data->>'target_amount' as target,
  config_data->'asset_allocation' as allocations,
  config_data->'scheme_allocations' as scheme_allocations
FROM t_jtbd_configurations
WHERE jtbd_type = 'goal_tracking'
  AND customer_id = ?;

-- Example result:
{
  "asset_allocation": {
    "Equity": 60,
    "Debt": 30,
    "Hybrid": 10
  }
}
```

**In API Response:**
```json
GET /api/goals/:id

{
  "id": 123,
  "title": "Retirement Fund",
  "goal_type": "time_based",
  "target_amount": 5000000,
  "monthly_contribution": 25000,

  "config": {
    "asset_allocation": {
      "Equity": 60,
      "Debt": 30,
      "Hybrid": 10
    },
    "scheme_allocations": [
      {
        "scheme_code": "INF123456",
        "scheme_name": "ABC Equity Fund",
        "allocation_percentage": 40,
        "monthly_amount": 10000
      }
    ]
  }
}
```

---

## Summary Table

| **Question** | **Primary Tables** | **Key Fields** |
|--------------|-------------------|----------------|
| Tsheet Upload | `t_import_sessions`, `t_import_staging_data`, `t_transaction_table` | `session_id`, `raw_data`, `mapped_data` |
| Portfolio Storage | `t_customer_master_portfolio`, `t_transaction_table`, `t_nav_data` | `category`, `portfolio_flag`, `nav` |
| Portfolio Calculations | Computed from transactions + NAV | `total_invested`, `current_value`, `returns` |
| Goal Allocations | `t_jtbd_configurations.config_data` | `asset_allocation`, `scheme_allocations` |
| Donut Chart Data | Computed via `calculateCategoryAllocation()` | `category`, `percentage`, `current_value` |

---

## Debugging Donut Chart Issue - Step by Step

1. **Check Customer Portfolio**:
```sql
SELECT
  cmp.category,
  COUNT(*) as scheme_count,
  SUM(tt.total_amount) as total_invested
FROM t_customer_master_portfolio cmp
LEFT JOIN t_transaction_table tt ON tt.scheme_code = cmp.scheme_code
WHERE cmp.customer_id = YOUR_CUSTOMER_ID
GROUP BY cmp.category;
```

2. **If All NULL or Single Category**:
```sql
-- Update from scheme master
UPDATE t_customer_master_portfolio cmp
SET
  category = sm.category,
  sub_category = sm.sub_category
FROM t_scheme_masters sm
WHERE cmp.scheme_code = sm.scheme_code
  AND cmp.customer_id = YOUR_CUSTOMER_ID;
```

3. **Verify API Response**:
```bash
curl http://localhost:8080/api/portfolio/customer/YOUR_CUSTOMER_ID
# Check allocation array has multiple categories
```

4. **Check Frontend Console**:
```javascript
// In browser console:
console.log('Portfolio Allocation:', portfolio.allocation);
// Should show array with multiple categories
```

