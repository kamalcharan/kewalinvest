# Release 1.1 - Multi-Asset Portfolio Management System

**Release Date:** TBD
**Version:** 1.1.0
**Branch:** claude/Release1-*
**Status:** In Development

---

## 📋 **OVERVIEW**

This release transforms the platform from a **Mutual Fund-only** portfolio system to a comprehensive **Multi-Asset Portfolio Management Platform** supporting:

- Mutual Funds (MF)
- Gold
- Silver
- Equity/Stocks
- Fixed Deposits (FD)
- PPF
- NSC
- Real Estate
- Bonds
- And any future asset types

---

## 🎯 **RELEASE OBJECTIVES**

1. Enable customers to track all asset types in one platform
2. Create investment plans for different asset types
3. Calculate comprehensive networth across all assets
4. Project future networth with consumed vs projected views
5. Track goal achievability with multi-asset portfolios
6. Provide family-level networth aggregation

---

## 📦 **3-PHASE IMPLEMENTATION PLAN**

---

# **PHASE 1: FOUNDATION - ASSET TYPES & ASSIGNMENTS**

## **Goals:**
- Create master data for asset types
- Enable customers to be assigned multiple asset types
- Support individual and family-level asset assignments
- Update distribution scripts

## **Database Changes:**

### **New Tables:**

#### 1. `m_asset_types` (Master Data)
```sql
CREATE TABLE m_asset_types (
    id SERIAL PRIMARY KEY,
    asset_type_code VARCHAR(50) NOT NULL UNIQUE,
    asset_type_name VARCHAR(100) NOT NULL,
    category VARCHAR(50), -- equity, debt, commodity, real_estate, fixed_income
    default_assumption_rate DECIMAL(5,2), -- e.g., 8.00 for 8% per year
    is_active BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Seed Data:**
| Code | Name | Category | Default Rate | Order |
|------|------|----------|--------------|-------|
| MF | Mutual Fund | equity/debt | 12.00 | 1 |
| GOLD | Gold | commodity | 8.00 | 2 |
| SILVER | Silver | commodity | 8.00 | 3 |
| EQUITY | Equity/Stocks | equity | 15.00 | 4 |
| FD | Fixed Deposit | fixed_income | 7.00 | 5 |
| PPF | Public Provident Fund | fixed_income | 7.10 | 6 |
| NSC | National Savings Certificate | fixed_income | 7.70 | 7 |
| RE | Real Estate | real_estate | 10.00 | 8 |
| BONDS | Bonds | debt | 8.50 | 9 |

#### 2. `t_customer_asset_assignments`
```sql
CREATE TABLE t_customer_asset_assignments (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES t_tenants(id),
    is_live BOOLEAN NOT NULL DEFAULT true,
    customer_id INTEGER NOT NULL REFERENCES t_customers(id) ON DELETE CASCADE,
    asset_type_id INTEGER NOT NULL REFERENCES m_asset_types(id),
    is_active BOOLEAN DEFAULT true,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    assigned_by INTEGER REFERENCES t_users(id),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT unique_customer_asset UNIQUE(tenant_id, is_live, customer_id, asset_type_id)
);
```

### **Indexes:**
```sql
CREATE INDEX idx_asset_types_code ON m_asset_types(asset_type_code);
CREATE INDEX idx_asset_types_active ON m_asset_types(is_active, display_order);
CREATE INDEX idx_customer_assets_customer ON t_customer_asset_assignments(customer_id, is_active);
CREATE INDEX idx_customer_assets_tenant ON t_customer_asset_assignments(tenant_id, is_live, customer_id);
```

---

## **Backend Implementation:**

### **New Files:**

#### Types:
- `/backend/src/types/assetType.types.ts`
- `/backend/src/types/customerAsset.types.ts`

#### Services:
- `/backend/src/services/assetType.service.ts` - Asset type CRUD
- `/backend/src/services/customerAsset.service.ts` - Customer asset assignment CRUD

#### Controllers:
- `/backend/src/controllers/assetType.controller.ts`
- `/backend/src/controllers/customerAsset.controller.ts`

#### Routes:
- `/backend/src/routes/assetType.routes.ts`
- `/backend/src/routes/customerAsset.routes.ts`

### **Updated Files:**
- `/backend/src/types/family.types.ts` - Add `FamilyAssetSummary`
- `/backend/src/services/family.service.ts` - Add `getFamilyAssets()`
- `/backend/src/routes/family.routes.ts` - Add family asset endpoints

---

## **API Endpoints - Phase 1:**

### Asset Types (Master Data):
```
GET    /api/asset-types                    # Get all active asset types
GET    /api/asset-types/:id                # Get single asset type
POST   /api/asset-types                    # Create asset type (Admin)
PUT    /api/asset-types/:id                # Update asset type (Admin)
DELETE /api/asset-types/:id                # Soft delete asset type (Admin)
```

### Customer Asset Assignments:
```
GET    /api/customers/:customerId/assets                    # Get customer's assigned assets
POST   /api/customers/:customerId/assets                    # Assign asset to customer
DELETE /api/customers/:customerId/assets/:assetTypeId       # Remove asset assignment
POST   /api/customers/:customerId/assets/bulk               # Bulk assign multiple assets
```

### Family Asset Assignments:
```
GET    /api/family/:familyHeadId/assets                     # Get family assets aggregated
POST   /api/family/:familyHeadId/assets/bulk                # Assign to all family members
```

---

## **Frontend Implementation:**

### **New Files:**

#### Types:
- `/frontend/src/types/assetType.types.ts`
- `/frontend/src/types/customerAsset.types.ts`

#### Services:
- `/frontend/src/services/assetType.service.ts`
- `/frontend/src/services/customerAsset.service.ts`

#### Hooks:
- `/frontend/src/hooks/useAssetTypes.ts`
- `/frontend/src/hooks/useCustomerAssets.ts`

#### Components:
- `/frontend/src/components/assets/AssetTypeManager.tsx` - Admin: manage asset types
- `/frontend/src/components/assets/CustomerAssetSelector.tsx` - Multi-select for customer
- `/frontend/src/components/assets/CustomerAssetList.tsx` - Display customer's assets
- `/frontend/src/components/assets/CustomerAssetCard.tsx` - Individual asset card
- `/frontend/src/components/assets/FamilyAssetView.tsx` - Family asset view
- `/frontend/src/components/assets/AssetAssignmentModal.tsx` - Bulk assignment modal

#### Pages:
- `/frontend/src/pages/admin/AssetTypesPage.tsx` - Asset type management

### **Updated Files:**
- `/frontend/src/pages/customers/CustomerViewPage.tsx` - Add "Asset Assignments" tab
- `/frontend/src/components/family/FamilyPortfolioView.tsx` - Add family assets section

---

## **Distribution Scripts:**

### Updated:
- `/backend/db/distribution scripts/02_tables.sql` - Add new tables
- `/backend/db/distribution scripts/03_indexes_triggers.sql` - Add indexes
- `/backend/db/distribution scripts/04_seed_data.sql` - Add asset types seed data

---

## **Migration Scripts:**

- `/backend/db/migrations/015_create_asset_types.sql`
- `/backend/db/migrations/016_create_customer_asset_assignments.sql`

---

## **Testing:**

- Unit tests for asset type service
- Unit tests for customer asset service
- Integration tests for asset assignment flow

---

## **Phase 1 Deliverables:**

- ✅ 2 new database tables
- ✅ 8 new backend files
- ✅ 13 new frontend files
- ✅ 11 new API endpoints
- ✅ Updated distribution scripts
- ✅ Asset type master data (9 asset types)
- ✅ Customer can be assigned multiple asset types
- ✅ Family-level asset aggregation

---

# **PHASE 2: GOALS & INVESTMENT PLANS**

## **Goals:**
- Create investment plans using JTBD architecture
- Add withdrawal targets to goals
- Remove goal-scheme relationships
- Calculate cumulative goals
- **SIP compliance - To be discussed**

## **Database Changes:**

### **New Tables:**

#### 1. `t_goal_withdrawals`
```sql
CREATE TABLE t_goal_withdrawals (
    id SERIAL PRIMARY KEY,
    goal_id INTEGER NOT NULL REFERENCES t_jtbd_configurations(id) ON DELETE CASCADE,
    tenant_id INTEGER NOT NULL REFERENCES t_tenants(id),
    is_live BOOLEAN NOT NULL DEFAULT true,
    withdrawal_amount DECIMAL(18,2) NOT NULL,
    withdrawal_date DATE NOT NULL,
    description TEXT,
    withdrawal_type VARCHAR(50) DEFAULT 'intermediate', -- 'intermediate', 'final'
    is_completed BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### **Modified Tables:**

#### `t_jtbd_configurations`
```sql
ALTER TABLE t_jtbd_configurations
ADD COLUMN asset_type_code VARCHAR(50),
ADD COLUMN linked_goal_id INTEGER REFERENCES t_jtbd_configurations(id);

CREATE INDEX idx_jtbd_asset_type ON t_jtbd_configurations(customer_id, jtbd_type, asset_type_code);
CREATE INDEX idx_jtbd_linked_goal ON t_jtbd_configurations(linked_goal_id);
```

### **Data Cleanup:**
```sql
-- Remove goal-scheme relationships from config_data JSONB
UPDATE t_jtbd_configurations
SET config_data = config_data - 'linked_schemes'
WHERE jtbd_type IN ('goal_time_based', 'goal_price_based', 'goal_time_and_price');
```

---

## **Backend Implementation:**

### **New Files:**

#### Types:
- `/backend/src/types/investmentPlan.types.ts`

#### Services:
- `/backend/src/services/investmentPlan.service.ts` - Investment plan CRUD using JTBD

#### Controllers:
- `/backend/src/controllers/investmentPlan.controller.ts`

#### Routes:
- `/backend/src/routes/investmentPlan.routes.ts`

### **Updated Files (Major):**
- `/backend/src/services/goal.service.ts` - Remove scheme logic, add withdrawals
- `/backend/src/services/goal.calculator.service.ts` - Update calculations for withdrawals
- `/backend/src/types/goal.types.ts` - Remove LinkedScheme, add GoalWithdrawal
- `/backend/src/services/family.service.ts` - Add cumulative goal methods

---

## **API Endpoints - Phase 2:**

### Investment Plans (JTBD):
```
POST   /api/investment-plans                                # Create investment plan
GET    /api/investment-plans/:id                            # Get single plan
PUT    /api/investment-plans/:id                            # Update plan
DELETE /api/investment-plans/:id                            # Delete plan
GET    /api/customers/:customerId/investment-plans          # Get all customer plans
POST   /api/investment-plans/:id/start                      # Mark plan as started
```

### Goal Withdrawals:
```
POST   /api/goals/:goalId/withdrawals                       # Add withdrawal target
PUT    /api/goals/:goalId/withdrawals/:id                   # Update withdrawal
DELETE /api/goals/:goalId/withdrawals/:id                   # Delete withdrawal
GET    /api/goals/:goalId/withdrawals                       # Get all withdrawals
```

### Cumulative Goals:
```
GET    /api/customers/:customerId/goals/cumulative          # Get cumulative summary
GET    /api/family/:familyHeadId/goals/cumulative           # Family cumulative goals
```

### **Removed Endpoints:**
```
❌ POST   /api/goals/:goalId/schemes                        # REMOVED
❌ PUT    /api/goals/:goalId/schemes/rebalance              # REMOVED
❌ GET    /api/goals/:goalId/allocation-utilization         # REMOVED
```

---

## **Frontend Implementation:**

### **New Files:**

#### Components:
- `/frontend/src/components/investments/InvestmentPlanForm.tsx` - Create/edit plans
- `/frontend/src/components/investments/InvestmentPlanList.tsx` - List plans
- `/frontend/src/components/investments/InvestmentPlanCard.tsx` - Plan card
- `/frontend/src/components/investments/AssetTypeGroupedPlans.tsx` - Grouped view
- `/frontend/src/components/goals/GoalWithdrawalForm.tsx` - Add withdrawals
- `/frontend/src/components/goals/GoalWithdrawalTimeline.tsx` - Withdrawal timeline
- `/frontend/src/components/goals/CumulativeGoalSummary.tsx` - Cumulative view

#### Pages:
- `/frontend/src/pages/investments/InvestmentPlansPage.tsx`

### **Updated Files (Major):**
- `/frontend/src/components/goals/GoalWizardModal.tsx` - REMOVE scheme selection
- `/frontend/src/components/goals/GoalDetailsModal.tsx` - REMOVE allocations, ADD withdrawals
- `/frontend/src/pages/customers/CustomerViewPage.tsx` - Add Investment Plans tab

### **Deleted Files:**
- ❌ `/frontend/src/components/goals/forms/GoalSchemeSelector.tsx`
- ❌ `/frontend/src/components/goals/SmartAllocationCard.tsx`
- ❌ `/frontend/src/components/goals/AssetAllocationUtilization.tsx`

---

## **Phase 2 Deliverables:**

- ✅ 1 new database table
- ✅ 2 modified database tables
- ✅ 4 new backend files
- ✅ 10 new frontend files
- ✅ 6 major backend file updates
- ✅ 9 major frontend file updates
- ✅ 3 frontend file deletions
- ✅ 14 new API endpoints
- ✅ 3 removed API endpoints
- ✅ Investment plans for all asset types
- ✅ Goal withdrawals support
- ✅ Removed goal-scheme coupling

**Deferred:**
- ⏸️ SIP compliance tracking (to be discussed)

---

# **PHASE 3: SNAPSHOTS, CRUISE CONTROL, DASHBOARD**

## **Goals:**
- Multi-asset snapshot calculation
- Consumed vs projected snapshots
- Goal achievability inference
- Enhanced dashboard with multi-asset charts
- Family networth charts

## **Database Changes:**

### **New Tables:**

#### 1. `t_projected_portfolio_snapshots`
```sql
CREATE TABLE t_projected_portfolio_snapshots (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES t_tenants(id),
    is_live BOOLEAN NOT NULL DEFAULT true,
    customer_id INTEGER NOT NULL REFERENCES t_customers(id),
    projection_date DATE NOT NULL,
    projected_value DECIMAL(18,2),
    asset_breakdown JSONB DEFAULT '{}'::jsonb,
    calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    projection_basis VARCHAR(50), -- 'avg_6m_growth', 'assumption_rate'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT unique_projection UNIQUE(tenant_id, is_live, customer_id, projection_date)
);
```

### **Modified Tables:**

#### `t_monthly_portfolio_snapshots`
```sql
ALTER TABLE t_monthly_portfolio_snapshots
ADD COLUMN asset_breakdown JSONB DEFAULT '{}'::jsonb,
ADD COLUMN snapshot_type VARCHAR(20) DEFAULT 'consumed';

-- Example asset_breakdown:
-- {"mf": 500000, "gold": 100000, "equity": 200000, "fd": 150000, "total": 950000}
```

---

## **Backend Implementation:**

### **New Files:**

#### Types:
- `/backend/src/types/projectionSnapshot.types.ts`

#### Services:
- `/backend/src/services/projectionSnapshot.service.ts` - Calculate projections
- `/backend/src/services/assetValuation.service.ts` - Value all asset types
- `/backend/src/services/goalInference.service.ts` - Check goal achievability

#### Controllers:
- `/backend/src/controllers/projectionSnapshot.controller.ts`

#### Routes:
- `/backend/src/routes/projectionSnapshot.routes.ts`

#### Jobs:
- `/backend/src/jobs/projectionRegeneration.job.ts` - Daily projection regeneration

### **Updated Files (Critical):**
- `/backend/src/services/portfolioSnapshot.service.ts` - **MAJOR:** Multi-asset calculation
- `/backend/src/services/portfolioSnapshotScheduler.service.ts` - Trigger projections
- `/backend/src/types/portfolioSnapshot.types.ts` - Add AssetBreakdown interface

---

## **API Endpoints - Phase 3:**

### Enhanced Portfolio Snapshots:
```
GET    /api/portfolio/:customerId/snapshots?type=consumed          # Actual snapshots
GET    /api/portfolio/:customerId/snapshots?type=projected         # Projected snapshots
GET    /api/portfolio/:customerId/snapshots/asset-breakdown        # Asset-wise breakdown
GET    /api/portfolio/:customerId/snapshots/asset/:assetType       # Filter by asset
```

### Projected Snapshots:
```
GET    /api/projections/:customerId                                # Get all projections
POST   /api/projections/:customerId/regenerate                     # Regenerate projections
GET    /api/projections/:customerId/date/:date                     # Projection for date
GET    /api/projections/family/:familyHeadId                       # Family projections
```

### Goal Inference:
```
GET    /api/goals/:goalId/achievability                            # Check achievability
GET    /api/goals/:goalId/recommendations                          # Get recommendations
GET    /api/customers/:customerId/goals/inference                  # Check all goals
```

---

## **Frontend Implementation:**

### **New Files:**

#### Components:
- `/frontend/src/components/charts/MultiAssetNetworthChart.tsx` - Multi-asset chart
- `/frontend/src/components/charts/ConsumedVsProjectedChart.tsx` - Solid vs dashed lines
- `/frontend/src/components/charts/AssetBreakdownChart.tsx` - Pie/bar chart
- `/frontend/src/components/charts/ChartViewModeSelector.tsx` - View mode toggle
- `/frontend/src/components/goals/GoalAchievabilityCard.tsx` - Achievability status
- `/frontend/src/components/goals/GoalRecommendations.tsx` - Recommendations
- `/frontend/src/components/portfolio/AssetBreakdownTable.tsx` - Breakdown table
- `/frontend/src/components/portfolio/PerformanceSparklineMultiAsset.tsx` - Sparkline
- `/frontend/src/components/family/FamilyNetworthChart.tsx` - Family chart

### **Updated Files (Critical):**
- `/frontend/src/pages/Dashboard.tsx` - **MAJOR:** Multi-asset chart, view modes
- `/frontend/src/components/portfolio/PortfolioSnapshotsTable.tsx` - Asset breakdown columns
- `/frontend/src/components/goals/GoalProgressTracker.tsx` - Achievability display
- `/frontend/src/components/family/FamilyPortfolioView.tsx` - Multi-asset family view

---

## **Phase 3 Deliverables:**

- ✅ 1 new database table
- ✅ 1 modified database table
- ✅ 7 new backend files
- ✅ 12 new frontend files
- ✅ 5 major backend updates
- ✅ 7 major frontend updates
- ✅ 12 new API endpoints
- ✅ Multi-asset snapshot calculation
- ✅ Consumed vs projected views
- ✅ Goal achievability inference
- ✅ Enhanced dashboard

---

# 📊 **OVERALL RELEASE STATISTICS**

## **Database:**
- **New Tables:** 5
- **Modified Tables:** 5
- **Total Indexes:** 15+
- **Seed Data:** 9 asset types

## **Backend:**
- **New Files:** 27
- **Updated Files:** 14
- **Total Backend Changes:** 41 files

## **Frontend:**
- **New Files:** 43
- **Updated Files:** 19
- **Deleted Files:** 3
- **Total Frontend Changes:** 65 files

## **API:**
- **New Endpoints:** 44
- **Modified Endpoints:** 2
- **Removed Endpoints:** 3

## **Jobs:**
- **New Background Jobs:** 4

## **Tests:**
- **New Test Files:** 14
- **Updated Tests:** 1

---

# 🎯 **KEY ARCHITECTURAL DECISIONS**

## 1. **Master Data Pattern**
- Asset types stored as `m_asset_types` (master data)
- Not tenant-isolated - global across all tenants
- Allows centralized asset type management

## 2. **JTBD-Based Investment Plans**
- Reuse existing `t_jtbd_configurations` table
- Add `jtbd_type = 'investment_plan'`
- Flexible JSONB config for asset-specific data
- Natural link to goals via `linked_goal_id`

## 3. **Multi-Asset Valuation**
- MF: Actual transactions + NAV (existing)
- Other assets: Investment plan assumptions + time-based growth
- Hybrid approach for accuracy and flexibility

## 4. **Consumed vs Projected Split**
- Consumed: Historical actuals (solid line)
- Projected: Future estimates (dashed line)
- MF projections: 6-month average growth
- Other assets: Assumption-based growth

## 5. **No Migration Required**
- Clean database assumption
- All changes are additive
- No backward compatibility concerns

---

# 🚀 **RELEASE READINESS CHECKLIST**

## **Phase 1:**
- [ ] Database migrations tested
- [ ] Distribution scripts updated
- [ ] Seed data loaded
- [ ] Backend APIs tested
- [ ] Frontend UI functional
- [ ] Asset assignment works for individuals
- [ ] Asset assignment works for families
- [ ] Admin can manage asset types

## **Phase 2:**
- [ ] Investment plans CRUD working
- [ ] Goal withdrawals functional
- [ ] Goal-scheme relationships removed
- [ ] Cumulative goals calculated correctly
- [ ] Investment plans link to goals
- [ ] UI updated for new goal flow
- [ ] Deleted components removed

## **Phase 3:**
- [ ] Multi-asset snapshots calculated
- [ ] Projected snapshots generated
- [ ] Dashboard shows multi-asset chart
- [ ] Consumed vs projected toggle works
- [ ] Goal achievability checks working
- [ ] Recommendations generated
- [ ] Family charts updated
- [ ] Performance metrics accurate

---

# 📝 **KNOWN LIMITATIONS**

1. **SIP Compliance:** Deferred to Phase 2 discussion
2. **Liabilities:** Not included in this release
3. **Bank Accounts:** Not included in this release
4. **Non-MF Transactions:** Rely on investment plan assumptions only
5. **Market Data Integration:** Not included (assumption-based only)
6. **Manual Valuations:** Not included for Phase 1-3
7. **Maturity Tracking:** Basic support via investment plan dates only

---

# 🔮 **FUTURE ENHANCEMENTS (Post 1.1)**

- Liability/loan tracking
- Bank account integration
- Transaction tracking for non-MF assets
- Market data feeds (gold price, stock prices)
- Manual valuation updates
- Maturity alerts
- Portfolio rebalancing
- Tax reports
- Advanced reporting & exports
- Insurance/ULIP tracking
- Crypto asset support

---

**End of Release 1.1 Documentation**
