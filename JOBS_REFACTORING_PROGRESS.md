# Jobs System Refactoring - Progress Tracker

**Status:** IN PROGRESS (40% Complete)
**Started:** 2025-10-27
**Last Updated:** 2025-10-27

---

## ✅ COMPLETED

### Phase 1: Foundation (DONE)
- [x] **Planning Document:** `JOBS_SYSTEM_REFACTORING_PLAN.md`
- [x] **Database Migration:** `003_generic_jobs_system.sql`
  - Generic tables created (m_job_types, t_job_scheduler_configs, t_job_executions)
  - Existing data migrated from portfolio-specific tables
  - Indexes created
- [x] **Generic Types:** `backend/src/types/jobs.types.ts`
  - Job Type enum
  - Generic interfaces for all jobs
  - Job-specific execution data types

---

## 🔄 IN PROGRESS

### Phase 2: Backend Services (40% Complete)

**Files to Create:**

1. **`backend/src/services/jobScheduler.service.ts`** (PENDING)
   - Generic scheduler for ALL job types
   - Job registration system
   - Timer management
   - Retry logic with exponential backoff
   - Execution tracking

2. **`backend/src/services/jobs/portfolioSnapshot.job.ts`** (PENDING)
   - Implements JobExecutor interface
   - Move snapshot generation logic here
   - Standalone, pluggable implementation

3. **`backend/src/controllers/jobs.controller.ts`** (PENDING)
   - Generic controller for ALL job types
   - Routes: `/api/jobs/:jobType/*`
   - Replace portfolioSnapshot.controller.ts

4. **`backend/src/routes/jobs.routes.ts`** (PENDING)
   - Generic routes for ALL job types
   - Replace portfolioSnapshot.routes.ts

5. **Update `backend/src/server.ts`** (PENDING)
   - Initialize generic JobScheduler
   - Register job types
   - Remove portfolio-specific initialization

---

## ⏳ TODO

### Phase 3: Frontend Refactoring

**Files to Create:**

1. **`frontend/src/types/jobs.types.ts`** (PENDING)
   - Mirror backend types
   - Frontend-specific interfaces

2. **`frontend/src/services/jobs.service.ts`** (PENDING)
   - Generic API service for ALL job types
   - Replace portfolioSnapshot.service.ts

3. **`frontend/src/components/cruiseControl/JobStatisticsCards.tsx`** (PENDING)
   - Reusable statistics cards
   - Accepts jobType prop
   - Custom card rendering support

4. **`frontend/src/components/cruiseControl/JobExecutionTable.tsx`** (PENDING)
   - Reusable execution history table
   - Accepts jobType prop
   - Custom column rendering support

5. **`frontend/src/components/cruiseControl/JobManualTrigger.tsx`** (PENDING)
   - Reusable manual trigger button
   - Accepts jobType prop

6. **Update `frontend/src/pages/cruiseControl/PortfolioSnapshotsTab.tsx`** (PENDING)
   - Use generic components
   - Pass PORTFOLIO_SNAPSHOT job type

---

## 🗑️ CLEANUP

### Files to Delete (After Testing)

**Backend:**
- `backend/src/types/portfolioSnapshot.types.ts`
- `backend/src/services/portfolioSnapshot.service.ts`
- `backend/src/services/portfolioSnapshotScheduler.service.ts`
- `backend/src/controllers/portfolioSnapshot.controller.ts`
- `backend/src/routes/portfolioSnapshot.routes.ts`

**Frontend:**
- `frontend/src/types/portfolioSnapshot.types.ts`
- `frontend/src/services/portfolioSnapshot.service.ts`

**Database (After Migration Verified):**
```sql
DROP TABLE IF EXISTS t_portfolio_snapshot_executions CASCADE;
DROP TABLE IF EXISTS t_portfolio_snapshot_configs CASCADE;
```

---

## 📝 TESTING CHECKLIST

### After Backend Refactoring:
- [ ] Run database migration
- [ ] Restart backend server
- [ ] Verify scheduler initializes
- [ ] Test manual trigger via API
- [ ] Check execution history
- [ ] Verify retry logic works
- [ ] Confirm tenant isolation

### After Frontend Refactoring:
- [ ] Navigate to Cruise Control
- [ ] View Portfolio Snapshots tab
- [ ] Check statistics display
- [ ] Test manual trigger button
- [ ] Verify execution history table
- [ ] Test pagination
- [ ] Verify auto-refresh works

### Final Verification:
- [ ] Create a test job (e.g., DATA_CLEANUP)
- [ ] Verify it works with same infrastructure
- [ ] Confirm adding new job takes <10 minutes

---

## 🎯 NEXT STEPS (Resume Here)

**Continue with Backend Services:**

1. Create `backend/src/services/jobScheduler.service.ts`
   - Copy logic from portfolioSnapshotScheduler.service.ts
   - Make it generic (use JobExecutor interface)
   - Add job registration system

2. Create `backend/src/services/jobs/portfolioSnapshot.job.ts`
   - Extract logic from portfolioSnapshot.service.ts
   - Implement JobExecutor interface
   - Keep it standalone and focused

3. Create generic controller and routes
   - Pattern: `/api/jobs/:jobType/*`
   - Replace portfolio-specific endpoints

4. Update server.ts
   - Initialize generic scheduler
   - Register PORTFOLIO_SNAPSHOT job

5. Test backend completely before moving to frontend

---

## 📊 Estimated Completion

- ✅ Foundation: **DONE** (40%)
- 🔄 Backend Services: **IN PROGRESS** (30% remaining)
- ⏳ Frontend Refactoring: **TODO** (20% remaining)
- ⏳ Testing & Cleanup: **TODO** (10% remaining)

**Total Progress:** 40% Complete

---

## 🚀 Benefits When Complete

- ✅ Add new jobs in < 10 minutes
- ✅ Single file for all job types
- ✅ Reusable UI components
- ✅ Consistent behavior across all jobs
- ✅ Easy maintenance and debugging
- ✅ Scalable to 50+ job types without file explosion

---

## 📞 Support

If resuming later, start at **"NEXT STEPS"** section above.
All foundation work is complete and committed.
