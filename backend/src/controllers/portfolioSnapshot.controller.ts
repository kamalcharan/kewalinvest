// backend/src/controllers/portfolioSnapshot.controller.ts
// Controller for Portfolio Snapshot Scheduler API endpoints

import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { PortfolioSnapshotSchedulerService } from '../services/portfolioSnapshotScheduler.service';
import { PortfolioSnapshotService } from '../services/portfolioSnapshot.service';
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

  constructor() {
    this.schedulerService = new PortfolioSnapshotSchedulerService();
    this.snapshotService = new PortfolioSnapshotService();
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


      console.log(`[SnapshotController] Manual trigger requested by tenant ${tenantId} (${environment})`);

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

      const { customer_ids } = req.body;

      console.log(`[SnapshotController] Smart backfill requested for tenant ${tenantId}${customer_ids ? ` (${customer_ids.length} customers)` : ' (all customers)'}`);
      console.log(`[SnapshotController] Environment from header: ${req.headers['x-environment']}, is_live: ${isLive}`);
      const executionId = await this.schedulerService.createExecution(tenantId, userId, isLive, 'manual');

      // Execute backfill in background and track it
      this.snapshotService.smartBackfill({
        tenant_id: tenantId,
        is_live: isLive,
        customer_ids: customer_ids
      }).then(async (result) => {
        try {
          console.log(`[SnapshotController] Smart backfill completed for execution ${executionId}. Result:`, {
            customers_processed: result.customers_processed,
            customers_failed: result.customers_failed,
            snapshots_created: result.snapshots_created,
            snapshots_updated: result.snapshots_updated,
            duration_ms: result.execution_duration_ms
          });

          // Update execution with results
          await this.schedulerService.completeExecutionWithResults(executionId, result);
          console.log(`[SnapshotController] Execution ${executionId} updated with results successfully`);
        } catch (updateError: any) {
          console.error(`[SnapshotController] CRITICAL: Failed to update execution ${executionId} with results:`, updateError);
          // Try to mark as failed
          try {
            await this.schedulerService.failExecutionWithError(executionId, `Failed to update results: ${updateError.message}`);
          } catch (failError) {
            console.error(`[SnapshotController] CRITICAL: Failed to mark execution as failed:`, failError);
          }
        }
      }).catch(async (error) => {
        try {
          console.error(`[SnapshotController] Smart backfill failed for execution ${executionId}:`, error);
          // Mark execution as failed
          await this.schedulerService.failExecutionWithError(executionId, error.message);
          console.log(`[SnapshotController] Execution ${executionId} marked as failed`);
        } catch (failError: any) {
          console.error(`[SnapshotController] CRITICAL: Failed to mark execution as failed:`, failError);
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
   * Backfill historical snapshots with manual date range (Admin only)
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
