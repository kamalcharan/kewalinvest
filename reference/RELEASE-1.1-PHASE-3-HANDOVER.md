# Release 1.1 - Phase 3 Handover: Cruise Control, Snapshots & Dashboards

**Status:** 🔵 NOT STARTED
**Prerequisites:** Phase 1 AND Phase 2 MUST be completed and deployed
**Branch:** Create new branch from Phase 2 branch

---

## Phase 3 Scope

Phase 3 focuses on **Visualization** and **Dashboard Impacts**:

1. ❌ Cruise Control / Snapshots / Performance Sparkline
2. ❌ Dashboard impacts

---

## 1. Cruise Control / Snapshots / Performance Sparkline

### Current State (What Exists)

The codebase already has **some** Cruise Control infrastructure from previous work:

**Existing Components:**
```
frontend/src/components/cruisecontrol/
  CruiseControlPanel.tsx                - Main cruise control container
  PortfolioSnapshotsTab.tsx             - Portfolio snapshots view

frontend/src/components/performance/
  PerformanceSparkline.tsx              - Sparkline chart component
  IndexComparisonOverlay.tsx            - Index comparison overlay
  IndexSelector.tsx                     - Index selector dropdown
  DefaultIndexSettings.tsx              - Default index settings

backend/src/services/jobScheduler.service.ts  - Generic job scheduler
```

**Existing Database Tables:**
```sql
t_job_type_registry          - Job type definitions
t_job_scheduler_configs      - Scheduler configurations
t_job_executions             - Execution history
t_portfolio_snapshots        - Portfolio snapshot data (if exists)
```

### What Needs to Be Done

#### 1.1 Portfolio Snapshots with Investment Plans

**Problem:** Existing snapshots (if any) are scheme-based. Need to include **Investment Plans** from Phase 1.

**Solution:** Update snapshot data structure to include investment plans.

**Database Changes:**

Create/Update: `t_portfolio_snapshots_v2`

```sql
CREATE TABLE IF NOT EXISTS t_portfolio_snapshots_v2 (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES m_tenants(id),
    environment VARCHAR(20) DEFAULT 'production',
    customer_id INTEGER NOT NULL REFERENCES t_customers(id) ON DELETE CASCADE,

    snapshot_date DATE NOT NULL,
    snapshot_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Overall Portfolio Metrics
    total_invested_amount DECIMAL(15,2),
    total_current_value DECIMAL(15,2),
    total_returns DECIMAL(15,2),
    returns_percentage DECIMAL(10,4),

    -- Asset-wise Breakdown (JSONB)
    asset_breakdown JSONB,  -- { "MF": 500000, "GOLD": 100000, ... }

    -- Investment Plans Snapshot (JSONB)
    investment_plans_snapshot JSONB,  -- Array of investment plan values

    -- Goals Snapshot (JSONB - from Phase 2)
    goals_snapshot JSONB,  -- Array of goal progress data

    -- Scheme Data (for backward compatibility)
    scheme_data JSONB,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(tenant_id, environment, customer_id, snapshot_date)
);

CREATE INDEX idx_portfolio_snapshots_v2_customer ON t_portfolio_snapshots_v2(customer_id, snapshot_date DESC);
CREATE INDEX idx_portfolio_snapshots_v2_tenant ON t_portfolio_snapshots_v2(tenant_id, environment);
CREATE INDEX idx_portfolio_snapshots_v2_date ON t_portfolio_snapshots_v2(snapshot_date DESC);
```

**investment_plans_snapshot structure:**
```json
[
  {
    "investment_plan_id": 123,
    "asset_type_code": "MF",
    "asset_type_name": "Mutual Fund",
    "principal_amount": 100000,
    "current_value": 125000,
    "returns": 25000,
    "returns_percentage": 25.0,
    "investment_type": "sip",
    "has_started": true,
    "allocated_to_goals": [45, 67]  // goal_ids
  },
  {
    "investment_plan_id": 124,
    "asset_type_code": "GOLD",
    "asset_type_name": "Gold",
    "principal_amount": 50000,
    "current_value": 54000,
    "returns": 4000,
    "returns_percentage": 8.0,
    "investment_type": "one_time",
    "has_started": true,
    "allocated_to_goals": []
  }
]
```

**goals_snapshot structure:**
```json
[
  {
    "goal_id": 45,
    "goal_name": "Child Education",
    "target_amount": 2000000,
    "current_amount": 875000,
    "progress_percentage": 43.75,
    "is_on_track": true,
    "target_date": "2030-06-15",
    "allocated_investments": [123, 125]
  }
]
```

#### 1.2 Snapshot Generation Service

**Update:** `backend/src/services/portfolioSnapshot.service.ts`

**Key Methods:**

1. **generateCustomerSnapshot(customerId: number, snapshotDate: Date)**
   ```typescript
   // 1. Fetch all investment plans for customer
   const investmentPlans = await InvestmentPlanService.getCustomerInvestments(customerId);

   // 2. Calculate current values for each
   const plansWithValues = await Promise.all(
     investmentPlans.map(async plan => ({
       ...plan,
       current_value: await this.calculateCurrentValue(plan),
       returns: current_value - plan.principal_amount
     }))
   );

   // 3. Fetch all goals for customer (from Phase 2)
   const goals = await GoalTrackingService.getCustomerGoals(customerId);

   // 4. Get goal calculations
   const goalsWithCalc = await Promise.all(
     goals.map(async goal => ({
       ...goal,
       ...await GoalCalculationService.calculateGoalProgress(goal.goal_id)
     }))
   );

   // 5. Calculate asset breakdown
   const assetBreakdown = this.calculateAssetBreakdown(plansWithValues);

   // 6. Calculate totals
   const totalInvested = plansWithValues.reduce((sum, p) => sum + p.principal_amount, 0);
   const totalCurrent = plansWithValues.reduce((sum, p) => sum + p.current_value, 0);
   const totalReturns = totalCurrent - totalInvested;

   // 7. Save snapshot
   return await this.saveSnapshot({
     customer_id: customerId,
     snapshot_date: snapshotDate,
     total_invested_amount: totalInvested,
     total_current_value: totalCurrent,
     total_returns: totalReturns,
     returns_percentage: (totalReturns / totalInvested) * 100,
     asset_breakdown: assetBreakdown,
     investment_plans_snapshot: plansWithValues,
     goals_snapshot: goalsWithCalc
   });
   ```

2. **getSnapshotHistory(customerId: number, startDate: Date, endDate: Date)**
   - Fetch all snapshots for date range
   - Return time series data for charts

3. **calculateAssetBreakdown(investmentPlans: InvestmentPlan[])**
   - Group by asset_type_code
   - Sum current values
   - Return: { "MF": 500000, "GOLD": 100000, ... }

#### 1.3 Scheduled Snapshot Job

**Update:** `backend/src/jobs/portfolioSnapshotJob.ts`

**Job Configuration:**
```typescript
export const portfolioSnapshotJob: JobExecutor = {
  jobTypeCode: 'PORTFOLIO_SNAPSHOT',
  jobName: 'Portfolio Snapshot Generation',
  description: 'Generates daily portfolio snapshots for all customers',

  async execute(params: any) {
    // 1. Get all active customers
    const customers = await CustomerService.getAllActiveCustomers();

    // 2. Generate snapshot for each
    for (const customer of customers) {
      try {
        await PortfolioSnapshotService.generateCustomerSnapshot(
          customer.id,
          new Date()
        );
      } catch (error) {
        console.error(`Snapshot failed for customer ${customer.id}:`, error);
      }
    }

    return { customers_processed: customers.length };
  }
};

// Register job
JobSchedulerService.registerJob(portfolioSnapshotJob);

// Schedule: Daily at 11:59 PM
JobSchedulerService.scheduleJob('PORTFOLIO_SNAPSHOT', {
  frequency: 'daily',
  time: '23:59',
  enabled: true
});
```

#### 1.4 Performance Sparkline Integration

**Update:** `frontend/src/components/performance/PerformanceSparkline.tsx`

**Data Source:** Portfolio snapshots

**Props:**
```typescript
interface PerformanceSparklineProps {
  customerId: number;
  timeframe: '1M' | '3M' | '6M' | '1Y' | 'ALL';
  showIndexComparison?: boolean;
  selectedIndex?: string;  // 'NIFTY50', 'SENSEX', etc.
}
```

**Functionality:**
- Fetch snapshot history for selected timeframe
- Plot total_current_value over time
- Show percentage change
- Color: Green if positive, Red if negative
- Interactive tooltips on hover

**Where to Display:**
1. Customer Overview tab (existing)
2. Cruise Control dashboard (new)
3. Goal tracking pages (with goal-specific data)

---

## 2. Dashboard Impacts

### 2.1 Cruise Control Main Dashboard

**Update:** `frontend/src/components/cruisecontrol/CruiseControlPanel.tsx`

**Required Sections:**

#### Section 1: Portfolio Overview
- Total AUM across all customers
- Total returns (absolute and %)
- Number of active customers
- Number of active investment plans
- Asset allocation breakdown (pie chart)

#### Section 2: Investment Plans Summary
- Total investment plans by asset type
- SIP vs One-time vs Recurring breakdown
- Active vs Planned investments
- Average returns by asset type

#### Section 3: Goals Summary (from Phase 2)
- Total goals across all customers
- Goals on track vs at risk
- Total target amount across all goals
- Total current amount across all goals
- Completion rate

#### Section 4: Performance Snapshots
- **Tab:** Portfolio Snapshots
- Show snapshot history table
- Filterable by customer, date range
- Downloadable as CSV/Excel

#### Section 5: Job Scheduler Status
- Show last snapshot generation time
- Show next scheduled run
- Manual trigger button
- Execution history

### 2.2 Customer Dashboard Impacts

**Update:** `frontend/src/pages/CustomerViewPage.tsx`

**New Tab:** "Investment Overview"

**Content:**
- Performance sparkline (top)
- Asset allocation pie chart (9 asset types)
- Investment plans summary cards
- Goals progress summary (from Phase 2)

**Update Overview Tab:**
- Add investment plans count widget
- Add goals summary widget
- Add performance sparkline (top)

**Update Assets Tab:**
- Group investment plans by asset type
- Show asset type totals
- Filterable by asset type

### 2.3 Advisor Dashboard Impacts

**New Widgets:**

1. **Top Performing Customers**
   - Based on returns %
   - Last 30 days

2. **Customers Needing Attention**
   - Goals at risk
   - Underperforming investments
   - No activity in 30+ days

3. **Asset Allocation Trends**
   - Line chart showing AUM by asset type over time
   - From snapshot data

4. **Investment Plans Activity**
   - New plans this month
   - SIP due this week
   - Recurring investments upcoming

### 2.4 Reports Dashboard

**Create:** `frontend/src/pages/ReportsPage.tsx`

**Available Reports:**

1. **Portfolio Summary Report**
   - Customer-wise breakdown
   - Asset-wise breakdown
   - Returns analysis
   - Date range filter

2. **Goal Progress Report**
   - All goals with current status
   - On track vs at risk
   - Projected completion dates
   - Recommendations

3. **Investment Plan Report**
   - All plans with current values
   - Asset type breakdown
   - SIP vs One-time analysis
   - Maturity dates

4. **Snapshot History Report**
   - Time series data
   - Exportable to Excel
   - Charts and graphs

---

## API Endpoints (Phase 3)

### Portfolio Snapshots
```
GET    /api/snapshots/customer/:customerId              - Get customer snapshots
GET    /api/snapshots/customer/:customerId/latest      - Get latest snapshot
GET    /api/snapshots/customer/:customerId/range       - Get snapshots for date range
POST   /api/snapshots/customer/:customerId/generate    - Manual snapshot generation

GET    /api/snapshots/tenant/summary                   - Tenant-wide snapshot summary
GET    /api/snapshots/tenant/asset-breakdown           - Asset breakdown across all customers
```

### Performance Data
```
GET    /api/performance/customer/:customerId           - Performance data for sparkline
GET    /api/performance/tenant/overview                - Tenant-wide performance
GET    /api/performance/asset-type/:assetTypeCode      - Performance by asset type
```

### Dashboard Metrics
```
GET    /api/dashboard/cruise-control                   - Cruise control dashboard data
GET    /api/dashboard/advisor                          - Advisor dashboard data
GET    /api/dashboard/customer/:customerId             - Customer dashboard data
```

### Reports
```
GET    /api/reports/portfolio-summary                  - Portfolio summary report
GET    /api/reports/goals-progress                     - Goals progress report
GET    /api/reports/investment-plans                   - Investment plans report
POST   /api/reports/export                             - Export report to Excel/PDF
```

---

## Frontend Components to Create/Update (Phase 3)

### New Components
```
frontend/src/components/dashboard/
  InvestmentPlansWidget.tsx                   - Summary widget
  GoalsSummaryWidget.tsx                      - Goals widget
  AssetAllocationChart.tsx                    - Pie chart
  TopPerformingCustomersWidget.tsx            - Top performers
  CustomersNeedingAttentionWidget.tsx         - Alerts

frontend/src/components/reports/
  ReportFilters.tsx                           - Date range, filters
  PortfolioSummaryReport.tsx                  - Portfolio report
  GoalProgressReport.tsx                      - Goals report
  InvestmentPlanReport.tsx                    - Plans report
  ExportButton.tsx                            - Export functionality

frontend/src/pages/
  ReportsPage.tsx                             - Reports main page
```

### Update Components
```
frontend/src/components/cruisecontrol/
  CruiseControlPanel.tsx                      - Add new sections
  PortfolioSnapshotsTab.tsx                   - Add investment plan data

frontend/src/pages/
  CustomerViewPage.tsx                        - Add Investment Overview tab
  DashboardPage.tsx                           - Add new widgets
```

---

## Database Schema Summary (Phase 3)

### New Tables
```sql
t_portfolio_snapshots_v2         - Enhanced snapshots with investment plans & goals
```

### Tables to Update
```sql
t_job_scheduler_configs          - Add PORTFOLIO_SNAPSHOT job config
t_job_executions                 - Track snapshot job executions
```

---

## Testing Checklist (Phase 3)

- [ ] Generate portfolio snapshot manually
- [ ] Verify snapshot includes investment plans
- [ ] Verify snapshot includes goals data
- [ ] Verify asset breakdown is correct
- [ ] Schedule automatic snapshot job
- [ ] Verify job runs at configured time
- [ ] Fetch snapshot history for date range
- [ ] Performance sparkline displays correctly
- [ ] Sparkline shows correct timeframes (1M, 3M, 6M, 1Y, ALL)
- [ ] Index comparison overlay works
- [ ] Cruise Control dashboard shows all sections
- [ ] Customer dashboard shows investment overview
- [ ] Advisor dashboard shows new widgets
- [ ] Reports page generates all reports correctly
- [ ] Export to Excel works
- [ ] Asset allocation chart displays correctly
- [ ] Top performing customers widget accurate
- [ ] Customers needing attention alerts work

---

## Migration Commands (Phase 3)

```bash
# 1. Create branch
git checkout -b claude/release-1.1-phase-3-[SESSION_ID]

# 2. Create migration file
touch backend/db/migrations/019_portfolio_snapshots_v2.sql

# 3. Update distribution scripts
# - Update 02_tables.sql (add t_portfolio_snapshots_v2)
# - Update 03_indexes_triggers.sql (add indexes)

# 4. Run migration
psql -U postgres -d kewalinvest -f backend/db/migrations/019_portfolio_snapshots_v2.sql

# 5. Register snapshot job
# Update backend/src/server.ts to register job on startup

# 6. Build and deploy
cd backend && npm run build
cd frontend && npm run build
```

---

## Key Files to Create/Modify (Phase 3)

### Backend
```
backend/db/migrations/019_portfolio_snapshots_v2.sql                         [NEW]
backend/db/ditribution scripts/02_tables.sql                                 [MODIFY]
backend/db/ditribution scripts/03_indexes_triggers.sql                       [MODIFY]

backend/src/services/portfolioSnapshot.service.ts                            [MODIFY/NEW]
backend/src/controllers/snapshot.controller.ts                               [NEW]
backend/src/controllers/dashboard.controller.ts                              [MODIFY/NEW]
backend/src/controllers/reports.controller.ts                                [NEW]
backend/src/routes/snapshot.routes.ts                                        [NEW]
backend/src/routes/dashboard.routes.ts                                       [NEW]
backend/src/routes/reports.routes.ts                                         [NEW]
backend/src/jobs/portfolioSnapshotJob.ts                                     [NEW]
backend/src/server.ts                                                        [MODIFY]
```

### Frontend
```
frontend/src/components/dashboard/InvestmentPlansWidget.tsx                  [NEW]
frontend/src/components/dashboard/GoalsSummaryWidget.tsx                     [NEW]
frontend/src/components/dashboard/AssetAllocationChart.tsx                   [NEW]
frontend/src/components/dashboard/TopPerformingCustomersWidget.tsx           [NEW]
frontend/src/components/dashboard/CustomersNeedingAttentionWidget.tsx        [NEW]

frontend/src/components/reports/ReportFilters.tsx                            [NEW]
frontend/src/components/reports/PortfolioSummaryReport.tsx                   [NEW]
frontend/src/components/reports/GoalProgressReport.tsx                       [NEW]
frontend/src/components/reports/InvestmentPlanReport.tsx                     [NEW]
frontend/src/components/reports/ExportButton.tsx                             [NEW]

frontend/src/components/cruisecontrol/CruiseControlPanel.tsx                 [MODIFY]
frontend/src/components/cruisecontrol/PortfolioSnapshotsTab.tsx              [MODIFY]
frontend/src/components/performance/PerformanceSparkline.tsx                 [MODIFY]

frontend/src/pages/ReportsPage.tsx                                           [NEW]
frontend/src/pages/CustomerViewPage.tsx                                      [MODIFY]
frontend/src/pages/DashboardPage.tsx                                         [MODIFY]
```

---

## Dependencies

**Phase 3 depends on Phase 1 AND Phase 2:**
- ✅ Investment plans system (Phase 1)
- ✅ Goals system (Phase 2)
- ✅ Goal calculations (Phase 2)
- ✅ Goal-investment allocations (Phase 2)

**Do NOT start Phase 3 until Phase 1 AND Phase 2 are fully deployed and tested!**

---

## Success Criteria (Phase 3)

- [ ] Portfolio snapshots include investment plans and goals
- [ ] Snapshots generate automatically daily
- [ ] Performance sparkline displays snapshot history
- [ ] Cruise Control dashboard shows comprehensive overview
- [ ] Customer dashboard shows investment overview tab
- [ ] Advisor dashboard has new widgets
- [ ] Reports page generates all reports
- [ ] Export functionality works (Excel/PDF)
- [ ] Asset allocation charts accurate
- [ ] All tests pass
- [ ] Distribution scripts updated

---

## Estimated Effort

**Database:** 4-6 hours
- Create new snapshot table
- Migration scripts
- Update distribution scripts

**Backend:** 16-20 hours
- Snapshot service updates
- Dashboard controllers
- Reports controllers
- Job scheduler integration
- API endpoints
- Testing

**Frontend:** 20-28 hours
- Dashboard widgets (5-6 new components)
- Reports page and components
- Update existing dashboards
- Charts and visualizations
- Testing

**Total:** 40-54 hours (5-7 days)

---

## Final Deliverables (End of Phase 3)

After Phase 3 is complete, Release 1.1 will have:

**Phase 1 ✅**
- Multi-asset investment tracking
- 9 asset types (MF, Gold, Equity, FD, PPF, EPF, NPS, Real Estate, Insurance)
- Individual and family-level management

**Phase 2 ✅**
- Goals with investment allocations
- Goal calculations and projections
- SIP/transaction impact on goals
- Goal-investment relationships (no more goal-scheme)

**Phase 3 ✅**
- Portfolio snapshots with investment plans and goals
- Performance visualization (sparklines)
- Comprehensive Cruise Control dashboard
- Customer and advisor dashboards updated
- Reports and analytics

**Release 1.1 will be COMPLETE!** 🎉

---

**END OF PHASE 3 HANDOVER**
