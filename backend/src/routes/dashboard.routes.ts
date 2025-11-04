// backend/src/routes/dashboard.routes.ts

import { Router } from 'express';
import { DashboardController } from '../controllers/dashboard.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { environmentMiddleware } from '../middleware/environment.middleware';

const router = Router();
const dashboardController = new DashboardController();

// Apply auth and environment middleware to all routes
router.use(authMiddleware);
router.use(environmentMiddleware);

/**
 * Dashboard API Routes
 */

// GET /api/dashboard/statistics - Get overall dashboard statistics
router.get('/statistics', (req, res) => dashboardController.getStatistics(req, res));

// GET /api/dashboard/goal-deviations - Get top goal deviations
router.get('/goal-deviations', (req, res) => dashboardController.getGoalDeviations(req, res));

// GET /api/dashboard/upcoming-meetings - Get upcoming meetings
router.get('/upcoming-meetings', (req, res) => dashboardController.getUpcomingMeetings(req, res));

// GET /api/dashboard/bookmarked-goals - Get all bookmarked goals with filters
router.get('/bookmarked-goals', (req, res) => dashboardController.getBookmarkedGoals(req, res));

// GET /api/dashboard/alerts - Get dashboard alerts
router.get('/alerts', (req, res) => dashboardController.getAlerts(req, res));

export default router;
