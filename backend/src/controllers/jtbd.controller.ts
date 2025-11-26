// backend/src/controllers/jtbd.controller.ts

import { Request, Response } from 'express';
import { JTBDService } from '../services/jtbd.service';
import { CreateJTBDRequest, UpdateJTBDRequest } from '../types/jtbd.types';

interface AuthenticatedRequest extends Request {
  user?: {
    user_id: number;
    tenant_id: number;
  };
  environment?: 'live' | 'test';
}

export class JTBDController {
  private jtbdService: JTBDService;

  constructor() {
    this.jtbdService = new JTBDService();
  }

  /**
   * POST /api/jtbd
   * Create new JTBD configuration
   */
  createJTBD = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
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

      if (!['portfolio_alert', 'time_based', 'profile_trigger'].includes(data.jtbd_type)) {
        res.status(400).json({
          success: false,
          error: 'Invalid jtbd_type. Must be one of: portfolio_alert, time_based, profile_trigger'
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
        message: 'JTBD configuration created successfully'
      });
    } catch (error: any) {
      console.error('Error creating JTBD:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to create JTBD configuration'
      });
    }
  };

  /**
   * GET /api/jtbd/customer/:customerId
   * Get all JTBDs for a customer
   */
  getCustomerJTBDs = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
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

      const jtbds = await this.jtbdService.getCustomerJTBDs(
        user!.tenant_id,
        isLive,
        customerId
      );

      res.json({
        success: true,
        data: jtbds
      });
    } catch (error: any) {
      console.error('Error getting customer JTBDs:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get customer JTBDs'
      });
    }
  };

  /**
   * GET /api/jtbd/:id
   * Get single JTBD by ID
   */
  getJTBD = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { user, environment } = req;
      const isLive = environment === 'live';
      const jtbdId = parseInt(req.params.id);

      if (isNaN(jtbdId)) {
        res.status(400).json({
          success: false,
          error: 'Invalid JTBD ID'
        });
        return;
      }

      const jtbd = await this.jtbdService.getJTBD(
        user!.tenant_id,
        isLive,
        jtbdId
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
        data: jtbd
      });
    } catch (error: any) {
      console.error('Error getting JTBD:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get JTBD configuration'
      });
    }
  };

  /**
   * PUT /api/jtbd/:id
   * Update JTBD configuration
   */
  updateJTBD = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { user, environment } = req;
      const isLive = environment === 'live';
      const jtbdId = parseInt(req.params.id);
      const data = req.body as UpdateJTBDRequest;

      if (isNaN(jtbdId)) {
        res.status(400).json({
          success: false,
          error: 'Invalid JTBD ID'
        });
        return;
      }

      const jtbd = await this.jtbdService.updateJTBD(
        user!.tenant_id,
        isLive,
        jtbdId,
        data
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
        message: 'JTBD configuration updated successfully'
      });
    } catch (error: any) {
      console.error('Error updating JTBD:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to update JTBD configuration'
      });
    }
  };

  /**
   * DELETE /api/jtbd/:id
   * Delete JTBD configuration
   */
  deleteJTBD = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { user, environment } = req;
      const isLive = environment === 'live';
      const jtbdId = parseInt(req.params.id);

      if (isNaN(jtbdId)) {
        res.status(400).json({
          success: false,
          error: 'Invalid JTBD ID'
        });
        return;
      }

      const success = await this.jtbdService.deleteJTBD(
        user!.tenant_id,
        isLive,
        jtbdId
      );

      if (!success) {
        res.status(404).json({
          success: false,
          error: 'JTBD configuration not found'
        });
        return;
      }

      res.json({
        success: true,
        message: 'JTBD configuration deleted successfully'
      });
    } catch (error: any) {
      console.error('Error deleting JTBD:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to delete JTBD configuration'
      });
    }
  };

  /**
   * PATCH /api/jtbd/:id/toggle
   * Toggle JTBD active/inactive
   */
  toggleJTBD = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { user, environment } = req;
      const isLive = environment === 'live';
      const jtbdId = parseInt(req.params.id);

      if (isNaN(jtbdId)) {
        res.status(400).json({
          success: false,
          error: 'Invalid JTBD ID'
        });
        return;
      }

      const jtbd = await this.jtbdService.toggleJTBD(
        user!.tenant_id,
        isLive,
        jtbdId
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
        message: `JTBD configuration ${jtbd.is_active ? 'activated' : 'deactivated'} successfully`
      });
    } catch (error: any) {
      console.error('Error toggling JTBD:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to toggle JTBD configuration'
      });
    }
  };

  /**
   * GET /api/jtbd/dashboard/overview
   * Get dashboard statistics
   */
  getDashboardOverview = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { user, environment } = req;
      const isLive = environment === 'live';

      const stats = await this.jtbdService.getDashboardStats(
        user!.tenant_id,
        isLive
      );

      res.json({
        success: true,
        data: stats
      });
    } catch (error: any) {
      console.error('Error getting dashboard overview:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get dashboard overview'
      });
    }
  };

  /**
   * GET /api/jtbd/dashboard/customers-without-jtbd
   * Get list of customers without any JTBD setup
   */
  getCustomersWithoutJTBD = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { user, environment } = req;
      const isLive = environment === 'live';

      const query = `
        SELECT 
          c.id,
          cont.name,
          c.has_jtbd_setup,
          c.jtbd_count
        FROM t_customers c
        JOIN t_contacts cont ON c.contact_id = cont.id
        WHERE c.tenant_id = $1 
          AND c.is_live = $2 
          AND c.is_active = true
          AND c.has_jtbd_setup = false
        ORDER BY cont.name
        LIMIT 50
      `;

      const result = await this.jtbdService['db'].query(query, [user!.tenant_id, isLive]);

      res.json({
        success: true,
        data: result.rows
      });
    } catch (error: any) {
      console.error('Error getting customers without JTBD:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get customers without JTBD'
      });
    }
  };

  /**
   * GET /api/jtbd/customer/:customerId/summary
   * Get customer JTBD summary
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

      const summary = await this.jtbdService.getCustomerSummary(
        user!.tenant_id,
        isLive,
        customerId
      );

      res.json({
        success: true,
        data: summary
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
   * GET /api/jtbd/schemes/:customerId
   * Get available schemes for customer (for dropdown)
   */
  getCustomerSchemes = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
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

      const schemes = await this.jtbdService.getCustomerSchemes(
        user!.tenant_id,
        isLive,
        customerId
      );

      res.json({
        success: true,
        data: schemes
      });
    } catch (error: any) {
      console.error('Error getting customer schemes:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get customer schemes'
      });
    }
  };

  /**
   * GET /api/jtbd/transaction-types
   * Get all transaction types (for dropdown)
   */
  getTransactionTypes = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const types = await this.jtbdService.getTransactionTypes();

      res.json({
        success: true,
        data: types
      });
    } catch (error: any) {
      console.error('Error getting transaction types:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get transaction types'
      });
    }
  };

  /**
   * GET /api/jtbd/:id/occurrences
   * Get calculated future occurrences for portfolio alert
   */
  getPortfolioOccurrences = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { user, environment } = req;
      const isLive = environment === 'live';
      const jtbdId = parseInt(req.params.id);

      if (isNaN(jtbdId)) {
        res.status(400).json({
          success: false,
          error: 'Invalid JTBD ID'
        });
        return;
      }

      const occurrences = await this.jtbdService.getPortfolioOccurrences(
        user!.tenant_id,
        isLive,
        jtbdId
      );

      res.json({
        success: true,
        data: occurrences
      });
    } catch (error: any) {
      console.error('Error getting portfolio occurrences:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get portfolio occurrences'
      });
    }
  };

  /**
   * GET /api/jtbd/dashboard/upcoming-alerts
   * Get upcoming alerts with communication status
   * FIXED: Added date range support
   */
  getUpcomingAlerts = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { user, environment } = req;
      const isLive = environment === 'live';

      // Query params
      const daysAhead = parseInt(req.query.days_ahead as string) || 30;
      const priority = req.query.priority as 'critical' | 'high' | 'medium' | 'low' | undefined;
      const jtbdType = req.query.jtbd_type as 'portfolio_alert' | 'time_based' | 'profile_trigger' | undefined;
      const status = req.query.status as 'pending' | 'overdue' | undefined;
      
      // NEW: Date range params
      const startDate = req.query.start_date as string | undefined;
      const endDate = req.query.end_date as string | undefined;

      // Validate date range if provided
      if ((startDate && !endDate) || (!startDate && endDate)) {
        res.status(400).json({
          success: false,
          error: 'Both start_date and end_date must be provided together'
        });
        return;
      }

      if (startDate && endDate) {
        // Basic date validation (YYYY-MM-DD format)
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
          res.status(400).json({
            success: false,
            error: 'Dates must be in YYYY-MM-DD format'
          });
          return;
        }

        // Check if start_date is before end_date
        if (new Date(startDate) > new Date(endDate)) {
          res.status(400).json({
            success: false,
            error: 'start_date must be before or equal to end_date'
          });
          return;
        }
      }

      const { JTBDDashboardService } = await import('../services/jtbd.dashboard.service');
      const dashboardService = new JTBDDashboardService();

      console.log('📊 Dashboard API called with params:', {
        daysAhead,
        priority,
        jtbdType,
        status,
        startDate,
        endDate,
        tenantId: user!.tenant_id,
        isLive
      });

      const alerts = await dashboardService.getUpcomingAlerts(
        user!.tenant_id,
        isLive,
        daysAhead,
        priority,
        jtbdType,
        status,
        startDate,  // NEW
        endDate     // NEW
      );

      console.log('✅ Dashboard API returning alerts:', alerts.length);

      res.json({
        success: true,
        data: alerts,
        meta: {
          count: alerts.length,
          filters_applied: {
            date_range: startDate && endDate ? `${startDate} to ${endDate}` : `${daysAhead} days ahead`,
            priority: priority || 'all',
            jtbd_type: jtbdType || 'all',
            status: status || 'all'
          }
        }
      });
    } catch (error: any) {
      console.error('❌ Error getting upcoming alerts:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get upcoming alerts'
      });
    }
  };

  /**
   * GET /api/jtbd/dashboard/alerts-by-date
   * Get alerts grouped by date
   * FIXED: Date validation and type casting
   */
  getAlertsByDate = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { user, environment } = req;
      const isLive = environment === 'live';

      // Query params
      const startDate = req.query.start_date as string;
      const endDate = req.query.end_date as string;

      if (!startDate || !endDate) {
        res.status(400).json({
          success: false,
          error: 'start_date and end_date are required'
        });
        return;
      }

      // Validate date format
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
        res.status(400).json({
          success: false,
          error: 'Dates must be in YYYY-MM-DD format'
        });
        return;
      }

      const { JTBDDashboardService } = await import('../services/jtbd.dashboard.service');
      const dashboardService = new JTBDDashboardService();

      const alertsByDate = await dashboardService.getAlertsByDate(
        user!.tenant_id,
        isLive,
        startDate,
        endDate
      );

      res.json({
        success: true,
        data: alertsByDate
      });
    } catch (error: any) {
      console.error('Error getting alerts by date:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get alerts by date'
      });
    }
  };

  /**
   * GET /api/jtbd/dashboard/communication-queue
   * Get communication queue
   */
  getCommunicationQueue = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { user, environment } = req;
      const isLive = environment === 'live';

      // Query params
      const status = req.query.status as 'pending' | 'scheduled' | 'sent' | 'failed' | undefined;
      const limit = parseInt(req.query.limit as string) || 50;

      if (limit < 1 || limit > 500) {
        res.status(400).json({
          success: false,
          error: 'Limit must be between 1 and 500'
        });
        return;
      }

      const { JTBDDashboardService } = await import('../services/jtbd.dashboard.service');
      const dashboardService = new JTBDDashboardService();

      const queue = await dashboardService.getCommunicationQueue(
        user!.tenant_id,
        isLive,
        status,
        limit
      );

      res.json({
        success: true,
        data: queue
      });
    } catch (error: any) {
      console.error('Error getting communication queue:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get communication queue'
      });
    }
  };

  /**
   * GET /api/jtbd/dashboard/latest-alerts
   * Get latest alerts for header dropdown (most recent 10)
   */
  getLatestAlerts = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { user, environment } = req;
      const isLive = environment === 'live';
      const limit = Math.min(parseInt(req.query.limit as string) || 10, 20);

      const { JTBDDashboardService } = await import('../services/jtbd.dashboard.service');
      const dashboardService = new JTBDDashboardService();

      const alerts = await dashboardService.getLatestAlerts(
        user!.tenant_id,
        isLive,
        limit
      );

      res.json({
        success: true,
        data: alerts,
        meta: {
          count: alerts.length,
          limit
        }
      });
    } catch (error: any) {
      console.error('Error getting latest alerts:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get latest alerts'
      });
    }
  };
}