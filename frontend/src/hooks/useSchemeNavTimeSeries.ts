// frontend/src/hooks/useSchemeNavTimeSeries.ts
// React Query hook for fetching NAV time series data
// Transforms API response to ChartViewer-compatible format

import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { schemeAnalysisService } from '../services/schemeAnalysis.service';
import { FrontendErrorLogger } from '../services/errorLogger.service';
import type {
  NavTimeSeriesParams,
  NavTimeSeriesResponse,
  NavTimeSeriesDataPoint
} from '../types/nav.types';
import type { ChartDataPoint } from '../types/chartViewer.types';

/**
 * Query key factory for scheme NAV time series
 */
export const schemeNavTimeSeriesKeys = {
  all: ['schemeNavTimeSeries'] as const,
  byScheme: (schemeId: number) => [...schemeNavTimeSeriesKeys.all, schemeId] as const,
  detail: (schemeId: number, params: NavTimeSeriesParams) =>
    [...schemeNavTimeSeriesKeys.byScheme(schemeId), params] as const,
};

/**
 * Options for useSchemeNavTimeSeries hook
 */
interface UseSchemeNavTimeSeriesOptions extends NavTimeSeriesParams {
  enabled?: boolean;
  refetchOnMount?: boolean;
  refetchOnWindowFocus?: boolean;
  staleTime?: number;
  gcTime?: number;
  retry?: number | boolean;
}

/**
 * Hook return type with transformed data
 */
interface UseSchemeNavTimeSeriesResult {
  // Original API data
  rawData: NavTimeSeriesResponse | undefined;
  
  // Transformed data for ChartViewer
  chartData: ChartDataPoint[];
  
  // Query state
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  error: Error | null;
  
  // Metadata
  totalPoints: number;
  metricsCoverage: number | null;
  dateRange: { start: string; end: string } | null;
}

/**
 * Custom hook to fetch scheme NAV time series data
 * Automatically transforms data to ChartViewer format
 * 
 * @param schemeId - Scheme ID to fetch data for
 * @param options - Query parameters and React Query options
 * @returns Time series data with loading/error states
 * 
 * @example
 * const { chartData, isLoading, metricsCoverage } = useSchemeNavTimeSeries(123, {
 *   granularity: 'weekly',
 *   start_date: '2024-01-01',
 *   end_date: '2024-12-31',
 *   include_metrics: true
 * });
 */
export function useSchemeNavTimeSeries(
  schemeId: number,
  options?: UseSchemeNavTimeSeriesOptions
): UseSchemeNavTimeSeriesResult {
  const {
    start_date,
    end_date,
    granularity = 'daily',
    include_metrics = true,
    enabled = true,
    refetchOnMount = false,
    refetchOnWindowFocus = false,
    staleTime = 5 * 60 * 1000, // 5 minutes
    gcTime = 30 * 60 * 1000,   // 30 minutes
    retry = 2,
  } = options || {};

  // Validate scheme ID
  const isValidSchemeId = !!(schemeId && schemeId > 0);
  const shouldEnable = isValidSchemeId && enabled;

  // Build params for query
  const params: NavTimeSeriesParams = {
    start_date,
    end_date,
    granularity,
    include_metrics,
  };

  // React Query
  const query = useQuery({
    queryKey: schemeNavTimeSeriesKeys.detail(schemeId, params),

    queryFn: async (): Promise<NavTimeSeriesResponse> => {
      FrontendErrorLogger.info(
        'Fetching scheme NAV time series via hook',
        'useSchemeNavTimeSeries',
        { schemeId, params }
      );

      try {
        const response = await schemeAnalysisService.getNavTimeSeries(
          schemeId,
          params
        );

        FrontendErrorLogger.info(
          'Successfully fetched scheme NAV time series via hook',
          'useSchemeNavTimeSeries',
          {
            schemeId,
            granularity: response.granularity,
            totalPoints: response.total_points,
            metricsCoverage: response.metrics_coverage.coverage_percentage,
          }
        );

        return response;
      } catch (error: any) {
        FrontendErrorLogger.error(
          'Failed to fetch scheme NAV time series via hook',
          'useSchemeNavTimeSeries',
          {
            schemeId,
            params,
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
  }) as UseQueryResult<NavTimeSeriesResponse, Error>;

  // Transform data for ChartViewer
  const chartData = transformToChartData(query.data?.data || []);

  // Extract metadata
  const totalPoints = query.data?.total_points || 0;
  const metricsCoverage = query.data?.metrics_coverage.coverage_percentage || null;
  const dateRange = query.data?.date_range
    ? { start: query.data.date_range.start_date, end: query.data.date_range.end_date }
    : null;

  return {
    rawData: query.data,
    chartData,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    totalPoints,
    metricsCoverage,
    dateRange,
  };
}

/**
 * Transform NAV time series data to ChartViewer format
 * NAV doesn't have OHLC data, so we use nav_value for all price fields
 * 
 * @param data - Raw NAV time series data points
 * @returns Transformed data for ChartViewer
 */
function transformToChartData(data: NavTimeSeriesDataPoint[]): ChartDataPoint[] {
  if (!data || data.length === 0) {
    return [];
  }

  return data.map((point) => {
    // Format date for display
    const dateObj = new Date(point.date);
    const formattedDate = dateObj.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

    // NAV doesn't have OHLC - use nav_value for all
    return {
      date: formattedDate,
      value: point.nav_value,
      open: point.nav_value,
      high: point.nav_value,
      low: point.nav_value,
      volume: null, // NAV doesn't have volume
      rawDate: dateObj.getTime(),
    };
  });
}

/**
 * Hook to check if time series data is available
 * Lightweight query for checking data existence
 * 
 * @param schemeId - Scheme ID
 * @returns Data availability status
 */
export function useHasNavTimeSeries(schemeId: number): {
  hasData: boolean;
  isChecking: boolean;
  error: Error | null;
} {
  const { totalPoints, isLoading, error } = useSchemeNavTimeSeries(schemeId, {
    enabled: !!schemeId && schemeId > 0,
    staleTime: 10 * 60 * 1000, // 10 minutes
    retry: 1,
  });

  return {
    hasData: totalPoints > 0,
    isChecking: isLoading,
    error: error,
  };
}

/**
 * Hook to get time series summary statistics
 * Returns metadata without full data fetch
 * 
 * @param schemeId - Scheme ID
 * @returns Summary statistics
 */
export function useNavTimeSeriesSummary(schemeId: number): {
  totalPoints: number;
  metricsCoverage: number | null;
  dateRange: { start: string; end: string } | null;
  isLoading: boolean;
} {
  const { totalPoints, metricsCoverage, dateRange, isLoading } =
    useSchemeNavTimeSeries(schemeId, {
      enabled: !!schemeId && schemeId > 0,
      staleTime: 10 * 60 * 1000,
      retry: 1,
    });

  return {
    totalPoints,
    metricsCoverage,
    dateRange,
    isLoading,
  };
}