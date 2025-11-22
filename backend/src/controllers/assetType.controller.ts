// backend/src/controllers/assetType.controller.ts
// Controller for Asset Types (Release 1.1 - Phase 1)

import { Request, Response } from 'express';
import { AssetTypeService } from '../services/assetType.service';
import { CreateAssetTypeRequest, UpdateAssetTypeRequest } from '../types/assetType.types';

interface AuthenticatedRequest extends Request {
  user?: {
    user_id: number;
    tenant_id: number;
  };
  environment?: 'live' | 'test';
}

export class AssetTypeController {
  private assetTypeService: AssetTypeService;

  constructor() {
    this.assetTypeService = new AssetTypeService();
  }

  /**
   * GET /api/asset-types
   * Get all asset types
   */
  getAllAssetTypes = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const activeOnly = req.query.active_only !== 'false';
      const result = await this.assetTypeService.getAllAssetTypes(activeOnly);

      res.json({
        success: true,
        data: result
      });
    } catch (error: any) {
      console.error('Error fetching asset types:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch asset types',
        message: error.message
      });
    }
  };

  /**
   * GET /api/asset-types/:id
   * Get single asset type by ID
   */
  getAssetTypeById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id);

      if (isNaN(id)) {
        res.status(400).json({
          success: false,
          error: 'Invalid asset type ID'
        });
        return;
      }

      const assetType = await this.assetTypeService.getAssetTypeById(id);

      if (!assetType) {
        res.status(404).json({
          success: false,
          error: 'Asset type not found'
        });
        return;
      }

      res.json({
        success: true,
        data: assetType
      });
    } catch (error: any) {
      console.error('Error fetching asset type:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch asset type',
        message: error.message
      });
    }
  };

  /**
   * GET /api/asset-types/code/:code
   * Get single asset type by code
   */
  getAssetTypeByCode = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const code = req.params.code;

      const assetType = await this.assetTypeService.getAssetTypeByCode(code);

      if (!assetType) {
        res.status(404).json({
          success: false,
          error: 'Asset type not found'
        });
        return;
      }

      res.json({
        success: true,
        data: assetType
      });
    } catch (error: any) {
      console.error('Error fetching asset type:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch asset type',
        message: error.message
      });
    }
  };

  /**
   * POST /api/asset-types
   * Create new asset type (Admin only)
   */
  createAssetType = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const data: CreateAssetTypeRequest = req.body;

      // Validation
      if (!data.asset_type_code || !data.asset_type_name) {
        res.status(400).json({
          success: false,
          error: 'asset_type_code and asset_type_name are required'
        });
        return;
      }

      const assetType = await this.assetTypeService.createAssetType(data);

      res.status(201).json({
        success: true,
        data: assetType,
        message: 'Asset type created successfully'
      });
    } catch (error: any) {
      console.error('Error creating asset type:', error);

      if (error.message.includes('already exists')) {
        res.status(409).json({
          success: false,
          error: error.message
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: 'Failed to create asset type',
        message: error.message
      });
    }
  };

  /**
   * PUT /api/asset-types/:id
   * Update asset type (Admin only)
   */
  updateAssetType = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id);
      const data: UpdateAssetTypeRequest = req.body;

      if (isNaN(id)) {
        res.status(400).json({
          success: false,
          error: 'Invalid asset type ID'
        });
        return;
      }

      const assetType = await this.assetTypeService.updateAssetType(id, data);

      res.json({
        success: true,
        data: assetType,
        message: 'Asset type updated successfully'
      });
    } catch (error: any) {
      console.error('Error updating asset type:', error);

      if (error.message.includes('not found')) {
        res.status(404).json({
          success: false,
          error: error.message
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: 'Failed to update asset type',
        message: error.message
      });
    }
  };

  /**
   * DELETE /api/asset-types/:id
   * Soft delete asset type (Admin only)
   */
  deleteAssetType = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id);

      if (isNaN(id)) {
        res.status(400).json({
          success: false,
          error: 'Invalid asset type ID'
        });
        return;
      }

      await this.assetTypeService.deleteAssetType(id);

      res.json({
        success: true,
        message: 'Asset type deleted successfully'
      });
    } catch (error: any) {
      console.error('Error deleting asset type:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete asset type',
        message: error.message
      });
    }
  };
}

export const assetTypeController = new AssetTypeController();
