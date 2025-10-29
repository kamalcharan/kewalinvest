# Portfolio Snapshots Setup Verification Guide

**Date:** 2025-10-29
**Purpose:** Verify that Portfolio Snapshots infrastructure is ready
**Status:** Ready to test

---

## Changes Made

### ✅ server.ts Updated

**Changes:**
1. ✅ Imported `jobsRoutes` from './routes/jobs.routes'
2. ✅ Registered route: `app.use('/api/jobs', jobsRoutes)`
3. ✅ Added health check features:
   - `cruise_control_portfolio_snapshots: true`
   - `portfolio_snapshot_scheduler: true`
   - `generic_jobs_system: true`
4. ✅ Initialized Job Scheduler Service on startup:
   - Imports JobSchedulerService
   - Imports PortfolioSnapshotJob
   - Registers job executor
   - Calls `initializeScheduler()`

### ✅ tenantSeed.service.ts Verified

**Confirmed:**
1. ✅ `seedGlobalJobTypes()` includes `PORTFOLIO_SNAPSHOT` job type
2. ✅ `seedJobSchedulerConfigs()` creates scheduler configs for all active job types
3. ✅ Called for both LIVE and TEST environments
4. ✅ Creates configs with:
   - Job type: `PORTFOLIO_SNAPSHOT`
   - Schedule: Weekly (Friday 9 PM)
   - Cron: `0 21 * * 5`
   - Enabled: `true`
   - Max retries: `3`

**No changes needed** - Already working correctly!

---

## Verification Steps

### Step 1: Start Backend Server

```bash
cd /home/user/kewalinvest/backend
npm run dev
```

**Look for these log messages:**

```
✅ Expected logs:
   📅 Initializing NAV Scheduler Service...
   ✅ NAV Scheduler Service initialized successfully

   🔄 Initializing Generic Job Scheduler Service...
   ✅ Generic Job Scheduler Service initialized successfully
   📊 Registered jobs: PORTFOLIO_SNAPSHOT
```

**If you see these, server.ts is working! ✅**

---

### Step 2: Test API Endpoint

**Open a new terminal and run:**

```bash
# Test health check
curl http://localhost:8080/health | jq .features

# Expected output should include:
# "cruise_control_portfolio_snapshots": true,
# "portfolio_snapshot_scheduler": true,
# "generic_jobs_system": true
```

**Test jobs endpoint (will need auth token):**

```bash
# This should return 401 (Unauthorized) instead of 404 (Not Found)
curl http://localhost:8080/api/jobs/PORTFOLIO_SNAPSHOT/statistics

# If you get 401 - Route is registered! ✅
# If you get 404 - Route not working ❌
```

---

### Step 3: Sign Up New Tenant

**Use your signup form or API to create a new tenant.**

**Expected flow:**
1. User signs up
2. Tenant created (e.g., tenant_id = 5)
3. User created (e.g., user_id = 12)
4. `seedTenantData()` is called automatically
5. Job scheduler configs created

---

### Step 4: Verify Database - Job Types (Global)

**Run this SQL query:**

```sql
SELECT
  code,
  name,
  description,
  default_cron_expression,
  default_max_retries,
  is_active,
  created_at
FROM m_job_types
WHERE code = 'PORTFOLIO_SNAPSHOT';
```

**Expected result:**

```
code              | PORTFOLIO_SNAPSHOT
name              | Portfolio Snapshot Generation
description       | Generate monthly portfolio snapshots for all customers to enable performance tracking
default_cron      | 0 21 * * 5
default_retries   | 3
is_active         | true
created_at        | [timestamp]
```

**If you see this row, global job types are seeded! ✅**

---

### Step 5: Verify Database - Scheduler Configs (Per Tenant)

**Replace `<TENANT_ID>` with your new tenant's ID:**

```sql
SELECT
  id,
  tenant_id,
  job_type,
  user_id,
  is_live,
  schedule_type,
  cron_expression,
  is_enabled,
  max_retries,
  job_config,
  created_at
FROM t_job_scheduler_configs
WHERE tenant_id = <TENANT_ID>
  AND job_type = 'PORTFOLIO_SNAPSHOT'
ORDER BY is_live DESC;
```

**Expected result (2 rows):**

```
Row 1:
------
id              | 1
tenant_id       | <TENANT_ID>
job_type        | PORTFOLIO_SNAPSHOT
user_id         | <USER_ID>
is_live         | true
schedule_type   | weekly
cron_expression | 0 21 * * 5
is_enabled      | true
max_retries     | 3
job_config      | {}
created_at      | [timestamp]

Row 2:
------
id              | 2
tenant_id       | <TENANT_ID>
job_type        | PORTFOLIO_SNAPSHOT
user_id         | <USER_ID>
is_live         | false
schedule_type   | weekly
cron_expression | 0 21 * * 5
is_enabled      | true
max_retries     | 3
job_config      | {}
created_at      | [timestamp]
```

**If you see 2 rows (LIVE + TEST), tenant seeding is working! ✅**

---

### Step 6: Test Cruise Control UI

**Navigate to:**
```
http://localhost:3000/cruise-control
```

**Click on "Portfolio Snapshots" tab**

**Expected behavior:**
- ✅ Tab loads without errors
- ✅ Statistics cards display (may show 0s if no executions yet)
- ✅ No "404 Not Found" errors in console
- ✅ No "Failed to load data" messages

**If the tab loads and shows statistics cards, frontend is working! ✅**

---

## Troubleshooting

### Issue 1: Server won't start

**Error:** `Cannot find module './routes/jobs.routes'`

**Solution:**
```bash
# Check if file exists
ls -la /home/user/kewalinvest/backend/src/routes/jobs.routes.ts

# If missing, check the exact path
find /home/user/kewalinvest/backend/src -name "jobs.routes.ts"
```

---

### Issue 2: Job Scheduler initialization fails

**Error in logs:** `⚠️  Generic Job Scheduler initialization failed`

**Solution:**
1. Check if `jobScheduler.service.ts` exists
2. Check if `portfolioSnapshot.job.ts` exists
3. Check database connection
4. Review full error message in logs

**Query to check database:**
```sql
-- Check if t_job_scheduler_configs table exists
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name = 't_job_scheduler_configs';
```

---

### Issue 3: No job types in m_job_types

**Error:** Query returns 0 rows

**Solution:**
Run the seed script manually:

```sql
INSERT INTO m_job_types (
  code, name, description,
  default_cron_expression, default_max_retries, is_active
) VALUES (
  'PORTFOLIO_SNAPSHOT',
  'Portfolio Snapshot Generation',
  'Generate monthly portfolio snapshots for all customers to enable performance tracking',
  '0 21 * * 5',
  3,
  true
)
ON CONFLICT (code) DO NOTHING;
```

---

### Issue 4: No configs created for new tenant

**Error:** Query returns 0 rows after signup

**Solution:**
1. Check if `seedTenantData()` is called in signup flow
2. Check server logs for seed messages
3. Manually seed for existing tenant:

```sql
-- Replace <TENANT_ID> and <USER_ID>
INSERT INTO t_job_scheduler_configs (
  tenant_id, job_type, user_id, is_live,
  schedule_type, cron_expression, is_enabled, max_retries,
  job_config
) VALUES
  (<TENANT_ID>, 'PORTFOLIO_SNAPSHOT', <USER_ID>, true, 'weekly', '0 21 * * 5', true, 3, '{}'),
  (<TENANT_ID>, 'PORTFOLIO_SNAPSHOT', <USER_ID>, false, 'weekly', '0 21 * * 5', true, 3, '{}')
ON CONFLICT (tenant_id, job_type, is_live) DO NOTHING;
```

---

### Issue 5: Frontend shows 404 errors

**Error:** `GET /api/jobs/PORTFOLIO_SNAPSHOT/statistics 404 Not Found`

**Solution:**
1. Verify server.ts has: `app.use('/api/jobs', jobsRoutes);`
2. Restart backend server
3. Check if jobs.routes.ts is properly exporting routes
4. Check backend logs for route registration

---

## Success Criteria

All of these should be ✅ after verification:

- [ ] Server starts without errors
- [ ] Logs show "Generic Job Scheduler Service initialized successfully"
- [ ] Logs show "Registered jobs: PORTFOLIO_SNAPSHOT"
- [ ] Health check includes `cruise_control_portfolio_snapshots: true`
- [ ] `/api/jobs` endpoint returns 401 (not 404)
- [ ] `m_job_types` has PORTFOLIO_SNAPSHOT row
- [ ] New tenant signup creates 2 configs in `t_job_scheduler_configs`
- [ ] Cruise Control → Portfolio Snapshots tab loads
- [ ] No console errors in frontend

---

## Expected Timeline

**After signup, jobs will run on schedule:**
- **Cron:** `0 21 * * 5` = Every Friday at 9:00 PM
- **First run:** Next Friday at 9 PM (unless manually triggered)

**To manually trigger a job:**
1. Navigate to Cruise Control → Portfolio Snapshots
2. Click "Generate Snapshots" button
3. Job will execute immediately
4. Check execution history table

---

## What Happens When Job Runs

**Scheduler → PortfolioSnapshotJob → Database**

1. Scheduler checks `t_job_scheduler_configs` for enabled jobs
2. At scheduled time (Friday 9 PM), triggers `PortfolioSnapshotJob.execute()`
3. Job queries all customers for tenant
4. For each customer:
   - Gets current portfolio holdings
   - Calculates month-end value
   - Inserts/updates row in `t_monthly_portfolio_snapshots`
5. Creates execution record in `t_job_executions`
6. Frontend can query execution history

---

## Next Steps After Verification

Once all checks pass:

1. ✅ **Commit and push changes** (server.ts)
2. ✅ **Deploy to staging/production**
3. ✅ **Test with real tenant signup**
4. ✅ **Monitor first scheduled job execution**
5. ✅ **Verify snapshots are created** in `t_monthly_portfolio_snapshots`

---

## Summary

**Files Modified:**
- ✅ `backend/src/server.ts` (Added routes + scheduler init)

**Files Verified (No changes needed):**
- ✅ `backend/src/services/tenantSeed.service.ts` (Already working)
- ✅ `backend/src/routes/jobs.routes.ts` (Already exists)
- ✅ `backend/src/services/jobScheduler.service.ts` (Already exists)
- ✅ `backend/src/services/jobs/portfolioSnapshot.job.ts` (Already exists)

**Database Tables Used:**
- ✅ `m_job_types` (Global job registry)
- ✅ `t_job_scheduler_configs` (Tenant-specific configs)
- ✅ `t_job_executions` (Execution history)
- ✅ `t_monthly_portfolio_snapshots` (Generated snapshots)

**Total Implementation Time:** ~10 minutes (only server.ts changes)

---

**Ready to test!** Follow the verification steps above after restarting your backend server.
