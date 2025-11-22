// backend/src/controllers/customerAsset.controller.ts
// Controller for Customer Asset Assignments (Release 1.1 - Phase 1)

import { Request, Response } from 'express';
import { customerAssetService } from '../services/customerAsset.service';
import { AssignAssetRequest, BulkAssignAssetRequest, RemoveAssetRequest } from '../types/customerAsset.types';

export class CustomerAssetController {
  /**
   * GET /api/customers/:customerId/assets
   * Get customer's assigned assets
   */
  async getCustomerAssets(req: Request, res: Response): Promise<void> {
    try {
      const customerId = parseInt(req.params.customerId);
      const tenantId = (req as any).tenantId || 1;
      const isLive = (req as any).isLive !== undefined ? (req as any).isLive : true;

      if (isNaN(customerId)) {
        res.status(400).json({
          success: false,
          error: 'Invalid customer ID'
        });
        return;
      }

      const result = await customerAssetService.getCustomerAssets(customerId, tenantId, isLive);

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
  }

  /**
   * POST /api/customers/:customerId/assets
   * Assign asset to customer
   */
  async assignAsset(req: Request, res: Response): Promise<void> {
    try {
      const customerId = parseInt(req.params.customerId);
      const tenantId = (req as any).tenantId || 1;
      const isLive = (req as any).isLive !== undefined ? (req as any).isLive : true;
      const userId = (req as any).userId || 1;

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

      const assignment = await customerAssetService.assignAsset(data, tenantId, isLive, userId);

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
  }

  /**
   * POST /api/customers/:customerId/assets/bulk
   * Bulk assign assets to customer
   */
  async bulkAssignAssets(req: Request, res: Response): Promise<void> {
    try {
      const customerId = parseInt(req.params.customerId);
      const tenantId = (req as any).tenantId || 1;
      const isLive = (req as any).isLive !== undefined ? (req as any).isLive : true;
      const userId = (req as any).userId || 1;

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

      const assignments = await customerAssetService.bulkAssignAssets(data, tenantId, isLive, userId);

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
  }

  /**
   * DELETE /api/customers/:customerId/assets/:assetTypeId
   * Remove asset assignment from customer
   */
  async removeAsset(req: Request, res: Response): Promise<void> {
    try {
      const customerId = parseInt(req.params.customerId);
      const assetTypeId = parseInt(req.params.assetTypeId);
      const tenantId = (req as any).tenantId || 1;
      const isLive = (req as any).isLive !== undefined ? (req as any).isLive : true;

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

      await customerAssetService.removeAsset(data, tenantId, isLive);

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
  }

  /**
   * GET /api/family/:familyHeadId/assets
   * Get family asset summary
   */
  async getFamilyAssets(req: Request, res: Response): Promise<void> {
    try {
      const familyHeadIwellCode = req.params.familyHeadId;
      const tenantId = (req as any).tenantId || 1;
      const isLive = (req as any).isLive !== undefined ? (req as any).isLive : true;

      const result = await customerAssetService.getFamilyAssets(familyHeadIwellCode, tenantId, isLive);

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
  }

  /**
   * POST /api/family/:familyHeadId/assets/bulk
   * Bulk assign assets to all family members
   */
  async bulkAssignToFamily(req: Request, res: Response): Promise<void> {
    try {
      const familyHeadIwellCode = req.params.familyHeadId;
      const tenantId = (req as any).tenantId || 1;
      const isLive = (req as any).isLive !== undefined ? (req as any).isLive : true;
      const userId = (req as any).userId || 1;

      const { asset_type_ids, notes } = req.body;

      if (!asset_type_ids || !Array.isArray(asset_type_ids) || asset_type_ids.length === 0) {
        res.status(400).json({
          success: false,
          error: 'asset_type_ids array is required and must not be empty'
        });
        return;
      }

      const result = await customerAssetService.bulkAssignToFamily(
        familyHeadIwellCode,
        asset_type_ids,
        tenantId,
        isLive,
        userId,
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
  }
}

export const customerAssetController = new CustomerAssetController();
