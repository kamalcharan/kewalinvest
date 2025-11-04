// backend/src/routes/family.routes.ts

import { Router } from 'express';
import { FamilyController } from '../controllers/family.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { environmentMiddleware } from '../middleware/environment.middleware';

const router = Router();
const familyController = new FamilyController();

// Apply middleware
router.use(authMiddleware);
router.use(environmentMiddleware);

// Family routes
router.get('/:familyHeadIwellCode/members', familyController.getFamilyMembers);
router.get('/:familyHeadIwellCode/portfolio', familyController.getFamilyPortfolio);
router.get('/:familyHeadIwellCode/asset-allocation', familyController.getFamilyAssetAllocation);
router.get('/:familyHeadIwellCode/goals', familyController.getFamilyGoals);
router.get('/:familyHeadIwellCode/meetings', familyController.getFamilyMeetings);

export default router;
