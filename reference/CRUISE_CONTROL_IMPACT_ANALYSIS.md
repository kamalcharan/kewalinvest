# Impact Analysis: Cruise Control Feature

**Version:** 1.0
**Date:** 2025-01-23
**Analyzed By:** System Analysis
**Status:** Draft - Awaiting Review

---

## Table of Contents
1. [Executive Summary](#executive-summary)
2. [Scope of Changes](#scope-of-changes)
3. [Database Impact](#database-impact)
4. [Backend Impact](#backend-impact)
5. [Frontend Impact](#frontend-impact)
6. [Security Impact](#security-impact)
7. [Performance Impact](#performance-impact)
8. [Integration Impact](#integration-impact)
9. [Migration Impact](#migration-impact)
10. [Testing Impact](#testing-impact)
11. [Deployment Impact](#deployment-impact)
12. [Risk Assessment](#risk-assessment)
13. [Resource Requirements](#resource-requirements)
14. [Timeline Estimate](#timeline-estimate)

---

## Executive Summary

### Overall Impact: **HIGH**

The Cruise Control feature represents a **major architectural change** affecting:
- 3 new database tables + 2 modified tables
- 15+ new backend endpoints
- 10+ new frontend components
- Changes to existing NAV and Market download flows
- Migration of existing alert system
- Role-based access control changes

### Breaking Changes
1. **NAV Scheduler**: Moves from tenant-level to admin-only
2. **Market Scheduler**: UI access restricted to admin
3. **Alert System**: Migrates from customer pages to Cruise Control
4. **Auto-Metric Calculation**: New behavior after downloads

### Benefits
- Centralized monitoring reduces cognitive load
- Auto-metric calculation improves data freshness
- Admin-only schedulers prevent duplicate configs
- Better visibility into system health

### Risks
- Large code surface area increases bug potential
- Migration complexity for existing data
- Performance impact of auto-metric calculations
- User training needed for new UI

---

## Scope of Changes

### Quantitative Analysis

| Category | New | Modified | Deleted | Total Changes |
|----------|-----|----------|---------|---------------|
| **Database Tables** | 3 | 2 | 0 | 5 |
| **Database Views** | 2 | 0 | 0 | 2 |
| **Backend Services** | 5 | 3 | 0 | 8 |
| **Backend Routes** | 1 file (15+ endpoints) | 2 | 0 | 3 |
| **Backend Types** | 3 | 2 | 0 | 5 |
| **Frontend Pages** | 4 | 1 | 0 | 5 |
| **Frontend Components** | 10 | 3 | 0 | 13 |
| **Frontend Hooks** | 4 | 1 | 0 | 5 |
| **API Endpoints** | 15 | 5 | 0 | 20 |
| **Database Migrations** | 3 scripts | 0 | 0 | 3 |

**Total Estimated LOC**: 5,000 - 7,000 lines of code

---

## Database Impact

### New Tables

#### 1. `t_cruise_control_alerts`
**Impact**: Medium
- **Size Estimate**: 10,000 - 50,000 rows per year per tenant
- **Indexes**: 2 new indexes
- **Foreign Keys**: 3 references (t_tenants, t_customers, t_users)
- **Performance**: Queries filtered by tenant_id + is_live (indexed)
- **Retention**: Requires cleanup policy (recommend 90 days)

**Impact on Existing Code**:
- ✅ No breaking changes
- ⚠️ Need to migrate existing alert data

#### 2. `t_cruise_control_alert_rules`
**Impact**: Low
- **Size Estimate**: 10-50 rows per tenant (low volume)
- **Indexes**: 1 unique constraint
- **Foreign Keys**: 2 references (t_tenants, t_users)
- **Performance**: Minimal (small table)

**Impact on Existing Code**:
- ✅ No breaking changes
- ⚠️ Need to define default rules per tenant

#### 3. Database Views
**Impact**: Low
- `v_nav_monitoring_stats` - Read-only, no impact on writes
- `v_market_monitoring_stats` - Read-only, no impact on writes
- **Performance**: Views should be fast (aggregates over indexed columns)
- **Materialized Views**: Consider if counts become slow (future optimization)

### Modified Tables

#### 1. `m_nav_schemes`
**Added Columns**:
```sql
latest_metrics_calculated_date DATE
metrics_calculation_status VARCHAR(20)
```

**Impact**: Medium
- **Existing Rows**: ~10,000+ rows need backfill
- **Migration**: Set initial values to NULL or earliest date
- **Indexes**: May need index on `metrics_calculation_status` for filtering
- **Disk Space**: Minimal (~24 bytes per row)

**Impact on Existing Code**:
- ✅ Backward compatible (nullable columns)
- ⚠️ Existing queries unaffected
- ⚠️ New columns need to be updated in scheme CRUD operations

#### 2. `t_market_indices`
**Added Columns**: Same as `m_nav_schemes`

**Impact**: Low
- **Existing Rows**: ~10-50 rows (small table)
- **Migration**: Easy backfill
- **Disk Space**: Negligible

**Impact on Existing Code**:
- ✅ Backward compatible
- ⚠️ Update market index CRUD operations

#### 3. `t_nav_scheduler_configs`
**Added Column**:
```sql
is_admin_config BOOLEAN DEFAULT false
```

**Impact**: Low-Medium
- **Existing Rows**: Need to mark existing configs as admin-owned
- **Migration**: `UPDATE t_nav_scheduler_configs SET is_admin_config = true`
- **Disk Space**: Minimal (1 byte per row)

**Impact on Existing Code**:
- ⚠️ **BREAKING**: Scheduler logic must filter by `is_admin_config = true`
- ⚠️ UI must hide scheduler config from non-admin users
- ⚠️ API must enforce admin-only access

### Migration Scripts Required

#### Migration 1: Add Metric Tracking Columns
```sql
-- File: backend/db/migrations/001_add_metric_tracking.sql
ALTER TABLE m_nav_schemes
ADD COLUMN IF NOT EXISTS latest_metrics_calculated_date DATE,
ADD COLUMN IF NOT EXISTS metrics_calculation_status VARCHAR(20) DEFAULT 'pending';

ALTER TABLE t_market_indices
ADD COLUMN IF NOT EXISTS latest_metrics_calculated_date DATE,
ADD COLUMN IF NOT EXISTS metrics_calculation_status VARCHAR(20) DEFAULT 'pending';

-- Backfill with current dates (assume metrics already calculated)
UPDATE m_nav_schemes SET latest_metrics_calculated_date = latest_nav_date WHERE latest_nav_date IS NOT NULL;
UPDATE t_market_indices SET latest_metrics_calculated_date = latest_date WHERE latest_date IS NOT NULL;

-- Create indexes
CREATE INDEX idx_nav_schemes_metrics_status ON m_nav_schemes(metrics_calculation_status) WHERE metrics_calculation_status != 'completed';
CREATE INDEX idx_market_indices_metrics_status ON t_market_indices(metrics_calculation_status) WHERE metrics_calculation_status != 'completed';
```

#### Migration 2: Create Alert Tables
```sql
-- File: backend/db/migrations/002_create_alert_tables.sql
CREATE TABLE t_cruise_control_alerts ( ... );
CREATE TABLE t_cruise_control_alert_rules ( ... );

CREATE INDEX idx_alerts_tenant_status ON t_cruise_control_alerts(tenant_id, is_live, status);
CREATE INDEX idx_alerts_customer ON t_cruise_control_alerts(customer_id);
CREATE INDEX idx_alerts_triggered ON t_cruise_control_alerts(triggered_at DESC);
```

#### Migration 3: Create Statistics Views
```sql
-- File: backend/db/migrations/003_create_monitoring_views.sql
CREATE VIEW v_nav_monitoring_stats AS ...;
CREATE VIEW v_market_monitoring_stats AS ...;
```

#### Migration 4: Update Scheduler Configs
```sql
-- File: backend/db/migrations/004_update_scheduler_configs.sql
ALTER TABLE t_nav_scheduler_configs
ADD COLUMN IF NOT EXISTS is_admin_config BOOLEAN DEFAULT false;

-- Mark all existing configs as admin configs
UPDATE t_nav_scheduler_configs SET is_admin_config = true WHERE is_admin_config IS NULL OR is_admin_config = false;

-- Note: May need to manually review and assign ownership
```

### Data Migration Scripts

#### Data Migration 1: Alert Data Migration
```sql
-- File: backend/db/migrations/data/migrate_alerts.sql
-- Migrate existing JTBD/Goal alerts to new alert system
-- (Requires custom logic based on existing alert storage)

-- Example:
INSERT INTO t_cruise_control_alerts (tenant_id, is_live, alert_type, customer_id, alert_message, status, triggered_at)
SELECT
    tenant_id,
    is_live,
    'jtbd_trigger',
    customer_id,
    alert_description,
    'active',
    created_at
FROM t_jtbd_alerts  -- Assuming this table exists
WHERE status = 'active';
```

**Impact on Existing Code**:
- ⚠️ Need to identify current alert storage location
- ⚠️ May need to keep both systems running during transition
- ⚠️ Need to update customer pages to read from new table

### Performance Considerations

#### Query Performance Impact

**Before (Current)**:
```sql
-- Current NAV status query (no metrics tracking)
SELECT COUNT(*) FROM m_nav_schemes WHERE download_status = 'pending';
-- Execution: ~5ms for 10K rows
```

**After (With Cruise Control)**:
```sql
-- New NAV monitoring query (with metrics tracking)
SELECT
    COUNT(*) FILTER (WHERE end_date IS NULL) as total_active,
    COUNT(*) FILTER (WHERE latest_nav_date < CURRENT_DATE) as pending_downloads,
    COUNT(*) FILTER (WHERE download_status = 'failed') as failed_downloads,
    COUNT(*) FILTER (WHERE latest_metrics_calculated_date < latest_nav_date) as metrics_pending
FROM m_nav_schemes;
-- Execution: ~10-15ms for 10K rows (more complex aggregations)
```

**Optimization Strategy**:
- Use materialized views if counts become slow
- Create partial indexes on status columns
- Consider caching dashboard stats (refresh every 30s)

#### Write Performance Impact

**New Writes**:
- Alert creation: +1 write per alert trigger
- Metric status updates: +1 write per scheme after calculation
- Download status updates: Same as before (no change)

**Estimated Load**:
- Alerts: 100-1000 writes per day (negligible)
- Metric updates: 1000-2000 writes per day (after daily downloads)
- Total: <0.5% increase in write load

---

## Backend Impact

### New Services

#### 1. `cruiseControl.service.ts` (Estimated: 400 lines)
**Purpose**: Dashboard statistics aggregation
**Dependencies**:
- Database pool
- navMonitoring.service
- marketMonitoring.service
- alertConfig.service

**Key Methods**:
```typescript
async getDashboardStats(userId, tenantId, isLive, isAdmin): Promise<DashboardStats>
async getTabStats(tab: 'nav' | 'market' | 'alerts', userId, tenantId, isLive, isAdmin): Promise<TabStats>
```

**Impact on Existing Code**: ✅ None (new service)

#### 2. `navMonitoring.service.ts` (Estimated: 600 lines)
**Purpose**: NAV-specific monitoring logic
**Dependencies**:
- nav.service
- navDownload.service
- Database pool

**Key Methods**:
```typescript
async getNavStats(tenantId?, isLive, isAdmin): Promise<NavStats>
async getNavList(filter, tenantId?, isLive, isAdmin, pagination): Promise<NavList>
async triggerNavDownload(schemeId, tenantId, isLive, userId): Promise<DownloadJob>
async calculateMetricsForScheme(schemeId, isLive): Promise<void>
```

**Impact on Existing Code**:
- ⚠️ May need to refactor existing `nav.service.ts` to avoid duplication
- ⚠️ Need to coordinate with existing download jobs

#### 3. `marketMonitoring.service.ts` (Estimated: 500 lines)
**Purpose**: Market-specific monitoring logic
**Dependencies**:
- market.service
- marketDownload.service
- Database pool

**Key Methods**:
```typescript
async getMarketStats(): Promise<MarketStats>
async getMarketList(filter, pagination): Promise<MarketList>
async triggerMarketDownload(indexId, userId): Promise<DownloadJob>
async calculateMetricsForIndex(indexId): Promise<void>
```

**Impact on Existing Code**:
- ✅ Minimal (market code already well-encapsulated)

#### 4. `alertConfig.service.ts` (Estimated: 500 lines)
**Purpose**: Alert management logic
**Dependencies**:
- Database pool
- Existing JTBD/Goal services

**Key Methods**:
```typescript
async getAlerts(tenantId, isLive, status, pagination): Promise<AlertList>
async getAlertCount(tenantId, isLive): Promise<number>
async acknowledgeAlert(alertId, userId): Promise<void>
async dismissAlert(alertId, userId): Promise<void>
async getAlertRules(tenantId, isLive): Promise<AlertRule[]>
async createAlertRule(rule, userId): Promise<AlertRule>
async updateAlertRule(ruleId, updates, userId): Promise<AlertRule>
async deleteAlertRule(ruleId, userId): Promise<void>
async triggerAlert(alertType, tenantId, isLive, customerId, message): Promise<Alert>
```

**Impact on Existing Code**:
- ⚠️ **BREAKING**: Need to migrate alert creation from customer pages
- ⚠️ Need to update JTBD/Goal services to use new alert system

#### 5. `metricCalculation.job.ts` (Estimated: 400 lines)
**Purpose**: Auto-calculate metrics after downloads
**Dependencies**:
- schemeAnalysis.service (existing)
- marketAnalysis.service (existing)
- Database pool

**Key Methods**:
```typescript
async calculateNavMetrics(schemeIds: number[], isLive: boolean): Promise<CalculationResult>
async calculateMarketMetrics(indexIds: number[]): Promise<CalculationResult>
async onNavDownloadComplete(jobId: number): Promise<void> // Event handler
async onMarketDownloadComplete(jobId: number): Promise<void> // Event handler
```

**Impact on Existing Code**:
- ⚠️ Need to hook into existing download completion events
- ⚠️ May need to refactor existing metric calculation to support batch mode

### Modified Services

#### 1. `navDownload.service.ts`
**Changes Required**:
- Add callback after download completion to trigger metric calculation
- Update job result to include metrics_calculation_triggered flag

```typescript
// BEFORE
async executeDownload(jobId, tenantId, isLive, userId) {
  // ... download logic ...
  await this.navService.updateDownloadJob(tenantId, isLive, jobId, {
    status: 'completed'
  });
}

// AFTER
async executeDownload(jobId, tenantId, isLive, userId) {
  // ... download logic ...
  await this.navService.updateDownloadJob(tenantId, isLive, jobId, {
    status: 'completed'
  });

  // NEW: Trigger metric calculation
  const metricJob = new MetricCalculationJob();
  await metricJob.onNavDownloadComplete(jobId);
}
```

**Impact**: Medium
- ⚠️ Changes execution flow
- ⚠️ Need to handle metric calculation failures gracefully
- ⚠️ May increase download completion time

#### 2. `marketDownload.service.ts`
**Changes Required**: Same as navDownload.service.ts

**Impact**: Medium
- ⚠️ Changes execution flow
- ⚠️ Same concerns as NAV

#### 3. `navScheduler.service.ts`
**Changes Required**:
- Filter scheduler configs by `is_admin_config = true`
- Add admin check before allowing config creation/modification

```typescript
// BEFORE
async getAllActiveConfigs() {
  return await this.db.query(
    'SELECT * FROM t_nav_scheduler_configs WHERE is_enabled = true'
  );
}

// AFTER
async getAllActiveConfigs() {
  return await this.db.query(
    'SELECT * FROM t_nav_scheduler_configs WHERE is_enabled = true AND is_admin_config = true'
  );
}
```

**Impact**: Low-Medium
- ⚠️ **BREAKING**: Changes scheduler behavior
- ⚠️ Existing tenant configs will be ignored unless marked as admin

### New Routes File

#### `cruiseControl.routes.ts` (Estimated: 500 lines)
**Endpoints**: 15+ new routes

```typescript
// Dashboard
router.get('/dashboard', authenticate, getDashboardStats);

// NAV Monitoring
router.get('/nav/statistics', authenticate, getNavStats);
router.get('/nav/list', authenticate, getNavList);
router.post('/nav/download/:schemeId', authenticate, triggerNavDownload);
router.post('/nav/calculate-metrics', authenticate, requireAdmin, calculateNavMetrics);

// Market Monitoring
router.get('/market/statistics', authenticate, getMarketStats);
router.get('/market/list', authenticate, getMarketList);
router.post('/market/download/:indexId', authenticate, triggerMarketDownload);
router.post('/market/calculate-metrics', authenticate, requireAdmin, calculateMarketMetrics);

// Alerts
router.get('/alerts', authenticate, getAlerts);
router.get('/alerts/count', authenticate, getAlertCount);
router.post('/alerts/:alertId/acknowledge', authenticate, acknowledgeAlert);
router.post('/alerts/:alertId/dismiss', authenticate, dismissAlert);
router.get('/alerts/rules', authenticate, getAlertRules);
router.post('/alerts/rules', authenticate, createAlertRule);
router.put('/alerts/rules/:ruleId', authenticate, updateAlertRule);
router.delete('/alerts/rules/:ruleId', authenticate, deleteAlertRule);
```

**Impact on Existing Routes**:
- ✅ No conflicts (new routes)
- ⚠️ Need to register in `server.ts`

### Modified Files

#### `server.ts`
**Changes Required**:
- Import and register cruiseControl routes
- Add Cruise Control to health check features
- Update route documentation

```typescript
// Add import
import cruiseControlRoutes from './routes/cruiseControl.routes';

// Register route
app.use('/api/cruise-control', cruiseControlRoutes);

// Update health check
features: {
  // ... existing features ...
  cruise_control: true,
  cruise_control_nav_monitoring: true,
  cruise_control_market_monitoring: true,
  cruise_control_alerts: true
}
```

**Impact**: Low (additive change)

---

## Frontend Impact

### New Pages

#### 1. `CruiseControlPage.tsx` (Estimated: 300 lines)
**Path**: `/cruise-control`
**Purpose**: Main container for Cruise Control dashboard
**Components**: Dashboard stats + Tab navigation
**Routes**: New route in app router

**Dependencies**:
- React Query hooks
- Tab components
- Statistics cards

**Impact**: ✅ No conflicts (new page)

#### 2. `NavTab.tsx` (Estimated: 500 lines)
**Purpose**: NAV monitoring tab content
**Features**:
- Statistics cards
- List view with drill-down
- Download now buttons
- Scheduler config (Admin only)

**Dependencies**:
- useNavMonitoring hook
- NavListView component
- NavSchedulerConfig component

**Impact**: ⚠️ May need to extract scheduler config from existing NAV pages

#### 3. `MarketTab.tsx` (Estimated: 400 lines)
**Purpose**: Market monitoring tab content
**Features**: Same as NavTab but for market data

**Dependencies**:
- useMarketMonitoring hook
- MarketListView component

**Impact**: ✅ Minimal (market code isolated)

#### 4. `AlertsTab.tsx` (Estimated: 600 lines)
**Purpose**: Alert management tab
**Features**:
- Alert list with filters
- Alert rule configuration
- Acknowledge/dismiss actions

**Dependencies**:
- useAlerts hook
- AlertRuleForm component
- AlertList component

**Impact**: ⚠️ **BREAKING**: Migrates alert UI from customer pages

### New Components

#### Statistics Components

##### 1. `StatisticsCard.tsx` (Estimated: 100 lines)
**Purpose**: Reusable card for displaying counts
**Props**:
```typescript
interface StatisticsCardProps {
  title: string;
  count: number;
  icon?: React.ReactNode;
  onClick?: () => void;
  isLoading?: boolean;
  color?: 'blue' | 'green' | 'red' | 'yellow';
}
```

**Impact**: ✅ New reusable component

##### 2. `DashboardOverview.tsx` (Estimated: 150 lines)
**Purpose**: Top-level dashboard stats (Total, Success, Failed)
**Impact**: ✅ New component

#### List Components

##### 3. `NavListView.tsx` (Estimated: 400 lines)
**Purpose**: NAV scheme list with actions
**Features**:
- Table with pagination
- Download now button per row
- Search/filter
- Status indicators

**Impact**: ✅ New component

##### 4. `MarketListView.tsx` (Estimated: 350 lines)
**Purpose**: Market index list with actions
**Impact**: ✅ New component

##### 5. `AlertList.tsx` (Estimated: 300 lines)
**Purpose**: Alert list with status filters
**Impact**: ⚠️ Replaces alert display on customer pages

#### Alert Components

##### 6. `AlertRuleForm.tsx` (Estimated: 400 lines)
**Purpose**: Form for creating/editing alert rules
**Form Fields**:
- Rule type (JTBD, Goal Progress, Goal Due)
- Rule name
- Conditions (JSON editor or form fields)
- Enable/disable toggle

**Impact**: ✅ New component

##### 7. `AlertBellIcon.tsx` (Estimated: 150 lines)
**Purpose**: Header bell icon with badge
**Features**:
- Show alert count badge
- Click to navigate to Alerts tab
- Real-time count updates

**Impact**: ⚠️ Modifies header component

**Integration Point**: `frontend/src/components/layout/Header.tsx`

### New Hooks

#### 1. `useCruiseControlStats.ts` (Estimated: 100 lines)
```typescript
export function useCruiseControlStats(tenantId: number, isLive: boolean) {
  return useQuery({
    queryKey: ['cruise-control', 'dashboard', tenantId, isLive],
    queryFn: () => api.get('/api/cruise-control/dashboard', { params: { tenant_id: tenantId, is_live: isLive } })
  });
}
```

**Impact**: ✅ New hook

#### 2. `useNavMonitoring.ts` (Estimated: 150 lines)
```typescript
export function useNavMonitoring(tenantId: number, isLive: boolean, isAdmin: boolean) {
  // Statistics query
  const stats = useQuery({ ... });

  // List query (lazy loaded on card click)
  const list = useQuery({ ... });

  // Trigger download mutation
  const triggerDownload = useMutation({ ... });

  return { stats, list, triggerDownload };
}
```

**Impact**: ✅ New hook

#### 3. `useMarketMonitoring.ts` (Estimated: 150 lines)
**Impact**: ✅ New hook

#### 4. `useAlerts.ts` (Estimated: 200 lines)
```typescript
export function useAlerts(tenantId: number, isLive: boolean) {
  const alerts = useQuery({ ... });
  const alertCount = useQuery({ ... }); // For bell icon
  const acknowledgeAlert = useMutation({ ... });
  const dismissAlert = useMutation({ ... });

  return { alerts, alertCount, acknowledgeAlert, dismissAlert };
}
```

**Impact**: ✅ New hook
**Global State**: Alert count may need global state for header bell icon

### Modified Components

#### 1. `Header.tsx`
**Changes Required**:
- Add `<AlertBellIcon />` component
- Position near user menu
- Pass tenant and environment context

**Impact**: Low
- ⚠️ Visual change to header
- ⚠️ Need to ensure proper spacing

#### 2. `Sidebar.tsx` (or Navigation component)
**Changes Required**:
- Add "Cruise Control" menu item
- Add icon
- Set active state when on Cruise Control page

**Impact**: Low
- ✅ Additive change

#### 3. `CustomerViewPage.tsx`
**Changes Required**:
- **Remove** or hide alert configuration section
- Add link/button to Cruise Control → Alerts
- Show message: "Alerts managed in Cruise Control"

**Impact**: Medium
- ⚠️ **BREAKING**: UI changes for existing users
- ⚠️ Need clear migration message

#### 4. `CustomersPage.tsx` (Dashboard)
**Changes Required**:
- **Remove** or hide JTBD/Goal alert triggers
- Add link to Cruise Control

**Impact**: Low-Medium
- ⚠️ Minor UI changes

### Routing Changes

#### App Router
**New Route**:
```typescript
{
  path: '/cruise-control',
  element: <CruiseControlPage />,
  children: [
    { path: '', element: <Navigate to="nav" /> }, // Default to NAV tab
    { path: 'nav', element: <NavTab /> },
    { path: 'market', element: <MarketTab /> },
    { path: 'alerts', element: <AlertsTab /> }
  ]
}
```

**Impact**: ✅ New routes, no conflicts

### State Management Changes

#### React Query Cache Keys
**New Cache Keys**:
- `['cruise-control', 'dashboard', tenantId, isLive]`
- `['cruise-control', 'nav', 'stats', tenantId, isLive]`
- `['cruise-control', 'nav', 'list', filter, tenantId, isLive]`
- `['cruise-control', 'market', 'stats']`
- `['cruise-control', 'market', 'list', filter]`
- `['cruise-control', 'alerts', tenantId, isLive, status]`
- `['cruise-control', 'alerts', 'count', tenantId, isLive]`

**Invalidation Strategy**:
- Invalidate stats after download triggered
- Invalidate list after download completes
- Invalidate alert count after acknowledge/dismiss

**Impact**: ✅ No conflicts with existing cache keys

#### Global State (if needed)
**Option 1**: Use React Query cache
- Store alert count in React Query cache
- Refetch on interval (e.g., every 30s)

**Option 2**: Use Context/Zustand
- Create AlertCountContext
- Update on alert actions
- Shared between header and Alerts tab

**Recommendation**: React Query with auto-refresh

---

## Security Impact

### Authentication & Authorization

#### New Permission Checks

##### Admin-Only Features
**Endpoints Requiring Admin**:
- `POST /api/cruise-control/nav/calculate-metrics`
- `POST /api/cruise-control/market/calculate-metrics`
- `GET /api/cruise-control/nav/statistics` (with full data - no tenant filter)
- Scheduler configuration (NAV, Market)

**Implementation**:
```typescript
// Middleware
const requireAdmin = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const user = req.user;
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Check if user is admin
  const result = await pool.query(
    'SELECT t.is_admin FROM t_users u JOIN t_tenants t ON u.tenant_id = t.id WHERE u.id = $1',
    [user.user_id]
  );

  if (!result.rows[0]?.is_admin) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  next();
};
```

**Impact**: ⚠️ New authorization pattern
**Risk**: Medium - must be applied consistently

##### Tenant-Scoped Features
**Endpoints Requiring Tenant Scope**:
- All alert endpoints (tenant-specific)
- NAV list/download (filtered by bookmarks for tenants)

**Implementation**:
```typescript
// Verify tenant ownership
const tenantId = req.user.tenant_id;
const requestedTenantId = parseInt(req.query.tenant_id as string);

if (!isAdmin && tenantId !== requestedTenantId) {
  return res.status(403).json({ error: 'Access denied' });
}
```

**Impact**: ✅ Existing pattern, reuse current logic

#### Data Access Control

##### NAV Data Access
**Admin**: See all active NAV schemes
**Tenant**: See only bookmarked schemes

**SQL Filter**:
```sql
-- Admin query
SELECT * FROM m_nav_schemes WHERE is_active = true AND end_date IS NULL;

-- Tenant query
SELECT s.* FROM m_nav_schemes s
INNER JOIN t_nav_bookmarks b ON s.id = b.scheme_id
WHERE s.is_active = true AND s.end_date IS NULL
  AND b.tenant_id = $1 AND b.is_live = $2;
```

**Impact**: ⚠️ Must enforce at query level, not just UI

##### Market Data Access
**Both Admin & Tenant**: See all indices (market data is global)

**SQL Filter**:
```sql
SELECT * FROM t_market_indices WHERE is_active = true;
```

**Impact**: ✅ No special filtering needed

##### Alert Data Access
**Tenant Only**: See own alerts

**SQL Filter**:
```sql
SELECT * FROM t_cruise_control_alerts
WHERE tenant_id = $1 AND is_live = $2;
```

**Impact**: ✅ Standard tenant filtering

### Audit Logging

#### New Audit Events
- Download triggered manually (who, when, scheme/index)
- Scheduler config created/modified (admin only)
- Alert acknowledged/dismissed (who, when)
- Metric calculation triggered (admin only)

**Implementation**:
```typescript
await SimpleLogger.info('CruiseControl', 'Manual download triggered', 'triggerNavDownload', {
  scheme_id: schemeId,
  triggered_by: userId,
  tenant_id: tenantId,
  is_live: isLive
}, userId, tenantId);
```

**Impact**: ✅ Use existing SimpleLogger service

### Security Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| **Unauthorized access to admin features** | High | Enforce `requireAdmin` middleware on all admin routes |
| **Tenant data leakage** | High | Always filter NAV/alert queries by tenant_id |
| **Download abuse** | Medium | Rate limit manual download triggers |
| **Alert spam** | Low | Throttle alert creation per customer |
| **XSS in alert messages** | Medium | Sanitize alert message input |

---

## Performance Impact

### Query Performance

#### Dashboard Statistics Query
**Query Complexity**: Medium
- Aggregates across multiple tables
- Filters by tenant (for tenants) or no filter (for admin)

**Estimated Execution Time**:
- Admin view: 50-100ms (10K+ schemes)
- Tenant view: 10-20ms (filtered by bookmarks, ~100 schemes)

**Optimization**:
- Materialized views if queries slow down
- Cache results for 30 seconds
- Use database views for complex aggregations

#### List Queries
**Pagination**: Required
- Page size: 20/50/100
- Use LIMIT/OFFSET or cursor-based pagination

**Estimated Execution Time**:
- Per page: 10-30ms

**Indexes Needed**:
```sql
-- NAV schemes
CREATE INDEX idx_nav_schemes_status ON m_nav_schemes(download_status) WHERE is_active = true;
CREATE INDEX idx_nav_schemes_latest_date ON m_nav_schemes(latest_nav_date DESC);
CREATE INDEX idx_nav_schemes_metrics_pending ON m_nav_schemes(latest_metrics_calculated_date, latest_nav_date);

-- Market indices
CREATE INDEX idx_market_indices_status ON t_market_indices(download_status) WHERE is_active = true;
CREATE INDEX idx_market_indices_latest_date ON t_market_indices(latest_date DESC);

-- Alerts
CREATE INDEX idx_alerts_tenant_status_date ON t_cruise_control_alerts(tenant_id, is_live, status, triggered_at DESC);
```

### Background Job Performance

#### Metric Calculation Jobs
**Triggered By**: Download completion
**Frequency**: After each daily download (~once per day)
**Processing Time**:
- NAV metrics: 1-5 minutes for 1000 schemes
- Market metrics: 10-30 seconds for 10 indices

**Resource Impact**:
- CPU: Medium (calculation intensive)
- Memory: Low (processes one scheme at a time)
- Database: Medium (bulk inserts)

**Optimization**:
- Run in background (don't block download completion)
- Process in batches (100 schemes at a time)
- Use connection pooling
- Queue jobs if multiple downloads complete simultaneously

**Risk**: ⚠️ May slow down database during peak hours
**Mitigation**: Run during off-hours or throttle processing

### API Response Times

| Endpoint | Expected Response Time | Acceptable Threshold |
|----------|------------------------|----------------------|
| `GET /dashboard` | 50-100ms | 200ms |
| `GET /nav/statistics` | 30-80ms | 150ms |
| `GET /nav/list` | 20-50ms | 100ms |
| `POST /nav/download/:schemeId` | 50-100ms | 200ms |
| `GET /market/statistics` | 10-30ms | 100ms |
| `GET /alerts` | 20-40ms | 100ms |
| `GET /alerts/count` | 5-10ms | 50ms |

**Monitoring**: Add performance logging to track slow queries

### Frontend Performance

#### Initial Page Load
**Estimated Load Time**: 1-2 seconds
- Dashboard stats query: 50-100ms
- Tab stats query (lazy loaded): 30-80ms
- Component render: 200-400ms

**Optimization**:
- Lazy load tabs (only load active tab)
- Cache dashboard stats for 30s
- Use React.memo for stat cards

#### Real-time Updates
**Alert Count**: Poll every 30 seconds
- Network overhead: Minimal (small payload)
- Battery impact: Low (infrequent polling)

**Optimization**:
- Consider WebSocket for real-time updates (future)
- Batch multiple stat updates

---

## Integration Impact

### NAV Download Integration

#### Current Flow
```
User triggers download
  → navDownload.service creates job
  → executeDownload() runs
  → Download NAV data from AMFI
  → Update m_nav_schemes
  → Update job status to 'completed'
```

#### New Flow (With Auto-Metrics)
```
User triggers download
  → navDownload.service creates job
  → executeDownload() runs
  → Download NAV data from AMFI
  → Update m_nav_schemes
  → Update job status to 'completed'
  → NEW: Trigger metricCalculation.job
      → Update metrics_calculation_status to 'calculating'
      → Calculate metrics for updated schemes
      → Update latest_metrics_calculated_date
      → Update metrics_calculation_status to 'completed'
```

**Changes Required**:
- Hook metric calculation into download completion
- Handle metric calculation failures gracefully (don't fail download)
- Log metric calculation errors

**Impact**: Medium
- ⚠️ Changes download flow
- ⚠️ May increase download completion time (if not async)
- ⚠️ Need comprehensive error handling

### Market Download Integration

**Same as NAV Download Integration**

**Impact**: Medium

### Alert System Integration

#### Current Alert System (Assumed)
- Alerts created on customer pages (JTBD, Goals)
- Stored in separate tables or embedded in JTBD/Goal records
- Displayed on customer view pages

#### New Alert System
- Alerts created via `alertConfig.service`
- Stored in `t_cruise_control_alerts`
- Displayed in Cruise Control → Alerts tab
- Count shown in header bell icon

**Migration Path**:
1. **Phase 1**: Create new alert tables, keep old system running
2. **Phase 2**: Migrate alert creation to new system
3. **Phase 3**: Update customer pages to read from new tables
4. **Phase 4**: Remove old alert code

**Impact**: High
- ⚠️ **BREAKING**: Changes alert creation and display
- ⚠️ Need to migrate existing alerts
- ⚠️ Need to update JTBD/Goal services

### Scheduler Integration

#### Current Scheduler Access
- Tenant-level configs in `t_nav_scheduler_configs`
- UI accessible to all users
- Scheduler runs for each tenant's bookmarks

#### New Scheduler Access
- Admin-only configs
- UI hidden from non-admin users
- Scheduler runs for ALL active schemes (global)

**Migration Path**:
1. Add `is_admin_config` column
2. Mark existing configs as admin-owned
3. Update scheduler service to filter by admin configs
4. Hide UI from non-admin users
5. Optionally: Deactivate old tenant configs

**Impact**: High
- ⚠️ **BREAKING**: Changes scheduler behavior
- ⚠️ Need to communicate changes to users
- ⚠️ Existing tenant configs may become inactive

---

## Migration Impact

### Database Migration Complexity

**Total Migrations**: 4 SQL scripts + 1 data migration

| Migration | Complexity | Rollback Difficulty | Risk |
|-----------|-----------|---------------------|------|
| Add metric tracking columns | Low | Easy (just drop columns) | Low |
| Create alert tables | Low | Easy (just drop tables) | Low |
| Create views | Low | Easy (just drop views) | Low |
| Update scheduler configs | Medium | Medium (need to restore flags) | Medium |
| Migrate alert data | High | Hard (need backup) | High |

**Recommended Approach**: Blue-Green Deployment
1. Run migrations on staging first
2. Verify data integrity
3. Run on production during maintenance window
4. Keep old tables for 1 week before dropping

### Data Migration Risks

#### Alert Data Migration
**Risk**: Data loss during migration
**Impact**: High (user-facing alerts)
**Mitigation**:
- Full database backup before migration
- Test migration on staging with production data copy
- Keep old tables for 1 week as backup
- Verify row counts before/after

**Rollback Plan**:
- Revert code to previous version
- Drop new alert tables
- Restore from backup if needed

#### Scheduler Config Migration
**Risk**: Scheduler stops working if migration fails
**Impact**: High (daily downloads fail)
**Mitigation**:
- Migration is simple (just add column + UPDATE)
- Test on staging first
- Keep old behavior as fallback (read both old and new configs)

**Rollback Plan**:
- Remove `is_admin_config` column
- Revert scheduler service code

### User Migration

#### Admin Users
**Changes**:
- New Cruise Control menu item appears
- Can now manage global scheduler configs
- See all NAV schemes (not just bookmarks)

**Training Required**: Medium
- How to use Cruise Control dashboard
- How to monitor downloads
- How to trigger manual downloads

**Communication**: Email + in-app notification

#### Tenant Users
**Changes**:
- New Cruise Control menu item appears
- Cannot access scheduler configs (admin-only)
- Can trigger manual downloads for bookmarks
- Alert configuration moved to Cruise Control

**Training Required**: Medium
- Where to find Cruise Control
- How to trigger downloads
- Where to manage alerts (moved from customer pages)

**Communication**: Email + in-app notification + tooltip on first visit

### Feature Flag Strategy

**Recommended**: Use feature flags for gradual rollout

```typescript
// Backend feature flag
const CRUISE_CONTROL_ENABLED = process.env.FEATURE_CRUISE_CONTROL === 'true';

// Frontend feature flag
const cruiseControlEnabled = useFeatureFlag('cruise_control');
```

**Rollout Phases**:
1. **Phase 1**: Enable for admin users only (1 week)
2. **Phase 2**: Enable for selected tenants (beta testers, 1 week)
3. **Phase 3**: Enable for all users

**Benefit**: Can disable feature if critical bugs found

---

## Testing Impact

### Unit Tests Required

#### Backend Services
- `cruiseControl.service.ts`: 10 tests
- `navMonitoring.service.ts`: 15 tests
- `marketMonitoring.service.ts`: 12 tests
- `alertConfig.service.ts`: 20 tests
- `metricCalculation.job.ts`: 10 tests

**Total Backend Unit Tests**: ~67 tests

#### Frontend Components
- `StatisticsCard.tsx`: 5 tests
- `NavListView.tsx`: 10 tests
- `MarketListView.tsx`: 8 tests
- `AlertList.tsx`: 8 tests
- `AlertRuleForm.tsx`: 12 tests
- `AlertBellIcon.tsx`: 5 tests

**Total Frontend Unit Tests**: ~48 tests

**Total Unit Tests**: ~115 tests

### Integration Tests Required

#### API Integration Tests
- Dashboard stats endpoint: 5 scenarios
- NAV monitoring endpoints: 10 scenarios
- Market monitoring endpoints: 8 scenarios
- Alert endpoints: 15 scenarios
- Download trigger endpoints: 8 scenarios

**Total API Integration Tests**: ~46 scenarios

#### Database Integration Tests
- Migration scripts: 4 tests (one per migration)
- Alert data migration: 5 tests
- View performance: 2 tests
- Index effectiveness: 2 tests

**Total Database Integration Tests**: ~13 tests

### End-to-End Tests Required

#### User Flows
1. Admin user navigates to Cruise Control
2. Admin views NAV statistics
3. Admin triggers manual NAV download
4. Admin configures NAV scheduler
5. Tenant user navigates to Cruise Control
6. Tenant views bookmarked NAV statistics
7. Tenant triggers manual download for bookmark
8. User views alerts
9. User acknowledges alert
10. User creates alert rule
11. Metric calculation triggers after download
12. Bell icon shows correct alert count

**Total E2E Tests**: ~12 flows

### Performance Tests Required

#### Load Tests
- Dashboard stats query under load (1000 concurrent users)
- List pagination under load
- Metric calculation job performance (1000 schemes)
- Alert count query performance (10K alerts)

**Total Performance Tests**: ~4 scenarios

### Test Effort Estimate

| Test Type | Count | Effort (hours) |
|-----------|-------|----------------|
| Backend Unit Tests | 67 | 20 |
| Frontend Unit Tests | 48 | 15 |
| API Integration Tests | 46 | 15 |
| Database Integration Tests | 13 | 8 |
| E2E Tests | 12 | 12 |
| Performance Tests | 4 | 8 |
| **Total** | **190 tests** | **78 hours** |

---

## Deployment Impact

### Deployment Steps

#### Pre-Deployment
1. **Backup Database**: Full backup of production database
2. **Feature Flag**: Set `FEATURE_CRUISE_CONTROL=false` (disabled by default)
3. **Smoke Test Staging**: Verify all features work on staging
4. **Communication**: Send email to users about upcoming feature

#### Deployment Window
**Recommended**: Off-hours (weekend or late evening)
**Duration**: 30-60 minutes

**Steps**:
1. **T-0:00**: Put application in maintenance mode
2. **T-0:05**: Deploy backend code
3. **T-0:10**: Run database migrations (4 scripts)
   ```bash
   psql -d dbname -f 001_add_metric_tracking.sql
   psql -d dbname -f 002_create_alert_tables.sql
   psql -d dbname -f 003_create_monitoring_views.sql
   psql -d dbname -f 004_update_scheduler_configs.sql
   ```
4. **T-0:20**: Run data migration (alert data)
   ```bash
   psql -d dbname -f data/migrate_alerts.sql
   ```
5. **T-0:25**: Verify migration (check row counts)
6. **T-0:30**: Deploy frontend code
7. **T-0:35**: Clear cache (React Query, Redis if used)
8. **T-0:40**: Enable feature flag `FEATURE_CRUISE_CONTROL=true`
9. **T-0:45**: Smoke test in production
   - Admin user: Access Cruise Control
   - Tenant user: Access Cruise Control
   - Trigger manual download
   - View alerts
10. **T-0:55**: Remove maintenance mode
11. **T-1:00**: Monitor logs for errors

#### Post-Deployment
1. **Monitor**: Watch error logs for 24 hours
2. **Metrics**: Track API response times
3. **User Feedback**: Monitor support tickets
4. **Rollback Plan**: Keep previous version ready for 1 week

### Rollback Plan

#### If Critical Bug Found
**Severity: High** (e.g., data corruption, system crash)

**Steps**:
1. **Immediate**: Set feature flag `FEATURE_CRUISE_CONTROL=false`
2. **Verify**: Confirm application stable without Cruise Control
3. **Investigate**: Identify root cause
4. **Decision**: Fix forward or full rollback?

**Full Rollback Steps**:
1. Put application in maintenance mode
2. Restore database backup (if data migration caused issues)
3. Deploy previous backend version
4. Deploy previous frontend version
5. Remove maintenance mode
6. Communicate to users

**RTO (Recovery Time Objective)**: 15 minutes (feature flag disable)
**RPO (Recovery Point Objective)**: 0 (no data loss if using feature flag)

### Monitoring Requirements

#### New Metrics to Track
- Cruise Control page views
- Dashboard stats API response time
- Manual download trigger count
- Metric calculation job duration
- Alert creation rate
- Bell icon click rate

#### Alerts to Configure
- Dashboard stats query >200ms
- Metric calculation job failed
- Alert count query >50ms
- Download trigger failure rate >10%

---

## Risk Assessment

### High Risks

| Risk | Probability | Impact | Mitigation | Owner |
|------|-------------|--------|------------|-------|
| **Metric calculation overloads database** | Medium | High | Throttle batch processing, run during off-hours, monitor query performance | Backend Dev |
| **Alert data migration fails** | Low | High | Full backup, test on staging, keep old tables as fallback | Database Admin |
| **Scheduler stops working after migration** | Low | High | Test on staging, gradual rollout with feature flag | Backend Dev |
| **User confusion with UI changes** | High | Medium | Clear communication, tooltips, training materials | Product |

### Medium Risks

| Risk | Probability | Impact | Mitigation | Owner |
|------|-------------|--------|------------|-------|
| **Performance degradation of dashboard** | Medium | Medium | Use materialized views, cache stats, optimize queries | Backend Dev |
| **Admin permission checks bypassed** | Low | High | Code review, security audit, unit tests | Security Lead |
| **Download triggers fail silently** | Low | Medium | Comprehensive error handling, user feedback, logging | Backend Dev |

### Low Risks

| Risk | Probability | Impact | Mitigation | Owner |
|------|-------------|--------|------------|-------|
| **Bell icon badge doesn't update** | Medium | Low | Polling fallback, clear cache on actions | Frontend Dev |
| **Pagination performance issues** | Low | Low | Proper indexing, limit page size | Backend Dev |
| **Feature flag fails to disable** | Low | Medium | Test flag behavior, backup deployment script | DevOps |

---

## Resource Requirements

### Development Team

| Role | Effort (days) | Tasks |
|------|---------------|-------|
| **Backend Developer** | 12 days | Services, routes, API endpoints, background jobs |
| **Frontend Developer** | 10 days | Pages, components, hooks, routing |
| **Database Engineer** | 3 days | Migrations, views, indexes, performance tuning |
| **QA Engineer** | 8 days | Test plan, unit tests, integration tests, E2E tests |
| **UI/UX Designer** | 2 days | Dashboard layout, component design, user flows |
| **Product Manager** | 3 days | Requirements, user stories, acceptance criteria, communication |
| **DevOps Engineer** | 2 days | Deployment scripts, feature flags, monitoring setup |

**Total Effort**: ~40 person-days (8 weeks with 1 person, 4 weeks with 2 people)

### Infrastructure

| Resource | Requirement | Cost Impact |
|----------|-------------|-------------|
| **Database Storage** | +500 MB (alerts, metric tracking) | Negligible |
| **API Server** | No additional capacity | $0 |
| **Background Jobs** | Metric calculation jobs (CPU intensive) | Monitor during peak hours |
| **Monitoring** | New dashboards for Cruise Control metrics | Negligible |

---

## Timeline Estimate

### Phase 1: Planning & Design (1 week)
- Finalize PRD and Impact Analysis
- Design database schema
- Design UI mockups
- Review and approval

### Phase 2: Database & Backend (2 weeks)
- Week 1:
  - Write migration scripts
  - Create new services (cruiseControl, navMonitoring, marketMonitoring)
  - Create alert service
- Week 2:
  - Create metric calculation job
  - Create API routes
  - Write backend unit tests
  - Write integration tests

### Phase 3: Frontend (2 weeks)
- Week 1:
  - Create Cruise Control page structure
  - Create NavTab and MarketTab
  - Create statistics cards and list views
- Week 2:
  - Create AlertsTab and alert components
  - Add bell icon to header
  - Write frontend unit tests
  - Write E2E tests

### Phase 4: Integration & Testing (1 week)
- Integrate backend and frontend
- Run full test suite
- Performance testing
- Security review
- Bug fixes

### Phase 5: Deployment & Monitoring (1 week)
- Deploy to staging
- UAT (User Acceptance Testing)
- Deploy to production
- Monitor for issues
- Gather user feedback

**Total Timeline**: 7 weeks

### Phased Rollout (Optional)

**If using feature flags**:
- Week 1: Admin users only
- Week 2: Beta tenants
- Week 3: All users

**Total with Phased Rollout**: 10 weeks

---

## Conclusion

### Summary of Impact

- **Database**: 3 new tables, 2 modified tables, 2 views, 4 migration scripts
- **Backend**: 5 new services, 1 new route file (15+ endpoints), 3 modified services
- **Frontend**: 4 new pages, 10+ new components, 4 new hooks, modified header/sidebar
- **Testing**: 190+ tests across unit, integration, E2E, performance
- **Effort**: ~40 person-days (~8 weeks for 1 person, ~4 weeks for 2 people)
- **Risk**: Medium-High (manageable with proper testing and phased rollout)

### Recommendation

**Proceed with development** with the following conditions:
1. ✅ Use feature flags for gradual rollout
2. ✅ Extensive testing on staging before production
3. ✅ Full database backup before migration
4. ✅ Monitor performance after deployment
5. ✅ Clear user communication about changes
6. ⚠️ Consider phased rollout (admin → beta → all users)

### Next Steps

1. **Review & Approval**: Get stakeholder sign-off on PRD and Impact Analysis
2. **Refinement**: Address open questions and finalize decisions
3. **Kickoff**: Schedule development sprint
4. **Design**: Finalize UI mockups
5. **Development**: Start Phase 1 (Database & Backend)

---

**END OF IMPACT ANALYSIS**
