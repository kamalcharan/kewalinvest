// backend/src/routes/portfolioSnapshot.routes.ts
// Routes for Portfolio Snapshot Scheduler API

import { Router } from 'express';
import { PortfolioSnapshotController } from '../controllers/portfolioSnapshot.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();
const controller = new PortfolioSnapshotController();

// ==================== CONFIGURATION ROUTES ====================

/**
 * @route   GET /api/cruise-control/snapshots/config
 * @desc    Get scheduler configuration for current tenant
 * @access  Private (Authenticated users)
 * @query   environment - 'live' or 'test'
 */
router.get('/config', authenticate, controller.getConfig);

/**
 * @route   POST /api/cruise-control/snapshots/config
 * @desc    Create scheduler configuration for current tenant
 * @access  Private (Authenticated users)
 * @query   environment - 'live' or 'test'
 * @body    { schedule_type?, cron_expression?, is_enabled?, max_retries? }
 */
router.post('/config', authenticate, controller.createConfig);

/**
 * @route   PUT /api/cruise-control/snapshots/config
 * @desc    Update scheduler configuration for current tenant
 * @access  Private (Authenticated users)
 * @query   environment - 'live' or 'test'
 * @body    { schedule_type?, cron_expression?, is_enabled?, max_retries? }
 */
router.put('/config', authenticate, controller.updateConfig);

// ==================== EXECUTION ROUTES ====================

/**
 * @route   POST /api/cruise-control/snapshots/execute
 * @desc    Manually trigger snapshot generation
 * @access  Private (Authenticated users)
 * @query   environment - 'live' or 'test'
 * @returns 202 Accepted - Processing started in background
 */
router.post('/execute', authenticate, controller.triggerManual);

/**
 * @route   GET /api/cruise-control/snapshots/executions
 * @desc    Get execution history for current tenant
 * @access  Private (Authenticated users)
 * @query   environment - 'live' or 'test'
 * @query   page - Page number (default: 1)
 * @query   page_size - Items per page (default: 20)
 */
router.get('/executions', authenticate, controller.getExecutions);

/**
 * @route   GET /api/cruise-control/snapshots/statistics
 * @desc    Get statistics and status for current tenant
 * @access  Private (Authenticated users)
 * @query   environment - 'live' or 'test'
 */
router.get('/statistics', authenticate, controller.getStatistics);

// ==================== UTILITY ROUTES ====================

/**
 * @route   POST /api/cruise-control/snapshots/backfill
 * @desc    Backfill historical snapshots (for initial setup)
 * @access  Private (Authenticated users)
 * @query   environment - 'live' or 'test'
 * @body    { start_month: 'YYYY-MM-DD', end_month: 'YYYY-MM-DD', customer_ids?: number[] }
 */
router.post('/backfill', authenticate, controller.backfillSnapshots);

/**
 * @route   GET /api/cruise-control/snapshots/health
 * @desc    Health check endpoint
 * @access  Private (Authenticated users)
 * @query   environment - 'live' or 'test'
 */
router.get('/health', authenticate, controller.healthCheck);

export default router;
