// frontend/src/hooks/useMarketMetrics.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { toastService } from '../services/toast.service';
import { marketAnalysisService } from '../services/marketAnalysis.service';
import {
  IndexMetrics,
  ChartDataPoint,
  GetChartDataRequest,
  DashboardStatistics,
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
  
  // Dashboard
  dashboard: () => [...MARKET_ANALYSIS_QUERY_KEYS.all, 'dashboard'] as const,
  dashboardStats: (timePeriod: string) => [...MARKET_ANALYSIS_QUERY_KEYS.dashboard(), 'stats', timePeriod] as const,
  
  // Indices
  indices: () => [...MARKET_ANALYSIS_QUERY_KEYS.all, 'indices'] as const,
  indicesList: (params: any) => [...MARKET_ANALYSIS_QUERY_KEYS.indices(), params] as const,
  indexDetail: (indexId: number) => [...MARKET_ANALYSIS_QUERY_KEYS.indices(), 'detail', indexId] as const,
  
  // Returns
  returns: () => [...MARKET_ANALYSIS_QUERY_KEYS.all, 'returns'] as const,
  indexReturns: (indexId: number) => [...MARKET_ANALYSIS_QUERY_KEYS.returns(), indexId] as const,
  
  // Volatility
  volatility: () => [...MARKET_ANALYSIS_QUERY_KEYS.all, 'volatility'] as const,
  indexVolatility: (indexId: number) => [...MARKET_ANALYSIS_QUERY_KEYS.volatility(), indexId] as const,
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
      } catch (error) {
        throw handleAPIError(error, 'Failed to load index metrics');
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
 * Hook to fetch chart data with filtering
 */
export function useChartData(request: GetChartDataRequest) {
  const { user } = useAuth();

  return useQuery<any, Error>({
    queryKey: MARKET_ANALYSIS_QUERY_KEYS.chart(
      request.index_id,
      request.granularity,
      request.time_period,
      request.start_date,
      request.end_date
    ),
    queryFn: async () => {
      if (!user) {
        throw new Error('Authentication required');
      }

      try {
        const response = await marketAnalysisService.getChartData(request);
        
        if (!response.success) {
          throw new Error(response.error || 'Failed to fetch chart data');
        }

        return {
          data: response.data || [],
          pagination: response.pagination
        };
      } catch (error) {
        throw handleAPIError(error, 'Failed to load chart data');
      }
    },
    enabled: !!user && !!request.index_id && request.index_id > 0,
    staleTime: 3 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 2,
    refetchOnWindowFocus: false,
  });
}

/**
 * Hook to fetch dashboard statistics
 */
export function useDashboardStatistics(timePeriod: '1m' | '3m' | '6m' | '1y' = '3m') {
  const { user } = useAuth();

  return useQuery<DashboardStatistics | null, Error>({
    queryKey: MARKET_ANALYSIS_QUERY_KEYS.dashboardStats(timePeriod),
    queryFn: async (): Promise<DashboardStatistics | null> => {
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
 * Hook to fetch index returns for multiple periods
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
 * Hook to fetch index volatility metrics
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

        return response.data;
      } catch (error) {
        throw handleAPIError(error, 'Failed to calculate metrics');
      }
    },
    onSuccess: (_, indexId) => {
      queryClient.invalidateQueries({ queryKey: MARKET_ANALYSIS_QUERY_KEYS.metric(indexId) });
      queryClient.invalidateQueries({ queryKey: MARKET_ANALYSIS_QUERY_KEYS.dashboardStats('1m') });
      queryClient.invalidateQueries({ queryKey: MARKET_ANALYSIS_QUERY_KEYS.dashboardStats('3m') });
      queryClient.invalidateQueries({ queryKey: MARKET_ANALYSIS_QUERY_KEYS.dashboardStats('6m') });
      queryClient.invalidateQueries({ queryKey: MARKET_ANALYSIS_QUERY_KEYS.dashboardStats('1y') });
      
      toastService.success('Metrics calculated successfully');
    },
    onError: (error) => {
      handleAPIError(error, 'Failed to calculate metrics');
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

  getCachedChartData: (queryClient: any, indexId: number, granularity: string, timePeriod: string) => {
    return queryClient.getQueryData(
      MARKET_ANALYSIS_QUERY_KEYS.chart(indexId, granularity, timePeriod)
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

  prefetchChartData: async (queryClient: any, request: GetChartDataRequest) => {
    await queryClient.prefetchQuery({
      queryKey: MARKET_ANALYSIS_QUERY_KEYS.chart(
        request.index_id,
        request.granularity,
        request.time_period,
        request.start_date,
        request.end_date
      ),
      staleTime: 3 * 60 * 1000
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

  invalidateAllDashboard: (queryClient: any) => {
    queryClient.invalidateQueries({ queryKey: MARKET_ANALYSIS_QUERY_KEYS.dashboard() });
  },

  invalidateAllCharts: (queryClient: any) => {
    queryClient.invalidateQueries({ queryKey: MARKET_ANALYSIS_QUERY_KEYS.charts() });
  }
};