// backend/src/controllers/jtbd.unified.controller.ts
// Unified JTBD Controller - Handles both configurations and executions

import { Request, Response } from 'express';
import { JTBDService } from '../services/jtbd.service';
import { JTBDExecutionService } from '../services/jtbd.execution.service';
import {
  CreateJTBDRequest,
  UpdateJTBDRequest,
  CreateExecutionRequest,
  UpdateExecutionRequest,
  CompleteExecutionRequest,
  CancelExecutionRequest,
  JTBDFilters,
  ExecutionFilters
} from '../types/jtbd.types';

interface AuthenticatedRequest extends Request {
  user?: {
    user_id: number;
    tenant_id: number;
  };
  environment?: 'live' | 'test';
}

export class JTBDUnifiedController {
  private jtbdService: JTBDService;
  private executionService: JTBDExecutionService;

  constructor() {
    this.jtbdService = new JTBDService();
    this.executionService = new JTBDExecutionService();
  }

  // ============================================================================
  // CONFIGURATION ENDPOINTS
  // ============================================================================

  /**
   * POST /api/jtbd/config
   * Create new JTBD configuration
   */
  createConfig = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { user, environment } = req;
      const isLive = environment === 'live';
      const data = req.body as CreateJTBDRequest;

      // Validation
      if (!data.customer_id) {
        res.status(400).json({
          success: false,
          error: 'customer_id is required'
        });
        return;
      }

      if (!data.jtbd_type) {
        res.status(400).json({
          success: false,
          error: 'jtbd_type is required'
        });
        return;
      }

      if (!data.config_data) {
        res.status(400).json({
          success: false,
          error: 'config_data is required'
        });
        return;
      }

      const jtbd = await this.jtbdService.createJTBD(
        user!.tenant_id,
        isLive,
        data,
        user!.user_id
      );

      res.status(201).json({
        success: true,
        data: jtbd,
        message: 'JTBD configuration created successfully',
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      console.error('Error creating JTBD config:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to create JTBD configuration'
      });
    }
  };

  /**
   * GET /api/jtbd/config
   * Get all JTBD configurations with filters
   */
  getConfigs = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { user, environment } = req;
      const isLive = environment === 'live';

      const filters: JTBDFilters = {
        customer_id: req.query.customer_id ? parseInt(req.query.customer_id as string) : undefined,
        jtbd_category: req.query.category as any,
        jtbd_type: req.query.type as any,
        priority: req.query.priority as any,
        is_active: req.query.is_active === 'true' ? true : req.query.is_active === 'false' ? false : undefined,
        from_date: req.query.from_date as string,
        to_date: req.query.to_date as string,
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        page_size: req.query.page_size ? parseInt(req.query.page_size as string) : 20
      };

      // If customer_id provided, get customer-specific JTBDs
      if (filters.customer_id) {
        const jtbds = await this.jtbdService.getCustomerJTBDs(
          user!.tenant_id,
          isLive,
          filters.customer_id
        );
        res.json({
          success: true,
          data: jtbds,
          total: jtbds.length,
          timestamp: new Date().toISOString()
        });
      } else {
        // For now, return empty array if no customer_id
        // TODO: Implement tenant-wide JTBD listing with pagination
        res.json({
          success: true,
          data: [],
          total: 0,
          timestamp: new Date().toISOString()
        });
      }
    } catch (error: any) {
      console.error('Error getting JTBD configs:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get JTBD configurations'
      });
    }
  };

  /**
   * GET /api/jtbd/config/:id
   * Get single JTBD configuration by ID
   */
  getConfig = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { user, environment } = req;
      const isLive = environment === 'live';
      const configId = parseInt(req.params.id);

      if (isNaN(configId)) {
        res.status(400).json({
          success: false,
          error: 'Invalid configuration ID'
        });
        return;
      }

      const jtbd = await this.jtbdService.getJTBD(
        user!.tenant_id,
        isLive,
        configId
      );

      if (!jtbd) {
        res.status(404).json({
          success: false,
          error: 'JTBD configuration not found'
        });
        return;
      }

      res.json({
        success: true,
        data: jtbd,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      console.error('Error getting JTBD config:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get JTBD configuration'
      });
    }
  };

  /**
   * PATCH /api/jtbd/config/:id
   * Update JTBD configuration
   */
  updateConfig = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { user, environment } = req;
      const isLive = environment === 'live';
      const configId = parseInt(req.params.id);
      const data = req.body as UpdateJTBDRequest;

      if (isNaN(configId)) {
        res.status(400).json({
          success: false,
          error: 'Invalid configuration ID'
        });
        return;
      }

      const jtbd = await this.jtbdService.updateJTBD(
        user!.tenant_id,
        isLive,
        configId,
        data
      );

      res.json({
        success: true,
        data: jtbd,
        message: 'JTBD configuration updated successfully',
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      console.error('Error updating JTBD config:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to update JTBD configuration'
      });
    }
  };

  /**
   * DELETE /api/jtbd/config/:id
   * Delete JTBD configuration
   */
  deleteConfig = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { user, environment } = req;
      const isLive = environment === 'live';
      const configId = parseInt(req.params.id);

      if (isNaN(configId)) {
        res.status(400).json({
          success: false,
          error: 'Invalid configuration ID'
        });
        return;
      }

      await this.jtbdService.deleteJTBD(
        user!.tenant_id,
        isLive,
        configId
      );

      res.json({
        success: true,
        message: 'JTBD configuration deleted successfully',
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      console.error('Error deleting JTBD config:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to delete JTBD configuration'
      });
    }
  };

  // ============================================================================
  // EXECUTION ENDPOINTS
  // ============================================================================

  /**
   * POST /api/jtbd/execution
   * Create new execution (meeting, SIP plan instance, etc.)
   */
  createExecution = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { user, environment } = req;
      const isLive = environment === 'live';
      const data = req.body as CreateExecutionRequest;

      // Validation
      if (!data.customer_id) {
        res.status(400).json({
          success: false,
          error: 'customer_id is required'
        });
        return;
      }

      if (!data.execution_type) {
        res.status(400).json({
          success: false,
          error: 'execution_type is required'
        });
        return;
      }

      if (!data.title) {
        res.status(400).json({
          success: false,
          error: 'title is required'
        });
        return;
      }

      if (!data.scheduled_date) {
        res.status(400).json({
          success: false,
          error: 'scheduled_date is required'
        });
        return;
      }

      const execution = await this.executionService.createExecution(
        user!.tenant_id,
        isLive,
        data,
        user!.user_id
      );

      res.status(201).json({
        success: true,
        data: execution,
        message: 'Execution created successfully',
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      console.error('Error creating execution:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to create execution'
      });
    }
  };

  /**
   * GET /api/jtbd/execution
   * Get executions with filters (bot-friendly)
   */
  getExecutions = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { user, environment } = req;
      const isLive = environment === 'live';

      const filters: ExecutionFilters = {
        customer_id: req.query.customer_id ? parseInt(req.query.customer_id as string) : undefined,
        config_id: req.query.config_id ? parseInt(req.query.config_id as string) : undefined,
        execution_type: req.query.type as any,
        execution_status: req.query.status as any,
        priority: req.query.priority as any,
        from_date: req.query.from_date as string,
        to_date: req.query.to_date as string,
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        page_size: req.query.page_size ? parseInt(req.query.page_size as string) : 20
      };

      const result = await this.executionService.getExecutions(
        user!.tenant_id,
        isLive,
        filters
      );

      res.json({
        success: true,
        data: result.executions,
        pagination: result.pagination,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      console.error('Error getting executions:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get executions'
      });
    }
  };

  /**
   * GET /api/jtbd/execution/:id
   * Get single execution by ID
   */
  getExecution = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { user, environment } = req;
      const isLive = environment === 'live';
      const executionId = parseInt(req.params.id);

      if (isNaN(executionId)) {
        res.status(400).json({
          success: false,
          error: 'Invalid execution ID'
        });
        return;
      }

      const execution = await this.executionService.getExecutionById(
        user!.tenant_id,
        isLive,
        executionId
      );

      if (!execution) {
        res.status(404).json({
          success: false,
          error: 'Execution not found'
        });
        return;
      }

      res.json({
        success: true,
        data: execution,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      console.error('Error getting execution:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get execution'
      });
    }
  };

  /**
   * PATCH /api/jtbd/execution/:id
   * Update execution
   */
  updateExecution = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { user, environment } = req;
      const isLive = environment === 'live';
      const executionId = parseInt(req.params.id);
      const data = req.body as UpdateExecutionRequest;

      if (isNaN(executionId)) {
        res.status(400).json({
          success: false,
          error: 'Invalid execution ID'
        });
        return;
      }

      const execution = await this.executionService.updateExecution(
        user!.tenant_id,
        isLive,
        executionId,
        data
      );

      res.json({
        success: true,
        data: execution,
        message: 'Execution updated successfully',
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      console.error('Error updating execution:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to update execution'
      });
    }
  };

  /**
   * POST /api/jtbd/execution/:id/complete
   * Mark execution as completed
   */
  completeExecution = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { user, environment } = req;
      const isLive = environment === 'live';
      const executionId = parseInt(req.params.id);
      const data = req.body as CompleteExecutionRequest;

      if (isNaN(executionId)) {
        res.status(400).json({
          success: false,
          error: 'Invalid execution ID'
        });
        return;
      }

      const execution = await this.executionService.completeExecution(
        user!.tenant_id,
        isLive,
        executionId,
        data,
        user!.user_id
      );

      res.json({
        success: true,
        data: execution,
        message: 'Execution completed successfully',
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      console.error('Error completing execution:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to complete execution'
      });
    }
  };

  /**
   * POST /api/jtbd/execution/:id/cancel
   * Cancel execution
   */
  cancelExecution = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { user, environment } = req;
      const isLive = environment === 'live';
      const executionId = parseInt(req.params.id);
      const data = req.body as CancelExecutionRequest;

      if (isNaN(executionId)) {
        res.status(400).json({
          success: false,
          error: 'Invalid execution ID'
        });
        return;
      }

      if (!data.cancellation_reason) {
        res.status(400).json({
          success: false,
          error: 'cancellation_reason is required'
        });
        return;
      }

      const execution = await this.executionService.cancelExecution(
        user!.tenant_id,
        isLive,
        executionId,
        data
      );

      res.json({
        success: true,
        data: execution,
        message: 'Execution cancelled successfully',
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      console.error('Error cancelling execution:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to cancel execution'
      });
    }
  };

  /**
   * DELETE /api/jtbd/execution/:id
   * Delete execution
   */
  deleteExecution = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { user, environment } = req;
      const isLive = environment === 'live';
      const executionId = parseInt(req.params.id);

      if (isNaN(executionId)) {
        res.status(400).json({
          success: false,
          error: 'Invalid execution ID'
        });
        return;
      }

      await this.executionService.deleteExecution(
        user!.tenant_id,
        isLive,
        executionId
      );

      res.json({
        success: true,
        message: 'Execution deleted successfully',
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      console.error('Error deleting execution:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to delete execution'
      });
    }
  };

  // ============================================================================
  // SUMMARY/DASHBOARD ENDPOINTS
  // ============================================================================

  /**
   * GET /api/jtbd/customer/:customerId/summary
   * Get comprehensive customer JTBD summary (configs + executions)
   */
  getCustomerSummary = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { user, environment } = req;
      const isLive = environment === 'live';
      const customerId = parseInt(req.params.customerId);

      if (isNaN(customerId)) {
        res.status(400).json({
          success: false,
          error: 'Invalid customer ID'
        });
        return;
      }

      // Get both configurations and executions summary
      const [configSummary, executionSummary] = await Promise.all([
        this.jtbdService.getCustomerSummary(user!.tenant_id, isLive, customerId),
        this.executionService.getCustomerJobsSummary(user!.tenant_id, isLive, customerId)
      ]);

      res.json({
        success: true,
        data: {
          configurations: configSummary,
          executions: executionSummary
        },
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      console.error('Error getting customer summary:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get customer summary'
      });
    }
  };

  /**
   * GET /api/jtbd/upcoming
   * Get upcoming executions for dashboard (all customers)
   */
  getUpcoming = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { user, environment } = req;
      const isLive = environment === 'live';
      const daysAhead = req.query.days ? parseInt(req.query.days as string) : 30;
      const executionType = req.query.type as string;

      const executions = await this.executionService.getUpcomingExecutions(
        user!.tenant_id,
        isLive,
        daysAhead,
        executionType
      );

      res.json({
        success: true,
        data: executions,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      console.error('Error getting upcoming executions:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get upcoming executions'
      });
    }
  };
}
