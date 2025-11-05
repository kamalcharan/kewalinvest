# Jobs System Refactoring Plan

**Date:** 2025-10-27
**Purpose:** Refactor portfolio snapshot scheduler into a generic, reusable jobs system
**Goal:** Make it easy to add new job types without creating multiple files

---

## Problem Statement

Current implementation has job-specific files:
- `portfolioSnapshot.types.ts`
- `portfolioSnapshot.service.ts`
- `portfolioSnapshotScheduler.service.ts`
- `portfolioSnapshot.controller.ts`
- `portfolioSnapshot.routes.ts`

Adding 10 more jobs = 50 more files! ❌

---

## Proposed Solution: Generic Jobs System

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    GENERIC JOBS SYSTEM                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Job Types: PORTFOLIO_SNAPSHOT, DATA_CLEANUP,              │
│             METRICS_CALCULATION, REPORT_GENERATION, etc.    │
│                                                             │
│  Shared Infrastructure:                                     │
│    - Scheduling (cron-based)                                │
│    - Execution tracking                                     │
│    - Retry logic (configurable)                             │
│    - Status monitoring                                      │
│    - History/Statistics                                     │
│                                                             │
│  Job-Specific Implementation:                               │
│    - Execute function (what the job does)                   │
│    - Configuration (job-specific settings)                  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## File Structure

### Backend

```
backend/src/
├── types/
│   └── jobs.types.ts              ← ONE file for ALL job types
│
├── services/
│   ├── jobs.service.ts            ← Generic job execution service
│   ├── jobScheduler.service.ts    ← Generic scheduler (manages all jobs)
│   └── jobs/
│       ├── portfolioSnapshot.job.ts   ← Job-specific implementation
│       ├── dataCleanup.job.ts         ← Future job
│       └── metricsCalculation.job.ts  ← Future job
│
├── controllers/
│   └── jobs.controller.ts         ← ONE controller for ALL jobs
│
├── routes/
│   └── jobs.routes.ts             ← ONE route file
│
└── db/migrations/
    └── 002_jobs_system.sql        ← Generic jobs tables
```

### Frontend

```
frontend/src/
├── types/
│   └── jobs.types.ts              ← ONE file for ALL job types
│
├── services/
│   └── jobs.service.ts            ← Generic API service
│
├── components/cruiseControl/
│   ├── JobExecutionTable.tsx      ← Reusable execution history table
│   ├── JobStatisticsCards.tsx     ← Reusable statistics cards
│   └── JobManualTrigger.tsx       ← Reusable trigger button
│
└── pages/cruiseControl/
    ├── PortfolioSnapshotsTab.tsx  ← Uses generic components
    ├── DataCleanupTab.tsx         ← Future job (uses same components)
    └── MetricsTab.tsx              ← Future job (uses same components)
```

---

## Database Schema

### Generic Jobs Tables

```sql
-- Job Types Registry
CREATE TABLE m_job_types (
    code VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    default_cron_expression VARCHAR(100),
    default_max_retries INTEGER DEFAULT 3,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO m_job_types (code, name, description, default_cron_expression, default_max_retries) VALUES
('PORTFOLIO_SNAPSHOT', 'Portfolio Snapshot Generation', 'Generate monthly portfolio snapshots for performance tracking', '0 21 * * 5', 3),
('DATA_CLEANUP', 'Data Cleanup', 'Clean up old staging data and temporary files', '0 2 * * 0', 3),
('METRICS_CALCULATION', 'Metrics Calculation', 'Calculate market and scheme metrics', '0 22 * * *', 3);

-- Scheduler Configurations (Tenant-specific)
CREATE TABLE t_job_scheduler_configs (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES t_tenants(id),
    job_type VARCHAR(50) NOT NULL REFERENCES m_job_types(code),
    user_id INTEGER NOT NULL REFERENCES t_users(id),
    is_live BOOLEAN NOT NULL,
    schedule_type VARCHAR(20) NOT NULL DEFAULT 'weekly',
    cron_expression VARCHAR(100) NOT NULL,
    is_enabled BOOLEAN NOT NULL DEFAULT true,
    max_retries INTEGER NOT NULL DEFAULT 3,
    job_config JSONB,  -- Job-specific configuration
    last_executed_at TIMESTAMP,
    next_execution_at TIMESTAMP,
    execution_count INTEGER DEFAULT 0,
    failure_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_job_config UNIQUE(tenant_id, job_type, is_live)
);

-- Execution History (Generic for all jobs)
CREATE TABLE t_job_executions (
    id SERIAL PRIMARY KEY,
    scheduler_config_id INTEGER NOT NULL REFERENCES t_job_scheduler_configs(id) ON DELETE CASCADE,
    job_type VARCHAR(50) NOT NULL REFERENCES m_job_types(code),
    tenant_id INTEGER NOT NULL,
    is_live BOOLEAN NOT NULL,
    execution_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) NOT NULL,  -- success, failed, running, retrying
    trigger_source VARCHAR(20) NOT NULL,  -- scheduled, manual
    retry_attempt INTEGER DEFAULT 0,
    execution_data JSONB,  -- Job-specific execution data/results
    error_message TEXT,
    error_details JSONB,
    execution_duration_ms INTEGER,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## Type Definitions

### backend/src/types/jobs.types.ts

```typescript
// Enum of all job types
export enum JobType {
  PORTFOLIO_SNAPSHOT = 'PORTFOLIO_SNAPSHOT',
  DATA_CLEANUP = 'DATA_CLEANUP',
  METRICS_CALCULATION = 'METRICS_CALCULATION'
  // Add more as needed
}

// Generic job configuration
export interface JobSchedulerConfig {
  id?: number;
  tenant_id: number;
  job_type: JobType;
  user_id: number;
  is_live: boolean;
  schedule_type: 'daily' | 'weekly' | 'monthly' | 'custom';
  cron_expression: string;
  is_enabled: boolean;
  max_retries: number;
  job_config?: any;  // Job-specific config
  last_executed_at?: Date;
  next_execution_at?: Date;
  execution_count: number;
  failure_count: number;
  created_at?: Date;
  updated_at?: Date;
}

// Generic job execution
export interface JobExecution {
  id: number;
  scheduler_config_id: number;
  job_type: JobType;
  tenant_id: number;
  is_live: boolean;
  execution_time: Date;
  status: 'success' | 'failed' | 'running' | 'retrying' | 'skipped';
  trigger_source: 'scheduled' | 'manual';
  retry_attempt: number;
  execution_data?: any;  // Job-specific results
  error_message?: string;
  error_details?: any;
  execution_duration_ms?: number;
  started_at?: Date;
  completed_at?: Date;
  created_at: Date;
}

// Job-specific execution data types
export interface PortfolioSnapshotExecutionData {
  snapshot_month_end: Date;
  customers_processed: number;
  customers_failed: number;
  snapshots_created: number;
  snapshots_updated: number;
  errors?: Array<{ customer_id: number; error: string }>;
}

export interface DataCleanupExecutionData {
  records_deleted: number;
  tables_cleaned: string[];
  space_freed_mb: number;
}

// ... more job-specific data types
```

---

## Service Layer

### backend/src/services/jobs/portfolioSnapshot.job.ts

```typescript
import { JobExecutor, JobExecutionContext, JobExecutionResult } from '../jobs.service';

export class PortfolioSnapshotJob implements JobExecutor {
  jobType = JobType.PORTFOLIO_SNAPSHOT;

  async execute(context: JobExecutionContext): Promise<JobExecutionResult> {
    // Snapshot generation logic here
    // Returns generic JobExecutionResult
  }

  validateConfig(config: any): boolean {
    // Validate job-specific configuration
    return true;
  }
}
```

### backend/src/services/jobScheduler.service.ts

```typescript
export class JobSchedulerService {
  private jobRegistry = new Map<JobType, JobExecutor>();

  constructor() {
    // Register all job types
    this.registerJob(new PortfolioSnapshotJob());
    // this.registerJob(new DataCleanupJob());
    // this.registerJob(new MetricsCalculationJob());
  }

  registerJob(executor: JobExecutor) {
    this.jobRegistry.set(executor.jobType, executor);
  }

  async executeJob(jobType: JobType, context: JobExecutionContext) {
    const executor = this.jobRegistry.get(jobType);
    if (!executor) {
      throw new Error(`No executor registered for job type: ${jobType}`);
    }
    return await executor.execute(context);
  }

  // ... rest of scheduler logic (retry, tracking, etc.)
}
```

---

## API Endpoints (ONE set for ALL jobs)

```
GET    /api/jobs/:jobType/config
POST   /api/jobs/:jobType/config
PUT    /api/jobs/:jobType/config
POST   /api/jobs/:jobType/execute
GET    /api/jobs/:jobType/executions
GET    /api/jobs/:jobType/statistics
GET    /api/jobs/:jobType/health

GET    /api/jobs/types              (List all available job types)
```

Examples:
```
GET  /api/jobs/PORTFOLIO_SNAPSHOT/config
POST /api/jobs/DATA_CLEANUP/execute
GET  /api/jobs/METRICS_CALCULATION/statistics
```

---

## Frontend Components (Reusable)

### JobExecutionTable.tsx
```typescript
interface Props {
  jobType: JobType;
  executions: JobExecution[];
  renderExecutionData?: (data: any) => ReactNode;  // Custom rendering
}
```

### JobStatisticsCards.tsx
```typescript
interface Props {
  statistics: JobStatistics;
  jobType: JobType;
  customCards?: ReactNode;  // Job-specific cards
}
```

### Usage in Tab
```typescript
// PortfolioSnapshotsTab.tsx
<JobStatisticsCards statistics={stats} jobType="PORTFOLIO_SNAPSHOT" />
<JobManualTrigger jobType="PORTFOLIO_SNAPSHOT" onTrigger={handleTrigger} />
<JobExecutionTable
  jobType="PORTFOLIO_SNAPSHOT"
  executions={executions}
  renderExecutionData={(data) => (
    <div>
      <div>Snapshots: {data.snapshots_created}</div>
      <div>Customers: {data.customers_processed}</div>
    </div>
  )}
/>
```

---

## Benefits

### ✅ Scalability
- Add new job types by:
  1. Adding enum value
  2. Creating one small job implementation file
  3. Register in scheduler
  4. Done! All infrastructure reused.

### ✅ Maintainability
- Bug fixes in one place benefit all jobs
- Consistent behavior across all jobs
- Easier to understand and onboard new developers

### ✅ Code Reuse
- Scheduling logic: ONE implementation
- Retry logic: ONE implementation
- Execution tracking: ONE implementation
- UI components: Reused across all job types

### ✅ Consistency
- All jobs have same status tracking
- All jobs have same retry mechanism
- All jobs have same UI patterns
- Predictable behavior

---

## Migration Steps

1. ✅ Create new generic tables (`m_job_types`, `t_job_scheduler_configs`, `t_job_executions`)
2. ✅ Migrate existing portfolio snapshot config
3. ✅ Refactor backend services
4. ✅ Refactor backend routes/controller
5. ✅ Refactor frontend types/services
6. ✅ Refactor frontend components
7. ✅ Test existing functionality
8. ✅ Update documentation

---

## Adding a New Job (After Refactoring)

### Example: Adding "Data Cleanup" Job

1. **Add job type to enum** (1 line)
```typescript
export enum JobType {
  PORTFOLIO_SNAPSHOT = 'PORTFOLIO_SNAPSHOT',
  DATA_CLEANUP = 'DATA_CLEANUP'  // ← ADD THIS
}
```

2. **Create job implementation** (1 file, ~100 lines)
```typescript
// backend/src/services/jobs/dataCleanup.job.ts
export class DataCleanupJob implements JobExecutor {
  jobType = JobType.DATA_CLEANUP;

  async execute(context: JobExecutionContext): Promise<JobExecutionResult> {
    // Cleanup logic here
  }
}
```

3. **Register job** (1 line)
```typescript
// In jobScheduler.service.ts constructor
this.registerJob(new DataCleanupJob());  // ← ADD THIS
```

4. **Create UI tab** (1 file, reusing components)
```typescript
// frontend/src/pages/cruiseControl/DataCleanupTab.tsx
<JobStatisticsCards jobType="DATA_CLEANUP" />
<JobManualTrigger jobType="DATA_CLEANUP" />
<JobExecutionTable jobType="DATA_CLEANUP" />
```

**Total:** 1 enum value + 2 files + 2 registration lines = **DONE!** ✅

---

## Approval Needed

Before I proceed with refactoring:

1. ✅ Does this architecture make sense?
2. ✅ Any changes/improvements you'd like?
3. ✅ Should I proceed with the refactoring?

Once approved, I'll refactor everything systematically while preserving existing functionality.
