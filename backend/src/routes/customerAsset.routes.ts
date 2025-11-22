// backend/src/routes/customerAsset.routes.ts
// Routes for Customer Asset Assignments API (Release 1.1 - Phase 1)

import { Router } from 'express';
import { customerAssetController } from '../controllers/customerAsset.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { environmentMiddleware } from '../middleware/environment.middleware';

const router = Router();

// Apply middleware
router.use(authMiddleware);
router.use(environmentMiddleware);

/**
 * GET /api/customers/:customerId/assets
 * Get customer's assigned assets
 */
router.get('/customers/:customerId/assets', customerAssetController.getCustomerAssets);

/**
 * POST /api/customers/:customerId/assets
 * Assign single asset to customer
 * Body: { asset_type_id, notes? }
 */
router.post('/customers/:customerId/assets', customerAssetController.assignAsset);

/**
 * POST /api/customers/:customerId/assets/bulk
 * Bulk assign assets to customer
 * Body: { asset_type_ids: number[], notes? }
 */
router.post('/customers/:customerId/assets/bulk', customerAssetController.bulkAssignAssets);

/**
 * DELETE /api/customers/:customerId/assets/:assetTypeId
 * Remove asset assignment from customer
 */
router.delete('/customers/:customerId/assets/:assetTypeId', customerAssetController.removeAsset);

/**
 * GET /api/family/:familyHeadId/assets
 * Get family asset summary (aggregated across family members)
 */
router.get('/family/:familyHeadId/assets', customerAssetController.getFamilyAssets);

/**
 * POST /api/family/:familyHeadId/assets/bulk
 * Bulk assign assets to all family members
 * Body: { asset_type_ids: number[], notes? }
 */
router.post('/family/:familyHeadId/assets/bulk', customerAssetController.bulkAssignToFamily);

export default router;
