# Database Rebuild Steps

## The Problem
The initialization scripts are not running because PostgreSQL detects existing data in the volume.

## Solution: Complete Cleanup

Run these commands **on your local machine** (not in Claude Code):

### Step 1: Stop Everything
```bash
docker compose down
```

### Step 2: Verify Containers Are Stopped
```bash
docker compose ps
# Should show nothing or all stopped
```

### Step 3: Remove the Volume
```bash
# Method 1: Direct removal
docker volume rm kewalinvest_postgres_data

# If error "volume is in use":
docker volume rm -f kewalinvest_postgres_data

# If still fails, use compose:
docker compose down -v
```

### Step 4: Verify Volume is Gone
```bash
docker volume ls | grep kewal
# Should return NOTHING
```

### Step 5: Clean Docker System (Optional but Recommended)
```bash
docker system prune -f
```

### Step 6: Start Fresh
```bash
docker compose up -d postgres
```

### Step 7: Watch Initialization Logs
```bash
docker compose logs -f postgres
```

## What You Should See

**✅ GOOD - Initialization is running:**
```
Starting Database Initialization
Database: kewalinvest
Dropping all views...
Dropping all functions...
Creating tables...
Creating indexes...
Creating functions and views...
✓ Status constraint updated with pending_processing
```

**❌ BAD - Initialization skipped:**
```
PostgreSQL Database directory appears to contain a database; Skipping initialization
```

If you see the BAD message, the volume wasn't properly deleted. Go back to Step 3.

### Step 8: Verify Database Exists
```bash
docker compose exec postgres psql -U kewal_admin -l
# Should list "kewalinvest" database
```

### Step 9: Verify the Fix
```bash
# Check the constraint includes pending_processing
docker compose exec postgres psql -U kewal_admin -d kewalinvest -c "SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conname = 't_import_sessions_status_check';"

# Check views exist
docker compose exec postgres psql -U kewal_admin -d kewalinvest -c "SELECT viewname FROM pg_views WHERE schemaname='public' AND viewname LIKE 'v_import%';"
```

### Step 10: Start All Services
```bash
docker compose up -d
```

## If Volume Won't Delete

Try these in order:

1. **Stop all containers using postgres:**
   ```bash
   docker stop $(docker ps -q)
   docker volume rm kewalinvest_postgres_data
   ```

2. **Remove with prune:**
   ```bash
   docker compose down
   docker volume prune -f
   ```

3. **Nuclear option (removes ALL unused volumes):**
   ```bash
   docker compose down
   docker volume prune -a -f
   ```

4. **Check what's using the volume:**
   ```bash
   docker ps -a --filter volume=kewalinvest_postgres_data
   # Remove those containers first
   ```

## After Successful Rebuild

Your scheme import should now work without these errors:
- ✅ No more "violates check constraint" error
- ✅ No more "relation v_import_staging_progress does not exist" error
