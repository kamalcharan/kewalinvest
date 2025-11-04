// backend/src/controllers/cruiseControl.controller.ts
// Cruise Control Controller - API endpoints for monitoring dashboard

import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import CruiseControlService from '../services/cruiseControl.service';
import { SimpleLogger } from '../services/simpleLogger.service';

export class CruiseControlController {
  private service: CruiseControlService;

  constructor() {
    this.service = new CruiseControlService();
  }

  /**
   * GET /api/cruise-control/dashboard
   * Get overall dashboard statistics
   */
  async getDashboardStats(req: AuthenticatedRequest, res: Response): Promise<Response> {
    try {
      const { tenant_id, is_live } = req.environment;

      const stats = await this.service.getDashboardStatistics(tenant_id, is_live);

      return res.json({
        success: true,
        data: stats
      });
    } catch (error: any) {
      console.error('Error getting dashboard stats:', error);
      SimpleLogger.error(
        'CruiseControl',
        'Failed to get dashboard stats',
        'getDashboardStats',
        { error: error.message },
        req.user?.id,
        req.environment.tenant_id,
        error.stack
      );

      return res.status(500).json({
        success: false,
        error: 'Failed to get dashboard statistics'
      });
    }
  }

  /**
   * GET /api/cruise-control/nav/statistics
   * Get NAV monitoring statistics
   */
  async getNavStats(req: AuthenticatedRequest, res: Response): Promise<Response> {
    try {
      const { tenant_id, is_live } = req.environment;
      const userId = req.user!.id;

      const stats = await this.service.getNavStatistics(tenant_id, is_live, userId);

      return res.json({
        success: true,
        data: stats
      });
    } catch (error: any) {
      console.error('Error getting NAV stats:', error);
      SimpleLogger.error(
        'CruiseControl',
        'Failed to get NAV stats',
        'getNavStats',
        { error: error.message },
        req.user?.id,
        req.environment.tenant_id,
        error.stack
      );

      return res.status(500).json({
        success: false,
        error: 'Failed to get NAV statistics'
      });
    }
  }

  /**
   * GET /api/cruise-control/market/statistics
   * Get market monitoring statistics
   */
  async getMarketStats(req: AuthenticatedRequest, res: Response): Promise<Response> {
    try {
      const stats = await this.service.getMarketStatistics();

      return res.json({
        success: true,
        data: stats
      });
    } catch (error: any) {
      console.error('Error getting market stats:', error);
      SimpleLogger.error(
        'CruiseControl',
        'Failed to get market stats',
        'getMarketStats',
        { error: error.message },
        req.user?.id,
        req.environment.tenant_id,
        error.stack
      );

      return res.status(500).json({
        success: false,
        error: 'Failed to get market statistics'
      });
    }
  }

  /**
   * POST /api/cruise-control/nav/download/:schemeCode
   * Trigger manual NAV download for specific scheme
   */
  async triggerNavDownload(req: AuthenticatedRequest, res: Response): Promise<Response> {
    try {
      const { tenant_id, is_live } = req.environment;
      const userId = req.user!.id;
      const { schemeCode } = req.params;

      if (!schemeCode) {
        return res.status(400).json({
          success: false,
          error: 'Scheme code is required'
        });
      }

      const result = await this.service.triggerNavDownload(
        tenant_id,
        is_live,
        userId,
        schemeCode
      );

      return res.json(result);
    } catch (error: any) {
      console.error('Error triggering NAV download:', error);
      SimpleLogger.error(
        'CruiseControl',
        'Failed to trigger NAV download',
        'triggerNavDownload',
        { schemeCode: req.params.schemeCode, error: error.message },
        req.user?.id,
        req.environment.tenant_id,
        error.stack
      );

      return res.status(500).json({
        success: false,
        error: 'Failed to trigger NAV download'
      });
    }
  }

  /**
   * POST /api/cruise-control/market/download/:indexId
   * Trigger manual market data download for specific index
   */
  async triggerMarketDownload(req: AuthenticatedRequest, res: Response): Promise<Response> {
    try {
      const { indexId } = req.params;
      const indexIdNum = parseInt(indexId);

      if (!indexIdNum || isNaN(indexIdNum)) {
        return res.status(400).json({
          success: false,
          error: 'Valid index ID is required'
        });
      }

      const result = await this.service.triggerMarketDownload(indexIdNum);

      return res.json(result);
    } catch (error: any) {
      console.error('Error triggering market download:', error);
      SimpleLogger.error(
        'CruiseControl',
        'Failed to trigger market download',
        'triggerMarketDownload',
        { indexId: req.params.indexId, error: error.message },
        req.user?.id,
        req.environment.tenant_id,
        error.stack
      );

      return res.status(500).json({
        success: false,
        error: 'Failed to trigger market download'
      });
    }
  }
}

export default CruiseControlController;
