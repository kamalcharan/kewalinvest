# Database Initialization Fix

## Problem Summary

Your fresh database setup had two critical issues:

1. **Missing status constraint**: The `t_import_sessions` table constraint was missing the `'pending_processing'` status value
2. **Missing views**: The `v_import_staging_progress` view was not created

## What Was Fixed

### 1. Created `/backend/db/init.sql`
This patch file applies critical fixes after the base schema is loaded:
- Updates the `t_import_sessions_status_check` constraint to include all statuses:
  - `'pending'`
  - `'staged'`
  - `'pending_processing'` ← **Added**
  - `'processing'`
  - `'completed'`
  - `'completed_with_errors'`
  - `'failed'`
  - `'cancelled'`
- Recreates `v_import_staging_statistics` view
- Recreates `v_import_staging_progress` view

### 2. Updated `docker-compose.yml`
Modified the postgres service volumes to load multiple SQL files in order:
```yaml
volumes:
  - postgres_data:/var/lib/postgresql/data
  - ./backend/db/current_schema_utf8.sql:/docker-entrypoint-initdb.d/01_schema.sql
  - ./backend/db/init.sql:/docker-entrypoint-initdb.d/02_patches.sql
```

## How to Apply the Fix

### Option 1: Automatic Rebuild (Recommended)

Run the provided script:
```bash
./rebuild_database.sh
```

### Option 2: Manual Steps

1. **Stop all containers:**
   ```bash
   docker compose down
   ```

2. **Remove the postgres volume (⚠️ This will delete all data):**
   ```bash
   docker volume rm kewalinvest_postgres_data
   ```

3. **Start the database service:**
   ```bash
   docker compose up -d postgres
   ```

4. **Wait for initialization (check logs):**
   ```bash
   docker compose logs -f postgres
   ```
   Look for messages like:
   - `"Database initialization patches applied"`
   - `"✓ Status constraint fixed"`
   - `"✓ Progress view created"`

5. **Start remaining services:**
   ```bash
   docker compose up -d
   ```

### Option 3: Apply Patches to Existing Database

If you want to keep your data and just apply the fixes:

```bash
# Connect to the database
docker compose exec postgres psql -U kewal_admin -d kewalinvest

# Run these SQL commands:

-- Fix the status constraint
ALTER TABLE t_import_sessions DROP CONSTRAINT IF EXISTS t_import_sessions_status_check;
ALTER TABLE t_import_sessions
ADD CONSTRAINT t_import_sessions_status_check
CHECK (status IN ('pending', 'staged', 'pending_processing', 'processing', 'completed', 'completed_with_errors', 'failed', 'cancelled'));

-- Recreate the statistics view
CREATE OR REPLACE VIEW v_import_staging_statistics AS
SELECT
    session_id,
    tenant_id,
    is_live,
    import_type,
    COUNT(*) as total_records,
    COUNT(*) FILTER (WHERE processing_status = 'pending') as pending_count,
    COUNT(*) FILTER (WHERE processing_status = 'processing') as processing_count,
    COUNT(*) FILTER (WHERE processing_status = 'completed') as completed_count,
    COUNT(*) FILTER (WHERE processing_status = 'error') as error_count,
    COUNT(*) FILTER (WHERE processing_status = 'skipped') as skipped_count,
    COUNT(*) FILTER (WHERE processing_status = 'duplicate') as duplicate_count,
    COUNT(*) FILTER (WHERE processing_status = 'orphan') as orphan_count,
    ROUND(
        (COUNT(*) FILTER (WHERE processing_status IN ('completed', 'skipped', 'duplicate'))::NUMERIC /
        NULLIF(COUNT(*)::NUMERIC, 0)) * 100,
        2
    ) as success_rate,
    MIN(processed_at) as first_processed_at,
    MAX(processed_at) as last_processed_at,
    MAX(retry_count) as max_retries
FROM t_import_staging_data
GROUP BY session_id, tenant_id, is_live, import_type;

-- Recreate the progress view
CREATE OR REPLACE VIEW v_import_staging_progress AS
SELECT
    s.id AS session_id,
    s.session_name,
    s.import_type,
    s.status AS session_status,
    s.staging_total_rows,
    s.staging_processed_rows,
    s.staging_successful_rows,
    s.staging_failed_rows,
    s.staging_skipped_rows,
    COALESCE(st.orphan_count, 0) as orphan_records,
    CASE
        WHEN s.staging_total_rows > 0
        THEN ROUND((s.staging_processed_rows::NUMERIC / s.staging_total_rows::NUMERIC) * 100, 2)
        ELSE 0
    END AS progress_percentage,
    CASE
        WHEN s.processing_started_at IS NOT NULL AND s.staging_processed_rows > 0
        THEN EXTRACT(EPOCH FROM (COALESCE(s.processing_completed_at, NOW()) - s.processing_started_at)) / s.staging_processed_rows
        ELSE NULL
    END AS avg_seconds_per_record,
    CASE
        WHEN s.processing_started_at IS NOT NULL
        AND s.staging_processed_rows > 0
        AND s.staging_total_rows > s.staging_processed_rows
        AND s.status = 'processing'
        THEN ROUND((EXTRACT(EPOCH FROM (NOW() - s.processing_started_at)) / s.staging_processed_rows) * (s.staging_total_rows - s.staging_processed_rows))
        ELSE NULL
    END AS estimated_seconds_remaining
FROM t_import_sessions s
LEFT JOIN v_import_staging_statistics st ON s.id = st.session_id;
```

## Verification

After applying the fix, verify everything is working:

```bash
# Check constraint
docker compose exec postgres psql -U kewal_admin -d kewalinvest -c \
  "SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conname = 't_import_sessions_status_check';"

# Check views
docker compose exec postgres psql -U kewal_admin -d kewalinvest -c \
  "SELECT viewname FROM pg_views WHERE schemaname='public' AND viewname LIKE 'v_import_staging%';"
```

You should see:
- The constraint definition including `'pending_processing'::text`
- Both `v_import_staging_statistics` and `v_import_staging_progress` views listed

## Testing the Import

Try importing your scheme data again:
1. Upload your scheme file
2. The import should now work without the constraint violation error
3. The progress view should display correctly

## Files Modified

- ✅ `/backend/db/init.sql` - Created (database patch file)
- ✅ `/docker-compose.yml` - Updated (postgres volume mounts)
- ✅ `/rebuild_database.sh` - Created (helper script)
- ✅ This documentation file

## Next Steps

1. Run the rebuild script or apply patches manually
2. Test the scheme import functionality
3. Verify that the import progress displays correctly
4. If you encounter any issues, check the logs:
   ```bash
   docker compose logs postgres
   docker compose logs backend
   ```
