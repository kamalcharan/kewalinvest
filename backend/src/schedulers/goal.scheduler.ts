// backend/src/schedulers/goal.scheduler.ts

import cron from 'node-cron';
import { GoalRecalculationJob } from '../services/goal.recalculation.job';

/**
 * Goal Scheduler - Manages automated goal recalculation and alerts
 *
 * Schedule:
 * - Nightly recalculation: 2 AM daily
 * - Alert generation: Every 6 hours
 */
export class GoalScheduler {
  private goalRecalcJob: GoalRecalculationJob;
  private nightlyRecalcTask?: cron.ScheduledTask;
  private alertGenerationTask?: cron.ScheduledTask;

  constructor() {
    this.goalRecalcJob = new GoalRecalculationJob();
  }

  /**
   * Start all scheduled tasks
   */
  start(): void {
    console.log('🚀 Starting Goal Scheduler...');

    // Nightly recalculation at 2 AM every day
    this.nightlyRecalcTask = cron.schedule('0 2 * * *', async () => {
      console.log('⏰ [Goal Scheduler] Running nightly goal recalculation...');
      try {
        await this.goalRecalcJob.runMonthlyRecalculation();
        console.log('✅ [Goal Scheduler] Nightly recalculation completed successfully');
      } catch (error) {
        console.error('❌ [Goal Scheduler] Nightly recalculation failed:', error);
      }
    }, {
      scheduled: true,
      timezone: 'Asia/Kolkata' // Adjust to your timezone
    });

    // Alert generation every 6 hours (optional - for now just log)
    this.alertGenerationTask = cron.schedule('0 */6 * * *', async () => {
      console.log('⏰ [Goal Scheduler] Alert generation scheduled (not yet implemented)');
      // TODO: Implement alert generation logic
      // This would check all goals for alert conditions and create alerts in t_goal_alerts
    }, {
      scheduled: true,
      timezone: 'Asia/Kolkata'
    });

    console.log('✅ Goal Scheduler started successfully');
    console.log('   - Nightly recalculation: Every day at 2:00 AM');
    console.log('   - Alert generation: Every 6 hours (placeholder)');
  }

  /**
   * Stop all scheduled tasks
   */
  stop(): void {
    console.log('🛑 Stopping Goal Scheduler...');

    if (this.nightlyRecalcTask) {
      this.nightlyRecalcTask.stop();
      console.log('   - Nightly recalculation task stopped');
    }

    if (this.alertGenerationTask) {
      this.alertGenerationTask.stop();
      console.log('   - Alert generation task stopped');
    }

    console.log('✅ Goal Scheduler stopped');
  }

  /**
   * Get status of scheduled tasks
   */
  getStatus(): {
    nightlyRecalc: boolean;
    alertGeneration: boolean;
  } {
    return {
      nightlyRecalc: this.nightlyRecalcTask ? true : false,
      alertGeneration: this.alertGenerationTask ? true : false
    };
  }

  /**
   * Manually trigger nightly recalculation (for testing)
   */
  async triggerNightlyRecalc(): Promise<void> {
    console.log('🔧 [Goal Scheduler] Manually triggering nightly recalculation...');
    try {
      await this.goalRecalcJob.runMonthlyRecalculation();
      console.log('✅ [Goal Scheduler] Manual recalculation completed');
    } catch (error) {
      console.error('❌ [Goal Scheduler] Manual recalculation failed:', error);
      throw error;
    }
  }
}

// Singleton instance
let goalSchedulerInstance: GoalScheduler | null = null;

/**
 * Get or create the goal scheduler instance
 */
export function getGoalScheduler(): GoalScheduler {
  if (!goalSchedulerInstance) {
    goalSchedulerInstance = new GoalScheduler();
  }
  return goalSchedulerInstance;
}

/**
 * Initialize and start the goal scheduler
 */
export function initializeGoalScheduler(): GoalScheduler {
  const scheduler = getGoalScheduler();
  scheduler.start();
  return scheduler;
}
