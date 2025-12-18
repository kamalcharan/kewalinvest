// backend/src/controllers/jobs.controller.ts
// Generic controller for all job types

import { Request, Response } from 'express';
import { JobSchedulerService } from '../services/jobScheduler.service';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import {
  JobType,
  CreateJobConfigRequest,
  UpdateJobConfigRequest,
  GetJobConfigResponse,
  UpdateJobConfigResponse,
  TriggerJobResponse,
  GetExecutionsResponse,
  GetStatisticsResponse,
  GetJobTypesResponse
} from '../types/jobs.types';

export class JobsController {
  private schedulerService: JobSchedulerService;

  constructor(schedulerService: JobSchedulerService) {
    this.schedulerService = schedulerService;
  }

  // ==================== CONFIGURATION ENDPOINTS ====================

  /**
   * GET /api/jobs/:jobType/config
   * Get scheduler configuration for a job type
   */
  getConfig = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const tenantId = req.user?.tenant_id;
      const isLiveParam = req.query.is_live as string;
      const jobType = req.params.jobType as JobType;

      if (!tenantId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        } as GetJobConfigResponse);
        return;
      }

      if (!this.isValidJobType(jobType)) {
        res.status(400).json({
          success: false,
          error: `Invalid job type: ${jobType}`
        } as GetJobConfigResponse);
        return;
      }

      const isLive = isLiveParam !== 'false'; // Default to true (live mode)
      const config = await this.schedulerService.getConfig(tenantId, isLive, jobType);

      if (!config) {
        res.status(404).json({
          success: false,
          error: `No configuration found for job type: ${jobType}`
        } as GetJobConfigResponse);
        return;
      }

      res.status(200).json({
        success: true,
        data: config
      } as GetJobConfigResponse);

    } catch (error: any) {
      console.error(`[JobsController] Error getting config:`, error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get job configuration'
      } as GetJobConfigResponse);
    }
  };

  /**
   * POST /api/jobs/:jobType/config
   * Create scheduler configuration for a job type
   */
  createConfig = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const tenantId = req.user?.tenant_id;
      const userId = req.user?.user_id;
      const isLiveParam = req.query.is_live as string;
      const jobType = req.params.jobType as JobType;

      if (!tenantId || !userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        } as UpdateJobConfigResponse);
        return;
      }

      if (!this.isValidJobType(jobType)) {
        res.status(400).json({
          success: false,
          error: `Invalid job type: ${jobType}`
        } as UpdateJobConfigResponse);
        return;
      }

      const isLive = isLiveParam !== 'false'; // Default to true (live mode)

      // Check if config already exists
      const existing = await this.schedulerService.getConfig(tenantId, isLive, jobType);
      if (existing) {
        res.status(409).json({
          success: false,
          error: `Configuration already exists for job type: ${jobType}`
        } as UpdateJobConfigResponse);
        return;
      }

      const request: CreateJobConfigRequest = {
        user_id: userId,
        schedule_type: req.body.schedule_type,
        cron_expression: req.body.cron_expression,
        is_enabled: req.body.is_enabled,
        max_retries: req.body.max_retries,
        job_config: req.body.job_config
      };

      const config = await this.schedulerService.createConfig(tenantId, isLive, jobType, request);

      res.status(201).json({
        success: true,
        data: config,
        message: `Job configuration created successfully for ${jobType}`
      } as UpdateJobConfigResponse);

    } catch (error: any) {
      console.error(`[JobsController] Error creating config:`, error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to create job configuration'
      } as UpdateJobConfigResponse);
    }
  };

  /**
   * PUT /api/jobs/:jobType/config
   * Update scheduler configuration for a job type (creates if not exists)
   */
  updateConfig = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const tenantId = req.user?.tenant_id;
      const userId = req.user?.user_id;
      const isLiveParam = req.query.is_live as string;
      const jobType = req.params.jobType as JobType;

      if (!tenantId || !userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        } as UpdateJobConfigResponse);
        return;
      }

      if (!this.isValidJobType(jobType)) {
        res.status(400).json({
          success: false,
          error: `Invalid job type: ${jobType}`
        } as UpdateJobConfigResponse);
        return;
      }

      const isLive = isLiveParam !== 'false'; // Default to true (live mode)

      // Check if config exists
      const existing = await this.schedulerService.getConfig(tenantId, isLive, jobType);

      let config;

      if (!existing) {
        // Config doesn't exist - create it with the provided cron expression
        const createRequest: CreateJobConfigRequest = {
          user_id: userId,
          schedule_type: req.body.schedule_type || 'daily',
          cron_expression: req.body.cron_expression,
          is_enabled: req.body.is_enabled ?? true,
          max_retries: req.body.max_retries,
          job_config: req.body.job_config
        };

        config = await this.schedulerService.createConfig(tenantId, isLive, jobType, createRequest);
      } else {
        // Config exists - update it
        const request: UpdateJobConfigRequest = {
          schedule_type: req.body.schedule_type,
          cron_expression: req.body.cron_expression,
          is_enabled: req.body.is_enabled,
          max_retries: req.body.max_retries,
          job_config: req.body.job_config
        };

        config = await this.schedulerService.updateConfig(tenantId, isLive, jobType, request);
      }

      res.status(200).json({
        success: true,
        data: config,
        message: `Job configuration ${existing ? 'updated' : 'created'} successfully for ${jobType}`
      } as UpdateJobConfigResponse);

    } catch (error: any) {
      console.error(`[JobsController] Error updating config:`, error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to update job configuration'
      } as UpdateJobConfigResponse);
    }
  };

  // ==================== EXECUTION ENDPOINTS ====================

  /**
   * POST /api/jobs/:jobType/execute
   * Manually trigger job execution
   */
  triggerManual = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const tenantId = req.user?.tenant_id;
      const isLiveParam = req.query.is_live as string;
      const jobType = req.params.jobType as JobType;

      if (!tenantId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        } as TriggerJobResponse);
        return;
      }

      if (!this.isValidJobType(jobType)) {
        res.status(400).json({
          success: false,
          error: `Invalid job type: ${jobType}`
        } as TriggerJobResponse);
        return;
      }

      const isLive = isLiveParam !== 'false'; // Default to true (live mode)

      console.log(`[JobsController] Manual trigger requested for ${jobType}, tenant ${tenantId} (${isLive ? 'live' : 'test'})`);

      // Trigger job in background
      await this.schedulerService.triggerManual(tenantId, isLive, jobType);

      res.status(202).json({
        success: true,
        data: {
          execution_id: 0, // Will be created in background
          status: 'started',
          message: `Job ${jobType} triggered successfully`
        }
      } as TriggerJobResponse);

    } catch (error: any) {
      console.error(`[JobsController] Error triggering manual execution:`, error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to trigger job execution'
      } as TriggerJobResponse);
    }
  };

  /**
   * GET /api/jobs/:jobType/executions
   * Get execution history for a job type
   */
  getExecutions = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const tenantId = req.user?.tenant_id;
      const isLiveParam = req.query.is_live as string;
      const jobType = req.params.jobType as JobType;
      const page = parseInt(req.query.page as string) || 1;
      const pageSize = parseInt(req.query.page_size as string) || 20;

      if (!tenantId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        } as GetExecutionsResponse);
        return;
      }

      if (!this.isValidJobType(jobType)) {
        res.status(400).json({
          success: false,
          error: `Invalid job type: ${jobType}`
        } as GetExecutionsResponse);
        return;
      }

      const isLive = isLiveParam !== 'false'; // Default to true (live mode)

      const { executions, total } = await this.schedulerService.getExecutions(
        tenantId,
        isLive,
        jobType,
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
      console.error(`[JobsController] Error getting executions:`, error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get execution history'
      } as GetExecutionsResponse);
    }
  };

  /**
   * GET /api/jobs/:jobType/statistics
   * Get statistics and status for a job type
   */
  getStatistics = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const tenantId = req.user?.tenant_id;
      const isLiveParam = req.query.is_live as string;
      const jobType = req.params.jobType as JobType;

      if (!tenantId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        } as GetStatisticsResponse);
        return;
      }

      if (!this.isValidJobType(jobType)) {
        res.status(400).json({
          success: false,
          error: `Invalid job type: ${jobType}`
        } as GetStatisticsResponse);
        return;
      }

      const isLive = isLiveParam !== 'false'; // Default to true (live mode)

      const statistics = await this.schedulerService.getStatistics(tenantId, isLive, jobType);

      if (!statistics) {
        res.status(404).json({
          success: false,
          error: `No statistics available for job type: ${jobType}`
        } as GetStatisticsResponse);
        return;
      }

      res.status(200).json({
        success: true,
        data: statistics
      } as GetStatisticsResponse);

    } catch (error: any) {
      console.error(`[JobsController] Error getting statistics:`, error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get statistics'
      } as GetStatisticsResponse);
    }
  };

  // ==================== JOB TYPES ENDPOINT ====================

  /**
   * GET /api/jobs/types
   * Get all available job types with tenant-specific configurations merged
   */
  getJobTypes = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const tenantId = req.user?.tenant_id;
      const isLiveParam = req.query.is_live as string;

      if (!tenantId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        } as GetJobTypesResponse);
        return;
      }

      const isLive = isLiveParam !== 'false'; // Default to true (live mode)

      // Query database for active job types AND merge with tenant-specific configs
      // This ensures we display the tenant's configured cron expression, not the default
      const query = `
        SELECT
          jt.*,
          COALESCE(tc.cron_expression, jt.default_cron_expression) as default_cron_expression,
          tc.is_enabled as tenant_is_enabled,
          tc.cron_expression as tenant_cron_expression
        FROM m_job_types jt
        LEFT JOIN t_job_scheduler_configs tc
          ON tc.job_type = jt.code
          AND tc.tenant_id = $1
          AND tc.is_live = $2
        WHERE jt.is_active = true
        ORDER BY jt.code
      `;
      const result = await this.schedulerService['db'].query(query, [tenantId, isLive]);

      res.status(200).json({
        success: true,
        data: result.rows
      } as GetJobTypesResponse);

    } catch (error: any) {
      console.error(`[JobsController] Error getting job types:`, error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get job types'
      } as GetJobTypesResponse);
    }
  };

  /**
   * GET /api/jobs/:jobType/health
   * Health check for a specific job type
   */
  healthCheck = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const tenantId = req.user?.tenant_id;
      const isLiveParam = req.query.is_live as string;
      const jobType = req.params.jobType as JobType;

      if (!tenantId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      if (!this.isValidJobType(jobType)) {
        res.status(400).json({
          success: false,
          error: `Invalid job type: ${jobType}`
        });
        return;
      }

      const isLive = isLiveParam !== 'false'; // Default to true (live mode)

      const config = await this.schedulerService.getConfig(tenantId, isLive, jobType);
      const stats = await this.schedulerService.getStatistics(tenantId, isLive, jobType);

      const health = {
        job_type: jobType,
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
      console.error(`[JobsController] Error in health check:`, error);
      res.status(500).json({
        success: false,
        error: error.message || 'Health check failed'
      });
    }
  };

  // ==================== HELPER METHODS ====================

  /**
   * Validate job type
   */
  private isValidJobType(jobType: string): boolean {
    return Object.values(JobType).includes(jobType as JobType);
  }

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
