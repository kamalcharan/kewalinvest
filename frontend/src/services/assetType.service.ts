// frontend/src/services/assetType.service.ts
// API service for Asset Types (Release 1.1 - Phase 1: Master Data Only)
// NOTE: Customer asset assignments are now handled by investmentPlan.service.ts

import apiService from './api.service';
import { API_ENDPOINTS } from './serviceURLs';
import { AssetType } from '../types/assetType.types';

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

export class AssetTypeService {
  /**
   * Get all asset types (master data)
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
}

// Export singleton instance methods
export const assetTypeService = {
  getAllAssetTypes: AssetTypeService.getAllAssetTypes
};
