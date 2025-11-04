// backend/src/controllers/dashboard.controller.ts

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
   * GET /api/dashboard/statistics
   * Get overall dashboard statistics
   */
  async getStatistics(req: AuthenticatedRequest, res: Response) {
    try {
      const { user, environment } = req;
      const isLive = environment === 'live';
      const tenantId = user!.tenant_id;

      const statistics = await this.dashboardService.getDashboardStatistics(tenantId, isLive);

      return res.json({
        success: true,
        data: statistics
      });
    } catch (error: any) {
      console.error('Error getting dashboard statistics:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch dashboard statistics'
      });
    }
  }

  /**
   * GET /api/dashboard/goal-deviations
   * Get top goal deviations (goals behind/at risk)
   */
  async getGoalDeviations(req: AuthenticatedRequest, res: Response) {
    try {
      const { user, environment } = req;
      const isLive = environment === 'live';
      const tenantId = user!.tenant_id;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;

      const deviations = await this.dashboardService.getGoalDeviations(tenantId, isLive, limit);

      return res.json({
        success: true,
        data: deviations
      });
    } catch (error: any) {
      console.error('Error getting goal deviations:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch goal deviations'
      });
    }
  }

  /**
   * GET /api/dashboard/upcoming-meetings
   * Get upcoming meetings (next 30 days)
   */
  async getUpcomingMeetings(req: AuthenticatedRequest, res: Response) {
    try {
      const { user, environment } = req;
      const isLive = environment === 'live';
      const tenantId = user!.tenant_id;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;

      const meetings = await this.dashboardService.getUpcomingMeetings(tenantId, isLive, limit);

      return res.json({
        success: true,
        data: meetings
      });
    } catch (error: any) {
      console.error('Error getting upcoming meetings:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch upcoming meetings'
      });
    }
  }

  /**
   * GET /api/dashboard/bookmarked-goals
   * Get all bookmarked goals with filters
   */
  async getBookmarkedGoals(req: AuthenticatedRequest, res: Response) {
    try {
      const { user, environment } = req;
      const isLive = environment === 'live';
      const tenantId = user!.tenant_id;

      const filters = {
        status: req.query.status as string,
        tracking_status: req.query.tracking_status as string,
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        page_size: req.query.page_size ? parseInt(req.query.page_size as string) : 20
      };

      const result = await this.dashboardService.getBookmarkedGoals(tenantId, isLive, filters);

      return res.json({
        success: true,
        data: result.goals,
        pagination: result.pagination
      });
    } catch (error: any) {
      console.error('Error getting bookmarked goals:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch bookmarked goals'
      });
    }
  }

  /**
   * GET /api/dashboard/alerts
   * Get dashboard alerts
   */
  async getAlerts(req: AuthenticatedRequest, res: Response) {
    try {
      const { user, environment } = req;
      const isLive = environment === 'live';
      const tenantId = user!.tenant_id;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 5;

      const alerts = await this.dashboardService.getDashboardAlerts(tenantId, isLive, limit);

      return res.json({
        success: true,
        data: alerts
      });
    } catch (error: any) {
      console.error('Error getting dashboard alerts:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch dashboard alerts'
      });
    }
  }
}
