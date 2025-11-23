# Migration Guide - Release 1.1 Phase 1

**Version:** 1.1.0
**Release Date:** November 23, 2025
**Feature:** Multi-Asset Portfolio Management System

---

## Overview

This guide provides step-by-step instructions for deploying Release 1.1 - Phase 1 to production. Follow all steps in order to ensure a smooth migration.

---

## Pre-Migration Checklist

- [ ] **Backup database** before running any migrations
- [ ] **Verify current schema** matches expected state
- [ ] **Check disk space** for database growth
- [ ] **Test on staging** environment first
- [ ] **Schedule maintenance window** if needed
- [ ] **Notify users** of deployment window

---

## Migration Paths

There are two migration paths depending on your database state:

### Path A: Existing Database (Run Migration)
Use this if you have an existing Kewal Invest database and need to upgrade to Phase 1.

### Path B: Fresh Install (Run Distribution Scripts)
Use this if you're setting up a new database from scratch.

---

## Path A: Existing Database Migration

### Step 1: Verify Current State

```bash
# Connect to database
psql -U postgres -d kewalinvest

# Check if m_asset_types table exists
\dt m_asset_types

# If it exists, Phase 1 may already be installed
# If it doesn't exist, proceed with migration
```

### Step 2: Backup Database

```bash
# Create backup
pg_dump -U postgres -d kewalinvest > kewalinvest_backup_$(date +%Y%m%d_%H%M%S).sql

# Verify backup file exists and has content
ls -lh kewalinvest_backup_*.sql
```

### Step 3: Run Migration Script

```bash
# Navigate to migrations directory
cd backend/db/migrations

# Run Phase 1 migration
psql -U postgres -d kewalinvest -f 017_add_investment_plan_fields.sql
```

**Expected Output:**
```
NOTICE: Creating Multi-Asset Portfolio Tables...
CREATE TABLE
CREATE TABLE
NOTICE: Creating indexes...
CREATE INDEX
CREATE INDEX
...
NOTICE: Phase 1 migration completed successfully
```

### Step 4: Verify Migration

```bash
# Connect to database
psql -U postgres -d kewalinvest

# Verify tables exist
\dt m_asset_types
\dt t_customer_asset_assignments

# Check table structure
\d m_asset_types
\d t_customer_asset_assignments

# Verify indexes
\di idx_asset_types_code
\di idx_customer_assets_customer

# Check for any errors
SELECT * FROM t_system_logs
WHERE level = 'error'
AND created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;
```

### Step 5: Seed Master Data

```bash
# Run seed data for asset types
psql -U postgres -d kewalinvest
```

```sql
-- Insert master asset types
INSERT INTO m_asset_types (asset_type_code, asset_type_name, category, default_assumption_rate, display_order, is_active) VALUES
('MF', 'Mutual Fund', 'equity', 12.00, 1, true),
('GOLD', 'Gold', 'commodity', 8.00, 2, true),
('EQUITY', 'Equity', 'equity', 15.00, 3, true),
('FD', 'Fixed Deposit', 'fixed_income', 6.50, 4, true),
('PPF', 'Public Provident Fund', 'fixed_income', 7.10, 5, true),
('EPF', 'Employee Provident Fund', 'fixed_income', 8.25, 6, true),
('NPS', 'National Pension System', 'equity', 10.00, 7, true),
('REAL_ESTATE', 'Real Estate', 'real_estate', 8.00, 8, true),
('INSURANCE', 'Insurance', 'insurance', 5.00, 9, true)
ON CONFLICT (asset_type_code) DO NOTHING;

-- Verify data
SELECT * FROM m_asset_types ORDER BY display_order;
```

**Expected Result:** 9 rows showing all asset types

---

## Path B: Fresh Install

### Step 1: Create Database

```bash
# Create database
createdb -U postgres kewalinvest

# Verify creation
psql -U postgres -l | grep kewalinvest
```

### Step 2: Run Distribution Scripts in Order

```bash
# Navigate to distribution scripts
cd "backend/db/ditribution scripts"

# Run scripts in order
psql -U postgres -d kewalinvest -f 01_init.sql
psql -U postgres -d kewalinvest -f 02_tables.sql
psql -U postgres -d kewalinvest -f 03_indexes_triggers.sql
psql -U postgres -d kewalinvest -f 04_functions_views_policies.sql
psql -U postgres -d kewalinvest -f 05_seed_data.sql
```

### Step 3: Verify Installation

```bash
# Connect to database
psql -U postgres -d kewalinvest

# Count tables (should be 30+)
SELECT COUNT(*) FROM information_schema.tables
WHERE table_schema = 'public' AND table_type = 'BASE TABLE';

# Verify Phase 1 tables exist
\dt m_asset_types
\dt t_customer_asset_assignments

# Check master data
SELECT * FROM m_asset_types ORDER BY display_order;
```

---

## Application Deployment

### Step 1: Update Backend Dependencies

```bash
cd backend

# Install any new dependencies
npm install

# Build TypeScript
npm run build
```

**Expected Output:**
```
✓ Compiled successfully
```

If you see TypeScript errors, DO NOT proceed. Fix errors first.

### Step 2: Update Frontend Dependencies

```bash
cd frontend

# Install any new dependencies
npm install

# Build production bundle
npm run build
```

**Expected Output:**
```
✓ Build complete
✓ Output directory: dist/
```

### Step 3: Deploy Backend

```bash
cd backend

# Stop current server (if using PM2)
pm2 stop kewalinvest-backend

# Start new version
pm2 start npm --name "kewalinvest-backend" -- start

# Or if not using PM2
npm start
```

### Step 4: Deploy Frontend

```bash
cd frontend

# Copy build to web server
# (Adjust path based on your setup)
rsync -av dist/ /var/www/kewalinvest/

# Or if using specific web server
npm run deploy
```

### Step 5: Verify Deployment

```bash
# Check backend health
curl http://localhost:5000/api/health

# Check frontend
curl http://localhost:3000

# Check logs for errors
pm2 logs kewalinvest-backend --lines 50
```

---

## Post-Deployment Testing

### Test 1: API Endpoints

```bash
# Get asset types (should return 9 types)
curl -X GET http://localhost:5000/api/asset-types \
  -H "Authorization: Bearer YOUR_TOKEN"

# Expected: JSON array with 9 asset types
```

### Test 2: Create Investment Plan

```bash
# Create test investment plan
curl -X POST http://localhost:5000/api/customers/1/investments \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "asset_type_id": 1,
    "principal_amount": 100000,
    "start_date": "2025-01-01",
    "has_started": true,
    "duration_years": 5,
    "investment_type": "one_time",
    "notes": "Test investment plan"
  }'

# Expected: Success response with created plan
```

### Test 3: Frontend UI

1. **Login to application**
2. **Navigate to customer profile**
3. **Click "Add Investment" button**
4. **Verify form displays:**
   - Asset type radio buttons (9 options)
   - Investment name field
   - Principal amount field
   - Start date picker
   - Duration selector (months/years)
   - Investment type radio buttons
   - Calculated end date display
5. **Create test investment plan**
6. **Verify it appears in customer's investment list**

### Test 4: Theme Support

1. **Switch to dark mode**
2. **Verify radio buttons use correct theme colors**
3. **Check all interactive elements**
4. **Switch back to light mode**
5. **Verify everything still works**

---

## Rollback Procedure

If something goes wrong, follow these steps to rollback:

### Step 1: Stop Application

```bash
pm2 stop kewalinvest-backend
# Stop frontend server
```

### Step 2: Restore Database

```bash
# Drop current database (BE CAREFUL!)
dropdb -U postgres kewalinvest

# Restore from backup
createdb -U postgres kewalinvest
psql -U postgres -d kewalinvest < kewalinvest_backup_TIMESTAMP.sql
```

### Step 3: Revert Code

```bash
# Checkout previous version
git checkout main  # or previous stable tag

# Rebuild
cd backend && npm run build
cd ../frontend && npm run build
```

### Step 4: Restart Application

```bash
pm2 restart kewalinvest-backend
# Restart frontend
```

---

## Troubleshooting

### Issue: Migration Script Fails

**Error:** `relation "m_asset_types" already exists`

**Solution:**
```sql
-- Check if table exists
\dt m_asset_types

-- If it exists, Phase 1 is already installed
-- Skip migration, just verify data
SELECT * FROM m_asset_types;
```

---

### Issue: TypeScript Build Errors

**Error:** `Cannot find module 'investmentPlan.types'`

**Solution:**
```bash
# Clean build
rm -rf dist/
npm run build

# If still failing, check import paths
grep -r "investmentPlan.types" src/
```

---

### Issue: Foreign Key Constraint Violations

**Error:** `violates foreign key constraint`

**Solution:**
```sql
-- Check referenced data exists
SELECT * FROM m_asset_types WHERE id = 1;

-- If missing, run seed data
-- See Step 5 in Path A above
```

---

### Issue: API Returns 404

**Error:** `GET /api/asset-types returns 404`

**Solution:**
```bash
# Check server.ts has route registered
grep "assetType" backend/src/server.ts

# Verify route file exists
ls -la backend/src/routes/assetType.routes.ts

# Restart backend
pm2 restart kewalinvest-backend
```

---

### Issue: Frontend Shows Old Code

**Error:** Changes not visible in UI

**Solution:**
```bash
# Clear browser cache
# Hard refresh: Ctrl+Shift+R (or Cmd+Shift+R on Mac)

# Rebuild frontend
cd frontend
rm -rf dist/
npm run build

# Clear CDN cache if using one
```

---

## Performance Considerations

### Database Indexes

All necessary indexes are created automatically. Monitor query performance:

```sql
-- Check index usage
SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read
FROM pg_stat_user_indexes
WHERE tablename IN ('m_asset_types', 't_customer_asset_assignments')
ORDER BY idx_scan DESC;

-- If idx_scan is 0, index may be unused
```

### Query Optimization

```sql
-- Enable query timing
\timing on

-- Test critical queries
EXPLAIN ANALYZE
SELECT * FROM t_customer_asset_assignments
WHERE customer_id = 1 AND is_active = true;

-- Should use idx_customer_assets_customer
```

---

## Monitoring

### Key Metrics to Monitor

1. **Database Size**
   ```sql
   SELECT pg_size_pretty(pg_database_size('kewalinvest'));
   ```

2. **Table Row Counts**
   ```sql
   SELECT
     schemaname,
     tablename,
     n_live_tup AS row_count
   FROM pg_stat_user_tables
   WHERE tablename IN ('m_asset_types', 't_customer_asset_assignments')
   ORDER BY n_live_tup DESC;
   ```

3. **API Response Times**
   - Monitor `/api/asset-types` endpoint
   - Monitor `/api/customers/:id/investments` endpoint
   - Alert if response time > 500ms

4. **Error Logs**
   ```sql
   SELECT level, message, created_at
   FROM t_system_logs
   WHERE level = 'error'
   AND created_at > NOW() - INTERVAL '24 hours'
   ORDER BY created_at DESC
   LIMIT 20;
   ```

---

## Post-Deployment Checklist

- [ ] Database migration completed successfully
- [ ] Master data seeded (9 asset types)
- [ ] Backend build successful
- [ ] Frontend build successful
- [ ] Backend deployed and running
- [ ] Frontend deployed and accessible
- [ ] API endpoints responding correctly
- [ ] UI displays correctly in light mode
- [ ] UI displays correctly in dark mode
- [ ] Can create investment plan
- [ ] Can view investment plans
- [ ] Can update investment plan
- [ ] Can delete investment plan
- [ ] All tests passing
- [ ] No errors in logs
- [ ] Performance metrics normal
- [ ] Backup verified and stored safely

---

## Support Contacts

**Database Issues:** DBA Team
**Backend Issues:** Backend Development Team
**Frontend Issues:** Frontend Development Team
**Infrastructure:** DevOps Team

---

## Appendix A: Environment Variables

Ensure these environment variables are set:

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=kewalinvest
DB_USER=postgres
DB_PASSWORD=***

# Application
NODE_ENV=production
PORT=5000
API_BASE_URL=http://localhost:5000/api

# JWT
JWT_SECRET=***
JWT_EXPIRY=24h
```

---

## Appendix B: SQL Verification Queries

```sql
-- Check all Phase 1 tables exist
SELECT
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public'
AND table_name IN ('m_asset_types', 't_customer_asset_assignments')
ORDER BY table_name;

-- Check all Phase 1 indexes exist
SELECT indexname, tablename
FROM pg_indexes
WHERE tablename IN ('m_asset_types', 't_customer_asset_assignments')
ORDER BY tablename, indexname;

-- Check all Phase 1 triggers exist
SELECT trigger_name, event_object_table
FROM information_schema.triggers
WHERE event_object_table IN ('m_asset_types', 't_customer_asset_assignments')
ORDER BY event_object_table, trigger_name;
```

---

**End of Migration Guide**

For additional help, refer to:
- RELEASE-1.1-PHASE-1.md (Feature documentation)
- LESSONS-LEARNT-PHASE-1.md (Architecture patterns)
