// backend/src/controllers/dashboard.controller.ts
// Dashboard controller for main IFA/RIA dashboard

import { Request, Response } from 'express';
import { DashboardService } from '../services/dashboard.service';

interface AuthenticatedRequest extends Request {
  user?: {
    user_id: number;
    tenant_id: number;
  };
  environment?: 'live' | 'test';
}

export class DashboardController {
  private dashboardService: DashboardService;

  constructor() {
    this.dashboardService = new DashboardService();
  }

  /**
   * Get dashboard summary stats
   */
  getSummary = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { user, environment } = req;
      const isLive = environment === 'live';

      const summary = await this.dashboardService.getSummary(user!.tenant_id, isLive);

      res.json({
        success: true,
        data: summary
      });
    } catch (error: any) {
      console.error('Error getting dashboard summary:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get dashboard summary'
      });
    }
  };

  /**
   * Get download status for today
   */
  getDownloadStatus = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { user, environment } = req;
      const isLive = environment === 'live';

      const status = await this.dashboardService.getDownloadStatus(user!.tenant_id, isLive);

      res.json({
        success: true,
        data: status
      });
    } catch (error: any) {
      console.error('Error getting download status:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get download status'
      });
    }
  };

  /**
   * Get goals summary
   */
  getGoalsSummary = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { user, environment } = req;
      const isLive = environment === 'live';

      const summary = await this.dashboardService.getGoalsSummary(user!.tenant_id, isLive);

      res.json({
        success: true,
        data: summary
      });
    } catch (error: any) {
      console.error('Error getting goals summary:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get goals summary'
      });
    }
  };

  /**
   * Get pending actions (JTBD alerts)
   */
  getPendingActions = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { user, environment } = req;
      const isLive = environment === 'live';
      const limit = parseInt(req.query.limit as string) || 10;

      const actions = await this.dashboardService.getPendingActions(user!.tenant_id, isLive, limit);

      res.json({
        success: true,
        data: actions
      });
    } catch (error: any) {
      console.error('Error getting pending actions:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get pending actions'
      });
    }
  };

  /**
   * Get recent transactions
   */
  getRecentTransactions = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { user, environment } = req;
      const isLive = environment === 'live';
      const limit = parseInt(req.query.limit as string) || 5;

      const transactions = await this.dashboardService.getRecentTransactions(user!.tenant_id, isLive, limit);

      res.json({
        success: true,
        data: transactions
      });
    } catch (error: any) {
      console.error('Error getting recent transactions:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get recent transactions'
      });
    }
  };

  /**
   * Get complete dashboard data in one call
   */
  getDashboard = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { user, environment } = req;
      const isLive = environment === 'live';

      console.log('[DashboardController] getDashboard called for tenant:', user!.tenant_id, 'isLive:', isLive);

      // Fetch all data in parallel
      const [summary, downloadStatus, goalsSummary, pendingActions, recentTransactions, plannedWithdrawals] = await Promise.all([
        this.dashboardService.getSummary(user!.tenant_id, isLive),
        this.dashboardService.getDownloadStatus(user!.tenant_id, isLive),
        this.dashboardService.getGoalsSummary(user!.tenant_id, isLive),
        this.dashboardService.getPendingActions(user!.tenant_id, isLive, 10),
        this.dashboardService.getRecentTransactions(user!.tenant_id, isLive, 10),
        this.dashboardService.getPlannedWithdrawals(user!.tenant_id, isLive)
      ]);

      console.log('[DashboardController] recentTransactions count:', recentTransactions.length);
      console.log('[DashboardController] plannedWithdrawals:', plannedWithdrawals);

      res.json({
        success: true,
        data: {
          summary,
          downloadStatus,
          goalsSummary,
          pendingActions,
          recentTransactions,
          plannedWithdrawals
        }
      });
    } catch (error: any) {
      console.error('Error getting dashboard data:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get dashboard data'
      });
    }
  };
}

export const dashboardController = new DashboardController();
