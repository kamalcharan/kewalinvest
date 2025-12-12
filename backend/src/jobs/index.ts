// backend/src/jobs/index.ts
// Job Executor Registry - Register all job executors here

import { JobSchedulerService } from '../services/jobScheduler.service';
import { navDownloadExecutor } from './navDownload.executor';
import { portfolioSnapshotExecutor } from './portfolioSnapshot.executor';
import { dailyAlertsExecutor } from './dailyAlerts.executor';
import { goalCalculationExecutor } from './goalCalculation.executor';
import { marketOhlcDownloadExecutor } from './marketOhlcDownload.executor';

/**
 * Register all job executors with the JobSchedulerService
 * Call this during server startup
 */
export function registerAllJobExecutors(scheduler: JobSchedulerService): void {
  console.log('[JobRegistry] Registering job executors...');

  // NAV Download - Daily 9 PM, Failover 10 PM (GLOBAL)
  scheduler.registerJob(navDownloadExecutor);

  // Market OHLC Download - Daily 9:30 PM (GLOBAL)
  // Downloads daily OHLC data for all registered market indices
  scheduler.registerJob(marketOhlcDownloadExecutor);

  // Portfolio Snapshot - Friday 9 PM (per-tenant)
  scheduler.registerJob(portfolioSnapshotExecutor);

  // Daily Alerts - Daily 8 PM (per-tenant)
  // Processes: profile_trigger, time_based, import_notification
  scheduler.registerJob(dailyAlertsExecutor);

  // Goal Calculation - Friday 8:30 PM (per-tenant)
  // Recalculates all goals and creates progress snapshots
  scheduler.registerJob(goalCalculationExecutor);

  console.log('[JobRegistry] All job executors registered');
}

// Export individual executors for direct access
export { navDownloadExecutor } from './navDownload.executor';
export { portfolioSnapshotExecutor } from './portfolioSnapshot.executor';
export { dailyAlertsExecutor } from './dailyAlerts.executor';
export { goalCalculationExecutor } from './goalCalculation.executor';
export { marketOhlcDownloadExecutor } from './marketOhlcDownload.executor';
