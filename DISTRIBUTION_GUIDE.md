# Distribution Guide

## Quick Start

The `distribute.sh` script automates the build and deployment process for the Kewalinvest platform.

### Basic Usage

```bash
# Build for development (default)
./distribute.sh

# Build for staging
./distribute.sh --env staging

# Build for production
./distribute.sh --env production

# Build only frontend
./distribute.sh --frontend-only --env production

# Build only backend
./distribute.sh --backend-only --env production

# Dry run (show what would be done)
./distribute.sh --dry-run --env production
```

## Prerequisites

Before running the distribution script:

1. **Node.js 16+** must be installed
2. **npm** must be installed
3. **Environment files** must be configured:
   - `frontend/.env.dev`
   - `frontend/.env.staging`
   - `frontend/.env.production`
   - `backend/.env.dev`
   - `backend/.env.staging`
   - `backend/.env.production`

## Environment Configuration

### Frontend Environment Files

Create `frontend/.env.production`:
```bash
REACT_APP_API_BASE_URL=https://api.yourdomain.com/api
REACT_APP_ENV=production
```

### Backend Environment Files

Create `backend/.env.production`:
```bash
# Database
DB_HOST=your-db-host
DB_PORT=5432
DB_NAME=kewalinvest_prod
DB_USER=kewalinvest_user
DB_PASSWORD=your_secure_password

# Authentication
JWT_SECRET=your_production_jwt_secret
JWT_EXPIRY=24h

# Server
PORT=5000
NODE_ENV=production

# API Keys
MARKET_DATA_API_KEY=your_api_key
```

## Distribution Process

The script performs the following steps:

1. **Check Prerequisites**
   - Verifies Node.js and npm are installed
   - Checks that project directories exist

2. **Verify Environment Files**
   - Checks for environment-specific .env files
   - Falls back to default .env if not found

3. **Install Dependencies**
   - Runs `npm ci` for reproducible builds
   - Installs both dev and prod dependencies

4. **Run Tests** (optional)
   - Executes test suites
   - Can be skipped with `--skip-tests`

5. **Build Frontend**
   - Compiles React app to `frontend/build`
   - Optimizes for production

6. **Build Backend**
   - Compiles TypeScript to `backend/dist`
   - Prepares for deployment

7. **Create Deployment Package**
   - Creates timestamped .tar.gz file
   - Includes build artifacts and configs
   - Saved to `dist/` directory

8. **Generate Deployment Report**
   - Creates deployment_report_[timestamp].txt
   - Includes build stats and configuration

## Command Line Options

| Option | Description |
|--------|-------------|
| `--env <environment>` | Target environment: dev, staging, production |
| `--frontend-only` | Build and deploy only frontend |
| `--backend-only` | Build and deploy only backend |
| `--skip-tests` | Skip running tests |
| `--skip-build` | Skip build step (use existing build) |
| `--dry-run` | Show what would be done without executing |
| `--help` | Show help message |

## Deployment Workflows

### Development Deployment

```bash
# Build everything with tests
./distribute.sh --env dev

# Quick rebuild without tests
./distribute.sh --env dev --skip-tests
```

### Staging Deployment

```bash
# Full build for staging
./distribute.sh --env staging

# Frontend hotfix
./distribute.sh --frontend-only --env staging
```

### Production Deployment

```bash
# Dry run first (recommended)
./distribute.sh --dry-run --env production

# Full production build (requires confirmation)
./distribute.sh --env production

# Build without running tests (not recommended)
./distribute.sh --env production --skip-tests
```

## Output Files

After successful execution:

1. **Build Artifacts**
   - `frontend/build/` - Frontend static files
   - `backend/dist/` - Backend compiled JavaScript

2. **Deployment Package**
   - `dist/kewalinvest_[env]_[timestamp].tar.gz`
   - Contains all files needed for deployment

3. **Deployment Report**
   - `deployment_report_[timestamp].txt`
   - Build statistics and configuration details

## Manual Deployment Steps

### Frontend Deployment

1. Extract deployment package
2. Copy `frontend/build/*` to web server
3. Configure web server (nginx/apache)
4. Update DNS if needed

**Example nginx config**:
```nginx
server {
    listen 80;
    server_name yourdomain.com;
    root /var/www/kewalinvest/frontend/build;
    index index.html;

    location / {
        try_files $uri /index.html;
    }
}
```

### Backend Deployment

1. Extract deployment package
2. Copy `backend/dist/*` to server
3. Copy `backend/package.json`
4. Run `npm install --production` on server
5. Set up process manager (PM2 or systemd)

**Example PM2 setup**:
```bash
cd /opt/kewalinvest/backend
npm install --production
pm2 start dist/server.js --name kewalinvest-api
pm2 save
pm2 startup
```

**Example systemd service** (`/etc/systemd/system/kewalinvest.service`):
```ini
[Unit]
Description=Kewalinvest API Server
After=network.target

[Service]
Type=simple
User=kewalinvest
WorkingDirectory=/opt/kewalinvest/backend
ExecStart=/usr/bin/node dist/server.js
Restart=on-failure
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

## Troubleshooting

### Build Fails with TypeScript Errors

```bash
# Clean and rebuild
cd frontend && rm -rf node_modules build && npm install
cd ../backend && rm -rf node_modules dist && npm install

# Run distribution again
./distribute.sh --env dev
```

### Tests Failing

```bash
# Skip tests temporarily
./distribute.sh --skip-tests --env staging

# Run tests independently to debug
cd frontend && npm test
cd backend && npm test
```

### Permission Denied

```bash
# Make script executable
chmod +x distribute.sh
```

### Missing Environment File

```bash
# Copy example env file
cp frontend/.env.example frontend/.env.production
cp backend/.env.example backend/.env.production

# Edit with your values
nano frontend/.env.production
nano backend/.env.production
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Deploy to Production

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
    - uses: actions/checkout@v2

    - name: Setup Node.js
      uses: actions/setup-node@v2
      with:
        node-version: '16'

    - name: Run Distribution Script
      run: |
        ./distribute.sh --env production --skip-tests

    - name: Upload Artifact
      uses: actions/upload-artifact@v2
      with:
        name: deployment-package
        path: dist/*.tar.gz
```

### GitLab CI Example

```yaml
stages:
  - build
  - deploy

build:
  stage: build
  script:
    - ./distribute.sh --env production
  artifacts:
    paths:
      - dist/*.tar.gz
      - deployment_report_*.txt
  only:
    - main
```

## Best Practices

1. **Always dry run for production**
   ```bash
   ./distribute.sh --dry-run --env production
   ```

2. **Review deployment report before deploying**
   ```bash
   cat deployment_report_*.txt
   ```

3. **Keep environment files secure**
   - Never commit .env.production to git
   - Use secrets management (AWS Secrets Manager, HashiCorp Vault)

4. **Test in staging first**
   ```bash
   ./distribute.sh --env staging
   # Test thoroughly
   ./distribute.sh --env production
   ```

5. **Version your deployments**
   - Deployment packages are timestamped
   - Keep previous packages for rollback

6. **Monitor after deployment**
   - Check application logs
   - Verify API endpoints
   - Test critical user flows

## Quick Reference

```bash
# Most common commands

# Dev build
./distribute.sh

# Staging build
./distribute.sh --env staging

# Production build
./distribute.sh --env production

# Frontend only
./distribute.sh --frontend-only --env production

# Backend only
./distribute.sh --backend-only --env production

# Skip tests (faster)
./distribute.sh --skip-tests --env staging

# Dry run
./distribute.sh --dry-run --env production
```

## Support

For issues with the distribution script:
1. Check this guide
2. Review `HANDOVER_DOCUMENT.md`
3. Check script output and error messages
4. Verify environment files are configured correctly
