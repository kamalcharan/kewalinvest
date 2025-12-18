// backend/src/jobs/dailyAlerts.executor.ts
// Daily Alerts Job Executor - Daily 8 PM
// Processes profile triggers, time-based alerts, and import notifications
// Supports incremental processing - catches up on missed days since last successful run

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
   * Supports incremental processing - processes all days from last successful run to today
   */
  async execute(context: JobExecutionContext): Promise<JobExecutionResult> {
    const startTime = Date.now();
    const executionData: DailyAlertsExecutionData & {
      days_processed?: number;
      start_date?: string;
      end_date?: string;
    } = {
      execution_date: new Date(),
      alerts_processed: 0,
      alerts_triggered: 0,
      alerts_skipped: 0,
      customers_affected: 0,
      errors: []
    };

    try {
      // Get the last successful execution date for incremental processing
      const lastSuccessDate = await this.getLastSuccessDate(context.tenant_id, context.is_live);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Determine the start date for processing
      let startDate: Date;
      if (lastSuccessDate) {
        // Start from the day after last successful run
        startDate = new Date(lastSuccessDate);
        startDate.setDate(startDate.getDate() + 1);
        startDate.setHours(0, 0, 0, 0);
      } else {
        // No previous run, just process today
        startDate = today;
      }

      // Don't process future dates
      if (startDate > today) {
        startDate = today;
      }

      // Calculate days to process
      const daysDiff = Math.floor((today.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000)) + 1;

      SimpleLogger.info('DailyAlertsJob', 'Starting daily alerts processing', 'execute', {
        trigger_source: context.trigger_source,
        tenant_id: context.tenant_id,
        is_live: context.is_live,
        last_success: lastSuccessDate?.toISOString() || 'never',
        start_date: startDate.toISOString(),
        days_to_process: daysDiff
      });

      // Track processing metadata
      executionData.days_processed = daysDiff;
      executionData.start_date = startDate.toISOString().split('T')[0];
      executionData.end_date = today.toISOString().split('T')[0];

      // Process each day from startDate to today
      const currentDate = new Date(startDate);
      const customersSet = new Set<number>();

      while (currentDate <= today) {
        SimpleLogger.info('DailyAlertsJob', `Processing alerts for date: ${currentDate.toISOString().split('T')[0]}`, 'execute', {
          date: currentDate.toISOString().split('T')[0]
        });

        // Step 1: Process profile triggers (birthdays/anniversaries) for this date
        const profileResult = await this.processProfileTriggersForDate(
          context.tenant_id,
          context.is_live,
          currentDate
        );
        executionData.alerts_triggered += profileResult.created;
        executionData.alerts_processed += profileResult.autoAcknowledged;
        profileResult.customerIds.forEach(id => customersSet.add(id));
        if (profileResult.errors.length > 0) {
          executionData.errors!.push(...profileResult.errors);
        }

        // Step 2: Process time-based alerts for this date
        const timeBasedResult = await this.processTimeBasedAlertsForDate(
          context.tenant_id,
          context.is_live,
          currentDate
        );
        executionData.alerts_triggered += timeBasedResult.activated;
        executionData.alerts_processed += timeBasedResult.autoAcknowledged;
        if (timeBasedResult.errors.length > 0) {
          executionData.errors!.push(...timeBasedResult.errors);
        }

        // Step 3: Auto-acknowledge import notifications for this date
        const importResult = await this.processImportNotificationsForDate(
          context.tenant_id,
          context.is_live,
          currentDate
        );
        executionData.alerts_processed += importResult.autoAcknowledged;
        if (importResult.errors.length > 0) {
          executionData.errors!.push(...importResult.errors);
        }

        // Move to next day
        currentDate.setDate(currentDate.getDate() + 1);
      }

      executionData.customers_affected = customersSet.size;

      SimpleLogger.info('DailyAlertsJob', 'Daily alerts processing completed', 'execute', {
        alerts_triggered: executionData.alerts_triggered,
        alerts_processed: executionData.alerts_processed,
        customers_affected: executionData.customers_affected,
        days_processed: executionData.days_processed,
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
   * Get the last successful execution date for this job
   */
  private async getLastSuccessDate(tenantId: number, isLive: boolean): Promise<Date | null> {
    const query = `
      SELECT last_success_at
      FROM t_job_scheduler_configs
      WHERE tenant_id = $1 AND is_live = $2 AND job_type = $3
    `;

    const result = await this.db.query(query, [tenantId, isLive, JobType.DAILY_ALERTS]);

    if (result.rows.length > 0 && result.rows[0].last_success_at) {
      return new Date(result.rows[0].last_success_at);
    }

    return null;
  }

  /**
   * Process profile triggers (birthdays and anniversaries) for a specific reference date
   * - Creates alerts 7 days before the date
   * - Auto-acknowledges 1 day after the date
   * @param referenceDate - The date to use as "today" for processing
   */
  private async processProfileTriggersForDate(
    tenantId: number,
    isLive: boolean,
    referenceDate: Date
  ): Promise<{
    created: number;
    autoAcknowledged: number;
    customerIds: number[];
    errors: Array<{ alert_id: number; customer_id: number; error_message: string }>;
  }> {
    const result = {
      created: 0,
      autoAcknowledged: 0,
      customerIds: [] as number[],
      errors: [] as Array<{ alert_id: number; customer_id: number; error_message: string }>
    };

    try {
      // Calculate dates relative to referenceDate
      const sevenDaysFromRef = new Date(referenceDate);
      sevenDaysFromRef.setDate(sevenDaysFromRef.getDate() + 7);

      const dayBeforeRef = new Date(referenceDate);
      dayBeforeRef.setDate(dayBeforeRef.getDate() - 1);

      // Get the month and day for comparison (handles yearly recurrence)
      const targetMonth = sevenDaysFromRef.getMonth() + 1; // 1-12
      const targetDay = sevenDaysFromRef.getDate();
      const targetYear = sevenDaysFromRef.getFullYear();

      // Step 1: Find customers with birthdays in 7 days who don't have an active alert
      const birthdayCustomersQuery = `
        SELECT c.id as customer_id, ct.name as customer_name, c.date_of_birth,
               u.id as created_by_user_id
        FROM t_customers c
        JOIN t_contacts ct ON c.contact_id = ct.id
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
              AND EXTRACT(YEAR FROM j.next_alert_date) = $5
          )
      `;

      const birthdayCustomers = await this.db.query(birthdayCustomersQuery, [
        tenantId, isLive, targetMonth, targetDay, targetYear
      ]);

      // Create birthday alerts
      for (const customer of birthdayCustomers.rows) {
        try {
          await this.createProfileAlertForDate(
            tenantId,
            isLive,
            customer.customer_id,
            customer.created_by_user_id,
            'birthday',
            customer.customer_name,
            customer.date_of_birth,
            sevenDaysFromRef
          );
          result.created++;
          result.customerIds.push(customer.customer_id);
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
        SELECT c.id as customer_id, ct.name as customer_name, c.anniversary_date,
               u.id as created_by_user_id
        FROM t_customers c
        JOIN t_contacts ct ON c.contact_id = ct.id
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
              AND EXTRACT(YEAR FROM j.next_alert_date) = $5
          )
      `;

      const anniversaryCustomers = await this.db.query(anniversaryCustomersQuery, [
        tenantId, isLive, targetMonth, targetDay, targetYear
      ]);

      // Create anniversary alerts
      for (const customer of anniversaryCustomers.rows) {
        try {
          await this.createProfileAlertForDate(
            tenantId,
            isLive,
            customer.customer_id,
            customer.created_by_user_id,
            'anniversary',
            customer.customer_name,
            customer.anniversary_date,
            sevenDaysFromRef
          );
          result.created++;
          if (!result.customerIds.includes(customer.customer_id)) {
            result.customerIds.push(customer.customer_id);
          }
        } catch (err: any) {
          result.errors.push({
            alert_id: 0,
            customer_id: customer.customer_id,
            error_message: `Failed to create anniversary alert: ${err.message}`
          });
        }
      }

      // Step 3: Auto-acknowledge profile alerts that are 1+ day past the date (based on referenceDate)
      const autoAckQuery = `
        UPDATE t_jtbd_configurations
        SET completed_at = $4,
            completion_source = 'auto_expire',
            updated_at = $4
        WHERE tenant_id = $1
          AND is_live = $2
          AND jtbd_type = 'profile_trigger'
          AND is_active = true
          AND completed_at IS NULL
          AND next_alert_date < $3
        RETURNING id, customer_id
      `;

      const autoAckResult = await this.db.query(autoAckQuery, [
        tenantId, isLive, dayBeforeRef.toISOString().split('T')[0], referenceDate
      ]);
      result.autoAcknowledged = autoAckResult.rowCount || 0;

      SimpleLogger.info('DailyAlertsJob', 'Profile triggers processed for date', 'processProfileTriggersForDate', {
        reference_date: referenceDate.toISOString().split('T')[0],
        birthdays_found: birthdayCustomers.rowCount,
        anniversaries_found: anniversaryCustomers.rowCount,
        alerts_created: result.created,
        auto_acknowledged: result.autoAcknowledged
      });

    } catch (error: any) {
      SimpleLogger.error('DailyAlertsJob', 'Error processing profile triggers', 'processProfileTriggersForDate', {
        error: error.message,
        reference_date: referenceDate.toISOString()
      });
      throw error;
    }

    return result;
  }

  /**
   * Create a profile trigger alert for a specific target date
   * @param targetEventDate - The actual event date (e.g., birthday date this year)
   */
  private async createProfileAlertForDate(
    tenantId: number,
    isLive: boolean,
    customerId: number,
    createdByUserId: number,
    triggerType: 'birthday' | 'anniversary',
    customerName: string,
    originalEventDate: Date,
    targetEventDate: Date
  ): Promise<void> {
    // Use the provided target event date (already calculated for the correct year)
    const eventThisYear = new Date(targetEventDate.getFullYear(), originalEventDate.getMonth(), originalEventDate.getDate());

    const title = triggerType === 'birthday'
      ? `${customerName}'s Birthday`
      : `${customerName}'s Anniversary`;

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
   * Process time-based alerts for a specific reference date
   * - Makes alerts visible 7 days before alert_date (updates next_alert_date)
   * - Auto-acknowledges 1 day after the date
   * @param referenceDate - The date to use as "today" for processing
   */
  private async processTimeBasedAlertsForDate(
    tenantId: number,
    isLive: boolean,
    referenceDate: Date
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
      const sevenDaysFromRef = new Date(referenceDate);
      sevenDaysFromRef.setDate(sevenDaysFromRef.getDate() + 7);

      const dayBeforeRef = new Date(referenceDate);
      dayBeforeRef.setDate(dayBeforeRef.getDate() - 1);

      // Step 1: Activate time-based alerts that are within 7 days of referenceDate
      // Update next_alert_date to make them visible in the dashboard
      const activateQuery = `
        UPDATE t_jtbd_configurations
        SET next_alert_date = (config_data->>'alert_date')::date,
            updated_at = $4
        WHERE tenant_id = $1
          AND is_live = $2
          AND jtbd_type = 'time_based'
          AND is_active = true
          AND completed_at IS NULL
          AND next_alert_date IS NULL
          AND (config_data->>'alert_date')::date <= $3
          AND (config_data->>'alert_date')::date >= $5
        RETURNING id
      `;

      const activateResult = await this.db.query(activateQuery, [
        tenantId,
        isLive,
        sevenDaysFromRef.toISOString().split('T')[0],
        referenceDate,
        referenceDate.toISOString().split('T')[0]
      ]);
      result.activated = activateResult.rowCount || 0;

      // Step 2: Auto-acknowledge time-based alerts that are 1+ day past the referenceDate
      const autoAckQuery = `
        UPDATE t_jtbd_configurations
        SET completed_at = $4,
            completion_source = 'auto_expire',
            updated_at = $4
        WHERE tenant_id = $1
          AND is_live = $2
          AND jtbd_type = 'time_based'
          AND is_active = true
          AND completed_at IS NULL
          AND next_alert_date < $3
        RETURNING id, customer_id
      `;

      const autoAckResult = await this.db.query(autoAckQuery, [
        tenantId,
        isLive,
        dayBeforeRef.toISOString().split('T')[0],
        referenceDate
      ]);
      result.autoAcknowledged = autoAckResult.rowCount || 0;

      SimpleLogger.info('DailyAlertsJob', 'Time-based alerts processed for date', 'processTimeBasedAlertsForDate', {
        reference_date: referenceDate.toISOString().split('T')[0],
        activated: result.activated,
        auto_acknowledged: result.autoAcknowledged
      });

    } catch (error: any) {
      SimpleLogger.error('DailyAlertsJob', 'Error processing time-based alerts', 'processTimeBasedAlertsForDate', {
        error: error.message,
        reference_date: referenceDate.toISOString()
      });
      throw error;
    }

    return result;
  }

  /**
   * Process import notifications for a specific reference date
   * - Auto-acknowledges notifications that are 1+ day old relative to referenceDate
   * @param referenceDate - The date to use as "today" for processing
   */
  private async processImportNotificationsForDate(
    tenantId: number,
    isLive: boolean,
    referenceDate: Date
  ): Promise<{
    autoAcknowledged: number;
    errors: Array<{ alert_id: number; customer_id: number; error_message: string }>;
  }> {
    const result = {
      autoAcknowledged: 0,
      errors: [] as Array<{ alert_id: number; customer_id: number; error_message: string }>
    };

    try {
      const dayBeforeRef = new Date(referenceDate);
      dayBeforeRef.setDate(dayBeforeRef.getDate() - 1);

      // Auto-acknowledge import notifications older than 1 day relative to referenceDate
      const autoAckQuery = `
        UPDATE t_jtbd_configurations
        SET completed_at = $4,
            completion_source = 'auto_expire',
            updated_at = $4
        WHERE tenant_id = $1
          AND is_live = $2
          AND jtbd_type = 'import_notification'
          AND is_active = true
          AND completed_at IS NULL
          AND created_at < $3
        RETURNING id, customer_id
      `;

      const autoAckResult = await this.db.query(autoAckQuery, [
        tenantId, isLive, dayBeforeRef, referenceDate
      ]);
      result.autoAcknowledged = autoAckResult.rowCount || 0;

      SimpleLogger.info('DailyAlertsJob', 'Import notifications processed for date', 'processImportNotificationsForDate', {
        reference_date: referenceDate.toISOString().split('T')[0],
        auto_acknowledged: result.autoAcknowledged
      });

    } catch (error: any) {
      SimpleLogger.error('DailyAlertsJob', 'Error processing import notifications', 'processImportNotificationsForDate', {
        error: error.message,
        reference_date: referenceDate.toISOString()
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
