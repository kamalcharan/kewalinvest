// backend/src/controllers/portfolio.controller.ts

import { Request, Response } from 'express';
import { PortfolioService } from '../services/portfolio.service';
import { PortfolioFilters } from '../types/portfolio.types';
import { MonthlyTrackingService } from '../services/monthlyTracking.service';
import { MonthlyTrackingFilters } from '../types/monthlyTracking.types';

interface AuthRequest extends Request {
  user?: {
    user_id: number;
    username: string;
    email: string;
    tenant_id: number;
  };
}

export class PortfolioController {
  private portfolioService: PortfolioService;
  private monthlyTrackingService: MonthlyTrackingService;

  constructor() {
    this.portfolioService = new PortfolioService();
    this.monthlyTrackingService = new MonthlyTrackingService();
  }

  /**
   * GET /api/portfolio/:customerId
   * Get customer's complete portfolio
   */
  getCustomerPortfolio = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const { customerId } = req.params;
      const isLive = req.headers['x-environment'] === 'live';

      if (!customerId || isNaN(parseInt(customerId))) {
        res.status(400).json({
          success: false,
          error: 'Invalid customer ID'
        });
        return;
      }

      const portfolio = await this.portfolioService.getCustomerPortfolio(
        user.tenant_id,
        isLive,
        parseInt(customerId)
      );

      if (!portfolio) {
        res.status(404).json({
          success: false,
          error: 'Customer not found or has no portfolio'
        });
        return;
      }

      res.json({
        success: true,
        data: portfolio
      });
    } catch (error: any) {
      console.error('Error getting customer portfolio:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get customer portfolio'
      });
    }
  };

  /**
   * GET /api/portfolio/:customerId/totals
   * Get portfolio totals only (faster query)
   */
  getPortfolioTotals = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const { customerId } = req.params;
      const isLive = req.headers['x-environment'] === 'live';

      if (!customerId || isNaN(parseInt(customerId))) {
        res.status(400).json({
          success: false,
          error: 'Invalid customer ID'
        });
        return;
      }

      const totals = await this.portfolioService.getPortfolioTotals(
        user.tenant_id,
        isLive,
        parseInt(customerId)
      );

      if (!totals) {
        res.status(404).json({
          success: false,
          error: 'Customer not found or has no portfolio'
        });
        return;
      }

      res.json({
        success: true,
        data: totals
      });
    } catch (error: any) {
      console.error('Error getting portfolio totals:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get portfolio totals'
      });
    }
  };

  /**
   * GET /api/portfolio/:customerId/scheme/:schemeCode
   * Get scheme portfolio details with transactions
   */
  getSchemePortfolioDetails = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const { customerId, schemeCode } = req.params;
      const isLive = req.headers['x-environment'] === 'live';

      if (!customerId || isNaN(parseInt(customerId))) {
        res.status(400).json({
          success: false,
          error: 'Invalid customer ID'
        });
        return;
      }

      if (!schemeCode) {
        res.status(400).json({
          success: false,
          error: 'Scheme code is required'
        });
        return;
      }

      const details = await this.portfolioService.getSchemePortfolioDetails(
        user.tenant_id,
        isLive,
        parseInt(customerId),
        schemeCode
      );

      if (!details) {
        res.status(404).json({
          success: false,
          error: 'Portfolio holding not found for this customer and scheme'
        });
        return;
      }

      res.json({
        success: true,
        data: details
      });
    } catch (error: any) {
      console.error('Error getting scheme portfolio details:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get scheme portfolio details'
      });
    }
  };

  /**
   * GET /api/portfolio/holdings
   * Get portfolio holdings with filters
   */
  getPortfolioHoldings = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const isLive = req.headers['x-environment'] === 'live';

      const filters: PortfolioFilters = {
        customer_id: req.query.customer_id ? parseInt(req.query.customer_id as string) : undefined,
        scheme_code: req.query.scheme_code as string,
        category: req.query.category as string,
        sub_category: req.query.sub_category as string,
        min_value: req.query.min_value ? parseFloat(req.query.min_value as string) : undefined,
        max_value: req.query.max_value ? parseFloat(req.query.max_value as string) : undefined,
        sort_by: req.query.sort_by as string || 'current_value',
        sort_order: (req.query.sort_order as 'asc' | 'desc') || 'desc'
      };

      const holdings = await this.portfolioService.getPortfolioHoldings(
        user.tenant_id,
        isLive,
        filters
      );

      res.json({
        success: true,
        data: holdings
      });
    } catch (error: any) {
      console.error('Error getting portfolio holdings:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get portfolio holdings'
      });
    }
  };

  /**
   * GET /api/portfolio/statistics
   * Get portfolio statistics across all customers
   */
  getPortfolioStatistics = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const isLive = req.headers['x-environment'] === 'live';

      const statistics = await this.portfolioService.getPortfolioStatistics(
        user.tenant_id,
        isLive
      );

      res.json({
        success: true,
        data: statistics
      });
    } catch (error: any) {
      console.error('Error getting portfolio statistics:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get portfolio statistics'
      });
    }
  };

  /**
   * POST /api/portfolio/refresh
   * Manually refresh portfolio totals materialized view
   */
  refreshPortfolioTotals = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      // Optional filters for refresh
      const request = {
        customer_id: req.body.customer_id ? parseInt(req.body.customer_id) : undefined,
        scheme_code: req.body.scheme_code as string,
        force: req.body.force === true
      };

      const result = await this.portfolioService.refreshPortfolioTotals(request);

      res.json({
        success: true,
        data: result,
        message: 'Portfolio totals refreshed successfully'
      });
    } catch (error: any) {
      console.error('Error refreshing portfolio totals:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to refresh portfolio totals'
      });
    }
  };

  // ==================== MONTHLY TRACKING ====================

  /**
   * GET /api/portfolio/:customerId/monthly-units
   * Get monthly units tracking for a customer/scheme
   */
  getMonthlyUnits = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const { customerId } = req.params;
      const isLive = req.headers['x-environment'] === 'live';

      if (!customerId || isNaN(parseInt(customerId))) {
        res.status(400).json({
          success: false,
          error: 'Invalid customer ID'
        });
        return;
      }

      const schemeCode = req.query.scheme_code as string;
      if (!schemeCode) {
        res.status(400).json({
          success: false,
          error: 'scheme_code query parameter is required'
        });
        return;
      }

      const filters: MonthlyTrackingFilters = {
        customer_id: parseInt(customerId),
        scheme_code: schemeCode,
        months: req.query.months ? parseInt(req.query.months as string) : 12
      };

      const data = await this.monthlyTrackingService.getMonthlyUnits(
        user.tenant_id,
        isLive,
        filters
      );

      res.json({
        success: true,
        data
      });
    } catch (error: any) {
      console.error('Error getting monthly units:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get monthly units'
      });
    }
  };

  /**
   * GET /api/portfolio/:customerId/monthly-nav
   * Get monthly NAV performance for a customer/scheme
   */
  getMonthlyNAV = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const { customerId } = req.params;
      const isLive = req.headers['x-environment'] === 'live';

      if (!customerId || isNaN(parseInt(customerId))) {
        res.status(400).json({
          success: false,
          error: 'Invalid customer ID'
        });
        return;
      }

      const schemeCode = req.query.scheme_code as string;
      if (!schemeCode) {
        res.status(400).json({
          success: false,
          error: 'scheme_code query parameter is required'
        });
        return;
      }

      const filters: MonthlyTrackingFilters = {
        customer_id: parseInt(customerId),
        scheme_code: schemeCode,
        months: req.query.months ? parseInt(req.query.months as string) : 12
      };

      const data = await this.monthlyTrackingService.getMonthlyNAVPerformance(
        user.tenant_id,
        isLive,
        filters
      );

      res.json({
        success: true,
        data
      });
    } catch (error: any) {
      console.error('Error getting monthly NAV:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get monthly NAV'
      });
    }
  };

  /**
   * GET /api/portfolio/:customerId/monthly-market-value
   * Get monthly market value for a customer/scheme
   */
  getMonthlyMarketValue = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const { customerId } = req.params;
      const isLive = req.headers['x-environment'] === 'live';

      if (!customerId || isNaN(parseInt(customerId))) {
        res.status(400).json({
          success: false,
          error: 'Invalid customer ID'
        });
        return;
      }

      const schemeCode = req.query.scheme_code as string;
      if (!schemeCode) {
        res.status(400).json({
          success: false,
          error: 'scheme_code query parameter is required'
        });
        return;
      }

      const filters: MonthlyTrackingFilters = {
        customer_id: parseInt(customerId),
        scheme_code: schemeCode,
        months: req.query.months ? parseInt(req.query.months as string) : 12
      };

      const data = await this.monthlyTrackingService.getMonthlyMarketValue(
        user.tenant_id,
        isLive,
        filters
      );

      res.json({
        success: true,
        data
      });
    } catch (error: any) {
      console.error('Error getting monthly market value:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get monthly market value'
      });
    }
  };

  /**
   * GET /api/portfolio/:customerId/monthly-snapshots
   * Get monthly snapshots for ALL schemes in customer's portfolio
   * Returns all schemes with their monthly data (units, NAV, market value) in one call
   */
  getAllSchemesMonthlySnapshots = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const { customerId } = req.params;
      const isLive = req.headers['x-environment'] === 'live';

      if (!customerId || isNaN(parseInt(customerId))) {
        res.status(400).json({
          success: false,
          error: 'Invalid customer ID'
        });
        return;
      }

      const months = req.query.months ? parseInt(req.query.months as string) : 12;

      const data = await this.monthlyTrackingService.getAllSchemesMonthlySnapshots(
        user.tenant_id,
        isLive,
        parseInt(customerId),
        months
      );

      res.json({
        success: true,
        data
      });
    } catch (error: any) {
      console.error('Error getting all schemes monthly snapshots:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get monthly snapshots'
      });
    }
  };
}