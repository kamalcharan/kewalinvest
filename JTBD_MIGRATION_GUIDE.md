# JTBD Unified System - Migration Guide

## Overview

This guide explains how to complete the migration to the unified JTBD (Jobs To Be Done) system that consolidates goals, alerts, and meetings into a single framework with executions tracking.

## Architecture

### Dual-Table Design

```
┌─────────────────────────────┐       ┌──────────────────────────────┐
│  t_jtbd_configurations      │       │  t_jtbd_executions           │
├─────────────────────────────┤       ├──────────────────────────────┤
│ • Templates/Recurring       │  1:N  │ • Actual Instances           │
│ • Goals                     │  ───> │ • Meetings (scheduled/past)  │
│ • Alert rules               │       │ • SIP plan instances (120)   │
│ • Meeting templates         │       │ • Execution tracking         │
└─────────────────────────────┘       └──────────────────────────────┘
```

### Categories & Types

**JTBD Categories:**
- `transactional` - Goals, portfolio tracking (state-based)
- `alert` - Reminders, SIPs, birthdays (action-based)
- `meeting` - Client meetings, reviews

**Meeting Types (mapped to JTBD_TYPE):**
- Portfolio Review → `portfolio_review`
- Goal Planning → `goal_review`
- Client Onboarding/Grievance/Other → `client_meeting`

### Execution Statuses

```
┌──────────┐
│ planned  │  →  Scheduled for future
└──────────┘
     │
     ├──────→ ┌──────┐
     │        │ due  │  →  Due today
     │        └──────┘
     │
     ├──────→ ┌───────────┐
     │        │ completed │  →  Successfully executed
     │        └───────────┘
     │
     ├──────→ ┌──────────────┐
     │        │ not_executed │  →  Missed/skipped
     │        └──────────────┘
     │
     ├──────→ ┌───────────┐
     │        │ cancelled │  →  User cancelled
     │        └───────────┘
     │
     └──────→ ┌─────────┐
              │ delayed │  →  Completed but late
              └─────────┘
```

---

## Step 1: Database Migration

### Prerequisites
- PostgreSQL database running (Docker or local)
- Backup existing data (optional, if you have valuable test data)

### Run Migration

```bash
# If using Docker Compose
docker compose exec -T postgres psql -U kewal_admin -d kewalinvest < backend/db/migrations/008_jtbd_consolidation.sql

# Or if PostgreSQL is running locally
psql -U kewal_admin -d kewalinvest -f backend/db/migrations/008_jtbd_consolidation.sql
```

### What the Migration Does

1. **Adds `jtbd_category` column** to `t_jtbd_configurations`:
   ```sql
   ALTER TABLE t_jtbd_configurations
   ADD COLUMN jtbd_category VARCHAR(50) NOT NULL DEFAULT 'alert';
   ```

2. **Creates `t_jtbd_executions` table**:
   - Tracks meeting instances, SIP plan executions
   - Links to parent config (optional)
   - Stores execution_data as JSONB
   - Tracks completion with deviation tracking

3. **Adds indexes** for performance:
   - Customer + type filtering
   - Date range queries (scheduled_date)
   - Status filtering (execution_status IN 'planned', 'due')
   - **Note**: Overdue filtering (`scheduled_date < CURRENT_DATE`) is done at query time, not in indexes (volatile expressions not allowed)

### Verify Migration

```bash
# Check tables exist
psql -U kewal_admin -d kewalinvest -c "\dt t_jtbd*"

# Should show:
# t_jtbd_configurations
# t_jtbd_executions

# Check columns
psql -U kewal_admin -d kewalinvest -c "\d t_jtbd_executions"
```

---

## Step 2: Backend Setup

### Routes Available

The unified JTBD API is mounted at `/api/jtbd-v2`:

#### Configuration Endpoints
```
GET    /api/jtbd-v2/config              # List configs (filtered)
POST   /api/jtbd-v2/config              # Create config
GET    /api/jtbd-v2/config/:id          # Get single config
PATCH  /api/jtbd-v2/config/:id          # Update config
DELETE /api/jtbd-v2/config/:id          # Delete config
```

#### Execution Endpoints (Meetings, SIPs)
```
GET    /api/jtbd-v2/execution           # List executions (filtered)
POST   /api/jtbd-v2/execution           # Create execution
GET    /api/jtbd-v2/execution/:id       # Get single execution
PATCH  /api/jtbd-v2/execution/:id       # Update execution
DELETE /api/jtbd-v2/execution/:id       # Delete execution
POST   /api/jtbd-v2/execution/:id/complete   # Mark completed
POST   /api/jtbd-v2/execution/:id/cancel     # Cancel execution
```

#### Dashboard Endpoints
```
GET    /api/jtbd-v2/upcoming?days=30    # Upcoming executions
GET    /api/jtbd-v2/customer/:id/summary  # Customer jobs summary
```

### Start Backend

```bash
cd backend
npm install  # If needed
npm run dev

# Server should start on port 3001
# Check health: http://localhost:3001/health
```

### Test API Manually

```bash
# Get upcoming meetings for customer
curl -X GET "http://localhost:3001/api/jtbd-v2/execution?customer_id=1&execution_type=client_meeting" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Create a meeting execution
curl -X POST "http://localhost:3001/api/jtbd-v2/execution" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "customer_id": 1,
    "execution_type": "client_meeting",
    "title": "Portfolio Review",
    "priority": "medium",
    "scheduled_date": "2025-11-15",
    "scheduled_time": "14:00",
    "execution_data": {
      "meeting_mode": "in_person",
      "location": "Office",
      "duration_minutes": 60,
      "agenda": "Discuss Q4 portfolio performance"
    }
  }'
```

---

## Step 3: Frontend Setup

### Components Updated

1. **`CreateMeetingModal.tsx`**
   - Uses `useCreateExecution` / `useUpdateExecution` hooks
   - Builds `MeetingExecutionData` for JSONB field
   - Maps old meeting types to execution types

2. **`MeetingsList.tsx`**
   - Uses `useJTBDExecutions` hook with filters
   - Filters by `EXECUTION_STATUS` constants
   - Uses new mutation hooks

3. **`MeetingCard.tsx`**
   - Renders `JTBDExecution` data
   - Extracts meeting details from `execution_data` JSONB

### Start Frontend

```bash
cd frontend
npm install  # If needed
npm start

# App should start on http://localhost:3000
```

---

## Step 4: Testing

### Test Scenarios

#### 1. Create New Meeting

1. Navigate to customer page
2. Go to "Meetings" tab
3. Click "Schedule Meeting"
4. Fill in:
   - Type: Portfolio Review
   - Mode: In Person
   - Date: Tomorrow
   - Time: 2:00 PM
   - Location: Main Office
   - Agenda: Q4 review
5. Click "Schedule Meeting"

**Expected Result:**
- Meeting appears in "Upcoming" tab
- Status shows as "Scheduled"
- All details display correctly

#### 2. Complete Meeting

1. Find scheduled meeting
2. Click "Complete" button
3. Add notes and outcome
4. Click "Complete"

**Expected Result:**
- Meeting moves to "Past" tab
- Status shows as "Completed"
- Notes and outcome visible

#### 3. Cancel Meeting

1. Find scheduled meeting
2. Click "Cancel" button
3. Enter cancellation reason
4. Click "Yes, Cancel"

**Expected Result:**
- Meeting moves to "Past" tab
- Status shows as "Cancelled"

#### 4. Edit Meeting

1. Find scheduled meeting
2. Click "Edit" button
3. Change date/time or details
4. Click "Update Meeting"

**Expected Result:**
- Meeting updates with new details
- Still shows as "Scheduled"

#### 5. API Testing

```bash
# Get all meeting executions for customer 1
curl "http://localhost:3001/api/jtbd-v2/execution?customer_id=1&execution_type=client_meeting"

# Get upcoming meetings (next 7 days)
curl "http://localhost:3001/api/jtbd-v2/upcoming?days=7&type=client_meeting"

# Get customer jobs summary
curl "http://localhost:3001/api/jtbd-v2/customer/1/summary"
```

---

## Step 5: Data Migration (Optional)

If you have existing meetings in `t_customer_meetings` table and want to migrate them:

### Migration Script

```sql
-- Migrate meetings to JTBD executions
INSERT INTO t_jtbd_executions (
  tenant_id,
  is_live,
  customer_id,
  execution_type,
  title,
  description,
  priority,
  scheduled_date,
  scheduled_time,
  execution_status,
  execution_data,
  execution_date,
  execution_time,
  created_by,
  created_at,
  updated_at
)
SELECT
  m.tenant_id,
  m.is_live,
  m.customer_id,
  CASE
    WHEN m.meeting_type = 'review' THEN 'portfolio_review'
    WHEN m.meeting_type = 'planning' THEN 'goal_review'
    ELSE 'client_meeting'
  END as execution_type,
  CASE
    WHEN m.meeting_type = 'review' THEN 'Portfolio Review'
    WHEN m.meeting_type = 'planning' THEN 'Goal Planning'
    WHEN m.meeting_type = 'onboarding' THEN 'Client Onboarding'
    WHEN m.meeting_type = 'grievance' THEN 'Grievance Resolution'
    ELSE 'General Meeting'
  END as title,
  NULL as description,
  'medium' as priority,
  m.scheduled_date,
  m.scheduled_time,
  CASE
    WHEN m.status = 'scheduled' THEN 'planned'
    WHEN m.status = 'completed' THEN 'completed'
    WHEN m.status = 'cancelled' THEN 'cancelled'
    ELSE 'planned'
  END as execution_status,
  jsonb_build_object(
    'meeting_mode', m.meeting_mode,
    'location', m.meeting_location,
    'meeting_link', m.meeting_link,
    'duration_minutes', m.duration_minutes,
    'agenda', m.agenda,
    'meeting_notes', m.notes,
    'outcome', m.outcome,
    'cancellation_reason', m.cancellation_reason
  ) as execution_data,
  CASE WHEN m.status = 'completed' THEN m.completed_at::date ELSE NULL END as execution_date,
  CASE WHEN m.status = 'completed' THEN m.completed_at::time ELSE NULL END as execution_time,
  m.created_by,
  m.created_at,
  m.updated_at
FROM t_customer_meetings m
WHERE m.is_live = true;

-- Verify migration
SELECT COUNT(*) as total_meetings FROM t_customer_meetings;
SELECT COUNT(*) as migrated_executions FROM t_jtbd_executions WHERE execution_type LIKE '%meeting%';
```

---

## Troubleshooting

### Issue: Migration fails with "functions in index predicate must be marked IMMUTABLE"

**Solution:** This was fixed in commit `0ac0d9e`. Make sure you're using the latest migration file.
- The error occurred because `CURRENT_DATE` is volatile (changes daily)
- PostgreSQL doesn't allow volatile expressions in index predicates
- The fix removes the problematic index; overdue filtering is done at query time

### Issue: Migration fails with "column already exists"

**Solution:** Migration is idempotent, but if partially run:
```sql
-- Check if column exists
SELECT column_name FROM information_schema.columns
WHERE table_name = 't_jtbd_configurations' AND column_name = 'jtbd_category';

-- If exists, skip to creating executions table
```

### Issue: Backend won't start

**Check:**
1. Database connection in `.env`
2. Port 3001 is available
3. Run `npm install` to ensure dependencies

### Issue: Frontend shows errors

**Check:**
1. Backend is running on port 3001
2. API_BASE_URL in frontend config
3. Authentication token is valid

### Issue: No meetings showing up

**Check:**
1. Database migration ran successfully
2. Check browser console for API errors
3. Verify API returns data:
   ```bash
   curl "http://localhost:3001/api/jtbd-v2/execution?customer_id=1"
   ```

---

## Backward Compatibility

### Old vs New API

| Feature | Old API | New API | Status |
|---------|---------|---------|--------|
| Get meetings | `GET /api/meetings` | `GET /api/jtbd-v2/execution` | Both work |
| Create meeting | `POST /api/meetings` | `POST /api/jtbd-v2/execution` | Both work |
| Complete meeting | `POST /api/meetings/:id/complete` | `POST /api/jtbd-v2/execution/:id/complete` | Both work |

### Migration Path

**Phase 1 (Current):** Dual system running
- New code uses `/api/jtbd-v2`
- Old code uses `/api/meetings`
- Both read from respective tables

**Phase 2 (Future):** Deprecation
- Add warning logs to old API
- Set sunset date (e.g., 3 months)
- Migrate remaining consumers

**Phase 3 (Future):** Cleanup
- Remove old API endpoints
- Remove old database tables
- Remove old frontend components

---

## Next Steps (After Testing)

1. **Expand meeting types:** Add more execution types like `goal_review`, `portfolio_review`
2. **Timeline view:** Build unified customer timeline showing all executions
3. **Notifications:** Integrate with communication queue for meeting reminders
4. **Bot integration:** Use single `/api/jtbd-v2` endpoint for bot queries
5. **Code cleanup:** Remove old meeting components (Phase 3)

---

## Support

If you encounter issues:

1. Check this guide's Troubleshooting section
2. Review commit messages for implementation details
3. Check backend logs: `npm run dev` output
4. Check frontend console: Browser DevTools
5. Verify database state:
   ```sql
   SELECT * FROM t_jtbd_executions LIMIT 5;
   ```

---

## Summary

✅ **Completed:**
- Database migration script (008_jtbd_consolidation.sql)
- Backend: Unified routes, services, controllers
- Frontend: Constants, types, hooks, services
- Components: CreateMeetingModal, MeetingsList, MeetingCard migrated

⏳ **Pending:**
- Run database migration
- Test end-to-end flows
- Optional: Migrate existing meeting data

🔮 **Future:**
- Expand to other execution types
- Build unified timeline view
- Deprecate old meeting API
- Clean up duplicate code
