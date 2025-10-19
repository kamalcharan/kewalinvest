// backend/src/controllers/bookmarkGap.controller.ts
// Controller for bookmark gap detection (schemes in portfolios not tracked)

import { Request, Response } from 'express';
import { BookmarkGapService } from '../services/bookmarkGap.service';
import { SimpleLogger } from '../services/simpleLogger.service';

interface AuthenticatedRequest extends Request {
  user?: {
    user_id: number;
    tenant_id: number;
  };
  environment?: 'live' | 'test';
}

export class BookmarkGapController {
  private gapService: BookmarkGapService;

  constructor() {
    this.gapService = new BookmarkGapService();
  }

  /**
   * Get all unbookmarked schemes from customer portfolios (tenant-wide)
   * GET /api/nav/bookmark-gaps
   */
  getUnbookmarkedSchemes = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { user, environment } = req;
      const isLive = environment === 'live';

      if (!user?.tenant_id) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized'
        });
        return;
      }

      const result = await this.gapService.getUnbookmarkedSchemes(
        user.tenant_id,
        isLive
      );

      res.json({
        success: true,
        data: result
      });
    } catch (error: any) {
      SimpleLogger.error('BookmarkGapController', 'Failed to get unbookmarked schemes', 'getUnbookmarkedSchemes', {
        tenantId: req.user?.tenant_id,
        error: error.message
      }, req.user?.user_id, req.user?.tenant_id, error.stack);

      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get unbookmarked schemes'
      });
    }
  };

  /**
   * Get unbookmarked schemes for a specific customer
   * GET /api/nav/bookmark-gaps/customer/:customerId
   */
  getCustomerUnbookmarkedSchemes = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { user, environment } = req;
      const isLive = environment === 'live';
      const customerId = parseInt(req.params.customerId);

      if (!user?.tenant_id) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized'
        });
        return;
      }

      if (isNaN(customerId)) {
        res.status(400).json({
          success: false,
          error: 'Invalid customer ID'
        });
        return;
      }

      const result = await this.gapService.getCustomerUnbookmarkedSchemes(
        user.tenant_id,
        isLive,
        customerId
      );

      res.json({
        success: true,
        data: {
          customer_id: customerId,
          unbookmarked_schemes: result,
          total_unbookmarked: result.length,
          critical_count: result.filter(s => !s.exists_in_master).length,
          warning_count: result.filter(s => s.exists_in_master).length
        }
      });
    } catch (error: any) {
      SimpleLogger.error('BookmarkGapController', 'Failed to get customer unbookmarked schemes', 'getCustomerUnbookmarkedSchemes', {
        tenantId: req.user?.tenant_id,
        customerId: req.params.customerId,
        error: error.message
      }, req.user?.user_id, req.user?.tenant_id, error.stack);

      if (error.message === 'Customer not found') {
        res.status(404).json({
          success: false,
          error: 'Customer not found'
        });
      } else {
        res.status(500).json({
          success: false,
          error: error.message || 'Failed to get customer unbookmarked schemes'
        });
      }
    }
  };

  /**
   * Get gap summary statistics only (lightweight)
   * GET /api/nav/bookmark-gaps/summary
   */
  getGapSummary = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { user, environment } = req;
      const isLive = environment === 'live';

      if (!user?.tenant_id) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized'
        });
        return;
      }

      const summary = await this.gapService.getGapSummary(
        user.tenant_id,
        isLive
      );

      res.json({
        success: true,
        data: summary
      });
    } catch (error: any) {
      SimpleLogger.error('BookmarkGapController', 'Failed to get gap summary', 'getGapSummary', {
        tenantId: req.user?.tenant_id,
        error: error.message
      }, req.user?.user_id, req.user?.tenant_id, error.stack);

      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get gap summary'
      });
    }
  };
}