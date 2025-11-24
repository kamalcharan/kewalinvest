// backend/src/routes/goal.routes.ts

import { Router } from 'express';
import { GoalController } from '../controllers/goal.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { environmentMiddleware } from '../middleware/environment.middleware';

const router = Router();
const goalController = new GoalController();

// Apply middleware
router.use(authMiddleware);
router.use(environmentMiddleware);

// CRUD operations
router.post('/', goalController.createGoal);
router.get('/customer/:customerId', goalController.getCustomerGoals);
router.get('/:id', goalController.getGoal);
router.put('/:id', goalController.updateGoal);
router.delete('/:id', goalController.deleteGoal);

// Recalculation
router.post('/:id/recalculate', goalController.recalculateGoal);
router.post('/customer/:customerId/recalculate', goalController.recalculateCustomerGoals);

// Summary & History
router.get('/customer/:customerId/summary', goalController.getCustomerGoalSummary);
router.get('/:id/history', goalController.getGoalHistory);

// Tracking Status
router.get('/:id/tracking-status', goalController.getGoalTrackingStatus);
router.get('/customer/:customerId/tracking-status', goalController.getCustomerGoalTrackingStatus);

// Watchlist
router.post('/:id/watchlist', goalController.addToWatchlist);
router.delete('/:id/watchlist', goalController.removeFromWatchlist);
router.get('/customer/:customerId/watchlist', goalController.getWatchlistGoals);

export default router;