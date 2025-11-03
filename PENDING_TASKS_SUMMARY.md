# Pending Tasks Summary - KewalInvest

**Generated:** November 3, 2025
**Branch:** `claude/review-previous-branch-011CUmKY8xZRV9A6h2AU8EoL`
**Last Major Work:** Goal Tracking Integration (PR #6, commit 43fcd8b)

---

## Executive Summary

Based on comprehensive review of documentation, previous branch work, and current codebase state:

- **✅ Fully Complete:** 6 major features (35%)
- **⚠️ Partially Complete:** 2 features requiring integration (12%)
- **❌ Not Started:** 9 features (53%)

**Overall Project Completion:** ~38%

---

## ✅ FULLY COMPLETED FEATURES

These features are production-ready and integrated:

### 1. Monthly Tracking System ✅
**Status:** 100% Complete
**Location:** Customer Portfolio → Portfolio Tab → Monthly Tracking
**Components:**
- Backend: `monthlyTracking.service.ts` (440 lines)
- Frontend: All 7 components in `monthly-tracking/` directory
- Integration: Fully integrated in CustomerViewPage

**Features Working:**
- Units Per Month tracking with chart/table toggle
- NAV Performance with best/worst month highlighting
- Market Value calculation (Previous Month NAV × Current Month Units)
- 12-month default data display
- Summary statistics for all views
- Scheme selector dropdown

---

### 2. Portfolio Snapshots ✅
**Status:** 100% Complete
**Location:** Cruise Control → Portfolio Snapshots Tab
**Features Working:**
- Smart backfill from first transaction date
- Manual "Generate Now" trigger
- Execution history with success rate
- Uses generic job scheduler system
- Full statistics tracking

---

### 3. Performance Chart with Enhancements ✅
**Status:** 100% Complete (with recent enhancements)
**Location:** Customer Portfolio → Overview Tab
**Latest Enhancements (commit a023e7e):**
- ✅ Timeframe selection (1M, 3M, 6M, 1Y, ALL)
- ✅ Interactive tooltips with hover data
- ✅ Index comparison overlay (toggle on/off)
- ✅ Full-screen mode support
- ✅ Export to PNG functionality
- ✅ Proper monthly alignment for index data

---

### 4. UX Enhancement (Header Optimization) ✅
**Status:** 100% Complete
**Files Modified:**
- `CustomerViewHeader.tsx` - 33% height reduction
- `CustomerMetricsBar.tsx` - 30% height reduction

**Achievements:**
- ~47px vertical space saved
- All information remains visible
- Responsive design maintained

---

### 5. Goal Tracking System ✅
**Status:** 100% Complete (just integrated in commit 43fcd8b)
**Location:** Customer Portfolio → Goals Tab
**Components Integrated:** 16 total
- `GoalCard`, `GoalSetupModal`, `GoalDetailsModal`
- `GoalProgressTracker`, `GoalWatchlistPanel`
- `AssetAllocationUtilization`, `GoalRecalculationModal`
- Plus 9 other supporting components

**Features Working:**
- Create time-based, price-based, and hybrid goals
- Real-time progress tracking with on-track status
- Watchlist for underperforming goals
- Asset allocation utilization view
- Goal scheme allocation breakdown
- Edit, update, delete, recalculate goals

**Backend APIs Connected:** 11 endpoints
- All CRUD operations
- Progress tracking and watchlist management
- Asset allocation calculations

---

### 6. Index Comparison & Settings ✅
**Status:** 100% Complete
**Location:**
- Settings: Cruise Control → Settings Tab
- Overlay: Customer Portfolio → Overview Tab (Performance Chart)

**Components:**
- ✅ `DefaultIndexSettings.tsx` (198 lines) - Integrated in SettingsTab
- ✅ `IndexComparisonOverlay.tsx` (152 lines) - Active in CustomerViewPage
- ✅ `IndexSelector.tsx` (201 lines) - Functional
- ✅ Backend: `UserPreferencesService` with default index APIs

**Features Working:**
- Set default comparison index in Settings
- Index overlay on performance chart
- Monthly alignment (fixed straight line issue)
- Toggle show/hide comparison
- Proper date synchronization

**Previous Status:** Documented as "not activated" but code review shows it IS integrated
**Verified In:** CustomerViewPage.tsx lines 66-70, Settings tab exists

---

## ⚠️ PARTIALLY COMPLETE - NEEDS INTEGRATION

### 1. Meeting Management System ⚠️
**Backend Status:** ✅ 100% Complete (580 lines)
**Frontend Status:** ❌ 0% Complete
**Effort Required:** ~30 hours

#### What Exists (Backend):
- ✅ `meeting.types.ts` - Complete type definitions
- ✅ `meeting.service.ts` - All business logic (580 lines)
- ✅ `meeting.controller.ts` - All endpoints working
- ✅ `meeting.routes.ts` - Routes registered
- ✅ Frontend service wrapper exists

**API Endpoints Ready:**
```
POST   /api/meetings                    - Create meeting
GET    /api/meetings                    - Get meetings list
GET    /api/meetings/upcoming           - Upcoming meetings
GET    /api/meetings/:id                - Get single meeting
PUT    /api/meetings/:id                - Update meeting
DELETE /api/meetings/:id                - Delete meeting
POST   /api/meetings/:id/complete       - Mark complete
POST   /api/meetings/:id/cancel         - Cancel meeting
GET    /api/meetings/customer/:id/summary - Customer summary
```

#### What's Missing (Frontend):
❌ **5 UI Components Need to Be Built:**

1. **MeetingTimeline.tsx** (~380 lines estimated)
   - Chronological meeting history display
   - Expandable meeting cards
   - Filter by type and status
   - Timeline visualization

2. **MeetingScheduler.tsx** (~320 lines estimated)
   - New meeting creation form
   - Date/time picker
   - Meeting type selector
   - Attendees multi-select
   - Agenda builder
   - Template selection

3. **ActionItemTracker.tsx** (~260 lines estimated)
   - Action items list with status
   - Filter by pending/completed/overdue
   - Quick status toggle
   - Overdue highlighting
   - Assignment indicators

4. **MeetingNotesEditor.tsx** (~220 lines estimated)
   - Rich text editor
   - Markdown support
   - Auto-save functionality
   - Export to PDF

5. **MeetingsTab.tsx** (~280 lines estimated)
   - Container component for customer view
   - Toggle timeline vs action items view
   - Schedule meeting button
   - Summary statistics
   - Empty state handling

#### Integration Required:
- Add Meetings tab to CustomerViewPage
- Wire up all 5 components
- Connect to existing backend APIs
- Test end-to-end flow

#### Why It's Important:
Backend is production-ready but **completely inaccessible** to users without UI.

---

### 2. Cruise Control Backend ⚠️
**Frontend Status:** ✅ UI Complete (with dummy data)
**Backend Status:** ❌ 0% Complete
**Effort Required:** ~45 hours

#### What Exists (Frontend):
- ✅ `CruiseControlPage.tsx` - Main dashboard page
- ✅ `DashboardOverview.tsx` - Shows hardcoded statistics
- ✅ `NavTab.tsx` - NAV monitoring UI (dummy data)
- ✅ `MarketTab.tsx` - Market monitoring UI (dummy data)
- ✅ `AlertsTab.tsx` - Alert management UI (dummy data)
- ✅ `PortfolioSnapshotsTab.tsx` - FULLY WORKING (uses real API)
- ✅ `SettingsTab.tsx` - FULLY WORKING (index settings)
- ✅ Navigation menu item and sidebar integration
- ✅ Bell icon in header (shows hardcoded count: 7)

**Current State:** Users can access Cruise Control, see the UI, but all data except Portfolio Snapshots and Settings is fake.

#### What's Missing (Backend):

**1. Statistics & Monitoring Service** (~15 hours)
```typescript
// Need to create: backend/src/services/cruiseControl.service.ts

class CruiseControlService {
  async getDashboardStatistics(tenantId, isLive): Promise<DashboardStats>
  async getNavStatistics(tenantId, isLive, filters): Promise<NavStats>
  async getMarketStatistics(): Promise<MarketStats>
  async getAlertsSummary(tenantId, isLive): Promise<AlertsSummary>
}
```

**2. Job Migration to Generic Scheduler** (~12 hours)
Currently NAV and Market downloads have separate schedulers. Need to migrate to the generic job system:

Create job executors:
- `backend/src/services/jobs/navDownload.job.ts`
- `backend/src/services/jobs/marketDownload.job.ts`
- `backend/src/services/jobs/metricCalculation.job.ts`
- `backend/src/services/jobs/alertProcessing.job.ts`

Register with `JobSchedulerService` (which already exists and works - Portfolio Snapshots use it)

**3. Manual Trigger Endpoints** (~8 hours)
```typescript
// Need to create: backend/src/controllers/cruiseControl.controller.ts

POST /api/cruise-control/nav/download/:schemeId     - Trigger NAV download
POST /api/cruise-control/market/download/:indexId   - Trigger market download
POST /api/cruise-control/nav/calculate-metrics      - Calculate NAV metrics
POST /api/cruise-control/market/calculate-metrics   - Calculate market metrics
```

**4. Alerts Backend System** (~10 hours)
Database tables:
```sql
CREATE TABLE t_cruise_control_alerts (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL,
  is_live BOOLEAN NOT NULL,
  alert_type VARCHAR(50) NOT NULL,
  customer_id INTEGER,
  alert_message TEXT,
  status VARCHAR(20) DEFAULT 'active',
  triggered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  acknowledged_at TIMESTAMP
);

CREATE TABLE t_cruise_control_alert_rules (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL,
  is_live BOOLEAN NOT NULL,
  rule_type VARCHAR(50) NOT NULL,
  rule_config JSONB NOT NULL,
  is_enabled BOOLEAN DEFAULT true
);
```

API endpoints:
```typescript
GET    /api/cruise-control/alerts              - Get alerts
GET    /api/cruise-control/alerts/count        - For bell icon badge
POST   /api/cruise-control/alerts/:id/acknowledge
GET    /api/cruise-control/alerts/rules        - Get rules
POST   /api/cruise-control/alerts/rules        - Create rule
PUT    /api/cruise-control/alerts/rules/:id    - Update rule
DELETE /api/cruise-control/alerts/rules/:id    - Delete rule
```

#### Integration Required:
- Replace hardcoded data in NAV/Market/Alerts tabs with API calls
- Connect bell icon to real alert count API
- Wire up "Download Now" buttons to trigger endpoints
- Display real execution history from job scheduler

#### Why It's Important:
Cruise Control is highly visible in the UI but non-functional. Users can access it but see fake data, which could cause confusion.

---

## ❌ NOT STARTED FEATURES

### 1. Family View (Phase 5) ❌
**Status:** Not started
**Effort:** ~50 hours
**Priority:** Low

**What's Needed:**
- Family aggregation service
- Combined portfolio calculations
- Family asset allocation view
- Family goals tracking
- UI components (7-8 components)

**Database Support:**
- Tables already support family fields: `family_head_name`, `family_head_iwell_code`
- Can query family members using existing schema

---

### 2. NAV Tab - Drill-Down Lists ❌
**Status:** UI shows cards, no detailed list view
**Effort:** ~8 hours
**Priority:** Medium

**What's Needed:**
- Click on statistic card → Show detailed scheme list
- Pagination support (20/50/100 per page)
- Search and filter functionality
- Sort by various columns

---

### 3. Market Tab - Drill-Down Lists ❌
**Status:** UI shows cards, no detailed list view
**Effort:** ~8 hours
**Priority:** Medium

**What's Needed:**
- Click on statistic card → Show detailed index list
- Same features as NAV drill-down

---

### 4. NAV Scheduler Configuration UI ❌
**Status:** Backend scheduler exists, no UI in Cruise Control
**Effort:** ~5 hours
**Priority:** Low

**Note:** NAV scheduler exists at `/nav/scheduler` route but not integrated into Cruise Control dashboard.

---

### 5. Market Scheduler Configuration UI ❌
**Status:** Backend scheduler exists (`t_market_eod_scheduler`), no UI
**Effort:** ~5 hours
**Priority:** Low

---

### 6. Alert Rule Configuration UI ❌
**Status:** Alerts tab shows list, no rule creation/editing
**Effort:** ~6 hours (depends on alerts backend being built first)
**Priority:** Medium

**What's Needed:**
- Create alert rule modal
- Edit alert rule modal
- Rule configuration form (JTBD triggers, goal alerts, etc.)

---

### 7. Bulk Operations ❌
**Status:** Not planned yet
**Effort:** ~10 hours
**Priority:** Low

**Ideas:**
- Multi-select schemes for bulk download
- Bulk metric calculation
- Bulk alert acknowledgment

---

### 8. Export Functionality ❌
**Status:** Chart export exists, no data exports
**Effort:** ~8 hours
**Priority:** Low

**What's Needed:**
- Export job execution history to CSV
- Export alert list to CSV
- Export NAV/Market statistics to CSV

---

### 9. Email Notifications ❌
**Status:** Not implemented
**Effort:** ~15 hours
**Priority:** Low

**What's Needed:**
- Email service integration
- Templates for alerts
- Failed download notifications
- Meeting reminders

---

## 📊 PRIORITY MATRIX

### 🔴 HIGH PRIORITY (Do First)

1. **Meeting Management Frontend** (~30 hours)
   - Backend is ready and waiting
   - High user value (customer interaction tracking)
   - 5 components to build
   - Clear requirements documented

2. **Cruise Control Backend** (~45 hours)
   - Users see the UI but it's non-functional
   - Most visible gap in the application
   - Foundation for monitoring all jobs
   - Requires job migration work

### 🟡 MEDIUM PRIORITY (Do Second)

3. **NAV/Market Drill-Down Lists** (~16 hours)
   - Enhances Cruise Control usability
   - Depends on Cruise Control backend being done
   - Straightforward implementation

4. **Alert System Backend** (~10 hours included in Cruise Control)
   - Part of Cruise Control backend work
   - Database schema + API endpoints
   - Rule configuration UI can come later

### 🟢 LOW PRIORITY (Future)

5. **Scheduler Configuration UI** (~10 hours)
   - Existing schedulers work via separate routes
   - Low user impact
   - Nice-to-have for admin users

6. **Family View** (~50 hours)
   - Large feature, lower immediate value
   - Database supports it already
   - Can be deferred to later phase

7. **Export/Bulk/Email** (~33 hours)
   - Enhancement features
   - Not blocking any workflows
   - Can be added incrementally

---

## 🎯 RECOMMENDED NEXT STEPS

### Week 1-2: Meeting Management UI (~30 hours)
**Rationale:** Backend is 100% ready, highest immediate user value

**Tasks:**
1. Create `MeetingTimeline.tsx` component
2. Create `MeetingScheduler.tsx` component
3. Create `ActionItemTracker.tsx` component
4. Create `MeetingNotesEditor.tsx` component
5. Create `MeetingsTab.tsx` container
6. Integrate Meetings tab into CustomerViewPage
7. Test end-to-end meeting flow
8. Handle empty states and error scenarios

**Deliverable:** Users can schedule, track, and manage customer meetings

---

### Week 3-4: Cruise Control Backend Part 1 (~25 hours)
**Rationale:** Make visible UI functional

**Tasks:**
1. Create `cruiseControl.service.ts` with statistics methods
2. Migrate NAV scheduler to generic job system
3. Migrate Market scheduler to generic job system
4. Create manual trigger endpoints
5. Update NAV/Market tabs to use real APIs
6. Connect bell icon to real alert count

**Deliverable:** Cruise Control shows real data, manual downloads work

---

### Week 5: Cruise Control Backend Part 2 (~20 hours)
**Tasks:**
1. Create alerts database tables
2. Implement alerts backend service
3. Create alert API endpoints
4. Wire AlertsTab to real APIs
5. Add drill-down list views for NAV/Market
6. Testing and refinement

**Deliverable:** Cruise Control fully functional

---

## 📋 DETAILED TASK BREAKDOWN

### Meeting Management Frontend Implementation

#### Component 1: MeetingTimeline.tsx
**Purpose:** Display chronological meeting history
**Complexity:** Medium
**Time:** 8 hours

**Features:**
- Timeline visualization with date markers
- Meeting cards (type, duration, status)
- Expandable notes section
- Action items summary per meeting
- Filter by type (Review, Planning, Onboarding, etc.)
- Filter by status (Scheduled, Completed, Cancelled)
- Sort by date (asc/desc)
- Empty state (no meetings yet)

**UI Layout:**
```
┌─ Meeting Timeline ──────────────────────────┐
│ [Filters: Type ▼] [Status ▼] [Sort: Date ▼]│
├────────────────────────────────────────────┤
│ Oct 15, 2025 ─── [Review Meeting]          │
│                  📅 Duration: 45 min        │
│                  📝 Notes: Discussed retire..│
│                  ✓ Actions: 2 pending, 1 done│
│                  [View Details]             │
├────────────────────────────────────────────┤
│ Sep 10, 2025 ─── [Planning Meeting]        │
│                  📅 Duration: 60 min        │
│                  📝 Notes: New goal planning│
│                  ✓ Actions: All completed  │
│                  [View Details]             │
└────────────────────────────────────────────┘
```

**API Calls:**
```typescript
GET /api/meetings?customerId=123&page=1&page_size=20
```

**Dependencies:**
- `meeting.service.ts` (already exists)
- Theme context for colors
- Date formatting utilities

---

#### Component 2: MeetingScheduler.tsx
**Purpose:** Create new meeting form
**Complexity:** Medium
**Time:** 7 hours

**Features:**
- Date/time picker (future dates only)
- Meeting type selector dropdown
- Duration input (minutes)
- Attendees multi-select or text input
- Agenda text area
- Template selection (optional)
- Goal association (link to specific goals)
- Form validation
- Success/error feedback

**UI Layout:**
```
┌─ Schedule New Meeting ──────────────────────┐
│ Meeting Type: [Review ▼]                    │
│ Date & Time: [Oct 20, 2025] [2:00 PM]      │
│ Duration: [45] minutes                      │
│ Attendees: [+ Add Attendee]                 │
│           Customer, Advisor                  │
│ Agenda:                                      │
│ [Large text area...]                        │
│                                             │
│ Link to Goals: [Select Goals ▼] (optional) │
│                                             │
│ [Use Template ▼] (optional)                 │
│                                             │
│              [Cancel] [Schedule Meeting]    │
└─────────────────────────────────────────────┘
```

**API Calls:**
```typescript
POST /api/meetings
{
  customer_id: 123,
  meeting_date: "2025-10-20T14:00:00Z",
  meeting_type: "review",
  duration_minutes: 45,
  attendees: ["Customer", "Advisor"],
  agenda: "Discuss retirement planning...",
  related_goals: [1, 2]
}
```

**Validation:**
- Meeting date must be in future
- Duration must be > 0
- At least one attendee
- Meeting type required

---

#### Component 3: ActionItemTracker.tsx
**Purpose:** Display and manage action items
**Complexity:** Low-Medium
**Time:** 5 hours

**Features:**
- List all action items across meetings
- Filter by status (Pending, Completed, Overdue)
- Filter by assignment (Advisor, Customer)
- Sort by due date
- Quick checkbox toggle for completion
- Overdue items highlighted in red
- Link to parent meeting
- Add new action item (inline or modal)

**UI Layout:**
```
┌─ Action Items ──────────────────────────────┐
│ [Status: All ▼] [Assigned To: All ▼]       │
├────────────────────────────────────────────┤
│ [OVERDUE] ❌ Follow up on pension transfer  │
│            Due: Oct 10 | Assigned: Advisor  │
│            Meeting: Review - Oct 15         │
│            [ ] Mark Complete                │
├────────────────────────────────────────────┤
│ [PENDING] 📋 Send tax planning document     │
│            Due: Oct 30 | Assigned: Advisor  │
│            Meeting: Planning - Sep 10       │
│            [ ] Mark Complete                │
├────────────────────────────────────────────┤
│ [DONE] ✅ Review risk profile               │
│            Completed: Oct 12                │
│            Meeting: Review - Oct 15         │
└────────────────────────────────────────────┘
```

**API Calls:**
```typescript
GET /api/meetings/actions?customerId=123&status=pending
PUT /api/meetings/actions/:actionId { status: 'completed' }
POST /api/meetings/:meetingId/actions { description, due_date, assigned_to }
```

---

#### Component 4: MeetingNotesEditor.tsx
**Purpose:** Rich text editor for meeting notes
**Complexity:** Medium
**Time:** 6 hours

**Features:**
- Markdown support (bold, italic, lists, links)
- Formatting toolbar
- Auto-save draft (debounced)
- Character count
- Mention goals/schemes (@mention)
- Timestamp insertion button
- Preview mode toggle
- Export to PDF (optional)

**UI Layout:**
```
┌─ Meeting Notes ─────────────────────────────┐
│ [B] [I] [List] [Link] [@Mention] [Time]    │
├────────────────────────────────────────────┤
│                                             │
│ [Large text editor area with markdown]     │
│                                             │
│                                             │
│                                             │
│                                             │
├────────────────────────────────────────────┤
│ 💾 Auto-saved 2 minutes ago | 450 characters│
│              [Preview] [Save & Close]       │
└─────────────────────────────────────────────┘
```

**API Calls:**
```typescript
POST /api/meetings/:meetingId/notes
{ notes: "markdown content..." }
```

**Libraries:**
- Consider using a lightweight markdown editor library
- Or build custom with contentEditable + markdown rendering

---

#### Component 5: MeetingsTab.tsx
**Purpose:** Container for meetings section
**Complexity:** Low
**Time:** 4 hours

**Features:**
- Tab toggle: Timeline view / Action Items view
- "Schedule New Meeting" button (opens MeetingScheduler modal)
- Summary statistics card:
  - Total meetings held
  - Pending action items count
  - Next scheduled meeting date
- Empty state (when no meetings)
- Loading skeleton
- Error state handling

**UI Layout:**
```
┌─ Meetings ──────────────────────────────────┐
│ [📅 Schedule New Meeting]                   │
│                                             │
│ ┌─ Summary ──────────────────────────────┐ │
│ │ Total Meetings: 5                      │ │
│ │ Pending Actions: 3                     │ │
│ │ Next Meeting: Oct 20, 2025 at 2:00 PM │ │
│ └────────────────────────────────────────┘ │
│                                             │
│ [Timeline] [Action Items]                   │
│                                             │
│ <MeetingTimeline /> or <ActionItemTracker />│
└─────────────────────────────────────────────┘
```

**Integration in CustomerViewPage:**
```typescript
// Add to tabs array
const tabs = [
  { id: 'overview', label: 'Overview' },
  { id: 'portfolio', label: 'Portfolio' },
  { id: 'goals', label: 'Goals' },
  { id: 'meetings', label: 'Meetings' },  // NEW
  { id: 'transactions', label: 'Transactions' }
];

// Render MeetingsTab
{activeTab === 'meetings' && (
  <MeetingsTab customerId={customerId} />
)}
```

---

### Cruise Control Backend Implementation

#### Task 1: Create cruiseControl.service.ts
**Time:** 8 hours

**Methods to implement:**
```typescript
export class CruiseControlService {
  async getDashboardStatistics(tenantId: number, isLive: boolean): Promise<DashboardStats> {
    // Aggregate counts from:
    // - Active NAV schemes
    // - Market indices
    // - Active alerts
    // - Job execution success/failure counts
  }

  async getNavStatistics(tenantId: number, isLive: boolean, options: FilterOptions): Promise<NavStats> {
    // For Admin: All active NAVs
    // For Tenant: Only bookmarked NAVs
    // Return:
    // - Total active NAVs
    // - Pending downloads (latest_date < today)
    // - Failed downloads (status = failed)
    // - Pending beyond daily (latest_date < yesterday)
    // - Metrics pending (latest_date > latest_metrics_calculated_date)
  }

  async getMarketStatistics(): Promise<MarketStats> {
    // Similar to NAV but for market indices
    // - Total active indices
    // - Download completed today
    // - Pending >1 day
    // - Failed downloads
  }

  async getAlertsSummary(tenantId: number, isLive: boolean): Promise<AlertsSummary> {
    // Once alerts backend is built:
    // - Total active alerts
    // - Alerts by type
    // - Acknowledged count
  }

  async getSchemeList(filters: NavListFilters): Promise<PaginatedNavList> {
    // For drill-down: return filtered/paginated scheme list
  }

  async getIndexList(filters: MarketListFilters): Promise<PaginatedIndexList> {
    // For drill-down: return filtered/paginated index list
  }
}
```

---

#### Task 2: Migrate NAV Scheduler to Generic Job System
**Time:** 6 hours

**Create:** `backend/src/services/jobs/navDownload.job.ts`

```typescript
export class NavDownloadJob implements JobExecutor {
  type = 'NAV_DOWNLOAD';

  async execute(params: JobExecutionParams): Promise<JobExecutionResult> {
    // Logic from existing navScheduler.service.ts
    // 1. Fetch active NAV schemes
    // 2. Download NAV data from AMFI or other sources
    // 3. Update m_nav_schemes table
    // 4. Return success/failure status
  }

  async validateConfig(config: JobConfig): Promise<ValidationResult> {
    // Validate job configuration
  }
}

// Register with JobSchedulerService
jobScheduler.registerJobType('NAV_DOWNLOAD', new NavDownloadJob());
```

**Create job type in database:**
```sql
INSERT INTO t_job_type_registry (job_type, description, is_active)
VALUES ('NAV_DOWNLOAD', 'Downloads NAV data from AMFI', true);
```

---

#### Task 3: Migrate Market Scheduler to Generic Job System
**Time:** 6 hours

**Create:** `backend/src/services/jobs/marketDownload.job.ts`

```typescript
export class MarketDownloadJob implements JobExecutor {
  type = 'MARKET_DOWNLOAD';

  async execute(params: JobExecutionParams): Promise<JobExecutionResult> {
    // Logic from existing market download service
    // 1. Fetch market indices
    // 2. Download EOD data from Yahoo Finance or other sources
    // 3. Update t_market_data table
    // 4. Return success/failure status
  }
}

// Register with JobSchedulerService
jobScheduler.registerJobType('MARKET_DOWNLOAD', new MarketDownloadJob());
```

---

#### Task 4: Create Manual Trigger Endpoints
**Time:** 5 hours

**Create:** `backend/src/controllers/cruiseControl.controller.ts`

```typescript
export class CruiseControlController {
  async getDashboardStats(req: AuthenticatedRequest, res: Response) {
    const { tenant_id, is_live } = req.environment;
    const stats = await cruiseControlService.getDashboardStatistics(tenant_id, is_live);
    return res.json(stats);
  }

  async getNavStats(req: AuthenticatedRequest, res: Response) {
    const { tenant_id, is_live } = req.environment;
    const { filter } = req.query;
    const stats = await cruiseControlService.getNavStatistics(tenant_id, is_live, filter);
    return res.json(stats);
  }

  async triggerNavDownload(req: AuthenticatedRequest, res: Response) {
    const { schemeId } = req.params;
    // Queue NAV_DOWNLOAD job for specific scheme
    const result = await jobScheduler.triggerJob('NAV_DOWNLOAD', { schemeId });
    return res.json(result);
  }

  async triggerMarketDownload(req: AuthenticatedRequest, res: Response) {
    const { indexId } = req.params;
    // Queue MARKET_DOWNLOAD job for specific index
    const result = await jobScheduler.triggerJob('MARKET_DOWNLOAD', { indexId });
    return res.json(result);
  }

  async calculateMetrics(req: AuthenticatedRequest, res: Response) {
    // Trigger METRIC_CALCULATION job
  }
}
```

**Routes:**
```typescript
// backend/src/routes/cruiseControl.routes.ts
router.get('/dashboard', cruiseControlController.getDashboardStats);
router.get('/nav/statistics', cruiseControlController.getNavStats);
router.get('/market/statistics', cruiseControlController.getMarketStats);
router.post('/nav/download/:schemeId', cruiseControlController.triggerNavDownload);
router.post('/market/download/:indexId', cruiseControlController.triggerMarketDownload);
router.post('/metrics/calculate', cruiseControlController.calculateMetrics);
```

---

#### Task 5: Alerts Backend Implementation
**Time:** 10 hours

**Database Migration:**
```sql
-- backend/db/migrations/010_cruise_control_alerts.sql

CREATE TABLE t_cruise_control_alerts (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES t_tenants(id),
  is_live BOOLEAN NOT NULL,
  alert_type VARCHAR(50) NOT NULL,
  customer_id INTEGER REFERENCES t_customers(id),
  rule_id INTEGER,
  alert_message TEXT,
  severity VARCHAR(20) DEFAULT 'medium',
  status VARCHAR(20) DEFAULT 'active',
  triggered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  acknowledged_at TIMESTAMP,
  acknowledged_by INTEGER REFERENCES t_users(id),
  dismissed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE t_cruise_control_alert_rules (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES t_tenants(id),
  is_live BOOLEAN NOT NULL,
  rule_type VARCHAR(50) NOT NULL,
  rule_name VARCHAR(255),
  rule_config JSONB NOT NULL,
  is_enabled BOOLEAN DEFAULT true,
  created_by INTEGER REFERENCES t_users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_alerts_tenant_status ON t_cruise_control_alerts(tenant_id, is_live, status);
CREATE INDEX idx_alerts_customer ON t_cruise_control_alerts(customer_id);
CREATE INDEX idx_alert_rules_tenant ON t_cruise_control_alert_rules(tenant_id, is_live);
```

**Service:** `backend/src/services/alert.service.ts`

```typescript
export class AlertService {
  async getAlerts(tenantId: number, isLive: boolean, filters: AlertFilters): Promise<Alert[]> {
    // Query t_cruise_control_alerts with filters
  }

  async getAlertCount(tenantId: number, isLive: boolean): Promise<number> {
    // Count active alerts for bell icon
  }

  async acknowledgeAlert(alertId: number, userId: number): Promise<void> {
    // Set acknowledged_at and acknowledged_by
  }

  async dismissAlert(alertId: number): Promise<void> {
    // Set status = 'dismissed'
  }

  async getAlertRules(tenantId: number, isLive: boolean): Promise<AlertRule[]> {
    // Query t_cruise_control_alert_rules
  }

  async createAlertRule(tenantId: number, isLive: boolean, rule: AlertRuleInput): Promise<AlertRule> {
    // Insert into t_cruise_control_alert_rules
  }

  async updateAlertRule(ruleId: number, updates: Partial<AlertRuleInput>): Promise<AlertRule> {
    // Update t_cruise_control_alert_rules
  }

  async deleteAlertRule(ruleId: number): Promise<void> {
    // Delete from t_cruise_control_alert_rules
  }
}
```

**Controller:** `backend/src/controllers/alert.controller.ts`

**Routes:**
```typescript
GET    /api/cruise-control/alerts
GET    /api/cruise-control/alerts/count
POST   /api/cruise-control/alerts/:id/acknowledge
POST   /api/cruise-control/alerts/:id/dismiss
GET    /api/cruise-control/alerts/rules
POST   /api/cruise-control/alerts/rules
PUT    /api/cruise-control/alerts/rules/:id
DELETE /api/cruise-control/alerts/rules/:id
```

---

#### Task 6: Update Frontend to Use Real APIs
**Time:** 10 hours

**Files to modify:**

1. **DashboardOverview.tsx**
   - Remove hardcoded stats
   - Add API call: `GET /api/cruise-control/dashboard`
   - Display real data

2. **NavTab.tsx**
   - Remove hardcoded scheme bookmarks
   - Add API call: `GET /api/cruise-control/nav/statistics`
   - Wire "Download Now" button to `POST /api/cruise-control/nav/download/:schemeId`
   - Show loading/success/error states

3. **MarketTab.tsx**
   - Remove hardcoded indices
   - Add API call: `GET /api/cruise-control/market/statistics`
   - Wire "Download Now" button

4. **AlertsTab.tsx**
   - Remove hardcoded alerts
   - Add API call: `GET /api/cruise-control/alerts`
   - Wire Acknowledge/Dismiss buttons
   - Add filter tabs (All/Active/Acknowledged/Dismissed)

5. **AlertBellIcon.tsx** (header component)
   - Remove hardcoded count (7)
   - Add API call: `GET /api/cruise-control/alerts/count`
   - Poll every 60 seconds or use WebSocket

---

## 🧪 TESTING CHECKLIST

### Meeting Management Testing

- [ ] Create new meeting with all fields
- [ ] Schedule meeting in future (validation works)
- [ ] Cannot schedule meeting in past (validation works)
- [ ] View meeting timeline
- [ ] Filter meetings by type
- [ ] Filter meetings by status
- [ ] Expand meeting card to see notes
- [ ] Add action item to meeting
- [ ] Mark action item as complete
- [ ] View all action items across meetings
- [ ] Filter action items by status
- [ ] Overdue action items highlighted
- [ ] Edit meeting details
- [ ] Delete meeting
- [ ] Empty state displays correctly
- [ ] Loading states work
- [ ] Error handling works

### Cruise Control Backend Testing

- [ ] Dashboard statistics display real counts
- [ ] NAV statistics accurate
- [ ] Market statistics accurate
- [ ] Manual NAV download works
- [ ] Manual market download works
- [ ] Job execution history displays
- [ ] Failed jobs are highlighted
- [ ] Bell icon shows real alert count
- [ ] Alerts list loads correctly
- [ ] Acknowledge alert works
- [ ] Dismiss alert works
- [ ] Alert count updates after acknowledge/dismiss
- [ ] Admin sees all NAVs
- [ ] Tenant sees only bookmarked NAVs
- [ ] Multi-tenant isolation verified

---

## 📈 COMPLETION TRACKING

### Current State
```
Total Features: 17
✅ Complete:      6  (35%)
⚠️  Partial:      2  (12%)
❌ Not Started:   9  (53%)
```

### After Meeting Management
```
✅ Complete:      7  (41%)
⚠️  Partial:      1  (6%)
❌ Not Started:   9  (53%)
```

### After Cruise Control Backend
```
✅ Complete:      8  (47%)
⚠️  Partial:      0  (0%)
❌ Not Started:   9  (53%)
```

### Target: 70% Completion
**Still needed after priority tasks:** 4 more features (~40 hours)

---

## 💡 KEY INSIGHTS

### What's Working Well
1. **Generic Job Scheduler** is production-ready and proven (Portfolio Snapshots use it successfully)
2. **Goal Tracking** is fully integrated and functional
3. **Index Comparison** is working despite being documented as "not activated"
4. **Backend APIs** for meetings are complete and waiting
5. **Frontend UI** for Cruise Control is polished (just needs real data)

### Hidden Gems (Code Exists But Undocumented)
- Index comparison IS integrated in CustomerViewPage (lines 66-70, 212-238)
- Settings tab exists with DefaultIndexSettings working
- Performance chart has full-screen and export features

### Low-Hanging Fruit
- Meeting UI can reuse existing patterns from goals/transactions
- Cruise Control backend can leverage existing job scheduler
- Alert system can use similar pattern to goals/JTBD

### Watch Out For
- Meeting components are large (~1,460 lines total)
- Cruise Control backend touches multiple systems (NAV, Market, Jobs, Alerts)
- Alert system needs database migrations before frontend can use it
- Family View is a major undertaking (save for later)

---

## 📝 NOTES FOR IMPLEMENTATION

### Meeting Management
- Consider using existing date picker components
- Rich text editor: Look for lightweight React markdown libraries
- Action items can share styling with JTBD/Goal cards
- Timeline can use similar layout to transaction history

### Cruise Control Backend
- NAV/Market schedulers already exist - just need to wrap in JobExecutor interface
- Generic scheduler has all the infrastructure (execution history, stats, triggers)
- Alerts should follow same multi-tenant pattern as goals
- Bell icon count: Start with polling, migrate to WebSocket later if needed

### General
- All backend services should use `AuthenticatedRequest` type
- All queries must include `tenant_id` and `is_live` filters
- Use existing theme context for all UI components
- Follow established error handling patterns
- Write comprehensive error messages for failed operations

---

## 🎬 GETTING STARTED

### Immediate Next Action
**Build MeetingTimeline.tsx component**

1. Create file: `frontend/src/components/meetings/MeetingTimeline.tsx`
2. Import dependencies: useTheme, meeting service, date utilities
3. Implement component structure with empty state
4. Add API call to fetch meetings
5. Render meeting cards with expand/collapse
6. Add filters (type, status, date)
7. Test with mock data
8. Connect to real API
9. Handle loading/error states
10. Style to match existing components

**Why start here?**
- Self-contained component (doesn't depend on others)
- Backend API is ready
- Clear requirements
- Can be tested independently

---

**END OF DOCUMENT**

*Generated by reviewing:*
- PHASE_WISE_COMPLETION_STATUS.md
- QUICK_STATUS_SUMMARY.md
- CRUISE_CONTROL_PRD.md
- CUSTOMER_PORTFOLIO_ENHANCEMENT.md
- Recent git commits and current codebase state
