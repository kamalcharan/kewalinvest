// backend/src/jobs/index.ts
// Job Executor Registry - Register all job executors here

import { JobSchedulerService } from '../services/jobScheduler.service';
import { navDownloadExecutor } from './navDownload.executor';
import { portfolioSnapshotExecutor } from './portfolioSnapshot.executor';

/**
 * Register all job executors with the JobSchedulerService
 * Call this during server startup
 */
export function registerAllJobExecutors(scheduler: JobSchedulerService): void {
  console.log('[JobRegistry] Registering job executors...');

  // NAV Download - Daily 9 PM, Failover 10 PM (GLOBAL)
  scheduler.registerJob(navDownloadExecutor);

  // Portfolio Snapshot - Friday 9 PM (per-tenant)
  scheduler.registerJob(portfolioSnapshotExecutor);

  // TODO: Add more executors as they are created
  // - Market OHLC Download (Daily 9:30 PM)
  // - Goal Calculation (Friday 8:30 PM)
  // - Daily Alerts (Daily 8 PM)

  console.log('[JobRegistry] All job executors registered');
}

// Export individual executors for direct access
export { navDownloadExecutor } from './navDownload.executor';
export { portfolioSnapshotExecutor } from './portfolioSnapshot.executor';
