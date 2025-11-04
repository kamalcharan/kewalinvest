# Kewalinvest Platform - Testing Guide

## Prerequisites for Testing

### System Requirements
- Node.js 16+ installed
- PostgreSQL 13+ running
- npm or yarn package manager
- Git for version control

### Database Setup
Before testing, ensure PostgreSQL is running and accessible.

```bash
# Check PostgreSQL status
sudo service postgresql status

# Or on macOS
brew services list | grep postgresql
```

---

## Quick Start Testing (Development)

### 1. Clone and Checkout Branch
```bash
git clone <repository-url>
cd kewalinvest
git checkout claude/review-previous-branch-011CUmKY8xZRV9A6h2AU8EoL
```

### 2. Backend Setup
```bash
cd backend

# Install dependencies
npm install

# Copy development environment file
cp .env.development .env

# Edit .env with your database credentials
nano .env

# Create database
createdb kewalinvest_dev

# Run any migrations (if exist)
# npm run migrate

# Start backend server
npm run dev
```

Backend should start on http://localhost:8080

### 3. Frontend Setup
```bash
# In a new terminal
cd frontend

# Install dependencies
npm install

# Copy development environment file
cp .env.development .env

# Start frontend development server
npm start
```

Frontend should start on http://localhost:3000

### 4. Initial Login

**Default Admin Credentials** (if seeded):
- Email: admin@kewalinvest.com
- Password: admin123

If no seed data exists, use the Register page to create a new account.

---

## Testing Completed Features

### ✅ 1. Operational Dashboard

**Location**: Navigate to `/dashboard` after login

**What to Test**:
- [ ] Statistics cards display correctly (Total Customers, Bookmarked Goals, etc.)
- [ ] Alerts banner appears if there are goal deviations
- [ ] Top Goal Deviations section shows goals that are behind/at risk
- [ ] Upcoming Meetings section shows meetings in next 30 days
- [ ] Click on goal deviation card navigates to customer detail page
- [ ] Quick action cards work (Explore Goals, Customers, Cruise Control)

**API Endpoints to Verify**:
```bash
# Get dashboard statistics
curl -X GET http://localhost:8080/api/dashboard/statistics \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get goal deviations
curl -X GET http://localhost:8080/api/dashboard/goal-deviations?limit=10 \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get upcoming meetings
curl -X GET http://localhost:8080/api/dashboard/upcoming-meetings?limit=10 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### ✅ 2. Meeting Management

**Location**: Navigate to any customer detail page → Meetings tab

**What to Test**:
- [ ] Create new meeting
  - Fill meeting type (Review, Planning, Onboarding, etc.)
  - Choose meeting mode (In-Person, Virtual, Phone)
  - Select date and time
  - Add agenda
  - Click "Schedule Meeting"
- [ ] View meeting timeline
- [ ] Filter meetings by type
- [ ] Filter meetings by status
- [ ] Edit meeting notes
- [ ] Insert timestamp in notes
- [ ] Mark meeting as complete
- [ ] Delete meeting

**API Endpoints to Verify**:
```bash
# Get meetings for customer
curl -X GET http://localhost:8080/api/customers/1/meetings \
  -H "Authorization: Bearer YOUR_TOKEN"

# Create meeting
curl -X POST http://localhost:8080/api/customers/1/meetings \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "meeting_type": "REVIEW",
    "meeting_mode": "IN_PERSON",
    "scheduled_date": "2025-11-15",
    "scheduled_time": "10:00",
    "duration_minutes": 60,
    "agenda": "Portfolio review and goal tracking"
  }'
```

---

### ✅ 3. Cruise Control Monitoring

**Location**: Navigate to `/cruise-control`

**What to Test**:
- [ ] Dashboard tab shows job statistics
- [ ] NAV tab shows NAV scheme statistics
- [ ] Market tab shows market index statistics
- [ ] Click stat cards to drill down
- [ ] Manual "Download Now" buttons work
- [ ] Stats refresh after manual download

**API Endpoints to Verify**:
```bash
# Get dashboard stats
curl -X GET http://localhost:8080/api/cruise-control/dashboard \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get NAV statistics
curl -X GET http://localhost:8080/api/cruise-control/nav/statistics \
  -H "Authorization: Bearer YOUR_TOKEN"

# Trigger manual NAV download
curl -X POST http://localhost:8080/api/cruise-control/nav/download/SCHEME_CODE \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### ✅ 4. Goal Tracking

**Location**: Navigate to customer detail page → Goals tab

**What to Test**:
- [ ] View existing goals
- [ ] Create new goal
  - Price-based goal
  - Time-based goal
  - Time & Price combined goal
- [ ] View goal details
- [ ] Edit goal
- [ ] Add goal to watchlist (bookmark)
- [ ] Remove from watchlist
- [ ] Recalculate goal with projection
- [ ] View goal progress chart

---

### ✅ 5. Customer Management

**Location**: Navigate to `/customers`

**What to Test**:
- [ ] View customer list
- [ ] Search customers
- [ ] Filter customers by status
- [ ] Create new customer
  - Use multi-step wizard
  - Fill personal details
  - Add contact information
  - Add address
- [ ] View customer detail page
- [ ] Edit customer information
- [ ] Delete customer

---

### ✅ 6. Transaction Management

**Location**: Navigate to `/transactions`

**What to Test**:
- [ ] View transaction list
- [ ] Filter by date range
- [ ] Filter by transaction type
- [ ] Filter by customer
- [ ] View transaction details
- [ ] Import transactions from file

---

### ✅ 7. NAV Data Management

**Location**: Navigate to `/nav/history` (Admin only)

**What to Test**:
- [ ] View NAV bookmarks
- [ ] Search NAV schemes
- [ ] Download NAV data
- [ ] View NAV chart
- [ ] Manage scheme aliases

---

### ✅ 8. Market Data Management

**Location**: Navigate to `/nav/market-history` (Admin only)

**What to Test**:
- [ ] View market indices
- [ ] Download market data
- [ ] View market charts
- [ ] Analyze index performance

---

## Testing Workflow Example

### End-to-End Customer Onboarding Test

1. **Create Customer**
   - Navigate to `/customers`
   - Click "Add Customer"
   - Fill wizard steps
   - Complete onboarding

2. **Import Transactions**
   - Navigate to customer detail page
   - Click "Import Data"
   - Upload transaction file
   - Verify import success

3. **Create Goal**
   - In customer detail, go to Goals tab
   - Click "Create Goal"
   - Set up a price-based goal
   - Bookmark the goal

4. **Schedule Meeting**
   - In customer detail, go to Meetings tab
   - Click "Schedule Meeting"
   - Set up a review meeting
   - Add agenda

5. **Verify Dashboard**
   - Navigate to `/dashboard`
   - Verify goal appears in "Top Goal Deviations" if behind
   - Verify meeting appears in "Upcoming Meetings"

---

## Common Issues and Troubleshooting

### Backend Won't Start

**Issue**: Port already in use
```bash
# Find and kill process on port 8080
lsof -ti:8080 | xargs kill -9
```

**Issue**: Database connection error
```bash
# Check PostgreSQL is running
sudo service postgresql status

# Check database exists
psql -U postgres -l | grep kewalinvest

# Create database if missing
createdb kewalinvest_dev
```

**Issue**: Environment variables not loaded
```bash
# Verify .env file exists
ls -la backend/.env

# Check NODE_ENV
echo $NODE_ENV
```

### Frontend Won't Start

**Issue**: Dependencies not installed
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
```

**Issue**: Port 3000 already in use
```bash
# Use different port
PORT=3001 npm start
```

**Issue**: API calls failing (CORS)
```bash
# Verify backend CORS_ORIGIN matches frontend URL
# In backend/.env:
CORS_ORIGIN=http://localhost:3000
```

### Build Failures

**Issue**: TypeScript errors
```bash
cd frontend
npm run build

# Check for type errors
npx tsc --noEmit
```

**Issue**: Backend compilation errors
```bash
cd backend
npm run build

# Check TypeScript config
cat tsconfig.json
```

---

## Performance Testing

### Load Testing Backend APIs

Using Apache Bench (ab):
```bash
# Install ab
sudo apt-get install apache2-utils

# Test dashboard endpoint (100 requests, 10 concurrent)
ab -n 100 -c 10 -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:8080/api/dashboard/statistics
```

### Frontend Performance

1. Open Chrome DevTools
2. Go to Lighthouse tab
3. Run audit
4. Check Performance score (should be >80)

---

## Security Testing

### Authentication Testing

**Test**: Unauthorized access
```bash
# Should return 401 Unauthorized
curl -X GET http://localhost:8080/api/dashboard/statistics
```

**Test**: Invalid token
```bash
# Should return 401 Unauthorized
curl -X GET http://localhost:8080/api/dashboard/statistics \
  -H "Authorization: Bearer invalid_token_12345"
```

**Test**: SQL Injection (should be prevented)
```bash
# Should not cause SQL errors
curl -X GET "http://localhost:8080/api/customers?search='; DROP TABLE customers--" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Automated Testing

### Backend Unit Tests (if available)
```bash
cd backend
npm test
```

### Frontend Tests (if available)
```bash
cd frontend
npm test
```

---

## Test Data Setup

### Creating Test Customers
```sql
-- Connect to database
psql -U kewal_admin -d kewalinvest_dev

-- Insert test customers
INSERT INTO t_customers (tenant_id, is_live, first_name, last_name, email, status)
VALUES
  (1, true, 'John', 'Doe', 'john.doe@test.com', 'active'),
  (1, true, 'Jane', 'Smith', 'jane.smith@test.com', 'active');
```

### Creating Test Goals
```sql
-- Insert test goal
INSERT INTO t_goals (
  tenant_id, is_live, customer_id, goal_type, goal_config,
  target_value, target_date, status, is_bookmarked
)
VALUES (
  1, true, 1, 'PRICE_BASED',
  '{"goal_name": "Retirement Fund", "target_amount": 5000000}',
  5000000, '2030-12-31', 'active', true
);
```

### Creating Test Meetings
```sql
-- Insert test meeting
INSERT INTO t_customer_meetings (
  tenant_id, is_live, customer_id, meeting_type, meeting_mode,
  scheduled_date, scheduled_time, duration_minutes, status, created_by
)
VALUES (
  1, true, 1, 'REVIEW', 'IN_PERSON',
  '2025-11-15', '10:00', 60, 'scheduled', 1
);
```

---

## Test Checklist

### Pre-Testing Setup
- [ ] PostgreSQL running
- [ ] Database created
- [ ] Backend .env configured
- [ ] Frontend .env configured
- [ ] Dependencies installed (backend & frontend)
- [ ] Backend server started
- [ ] Frontend server started

### Feature Testing
- [ ] Login/Authentication works
- [ ] Operational Dashboard loads
- [ ] Customer Management CRUD
- [ ] Goal Tracking CRUD
- [ ] Meeting Management CRUD
- [ ] Transaction viewing
- [ ] NAV data access
- [ ] Market data access
- [ ] Cruise Control monitoring

### API Testing
- [ ] All GET endpoints return data
- [ ] POST endpoints create records
- [ ] PUT endpoints update records
- [ ] DELETE endpoints remove records
- [ ] Error handling works correctly
- [ ] Authentication required for protected routes

### UI/UX Testing
- [ ] Navigation works
- [ ] Forms validate input
- [ ] Loading states display
- [ ] Error messages show
- [ ] Success notifications appear
- [ ] Responsive design works
- [ ] Dark mode toggles (if applicable)

### Performance
- [ ] Page load < 3 seconds
- [ ] API responses < 1 second
- [ ] No console errors
- [ ] No memory leaks

---

## Reporting Issues

When reporting issues, include:
1. **Environment**: Development/Staging/Production
2. **Browser**: Chrome/Firefox/Safari + version
3. **Steps to Reproduce**: Detailed steps
4. **Expected Behavior**: What should happen
5. **Actual Behavior**: What actually happens
6. **Screenshots**: If applicable
7. **Console Errors**: From browser DevTools
8. **Server Logs**: From backend terminal

**Example Issue Report**:
```
Environment: Development
Browser: Chrome 120.0
URL: /dashboard

Steps to Reproduce:
1. Login as admin
2. Navigate to /dashboard
3. Click on "Top Goal Deviations" card

Expected: Should navigate to customer detail page
Actual: Returns 404 error

Console Error:
GET http://localhost:3000/customers/undefined 404 (Not Found)

Screenshot: [attached]
```

---

## Next Steps After Testing

1. **Document Bugs**: Create issue tickets for all bugs found
2. **Prioritize Fixes**: Critical > High > Medium > Low
3. **Regression Testing**: Re-test after fixes
4. **User Acceptance Testing**: Have end users test
5. **Staging Deployment**: Deploy to staging environment
6. **Production Deployment**: Deploy to production after UAT approval

---

**Testing Guide Version**: 1.0
**Last Updated**: November 4, 2025
**Prepared By**: Claude Code Assistant
