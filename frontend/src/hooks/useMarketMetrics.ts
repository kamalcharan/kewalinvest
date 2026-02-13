// frontend/src/hooks/useMarketMetrics.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { toastService } from '../services/toast.service';
import { marketAnalysisService, ReturnTimeSeriesResponse, VolatilityTimeSeriesResponse, DashboardStatisticsApiResponse } from '../services/marketAnalysis.service';
import {
  IndexMetrics,
  IndexDetail,
  MarketAnalysisError
} from '../types/marketAnalysis.types';

// Query Keys for consistent caching and invalidation
export const MARKET_ANALYSIS_QUERY_KEYS = {
  all: ['market-analysis'] as const,
  
  // Metrics
  metrics: () => [...MARKET_ANALYSIS_QUERY_KEYS.all, 'metrics'] as const,
  metric: (indexId: number) => [...MARKET_ANALYSIS_QUERY_KEYS.metrics(), indexId] as const,
  
  // Chart data
  charts: () => [...MARKET_ANALYSIS_QUERY_KEYS.all, 'charts'] as const,
  chart: (indexId: number, granularity: string, timePeriod: string, startDate?: string, endDate?: string) => 
    [...MARKET_ANALYSIS_QUERY_KEYS.charts(), { indexId, granularity, timePeriod, startDate, endDate }] as const,
  
  // Returns time-series
  returns: () => [...MARKET_ANALYSIS_QUERY_KEYS.all, 'returns'] as const,
  indexReturns: (indexId: number, periods?: string[], granularity?: string, startDate?: string, endDate?: string) =>
    [...MARKET_ANALYSIS_QUERY_KEYS.returns(), { indexId, periods, granularity, startDate, endDate }] as const,
  
  // Volatility time-series
  volatility: () => [...MARKET_ANALYSIS_QUERY_KEYS.all, 'volatility'] as const,
  indexVolatility: (indexId: number, granularity?: string, startDate?: string, endDate?: string) =>
    [...MARKET_ANALYSIS_QUERY_KEYS.volatility(), { indexId, granularity, startDate, endDate }] as const,
  
  // Dashboard
  dashboard: () => [...MARKET_ANALYSIS_QUERY_KEYS.all, 'dashboard'] as const,
  dashboardStats: (timePeriod: string) => [...MARKET_ANALYSIS_QUERY_KEYS.dashboard(), 'stats', timePeriod] as const,
  
  // Indices
  indices: () => [...MARKET_ANALYSIS_QUERY_KEYS.all, 'indices'] as const,
  indicesList: (params: any) => [...MARKET_ANALYSIS_QUERY_KEYS.indices(), params] as const,
  indexDetail: (indexId: number) => [...MARKET_ANALYSIS_QUERY_KEYS.indices(), 'detail', indexId] as const,
} as const;

// Enhanced error handling
const handleAPIError = (error: any, defaultMessage: string) => {
  console.error('Market Analysis API Error:', error);
  
  const message = error instanceof MarketAnalysisError 
    ? error.message 
    : defaultMessage;
  
  toastService.error(message);
  return new Error(message);
};

/**
 * Hook to fetch index metrics
 * Gracefully handles 404 (metrics not calculated yet) by returning null
 */
export function useIndexMetrics(indexId: number) {
  const { user } = useAuth();

  return useQuery<IndexMetrics | null, Error>({
    queryKey: MARKET_ANALYSIS_QUERY_KEYS.metric(indexId),
    queryFn: async (): Promise<IndexMetrics | null> => {
      if (!user) {
        throw new Error('Authentication required');
      }

      try {
        return await marketAnalysisService.getIndexMetrics(indexId);
      } catch (error: any) {
        // Handle 404 gracefully - metrics haven't been calculated yet
        if (error?.response?.status === 404 || error?.message?.includes('404')) {
          console.log(`API Error: No calculated metrics available for index ${indexId}. Please run calculations first.`);
          return null; // Return null instead of throwing - this is an expected state
        }
        // For other errors, show error and throw
        throw handleAPIError(error, 'Failed to load index metrics');
      }
    },
    enabled: !!user && !!indexId && indexId > 0,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: false, // Don't retry 404s
    refetchOnWindowFocus: false,
  });
}

/**
 * Hook to fetch time-series returns data for an index
 * UPDATED: Now supports 'weekly' granularity
 */
export function useIndexReturnsTimeSeries(
  indexId: number,
  periods: string[] = ['1m', '3m', '6m', '1y', 'ytd', 'all'],
  granularity: 'daily' | 'weekly' | 'monthly' = 'daily',
  startDate?: string,
  endDate?: string
) {
  const { user } = useAuth();

  return useQuery<ReturnTimeSeriesResponse['data'], Error>({
    queryKey: MARKET_ANALYSIS_QUERY_KEYS.indexReturns(indexId, periods, granularity, startDate, endDate),
    queryFn: async (): Promise<ReturnTimeSeriesResponse['data']> => {
      if (!user) {
        throw new Error('Authentication required');
      }

      try {
        return await marketAnalysisService.getIndexReturnsTimeSeries(
          indexId,
          periods,
          granularity,
          startDate,
          endDate
        );
      } catch (error) {
        throw handleAPIError(error, 'Failed to load returns data');
      }
    },
    enabled: !!user && !!indexId && indexId > 0,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 2,
    refetchOnWindowFocus: false,
  });
}

/**
 * Hook to fetch time-series volatility data for an index
 * UPDATED: Now supports 'weekly' granularity
 */
export function useIndexVolatilityTimeSeries(
  indexId: number,
  granularity: 'daily' | 'weekly' | 'monthly' = 'daily',
  startDate?: string,
  endDate?: string
) {
  const { user } = useAuth();

  return useQuery<VolatilityTimeSeriesResponse['data'], Error>({
    queryKey: MARKET_ANALYSIS_QUERY_KEYS.indexVolatility(indexId, granularity, startDate, endDate),
    queryFn: async (): Promise<VolatilityTimeSeriesResponse['data']> => {
      if (!user) {
        throw new Error('Authentication required');
      }

      try {
        return await marketAnalysisService.getIndexVolatilityTimeSeries(
          indexId,
          granularity,
          startDate,
          endDate
        );
      } catch (error) {
        throw handleAPIError(error, 'Failed to load volatility data');
      }
    },
    enabled: !!user && !!indexId && indexId > 0,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 2,
    refetchOnWindowFocus: false,
  });
}

/**
 * Hook to fetch dashboard statistics
 */
export function useDashboardStatistics(timePeriod: '1m' | '3m' | '6m' | '1y' = '1y') {
  const { user } = useAuth();

  return useQuery<DashboardStatisticsApiResponse['data'], Error>({
    queryKey: MARKET_ANALYSIS_QUERY_KEYS.dashboardStats(timePeriod),
    queryFn: async (): Promise<DashboardStatisticsApiResponse['data']> => {
      if (!user) {
        throw new Error('Authentication required');
      }

      try {
        return await marketAnalysisService.getDashboardStatistics(timePeriod);
      } catch (error) {
        throw handleAPIError(error, 'Failed to load dashboard statistics');
      }
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    retry: 2,
    refetchOnWindowFocus: false,
  });
}

/**
 * Hook to fetch all indices with optional filtering
 */
export function useAllIndices(params?: any) {
  const { user } = useAuth();

  return useQuery<any, Error>({
    queryKey: MARKET_ANALYSIS_QUERY_KEYS.indicesList(params || {}),
    queryFn: async () => {
      if (!user) {
        throw new Error('Authentication required');
      }

      try {
        return await marketAnalysisService.getAllIndices(params);
      } catch (error) {
        throw handleAPIError(error, 'Failed to load indices');
      }
    },
    enabled: !!user,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: 2,
    refetchOnWindowFocus: false,
  });
}

/**
 * Hook to fetch single index detail
 */
export function useIndexDetail(indexId: number) {
  const { user } = useAuth();

  return useQuery<IndexDetail | null, Error>({
    queryKey: MARKET_ANALYSIS_QUERY_KEYS.indexDetail(indexId),
    queryFn: async (): Promise<IndexDetail | null> => {
      if (!user) {
        throw new Error('Authentication required');
      }

      try {
        return await marketAnalysisService.getIndexById(indexId);
      } catch (error) {
        throw handleAPIError(error, 'Failed to load index details');
      }
    },
    enabled: !!user && !!indexId && indexId > 0,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: 2,
  });
}

/**
 * Legacy hook - fetch index returns for multiple periods (returns latest values)
 * @deprecated Use useIndexReturnsTimeSeries instead
 */
export function useIndexReturns(indexId: number) {
  const { user } = useAuth();

  return useQuery<Record<string, number | null>, Error>({
    queryKey: MARKET_ANALYSIS_QUERY_KEYS.indexReturns(indexId),
    queryFn: async (): Promise<Record<string, number | null>> => {
      if (!user) {
        throw new Error('Authentication required');
      }

      try {
        return await marketAnalysisService.getIndexReturns(
          indexId,
          ['1m', '3m', '6m', '1y', 'ytd', 'all']
        );
      } catch (error) {
        throw handleAPIError(error, 'Failed to load index returns');
      }
    },
    enabled: !!user && !!indexId && indexId > 0,
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    retry: 2,
  });
}

/**
 * Legacy hook - fetch index volatility metrics (returns latest values)
 * @deprecated Use useIndexVolatilityTimeSeries instead
 */
export function useIndexVolatility(indexId: number) {
  const { user } = useAuth();

  return useQuery<any, Error>({
    queryKey: MARKET_ANALYSIS_QUERY_KEYS.indexVolatility(indexId),
    queryFn: async () => {
      if (!user) {
        throw new Error('Authentication required');
      }

      try {
        return await marketAnalysisService.getIndexVolatility(indexId);
      } catch (error) {
        throw handleAPIError(error, 'Failed to load volatility data');
      }
    },
    enabled: !!user && !!indexId && indexId > 0,
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    retry: 2,
  });
}

/**
 * Mutation to calculate metrics for an index
 */
export function useCalculateMetrics() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation<any, Error, number>({
    mutationFn: async (indexId: number) => {
      if (!user) {
        throw new Error('Authentication required');
      }

      try {
        const response = await marketAnalysisService.calculateMetrics({
          index_id: indexId,
          recalculate: false
        });

        if (!response.success) {
          throw new Error(response.error || 'Calculation failed');
        }

        return response;
      } catch (error) {
        throw handleAPIError(error, 'Failed to calculate metrics');
      }
    },
    onSuccess: (_, indexId) => {
      // Invalidate related queries so they refetch with new data
      queryClient.invalidateQueries({ queryKey: MARKET_ANALYSIS_QUERY_KEYS.metric(indexId) });
      queryClient.invalidateQueries({ queryKey: MARKET_ANALYSIS_QUERY_KEYS.dashboardStats('1m') });
      queryClient.invalidateQueries({ queryKey: MARKET_ANALYSIS_QUERY_KEYS.dashboardStats('3m') });
      queryClient.invalidateQueries({ queryKey: MARKET_ANALYSIS_QUERY_KEYS.dashboardStats('6m') });
      queryClient.invalidateQueries({ queryKey: MARKET_ANALYSIS_QUERY_KEYS.dashboardStats('1y') });
      queryClient.invalidateQueries({ queryKey: MARKET_ANALYSIS_QUERY_KEYS.returns() });
      queryClient.invalidateQueries({ queryKey: MARKET_ANALYSIS_QUERY_KEYS.volatility() });
      
      toastService.success('Metrics calculated successfully');
    },
    onError: (error) => {
      handleAPIError(error, 'Failed to calculate metrics');
    }
  });
}

/**
 * Mutation to calculate metrics for multiple indices in bulk
 */
export function useBulkCalculateMetrics() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation<
    {
      success: boolean;
      summary: {
        total_indices: number;
        successful: number;
        failed: number;
        total_records_processed: number;
        total_time_ms: number;
        average_time_per_index_ms: number;
      };
      results: Array<{
        index_id: number;
        index_name: string;
        success: boolean;
        records_processed: number;
        error?: string;
        calculation_time_ms: number;
      }>;
      message: string;
    },
    Error,
    {
      indexIds: number[];
      recalculate?: boolean;
    }
  >({
    mutationFn: async (params) => {
      if (!user) {
        throw new Error('Authentication required');
      }

      if (!params.indexIds || params.indexIds.length === 0) {
        throw new Error('No index IDs provided');
      }

      if (params.indexIds.length > 50) {
        throw new Error('Maximum 50 indices can be calculated at once');
      }

      try {
        const response = await marketAnalysisService.bulkCalculateMetrics(
          params.indexIds,
          params.recalculate || false
        );

        if (!response.success) {
          throw new Error('Bulk calculation failed');
        }

        return response;
      } catch (error) {
        throw handleAPIError(error, 'Failed to perform bulk metrics calculation');
      }
    },
    onSuccess: (data, params) => {
      // Invalidate metrics for all successfully calculated indices
      params.indexIds.forEach(indexId => {
        queryClient.invalidateQueries({ queryKey: MARKET_ANALYSIS_QUERY_KEYS.metric(indexId) });
        queryClient.invalidateQueries({ queryKey: MARKET_ANALYSIS_QUERY_KEYS.indexReturns(indexId) });
        queryClient.invalidateQueries({ queryKey: MARKET_ANALYSIS_QUERY_KEYS.indexVolatility(indexId) });
      });

      // Invalidate dashboard stats
      queryClient.invalidateQueries({ queryKey: MARKET_ANALYSIS_QUERY_KEYS.dashboardStats('1m') });
      queryClient.invalidateQueries({ queryKey: MARKET_ANALYSIS_QUERY_KEYS.dashboardStats('3m') });
      queryClient.invalidateQueries({ queryKey: MARKET_ANALYSIS_QUERY_KEYS.dashboardStats('6m') });
      queryClient.invalidateQueries({ queryKey: MARKET_ANALYSIS_QUERY_KEYS.dashboardStats('1y') });

      // Show success toast with summary
      const { summary } = data;
      if (summary.failed === 0) {
        toastService.success(
          `Bulk calculation completed! ${summary.successful} indices processed successfully. ${summary.total_records_processed.toLocaleString()} records calculated.`
        );
      } else {
        toastService.warning(
          `Bulk calculation completed with issues. ${summary.successful} successful, ${summary.failed} failed.`
        );
      }
    },
    onError: (error) => {
      handleAPIError(error, 'Failed to calculate metrics in bulk');
    }
  });
}

/**
 * Mutation to export chart data as CSV
 */
export function useExportChartData() {
  const { user } = useAuth();

  return useMutation<Blob, Error, {
    indexId: number;
    granularity: 'daily' | 'weekly' | 'monthly';
    timePeriod: string;
    startDate?: string;
    endDate?: string;
  }>({
    mutationFn: async (params) => {
      if (!user) {
        throw new Error('Authentication required');
      }

      try {
        return await marketAnalysisService.exportChartDataAsCSV(
          params.indexId,
          params.granularity,
          params.timePeriod,
          params.startDate,
          params.endDate
        );
      } catch (error) {
        throw handleAPIError(error, 'Failed to export data');
      }
    },
    onSuccess: () => {
      toastService.success('Data exported successfully');
    },
    onError: (error) => {
      handleAPIError(error, 'Failed to export chart data');
    }
  });
}

/**
 * Helper functions for cache management
 * Useful for bot interactions and prefetching
 */
export const marketAnalysisQueryHelpers = {
  getCachedMetrics: (queryClient: any, indexId: number) => {
    return queryClient.getQueryData(MARKET_ANALYSIS_QUERY_KEYS.metric(indexId));
  },

  getCachedReturnsTimeSeries: (queryClient: any, indexId: number, periods?: string[], granularity?: string, startDate?: string, endDate?: string) => {
    return queryClient.getQueryData(
      MARKET_ANALYSIS_QUERY_KEYS.indexReturns(indexId, periods, granularity, startDate, endDate)
    );
  },

  getCachedVolatilityTimeSeries: (queryClient: any, indexId: number, granularity?: string, startDate?: string, endDate?: string) => {
    return queryClient.getQueryData(
      MARKET_ANALYSIS_QUERY_KEYS.indexVolatility(indexId, granularity, startDate, endDate)
    );
  },

  getCachedDashboardStats: (queryClient: any, timePeriod: string) => {
    return queryClient.getQueryData(MARKET_ANALYSIS_QUERY_KEYS.dashboardStats(timePeriod));
  },

  getCachedIndex: (queryClient: any, indexId: number) => {
    return queryClient.getQueryData(MARKET_ANALYSIS_QUERY_KEYS.indexDetail(indexId));
  },

  getCachedIndices: (queryClient: any, params?: any) => {
    return queryClient.getQueryData(MARKET_ANALYSIS_QUERY_KEYS.indicesList(params || {}));
  },

  prefetchIndexMetrics: async (queryClient: any, indexId: number) => {
    await queryClient.prefetchQuery({
      queryKey: MARKET_ANALYSIS_QUERY_KEYS.metric(indexId),
      staleTime: 5 * 60 * 1000
    });
  },

  prefetchReturnsTimeSeries: async (queryClient: any, indexId: number, periods?: string[], granularity?: string, startDate?: string, endDate?: string) => {
    await queryClient.prefetchQuery({
      queryKey: MARKET_ANALYSIS_QUERY_KEYS.indexReturns(indexId, periods, granularity, startDate, endDate),
      staleTime: 5 * 60 * 1000
    });
  },

  prefetchVolatilityTimeSeries: async (queryClient: any, indexId: number, granularity?: string, startDate?: string, endDate?: string) => {
    await queryClient.prefetchQuery({
      queryKey: MARKET_ANALYSIS_QUERY_KEYS.indexVolatility(indexId, granularity, startDate, endDate),
      staleTime: 5 * 60 * 1000
    });
  },

  prefetchDashboardStats: async (queryClient: any, timePeriod: string) => {
    await queryClient.prefetchQuery({
      queryKey: MARKET_ANALYSIS_QUERY_KEYS.dashboardStats(timePeriod),
      staleTime: 5 * 60 * 1000
    });
  },

  invalidateIndexMetrics: (queryClient: any, indexId: number) => {
    queryClient.invalidateQueries({ queryKey: MARKET_ANALYSIS_QUERY_KEYS.metric(indexId) });
  },

  invalidateReturnsTimeSeries: (queryClient: any, indexId?: number) => {
    if (indexId) {
      queryClient.invalidateQueries({ queryKey: MARKET_ANALYSIS_QUERY_KEYS.indexReturns(indexId) });
    } else {
      queryClient.invalidateQueries({ queryKey: MARKET_ANALYSIS_QUERY_KEYS.returns() });
    }
  },

  invalidateVolatilityTimeSeries: (queryClient: any, indexId?: number) => {
    if (indexId) {
      queryClient.invalidateQueries({ queryKey: MARKET_ANALYSIS_QUERY_KEYS.indexVolatility(indexId) });
    } else {
      queryClient.invalidateQueries({ queryKey: MARKET_ANALYSIS_QUERY_KEYS.volatility() });
    }
  },

  invalidateAllDashboard: (queryClient: any) => {
    queryClient.invalidateQueries({ queryKey: MARKET_ANALYSIS_QUERY_KEYS.dashboard() });
  },

  invalidateAllMetrics: (queryClient: any) => {
    queryClient.invalidateQueries({ queryKey: MARKET_ANALYSIS_QUERY_KEYS.metrics() });
  },

  invalidateAll: (queryClient: any) => {
    queryClient.invalidateQueries({ queryKey: MARKET_ANALYSIS_QUERY_KEYS.all });
  }
};