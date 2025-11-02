// backend/src/routes/cruiseControl.routes.ts

import { Router } from 'express';
import { PortfolioSnapshotController } from '../controllers/portfolioSnapshot.controller';
import { authMiddleware } from '../middleware/auth.middleware'; 
import { environmentMiddleware } from '../middleware/environment.middleware';
import { jobSchedulerService } from '../services/jobScheduler.service';

// DELETE THIS LINE:
// const portfolioSnapshotController = new PortfolioSnapshotController(jobSchedulerService);

const router = Router();
// FIX THIS LINE - add jobSchedulerService:
const controller = new PortfolioSnapshotController(jobSchedulerService);

// Apply middleware globally
router.use(authMiddleware);
router.use(environmentMiddleware);

// Routes stay the same
router.get('/snapshots/config', controller.getConfig);
router.post('/snapshots/config', controller.createConfig);
router.put('/snapshots/config', controller.updateConfig);
router.post('/snapshots/execute', controller.triggerManual);
router.get('/snapshots/executions', controller.getExecutions);
router.get('/snapshots/statistics', controller.getStatistics);
router.post('/snapshots/backfill-smart', controller.smartBackfill);
router.post('/snapshots/backfill', controller.backfillSnapshots);
router.get('/snapshots/health', controller.healthCheck);

export default router;