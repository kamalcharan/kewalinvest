// frontend/src/hooks/useAssetTypes.ts
// React hook for Asset Types (Release 1.1 - Phase 1: Master Data Only)
// NOTE: Customer asset assignments are now handled by useInvestmentPlans.ts

import { useState, useEffect } from 'react';
import { AssetType } from '../types/assetType.types';
import { assetTypeService } from '../services/assetType.service';

/**
 * Hook for fetching asset types (master data)
 * For customer investment plans, use useInvestmentPlans from hooks/useInvestmentPlans.ts
 */
export const useAssetTypes = (activeOnly: boolean = true) => {
  const [assetTypes, setAssetTypes] = useState<AssetType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // eslint-disable-next-line react-hooks/exhaustive-deps
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
