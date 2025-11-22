// backend/src/routes/assetType.routes.ts
// Routes for Asset Types API (Release 1.1 - Phase 1)

import { Router } from 'express';
import { assetTypeController } from '../controllers/assetType.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { environmentMiddleware } from '../middleware/environment.middleware';

const router = Router();

// Apply middleware
router.use(authMiddleware);
router.use(environmentMiddleware);

/**
 * GET /api/asset-types
 * Get all asset types
 * Query params: active_only (default: true)
 */
router.get('/', assetTypeController.getAllAssetTypes);

/**
 * GET /api/asset-types/:id
 * Get single asset type by ID
 */
router.get('/:id', assetTypeController.getAssetTypeById);

/**
 * GET /api/asset-types/code/:code
 * Get single asset type by code
 */
router.get('/code/:code', assetTypeController.getAssetTypeByCode);

/**
 * POST /api/asset-types
 * Create new asset type (Admin only)
 * Body: { asset_type_code, asset_type_name, category?, default_assumption_rate?, display_order?, description? }
 */
router.post('/', assetTypeController.createAssetType);

/**
 * PUT /api/asset-types/:id
 * Update asset type (Admin only)
 * Body: { asset_type_name?, category?, default_assumption_rate?, is_active?, display_order?, description? }
 */
router.put('/:id', assetTypeController.updateAssetType);

/**
 * DELETE /api/asset-types/:id
 * Soft delete asset type (Admin only)
 */
router.delete('/:id', assetTypeController.deleteAssetType);

export default router;
