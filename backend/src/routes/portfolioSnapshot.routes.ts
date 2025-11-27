// backend/src/routes/portfolioSnapshot.routes.ts
// Routes for Portfolio Snapshot Scheduler API
// FIXED: Added JobSchedulerService dependency injection

import { Router } from 'express';
import { PortfolioSnapshotController } from '../controllers/portfolioSnapshot.controller';
import { JobSchedulerService } from '../services/jobScheduler.service';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// Initialize JobSchedulerService and pass to controller
const jobSchedulerService = new JobSchedulerService();
const controller = new PortfolioSnapshotController(jobSchedulerService);

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
 * @route   POST /api/cruise-control/snapshots/backfill-smart
 * @desc    Smart backfill - auto-detects date range from customer transactions
 * @access  Private (Authenticated users)
 * @query   environment - 'live' or 'test'
 * @body    { customer_ids?: number[] }  // Optional: specific customers, omit for all
 */
router.post('/backfill-smart', authenticate, controller.smartBackfill);

/**
 * @route   POST /api/cruise-control/snapshots/backfill
 * @desc    Manual backfill with date range (for advanced use)
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

// ==================== NEW OPERATION ROUTES ====================

/**
 * @route   POST /api/cruise-control/snapshots/operations/drop-all
 * @desc    Drop all snapshots (DANGEROUS operation)
 * @access  Private (Authenticated users)
 * @query   environment - 'live' or 'test'
 * @body    { customer_ids?: number[] }  // Optional: specific customers, omit for all
 */
router.post('/operations/drop-all', authenticate, controller.dropAllSnapshots);

/**
 * @route   POST /api/cruise-control/snapshots/operations/generate-missing
 * @desc    Generate only missing snapshots (safe operation)
 * @access  Private (Authenticated users)
 * @query   environment - 'live' or 'test'
 * @body    { customer_ids?: number[] }  // Optional: specific customers, omit for all
 */
router.post('/operations/generate-missing', authenticate, controller.generateMissingSnapshots);

/**
 * @route   POST /api/cruise-control/snapshots/operations/update-all
 * @desc    Update all snapshots (CREATE + UPDATE)
 * @access  Private (Authenticated users)
 * @query   environment - 'live' or 'test'
 * @body    { customer_ids?: number[] }  // Optional: specific customers, omit for all
 */
router.post('/operations/update-all', authenticate, controller.updateAllSnapshots);

/**
 * @route   POST /api/cruise-control/snapshots/operations/regenerate-all
 * @desc    Regenerate all snapshots (DROP + CREATE - VERY DANGEROUS)
 * @access  Private (Authenticated users)
 * @query   environment - 'live' or 'test'
 * @body    { customer_ids?: number[] }  // Optional: specific customers, omit for all
 */
router.post('/operations/regenerate-all', authenticate, controller.regenerateAllSnapshots);

// ==================== CUSTOMER-SPECIFIC ROUTES ====================

/**
 * @route   GET /api/cruise-control/snapshots/customer/:customerId/status
 * @desc    Get snapshot status for a specific customer
 * @access  Private (Authenticated users)
 * @query   environment - 'live' or 'test'
 * @returns { customer_id, latest_snapshot_date, total_snapshots, earliest_snapshot_date, has_snapshots }
 */
router.get('/customer/:customerId/status', authenticate, controller.getCustomerSnapshotStatus);

export default router;