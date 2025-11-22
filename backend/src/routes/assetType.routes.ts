// backend/src/routes/assetType.routes.ts
// Routes for Asset Types API (Release 1.1 - Phase 1)

import express from 'express';
import { assetTypeController } from '../controllers/assetType.controller';

const router = express.Router();

/**
 * GET /api/asset-types
 * Get all asset types
 * Query params: active_only (default: true)
 */
router.get('/', (req, res) => assetTypeController.getAllAssetTypes(req, res));

/**
 * GET /api/asset-types/:id
 * Get single asset type by ID
 */
router.get('/:id', (req, res) => assetTypeController.getAssetTypeById(req, res));

/**
 * GET /api/asset-types/code/:code
 * Get single asset type by code
 */
router.get('/code/:code', (req, res) => assetTypeController.getAssetTypeByCode(req, res));

/**
 * POST /api/asset-types
 * Create new asset type (Admin only)
 * Body: { asset_type_code, asset_type_name, category?, default_assumption_rate?, display_order?, description? }
 */
router.post('/', (req, res) => assetTypeController.createAssetType(req, res));

/**
 * PUT /api/asset-types/:id
 * Update asset type (Admin only)
 * Body: { asset_type_name?, category?, default_assumption_rate?, is_active?, display_order?, description? }
 */
router.put('/:id', (req, res) => assetTypeController.updateAssetType(req, res));

/**
 * DELETE /api/asset-types/:id
 * Soft delete asset type (Admin only)
 */
router.delete('/:id', (req, res) => assetTypeController.deleteAssetType(req, res));

export default router;
