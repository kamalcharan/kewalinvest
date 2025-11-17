# Key Files for Networth & Snapshots Implementation

## Backend Services

### Core Snapshot Service
- **File**: `/backend/src/services/portfolioSnapshot.service.ts`
- **Purpose**: Calculates and manages portfolio snapshots
- **Key Methods**:
  - `generateSnapshots()`: Main generation method for scheduled runs
  - `smartBackfill()`: Auto-detects missing months per customer
  - `backfillSnapshots()`: Manual backfill with date range
  - `calculateSnapshotData()`: Calculates portfolio metrics as of date
  - `generateMissingSnapshots()`: Safe generation (CREATE only)
  - `updateAllSnapshots()`: Creates and updates
  - `regenerateAllSnapshots()`: Drops and recreates (dangerous)
  - `dropAllSnapshots()`: Deletes all snapshots

### Scheduler Service
- **File**: `/backend/src/services/portfolioSnapshotScheduler.service.ts`
- **Purpose**: Manages scheduled execution and configuration
- **Key Methods**:
  - `initializeScheduler()`: Load configs and start timers
  - `createConfig()`: Create scheduler configuration
  - `updateConfig()`: Update schedule settings
  - `executeWithRetry()`: Execute with retry logic
  - `triggerManual()`: Manual execution from UI
  - `getStatistics()`: Get scheduler statistics

### Goal Projections Service
- **File**: `/backend/src/services/goal.calculator.service.ts`
- **Purpose**: Calculates future values and projections
- **Key Methods**:
  - `calculateFutureValue()`: FV of annuity formula
  - `calculateRequiredSIP()`: SIP needed for target
  - `calculateMonthsToTarget()`: Time to reach goal
  - `monteCarloSimulation()`: Probability of success
  - `recalculateTimeBasedGoal()`: Update time-based goals
  - `recalculatePriceBasedGoal()`: Update price-based goals

## Backend Types & Models

### Snapshot Types
- **File**: `/backend/src/types/portfolioSnapshot.types.ts`
- **Key Interfaces**:
  - `PortfolioSnapshotData`: Data to store in snapshot
  - `SnapshotGenerationRequest`: Request to generate
  - `SnapshotExecution`: Execution record
  - `PortfolioSnapshotConfig`: Scheduler config
  - `BackfillRequest`: Backfill parameters
  - `SnapshotOperationType`: Operation types (generate_missing, update_all, etc.)

## Database Migrations

### Snapshot Scheduler Migration
- **File**: `/backend/db/migrations/002_portfolio_snapshot_scheduler.sql`
- **Creates Tables**:
  - `t_portfolio_snapshot_configs`: Scheduler configuration
  - `t_portfolio_snapshot_executions`: Execution history
- **Indexes**: 4 performance indexes for tenant, status, time queries

### Main Tables Schema
- **File**: `/backend/db/ditribution scripts/02_tables.sql`
- **Tables**:
  - `t_monthly_portfolio_snapshots`: Main snapshot storage
  - `t_goal_progress_snapshots`: Goal progress tracking

## Frontend Components

### Portfolio Snapshots Tab (Dashboard)
- **File**: `/frontend/src/pages/cruiseControl/PortfolioSnapshotsTab.tsx`
- **Purpose**: Manage snapshots, view history, trigger operations
- **Features**:
  - Statistics cards (last run, next scheduled, success rate)
  - Manual operation buttons
  - Execution history table with pagination
  - Auto-refresh every 30 seconds

### Portfolio Snapshots Table (Data View)
- **File**: `/frontend/src/components/portfolio/PortfolioSnapshotsTable.tsx`
- **Purpose**: Display snapshots with scheme-level detail
- **Features**:
  - Expandable rows per scheme
  - Monthly data display (units, NAV, market value, performance)
  - Color-coded performance
  - Chart modal for scheme trends

### Snapshot Operations Button Group
- **File**: `/frontend/src/components/cruiseControl/SnapshotOperationsButtonGroup.tsx`
- **Purpose**: Manual operation triggers
- **Operations**: Generate Missing, Update All, Regenerate All, Drop All

## Frontend Services & Hooks

### Portfolio Service
- **File**: `/frontend/src/services/portfolio.service.ts`
- **Key Methods**:
  - `getCustomerPortfolio()`: Get current portfolio
  - `getMonthlySnapshots()`: Get historical snapshots
  - `getPortfolioStatistics()`: Get portfolio stats

### Portfolio Data Hook
- **File**: `/frontend/src/hooks/usePortfolioData.ts`
- **Hooks**:
  - `usePortfolioData()`: General portfolio data fetching
  - `usePortfolioSnapshots()`: Snapshot data fetching
  - `usePortfolioMetrics()`: Aggregated metrics
  - `usePortfolioComparison()`: Compare multiple portfolios

## Frontend Types

### Snapshot Types (Frontend)
- **File**: `/frontend/src/types/portfolioSnapshot.types.ts`
- **Key Interfaces**:
  - `PortfolioSnapshot`: Monthly snapshot record
  - `PortfolioSnapshotWithMoM`: Snapshot with month-over-month
  - `PortfolioSnapshotConfig`: Scheduler configuration
  - `SnapshotExecution`: Execution record

## Controllers & Routes

### Snapshot Controller
- **File**: `/backend/src/controllers/portfolioSnapshot.controller.ts`
- **Endpoints**:
  - `GET /config`: Get scheduler config
  - `POST /config`: Create config
  - `PUT /config`: Update config
  - `POST /trigger`: Manual trigger
  - `GET /executions`: Get execution history
  - `GET /statistics`: Get statistics
  - `POST /operations`: Execute operations

### Snapshot Routes
- **File**: `/backend/src/routes/portfolioSnapshot.routes.ts`
- **API Prefix**: `/api/portfolio-snapshots`

## Jobs & Scheduling

### Portfolio Snapshot Job
- **File**: `/backend/src/services/jobs/portfolioSnapshot.job.ts`
- **Purpose**: Background job for scheduled snapshot generation
- **Trigger**: Cron expression (default: Friday 9 PM)

### Generic Job Scheduler
- **File**: `/backend/src/services/jobScheduler.service.ts`
- **Purpose**: Manages all job scheduling and execution tracking
- **Handles**: Config management, execution logging, retry logic

## Configuration & Environment

### Database Configuration
- **File**: `/backend/src/config/database.ts`
- **Purpose**: PostgreSQL connection pool setup

### Environment Variables
Key variables for snapshots:
- `SNAPSHOT_SCHEDULE_TYPE`: weekly/monthly/custom
- `SNAPSHOT_CRON_EXPRESSION`: Cron expression
- `SNAPSHOT_MAX_RETRIES`: Max retry attempts
- `SNAPSHOT_ENABLED`: Enable/disable scheduler

## Utilities

### Portfolio Utilities
- **File**: `/backend/src/utils/portfolio.util.ts`
- **Key Methods**:
  - `calculatePortfolioSummary()`: Aggregate portfolio metrics
  - `calculateAllocationPercentage()`: Asset allocation %
  - `calculateXIRR()`: Internal rate of return
  - `calculateCAGR()`: Compound annual growth rate
  - `calculateReturnPercentage()`: Return calculation

---

## Data Flow Diagrams

### Snapshot Generation Flow
```
Cron Trigger (Friday 9 PM)
    ↓
PortfolioSnapshotSchedulerService.executeWithRetry()
    ↓
PortfolioSnapshotService.generateSnapshots()
    ↓
For each customer:
    - getCustomersToProcess()
    - getCustomerDateRange()
    - calculateSnapshotData()
    - createSnapshot() or updateSnapshot()
    ↓
Log to t_portfolio_snapshot_executions
    ↓
If failed → Retry with exponential backoff
```

### Frontend Data Load
```
PortfolioSnapshotsTab.tsx (Dashboard)
    ↓
JobsService.getStatistics()
JobsService.getExecutions()
    ↓
SnapshotOperationsButtonGroup (Manual trigger)
    ↓
PortfolioSnapshotsTable.tsx (Historical view)
    ↓
usePortfolioSnapshots() hook
    ↓
PortfolioService.getMonthlySnapshots()
    ↓
Display scheme-level breakdown
```

---

## Quick Reference

| Component | File | Purpose |
|-----------|------|---------|
| Main Service | portfolioSnapshot.service.ts | Core snapshot logic |
| Scheduler | portfolioSnapshotScheduler.service.ts | Schedule management |
| Projections | goal.calculator.service.ts | Future value calculations |
| Dashboard | PortfolioSnapshotsTab.tsx | Management UI |
| Table View | PortfolioSnapshotsTable.tsx | Data visualization |
| Job Worker | portfolioSnapshot.job.ts | Background execution |
| Database | t_monthly_portfolio_snapshots | Data storage |
| Types (BE) | portfolioSnapshot.types.ts | Backend models |
| Types (FE) | portfolioSnapshot.types.ts | Frontend models |

---

**Last Updated:** 2025-11-17
