// backend/src/routes/jobs.routes.ts
// Generic routes for all job types

import { Router } from 'express';
import { JobsController } from '../controllers/jobs.controller';
import { authenticate } from '../middleware/auth.middleware';
import { JobSchedulerService } from '../services/jobScheduler.service';

const router = Router();

// Create scheduler service instance
const schedulerService = new JobSchedulerService();
const controller = new JobsController(schedulerService);

// ==================== JOB TYPES ROUTE ====================

/**
 * @route   GET /api/jobs/types
 * @desc    Get all available job types
 * @access  Private (Authenticated users)
 */
router.get('/types', authenticate, controller.getJobTypes);

// ==================== CONFIGURATION ROUTES ====================

/**
 * @route   GET /api/jobs/:jobType/config
 * @desc    Get scheduler configuration for a job type
 * @access  Private (Authenticated users)
 * @param   jobType - Job type code (e.g., PORTFOLIO_SNAPSHOT)
 * @query   environment - 'live' or 'test'
 */
router.get('/:jobType/config', authenticate, controller.getConfig);

/**
 * @route   POST /api/jobs/:jobType/config
 * @desc    Create scheduler configuration for a job type
 * @access  Private (Authenticated users)
 * @param   jobType - Job type code (e.g., PORTFOLIO_SNAPSHOT)
 * @query   environment - 'live' or 'test'
 * @body    { schedule_type?, cron_expression?, is_enabled?, max_retries?, job_config? }
 */
router.post('/:jobType/config', authenticate, controller.createConfig);

/**
 * @route   PUT /api/jobs/:jobType/config
 * @desc    Update scheduler configuration for a job type
 * @access  Private (Authenticated users)
 * @param   jobType - Job type code (e.g., PORTFOLIO_SNAPSHOT)
 * @query   environment - 'live' or 'test'
 * @body    { schedule_type?, cron_expression?, is_enabled?, max_retries?, job_config? }
 */
router.put('/:jobType/config', authenticate, controller.updateConfig);

// ==================== EXECUTION ROUTES ====================

/**
 * @route   POST /api/jobs/:jobType/execute
 * @desc    Manually trigger job execution
 * @access  Private (Authenticated users)
 * @param   jobType - Job type code (e.g., PORTFOLIO_SNAPSHOT)
 * @query   environment - 'live' or 'test'
 * @returns 202 Accepted - Processing started in background
 */
router.post('/:jobType/execute', authenticate, controller.triggerManual);

/**
 * @route   GET /api/jobs/:jobType/executions
 * @desc    Get execution history for a job type
 * @access  Private (Authenticated users)
 * @param   jobType - Job type code (e.g., PORTFOLIO_SNAPSHOT)
 * @query   environment - 'live' or 'test'
 * @query   page - Page number (default: 1)
 * @query   page_size - Items per page (default: 20)
 */
router.get('/:jobType/executions', authenticate, controller.getExecutions);

/**
 * @route   GET /api/jobs/:jobType/statistics
 * @desc    Get statistics and status for a job type
 * @access  Private (Authenticated users)
 * @param   jobType - Job type code (e.g., PORTFOLIO_SNAPSHOT)
 * @query   environment - 'live' or 'test'
 */
router.get('/:jobType/statistics', authenticate, controller.getStatistics);

// ==================== UTILITY ROUTES ====================

/**
 * @route   GET /api/jobs/:jobType/health
 * @desc    Health check for a specific job type
 * @access  Private (Authenticated users)
 * @param   jobType - Job type code (e.g., PORTFOLIO_SNAPSHOT)
 * @query   environment - 'live' or 'test'
 */
router.get('/:jobType/health', authenticate, controller.healthCheck);

// Export both router and scheduler service (for server initialization)
export default router;
export { schedulerService };
