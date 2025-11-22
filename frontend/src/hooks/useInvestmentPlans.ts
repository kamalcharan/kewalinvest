// frontend/src/hooks/useInvestmentPlans.ts
// React hook for Investment Plans (Release 1.1 - Phase 1)

import { useState, useEffect, useCallback } from 'react';
import { InvestmentPlan, CreateInvestmentPlanRequest, UpdateInvestmentPlanRequest } from '../types/investmentPlan.types';
import { investmentPlanService } from '../services/investmentPlan.service';

export const useInvestmentPlans = (customerId: number | null) => {
  const [plans, setPlans] = useState<InvestmentPlan[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPlans = useCallback(async () => {
    if (!customerId) return;

    try {
      setLoading(true);
      setError(null);
      const data = await investmentPlanService.getCustomerInvestmentPlans(customerId);
      setPlans(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load investment plans');
      console.error('Error loading investment plans:', err);
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    loadPlans();
  }, [loadPlans]);

  const createPlan = async (data: CreateInvestmentPlanRequest): Promise<InvestmentPlan> => {
    if (!customerId) throw new Error('Customer ID is required');

    try {
      const plan = await investmentPlanService.createInvestmentPlan(customerId, data);
      await loadPlans(); // Reload after creation
      return plan;
    } catch (err: any) {
      setError(err.message || 'Failed to create investment plan');
      throw err;
    }
  };

  const updatePlan = async (id: number, data: UpdateInvestmentPlanRequest): Promise<InvestmentPlan> => {
    if (!customerId) throw new Error('Customer ID is required');

    try {
      const plan = await investmentPlanService.updateInvestmentPlan(customerId, id, data);
      await loadPlans(); // Reload after update
      return plan;
    } catch (err: any) {
      setError(err.message || 'Failed to update investment plan');
      throw err;
    }
  };

  const deletePlan = async (id: number): Promise<void> => {
    if (!customerId) throw new Error('Customer ID is required');

    try {
      await investmentPlanService.deleteInvestmentPlan(customerId, id);
      await loadPlans(); // Reload after deletion
    } catch (err: any) {
      setError(err.message || 'Failed to delete investment plan');
      throw err;
    }
  };

  return {
    plans,
    loading,
    error,
    reload: loadPlans,
    createPlan,
    updatePlan,
    deletePlan
  };
};

/**
 * Hook for getting bookmarked schemes (for MF investment plan creation)
 */
export const useBookmarkedSchemes = () => {
  const [schemes, setSchemes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSchemes();
  }, []);

  const loadSchemes = async () => {
    try {
      setLoading(true);
      setError(null);
      // Import the bookmark service
      const { bookmarkService } = await import('../services/bookmark.service');
      const data = await bookmarkService.getBookmarks();
      setSchemes(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load bookmarked schemes');
      console.error('Error loading bookmarked schemes:', err);
    } finally {
      setLoading(false);
    }
  };

  return {
    schemes,
    loading,
    error,
    reload: loadSchemes
  };
};
