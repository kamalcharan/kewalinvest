// backend/src/services/navScheduler.service.ts
// NAV Scheduler Service with built-in Node.js timers (no node-cron dependency)

import { Pool } from 'pg';
import { pool } from '../config/database';
import { NavService } from './nav.service';
import { SimpleLogger } from './simpleLogger.service';

// ==================== INTERFACES (UNCHANGED) ====================

export interface SchedulerConfig {
  id?: number;
  tenant_id: number;
  user_id: number;
  is_live: boolean;
  schedule_type: 'daily' | 'weekly' | 'custom';
  cron_expression: string;
  download_time: string; // HH:MM format
  is_enabled: boolean;
  n8n_webhook_url?: string;
  last_executed_at?: Date;
  next_execution_at?: Date;
  execution_count: number;
  failure_count: number;
  created_at?: Date;
  updated_at?: Date;
}

export interface SchedulerStatus {
  config: SchedulerConfig;
  is_running: boolean;
  cron_job_active: boolean; // Kept for compatibility
  next_run: Date | null;
  last_run: Date | null;
  recent_executions: ScheduleExecution[];
}

export interface ScheduleExecution {
  id: number;
  scheduler_config_id: number;
  execution_time: Date;
  status: 'success' | 'failed' | 'skipped';
  job_id?: number;
  n8n_execution_id?: string;
  error_message?: string;
  execution_duration_ms?: number;
}

export interface N8nWebhookPayload {
  tenant_id: number;
  user_id: number;
  is_live: boolean;
  schedule_type: string;
  trigger_source: 'scheduled' | 'manual';
  api_callback_url: string;
  scheduler_config_id: number;
}

// ==================== CUSTOM TIMER MANAGEMENT ====================

interface ScheduledTimer {
  timerId: NodeJS.Timeout;
  nextRun: Date;
  config: SchedulerConfig;
  isActive: boolean;
}

// ==================== MAIN SERVICE CLASS ====================

export class NavSchedulerService {
  private db: Pool;
  private navService: NavService;
  private activeTimers = new Map<string, ScheduledTimer>();
  
  // N8N Configuration
  private readonly N8N_BASE_URL: string;
  private readonly API_BASE_URL: string;
  private readonly N8N_WEBHOOK_NAME: string;

  constructor() {
    this.db = pool;
    this.navService = new NavService();
    
    // Environment configuration
    this.N8N_BASE_URL = process.env.N8N_BASE_URL || 'http://localhost:5678';
    this.API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:8080';
    this.N8N_WEBHOOK_NAME = process.env.N8N_NAV_WEBHOOK_NAME || 'nav-download-trigger';
  }

  // ==================== SCHEDULER CONFIGURATION CRUD (UNCHANGED) ====================

  /**
   * Create or update scheduler configuration
   */
  async saveSchedulerConfig(config: SchedulerConfig): Promise<SchedulerConfig> {
    const client = await this.db.connect();
    
    try {
      await client.query('BEGIN');

      // Validate cron expression
      if (!this.isValidCronExpression(config.cron_expression)) {
        throw new Error('Invalid cron expression');
      }

      // Calculate next execution time
      const nextExecution = this.getNextExecutionTime(config.cron_expression);

      let result;
      
      if (config.id) {
        // Update existing configuration
        const updateQuery = `
          UPDATE t_nav_scheduler_configs
          SET schedule_type = $1, cron_expression = $2, download_time = $3, 
              is_enabled = $4, n8n_webhook_url = $5, next_execution_at = $6, updated_at = CURRENT_TIMESTAMP
          WHERE id = $7 AND tenant_id = $8 AND user_id = $9 AND is_live = $10
          RETURNING *
        `;
        
        result = await client.query(updateQuery, [
          config.schedule_type,
          config.cron_expression,
          config.download_time,
          config.is_enabled,
          config.n8n_webhook_url || this.getDefaultN8nWebhookUrl(),
          nextExecution,
          config.id,
          config.tenant_id,
          config.user_id,
          config.is_live
        ]);
        
        if (result.rows.length === 0) {
          throw new Error('Scheduler configuration not found');
        }
      } else {
        // Check if user already has a configuration
        const existingQuery = `
          SELECT id FROM t_nav_scheduler_configs
          WHERE tenant_id = $1 AND user_id = $2 AND is_live = $3
        `;
        const existing = await client.query(existingQuery, [config.tenant_id, config.user_id, config.is_live]);
        
        if (existing.rows.length > 0) {
          throw new Error('User already has a scheduler configuration. Use update instead.');
        }

        // Create new configuration
        const insertQuery = `
          INSERT INTO t_nav_scheduler_configs (
            tenant_id, user_id, is_live, schedule_type, cron_expression, 
            download_time, is_enabled, n8n_webhook_url, next_execution_at, 
            execution_count, failure_count
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 0, 0)
          RETURNING *
        `;
        
        result = await client.query(insertQuery, [
          config.tenant_id,
          config.user_id,
          config.is_live,
          config.schedule_type,
          config.cron_expression,
          config.download_time,
          config.is_enabled,
          config.n8n_webhook_url || this.getDefaultN8nWebhookUrl(),
          nextExecution
        ]);
      }

      await client.query('COMMIT');

      const savedConfig = result.rows[0];

      // Restart timer with new configuration
      if (savedConfig.is_enabled) {
        await this.startSchedulerForConfig(savedConfig);
      } else {
        await this.stopSchedulerForConfig(savedConfig);
      }

      SimpleLogger.error('NavScheduler', 'Scheduler configuration saved', 'saveSchedulerConfig', {
        tenantId: config.tenant_id,
        userId: config.user_id,
        scheduleType: config.schedule_type,
        isEnabled: config.is_enabled,
        configId: savedConfig.id
      }, config.user_id, config.tenant_id);

      return savedConfig;
    } catch (error: any) {
      await client.query('ROLLBACK');
      
      SimpleLogger.error('NavScheduler', 'Failed to save scheduler configuration', 'saveSchedulerConfig', {
        tenantId: config.tenant_id,
        userId: config.user_id,
        error: error.message
      }, config.user_id, config.tenant_id, error.stack);
      
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get scheduler configuration for user
   */
  async getSchedulerConfig(
    tenantId: number,
    isLive: boolean,
    userId: number
  ): Promise<SchedulerConfig | null> {
    try {
      const query = `
        SELECT * FROM t_nav_scheduler_configs
        WHERE tenant_id = $1 AND is_live = $2 AND user_id = $3
      `;
      
      const result = await this.db.query(query, [tenantId, isLive, userId]);
      return result.rows[0] || null;
    } catch (error: any) {
      SimpleLogger.error('NavScheduler', 'Failed to get scheduler configuration', 'getSchedulerConfig', {
        tenantId, userId, error: error.message
      }, userId, tenantId, error.stack);
      
      throw error;
    }
  }

  /**
   * Delete scheduler configuration
   */
  async deleteSchedulerConfig(
    tenantId: number,
    isLive: boolean,
    userId: number
  ): Promise<void> {
    try {
      // Stop any running timer first
      const config = await this.getSchedulerConfig(tenantId, isLive, userId);
      if (config) {
        await this.stopSchedulerForConfig(config);
      }

      const query = `
        DELETE FROM t_nav_scheduler_configs
        WHERE tenant_id = $1 AND is_live = $2 AND user_id = $3
      `;
      
      const result = await this.db.query(query, [tenantId, isLive, userId]);
      
      if (result.rowCount === 0) {
        throw new Error('Scheduler configuration not found');
      }

      SimpleLogger.error('NavScheduler', 'Scheduler configuration deleted', 'deleteSchedulerConfig', {
        tenantId, userId
      }, userId, tenantId);
    } catch (error: any) {
      SimpleLogger.error('NavScheduler', 'Failed to delete scheduler configuration', 'deleteSchedulerConfig', {
        tenantId, userId, error: error.message
      }, userId, tenantId, error.stack);
      
      throw error;
    }
  }

  // ==================== SCHEDULER CONTROL (UPDATED) ====================

  /**
   * Start scheduler for specific configuration
   */
  async startSchedulerForConfig(config: SchedulerConfig): Promise<void> {
    try {
      const jobKey = this.getJobKey(config);
      
      // Stop existing timer if running
      await this.stopSchedulerForConfig(config);

      // Calculate next execution time
      const nextExecution = this.getNextExecutionTime(config.cron_expression);
      const msUntilExecution = nextExecution.getTime() - Date.now();

      // Set timer for next execution
      const timerId = setTimeout(async () => {
        await this.executeScheduledDownload(config);
        // After execution, schedule the next one
        this.scheduleNextExecution(config);
      }, msUntilExecution);

      // Store timer reference
      const scheduledTimer: ScheduledTimer = {
        timerId,
        nextRun: nextExecution,
        config,
        isActive: true
      };
      
      this.activeTimers.set(jobKey, scheduledTimer);

      SimpleLogger.error('NavScheduler', 'Scheduler started', 'startSchedulerForConfig', {
        tenantId: config.tenant_id,
        userId: config.user_id,
        scheduleType: config.schedule_type,
        cronExpression: config.cron_expression,
        nextRun: nextExecution.toISOString(),
        msUntilExecution,
        jobKey
      }, config.user_id, config.tenant_id);

    } catch (error: any) {
      SimpleLogger.error('NavScheduler', 'Failed to start scheduler', 'startSchedulerForConfig', {
        tenantId: config.tenant_id,
        userId: config.user_id,
        error: error.message
      }, config.user_id, config.tenant_id, error.stack);
      
      throw error;
    }
  }

  /**
   * Stop scheduler for specific configuration
   */
  async stopSchedulerForConfig(config: SchedulerConfig): Promise<void> {
    try {
      const jobKey = this.getJobKey(config);
      const scheduledTimer = this.activeTimers.get(jobKey);
      
      if (scheduledTimer) {
        clearTimeout(scheduledTimer.timerId);
        this.activeTimers.delete(jobKey);

        SimpleLogger.error('NavScheduler', 'Scheduler stopped', 'stopSchedulerForConfig', {
          tenantId: config.tenant_id,
          userId: config.user_id,
          jobKey
        }, config.user_id, config.tenant_id);
      }
    } catch (error: any) {
      SimpleLogger.error('NavScheduler', 'Failed to stop scheduler', 'stopSchedulerForConfig', {
        tenantId: config.tenant_id,
        userId: config.user_id,
        error: error.message
      }, config.user_id, config.tenant_id, error.stack);
    }
  }

  /**
   * Schedule next execution after current one completes
   */
  private async scheduleNextExecution(config: SchedulerConfig): Promise<void> {
    try {
      // Get fresh config from database (in case it was updated)
      const freshConfig = await this.getSchedulerConfig(config.tenant_id, config.is_live, config.user_id);
      if (!freshConfig || !freshConfig.is_enabled) {
        return; // Configuration was deleted or disabled
      }

      // Start scheduler again for next execution
      await this.startSchedulerForConfig(freshConfig);
    } catch (error: any) {
      SimpleLogger.error('NavScheduler', 'Failed to schedule next execution', 'scheduleNextExecution', {
        tenantId: config.tenant_id,
        userId: config.user_id,
        error: error.message
      }, config.user_id, config.tenant_id, error.stack);
    }
  }

  /**
   * Get scheduler status
   */
  async getSchedulerStatus(
    tenantId: number,
    isLive: boolean,
    userId: number
  ): Promise<SchedulerStatus | null> {
    try {
      const config = await this.getSchedulerConfig(tenantId, isLive, userId);
      if (!config) {
        return null;
      }

      const jobKey = this.getJobKey(config);
      const scheduledTimer = this.activeTimers.get(jobKey);
      const isRunning = scheduledTimer !== undefined && scheduledTimer.isActive;

      // Get recent executions
      const executionsQuery = `
        SELECT * FROM t_nav_schedule_executions
        WHERE scheduler_config_id = $1
        ORDER BY execution_time DESC
        LIMIT 10
      `;
      const executionsResult = await this.db.query(executionsQuery, [config.id]);
      const recentExecutions: ScheduleExecution[] = executionsResult.rows;

      return {
        config,
        is_running: isRunning,
        cron_job_active: isRunning, // For compatibility
        next_run: scheduledTimer?.nextRun || config.next_execution_at || null,
        last_run: config.last_executed_at || null,
        recent_executions: recentExecutions
      };
    } catch (error: any) {
      SimpleLogger.error('NavScheduler', 'Failed to get scheduler status', 'getSchedulerStatus', {
        tenantId, userId, error: error.message
      }, userId, tenantId, error.stack);
      
      throw error;
    }
  }

  // ==================== EXECUTION LOGIC (UNCHANGED) ====================

  /**
   * Execute scheduled download (called by timer)
   */
  private async executeScheduledDownload(config: SchedulerConfig): Promise<void> {
    const startTime = Date.now();
    let execution: ScheduleExecution;
    
    try {
      // Create execution record
      execution = await this.createExecutionRecord(config.id!, 'running');

      // Update last executed time and calculate next execution
      await this.updateConfigExecution(config);

      // Trigger N8N workflow
      const n8nPayload: N8nWebhookPayload = {
        tenant_id: config.tenant_id,
        user_id: config.user_id,
        is_live: config.is_live,
        schedule_type: config.schedule_type,
        trigger_source: 'scheduled',
        api_callback_url: `${this.API_BASE_URL}/api/nav/download/daily`,
        scheduler_config_id: config.id!
      };

      const n8nResult = await this.triggerN8nWorkflow(config.n8n_webhook_url!, n8nPayload);

      if (n8nResult.success) {
        // Update execution as successful
        await this.updateExecutionRecord(execution.id, {
          status: 'success',
          n8n_execution_id: n8nResult.executionId,
          execution_duration_ms: Date.now() - startTime
        });

        SimpleLogger.error('NavScheduler', 'Scheduled download executed successfully', 'executeScheduledDownload', {
          tenantId: config.tenant_id,
          userId: config.user_id,
          configId: config.id,
          n8nExecutionId: n8nResult.executionId,
          durationMs: Date.now() - startTime
        }, config.user_id, config.tenant_id);

      } else {
        throw new Error(`N8N workflow failed: ${n8nResult.error}`);
      }
    } catch (error: any) {
      // Update execution as failed
      if (execution!) {
        await this.updateExecutionRecord(execution.id, {
          status: 'failed',
          error_message: error.message,
          execution_duration_ms: Date.now() - startTime
        });
      }

      // Increment failure count
      await this.incrementFailureCount(config.id!);

      SimpleLogger.error('NavScheduler', 'Scheduled download failed', 'executeScheduledDownload', {
        tenantId: config.tenant_id,
        userId: config.user_id,
        configId: config.id,
        error: error.message,
        durationMs: Date.now() - startTime
      }, config.user_id, config.tenant_id, error.stack);
    }
  }

  // ==================== N8N INTEGRATION (UNCHANGED) ====================

  /**
   * Trigger N8N workflow via webhook
   */
  private async triggerN8nWorkflow(
    webhookUrl: string,
    payload: N8nWebhookPayload
  ): Promise<{ success: boolean; executionId?: string; error?: string }> {
    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        // Add timeout
        signal: AbortSignal.timeout(30000) // 30 seconds
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json() as any;
      
      return {
        success: true,
        executionId: result.executionId || `n8n_${Date.now()}`
      };

    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Unknown N8N error'
      };
    }
  }

  // ==================== DATABASE HELPERS (UNCHANGED) ====================

  /**
   * Create execution record
   */
  private async createExecutionRecord(
    configId: number,
    status: 'running' | 'success' | 'failed' | 'skipped'
  ): Promise<ScheduleExecution> {
    const query = `
      INSERT INTO t_nav_schedule_executions (
        scheduler_config_id, execution_time, status
      ) VALUES ($1, CURRENT_TIMESTAMP, $2)
      RETURNING *
    `;
    
    const result = await this.db.query(query, [configId, status]);
    return result.rows[0];
  }

  /**
   * Update execution record
   */
  private async updateExecutionRecord(
    executionId: number,
    updates: {
      status?: 'success' | 'failed' | 'skipped';
      job_id?: number;
      n8n_execution_id?: string;
      error_message?: string;
      execution_duration_ms?: number;
    }
  ): Promise<void> {
    const updateFields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined) {
        updateFields.push(`${key} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    });

    if (updateFields.length === 0) return;

    const query = `
      UPDATE t_nav_schedule_executions
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
    `;

    values.push(executionId);
    await this.db.query(query, values);
  }

  /**
   * Update config execution time and next run
   */
  private async updateConfigExecution(config: SchedulerConfig): Promise<void> {
    const nextExecution = this.getNextExecutionTime(config.cron_expression);
    
    const query = `
      UPDATE t_nav_scheduler_configs
      SET last_executed_at = CURRENT_TIMESTAMP,
          next_execution_at = $1,
          execution_count = execution_count + 1
      WHERE id = $2
    `;
    
    await this.db.query(query, [nextExecution, config.id]);
  }

  /**
   * Increment failure count
   */
  private async incrementFailureCount(configId: number): Promise<void> {
    const query = `
      UPDATE t_nav_scheduler_configs
      SET failure_count = failure_count + 1
      WHERE id = $1
    `;
    
    await this.db.query(query, [configId]);
  }

  // ==================== UTILITY METHODS (UPDATED) ====================

  /**
   * Generate unique job key for timer tracking
   */
  private getJobKey(config: SchedulerConfig): string {
    return `nav_scheduler_${config.tenant_id}_${config.is_live ? 'live' : 'test'}_${config.user_id}`;
  }

  /**
   * Get default N8N webhook URL
   */
  private getDefaultN8nWebhookUrl(): string {
    return `${this.N8N_BASE_URL}/webhook/${this.N8N_WEBHOOK_NAME}`;
  }

  /**
   * Validate cron expression (simplified validation)
   */
  private isValidCronExpression(cronExpression: string): boolean {
    try {
      // Basic validation: should have 5 parts (minute hour day month dayOfWeek)
      const parts = cronExpression.trim().split(/\s+/);
      if (parts.length !== 5) {
        return false;
      }

      // Check each part is either * or a valid number/range
      const [minute, hour, day, month, dayOfWeek] = parts;
      
      return this.isValidCronPart(minute, 0, 59) &&
             this.isValidCronPart(hour, 0, 23) &&
             this.isValidCronPart(day, 1, 31) &&
             this.isValidCronPart(month, 1, 12) &&
             this.isValidCronPart(dayOfWeek, 0, 7);
    } catch {
      return false;
    }
  }

  /**
   * Validate individual cron part
   */
  private isValidCronPart(part: string, min: number, max: number): boolean {
    if (part === '*') return true;
    
    // Handle simple numbers
    const num = parseInt(part);
    if (!isNaN(num)) {
      return num >= min && num <= max;
    }
    
    // For now, accept any other format (ranges, lists, etc.)
    // In production, you might want more comprehensive validation
    return true;
  }

  /**
   * Get next execution time from cron expression
   */
  private getNextExecutionTime(cronExpression: string): Date {
    try {
      const parts = cronExpression.trim().split(/\s+/);
      if (parts.length !== 5) {
        // Fallback to 1 hour from now
        const fallback = new Date();
        fallback.setHours(fallback.getHours() + 1);
        return fallback;
      }

      const [minutePart, hourPart, dayPart, monthPart, dayOfWeekPart] = parts;
      
      const now = new Date();
      const next = new Date(now);
      
      // Handle simple cases: fixed minute and hour
      if (minutePart !== '*' && hourPart !== '*') {
        const minute = parseInt(minutePart);
        const hour = parseInt(hourPart);
        
        if (!isNaN(minute) && !isNaN(hour)) {
          next.setHours(hour, minute, 0, 0);
          
          // If time has passed today, move to next occurrence
          if (next <= now) {
            if (dayOfWeekPart !== '*' && !isNaN(parseInt(dayOfWeekPart))) {
              // Weekly schedule
              const targetDayOfWeek = parseInt(dayOfWeekPart);
              const currentDayOfWeek = next.getDay();
              let daysToAdd = targetDayOfWeek - currentDayOfWeek;
              if (daysToAdd <= 0) {
                daysToAdd += 7; // Next week
              }
              next.setDate(next.getDate() + daysToAdd);
            } else {
              // Daily schedule
              next.setDate(next.getDate() + 1);
            }
          }
          
          return next;
        }
      }
      
      // Fallback for complex cron expressions
      const fallback = new Date();
      fallback.setHours(fallback.getHours() + 1);
      return fallback;
      
    } catch (error) {
      // Fallback: next day at same time
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      return tomorrow;
    }
  }

  // ==================== SYSTEM MANAGEMENT (UPDATED) ====================

  /**
   * Initialize all active schedulers on service startup
   */
  async initializeSchedulers(): Promise<void> {
    try {
      const query = `
        SELECT * FROM t_nav_scheduler_configs
        WHERE is_enabled = true
      `;
      
      const result = await this.db.query(query);
      const activeConfigs: SchedulerConfig[] = result.rows;

      SimpleLogger.error('NavScheduler', 'Initializing schedulers on startup', 'initializeSchedulers', {
        totalConfigs: activeConfigs.length
      });

      for (const config of activeConfigs) {
        try {
          await this.startSchedulerForConfig(config);
        } catch (error: any) {
          SimpleLogger.error('NavScheduler', 'Failed to initialize scheduler for config', 'initializeSchedulers', {
            configId: config.id,
            tenantId: config.tenant_id,
            userId: config.user_id,
            error: error.message
          }, config.user_id, config.tenant_id, error.stack);
        }
      }

      SimpleLogger.error('NavScheduler', 'Scheduler initialization completed', 'initializeSchedulers', {
        totalConfigs: activeConfigs.length,
        activeTimers: this.activeTimers.size
      });

    } catch (error: any) {
      SimpleLogger.error('NavScheduler', 'Failed to initialize schedulers', 'initializeSchedulers', {
        error: error.message
      }, undefined, undefined, error.stack);
      
      throw error;
    }
  }

  /**
   * Shutdown all schedulers gracefully
   */
  async shutdownSchedulers(): Promise<void> {
    try {
      SimpleLogger.error('NavScheduler', 'Shutting down all schedulers', 'shutdownSchedulers', {
        activeTimers: this.activeTimers.size
      });

      for (const [jobKey, scheduledTimer] of this.activeTimers.entries()) {
        try {
          clearTimeout(scheduledTimer.timerId);
        } catch (error: any) {
          SimpleLogger.error('NavScheduler', 'Error stopping timer', 'shutdownSchedulers', {
            jobKey, error: error.message
          });
        }
      }

      this.activeTimers.clear();

      SimpleLogger.error('NavScheduler', 'All schedulers stopped successfully', 'shutdownSchedulers');
    } catch (error: any) {
      SimpleLogger.error('NavScheduler', 'Error during scheduler shutdown', 'shutdownSchedulers', {
        error: error.message
      });
    }
  }

  /**
   * Get all active schedulers status (for admin/monitoring)
   */
  async getAllActiveSchedulers(): Promise<Array<{ jobKey: string; config: SchedulerConfig; isActive: boolean }>> {
    try {
      const query = `
        SELECT * FROM t_nav_scheduler_configs
        WHERE is_enabled = true
      `;
      
      const result = await this.db.query(query);
      const configs: SchedulerConfig[] = result.rows;

      return configs.map(config => ({
        jobKey: this.getJobKey(config),
        config,
        isActive: this.activeTimers.has(this.getJobKey(config))
      }));
    } catch (error: any) {
      SimpleLogger.error('NavScheduler', 'Failed to get all active schedulers', 'getAllActiveSchedulers', {
        error: error.message
      });
      
      return [];
    }
  }

  // ==================== MANUAL TRIGGER SUPPORT (UNCHANGED) ====================

  /**
   * Manually trigger download for user (bypassing schedule)
   */
  async manualTriggerDownload(
    tenantId: number,
    isLive: boolean,
    userId: number
  ): Promise<{ success: boolean; executionId?: string; error?: string }> {
    try {
      const config = await this.getSchedulerConfig(tenantId, isLive, userId);
      
      if (!config) {
        throw new Error('No scheduler configuration found');
      }

      // Create execution record for manual trigger
      const execution = await this.createExecutionRecord(config.id!, 'running');

      // Prepare N8N payload
      const n8nPayload: N8nWebhookPayload = {
        tenant_id: tenantId,
        user_id: userId,
        is_live: isLive,
        schedule_type: 'manual',
        trigger_source: 'manual',
        api_callback_url: `${this.API_BASE_URL}/api/nav/download/daily`,
        scheduler_config_id: config.id!
      };

      // Trigger N8N workflow
      const result = await this.triggerN8nWorkflow(config.n8n_webhook_url!, n8nPayload);

      // Update execution record
      await this.updateExecutionRecord(execution.id, {
        status: result.success ? 'success' : 'failed',
        n8n_execution_id: result.executionId,
        error_message: result.error
      });

      SimpleLogger.error('NavScheduler', 'Manual download trigger completed', 'manualTriggerDownload', {
        tenantId, userId, success: result.success, executionId: result.executionId
      }, userId, tenantId);

      return result;
    } catch (error: any) {
      SimpleLogger.error('NavScheduler', 'Failed to manually trigger download', 'manualTriggerDownload', {
        tenantId, userId, error: error.message
      }, userId, tenantId, error.stack);
      
      return {
        success: false,
        error: error.message
      };
    }
  }
}