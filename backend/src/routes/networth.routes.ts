// backend/src/routes/networth.routes.ts
// Routes for NetworthViewer API - Cycle 2
// Provides endpoints for networth summary, history, breakdown, and goals

import { Router } from 'express';
import { NetworthController } from '../controllers/networth.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { environmentMiddleware } from '../middleware/environment.middleware';

const router = Router();
const controller = new NetworthController();

// Apply middleware globally
router.use(authMiddleware);
router.use(environmentMiddleware);

// ==================== NETWORTH ENDPOINTS ====================

/**
 * GET /api/networth/summary
 * Get total networth across all assets with breakdown
 *
 * Query params:
 * - customer_id: number (required if no family_head_iwellcode)
 * - family_head_iwellcode: string (required if no customer_id)
 * - as_of_date: string (optional, ISO date format)
 *
 * Response: NetworthSummaryResponse
 */
router.get('/summary', controller.getSummary);

/**
 * GET /api/networth/history
 * Get historical timeline aggregated by month
 *
 * Query params:
 * - customer_id: number (required if no family_head_iwellcode)
 * - family_head_iwellcode: string (required if no customer_id)
 * - start_date: string (optional, ISO date format)
 * - end_date: string (optional, ISO date format)
 * - granularity: 'monthly' | 'quarterly' | 'yearly' (optional, default: monthly)
 *
 * Response: NetworthHistoryResponse
 */
router.get('/history', controller.getHistory);

/**
 * GET /api/networth/breakdown
 * Get per-asset-type details with individual investment plans
 *
 * Query params:
 * - customer_id: number (required if no family_head_iwellcode)
 * - family_head_iwellcode: string (required if no customer_id)
 * - as_of_date: string (optional, ISO date format)
 * - asset_type_codes: string (optional, comma-separated e.g., "MF,GOLD,RE")
 *
 * Response: NetworthBreakdownResponse
 */
router.get('/breakdown', controller.getBreakdown);

/**
 * GET /api/networth/goals
 * Get goal achievability data
 *
 * Query params:
 * - customer_id: number (required if no family_head_iwellcode)
 * - family_head_iwellcode: string (required if no customer_id)
 * - projection_years: number (optional, default: 10)
 *
 * Response: NetworthGoalsResponse
 */
router.get('/goals', controller.getGoals);

/**
 * GET /api/networth/health
 * Health check endpoint
 *
 * Response: Health status
 */
router.get('/health', controller.healthCheck);

export default router;
