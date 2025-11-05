// backend/src/routes/marketAnalysis.routes.ts
// Market Analysis Metrics Routes

import { Router } from 'express';
import { MarketAnalysisController } from '../controllers/marketAnalysisController';
import { authMiddleware } from '../middleware/auth.middleware';
import { environmentMiddleware } from '../middleware/environment.middleware';

const router = Router();
const marketAnalysisController = new MarketAnalysisController();

// Apply middleware to all routes
router.use(authMiddleware);
router.use(environmentMiddleware);

// ==================== SPECIFIC ROUTES FIRST (no parameters in first segment) ====================

/**
 * @route   GET /api/market-analysis/health
 * @desc    Check if market analysis service is operational
 * @access  Private
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
 * @route   GET /api/market-analysis/dashboard-statistics
 * @desc    Get aggregated dashboard statistics across all indices
 * @query   time_period - '1m', '3m', '6m', or '1y' (default: '1y')
 * @access  Private
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
 * @route   POST /api/market-analysis/bulk-calculate-metrics
 * @desc    Calculate metrics for multiple indices sequentially
 * @body    { index_ids: number[], recalculate?: boolean }
 * @access  Private
 * 
 * Request body:
 * {
 *   index_ids: number[],      // Array of index IDs (max 50)
 *   recalculate?: boolean     // If true, recalculate all records (default: false)
 * }
 * 
 * Response:
 * {
 *   success: boolean,
 *   summary: {
 *     total_indices: number,
 *     successful: number,
 *     failed: number,
 *     total_records_processed: number,
 *     total_time_ms: number,
 *     average_time_per_index_ms: number
 *   },
 *   results: Array<{
 *     index_id: number,
 *     index_name: string,
 *     success: boolean,
 *     records_processed: number,
 *     error?: string,
 *     calculation_time_ms: number
 *   }>,
 *   message: string
 * }
 */
router.post(
  '/bulk-calculate-metrics',
  marketAnalysisController.bulkCalculateMetrics
);

/**
 * @route   GET /api/market-analysis/index-returns
 * @desc    Get time-series returns data for an index
 * @query   index_id (required), periods, start_date, end_date, granularity
 * @access  Private
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

// ==================== PARAMETERIZED ROUTES AFTER SPECIFIC ROUTES ====================

/**
 * @route   POST /api/market-analysis/calculate-metrics/:indexId
 * @desc    Calculate metrics for an index on demand (called when user clicks "Calculate" button)
 * @param   indexId - Index ID
 * @body    { recalculate?: boolean, as_of_date?: string }
 * @access  Private
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
 * @route   GET /api/market-analysis/metrics/:indexId
 * @desc    Get latest calculated metrics for an index
 * @param   indexId - Index ID
 * @access  Private
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
 * @route   GET /api/market-analysis/index-volatility/:indexId
 * @desc    Get time-series volatility data for an index
 * @param   indexId - Index ID
 * @query   start_date, end_date, granularity
 * @access  Private
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