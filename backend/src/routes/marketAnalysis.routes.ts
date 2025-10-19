// backend/src/routes/marketAnalysis.routes.ts
// Market Analysis Metrics Routes

import { Router } from 'express';
import { MarketAnalysisController } from '../controllers/marketAnalysisController';
import { authenticate } from '../middleware/auth.middleware';
import { environmentMiddleware } from '../middleware/environment.middleware';

const router = Router();
const marketAnalysisController = new MarketAnalysisController();

// Apply authentication and environment middleware to all routes
router.use(authenticate);
router.use(environmentMiddleware);

// ============================================
// SPECIFIC ROUTES FIRST (no parameters in first segment)
// ============================================

/**
 * GET /api/market-analysis/health
 * Check if market analysis service is operational
 */
router.get('/health', async (req, res) => {
  res.json({
    success: true,
    service: 'market-analysis',
    status: 'operational',
    timestamp: new Date().toISOString()
  });
});

/**
 * GET /api/market-analysis/dashboard-statistics
 * Get aggregated dashboard statistics across all indices
 * 
 * Query parameters:
 *   - time_period (optional): '1m', '3m', '6m', or '1y' - default: '1y'
 * 
 * Response:
 * {
 *   success: boolean,
 *   time_period: string,
 *   data: {
 *     best_performer: { index_id, index_name, index_code, return_value } | null,
 *     most_volatile: { index_id, index_name, index_code, volatility_value } | null,
 *     market_breadth: number,
 *     total_indices_analyzed: number,
 *     indices_up: number,
 *     indices_down: number,
 *     heatmap: Array<{
 *       index_id, index_name, index_code, return_value, volatility_value
 *     }>
 *   },
 *   execution_time_ms: number
 * }
 */
router.get(
  '/dashboard-statistics',
  marketAnalysisController.getDashboardStatistics
);

/**
 * GET /api/market-analysis/index-returns
 * Get time-series returns data for an index
 * 
 * Query parameters:
 *   - index_id (required): Index ID
 *   - periods (optional): Comma-separated list of periods 
 *                        Valid: daily, 1w, 1m, 3m, 6m, 1y, ytd, all
 *                        Default: 1m,3m,6m,1y,ytd,all
 *   - start_date (optional): ISO date format (YYYY-MM-DD)
 *   - end_date (optional): ISO date format (YYYY-MM-DD)
 *   - granularity (optional): 'daily' or 'monthly' - default: 'daily'
 * 
 * Response:
 * {
 *   success: boolean,
 *   index_id: number,
 *   periods: string[],
 *   granularity: string,
 *   date_range: {
 *     start_date: string,
 *     end_date: string
 *   },
 *   data: Array<{
 *     date: string (ISO format),
 *     daily_return?: number | null,
 *     return_1w?: number | null,
 *     return_1m?: number | null,
 *     return_3m?: number | null,
 *     return_6m?: number | null,
 *     return_1y?: number | null,
 *     return_ytd?: number | null,
 *     return_all?: number | null
 *   }>,
 *   total_records: number,
 *   execution_time_ms: number
 * }
 */
router.get(
  '/index-returns',
  marketAnalysisController.getIndexReturnsTimeSeries
);

// ============================================
// PARAMETERIZED ROUTES AFTER SPECIFIC ROUTES
// ============================================

/**
 * POST /api/market-analysis/calculate-metrics/:indexId
 * Calculate metrics for an index on demand
 * Called when user clicks "Calculate" button in IndexDetailPage
 * 
 * Request body:
 * {
 *   recalculate?: boolean,    // If true, recalculate even if metrics exist
 *   as_of_date?: string       // ISO date (YYYY-MM-DD), defaults to yesterday
 * }
 * 
 * Response:
 * {
 *   success: boolean,
 *   index_id: number,
 *   date: string,
 *   metrics: { ... all metrics ... },
 *   records_processed: number,
 *   calculation_time_ms: number,
 *   message: string
 * }
 */
router.post(
  '/calculate-metrics/:indexId',
  marketAnalysisController.calculateMetrics
);

/**
 * GET /api/market-analysis/metrics/:indexId
 * Get latest calculated metrics for an index
 * 
 * Response:
 * {
 *   success: boolean,
 *   index_id: number,
 *   date: string,
 *   metrics: { ... all metrics ... },
 *   metrics_calculated_at: Date
 * }
 */
router.get(
  '/metrics/:indexId',
  marketAnalysisController.getLatestMetrics
);

/**
 * GET /api/market-analysis/index-volatility/:indexId
 * Get time-series volatility data for an index
 * 
 * Path parameters:
 *   - indexId (required): Index ID
 * 
 * Query parameters:
 *   - start_date (optional): ISO date format (YYYY-MM-DD)
 *   - end_date (optional): ISO date format (YYYY-MM-DD)
 *   - granularity (optional): 'daily' or 'monthly' - default: 'daily'
 * 
 * Response:
 * {
 *   success: boolean,
 *   index_id: number,
 *   granularity: string,
 *   date_range: {
 *     start_date: string,
 *     end_date: string
 *   },
 *   data: Array<{
 *     date: string (ISO format),
 *     sd_7d?: number | null,
 *     sd_14d?: number | null,
 *     sd_21d?: number | null,
 *     sd_42d?: number | null,
 *     sd_3m?: number | null,
 *     sd_6m?: number | null
 *   }>,
 *   total_records: number,
 *   execution_time_ms: number
 * }
 */
router.get(
  '/index-volatility/:indexId',
  marketAnalysisController.getIndexVolatilityTimeSeries
);

export default router;