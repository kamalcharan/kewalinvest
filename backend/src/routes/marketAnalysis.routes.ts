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

export default router;