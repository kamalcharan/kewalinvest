// backend/src/routes/jtbd.routes.ts
// CORRECTED - Specific routes BEFORE parameterized routes

import { Router } from 'express';
import { JTBDController } from '../controllers/jtbd.controller';
import { authenticate } from '../middleware/auth.middleware';
import { environmentMiddleware } from '../middleware/environment.middleware';

const router = Router();
const jtbdController = new JTBDController();

// Apply authentication and environment middleware to all routes
router.use(authenticate);
router.use(environmentMiddleware);

// ============================================
// SPECIFIC ROUTES FIRST (no parameters in first segment)
// ============================================

// Dashboard & Overview (must come before /:id)
router.get('/dashboard/overview', jtbdController.getDashboardOverview);
router.get('/dashboard/customers-without-jtbd', jtbdController.getCustomersWithoutJTBD);
router.get('/dashboard/upcoming-alerts', jtbdController.getUpcomingAlerts);
router.get('/dashboard/alerts-by-date', jtbdController.getAlertsByDate);
router.get('/dashboard/communication-queue', jtbdController.getCommunicationQueue);
router.get('/dashboard/latest-alerts', jtbdController.getLatestAlerts);  // For header dropdown

// Helper Endpoints - dropdowns (must come before /:id)
router.get('/transaction-types', jtbdController.getTransactionTypes);
router.get('/schemes/:customerId', jtbdController.getCustomerSchemes);

// Customer-specific routes (must come before /:id)
router.get('/customer/:customerId/summary', jtbdController.getCustomerSummary);
router.get('/customer/:customerId', jtbdController.getCustomerJTBDs);

// ============================================
// PARAMETERIZED ROUTES AFTER SPECIFIC ROUTES
// ============================================

// Create (POST is usually safe anywhere, but keeping organized)
router.post('/', jtbdController.createJTBD);

// Specific ID operations (these use /:id so must come after specific routes)
router.get('/:id/occurrences', jtbdController.getPortfolioOccurrences);
router.get('/:id', jtbdController.getJTBD);
router.put('/:id', jtbdController.updateJTBD);
router.patch('/:id/toggle', jtbdController.toggleJTBD);
router.delete('/:id', jtbdController.deleteJTBD);

export default router;