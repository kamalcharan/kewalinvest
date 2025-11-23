# Release 1.1 - Phase 1: Multi-Asset Portfolio Management Foundation

**Status:** ✅ COMPLETED
**Date:** November 23, 2025
**Branch:** `claude/create-asset-types-goals-01NGxV1xRVBVCobH26NzuYg6`
**Commit:** `0c25fd9`

---

## Phase 1 Scope (As Per Original Plan)

Release 1.1 is divided into **3 phases**. Phase 1 establishes the foundation for multi-asset portfolio management:

1. ✅ Create/update tables and functions required
2. ✅ Update distribution scripts with latest tables, functions, seed data
3. ✅ Rename `t_assets_types` to `m_assets_types` (global data for all tenants)
4. ✅ Complete functionality of assigning assets to users (CRUD) - individual and family

---

## What Was Completed in Phase 1

### 1. Database Schema - Tables Created ✅

#### m_asset_types (Master Asset Types)
**Purpose:** Global master data for all supported asset types (NOT tenant-isolated)

**Location:**
- Migration: `backend/db/migrations/017_add_investment_plan_fields.sql`
- Distribution: `backend/db/ditribution scripts/02_tables.sql` (SECTION 12)

**Schema:**
```sql
CREATE TABLE IF NOT EXISTS m_asset_types (
    id SERIAL PRIMARY KEY,
    asset_type_code VARCHAR(50) UNIQUE NOT NULL,
    asset_type_name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    default_assumption_rate DECIMAL(5,2),
    is_active BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 999,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Seed Data (9 Asset Types):**
- MF (Mutual Fund) - 12% default rate
- GOLD (Gold) - 8% default rate
- EQUITY (Equity) - 15% default rate
- FD (Fixed Deposit) - 6.5% default rate
- PPF (Public Provident Fund) - 7.1% default rate
- EPF (Employee Provident Fund) - 8.25% default rate
- NPS (National Pension System) - 10% default rate
- REAL_ESTATE (Real Estate) - 8% default rate
- INSURANCE (Insurance) - 5% default rate

**Location:** `backend/db/ditribution scripts/05_seed_data.sql` (SECTION 6A)

---

#### t_customer_asset_assignments (Investment Plans)
**Purpose:** Track detailed investment plans per customer (tenant-isolated)

**Schema:**
```sql
CREATE TABLE IF NOT EXISTS t_customer_asset_assignments (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES m_tenants(id),
    environment VARCHAR(20) DEFAULT 'production',
    customer_id INTEGER NOT NULL REFERENCES t_customers(id) ON DELETE CASCADE,
    asset_type_id INTEGER NOT NULL REFERENCES m_asset_types(id),

    -- Investment Details
    principal_amount DECIMAL(15,2) NOT NULL,
    start_date DATE NOT NULL,
    has_started BOOLEAN DEFAULT false,
    duration_months INTEGER,
    duration_years INTEGER,

    -- Investment Type & Frequency
    investment_type VARCHAR(20) CHECK (investment_type IN ('one_time', 'sip', 'recurring')),
    recurring_amount DECIMAL(15,2),
    investment_frequency VARCHAR(20) CHECK (investment_frequency IN ('monthly', 'quarterly', 'yearly')),

    -- Growth & Scheme
    custom_assumption_rate DECIMAL(5,2),
    scheme_code VARCHAR(100),

    -- Metadata
    notes TEXT,
    assigned_by INTEGER REFERENCES m_users(id),
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Constraints
    CONSTRAINT check_duration_exclusive CHECK (
        (duration_months IS NOT NULL AND duration_years IS NULL) OR
        (duration_months IS NULL AND duration_years IS NOT NULL)
    ),
    CONSTRAINT check_recurring_fields CHECK (
        (investment_type IN ('sip', 'recurring') AND recurring_amount IS NOT NULL AND investment_frequency IS NOT NULL) OR
        (investment_type = 'one_time' AND recurring_amount IS NULL AND investment_frequency IS NULL)
    )
);
```

---

### 2. Database Schema - Indexes & Triggers Created ✅

**Location:** `backend/db/ditribution scripts/03_indexes_triggers.sql` (SECTION 3B)

**Indexes:**
```sql
-- Asset Types Indexes
CREATE INDEX IF NOT EXISTS idx_asset_types_code ON m_asset_types(asset_type_code);
CREATE INDEX IF NOT EXISTS idx_asset_types_active ON m_asset_types(is_active, display_order);

-- Customer Asset Assignments Indexes
CREATE INDEX IF NOT EXISTS idx_customer_assets_customer ON t_customer_asset_assignments(customer_id, is_active);
CREATE INDEX IF NOT EXISTS idx_customer_assets_tenant ON t_customer_asset_assignments(tenant_id, environment);
CREATE INDEX IF NOT EXISTS idx_customer_assets_asset_type ON t_customer_asset_assignments(asset_type_id);
CREATE INDEX IF NOT EXISTS idx_customer_assets_assigned_by ON t_customer_asset_assignments(assigned_by);
CREATE INDEX IF NOT EXISTS idx_customer_assets_scheme_code ON t_customer_asset_assignments(scheme_code);
CREATE INDEX IF NOT EXISTS idx_customer_assets_investment_type ON t_customer_asset_assignments(investment_type);
CREATE INDEX IF NOT EXISTS idx_customer_assets_has_started ON t_customer_asset_assignments(has_started);
```

**Triggers:**
```sql
-- Auto-update timestamps
CREATE TRIGGER trigger_update_asset_types_updated_at
    BEFORE UPDATE ON m_asset_types
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_update_customer_assets_updated_at
    BEFORE UPDATE ON t_customer_asset_assignments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

---

### 3. Backend Implementation - CRUD APIs ✅

#### Asset Type Management

**Files Created:**
- `backend/src/types/assetType.types.ts` - TypeScript interfaces
- `backend/src/services/assetType.service.ts` - Business logic
- `backend/src/controllers/assetType.controller.ts` - API handlers
- `backend/src/routes/assetType.routes.ts` - Route definitions

**API Endpoints:**
```
GET    /api/asset-types              - List all asset types (active only by default)
GET    /api/asset-types/:id          - Get single asset type
GET    /api/asset-types/code/:code   - Get asset type by code
POST   /api/asset-types              - Create new asset type
PUT    /api/asset-types/:id          - Update asset type
DELETE /api/asset-types/:id          - Soft delete asset type
```

---

#### Investment Plan Management (Individual & Family)

**Files Created:**
- `backend/src/types/investmentPlan.types.ts` - TypeScript interfaces
- `backend/src/services/investmentPlan.service.ts` - Business logic with calculations
- `backend/src/controllers/investmentPlan.controller.ts` - API handlers
- `backend/src/routes/investmentPlan.routes.ts` - Route definitions

**API Endpoints:**

**Individual Customer:**
```
POST   /api/customers/:customerId/investments        - Create investment plan
GET    /api/customers/:customerId/investments        - List customer's investments
GET    /api/customers/:customerId/investments/:id    - Get single investment
PUT    /api/customers/:customerId/investments/:id    - Update investment plan
DELETE /api/customers/:customerId/investments/:id    - Delete investment plan
```

**Family-Level:**
```
GET    /api/family/:familyHeadId/investments         - Aggregated family investments
POST   /api/family/:familyHeadId/investments/bulk    - Bulk assign to all family members
```

**Business Logic Implemented:**
- ✅ Compound interest calculations for one-time investments
- ✅ Future value of annuity for SIP/recurring investments
- ✅ Mutual Fund scheme validation (bookmarked schemes only)
- ✅ Tenant isolation and environment support
- ✅ Duration validation (months XOR years)

---

### 4. Frontend Implementation - UI Components ✅

**Files Created:**
- `frontend/src/types/investmentPlan.types.ts` - TypeScript interfaces
- `frontend/src/types/assetType.types.ts` - TypeScript interfaces
- `frontend/src/services/investmentPlan.service.ts` - API calls
- `frontend/src/services/assetType.service.ts` - API calls
- `frontend/src/hooks/useInvestmentPlans.ts` - React hook for data fetching
- `frontend/src/hooks/useAssetTypes.ts` - React hook for asset types
- `frontend/src/components/assets/InvestmentPlanForm.tsx` - Create/Edit form
- `frontend/src/components/assets/InvestmentPlanCard.tsx` - Display card
- `frontend/src/components/assets/CustomerAssetManager.tsx` - Main container

**Files Modified:**
- `frontend/src/services/serviceURLs.ts` - Added investment & asset type endpoints
- `backend/src/server.ts` - Registered new routes

---

#### InvestmentPlanForm.tsx - Key Features

**UI Components:**
1. **Asset Type Selection** - 3×3 grid radio buttons with:
   - ✅ Visual radio circle indicator (outer circle + inner filled dot)
   - ✅ Icons/emojis for each asset type (📊 MF, 🪙 Gold, 📈 Equity, etc.)
   - ✅ Asset type name as main label
   - ✅ Asset type code as description
   - ✅ Checkmark (✓) when selected
   - ✅ Matches ImportTypeRadioSelector.tsx reference pattern

2. **Investment Name** - User-friendly identifier field

3. **MF Scheme Selection** (conditional on MF asset type)
   - ✅ Searchable dropdown with live filtering
   - ✅ Shows alias_name or scheme_name
   - ✅ Validates against bookmarked schemes only

4. **Investment Type** - Radio buttons (one_time, SIP, recurring)

5. **Frequency Selection** (conditional on SIP/recurring)
   - ✅ Radio buttons: Monthly, Quarterly, Yearly

6. **Duration Input**
   - ✅ Toggle between months/years
   - ✅ Database constraint ensures XOR

7. **Calculated End Date**
   - ✅ Real-time calculation: start_date + duration
   - ✅ Display format: "Nov 23, 2027"

**Modal Layout:**
- ✅ minWidth: 800px, maxWidth: 1100px (landscape mode, bigger screen)
- ✅ NO maxHeight, NO overflow (no scrolling - entire form visible at once)
- ✅ Theme-aware design using `colors.brand.primary`

---

### 5. Distribution Scripts Updated ✅

All distribution scripts have been updated with Phase 1 changes:

**Updated Files:**
1. `backend/db/ditribution scripts/02_tables.sql`
   - ✅ SECTION 12: m_asset_types table
   - ✅ SECTION 12: t_customer_asset_assignments table

2. `backend/db/ditribution scripts/03_indexes_triggers.sql`
   - ✅ SECTION 3B: All asset type indexes
   - ✅ SECTION 3B: All customer asset assignment indexes
   - ✅ SECTION 3B: Timestamp triggers

3. `backend/db/ditribution scripts/05_seed_data.sql`
   - ✅ SECTION 6A: Seed data for 9 asset types with ON CONFLICT DO NOTHING

**Verification:**
- ✅ All tables, indexes, triggers included
- ✅ Seed data with idempotent inserts
- ✅ Scripts can be run multiple times safely

---

## Files Created/Modified Summary

### Backend (7 new files)
```
backend/db/migrations/017_add_investment_plan_fields.sql       [NEW]
backend/src/types/assetType.types.ts                           [NEW]
backend/src/types/investmentPlan.types.ts                      [NEW]
backend/src/services/assetType.service.ts                      [NEW]
backend/src/services/investmentPlan.service.ts                 [NEW]
backend/src/controllers/assetType.controller.ts                [NEW]
backend/src/controllers/investmentPlan.controller.ts           [NEW]
backend/src/routes/assetType.routes.ts                         [NEW]
backend/src/routes/investmentPlan.routes.ts                    [NEW]
backend/src/server.ts                                          [MODIFIED]
```

### Frontend (8 new files, 1 modified)
```
frontend/src/types/assetType.types.ts                          [NEW]
frontend/src/types/investmentPlan.types.ts                     [NEW]
frontend/src/services/assetType.service.ts                     [NEW]
frontend/src/services/investmentPlan.service.ts                [NEW]
frontend/src/hooks/useAssetTypes.ts                            [NEW]
frontend/src/hooks/useInvestmentPlans.ts                       [NEW]
frontend/src/components/assets/InvestmentPlanForm.tsx          [NEW]
frontend/src/components/assets/InvestmentPlanCard.tsx          [NEW]
frontend/src/components/assets/CustomerAssetManager.tsx        [NEW]
frontend/src/services/serviceURLs.ts                           [MODIFIED]
```

### Database Scripts (3 modified)
```
backend/db/ditribution scripts/02_tables.sql                   [MODIFIED - SECTION 12]
backend/db/ditribution scripts/03_indexes_triggers.sql         [MODIFIED - SECTION 3B]
backend/db/ditribution scripts/05_seed_data.sql                [MODIFIED - SECTION 6A]
```

---

## Testing Completed ✅

- [x] Create investment plan for each of 9 asset types
- [x] MF scheme validation (bookmarked only)
- [x] One-time investment creation
- [x] SIP investment creation
- [x] Recurring investment creation
- [x] Duration validation (months XOR years enforced)
- [x] Start date + duration = end date calculation working
- [x] Custom growth rate override
- [x] Update investment plan
- [x] Delete investment plan
- [x] List customer's investments
- [x] Family-level aggregation
- [x] Theme-aware UI (colors.brand.primary)
- [x] Responsive layout (no scrolling, bigger modal)
- [x] Searchable MF dropdown
- [x] Radio buttons match reference pattern (ImportTypeRadioSelector.tsx)

---

## Known Issues Resolved ✅

### Issue 1: Missing Backend Files
**Problem:** assetType.service.ts and assetType.types.ts were missing, backend crashed
**Resolution:** Created both files, merged to feature branch

### Issue 2: Missing Seed Data
**Problem:** 05_seed_data.sql had no asset type seed data
**Resolution:** Added SECTION 6A with 9 asset types + ON CONFLICT DO NOTHING

### Issue 3: Radio Buttons Not Matching Reference
**Problem:** Only showed text, no visual radio circles/icons/checkmarks
**Resolution:** Updated to match ImportTypeRadioSelector.tsx pattern exactly

### Issue 4: Forced Scrolling
**Problem:** Modal had maxHeight: 90vh and overflow: auto
**Resolution:** Removed constraints, increased width to 800-1100px

### Issue 5: Documentation Location
**Problem:** Documentation in backend/db/ instead of reference/
**Resolution:** Will be moved to reference/ folder (pending)

---

## Architecture Patterns Followed

### Backend
- ✅ Service Layer Pattern (static class methods)
- ✅ Controller Pattern (arrow functions for proper `this` binding)
- ✅ AuthenticatedRequest with user/tenant/environment
- ✅ Tenant isolation throughout

### Frontend
- ✅ Service Layer using apiService wrapper (not raw axios)
- ✅ API_ENDPOINTS from serviceURLs.ts (not hardcoded)
- ✅ Custom hooks for data fetching (useInvestmentPlans, useAssetTypes)
- ✅ Inline styles with theme system (not Tailwind)
- ✅ Proper radio button pattern (opacity: 0, absolute positioning)

---

## Deployment Checklist

### 1. Pull Latest Code
```bash
git checkout claude/create-asset-types-goals-01NGxV1xRVBVCobH26NzuYg6
git pull origin claude/create-asset-types-goals-01NGxV1xRVBVCobH26NzuYg6
```

### 2. Run Database Migration
```bash
psql -U postgres -d kewalinvest -f "backend/db/ditribution scripts/02_tables.sql"
psql -U postgres -d kewalinvest -f "backend/db/ditribution scripts/03_indexes_triggers.sql"
psql -U postgres -d kewalinvest -f "backend/db/ditribution scripts/05_seed_data.sql"
```

### 3. Rebuild Backend
```bash
cd backend
npm install
npm run build
npm start
```

### 4. Rebuild Frontend
```bash
cd frontend
npm install
npm run build
```

### 5. Verify
- ✅ Backend starts without errors
- ✅ 9 asset types appear in dropdown
- ✅ Can create investment plan
- ✅ Can edit/delete investment plan
- ✅ Radio buttons show icons, circles, checkmarks
- ✅ No scrolling in modal

---

## What's Next? Phase 2 & 3

Phase 1 is **COMPLETE**. See separate handover documents:

- **RELEASE-1.1-PHASE-2-HANDOVER.md** - Goal creation, calculations, impacts
- **RELEASE-1.1-PHASE-3-HANDOVER.md** - Cruise control, snapshots, dashboards

---

## Contributors

- **Development:** Claude AI Agent
- **Review:** Kamal Charan
- **Testing:** Kewal Investment Team

---

**END OF PHASE 1 DOCUMENTATION**
