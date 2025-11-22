// frontend/src/services/assetType.service.ts
// API service for Asset Types (Release 1.1 - Phase 1)

import axios from 'axios';
import { AssetType, CustomerAssetAssignment } from '../types/assetType.types';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8080';

export const assetTypeService = {
  // Get all asset types
  async getAllAssetTypes(activeOnly: boolean = true): Promise<AssetType[]> {
    const response = await axios.get(`${API_BASE}/api/asset-types`, {
      params: { active_only: activeOnly }
    });
    return response.data.data.asset_types;
  },

  // Get customer's assigned assets
  async getCustomerAssets(customerId: number): Promise<CustomerAssetAssignment[]> {
    const response = await axios.get(`${API_BASE}/api/customers/${customerId}/assets`);
    return response.data.data.assignments;
  },

  // Assign assets to customer
  async assignAssets(customerId: number, assetTypeIds: number[], notes?: string): Promise<void> {
    await axios.post(`${API_BASE}/api/customers/${customerId}/assets/bulk`, {
      asset_type_ids: assetTypeIds,
      notes
    });
  },

  // Remove asset from customer
  async removeAsset(customerId: number, assetTypeId: number): Promise<void> {
    await axios.delete(`${API_BASE}/api/customers/${customerId}/assets/${assetTypeId}`);
  },

  // Get family assets
  async getFamilyAssets(familyHeadIwellCode: string): Promise<any> {
    const response = await axios.get(`${API_BASE}/api/family/${familyHeadIwellCode}/assets`);
    return response.data.data;
  }
};
