// frontend/src/hooks/useGoals.ts

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import toastService from '../services/toast.service';
import apiService from '../services/api.service';
import { API_ENDPOINTS, buildQueryParams, getAPIErrorMessage } from '../services/serviceURLs';
import {
  GoalConfiguration,
  GoalProgressSnapshot,
  GoalSummary,
  GoalRecalculationResult,
  CreateGoalRequest,
  UpdateGoalRequest,
} from '../types/goal.types';

// Query Keys for consistent caching
export const GOAL_QUERY_KEYS = {
  all: ['goals'] as const,
  lists: () => [...GOAL_QUERY_KEYS.all, 'list'] as const,
  customerGoals: (customerId: number) => [...GOAL_QUERY_KEYS.lists(), 'customer', customerId] as const,
  details: () => [...GOAL_QUERY_KEYS.all, 'detail'] as const,
  detail: (id: number) => [...GOAL_QUERY_KEYS.details(), id] as const,
  summaries: () => [...GOAL_QUERY_KEYS.all, 'summary'] as const,
  summary: (customerId: number) => [...GOAL_QUERY_KEYS.summaries(), customerId] as const,
  histories: () => [...GOAL_QUERY_KEYS.all, 'history'] as const,
  history: (goalId: number) => [...GOAL_QUERY_KEYS.histories(), goalId] as const,
} as const;

// Enhanced error handling
const handleAPIError = (error: any, defaultMessage: string) => {
  console.error('Goal API Error:', error);
  
  const message = getAPIErrorMessage(error) || defaultMessage;
  toastService.error(message);
  return new Error(message);
};

// ==================== QUERY HOOKS ====================

/**
 * Hook for getting all goals for a customer
 * Returns list of goals with their configurations and calculated values
 */
export function useCustomerGoals(customerId: number) {
  const { user, tenantId, environment } = useAuth();

  return useQuery<GoalConfiguration[], Error>({
    queryKey: GOAL_QUERY_KEYS.customerGoals(customerId),
    queryFn: async (): Promise<GoalConfiguration[]> => {
      if (!user || !tenantId) {
        throw new Error('Authentication required');
      }

      try {
        const endpoint = `${API_ENDPOINTS.GOALS.GET_CUSTOMER_GOALS(customerId)}${buildQueryParams({}, environment)}`;
        const response = await apiService.get<{ success: boolean; data: GoalConfiguration[]; error?: string }>(endpoint);
        
        if (!response.success) {
          throw new Error(response.error || 'Failed to fetch goals');
        }

        return response.data;
      } catch (error) {
        throw handleAPIError(error, 'Failed to load customer goals');
      }
    },
    enabled: !!user && !!tenantId && !!customerId && customerId > 0,
    staleTime: 60 * 1000, // 1 minute - goals can change with market updates
    gcTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
    refetchOnWindowFocus: false,
  });
}

/**
 * Hook for getting a single goal by ID
 * Returns detailed goal configuration with all calculated values
 */
export function useGoal(goalId: number) {
  const { user, tenantId, environment } = useAuth();

  return useQuery<GoalConfiguration, Error>({
    queryKey: GOAL_QUERY_KEYS.detail(goalId),
    queryFn: async (): Promise<GoalConfiguration> => {
      if (!user || !tenantId) {
        throw new Error('Authentication required');
      }

      try {
        const endpoint = `${API_ENDPOINTS.GOALS.GET(goalId)}${buildQueryParams({}, environment)}`;
        const response = await apiService.get<{ success: boolean; data: GoalConfiguration; error?: string }>(endpoint);
        
        if (!response.success) {
          throw new Error(response.error || 'Goal not found');
        }

        return response.data;
      } catch (error) {
        throw handleAPIError(error, 'Failed to load goal details');
      }
    },
    enabled: !!user && !!tenantId && !!goalId && goalId > 0,
    staleTime: 60 * 1000, // 1 minute
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 1,
  });
}

/**
 * Hook for getting customer goal summary
 * Returns aggregated statistics across all customer goals
 */
export function useGoalSummary(customerId: number) {
  const { user, tenantId, environment } = useAuth();

  return useQuery<GoalSummary, Error>({
    queryKey: GOAL_QUERY_KEYS.summary(customerId),
    queryFn: async (): Promise<GoalSummary> => {
      if (!user || !tenantId) {
        throw new Error('Authentication required');
      }

      try {
        const endpoint = `${API_ENDPOINTS.GOALS.CUSTOMER_SUMMARY(customerId)}${buildQueryParams({}, environment)}`;
        const response = await apiService.get<{ success: boolean; data: GoalSummary; error?: string }>(endpoint);
        
        if (!response.success) {
          throw new Error(response.error || 'Failed to fetch goal summary');
        }

        return response.data;
      } catch (error) {
        throw handleAPIError(error, 'Failed to load goal summary');
      }
    },
    enabled: !!user && !!tenantId && !!customerId && customerId > 0,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
  });
}

/**
 * Hook for getting goal progress history
 * Returns historical snapshots showing how goal has progressed over time
 */
export function useGoalHistory(goalId: number, limit: number = 12) {
  const { user, tenantId, environment } = useAuth();

  return useQuery<GoalProgressSnapshot[], Error>({
    queryKey: [...GOAL_QUERY_KEYS.history(goalId), limit],
    queryFn: async (): Promise<GoalProgressSnapshot[]> => {
      if (!user || !tenantId) {
        throw new Error('Authentication required');
      }

      try {
        const params = { limit: limit.toString() };
        const endpoint = `${API_ENDPOINTS.GOALS.HISTORY(goalId)}${buildQueryParams(params, environment)}`;
        const response = await apiService.get<{ success: boolean; data: GoalProgressSnapshot[]; error?: string }>(endpoint);
        
        if (!response.success) {
          throw new Error(response.error || 'Failed to fetch goal history');
        }

        return response.data;
      } catch (error) {
        throw handleAPIError(error, 'Failed to load goal history');
      }
    },
    enabled: !!user && !!tenantId && !!goalId && goalId > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes - history doesn't change frequently
    gcTime: 30 * 60 * 1000, // 30 minutes
    retry: 1,
  });
}

// ==================== MUTATION HOOKS ====================

/**
 * Mutation for creating a new goal
 * Creates goal and performs initial calculations
 */
export function useCreateGoal() {
  const queryClient = useQueryClient();
  const { user, tenantId, environment } = useAuth();

  return useMutation<GoalConfiguration, Error, CreateGoalRequest>({
    mutationFn: async (goalData: CreateGoalRequest): Promise<GoalConfiguration> => {
      if (!user || !tenantId) {
        throw new Error('Authentication required');
      }

      const endpoint = `${API_ENDPOINTS.GOALS.CREATE}${buildQueryParams({}, environment)}`;
      const response = await apiService.post<{ success: boolean; data: GoalConfiguration; error?: string }>(
        endpoint,
        goalData
      );

      if (!response.success) {
        throw new Error(response.error || 'Failed to create goal');
      }

      return response.data;
    },
    onSuccess: (newGoal) => {
      // Invalidate customer goals list
      queryClient.invalidateQueries({ queryKey: GOAL_QUERY_KEYS.customerGoals(newGoal.customer_id) });
      
      // Invalidate customer summary
      queryClient.invalidateQueries({ queryKey: GOAL_QUERY_KEYS.summary(newGoal.customer_id) });
      
      // Invalidate JTBD lists (since goals appear alongside JTBDs)
      queryClient.invalidateQueries({ queryKey: ['jtbd', 'customer', newGoal.customer_id] });
      
      // Set the new goal in cache
      queryClient.setQueryData(GOAL_QUERY_KEYS.detail(newGoal.id), newGoal);
      
      toastService.success(`Goal "${newGoal.title}" created successfully`);
    },
    onError: (error) => {
      handleAPIError(error, 'Failed to create goal');
    }
  });
}

/**
 * Mutation for updating an existing goal
 * Updates configuration and recalculates projections
 */
export function useUpdateGoal() {
  const queryClient = useQueryClient();
  const { user, tenantId, environment } = useAuth();

  return useMutation<GoalConfiguration, Error, { id: number; data: UpdateGoalRequest }>({
    mutationFn: async ({ id, data }): Promise<GoalConfiguration> => {
      if (!user || !tenantId) {
        throw new Error('Authentication required');
      }

      const endpoint = `${API_ENDPOINTS.GOALS.UPDATE(id)}${buildQueryParams({}, environment)}`;
      const response = await apiService.put<{ success: boolean; data: GoalConfiguration; error?: string }>(
        endpoint,
        data
      );

      if (!response.success) {
        throw new Error(response.error || 'Failed to update goal');
      }

      return response.data;
    },
    onSuccess: (updatedGoal) => {
      // Invalidate customer goals list
      queryClient.invalidateQueries({ queryKey: GOAL_QUERY_KEYS.customerGoals(updatedGoal.customer_id) });
      
      // Invalidate customer summary
      queryClient.invalidateQueries({ queryKey: GOAL_QUERY_KEYS.summary(updatedGoal.customer_id) });
      
      // Invalidate goal history (new snapshot may have been created)
      queryClient.invalidateQueries({ queryKey: GOAL_QUERY_KEYS.history(updatedGoal.id) });
      
      // Invalidate JTBD lists
      queryClient.invalidateQueries({ queryKey: ['jtbd', 'customer', updatedGoal.customer_id] });
      
      // Update the goal in cache
      queryClient.setQueryData(GOAL_QUERY_KEYS.detail(updatedGoal.id), updatedGoal);
      
      toastService.success(`Goal "${updatedGoal.title}" updated successfully`);
    },
    onError: (error) => {
      handleAPIError(error, 'Failed to update goal');
    }
  });
}

/**
 * Mutation for deleting a goal
 * Permanently removes goal and all associated data
 */
export function useDeleteGoal() {
  const queryClient = useQueryClient();
  const { user, tenantId, environment } = useAuth();

  return useMutation<void, Error, { id: number; customerId: number }>({
    mutationFn: async ({ id }): Promise<void> => {
      if (!user || !tenantId) {
        throw new Error('Authentication required');
      }

      const endpoint = `${API_ENDPOINTS.GOALS.DELETE(id)}${buildQueryParams({}, environment)}`;
      const response = await apiService.delete<{ success: boolean; error?: string }>(endpoint);

      if (!response.success) {
        throw new Error(response.error || 'Failed to delete goal');
      }
    },
    onSuccess: (_, { id, customerId }) => {
      // Invalidate customer goals list
      queryClient.invalidateQueries({ queryKey: GOAL_QUERY_KEYS.customerGoals(customerId) });
      
      // Invalidate customer summary
      queryClient.invalidateQueries({ queryKey: GOAL_QUERY_KEYS.summary(customerId) });
      
      // Invalidate JTBD lists
      queryClient.invalidateQueries({ queryKey: ['jtbd', 'customer', customerId] });
      
      // Remove goal from cache
      queryClient.removeQueries({ queryKey: GOAL_QUERY_KEYS.detail(id) });
      
      // Remove goal history from cache
      queryClient.removeQueries({ queryKey: GOAL_QUERY_KEYS.history(id) });
      
      toastService.success('Goal deleted successfully');
    },
    onError: (error) => {
      handleAPIError(error, 'Failed to delete goal');
    }
  });
}

/**
 * Mutation for recalculating a single goal
 * Triggers backend recalculation with latest portfolio data
 */
export function useRecalculateGoal() {
  const queryClient = useQueryClient();
  const { user, tenantId, environment } = useAuth();

  return useMutation<GoalRecalculationResult, Error, number>({
    mutationFn: async (goalId: number): Promise<GoalRecalculationResult> => {
      if (!user || !tenantId) {
        throw new Error('Authentication required');
      }

      const endpoint = `${API_ENDPOINTS.GOALS.RECALCULATE(goalId)}${buildQueryParams({}, environment)}`;
      const response = await apiService.post<{ success: boolean; data: GoalRecalculationResult; error?: string }>(
        endpoint,
        {}
      );

      if (!response.success) {
        throw new Error(response.error || 'Failed to recalculate goal');
      }

      return response.data;
    },
    onSuccess: (result, goalId) => {
      // Invalidate goal detail to get updated calculations
      queryClient.invalidateQueries({ queryKey: GOAL_QUERY_KEYS.detail(goalId) });
      
      // Invalidate goal history (new snapshot created)
      queryClient.invalidateQueries({ queryKey: GOAL_QUERY_KEYS.history(goalId) });
      
      // Get customer ID from the result to invalidate customer-level queries
      const cachedGoal = queryClient.getQueryData<GoalConfiguration>(GOAL_QUERY_KEYS.detail(goalId));
      if (cachedGoal) {
        queryClient.invalidateQueries({ queryKey: GOAL_QUERY_KEYS.customerGoals(cachedGoal.customer_id) });
        queryClient.invalidateQueries({ queryKey: GOAL_QUERY_KEYS.summary(cachedGoal.customer_id) });
      }
      
      // Show alert if any were triggered
      if (result.alerts_triggered && result.alerts_triggered.length > 0) {
        toastService.warning(`Goal recalculated. ${result.alerts_triggered.length} alert(s) triggered.`);
      } else {
        toastService.success('Goal recalculated successfully');
      }
    },
    onError: (error) => {
      handleAPIError(error, 'Failed to recalculate goal');
    }
  });
}

/**
 * Mutation for recalculating all goals for a customer
 * Useful after portfolio updates or bulk recalculation
 */
export function useRecalculateCustomerGoals() {
  const queryClient = useQueryClient();
  const { user, tenantId, environment } = useAuth();

  return useMutation<GoalRecalculationResult[], Error, number>({
    mutationFn: async (customerId: number): Promise<GoalRecalculationResult[]> => {
      if (!user || !tenantId) {
        throw new Error('Authentication required');
      }

      const endpoint = `${API_ENDPOINTS.GOALS.RECALCULATE_CUSTOMER(customerId)}${buildQueryParams({}, environment)}`;
      const response = await apiService.post<{
        success: boolean;
        data: GoalRecalculationResult[];
        message?: string;
        error?: string;
      }>(endpoint, {});

      if (!response.success) {
        throw new Error(response.error || 'Failed to recalculate customer goals');
      }

      return response.data;
    },
    onSuccess: (results, customerId) => {
      // Invalidate all customer goals
      queryClient.invalidateQueries({ queryKey: GOAL_QUERY_KEYS.customerGoals(customerId) });

      // Invalidate customer summary
      queryClient.invalidateQueries({ queryKey: GOAL_QUERY_KEYS.summary(customerId) });

      // Invalidate each goal's detail and history
      results.forEach(result => {
        queryClient.invalidateQueries({ queryKey: GOAL_QUERY_KEYS.detail(result.goal_id) });
        queryClient.invalidateQueries({ queryKey: GOAL_QUERY_KEYS.history(result.goal_id) });
      });

      // Count alerts triggered
      const totalAlerts = results.reduce((sum, r) => sum + (r.alerts_triggered?.length || 0), 0);

      if (totalAlerts > 0) {
        toastService.warning(`Recalculated ${results.length} goal(s). ${totalAlerts} alert(s) triggered.`);
      } else {
        toastService.success(`Successfully recalculated ${results.length} goal(s)`);
      }
    },
    onError: (error) => {
      handleAPIError(error, 'Failed to recalculate customer goals');
    }
  });
}

/**
 * Mutation for adding a goal to watchlist
 * Marks goal for special monitoring and tracking
 */
export function useAddToWatchlist() {
  const queryClient = useQueryClient();
  const { user, tenantId, environment } = useAuth();

  return useMutation<GoalConfiguration, Error, { goalId: number; reason: string }>({
    mutationFn: async ({ goalId, reason }): Promise<GoalConfiguration> => {
      if (!user || !tenantId) {
        throw new Error('Authentication required');
      }

      const endpoint = `${API_ENDPOINTS.GOALS.ADD_TO_WATCHLIST(goalId)}${buildQueryParams({}, environment)}`;
      const response = await apiService.post<{ success: boolean; data: GoalConfiguration; error?: string }>(
        endpoint,
        { reason }
      );

      if (!response.success) {
        throw new Error(response.error || 'Failed to add goal to watchlist');
      }

      return response.data;
    },
    onSuccess: (updatedGoal) => {
      // Get customer ID from the updated goal
      const customerId = updatedGoal.customer_id;

      // Invalidate customer goals list
      queryClient.invalidateQueries({ queryKey: GOAL_QUERY_KEYS.customerGoals(customerId) });

      // Invalidate customer summary
      queryClient.invalidateQueries({ queryKey: GOAL_QUERY_KEYS.summary(customerId) });

      // Update goal detail in cache
      queryClient.setQueryData(GOAL_QUERY_KEYS.detail(updatedGoal.id), updatedGoal);

      toastService.success(`Goal "${updatedGoal.title}" added to watchlist`);
    },
    onError: (error) => {
      handleAPIError(error, 'Failed to add goal to watchlist');
    }
  });
}

/**
 * Mutation for removing a goal from watchlist
 * Removes special monitoring flag from goal
 */
export function useRemoveFromWatchlist() {
  const queryClient = useQueryClient();
  const { user, tenantId, environment } = useAuth();

  return useMutation<GoalConfiguration, Error, number>({
    mutationFn: async (goalId: number): Promise<GoalConfiguration> => {
      if (!user || !tenantId) {
        throw new Error('Authentication required');
      }

      const endpoint = `${API_ENDPOINTS.GOALS.REMOVE_FROM_WATCHLIST(goalId)}${buildQueryParams({}, environment)}`;
      const response = await apiService.delete<{ success: boolean; data: GoalConfiguration; error?: string }>(endpoint);

      if (!response.success) {
        throw new Error(response.error || 'Failed to remove goal from watchlist');
      }

      return response.data;
    },
    onSuccess: (updatedGoal) => {
      // Get customer ID from the updated goal
      const customerId = updatedGoal.customer_id;

      // Invalidate customer goals list
      queryClient.invalidateQueries({ queryKey: GOAL_QUERY_KEYS.customerGoals(customerId) });

      // Invalidate customer summary
      queryClient.invalidateQueries({ queryKey: GOAL_QUERY_KEYS.summary(customerId) });

      // Update goal detail in cache
      queryClient.setQueryData(GOAL_QUERY_KEYS.detail(updatedGoal.id), updatedGoal);

      toastService.success(`Goal "${updatedGoal.title}" removed from watchlist`);
    },
    onError: (error) => {
      handleAPIError(error, 'Failed to remove goal from watchlist');
    }
  });
}

// ==================== CLIENT-SIDE CALCULATION HOOKS ====================

/**
 * Client-side goal projection calculator
 * Useful for real-time form feedback without API calls
 */
export function useGoalProjection() {
  /**
   * Calculate Future Value of investment
   * FV = PV(1+r)^n + PMT × [((1+r)^n - 1) / r] × (1+r)
   */
  const calculateFutureValue = (
    currentValue: number,
    monthlyContribution: number,
    annualReturnRate: number,
    months: number
  ): number => {
    if (months <= 0) return currentValue;
    
    const monthlyRate = annualReturnRate / 12 / 100;
    
    // Future value of current corpus
    const fvLumpSum = currentValue * Math.pow(1 + monthlyRate, months);
    
    // Future value of monthly SIPs
    const fvAnnuity = monthlyContribution * 
      (Math.pow(1 + monthlyRate, months) - 1) / monthlyRate * 
      (1 + monthlyRate);
    
    return Math.round(fvLumpSum + fvAnnuity);
  };

  /**
   * Calculate required monthly SIP to reach target
   */
  const calculateRequiredSIP = (
    targetAmount: number,
    currentValue: number,
    annualReturnRate: number,
    months: number
  ): number => {
    if (months <= 0) return 0;
    
    const monthlyRate = annualReturnRate / 12 / 100;
    
    // Future value of current corpus
    const fvCurrent = currentValue * Math.pow(1 + monthlyRate, months);
    
    // Amount needed from SIPs
    const amountNeeded = targetAmount - fvCurrent;
    
    if (amountNeeded <= 0) return 0;
    
    // Calculate required monthly SIP
    const sip = amountNeeded / 
      ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate * (1 + monthlyRate));
    
    return Math.round(Math.max(0, sip));
  };

  /**
   * Calculate months needed to reach target amount
   */
  const calculateMonthsToTarget = (
    targetAmount: number,
    currentValue: number,
    monthlySIP: number,
    annualReturnRate: number
  ): number => {
    if (currentValue >= targetAmount) return 0;
    
    const monthlyRate = annualReturnRate / 12 / 100;
    
    if (monthlySIP === 0) {
      // Only growth on existing corpus
      if (currentValue === 0) return Infinity;
      return Math.ceil(Math.log(targetAmount / currentValue) / Math.log(1 + monthlyRate));
    }
    
    // Iterative approach for finding months
    let months = 1;
    let fv = 0;
    
    while (fv < targetAmount && months < 1200) { // Max 100 years
      fv = calculateFutureValue(currentValue, monthlySIP, annualReturnRate, months);
      if (fv >= targetAmount) break;
      months++;
    }
    
    return months >= 1200 ? Infinity : months;
  };

  /**
   * Calculate inflation-adjusted value
   */
  const calculateInflationAdjusted = (
    futureValue: number,
    inflationRate: number,
    years: number
  ): number => {
    return Math.round(futureValue / Math.pow(1 + inflationRate / 100, years));
  };

  /**
   * Calculate progress percentage
   */
  const calculateProgress = (
    currentValue: number,
    targetAmount: number
  ): number => {
    if (targetAmount === 0) return 0;
    return Math.min(100, Math.round((currentValue / targetAmount) * 100 * 10) / 10);
  };

  /**
   * Calculate gap between projected and target
   */
  const calculateGap = (
    projectedCorpus: number,
    targetAmount: number
  ): { gap: number; percentage: number; status: 'surplus' | 'deficit' | 'on_track' } => {
    const gap = projectedCorpus - targetAmount;
    const percentage = targetAmount > 0 ? Math.round((gap / targetAmount) * 100 * 10) / 10 : 0;
    
    let status: 'surplus' | 'deficit' | 'on_track' = 'on_track';
    if (Math.abs(percentage) < 5) {
      status = 'on_track';
    } else if (percentage > 0) {
      status = 'surplus';
    } else {
      status = 'deficit';
    }
    
    return { gap: Math.round(gap), percentage, status };
  };

  /**
   * Get months difference between two dates
   */
  const getMonthsDifference = (startDate: Date, endDate: Date): number => {
    const years = endDate.getFullYear() - startDate.getFullYear();
    const months = endDate.getMonth() - startDate.getMonth();
    return Math.max(0, years * 12 + months);
  };

  return {
    calculateFutureValue,
    calculateRequiredSIP,
    calculateMonthsToTarget,
    calculateInflationAdjusted,
    calculateProgress,
    calculateGap,
    getMonthsDifference
  };
}

// ==================== HELPER FUNCTIONS ====================

/**
 * Helper functions for cache management and bot-friendly operations
 * These enable NLP-based interactions and programmatic cache access
 */
export const goalQueryHelpers = {
  /**
   * Get cached customer goals without triggering a fetch
   * Useful for bot operations that need instant data
   */
  getCachedCustomerGoals: (queryClient: any, customerId: number): GoalConfiguration[] | undefined => {
    return queryClient.getQueryData(GOAL_QUERY_KEYS.customerGoals(customerId));
  },
  
  /**
   * Get cached single goal without triggering a fetch
   */
  getCachedGoal: (queryClient: any, goalId: number): GoalConfiguration | undefined => {
    return queryClient.getQueryData(GOAL_QUERY_KEYS.detail(goalId));
  },
  
  /**
   * Get cached goal summary without triggering a fetch
   */
  getCachedGoalSummary: (queryClient: any, customerId: number): GoalSummary | undefined => {
    return queryClient.getQueryData(GOAL_QUERY_KEYS.summary(customerId));
  },
  
  /**
   * Get cached goal history without triggering a fetch
   */
  getCachedGoalHistory: (queryClient: any, goalId: number): GoalProgressSnapshot[] | undefined => {
    return queryClient.getQueryData(GOAL_QUERY_KEYS.history(goalId));
  },
  
  /**
   * Prefetch customer goals before they're needed
   * Useful for bot operations that anticipate user actions
   */
  prefetchCustomerGoals: async (queryClient: any, customerId: number) => {
    await queryClient.prefetchQuery({
      queryKey: GOAL_QUERY_KEYS.customerGoals(customerId),
      staleTime: 60 * 1000
    });
  },
  
  /**
   * Prefetch goal summary before it's needed
   */
  prefetchGoalSummary: async (queryClient: any, customerId: number) => {
    await queryClient.prefetchQuery({
      queryKey: GOAL_QUERY_KEYS.summary(customerId),
      staleTime: 2 * 60 * 1000
    });
  },
  
  /**
   * Prefetch goal detail before it's needed
   */
  prefetchGoal: async (queryClient: any, goalId: number) => {
    await queryClient.prefetchQuery({
      queryKey: GOAL_QUERY_KEYS.detail(goalId),
      staleTime: 60 * 1000
    });
  },
  
  /**
   * Invalidate all goal-related queries for a customer
   * Useful when portfolio is updated or major changes occur
   */
  invalidateCustomerGoalQueries: (queryClient: any, customerId: number) => {
    queryClient.invalidateQueries({ queryKey: GOAL_QUERY_KEYS.customerGoals(customerId) });
    queryClient.invalidateQueries({ queryKey: GOAL_QUERY_KEYS.summary(customerId) });
  },
  
  /**
   * Invalidate all goal-related queries for a specific goal
   */
  invalidateGoalQueries: (queryClient: any, goalId: number) => {
    queryClient.invalidateQueries({ queryKey: GOAL_QUERY_KEYS.detail(goalId) });
    queryClient.invalidateQueries({ queryKey: GOAL_QUERY_KEYS.history(goalId) });
  },
  
  /**
   * Check if customer has any goals in cache
   * Useful for conditional rendering without triggering fetch
   */
  hasGoalsInCache: (queryClient: any, customerId: number): boolean => {
    const goals = queryClient.getQueryData(GOAL_QUERY_KEYS.customerGoals(customerId));
    return Array.isArray(goals) && goals.length > 0;
  },
  
  /**
   * Get count of active goals from cache
   * Bot-friendly helper for quick stats
   */
  getActiveGoalsCount: (queryClient: any, customerId: number): number => {
    const goals = queryClient.getQueryData(GOAL_QUERY_KEYS.customerGoals(customerId)) as GoalConfiguration[] | undefined;
    return goals ? goals.filter((g: GoalConfiguration) => g.is_active).length : 0;
  },
  
  /**
   * Get goals by type from cache
   * Bot-friendly helper for filtering
   */
  getGoalsByType: (queryClient: any, customerId: number, goalType: string): GoalConfiguration[] => {
    const goals = queryClient.getQueryData(GOAL_QUERY_KEYS.customerGoals(customerId)) as GoalConfiguration[] | undefined;
    return goals ? goals.filter((g: GoalConfiguration) => g.config_data.goal_type === goalType) : [];
  },
  
  /**
   * Get goals that are behind schedule from cache
   * Bot-friendly helper for alerting
   */
  getGoalsBehindSchedule: (queryClient: any, customerId: number): GoalConfiguration[] => {
    const goals = queryClient.getQueryData(GOAL_QUERY_KEYS.customerGoals(customerId)) as GoalConfiguration[] | undefined;
    return goals ? goals.filter((g: GoalConfiguration) => {
      const config = g.config_data;
      if (config.goal_type === 'time_and_price_goal') {
        return (config as any).on_track === false;
      }
      return false;
    }) : [];
  },
  
  /**
   * Get goals requiring action from cache
   * Bot-friendly helper for prioritization
   */
  getGoalsRequiringAction: (queryClient: any, customerId: number): GoalConfiguration[] => {
    const goals = queryClient.getQueryData(GOAL_QUERY_KEYS.customerGoals(customerId)) as GoalConfiguration[] | undefined;
    return goals ? goals.filter((g: GoalConfiguration) => {
      const config = g.config_data;
      if (config.goal_type === 'time_and_price_goal') {
        return (config as any).action_required && (config as any).action_required !== 'none';
      }
      return false;
    }) : [];
  }
};