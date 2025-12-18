// backend/src/routes/jobs.routes.ts
// Generic routes for all job types

import { Router } from 'express';
import { JobsController } from '../controllers/jobs.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { environmentMiddleware } from '../middleware/environment.middleware';
import { jobSchedulerService } from '../services/jobScheduler.service';

const router = Router();

// Use the singleton scheduler service (executors are registered on this instance)
const controller = new JobsController(jobSchedulerService);

// Apply middleware globally to all routes
router.use(authMiddleware); // ADD THIS
router.use(environmentMiddleware); // ADD THIS

// ==================== JOB TYPES ROUTE ====================

/**
 * @route   GET /api/jobs/types
 * @desc    Get all available job types
 * @access  Private (Authenticated users)
 */
router.get('/types', controller.getJobTypes); // REMOVE authenticate

// ==================== CONFIGURATION ROUTES ====================

/**
 * @route   GET /api/jobs/:jobType/config
 * @desc    Get scheduler configuration for a job type
 * @access  Private (Authenticated users)
 */
router.get('/:jobType/config', controller.getConfig); // REMOVE authenticate

/**
 * @route   POST /api/jobs/:jobType/config
 * @desc    Create scheduler configuration for a job type
 * @access  Private (Authenticated users)
 */
router.post('/:jobType/config', controller.createConfig); // REMOVE authenticate

/**
 * @route   PUT /api/jobs/:jobType/config
 * @desc    Update scheduler configuration for a job type
 * @access  Private (Authenticated users)
 */
router.put('/:jobType/config', controller.updateConfig); // REMOVE authenticate

// ==================== EXECUTION ROUTES ====================

/**
 * @route   POST /api/jobs/:jobType/execute
 * @desc    Manually trigger job execution
 * @access  Private (Authenticated users)
 */
router.post('/:jobType/execute', controller.triggerManual); // REMOVE authenticate

/**
 * @route   GET /api/jobs/:jobType/executions
 * @desc    Get execution history for a job type
 * @access  Private (Authenticated users)
 */
router.get('/:jobType/executions', controller.getExecutions); // REMOVE authenticate

/**
 * @route   GET /api/jobs/:jobType/statistics
 * @desc    Get statistics and status for a job type
 * @access  Private (Authenticated users)
 */
router.get('/:jobType/statistics', controller.getStatistics); // REMOVE authenticate

// ==================== UTILITY ROUTES ====================

/**
 * @route   GET /api/jobs/:jobType/health
 * @desc    Health check for a specific job type
 * @access  Private (Authenticated users)
 */
router.get('/:jobType/health', controller.healthCheck); // REMOVE authenticate

// Export router (scheduler service is exported from jobScheduler.service.ts)
export default router;