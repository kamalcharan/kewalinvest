// backend/src/routes/dashboard.routes.ts
// Dashboard routes for main IFA/RIA dashboard

import { Router } from 'express';
import { DashboardController } from '../controllers/dashboard.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { environmentMiddleware } from '../middleware/environment.middleware';

const router = Router();
const dashboardController = new DashboardController();

// Apply middleware
router.use(authMiddleware);
router.use(environmentMiddleware);

// Dashboard routes
router.get('/', dashboardController.getDashboard);
router.get('/summary', dashboardController.getSummary);
router.get('/download-status', dashboardController.getDownloadStatus);
router.get('/goals-summary', dashboardController.getGoalsSummary);
router.get('/pending-actions', dashboardController.getPendingActions);
router.get('/recent-transactions', dashboardController.getRecentTransactions);

export default router;
