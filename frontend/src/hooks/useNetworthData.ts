// frontend/src/hooks/useNetworthData.ts
// Custom hooks for NetworthViewer data fetching - Cycle 3 Frontend

import { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { NetworthService } from '../services/networth.service';
import {
  NetworthSummaryResponse,
  NetworthHistoryResponse,
  NetworthBreakdownResponse,
  NetworthGoalsResponse,
  HistoryGranularity
} from '../types/networth.types';
import { useAuth } from '../contexts/AuthContext';

// ==================== BASIC DATA HOOK ====================

interface UseNetworthDataOptions {
  customerId?: number;
  familyHeadIwellcode?: string;
  autoFetch?: boolean;
}

interface UseNetworthDataReturn {
  summary: NetworthSummaryResponse | null;
  history: NetworthHistoryResponse | null;
  breakdown: NetworthBreakdownResponse | null;
  goals: NetworthGoalsResponse | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * Main hook for fetching all networth data
 */
export const useNetworthData = (options: UseNetworthDataOptions = {}): UseNetworthDataReturn => {
  const { customerId, familyHeadIwellcode, autoFetch = true } = options;
  const { user, tenantId } = useAuth();

  const [summary, setSummary] = useState<NetworthSummaryResponse | null>(null);
  const [history, setHistory] = useState<NetworthHistoryResponse | null>(null);
  const [breakdown, setBreakdown] = useState<NetworthBreakdownResponse | null>(null);
  const [goals, setGoals] = useState<NetworthGoalsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchNetworthData = useCallback(async () => {
    if (!user || !tenantId) {
      setError(new Error('Authentication required'));
      return;
    }

    if (!customerId && !familyHeadIwellcode) {
      setError(new Error('Either customer_id or family_head_iwellcode is required'));
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const request = {
        customer_id: customerId,
        family_head_iwellcode: familyHeadIwellcode
      };

      // Fetch all data in parallel
      const [summaryRes, historyRes, breakdownRes, goalsRes] = await Promise.all([
        NetworthService.getSummary(request),
        NetworthService.getHistory(request),
        NetworthService.getBreakdown(request),
        NetworthService.getGoals(request)
      ]);

      if (summaryRes.success && summaryRes.data) {
        setSummary(summaryRes.data);
      }
      if (historyRes.success && historyRes.data) {
        setHistory(historyRes.data);
      }
      if (breakdownRes.success && breakdownRes.data) {
        setBreakdown(breakdownRes.data);
      }
      if (goalsRes.success && goalsRes.data) {
        setGoals(goalsRes.data);
      }

    } catch (err: any) {
      console.error('Error fetching networth data:', err);
      setError(err);
    } finally {
      setIsLoading(false);
    }
  }, [customerId, familyHeadIwellcode, user, tenantId]);

  useEffect(() => {
    if (autoFetch && (customerId || familyHeadIwellcode)) {
      fetchNetworthData();
    }
  }, [fetchNetworthData, autoFetch, customerId, familyHeadIwellcode]);

  const refetch = useCallback(() => {
    fetchNetworthData();
  }, [fetchNetworthData]);

  return {
    summary,
    history,
    breakdown,
    goals,
    isLoading,
    error,
    refetch
  };
};

// ==================== INDIVIDUAL DATA HOOKS ====================

/**
 * Hook for fetching networth summary only
 */
export const useNetworthSummary = (
  customerId?: number,
  familyHeadIwellcode?: string,
  options?: { enabled?: boolean }
) => {
  return useQuery({
    queryKey: ['networth', 'summary', customerId, familyHeadIwellcode],
    queryFn: async () => {
      const response = await NetworthService.getSummary({
        customer_id: customerId,
        family_head_iwellcode: familyHeadIwellcode
      });
      if (response.success && response.data) {
        return response.data;
      }
      throw new Error(response.error || 'Failed to fetch networth summary');
    },
    enabled: options?.enabled !== false && (!!customerId || !!familyHeadIwellcode),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000,   // 10 minutes
  });
};

/**
 * Hook for fetching networth history
 */
export const useNetworthHistory = (
  customerId?: number,
  familyHeadIwellcode?: string,
  granularity: HistoryGranularity = 'monthly',
  options?: { enabled?: boolean; startDate?: string; endDate?: string }
) => {
  return useQuery({
    queryKey: ['networth', 'history', customerId, familyHeadIwellcode, granularity, options?.startDate, options?.endDate],
    queryFn: async () => {
      const response = await NetworthService.getHistory({
        customer_id: customerId,
        family_head_iwellcode: familyHeadIwellcode,
        granularity,
        start_date: options?.startDate,
        end_date: options?.endDate
      });
      if (response.success && response.data) {
        return response.data;
      }
      throw new Error(response.error || 'Failed to fetch networth history');
    },
    enabled: options?.enabled !== false && (!!customerId || !!familyHeadIwellcode),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};

/**
 * Hook for fetching networth breakdown
 */
export const useNetworthBreakdown = (
  customerId?: number,
  familyHeadIwellcode?: string,
  assetTypeCodes?: string[],
  options?: { enabled?: boolean }
) => {
  return useQuery({
    queryKey: ['networth', 'breakdown', customerId, familyHeadIwellcode, assetTypeCodes],
    queryFn: async () => {
      const response = await NetworthService.getBreakdown({
        customer_id: customerId,
        family_head_iwellcode: familyHeadIwellcode,
        asset_type_codes: assetTypeCodes
      });
      if (response.success && response.data) {
        return response.data;
      }
      throw new Error(response.error || 'Failed to fetch networth breakdown');
    },
    enabled: options?.enabled !== false && (!!customerId || !!familyHeadIwellcode),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};

/**
 * Hook for fetching networth goals
 */
export const useNetworthGoals = (
  customerId?: number,
  familyHeadIwellcode?: string,
  projectionYears?: number,
  options?: { enabled?: boolean }
) => {
  return useQuery({
    queryKey: ['networth', 'goals', customerId, familyHeadIwellcode, projectionYears],
    queryFn: async () => {
      const response = await NetworthService.getGoals({
        customer_id: customerId,
        family_head_iwellcode: familyHeadIwellcode,
        projection_years: projectionYears
      });
      if (response.success && response.data) {
        return response.data;
      }
      throw new Error(response.error || 'Failed to fetch networth goals');
    },
    enabled: options?.enabled !== false && (!!customerId || !!familyHeadIwellcode),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
};

// ==================== COMBINED VIEW HOOK ====================

interface UseNetworthViewerOptions {
  customerId?: number;
  familyHeadIwellcode?: string;
  enabled?: boolean;
}

interface UseNetworthViewerReturn {
  summary: NetworthSummaryResponse | undefined;
  history: NetworthHistoryResponse | undefined;
  breakdown: NetworthBreakdownResponse | undefined;
  goals: NetworthGoalsResponse | undefined;
  isLoading: boolean;
  isError: boolean;
  errors: {
    summary?: Error;
    history?: Error;
    breakdown?: Error;
    goals?: Error;
  };
  refetch: () => void;
}

/**
 * Combined hook for NetworthViewer component
 * Uses TanStack Query for caching and refetching
 */
export const useNetworthViewer = (options: UseNetworthViewerOptions): UseNetworthViewerReturn => {
  const { customerId, familyHeadIwellcode, enabled = true } = options;

  const summaryQuery = useNetworthSummary(customerId, familyHeadIwellcode, { enabled });
  const historyQuery = useNetworthHistory(customerId, familyHeadIwellcode, 'monthly', { enabled });
  const breakdownQuery = useNetworthBreakdown(customerId, familyHeadIwellcode, undefined, { enabled });
  const goalsQuery = useNetworthGoals(customerId, familyHeadIwellcode, undefined, { enabled });

  const isLoading = summaryQuery.isLoading || historyQuery.isLoading || breakdownQuery.isLoading || goalsQuery.isLoading;
  const isError = summaryQuery.isError || historyQuery.isError || breakdownQuery.isError || goalsQuery.isError;

  const refetch = useCallback(() => {
    summaryQuery.refetch();
    historyQuery.refetch();
    breakdownQuery.refetch();
    goalsQuery.refetch();
  }, [summaryQuery, historyQuery, breakdownQuery, goalsQuery]);

  return {
    summary: summaryQuery.data,
    history: historyQuery.data,
    breakdown: breakdownQuery.data,
    goals: goalsQuery.data,
    isLoading,
    isError,
    errors: {
      summary: summaryQuery.error as Error | undefined,
      history: historyQuery.error as Error | undefined,
      breakdown: breakdownQuery.error as Error | undefined,
      goals: goalsQuery.error as Error | undefined
    },
    refetch
  };
};
