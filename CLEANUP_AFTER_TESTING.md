# JTBD Unified System - Cleanup Checklist

## 🗑️ Files to DELETE After Testing

This document lists all OLD code that can be safely removed once the new JTBD unified system is tested and working.

---

## ⚠️ IMPORTANT: Only Delete After

1. ✅ Database migration successful
2. ✅ All CRUD operations tested
3. ✅ No errors in production
4. ✅ Data verified in `t_jtbd_executions`
5. ✅ Users confirm new system works

**Recommended Timeline:** 3-6 months after new system is live

---

## 📋 Backend Files to Delete

### 1. Old Meeting System (100% Replaced)

| File | Path | Size | Reason |
|------|------|------|--------|
| **meeting.service.ts** | `backend/src/services/meeting.service.ts` | ~500 lines | ✅ Replaced by `jtbd.execution.service.ts` |
| **meeting.controller.ts** | `backend/src/controllers/meeting.controller.ts` | ~400 lines | ✅ Replaced by `jtbd.unified.controller.ts` |
| **meeting.routes.ts** | `backend/src/routes/meeting.routes.ts` | ~30 lines | ✅ Replaced by `jtbd.unified.routes.ts` |
| **meeting.types.ts** | `backend/src/types/meeting.types.ts` | ~150 lines | ✅ Replaced by `jtbd.types.ts` |

**Total Backend Cleanup:** ~1,080 lines removed

### 2. Old JTBD Routes (Partially Replaced)

| File | Status | Action |
|------|--------|--------|
| **jtbd.routes.ts** | ⚠️ Keep for now | Still used for alert configurations, can deprecate later |
| **jtbd.service.ts** | ⚠️ Keep | Still used for configuration CRUD |

**Note:** These can be merged into unified routes later, but not urgent.

---

## 📋 Frontend Files to Delete

### 1. Old Meeting Hooks/Services (100% Replaced)

| File | Path | Size | Reason |
|------|------|------|--------|
| **useMeetings.ts** | `frontend/src/hooks/useMeetings.ts` | ~300 lines | ✅ Replaced by `useJTBD.ts` execution hooks |
| **meeting.service.ts** | `frontend/src/services/meeting.service.ts` | ~200 lines | ✅ Replaced by `jtbd.service.ts` execution methods |
| **meeting.types.ts** | `frontend/src/types/meeting.types.ts** | ~100 lines | ✅ Replaced by `jtbd.types.ts` |

**Total Frontend Cleanup:** ~600 lines removed

### 2. Components (❌ DO NOT DELETE)

| Component | Path | Status |
|-----------|------|--------|
| **CreateMeetingModal.tsx** | `frontend/src/components/meetings/` | ✅ Keep - Migrated to JTBD |
| **MeetingsList.tsx** | `frontend/src/components/meetings/` | ✅ Keep - Migrated to JTBD |
| **MeetingCard.tsx** | `frontend/src/components/meetings/` | ✅ Keep - Migrated to JTBD |

**Reason:** These are now JTBD-based components, just rename folder later.

---

## 🗄️ Database Tables to DROP

### ⚠️ CRITICAL: Migrate Data First!

| Table | Action | Migration Script |
|-------|--------|------------------|
| **t_customer_meetings** | 🔄 Migrate → Drop | See migration script below |

**Migration Script (Run Before Dropping):**
```sql
-- Step 1: Backup old data
CREATE TABLE t_customer_meetings_backup AS
SELECT * FROM t_customer_meetings;

-- Step 2: Verify all meetings migrated
SELECT
  COUNT(*) as old_meetings,
  (SELECT COUNT(*) FROM t_jtbd_executions WHERE execution_type LIKE '%meeting%') as new_executions
FROM t_customer_meetings;

-- Step 3: If counts match, drop old table
-- DROP TABLE t_customer_meetings CASCADE;
```

**⚠️ Wait 6 months before dropping!**

---

## 📝 Code References to Update

### 1. Server.ts - Route Registration

**File:** `backend/src/server.ts`

**Current:**
```typescript
app.use('/api/meetings', meetingRoutes); // OLD
app.use('/api/jtbd-v2', jtbdUnifiedRoutes); // NEW
```

**After Cleanup:**
```typescript
// Remove this line:
// app.use('/api/meetings', meetingRoutes); // DEPRECATED

app.use('/api/jtbd-v2', jtbdUnifiedRoutes); // Main API
```

### 2. Import Statements

**Files to Update:**

`backend/src/server.ts`:
```typescript
// Remove:
import meetingRoutes from './routes/meeting.routes';
```

Any other files importing old meeting types/services.

---

## 🔄 Deprecation Steps (Gradual Removal)

### Phase 1: Mark as Deprecated (Month 1)

1. Add deprecation warnings to old endpoints:

```typescript
// backend/src/routes/meeting.routes.ts
router.use((req, res, next) => {
  console.warn('⚠️ DEPRECATED: /api/meetings is deprecated. Use /api/jtbd-v2/execution');
  res.setHeader('X-Deprecated-API', 'true');
  res.setHeader('X-Sunset-Date', '2026-02-06'); // 3 months from now
  next();
});
```

2. Add UI warnings:

```typescript
// Show notification when using old API
if (response.headers['x-deprecated-api']) {
  console.warn('Using deprecated API, please contact support');
}
```

### Phase 2: Monitor Usage (Month 2)

1. Log all calls to old API:
```sql
-- Track API usage
SELECT
  endpoint,
  COUNT(*) as calls,
  MAX(last_used) as last_used
FROM t_api_usage_logs
WHERE endpoint LIKE '/api/meetings%'
GROUP BY endpoint;
```

2. If no usage for 30 days → proceed to removal

### Phase 3: Remove Code (Month 3+)

1. Delete backend files (listed above)
2. Delete frontend files (listed above)
3. Remove route registration
4. Drop database table (after backup)

---

## 📊 Cleanup Impact Summary

### Code Reduction

| Layer | Before | After | Reduction |
|-------|--------|-------|-----------|
| **Backend** | ~1,080 lines | 0 lines | -100% |
| **Frontend** | ~600 lines | 0 lines | -100% |
| **Total** | **~1,680 lines** | **0 lines** | **-100%** |

### API Endpoints

| Before | After | Reduction |
|--------|-------|-----------|
| `/api/meetings/*` (7 endpoints) | Removed | -7 endpoints |
| `/api/jtbd-v2/*` (12 endpoints) | Active | Unified API |

### Database Tables

| Before | After | Reduction |
|--------|-------|-----------|
| `t_customer_meetings` | Dropped | -1 table |
| `t_jtbd_executions` | Active | Unified storage |

---

## ✅ Verification Checklist

Before deleting any code, verify:

```
Backend:
[ ] All old meeting endpoints return 404 or redirect
[ ] No references to old meeting service in code
[ ] No imports of old meeting types
[ ] Old route not registered in server.ts

Frontend:
[ ] No components using useMeetings hook
[ ] No imports from meeting.service.ts
[ ] No references to old meeting types
[ ] All meeting functionality works via JTBD

Database:
[ ] All meeting data migrated to t_jtbd_executions
[ ] No foreign keys pointing to t_customer_meetings
[ ] Backup of old table exists

Testing:
[ ] Create meeting works (via JTBD)
[ ] Edit meeting works
[ ] Complete meeting works
[ ] Cancel meeting works
[ ] Delete meeting works
[ ] No errors in console
[ ] No errors in backend logs
```

---

## 🚫 DO NOT DELETE (Keep Forever)

These are part of the NEW system:

### Backend (Keep)
- ✅ `jtbd.execution.service.ts` - Core execution logic
- ✅ `jtbd.unified.controller.ts` - Unified API controller
- ✅ `jtbd.unified.routes.ts` - Main routes
- ✅ `jtbd.types.ts` - Type definitions
- ✅ `jtbd.constants.ts` - Constants

### Frontend (Keep)
- ✅ `components/meetings/CreateMeetingModal.tsx` - JTBD-based
- ✅ `components/meetings/MeetingsList.tsx` - JTBD-based
- ✅ `components/meetings/MeetingCard.tsx` - JTBD-based
- ✅ `hooks/useJTBD.ts` - All JTBD hooks
- ✅ `services/jtbd.service.ts` - JTBD API client
- ✅ `types/jtbd.types.ts` - Type definitions
- ✅ `constants/jtbd.constants.ts` - Constants

### Database (Keep)
- ✅ `t_jtbd_configurations` - Templates/configs
- ✅ `t_jtbd_executions` - Actual instances

---

## 🔧 Cleanup Commands

### Safe Deletion Script

Create this script: `cleanup-old-meeting-code.sh`

```bash
#!/bin/bash
set -e

echo "⚠️ CLEANUP WARNING ⚠️"
echo "This will DELETE old meeting code."
echo "Only run after:"
echo "  1. New JTBD system tested"
echo "  2. Data migrated"
echo "  3. No errors for 30+ days"
echo ""
read -p "Are you sure? (type 'DELETE' to confirm): " confirm

if [ "$confirm" != "DELETE" ]; then
  echo "❌ Aborted"
  exit 1
fi

echo "🗑️ Starting cleanup..."

# Backend
echo "Removing backend files..."
rm -f backend/src/services/meeting.service.ts
rm -f backend/src/controllers/meeting.controller.ts
rm -f backend/src/routes/meeting.routes.ts
rm -f backend/src/types/meeting.types.ts

# Frontend
echo "Removing frontend files..."
rm -f frontend/src/hooks/useMeetings.ts
rm -f frontend/src/services/meeting.service.ts
rm -f frontend/src/types/meeting.types.ts

# Remove route registration from server.ts
echo "Updating server.ts..."
# Manual step - edit server.ts

echo "✅ Cleanup complete!"
echo "⚠️ Now:"
echo "  1. Run tests"
echo "  2. Commit changes"
echo "  3. Deploy carefully"
```

**Usage:**
```bash
chmod +x cleanup-old-meeting-code.sh
./cleanup-old-meeting-code.sh
```

---

## 📅 Recommended Timeline

| Phase | Timeline | Action |
|-------|----------|--------|
| **Phase 1** | Day 1 | Deploy new JTBD system |
| **Phase 2** | Week 1 | Monitor for errors |
| **Phase 3** | Month 1 | Add deprecation warnings |
| **Phase 4** | Month 2 | Monitor old API usage |
| **Phase 5** | Month 3 | Delete code if no usage |
| **Phase 6** | Month 6 | Drop old database table |

---

## 🎯 Summary

### Can Delete (After Testing)
- ❌ 4 backend files (~1,080 lines)
- ❌ 3 frontend files (~600 lines)
- ❌ 1 database table (after migration)
- ❌ 7 API endpoints

### Must Keep (Part of New System)
- ✅ All JTBD unified files
- ✅ Migrated meeting components
- ✅ JTBD execution hooks
- ✅ t_jtbd_executions table

### Total Cleanup Impact
- **-1,680 lines of code**
- **-7 API endpoints**
- **-1 database table**
- **+Simplified architecture**

---

## ⚠️ FINAL WARNING

**DO NOT delete anything until:**
1. New system fully tested
2. Production running smoothly for 30+ days
3. Data migration verified
4. Backup of old data exists
5. Team approves removal

**When in doubt, keep the old code!**

Better to have redundant code than lose functionality.
