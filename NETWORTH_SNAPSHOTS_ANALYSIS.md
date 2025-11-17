# Networth and Monthly Snapshots Implementation Analysis

## Executive Summary

The kewalinvest application implements a comprehensive portfolio snapshot system that captures monthly networth data for customers. This enables historical tracking, performance analysis, and future value projections. The system is designed with automated scheduling, manual trigger capabilities, and robust error handling with retry logic.

---

## 1. Database Schema

### Core Tables

#### `t_monthly_portfolio_snapshots`
The primary table storing monthly portfolio snapshots:

```sql
CREATE TABLE t_monthly_portfolio_snapshots (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL,
    is_live BOOLEAN NOT NULL,
    customer_id INTEGER NOT NULL,
    snapshot_month_end DATE NOT NULL,          -- Month-end date of snapshot
    total_invested NUMERIC(18,2),              -- Net invested amount
    current_value NUMERIC(18,2),               -- Current market value
    total_returns NUMERIC(18,2),               -- Absolute returns
    return_percentage NUMERIC(10,2),           -- Return percentage
    total_units NUMERIC(18,4),                 -- Total units held
    total_schemes INTEGER,                     -- Number of schemes
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Key Metrics Tracked:**
- `total_invested`: Net invested amount (Purchases - Redemptions)
- `current_value`: Current market value based on latest NAV
- `total_returns`: Absolute returns (current_value - total_invested)
- `return_percentage`: Return percentage
- `total_units`: Total units held across schemes
- `total_schemes`: Count of active schemes

---

#### `t_portfolio_snapshot_configs`
Scheduler configuration table:

```sql
CREATE TABLE t_portfolio_snapshot_configs (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES t_tenants(id),
    user_id INTEGER NOT NULL REFERENCES t_users(id),
    is_live BOOLEAN NOT NULL,
    schedule_type VARCHAR(20) NOT NULL DEFAULT 'weekly',    -- 'weekly', 'monthly', 'custom'
    cron_expression VARCHAR(100) NOT NULL DEFAULT '0 21 * * 5',  -- Friday 9 PM
    is_enabled BOOLEAN NOT NULL DEFAULT true,
    last_executed_at TIMESTAMP,
    next_execution_at TIMESTAMP,
    execution_count INTEGER NOT NULL DEFAULT 0,
    failure_count INTEGER NOT NULL DEFAULT 0,
    max_retries INTEGER NOT NULL DEFAULT 3,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_snapshot_scheduler UNIQUE(tenant_id, is_live),
    CONSTRAINT valid_schedule_type CHECK (schedule_type IN ('weekly', 'monthly', 'custom'))
);
```

**Default Schedule:**
- Type: Weekly
- Cron: `0 21 * * 5` (Friday at 9:00 PM)
- Retries: 3 attempts with exponential backoff (5min, 15min, 30min)

---

#### `t_portfolio_snapshot_executions`
Execution history and audit log:

```sql
CREATE TABLE t_portfolio_snapshot_executions (
    id SERIAL PRIMARY KEY,
    scheduler_config_id INTEGER NOT NULL REFERENCES t_portfolio_snapshot_configs(id),
    tenant_id INTEGER NOT NULL,
    is_live BOOLEAN NOT NULL,
    execution_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) NOT NULL,              -- success, failed, running, retrying, skipped
    trigger_source VARCHAR(20) NOT NULL,      -- scheduled, manual
    snapshot_month_end DATE,                  -- Month-end date processed
    customers_processed INTEGER DEFAULT 0,
    customers_failed INTEGER DEFAULT 0,
    snapshots_created INTEGER DEFAULT 0,
    snapshots_updated INTEGER DEFAULT 0,
    retry_attempt INTEGER DEFAULT 0,
    error_message TEXT,
    error_details JSONB,
    execution_duration_ms INTEGER,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

---

#### `t_goal_progress_snapshots`
Goal-related snapshots with projections:

```sql
CREATE TABLE t_goal_progress_snapshots (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL,
    is_live BOOLEAN NOT NULL,
    goal_id INTEGER NOT NULL,
    snapshot_date DATE NOT NULL,
    current_value NUMERIC(15,2) NOT NULL,
    monthly_contribution NUMERIC(15,2) NOT NULL,
    projected_corpus NUMERIC(15,2),
    projected_achievement_date DATE,
    probability_of_success NUMERIC(5,2),
    on_track BOOLEAN,
    deviation_percentage NUMERIC(5,2),
    recalculation_trigger VARCHAR(50)
);
```

---

## 2. How Monthly Snapshots Are Calculated

### Snapshot Calculation Process

**File:** `/backend/src/services/portfolioSnapshot.service.ts`

The `calculateSnapshotData()` method computes portfolio metrics as of a specific date:

```typescript
private async calculateSnapshotData(
  customerId: number,
  asOfDate: Date,
  tenantId: number,
  isLive: boolean
): Promise<PortfolioSnapshotData>
```

### Calculation Steps:

1. **Query Customer Transactions**
   - Retrieves all transactions (Addition/Deduction) up to `asOfDate`
   - Filters by `portfolio_flag = true` to include only investment transactions
   - Groups by scheme_code

2. **Calculate Units & Amounts**
   ```
   total_units_purchased = SUM(units WHERE txn_type = 'Addition')
   total_units_redeemed = SUM(units WHERE txn_type = 'Deduction')
   net_units = total_units_purchased - total_units_redeemed
   
   total_invested = SUM(amount WHERE txn_type = 'Addition')
   total_redemption_proceeds = SUM(amount WHERE txn_type = 'Deduction')
   net_invested = total_invested - total_redemption_proceeds
   ```

3. **Fetch Latest NAV**
   - Gets the most recent NAV for each scheme as of `asOfDate`
   - Only includes schemes with net_units > 0.001

4. **Calculate Current Value**
   ```
   current_value = SUM(net_units * scheme_nav)
   ```

5. **Calculate Returns**
   ```
   total_returns = current_value - net_invested
   return_percentage = (total_returns / net_invested) * 100
   ```

6. **Count Metrics**
   - `total_units`: Sum of net units across all schemes
   - `total_schemes`: Count of schemes with holdings

### Key Features:
- **NET Invested Calculation**: Returns are calculated on net invested amount (purchases minus redemptions)
- **No Future Dates**: Only uses transactions and NAV data up to `asOfDate`
- **Decimal Precision**: Units tracked to 4 decimal places, amounts to 2 decimal places

---

## 3. What Data Is Included in Snapshots

### Portfolio Snapshot Data Structure

```typescript
interface PortfolioSnapshotData {
  customer_id: number;
  snapshot_month_end: Date;
  total_invested: number;           // NET invested amount
  current_value: number;            // Market value at snapshot date
  total_returns: number;            // Absolute returns
  return_percentage: number;        // Return percentage
  total_units: number;              // Total units held
  total_schemes: number;            // Active scheme count
}
```

### Frontend Representation

The `PortfolioSnapshotsTable` component displays snapshots with scheme-level details:

**Monthly Data Per Scheme:**
- `closing_units`: Units held at month-end
- `closing_nav`: NAV at month-end
- `market_value`: Current market value
- `month_change_percentage`: Month-over-month performance
- `has_nav_data`: Flag indicating NAV data availability

**Summary Metrics:**
- Portfolio-wide totals
- Asset allocation by category
- Performance trends
- Daily changes

---

## 4. Frontend Visualization of Snapshots

### Components

#### `PortfolioSnapshotsTab.tsx`
**Location:** `/frontend/src/pages/cruiseControl/PortfolioSnapshotsTab.tsx`

Provides complete snapshot management interface:

**Features:**
- Configuration display (schedule type, next run)
- Execution statistics (success rate, duration, total executions)
- Manual operation triggers (Generate Missing, Update All, Regenerate, Drop All)
- Execution history table with pagination
- Real-time refresh (every 30 seconds)

**Status Indicators:**
- Success: Green with checkmark
- Failed: Red with X icon
- Running: Blue with activity indicator
- Retrying: Orange with clock icon

---

#### `PortfolioSnapshotsTable.tsx`
**Location:** `/frontend/src/components/portfolio/PortfolioSnapshotsTable.tsx`

Expandable tree-view table showing scheme-level snapshots:

**Features:**
- Scheme-level grouping
- Expandable rows showing:
  - 📦 Units (closing units)
  - 💰 NAV (closing net asset value)
  - 📊 Market Value (market value at month-end)
  - 📈 Performance (month-over-month change)
- Month headers with current month highlighted
- Expand/Collapse All buttons
- Interactive chart modal for scheme performance

**Formatting:**
- Units: 3 decimal places (e.g., `150.234`)
- NAV: Currency format (e.g., `₹150.45`)
- Market Value: Lakhs format (e.g., `₹2.50L`)
- Performance: Percentage with color coding (green: positive, red: negative)

---

### Data Flow

```
Frontend Hook (usePortfolioSnapshots)
    ↓
PortfolioService.getMonthlySnapshots(customerId, months)
    ↓
API: GET /api/portfolio/{customerId}/snapshots?months=12
    ↓
Backend returns:
{
  data: {
    schemes: [
      {
        scheme_code: "INF090K01XX0",
        scheme_name: "Scheme Name",
        category: "Equity",
        monthly_data: [
          {
            month_display: "Nov 2024",
            closing_units: 150.234,
            closing_nav: 45.67,
            market_value: 6850.50,
            month_change_percentage: 2.45,
            has_nav_data: true
          },
          ...
        ]
      },
      ...
    ]
  }
}
```

---

## 5. Projection and Future Value Calculations

### Goal Projection System

**File:** `/backend/src/services/goal.calculator.service.ts`

The system includes sophisticated projection capabilities for goals:

### Projection Methods

#### 1. Future Value Calculation (FV of Annuity)
```typescript
calculateFutureValue(
  presentValue: number,
  monthlyPayment: number,
  annualRate: number,
  months: number
): number

FV = PV * (1 + r)^n + PMT * [((1 + r)^n - 1) / r] * (1 + r)
```

where:
- `PV`: Present value (current corpus)
- `PMT`: Monthly payment (SIP amount)
- `r`: Monthly rate (annual rate / 12 / 100)
- `n`: Number of months

#### 2. Required SIP Calculation
```typescript
calculateRequiredSIP(
  targetAmount: number,
  currentValue: number,
  months: number,
  annualRate: number
): number

Solves: targetAmount = FV(currentValue, SIP, rate, months)
For SIP value
```

#### 3. Months to Target Calculation
```typescript
calculateMonthsToTarget(
  targetAmount: number,
  currentValue: number,
  monthlySIP: number,
  annualRate: number
): number

Numerically solves for n where:
targetAmount = FV(currentValue, monthlySIP, rate, n)
```

#### 4. Monte Carlo Simulation (Probability of Success)
```typescript
monteCarloSimulation(
  currentValue: number,
  monthlySIP: number,
  targetAmount: number,
  months: number,
  expectedReturn: number,
  returnVolatility: number = 15,    // Standard deviation %
  simulations: number = 1000
): number

Returns: Probability of reaching target (0-100%)
```

**Process:**
1. Runs 1000 simulations
2. Each month generates random return based on normal distribution
3. Applies return and adds SIP contribution
4. Counts successes (final value >= target)
5. Returns success percentage

---

### Goal Projection Storage

**Database:** `t_goal_progress_snapshots`

Stores calculated projections:
- `projected_corpus`: Estimated value at goal date
- `projected_achievement_date`: Estimated date to reach target
- `probability_of_success`: Monte Carlo success probability
- `on_track`: Boolean indicating if on pace
- `deviation_percentage`: Variance from plan

---

### Projection Inputs

**Time-Based Goals** (Target Date)
- Current portfolio value
- Monthly contribution
- Expected annual return rate (%)
- Inflation rate (%)
- Time to target date (months)

**Price-Based Goals** (Target Amount)
- Current portfolio value
- Monthly SIP amount
- Expected annual return rate (%)
- Target amount

---

## 6. Snapshot Operation Types

The system supports multiple snapshot operations:

### 1. Generate Missing (Safe - CREATE Only)
- Creates snapshots for months that don't have records
- Never updates existing snapshots
- Safe operation for backfilling
- Tracks skipped (existing) snapshots

### 2. Update All (CREATE + UPDATE)
- Creates missing snapshots
- Recalculates existing snapshots with latest NAV
- Current default behavior during scheduled runs

### 3. Regenerate All (DROP + CREATE)
- Deletes all existing snapshots
- Creates fresh snapshots from scratch
- Dangerous operation (data loss)
- Used for fixing corrupted data

### 4. Drop All (DELETE Only)
- Deletes all snapshots for tenant
- Very dangerous operation
- No automatic recovery

---

## 7. Networth Tracking Summary

### Current Networth Components

**Portfolio Networth = All Holdings Total**
```
Networth = SUM(current_value) for all active schemes
         = SUM(units * current_nav) for each scheme
         = Snapshots.current_value
```

### Networth History
- Monthly snapshots enable historical tracking
- Full timeline available from first transaction
- Performance trends calculated from snapshots
- Month-over-month changes tracked

### Data Points per Customer
- **Monthly Snapshots**: One per month-end (indexed by `snapshot_month_end`)
- **Performance Metrics**: Current value, returns, return percentage
- **Asset Composition**: Total schemes, total units
- **Historical Context**: Full timeline from first investment

### Automatic Calculation
- **Frequency**: Weekly (Friday 9 PM) by default
- **Scope**: All active customers per tenant
- **Recalculation**: Latest NAV used always
- **History**: Extends from first transaction to last month

### Manual Triggers
- Generate Missing: Fill gaps in snapshot history
- Update All: Recalculate all snapshots with current data
- Dashboard accessible at: `/pages/cruiseControl/PortfolioSnapshotsTab`

---

## 8. Architecture Flow

```
[Monthly Scheduler] ← [Cron: Friday 9 PM]
        ↓
[PortfolioSnapshotSchedulerService]
        ↓
[PortfolioSnapshotService.generateSnapshots()]
        ↓
For each customer:
    - calculateSnapshotData(customer_id, last_month_end)
    - Check if snapshot exists
    - Create or Update t_monthly_portfolio_snapshots
    ↓
[Log execution] → t_portfolio_snapshot_executions
        ↓
[Frontend Dashboard] (PortfolioSnapshotsTab)
    - Display execution history
    - Show statistics
    - Offer manual operations
        ↓
[Portfolio View] (PortfolioSnapshotsTable)
    - Display historical snapshots
    - Show scheme-level details
    - Display performance trends
```

---

## 9. Key Integration Points

### With NAV System
- Uses `t_nav_data` table for latest NAV per scheme
- Falls back to latest available NAV if current date has no data
- Handles NAV data unavailability gracefully

### With Transaction System
- Reads from `t_transaction_table`
- Filters by `portfolio_flag = true`
- Groups by `scheme_code`
- Distinguishes Addition vs Deduction transactions

### With Goal System
- Goals use `t_goal_progress_snapshots` for tracking
- Separate from portfolio snapshots
- Stores projected corpus and probability of success
- Linked to `t_jtbd_configurations` (Job To Be Done)

---

## 10. Error Handling & Retry Logic

### Retry Strategy
- **Max Retries**: 3 (configurable)
- **Exponential Backoff**:
  - Attempt 0 (first retry): 5 minutes
  - Attempt 1 (second retry): 15 minutes
  - Attempt 2 (third retry): 30 minutes

### Failure Tracking
- Execution status: running → failed/success/retrying
- Customer-level errors tracked separately
- Month-level errors logged with details
- Error messages and JSON details stored

### Status States
- `success`: Completed successfully
- `failed`: Failed after all retries
- `running`: Currently executing
- `retrying`: Failed once, retrying
- `skipped`: Intentionally skipped

---

## Summary Table

| Aspect | Details |
|--------|---------|
| **Primary Table** | `t_monthly_portfolio_snapshots` |
| **Monthly Metrics** | Invested, Current Value, Returns, % Return, Units, Schemes |
| **Update Frequency** | Weekly (Friday 9 PM, configurable) |
| **Historical Data** | From first transaction to last month |
| **Frontend Display** | Expandable tree with scheme-level detail |
| **Projections** | Goal-based using FV, SIP, Monte Carlo |
| **Retry Logic** | 3 attempts with exponential backoff |
| **Manual Operations** | Generate Missing, Update All, Regenerate, Drop All |
| **Audit Trail** | Full execution history with timings and errors |

---

**Generated:** 2025-11-17
**Repository:** kewalinvest
**Branch:** claude/add-documentation-spreadsheet-01K3XwjavTdKvPZV8wNj8iJh
