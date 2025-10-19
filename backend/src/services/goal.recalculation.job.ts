// backend/src/services/goal.recalculation.job.ts

import { GoalService } from './goal.service';
import { pool } from '../config/database';

export class GoalRecalculationJob {
  private goalService: GoalService;

  constructor() {
    this.goalService = new GoalService();
  }

  /**
   * Run monthly recalculation for all active goals
   * This should be called by a cron job or scheduler
   */
  async runMonthlyRecalculation(): Promise<void> {
    console.log('🔄 Starting monthly goal recalculation job...');

    try {
      // Get all tenants
      const tenantQuery = `SELECT DISTINCT tenant_id, is_live FROM t_jtbd_configurations WHERE jtbd_type = 'goal_tracking' AND is_active = true`;
      const tenantResult = await pool.query(tenantQuery);

      let totalSuccess = 0;
      let totalFailed = 0;

      for (const row of tenantResult.rows) {
        const { tenant_id, is_live } = row;

        console.log(`📊 Recalculating goals for tenant ${tenant_id} (${is_live ? 'live' : 'test'})`);

        const result = await this.goalService.recalculateAllGoals(tenant_id, is_live);

        totalSuccess += result.success;
        totalFailed += result.failed;

        console.log(`✅ Tenant ${tenant_id}: ${result.success} success, ${result.failed} failed`);
      }

      console.log(`🎉 Monthly recalculation completed: ${totalSuccess} success, ${totalFailed} failed`);
    } catch (error) {
      console.error('❌ Error in monthly recalculation job:', error);
      throw error;
    }
  }

  /**
   * Recalculate goals when portfolio is updated
   * Called when transactions are processed
   */
  async recalculateOnPortfolioUpdate(
    tenantId: number,
    isLive: boolean,
    customerId: number
  ): Promise<void> {
    console.log(`🔄 Recalculating goals for customer ${customerId} after portfolio update...`);

    try {
      const results = await this.goalService.recalculateCustomerGoals(
        tenantId,
        isLive,
        customerId
      );

      console.log(`✅ Recalculated ${results.length} goals for customer ${customerId}`);
    } catch (error) {
      console.error(`❌ Error recalculating goals for customer ${customerId}:`, error);
      // Don't throw - portfolio update should succeed even if goal recalc fails
    }
  }
}

// Example cron job setup (using node-cron)
// import cron from 'node-cron';
// 
// // Run on 1st of every month at 2 AM
// cron.schedule('0 2 1 * *', async () => {
//   const job = new GoalRecalculationJob();
//   await job.runMonthlyRecalculation();
// });