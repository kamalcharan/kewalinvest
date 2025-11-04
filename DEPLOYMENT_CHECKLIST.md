# Kewalinvest Platform - Deployment Checklist

## Pre-Deployment Checklist

### 1. Code Readiness
- [ ] All features tested on development
- [ ] No console errors in browser
- [ ] No TypeScript compilation errors
- [ ] Frontend build successful (`npm run build`)
- [ ] Backend build successful (`npm run build`)
- [ ] All tests passing (if available)
- [ ] Code reviewed and approved
- [ ] Git branch up to date with latest changes

### 2. Database Readiness
- [ ] Database scripts reviewed
- [ ] Backup of existing database taken
- [ ] Test data prepared (if needed)
- [ ] Migration scripts ready (if updating existing DB)
- [ ] Database credentials secured

### 3. Environment Configuration
- [ ] `.env` files configured for target environment
- [ ] All API keys and secrets set
- [ ] CORS origins configured correctly
- [ ] JWT secrets are strong (32+ characters)
- [ ] Database credentials verified
- [ ] SMTP settings configured (if needed)

### 4. Infrastructure Readiness
- [ ] Server/VM provisioned
- [ ] Node.js 16+ installed
- [ ] PostgreSQL 13+ installed and running
- [ ] SSL certificates ready (for production)
- [ ] Domain/subdomain configured
- [ ] Firewall rules configured
- [ ] Backup system in place

---

## Development Deployment

### Step 1: Database Setup
```bash
# Navigate to distribution scripts
cd backend/db/"ditribution scripts"

# Run deployment
./deploy_database.sh development

# Verify
psql -U kewal_admin -d kewalinvest_dev -c "\dt"
```

**Checklist**:
- [ ] Database created successfully
- [ ] All tables created (30+ tables)
- [ ] Indexes created (100+ indexes)
- [ ] Triggers created (20+ triggers)
- [ ] Seed data loaded

### Step 2: Backend Setup
```bash
cd backend

# Install dependencies
npm install

# Copy environment file
cp .env.development .env

# Edit with your credentials
nano .env

# Build
npm run build

# Start server
npm run dev
```

**Checklist**:
- [ ] Dependencies installed without errors
- [ ] `.env` file configured
- [ ] Backend builds successfully
- [ ] Server starts on configured port (8080)
- [ ] Database connection successful
- [ ] No startup errors in logs

### Step 3: Frontend Setup
```bash
cd frontend

# Install dependencies
npm install

# Copy environment file
cp .env.development .env

# Start development server
npm start
```

**Checklist**:
- [ ] Dependencies installed without errors
- [ ] `.env` file configured with API URL
- [ ] Frontend starts on port 3000
- [ ] No compilation errors
- [ ] Browser opens automatically

### Step 4: Verification
- [ ] Login page loads
- [ ] Can create account / login
- [ ] Dashboard loads
- [ ] API calls work (check Network tab)
- [ ] No console errors

---

## Staging Deployment

### Pre-Deployment
- [ ] All development tests passed
- [ ] Code merged to staging branch
- [ ] Staging server accessible
- [ ] Staging database backed up

### Step 1: Database Deployment
```bash
# SSH to staging server
ssh user@staging-server.com

# Navigate to project
cd /opt/kewalinvest/backend/db/"ditribution scripts"

# Run deployment (skips seed data)
./deploy_database.sh staging --skip-seed

# Verify
psql -U kewal_staging_user -d kewalinvest_staging -c "\dt"
```

**Checklist**:
- [ ] Database deployed without errors
- [ ] Tables verified
- [ ] Indexes verified
- [ ] No seed data added (staging should use real data)

### Step 2: Backend Deployment
```bash
# On staging server
cd /opt/kewalinvest/backend

# Pull latest code
git pull origin staging

# Install dependencies
npm install --production

# Copy staging environment
cp .env.staging .env

# Build
npm run build

# Restart with PM2
pm2 restart kewalinvest-api
# Or
pm2 start dist/server.js --name kewalinvest-api

# Save PM2 config
pm2 save
```

**Checklist**:
- [ ] Code updated
- [ ] Dependencies installed
- [ ] Environment configured
- [ ] Build successful
- [ ] PM2 process running
- [ ] Logs show no errors: `pm2 logs kewalinvest-api`

### Step 3: Frontend Deployment
```bash
# On local machine
cd frontend

# Copy staging environment
cp .env.staging .env

# Build for production
npm run build

# Deploy build folder to web server
scp -r build/* user@staging-server:/var/www/kewalinvest

# Or use rsync
rsync -avz build/ user@staging-server:/var/www/kewalinvest/
```

**Nginx Configuration** (example):
```nginx
server {
    listen 80;
    server_name staging.yourdomain.com;

    root /var/www/kewalinvest;
    index index.html;

    location / {
        try_files $uri /index.html;
    }

    location /api {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

**Checklist**:
- [ ] Frontend built successfully
- [ ] Files copied to web server
- [ ] Nginx configured
- [ ] Nginx reloaded: `sudo systemctl reload nginx`
- [ ] Site accessible at staging URL
- [ ] API proxy working

### Step 4: Staging Verification
- [ ] Navigate to staging URL
- [ ] Login works
- [ ] All features accessible
- [ ] API calls working
- [ ] No console errors
- [ ] SSL/HTTPS working
- [ ] Mobile responsive
- [ ] Performance acceptable (Lighthouse > 80)

---

## Production Deployment

### Pre-Deployment (CRITICAL)
- [ ] All staging tests passed
- [ ] Stakeholder approval received
- [ ] Backup window scheduled
- [ ] Rollback plan prepared
- [ ] Team notified of deployment
- [ ] Maintenance page ready (if needed)

### Step 1: Pre-Deployment Backup
```bash
# Backup database
pg_dump kewalinvest_prod > backup_prod_$(date +%Y%m%d_%H%M%S).sql

# Backup application files
tar -czf app_backup_$(date +%Y%m%d_%H%M%S).tar.gz /opt/kewalinvest

# Store backups securely
mv backup_*.sql /backup/kewalinvest/
mv app_backup_*.tar.gz /backup/kewalinvest/
```

**Checklist**:
- [ ] Database backup created
- [ ] Application backup created
- [ ] Backups stored securely
- [ ] Backup integrity verified

### Step 2: Database Deployment
```bash
# IMPORTANT: Dry run first!
./deploy_database.sh production --dry-run

# If dry run looks good, run for real
./deploy_database.sh production --skip-seed

# Verify
psql -U kewal_prod_user -d kewalinvest_prod -c "\dt"
```

**Checklist**:
- [ ] Dry run completed successfully
- [ ] Production deployment approved
- [ ] Deployment completed without errors
- [ ] Tables verified
- [ ] Indexes verified
- [ ] **NO SEED DATA** added to production

### Step 3: Backend Deployment
```bash
# Pull latest code
git pull origin main

# Install dependencies
npm install --production

# Copy production environment
cp .env.production .env

# Verify environment variables
cat .env | grep -v PASSWORD | grep -v SECRET

# Build
npm run build

# Restart PM2 with zero-downtime
pm2 reload kewalinvest-api

# Monitor logs
pm2 logs kewalinvest-api --lines 100
```

**Checklist**:
- [ ] Code updated to production branch
- [ ] Dependencies installed
- [ ] Environment verified (no placeholder values)
- [ ] Build successful
- [ ] PM2 reload completed
- [ ] No errors in logs
- [ ] Health check endpoint responding

### Step 4: Frontend Deployment
```bash
# Build with production config
npm run build

# Verify build size
du -sh build

# Deploy to production server
rsync -avz --delete build/ user@prod-server:/var/www/kewalinvest/

# Clear CDN cache (if using CDN)
# aws cloudfront create-invalidation --distribution-id XXX --paths "/*"
```

**Checklist**:
- [ ] Build optimized for production
- [ ] Files deployed
- [ ] Old files removed
- [ ] CDN cache cleared (if applicable)
- [ ] SSL certificate valid
- [ ] HTTPS enforced

### Step 5: Production Verification
**Smoke Tests**:
- [ ] Homepage loads
- [ ] Login works
- [ ] Dashboard loads
- [ ] Create customer works
- [ ] View transactions works
- [ ] Goal tracking works
- [ ] Meeting scheduling works
- [ ] Cruise Control accessible

**Security Checks**:
- [ ] HTTPS enforced
- [ ] Security headers present (check DevTools)
- [ ] SQL injection protected
- [ ] XSS protected
- [ ] CSRF tokens working
- [ ] Rate limiting active

**Performance Checks**:
- [ ] Page load < 3 seconds
- [ ] API response < 1 second
- [ ] Lighthouse score > 80
- [ ] No memory leaks
- [ ] Database queries optimized

### Step 6: Post-Deployment Monitoring
**First Hour**:
- [ ] Monitor server logs
- [ ] Monitor database connections
- [ ] Monitor API error rates
- [ ] Check user feedback
- [ ] Monitor performance metrics

**First Day**:
- [ ] Review error logs
- [ ] Check database performance
- [ ] Monitor user activity
- [ ] Verify scheduled jobs running
- [ ] Check backup execution

---

## Rollback Procedures

### If Deployment Fails

**Immediate Actions**:
1. Stop deployment immediately
2. Assess severity of issue
3. Decide: Fix forward or rollback

**Database Rollback**:
```bash
# Stop backend server
pm2 stop kewalinvest-api

# Drop failed database
dropdb kewalinvest_prod

# Recreate from backup
createdb kewalinvest_prod
psql -d kewalinvest_prod < backup_prod_YYYYMMDD_HHMMSS.sql

# Restart backend
pm2 start kewalinvest-api
```

**Application Rollback**:
```bash
# Git rollback
git checkout previous-stable-tag

# Rebuild
npm install
npm run build

# Restart
pm2 restart kewalinvest-api

# Frontend rollback
git checkout previous-stable-tag
npm run build
rsync -avz build/ user@prod-server:/var/www/kewalinvest/
```

---

## Post-Deployment Tasks

### Immediate (Within 1 Hour)
- [ ] Send deployment notification to team
- [ ] Update documentation with any changes
- [ ] Monitor error logs
- [ ] Verify scheduled jobs running
- [ ] Check backup systems

### Short Term (Within 24 Hours)
- [ ] User acceptance testing
- [ ] Performance monitoring
- [ ] Security audit
- [ ] Update status page
- [ ] Collect user feedback

### Long Term (Within 1 Week)
- [ ] Review error reports
- [ ] Optimize slow queries
- [ ] Update runbooks
- [ ] Plan next iteration
- [ ] Document lessons learned

---

## Emergency Contacts

### Development Team
- Lead Developer: [Name] - [Phone] - [Email]
- Backend Developer: [Name] - [Phone] - [Email]
- Frontend Developer: [Name] - [Phone] - [Email]

### Infrastructure
- DevOps Engineer: [Name] - [Phone] - [Email]
- Database Administrator: [Name] - [Phone] - [Email]
- System Administrator: [Name] - [Phone] - [Email]

### Business
- Product Owner: [Name] - [Phone] - [Email]
- Project Manager: [Name] - [Phone] - [Email]

---

## Deployment Log Template

```
Deployment Date: YYYY-MM-DD HH:MM
Environment: [Development/Staging/Production]
Deployed By: [Name]
Version/Tag: [Git tag or commit hash]

Components Deployed:
- [ ] Database
- [ ] Backend
- [ ] Frontend

Pre-Deployment:
- Backup Created: [Yes/No] - [Backup filename]
- Tests Passed: [Yes/No]
- Approval Received: [Yes/No]

Deployment Steps:
1. [Step description] - [Status] - [Time]
2. [Step description] - [Status] - [Time]
3. [Step description] - [Status] - [Time]

Verification:
- Smoke Tests: [Pass/Fail]
- Performance: [Pass/Fail]
- Security: [Pass/Fail]

Issues Encountered:
- [None/List issues]

Rollback Required: [Yes/No]

Post-Deployment Tasks:
- [ ] Monitoring enabled
- [ ] Team notified
- [ ] Documentation updated

Notes:
[Any additional notes or observations]

Deployment Status: [Success/Failed/Partial]
Completed At: [HH:MM]
Total Duration: [Minutes]
```

---

**Checklist Version**: 1.0
**Last Updated**: November 4, 2025
**Prepared By**: Claude Code Assistant
