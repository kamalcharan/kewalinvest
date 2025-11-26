// backend/src/jobs/portfolioSnapshot.executor.ts
// Portfolio Snapshot Job Executor - Friday 9 PM

import { Pool } from 'pg';
import { pool } from '../config/database';
import {
  JobType,
  JobExecutor,
  JobExecutionContext,
  JobExecutionResult,
  PortfolioSnapshotExecutionData
} from '../types/jobs.types';
import { PortfolioSnapshotService } from '../services/portfolioSnapshot.service';
import { SimpleLogger } from '../services/simpleLogger.service';

/**
 * Portfolio Snapshot Job Executor
 *
 * Generates monthly portfolio snapshots for all customers.
 * This is a PER-TENANT job - runs for each tenant separately.
 *
 * Schedule: Friday 9 PM IST (weekly)
 */
export class PortfolioSnapshotExecutor implements JobExecutor {
  readonly jobType = JobType.PORTFOLIO_SNAPSHOT;
  private db: Pool;
  private snapshotService: PortfolioSnapshotService;

  constructor() {
    this.db = pool;
    this.snapshotService = new PortfolioSnapshotService();
  }

  /**
   * Execute the portfolio snapshot job
   */
  async execute(context: JobExecutionContext): Promise<JobExecutionResult> {
    const startTime = Date.now();
    const executionData: PortfolioSnapshotExecutionData = {
      snapshot_month_end: this.getLastMonthEnd(),
      customers_processed: 0,
      customers_failed: 0,
      snapshots_created: 0,
      snapshots_updated: 0,
      errors: []
    };

    try {
      SimpleLogger.info('PortfolioSnapshotJob', 'Starting portfolio snapshot generation', 'execute', {
        trigger_source: context.trigger_source,
        tenant_id: context.tenant_id,
        is_live: context.is_live,
        month_end: executionData.snapshot_month_end
      });

      // Step 1: Get all active customers for this tenant
      const customers = await this.getActiveCustomers(context.tenant_id, context.is_live);

      if (customers.length === 0) {
        SimpleLogger.warn('PortfolioSnapshotJob', 'No active customers found', 'execute', {
          tenant_id: context.tenant_id
        });
        return {
          success: true,
          execution_data: {
            ...executionData,
            message: 'No active customers to process'
          },
          execution_duration_ms: Date.now() - startTime
        };
      }

      executionData.customers_processed = customers.length;
      SimpleLogger.info('PortfolioSnapshotJob', `Processing ${customers.length} customers`, 'execute');

      // Step 2: Generate snapshots using the service's batch method
      const result = await this.snapshotService.generateSnapshots({
        tenant_id: context.tenant_id,
        is_live: context.is_live,
        snapshot_month_end: executionData.snapshot_month_end,
        customer_ids: customers.map(c => c.id)
      });

      // Update execution data from result
      executionData.customers_processed = result.customers_processed;
      executionData.customers_failed = result.customers_failed;
      executionData.snapshots_created = result.snapshots_created;
      executionData.snapshots_updated = result.snapshots_updated;

      if (result.errors && result.errors.length > 0) {
        executionData.errors = result.errors.map(e => ({
          customer_id: e.customer_id,
          customer_name: e.customer_name || 'Unknown',
          error_message: e.error_message
        }));
      }

      SimpleLogger.info('PortfolioSnapshotJob', 'Portfolio snapshot generation completed', 'execute', {
        customers_processed: executionData.customers_processed,
        customers_failed: executionData.customers_failed,
        snapshots_created: executionData.snapshots_created,
        snapshots_updated: executionData.snapshots_updated,
        duration_ms: Date.now() - startTime
      });

      // Consider job successful if more than 80% succeeded
      const successRate = executionData.customers_processed > 0
        ? (executionData.customers_processed - executionData.customers_failed) / executionData.customers_processed
        : 1;

      return {
        success: successRate >= 0.8,
        execution_data: executionData,
        execution_duration_ms: Date.now() - startTime,
        error: successRate < 0.8 ? `${executionData.customers_failed} customers failed` : undefined
      };

    } catch (error: any) {
      SimpleLogger.error('PortfolioSnapshotJob', 'Portfolio snapshot generation failed', 'execute', {
        error: error.message
      }, undefined, context.tenant_id, error.stack);

      return {
        success: false,
        execution_data: executionData,
        execution_duration_ms: Date.now() - startTime,
        error: error.message,
        error_details: { stack: error.stack }
      };
    }
  }

  /**
   * Get the last day of previous month
   */
  private getLastMonthEnd(): Date {
    const today = new Date();
    const lastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
    return lastMonth;
  }

  /**
   * Get all active customers for a tenant
   */
  private async getActiveCustomers(tenantId: number, isLive: boolean): Promise<Array<{ id: number; display_name: string }>> {
    const query = `
      SELECT id, display_name
      FROM t_customers
      WHERE tenant_id = $1
        AND is_live = $2
        AND is_active = true
      ORDER BY display_name
    `;

    const result = await this.db.query(query, [tenantId, isLive]);
    return result.rows;
  }

  /**
   * Validate job configuration
   */
  validateConfig(config: any): boolean {
    return true;
  }

  /**
   * Get default configuration
   */
  getDefaultConfig(): any {
    return {
      schedule_type: 'weekly',
      cron_expression: '0 21 * * 5' // Friday 9 PM
    };
  }
}

// Export singleton instance
export const portfolioSnapshotExecutor = new PortfolioSnapshotExecutor();
