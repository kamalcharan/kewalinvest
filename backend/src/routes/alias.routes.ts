// backend/src/routes/alias.routes.ts

import { Router } from 'express';
import { AliasController } from '../controllers/alias.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { environmentMiddleware } from '../middleware/environment.middleware';

const router = Router();
const aliasController = new AliasController();

// Apply middleware
router.use(authMiddleware);
router.use(environmentMiddleware);

// Alias CRUD routes
router.get('/', aliasController.getAliases);
router.get('/customer/:customerId', aliasController.getCustomerAlias);
router.get('/:id', aliasController.getAlias);
router.post('/', aliasController.createAlias);
router.put('/:id', aliasController.updateAlias);
router.delete('/:id', aliasController.deleteAlias);

// Alias member management
router.get('/:id/members', aliasController.getAliasMembers);
router.post('/:id/members', aliasController.addMembers);
router.delete('/:id/members', aliasController.removeMembers);

// Alias aggregation views (read-only)
router.get('/:id/portfolio', aliasController.getAliasPortfolio);
router.get('/:id/asset-allocation', aliasController.getAliasAssetAllocation);
router.get('/:id/goals', aliasController.getAliasGoals);
router.get('/:id/meetings', aliasController.getAliasMeetings);

export default router;
