# Goal Display & SIP Tracking - Quick Reference

## Key Files to Know

### Main Goal Modal
```
/home/user/kewalinvest/frontend/src/components/goals/GoalDetailsModal.tsx
- 4 tabs: Overview, History, Schemes, Actions
- 546 lines of React code
- Uses GoalCard, GoalProgressChart components
```

### Goal Type Definitions
```
/home/user/kewalinvest/frontend/src/types/goal.types.ts
- LinkedScheme interface (scheme_code, scheme_name, allocation_percentage)
- GoalProgressSnapshot interface (includes monthly_contribution)
- 425 lines of TypeScript types
```

### Goal Hooks
```
/home/user/kewalinvest/frontend/src/hooks/useGoals.ts
- useGoal() - fetch single goal
- useGoalHistory() - fetch progress snapshots
- useGoalProjection() - client-side calculations
- 813 lines
```

### Backend Goal Service
```
/home/user/kewalinvest/backend/src/services/goal.service.ts
- Creates goals in t_jtbd_configurations
- Creates daily snapshots in t_goal_progress_snapshots
- 1259 lines
```

### Backend SIP Calculations
```
/home/user/kewalinvest/backend/src/services/goal.calculator.service.ts
- calculateFutureValue()
- calculateRequiredSIP()
- calculateMonthsToTarget()
```

---

## What's Currently Shown

### Overview Tab
- Goal card with title, status, target amount
- Progress chart (current vs projected vs target)
- Fund allocations with availability

### History Tab
- Date, Current Value, Monthly SIP, Projected, Success%, Status
- Data from t_goal_progress_snapshots (daily snapshots)
- NOT transaction-based - aggregated portfolio values

### Schemes Tab
- Linked schemes grid layout
- Shows: scheme name, code, allocation %
- NO transaction details shown
- NO units/NAV data shown

### Actions Tab
- Recommended actions (increase SIP, rebalance, etc.)
- Based on goal status and calculations

---

## SIP Data - What You Need to Know

### Where is Monthly SIP Stored?
```
t_jtbd_configurations 
  └── config_data (JSON)
      └── monthly_contribution: number
```

### How is it Used?
```
1. User sets monthly SIP when creating goal
2. Backend stores it in config_data
3. Used in SIP calculations (FV formula)
4. Copied to daily snapshots for history tracking
5. Shown in History tab
```

### Is it Calculated from Transactions?
```
NO - It's a configuration value
```

### Can You See Transaction History for Schemes?
```
NO - Not integrated in goal view
Transactions are stored separately in t_transactions
```

---

## Database Tables Involved

### 1. t_jtbd_configurations
- Goal configuration storage
- jtbd_type = 'goal_tracking' for goals
- config_data JSON contains monthly_contribution

### 2. t_goal_progress_snapshots
- Daily snapshots of goal progress
- Stores: current_value, monthly_contribution, projected_corpus, etc.
- Used for history tracking and trends

### 3. t_transactions (Separate)
- Individual investment transactions
- NOT linked to specific goals
- Aggregated for portfolio value calculation

---

## API Endpoints for Goals

### Get Goal History (SIP Snapshots)
```
GET /api/goals/:id/history?limit=12

Returns: Array of GoalProgressSnapshot
├─ snapshot_date
├─ current_value
├─ monthly_contribution  <- SIP DATA
├─ projected_corpus
├─ probability_of_success
└─ on_track
```

### Other Key Endpoints
```
POST   /api/goals                           Create
GET    /api/goals/:id                       Get details
GET    /api/goals/customer/:customerId      Get all
PUT    /api/goals/:id                       Update
DELETE /api/goals/:id                       Delete
POST   /api/goals/:id/recalculate           Manual recalc
GET    /api/goals/:id/tracking-status       Status
```

---

## To Add SIP Transaction Display

### Option 1: Extend Schemes Tab
Add collapsible transactions list under each scheme

### Option 2: New Transactions Tab
Add 5th tab showing all transactions for linked schemes

### Option 3: Transaction Sub-sections
Create drill-down view per scheme

---

## Files Changed in This Investigation

1. `/home/user/kewalinvest/GOAL_DISPLAY_INVESTIGATION.md` (11KB)
   - Comprehensive analysis
   - 10 detailed sections
   - Code snippets

2. `/home/user/kewalinvest/GOAL_UI_BREAKDOWN.md` (16KB)
   - Visual ASCII diagrams
   - Tab-by-tab breakdown
   - Data flow charts

---

## Quick Checklist: Does Goal Show...?

- [ ] Monthly SIP amount? **YES** - History tab
- [ ] SIP trend over time? **YES** - History snapshots
- [ ] Individual transactions? **NO**
- [ ] Units per scheme? **NO**
- [ ] NAV data? **NO**
- [ ] Scheme allocations? **YES** - Schemes tab
- [ ] Projected corpus? **YES** - Overview tab
- [ ] Required SIP? **YES** - For time & price goals
- [ ] Transaction history? **NO**
- [ ] SIP vs actual comparison? **NO**

---

## Architecture Summary

```
Goal System Design:
├── Configuration Layer (t_jtbd_configurations)
│   └── Stores: target, SIP, schemes, status
├── Progress Tracking (t_goal_progress_snapshots)
│   └── Daily snapshots of aggregated values
├── Portfolio Aggregation
│   └── Sums from t_transactions (not per-goal)
└── Display Layer (GoalDetailsModal)
    ├── Overview: Card + Chart
    ├── History: Snapshots table
    ├── Schemes: Allocations grid
    └── Actions: Recommendations
```

**Key Insight:** Goals are forward-looking projections, not transaction detail views.

---

## For Developers

### To Add Transaction Tab:
1. Create `/frontend/src/components/goals/GoalTransactions.tsx`
2. Add to GoalDetailsModal imports
3. Add case in switch for `activeTab === 'transactions'`
4. Create backend endpoint `/api/goals/{id}/transactions`
5. Filter transactions by goal.linked_schemes

### To Modify SIP Tracking:
1. Edit monthly_contribution field logic
2. Update progress snapshot calculation
3. Modify calculator service if needed
4. Update UI components

### To Link Goals to Transactions:
1. Add goal_id FK to t_transactions (risky - may break other systems)
2. Or query-time join using scheme_code + customer_id
3. Cache goal transaction queries

---

## Quick Links

| Document | Purpose |
|----------|---------|
| GOAL_DISPLAY_INVESTIGATION.md | Full technical analysis |
| GOAL_UI_BREAKDOWN.md | Visual breakdown with diagrams |
| GoalDetailsModal.tsx | Main UI component (546 lines) |
| goal.types.ts | Type definitions |
| useGoals.ts | React hooks for goals |
| goal.service.ts | Backend service (1259 lines) |

---

Generated: 2024-11-07
Investigation Scope: Goal display, SIP tracking, and transaction integration
Status: Complete
