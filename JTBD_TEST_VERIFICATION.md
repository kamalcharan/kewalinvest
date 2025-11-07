# JTBD Unified System - Test Verification Guide

## 🎯 What's Actually Wired Up

### ✅ Frontend Components
| Component | Status | Location | Used In |
|-----------|--------|----------|---------|
| `CreateMeetingModal.tsx` | ✅ Migrated to JTBD | `frontend/src/components/meetings/` | MeetingsList component |
| `MeetingsList.tsx` | ✅ Migrated to JTBD | `frontend/src/components/meetings/` | CustomerViewPage (line 1318) |
| `MeetingCard.tsx` | ✅ Migrated to JTBD | `frontend/src/components/meetings/` | MeetingsList component |

### ✅ Backend API
| Endpoint | Status | Route |
|----------|--------|-------|
| GET `/api/jtbd-v2/execution` | ✅ Implemented | List executions with filters |
| POST `/api/jtbd-v2/execution` | ✅ Implemented | Create meeting execution |
| GET `/api/jtbd-v2/execution/:id` | ✅ Implemented | Get single execution |
| PATCH `/api/jtbd-v2/execution/:id` | ✅ Implemented | Update execution |
| DELETE `/api/jtbd-v2/execution/:id` | ✅ Implemented | Delete execution |
| POST `/api/jtbd-v2/execution/:id/complete` | ✅ Implemented | Mark completed |
| POST `/api/jtbd-v2/execution/:id/cancel` | ✅ Implemented | Cancel execution |

### ✅ Database
| Table | Status | Migration |
|-------|--------|-----------|
| `t_jtbd_configurations` | ⏳ Pending | Needs `jtbd_category` column |
| `t_jtbd_executions` | ⏳ Pending | Needs creation |
| Indexes | ⏳ Pending | Performance indexes |

---

## 🧪 Step-by-Step Test Plan

### Prerequisites
```bash
# Terminal 1: Start Backend
cd backend
npm run dev
# Should see: Server running on port 3001

# Terminal 2: Start Frontend
cd frontend
npm start
# Should see: webpack compiled successfully
# App opens at http://localhost:3000
```

---

## Test 1: Database Migration ⏳ **MUST DO FIRST**

### What to Test
Run the database migration to create the JTBD executions table.

### Steps
```bash
# Option A: Using Docker Compose
docker compose exec -T postgres psql -U kewal_admin -d kewalinvest < backend/db/migrations/008_jtbd_consolidation.sql

# Option B: Local PostgreSQL
psql -U kewal_admin -d kewalinvest -f backend/db/migrations/008_jtbd_consolidation.sql
```

### Expected Result
```
NOTICE: ========================================
NOTICE: Adding jtbd_category to t_jtbd_configurations
NOTICE: ========================================
ALTER TABLE
UPDATE 0
ALTER TABLE
COMMENT

NOTICE: ========================================
NOTICE: Creating t_jtbd_executions table
NOTICE: ========================================
CREATE TABLE
COMMENT
COMMENT
... (more output)

NOTICE: ========================================
NOTICE: Creating updated_at trigger
NOTICE: ========================================
DROP TRIGGER
CREATE TRIGGER
```

### Verification
```bash
# Check tables exist
psql -U kewal_admin -d kewalinvest -c "\dt t_jtbd*"

# Should show:
#              List of relations
#  Schema |         Name          | Type  |    Owner
# --------+-----------------------+-------+--------------
#  public | t_jtbd_configurations | table | kewal_admin
#  public | t_jtbd_executions     | table | kewal_admin
```

### ❌ If Migration Fails
- Check error message
- See `JTBD_MIGRATION_GUIDE.md` Troubleshooting section
- Common issues:
  - PostgreSQL not running
  - Database doesn't exist
  - Wrong credentials

---

## Test 2: Navigate to Meetings Tab ✅ **SHOULD WORK NOW**

### What to Test
Verify the migrated components are rendering correctly.

### Steps
1. Open browser: `http://localhost:3000`
2. Login with your credentials
3. Navigate to **Customers** page
4. Click on any customer
5. Click the **"MEETINGS"** tab

### Expected Result
You should see:
- **Header**: "Customer Meetings" with "Schedule Meeting" button
- **Tabs**: "Upcoming" and "Past"
- **Content**:
  - If no meetings: "No upcoming meetings scheduled" (empty state)
  - If meetings exist: List of meeting cards

### UI Elements to Verify
```
┌─────────────────────────────────────────────────┐
│  Customer Meetings        [+ Schedule Meeting]  │
├─────────────────────────────────────────────────┤
│  [Upcoming (0)]  [Past (0)]                     │
├─────────────────────────────────────────────────┤
│                                                  │
│              📅                                  │
│    No upcoming meetings scheduled               │
│                                                  │
└─────────────────────────────────────────────────┘
```

### ✅ Success Criteria
- No console errors in browser DevTools
- Empty state shows correctly
- Tabs are clickable
- Button is visible

### ❌ If You See Errors
Check browser console (F12):
- `Failed to fetch executions` → Backend not running or migration not done
- `404 Not Found` → Backend routes not mounted correctly
- `500 Internal Server Error` → Database migration not run

---

## Test 3: Create New Meeting ✅ **READY TO TEST**

### What to Test
Create a meeting using the new JTBD execution system.

### Steps
1. On Meetings tab, click **"Schedule Meeting"** button
2. Modal should open
3. Fill in the form:
   - **Meeting Type**: Portfolio Review
   - **Meeting Mode**: In Person
   - **Date**: Tomorrow's date (e.g., 2025-11-07)
   - **Time**: 14:00
   - **Duration**: 60 minutes
   - **Location**: "Main Office"
   - **Agenda**: "Q4 portfolio review and 2025 planning"
4. Click **"Schedule Meeting"**

### Expected Result
- Modal closes
- Meeting appears in "Upcoming" tab
- Meeting card shows:
  - ✅ Title: "Portfolio Review"
  - ✅ Status badge: "Scheduled" (blue)
  - ✅ Date: Tomorrow's date formatted
  - ✅ Time: "2:00 PM (60 min)"
  - ✅ Mode icon: 📍 "In Person"
  - ✅ Location: "Main Office"
  - ✅ Agenda section visible

### Backend Verification
```bash
# Check the database
psql -U kewal_admin -d kewalinvest -c "
SELECT
  id,
  title,
  execution_type,
  scheduled_date,
  execution_status,
  execution_data->>'location' as location
FROM t_jtbd_executions
WHERE execution_type LIKE '%meeting%'
ORDER BY created_at DESC
LIMIT 5;
"
```

Should show:
```
 id |      title       | execution_type  | scheduled_date | execution_status | location
----+------------------+-----------------+----------------+------------------+-----------
  1 | Portfolio Review | portfolio_review| 2025-11-07     | planned          | Main Office
```

### ✅ Success Criteria
- Meeting created without errors
- Shows in Upcoming tab
- All details display correctly
- Database record created

### ❌ If Creation Fails
Check:
- Browser console for error messages
- Backend logs for validation errors
- Network tab (F12) → Check request payload and response

---

## Test 4: Edit Meeting ✅ **READY TO TEST**

### What to Test
Update an existing meeting.

### Steps
1. Find the meeting you just created in "Upcoming" tab
2. Click **"Edit"** button
3. Change:
   - **Time**: 15:00
   - **Location**: "Client Office"
4. Click **"Update Meeting"**

### Expected Result
- Modal closes
- Meeting updates in list
- Time shows: "3:00 PM (60 min)"
- Location shows: "Client Office"

### ✅ Success Criteria
- Changes save successfully
- UI updates immediately
- No page refresh needed

---

## Test 5: Complete Meeting ✅ **READY TO TEST**

### What to Test
Mark a meeting as completed.

### Steps
1. Find your meeting in "Upcoming" tab
2. Click **"Complete"** button
3. In the prompt:
   - Notes: "Reviewed portfolio, customer happy with performance"
   - Outcome: "Positive - No changes needed"
4. Click **"Complete"**

### Expected Result
- Meeting moves from "Upcoming" to "Past" tab
- Status changes to "Completed" (green)
- Notes and Outcome sections appear
- Can expand to view details

### Database Verification
```bash
psql -U kewal_admin -d kewalinvest -c "
SELECT
  id,
  title,
  execution_status,
  execution_date,
  deviation_days,
  execution_data->>'meeting_notes' as notes
FROM t_jtbd_executions
WHERE id = 1;
"
```

Should show:
```
 id |      title       | execution_status | execution_date | deviation_days |          notes
----+------------------+------------------+----------------+----------------+-------------------------
  1 | Portfolio Review | completed        | 2025-11-06     | -1             | Reviewed portfolio...
```

**Note**: `deviation_days = -1` means completed 1 day early (if tomorrow's meeting completed today)

### ✅ Success Criteria
- Meeting marked completed
- Moves to Past tab
- Notes saved correctly
- Deviation tracked

---

## Test 6: Cancel Meeting ✅ **READY TO TEST**

### What to Test
Cancel a scheduled meeting.

### Steps
1. Create another meeting (follow Test 3)
2. Click **"Cancel"** button
3. Enter reason: "Customer rescheduled to next week"
4. Click **"Yes, Cancel"**

### Expected Result
- Meeting moves to "Past" tab
- Status shows "Cancelled" (red)
- Cancellation reason visible

### ✅ Success Criteria
- Meeting cancelled successfully
- Reason stored and displayed

---

## Test 7: Delete Meeting ✅ **READY TO TEST**

### What to Test
Delete a meeting permanently.

### Steps
1. Go to "Past" tab
2. Find a completed or cancelled meeting
3. Click **"Delete"** button (trash icon)
4. Confirm deletion

### Expected Result
- Meeting removed from list
- No errors

### ⚠️ Warning
This is permanent! Meeting is deleted from database.

---

## Test 8: API Direct Testing 🔧 **OPTIONAL**

### What to Test
Test backend API directly without frontend.

### Get Auth Token
```bash
# Login first to get token
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your@email.com",
    "password": "yourpassword"
  }'

# Copy the token from response
```

### Create Meeting via API
```bash
TOKEN="your_token_here"

curl -X POST http://localhost:3001/api/jtbd-v2/execution \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "customer_id": 1,
    "execution_type": "client_meeting",
    "title": "API Test Meeting",
    "priority": "medium",
    "scheduled_date": "2025-11-10",
    "scheduled_time": "10:00",
    "execution_data": {
      "meeting_mode": "video_call",
      "meeting_link": "https://zoom.us/j/123456789",
      "duration_minutes": 30,
      "agenda": "Quick sync on portfolio"
    }
  }'
```

### Expected Response
```json
{
  "success": true,
  "data": {
    "id": 2,
    "tenant_id": 1,
    "customer_id": 1,
    "execution_type": "client_meeting",
    "title": "API Test Meeting",
    "scheduled_date": "2025-11-10",
    "execution_status": "planned",
    "execution_data": {
      "meeting_mode": "video_call",
      "meeting_link": "https://zoom.us/j/123456789",
      "duration_minutes": 30,
      "agenda": "Quick sync on portfolio"
    },
    "created_at": "2025-11-06T...",
    ...
  }
}
```

### Get Meetings for Customer
```bash
curl -X GET "http://localhost:3001/api/jtbd-v2/execution?customer_id=1&execution_type=client_meeting" \
  -H "Authorization: Bearer $TOKEN"
```

---

## 🐛 Common Issues & Solutions

### Issue 1: "No data showing" in Meetings tab
**Cause**: Database migration not run
**Solution**: Run migration (Test 1)

### Issue 2: "Failed to fetch executions"
**Cause**: Backend not running or database connection failed
**Solution**:
```bash
# Check backend is running
curl http://localhost:3001/health

# Check database connection
psql -U kewal_admin -d kewalinvest -c "SELECT 1"
```

### Issue 3: "Cannot read property 'execution_data'"
**Cause**: Old meeting data structure
**Solution**: This error should not appear with new data. Check console for details.

### Issue 4: TypeScript compilation errors
**Cause**: Stale build cache
**Solution**:
```bash
cd frontend
rm -rf node_modules/.cache
npm start
```

---

## 📊 Test Results Checklist

Use this checklist to track your testing:

```
Database Setup:
[ ] Migration ran successfully
[ ] Tables created (t_jtbd_executions)
[ ] Can query tables without errors

Frontend Navigation:
[ ] Can access customer page
[ ] Meetings tab visible
[ ] Meetings tab loads without errors

Create Meeting:
[ ] Modal opens when clicking "Schedule Meeting"
[ ] All form fields work
[ ] Can submit form
[ ] Meeting appears in Upcoming tab
[ ] All details display correctly

Edit Meeting:
[ ] Edit button works
[ ] Can update fields
[ ] Changes save correctly

Complete Meeting:
[ ] Complete button works
[ ] Can add notes and outcome
[ ] Meeting moves to Past tab
[ ] Status shows "Completed"

Cancel Meeting:
[ ] Cancel button works
[ ] Can enter reason
[ ] Meeting moves to Past with status "Cancelled"

Delete Meeting:
[ ] Delete button works
[ ] Meeting removed from database

API Testing (Optional):
[ ] Can create via API
[ ] Can fetch via API
[ ] Response format correct
```

---

## 🎯 What's NOT Migrated Yet

These still use the **old** meeting system:

### ❌ Not Using New System
- **Old API**: `/api/meetings` (still works for backward compatibility)
- **Old Table**: `t_customer_meetings` (if it exists with old data)
- **Old Components**: Any other pages that might have separate meeting views

### When to Use Old vs New

| Feature | Old System | New System |
|---------|-----------|------------|
| Customer View Page → Meetings Tab | ❌ Old | ✅ **NEW (JTBD)** |
| API endpoint | `/api/meetings` | `/api/jtbd-v2/execution` |
| Database table | `t_customer_meetings` | `t_jtbd_executions` |
| Hook | `useMeetings` | `useJTBDExecutions` |

---

## 🚀 Next Steps After Testing

Once all tests pass:

1. **Phase 1**: Use new system for all new meetings
2. **Phase 2**: Optionally migrate old meeting data (see migration guide)
3. **Phase 3**: Mark old `/api/meetings` as deprecated
4. **Phase 4**: Remove old code (after 3-6 months)

---

## 📞 Need Help?

If tests fail:
1. Check `JTBD_MIGRATION_GUIDE.md` Troubleshooting section
2. Check browser console (F12 → Console tab)
3. Check backend logs (terminal where `npm run dev` is running)
4. Check database:
   ```bash
   psql -U kewal_admin -d kewalinvest
   \dt t_jtbd*
   SELECT COUNT(*) FROM t_jtbd_executions;
   ```

---

## Summary

**To test the new JTBD meeting system:**

1. ✅ **Run database migration** (Test 1) - **REQUIRED FIRST**
2. ✅ **Navigate** to Customer → Meetings tab
3. ✅ **Create** a meeting
4. ✅ **Edit** the meeting
5. ✅ **Complete** or **Cancel** it
6. ✅ **Verify** data in database

**All the UI is already wired up and ready to test!** Just need to run the migration first.
