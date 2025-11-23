// frontend/src/hooks/useGoalCalculations.ts
// Phase 2: Hook for fetching goal calculations

import { useState, useEffect, useCallback } from 'react';
import { GoalCalculationResult } from '../types/goal.types';
import GoalInvestmentAllocationService from '../services/goalInvestmentAllocation.service';

export interface UseGoalCalculationsResult {
  calculations: GoalCalculationResult | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export const useGoalCalculations = (goalId: number | null): UseGoalCalculationsResult => {
  const [calculations, setCalculations] = useState<GoalCalculationResult | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCalculations = useCallback(async () => {
    if (!goalId) {
      setCalculations(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await GoalInvestmentAllocationService.getGoalCalculations(goalId);

      if (response.success && response.data) {
        setCalculations(response.data);
        setError(null);
      } else {
        setError(response.error || 'Failed to fetch goal calculations');
        setCalculations(null);
      }
    } catch (err: any) {
      console.error('[useGoalCalculations] Error:', err);
      setError(err.message || 'An unexpected error occurred');
      setCalculations(null);
    } finally {
      setLoading(false);
    }
  }, [goalId]);

  useEffect(() => {
    fetchCalculations();
  }, [fetchCalculations]);

  return {
    calculations,
    loading,
    error,
    refresh: fetchCalculations
  };
};

export default useGoalCalculations;
