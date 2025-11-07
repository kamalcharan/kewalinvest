# Goal Display & SIP Tracking Investigation Summary

## Project Structure

**Frontend Root:** `/home/user/kewalinvest/frontend/src`
**Backend Root:** `/home/user/kewalinvest/backend/src`

---

## PART 1: GOAL DISPLAY COMPONENTS

### Primary Goal Detail Modal Component
**File:** `/home/user/kewalinvest/frontend/src/components/goals/GoalDetailsModal.tsx`

### Tab Structure (Lines 147-152 in GoalDetailsModal.tsx)
The modal has 4 tabs:

```typescript
type TabType = 'overview' | 'history' | 'schemes' | 'actions';

const tabs: { id: TabType; label: string; icon: string }[] = [
  { id: 'overview', label: 'Overview', icon: '📊' },
  { id: 'history', label: 'History', icon: '📈' },
  { id: 'schemes', label: 'Schemes', icon: '📋' },
  { id: 'actions', label: 'Actions', icon: '💡' }
];
```

---

## PART 2: TAB-BY-TAB CONTENT ANALYSIS

### 1. OVERVIEW TAB (Lines 327-335)
**Components Displayed:**
- GoalCard (compact=false) - Shows goal summary
- GoalProgressChart - Shows progress visualization

**Data Shown:**
- Goal title and name
- Target amount / Target date (depends on goal type)
- Current progress percentage
- Success probability (for time & price goals)
- Visual chart with current value vs projected corpus

### 2. HISTORY TAB (Lines 338-431)
**Data Structure:** Displays historical snapshots from `t_goal_progress_snapshots` table

**Columns in History Table:**
- **Date** - snapshot_date
- **Current Value** - current_value
- **Monthly SIP** - monthly_contribution (KEY SIP DATA)
- **Projected** - projected_corpus
- **Success %** - probability_of_success (if available)
- **Status** - on_track flag (On Track / Behind)

**Note:** This is monthly summary data, not individual transaction data.

### 3. SCHEMES TAB (Lines 434-492)
**Current Display:**
- Linked schemes in a grid layout
- Scheme name
- Scheme code
- Allocation percentage

**What's NOT Shown:**
- Transaction history for the schemes
- Individual SIP transactions
- Investment history
- Units purchased
- NAV-based data

**Data Structure:**
```typescript
interface LinkedScheme {
  scheme_code: string;
  scheme_name: string;
  allocation_percentage: number; // Sum to 100%
}
```

### 4. ACTIONS TAB (Lines 495-517)
**Displays:** Recommended actions based on goal status
- Increase SIP
- Rebalance portfolio
- Extend timeline
- Reduce target
- Celebrate (if on track)

---

## PART 3: SIP TRACKING - WHAT EXISTS

### Current SIP Data Points
1. **Monthly Contribution** - Stored in:
   - `t_jtbd_configurations.config_data.monthly_contribution` (current SIP amount)
   - `t_goal_progress_snapshots.monthly_contribution` (historical monthly SIP)

2. **Available in Goal Config:**
   ```typescript
   monthly_contribution: number; // Current SIP amount
   ```

3. **Historical SIP Data:**
   - Captured once per day in progress snapshots
   - Shows trend of SIP over time in History tab

### SIP Calculation (Backend)
- Files: `/home/user/kewalinvest/backend/src/services/goal.calculator.service.ts`
- Functions:
  - `calculateFutureValue()` - FV with SIP
  - `calculateRequiredSIP()` - Required SIP to reach target
  - `calculateMonthsToTarget()` - Timeline with SIP

---

## PART 4: TRANSACTION DATA - WHAT DOESN'T EXIST IN GOALS

### Transaction Service Details
**File:** `/home/user/kewalinvest/frontend/src/services/transaction.service.ts`

**Transaction Structure:**
```typescript
interface Transaction {
  id: number;
  customer_id: number;
  scheme_code: string;
  scheme_name: string;
  folio_no?: string;
  txn_type_id: number;
  txn_type?: 'Addition' | 'Deduction';
  txn_date: string;
  total_amount: number;
  units: number;
  nav: number;
  stamp_duty?: number;
  portfolio_flag: boolean;
  created_at: string;
  updated_at: string;
}
```

### Key Finding: NO Transaction Linking to Goals
- Transactions are stored separately in `t_transactions` table
- No foreign key relationship to goals (`t_jtbd_configurations`)
- Goals only track aggregated portfolio value, not individual transactions
- Monthly SIP is a configuration value, NOT calculated from transactions

---

## PART 5: GOAL DATA SOURCES & TABLES

### Database Tables
1. **t_jtbd_configurations** - Stores goal configuration
   - Goal type, target amount, target date
   - Monthly contribution (SIP amount)
   - Linked schemes
   - Status fields

2. **t_goal_progress_snapshots** - Historical snapshots
   - Daily snapshots of goal progress
   - current_value (from portfolio)
   - monthly_contribution (configured SIP)
   - projected_corpus
   - probability_of_success
   - on_track status

3. **t_transactions** - Individual transactions (separate)
   - Not linked to specific goals
   - Used for portfolio value calculation

---

## PART 6: COMPONENT FILE PATHS

### Goal Components
```
/home/user/kewalinvest/frontend/src/components/goals/
├── GoalDetailsModal.tsx          # MAIN - 4 tabs, 546 lines
├── GoalCard.tsx                  # Summary card display
├── GoalProgressChart.tsx         # Chart visualization
├── GoalActionCard.tsx            # Action items display
├── GoalProgressTracker.tsx       # Progress tracking
├── GoalAlertBanner.tsx           # Alert display
├── GoalSummartCard.tsx           # Summary statistics
├── SmartAllocationCard.tsx       # Allocation display
├── AssetAllocationUtilization.tsx # Utilization tracking
├── GoalSetupModal.tsx            # Creation wizard
├── GoalRecalculationModal.tsx    # Recalculation dialog
├── GoalWatchlistPanel.tsx        # Watchlist view
└── forms/
    ├── TimeBasedGoalForm.tsx
    ├── PriceBasedGoalForm.tsx
    └── TimeAndPriceGoalForm.tsx
```

### Types & Utilities
```
/home/user/kewalinvest/frontend/src/
├── types/goal.types.ts           # Complete goal type definitions
├── hooks/useGoals.ts             # Goal-related hooks (813 lines)
├── services/goal.service.ts      # Frontend goal API service
└── utils/goalUtils.ts            # Goal calculation utilities
```

### Backend Services
```
/home/user/kewalinvest/backend/src/
├── services/
│   ├── goal.service.ts           # Main goal service (1259 lines)
│   ├── goal.calculator.service.ts # SIP calculations
│   └── goal.recalculation.job.ts # Scheduled recalculation
├── controllers/goal.controller.ts # API endpoints
└── routes/goal.routes.ts         # Route definitions
```

---

## PART 7: API ENDPOINTS AVAILABLE

### Goal Management
- `POST /api/goals` - Create goal
- `GET /api/goals/customer/:customerId` - Get all goals
- `GET /api/goals/:id` - Get single goal
- `PUT /api/goals/:id` - Update goal
- `DELETE /api/goals/:id` - Delete goal

### Goal Analysis
- `GET /api/goals/:id/history` - Get progress snapshots (monthly)
- `GET /api/goals/:id/tracking-status` - Get status
- `GET /api/goals/customer/:customerId/summary` - Aggregate stats
- `GET /api/goals/customer/:customerId/allocation-utilization` - Scheme allocation

### Goal Actions
- `POST /api/goals/:id/recalculate` - Manual recalculation
- `POST /api/goals/customer/:customerId/recalculate` - Bulk recalculation
- `POST /api/goals/:id/watchlist` - Add to watchlist
- `DELETE /api/goals/:id/watchlist` - Remove from watchlist

**Note:** No transaction-specific endpoints for goals

---

## PART 8: KEY FINDINGS SUMMARY

### What's Currently Shown for SIP Tracking
✓ Monthly SIP amount (configuration value)
✓ SIP trend over time (in History tab, monthly snapshots)
✓ Projected corpus with SIP (growth projections)
✓ Required SIP calculation (for time & price goals)

### What's NOT Currently Shown
✗ Individual SIP transaction history
✗ Transaction dates and amounts for each scheme
✗ SIP regularization details (if actually invested)
✗ Comparison of configured SIP vs actual SIP
✗ Per-scheme transaction drill-down in Schemes tab
✗ SIP investment timeline

### Architecture Note
- Goals work with AGGREGATED portfolio values
- SIP is a CONFIGURATION setting, not tracked per-transaction
- Transactions exist separately for portfolio tracking
- No direct link between individual transactions and goals
- Progress snapshots are DAILY, not transaction-based

---

## PART 9: TO ADD TRANSACTION TRACKING

### To Display SIP Transactions in Goals, Would Need:
1. **Data Layer:**
   - Relationship between goals and relevant transactions
   - Query to fetch scheme-specific transactions for goal timeframe
   - Filtering transactions by linked_schemes

2. **Schema Changes:**
   - Foreign key from transactions to goals (optional)
   - Or query filter based on scheme_code + customer_id

3. **UI Changes:**
   - New tab: "Transactions" or "SIP History"
   - In Schemes tab: Add transactions sub-section
   - Transaction table with date, amount, units, NAV, type

4. **API Changes:**
   - New endpoint: `GET /api/goals/:id/transactions`
   - Service method to fetch goal-related transactions
   - Filtering by date range and schemes

---

## PART 10: CODE SNIPPETS

### Current SIP Display in History Tab
```typescript
// Lines 372-396 in GoalDetailsModal.tsx
<th>Monthly SIP</th>
<td>{formatCurrency(snapshot.monthly_contribution, true)}</td>
```

### History Data Fetched
```typescript
// From useGoals.ts - useGoalHistory hook
const response = await apiService.get(
  `${API_ENDPOINTS.GOALS.HISTORY(goalId)}?limit=12`
);
```

### Scheme Display in Schemes Tab
```typescript
// Lines 444-489 in GoalDetailsModal.tsx
{config.linked_schemes.map((scheme) => (
  <div key={scheme.scheme_code}>
    <div>{scheme.scheme_name}</div>
    <div>{scheme.scheme_code}</div>
    <div>{formatPercentage(scheme.allocation_percentage, 1)}</div>
  </div>
))}
```

### Goal Progress Snapshot Structure
```typescript
// From goal.types.ts
interface GoalProgressSnapshot {
  id: number;
  goal_id: number;
  snapshot_date: string;
  current_value: number;
  monthly_contribution: number;  // SIP DATA
  projected_corpus?: number;
  projected_achievement_date?: string;
  probability_of_success?: number;
  on_track?: boolean;
  deviation_percentage?: number;
  recalculation_trigger: string;
}
```

---

## CONCLUSION

The goal display system:
1. **Shows SIP** as a static monthly contribution configuration
2. **Tracks SIP trends** through daily progress snapshots
3. **Does NOT integrate** transaction-level details
4. **Keeps goals separate** from individual transaction records
5. **Uses aggregated data** for portfolio value calculations

To add detailed transaction tracking, the system would need to:
- Link transactions to goal schemes
- Create a transaction query service for goals
- Add transaction display UI components
- Update the modal with transaction history tabs

