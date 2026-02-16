// backend/src/controllers/portfolioSnapshot.controller.ts
// Controller for Portfolio Snapshot Scheduler API endpoints
// FIXED: All operations now use JobSchedulerService for execution tracking

import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { PortfolioSnapshotSchedulerService } from '../services/portfolioSnapshotScheduler.service';
import { PortfolioSnapshotService } from '../services/portfolioSnapshot.service';
import { JobSchedulerService } from '../services/jobScheduler.service';
import { JobType } from '../types/jobs.types';
import {
  CreateSnapshotConfigRequest,
  UpdateSnapshotConfigRequest,
  GetSnapshotConfigResponse,
  UpdateSnapshotConfigResponse,
  TriggerSnapshotResponse,
  GetExecutionsResponse,
  GetStatisticsResponse
} from '../types/portfolioSnapshot.types';

export class PortfolioSnapshotController {
  private schedulerService: PortfolioSnapshotSchedulerService;
  private snapshotService: PortfolioSnapshotService;
  private jobSchedulerService: JobSchedulerService;

  constructor(jobSchedulerService: JobSchedulerService) {
    this.schedulerService = new PortfolioSnapshotSchedulerService();
    this.snapshotService = new PortfolioSnapshotService();
    this.jobSchedulerService = jobSchedulerService;
  }

  // ==================== CONFIGURATION ENDPOINTS ====================

  /**
   * GET /api/cruise-control/snapshots/config
   * Get scheduler configuration for current tenant
   */
  getConfig = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const tenantId = req.user?.tenant_id;
      const isLive = req.headers['x-environment'] === 'live';

      if (!tenantId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        } as GetSnapshotConfigResponse);
        return;
      }

      const config = await this.schedulerService.getConfig(tenantId, isLive);

      if (!config) {
        res.status(404).json({
          success: false,
          error: 'No scheduler configuration found'
        } as GetSnapshotConfigResponse);
        return;
      }

      res.status(200).json({
        success: true,
        data: config
      } as GetSnapshotConfigResponse);

    } catch (error: any) {
      console.error('[SnapshotController] Error getting config:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get scheduler configuration'
      } as GetSnapshotConfigResponse);
    }
  };

  /**
   * POST /api/cruise-control/snapshots/config
   * Create scheduler configuration for current tenant
   */
  createConfig = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const tenantId = req.user?.tenant_id;
      const userId = req.user?.user_id;
      const isLive = req.headers['x-environment'] === 'live';

      if (!tenantId || !userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        } as UpdateSnapshotConfigResponse);
        return;
      }

      // Check if config already exists
      const existing = await this.schedulerService.getConfig(tenantId, isLive);
      if (existing) {
        res.status(409).json({
          success: false,
          error: 'Configuration already exists for this tenant'
        } as UpdateSnapshotConfigResponse);
        return;
      }

      const request: CreateSnapshotConfigRequest = {
        user_id: userId,
        schedule_type: req.body.schedule_type || 'weekly',
        cron_expression: req.body.cron_expression || '0 21 * * 5',
        is_enabled: req.body.is_enabled !== undefined ? req.body.is_enabled : true,
        max_retries: req.body.max_retries || 3
      };

      const config = await this.schedulerService.createConfig(tenantId, isLive, request);

      res.status(201).json({
        success: true,
        data: config,
        message: 'Scheduler configuration created successfully'
      } as UpdateSnapshotConfigResponse);

    } catch (error: any) {
      console.error('[SnapshotController] Error creating config:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to create scheduler configuration'
      } as UpdateSnapshotConfigResponse);
    }
  };

  /**
   * PUT /api/cruise-control/snapshots/config
   * Update scheduler configuration for current tenant
   */
  updateConfig = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const tenantId = req.user?.tenant_id;
      const isLive = req.headers['x-environment'] === 'live';

      if (!tenantId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        } as UpdateSnapshotConfigResponse);
        return;
      }

      const request: UpdateSnapshotConfigRequest = {
        schedule_type: req.body.schedule_type,
        cron_expression: req.body.cron_expression,
        is_enabled: req.body.is_enabled,
        max_retries: req.body.max_retries
      };

      const config = await this.schedulerService.updateConfig(tenantId, isLive, request);

      res.status(200).json({
        success: true,
        data: config,
        message: 'Scheduler configuration updated successfully'
      } as UpdateSnapshotConfigResponse);

    } catch (error: any) {
      console.error('[SnapshotController] Error updating config:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to update scheduler configuration'
      } as UpdateSnapshotConfigResponse);
    }
  };

  // ==================== EXECUTION ENDPOINTS ====================

  /**
   * POST /api/cruise-control/snapshots/execute
   * Manually trigger snapshot generation
   */
  triggerManual = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const tenantId = req.user?.tenant_id;
      const isLive = req.headers['x-environment'] === 'live';

      if (!tenantId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        } as TriggerSnapshotResponse);
        return;
      }

      console.log(`[SnapshotController] Manual trigger requested by tenant ${tenantId} (${isLive ? 'live' : 'test'})`);

      const result = await this.schedulerService.triggerManual(tenantId, isLive);

      if (result.success) {
        res.status(202).json(result); // 202 Accepted - processing in background
      } else {
        res.status(400).json(result);
      }

    } catch (error: any) {
      console.error('[SnapshotController] Error triggering manual execution:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to trigger snapshot generation'
      } as TriggerSnapshotResponse);
    }
  };

  /**
   * GET /api/cruise-control/snapshots/executions
   * Get execution history for current tenant
   */
  getExecutions = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const tenantId = req.user?.tenant_id;
      const isLive = req.headers['x-environment'] === 'live';
      const page = parseInt(req.query.page as string) || 1;
      const pageSize = parseInt(req.query.page_size as string) || 20;

      if (!tenantId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        } as GetExecutionsResponse);
        return;
      }

      const { executions, total } = await this.schedulerService.getExecutions(
        tenantId,
        isLive,
        page,
        pageSize
      );

      const totalPages = Math.ceil(total / pageSize);

      res.status(200).json({
        success: true,
        data: {
          executions,
          pagination: {
            page,
            page_size: pageSize,
            total,
            total_pages: totalPages
          }
        }
      } as GetExecutionsResponse);

    } catch (error: any) {
      console.error('[SnapshotController] Error getting executions:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get execution history'
      } as GetExecutionsResponse);
    }
  };

  /**
   * GET /api/cruise-control/snapshots/statistics
   * Get statistics and status for current tenant
   */
  getStatistics = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const tenantId = req.user?.tenant_id;
      const isLive = req.headers['x-environment'] === 'live';

      if (!tenantId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        } as GetStatisticsResponse);
        return;
      }

      const statistics = await this.schedulerService.getStatistics(tenantId, isLive);

      if (!statistics) {
        res.status(404).json({
          success: false,
          error: 'No statistics available'
        } as GetStatisticsResponse);
        return;
      }

      res.status(200).json({
        success: true,
        data: statistics
      } as GetStatisticsResponse);

    } catch (error: any) {
      console.error('[SnapshotController] Error getting statistics:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get statistics'
      } as GetStatisticsResponse);
    }
  };

  // ==================== UTILITY ENDPOINTS ====================

  /**
   * POST /api/cruise-control/snapshots/backfill-smart
   * Smart backfill - automatically detects missing months per customer
   */
  smartBackfill = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const tenantId = req.user?.tenant_id;
      const userId = req.user?.user_id;
      const isLive = req.headers['x-environment'] === 'live';

      if (!tenantId || !userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      const { customer_ids, non_scheme_only } = req.body;

      console.log(`[SnapshotController] Smart backfill requested for tenant ${tenantId}${customer_ids ? ` (${customer_ids.length} customers)` : ' (all customers)'}${non_scheme_only ? ' (non-scheme only)' : ''}`);

      // Get or create config
      let config = await this.jobSchedulerService.getConfig(tenantId, isLive, JobType.PORTFOLIO_SNAPSHOT);

      if (!config) {
        config = await this.jobSchedulerService.createConfig(tenantId, isLive, JobType.PORTFOLIO_SNAPSHOT, {
          user_id: userId,
          schedule_type: 'weekly',
          cron_expression: '0 21 * * 5',
          is_enabled: false,
          max_retries: 3
        });
      }

      // Create execution record
      const executionId = await this.jobSchedulerService.createExecution(
        config.id!,
        tenantId,
        isLive,
        JobType.PORTFOLIO_SNAPSHOT,
        'manual',
        0
      );

      // Execute backfill in background
      this.snapshotService.smartBackfill({
        tenant_id: tenantId,
        is_live: isLive,
        customer_ids: customer_ids,
        non_scheme_only: non_scheme_only || false
      }).then(async (result) => {
        try {
          await this.jobSchedulerService.completeExecution(executionId, {
            success: true,
            execution_data: {
              snapshot_month_end: result.snapshot_month_end,
              customers_processed: result.customers_processed || 0,
              customers_failed: result.customers_failed || 0,
              snapshots_created: result.snapshots_created || 0,
              snapshots_updated: result.snapshots_updated || 0,
              months_processed: result.months_processed || 0,
              errors: result.errors || []
            },
            execution_duration_ms: result.execution_duration_ms
          });
          await this.jobSchedulerService.updateConfigStats(config.id!, true);
        } catch (updateError: any) {
          console.error(`[SnapshotController] Failed to update execution ${executionId}:`, updateError);
        }
      }).catch(async (error) => {
        try {
          await this.jobSchedulerService.failExecution(executionId, error.message);
          await this.jobSchedulerService.updateConfigStats(config.id!, false);
        } catch (failError) {
          console.error(`[SnapshotController] Failed to mark execution as failed:`, failError);
        }
      });

      res.status(202).json({
        success: true,
        data: {
          execution_id: executionId,
          status: 'running',
          message: 'Smart backfill started. This may take a few minutes.'
        }
      });

    } catch (error: any) {
      console.error('[SnapshotController] Error during smart backfill:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to perform smart backfill'
      });
    }
  };

  /**
   * POST /api/cruise-control/snapshots/backfill
   * Backfill historical snapshots with manual date range
   */
  backfillSnapshots = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const tenantId = req.user?.tenant_id;
      const isLive = req.headers['x-environment'] === 'live';

      if (!tenantId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      const { start_month, end_month, customer_ids } = req.body;

      if (!start_month || !end_month) {
        res.status(400).json({
          success: false,
          error: 'start_month and end_month are required'
        });
        return;
      }

      console.log(`[SnapshotController] Backfill requested for tenant ${tenantId} from ${start_month} to ${end_month}`);

      const result = await this.snapshotService.backfillSnapshots({
        tenant_id: tenantId,
        is_live: isLive,
        start_month: new Date(start_month),
        end_month: new Date(end_month),
        customer_ids: customer_ids
      });

      res.status(200).json({
        success: true,
        data: result,
        message: `Backfill completed. Processed ${result.months_processed} months, created ${result.snapshots_created} snapshots.`
      });

    } catch (error: any) {
      console.error('[SnapshotController] Error during backfill:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to backfill snapshots'
      });
    }
  };

  /**
   * GET /api/cruise-control/snapshots/health
   * Health check endpoint
   */
  healthCheck = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const tenantId = req.user?.tenant_id;
      const isLive = req.headers['x-environment'] === 'live';

      if (!tenantId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      const config = await this.schedulerService.getConfig(tenantId, isLive);
      const stats = await this.schedulerService.getStatistics(tenantId, isLive);

      const health = {
        scheduler_configured: !!config,
        scheduler_enabled: config?.is_enabled || false,
        last_execution_status: stats?.last_execution?.status || 'never_run',
        next_scheduled_run: stats?.next_scheduled_run || null,
        success_rate: stats?.success_rate || 0,
        health_status: this.determineHealthStatus(stats)
      };

      res.status(200).json({
        success: true,
        data: health
      });

    } catch (error: any) {
      console.error('[SnapshotController] Error in health check:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Health check failed'
      });
    }
  };

  // ==================== NEW OPERATION ENDPOINTS ====================

  /**
   * POST /api/cruise-control/snapshots/operations/drop-all
   * Drop all snapshots (DANGEROUS operation)
   */
  dropAllSnapshots = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const tenantId = req.user?.tenant_id;
      const userId = req.user?.user_id;
      const isLive = req.headers['x-environment'] === 'live';

      if (!tenantId || !userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      const customerIds = req.body.customer_ids;

      console.log(`[SnapshotController] Drop all snapshots requested by user ${userId} for tenant ${tenantId}`);

      // Get or create config
      let config = await this.jobSchedulerService.getConfig(tenantId, isLive, JobType.PORTFOLIO_SNAPSHOT);
      if (!config) {
        config = await this.jobSchedulerService.createConfig(tenantId, isLive, JobType.PORTFOLIO_SNAPSHOT, {
          user_id: userId,
          schedule_type: 'weekly',
          cron_expression: '0 21 * * 5',
          is_enabled: false,
          max_retries: 3
        });
      }

      // Create execution record
      const executionId = await this.jobSchedulerService.createExecution(
        config.id!,
        tenantId,
        isLive,
        JobType.PORTFOLIO_SNAPSHOT,
        'manual',
        0
      );

      // Execute in background
      this.snapshotService.dropAllSnapshots({
        tenant_id: tenantId,
        is_live: isLive,
        customer_ids: customerIds
      }).then(async (result) => {
        try {
          if (result.success) {
            await this.jobSchedulerService.completeExecution(executionId, {
              success: true,
              execution_data: {
                operation: 'drop_all',
                deleted_count: result.deleted_count,
                message: result.message,
                customers_processed: 0,
                customers_failed: 0,
                snapshots_created: 0,
                snapshots_updated: 0
              },
              execution_duration_ms: result.execution_duration_ms
            });
            await this.jobSchedulerService.updateConfigStats(config.id!, true);
            console.log(`[SnapshotController] Drop all completed: ${result.deleted_count} snapshots deleted`);
          } else {
            await this.jobSchedulerService.failExecution(executionId, result.message);
            await this.jobSchedulerService.updateConfigStats(config.id!, false);
          }
        } catch (updateError: any) {
          console.error(`[SnapshotController] Failed to update execution ${executionId}:`, updateError);
        }
      }).catch(async (error) => {
        try {
          console.error('[SnapshotController] Drop all failed:', error);
          await this.jobSchedulerService.failExecution(executionId, error.message);
          await this.jobSchedulerService.updateConfigStats(config.id!, false);
        } catch (failError) {
          console.error(`[SnapshotController] Failed to mark execution as failed:`, failError);
        }
      });

      res.status(202).json({
        success: true,
        data: {
          execution_id: executionId,
          status: 'running',
          message: 'Dropping snapshots. This may take a few moments.'
        }
      });
    } catch (error: any) {
      console.error('[SnapshotController] Error dropping snapshots:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to drop snapshots'
      });
    }
  };

  /**
   * POST /api/cruise-control/snapshots/operations/generate-missing
   * Generate only missing snapshots (safe operation)
   */
  generateMissingSnapshots = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const tenantId = req.user?.tenant_id;
      const userId = req.user?.user_id;
      const isLive = req.headers['x-environment'] === 'live';

      if (!tenantId || !userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      const customerIds = req.body.customer_ids;

      console.log(`[SnapshotController] Generate missing snapshots requested by user ${userId} for tenant ${tenantId}`);

      // Get or create config
      let config = await this.jobSchedulerService.getConfig(tenantId, isLive, JobType.PORTFOLIO_SNAPSHOT);
      if (!config) {
        config = await this.jobSchedulerService.createConfig(tenantId, isLive, JobType.PORTFOLIO_SNAPSHOT, {
          user_id: userId,
          schedule_type: 'weekly',
          cron_expression: '0 21 * * 5',
          is_enabled: false,
          max_retries: 3
        });
      }

      // Create execution record
      const executionId = await this.jobSchedulerService.createExecution(
        config.id!,
        tenantId,
        isLive,
        JobType.PORTFOLIO_SNAPSHOT,
        'manual',
        0
      );

      // Execute in background
      this.snapshotService.generateMissingSnapshots({
        tenant_id: tenantId,
        is_live: isLive,
        customer_ids: customerIds
      }).then(async (result) => {
        try {
          await this.jobSchedulerService.completeExecution(executionId, {
            success: true,
            execution_data: {
              operation: 'generate_missing',
              snapshot_month_end: result.snapshot_month_end,
              customers_processed: result.customers_processed,
              customers_failed: result.customers_failed,
              snapshots_created: result.snapshots_created,
              snapshots_updated: 0,
              snapshots_skipped: result.snapshots_skipped,
              months_processed: result.months_processed,
              errors: result.errors
            },
            execution_duration_ms: result.execution_duration_ms
          });
          await this.jobSchedulerService.updateConfigStats(config.id!, true);
          console.log(`[SnapshotController] Generate missing completed: ${result.snapshots_created} created, ${result.snapshots_skipped} skipped`);
        } catch (updateError: any) {
          console.error(`[SnapshotController] Failed to update execution ${executionId}:`, updateError);
        }
      }).catch(async (error) => {
        try {
          console.error('[SnapshotController] Generate missing failed:', error);
          await this.jobSchedulerService.failExecution(executionId, error.message);
          await this.jobSchedulerService.updateConfigStats(config.id!, false);
        } catch (failError) {
          console.error(`[SnapshotController] Failed to mark execution as failed:`, failError);
        }
      });

      res.status(202).json({
        success: true,
        data: {
          execution_id: executionId,
          status: 'running',
          message: 'Generating missing snapshots. This may take a few minutes.'
        }
      });
    } catch (error: any) {
      console.error('[SnapshotController] Error generating missing snapshots:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to generate missing snapshots'
      });
    }
  };

  /**
   * POST /api/cruise-control/snapshots/operations/update-all
   * Update all snapshots (CREATE + UPDATE)
   */
  updateAllSnapshots = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const tenantId = req.user?.tenant_id;
      const userId = req.user?.user_id;
      const isLive = req.headers['x-environment'] === 'live';

      if (!tenantId || !userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      const customerIds = req.body.customer_ids;

      console.log(`[SnapshotController] Update all snapshots requested by user ${userId} for tenant ${tenantId}`);

      // Get or create config
      let config = await this.jobSchedulerService.getConfig(tenantId, isLive, JobType.PORTFOLIO_SNAPSHOT);
      if (!config) {
        config = await this.jobSchedulerService.createConfig(tenantId, isLive, JobType.PORTFOLIO_SNAPSHOT, {
          user_id: userId,
          schedule_type: 'weekly',
          cron_expression: '0 21 * * 5',
          is_enabled: false,
          max_retries: 3
        });
      }

      // Create execution record
      const executionId = await this.jobSchedulerService.createExecution(
        config.id!,
        tenantId,
        isLive,
        JobType.PORTFOLIO_SNAPSHOT,
        'manual',
        0
      );

      // Execute in background
      this.snapshotService.updateAllSnapshots({
        tenant_id: tenantId,
        is_live: isLive,
        customer_ids: customerIds
      }).then(async (result) => {
        try {
          await this.jobSchedulerService.completeExecution(executionId, {
            success: true,
            execution_data: {
              operation: 'update_all',
              snapshot_month_end: result.snapshot_month_end,
              customers_processed: result.customers_processed,
              customers_failed: result.customers_failed,
              snapshots_created: result.snapshots_created,
              snapshots_updated: result.snapshots_updated,
              months_processed: result.months_processed,
              errors: result.errors
            },
            execution_duration_ms: result.execution_duration_ms
          });
          await this.jobSchedulerService.updateConfigStats(config.id!, true);
          console.log(`[SnapshotController] Update all completed: ${result.snapshots_created} created, ${result.snapshots_updated} updated`);
        } catch (updateError: any) {
          console.error(`[SnapshotController] Failed to update execution ${executionId}:`, updateError);
        }
      }).catch(async (error) => {
        try {
          console.error('[SnapshotController] Update all failed:', error);
          await this.jobSchedulerService.failExecution(executionId, error.message);
          await this.jobSchedulerService.updateConfigStats(config.id!, false);
        } catch (failError) {
          console.error(`[SnapshotController] Failed to mark execution as failed:`, failError);
        }
      });

      res.status(202).json({
        success: true,
        data: {
          execution_id: executionId,
          status: 'running',
          message: 'Updating all snapshots. This may take a few minutes.'
        }
      });
    } catch (error: any) {
      console.error('[SnapshotController] Error updating all snapshots:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to update all snapshots'
      });
    }
  };

  /**
   * POST /api/cruise-control/snapshots/operations/regenerate-all
   * Regenerate all snapshots (DROP + CREATE - VERY DANGEROUS)
   */
  regenerateAllSnapshots = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const tenantId = req.user?.tenant_id;
      const userId = req.user?.user_id;
      const isLive = req.headers['x-environment'] === 'live';

      // ADD THIS LOGGING BLOCK
    console.log('🔍 REGENERATE ALL - REQUEST DETAILS:');
    console.log('   User ID:', userId);
    console.log('   Tenant ID:', tenantId);
    console.log('   Environment Header:', req.headers['x-environment']);
    console.log('   Is Live:', isLive);
    console.log('   Customer IDs:', req.body.customer_ids);
    console.log('   User Object:', JSON.stringify(req.user, null, 2));

      if (!tenantId || !userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      const customerIds = req.body.customer_ids;

      console.log(`[SnapshotController] Regenerate all snapshots requested by user ${userId} for tenant ${tenantId}`);

      // Get or create config
      let config = await this.jobSchedulerService.getConfig(tenantId, isLive, JobType.PORTFOLIO_SNAPSHOT);
      if (!config) {
        config = await this.jobSchedulerService.createConfig(tenantId, isLive, JobType.PORTFOLIO_SNAPSHOT, {
          user_id: userId,
          schedule_type: 'weekly',
          cron_expression: '0 21 * * 5',
          is_enabled: false,
          max_retries: 3
        });
      }

      // Create execution record
      const executionId = await this.jobSchedulerService.createExecution(
        config.id!,
        tenantId,
        isLive,
        JobType.PORTFOLIO_SNAPSHOT,
        'manual',
        0
      );

      // Execute in background
      this.snapshotService.regenerateAllSnapshots({
        tenant_id: tenantId,
        is_live: isLive,
        customer_ids: customerIds
      }).then(async (result) => {
        try {
          await this.jobSchedulerService.completeExecution(executionId, {
            success: true,
            execution_data: {
              operation: 'regenerate_all',
              snapshot_month_end: result.snapshot_month_end,
              customers_processed: result.customers_processed,
              customers_failed: result.customers_failed,
              snapshots_created: result.snapshots_created,
              snapshots_updated: 0,
              snapshots_deleted: result.snapshots_deleted,
              months_processed: result.months_processed,
              errors: result.errors
            },
            execution_duration_ms: result.execution_duration_ms
          });
          await this.jobSchedulerService.updateConfigStats(config.id!, true);
          console.log(`[SnapshotController] Regenerate all completed: ${result.snapshots_deleted} deleted, ${result.snapshots_created} created`);
        } catch (updateError: any) {
          console.error(`[SnapshotController] Failed to update execution ${executionId}:`, updateError);
        }
      }).catch(async (error) => {
        try {
          console.error('[SnapshotController] Regenerate all failed:', error);
          await this.jobSchedulerService.failExecution(executionId, error.message);
          await this.jobSchedulerService.updateConfigStats(config.id!, false);
        } catch (failError) {
          console.error(`[SnapshotController] Failed to mark execution as failed:`, failError);
        }
      });

      res.status(202).json({
        success: true,
        data: {
          execution_id: executionId,
          status: 'running',
          message: 'Regenerating all snapshots. This may take several minutes.'
        }
      });
    } catch (error: any) {
      console.error('[SnapshotController] Error regenerating all snapshots:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to regenerate all snapshots'
      });
    }
  };

  // ==================== CUSTOMER SNAPSHOT STATUS ENDPOINT ====================

  /**
   * GET /api/cruise-control/snapshots/customer/:customerId/status
   * Get snapshot status for a specific customer
   */
  getCustomerSnapshotStatus = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const tenantId = req.user?.tenant_id;
      const isLive = req.headers['x-environment'] === 'live';
      const customerId = parseInt(req.params.customerId);

      if (!tenantId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      if (!customerId || isNaN(customerId)) {
        res.status(400).json({
          success: false,
          error: 'Valid customer ID is required'
        });
        return;
      }

      const status = await this.snapshotService.getCustomerSnapshotStatus(
        tenantId,
        isLive,
        customerId
      );

      res.status(200).json({
        success: true,
        data: status
      });

    } catch (error: any) {
      console.error('[SnapshotController] Error getting customer snapshot status:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get customer snapshot status'
      });
    }
  };

  // ==================== HELPER METHODS ====================

  /**
   * Determine health status based on statistics
   */
  private determineHealthStatus(stats: any): 'healthy' | 'warning' | 'critical' {
    if (!stats || !stats.last_execution) {
      return 'warning'; // Never run
    }

    const lastStatus = stats.last_execution.status;
    const successRate = stats.success_rate;

    if (lastStatus === 'failed') {
      return 'critical';
    }

    if (successRate < 80) {
      return 'warning';
    }

    return 'healthy';
  }
}