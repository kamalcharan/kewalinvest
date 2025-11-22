// backend/src/routes/customerAsset.routes.ts
// Routes for Customer Asset Assignments API (Release 1.1 - Phase 1)

import express from 'express';
import { customerAssetController } from '../controllers/customerAsset.controller';

const router = express.Router();

/**
 * GET /api/customers/:customerId/assets
 * Get customer's assigned assets
 */
router.get('/customers/:customerId/assets', (req, res) =>
  customerAssetController.getCustomerAssets(req, res)
);

/**
 * POST /api/customers/:customerId/assets
 * Assign single asset to customer
 * Body: { asset_type_id, notes? }
 */
router.post('/customers/:customerId/assets', (req, res) =>
  customerAssetController.assignAsset(req, res)
);

/**
 * POST /api/customers/:customerId/assets/bulk
 * Bulk assign assets to customer
 * Body: { asset_type_ids: number[], notes? }
 */
router.post('/customers/:customerId/assets/bulk', (req, res) =>
  customerAssetController.bulkAssignAssets(req, res)
);

/**
 * DELETE /api/customers/:customerId/assets/:assetTypeId
 * Remove asset assignment from customer
 */
router.delete('/customers/:customerId/assets/:assetTypeId', (req, res) =>
  customerAssetController.removeAsset(req, res)
);

/**
 * GET /api/family/:familyHeadId/assets
 * Get family asset summary (aggregated across family members)
 */
router.get('/family/:familyHeadId/assets', (req, res) =>
  customerAssetController.getFamilyAssets(req, res)
);

/**
 * POST /api/family/:familyHeadId/assets/bulk
 * Bulk assign assets to all family members
 * Body: { asset_type_ids: number[], notes? }
 */
router.post('/family/:familyHeadId/assets/bulk', (req, res) =>
  customerAssetController.bulkAssignToFamily(req, res)
);

export default router;
