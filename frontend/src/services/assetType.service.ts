// frontend/src/services/assetType.service.ts
// API service for Asset Types (Release 1.1 - Phase 1)

import apiService from './api.service';
import { AssetType, CustomerAssetAssignment } from '../types/assetType.types';

export const assetTypeService = {
  // Get all asset types
  async getAllAssetTypes(activeOnly: boolean = true): Promise<AssetType[]> {
    const response = await apiService.get('/asset-types', {
      params: { active_only: activeOnly }
    });
    return response.data.data.asset_types;
  },

  // Get customer's assigned assets
  async getCustomerAssets(customerId: number): Promise<CustomerAssetAssignment[]> {
    const response = await apiService.get(`/customers/${customerId}/assets`);
    return response.data.data.assignments;
  },

  // Assign assets to customer
  async assignAssets(customerId: number, assetTypeIds: number[], notes?: string): Promise<void> {
    await apiService.post(`/customers/${customerId}/assets/bulk`, {
      asset_type_ids: assetTypeIds,
      notes
    });
  },

  // Remove asset from customer
  async removeAsset(customerId: number, assetTypeId: number): Promise<void> {
    await apiService.delete(`/customers/${customerId}/assets/${assetTypeId}`);
  },

  // Get family assets
  async getFamilyAssets(familyHeadIwellCode: string): Promise<any> {
    const response = await apiService.get(`/family/${familyHeadIwellCode}/assets`);
    return response.data.data;
  }
};
