// frontend/src/hooks/useMetricsCalculation.ts
// FIXED: useMutation syntax errors (missing < bracket)

import React from 'react';
import { useMutation, useQueryClient, UseMutationResult } from '@tanstack/react-query';
import { schemeAnalysisService } from '../services/schemeAnalysis.service';
import { toastService } from '../services/toast.service';
import { FrontendErrorLogger } from '../services/errorLogger.service';
import { schemeMetricsKeys } from './useSchemeMetrics';
import type {
  MetricsCalculationRequest,
  MetricsCalculationResponse,
  SchemeBookmark,
} from '../types/nav.types';

/**
 * Options for metrics calculation mutation
 */
interface UseCalculateMetricsOptions {
  onSuccess?: (data: MetricsCalculationResponse, variables: MetricsCalculationParams) => void;
  onError?: (error: Error, variables: MetricsCalculationParams) => void;
  showToast?: boolean;
}

/**
 * Parameters for metrics calculation
 */
interface MetricsCalculationParams {
  schemeId: number;
  request?: MetricsCalculationRequest;
}

/**
 * Hook to calculate metrics for a single scheme
 */
export function useCalculateMetrics(
  options?: UseCalculateMetricsOptions
): {
  calculate: (schemeId: number, request?: MetricsCalculationRequest) => Promise<MetricsCalculationResponse>;
  isCalculating: boolean;
  error: Error | null;
  reset: () => void;
} {
  const queryClient = useQueryClient();
  const { onSuccess, onError, showToast = true } = options || {};

  // FIXED: Added missing '<' bracket - proper generic syntax
  const mutation = useMutation<MetricsCalculationResponse, Error, MetricsCalculationParams>({
    mutationFn: async ({ schemeId, request }) => {
      FrontendErrorLogger.info(
        'Triggering metrics calculation via hook',
        'useCalculateMetrics',
        { schemeId, request }
      );

      const response = await schemeAnalysisService.calculateMetrics(schemeId, request);

      FrontendErrorLogger.info(
        'Metrics calculation completed via hook',
        'useCalculateMetrics',
        {
          schemeId,
          date: response.date,
          calculationTime: response.calculation_time_ms,
        }
      );

      return response;
    },

    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: schemeMetricsKeys.detail(variables.schemeId)
      });

      if (showToast) {
        toastService.success(
          `Metrics calculated successfully for ${data.date}`
        );
      }

      if (onSuccess) {
        onSuccess(data, variables);
      }
    },

    onError: (error, variables) => {
      FrontendErrorLogger.error(
        'Metrics calculation failed via hook',
        'useCalculateMetrics',
        {
          schemeId: variables.schemeId,
          error: error.message,
        }
      );

      if (showToast) {
        toastService.error(
          `Failed to calculate metrics: ${error.message}`
        );
      }

      if (onError) {
        onError(error, variables);
      }
    },
  });

  const calculate = React.useCallback(
    async (schemeId: number, request?: MetricsCalculationRequest) => {
      return mutation.mutateAsync({ schemeId, request });
    },
    [mutation]
  );

  return {
    calculate,
    isCalculating: mutation.isPending,
    error: mutation.error,
    reset: mutation.reset,
  };
}

/**
 * Parameters for bookmark-based calculation
 */
interface CalculateFromBookmarkParams {
  bookmark: SchemeBookmark;
  request?: MetricsCalculationRequest;
}

/**
 * Hook to calculate metrics from a bookmark object
 */
export function useCalculateMetricsFromBookmark(
  options?: {
    onSuccess?: (data: MetricsCalculationResponse, params: CalculateFromBookmarkParams) => void;
    onError?: (error: Error, params: CalculateFromBookmarkParams) => void;
    showToast?: boolean;
  }
): {
  calculateFromBookmark: (
    bookmark: SchemeBookmark,
    request?: MetricsCalculationRequest
  ) => Promise<MetricsCalculationResponse>;
  isCalculating: boolean;
  error: Error | null;
  reset: () => void;
} {
  const queryClient = useQueryClient();
  const { onSuccess, onError, showToast = true } = options || {};

  // FIXED: Added missing '<' bracket - proper generic syntax
  const mutation = useMutation<MetricsCalculationResponse, Error, CalculateFromBookmarkParams>({
    mutationFn: async ({ bookmark, request }) => {
      FrontendErrorLogger.info(
        'Triggering metrics calculation from bookmark',
        'useCalculateMetricsFromBookmark',
        {
          schemeId: bookmark.scheme_id,
          schemeName: bookmark.scheme_name,
          navRecords: bookmark.nav_records_count,
          request,
        }
      );

      const response = await schemeAnalysisService.calculateMetrics(
        bookmark.scheme_id,
        request
      );

      FrontendErrorLogger.info(
        'Metrics calculation completed from bookmark',
        'useCalculateMetricsFromBookmark',
        {
          schemeId: bookmark.scheme_id,
          schemeName: bookmark.scheme_name,
          date: response.date,
          calculationTime: response.calculation_time_ms,
        }
      );

      return response;
    },

    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: schemeMetricsKeys.detail(variables.bookmark.scheme_id)
      });

      if (showToast) {
        toastService.success(
          `Metrics calculated for ${variables.bookmark.scheme_name}`
        );
      }

      if (onSuccess) {
        onSuccess(data, variables);
      }
    },

    onError: (error, variables) => {
      FrontendErrorLogger.error(
        'Metrics calculation failed from bookmark',
        'useCalculateMetricsFromBookmark',
        {
          schemeId: variables.bookmark.scheme_id,
          schemeName: variables.bookmark.scheme_name,
          error: error.message,
        }
      );

      if (showToast) {
        toastService.error(
          `Failed to calculate metrics for ${variables.bookmark.scheme_name}: ${error.message}`
        );
      }

      if (onError) {
        onError(error, variables);
      }
    },
  });

  const calculateFromBookmark = React.useCallback(
    async (bookmark: SchemeBookmark, request?: MetricsCalculationRequest) => {
      return mutation.mutateAsync({ bookmark, request });
    },
    [mutation]
  );

  return {
    calculateFromBookmark,
    isCalculating: mutation.isPending,
    error: mutation.error,
    reset: mutation.reset,
  };
}

/**
 * Hook to invalidate metrics cache
 */
export function useInvalidateMetrics() {
  const queryClient = useQueryClient();

  return React.useCallback(
    (schemeId?: number) => {
      if (schemeId) {
        queryClient.invalidateQueries({
          queryKey: schemeMetricsKeys.detail(schemeId)
        });

        FrontendErrorLogger.info(
          'Invalidated metrics cache for scheme',
          'useInvalidateMetrics',
          { schemeId }
        );
      } else {
        queryClient.invalidateQueries({
          queryKey: schemeMetricsKeys.all
        });

        FrontendErrorLogger.info(
          'Invalidated all metrics cache',
          'useInvalidateMetrics',
          {}
        );
      }
    },
    [queryClient]
  );
}

/**
 * Hook to manually refetch metrics
 */
export function useRefetchMetrics() {
  const queryClient = useQueryClient();

  return React.useCallback(
    async (schemeId: number, date?: string) => {
      FrontendErrorLogger.info(
        'Manually refetching metrics',
        'useRefetchMetrics',
        { schemeId, date }
      );

      await queryClient.refetchQueries({
        queryKey: schemeMetricsKeys.byDate(schemeId, date)
      });
    },
    [queryClient]
  );
}

/**
 * Hook to get mutation state for a specific scheme
 */
export function useMetricsMutationState(schemeId: number): {
  isPending: boolean;
  submittedAt?: number;
} {
  const queryClient = useQueryClient();

  const mutationState = queryClient.getMutationCache().getAll().find(
    (mutation) => {
      const vars = mutation.state.variables as MetricsCalculationParams | undefined;
      return vars?.schemeId === schemeId;
    }
  );

  return {
    isPending: mutationState?.state.status === 'pending',
    submittedAt: mutationState?.state.submittedAt,
  };
}