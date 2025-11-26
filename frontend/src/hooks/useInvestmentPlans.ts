// frontend/src/hooks/useInvestmentPlans.ts
// React hook for Investment Plans (Release 1.1 - Phase 1)

import { useState, useEffect, useCallback } from 'react';
import { InvestmentPlan, CreateInvestmentPlanRequest, UpdateInvestmentPlanRequest } from '../types/investmentPlan.types';
import { investmentPlanService } from '../services/investmentPlan.service';
import { useAuth } from '../contexts/AuthContext';

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

  const toggleAlerts = async (id: number): Promise<{ id: number; alerts_enabled: boolean }> => {
    if (!customerId) throw new Error('Customer ID is required');

    try {
      const result = await investmentPlanService.toggleAlerts(customerId, id);
      // Update local state immediately
      setPlans(prevPlans =>
        prevPlans.map(plan =>
          plan.id === id ? { ...plan, alerts_enabled: result.alerts_enabled } : plan
        )
      );
      return result;
    } catch (err: any) {
      setError(err.message || 'Failed to toggle alerts');
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
    deletePlan,
    toggleAlerts
  };
};

/**
 * Hook for getting bookmarked schemes (for MF investment plan creation)
 */
export const useBookmarkedSchemes = () => {
  const { tenantId, environment } = useAuth();
  const [schemes, setSchemes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (tenantId) {
      loadSchemes();
    }
  }, [tenantId, environment]);

  const loadSchemes = async () => {
    if (!tenantId) return;

    try {
      setLoading(true);
      setError(null);
      // Import the bookmark service
      const BookmarkService = (await import('../services/bookmark.service')).default;
      const isLive = environment === 'live';
      const response = await BookmarkService.getBookmarks(tenantId, isLive);

      // Extract the data array from the API response
      if (response.success && response.data) {
        setSchemes(response.data);
      } else {
        setSchemes([]);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load bookmarked schemes');
      console.error('Error loading bookmarked schemes:', err);
      setSchemes([]);
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
