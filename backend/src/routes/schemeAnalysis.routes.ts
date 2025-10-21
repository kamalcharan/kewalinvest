// backend/src/routes/schemeAnalysis.routes.ts
// Route definitions for scheme analysis endpoints
// Handles metrics calculation and retrieval for mutual fund schemes

import express from 'express';
import { schemeAnalysisController } from '../controllers/schemeAnalysisController';
import { authMiddleware } from '../middleware/auth.middleware';
import { environmentMiddleware } from '../middleware/environment.middleware';

const router = express.Router();

// =====================================================
// MIDDLEWARE
// =====================================================

// All routes require authentication
router.use(authMiddleware);

// Set environment context (live/test) from query param or default to live
router.use(environmentMiddleware);

// =====================================================
// METRICS CALCULATION ROUTES
// =====================================================

/**
 * POST /api/scheme-analysis/calculate-metrics/:schemeId
 * Calculate metrics for a single scheme
 * 
 * Access: Authenticated users
 * 
 * Path params:
 *   - schemeId: Scheme ID (integer)
 * 
 * Body (optional):
 *   - as_of_date: Date to calculate for (YYYY-MM-DD), defaults to latest
 *   - recalculate: Boolean to force recalculation if metrics exist
 * 
 * Response:
 *   - 200: Metrics calculated successfully
 *   - 400: Invalid scheme ID or date format
 *   - 500: Calculation error
 */
router.post(
  '/calculate-metrics/:schemeId',
  schemeAnalysisController.calculateMetrics
);

/**
 * GET /api/scheme-analysis/metrics/:schemeId
 * Get latest calculated metrics for a scheme
 * 
 * Access: Authenticated users
 * 
 * Path params:
 *   - schemeId: Scheme ID (integer)
 * 
 * Query params (optional):
 *   - date: Get metrics for specific date (YYYY-MM-DD), defaults to latest
 * 
 * Response:
 *   - 200: Metrics retrieved successfully
 *   - 400: Invalid scheme ID or date format
 *   - 404: No metrics found for scheme
 *   - 500: Retrieval error
 */
router.get(
  '/metrics/:schemeId',
  schemeAnalysisController.getLatestMetrics
);

/**
 * POST /api/scheme-analysis/batch-calculate
 * Bulk calculate metrics for multiple schemes
 * 
 * Access: Admin only
 * 
 * Body:
 *   - scheme_ids: Array of scheme IDs (required)
 *   - as_of_date: Date to calculate for (YYYY-MM-DD), optional
 *   - batch_size: Number of schemes per batch (default: 100)
 *   - delay_ms: Delay between batches in ms (default: 5000)
 *   - priority: "bookmarked" | "all" (default: "all")
 * 
 * Response:
 *   - 200: Batch calculation completed
 *   - 400: Invalid request body
 *   - 403: Admin access required
 *   - 500: Calculation error
 */
router.post(
  '/batch-calculate',
  schemeAnalysisController.batchCalculate
);

// =====================================================
// HEALTH CHECK ROUTE (Optional)
// =====================================================

/**
 * GET /api/scheme-analysis/health
 * Health check endpoint
 * 
 * Access: Authenticated users
 * 
 * Response:
 *   - 200: Service is healthy
 */
router.get('/health', (req, res) => {
  res.json({
    success: true,
    service: 'scheme-analysis',
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

export default router;