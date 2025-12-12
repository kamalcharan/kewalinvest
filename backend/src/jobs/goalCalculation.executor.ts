// backend/src/jobs/goalCalculation.executor.ts
// Goal Calculation Job Executor - Friday 8:30 PM
// Recalculates all active goals and creates progress snapshots

import { Pool } from 'pg';
import { pool } from '../config/database';
import {
  JobType,
  JobExecutor,
  JobExecutionContext,
  JobExecutionResult,
  GoalCalculationExecutionData
} from '../types/jobs.types';
import { GoalService } from '../services/goal.service';
import { SimpleLogger } from '../services/simpleLogger.service';

/**
 * Goal Calculation Job Executor
 *
 * Recalculates all active goals for the tenant and creates progress snapshots.
 * This updates the goal tracking charts shown in CustomerView -> Goals Management -> Goal View.
 *
 * For each goal:
 * 1. Fetches current portfolio value
 * 2. Recalculates projections based on goal type (time_based, price_based, time_and_price)
 * 3. Creates a progress snapshot in t_goal_progress_snapshots
 * 4. Checks for alerts (behind schedule, low probability, significant deviation)
 *
 * Schedule: Friday 8:30 PM IST (weekly)
 * This is a PER-TENANT job - runs for each tenant separately.
 */
export class GoalCalculationExecutor implements JobExecutor {
  readonly jobType = JobType.GOAL_CALCULATION;
  private db: Pool;
  private goalService: GoalService;

  constructor() {
    this.db = pool;
    this.goalService = new GoalService();
  }

  /**
   * Execute the goal calculation job
   */
  async execute(context: JobExecutionContext): Promise<JobExecutionResult> {
    const startTime = Date.now();
    const executionData: GoalCalculationExecutionData = {
      calculation_date: new Date(),
      goals_processed: 0,
      goals_updated: 0,
      goals_failed: 0,
      alerts_generated: 0,
      errors: []
    };

    try {
      SimpleLogger.info('GoalCalculationJob', 'Starting goal calculation', 'execute', {
        trigger_source: context.trigger_source,
        tenant_id: context.tenant_id,
        is_live: context.is_live
      });

      // Get count of active goals first
      const goalCountResult = await this.db.query(
        `SELECT COUNT(*) as count FROM t_jtbd_configurations
         WHERE tenant_id = $1 AND is_live = $2 AND jtbd_type = 'goal_tracking' AND is_active = true`,
        [context.tenant_id, context.is_live]
      );
      const totalGoals = parseInt(goalCountResult.rows[0].count);

      if (totalGoals === 0) {
        SimpleLogger.warn('GoalCalculationJob', 'No active goals found', 'execute', {
          tenant_id: context.tenant_id
        });
        return {
          success: true,
          execution_data: {
            ...executionData,
            message: 'No active goals to process'
          },
          execution_duration_ms: Date.now() - startTime
        };
      }

      SimpleLogger.info('GoalCalculationJob', `Processing ${totalGoals} active goals`, 'execute');

      // Recalculate all goals using the existing service method
      const result = await this.goalService.recalculateAllGoals(
        context.tenant_id,
        context.is_live
      );

      executionData.goals_processed = totalGoals;
      executionData.goals_updated = result.success;
      executionData.goals_failed = result.failed;

      // Get count of alerts generated during this run (created today)
      const alertCountResult = await this.db.query(
        `SELECT COUNT(*) as count FROM t_goal_alerts
         WHERE tenant_id = $1 AND is_live = $2
         AND DATE(created_at) = CURRENT_DATE`,
        [context.tenant_id, context.is_live]
      );
      executionData.alerts_generated = parseInt(alertCountResult.rows[0].count) || 0;

      SimpleLogger.info('GoalCalculationJob', 'Goal calculation completed', 'execute', {
        goals_processed: executionData.goals_processed,
        goals_updated: executionData.goals_updated,
        goals_failed: executionData.goals_failed,
        alerts_generated: executionData.alerts_generated,
        duration_ms: Date.now() - startTime
      });

      // Consider job successful if more than 80% succeeded
      const successRate = executionData.goals_processed > 0
        ? executionData.goals_updated / executionData.goals_processed
        : 1;

      return {
        success: successRate >= 0.8,
        execution_data: executionData,
        execution_duration_ms: Date.now() - startTime,
        error: successRate < 0.8 ? `${executionData.goals_failed} goals failed to recalculate` : undefined
      };

    } catch (error: any) {
      SimpleLogger.error('GoalCalculationJob', 'Goal calculation failed', 'execute', {
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
      cron_expression: '30 20 * * 5' // Friday 8:30 PM
    };
  }
}

// Export singleton instance
export const goalCalculationExecutor = new GoalCalculationExecutor();
