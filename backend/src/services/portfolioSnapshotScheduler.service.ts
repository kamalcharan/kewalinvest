// backend/src/services/portfolioSnapshotScheduler.service.ts
// Scheduler service for automated portfolio snapshot generation with retry logic
// REFACTORED: Now uses JobSchedulerService for all execution and config tracking
// FIXED BASED ON ACTUAL API: Removed next_execution_at from update requests

import { Pool } from 'pg';
import { pool } from '../config/database';
import { PortfolioSnapshotService } from './portfolioSnapshot.service';
import { JobSchedulerService } from './jobScheduler.service';
import { JobType } from '../types/jobs.types';
import {
  PortfolioSnapshotConfig,
  CreateSnapshotConfigRequest,
  UpdateSnapshotConfigRequest,
  SnapshotExecution,
  SnapshotStatistics,
  TriggerSnapshotResponse
} from '../types/portfolioSnapshot.types';

interface ScheduledTimer {
  timerId: NodeJS.Timeout;
  nextRun: Date;
  config: PortfolioSnapshotConfig;
  isActive: boolean;
}

export class PortfolioSnapshotSchedulerService {
  private db: Pool;
  private snapshotService: PortfolioSnapshotService;
  private jobSchedulerService: JobSchedulerService;
  private activeTimers = new Map<string, ScheduledTimer>();

  constructor() {
    this.db = pool;
    this.snapshotService = new PortfolioSnapshotService();
    this.jobSchedulerService = new JobSchedulerService();
  }

  // ==================== SCHEDULER INITIALIZATION ====================

  /**
   * Initialize scheduler - load all active configs and start timers
   * Call this on server startup
   */
  async initializeScheduler(): Promise<void> {
    console.log('[SnapshotScheduler] Initializing portfolio snapshot scheduler...');

    try {
      const configs = await this.getActiveConfigs();
      console.log(`[SnapshotScheduler] Found ${configs.length} active configurations`);

      for (const config of configs) {
        this.startTimer(config);
      }

      console.log('[SnapshotScheduler] Scheduler initialized successfully');
    } catch (error: any) {
      console.error('[SnapshotScheduler] Failed to initialize scheduler:', error);
      throw error;
    }
  }

  /**
   * Stop all timers (for graceful shutdown)
   */
  stopAllTimers(): void {
    console.log('[SnapshotScheduler] Stopping all timers...');

    for (const [key, timer] of this.activeTimers.entries()) {
      clearTimeout(timer.timerId);
      timer.isActive = false;
    }

    this.activeTimers.clear();
    console.log('[SnapshotScheduler] All timers stopped');
  }

  // ==================== SCHEDULER CONFIGURATION CRUD ====================

  /**
   * Create new scheduler configuration for a tenant
   * REFACTORED: Now uses JobSchedulerService
   */
  async createConfig(tenantId: number, isLive: boolean, request: CreateSnapshotConfigRequest): Promise<PortfolioSnapshotConfig> {
    const scheduleType = request.schedule_type || 'weekly';
    const cronExpression = request.cron_expression || '0 21 * * 5'; // Default: Friday 9 PM
    const maxRetries = request.max_retries ?? 3;

    // FIXED: JobSchedulerService.createConfig already calculates and sets next_execution_at
    // We don't need to update it separately
    const jobConfig = await this.jobSchedulerService.createConfig(
      tenantId,
      isLive,
      JobType.PORTFOLIO_SNAPSHOT,
      {
        user_id: request.user_id,
        schedule_type: scheduleType,
        cron_expression: cronExpression,
        is_enabled: request.is_enabled ?? true,
        max_retries: maxRetries
      }
    );

    // Convert to PortfolioSnapshotConfig
    const config = this.mapJobConfigToSnapshotConfig(jobConfig);

    // Start timer if enabled
    if (config.is_enabled) {
      this.startTimer(config);
    }

    console.log(`[SnapshotScheduler] Created configuration for tenant ${tenantId}`);

    return config;
  }

  /**
   * Get configuration for a tenant
   * REFACTORED: Now uses JobSchedulerService
   */
  async getConfig(tenantId: number, isLive: boolean): Promise<PortfolioSnapshotConfig | null> {
    const jobConfig = await this.jobSchedulerService.getConfig(tenantId, isLive, JobType.PORTFOLIO_SNAPSHOT);

    if (!jobConfig) {
      return null;
    }

    return this.mapJobConfigToSnapshotConfig(jobConfig);
  }

  /**
   * Update scheduler configuration
   * REFACTORED: Now uses JobSchedulerService
   */
  async updateConfig(tenantId: number, isLive: boolean, request: UpdateSnapshotConfigRequest): Promise<PortfolioSnapshotConfig> {
    const existing = await this.getConfig(tenantId, isLive);

    if (!existing || !existing.id) {
      throw new Error(`No configuration found for tenant ${tenantId}`);
    }

    // Prepare update data
    const updateData: any = {};

    if (request.schedule_type !== undefined) {
      updateData.schedule_type = request.schedule_type;
    }

    if (request.cron_expression !== undefined) {
      updateData.cron_expression = request.cron_expression;
      // NOTE: JobSchedulerService.updateConfig automatically calculates
      // and updates next_execution_at when cron_expression is changed (line ~200-210)
    }

    if (request.is_enabled !== undefined) {
      updateData.is_enabled = request.is_enabled;
    }

    if (request.max_retries !== undefined) {
      updateData.max_retries = request.max_retries;
    }

    // FIXED: Use correct signature and don't include next_execution_at
    // Signature: updateConfig(tenantId, isLive, jobType, request)
    const updatedJobConfig = await this.jobSchedulerService.updateConfig(
      tenantId,
      isLive,
      JobType.PORTFOLIO_SNAPSHOT,
      updateData
    );

    const updatedConfig = this.mapJobConfigToSnapshotConfig(updatedJobConfig);

    // Restart timer with new config
    this.stopTimer(tenantId, isLive);
    if (updatedConfig.is_enabled) {
      this.startTimer(updatedConfig);
    }

    console.log(`[SnapshotScheduler] Updated configuration for tenant ${tenantId}`);

    return updatedConfig;
  }

  // ==================== EXECUTION METHODS ====================

  /**
   * Execute snapshot generation with retry logic
   * REFACTORED: Now uses JobSchedulerService for execution tracking
   */
  async executeWithRetry(
    tenantId: number,
    isLive: boolean,
    triggerSource: 'scheduled' | 'manual',
    attempt: number = 0
  ): Promise<void> {
    const config = await this.getConfig(tenantId, isLive);

    if (!config || !config.id) {
      throw new Error(`No configuration found for tenant ${tenantId}`);
    }

    // Create execution record using JobSchedulerService
    const executionId = await this.jobSchedulerService.createExecution(
      config.id,
      tenantId,
      isLive,
      JobType.PORTFOLIO_SNAPSHOT,
      triggerSource,
      attempt
    );

    console.log(`[SnapshotScheduler] Created execution ${executionId} for tenant ${tenantId} (attempt ${attempt + 1})`);

    try {
      // Execute snapshot generation
      const result = await this.snapshotService.generateSnapshots({
        tenant_id: tenantId,
        is_live: isLive,
        trigger_source: triggerSource,
        scheduler_config_id: config.id
      });

      // Update execution record with results using JobSchedulerService
      await this.jobSchedulerService.completeExecution(executionId, {
        success: true,
        execution_data: {
          snapshot_month_end: result.snapshot_month_end,
          customers_processed: result.customers_processed || 0,
          customers_failed: result.customers_failed || 0,
          snapshots_created: result.snapshots_created || 0,
          snapshots_updated: result.snapshots_updated || 0,
          errors: result.errors || []
        },
        execution_duration_ms: result.execution_duration_ms
      });

      // Update config stats
      await this.jobSchedulerService.updateConfigStats(config.id, true);

      console.log(`[SnapshotScheduler] Execution ${executionId} completed successfully for tenant ${tenantId}`);

    } catch (error: any) {
      console.error(`[SnapshotScheduler] Execution ${executionId} failed for tenant ${tenantId}, attempt ${attempt + 1}/${config.max_retries + 1}:`, error.message);

      // Check if retries remaining
      if (attempt < config.max_retries) {
        // Mark as retrying
        await this.jobSchedulerService.updateExecutionStatus(executionId, 'retrying', error.message);

        // Calculate retry delay with exponential backoff
        const delay = this.calculateRetryDelay(attempt);
        console.log(`[SnapshotScheduler] Retrying execution ${executionId} in ${delay / 1000 / 60} minutes...`);

        // Wait and retry
        await this.sleep(delay);
        return this.executeWithRetry(tenantId, isLive, triggerSource, attempt + 1);

      } else {
        // Max retries exhausted - fail execution
        await this.jobSchedulerService.failExecution(executionId, error.message);
        await this.jobSchedulerService.updateConfigStats(config.id, false);

        console.error(`[SnapshotScheduler] Execution ${executionId} failed after ${config.max_retries} retries for tenant ${tenantId}`);
      }
    }
  }

  /**
   * Manual trigger from UI
   */
  async triggerManual(tenantId: number, isLive: boolean): Promise<TriggerSnapshotResponse> {
    try {
      const config = await this.getConfig(tenantId, isLive);

      if (!config) {
        return {
          success: false,
          error: 'No scheduler configuration found for this tenant'
        };
      }

      // Execute in background (don't await)
      this.executeWithRetry(tenantId, isLive, 'manual').catch(err => {
        console.error('[SnapshotScheduler] Manual execution failed:', err);
      });

      return {
        success: true,
        data: {
          execution_id: 0, // Will be created in executeWithRetry
          status: 'running',
          message: 'Snapshot generation started. This may take a few minutes.'
        }
      };

    } catch (error: any) {
      console.error('[SnapshotScheduler] Failed to trigger manual execution:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // ==================== TIMER MANAGEMENT ====================

  /**
   * Start timer for a configuration
   */
  private startTimer(config: PortfolioSnapshotConfig): void {
    if (!config.is_enabled || !config.next_execution_at) {
      return;
    }

    const key = this.getTimerKey(config.tenant_id, config.is_live);

    // Stop existing timer if any
    this.stopTimer(config.tenant_id, config.is_live);

    const now = new Date();
    const nextRun = new Date(config.next_execution_at);
    const delay = nextRun.getTime() - now.getTime();

    if (delay <= 0) {
      // Should run now or in the past
      console.log(`[SnapshotScheduler] Executing immediately for tenant ${config.tenant_id}`);
      this.executeAndScheduleNext(config);
      return;
    }

    // Schedule for future
    const timerId = setTimeout(() => {
      this.executeAndScheduleNext(config);
    }, delay);

    this.activeTimers.set(key, {
      timerId,
      nextRun,
      config,
      isActive: true
    });

    console.log(`[SnapshotScheduler] Scheduled next run for tenant ${config.tenant_id} at ${nextRun.toISOString()}`);
  }

  /**
   * Stop timer for a tenant
   */
  private stopTimer(tenantId: number, isLive: boolean): void {
    const key = this.getTimerKey(tenantId, isLive);
    const timer = this.activeTimers.get(key);

    if (timer) {
      clearTimeout(timer.timerId);
      timer.isActive = false;
      this.activeTimers.delete(key);
    }
  }

  /**
   * Execute and schedule next run
   */
  private async executeAndScheduleNext(config: PortfolioSnapshotConfig): Promise<void> {
    // Execute
    await this.executeWithRetry(config.tenant_id, config.is_live, 'scheduled').catch(err => {
      console.error('[SnapshotScheduler] Scheduled execution failed:', err);
    });

    // FIXED: Don't manually update next_execution_at
    // JobSchedulerService manages this internally, just need to reload config
    
    // Reload config (it will have updated next_execution_at from DB)
    const updatedConfig = await this.getConfig(config.tenant_id, config.is_live);
    if (updatedConfig && updatedConfig.is_enabled) {
      // If next_execution_at wasn't updated, calculate it manually
      if (!updatedConfig.next_execution_at || new Date(updatedConfig.next_execution_at) <= new Date()) {
        const nextExecution = this.calculateNextExecution(updatedConfig.cron_expression);
        if (nextExecution) {
          // Update via cron_expression (will trigger recalculation)
          await this.jobSchedulerService.updateConfig(
            config.tenant_id,
            config.is_live,
            JobType.PORTFOLIO_SNAPSHOT,
            {
              cron_expression: updatedConfig.cron_expression  // Re-set same value to trigger recalc
            }
          );
          // Reload again
          const reloadedConfig = await this.getConfig(config.tenant_id, config.is_live);
          if (reloadedConfig) {
            this.startTimer(reloadedConfig);
          }
        }
      } else {
        this.startTimer(updatedConfig);
      }
    }
  }

  // ==================== STATISTICS & MONITORING ====================

  /**
   * Get execution history for a tenant
   * REFACTORED: Now uses JobSchedulerService
   */
  async getExecutions(
    tenantId: number,
    isLive: boolean,
    page: number = 1,
    pageSize: number = 20
  ): Promise<{ executions: SnapshotExecution[]; total: number }> {
    const result = await this.jobSchedulerService.getExecutions(
      tenantId,
      isLive,
      JobType.PORTFOLIO_SNAPSHOT,
      page,
      pageSize
    );

    // Map JobExecution to SnapshotExecution format
    const executions: SnapshotExecution[] = result.executions.map(exec => this.mapJobExecutionToSnapshotExecution(exec));

    return {
      executions,
      total: result.total
    };
  }

  /**
   * Get statistics for a tenant
   * REFACTORED: Now uses JobSchedulerService
   */
  async getStatistics(tenantId: number, isLive: boolean): Promise<SnapshotStatistics | null> {
    const config = await this.getConfig(tenantId, isLive);

    if (!config) {
      return null;
    }

    // Get recent executions
    const { executions } = await this.getExecutions(tenantId, isLive, 1, 10);

    // Get job statistics from JobSchedulerService
    const jobStats = await this.jobSchedulerService.getStatistics(tenantId, isLive, JobType.PORTFOLIO_SNAPSHOT);

    if (!jobStats) {
      return null;
    }

    // Check if scheduler is running
    const key = this.getTimerKey(tenantId, isLive);
    const isRunning = this.activeTimers.has(key) && this.activeTimers.get(key)!.isActive;

    // Calculate total snapshots from execution data
    let totalSnapshotsGenerated = 0;
    for (const exec of executions) {
      if (exec.execution_data) {
        totalSnapshotsGenerated += (exec.execution_data.snapshots_created || 0) + (exec.execution_data.snapshots_updated || 0);
      }
    }

    return {
      config,
      is_running: isRunning,
      last_execution: executions.length > 0 ? executions[0] : undefined,
      next_scheduled_run: config.next_execution_at || undefined,
      recent_executions: executions,
      success_rate: jobStats.success_rate,
      average_duration_ms: jobStats.average_duration_ms,
      total_snapshots_generated: totalSnapshotsGenerated
    };
  }

  // ==================== UTILITY METHODS ====================

  /**
   * Get all active configurations
   */
  private async getActiveConfigs(): Promise<PortfolioSnapshotConfig[]> {
    // Query database directly
    const query = `
      SELECT DISTINCT tenant_id, is_live
      FROM t_job_scheduler_configs
      WHERE job_type = $1 AND is_enabled = true
    `;
    
    const result = await this.db.query(query, [JobType.PORTFOLIO_SNAPSHOT]);
    
    const configs: PortfolioSnapshotConfig[] = [];
    
    for (const row of result.rows) {
      const config = await this.getConfig(row.tenant_id, row.is_live);
      if (config) {
        configs.push(config);
      }
    }
    
    return configs;
  }

  /**
   * Calculate next execution time based on cron expression
   * Simplified version - only handles weekly schedule for now
   */
  private calculateNextExecution(cronExpression: string): Date | null {
    try {
      // Default: Friday 9 PM (cron: 0 21 * * 5)
      const now = new Date();
      const [minute, hour, , , dayOfWeek] = cronExpression.split(' ').map(Number);

      const targetDay = dayOfWeek; // 0 = Sunday, 5 = Friday
      const currentDay = now.getDay();

      let daysUntilTarget = (targetDay - currentDay + 7) % 7;
      if (daysUntilTarget === 0) {
        // Same day - check if time has passed
        const targetTime = new Date(now);
        targetTime.setHours(hour, minute, 0, 0);

        if (now >= targetTime) {
          // Already passed, schedule for next week
          daysUntilTarget = 7;
        }
      }

      const nextRun = new Date(now);
      nextRun.setDate(now.getDate() + daysUntilTarget);
      nextRun.setHours(hour, minute, 0, 0);

      return nextRun;
    } catch (error) {
      console.error('[SnapshotScheduler] Error calculating next execution:', error);
      return null;
    }
  }

  /**
   * Calculate retry delay with exponential backoff
   * Attempt 0 (first retry): 5 minutes
   * Attempt 1 (second retry): 15 minutes
   * Attempt 2 (third retry): 30 minutes
   */
  private calculateRetryDelay(attempt: number): number {
    const delays = [5 * 60 * 1000, 15 * 60 * 1000, 30 * 60 * 1000];
    return delays[attempt] || delays[delays.length - 1];
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get timer key for map
   */
  private getTimerKey(tenantId: number, isLive: boolean): string {
    return `${tenantId}-${isLive}`;
  }

  /**
   * Map JobConfig to PortfolioSnapshotConfig
   */
  private mapJobConfigToSnapshotConfig(jobConfig: any): PortfolioSnapshotConfig {
    return {
      id: jobConfig.id,
      tenant_id: jobConfig.tenant_id,
      user_id: jobConfig.user_id,
      is_live: jobConfig.is_live,
      schedule_type: jobConfig.schedule_type,
      cron_expression: jobConfig.cron_expression,
      is_enabled: jobConfig.is_enabled,
      last_executed_at: jobConfig.last_executed_at,
      next_execution_at: jobConfig.next_execution_at,
      execution_count: jobConfig.execution_count,
      failure_count: jobConfig.failure_count,
      max_retries: jobConfig.max_retries,
      created_at: jobConfig.created_at,
      updated_at: jobConfig.updated_at
    };
  }

  /**
   * Map JobExecution to SnapshotExecution
   */
  private mapJobExecutionToSnapshotExecution(jobExec: any): SnapshotExecution {
    const execData = jobExec.execution_data || {};
    
    return {
      id: jobExec.id,
      scheduler_config_id: jobExec.scheduler_config_id,
      tenant_id: jobExec.tenant_id,
      is_live: jobExec.is_live,
      execution_time: jobExec.execution_time,
      status: jobExec.status,
      trigger_source: jobExec.trigger_source,
      snapshot_month_end: execData.snapshot_month_end,
      customers_processed: execData.customers_processed || 0,
      customers_failed: execData.customers_failed || 0,
      snapshots_created: execData.snapshots_created || 0,
      snapshots_updated: execData.snapshots_updated || 0,
      retry_attempt: jobExec.retry_attempt,
      error_message: jobExec.error_message,
      error_details: jobExec.error_details,
      execution_duration_ms: jobExec.execution_duration_ms,
      started_at: jobExec.started_at,
      completed_at: jobExec.completed_at,
      created_at: jobExec.created_at,
      execution_data: execData
    };
  }
}