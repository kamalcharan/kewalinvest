// frontend/src/services/assetType.service.ts
// API service for Asset Types (Release 1.1 - Phase 1)

import apiService from './api.service';
import { API_ENDPOINTS } from './serviceURLs';
import { AssetType, CustomerAssetAssignment } from '../types/assetType.types';

// API Response Types
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

interface AssetTypeListData {
  asset_types: AssetType[];
  total: number;
}

interface CustomerAssetListData {
  assignments: CustomerAssetAssignment[];
  total: number;
}

export class AssetTypeService {
  /**
   * Get all asset types
   */
  static async getAllAssetTypes(activeOnly: boolean = true): Promise<AssetType[]> {
    try {
      const response = await apiService.get<ApiResponse<AssetTypeListData>>(
        API_ENDPOINTS.ASSET_TYPES.LIST,
        { params: { active_only: activeOnly } }
      );
      return response.data?.asset_types || [];
    } catch (error: any) {
      console.error('Failed to get asset types:', error);
      throw error;
    }
  }

  /**
   * Get customer's assigned assets
   */
  static async getCustomerAssets(customerId: number): Promise<CustomerAssetAssignment[]> {
    try {
      const response = await apiService.get<ApiResponse<CustomerAssetListData>>(
        API_ENDPOINTS.ASSET_TYPES.CUSTOMER_ASSETS(customerId)
      );
      return response.data?.assignments || [];
    } catch (error: any) {
      console.error('Failed to get customer assets:', error);
      throw error;
    }
  }

  /**
   * Assign assets to customer
   */
  static async assignAssets(
    customerId: number,
    assetTypeIds: number[],
    notes?: string
  ): Promise<void> {
    try {
      await apiService.post(
        API_ENDPOINTS.ASSET_TYPES.BULK_ASSIGN(customerId),
        {
          asset_type_ids: assetTypeIds,
          notes
        }
      );
    } catch (error: any) {
      console.error('Failed to assign assets:', error);
      throw error;
    }
  }

  /**
   * Remove asset from customer
   */
  static async removeAsset(customerId: number, assetTypeId: number): Promise<void> {
    try {
      await apiService.delete(
        API_ENDPOINTS.ASSET_TYPES.REMOVE_ASSET(customerId, assetTypeId)
      );
    } catch (error: any) {
      console.error('Failed to remove asset:', error);
      throw error;
    }
  }

  /**
   * Get family assets
   */
  static async getFamilyAssets(familyHeadIwellCode: string): Promise<any> {
    try {
      const response = await apiService.get<ApiResponse<any>>(
        API_ENDPOINTS.ASSET_TYPES.FAMILY_ASSETS(familyHeadIwellCode)
      );
      return response.data;
    } catch (error: any) {
      console.error('Failed to get family assets:', error);
      throw error;
    }
  }
}

// Export singleton instance methods
export const assetTypeService = {
  getAllAssetTypes: AssetTypeService.getAllAssetTypes,
  getCustomerAssets: AssetTypeService.getCustomerAssets,
  assignAssets: AssetTypeService.assignAssets,
  removeAsset: AssetTypeService.removeAsset,
  getFamilyAssets: AssetTypeService.getFamilyAssets
};
