# KewalInvest - Deployment Guide

## 🚀 For Customers: Quick Start (2 Commands)

```bash
./configure.sh    # Step 1: Auto-generate secure configuration
./deploy.sh       # Step 2: Deploy application
```

That's it! Your application will be running at **http://localhost:3000**

---

## 👨‍💻 For Developers: Build Images First

**IMPORTANT:** Before distributing this package to customers, you MUST build and push Docker images:

```bash
cd client-deployment
./configure.sh           # Create .env file with registry settings
./build-and-push.sh      # Build and push images to Docker Hub
```

This will build and push:
- `vikuna/kewalinvest-backend:latest` (Node.js with production build)
- `vikuna/kewalinvest-frontend:latest` (React production build + serve)

Only AFTER pushing images should you package and distribute the `client-deployment` folder.

---

## Table of Contents

- [Prerequisites](#prerequisites)
- [Installation Steps](#installation-steps)
- [Accessing the Application](#accessing-the-application)
- [Troubleshooting](#troubleshooting)
- [Backup & Restore](#backup--restore)
- [Updating](#updating)
- [Uninstallation](#uninstallation)

---

## Prerequisites

### System Requirements

**Minimum:**
- **RAM**: 8 GB
- **Disk Space**: 20 GB free
- **CPU**: 4 cores
- **OS**: Windows 10/11, macOS 11+, or Ubuntu 20.04+

**Recommended:**
- **RAM**: 16 GB
- **Disk Space**: 50 GB SSD
- **CPU**: 8 cores

### Required Software

**Docker Desktop** (version 4.25.0 or higher)

- **Windows/Mac**: Download from https://www.docker.com/products/docker-desktop
- **Linux**: Follow instructions at https://docs.docker.com/desktop/install/linux-install/

**Verify Docker is installed:**
```bash
docker --version
docker-compose --version
```

---

## Installation Steps

### Step 1: Download & Extract

1. Download the KewalInvest deployment package
2. Extract to a folder (e.g., `C:\KewalInvest` or `~/kewalinvest`)
3. Open Terminal/Command Prompt in that folder

### Step 2: Run Configuration Wizard

**On macOS/Linux:**
```bash
./configure.sh
```

**On Windows PowerShell:**
```powershell
bash configure.sh
```

The wizard will:
- ✅ Auto-generate secure passwords
- ✅ Create configuration file
- ✅ Save your credentials safely

**Just press Enter to accept defaults!**

### Step 3: Deploy Application

```bash
./deploy.sh
```

This will:
1. Pull Docker images
2. Start all services
3. Initialize database
4. Verify deployment

**Duration**: 5-10 minutes (depending on internet speed)

### Step 4: Verify Installation

Open your browser and go to:
- **Application**: http://localhost:3000
- **pgAdmin** (Database Manager): http://localhost:5050

---

## Accessing the Application

After deployment completes, you'll see a screen like this:

```
========================================
✅ Clean Installation Complete!
========================================

🌐 Access Points:
   Frontend:  http://localhost:3000
   Backend:   http://localhost:8080
   pgAdmin:   http://localhost:5050
```

### Login Credentials

Check the file `.credentials.txt` in the deployment folder.

**⚠️ IMPORTANT**: Keep this file secure!

### First Login

1. Go to http://localhost:3000
2. Use credentials from `.credentials.txt`
3. Change password on first login

---

## Troubleshooting

### Issue: "Docker is not running"

**Solution:**
1. Start Docker Desktop
2. Wait for it to fully start (whale icon turns blue)
3. Run `./deploy.sh` again

### Issue: "Port already in use"

**Error:**
```
Error: bind: address already in use
```

**Solution:**

Find what's using the port:
```bash
# On macOS/Linux
lsof -i :3000

# On Windows
netstat -ano | findstr :3000
```

Either:
1. Stop the conflicting application, OR
2. Change ports in `.env` file:
   ```env
   FRONTEND_PORT=3001
   BACKEND_PORT=8081
   ```

### Issue: "Out of disk space"

**Solution:**
1. Clean up Docker:
   ```bash
   docker system prune -a
   ```
2. Free up at least 20GB disk space
3. Run `./deploy.sh` again

### Issue: "Database initialization failed"

**Solution:**
1. Stop all containers:
   ```bash
   docker-compose -f docker-compose.prod.yml down
   ```
2. Remove volumes:
   ```bash
   docker volume rm kewalinvest_postgres_data
   ```
3. Run `./deploy.sh` again

### Still Having Issues?

1. Check logs:
   ```bash
   docker-compose -f docker-compose.prod.yml logs backend
   docker-compose -f docker-compose.prod.yml logs frontend
   ```

2. Verify all containers are running:
   ```bash
   docker-compose -f docker-compose.prod.yml ps
   ```

3. Contact support with the log output

---

## Backup & Restore

### Creating a Backup

```bash
# Create backup directory
mkdir -p backups

# Backup database
docker exec kewalinvest_db pg_dump -U kewal_admin kewalinvest > backups/backup_$(date +%Y%m%d_%H%M%S).sql

# Backup volumes
docker run --rm \
  -v kewalinvest_postgres_data:/data \
  -v $(pwd)/backups:/backup \
  alpine tar czf /backup/volumes_$(date +%Y%m%d_%H%M%S).tar.gz /data
```

### Restoring from Backup

```bash
# Stop application
docker-compose -f docker-compose.prod.yml down

# Restore database
cat backups/backup_YYYYMMDD_HHMMSS.sql | \
  docker exec -i kewalinvest_db psql -U kewal_admin kewalinvest

# Start application
docker-compose -f docker-compose.prod.yml up -d
```

---

## Updating

### Easy Update (Recommended)

Use the automated update script to safely update your installation:

```bash
./update.sh
```

This will:
- ✅ Automatically create database backup
- ✅ Pull latest images from Docker Hub
- ✅ Restart services without data loss
- ✅ Verify health after update
- ✅ Optional database migration support

**📖 For detailed update instructions, see [UPDATE.md](UPDATE.md)**

### Manual Update to Latest Version

```bash
# 1. Backup first (see above)

# 2. Pull latest images
docker-compose -f docker-compose.prod.yml pull

# 3. Restart with new images
docker-compose -f docker-compose.prod.yml up -d
```

### Manual Update to Specific Version

```bash
# 1. Edit .env file
IMAGE_TAG=v1.2.0

# 2. Pull and restart
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d
```

---

## Uninstallation

### Stop & Remove Everything

```bash
# Stop all containers
docker-compose -f docker-compose.prod.yml down

# Remove volumes (⚠️ THIS DELETES ALL DATA!)
docker-compose -f docker-compose.prod.yml down -v

# Remove images
docker rmi $(docker images -q 'vikuna/kewalinvest-*')
```

### Keep Data (for reinstallation)

```bash
# Stop containers but keep volumes
docker-compose -f docker-compose.prod.yml down
```

---

## File Structure

```
kewalinvest/
├── configure.sh              # Configuration wizard
├── deploy.sh                 # Deployment script (fresh install)
├── update.sh                 # Update script (preserve data)
├── build-and-push.sh         # Build & push images (developers only)
├── docker-compose.prod.yml   # Production configuration
├── .env                      # Your configuration (created by configure.sh)
├── .env.example              # Configuration template
├── .credentials.txt          # Your credentials (created by configure.sh)
├── README.md                 # This file
├── UPDATE.md                 # Detailed update guide
├── BUILD_AND_PUSH.md         # Image build guide (developers)
├── DEPLOYMENT_STRATEGY.md    # Deployment architecture
├── database/                 # Database initialization scripts
│   ├── 01_init.sql
│   ├── 02_tables.sql
│   ├── 03_indexes_triggers.sql
│   ├── 04_functions_views_policies.sql
│   ├── 05_seed_data.sql
│   └── 06_fix_meetings_table.sql
└── backups/                  # Automatic backups (created by update.sh)
```

---

## Port Reference

| Service | Default Port | Purpose |
|---------|--------------|---------|
| Frontend | 3000 | Main application |
| Backend | 8080 | API server |
| PostgreSQL | 5432 | Database |
| pgAdmin | 5050 | Database management |

**Note**: All ports can be customized in `.env` file

---

## Security Best Practices

1. ✅ **Change default passwords** - Done automatically by `configure.sh`
2. ✅ **Keep .env file secure** - Never share or commit to git
3. ✅ **Regular backups** - Backup before any updates
4. ✅ **Update regularly** - Keep application up-to-date
5. ✅ **Firewall** - Only expose necessary ports
6. ⚠️ **HTTPS** - For production, use a reverse proxy with SSL

---

## Getting Help

### Logs

View logs for specific service:
```bash
docker-compose -f docker-compose.prod.yml logs -f backend
docker-compose -f docker-compose.prod.yml logs -f frontend
docker-compose -f docker-compose.prod.yml logs -f postgres
```

### Health Check

```bash
# Check API health
curl http://localhost:8080/health

# Check all containers
docker-compose -f docker-compose.prod.yml ps
```

### Container Shell Access

```bash
# Access backend container
docker exec -it kewalinvest_backend sh

# Access database
docker exec -it kewalinvest_db psql -U kewal_admin kewalinvest
```

---

## Frequently Asked Questions

### Q: Can I change the ports after installation?

**A**: Yes, edit `.env` file and restart:
```bash
docker-compose -f docker-compose.prod.yml restart
```

### Q: How do I reset everything?

**A**: Run these commands:
```bash
docker-compose -f docker-compose.prod.yml down -v
./deploy.sh
```

### Q: Can I install this on a server?

**A**: Yes, but you'll need to:
1. Configure firewall rules
2. Set up HTTPS/SSL
3. Use proper domain names
4. Configure backups

### Q: Is my data safe?

**A**: Data is stored in Docker volumes. Regular backups recommended.

### Q: Can multiple people use this simultaneously?

**A**: Yes, it's multi-tenant. Create users through the admin panel.

---

## Support

For issues and questions:
1. Check the logs (see above)
2. Review this README
3. Contact your system administrator
4. Email: support@kewalinvest.com

---

## License

Copyright © 2025 KewalInvest. All rights reserved.

---

**Version**: 1.0.0
**Last Updated**: January 2025
