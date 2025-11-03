# Goals Functionality - Database Setup Guide

## Overview

This document explains how to set up the database for the goals tracking functionality in KewalInvest.

## What Gets Installed

### 1. **Tables Created**
- `t_goal_alerts` - Alerts for goal performance issues
- `t_goal_progress_snapshots` - Historical tracking of goal progress
- `t_goal_scheme_allocations` - Scheme allocations for each goal

### 2. **Columns Added to t_jtbd_configurations**
- `is_in_watchlist` (BOOLEAN) - Whether goal is in watchlist
- `watchlist_reason` (TEXT) - Reason for watchlist addition
- `watchlist_added_at` (TIMESTAMP) - When added to watchlist

### 3. **Indexes Created**
- 11 optimized indexes for goal queries
- Partial indexes for watchlist and unacknowledged alerts
- Composite indexes for common query patterns

## Installation Methods

### Option 1: Quick Setup (Recommended for Local Testing)

Run the complete standalone script:

```bash
psql -U kewal_admin -d kewaldb -f backend/db/GOALS_FUNCTIONALITY_COMPLETE.sql
```

This script:
- ✅ Checks for existing tables/columns
- ✅ Migrates old column names
- ✅ Creates all tables and indexes
- ✅ Provides detailed progress output
- ✅ Verifies installation

### Option 2: Using Distribution Scripts (For Fresh Installs)

If setting up a new database:

```bash
cd backend/db/ditribution\ scripts/
psql -U kewal_admin -d kewaldb -f 01_init.sql
psql -U kewal_admin -d kewaldb -f 02_tables.sql
psql -U kewal_admin -d kewaldb -f 03_indexes_triggers.sql
psql -U kewal_admin -d kewaldb -f 04_functions_views_policies.sql
psql -U kewal_admin -d kewaldb -f 05_seed_data.sql
```

The goals tables are included in `02_tables.sql` and indexes in `03_indexes_triggers.sql`.

### Option 3: Migration Only (For Existing Databases)

If you already have the goal tables but need to add watchlist columns:

```bash
psql -U kewal_admin -d kewaldb -f backend/db/migrations/006_add_goal_watchlist_columns.sql
```

## Database Schema Details

### Goal Types Supported

The system supports three types of financial goals stored in `t_jtbd_configurations` with `jtbd_type = 'goal_tracking'`:

#### 1. Time-Based Goal
- **Fixed**: Target date
- **Flexible**: Target amount
- **Use Case**: Retirement planning
- **Calculations**: Projects corpus at target date with inflation adjustment

#### 2. Price-Based Goal
- **Fixed**: Target amount
- **Flexible**: Timeline
- **Use Case**: Major purchases (car, house, vacation)
- **Calculations**: Projects achievement date based on current savings rate

#### 3. Time & Price Goal
- **Fixed**: Both target date AND target amount
- **Complex**: Monte Carlo probability simulation
- **Use Case**: Education funding, weddings, specific milestones
- **Calculations**: Gap analysis, success probability, SIP recommendations

### Table Structure

#### t_jtbd_configurations (Extended for Goals)
```sql
CREATE TABLE t_jtbd_configurations (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER,
    is_live BOOLEAN,
    customer_id INTEGER,
    jtbd_type VARCHAR(50), -- 'goal_tracking' for goals
    title VARCHAR(255),
    description TEXT,
    priority VARCHAR(20),
    is_active BOOLEAN,
    config_data JSONB, -- Goal configuration JSON
    is_in_watchlist BOOLEAN,
    watchlist_added_at TIMESTAMP,
    watchlist_reason TEXT,
    next_alert_date DATE,
    created_by INTEGER,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

#### t_goal_alerts
```sql
CREATE TABLE t_goal_alerts (
    id SERIAL PRIMARY KEY,
    goal_id INTEGER REFERENCES t_jtbd_configurations(id),
    customer_id INTEGER,
    alert_type VARCHAR(50), -- behind_schedule, low_probability, etc.
    severity VARCHAR(20), -- critical, warning, info
    message TEXT,
    action_required VARCHAR(100),
    action_details JSONB,
    is_acknowledged BOOLEAN,
    acknowledged_at TIMESTAMP,
    created_at TIMESTAMP
);
```

#### t_goal_progress_snapshots
```sql
CREATE TABLE t_goal_progress_snapshots (
    id SERIAL PRIMARY KEY,
    goal_id INTEGER REFERENCES t_jtbd_configurations(id),
    snapshot_date DATE,
    current_value NUMERIC(15,2),
    monthly_contribution NUMERIC(15,2),
    projected_corpus NUMERIC(15,2),
    projected_achievement_date DATE,
    probability_of_success NUMERIC(5,2),
    on_track BOOLEAN,
    deviation_percentage NUMERIC(5,2),
    recalculation_trigger VARCHAR(50),
    created_at TIMESTAMP,
    UNIQUE(goal_id, snapshot_date)
);
```

#### t_goal_scheme_allocations
```sql
CREATE TABLE t_goal_scheme_allocations (
    id SERIAL PRIMARY KEY,
    goal_id INTEGER REFERENCES t_jtbd_configurations(id),
    customer_id INTEGER,
    scheme_id INTEGER,
    allocation_percentage NUMERIC(5,2), -- Must sum to 100 per goal
    created_at TIMESTAMP,
    UNIQUE(goal_id, scheme_id)
);
```

## Verification

After installation, verify with:

```sql
-- Check tables exist
SELECT tablename FROM pg_tables
WHERE tablename LIKE '%goal%'
ORDER BY tablename;

-- Should return:
-- t_goal_alerts
-- t_goal_progress_snapshots
-- t_goal_scheme_allocations

-- Check columns in t_jtbd_configurations
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 't_jtbd_configurations'
AND column_name LIKE '%watchlist%';

-- Should return:
-- is_in_watchlist | boolean
-- watchlist_added_at | timestamp without time zone
-- watchlist_reason | text

-- Check indexes
SELECT indexname FROM pg_indexes
WHERE indexname LIKE '%goal%'
ORDER BY indexname;

-- Should return 11+ indexes
```

## API Endpoints

Once database is set up, the following endpoints will be available:

### Goal Management
- `POST /api/goals` - Create goal
- `GET /api/goals/:id` - Get single goal
- `GET /api/goals/customer/:customerId` - List customer goals
- `PUT /api/goals/:id` - Update goal
- `DELETE /api/goals/:id` - Delete goal

### Progress Tracking
- `POST /api/goals/:id/recalculate` - Manual recalculation
- `POST /api/goals/customer/:customerId/recalculate` - Recalc all goals
- `GET /api/goals/customer/:customerId/summary` - Aggregated stats
- `GET /api/goals/:id/history` - Progress history
- `GET /api/goals/:id/tracking-status` - Performance tracking

### Watchlist
- `POST /api/goals/:id/watchlist` - Add to watchlist
- `DELETE /api/goals/:id/watchlist` - Remove from watchlist
- `GET /api/goals/customer/:customerId/watchlist` - List watchlist goals

### Allocation
- `GET /api/goals/customer/:customerId/allocation-utilization` - Scheme allocation tracking

## Testing

### 1. Test Database Setup
```bash
# Run the installation
psql -U kewal_admin -d kewaldb -f backend/db/GOALS_FUNCTIONALITY_COMPLETE.sql

# Check output for any errors
# You should see ✓ marks for each step
```

### 2. Test API (Backend Running)
```bash
# Get customer goals (replace 1 with actual customer ID)
curl http://localhost:5000/api/goals/customer/1?tenant_id=1&is_live=true

# Should return empty array [] if no goals yet
```

### 3. Test Frontend
- Navigate to a customer page
- Click on "Goals & Actions" tab
- Click "Create New Goal" button
- Select a goal type and fill in the form
- Submit and verify goal appears in the list

## Troubleshooting

### Error: "relation t_jtbd_configurations does not exist"
The base JTBD table is missing. Run the full distribution scripts (Option 2).

### Error: "column is_in_watchlist does not exist"
Run the migration script (Option 3) or the complete setup script (Option 1).

### Error: "foreign key constraint violation"
Ensure t_customers, t_users, t_schemes, and t_tenants tables exist first.

### No data appearing in frontend
1. Check backend logs for errors
2. Verify tenant_id and is_live parameters are correct
3. Check browser console for API errors
4. Verify user has permission to view the customer

## Files Updated

### Distribution Scripts (for new installations)
- `backend/db/ditribution scripts/02_tables.sql` - Goal tables + watchlist columns
- `backend/db/ditribution scripts/03_indexes_triggers.sql` - Goal indexes

### Migration Scripts (for existing databases)
- `backend/db/migrations/006_add_goal_watchlist_columns.sql` - Watchlist column migration

### Standalone Scripts (for local testing)
- `backend/db/GOALS_FUNCTIONALITY_COMPLETE.sql` - All-in-one setup script

## Next Steps

After successful database setup:

1. ✅ Start/restart the backend server
2. ✅ Clear browser cache and reload frontend
3. ✅ Test creating a goal through the UI
4. ✅ Test goal recalculation
5. ✅ Test adding goals to watchlist
6. ✅ Review goal progress charts and tracking

## Support

If you encounter issues:
1. Check the backend logs: `backend/logs/`
2. Verify database connection settings
3. Ensure all foreign key references exist
4. Check PostgreSQL version (9.6+ required)

## Additional Features to Enable

### Automated Recalculation (Optional)
To enable monthly auto-recalculation, uncomment the scheduler in:
- `backend/src/server.ts` or
- `backend/src/services/goal.recalculation.job.ts`

See the goals completion status document for more details.

---

**Document Version**: 1.0
**Last Updated**: November 3, 2025
**Author**: Claude AI Assistant
