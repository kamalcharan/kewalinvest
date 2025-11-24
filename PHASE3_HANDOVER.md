# Phase 3 - Goals Enhancement Handover

## Current State (After Phase 2)
- ✅ Goals support intermediate withdrawals
- ✅ Multi-asset allocation (not limited to MF schemes)
- ✅ Investment plans separate from goal definition
- ✅ Asset type breakdown and pie charts
- ✅ Clean UI (no Phase 1/Phase 2 labels)

## Phase 3 - Potential Enhancements

### 1. Goal Probability & Risk Analysis
**Status:** Partial (basic calculations exist)
**Needed:**
- Monte Carlo simulation for goal probability
- Risk scoring based on asset allocation
- Scenario analysis (best/worst/likely cases)
- Rebalancing recommendations

**Files to Extend:**
- `backend/src/services/goalCalculationPhase2.service.ts`
- Add new `goalRiskAnalysis.service.ts`

### 2. Multi-Goal Networth Aggregation
**Status:** Not implemented
**Requirements from Phase 2 discussion:**
- Customer has multiple goals
- Family has multiple customers
- Aggregate withdrawals across all goals
- Family-level networth projections

**Implementation:**
- New service: `familyGoalAggregation.service.ts`
- New API endpoints for family-level data
- Dashboard view for family networth

### 3. Goal Investment Auto-Allocation
**Status:** Manual only (via Allocations tab)
**Enhancement:**
- Auto-suggest investment allocation based on:
  - Goal timeline
  - Risk tolerance
  - Asset type targets
  - Available investment plans
- Smart rebalancing suggestions

**Files to Create:**
- `backend/src/services/goalAllocationOptimizer.service.ts`
- `frontend/src/components/goals/AutoAllocationWizard.tsx`

### 4. Goal Progress Tracking Improvements
**Status:** Basic tracking exists
**Enhancements:**
- Historical progress charts
- Milestone tracking
- Alert system for off-track goals
- Performance attribution by asset type

### 5. Withdrawal Planning Tools
**Status:** Basic withdrawal capture exists
**Enhancements:**
- Withdrawal impact simulator
- Tax-efficient withdrawal strategy
- Emergency fund planning
- Inflation-adjusted projections

### 6. Goal Templates
**Status:** Not implemented
**Features:**
- Pre-configured goal templates (Retirement, Education, Home Purchase)
- Industry-standard asset allocations
- Age-based allocation strategies

### 7. Collaborative Goal Planning
**Status:** Not implemented
**Features:**
- Multi-user goal collaboration (family members)
- Advisor review and comments
- Goal approval workflows

## Technical Debt to Address

### Database
- [ ] Consider dropping `t_goal_scheme_allocations` table (commented in migration 018)
- [ ] Add indexes for family-level queries if implementing aggregation
- [ ] Archive old goal snapshots (retention policy)

### Backend
- [ ] Refactor update methods to also remove scheme validation
- [ ] Add comprehensive error handling for Phase 2 calculations
- [ ] Performance optimization for multi-goal calculations

### Frontend
- [ ] Remove unused `linked_schemes` type references
- [ ] Add loading states for Phase 2 calculations
- [ ] Implement proper error boundaries

## Architecture Notes for Phase 3

### Current Architecture
```
Goals (t_jtbd_configurations)
  ├── config_data (JSONB)
  │   ├── withdrawals[]
  │   ├── asset_allocations[] (for display)
  │   └── linked_schemes[] (deprecated)
  └── Allocations (t_goal_investment_allocations)
      └── Investment Plans (t_customer_asset_assignments)
```

### Recommended Phase 3 Architecture
```
Family
  ├── Customers[]
  │   ├── Goals[]
  │   │   ├── Withdrawals[]
  │   │   ├── Asset Allocation Targets
  │   │   └── Investment Plan Allocations[]
  │   └── Investment Plans[]
  └── Aggregated Networth View
```

## Questions to Answer Before Phase 3

1. **Priority:** Which Phase 3 feature has highest business value?
2. **Family Structure:** How is family relationship stored? Do we need new schema?
3. **Probability Calculations:** What methodology to use? (Monte Carlo, Historical returns, etc.)
4. **Performance:** What's acceptable response time for complex calculations?
5. **Mobile:** Do Phase 3 features need mobile app support?

---

**Phase 2 Status:** ✅ COMPLETE - Ready to merge
**Phase 3 Status:** 📋 Planning - Awaiting requirements
