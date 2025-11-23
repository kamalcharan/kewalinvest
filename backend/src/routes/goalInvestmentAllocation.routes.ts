// backend/src/routes/goalInvestmentAllocation.routes.ts
// Phase 2: Routes for goal-investment allocation

import { Router } from 'express';
import { GoalInvestmentAllocationController } from '../controllers/goalInvestmentAllocation.controller';
import { authenticate } from '../middleware/auth';

const router = Router();
const controller = new GoalInvestmentAllocationController();

// Goal allocation endpoints
router.post('/goals/:goalId/allocations', authenticate, controller.allocateInvestment);
router.get('/goals/:goalId/allocations', authenticate, controller.getGoalAllocations);
router.put('/goals/:goalId/allocations/:allocationId', authenticate, controller.updateAllocation);
router.delete('/goals/:goalId/allocations/:allocationId', authenticate, controller.removeAllocation);

// Goal calculations
router.get('/goals/:goalId/calculations', authenticate, controller.getGoalCalculations);
router.get('/goals/:goalId/asset-breakdown', authenticate, controller.getAssetBreakdown);

// Investment plan to goals lookup
router.get('/investments/:investmentPlanId/goals', authenticate, controller.getInvestmentGoals);

export default router;
