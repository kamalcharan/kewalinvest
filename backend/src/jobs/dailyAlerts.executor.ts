// backend/src/jobs/dailyAlerts.executor.ts
// Daily Alerts Job Executor - Daily 8 PM
// Processes profile triggers, time-based alerts, and import notifications

import { Pool } from 'pg';
import { pool } from '../config/database';
import {
  JobType,
  JobExecutor,
  JobExecutionContext,
  JobExecutionResult,
  DailyAlertsExecutionData
} from '../types/jobs.types';
import { SimpleLogger } from '../services/simpleLogger.service';

/**
 * Daily Alerts Job Executor
 *
 * Handles three types of alerts:
 * 1. profile_trigger - Birthday/Anniversary reminders
 *    - Creates alerts 7 days before the date
 *    - Auto-acknowledges 1 day after the date
 *
 * 2. time_based - Date-based reminders
 *    - Makes alerts visible 7 days before alert_date
 *    - Auto-acknowledges 1 day after the date
 *
 * 3. import_notification - Transaction import notifications
 *    - Auto-acknowledges next day after creation
 *
 * Schedule: Daily 8 PM IST
 * This is a PER-TENANT job - runs for each tenant separately.
 */
export class DailyAlertsExecutor implements JobExecutor {
  readonly jobType = JobType.DAILY_ALERTS;
  private db: Pool;

  constructor() {
    this.db = pool;
  }

  /**
   * Execute the daily alerts job
   */
  async execute(context: JobExecutionContext): Promise<JobExecutionResult> {
    const startTime = Date.now();
    const executionData: DailyAlertsExecutionData = {
      execution_date: new Date(),
      alerts_processed: 0,
      alerts_triggered: 0,
      alerts_skipped: 0,
      customers_affected: 0,
      errors: []
    };

    try {
      SimpleLogger.info('DailyAlertsJob', 'Starting daily alerts processing', 'execute', {
        trigger_source: context.trigger_source,
        tenant_id: context.tenant_id,
        is_live: context.is_live
      });

      // Step 1: Process profile triggers (birthdays/anniversaries)
      const profileResult = await this.processProfileTriggers(context.tenant_id, context.is_live);
      executionData.alerts_triggered += profileResult.created;
      executionData.alerts_processed += profileResult.autoAcknowledged;
      executionData.customers_affected += profileResult.customersAffected;
      if (profileResult.errors.length > 0) {
        executionData.errors!.push(...profileResult.errors);
      }

      // Step 2: Process time-based alerts
      const timeBasedResult = await this.processTimeBasedAlerts(context.tenant_id, context.is_live);
      executionData.alerts_triggered += timeBasedResult.activated;
      executionData.alerts_processed += timeBasedResult.autoAcknowledged;
      if (timeBasedResult.errors.length > 0) {
        executionData.errors!.push(...timeBasedResult.errors);
      }

      // Step 3: Auto-acknowledge import notifications
      const importResult = await this.processImportNotifications(context.tenant_id, context.is_live);
      executionData.alerts_processed += importResult.autoAcknowledged;
      if (importResult.errors.length > 0) {
        executionData.errors!.push(...importResult.errors);
      }

      SimpleLogger.info('DailyAlertsJob', 'Daily alerts processing completed', 'execute', {
        alerts_triggered: executionData.alerts_triggered,
        alerts_processed: executionData.alerts_processed,
        customers_affected: executionData.customers_affected,
        duration_ms: Date.now() - startTime
      });

      return {
        success: true,
        execution_data: executionData,
        execution_duration_ms: Date.now() - startTime
      };

    } catch (error: any) {
      SimpleLogger.error('DailyAlertsJob', 'Daily alerts processing failed', 'execute', {
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
   * Process profile triggers (birthdays and anniversaries)
   * - Creates alerts 7 days before the date
   * - Auto-acknowledges 1 day after the date
   */
  private async processProfileTriggers(
    tenantId: number,
    isLive: boolean
  ): Promise<{
    created: number;
    autoAcknowledged: number;
    customersAffected: number;
    errors: Array<{ alert_id: number; customer_id: number; error_message: string }>;
  }> {
    const result = {
      created: 0,
      autoAcknowledged: 0,
      customersAffected: 0,
      errors: [] as Array<{ alert_id: number; customer_id: number; error_message: string }>
    };

    try {
      const today = new Date();
      const sevenDaysFromNow = new Date(today);
      sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      // Get the month and day for comparison (handles yearly recurrence)
      const targetMonth = sevenDaysFromNow.getMonth() + 1; // 1-12
      const targetDay = sevenDaysFromNow.getDate();

      const yesterdayMonth = yesterday.getMonth() + 1;
      const yesterdayDay = yesterday.getDate();

      // Step 1: Find customers with birthdays in 7 days who don't have an active alert
      const birthdayCustomersQuery = `
        SELECT c.id as customer_id, c.display_name, c.date_of_birth,
               u.id as created_by_user_id
        FROM t_customers c
        CROSS JOIN (
          SELECT id FROM t_users WHERE tenant_id = $1 AND is_active = true LIMIT 1
        ) u
        WHERE c.tenant_id = $1
          AND c.is_live = $2
          AND c.is_active = true
          AND c.date_of_birth IS NOT NULL
          AND EXTRACT(MONTH FROM c.date_of_birth) = $3
          AND EXTRACT(DAY FROM c.date_of_birth) = $4
          AND NOT EXISTS (
            SELECT 1 FROM t_jtbd_configurations j
            WHERE j.customer_id = c.id
              AND j.tenant_id = $1
              AND j.is_live = $2
              AND j.jtbd_type = 'profile_trigger'
              AND j.config_data->>'trigger_type' = 'birthday'
              AND j.completed_at IS NULL
              AND j.is_active = true
              AND EXTRACT(YEAR FROM j.next_alert_date) = EXTRACT(YEAR FROM CURRENT_DATE)
          )
      `;

      const birthdayCustomers = await this.db.query(birthdayCustomersQuery, [
        tenantId, isLive, targetMonth, targetDay
      ]);

      // Create birthday alerts
      for (const customer of birthdayCustomers.rows) {
        try {
          await this.createProfileAlert(
            tenantId,
            isLive,
            customer.customer_id,
            customer.created_by_user_id,
            'birthday',
            customer.display_name,
            customer.date_of_birth
          );
          result.created++;
          result.customersAffected++;
        } catch (err: any) {
          result.errors.push({
            alert_id: 0,
            customer_id: customer.customer_id,
            error_message: `Failed to create birthday alert: ${err.message}`
          });
        }
      }

      // Step 2: Find customers with anniversaries in 7 days who don't have an active alert
      const anniversaryCustomersQuery = `
        SELECT c.id as customer_id, c.display_name, c.anniversary_date,
               u.id as created_by_user_id
        FROM t_customers c
        CROSS JOIN (
          SELECT id FROM t_users WHERE tenant_id = $1 AND is_active = true LIMIT 1
        ) u
        WHERE c.tenant_id = $1
          AND c.is_live = $2
          AND c.is_active = true
          AND c.anniversary_date IS NOT NULL
          AND EXTRACT(MONTH FROM c.anniversary_date) = $3
          AND EXTRACT(DAY FROM c.anniversary_date) = $4
          AND NOT EXISTS (
            SELECT 1 FROM t_jtbd_configurations j
            WHERE j.customer_id = c.id
              AND j.tenant_id = $1
              AND j.is_live = $2
              AND j.jtbd_type = 'profile_trigger'
              AND j.config_data->>'trigger_type' = 'anniversary'
              AND j.completed_at IS NULL
              AND j.is_active = true
              AND EXTRACT(YEAR FROM j.next_alert_date) = EXTRACT(YEAR FROM CURRENT_DATE)
          )
      `;

      const anniversaryCustomers = await this.db.query(anniversaryCustomersQuery, [
        tenantId, isLive, targetMonth, targetDay
      ]);

      // Create anniversary alerts
      for (const customer of anniversaryCustomers.rows) {
        try {
          await this.createProfileAlert(
            tenantId,
            isLive,
            customer.customer_id,
            customer.created_by_user_id,
            'anniversary',
            customer.display_name,
            customer.anniversary_date
          );
          result.created++;
          if (!birthdayCustomers.rows.find((c: any) => c.customer_id === customer.customer_id)) {
            result.customersAffected++;
          }
        } catch (err: any) {
          result.errors.push({
            alert_id: 0,
            customer_id: customer.customer_id,
            error_message: `Failed to create anniversary alert: ${err.message}`
          });
        }
      }

      // Step 3: Auto-acknowledge profile alerts that are 1+ day past the date
      const autoAckQuery = `
        UPDATE t_jtbd_configurations
        SET completed_at = CURRENT_TIMESTAMP,
            completion_source = 'auto_expire',
            updated_at = CURRENT_TIMESTAMP
        WHERE tenant_id = $1
          AND is_live = $2
          AND jtbd_type = 'profile_trigger'
          AND is_active = true
          AND completed_at IS NULL
          AND next_alert_date < $3
        RETURNING id, customer_id
      `;

      const autoAckResult = await this.db.query(autoAckQuery, [tenantId, isLive, yesterday]);
      result.autoAcknowledged = autoAckResult.rowCount || 0;

      SimpleLogger.info('DailyAlertsJob', 'Profile triggers processed', 'processProfileTriggers', {
        birthdays_found: birthdayCustomers.rowCount,
        anniversaries_found: anniversaryCustomers.rowCount,
        alerts_created: result.created,
        auto_acknowledged: result.autoAcknowledged
      });

    } catch (error: any) {
      SimpleLogger.error('DailyAlertsJob', 'Error processing profile triggers', 'processProfileTriggers', {
        error: error.message
      });
      throw error;
    }

    return result;
  }

  /**
   * Create a profile trigger alert
   */
  private async createProfileAlert(
    tenantId: number,
    isLive: boolean,
    customerId: number,
    createdByUserId: number,
    triggerType: 'birthday' | 'anniversary',
    customerName: string,
    eventDate: Date
  ): Promise<void> {
    // Calculate this year's event date
    const thisYear = new Date().getFullYear();
    const eventThisYear = new Date(thisYear, eventDate.getMonth(), eventDate.getDate());

    // If the date has passed this year, it means we're creating for next year
    // But since we check 7 days ahead, this shouldn't happen normally

    const title = triggerType === 'birthday'
      ? `🎂 ${customerName}'s Birthday`
      : `💑 ${customerName}'s Anniversary`;

    const description = triggerType === 'birthday'
      ? `Birthday reminder for ${customerName}`
      : `Anniversary reminder for ${customerName}`;

    const configData = {
      trigger_type: triggerType,
      event_date: eventThisYear.toISOString().split('T')[0],
      days_before: 7,
      auto_created: true
    };

    const insertQuery = `
      INSERT INTO t_jtbd_configurations (
        tenant_id, is_live, customer_id, jtbd_type, jtbd_category,
        title, description, priority, is_active, config_data,
        next_alert_date, created_by, created_at, updated_at
      ) VALUES (
        $1, $2, $3, 'profile_trigger', 'alert',
        $4, $5, 'medium', true, $6,
        $7, $8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      )
    `;

    await this.db.query(insertQuery, [
      tenantId,
      isLive,
      customerId,
      title,
      description,
      JSON.stringify(configData),
      eventThisYear,
      createdByUserId
    ]);
  }

  /**
   * Process time-based alerts
   * - Makes alerts visible 7 days before alert_date (updates next_alert_date)
   * - Auto-acknowledges 1 day after the date
   */
  private async processTimeBasedAlerts(
    tenantId: number,
    isLive: boolean
  ): Promise<{
    activated: number;
    autoAcknowledged: number;
    errors: Array<{ alert_id: number; customer_id: number; error_message: string }>;
  }> {
    const result = {
      activated: 0,
      autoAcknowledged: 0,
      errors: [] as Array<{ alert_id: number; customer_id: number; error_message: string }>
    };

    try {
      const today = new Date();
      const sevenDaysFromNow = new Date(today);
      sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      // Step 1: Activate time-based alerts that are 7 days away
      // Update next_alert_date to make them visible in the dashboard
      const activateQuery = `
        UPDATE t_jtbd_configurations
        SET next_alert_date = (config_data->>'alert_date')::date,
            updated_at = CURRENT_TIMESTAMP
        WHERE tenant_id = $1
          AND is_live = $2
          AND jtbd_type = 'time_based'
          AND is_active = true
          AND completed_at IS NULL
          AND next_alert_date IS NULL
          AND (config_data->>'alert_date')::date <= $3
          AND (config_data->>'alert_date')::date >= CURRENT_DATE
        RETURNING id
      `;

      const activateResult = await this.db.query(activateQuery, [
        tenantId, isLive, sevenDaysFromNow.toISOString().split('T')[0]
      ]);
      result.activated = activateResult.rowCount || 0;

      // Step 2: Auto-acknowledge time-based alerts that are 1+ day past
      const autoAckQuery = `
        UPDATE t_jtbd_configurations
        SET completed_at = CURRENT_TIMESTAMP,
            completion_source = 'auto_expire',
            updated_at = CURRENT_TIMESTAMP
        WHERE tenant_id = $1
          AND is_live = $2
          AND jtbd_type = 'time_based'
          AND is_active = true
          AND completed_at IS NULL
          AND next_alert_date < $3
        RETURNING id, customer_id
      `;

      const autoAckResult = await this.db.query(autoAckQuery, [
        tenantId, isLive, yesterday.toISOString().split('T')[0]
      ]);
      result.autoAcknowledged = autoAckResult.rowCount || 0;

      SimpleLogger.info('DailyAlertsJob', 'Time-based alerts processed', 'processTimeBasedAlerts', {
        activated: result.activated,
        auto_acknowledged: result.autoAcknowledged
      });

    } catch (error: any) {
      SimpleLogger.error('DailyAlertsJob', 'Error processing time-based alerts', 'processTimeBasedAlerts', {
        error: error.message
      });
      throw error;
    }

    return result;
  }

  /**
   * Process import notifications
   * - Auto-acknowledges notifications that are 1+ day old
   */
  private async processImportNotifications(
    tenantId: number,
    isLive: boolean
  ): Promise<{
    autoAcknowledged: number;
    errors: Array<{ alert_id: number; customer_id: number; error_message: string }>;
  }> {
    const result = {
      autoAcknowledged: 0,
      errors: [] as Array<{ alert_id: number; customer_id: number; error_message: string }>
    };

    try {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      // Auto-acknowledge import notifications older than 1 day
      const autoAckQuery = `
        UPDATE t_jtbd_configurations
        SET completed_at = CURRENT_TIMESTAMP,
            completion_source = 'auto_expire',
            updated_at = CURRENT_TIMESTAMP
        WHERE tenant_id = $1
          AND is_live = $2
          AND jtbd_type = 'import_notification'
          AND is_active = true
          AND completed_at IS NULL
          AND created_at < $3
        RETURNING id, customer_id
      `;

      const autoAckResult = await this.db.query(autoAckQuery, [
        tenantId, isLive, yesterday
      ]);
      result.autoAcknowledged = autoAckResult.rowCount || 0;

      SimpleLogger.info('DailyAlertsJob', 'Import notifications processed', 'processImportNotifications', {
        auto_acknowledged: result.autoAcknowledged
      });

    } catch (error: any) {
      SimpleLogger.error('DailyAlertsJob', 'Error processing import notifications', 'processImportNotifications', {
        error: error.message
      });
      throw error;
    }

    return result;
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
      schedule_type: 'daily',
      cron_expression: '0 20 * * *' // Daily 8 PM
    };
  }
}

// Export singleton instance
export const dailyAlertsExecutor = new DailyAlertsExecutor();
