// backend/src/services/jobScheduler.service.ts
// Generic scheduler service for all job types

import { Pool } from 'pg';
import { pool } from '../config/database';
import {
  JobType,
  JobSchedulerConfig,
  JobExecution,
  JobExecutor,
  JobExecutionContext,
  JobExecutionResult,
  JobStatistics,
  CreateJobConfigRequest,
  UpdateJobConfigRequest
} from '../types/jobs.types';

interface ScheduledTimer {
  timerId: NodeJS.Timeout;
  nextRun: Date;
  config: JobSchedulerConfig;
  isActive: boolean;
}

export class JobSchedulerService {
  private db: Pool;
  private jobRegistry = new Map<JobType, JobExecutor>();
  private activeTimers = new Map<string, ScheduledTimer>();

  constructor() {
    this.db = pool;
  }

  // ==================== JOB REGISTRATION ====================

  /**
   * Register a job executor
   */
  registerJob(executor: JobExecutor): void {
    this.jobRegistry.set(executor.jobType, executor);
    console.log(`[JobScheduler] Registered job type: ${executor.jobType}`);
  }

  /**
   * Get registered job executor
   */
  getJobExecutor(jobType: JobType): JobExecutor | undefined {
    return this.jobRegistry.get(jobType);
  }

  // ==================== SCHEDULER INITIALIZATION ====================

  /**
   * Initialize scheduler - load all active configs and start timers
   */
  async initializeScheduler(): Promise<void> {
    console.log('[JobScheduler] Initializing job scheduler...');

    try {
      const configs = await this.getActiveConfigs();
      console.log(`[JobScheduler] Found ${configs.length} active configurations`);

      for (const config of configs) {
        // Only start timer if we have an executor for this job type
        if (this.jobRegistry.has(config.job_type)) {
          this.startTimer(config);
        } else {
          console.warn(`[JobScheduler] No executor registered for job type: ${config.job_type}`);
        }
      }

      console.log('[JobScheduler] Scheduler initialized successfully');
    } catch (error: any) {
      console.error('[JobScheduler] Failed to initialize scheduler:', error);
      throw error;
    }
  }

  /**
   * Stop all timers
   */
  stopAllTimers(): void {
    console.log('[JobScheduler] Stopping all timers...');

    for (const [key, timer] of this.activeTimers.entries()) {
      clearTimeout(timer.timerId);
      timer.isActive = false;
    }

    this.activeTimers.clear();
    console.log('[JobScheduler] All timers stopped');
  }

  // ==================== CONFIGURATION CRUD ====================

  /**
   * Create configuration
   */
  async createConfig(
    tenantId: number,
    isLive: boolean,
    jobType: JobType,
    request: CreateJobConfigRequest
  ): Promise<JobSchedulerConfig> {
    // Get default settings from job type
    const jobTypeInfo = await this.getJobTypeInfo(jobType);

    const query = `
      INSERT INTO t_job_scheduler_configs (
        tenant_id, job_type, user_id, is_live,
        schedule_type, cron_expression, is_enabled,
        max_retries, job_config, next_execution_at,
        created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING *
    `;

    const cronExpression = request.cron_expression || jobTypeInfo.default_cron_expression;
    const nextExecution = this.calculateNextExecution(cronExpression);

    const result = await this.db.query(query, [
      tenantId,
      jobType,
      request.user_id,
      isLive,
      request.schedule_type || 'weekly',
      cronExpression,
      request.is_enabled ?? true,
      request.max_retries ?? jobTypeInfo.default_max_retries,
      request.job_config ? JSON.stringify(request.job_config) : null,
      nextExecution
    ]);

    const config = this.mapRowToConfig(result.rows[0]);

    // Start timer if enabled
    if (config.is_enabled && this.jobRegistry.has(jobType)) {
      this.startTimer(config);
    }

    console.log(`[JobScheduler] Created configuration for ${jobType}, tenant ${tenantId}`);
    return config;
  }

  /**
   * Get configuration
   */
  async getConfig(tenantId: number, isLive: boolean, jobType: JobType): Promise<JobSchedulerConfig | null> {
    const query = `
      SELECT * FROM t_job_scheduler_configs
      WHERE tenant_id = $1 AND is_live = $2 AND job_type = $3
    `;

    const result = await this.db.query(query, [tenantId, isLive, jobType]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToConfig(result.rows[0]);
  }

  /**
   * Update configuration
   */
  async updateConfig(
    tenantId: number,
    isLive: boolean,
    jobType: JobType,
    request: UpdateJobConfigRequest
  ): Promise<JobSchedulerConfig> {
    const existing = await this.getConfig(tenantId, isLive, jobType);

    if (!existing) {
      throw new Error(`No configuration found for ${jobType}, tenant ${tenantId}`);
    }

    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (request.schedule_type !== undefined) {
      updates.push(`schedule_type = $${paramCount++}`);
      values.push(request.schedule_type);
    }

    if (request.cron_expression !== undefined) {
      updates.push(`cron_expression = $${paramCount++}`);
      values.push(request.cron_expression);

      const nextExec = this.calculateNextExecution(request.cron_expression);
      updates.push(`next_execution_at = $${paramCount++}`);
      values.push(nextExec);
    }

    if (request.is_enabled !== undefined) {
      updates.push(`is_enabled = $${paramCount++}`);
      values.push(request.is_enabled);
    }

    if (request.max_retries !== undefined) {
      updates.push(`max_retries = $${paramCount++}`);
      values.push(request.max_retries);
    }

    if (request.job_config !== undefined) {
      updates.push(`job_config = $${paramCount++}`);
      values.push(JSON.stringify(request.job_config));
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);

    values.push(tenantId, isLive, jobType);

    const query = `
      UPDATE t_job_scheduler_configs
      SET ${updates.join(', ')}
      WHERE tenant_id = $${paramCount++} AND is_live = $${paramCount++} AND job_type = $${paramCount++}
      RETURNING *
    `;

    const result = await this.db.query(query, values);
    const updatedConfig = this.mapRowToConfig(result.rows[0]);

    // Restart timer with new config
    this.stopTimer(tenantId, isLive, jobType);
    if (updatedConfig.is_enabled && this.jobRegistry.has(jobType)) {
      this.startTimer(updatedConfig);
    }

    console.log(`[JobScheduler] Updated configuration for ${jobType}, tenant ${tenantId}`);
    return updatedConfig;
  }

  // ==================== EXECUTION METHODS ====================

  /**
   * Execute job with retry logic
   */
  async executeWithRetry(
    tenantId: number,
    isLive: boolean,
    jobType: JobType,
    triggerSource: 'scheduled' | 'manual',
    attempt: number = 0
  ): Promise<void> {
    const config = await this.getConfig(tenantId, isLive, jobType);

    if (!config) {
      throw new Error(`No configuration found for ${jobType}, tenant ${tenantId}`);
    }

    const executor = this.jobRegistry.get(jobType);
    if (!executor) {
      throw new Error(`No executor registered for job type: ${jobType}`);
    }

    const executionId = await this.createExecution(config.id!, tenantId, isLive, jobType, triggerSource, attempt);

    try {
      // Mark as running
      await this.updateExecutionStatus(executionId, 'running');

      // Execute job
      const context: JobExecutionContext = {
        tenant_id: tenantId,
        is_live: isLive,
        trigger_source: triggerSource,
        job_config: config.job_config,
        scheduler_config_id: config.id
      };

      const result = await executor.execute(context);

      // Complete execution
      await this.completeExecution(executionId, result);
      await this.updateConfigStats(config.id!, true);

      console.log(`[JobScheduler] Execution completed successfully for ${jobType}, tenant ${tenantId}`);

    } catch (error: any) {
      console.error(`[JobScheduler] Execution failed for ${jobType}, tenant ${tenantId}, attempt ${attempt + 1}/${config.max_retries + 1}:`, error.message);

      // Check if retries remaining
      if (attempt < config.max_retries) {
        await this.updateExecutionStatus(executionId, 'retrying', error.message);

        const delay = this.calculateRetryDelay(attempt);
        console.log(`[JobScheduler] Retrying in ${delay / 1000 / 60} minutes...`);

        await this.sleep(delay);
        return this.executeWithRetry(tenantId, isLive, jobType, triggerSource, attempt + 1);

      } else {
        await this.failExecution(executionId, error.message);
        await this.updateConfigStats(config.id!, false);

        console.error(`[JobScheduler] Execution failed after ${config.max_retries} retries for ${jobType}, tenant ${tenantId}`);
      }
    }
  }

  /**
   * Manual trigger
   */
  async triggerManual(tenantId: number, isLive: boolean, jobType: JobType): Promise<void> {
    const config = await this.getConfig(tenantId, isLive, jobType);

    if (!config) {
      throw new Error(`No configuration found for ${jobType}`);
    }

    // Execute in background
    this.executeWithRetry(tenantId, isLive, jobType, 'manual').catch(err => {
      console.error('[JobScheduler] Manual execution failed:', err);
    });
  }

  // ==================== TIMER MANAGEMENT ====================

  private startTimer(config: JobSchedulerConfig): void {
    if (!config.is_enabled || !config.next_execution_at) {
      return;
    }

    const key = this.getTimerKey(config.tenant_id, config.is_live, config.job_type);
    this.stopTimer(config.tenant_id, config.is_live, config.job_type);

    const now = new Date();
    const nextRun = new Date(config.next_execution_at);
    const delay = nextRun.getTime() - now.getTime();

    if (delay <= 0) {
      console.log(`[JobScheduler] Executing immediately for ${config.job_type}, tenant ${config.tenant_id}`);
      this.executeAndScheduleNext(config);
      return;
    }

    const timerId = setTimeout(() => {
      this.executeAndScheduleNext(config);
    }, delay);

    this.activeTimers.set(key, {
      timerId,
      nextRun,
      config,
      isActive: true
    });

    console.log(`[JobScheduler] Scheduled ${config.job_type} for tenant ${config.tenant_id} at ${nextRun.toISOString()}`);
  }

  private stopTimer(tenantId: number, isLive: boolean, jobType: JobType): void {
    const key = this.getTimerKey(tenantId, isLive, jobType);
    const timer = this.activeTimers.get(key);

    if (timer) {
      clearTimeout(timer.timerId);
      timer.isActive = false;
      this.activeTimers.delete(key);
    }
  }

  private async executeAndScheduleNext(config: JobSchedulerConfig): Promise<void> {
    await this.executeWithRetry(config.tenant_id, config.is_live, config.job_type, 'scheduled').catch(err => {
      console.error('[JobScheduler] Scheduled execution failed:', err);
    });

    // Calculate and update next execution
    const nextExecution = this.calculateNextExecution(config.cron_expression);
    await this.updateNextExecution(config.id!, nextExecution);

    // Reload config and restart timer
    const updatedConfig = await this.getConfig(config.tenant_id, config.is_live, config.job_type);
    if (updatedConfig && updatedConfig.is_enabled) {
      this.startTimer(updatedConfig);
    }
  }

  // ==================== EXECUTION TRACKING ====================

  async createExecution(
    configId: number,
    tenantId: number,
    isLive: boolean,
    jobType: JobType,
    triggerSource: 'scheduled' | 'manual',
    retryAttempt: number
  ): Promise<number> {
    const query = `
      INSERT INTO t_job_executions (
        scheduler_config_id, job_type, tenant_id, is_live,
        execution_time, status, trigger_source, retry_attempt, started_at
      ) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, 'running', $5, $6, CURRENT_TIMESTAMP)
      RETURNING id
    `;

    const result = await this.db.query(query, [configId, jobType, tenantId, isLive, triggerSource, retryAttempt]);
    return result.rows[0].id;
  }

  async updateExecutionStatus(executionId: number, status: string, errorMessage?: string): Promise<void> {
    const query = `
      UPDATE t_job_executions
      SET status = $1, error_message = $2
      WHERE id = $3
    `;

    await this.db.query(query, [status, errorMessage || null, executionId]);
  }

  async completeExecution(executionId: number, result: JobExecutionResult): Promise<void> {
    const query = `
      UPDATE t_job_executions
      SET
        status = 'success',
        execution_data = $1,
        execution_duration_ms = $2,
        completed_at = CURRENT_TIMESTAMP
      WHERE id = $3
    `;

    await this.db.query(query, [
      JSON.stringify(result.execution_data),
      result.execution_duration_ms,
      executionId
    ]);
  }

  async failExecution(executionId: number, errorMessage: string): Promise<void> {
    const query = `
      UPDATE t_job_executions
      SET status = 'failed', error_message = $1, completed_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `;

    await this.db.query(query, [errorMessage, executionId]);
  }

  async updateConfigStats(configId: number, success: boolean): Promise<void> {
    const query = `
      UPDATE t_job_scheduler_configs
      SET
        execution_count = execution_count + 1,
        failure_count = failure_count + ${success ? 0 : 1},
        last_executed_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `;

    await this.db.query(query, [configId]);
  }

  private async updateNextExecution(configId: number, nextExecution: Date | null): Promise<void> {
    const query = `
      UPDATE t_job_scheduler_configs
      SET next_execution_at = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `;

    await this.db.query(query, [nextExecution, configId]);
  }

  // ==================== STATISTICS ====================

  async getExecutions(
    tenantId: number,
    isLive: boolean,
    jobType: JobType,
    page: number = 1,
    pageSize: number = 20
  ): Promise<{ executions: JobExecution[]; total: number }> {
    const offset = (page - 1) * pageSize;

    const query = `
      SELECT * FROM t_job_executions
      WHERE tenant_id = $1 AND is_live = $2 AND job_type = $3
      ORDER BY execution_time DESC
      LIMIT $4 OFFSET $5
    `;

    const countQuery = `
      SELECT COUNT(*) as total
      FROM t_job_executions
      WHERE tenant_id = $1 AND is_live = $2 AND job_type = $3
    `;

    const [execResult, countResult] = await Promise.all([
      this.db.query(query, [tenantId, isLive, jobType, pageSize, offset]),
      this.db.query(countQuery, [tenantId, isLive, jobType])
    ]);

    return {
      executions: execResult.rows.map(row => this.mapRowToExecution(row)),
      total: parseInt(countResult.rows[0].total)
    };
  }

  // Find the getStatistics method around line 470 and update the return statement:

async getStatistics(tenantId: number, isLive: boolean, jobType: JobType): Promise<JobStatistics | null> {
  const config = await this.getConfig(tenantId, isLive, jobType);

  if (!config) {
    return null;
  }

  const recentQuery = `
    SELECT * FROM t_job_executions
    WHERE tenant_id = $1 AND is_live = $2 AND job_type = $3
    ORDER BY execution_time DESC
    LIMIT 10
  `;

  const statsQuery = `
    SELECT
      COUNT(*) FILTER (WHERE status = 'success') as success_count,
      COUNT(*) FILTER (WHERE status = 'failed') as failed_count,
      COUNT(*) as total_count,
      AVG(execution_duration_ms) FILTER (WHERE status = 'success') as avg_duration
    FROM t_job_executions
    WHERE tenant_id = $1 AND is_live = $2 AND job_type = $3
  `;

  const runningQuery = `
    SELECT COUNT(*) as count FROM t_job_executions
    WHERE tenant_id = $1 AND is_live = $2 AND job_type = $3
    AND status IN ('running', 'retrying')
  `;

  const [recentResult, statsResult, runningResult] = await Promise.all([
    this.db.query(recentQuery, [tenantId, isLive, jobType]),
    this.db.query(statsQuery, [tenantId, isLive, jobType]),
    this.db.query(runningQuery, [tenantId, isLive, jobType])
  ]);

  const stats = statsResult.rows[0];
  const successRate = stats.total_count > 0 ? (stats.success_count / stats.total_count) * 100 : 0;
  const isRunning = parseInt(runningResult.rows[0].count) > 0;

  return {
    config,
    is_running: isRunning,
    last_execution: recentResult.rows.length > 0 ? this.mapRowToExecution(recentResult.rows[0]) : undefined,
    next_scheduled_run: config.next_execution_at || undefined,
    recent_executions: recentResult.rows.map(row => this.mapRowToExecution(row)),
    success_rate: successRate,
    average_duration_ms: parseFloat(stats.avg_duration) || 0,
    total_executions: parseInt(stats.total_count) || 0,
    // ADD THESE NEW FIELDS:
    successful_count: parseInt(stats.success_count) || 0,
    failed_count: parseInt(stats.failed_count) || 0,
    running_count: parseInt(runningResult.rows[0].count) || 0
  };
}

  // ==================== UTILITY METHODS ====================

  private async getActiveConfigs(): Promise<JobSchedulerConfig[]> {
    const query = `
      SELECT * FROM t_job_scheduler_configs
      WHERE is_enabled = true
      ORDER BY tenant_id, job_type
    `;

    const result = await this.db.query(query);
    return result.rows.map(row => this.mapRowToConfig(row));
  }

  private async getJobTypeInfo(jobType: JobType): Promise<any> {
    const query = `SELECT * FROM m_job_types WHERE code = $1`;
    const result = await this.db.query(query, [jobType]);

    if (result.rows.length === 0) {
      throw new Error(`Job type not found: ${jobType}`);
    }

    return result.rows[0];
  }

  private calculateNextExecution(cronExpression: string): Date | null {
    // Simplified - only handles weekly schedule
    const [minute, hour, , , dayOfWeek] = cronExpression.split(' ').map(Number);

    const now = new Date();
    const targetDay = dayOfWeek;
    const currentDay = now.getDay();

    let daysUntilTarget = (targetDay - currentDay + 7) % 7;
    if (daysUntilTarget === 0) {
      const targetTime = new Date(now);
      targetTime.setHours(hour, minute, 0, 0);

      if (now >= targetTime) {
        daysUntilTarget = 7;
      }
    }

    const nextRun = new Date(now);
    nextRun.setDate(now.getDate() + daysUntilTarget);
    nextRun.setHours(hour, minute, 0, 0);

    return nextRun;
  }

  private calculateRetryDelay(attempt: number): number {
    const delays = [5 * 60 * 1000, 15 * 60 * 1000, 30 * 60 * 1000];
    return delays[attempt] || delays[delays.length - 1];
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private getTimerKey(tenantId: number, isLive: boolean, jobType: JobType): string {
    return `${tenantId}-${isLive}-${jobType}`;
  }

  private mapRowToConfig(row: any): JobSchedulerConfig {
    return {
      id: row.id,
      tenant_id: row.tenant_id,
      job_type: row.job_type,
      user_id: row.user_id,
      is_live: row.is_live,
      schedule_type: row.schedule_type,
      cron_expression: row.cron_expression,
      is_enabled: row.is_enabled,
      max_retries: row.max_retries,
      job_config: row.job_config,
      last_executed_at: row.last_executed_at,
      next_execution_at: row.next_execution_at,
      execution_count: row.execution_count,
      failure_count: row.failure_count,
      created_at: row.created_at,
      updated_at: row.updated_at
    };
  }

  private mapRowToExecution(row: any): JobExecution {
    return {
      id: row.id,
      scheduler_config_id: row.scheduler_config_id,
      job_type: row.job_type,
      tenant_id: row.tenant_id,
      is_live: row.is_live,
      execution_time: row.execution_time,
      status: row.status,
      trigger_source: row.trigger_source,
      retry_attempt: row.retry_attempt,
      execution_data: row.execution_data,
      error_message: row.error_message,
      error_details: row.error_details,
      execution_duration_ms: row.execution_duration_ms,
      started_at: row.started_at,
      completed_at: row.completed_at,
      created_at: row.created_at
    };
  }
}
export const jobSchedulerService = new JobSchedulerService();