// backend/src/services/portfolioSnapshotScheduler.service.ts
// Scheduler service for automated portfolio snapshot generation with retry logic

import { Pool } from 'pg';
import { pool } from '../config/database';
import { PortfolioSnapshotService } from './portfolioSnapshot.service';
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
  private activeTimers = new Map<string, ScheduledTimer>();

  constructor() {
    this.db = pool;
    this.snapshotService = new PortfolioSnapshotService();
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
   */
  async createConfig(tenantId: number, isLive: boolean, request: CreateSnapshotConfigRequest): Promise<PortfolioSnapshotConfig> {
    const query = `
      INSERT INTO t_portfolio_snapshot_configs (
        tenant_id,
        user_id,
        is_live,
        schedule_type,
        cron_expression,
        is_enabled,
        max_retries,
        next_execution_at,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING *
    `;

    const scheduleType = request.schedule_type || 'weekly';
    const cronExpression = request.cron_expression || '0 21 * * 5'; // Default: Friday 9 PM
    const maxRetries = request.max_retries ?? 3;
    const nextExecution = this.calculateNextExecution(cronExpression);

    const result = await this.db.query(query, [
      tenantId,
      request.user_id,
      isLive,
      scheduleType,
      cronExpression,
      request.is_enabled ?? true,
      maxRetries,
      nextExecution
    ]);

    const config = this.mapRowToConfig(result.rows[0]);

    // Start timer if enabled
    if (config.is_enabled) {
      this.startTimer(config);
    }

    console.log(`[SnapshotScheduler] Created configuration for tenant ${tenantId}, next run: ${nextExecution?.toISOString()}`);

    return config;
  }

  /**
   * Get configuration for a tenant
   */
  async getConfig(tenantId: number, isLive: boolean): Promise<PortfolioSnapshotConfig | null> {
    const query = `
      SELECT * FROM t_portfolio_snapshot_configs
      WHERE tenant_id = $1 AND is_live = $2
    `;

    const result = await this.db.query(query, [tenantId, isLive]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToConfig(result.rows[0]);
  }

  /**
   * Update scheduler configuration
   */
  async updateConfig(tenantId: number, isLive: boolean, request: UpdateSnapshotConfigRequest): Promise<PortfolioSnapshotConfig> {
    const existing = await this.getConfig(tenantId, isLive);

    if (!existing) {
      throw new Error(`No configuration found for tenant ${tenantId}`);
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
      // Recalculate next execution
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

    updates.push(`updated_at = CURRENT_TIMESTAMP`);

    values.push(tenantId, isLive);

    const query = `
      UPDATE t_portfolio_snapshot_configs
      SET ${updates.join(', ')}
      WHERE tenant_id = $${paramCount++} AND is_live = $${paramCount++}
      RETURNING *
    `;

    const result = await this.db.query(query, values);
    const updatedConfig = this.mapRowToConfig(result.rows[0]);

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
   */
  async executeWithRetry(
    tenantId: number,
    isLive: boolean,
    triggerSource: 'scheduled' | 'manual',
    attempt: number = 0
  ): Promise<void> {
    const config = await this.getConfig(tenantId, isLive);

    if (!config) {
      throw new Error(`No configuration found for tenant ${tenantId}`);
    }

    const executionId = await this.createExecution(config.id!, tenantId, isLive, triggerSource, attempt);

    try {
      // Mark as running
      await this.updateExecutionStatus(executionId, 'running');

      // Execute snapshot generation
      const result = await this.snapshotService.generateSnapshots({
        tenant_id: tenantId,
        is_live: isLive,
        trigger_source: triggerSource,
        scheduler_config_id: config.id
      });

      // Update execution record with results
      await this.completeExecution(executionId, result);

      // Update config stats
      await this.updateConfigStats(config.id!, true);

      console.log(`[SnapshotScheduler] Execution completed successfully for tenant ${tenantId}`);

    } catch (error: any) {
      console.error(`[SnapshotScheduler] Execution failed for tenant ${tenantId}, attempt ${attempt + 1}/${config.max_retries + 1}:`, error.message);

      // Check if retries remaining
      if (attempt < config.max_retries) {
        // Mark as retrying
        await this.updateExecutionStatus(executionId, 'retrying', error.message);

        // Calculate retry delay with exponential backoff
        const delay = this.calculateRetryDelay(attempt);
        console.log(`[SnapshotScheduler] Retrying in ${delay / 1000 / 60} minutes...`);

        // Wait and retry
        await this.sleep(delay);
        return this.executeWithRetry(tenantId, isLive, triggerSource, attempt + 1);

      } else {
        // Max retries exhausted
        await this.failExecution(executionId, error.message);
        await this.updateConfigStats(config.id!, false);

        console.error(`[SnapshotScheduler] Execution failed after ${config.max_retries} retries for tenant ${tenantId}`);
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

    // Calculate and update next execution
    const nextExecution = this.calculateNextExecution(config.cron_expression);
    await this.updateNextExecution(config.id!, nextExecution);

    // Reload config and restart timer
    const updatedConfig = await this.getConfig(config.tenant_id, config.is_live);
    if (updatedConfig && updatedConfig.is_enabled) {
      this.startTimer(updatedConfig);
    }
  }

  // ==================== EXECUTION TRACKING ====================

  private async createExecution(
    configId: number,
    tenantId: number,
    isLive: boolean,
    triggerSource: 'scheduled' | 'manual',
    retryAttempt: number
  ): Promise<number> {
    const query = `
      INSERT INTO t_portfolio_snapshot_executions (
        scheduler_config_id,
        tenant_id,
        is_live,
        execution_time,
        status,
        trigger_source,
        retry_attempt,
        started_at
      ) VALUES ($1, $2, $3, CURRENT_TIMESTAMP, 'running', $4, $5, CURRENT_TIMESTAMP)
      RETURNING id
    `;

    const result = await this.db.query(query, [configId, tenantId, isLive, triggerSource, retryAttempt]);
    return result.rows[0].id;
  }

  private async updateExecutionStatus(executionId: number, status: string, errorMessage?: string): Promise<void> {
    const query = `
      UPDATE t_portfolio_snapshot_executions
      SET status = $1, error_message = $2, updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
    `;

    await this.db.query(query, [status, errorMessage || null, executionId]);
  }

  private async completeExecution(executionId: number, result: any): Promise<void> {
    // Determine final status based on results
    // - 'success' if no customers failed
    // - 'failed' if all customers failed or no customers were processed
    // - 'success' with error_details if some customers failed (partial success)
    let finalStatus = 'success';

    if (result.customers_processed === 0) {
      finalStatus = 'failed'; // No customers processed at all
    } else if (result.customers_failed > 0 && result.customers_failed === result.customers_processed) {
      finalStatus = 'failed'; // All customers failed
    } else if (result.customers_failed > 0) {
      finalStatus = 'success'; // Partial success - some failed but not all
    }

    const query = `
      UPDATE t_portfolio_snapshot_executions
      SET
        status = $1,
        snapshot_month_end = $2,
        customers_processed = $3,
        customers_failed = $4,
        snapshots_created = $5,
        snapshots_updated = $6,
        execution_duration_ms = $7,
        completed_at = CURRENT_TIMESTAMP,
        error_details = $8
      WHERE id = $9
    `;

    await this.db.query(query, [
      finalStatus,
      result.snapshot_month_end,
      result.customers_processed,
      result.customers_failed,
      result.snapshots_created,
      result.snapshots_updated,
      result.execution_duration_ms,
      result.errors.length > 0 ? JSON.stringify(result.errors) : null,
      executionId
    ]);
  }

  private async failExecution(executionId: number, errorMessage: string): Promise<void> {
    const query = `
      UPDATE t_portfolio_snapshot_executions
      SET
        status = 'failed',
        error_message = $1,
        completed_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `;

    await this.db.query(query, [errorMessage, executionId]);
  }

  private async updateConfigStats(configId: number, success: boolean): Promise<void> {
    const query = `
      UPDATE t_portfolio_snapshot_configs
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
      UPDATE t_portfolio_snapshot_configs
      SET next_execution_at = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `;

    await this.db.query(query, [nextExecution, configId]);
  }

  // ==================== UTILITY METHODS ====================

  /**
   * Get all active configurations
   */
  private async getActiveConfigs(): Promise<PortfolioSnapshotConfig[]> {
    const query = `
      SELECT * FROM t_portfolio_snapshot_configs
      WHERE is_enabled = true
      ORDER BY tenant_id, is_live
    `;

    const result = await this.db.query(query);
    return result.rows.map(row => this.mapRowToConfig(row));
  }

  /**
   * Calculate next execution time based on cron expression
   * Simplified version - only handles weekly schedule for now
   */
  private calculateNextExecution(cronExpression: string): Date | null {
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
   * Map database row to config object
   */
  private mapRowToConfig(row: any): PortfolioSnapshotConfig {
    return {
      id: row.id,
      tenant_id: row.tenant_id,
      user_id: row.user_id,
      is_live: row.is_live,
      schedule_type: row.schedule_type,
      cron_expression: row.cron_expression,
      is_enabled: row.is_enabled,
      last_executed_at: row.last_executed_at,
      next_execution_at: row.next_execution_at,
      execution_count: row.execution_count,
      failure_count: row.failure_count,
      max_retries: row.max_retries,
      created_at: row.created_at,
      updated_at: row.updated_at
    };
  }

  // ==================== STATISTICS & MONITORING ====================

  /**
   * Get execution history for a tenant
   */
  async getExecutions(
    tenantId: number,
    isLive: boolean,
    page: number = 1,
    pageSize: number = 20
  ): Promise<{ executions: SnapshotExecution[]; total: number }> {
    const offset = (page - 1) * pageSize;

    const query = `
      SELECT * FROM t_portfolio_snapshot_executions
      WHERE tenant_id = $1 AND is_live = $2
      ORDER BY execution_time DESC
      LIMIT $3 OFFSET $4
    `;

    const countQuery = `
      SELECT COUNT(*) as total
      FROM t_portfolio_snapshot_executions
      WHERE tenant_id = $1 AND is_live = $2
    `;

    const [execResult, countResult] = await Promise.all([
      this.db.query(query, [tenantId, isLive, pageSize, offset]),
      this.db.query(countQuery, [tenantId, isLive])
    ]);

    return {
      executions: execResult.rows.map(row => this.mapRowToExecution(row)),
      total: parseInt(countResult.rows[0].total)
    };
  }

  /**
   * Get statistics for a tenant
   */
  async getStatistics(tenantId: number, isLive: boolean): Promise<SnapshotStatistics | null> {
    const config = await this.getConfig(tenantId, isLive);

    if (!config) {
      return null;
    }

    const recentQuery = `
      SELECT * FROM t_portfolio_snapshot_executions
      WHERE tenant_id = $1 AND is_live = $2
      ORDER BY execution_time DESC
      LIMIT 10
    `;

    const statsQuery = `
      SELECT
        COUNT(*) FILTER (WHERE status = 'success') as success_count,
        COUNT(*) as total_count,
        AVG(execution_duration_ms) FILTER (WHERE status = 'success') as avg_duration,
        SUM(snapshots_created + snapshots_updated) as total_snapshots
      FROM t_portfolio_snapshot_executions
      WHERE tenant_id = $1 AND is_live = $2
    `;

    const [recentResult, statsResult] = await Promise.all([
      this.db.query(recentQuery, [tenantId, isLive]),
      this.db.query(statsQuery, [tenantId, isLive])
    ]);

    const stats = statsResult.rows[0];
    const successRate = stats.total_count > 0 ? (stats.success_count / stats.total_count) * 100 : 0;

    const key = this.getTimerKey(tenantId, isLive);
    const isRunning = this.activeTimers.has(key) && this.activeTimers.get(key)!.isActive;

    return {
      config,
      is_running: isRunning,
      last_execution: recentResult.rows.length > 0 ? this.mapRowToExecution(recentResult.rows[0]) : undefined,
      next_scheduled_run: config.next_execution_at || undefined,
      recent_executions: recentResult.rows.map(row => this.mapRowToExecution(row)),
      success_rate: successRate,
      average_duration_ms: parseFloat(stats.avg_duration) || 0,
      total_snapshots_generated: parseInt(stats.total_snapshots) || 0
    };
  }

  /**
   * Map database row to execution object
   */
  private mapRowToExecution(row: any): SnapshotExecution {
    return {
      id: row.id,
      scheduler_config_id: row.scheduler_config_id,
      tenant_id: row.tenant_id,
      is_live: row.is_live,
      execution_time: row.execution_time,
      status: row.status,
      trigger_source: row.trigger_source,
      snapshot_month_end: row.snapshot_month_end,
      customers_processed: row.customers_processed,
      customers_failed: row.customers_failed,
      snapshots_created: row.snapshots_created,
      snapshots_updated: row.snapshots_updated,
      retry_attempt: row.retry_attempt,
      error_message: row.error_message,
      error_details: row.error_details,
      execution_duration_ms: row.execution_duration_ms,
      started_at: row.started_at,
      completed_at: row.completed_at,
      created_at: row.created_at
    };
  }

  /**
   * Public method to create execution record for manual operations (like backfill)
   */
  async createExecution(tenantId: number, isLive: boolean, triggerSource: 'scheduled' | 'manual'): Promise<number> {
    // Get or create config for this tenant
    let config = await this.getConfig(tenantId, isLive);

    if (!config) {
      // Create default config if it doesn't exist
      config = await this.createConfig(tenantId, 0, isLive, {
        schedule_type: 'weekly',
        cron_expression: '0 21 * * 5',
        is_enabled: false,
        max_retries: 3
      });
    }

    const query = `
      INSERT INTO t_portfolio_snapshot_executions (
        scheduler_config_id,
        tenant_id,
        is_live,
        execution_time,
        status,
        trigger_source,
        retry_attempt,
        started_at
      ) VALUES ($1, $2, $3, CURRENT_TIMESTAMP, 'running', $4, 0, CURRENT_TIMESTAMP)
      RETURNING id
    `;

    const result = await this.db.query(query, [config.id, tenantId, isLive, triggerSource, 0]);
    return result.rows[0].id;
  }

  /**
   * Public method to complete execution with results
   */
  async completeExecutionWithResults(executionId: number, result: any): Promise<void> {
    await this.completeExecution(executionId, result);
  }

  /**
   * Public method to fail execution with error
   */
  async failExecutionWithError(executionId: number, errorMessage: string): Promise<void> {
    await this.failExecution(executionId, errorMessage);
  }
}
