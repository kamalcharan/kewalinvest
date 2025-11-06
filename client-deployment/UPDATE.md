# Update Deployment Guide

## Overview

The `update.sh` script allows you to update an existing KewalInvest deployment with the latest frontend and backend code **without losing any data**.

## When to Use This Script

Use `update.sh` when:
- ✅ You have an existing installation running
- ✅ You want to update to the latest version
- ✅ You want to preserve all your data (database, configurations)
- ✅ New Docker images have been pushed to Docker Hub

**Don't use this script for:**
- ❌ First-time installation (use `deploy.sh` instead)
- ❌ Database corruption (use database restore procedures)

## Quick Start

```bash
# Navigate to deployment directory
cd client-deployment

# Run the update script
./update.sh
```

## What the Script Does

### 1. Pre-Update Backup
- ✅ Creates automatic database backup in `backups/` folder
- ✅ Backup filename includes timestamp: `YYYYMMDD_HHMMSS/kewalinvest_backup.sql`

### 2. Pull Latest Images
- ✅ Pulls latest frontend image from Docker Hub
- ✅ Pulls latest backend image from Docker Hub
- ✅ Uses registry and tag from `.env` file

### 3. Restart Services
- ✅ Stops running containers
- ✅ Starts new containers with updated images
- ✅ **Preserves all volumes** (database data, pgAdmin config)

### 4. Health Checks
- ✅ Verifies database connectivity
- ✅ Verifies backend API is responding
- ✅ Shows container status

### 5. Optional Database Migrations
- ✅ Optionally applies schema updates
- ✅ Safe to skip if no database changes

## Step-by-Step Process

### Step 1: Check Current Status

```bash
# View running containers
docker-compose -f docker-compose.prod.yml ps

# Check current versions
docker images | grep kewalinvest
```

### Step 2: Ensure .env File Exists

Your `.env` file should have:

```env
DOCKER_REGISTRY=vikuna
IMAGE_TAG=latest
```

To update to a specific version:

```env
IMAGE_TAG=v1.2.0
```

### Step 3: Run Update Script

```bash
./update.sh
```

The script will:
1. Show configuration
2. Ask for confirmation
3. Create backup
4. Pull latest images
5. Restart services
6. Verify health

### Step 4: Verify Update

```bash
# Check all services are running
docker-compose -f docker-compose.prod.yml ps

# Test backend API
curl http://localhost:8080/health

# Test frontend
curl http://localhost:3000

# View logs if needed
docker-compose -f docker-compose.prod.yml logs -f backend
docker-compose -f docker-compose.prod.yml logs -f frontend
```

## Database Migrations

### When to Apply Migrations

Apply migrations when:
- ✅ Database schema has changed (new tables, columns, etc.)
- ✅ New indexes or triggers added
- ✅ Views or functions updated

Skip migrations when:
- ❌ Only frontend code changed (UI updates, styling)
- ❌ Only backend logic changed (no schema changes)

### Migration Files Applied

When you choose to apply migrations, these files are executed:

1. `database/03_indexes_triggers.sql` - Index and trigger updates
2. `database/04_functions_views_policies.sql` - Function and view updates
3. `database/06_fix_meetings_table.sql` - Meetings table fixes

### Manual Migration

If you need to apply specific migration files:

```bash
# Apply a specific migration
docker exec -i kewalinvest_db psql -U kewal_admin kewalinvest < database/your_migration.sql
```

## Rollback Procedures

### Rollback to Previous Version

If the update causes issues:

```bash
# 1. Stop current containers
docker-compose -f docker-compose.prod.yml down

# 2. Edit .env to use previous version
# Change IMAGE_TAG to previous version
nano .env

# 3. Start with previous version
docker-compose -f docker-compose.prod.yml up -d
```

### Restore from Backup

If database issues occur:

```bash
# 1. Find your backup
ls -la backups/

# 2. Restore database
docker exec -i kewalinvest_db psql -U kewal_admin kewalinvest < backups/20250106_143000/kewalinvest_backup.sql

# 3. Restart services
docker-compose -f docker-compose.prod.yml restart
```

## Troubleshooting

### Issue: "Failed to Pull Docker Images"

**Cause:** Images not available on Docker Hub or network issues

**Solution:**
1. Check internet connection
2. Verify `.env` has correct registry/tag
3. Contact support if images are missing

```bash
# Test Docker Hub connectivity
docker pull hello-world

# Check current .env configuration
cat .env | grep -E 'DOCKER_REGISTRY|IMAGE_TAG'
```

### Issue: "Database failed to start"

**Cause:** Database container issues or volume corruption

**Solution:**
```bash
# Check database logs
docker-compose -f docker-compose.prod.yml logs database

# Restart database container
docker-compose -f docker-compose.prod.yml restart database

# If still failing, restore from backup
```

### Issue: "Backend is not ready"

**Cause:** Backend startup taking longer than expected

**Solution:**
```bash
# Check backend logs
docker-compose -f docker-compose.prod.yml logs backend

# Wait a bit longer and check again
sleep 10
curl http://localhost:8080/health

# Restart backend if needed
docker-compose -f docker-compose.prod.yml restart backend
```

### Issue: "Migration failed"

**Cause:** Database schema conflict or migration syntax error

**Solution:**
1. Don't panic - data is still intact
2. Check migration logs in `/tmp/migration_*.log`
3. Apply migrations manually if needed
4. Contact support for schema conflicts

## Best Practices

### Before Updating

1. ✅ **Notify users** - Plan for brief downtime
2. ✅ **Test in staging** - If you have a test environment
3. ✅ **Review changelog** - Know what's changing
4. ✅ **Check disk space** - Ensure enough space for backups

```bash
# Check disk space
df -h

# Clean old Docker images if needed
docker image prune -a
```

### During Update

1. ✅ **Watch the output** - Don't close terminal
2. ✅ **Note any errors** - Save error messages
3. ✅ **Be patient** - Large images take time to download

### After Update

1. ✅ **Test key features** - Verify everything works
2. ✅ **Check logs** - Look for errors
3. ✅ **Monitor performance** - Ensure stability
4. ✅ **Keep backups** - Don't delete immediately

## Update Frequency

### Recommended Schedule

- **Security patches:** Apply immediately
- **Bug fixes:** Weekly or as needed
- **Feature updates:** Monthly or quarterly
- **Major versions:** Plan and test carefully

### Checking for Updates

Ask your vendor or check documentation for:
- Latest version numbers
- Changelog/release notes
- Breaking changes
- Migration requirements

## Advanced Options

### Update Only Frontend

```bash
# Pull only frontend image
docker-compose -f docker-compose.prod.yml pull frontend

# Restart only frontend
docker-compose -f docker-compose.prod.yml up -d --no-deps frontend
```

### Update Only Backend

```bash
# Pull only backend image
docker-compose -f docker-compose.prod.yml pull backend

# Restart only backend
docker-compose -f docker-compose.prod.yml up -d --no-deps backend
```

### Zero-Downtime Update

For production environments with high availability requirements:

1. Set up load balancer
2. Run multiple instances
3. Update instances one at a time
4. Use health checks for traffic routing

## Version Management

### Using Semantic Versioning

```env
# Patch update (bug fixes)
IMAGE_TAG=v1.2.3

# Minor update (new features, backward compatible)
IMAGE_TAG=v1.3.0

# Major update (breaking changes)
IMAGE_TAG=v2.0.0
```

### Pinning to Specific Versions

**Recommended for production:**

```env
# Use specific version
IMAGE_TAG=v1.2.0
```

**Not recommended for production:**

```env
# Using latest (unpredictable)
IMAGE_TAG=latest
```

## Support

If you encounter issues:

1. 📧 **Email:** support@kewalinvest.com
2. 📱 **Phone:** (check documentation)
3. 💬 **Slack/Chat:** (if available)
4. 📚 **Documentation:** Check README files

## Appendix: Manual Update Steps

If `update.sh` doesn't work, follow these manual steps:

```bash
# 1. Create backup
docker exec kewalinvest_db pg_dump -U kewal_admin kewalinvest > backup.sql

# 2. Pull images
docker-compose -f docker-compose.prod.yml pull

# 3. Stop containers
docker-compose -f docker-compose.prod.yml down

# 4. Start containers
docker-compose -f docker-compose.prod.yml up -d

# 5. Verify
docker-compose -f docker-compose.prod.yml ps
```

## Related Scripts

- `deploy.sh` - Fresh installation (deletes all data)
- `build-and-push.sh` - For developers to build and publish images
- `configure.sh` - Initial configuration setup

---

**Last Updated:** 2025-01-06
**Script Version:** 1.0
**Compatible With:** KewalInvest v1.x
