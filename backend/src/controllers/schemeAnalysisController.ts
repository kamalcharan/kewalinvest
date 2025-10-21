// backend/src/controllers/schemeAnalysisController.ts
// API Controller for scheme metrics calculation and retrieval
// Provides endpoints for frontend integration and admin operations

import { Request, Response } from 'express';
import { schemeMetricsCalculator } from '../services/schemeMetricsCalculator.service';
import { SimpleLogger } from '../services/simpleLogger.service';

interface AuthenticatedRequest extends Request {
  user?: {
    user_id: number;
    tenant_id: number;
    tenant?: {
      id: number;
      tenant_code: string;
      tenant_name: string;
      is_admin: boolean;
      subscription_plan: string;
      settings: any;
    };
  };
  environment?: 'live' | 'test';
}

export class SchemeAnalysisController {
  
  /**
   * POST /api/scheme-analysis/calculate-metrics/:schemeId
   * Calculate metrics for a single scheme
   * 
   * Body (optional):
   * {
   *   "as_of_date": "2025-01-15",  // Optional: specific date, defaults to latest
   *   "recalculate": false          // Optional: force recalculation if metrics exist
   * }
   * 
   * Response:
   * {
   *   "success": true,
   *   "scheme_id": 123,
   *   "date": "2025-01-15",
   *   "metrics": { ... },
   *   "calculation_time_ms": 1234,
   *   "message": "Metrics calculated successfully"
   * }
   */
  calculateMetrics = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const startTime = Date.now();
    const schemeId = parseInt(req.params.schemeId);

    try {
      // Validate scheme ID
      if (isNaN(schemeId) || schemeId <= 0) {
        res.status(400).json({
          success: false,
          error: 'Invalid scheme ID'
        });
        return;
      }

      const { as_of_date, recalculate } = req.body;
      const isLive = req.environment === 'live';
      
      let asOfDate: Date | undefined;
      if (as_of_date) {
        asOfDate = new Date(as_of_date);
        if (isNaN(asOfDate.getTime())) {
          res.status(400).json({
            success: false,
            error: 'Invalid date format. Use YYYY-MM-DD'
          });
          return;
        }
      }

      SimpleLogger.info(
        'SchemeAnalysisController',
        'Calculate metrics requested',
        'calculateMetrics',
        {
          schemeId,
          asOfDate: asOfDate?.toISOString().split('T')[0] || 'latest',
          recalculate: recalculate || false,
          userId: req.user?.user_id,
          tenantId: req.user?.tenant_id
        },
        req.user?.user_id,
        req.user?.tenant_id
      );

      // Calculate metrics
      const result = await schemeMetricsCalculator.calculateForScheme(
        schemeId,
        asOfDate,
        isLive
      );

      const calculationTime = Date.now() - startTime;

      if (result.success) {
        res.json({
          success: true,
          scheme_id: result.schemeId,
          date: result.date,
          metrics: result.metrics,
          calculation_time_ms: calculationTime,
          message: result.error || 'Metrics calculated successfully'
        });
      } else {
        res.status(500).json({
          success: false,
          scheme_id: result.schemeId,
          date: result.date,
          error: result.error || 'Failed to calculate metrics',
          calculation_time_ms: calculationTime
        });
      }

    } catch (error: any) {
      const calculationTime = Date.now() - startTime;

      SimpleLogger.error(
        'SchemeAnalysisController',
        'Failed to calculate metrics',
        'calculateMetrics',
        {
          schemeId,
          error: error.message,
          userId: req.user?.user_id,
          tenantId: req.user?.tenant_id
        },
        req.user?.user_id,
        req.user?.tenant_id,
        error.stack
      );

      res.status(500).json({
        success: false,
        error: error.message || 'Failed to calculate metrics',
        calculation_time_ms: calculationTime
      });
    }
  };

  /**
   * GET /api/scheme-analysis/metrics/:schemeId
   * Get latest calculated metrics for a scheme
   * 
   * Query params:
   * - date (optional): Get metrics for specific date, defaults to latest
   * 
   * Response:
   * {
   *   "success": true,
   *   "scheme_id": 123,
   *   "scheme_code": "INF123456789",
   *   "scheme_name": "HDFC Equity Fund",
   *   "date": "2025-01-15",
   *   "nav_value": 456.78,
   *   "metrics": {
   *     "daily_return": 0.25,
   *     "return_1m": 3.45,
   *     "return_1y": 15.67,
   *     ...
   *   },
   *   "metrics_calculated_at": "2025-01-15T22:30:00Z"
   * }
   */
  getLatestMetrics = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const startTime = Date.now();
    const schemeId = parseInt(req.params.schemeId);

    try {
      // Validate scheme ID
      if (isNaN(schemeId) || schemeId <= 0) {
        res.status(400).json({
          success: false,
          error: 'Invalid scheme ID'
        });
        return;
      }

      const { date } = req.query;
      const isLive = req.environment === 'live';

      let specificDate: Date | undefined;
      if (date && typeof date === 'string') {
        specificDate = new Date(date);
        if (isNaN(specificDate.getTime())) {
          res.status(400).json({
            success: false,
            error: 'Invalid date format. Use YYYY-MM-DD'
          });
          return;
        }
      }

      // Build query
      let query = `
        SELECT 
          nd.scheme_id,
          nd.scheme_code,
          nd.nav_date as date,
          nd.nav_value,
          nd.daily_return,
          nd.return_1w,
          nd.return_1m,
          nd.return_3m,
          nd.return_6m,
          nd.return_1y,
          nd.return_ytd,
          nd.return_all,
          nd.sd_7d,
          nd.sd_14d,
          nd.sd_21d,
          nd.sd_42d,
          nd.sd_3m,
          nd.sd_6m,
          nd.count_3m,
          nd.count_42d,
          nd.sharpe_ratio,
          nd.max_drawdown,
          nd.total_risk,
          nd.cagr,
          nd.metrics_calculated_at,
          sd.scheme_name,
          sd.amc_name
        FROM t_nav_data nd
        JOIN t_scheme_details sd ON nd.scheme_id = sd.id
        WHERE nd.scheme_id = $1 
          AND nd.is_live = $2
          AND nd.metrics_calculated_at IS NOT NULL
      `;

      const params: any[] = [schemeId, isLive];

      if (specificDate) {
        query += ` AND nd.nav_date = $3`;
        params.push(specificDate);
      } else {
        query += ` ORDER BY nd.nav_date DESC LIMIT 1`;
      }

      const { pool } = require('../config/database');
      const result = await pool.query(query, params);

      if (result.rows.length === 0) {
        res.status(404).json({
          success: false,
          error: specificDate 
            ? `No calculated metrics found for scheme ${schemeId} on ${specificDate.toISOString().split('T')[0]}`
            : `No calculated metrics found for scheme ${schemeId}. Please run calculations first.`
        });
        return;
      }

      const data = result.rows[0];
      const executionTime = Date.now() - startTime;

      res.json({
        success: true,
        scheme_id: data.scheme_id,
        scheme_code: data.scheme_code,
        scheme_name: data.scheme_name,
        amc_name: data.amc_name,
        date: data.date,
        nav_value: data.nav_value,
        metrics: {
          daily_return: data.daily_return,
          return_1w: data.return_1w,
          return_1m: data.return_1m,
          return_3m: data.return_3m,
          return_6m: data.return_6m,
          return_1y: data.return_1y,
          return_ytd: data.return_ytd,
          return_all: data.return_all,
          sd_7d: data.sd_7d,
          sd_14d: data.sd_14d,
          sd_21d: data.sd_21d,
          sd_42d: data.sd_42d,
          sd_3m: data.sd_3m,
          sd_6m: data.sd_6m,
          count_3m: data.count_3m,
          count_42d: data.count_42d,
          sharpe_ratio: data.sharpe_ratio,
          max_drawdown: data.max_drawdown,
          total_risk: data.total_risk,
          cagr: data.cagr
        },
        metrics_calculated_at: data.metrics_calculated_at,
        execution_time_ms: executionTime
      });

    } catch (error: any) {
      const executionTime = Date.now() - startTime;

      SimpleLogger.error(
        'SchemeAnalysisController',
        'Failed to get metrics',
        'getLatestMetrics',
        {
          schemeId,
          error: error.message,
          userId: req.user?.user_id,
          tenantId: req.user?.tenant_id
        },
        req.user?.user_id,
        req.user?.tenant_id,
        error.stack
      );

      res.status(500).json({
        success: false,
        error: error.message || 'Failed to retrieve metrics',
        execution_time_ms: executionTime
      });
    }
  };

  /**
   * POST /api/scheme-analysis/batch-calculate
   * Batch calculate metrics for multiple schemes (Admin only)
   * 
   * Body:
   * {
   *   "scheme_ids": [1, 2, 3, ...],          // Array of scheme IDs
   *   "as_of_date": "2025-01-15",            // Optional: specific date
   *   "batch_size": 100,                     // Optional: schemes per batch (default: 100)
   *   "delay_ms": 5000,                      // Optional: delay between batches (default: 5000ms)
   *   "priority": "bookmarked"               // Optional: "bookmarked" | "all" (default: "all")
   * }
   * 
   * Response:
   * {
   *   "success": true,
   *   "total_schemes": 500,
   *   "successful": 485,
   *   "failed": 15,
   *   "success_rate": "97.0%",
   *   "execution_time_ms": 123456,
   *   "execution_time_minutes": 2.06,
   *   "errors": [
   *     { "scheme_id": 123, "scheme_code": "INF123", "error": "No NAV data" }
   *   ]
   * }
   */
  batchCalculate = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const startTime = Date.now();

    try {
      // Admin check
      const isAdmin = req.user?.tenant?.is_admin === true;
      if (!isAdmin) {
        res.status(403).json({
          success: false,
          error: 'Admin access required for batch calculations'
        });
        return;
      }

      const { 
        scheme_ids, 
        as_of_date, 
        batch_size = 100, 
        delay_ms = 5000,
        priority = 'all'
      } = req.body;

      const isLive = req.environment === 'live';

      // Validate inputs
      if (!scheme_ids || !Array.isArray(scheme_ids) || scheme_ids.length === 0) {
        res.status(400).json({
          success: false,
          error: 'scheme_ids array is required and must not be empty'
        });
        return;
      }

      if (scheme_ids.some(id => typeof id !== 'number' || id <= 0)) {
        res.status(400).json({
          success: false,
          error: 'All scheme_ids must be valid positive integers'
        });
        return;
      }

      let asOfDate: Date | undefined;
      if (as_of_date) {
        asOfDate = new Date(as_of_date);
        if (isNaN(asOfDate.getTime())) {
          res.status(400).json({
            success: false,
            error: 'Invalid date format. Use YYYY-MM-DD'
          });
          return;
        }
      }

      SimpleLogger.info(
        'SchemeAnalysisController',
        'Batch calculation requested',
        'batchCalculate',
        {
          totalSchemes: scheme_ids.length,
          batchSize: batch_size,
          delayMs: delay_ms,
          asOfDate: asOfDate?.toISOString().split('T')[0] || 'latest',
          priority,
          userId: req.user?.user_id,
          tenantId: req.user?.tenant_id
        },
        req.user?.user_id,
        req.user?.tenant_id
      );

      // If priority is "bookmarked", reorder scheme_ids to process bookmarked first
      let orderedSchemeIds = scheme_ids;
      if (priority === 'bookmarked') {
        const { pool } = require('../config/database');
        const bookmarkedQuery = `
          SELECT DISTINCT scheme_id 
          FROM t_scheme_bookmarks 
          WHERE scheme_id = ANY($1) AND is_active = true
        `;
        const bookmarkedResult = await pool.query(bookmarkedQuery, [scheme_ids]);
        const bookmarkedIds = bookmarkedResult.rows.map((r: any) => r.scheme_id);
        const nonBookmarkedIds = scheme_ids.filter(id => !bookmarkedIds.includes(id));
        
        orderedSchemeIds = [...bookmarkedIds, ...nonBookmarkedIds];

        SimpleLogger.info(
          'SchemeAnalysisController',
          'Prioritizing bookmarked schemes',
          'batchCalculate',
          {
            bookmarkedCount: bookmarkedIds.length,
            nonBookmarkedCount: nonBookmarkedIds.length
          },
          req.user?.user_id,
          req.user?.tenant_id
        );
      }

      // Execute batch calculation
      const batchResult = await schemeMetricsCalculator.batchCalculateSchemes(
        orderedSchemeIds,
        asOfDate,
        isLive,
        batch_size,
        delay_ms
      );

      const executionTime = Date.now() - startTime;
      const successRate = batchResult.totalSchemes > 0 
        ? ((batchResult.successful / batchResult.totalSchemes) * 100).toFixed(1)
        : '0.0';

      SimpleLogger.info(
        'SchemeAnalysisController',
        'Batch calculation completed',
        'batchCalculate',
        {
          totalSchemes: batchResult.totalSchemes,
          successful: batchResult.successful,
          failed: batchResult.failed,
          successRate: `${successRate}%`,
          executionTimeMs: executionTime,
          userId: req.user?.user_id,
          tenantId: req.user?.tenant_id
        },
        req.user?.user_id,
        req.user?.tenant_id
      );

      res.json({
        success: true,
        total_schemes: batchResult.totalSchemes,
        successful: batchResult.successful,
        failed: batchResult.failed,
        success_rate: `${successRate}%`,
        execution_time_ms: executionTime,
        execution_time_minutes: parseFloat((executionTime / 60000).toFixed(2)),
        errors: batchResult.errors.slice(0, 100), // Limit to first 100 errors
        message: `Batch calculation completed. ${batchResult.successful}/${batchResult.totalSchemes} schemes processed successfully.`
      });

    } catch (error: any) {
      const executionTime = Date.now() - startTime;

      SimpleLogger.error(
        'SchemeAnalysisController',
        'Batch calculation failed',
        'batchCalculate',
        {
          error: error.message,
          userId: req.user?.user_id,
          tenantId: req.user?.tenant_id
        },
        req.user?.user_id,
        req.user?.tenant_id,
        error.stack
      );

      res.status(500).json({
        success: false,
        error: error.message || 'Batch calculation failed',
        execution_time_ms: executionTime
      });
    }
  };
}

export const schemeAnalysisController = new SchemeAnalysisController();