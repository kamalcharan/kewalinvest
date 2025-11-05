# Product Requirements Document: Cruise Control

**Version:** 1.0
**Date:** 2025-01-23
**Author:** System Analysis
**Status:** Draft - Awaiting Review

---

## Table of Contents
1. [Executive Summary](#executive-summary)
2. [Problem Statement](#problem-statement)
3. [Goals & Objectives](#goals--objectives)
4. [User Personas](#user-personas)
5. [Functional Requirements](#functional-requirements)
6. [Non-Functional Requirements](#non-functional-requirements)
7. [User Interface Specifications](#user-interface-specifications)
8. [Technical Architecture](#technical-architecture)
9. [Data Model Changes](#data-model-changes)
10. [API Specifications](#api-specifications)
11. [Migration Strategy](#migration-strategy)
12. [Success Metrics](#success-metrics)
13. [Out of Scope](#out-of-scope)
14. [Open Questions](#open-questions)

---

## Executive Summary

**Cruise Control** is a centralized monitoring and management dashboard for all automated daily downloads and alerts in the KewalInvest system. It consolidates NAV downloads, Market data downloads, and Alert configurations into a single, unified interface accessible to both Admin and Tenant users.

### Key Benefits
- **Centralized Monitoring**: Single dashboard for all background jobs
- **Proactive Management**: Identify and resolve failed/pending downloads
- **Role-Based Access**: Admin manages global data, Tenants manage their bookmarks
- **Automated Metrics**: Auto-calculation after successful downloads
- **Alert Consolidation**: Move alerts from customer pages to dedicated section

---

## Problem Statement

### Current Issues
1. **Scattered Job Management**: NAV scheduler, Market downloads, and Alerts are in different places
2. **No Unified Dashboard**: No single view to see all job statuses
3. **Tenant-Level NAV/Market Config**: NAV and Market data are global but configured per tenant (duplication)
4. **Manual Metric Calculation**: Metrics not automatically calculated after downloads
5. **Alert Fragmentation**: Alerts configured in customer view, hard to manage globally

### Impact
- Users must navigate multiple screens to monitor downloads
- No quick visibility into failed or pending jobs
- Wasted time managing duplicate scheduler configs
- Metrics drift out of sync with latest NAV/Market data

---

## Goals & Objectives

### Primary Goals
1. Create unified "Cruise Control" dashboard for all automated jobs
2. Separate Admin (global data management) from Tenant (bookmark management) responsibilities
3. Automate metric calculation after successful downloads
4. Centralize alert configuration and monitoring
5. Improve visibility into job health and status

### Success Criteria
- ✅ Single dashboard shows all jobs (NAV, Market, Alerts)
- ✅ Admin can monitor and trigger downloads for all NAVs/Indices
- ✅ Tenants can monitor and trigger downloads for their bookmarks
- ✅ Metrics automatically calculated after daily downloads
- ✅ Alerts consolidated with header bell icon integration
- ✅ Failed/pending jobs identifiable at a glance

---

## User Personas

### 1. Admin User
**Role:** System Administrator
**Needs:**
- Monitor ALL NAV schemes (active ones without end_date)
- Monitor ALL Market indices
- Trigger downloads for any scheme/index
- See system-wide job health
- Manage global scheduler configurations

**Access Level:**
- Full access to all NAV schemes
- Full access to all Market indices
- Scheduler configuration for NAV and Market downloads
- Dashboard statistics show global counts

### 2. Tenant User (Non-Admin)
**Role:** Investment Advisor / RIA
**Needs:**
- Monitor bookmarked NAV schemes
- Monitor Market indices (same as Admin)
- Trigger downloads for bookmarked schemes
- Configure alerts for their customers
- See job health for their scope

**Access Level:**
- Access only to bookmarked NAV schemes
- Full access to all Market indices (global data)
- No scheduler configuration (Admin-only)
- Alert configuration for their tenant
- Dashboard statistics show tenant-scoped counts

---

## Functional Requirements

### FR-1: Navigation & Access Control

#### FR-1.1: Sidebar Menu
- **Requirement**: Add "Cruise Control" menu item to sidebar navigation
- **Access**: Available to both Admin and Non-Admin users
- **Icon**: 🎛️ or similar dashboard/control icon
- **Position**: After "Customers" or in "Settings" section
- **Behavior**: Navigates to Cruise Control dashboard on click

#### FR-1.2: Role-Based UI
- **Admin Users**: See full dashboard with all features
- **Tenant Users**: See filtered dashboard (bookmarks only for NAV)
- **Feature Flags**: NAV/Market scheduler config only visible to Admin

---

### FR-2: Dashboard View (Landing Page)

#### FR-2.1: Overview Statistics
Display aggregate statistics across all job types:

| Metric | Description | Calculation |
|--------|-------------|-------------|
| **Total Jobs** | Total number of tracked items | Count(active NAVs) + Count(market indices) + Count(active alerts) |
| **Successful** | Jobs with latest data downloaded | Count(status = 'success' for today) |
| **Failed** | Jobs that failed in last execution | Count(status = 'failed' in last 24h) |
| **Pending** | Jobs pending beyond expected time | Count(latest_date < yesterday) |

**Admin View**: Statistics include ALL NAVs
**Tenant View**: NAV statistics include ONLY bookmarked schemes

#### FR-2.2: Tab Navigation
Three main tabs:
1. **NAV** - NAV download monitoring and management
2. **Market Downloads** - Market index monitoring and management
3. **Alerts** - Alert configuration and monitoring

---

### FR-3: NAV Tab

#### FR-3.1: NAV Statistics Cards (Admin)

| Card | Metric | Query Logic |
|------|--------|-------------|
| **Total Active NAVs** | Count of schemes tracked | `SELECT COUNT(*) FROM m_nav_schemes WHERE is_active = true AND end_date IS NULL` |
| **Pending Downloads** | Schemes missing today's NAV | `SELECT COUNT(*) FROM m_nav_schemes WHERE is_active = true AND end_date IS NULL AND latest_nav_date < CURRENT_DATE` |
| **Failed Downloads** | Schemes with last status = failed | `SELECT COUNT(*) FROM m_nav_schemes WHERE download_status = 'failed'` |
| **Pending Beyond Daily** | Schemes missing >1 day | `SELECT COUNT(*) FROM m_nav_schemes WHERE is_active = true AND end_date IS NULL AND latest_nav_date < CURRENT_DATE - INTERVAL '1 day'` |
| **Metrics Pending** | NAVs downloaded but metrics not calculated | `SELECT COUNT(*) FROM m_nav_schemes WHERE latest_nav_date > latest_metrics_calculated_date` |

#### FR-3.2: NAV Statistics Cards (Tenant)

| Card | Metric | Query Logic |
|------|--------|-------------|
| **Total Bookmarked NAVs** | Count of bookmarked schemes | `SELECT COUNT(*) FROM t_nav_bookmarks WHERE tenant_id = X AND is_live = Y` |
| **Pending Downloads** | Bookmarked schemes missing today's NAV | Same as Admin but with `INNER JOIN t_nav_bookmarks` filter |
| **Failed Downloads** | Bookmarked schemes with failed status | Same as Admin but filtered by bookmarks |
| **Pending Beyond Daily** | Bookmarked schemes missing >1 day | Same as Admin but filtered by bookmarks |
| **Metrics Pending** | Bookmarked NAVs with pending metrics | Same as Admin but filtered by bookmarks |

#### FR-3.3: Drill-Down Lists
- **Click on any statistic card** → Opens list view with relevant schemes
- **List Columns**: Scheme Code, Scheme Name, Latest NAV Date, Download Status, Last Updated, Actions
- **Actions**: "Download Now" button for each scheme
- **Pagination**: Support 20/50/100 items per page
- **Search/Filter**: By scheme code, scheme name, status

#### FR-3.4: Download Now Action
- **Trigger**: Click "Download Now" for a scheme
- **Behavior**:
  - Admin: Triggers download for that specific scheme
  - Tenant: Triggers download for that scheme (updates global data)
- **Feedback**: Show loading state, then success/error notification
- **Update**: Refresh list after download completes
- **Global Impact**: NAV data is global - download updates data for ALL tenants

#### FR-3.5: Auto-Calculate Metrics
- **Trigger**: After successful daily NAV download completes
- **Action**: Automatically calculate metrics for schemes with new NAV data
- **Scope**: Calculate for all pending dates between `latest_metrics_calculated_date` and `latest_nav_date`
- **Background Job**: Run as async job to avoid blocking
- **Notification**: Show completion status in dashboard
- **Error Handling**: Log errors, don't block downloads

---

### FR-4: Market Downloads Tab

#### FR-4.1: Market Statistics Cards (Same for Admin & Tenant)

| Card | Metric | Query Logic |
|------|--------|-------------|
| **Total Indices** | Count of tracked indices | `SELECT COUNT(*) FROM t_market_indices WHERE is_active = true` |
| **Download Completed** | Indices with latest data | `SELECT COUNT(*) FROM t_market_indices WHERE latest_date >= CURRENT_DATE - INTERVAL '1 day'` |
| **Pending >1 Day** | Indices missing >1 day of data | `SELECT COUNT(*) FROM t_market_indices WHERE latest_date < CURRENT_DATE - INTERVAL '1 day'` |
| **Failed** | Indices with failed status | `SELECT COUNT(*) FROM t_market_indices WHERE download_status = 'failed'` |
| **Metrics Pending** | Indices with pending metric calculations | `SELECT COUNT(*) FROM t_market_indices WHERE latest_date > latest_metrics_calculated_date` |

#### FR-4.2: Drill-Down Lists
- **Click on any statistic card** → Opens list view with relevant indices
- **List Columns**: Index Name, Symbol, Latest Date, Download Status, Last Updated, Actions
- **Actions**: "Download Now" button for each index
- **Pagination**: Support 20/50/100 items per page
- **Search/Filter**: By index name, symbol, status

#### FR-4.3: Download Now Action
- **Trigger**: Click "Download Now" for an index
- **Behavior**: Triggers EOD download for that specific index
- **Feedback**: Show loading state, then success/error notification
- **Update**: Refresh list after download completes

#### FR-4.4: Auto-Calculate Metrics
- **Trigger**: After successful daily market download completes
- **Action**: Automatically calculate market analysis metrics
- **Scope**: Calculate for all pending dates
- **Background Job**: Run as async job
- **Notification**: Show completion status in dashboard

---

### FR-5: Alerts Tab (Tenant-Level)

#### FR-5.1: Alert Configuration
**Move from**: Customer Dashboard → CustomerViewPage → JTBD/Goals Profile Trigger
**Move to**: Cruise Control → Alerts tab

**Features**:
- Configure alert rules for JTBD and Goals
- View configured rules in table format
- Enable/disable alerts per rule
- Edit alert thresholds and conditions

#### FR-5.2: Alert List View
- **Columns**: Alert Type, Customer, Rule Description, Status, Triggered Date, Actions
- **Actions**: View Details, Acknowledge, Dismiss
- **Filters**: By alert type (JTBD, Goals), status (active, acknowledged, dismissed)
- **Pagination**: 20/50/100 per page

#### FR-5.3: Header Bell Icon Integration
- **Location**: Application header (global)
- **Badge**: Show count of active alerts
- **Click Behavior**: Navigate to Cruise Control → Alerts tab
- **Real-time Updates**: Refresh count when new alerts trigger
- **Color Coding**:
  - No alerts: Gray bell icon
  - Alerts present: Red badge with count

#### FR-5.4: Alert Rule Management
- **Create Rule**: Modal dialog to create new alert rule
- **Edit Rule**: Click on rule to edit conditions
- **Delete Rule**: Confirmation before deletion
- **Rule Types**:
  - JTBD Profile Triggers
  - Goal Progress Alerts
  - Goal Due Date Alerts

---

### FR-6: Scheduler Configuration Changes

#### FR-6.1: Admin-Only NAV Scheduler
- **Current**: Tenant-level scheduler configuration (`t_nav_scheduler_configs` has `tenant_id`)
- **New**: Admin-only scheduler configuration
- **Changes**:
  - Remove scheduler config UI from tenant view
  - Show scheduler config only to Admin users
  - Global scheduler downloads ALL active NAVs (no tenant filtering)
  - Tenant users can only trigger manual "Download Now" for bookmarks

#### FR-6.2: Admin-Only Market Scheduler
- **Current**: Global scheduler (`t_market_eod_scheduler`)
- **New**: Remains global, UI only for Admin
- **Changes**:
  - Show scheduler config only to Admin users
  - Tenant users can only trigger manual "Download Now"

#### FR-6.3: Migration
- **Existing Scheduler Configs**: Mark as deprecated or migrate to Admin ownership
- **Data Preservation**: Keep existing `t_nav_scheduler_configs` table for backward compatibility
- **New Behavior**: Only Admin-created configs are active

---

## Non-Functional Requirements

### NFR-1: Performance
- Dashboard must load in <2 seconds
- Statistics queries must execute in <500ms
- List views must support pagination (avoid full table scans)
- Metric calculation jobs must not block UI

### NFR-2: Scalability
- Support 10,000+ active NAV schemes
- Support 100+ market indices
- Support 1,000+ alerts per tenant
- Background jobs should queue if multiple triggered

### NFR-3: Security
- Admin-only features enforced at API level (not just UI)
- Tenant users can only see their own bookmarks/alerts
- Download actions logged with user attribution
- RBAC enforced on all endpoints

### NFR-4: Usability
- Consistent UI patterns across NAV, Market, Alerts tabs
- Clear visual distinction between Admin and Tenant views
- Loading states for all async operations
- Error messages actionable and clear

### NFR-5: Reliability
- Failed downloads should retry automatically (existing behavior)
- Metric calculation failures should not break downloads
- UI should handle stale data gracefully
- Background jobs should log errors for debugging

---

## User Interface Specifications

### Layout Structure

```
┌─────────────────────────────────────────────────────────────┐
│  Header: KewalInvest | [Bell Icon with Badge] | User Menu   │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─────────┐                                                 │
│  │ Sidebar │  ┌──────────────────────────────────────────┐  │
│  │         │  │ CRUISE CONTROL                            │  │
│  │ • Home  │  │                                           │  │
│  │ • Cust  │  │ ┌──────────┬──────────┬──────────┐       │  │
│  │ • Cruise│  │ │ Total    │ Success  │ Failed   │       │  │
│  │   (⭐)  │  │ │ Jobs: 42 │ ful: 38  │ : 4      │       │  │
│  │ • Nav   │  │ └──────────┴──────────┴──────────┘       │  │
│  │ • Market│  │                                           │  │
│  └─────────┘  │ ┌─────────────────────────────────────┐  │  │
│               │ │ [NAV] [Market Downloads] [Alerts]  │  │  │
│               │ └─────────────────────────────────────┘  │  │
│               │                                           │  │
│               │ NAV Tab Content:                         │  │
│               │ ┌────────────────────────────────────┐   │  │
│               │ │ Total Active NAVs        1,247     │   │  │
│               │ ├────────────────────────────────────┤   │  │
│               │ │ Pending Downloads          23      │   │  │
│               │ ├────────────────────────────────────┤   │  │
│               │ │ Failed Downloads            4      │   │  │
│               │ ├────────────────────────────────────┤   │  │
│               │ │ Pending Beyond Daily        2      │   │  │
│               │ ├────────────────────────────────────┤   │  │
│               │ │ Metrics Pending            15      │   │  │
│               │ └────────────────────────────────────┘   │  │
│               │                                           │  │
│               │ (Click cards to see drill-down lists)    │  │
│               └──────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Component Hierarchy

```
CruiseControlPage
├── CruiseControlDashboard (Overview Statistics)
│   ├── StatCard (Total Jobs)
│   ├── StatCard (Successful)
│   └── StatCard (Failed)
├── TabNavigation
│   ├── NavTab
│   │   ├── NavStatistics (5 cards)
│   │   ├── NavListView (on card click)
│   │   │   ├── NavListTable
│   │   │   └── DownloadNowButton
│   │   └── NavSchedulerConfig (Admin only)
│   ├── MarketTab
│   │   ├── MarketStatistics (5 cards)
│   │   ├── MarketListView (on card click)
│   │   │   ├── MarketListTable
│   │   │   └── DownloadNowButton
│   │   └── MarketSchedulerConfig (Admin only)
│   └── AlertsTab
│       ├── AlertRuleConfig
│       ├── AlertListView
│       └── AlertDetails
└── BellIconHeader (separate component in header)
    ├── AlertBadge (count)
    └── AlertDropdown (on click → navigate to Alerts)
```

---

## Technical Architecture

### Frontend Architecture

**New Pages**:
- `frontend/src/pages/cruiseControl/CruiseControlPage.tsx` - Main page
- `frontend/src/pages/cruiseControl/NavTab.tsx` - NAV monitoring
- `frontend/src/pages/cruiseControl/MarketTab.tsx` - Market monitoring
- `frontend/src/pages/cruiseControl/AlertsTab.tsx` - Alert management

**New Components**:
- `frontend/src/components/cruiseControl/StatisticsCard.tsx` - Reusable stat card
- `frontend/src/components/cruiseControl/NavListView.tsx` - NAV list with actions
- `frontend/src/components/cruiseControl/MarketListView.tsx` - Market list with actions
- `frontend/src/components/cruiseControl/AlertRuleForm.tsx` - Alert rule editor
- `frontend/src/components/cruiseControl/AlertBellIcon.tsx` - Header bell icon

**New Hooks**:
- `frontend/src/hooks/useCruiseControlStats.ts` - Fetch dashboard stats
- `frontend/src/hooks/useNavMonitoring.ts` - NAV tab data
- `frontend/src/hooks/useMarketMonitoring.ts` - Market tab data
- `frontend/src/hooks/useAlerts.ts` - Alert data and actions

**State Management**:
- React Query for server state
- Local state for tab navigation
- Global state for alert count (header bell icon)

### Backend Architecture

**New Services**:
- `backend/src/services/cruiseControl.service.ts` - Dashboard statistics
- `backend/src/services/navMonitoring.service.ts` - NAV monitoring logic
- `backend/src/services/marketMonitoring.service.ts` - Market monitoring logic
- `backend/src/services/alertConfig.service.ts` - Alert configuration
- `backend/src/services/metricCalculation.job.ts` - Auto-metric calculation

**New Routes**:
- `backend/src/routes/cruiseControl.routes.ts` - All Cruise Control endpoints

**Background Jobs**:
- NAV metric auto-calculation job
- Market metric auto-calculation job

---

## Data Model Changes

### New Tables

#### 1. `t_cruise_control_alerts` (Move from existing alert tables)
```sql
CREATE TABLE t_cruise_control_alerts (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES t_tenants(id),
    is_live BOOLEAN NOT NULL,
    alert_type VARCHAR(50) NOT NULL, -- 'jtbd_trigger', 'goal_progress', 'goal_due'
    customer_id INTEGER REFERENCES t_customers(id),
    rule_id INTEGER,
    alert_message TEXT,
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'acknowledged', 'dismissed'
    triggered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    acknowledged_at TIMESTAMP,
    acknowledged_by INTEGER REFERENCES t_users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_alerts_tenant_status ON t_cruise_control_alerts(tenant_id, is_live, status);
CREATE INDEX idx_alerts_customer ON t_cruise_control_alerts(customer_id);
```

#### 2. `t_cruise_control_alert_rules` (Alert rule configuration)
```sql
CREATE TABLE t_cruise_control_alert_rules (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES t_tenants(id),
    is_live BOOLEAN NOT NULL,
    rule_type VARCHAR(50) NOT NULL, -- 'jtbd_trigger', 'goal_progress', 'goal_due'
    rule_name VARCHAR(255),
    rule_config JSONB NOT NULL, -- Conditions, thresholds, etc.
    is_enabled BOOLEAN DEFAULT true,
    created_by INTEGER REFERENCES t_users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_alert_rule UNIQUE(tenant_id, is_live, rule_type, rule_name)
);
```

### Modified Tables

#### 1. `m_nav_schemes` - Add metrics tracking
```sql
ALTER TABLE m_nav_schemes
ADD COLUMN latest_metrics_calculated_date DATE,
ADD COLUMN metrics_calculation_status VARCHAR(20) DEFAULT 'pending'; -- 'pending', 'calculating', 'completed', 'failed'
```

#### 2. `t_market_indices` - Add metrics tracking
```sql
ALTER TABLE t_market_indices
ADD COLUMN latest_metrics_calculated_date DATE,
ADD COLUMN metrics_calculation_status VARCHAR(20) DEFAULT 'pending';
```

#### 3. `t_nav_scheduler_configs` - Add admin flag
```sql
ALTER TABLE t_nav_scheduler_configs
ADD COLUMN is_admin_config BOOLEAN DEFAULT false;

-- Mark existing configs as admin configs
UPDATE t_nav_scheduler_configs SET is_admin_config = true;
```

### Views

#### 1. `v_nav_monitoring_stats` - NAV statistics view
```sql
CREATE VIEW v_nav_monitoring_stats AS
SELECT
    COUNT(*) FILTER (WHERE end_date IS NULL AND is_active = true) as total_active,
    COUNT(*) FILTER (WHERE latest_nav_date < CURRENT_DATE AND end_date IS NULL) as pending_downloads,
    COUNT(*) FILTER (WHERE download_status = 'failed') as failed_downloads,
    COUNT(*) FILTER (WHERE latest_nav_date < CURRENT_DATE - INTERVAL '1 day' AND end_date IS NULL) as pending_beyond_daily,
    COUNT(*) FILTER (WHERE latest_nav_date > COALESCE(latest_metrics_calculated_date, '1900-01-01')) as metrics_pending
FROM m_nav_schemes;
```

#### 2. `v_market_monitoring_stats` - Market statistics view
```sql
CREATE VIEW v_market_monitoring_stats AS
SELECT
    COUNT(*) FILTER (WHERE is_active = true) as total_indices,
    COUNT(*) FILTER (WHERE latest_date >= CURRENT_DATE - INTERVAL '1 day') as download_completed,
    COUNT(*) FILTER (WHERE latest_date < CURRENT_DATE - INTERVAL '1 day') as pending_beyond_one_day,
    COUNT(*) FILTER (WHERE download_status = 'failed') as failed_downloads,
    COUNT(*) FILTER (WHERE latest_date > COALESCE(latest_metrics_calculated_date, '1900-01-01')) as metrics_pending
FROM t_market_indices;
```

---

## API Specifications

### Dashboard Endpoints

#### `GET /api/cruise-control/dashboard`
**Description**: Get overview statistics
**Auth**: Required (both Admin and Tenant)
**Response**:
```json
{
  "total_jobs": 1289,
  "successful": 1247,
  "failed": 4,
  "pending": 38,
  "breakdown": {
    "nav": { "total": 1247, "successful": 1230, "failed": 2, "pending": 15 },
    "market": { "total": 12, "successful": 10, "failed": 2, "pending": 0 },
    "alerts": { "total": 30, "active": 7, "acknowledged": 23, "dismissed": 0 }
  }
}
```

### NAV Monitoring Endpoints

#### `GET /api/cruise-control/nav/statistics`
**Description**: Get NAV statistics
**Auth**: Required
**Query Params**: `tenant_id` (optional for admin), `is_live` (required)
**Response**:
```json
{
  "total_active": 1247,
  "pending_downloads": 23,
  "failed_downloads": 4,
  "pending_beyond_daily": 2,
  "metrics_pending": 15,
  "is_admin_view": true
}
```

#### `GET /api/cruise-control/nav/list`
**Description**: Get NAV list for drill-down
**Auth**: Required
**Query Params**:
- `filter`: "pending" | "failed" | "pending_beyond_daily" | "metrics_pending"
- `tenant_id`: (optional for admin)
- `is_live`: boolean
- `page`: number
- `page_size`: number
- `search`: string (optional)

**Response**:
```json
{
  "schemes": [
    {
      "scheme_id": 123,
      "scheme_code": "INF123456789",
      "scheme_name": "HDFC Equity Fund",
      "latest_nav_date": "2025-01-22",
      "download_status": "pending",
      "metrics_calculation_status": "pending",
      "is_bookmarked": true,
      "last_updated": "2025-01-22T10:30:00Z"
    }
  ],
  "total_count": 23,
  "page": 1,
  "page_size": 20
}
```

#### `POST /api/cruise-control/nav/download/:schemeId`
**Description**: Trigger manual download for a scheme
**Auth**: Required
**Body**:
```json
{
  "download_type": "daily",
  "tenant_id": 1,
  "is_live": true
}
```
**Response**:
```json
{
  "job_id": 456,
  "status": "pending",
  "message": "Download queued for INF123456789"
}
```

#### `POST /api/cruise-control/nav/calculate-metrics`
**Description**: Trigger metric calculation for NAVs
**Auth**: Admin only
**Body**:
```json
{
  "scheme_ids": [123, 456, 789],
  "is_live": true
}
```
**Response**:
```json
{
  "job_id": 789,
  "schemes_queued": 3,
  "message": "Metric calculation queued"
}
```

### Market Monitoring Endpoints

#### `GET /api/cruise-control/market/statistics`
**Description**: Get Market statistics
**Auth**: Required
**Response**:
```json
{
  "total_indices": 12,
  "download_completed": 10,
  "pending_beyond_one_day": 0,
  "failed_downloads": 2,
  "metrics_pending": 3
}
```

#### `GET /api/cruise-control/market/list`
**Description**: Get Market index list
**Query Params**: Similar to NAV list
**Response**: Similar structure to NAV list

#### `POST /api/cruise-control/market/download/:indexId`
**Description**: Trigger manual download for an index
**Response**: Similar to NAV download

#### `POST /api/cruise-control/market/calculate-metrics`
**Description**: Trigger metric calculation for indices
**Auth**: Admin only
**Response**: Similar to NAV metric calculation

### Alert Endpoints

#### `GET /api/cruise-control/alerts`
**Description**: Get alerts for tenant
**Auth**: Required
**Query Params**:
- `tenant_id`: number
- `is_live`: boolean
- `status`: "active" | "acknowledged" | "dismissed"
- `page`: number
- `page_size`: number

**Response**:
```json
{
  "alerts": [
    {
      "id": 1,
      "alert_type": "goal_due",
      "customer_name": "John Doe",
      "alert_message": "Goal 'Retirement Planning' due in 30 days",
      "status": "active",
      "triggered_at": "2025-01-23T10:00:00Z"
    }
  ],
  "total_count": 7,
  "active_count": 7,
  "page": 1,
  "page_size": 20
}
```

#### `GET /api/cruise-control/alerts/count`
**Description**: Get active alert count for header bell icon
**Auth**: Required
**Query Params**: `tenant_id`, `is_live`
**Response**:
```json
{
  "count": 7
}
```

#### `POST /api/cruise-control/alerts/:alertId/acknowledge`
**Description**: Acknowledge an alert
**Auth**: Required
**Response**:
```json
{
  "success": true,
  "alert_id": 1,
  "status": "acknowledged"
}
```

#### `GET /api/cruise-control/alerts/rules`
**Description**: Get alert rules for tenant
**Auth**: Required
**Response**:
```json
{
  "rules": [
    {
      "id": 1,
      "rule_type": "goal_due",
      "rule_name": "Goal Due in 30 Days",
      "rule_config": {
        "days_before_due": 30,
        "notification_method": "email"
      },
      "is_enabled": true
    }
  ]
}
```

#### `POST /api/cruise-control/alerts/rules`
**Description**: Create alert rule
**Auth**: Required
**Body**: Rule configuration
**Response**: Created rule

#### `PUT /api/cruise-control/alerts/rules/:ruleId`
**Description**: Update alert rule
**Auth**: Required
**Body**: Updated rule configuration
**Response**: Updated rule

#### `DELETE /api/cruise-control/alerts/rules/:ruleId`
**Description**: Delete alert rule
**Auth**: Required
**Response**: Success confirmation

---

## Migration Strategy

### Phase 1: Database Migrations
1. Add new columns to `m_nav_schemes` and `t_market_indices`
2. Create new tables: `t_cruise_control_alerts`, `t_cruise_control_alert_rules`
3. Create views: `v_nav_monitoring_stats`, `v_market_monitoring_stats`
4. Add indexes for performance

### Phase 2: Backend Services
1. Create `cruiseControl.service.ts` with statistics queries
2. Create `navMonitoring.service.ts` and `marketMonitoring.service.ts`
3. Create `alertConfig.service.ts` for alert management
4. Create `metricCalculation.job.ts` for auto-calculation
5. Add routes in `cruiseControl.routes.ts`

### Phase 3: Frontend Components
1. Create Cruise Control page and tab components
2. Create statistics cards and list views
3. Create alert management UI
4. Add bell icon to header with badge
5. Update sidebar navigation

### Phase 4: Integration
1. Hook metric calculation jobs to download completion
2. Migrate existing alert configurations to new tables
3. Update scheduler access control (Admin only)
4. Test end-to-end flows

### Phase 5: Data Migration
1. Backfill `latest_metrics_calculated_date` for existing schemes
2. Migrate existing JTBD/Goal alerts to new alert tables
3. Mark existing scheduler configs as admin-owned

---

## Success Metrics

### User Adoption
- **Target**: 80% of users access Cruise Control within first week
- **Measure**: Track unique page views

### Job Monitoring
- **Target**: 50% reduction in time to identify failed downloads
- **Measure**: Track time from failure to admin action

### Metric Calculation
- **Target**: 95% of metrics calculated within 1 hour of download
- **Measure**: Track metric calculation lag

### Alert Consolidation
- **Target**: 100% of alerts visible in Cruise Control
- **Measure**: Count alerts in new system vs old system

### Performance
- **Target**: Dashboard loads in <2 seconds
- **Measure**: Track API response times

---

## Out of Scope

### Not Included in V1
1. **Email Notifications**: Not sending emails for failed downloads (future)
2. **Bulk Actions**: No multi-select for bulk downloads (future)
3. **Historical Analytics**: No charts/graphs of download trends (future)
4. **Custom Dashboards**: No user-customizable widget layout (future)
5. **Mobile App**: Web only, mobile app integration later
6. **Advanced Filtering**: Basic filters only, advanced search later
7. **Export Reports**: No CSV/PDF export of job status (future)

---

## Open Questions

### Technical Decisions Needed
1. **Metric Calculation Trigger**: Should it be immediate after download, or scheduled batch job?
2. **Alert Storage**: Migrate existing alerts or keep dual system temporarily?
3. **Scheduler Migration**: How to handle existing tenant-level scheduler configs?
4. **Real-time Updates**: Should dashboard auto-refresh? WebSocket or polling?
5. **Job Queue**: Do we need a formal job queue (Bull/BullMQ) or keep current pattern?

### Product Decisions Needed
1. **Alert Types**: What other alert types beyond JTBD/Goals?
2. **Permission Model**: Can tenants trigger downloads for non-bookmarked schemes?
3. **Retention Policy**: How long to keep alert history?
4. **Notification Preferences**: In-app only or add email/SMS?
5. **Admin Controls**: Should admin be able to disable tenant manual downloads?

### UI/UX Decisions Needed
1. **Tab Order**: NAV first or Market first?
2. **Default View**: Show cards or list by default?
3. **Color Coding**: What colors for pending/failed/success?
4. **Refresh Frequency**: How often to auto-refresh stats?
5. **Mobile Layout**: How to handle tabs on mobile screens?

---

## Appendix

### Related Documents
- Current NAV Scheduler Documentation
- Current Market Download Documentation
- Alert System Design (existing)

### References
- Job Capability Analysis (previous document)
- Database Schema Documentation
- API Endpoint Inventory

---

**END OF PRD**
