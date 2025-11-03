// backend/src/routes/cruiseControl.routes.ts

import { Router } from 'express';
import { PortfolioSnapshotController } from '../controllers/portfolioSnapshot.controller';
import CruiseControlController from '../controllers/cruiseControl.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { environmentMiddleware } from '../middleware/environment.middleware';
import { jobSchedulerService } from '../services/jobScheduler.service';

const router = Router();
const snapshotController = new PortfolioSnapshotController(jobSchedulerService);
const cruiseController = new CruiseControlController();

// Apply middleware globally
router.use(authMiddleware);
router.use(environmentMiddleware);

// ==================== DASHBOARD & STATISTICS ====================
router.get('/dashboard', (req, res) => cruiseController.getDashboardStats(req, res));

// ==================== NAV MONITORING ====================
router.get('/nav/statistics', (req, res) => cruiseController.getNavStats(req, res));
router.post('/nav/download/:schemeCode', (req, res) => cruiseController.triggerNavDownload(req, res));

// ==================== MARKET MONITORING ====================
router.get('/market/statistics', (req, res) => cruiseController.getMarketStats(req, res));
router.post('/market/download/:indexId', (req, res) => cruiseController.triggerMarketDownload(req, res));

// ==================== PORTFOLIO SNAPSHOT ROUTES ====================
router.get('/snapshots/config', snapshotController.getConfig);
router.post('/snapshots/config', snapshotController.createConfig);
router.put('/snapshots/config', snapshotController.updateConfig);

// Execution routes
router.post('/snapshots/execute', snapshotController.triggerManual);
router.get('/snapshots/executions', snapshotController.getExecutions);
router.get('/snapshots/statistics', snapshotController.getStatistics);

// Backfill routes
router.post('/snapshots/backfill-smart', snapshotController.smartBackfill);
router.post('/snapshots/backfill', snapshotController.backfillSnapshots);

// Health check
router.get('/snapshots/health', snapshotController.healthCheck);

// Operation routes
router.post('/snapshots/operations/drop-all', snapshotController.dropAllSnapshots);
router.post('/snapshots/operations/generate-missing', snapshotController.generateMissingSnapshots);
router.post('/snapshots/operations/update-all', snapshotController.updateAllSnapshots);
router.post('/snapshots/operations/regenerate-all', snapshotController.regenerateAllSnapshots);

export default router;