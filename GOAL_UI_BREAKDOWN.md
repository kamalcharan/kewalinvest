# Goal Display Modal - Visual Breakdown

## Current Modal Structure

```
┌─────────────────────────────────────────────────────────────┐
│  Goal Title              [Recalculate] [Close]              │
│  (Goal Name from config)                                    │
├─────────────────────────────────────────────────────────────┤
│ Overview │ History │ Schemes │ Actions │                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  CONTENT AREA (changes per tab)                            │
│                                                             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## TAB 1: OVERVIEW

### Structure (GoalDetailsModal.tsx, lines 327-335)
```
┌──────────────────────────────────┐
│        GOAL CARD COMPONENT       │
│ ┌─────────────────────────────┐  │
│ │ Goal Title        [Status]  │  │
│ │ Priority Badge              │  │
│ │ ───────────────────────────  │  │
│ │ Target: ₹X              │    │  │
│ │ By: Date/Months        │    │  │
│ │ ───────────────────────────  │  │
│ │ Progress: XX% [████████░░]  │  │
│ │ ───────────────────────────  │  │
│ │ Success: Y% | Gap: ₹Z       │  │
│ │ ───────────────────────────  │  │
│ │ 📊 Fund Allocations         │  │
│ │  • Fund A: 60% (40% avail)  │  │
│ │  • Fund B: 40% (80% avail)  │  │
│ └─────────────────────────────┘  │
└──────────────────────────────────┘

┌──────────────────────────────────┐
│   PROGRESS CHART COMPONENT       │
│                                  │
│   Latest Value: ₹X               │
│   Growth: +₹Y                    │
│   Target: ₹Z                     │
│                                  │
│        Current ━━━ (solid line)  │
│    ▲  Projected ┈┈┈ (dashed)    │
│    │  Target ━━━┈ (dash line)   │
│    │                             │
│    └─────────────────────────    │
│         Month Snapshots          │
└──────────────────────────────────┘
```

**Components Used:**
- `<GoalCard goal={goal} compact={false} />`
- `<GoalProgressChart goalId={goalId} height={300} showProjection={true} />`

---

## TAB 2: HISTORY

### Table Structure (GoalDetailsModal.tsx, lines 362-428)
```
┌─────────────────────────────────────────────────────────────┐
│ Date    │ Current Value │ Monthly SIP │ Projected │ Success │ Status
├─────────────────────────────────────────────────────────────┤
│ Nov 2024│ ₹50,00,000    │ ₹25,000     │ ₹80,00,000│ 85%    │ On Track
│ Oct 2024│ ₹48,50,000    │ ₹25,000     │ ₹79,50,000│ 84%    │ On Track
│ Sep 2024│ ₹47,00,000    │ ₹25,000     │ ₹78,00,000│ 83%    │ On Track
│ Aug 2024│ ₹45,50,000    │ ₹25,000     │ ₹77,50,000│ 82%    │ Behind
└─────────────────────────────────────────────────────────────┘
```

**Data Source:** `t_goal_progress_snapshots` table
**Query:** `/api/goals/{id}/history?limit=12`

**Columns:**
1. `snapshot_date` - formatted as "MMM YYYY"
2. `current_value` - formatted as ₹X.XX
3. `monthly_contribution` - the configured monthly SIP
4. `projected_corpus` - future value calculation
5. `probability_of_success` - confidence percentage (time & price goals only)
6. `on_track` - boolean, displayed as badge (On Track / Behind)

**Important Note:** This is NOT transaction-based. It's a daily snapshot of:
- Portfolio value (aggregated from all portfolio transactions)
- Configured SIP (the value set when creating/editing goal)
- Calculated projections

---

## TAB 3: SCHEMES

### Current Display (GoalDetailsModal.tsx, lines 443-489)
```
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ Scheme A     │  │ Scheme B     │  │ Scheme C     │
│ ABC123       │  │ DEF456       │  │ GHI789       │
├──────────────┤  ├──────────────┤  ├──────────────┤
│ Allocation   │  │ Allocation   │  │ Allocation   │
│ 50%          │  │ 30%          │  │ 20%          │
└──────────────┘  └──────────────┘  └──────────────┘
```

**Current Data Shown:**
```typescript
interface LinkedScheme {
  scheme_code: string;      // "ABC123"
  scheme_name: string;      // "Scheme A"
  allocation_percentage: number;  // 50
}
```

**What's NOT Shown:**
- Individual transactions for each scheme
- Units held in each scheme
- NAV of each unit
- Purchase history
- SIP transaction details

---

## TAB 4: ACTIONS

### Display Structure (GoalDetailsModal.tsx, lines 505-514)
```
┌─────────────────────────────────────┐
│ 📈 Increase SIP                     │
│ Increase monthly contribution to    │
│ ₹X to stay on track                │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ 🔄 Rebalance Portfolio              │
│ Reallocate funds to maintain        │
│ target asset allocation             │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ 📅 Extend Timeline                  │
│ Extend target date by X months      │
│ to achieve target amount            │
└─────────────────────────────────────┘
```

**Data Source:** `getGoalActions(goal)` utility function
**Types:** 'increase_sip' | 'rebalance' | 'extend_timeline' | 'reduce_target' | 'celebrate'

---

## SIP DATA FLOW

### Where Monthly SIP Comes From

```
┌─────────────────────────────────┐
│  Goal Creation/Update Form      │
│  User inputs: Monthly SIP       │
└──────────────┬──────────────────┘
               │
               ▼
┌──────────────────────────────────────┐
│ Backend: goal.service.ts             │
│ - Validate SIP amount                │
│ - Store in config_data JSON          │
│ - Calculate projections with SIP     │
└──────────────┬───────────────────────┘
               │
               ▼
┌──────────────────────────────────────┐
│  t_jtbd_configurations table         │
│  config_data.monthly_contribution    │
└──────────────┬───────────────────────┘
               │
               ▼
┌──────────────────────────────────────┐
│  Daily Snapshot (scheduled job)      │
│  - Copy monthly_contribution value   │
│  - Store in monthly snapshot         │
│  - Used for trends in History tab    │
└──────────────┬───────────────────────┘
               │
               ▼
┌──────────────────────────────────────┐
│  t_goal_progress_snapshots table     │
│  monthly_contribution (daily values) │
└──────────────────────────────────────┘
```

### Key Point
The `monthly_contribution` is:
- A CONFIGURATION value set by user
- NOT calculated from actual transactions
- Repeated daily in snapshots for history tracking
- Used in SIP projection formulas

---

## TRANSACTION DATA - SEPARATE FROM GOALS

### Transaction Architecture
```
┌──────────────────────┐
│   t_transactions     │ 
│ (User Investments)   │
├──────────────────────┤
│ id                   │
│ customer_id          │
│ scheme_code          │
│ txn_date             │
│ total_amount         │
│ units                │
│ nav                  │
│ txn_type (Buy/Sell)  │
└──────┬───────────────┘
       │
       │ Aggregated for portfolio value
       │
       ▼
┌──────────────────────────────┐
│  Portfolio Value Calculation │
│  (for all goals)             │
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│  t_jtbd_configurations       │
│  config_data.current_value   │
│  (aggregated portfolio)      │
└──────────────────────────────┘
```

### Important Observation
- Transactions are NOT linked to specific goals
- Multiple goals can share same schemes
- Portfolio value is aggregated across all holdings
- SIP is configured per-goal (may differ from actual transactions)

---

## CODE LOCATIONS FOR KEY DATA

### Monthly SIP Display
**File:** `/home/user/kewalinvest/frontend/src/components/goals/GoalDetailsModal.tsx`
**Lines:** 372 (column header), 396 (data cell)

```typescript
<th>Monthly SIP</th>
<td>{formatCurrency(snapshot.monthly_contribution, true)}</td>
```

### Historical Snapshots Query
**File:** `/home/user/kewalinvest/frontend/src/hooks/useGoals.ts`
**Lines:** 148-177

```typescript
export function useGoalHistory(goalId: number, limit: number = 12) {
  return useQuery<GoalProgressSnapshot[], Error>({
    queryFn: async () => {
      const endpoint = `${API_ENDPOINTS.GOALS.HISTORY(goalId)}?limit=${limit}`;
      const response = await apiService.get(endpoint);
      return response.data;
    }
  });
}
```

### Scheme Data Structure
**File:** `/home/user/kewalinvest/frontend/src/types/goal.types.ts`
**Lines:** 10-15

```typescript
export interface LinkedScheme {
  scheme_code: string;
  scheme_name: string;
  allocation_percentage: number;
}
```

### Backend SIP Calculations
**File:** `/home/user/kewalinvest/backend/src/services/goal.calculator.service.ts`

```typescript
private calculateFutureValue(
  presentValue: number,
  monthlyPayment: number,  // This is the SIP
  annualRate: number,
  months: number
): number {
  const monthlyRate = annualRate / 12 / 100;
  const fvLumpSum = presentValue * Math.pow(1 + monthlyRate, months);
  const fvAnnuity = monthlyPayment * 
    (Math.pow(1 + monthlyRate, months) - 1) / monthlyRate * 
    (1 + monthlyRate);
  return fvLumpSum + fvAnnuity;
}
```

---

## To Add Transaction Display

### Proposed "Transactions" Tab Structure
```
┌────────────────────────────────────────────────────────────┐
│ Scheme: Scheme A (ABC123)                                  │
├────────────────────────────────────────────────────────────┤
│ Date    │ Type │ Units    │ Amount    │ NAV    │ Current
├────────────────────────────────────────────────────────────┤
│ 01 Nov  │ Buy  │ 50.0000  │ ₹25,000   │ 500    │ ₹25,000
│ 01 Oct  │ Buy  │ 48.0000  │ ₹24,000   │ 500    │ ₹24,000
│ 01 Sep  │ Buy  │ 46.0000  │ ₹23,000   │ 500    │ ₹23,000
├────────────────────────────────────────────────────────────┤
│ Total Holdings: 144.0000 units | Current Value: ₹72,000    │
└────────────────────────────────────────────────────────────┘

Scheme: Scheme B (DEF456)
[Similar structure for each linked scheme]
```

### Required Backend Endpoint
```
GET /api/goals/{goalId}/transactions
Query Parameters:
  - start_date (optional)
  - end_date (optional)
  - scheme_code (optional)

Response:
{
  success: true,
  data: {
    transactions: [
      {
        txn_date: "2024-11-01",
        scheme_code: "ABC123",
        scheme_name: "Scheme A",
        type: "Addition",
        units: 50.0000,
        amount: 25000,
        nav: 500,
        current_value: 25000
      }
    ]
  }
}
```

---

## Summary Table

| Feature | Currently Available | Where Located |
|---------|-------------------|-----------------|
| Monthly SIP Amount | ✓ Yes | History Tab |
| SIP Trend | ✓ Yes | History snapshots |
| Configured SIP | ✓ Yes | Goal config |
| Projected Corpus with SIP | ✓ Yes | Overview tab |
| Required SIP Calculation | ✓ Yes | For time & price goals |
| Individual Transactions | ✗ No | Not integrated with goals |
| Transaction History by Scheme | ✗ No | Separate from goals |
| Units Held per Scheme | ✗ No | Not in goal view |
| SIP vs Actual Tracking | ✗ No | Not compared |

