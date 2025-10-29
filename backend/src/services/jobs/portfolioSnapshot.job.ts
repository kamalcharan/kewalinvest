// backend/src/services/jobs/portfolioSnapshot.job.ts
// Portfolio Snapshot Job Implementation

import {
  JobType,
  JobExecutor,
  JobExecutionContext,
  JobExecutionResult,
  PortfolioSnapshotExecutionData
} from '../../types/jobs.types';
import { PortfolioSnapshotService } from '../portfolioSnapshot.service';

/**
 * Portfolio Snapshot Job
 * Generates monthly portfolio snapshots for all customers in a tenant
 */
export class PortfolioSnapshotJob implements JobExecutor {
  jobType = JobType.PORTFOLIO_SNAPSHOT;
  private service: PortfolioSnapshotService;

  constructor() {
    this.service = new PortfolioSnapshotService();
  }

  /**
   * Execute the portfolio snapshot generation
   */
  async execute(context: JobExecutionContext): Promise<JobExecutionResult> {
    const startTime = Date.now();

    try {
      console.log(`[PortfolioSnapshotJob] Starting execution for tenant ${context.tenant_id}, isLive: ${context.is_live}`);

      // Call the existing snapshot service
      const result = await this.service.generateSnapshots({
        tenant_id: context.tenant_id,
        is_live: context.is_live,
        trigger_source: context.trigger_source,
        snapshot_month_end: context.job_config?.snapshot_month_end
      });

      const executionTime = Date.now() - startTime;

      // Determine success based on whether snapshots were actually generated
      const hasResults = result.snapshots_created > 0 || result.snapshots_updated > 0;
      const allCustomersFailed = result.customers_failed > 0 && result.customers_processed === 0;

      if (allCustomersFailed || !hasResults) {
        console.error(`[PortfolioSnapshotJob] Execution failed for tenant ${context.tenant_id}. Customers processed: ${result.customers_processed}, Failed: ${result.customers_failed}, Snapshots: ${result.snapshots_created}C/${result.snapshots_updated}U`);

        return {
          success: false,
          execution_data: this.buildExecutionData(result),
          execution_duration_ms: executionTime,
          error: allCustomersFailed
            ? 'All customers failed to generate snapshots'
            : 'No snapshots were generated',
          error_details: result.errors
        };
      }

      console.log(`[PortfolioSnapshotJob] Execution completed successfully for tenant ${context.tenant_id}. Snapshots created: ${result.snapshots_created}, updated: ${result.snapshots_updated}`);

      // Success response - only if snapshots were actually generated
      return {
        success: true,
        execution_data: this.buildExecutionData(result),
        execution_duration_ms: executionTime
      };

    } catch (error: any) {
      const executionTime = Date.now() - startTime;
      console.error(`[PortfolioSnapshotJob] Fatal error during execution:`, error);

      return {
        success: false,
        execution_data: {},
        execution_duration_ms: executionTime,
        error: error.message,
        error_details: {
          stack: error.stack,
          code: error.code
        }
      };
    }
  }

  /**
   * Validate job-specific configuration
   */
  validateConfig(config: any): boolean {
    // For now, no specific config validation
    // Could add validation for snapshot_month_end format if provided
    if (config?.snapshot_month_end) {
      const date = new Date(config.snapshot_month_end);
      return !isNaN(date.getTime());
    }
    return true;
  }

  /**
   * Get default configuration for this job type
   */
  getDefaultConfig(): any {
    return {
      // No default job-specific config needed
      // Snapshot date is calculated automatically (end of previous month)
    };
  }

  /**
   * Build execution data in the standard format
   */
  private buildExecutionData(result: any): PortfolioSnapshotExecutionData {
    return {
      snapshot_month_end: result.snapshot_month_end,
      customers_processed: result.customers_processed,
      customers_failed: result.customers_failed,
      snapshots_created: result.snapshots_created,
      snapshots_updated: result.snapshots_updated,
      errors: result.errors?.map((err: any) => ({
        customer_id: err.customer_id,
        customer_name: err.customer_name,
        error_message: err.error_message
      }))
    };
  }
}
