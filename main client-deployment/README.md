# KewalInvest - Client Deployment Package

## Quick Start

```bash
./configure.sh    # Step 1: Enter all configuration values
./deploy.sh       # Step 2: Deploy fresh installation
```

## File Structure

```
client-deployment/
├── configure.sh          # Creates .env (user enters ALL values)
├── deploy.sh             # Fresh install: Docker + DB setup
├── updateDocker.sh       # Update Docker images only
├── updateMigrations.sh   # Run database migrations only
├── docker-compose.prod.yml
├── .env.example
│
├── database/             # Core DB scripts (run by deploy.sh)
│   ├── 01_init.sql
│   ├── 02_tables.sql
│   ├── 03_indexes_triggers.sql
│   ├── 04_functions_views_policies.sql
│   └── 05_seed_data.sql
│
└── migrations/           # Migration scripts
    ├── 06_customer_aliases.sql
    └── 07_migration.sql
```

## Scripts

| Script | Purpose | When to Use |
|--------|---------|-------------|
| `configure.sh` | Create .env configuration | First time setup |
| `deploy.sh` | Fresh installation | New deployment |
| `updateDocker.sh` | Pull images + restart | Update application code |
| `updateMigrations.sh` | Run DB migrations | Update database schema |

## Workflow

### Fresh Installation
```bash
./configure.sh    # Enter all values
./deploy.sh       # Deploy everything
```

### Update Application (Docker Only)
```bash
./updateDocker.sh
```

### Update Database (Migrations Only)
```bash
./updateMigrations.sh
```

### Full Update
```bash
./updateDocker.sh        # Update application
./updateMigrations.sh    # Update database
```

## Configuration Values

When running `configure.sh`, you'll be asked for:

| Value | Example | Description |
|-------|---------|-------------|
| Instance Name | kewalinvest | Container name prefix |
| Volume Prefix | kewalinvest_prod | Docker volume prefix |
| Docker Registry | vikuna | Docker Hub registry |
| Image Tag | latest | Docker image tag |
| DB Name | kewalinvest | PostgreSQL database name |
| DB User | kewal_admin | PostgreSQL username |
| DB Password | (secure) | PostgreSQL password |
| DB Port | 5432 | PostgreSQL port |
| pgAdmin Email | admin@company.com | pgAdmin login email |
| pgAdmin Password | (secure) | pgAdmin login password |
| pgAdmin Port | 5050 | pgAdmin web port |
| Frontend Port | 3000 | React app port |
| Backend Port | 8080 | API server port |
| Timezone | Asia/Kolkata | Server timezone |

## Access Points (After Deployment)

| Service | URL |
|---------|-----|
| Frontend | http://localhost:FRONTEND_PORT |
| Backend API | http://localhost:BACKEND_PORT |
| pgAdmin | http://localhost:PGADMIN_PORT |

## Credentials

After running `configure.sh`, credentials are saved to:
- `.env` - Environment configuration
- `.credentials.txt` - Human-readable credentials

**Keep these files secure!**

## Troubleshooting

### Check container status
```bash
docker-compose -f docker-compose.prod.yml ps
```

### View logs
```bash
docker-compose -f docker-compose.prod.yml logs -f backend
docker-compose -f docker-compose.prod.yml logs -f frontend
docker-compose -f docker-compose.prod.yml logs -f postgres
```

### Restart services
```bash
docker-compose -f docker-compose.prod.yml restart
```

### Access database
```bash
docker exec -it INSTANCE_NAME_db psql -U DB_USER -d DB_NAME
```

## Backup

```bash
# Backup database
docker exec INSTANCE_NAME_db pg_dump -U DB_USER DB_NAME > backup.sql

# Restore database
docker exec -i INSTANCE_NAME_db psql -U DB_USER -d DB_NAME < backup.sql
```

---

**Version**: 1.2
**Date**: December 2025
