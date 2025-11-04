# Database Distribution Scripts

## Overview
This folder contains SQL scripts for setting up and deploying the Kewalinvest database.

## Script Execution Order

**IMPORTANT**: Scripts must be executed in the following order:

1. **01_init.sql** - Database initialization, extensions, and basic setup
2. **02_tables.sql** - All table creation (main data structures)
3. **03_indexes_triggers.sql** - Indexes for performance and triggers for automation
4. **04_functions_views_policies.sql** - Stored procedures, views, and security policies
5. **05_seed_data.sql** - Initial seed data (reference data, admin user, etc.)

## Quick Deployment

### For New Database (Fresh Install)

```bash
# Create database
createdb kewalinvest_dev

# Run all scripts in order
cd "backend/db/ditribution scripts"
psql -U your_username -d kewalinvest_dev -f 01_init.sql
psql -U your_username -d kewalinvest_dev -f 02_tables.sql
psql -U your_username -d kewalinvest_dev -f 03_indexes_triggers.sql
psql -U your_username -d kewalinvest_dev -f 04_functions_views_policies.sql
psql -U your_username -d kewalinvest_dev -f 05_seed_data.sql
```

### Using the Automated Script

```bash
# Make script executable
chmod +x deploy_database.sh

# Run deployment
./deploy_database.sh development

# Or for staging
./deploy_database.sh staging

# Or for production
./deploy_database.sh production
```

## Individual Script Details

### 01_init.sql
**Purpose**: Initialize database with required extensions and configurations

**Contains**:
- PostgreSQL extensions (uuid-ossp, pgcrypto, etc.)
- Database-level settings
- Schema creation (if needed)
- Role/permission setup

**Safe to Re-run**: Yes (uses IF NOT EXISTS)

---

### 02_tables.sql
**Purpose**: Create all application tables

**Contains**:
- User and authentication tables (t_users, t_tenants)
- Customer management (t_customers, t_contacts, t_addresses)
- Portfolio data (t_transactions, t_nav_schemes_master, t_nav_data)
- Market data (m_market_indices, t_market_data)
- Goal tracking (t_goals, t_goal_history)
- Meeting management (t_customer_meetings)
- Jobs and monitoring (t_job_executions, t_job_scheduler_config)
- Import/ETL (t_import_sessions, t_staging_*)

**Safe to Re-run**: Yes if database is empty (uses IF NOT EXISTS)

**Warning**: Running on existing database may cause errors if tables exist

---

### 03_indexes_triggers.sql
**Purpose**: Add performance indexes and automation triggers

**Contains**:
- **Indexes**:
  - Primary key indexes
  - Foreign key indexes
  - Multi-tenant composite indexes (tenant_id, is_live)
  - Search indexes (customer names, emails)
  - Performance indexes (date ranges, status filters)

- **Triggers**:
  - Auto-update timestamps (updated_at columns)
  - Audit logging triggers
  - Data validation triggers
  - Cascade update triggers

**Safe to Re-run**: Partially (DROP IF EXISTS used for some)

**Note**: Some triggers may already exist from previous runs

---

### 04_functions_views_policies.sql
**Purpose**: Create stored procedures, views, and security policies

**Contains**:
- **Functions/Procedures**:
  - Duplicate checking functions
  - Transaction processing functions
  - Metrics calculation functions
  - Data cleanup functions

- **Views**:
  - Customer portfolio views
  - Transaction summary views
  - NAV/Market data views
  - Dashboard statistic views

- **Policies** (if using Row-Level Security):
  - Multi-tenant data isolation
  - Role-based access control

**Safe to Re-run**: Yes (uses CREATE OR REPLACE)

---

### 05_seed_data.sql
**Purpose**: Insert initial reference and test data

**Contains**:
- Default admin user
- Reference data (meeting types, transaction types, etc.)
- Sample NAV schemes (if needed)
- Sample market indices
- Test customers (development only)

**Safe to Re-run**: No - will cause duplicate key errors

**Recommendation**: Only run once on fresh database

**For Existing Database**: Comment out data that already exists

---

## Environment-Specific Deployment

### Development Environment

```bash
# Create database
createdb kewalinvest_dev

# Run full deployment
./deploy_database.sh development

# Verify
psql -U kewal_admin -d kewalinvest_dev -c "\dt"
```

**Includes**:
- All tables and indexes
- Test data and sample records
- Relaxed security settings

---

### Staging Environment

```bash
# Create database
createdb kewalinvest_staging

# Run deployment
./deploy_database.sh staging

# Verify
psql -U kewal_staging_user -d kewalinvest_staging -c "\dt"
```

**Includes**:
- All tables and indexes
- Minimal seed data (no test data)
- Production-like security settings

---

### Production Environment

```bash
# IMPORTANT: Backup existing database first!
pg_dump kewalinvest_prod > backup_$(date +%Y%m%d_%H%M%S).sql

# Create database (if new)
createdb kewalinvest_prod

# Run deployment WITH CAUTION
./deploy_database.sh production

# Verify
psql -U kewal_prod_user -d kewalinvest_prod -c "\dt"
```

**Includes**:
- All tables and indexes
- Minimal seed data only
- Strict security settings
- Production-grade configurations

**WARNING**: Never run 05_seed_data.sql on production if database already has data!

---

## Verification Checklist

After running scripts, verify the following:

### Tables Created
```sql
-- Should return ~30+ tables
SELECT COUNT(*) FROM information_schema.tables
WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
```

### Indexes Created
```sql
-- Should return 100+ indexes
SELECT COUNT(*) FROM pg_indexes
WHERE schemaname = 'public';
```

### Triggers Created
```sql
-- Should return 20+ triggers
SELECT COUNT(*) FROM information_schema.triggers
WHERE trigger_schema = 'public';
```

### Functions Created
```sql
-- Should return 10+ functions
SELECT COUNT(*) FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public';
```

### Seed Data Loaded
```sql
-- Check admin user exists
SELECT email, role FROM t_users WHERE role = 'super_admin';

-- Check tenants exist
SELECT name FROM t_tenants;
```

---

## Troubleshooting

### Error: "relation already exists"

**Problem**: Table already exists in database

**Solution**:
- Check if this is a fresh install or update
- For fresh install: Drop and recreate database
- For update: Skip 02_tables.sql or modify to use ALTER TABLE

```bash
# Drop and recreate (CAUTION: Deletes all data!)
dropdb kewalinvest_dev
createdb kewalinvest_dev
```

---

### Error: "permission denied"

**Problem**: Insufficient database permissions

**Solution**:
```sql
-- Grant permissions to user
ALTER DATABASE kewalinvest_dev OWNER TO kewal_admin;

-- Grant schema permissions
GRANT ALL ON SCHEMA public TO kewal_admin;
GRANT ALL ON ALL TABLES IN SCHEMA public TO kewal_admin;
```

---

### Error: "could not open extension control file"

**Problem**: Required PostgreSQL extension not installed

**Solution**:
```bash
# Install PostgreSQL contrib package
sudo apt-get install postgresql-contrib

# Or on macOS
brew install postgresql-contrib
```

---

### Error: "duplicate key value violates unique constraint"

**Problem**: Seed data already exists

**Solution**:
- Skip 05_seed_data.sql if re-running
- Or modify script to use INSERT ... ON CONFLICT DO NOTHING

---

## Migration from Previous Version

If upgrading from an earlier version:

1. **Backup Database**
```bash
pg_dump kewalinvest_prod > backup_before_migration.sql
```

2. **Check Current Schema**
```bash
psql -d kewalinvest_prod -c "\d"
```

3. **Run Migrations Only** (instead of full scripts)
```bash
# Check migrations folder
cd ../migrations
ls -la

# Run specific migrations
psql -d kewalinvest_prod -f 001_add_meetings_table.sql
```

4. **Verify Migration**
```bash
psql -d kewalinvest_prod -c "\d t_customer_meetings"
```

---

## Rollback Procedure

If deployment fails:

1. **Restore from Backup**
```bash
# Drop failed database
dropdb kewalinvest_dev

# Recreate
createdb kewalinvest_dev

# Restore backup
psql -d kewalinvest_dev < backup_before_deployment.sql
```

2. **Identify Failed Script**
- Check PostgreSQL logs
- Review error message
- Fix script and retry

---

## Best Practices

1. **Always Backup First**
   - Before any database changes
   - Especially in staging/production

2. **Test on Development First**
   - Run full deployment on dev
   - Verify all features work
   - Then deploy to staging/production

3. **Use Transactions**
   - Wrap scripts in BEGIN/COMMIT
   - Easy rollback on error

4. **Version Control**
   - Keep scripts in Git
   - Tag releases with database version

5. **Document Changes**
   - Add comments to scripts
   - Update this README for new scripts

---

## Script Maintenance

### Adding New Tables

1. Add to `02_tables.sql`
2. Add indexes to `03_indexes_triggers.sql`
3. Update this README
4. Create migration script in ../migrations/

### Adding New Features

1. Update relevant script (functions, views, etc.)
2. Test on development
3. Create migration for existing databases
4. Update version documentation

---

## Contact

For issues or questions about database deployment:
- Check backend logs
- Review PostgreSQL error messages
- Consult with database administrator

---

**Last Updated**: November 4, 2025
**Database Version**: 1.1
**Compatible With**: PostgreSQL 13+
