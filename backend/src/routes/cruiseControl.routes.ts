// backend/src/routes/cruiseControl.routes.ts

import { Router } from 'express';
import { PortfolioSnapshotController } from '../controllers/portfolioSnapshot.controller';
import { authMiddleware } from '../middleware/auth.middleware'; 
import { environmentMiddleware } from '../middleware/environment.middleware';
import { jobSchedulerService } from '../services/jobScheduler.service';

const router = Router();
const controller = new PortfolioSnapshotController(jobSchedulerService);

// Apply middleware globally
router.use(authMiddleware);
router.use(environmentMiddleware);

// Config routes
router.get('/snapshots/config', controller.getConfig);
router.post('/snapshots/config', controller.createConfig);
router.put('/snapshots/config', controller.updateConfig);

// Execution routes
router.post('/snapshots/execute', controller.triggerManual);
router.get('/snapshots/executions', controller.getExecutions);
router.get('/snapshots/statistics', controller.getStatistics);

// Backfill routes
router.post('/snapshots/backfill-smart', controller.smartBackfill);
router.post('/snapshots/backfill', controller.backfillSnapshots);

// Health check
router.get('/snapshots/health', controller.healthCheck);

// ==================== ADD THESE NEW OPERATION ROUTES ====================
router.post('/snapshots/operations/drop-all', controller.dropAllSnapshots);
router.post('/snapshots/operations/generate-missing', controller.generateMissingSnapshots);
router.post('/snapshots/operations/update-all', controller.updateAllSnapshots);
router.post('/snapshots/operations/regenerate-all', controller.regenerateAllSnapshots);

export default router;