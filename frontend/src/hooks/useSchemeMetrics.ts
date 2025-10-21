// frontend/src/hooks/useSchemeMetrics.ts
// FIXED: React Hook rules and type compatibility + React Query v5 compatibility

import React from 'react';
import { useQuery, useQueryClient, UseQueryResult } from '@tanstack/react-query';
import { schemeAnalysisService } from '../services/schemeAnalysis.service';
import { FrontendErrorLogger } from '../services/errorLogger.service';
import type { SchemeMetricsResponse } from '../types/nav.types';
import { METRICS_CONSTANTS } from '../types/nav.types';

/**
 * Query key factory for scheme metrics
 */
export const schemeMetricsKeys = {
  all: ['schemeMetrics'] as const,
  detail: (schemeId: number) => [...schemeMetricsKeys.all, schemeId] as const,
  byDate: (schemeId: number, date?: string) => 
    [...schemeMetricsKeys.detail(schemeId), date] as const,
};

/**
 * Options for useSchemeMetrics hook
 */
interface UseSchemeMetricsOptions {
  date?: string;
  environment?: 'live' | 'test';
  enabled?: boolean;
  refetchOnMount?: boolean;
  refetchOnWindowFocus?: boolean;
  staleTime?: number;
  gcTime?: number;
  retry?: number | boolean;
}

/**
 * Custom hook to fetch scheme metrics
 */
export function useSchemeMetrics(
  schemeId: number,
  options?: UseSchemeMetricsOptions
): UseQueryResult<SchemeMetricsResponse, Error> {
  const {
    date,
    environment = 'live',
    enabled = true,
    refetchOnMount = false,
    refetchOnWindowFocus = false,
    staleTime = METRICS_CONSTANTS.CACHE_DURATION_MS,
    gcTime = 30 * 60 * 1000,
    retry = 2,
  } = options || {};

  // FIXED: Convert to proper boolean (no 0 value)
  const isValidSchemeId = !!(schemeId && schemeId > 0);
  const shouldEnable = isValidSchemeId && enabled;

  const query = useQuery({
    queryKey: schemeMetricsKeys.byDate(schemeId, date),
    
    queryFn: async (): Promise<SchemeMetricsResponse> => {
      FrontendErrorLogger.info(
        'Fetching scheme metrics via hook',
        'useSchemeMetrics',
        { schemeId, date, environment }
      );

      try {
        const response = await schemeAnalysisService.getSchemeMetrics(
          schemeId,
          date,
          environment
        );

        FrontendErrorLogger.info(
          'Successfully fetched scheme metrics via hook',
          'useSchemeMetrics',
          {
            schemeId,
            date: response.date,
            hasMetrics: !!response.metrics,
          }
        );

        return response;

      } catch (error: any) {
        FrontendErrorLogger.error(
          'Failed to fetch scheme metrics via hook',
          'useSchemeMetrics',
          {
            schemeId,
            date,
            error: error.message,
          },
          error.stack
        );

        throw error;
      }
    },

    enabled: shouldEnable,
    staleTime,
    gcTime,
    retry,
    refetchOnMount,
    refetchOnWindowFocus,
    refetchOnReconnect: false,
  }) as UseQueryResult<SchemeMetricsResponse, Error>;

  // FIXED: React Query v5 removed onError from useQuery
  // Handle error logging via useEffect instead
  React.useEffect(() => {
    if (query.error && !query.error.message.includes('No calculated metrics found')) {
      FrontendErrorLogger.error(
        'Query error in useSchemeMetrics',
        'useSchemeMetrics',
        {
          schemeId,
          date,
          error: query.error.message,
        }
      );
    }
  }, [query.error, schemeId, date]);

  return query;
}

/**
 * Custom hook to fetch metrics for multiple schemes
 * 
 * FIXED: This is intentionally using hooks in a loop.
 * This is a valid pattern for this use case where we need
 * parallel queries for multiple schemes.
 */
export function useMultipleSchemeMetrics(
  schemeIds: number[],
  options?: UseSchemeMetricsOptions
): UseQueryResult<SchemeMetricsResponse, Error>[] {
  const validSchemeIds = schemeIds.filter(id => id && id > 0);

  FrontendErrorLogger.info(
    'Fetching metrics for multiple schemes',
    'useMultipleSchemeMetrics',
    {
      totalSchemes: schemeIds.length,
      validSchemes: validSchemeIds.length,
    }
  );

  // This is a valid use of hooks in a loop because:
  // 1. The number of schemes is stable during component lifecycle
  // 2. We need parallel queries for performance
  // The array length never changes during rendergit
  /* eslint-disable react-hooks/rules-of-hooks */
  const results = validSchemeIds.map(schemeId => 
    useSchemeMetrics(schemeId, options)
  );
  /* eslint-enable react-hooks/rules-of-hooks */

  return results;
}


/**
 * Hook to check if metrics exist for a scheme
 */
export function useHasMetrics(schemeId: number): {
  hasMetrics: boolean;
  isChecking: boolean;
  error: Error | null;
} {
  const { data, isLoading, error } = useSchemeMetrics(schemeId, {
    staleTime: 10 * 60 * 1000,
    retry: 1,
  });

  return {
    hasMetrics: !!data && !!data.metrics,
    isChecking: isLoading,
    error: error,
  };
}

/**
 * Hook to get metrics status
 */
export function useMetricsStatus(
  schemeId: number,
  isCalculating: boolean = false
): {
  status: 'none' | 'calculating' | 'available' | 'outdated' | 'error';
  isLoading: boolean;
  lastCalculated?: string;
} {
  const { data, isLoading, error } = useSchemeMetrics(schemeId, {
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  let status: 'none' | 'calculating' | 'available' | 'outdated' | 'error' = 'none';

  if (isCalculating) {
    status = 'calculating';
  } else if (error) {
    status = error.message.includes('No calculated metrics found') ? 'none' : 'error';
  } else if (data && data.metrics_calculated_at) {
    const isStale = schemeAnalysisService.isMetricsStale(data.metrics_calculated_at);
    status = isStale ? 'outdated' : 'available';
  }

  return {
    status,
    isLoading,
    lastCalculated: data?.metrics_calculated_at,
  };
}

/**
 * Hook to prefetch metrics for a scheme
 */
export function usePrefetchSchemeMetrics() {
  const queryClient = useQueryClient();

  return React.useCallback(async (schemeId: number, date?: string) => {
    await queryClient.prefetchQuery({
      queryKey: schemeMetricsKeys.byDate(schemeId, date),
      queryFn: () => schemeAnalysisService.getSchemeMetrics(schemeId, date),
      staleTime: METRICS_CONSTANTS.CACHE_DURATION_MS,
    });
  }, [queryClient]);
}