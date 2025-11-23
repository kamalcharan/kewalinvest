# Release 1.1 - Phase 2 Handover: Goals & Calculations

**Status:** 🔵 NOT STARTED
**Prerequisites:** Phase 1 MUST be completed and deployed
**Branch:** Create new branch from `claude/create-asset-types-goals-01NGxV1xRVBVCobH26NzuYg6`

---

## Phase 2 Scope

Phase 2 focuses on **Goals** - creating, calculating, and showing impacts across the system:

1. ❌ Create Goal and Goal Calculations
2. ❌ Remove all Goal → Scheme relationships
3. ❌ All goal impacts in customer dashboard/tabs
4. ❌ SIP and transaction impact on goals

---

## 1. Create Goal and Goal Calculations

### Current State (What Exists)

The codebase already has **some** goal infrastructure from the "Customer Portfolio Enhancement" project:

**Existing Files:**
```
backend/src/
  types/goalTracking.types.ts              - Goal interfaces (may need updates)
  services/goalTracking.service.ts         - Goal service (may need updates)
  controllers/goalTracking.controller.ts   - Goal controller (may need updates)
  routes/goalTracking.routes.ts            - Goal routes (may need updates)

frontend/src/
  components/goals/
    GoalCard.tsx                           - Display goal
    GoalForm.tsx                           - Create/edit goal form
    GoalMetricsCard.tsx                    - Goal metrics
    AssetAllocationUtilization.tsx         - Asset allocation per goal
```

**Existing Database Tables:**
```sql
t_customer_goals                           - Goal definitions
t_goal_watchlist                           - Goals on advisor's watchlist
t_goal_scheme_allocations                  - Goal → Scheme mappings (TO BE REMOVED!)
```

### What Needs to Be Done

#### 1.1 Remove Goal → Scheme Relationship (Priority #1)

**Current Problem:** Goals are currently linked to schemes via `t_goal_scheme_allocations` table.

**New Design:** Goals should be linked to **Investment Plans** (from Phase 1), NOT schemes.

**Database Changes Required:**

1. **Create New Table:** `t_goal_investment_allocations`
```sql
CREATE TABLE IF NOT EXISTS t_goal_investment_allocations (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES m_tenants(id),
    environment VARCHAR(20) DEFAULT 'production',

    -- Goal reference
    goal_id INTEGER NOT NULL REFERENCES t_customer_goals(id) ON DELETE CASCADE,

    -- Investment Plan reference (NEW - from Phase 1)
    investment_plan_id INTEGER NOT NULL REFERENCES t_customer_asset_assignments(id) ON DELETE CASCADE,

    -- Allocation
    allocated_percentage DECIMAL(5,2) CHECK (allocated_percentage >= 0 AND allocated_percentage <= 100),
    allocated_amount DECIMAL(15,2),

    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Constraints
    UNIQUE(goal_id, investment_plan_id)
);

CREATE INDEX idx_goal_investments_goal ON t_goal_investment_allocations(goal_id);
CREATE INDEX idx_goal_investments_plan ON t_goal_investment_allocations(investment_plan_id);
CREATE INDEX idx_goal_investments_tenant ON t_goal_investment_allocations(tenant_id, environment);
```

2. **Migration Steps:**
   - Create new table `t_goal_investment_allocations`
   - Migrate existing data from `t_goal_scheme_allocations` to new table (if possible)
   - Drop old table `t_goal_scheme_allocations`
   - Update distribution scripts

3. **Update Existing Types:**
```typescript
// backend/src/types/goalTracking.types.ts

export interface GoalInvestmentAllocation {
  id: number;
  goal_id: number;
  investment_plan_id: number;              // NEW - was scheme_code
  allocated_percentage: number;
  allocated_amount: number;

  // Joined data
  investment_plan?: InvestmentPlan;        // NEW - includes asset_type, principal, etc.
  current_value?: number;                  // Calculated from investment plan
}

export interface GoalTrackingData {
  goal_id: number;
  goal_name: string;
  target_amount: number;
  current_amount: number;                  // Sum of all allocated investment plans
  progress_percentage: number;
  time_remaining_months: number;
  target_date: string;
  monthly_sip_required: number;
  is_on_track: boolean;
  risk_level: 'low' | 'medium' | 'high';

  investment_allocations: GoalInvestmentAllocation[];  // NEW - was schemes
}
```

#### 1.2 Goal Calculation Service

**Create/Update:** `backend/src/services/goalCalculation.service.ts`

**Key Methods Needed:**

1. **calculateGoalProgress(goalId: number)**
   - Fetch all investment plans allocated to this goal
   - Sum up current values of all allocated investments
   - Calculate progress percentage: (current_amount / target_amount) * 100
   - Return: current_amount, progress_percentage, projected_completion_date

2. **calculateMonthlyRequirement(goalId: number)**
   - Get goal target_amount and target_date
   - Get current_amount from allocated investments
   - Calculate shortfall: target_amount - current_amount
   - Calculate months remaining until target_date
   - Return: monthly_sip_required to reach target

3. **calculateGoalProjection(goalId: number)**
   - For each allocated investment plan:
     - Use investment_type (one_time, sip, recurring)
     - Use growth rate (custom or default from asset type)
     - Project future value at goal's target_date
   - Sum all projected values
   - Compare with target_amount
   - Return: projected_amount, is_on_track, shortfall/surplus

4. **calculateRiskLevel(goalId: number)**
   - Analyze asset allocation across investment plans
   - High equity % → high risk
   - High fixed income % → low risk
   - Return: 'low' | 'medium' | 'high'

#### 1.3 API Endpoints (New/Updated)

```
POST   /api/goals                                 - Create new goal
GET    /api/goals/:goalId                         - Get goal with calculations
PUT    /api/goals/:goalId                         - Update goal
DELETE /api/goals/:goalId                         - Delete goal

POST   /api/goals/:goalId/allocations             - Allocate investment plan to goal
GET    /api/goals/:goalId/allocations             - List goal allocations
PUT    /api/goals/:goalId/allocations/:id         - Update allocation percentage
DELETE /api/goals/:goalId/allocations/:id         - Remove allocation

GET    /api/goals/:goalId/projections             - Get goal projections
GET    /api/goals/:goalId/risk-analysis           - Get risk analysis

GET    /api/customers/:customerId/goals           - List customer's goals
GET    /api/family/:familyHeadId/goals            - Family-level goals
```

#### 1.4 Frontend Updates

**Update Components:**

1. **GoalForm.tsx**
   - Add section to allocate investment plans to goal
   - Show dropdown of customer's investment plans (from Phase 1)
   - Allow setting allocation percentage per plan
   - Validate: sum of allocations = 100% (optional)

2. **GoalCard.tsx**
   - Show current progress (from calculations)
   - Show projected completion date
   - Show risk level
   - Display allocated investment plans (not schemes)

3. **AssetAllocationUtilization.tsx**
   - Show breakdown by asset type (from investment plans)
   - Pie chart: MF, Gold, Equity, FD, etc.
   - Not by individual schemes

**New Hook:**
```typescript
// frontend/src/hooks/useGoalCalculations.ts

export const useGoalCalculations = (goalId: number) => {
  const [calculations, setCalculations] = useState<GoalCalculations | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGoalCalculations(goalId);
  }, [goalId]);

  return { calculations, loading, refresh: fetchGoalCalculations };
};
```

---

## 2. Remove All Goal → Scheme Relationships

### Files to Modify

**Database:**
1. Drop table: `t_goal_scheme_allocations`
2. Remove foreign keys referencing `t_scheme_master`
3. Update distribution scripts

**Backend:**
```
backend/src/types/goalTracking.types.ts        - Remove scheme references
backend/src/services/goalTracking.service.ts   - Remove scheme-related methods
backend/src/controllers/goalTracking.controller.ts - Remove scheme endpoints
```

**Frontend:**
```
frontend/src/components/goals/GoalForm.tsx              - Remove scheme selector
frontend/src/components/goals/GoalCard.tsx              - Show investments, not schemes
frontend/src/components/goals/AssetAllocationUtilization.tsx - Group by asset_type
```

### Migration Strategy

**Option 1: Hard Cutover (Recommended)**
- Phase 1 creates new investment plan system
- Phase 2 creates new goal allocation system
- Old goal-scheme allocations are archived/ignored
- Users must re-allocate investments to goals

**Option 2: Data Migration**
- Try to map old scheme allocations to new investment plans
- Complex: schemes don't directly map to investment plans
- May lose data fidelity

**Recommendation:** Hard cutover. Phase 2 is a **new goal system**.

---

## 3. All Goal Impacts in Customer Dashboard/Tabs

### Where Goals Need to Appear

#### 3.1 Customer View Page - Goals Tab

**Location:** `frontend/src/pages/CustomerViewPage.tsx`

**Current State:** May already have a Goals tab from previous work

**Required Updates:**
- Show list of customer's goals
- Display goal cards with calculations
- Show progress bars
- Show allocated investment plans (not schemes)
- Add "Create Goal" button
- Add "Edit Goal" and "Delete Goal" actions

#### 3.2 Customer Overview Tab

**Suggested Addition:** "Goals Summary" widget

**Display:**
- Total number of goals
- Goals on track vs at risk
- Total target amount across all goals
- Total current amount across all goals
- Next milestone date

#### 3.3 Customer Assets Tab

**Update Required:** Show which investment plans are allocated to goals

**In InvestmentPlanCard.tsx, add:**
- Badge/icon if investment is allocated to a goal
- Tooltip showing goal name(s)
- Click to navigate to goal

#### 3.4 Dashboard Widgets

**Create:** Goal-related widgets for advisor dashboard

Potential widgets:
- "Goals At Risk" - List goals falling behind
- "Goals Nearing Completion" - Goals >90% complete
- "Unallocated Investments" - Investment plans not allocated to any goal

---

## 4. SIP and Transaction Impact on Goals

### Problem Statement

When a customer makes a **transaction** (SIP payment, lumpsum investment, redemption), it affects:
1. The **Investment Plan** value (Phase 1)
2. All **Goals** that have allocated that investment plan (Phase 2)

### Solution: Real-time Recalculation

#### 4.1 Backend Service Updates

**Update:** `backend/src/services/transaction.service.ts`

**After any transaction:**
1. Update the investment plan's current value
2. Trigger goal recalculations for all goals linked to that investment plan

```typescript
// Pseudo-code
export class TransactionService {
  static async recordTransaction(data: TransactionData) {
    // 1. Record transaction
    const transaction = await this.createTransaction(data);

    // 2. Update investment plan value
    await InvestmentPlanService.updateCurrentValue(data.investment_plan_id);

    // 3. Find all goals linked to this investment
    const linkedGoals = await GoalTrackingService.getGoalsByInvestmentPlan(data.investment_plan_id);

    // 4. Recalculate each goal
    for (const goal of linkedGoals) {
      await GoalCalculationService.calculateGoalProgress(goal.goal_id);
    }

    return transaction;
  }
}
```

#### 4.2 Frontend Updates

**After Transaction:**
- Refresh investment plan display
- Refresh goal cards (if visible)
- Show notification: "Transaction recorded. Goals updated."

**In GoalCard.tsx:**
- Show last updated timestamp
- Refresh button to manually recalculate

---

## Database Schema Summary (Phase 2)

### New Tables
```sql
t_goal_investment_allocations    - Links goals to investment plans (NEW)
```

### Tables to Drop
```sql
t_goal_scheme_allocations        - Old goal-scheme mapping (DELETE)
```

### Tables to Modify
```sql
t_customer_goals                 - May need additional fields (review)
```

---

## Testing Checklist (Phase 2)

- [ ] Create goal with target amount and date
- [ ] Allocate multiple investment plans to a goal
- [ ] Verify goal progress calculation is correct
- [ ] Verify monthly SIP requirement calculation
- [ ] Verify goal projection at target date
- [ ] Verify risk level calculation based on asset allocation
- [ ] Update goal allocation percentages
- [ ] Remove investment plan from goal
- [ ] Delete goal (verify cascading deletes)
- [ ] Record SIP transaction → verify goal updates automatically
- [ ] Record redemption → verify goal updates
- [ ] View goals in customer dashboard (all tabs)
- [ ] View goals at risk widget
- [ ] View goals nearing completion widget
- [ ] Verify no references to schemes remain

---

## Migration Commands (Phase 2)

```bash
# 1. Create branch
git checkout -b claude/release-1.1-phase-2-[SESSION_ID]

# 2. Create migration file
touch backend/db/migrations/018_goal_investment_allocations.sql

# 3. Update distribution scripts
# - Update 02_tables.sql (add new table, remove old)
# - Update 03_indexes_triggers.sql (add new indexes)

# 4. Run migration
psql -U postgres -d kewalinvest -f backend/db/migrations/018_goal_investment_allocations.sql

# 5. Test thoroughly
npm run test

# 6. Build and deploy
cd backend && npm run build
cd frontend && npm run build
```

---

## Key Files to Create/Modify (Phase 2)

### Backend
```
backend/db/migrations/018_goal_investment_allocations.sql                    [NEW]
backend/db/ditribution scripts/02_tables.sql                                 [MODIFY]
backend/db/ditribution scripts/03_indexes_triggers.sql                       [MODIFY]

backend/src/types/goalTracking.types.ts                                      [MODIFY]
backend/src/services/goalCalculation.service.ts                              [NEW]
backend/src/services/goalTracking.service.ts                                 [MODIFY]
backend/src/controllers/goalTracking.controller.ts                           [MODIFY]
backend/src/routes/goalTracking.routes.ts                                    [MODIFY]
backend/src/services/transaction.service.ts                                  [MODIFY]
```

### Frontend
```
frontend/src/types/goalTracking.types.ts                                     [MODIFY]
frontend/src/services/goalTracking.service.ts                                [MODIFY]
frontend/src/hooks/useGoalCalculations.ts                                    [NEW]
frontend/src/components/goals/GoalForm.tsx                                   [MODIFY]
frontend/src/components/goals/GoalCard.tsx                                   [MODIFY]
frontend/src/components/goals/AssetAllocationUtilization.tsx                 [MODIFY]
frontend/src/pages/CustomerViewPage.tsx                                      [MODIFY]
```

---

## Dependencies

**Phase 2 depends on Phase 1:**
- ✅ `m_asset_types` table must exist
- ✅ `t_customer_asset_assignments` table must exist
- ✅ Investment plan APIs must be working
- ✅ Investment plan calculations must be working

**Do NOT start Phase 2 until Phase 1 is fully deployed and tested!**

---

## Success Criteria (Phase 2)

- [ ] All goals are linked to investment plans (NOT schemes)
- [ ] Goal progress calculations are accurate
- [ ] SIP transactions automatically update goal progress
- [ ] Goals appear in customer dashboard (all relevant tabs)
- [ ] Risk analysis works based on asset allocation
- [ ] Monthly requirement calculation is correct
- [ ] Goal projections at target date are accurate
- [ ] No references to t_goal_scheme_allocations remain
- [ ] Distribution scripts are updated
- [ ] All tests pass

---

## Estimated Effort

**Database:** 4-6 hours
- Create new table
- Migration script
- Update distribution scripts
- Drop old table

**Backend:** 12-16 hours
- Update types
- Create calculation service
- Update goal service
- Update transaction service
- API endpoints
- Testing

**Frontend:** 12-16 hours
- Update goal components
- Create new hooks
- Update customer dashboard
- Add goal widgets
- Testing

**Total:** 28-38 hours (3.5 - 5 days)

---

## Next Steps

After Phase 2 is complete, proceed to **Phase 3** (see RELEASE-1.1-PHASE-3-HANDOVER.md).

---

**END OF PHASE 2 HANDOVER**
