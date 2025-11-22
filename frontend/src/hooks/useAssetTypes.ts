// frontend/src/hooks/useAssetTypes.ts
// React hook for Asset Types (Release 1.1 - Phase 1)

import { useState, useEffect } from 'react';
import { AssetType } from '../types/assetType.types';
import { assetTypeService } from '../services/assetType.service';

export const useAssetTypes = (activeOnly: boolean = true) => {
  const [assetTypes, setAssetTypes] = useState<AssetType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAssetTypes();
  }, [activeOnly]);

  const loadAssetTypes = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await assetTypeService.getAllAssetTypes(activeOnly);
      setAssetTypes(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load asset types');
      console.error('Error loading asset types:', err);
    } finally {
      setLoading(false);
    }
  };

  return {
    assetTypes,
    loading,
    error,
    reload: loadAssetTypes
  };
};

export const useCustomerAssets = (customerId: number | null) => {
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (customerId) {
      loadAssets();
    }
  }, [customerId]);

  const loadAssets = async () => {
    if (!customerId) return;

    try {
      setLoading(true);
      setError(null);
      const data = await assetTypeService.getCustomerAssets(customerId);
      setAssignments(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load customer assets');
      console.error('Error loading customer assets:', err);
    } finally {
      setLoading(false);
    }
  };

  const assignAssets = async (assetTypeIds: number[], notes?: string) => {
    if (!customerId) return;

    try {
      await assetTypeService.assignAssets(customerId, assetTypeIds, notes);
      await loadAssets(); // Reload after assignment
    } catch (err: any) {
      setError(err.message || 'Failed to assign assets');
      throw err;
    }
  };

  const removeAsset = async (assetTypeId: number) => {
    if (!customerId) return;

    try {
      await assetTypeService.removeAsset(customerId, assetTypeId);
      await loadAssets(); // Reload after removal
    } catch (err: any) {
      setError(err.message || 'Failed to remove asset');
      throw err;
    }
  };

  return {
    assignments,
    loading,
    error,
    reload: loadAssets,
    assignAssets,
    removeAsset
  };
};
