# Customer Portfolio Enhancement - Technical Specification

## Document Information
- **Project**: Customer Portfolio Enhancement
- **Version**: 1.0
- **Date**: October 2025
- **Branch**: `claude/nav-tracking-ux-analysis-011CUUGD4WjHo3M8pnia29mi`
- **Status**: Phases 1-4 Complete, Phase 5 Pending

---

## Executive Summary

This document outlines the complete technical specification for enhancing the Customer Portfolio view with improved UX, goal tracking, meeting management, and comprehensive monthly performance tracking. The enhancement is divided into 5 phases, with Phases 1-4 completed and Phase 5 pending.

### Total Implementation:
- **Backend Code**: ~2,630 lines (types, services, controllers, routes)
- **Frontend Code**: ~7,350 lines (services, components, pages)
- **Database Changes**: Function modifications, new indexes
- **Files Created**: 18 new files
- **Files Modified**: 8 existing files

---

## Table of Contents

1. [Phase 1: NAV Tracking UX Enhancement](#phase-1-nav-tracking-ux-enhancement)
2. [Phase 2: Goal Tracking & Asset Allocation](#phase-2-goal-tracking--asset-allocation)
3. [Phase 3: Customer Meetings Management](#phase-3-customer-meetings-management)
4. [Phase 4: Monthly Tracking](#phase-4-monthly-tracking)
5. [Phase 5: Family View (Pending)](#phase-5-family-view-pending)
6. [Technical Architecture](#technical-architecture)
7. [File Manifest](#file-manifest)
8. [API Specifications](#api-specifications)
9. [Database Schema Changes](#database-schema-changes)
10. [Testing Strategy](#testing-strategy)

---

## Phase 1: NAV Tracking UX Enhancement

### Objective
Simplify and streamline the NAV Tracking section in the customer portfolio view by reducing vertical space consumption by 30% while maintaining all functionality.

### Business Requirements
- Reduce header component height from excessive vertical space to compact design
- Maintain all existing information display
- Improve visual hierarchy and readability
- Ensure responsive design consistency

### Technical Strategy

#### Components Modified:

**1. CustomerViewHeader.tsx**
- **Purpose**: Display customer basic information (name, PAN, IWELL code)
- **Changes**:
  - Reduce padding from large to compact
  - Optimize font sizes (heading: 1.5rem → 1.25rem)
  - Tighten spacing between elements
  - Maintain icon sizes but reduce margins
- **Height Reduction**: ~40px → ~28px (30% reduction)

**2. CustomerPortfolioSummary.tsx**
- **Purpose**: Display portfolio summary metrics (total invested, current value, returns)
- **Changes**:
  - Convert from card-based to inline grid layout
  - Reduce padding (1.5rem → 0.75rem)
  - Optimize metric card spacing
  - Smaller font sizes for labels
- **Height Reduction**: ~120px → ~84px (30% reduction)

**3. CustomerNAVTracking.tsx**
- **Purpose**: Main NAV tracking container with scheme selector and chart
- **Changes**:
  - Compact scheme selector dropdown
  - Reduce spacing between selector and chart
  - Optimize chart container margins
  - Tighter component padding
- **Height Reduction**: Overall section ~300px → ~210px (30% reduction)

### Implementation Details

```typescript
// Example: CustomerViewHeader.tsx optimization
const headerStyle = {
  padding: '0.75rem 1rem',  // Was: 1.5rem 2rem
  marginBottom: '0.5rem',    // Was: 1rem
};

const nameStyle = {
  fontSize: '1.25rem',       // Was: 1.5rem
  fontWeight: 600,
  marginBottom: '0.25rem',   // Was: 0.5rem
};
```

### Files Affected
- `frontend/src/components/customers/CustomerViewHeader.tsx` (Modified)
- `frontend/src/components/customers/CustomerPortfolioSummary.tsx` (Modified)
- `frontend/src/components/customers/CustomerNAVTracking.tsx` (Modified)

### Success Criteria
- [ ] Overall header section height reduced by 30%
- [ ] All information remains visible and readable
- [ ] No horizontal scrolling introduced
- [ ] Consistent spacing and alignment
- [ ] Works on all screen sizes (desktop, tablet)

---

## Phase 2: Goal Tracking & Asset Allocation

### Objective
Implement comprehensive goal tracking functionality with watchlist management and asset allocation utilization tracking.

### Business Requirements
- Display customer goals with current vs target tracking
- Allow advisors to add/remove goals to watchlist
- Show asset allocation utilization per goal
- Provide clear visual indicators for goal progress
- Support multi-scheme goal allocation

### Technical Strategy

#### Backend Components:

**1. goalTracking.types.ts** (NEW - 240 lines)
- **Purpose**: Define TypeScript interfaces for all goal-related data structures
- **Key Types**:
  ```typescript
  export interface GoalTrackingData {
    goal_id: number;
    goal_name: string;
    target_amount: number;
    current_amount: number;
    progress_percentage: number;
    time_remaining_months: number;
    target_date: string;
    monthly_sip_required: number;
    is_on_track: boolean;
    risk_level: 'low' | 'medium' | 'high';
    schemes: GoalSchemeAllocation[];
  }

  export interface GoalSchemeAllocation {
    scheme_code: string;
    scheme_name: string;
    allocated_amount: number;
    current_value: number;
    allocation_percentage: number;
  }

  export interface AssetAllocationUtilization {
    goal_id: number;
    goal_name: string;
    asset_class: string;
    target_percentage: number;
    current_percentage: number;
    variance: number;
    is_within_tolerance: boolean;
  }
  ```

**2. goalTracking.service.ts** (NEW - 520 lines)
- **Purpose**: Business logic for goal tracking calculations and data aggregation
- **Key Methods**:
  - `getGoalTrackingStatus(tenantId, isLive, customerId)`: Aggregate all goal data
  - `calculateGoalProgress()`: Compute progress percentages and on-track status
  - `getAssetAllocationUtilization()`: Compare current vs target asset allocation
  - `getSIPRequirements()`: Calculate required monthly SIP amounts
  - `getSchemeAllocationByGoal()`: Break down scheme-wise allocations

**3. goal.controller.ts** (NEW - 380 lines)
- **Purpose**: HTTP request handlers for goal tracking endpoints
- **Endpoints**:
  - `GET /api/goals/:customerId/tracking` - Get all goal tracking data
  - `GET /api/goals/:customerId/asset-allocation` - Get asset allocation utilization
  - `POST /api/goals/:customerId/watchlist/:goalId` - Add goal to watchlist
  - `DELETE /api/goals/:customerId/watchlist/:goalId` - Remove from watchlist
  - `GET /api/goals/watchlist` - Get advisor's watchlist goals
- **Authentication**: All endpoints use `AuthenticatedRequest` with `user.user_id` and `tenant_id`

**4. goal.routes.ts** (NEW - 45 lines)
- **Purpose**: Define API routes for goal tracking
- **Pattern**: `/api/goals/*`
- **Middleware**: Authentication required for all routes

#### Frontend Components:

**1. goalTracking.service.ts** (NEW - 180 lines)
- **Purpose**: API wrapper for goal tracking endpoints
- **Methods**:
  ```typescript
  export class GoalTrackingService {
    static async getGoalTrackingStatus(customerId: string): Promise<GoalTrackingResponse>
    static async getAssetAllocationUtilization(customerId: string): Promise<AssetAllocationResponse>
    static async addToWatchlist(customerId: string, goalId: number): Promise<void>
    static async removeFromWatchlist(customerId: string, goalId: number): Promise<void>
    static async getWatchlistGoals(): Promise<GoalTrackingData[]>
  }
  ```

**2. GoalTrackingCard.tsx** (NEW - 340 lines)
- **Purpose**: Display individual goal with progress bar, target amount, and allocation breakdown
- **Features**:
  - Visual progress bar with color coding (green: on-track, yellow: at-risk, red: off-track)
  - Target amount vs current amount display
  - Time remaining indicator
  - Required monthly SIP calculation
  - Scheme-wise allocation breakdown
  - Watchlist toggle button
- **Data Display**:
  ```
  Goal Name
  ├── Progress: 45% (₹4,50,000 / ₹10,00,000)
  ├── Time Remaining: 24 months
  ├── Required SIP: ₹25,000/month
  ├── Status: On Track ✓
  └── Allocations:
      ├── Scheme A: ₹2,00,000 (44%)
      └── Scheme B: ₹2,50,000 (56%)
  ```

**3. AssetAllocationView.tsx** (NEW - 280 lines)
- **Purpose**: Display asset allocation utilization per goal with variance indicators
- **Features**:
  - Asset class breakdown (Equity, Debt, Hybrid, etc.)
  - Target vs Current allocation comparison
  - Variance percentage with color coding
  - Tolerance indicators (within/outside acceptable range)
  - Visual bar charts for allocation comparison
- **Layout**:
  ```
  Goal: Retirement Planning
  ┌─────────────────────────────────────────────┐
  │ Equity    Target: 70%  Current: 65%  (-5%) │
  │ [███████████████████▓▓▓▓▓▓▓▓▓]              │
  │ Debt      Target: 20%  Current: 25%  (+5%) │
  │ [█████████████▓▓▓▓▓▓]                       │
  │ Hybrid    Target: 10%  Current: 10%  (0%)  │
  │ [███████▓]                                  │
  └─────────────────────────────────────────────┘
  ```

**4. GoalTrackingTab.tsx** (NEW - 220 lines)
- **Purpose**: Container component for goal tracking tab in customer portfolio
- **Features**:
  - List all customer goals
  - Toggle between goals view and asset allocation view
  - Empty state handling (no goals configured)
  - Loading states
  - Error handling
- **Integration**: Embedded in CustomerViewPage Portfolio tab

### Database Requirements

**Tables Used**:
- `t_goals`: Customer goals with target amounts and dates
- `t_goal_allocations`: Scheme-wise allocations per goal
- `t_portfolio_holdings`: Current portfolio positions
- `t_watchlist_goals`: Advisor's watchlist (new table or feature flag in t_goals)

**Indexes Required**:
```sql
CREATE INDEX idx_goals_customer ON t_goals(customer_id, tenant_id, is_live);
CREATE INDEX idx_goal_allocations_goal ON t_goal_allocations(goal_id);
CREATE INDEX idx_watchlist_advisor ON t_watchlist_goals(advisor_id, tenant_id);
```

### Calculation Logic

**Goal Progress Percentage**:
```typescript
progress_percentage = (current_amount / target_amount) * 100
```

**Required Monthly SIP**:
```typescript
months_remaining = target_date - current_date (in months)
gap_amount = target_amount - current_amount
monthly_sip_required = gap_amount / months_remaining
// Note: This is simplified; actual calculation should consider expected returns
```

**On-Track Status**:
```typescript
expected_progress = (months_elapsed / total_months) * 100
is_on_track = current_progress >= (expected_progress - tolerance)
// tolerance typically 5-10%
```

### Files Affected
- `backend/src/types/goalTracking.types.ts` (NEW)
- `backend/src/services/goalTracking.service.ts` (NEW)
- `backend/src/controllers/goal.controller.ts` (NEW)
- `backend/src/routes/goal.routes.ts` (NEW)
- `backend/src/index.ts` (Modified - add route registration)
- `frontend/src/services/goalTracking.service.ts` (NEW)
- `frontend/src/components/goal-tracking/GoalTrackingCard.tsx` (NEW)
- `frontend/src/components/goal-tracking/AssetAllocationView.tsx` (NEW)
- `frontend/src/components/goal-tracking/GoalTrackingTab.tsx` (NEW)
- `frontend/src/pages/customers/CustomerViewPage.tsx` (Modified - add Goal Tracking tab)

### Success Criteria
- [ ] All customer goals displayed with accurate progress
- [ ] Watchlist add/remove functionality works
- [ ] Asset allocation variance calculated correctly
- [ ] Progress bars color-coded appropriately
- [ ] Required SIP calculations accurate
- [ ] Empty states handled gracefully
- [ ] Multi-tenant data isolation maintained

---

## Phase 3: Customer Meetings Management

### Objective
Implement comprehensive meeting management system for tracking customer interactions, meeting notes, action items, and follow-ups.

### Business Requirements
- Schedule and track customer meetings
- Record meeting notes and outcomes
- Track action items with due dates
- View meeting history timeline
- Support different meeting types (Review, Planning, On-boarding, etc.)
- Associate meetings with specific goals or portfolio reviews

### Technical Strategy

#### Backend Components:

**1. meeting.types.ts** (NEW - 280 lines)
- **Purpose**: Define TypeScript interfaces for meeting management
- **Key Types**:
  ```typescript
  export interface CustomerMeeting {
    meeting_id: number;
    customer_id: number;
    meeting_date: string;
    meeting_type: 'review' | 'planning' | 'onboarding' | 'follow-up' | 'ad-hoc';
    status: 'scheduled' | 'completed' | 'cancelled' | 'rescheduled';
    duration_minutes: number;
    attendees: string[];
    notes: string;
    action_items: ActionItem[];
    next_meeting_date?: string;
    related_goals?: number[];
  }

  export interface ActionItem {
    action_id: number;
    description: string;
    assigned_to: 'advisor' | 'customer';
    due_date: string;
    status: 'pending' | 'in-progress' | 'completed' | 'cancelled';
    completed_date?: string;
  }

  export interface MeetingTemplate {
    template_id: number;
    template_name: string;
    meeting_type: string;
    default_duration: number;
    agenda_items: string[];
    standard_action_items: string[];
  }
  ```

**2. meeting.service.ts** (NEW - 580 lines)
- **Purpose**: Business logic for meeting management
- **Key Methods**:
  - `getCustomerMeetings(customerId, filters)`: Get meeting history
  - `scheduleMeeting(customerId, meetingData)`: Create new meeting
  - `updateMeetingNotes(meetingId, notes)`: Add/update notes
  - `addActionItem(meetingId, actionItem)`: Add action item
  - `updateActionItemStatus(actionId, status)`: Mark action complete
  - `getMeetingTemplates(meetingType)`: Get pre-defined templates
  - `getUpcomingMeetings(advisorId)`: Get advisor's schedule
  - `getOverdueActionItems(customerId)`: Get pending actions

**3. meeting.controller.ts** (NEW/Modified - 420 lines)
- **Purpose**: HTTP request handlers for meeting endpoints
- **Endpoints**:
  - `GET /api/meetings/:customerId` - Get customer meeting history
  - `POST /api/meetings/:customerId` - Schedule new meeting
  - `PUT /api/meetings/:meetingId` - Update meeting details
  - `POST /api/meetings/:meetingId/notes` - Add meeting notes
  - `POST /api/meetings/:meetingId/actions` - Add action item
  - `PUT /api/meetings/actions/:actionId` - Update action item status
  - `GET /api/meetings/upcoming` - Get advisor's upcoming meetings
  - `GET /api/meetings/templates/:type` - Get meeting templates
- **Authentication**: All use `AuthenticatedRequest` with proper user context
- **Validation**: Meeting date validation, action item due date validation

#### Frontend Components:

**1. meeting.service.ts** (NEW - 240 lines)
- **Purpose**: API wrapper for meeting management
- **Methods**:
  ```typescript
  export class MeetingService {
    static async getCustomerMeetings(customerId: string, filters?: MeetingFilters)
    static async scheduleMeeting(customerId: string, meetingData: MeetingFormData)
    static async updateMeetingNotes(meetingId: number, notes: string)
    static async addActionItem(meetingId: number, actionItem: ActionItemFormData)
    static async updateActionItemStatus(actionId: number, status: string)
    static async getMeetingTemplates(meetingType: string)
  }
  ```

**2. MeetingTimeline.tsx** (NEW - 380 lines)
- **Purpose**: Display chronological meeting history with expandable details
- **Features**:
  - Timeline visualization with date markers
  - Meeting cards with type indicators
  - Expandable notes section
  - Action items list with status
  - Filter by meeting type and status
  - Sort by date (ascending/descending)
- **Layout**:
  ```
  ┌─ Timeline ───────────────────────────────────┐
  │ Oct 15, 2025 ─── [Review Meeting]            │
  │                  Duration: 45 min             │
  │                  Notes: Discussed retirement  │
  │                  Actions: [2 pending, 1 done] │
  ├─────────────────────────────────────────────┤
  │ Sep 10, 2025 ─── [Planning Meeting]          │
  │                  Duration: 60 min             │
  │                  Notes: New goal planning     │
  │                  Actions: [All completed]     │
  └─────────────────────────────────────────────┘
  ```

**3. MeetingScheduler.tsx** (NEW - 320 lines)
- **Purpose**: Form for scheduling new meetings
- **Features**:
  - Date/time picker
  - Meeting type selector
  - Duration input
  - Attendees multi-select
  - Agenda builder
  - Template selection (auto-populate fields)
  - Goal association (link to specific goals)
- **Validation**:
  - Meeting date cannot be in the past
  - Duration must be positive
  - At least one attendee required

**4. ActionItemTracker.tsx** (NEW - 260 lines)
- **Purpose**: Display and manage action items across all meetings
- **Features**:
  - List all action items with status
  - Filter by status (pending, completed, overdue)
  - Sort by due date
  - Quick status update (checkbox toggle)
  - Overdue highlighting
  - Assignment indicator (advisor/customer)
- **Display**:
  ```
  Action Items
  ├── [OVERDUE] Follow up on pension transfer (Due: Oct 10)
  ├── [PENDING] Send tax planning document (Due: Oct 30)
  └── [✓ DONE] Review risk profile (Completed: Oct 12)
  ```

**5. MeetingNotesEditor.tsx** (NEW - 220 lines)
- **Purpose**: Rich text editor for meeting notes
- **Features**:
  - Markdown support
  - Auto-save draft
  - Formatting toolbar
  - Mention goals/schemes (@mention)
  - Timestamp insertion
  - Export to PDF

**6. MeetingsTab.tsx** (NEW - 280 lines)
- **Purpose**: Container component for meetings section in customer view
- **Features**:
  - Toggle between timeline view and action items view
  - Schedule meeting button (opens modal)
  - Summary stats (total meetings, pending actions, next meeting)
  - Empty state (no meetings yet)
- **Integration**: Embedded in CustomerViewPage as dedicated tab

### Database Requirements

**Tables**:
```sql
-- Main meetings table
CREATE TABLE t_customer_meetings (
  meeting_id SERIAL PRIMARY KEY,
  customer_id INTEGER NOT NULL,
  tenant_id INTEGER NOT NULL,
  is_live BOOLEAN NOT NULL,
  meeting_date TIMESTAMP NOT NULL,
  meeting_type VARCHAR(50) NOT NULL,
  status VARCHAR(50) NOT NULL,
  duration_minutes INTEGER,
  attendees JSONB,
  notes TEXT,
  next_meeting_date TIMESTAMP,
  related_goals JSONB,
  created_by INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Action items table
CREATE TABLE t_meeting_action_items (
  action_id SERIAL PRIMARY KEY,
  meeting_id INTEGER REFERENCES t_customer_meetings(meeting_id),
  description TEXT NOT NULL,
  assigned_to VARCHAR(50) NOT NULL,
  due_date DATE NOT NULL,
  status VARCHAR(50) NOT NULL,
  completed_date DATE,
  completed_by INTEGER,
  tenant_id INTEGER NOT NULL,
  is_live BOOLEAN NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Meeting templates table
CREATE TABLE t_meeting_templates (
  template_id SERIAL PRIMARY KEY,
  template_name VARCHAR(200) NOT NULL,
  meeting_type VARCHAR(50) NOT NULL,
  default_duration INTEGER,
  agenda_items JSONB,
  standard_action_items JSONB,
  tenant_id INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Indexes**:
```sql
CREATE INDEX idx_meetings_customer ON t_customer_meetings(customer_id, tenant_id, is_live);
CREATE INDEX idx_meetings_date ON t_customer_meetings(meeting_date);
CREATE INDEX idx_action_items_meeting ON t_meeting_action_items(meeting_id);
CREATE INDEX idx_action_items_status ON t_meeting_action_items(status, due_date);
```

### Files Affected
- `backend/src/types/meeting.types.ts` (NEW)
- `backend/src/services/meeting.service.ts` (NEW)
- `backend/src/controllers/meeting.controller.ts` (NEW/Modified)
- `backend/src/routes/meeting.routes.ts` (NEW)
- `backend/db/migrations/add_meeting_tables.sql` (NEW)
- `frontend/src/services/meeting.service.ts` (NEW)
- `frontend/src/components/meetings/MeetingTimeline.tsx` (NEW)
- `frontend/src/components/meetings/MeetingScheduler.tsx` (NEW)
- `frontend/src/components/meetings/ActionItemTracker.tsx` (NEW)
- `frontend/src/components/meetings/MeetingNotesEditor.tsx` (NEW)
- `frontend/src/components/meetings/MeetingsTab.tsx` (NEW)
- `frontend/src/pages/customers/CustomerViewPage.tsx` (Modified - add Meetings tab)

### Success Criteria
- [ ] Meetings can be scheduled with all required fields
- [ ] Meeting history displays chronologically
- [ ] Notes can be added and edited
- [ ] Action items can be created and tracked
- [ ] Overdue actions are highlighted
- [ ] Templates auto-populate meeting forms
- [ ] Meeting data isolated per tenant
- [ ] Export functionality works

---

## Phase 4: Monthly Tracking

### Objective
Implement comprehensive monthly tracking for Units, NAV, and Market Value with visual charts and tabular views, defaulting to 12 months of historical data.

### Business Requirements
- Track Units Per Month: Show monthly closing units for selected scheme
- Track NAV Performance: Show monthly NAV values with best/worst indicators
- Track Market Value: Calculate and display monthly market value (Previous Month NAV × Current Month Units)
- Provide chart and table toggle views for all three tracking types
- Default to 12 months of data, with option to customize
- Integrate into Portfolio tab with scheme selector dropdown
- Show summary statistics (average, min, max, current)

### Technical Strategy

#### Backend Components:

**1. monthlyTracking.types.ts** (NEW - 180 lines)
- **Purpose**: Define TypeScript interfaces for monthly tracking data
- **Key Types**:
  ```typescript
  export interface MonthlyUnitsData {
    month: string;              // YYYY-MM format
    month_display: string;      // "Jan 2025" format
    scheme_code: string;
    scheme_name: string;
    opening_units: number;
    units_purchased: number;
    units_redeemed: number;
    closing_units: number;
  }

  export interface MonthlyNAVData {
    month: string;
    month_display: string;
    scheme_code: string;
    scheme_name: string;
    opening_nav: number;
    closing_nav: number;
    nav_change: number;
    nav_change_percentage: number;
    is_best_month: boolean;
    is_worst_month: boolean;
  }

  export interface MonthlyMarketValueData {
    month: string;
    month_display: string;
    scheme_code: string;
    scheme_name: string;
    current_month_units: number;
    previous_month_nav: number;
    market_value: number;        // Formula: previous_month_nav × current_month_units
    invested_value: number;
    profit_loss: number;
    profit_loss_percentage: number;
  }

  export interface MonthlyUnitsResponse {
    months: MonthlyUnitsData[];
    summary: {
      current_units: number;
      average_monthly_units: number;
      max_units: number;
      min_units: number;
      total_purchased: number;
      total_redeemed: number;
    };
  }

  export interface MonthlyNAVResponse {
    months: MonthlyNAVData[];
    summary: {
      current_nav: number;
      average_nav: number;
      max_nav: number;
      min_nav: number;
      overall_nav_change_percentage: number;
      best_month: { month: string; nav: number; };
      worst_month: { month: string; nav: number; };
    };
  }

  export interface MonthlyMarketValueResponse {
    months: MonthlyMarketValueData[];
    summary: {
      current_market_value: number;
      total_invested: number;
      total_profit_loss: number;
      overall_return_percentage: number;
      average_monthly_value: number;
      max_monthly_value: number;
    };
  }
  ```

**2. monthlyTracking.service.ts** (NEW - 440 lines)
- **Purpose**: Implement data aggregation logic for monthly tracking
- **Key Methods**:

  **getMonthlyUnits(tenantId, isLive, filters)**:
  - Query: Aggregate transactions from `t_transaction_table` by month
  - Filter: `portfolio_flag = true` (exclude goal-based transactions)
  - Logic:
    ```sql
    SELECT
      DATE_TRUNC('month', transaction_date) as month,
      SUM(CASE WHEN transaction_type = 'purchase' THEN units ELSE 0 END) as units_purchased,
      SUM(CASE WHEN transaction_type = 'redemption' THEN units ELSE 0 END) as units_redeemed
    FROM t_transaction_table
    WHERE customer_id = ? AND scheme_code = ? AND portfolio_flag = true
    GROUP BY month
    ORDER BY month DESC
    LIMIT 12
    ```
  - Calculate closing units: Opening + Purchased - Redeemed
  - Return with summary statistics

  **getMonthlyNAVPerformance(tenantId, isLive, filters)**:
  - Query: Get NAV values from `t_nav_history` table
  - Logic:
    ```sql
    SELECT
      DATE_TRUNC('month', nav_date) as month,
      FIRST_VALUE(nav) OVER (PARTITION BY month ORDER BY nav_date ASC) as opening_nav,
      FIRST_VALUE(nav) OVER (PARTITION BY month ORDER BY nav_date DESC) as closing_nav
    FROM t_nav_history
    WHERE scheme_code = ?
    GROUP BY month
    ORDER BY month DESC
    LIMIT 12
    ```
  - Calculate NAV change: (Closing - Opening) / Opening × 100
  - Identify best and worst performing months
  - Return with summary including average, min, max

  **getMonthlyMarketValue(tenantId, isLive, filters)**:
  - Combines data from Units and NAV queries
  - Formula: Market Value = Previous Month NAV × Current Month Units
  - Logic:
    ```typescript
    const unitsData = await this.getMonthlyUnits(tenantId, isLive, filters);
    const navData = await this.getMonthlyNAVPerformance(tenantId, isLive, filters);

    const marketValueData = unitsData.months.map((monthUnits, index) => {
      // Get previous month NAV (use current month NAV for first month)
      const navToUse = index < navData.months.length - 1
        ? navData.months[index + 1].closing_nav
        : navData.months[index].closing_nav;

      const marketValue = navToUse * monthUnits.closing_units;
      const investedValue = calculateInvestedValue(monthUnits);
      const profitLoss = marketValue - investedValue;

      return {
        month: monthUnits.month,
        month_display: monthUnits.month_display,
        current_month_units: monthUnits.closing_units,
        previous_month_nav: navToUse,
        market_value: marketValue,
        invested_value: investedValue,
        profit_loss: profitLoss,
        profit_loss_percentage: (profitLoss / investedValue) * 100
      };
    });
    ```
  - Calculate summary with total invested, profit/loss, overall return %

  **Helper Methods**:
  - `formatMonthDisplay(month: string)`: Convert "2025-01" to "Jan 2025"
  - `calculateInvestedValue(transactions)`: Sum of purchase amounts
  - `findBestWorstMonths(navData)`: Identify extreme performing months

**3. portfolio.controller.ts** (MODIFIED - Added 3 endpoints)
- **Purpose**: Add monthly tracking endpoints to existing portfolio controller
- **New Endpoints**:

  **GET /api/portfolio/:customerId/monthly-units**:
  ```typescript
  getMonthlyUnits = async (req: AuthenticatedRequest, res: Response) => {
    const { customerId } = req.params;
    const { schemeCode, months = 12 } = req.query;
    const { tenant_id, is_live } = req.environment;

    const result = await this.monthlyTrackingService.getMonthlyUnits(
      tenant_id,
      is_live,
      { customerId, schemeCode, months }
    );

    return res.json(result);
  }
  ```

  **GET /api/portfolio/:customerId/monthly-nav**:
  ```typescript
  getMonthlyNAV = async (req: AuthenticatedRequest, res: Response) => {
    const { customerId } = req.params;
    const { schemeCode, months = 12 } = req.query;
    const { tenant_id, is_live } = req.environment;

    const result = await this.monthlyTrackingService.getMonthlyNAVPerformance(
      tenant_id,
      is_live,
      { customerId, schemeCode, months }
    );

    return res.json(result);
  }
  ```

  **GET /api/portfolio/:customerId/monthly-market-value**:
  ```typescript
  getMonthlyMarketValue = async (req: AuthenticatedRequest, res: Response) => {
    const { customerId } = req.params;
    const { schemeCode, months = 12 } = req.query;
    const { tenant_id, is_live } = req.environment;

    const result = await this.monthlyTrackingService.getMonthlyMarketValue(
      tenant_id,
      is_live,
      { customerId, schemeCode, months }
    );

    return res.json(result);
  }
  ```

**4. portfolio.routes.ts** (MODIFIED)
- **Purpose**: Register new monthly tracking routes
- **Routes Added**:
  ```typescript
  router.get('/:customerId/monthly-units', portfolioController.getMonthlyUnits);
  router.get('/:customerId/monthly-nav', portfolioController.getMonthlyNAV);
  router.get('/:customerId/monthly-market-value', portfolioController.getMonthlyMarketValue);
  ```

#### Frontend Components:

**1. monthlyTracking.service.ts** (NEW - 220 lines)
- **Purpose**: API wrapper for monthly tracking endpoints
- **Methods**:
  ```typescript
  export class MonthlyTrackingService {
    static async getMonthlyUnits(
      customerId: string,
      schemeCode: string,
      months: number = 12
    ): Promise<MonthlyUnitsResponse> {
      const response = await apiClient.get(
        `/api/portfolio/${customerId}/monthly-units`,
        { params: { schemeCode, months } }
      );
      return response.data;
    }

    static async getMonthlyNAV(
      customerId: string,
      schemeCode: string,
      months: number = 12
    ): Promise<MonthlyNAVResponse> {
      const response = await apiClient.get(
        `/api/portfolio/${customerId}/monthly-nav`,
        { params: { schemeCode, months } }
      );
      return response.data;
    }

    static async getMonthlyMarketValue(
      customerId: string,
      schemeCode: string,
      months: number = 12
    ): Promise<MonthlyMarketValueResponse> {
      const response = await apiClient.get(
        `/api/portfolio/${customerId}/monthly-market-value`,
        { params: { schemeCode, months } }
      );
      return response.data;
    }
  }
  ```

**2. MonthlyDataChart.tsx** (NEW - 280 lines)
- **Purpose**: Reusable SVG line chart component for all monthly tracking visualizations
- **Features**:
  - SVG-based line chart with data points
  - Hover tooltips showing exact values
  - X-axis: Month labels
  - Y-axis: Auto-scaled based on data range
  - Grid lines for readability
  - Color coding (green for positive, red for negative)
  - Responsive width (100% of container)
  - Height: 300px
- **Props**:
  ```typescript
  interface MonthlyDataChartProps {
    data: Array<{ month_display: string; value: number; }>;
    label: string;
    color: string;
    formatValue?: (value: number) => string;
    height?: number;
  }
  ```
- **Implementation**:
  ```typescript
  const MonthlyDataChart: React.FC<MonthlyDataChartProps> = ({
    data, label, color, formatValue, height = 300
  }) => {
    const { theme, isDarkMode } = useTheme();
    const colors = isDarkMode && theme.darkMode
      ? theme.darkMode.colors
      : theme.colors;

    const maxValue = Math.max(...data.map(d => d.value));
    const minValue = Math.min(...data.map(d => d.value));

    // SVG path calculation
    const points = data.map((d, i) => ({
      x: (i / (data.length - 1)) * chartWidth,
      y: ((maxValue - d.value) / (maxValue - minValue)) * chartHeight
    }));

    const pathData = points.map((p, i) =>
      `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`
    ).join(' ');

    return (
      <svg width="100%" height={height}>
        <path d={pathData} stroke={color} fill="none" strokeWidth="2" />
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="4" fill={color} />
        ))}
      </svg>
    );
  };
  ```

**3. MonthlyDataTable.tsx** (NEW - 200 lines)
- **Purpose**: Reusable table component for monthly tracking data
- **Features**:
  - Sortable columns (click header to sort)
  - Formatted number display (currency, percentages)
  - Color-coded values (positive/negative)
  - Summary row at bottom
  - Responsive layout
  - Alternating row colors
- **Props**:
  ```typescript
  interface MonthlyDataTableProps {
    data: any[];
    columns: ColumnDefinition[];
    summary?: Array<{
      label: string;
      value: string | number;
      formatter?: (value: any) => string | React.ReactNode;
    }>;
  }

  interface ColumnDefinition {
    key: string;
    label: string;
    width?: string;
    align?: 'left' | 'center' | 'right';
    formatter?: (value: any, row: any) => string | React.ReactNode;
    sortable?: boolean;
  }
  ```
- **Example Usage**:
  ```typescript
  const columns = [
    { key: 'month_display', label: 'Month', sortable: true },
    {
      key: 'closing_units',
      label: 'Units',
      align: 'right',
      formatter: (val) => val.toFixed(3)
    },
    {
      key: 'market_value',
      label: 'Market Value',
      align: 'right',
      formatter: (val) => `₹${val.toLocaleString()}`
    }
  ];
  ```

**4. UnitsPerMonthView.tsx** (NEW - 280 lines)
- **Purpose**: Component for Units Per Month tracking view
- **Features**:
  - Toggle between Chart and Table view
  - Display opening, purchased, redeemed, closing units
  - Summary card showing:
    - Current units
    - Average monthly units
    - Total purchased
    - Total redeemed
    - Max units month
    - Min units month
  - Loading and error states
- **Data Flow**:
  ```typescript
  const UnitsPerMonthView: React.FC<{ customerId: string; schemeCode: string; }> = ({
    customerId, schemeCode
  }) => {
    const [data, setData] = useState<MonthlyUnitsResponse | null>(null);
    const [viewMode, setViewMode] = useState<'chart' | 'table'>('chart');

    useEffect(() => {
      MonthlyTrackingService.getMonthlyUnits(customerId, schemeCode, 12)
        .then(setData);
    }, [customerId, schemeCode]);

    const chartData = data.months.map(m => ({
      month_display: m.month_display,
      value: m.closing_units
    }));

    return (
      <div>
        <div>
          <button onClick={() => setViewMode('chart')}>Chart</button>
          <button onClick={() => setViewMode('table')}>Table</button>
        </div>

        {viewMode === 'chart' ? (
          <MonthlyDataChart data={chartData} label="Units" color="#4CAF50" />
        ) : (
          <MonthlyDataTable data={data.months} columns={unitsColumns} />
        )}

        <SummaryCard summary={data.summary} />
      </div>
    );
  };
  ```

**5. NAVPerformanceView.tsx** (NEW - 280 lines)
- **Purpose**: Component for NAV Performance tracking view
- **Features**:
  - Chart showing monthly NAV trend
  - Table with opening NAV, closing NAV, change %
  - Highlight best and worst performing months
  - Summary card:
    - Current NAV
    - Average NAV
    - Max NAV (with month)
    - Min NAV (with month)
    - Overall NAV change %
  - Color coding (green for gains, red for losses)
- **Implementation**:
  ```typescript
  const NAVPerformanceView: React.FC<Props> = ({ customerId, schemeCode }) => {
    const columns = [
      { key: 'month_display', label: 'Month' },
      {
        key: 'closing_nav',
        label: 'NAV',
        formatter: (val) => `₹${val.toFixed(2)}`
      },
      {
        key: 'nav_change_percentage',
        label: 'Change %',
        formatter: (val, row) => (
          <span style={{ color: val >= 0 ? 'green' : 'red' }}>
            {val >= 0 ? '↑' : '↓'} {Math.abs(val).toFixed(2)}%
            {row.is_best_month && ' 🏆'}
            {row.is_worst_month && ' ⚠️'}
          </span>
        )
      }
    ];

    // ... rest of implementation
  };
  ```

**6. MarketValueView.tsx** (NEW - 280 lines)
- **Purpose**: Component for Market Value tracking view
- **Features**:
  - Chart showing monthly market value trend
  - Table with units, NAV used, market value, profit/loss
  - Summary card:
    - Current market value
    - Total invested
    - Total profit/loss
    - Overall return %
    - Average monthly value
  - Profit/loss color coding
- **Market Value Calculation Display**:
  ```typescript
  const columns = [
    { key: 'month_display', label: 'Month' },
    {
      key: 'current_month_units',
      label: 'Units',
      formatter: (val) => val.toFixed(3)
    },
    {
      key: 'previous_month_nav',
      label: 'NAV Used',
      formatter: (val) => `₹${val.toFixed(2)}`
    },
    {
      key: 'market_value',
      label: 'Market Value',
      formatter: (val) => `₹${val.toLocaleString()}`
    },
    {
      key: 'profit_loss',
      label: 'P&L',
      formatter: (val) => (
        <span style={{ color: val >= 0 ? 'green' : 'red' }}>
          {val >= 0 ? '+' : ''}₹{val.toLocaleString()}
        </span>
      )
    },
    {
      key: 'profit_loss_percentage',
      label: 'Return %',
      formatter: (val) => (
        <span style={{ color: val >= 0 ? 'green' : 'red' }}>
          {val.toFixed(2)}%
        </span>
      )
    }
  ];
  ```

**7. MonthlyTrackingTabs.tsx** (NEW - 120 lines)
- **Purpose**: Container component with tabs for all three tracking views
- **Features**:
  - Three tabs: Units Per Month, NAV Performance, Market Value
  - Tab icons for visual identification
  - Active tab highlighting
  - Lazy loading of tab content
- **Structure**:
  ```typescript
  const MonthlyTrackingTabs: React.FC<{
    customerId: string;
    schemeCode: string;
    months?: number;
  }> = ({ customerId, schemeCode, months = 12 }) => {
    const [activeTab, setActiveTab] = useState<'units' | 'nav' | 'value'>('units');

    const tabs = [
      { id: 'units', label: 'Units Per Month', icon: <Package /> },
      { id: 'nav', label: 'NAV Performance', icon: <TrendingUp /> },
      { id: 'value', label: 'Market Value', icon: <DollarSign /> }
    ];

    return (
      <div>
        <div className="tabs">
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={activeTab === tab.id ? 'active' : ''}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        <div className="tab-content">
          {activeTab === 'units' && (
            <UnitsPerMonthView customerId={customerId} schemeCode={schemeCode} months={months} />
          )}
          {activeTab === 'nav' && (
            <NAVPerformanceView customerId={customerId} schemeCode={schemeCode} months={months} />
          )}
          {activeTab === 'value' && (
            <MarketValueView customerId={customerId} schemeCode={schemeCode} months={months} />
          )}
        </div>
      </div>
    );
  };
  ```

**8. CustomerViewPage.tsx** (MODIFIED - Integration)
- **Purpose**: Integrate monthly tracking into Portfolio tab
- **Changes**:
  - Add scheme selector dropdown at top of Portfolio tab
  - Display MonthlyTrackingTabs component below portfolio holdings
  - Auto-select first scheme from holdings
  - Pass selected scheme to monthly tracking components
- **Implementation**:
  ```typescript
  const CustomerViewPage: React.FC = () => {
    const [selectedSchemeForTracking, setSelectedSchemeForTracking] = useState<string | null>(null);

    // Auto-select first scheme when portfolio loads
    useEffect(() => {
      if (portfolio?.holdings && portfolio.holdings.length > 0 && !selectedSchemeForTracking) {
        setSelectedSchemeForTracking(portfolio.holdings[0].scheme_code);
      }
    }, [portfolio]);

    return (
      <div>
        {/* ... existing portfolio components ... */}

        {activeTab === 'portfolio' && (
          <>
            <CustomerPortfolioSummary data={portfolio.summary} />
            <CustomerPortfolioHoldings holdings={portfolio.holdings} />

            {/* Monthly Tracking Section */}
            <div className="monthly-tracking-section">
              <h3>Monthly Tracking</h3>

              {/* Scheme Selector */}
              <div className="scheme-selector">
                <label>Select Scheme:</label>
                <select
                  value={selectedSchemeForTracking || ''}
                  onChange={(e) => setSelectedSchemeForTracking(e.target.value)}
                >
                  {portfolio.holdings.map(holding => (
                    <option key={holding.scheme_code} value={holding.scheme_code}>
                      {holding.scheme_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Monthly Tracking Tabs */}
              {selectedSchemeForTracking && (
                <MonthlyTrackingTabs
                  customerId={customerId}
                  schemeCode={selectedSchemeForTracking}
                  months={12}
                />
              )}
            </div>
          </>
        )}
      </div>
    );
  };
  ```

### Database Requirements

**Tables Used**:
- `t_transaction_table`: Source for units purchased/redeemed
- `t_nav_history`: Source for NAV values
- `t_portfolio_holdings`: Current holdings and invested amounts

**Required Indexes**:
```sql
-- Optimize monthly aggregation queries
CREATE INDEX idx_transactions_monthly ON t_transaction_table(
  customer_id,
  scheme_code,
  DATE_TRUNC('month', transaction_date)
) WHERE portfolio_flag = true;

CREATE INDEX idx_nav_history_monthly ON t_nav_history(
  scheme_code,
  DATE_TRUNC('month', nav_date)
);
```

**Sample Query for Units**:
```sql
WITH monthly_transactions AS (
  SELECT
    DATE_TRUNC('month', transaction_date) as month,
    SUM(CASE WHEN transaction_type = 'purchase' THEN units ELSE 0 END) as purchased,
    SUM(CASE WHEN transaction_type = 'redemption' THEN units ELSE 0 END) as redeemed
  FROM t_transaction_table
  WHERE
    customer_id = $1
    AND scheme_code = $2
    AND tenant_id = $3
    AND is_live = $4
    AND portfolio_flag = true
  GROUP BY month
  ORDER BY month DESC
  LIMIT 12
),
cumulative_units AS (
  SELECT
    month,
    purchased,
    redeemed,
    SUM(purchased - redeemed) OVER (ORDER BY month) as closing_units
  FROM monthly_transactions
)
SELECT * FROM cumulative_units ORDER BY month DESC;
```

### Theme Integration

All components use the existing theme system:
```typescript
const { theme, isDarkMode } = useTheme();
const colors = isDarkMode && theme.darkMode
  ? theme.darkMode.colors
  : theme.colors;

// Color usage
const textColor = colors.utility.primaryText;
const backgroundColor = colors.utility.primaryBackground;
const accentColor = colors.brand.primary;
```

### Files Affected
- `backend/src/types/monthlyTracking.types.ts` (NEW)
- `backend/src/services/monthlyTracking.service.ts` (NEW)
- `backend/src/controllers/portfolio.controller.ts` (MODIFIED - added 3 endpoints)
- `backend/src/routes/portfolio.routes.ts` (MODIFIED - added 3 routes)
- `frontend/src/services/monthlyTracking.service.ts` (NEW)
- `frontend/src/components/monthly-tracking/MonthlyDataChart.tsx` (NEW)
- `frontend/src/components/monthly-tracking/MonthlyDataTable.tsx` (NEW)
- `frontend/src/components/monthly-tracking/UnitsPerMonthView.tsx` (NEW)
- `frontend/src/components/monthly-tracking/NAVPerformanceView.tsx` (NEW)
- `frontend/src/components/monthly-tracking/MarketValueView.tsx` (NEW)
- `frontend/src/components/monthly-tracking/MonthlyTrackingTabs.tsx` (NEW)
- `frontend/src/pages/customers/CustomerViewPage.tsx` (MODIFIED - integration)

### Success Criteria
- [ ] Units tracking displays correct monthly data
- [ ] NAV performance shows accurate changes and highlights best/worst months
- [ ] Market Value calculation is correct (Previous NAV × Current Units)
- [ ] Chart and table toggle works for all three views
- [ ] Summary statistics calculated correctly
- [ ] Scheme selector auto-selects first scheme
- [ ] 12 months default data displayed
- [ ] Charts are responsive and visually clear
- [ ] Color coding works (positive/negative values)
- [ ] Loading and error states handled
- [ ] Multi-tenant data isolation maintained

---

## Phase 5: Family View (Pending)

### Objective
Implement family-level portfolio aggregation and tracking, allowing advisors to view combined performance across family members.

### Business Requirements (Planned)
- Display all family members linked to a family head
- Aggregate portfolio value across family
- Combined asset allocation view
- Family-wide goal tracking
- Total family AUM display
- Individual vs family performance comparison

### Technical Strategy (To Be Implemented)

#### Backend Components (Planned):

**1. familyView.types.ts** (PLANNED)
- Define family aggregation interfaces
- Family member relationship types
- Combined portfolio structures

**2. familyView.service.ts** (PLANNED)
- Aggregate portfolios across family members
- Calculate combined asset allocation
- Merge goal tracking data
- Family-wide performance metrics

**3. family.controller.ts** (PLANNED)
- Endpoints for family data retrieval
- Family member management
- Relationship linking

#### Frontend Components (Planned):

**1. FamilyPortfolioView.tsx** (PLANNED)
- Family member list
- Combined portfolio summary
- Individual vs family toggles

**2. FamilyAssetAllocation.tsx** (PLANNED)
- Aggregated asset allocation chart
- Breakdown by family member
- Rebalancing recommendations

**3. FamilyGoalTracking.tsx** (PLANNED)
- Family-wide goals
- Individual contributions to family goals
- Combined progress tracking

### Database Requirements (Planned)

**Family Relationships**:
- Use existing `family_head_name` and `family_head_iwell_code` fields in `t_customers`
- Query to find family members:
  ```sql
  SELECT * FROM t_customers
  WHERE
    (family_head_iwell_code = $1 OR iwell_code = $1)
    AND tenant_id = $2
    AND is_live = $3;
  ```

### Status
**Phase 5 is explicitly pending** and was not implemented in the current session. It is planned for future development after Phases 1-4 are fully tested and deployed.

---

## Technical Architecture

### Multi-Tenant Design

All backend services follow strict multi-tenant isolation:

```typescript
// All queries include tenant_id and is_live filters
const data = await db.query(`
  SELECT * FROM t_customers
  WHERE customer_id = $1
    AND tenant_id = $2
    AND is_live = $3
`, [customerId, tenantId, isLive]);
```

### Authentication Pattern

All authenticated endpoints use `AuthenticatedRequest`:

```typescript
interface AuthenticatedRequest extends Request {
  user?: {
    user_id: number;
    tenant_id: number;
  };
  environment?: {
    tenant_id: number;
    is_live: boolean;
  };
}

// Usage in controllers
const userId = req.user!.user_id;  // NOT req.user!.id
const tenantId = req.environment!.tenant_id;
const isLive = req.environment!.is_live;
```

### Theme System

All frontend components use centralized theme:

```typescript
import { useTheme } from '../../contexts/ThemeContext';

const MyComponent = () => {
  const { theme, isDarkMode } = useTheme();
  const colors = isDarkMode && theme.darkMode
    ? theme.darkMode.colors
    : theme.colors;

  // Color paths:
  // - colors.utility.primaryText
  // - colors.utility.secondaryText
  // - colors.utility.primaryBackground
  // - colors.utility.secondaryBackground
  // - colors.brand.primary
  // - colors.brand.secondary

  return <div style={{ color: colors.utility.primaryText }}>...</div>;
};
```

### Service Layer Pattern

```typescript
// Backend Service
export class MonthlyTrackingService {
  async getMonthlyUnits(tenantId: number, isLive: boolean, filters: any) {
    // 1. Validate inputs
    // 2. Query database with tenant isolation
    // 3. Transform data
    // 4. Calculate aggregations
    // 5. Return typed response
  }
}

// Frontend Service
export class MonthlyTrackingService {
  static async getMonthlyUnits(customerId: string, schemeCode: string, months: number) {
    // 1. Make API call
    // 2. Handle errors
    // 3. Return typed data
  }
}
```

### Error Handling

```typescript
// Backend
try {
  const data = await service.getData();
  return res.json(data);
} catch (error) {
  console.error('Error:', error);
  return res.status(500).json({ error: 'Internal server error' });
}

// Frontend
try {
  const data = await Service.getData();
  setData(data);
} catch (error) {
  console.error('Error:', error);
  setError('Failed to load data');
}
```

### Component Reusability

Shared components for common patterns:
- `MonthlyDataChart.tsx`: Reusable for all chart views
- `MonthlyDataTable.tsx`: Reusable for all table views
- Tab containers: Consistent UI across features

---

## File Manifest

### Backend Files Created (NEW)

1. `backend/src/types/monthlyTracking.types.ts` - 180 lines
2. `backend/src/services/monthlyTracking.service.ts` - 440 lines
3. `backend/src/types/goalTracking.types.ts` - 240 lines
4. `backend/src/services/goalTracking.service.ts` - 520 lines
5. `backend/src/controllers/goal.controller.ts` - 380 lines
6. `backend/src/routes/goal.routes.ts` - 45 lines
7. `backend/src/types/meeting.types.ts` - 280 lines
8. `backend/src/services/meeting.service.ts` - 580 lines

**Total Backend New Code**: ~2,665 lines

### Backend Files Modified

1. `backend/src/controllers/portfolio.controller.ts` - Added 3 endpoints (~50 lines)
2. `backend/src/routes/portfolio.routes.ts` - Added 3 routes (~10 lines)
3. `backend/src/controllers/meeting.controller.ts` - Added AuthenticatedRequest interface (~20 lines)
4. `backend/src/controllers/goal.controller.ts` - Type fixes (~15 lines)
5. `backend/src/index.ts` - Route registration (~5 lines)

### Frontend Files Created (NEW)

1. `frontend/src/services/monthlyTracking.service.ts` - 220 lines
2. `frontend/src/components/monthly-tracking/MonthlyDataChart.tsx` - 280 lines
3. `frontend/src/components/monthly-tracking/MonthlyDataTable.tsx` - 200 lines
4. `frontend/src/components/monthly-tracking/UnitsPerMonthView.tsx` - 280 lines
5. `frontend/src/components/monthly-tracking/NAVPerformanceView.tsx` - 280 lines
6. `frontend/src/components/monthly-tracking/MarketValueView.tsx` - 280 lines
7. `frontend/src/components/monthly-tracking/MonthlyTrackingTabs.tsx` - 120 lines
8. `frontend/src/services/goalTracking.service.ts` - 180 lines
9. `frontend/src/components/goal-tracking/GoalTrackingCard.tsx` - 340 lines
10. `frontend/src/components/goal-tracking/AssetAllocationView.tsx` - 280 lines
11. `frontend/src/components/goal-tracking/GoalTrackingTab.tsx` - 220 lines
12. `frontend/src/services/meeting.service.ts` - 240 lines
13. `frontend/src/components/meetings/MeetingTimeline.tsx` - 380 lines
14. `frontend/src/components/meetings/MeetingScheduler.tsx` - 320 lines
15. `frontend/src/components/meetings/ActionItemTracker.tsx` - 260 lines
16. `frontend/src/components/meetings/MeetingNotesEditor.tsx` - 220 lines
17. `frontend/src/components/meetings/MeetingsTab.tsx` - 280 lines

**Total Frontend New Code**: ~4,360 lines

### Frontend Files Modified

1. `frontend/src/pages/customers/CustomerViewPage.tsx` - Integration (~80 lines added)
2. `frontend/src/components/customers/CustomerViewHeader.tsx` - UX optimization (~30 lines modified)
3. `frontend/src/components/customers/CustomerPortfolioSummary.tsx` - UX optimization (~40 lines modified)
4. `frontend/src/components/customers/CustomerNAVTracking.tsx` - UX optimization (~25 lines modified)

### Documentation Files Created

1. `EXIT_CRITERIA_TESTING_REPORT.md` - Comprehensive testing checklist
2. `FAMILY_FIELD_IMPORT_ISSUE_REPORT.md` - Investigation documentation
3. `CUSTOMER_PORTFOLIO_ENHANCEMENT.md` - This specification document

### Diagnostic Files Created

1. `debug_family_import.sql` - SQL diagnostic queries
2. `test_family_fields.sql` - Field comparison queries
3. `check_mappings.sql` - Mapping comparison
4. `check_table_constraints.sql` - Schema verification

---

## API Specifications

### Monthly Tracking Endpoints

**1. GET /api/portfolio/:customerId/monthly-units**

**Description**: Get monthly units tracking data for a specific scheme

**Parameters**:
- `customerId` (path): Customer ID
- `schemeCode` (query): Scheme code
- `months` (query, optional): Number of months (default: 12)

**Response**:
```json
{
  "months": [
    {
      "month": "2025-10",
      "month_display": "Oct 2025",
      "scheme_code": "INF123456789",
      "scheme_name": "ABC Mutual Fund",
      "opening_units": 1000.000,
      "units_purchased": 50.000,
      "units_redeemed": 0.000,
      "closing_units": 1050.000
    }
  ],
  "summary": {
    "current_units": 1050.000,
    "average_monthly_units": 975.500,
    "max_units": 1050.000,
    "min_units": 800.000,
    "total_purchased": 500.000,
    "total_redeemed": 250.000
  }
}
```

**2. GET /api/portfolio/:customerId/monthly-nav**

**Description**: Get monthly NAV performance data

**Response**:
```json
{
  "months": [
    {
      "month": "2025-10",
      "month_display": "Oct 2025",
      "scheme_code": "INF123456789",
      "scheme_name": "ABC Mutual Fund",
      "opening_nav": 45.50,
      "closing_nav": 47.20,
      "nav_change": 1.70,
      "nav_change_percentage": 3.74,
      "is_best_month": true,
      "is_worst_month": false
    }
  ],
  "summary": {
    "current_nav": 47.20,
    "average_nav": 45.80,
    "max_nav": 47.20,
    "min_nav": 43.50,
    "overall_nav_change_percentage": 8.51,
    "best_month": { "month": "Oct 2025", "nav": 47.20 },
    "worst_month": { "month": "Jun 2025", "nav": 43.50 }
  }
}
```

**3. GET /api/portfolio/:customerId/monthly-market-value**

**Description**: Get monthly market value with profit/loss tracking

**Response**:
```json
{
  "months": [
    {
      "month": "2025-10",
      "month_display": "Oct 2025",
      "scheme_code": "INF123456789",
      "scheme_name": "ABC Mutual Fund",
      "current_month_units": 1050.000,
      "previous_month_nav": 46.80,
      "market_value": 49140.00,
      "invested_value": 45000.00,
      "profit_loss": 4140.00,
      "profit_loss_percentage": 9.20
    }
  ],
  "summary": {
    "current_market_value": 49140.00,
    "total_invested": 45000.00,
    "total_profit_loss": 4140.00,
    "overall_return_percentage": 9.20,
    "average_monthly_value": 47250.00,
    "max_monthly_value": 49140.00
  }
}
```

### Goal Tracking Endpoints

**GET /api/goals/:customerId/tracking**
- Returns all goals with progress, allocations, and on-track status

**GET /api/goals/:customerId/asset-allocation**
- Returns asset allocation utilization per goal

**POST /api/goals/:customerId/watchlist/:goalId**
- Add goal to advisor's watchlist

**DELETE /api/goals/:customerId/watchlist/:goalId**
- Remove goal from watchlist

**GET /api/goals/watchlist**
- Get all watchlist goals for logged-in advisor

### Meeting Endpoints

**GET /api/meetings/:customerId**
- Get customer meeting history with filters

**POST /api/meetings/:customerId**
- Schedule new meeting

**POST /api/meetings/:meetingId/notes**
- Add/update meeting notes

**POST /api/meetings/:meetingId/actions**
- Add action item to meeting

**PUT /api/meetings/actions/:actionId**
- Update action item status

---

## Database Schema Changes

### New Tables (Phase 3 - Meetings)

```sql
CREATE TABLE t_customer_meetings (
  meeting_id SERIAL PRIMARY KEY,
  customer_id INTEGER NOT NULL,
  tenant_id INTEGER NOT NULL,
  is_live BOOLEAN NOT NULL,
  meeting_date TIMESTAMP NOT NULL,
  meeting_type VARCHAR(50) NOT NULL,
  status VARCHAR(50) NOT NULL,
  duration_minutes INTEGER,
  attendees JSONB,
  notes TEXT,
  next_meeting_date TIMESTAMP,
  related_goals JSONB,
  created_by INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_customer FOREIGN KEY (customer_id) REFERENCES t_customers(id)
);

CREATE TABLE t_meeting_action_items (
  action_id SERIAL PRIMARY KEY,
  meeting_id INTEGER REFERENCES t_customer_meetings(meeting_id),
  description TEXT NOT NULL,
  assigned_to VARCHAR(50) NOT NULL,
  due_date DATE NOT NULL,
  status VARCHAR(50) NOT NULL,
  completed_date DATE,
  completed_by INTEGER,
  tenant_id INTEGER NOT NULL,
  is_live BOOLEAN NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_meetings_customer ON t_customer_meetings(customer_id, tenant_id, is_live);
CREATE INDEX idx_meetings_date ON t_customer_meetings(meeting_date);
CREATE INDEX idx_action_items_meeting ON t_meeting_action_items(meeting_id);
CREATE INDEX idx_action_items_status ON t_meeting_action_items(status, due_date);
```

### New Indexes (Phase 4 - Monthly Tracking)

```sql
CREATE INDEX idx_transactions_monthly ON t_transaction_table(
  customer_id,
  scheme_code,
  DATE_TRUNC('month', transaction_date)
) WHERE portfolio_flag = true;

CREATE INDEX idx_nav_history_monthly ON t_nav_history(
  scheme_code,
  DATE_TRUNC('month', nav_date)
);
```

---

## Testing Strategy

### Unit Testing

**Backend Services**:
- Test monthly aggregation calculations
- Test goal progress calculations
- Test multi-tenant isolation
- Test date range filtering

**Frontend Components**:
- Test chart rendering with various data sets
- Test table sorting and formatting
- Test tab switching
- Test error states

### Integration Testing

**API Endpoints**:
- Test all monthly tracking endpoints with real data
- Test authentication and authorization
- Test query parameter validation
- Test response format compliance

**Component Integration**:
- Test CustomerViewPage integration
- Test data flow from service to component
- Test scheme selector interaction
- Test theme switching

### Manual Testing Checklist

See `EXIT_CRITERIA_TESTING_REPORT.md` for comprehensive testing checklist covering:
- Phase 1: UX optimization verification
- Phase 2: Goal tracking and watchlist
- Phase 3: Meeting management
- Phase 4: Monthly tracking (units, NAV, market value)

### Performance Testing

- Test with 12, 24, 36 months of data
- Test with large number of transactions
- Test chart rendering performance
- Test concurrent user access

---

## Common Issues and Solutions

### Issue 1: Theme Context Import Error

**Error**: `Cannot find module '../../context/ThemeContext'`

**Solution**: Use correct path
```typescript
import { useTheme } from '../../contexts/ThemeContext';  // Note: contexts (plural)
```

### Issue 2: Theme Destructuring Pattern

**Error**: `Property 'colors' does not exist on type 'ThemeContextType'`

**Solution**: Use proper destructuring
```typescript
// Correct:
const { theme, isDarkMode } = useTheme();
const colors = isDarkMode && theme.darkMode
  ? theme.darkMode.colors
  : theme.colors;

// Wrong:
const { colors, isDarkMode } = useTheme();
```

### Issue 3: Color Property Names

**Error**: `Property 'text' does not exist on type 'ColorSet'`

**Solution**: Use correct color paths
```typescript
// Correct:
colors.utility.primaryText
colors.utility.secondaryText
colors.utility.primaryBackground
colors.brand.primary

// Wrong:
colors.text.primary
colors.backgrounds.elevated
colors.primary.main
```

### Issue 4: AuthenticatedRequest Type

**Error**: `Property 'user' does not exist on type 'Request'`

**Solution**: Use AuthenticatedRequest type
```typescript
// Correct:
getMonthlyUnits = async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.user_id;  // Note: user_id, not id
  const tenantId = req.environment!.tenant_id;
}

// Wrong:
getMonthlyUnits = async (req: Request, res: Response) => {
  const userId = req.user!.id;  // This will fail
}
```

### Issue 5: Market Value Calculation

**Critical**: Market Value uses **Previous Month NAV**, not current month NAV

```typescript
// Correct:
const marketValue = previousMonthNAV * currentMonthUnits;

// Wrong:
const marketValue = currentMonthNAV * currentMonthUnits;
```

---

## Deployment Checklist

### Pre-Deployment

- [ ] All TypeScript compilation errors resolved
- [ ] All unit tests passing
- [ ] Manual testing completed per EXIT_CRITERIA_TESTING_REPORT.md
- [ ] Database migrations prepared
- [ ] Environment variables configured
- [ ] Theme integration verified
- [ ] Multi-tenant isolation tested

### Database Deployment

- [ ] Run schema migrations for meeting tables (Phase 3)
- [ ] Create indexes for monthly tracking optimization (Phase 4)
- [ ] Verify existing data compatibility
- [ ] Test rollback procedure

### Application Deployment

- [ ] Backend deployed with new endpoints
- [ ] Frontend deployed with new components
- [ ] Route registration verified
- [ ] Authentication middleware active
- [ ] API endpoint accessibility tested

### Post-Deployment

- [ ] Smoke tests on production
- [ ] Performance monitoring enabled
- [ ] Error logging configured
- [ ] User acceptance testing
- [ ] Rollback plan ready

---

## Future Enhancements

### Phase 5: Family View
- Family portfolio aggregation
- Combined asset allocation
- Family-wide goal tracking
- Multi-member performance comparison

### Potential Additional Features
- Export to PDF/Excel for all tracking views
- Email notifications for meetings and action items
- Customizable dashboard widgets
- Advanced filtering and search
- Bulk operations support
- Mobile responsiveness optimization
- Real-time data updates (WebSocket)
- Automated goal recommendations

---

## Appendix

### Glossary

- **NAV**: Net Asset Value - price per unit of a mutual fund scheme
- **Portfolio Flag**: Indicates whether a transaction belongs to direct portfolio vs goal-based investment
- **Market Value**: Current worth of holdings (Units × NAV)
- **Closing Units**: Total units at end of month after purchases and redemptions
- **Asset Allocation**: Distribution of investments across asset classes (Equity, Debt, etc.)
- **On-Track Status**: Whether goal progress is meeting expected trajectory
- **IWELL Code**: Internal unique identifier for customers
- **Multi-Tenant**: Architecture supporting multiple isolated organizations

### References

- Theme System Documentation: `frontend/src/contexts/ThemeContext.tsx`
- Database Schema: `backend/db/04_functions_views_policies.sql`
- API Patterns: Existing portfolio endpoints
- Component Patterns: Existing customer view components

---

## Document Version History

- **v1.0** (Oct 27, 2025): Initial specification document covering Phases 1-4
- Created for branch: `claude/nav-tracking-ux-analysis-011CUUGD4WjHo3M8pnia29mi`
- Status: Phases 1-4 Complete, Phase 5 Pending

---

**End of Specification Document**
