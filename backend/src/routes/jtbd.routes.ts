// backend/src/routes/jtbd.routes.ts

import { Router } from 'express';
import { JTBDController } from '../controllers/jtbd.controller';
import { authenticate } from '../middleware/auth.middleware';
import { environmentMiddleware } from '../middleware/environment.middleware';

const router = Router();
const jtbdController = new JTBDController();

// Apply authentication and environment middleware to all routes
router.use(authenticate);
router.use(environmentMiddleware);

// JTBD CRUD Operations
router.post('/', jtbdController.createJTBD);
router.get('/customer/:customerId', jtbdController.getCustomerJTBDs);
router.get('/:id', jtbdController.getJTBD);
router.put('/:id', jtbdController.updateJTBD);
router.delete('/:id', jtbdController.deleteJTBD);
router.patch('/:id/toggle', jtbdController.toggleJTBD);

// Dashboard & Overview
router.get('/dashboard/overview', jtbdController.getDashboardOverview);
router.get('/dashboard/customers-without-jtbd', jtbdController.getCustomersWithoutJTBD);

// Customer Summary
router.get('/customer/:customerId/summary', jtbdController.getCustomerSummary);

// Helper Endpoints (for dropdowns)
router.get('/schemes/:customerId', jtbdController.getCustomerSchemes);
router.get('/transaction-types', jtbdController.getTransactionTypes);

// Portfolio Alert Occurrences
router.get('/:id/occurrences', jtbdController.getPortfolioOccurrences);

export default router;