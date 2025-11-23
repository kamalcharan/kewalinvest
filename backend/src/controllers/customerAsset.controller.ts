// backend/src/controllers/customerAsset.controller.ts
// Controller for Customer Asset Assignments (Release 1.1 - Phase 1)

import { Request, Response } from 'express';
import { CustomerAssetService } from '../services/customerAsset.service';
import { AssignAssetRequest, BulkAssignAssetRequest, RemoveAssetRequest } from '../types/customerAsset.types';

interface AuthenticatedRequest extends Request {
  user?: {
    user_id: number;
    tenant_id: number;
  };
  environment?: 'live' | 'test';
}

export class CustomerAssetController {
  private customerAssetService: CustomerAssetService;

  constructor() {
    this.customerAssetService = new CustomerAssetService();
  }

  /**
   * GET /api/customers/:customerId/assets
   * Get customer's assigned assets
   */
  getCustomerAssets = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { user, environment } = req;
      const isLive = environment === 'live';
      const customerId = parseInt(req.params.customerId);

      if (isNaN(customerId)) {
        res.status(400).json({
          success: false,
          error: 'Invalid customer ID'
        });
        return;
      }

      const result = await this.customerAssetService.getCustomerAssets(
        customerId,
        user!.tenant_id,
        isLive
      );

      res.json({
        success: true,
        data: result
      });
    } catch (error: any) {
      console.error('Error fetching customer assets:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch customer assets',
        message: error.message
      });
    }
  };

  /**
   * POST /api/customers/:customerId/assets
   * Assign asset to customer
   */
  assignAsset = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { user, environment } = req;
      const isLive = environment === 'live';
      const customerId = parseInt(req.params.customerId);

      if (isNaN(customerId)) {
        res.status(400).json({
          success: false,
          error: 'Invalid customer ID'
        });
        return;
      }

      const { asset_type_id, notes } = req.body;

      if (!asset_type_id) {
        res.status(400).json({
          success: false,
          error: 'asset_type_id is required'
        });
        return;
      }

      const data: AssignAssetRequest = {
        customer_id: customerId,
        asset_type_id,
        notes
      };

      const assignment = await this.customerAssetService.assignAsset(
        data,
        user!.tenant_id,
        isLive,
        user!.user_id
      );

      res.status(201).json({
        success: true,
        data: assignment,
        message: 'Asset assigned successfully'
      });
    } catch (error: any) {
      console.error('Error assigning asset:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to assign asset',
        message: error.message
      });
    }
  };

  /**
   * POST /api/customers/:customerId/assets/bulk
   * Bulk assign assets to customer
   */
  bulkAssignAssets = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { user, environment } = req;
      const isLive = environment === 'live';
      const customerId = parseInt(req.params.customerId);

      if (isNaN(customerId)) {
        res.status(400).json({
          success: false,
          error: 'Invalid customer ID'
        });
        return;
      }

      const { asset_type_ids, notes } = req.body;

      if (!asset_type_ids || !Array.isArray(asset_type_ids) || asset_type_ids.length === 0) {
        res.status(400).json({
          success: false,
          error: 'asset_type_ids array is required and must not be empty'
        });
        return;
      }

      const data: BulkAssignAssetRequest = {
        customer_id: customerId,
        asset_type_ids,
        notes
      };

      const assignments = await this.customerAssetService.bulkAssignAssets(
        data,
        user!.tenant_id,
        isLive,
        user!.user_id
      );

      res.status(201).json({
        success: true,
        data: assignments,
        message: `${assignments.length} asset(s) assigned successfully`
      });
    } catch (error: any) {
      console.error('Error bulk assigning assets:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to bulk assign assets',
        message: error.message
      });
    }
  };

  /**
   * DELETE /api/customers/:customerId/assets/:assetTypeId
   * Remove asset assignment from customer
   */
  removeAsset = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { user, environment } = req;
      const isLive = environment === 'live';
      const customerId = parseInt(req.params.customerId);
      const assetTypeId = parseInt(req.params.assetTypeId);

      if (isNaN(customerId) || isNaN(assetTypeId)) {
        res.status(400).json({
          success: false,
          error: 'Invalid customer ID or asset type ID'
        });
        return;
      }

      const data: RemoveAssetRequest = {
        customer_id: customerId,
        asset_type_id: assetTypeId
      };

      await this.customerAssetService.removeAsset(data, user!.tenant_id, isLive);

      res.json({
        success: true,
        message: 'Asset removed successfully'
      });
    } catch (error: any) {
      console.error('Error removing asset:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to remove asset',
        message: error.message
      });
    }
  };

  /**
   * GET /api/family/:familyHeadId/assets
   * Get family asset summary
   */
  getFamilyAssets = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { user, environment } = req;
      const isLive = environment === 'live';
      const familyHeadIwellCode = req.params.familyHeadId;

      const result = await this.customerAssetService.getFamilyAssets(
        familyHeadIwellCode,
        user!.tenant_id,
        isLive
      );

      res.json({
        success: true,
        data: result
      });
    } catch (error: any) {
      console.error('Error fetching family assets:', error);

      if (error.message.includes('not found')) {
        res.status(404).json({
          success: false,
          error: error.message
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: 'Failed to fetch family assets',
        message: error.message
      });
    }
  };

  /**
   * POST /api/family/:familyHeadId/assets/bulk
   * Bulk assign assets to all family members
   */
  bulkAssignToFamily = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { user, environment } = req;
      const isLive = environment === 'live';
      const familyHeadIwellCode = req.params.familyHeadId;

      const { asset_type_ids, notes } = req.body;

      if (!asset_type_ids || !Array.isArray(asset_type_ids) || asset_type_ids.length === 0) {
        res.status(400).json({
          success: false,
          error: 'asset_type_ids array is required and must not be empty'
        });
        return;
      }

      const result = await this.customerAssetService.bulkAssignToFamily(
        familyHeadIwellCode,
        asset_type_ids,
        user!.tenant_id,
        isLive,
        user!.user_id,
        notes
      );

      res.status(201).json({
        success: true,
        data: result,
        message: `Assigned ${result.assigned_count} assets to ${result.family_member_count} family member(s)`
      });
    } catch (error: any) {
      console.error('Error bulk assigning to family:', error);

      if (error.message.includes('not found')) {
        res.status(404).json({
          success: false,
          error: error.message
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: 'Failed to bulk assign assets to family',
        message: error.message
      });
    }
  };
}

export const customerAssetController = new CustomerAssetController();
