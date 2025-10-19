// frontend/src/services/marketAnalysis.service.ts

import {
  CalculateMetricsRequest,
  CalculateMetricsResponse,
  GetChartDataRequest,
  GetChartDataResponse,
  GetIndexMetricsResponse,
  GetDashboardStatisticsResponse,
  IndexDetail,
  IndexMetrics,
  ChartDataPoint,
  DashboardStatistics,
  MarketAnalysisError,
  ApiError
} from '../types/marketAnalysis.types';

// ==================== NEW INTERFACES FOR TIME-SERIES ====================

export interface ReturnTimeSeriesResponse {
  success: boolean;
  index_id: number;
  periods: string[];
  granularity: 'daily' | 'monthly';
  date_range: {
    start_date: string;
    end_date: string;
  };
  data: Array<{
    date: string;
    daily_return?: number | null;
    return_1w?: number | null;
    return_1m?: number | null;
    return_3m?: number | null;
    return_6m?: number | null;
    return_1y?: number | null;
    return_ytd?: number | null;
    return_all?: number | null;
  }>;
  total_records: number;
  execution_time_ms: number;
}

export interface VolatilityTimeSeriesResponse {
  success: boolean;
  index_id: number;
  granularity: 'daily' | 'monthly';
  date_range: {
    start_date: string;
    end_date: string;
  };
  data: Array<{
    date: string;
    sd_7d?: number | null;
    sd_14d?: number | null;
    sd_21d?: number | null;
    sd_42d?: number | null;
    sd_3m?: number | null;
    sd_6m?: number | null;
  }>;
  total_records: number;
  execution_time_ms: number;
}

export interface DashboardStatisticsApiResponse {
  success: boolean;
  time_period: '1m' | '3m' | '6m' | '1y';
  data: {
    best_performer: {
      index_id: number;
      index_name: string;
      index_code: string;
      return_value: number;
    } | null;
    most_volatile: {
      index_id: number;
      index_name: string;
      index_code: string;
      volatility_value: number;
    } | null;
    market_breadth: number;
    total_indices_analyzed: number;
    indices_up: number;
    indices_down: number;
    heatmap: Array<{
      index_id: number;
      index_name: string;
      index_code: string;
      return_value: number | null;
      volatility_value: number | null;
    }>;
  };
  execution_time_ms: number;
}

// ==================== MAIN SERVICE CLASS ====================

class MarketAnalysisService {
  private baseUrl: string;
  private timeout: number = 30000; // 30 seconds

  constructor() {
    // TODO: Replace with environment variable
    this.baseUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';
  }

  /**
   * Make HTTP request with error handling
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        }
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData: ApiError = await response.json().catch(() => ({
          message: `HTTP ${response.status}: ${response.statusText}`,
          code: `HTTP_${response.status}`
        }));

        throw new MarketAnalysisError(
          errorData.message,
          errorData.code,
          errorData.details
        );
      }

      return await response.json();
    } catch (error: any) {
      if (error instanceof MarketAnalysisError) {
        throw error;
      }

      if (error.name === 'AbortError') {
        throw new MarketAnalysisError(
          'Request timeout',
          'TIMEOUT',
          { timeout: this.timeout }
        );
      }

      throw new MarketAnalysisError(
        error.message || 'Unknown error',
        'NETWORK_ERROR',
        { originalError: error }
      );
    }
  }

  /**
   * Calculate metrics for an index
   * Triggers the calculation process on backend
   * 
   * @param request Object with index_id and optional recalculate flag
   * @returns CalculateMetricsResponse with calculated metrics
   */
  async calculateMetrics(
    request: CalculateMetricsRequest
  ): Promise<CalculateMetricsResponse> {
    try {
      // Extract indexId from request
      const indexId = request.index_id;
      
      if (!indexId || indexId <= 0) {
        throw new MarketAnalysisError(
          'Invalid index ID',
          'INVALID_INDEX_ID'
        );
      }

      // Build request body (exclude index_id as it goes in URL)
      const body = {
        recalculate: request.recalculate || false,
        as_of_date: request.as_of_date // Optional
      };

      // Call with indexId in URL path
      const response = await this.request<CalculateMetricsResponse>(
        `/market-analysis/calculate-metrics/${indexId}`,
        {
          method: 'POST',
          body: JSON.stringify(body)
        }
      );

      return response;
    } catch (error: any) {
      console.error('Calculate metrics failed:', error);
      throw error;
    }
  }

  /**
   * Get metrics for a specific index
   * Returns latest calculated metrics
   * 
   * @param indexId Index ID
   * @returns IndexMetrics or null if not found
   */
  async getIndexMetrics(indexId: number): Promise<IndexMetrics | null> {
    try {
      const response = await this.request<any>(
        `/market-analysis/metrics/${indexId}`,
        { method: 'GET' }
      );

      if (response.success) {
        // Transform response to IndexMetrics format
        const metricsData = response.metrics || {};
        return {
          id: response.index_id,
          index_id: response.index_id,
          date: response.date,
          last_price: response.last_price,
          daily_return: metricsData.daily_return,
          return_1w: metricsData.return_1w,
          return_1m: metricsData.return_1m,
          return_3m: metricsData.return_3m,
          return_6m: metricsData.return_6m,
          return_1y: metricsData.return_1y,
          return_ytd: metricsData.return_ytd,
          return_all: metricsData.return_all,
          sd_7d: metricsData.sd_7d,
          sd_14d: metricsData.sd_14d,
          sd_21d: metricsData.sd_21d,
          sd_42d: metricsData.sd_42d,
          sd_3m: metricsData.sd_3m,
          sd_6m: metricsData.sd_6m,
          count_3m: metricsData.count_3m,
          count_42d: metricsData.count_42d,
          sharpe_ratio: metricsData.sharpe_ratio,
          max_drawdown: metricsData.max_drawdown,
          total_risk: metricsData.total_risk,
          cagr: metricsData.cagr,
          metrics_calculated_at: response.metrics_calculated_at,
          calculated_at: response.metrics_calculated_at,
          updated_at: new Date().toISOString() as unknown as string | null
        };
      }

      throw new MarketAnalysisError(
        response.error || 'Failed to get index metrics',
        'GET_METRICS_ERROR'
      );
    } catch (error: any) {
      console.error('Get index metrics failed:', error);
      throw error;
    }
  }

  /**
   * Get time-series returns data for an index
   * Returns array of returns for specified periods and time range
   * 
   * @param indexId Index ID
   * @param periods Array of periods (1m, 3m, 6m, 1y, ytd, all, daily, 1w)
   * @param granularity daily or monthly aggregation
   * @param startDate Optional start date (ISO format)
   * @param endDate Optional end date (ISO format)
   * @returns Time-series array of returns
   */
  async getIndexReturnsTimeSeries(
    indexId: number,
    periods: string[] = ['1m', '3m', '6m', '1y', 'ytd', 'all'],
    granularity: 'daily' | 'monthly' = 'daily',
    startDate?: string,
    endDate?: string
  ): Promise<ReturnTimeSeriesResponse['data']> {
    try {
      if (!indexId || indexId <= 0) {
        throw new MarketAnalysisError(
          'Invalid index ID',
          'INVALID_INDEX_ID'
        );
      }

      if (!periods || periods.length === 0) {
        throw new MarketAnalysisError(
          'At least one period must be specified',
          'INVALID_PERIODS'
        );
      }

      // Build query parameters
      const params = new URLSearchParams();
      params.append('index_id', indexId.toString());
      params.append('periods', periods.join(','));
      params.append('granularity', granularity);
      
      if (startDate) {
        params.append('start_date', startDate);
      }
      if (endDate) {
        params.append('end_date', endDate);
      }

      const response = await this.request<ReturnTimeSeriesResponse>(
        `/market-analysis/index-returns?${params.toString()}`,
        { method: 'GET' }
      );

      if (response.success) {
        return response.data;
      }

      throw new MarketAnalysisError(
        'Failed to fetch returns time-series',
        'GET_RETURNS_ERROR'
      );
    } catch (error: any) {
      console.error('Get index returns time-series failed:', error);
      throw error;
    }
  }

  /**
   * Get time-series volatility data for an index
   * Returns array of volatility metrics for specified time range
   * 
   * @param indexId Index ID
   * @param granularity daily or monthly aggregation
   * @param startDate Optional start date (ISO format)
   * @param endDate Optional end date (ISO format)
   * @returns Time-series array of volatility data
   */
  async getIndexVolatilityTimeSeries(
    indexId: number,
    granularity: 'daily' | 'monthly' = 'daily',
    startDate?: string,
    endDate?: string
  ): Promise<VolatilityTimeSeriesResponse['data']> {
    try {
      if (!indexId || indexId <= 0) {
        throw new MarketAnalysisError(
          'Invalid index ID',
          'INVALID_INDEX_ID'
        );
      }

      // Build query parameters
      const params = new URLSearchParams();
      params.append('granularity', granularity);
      
      if (startDate) {
        params.append('start_date', startDate);
      }
      if (endDate) {
        params.append('end_date', endDate);
      }

      const response = await this.request<VolatilityTimeSeriesResponse>(
        `/market-analysis/index-volatility/${indexId}?${params.toString()}`,
        { method: 'GET' }
      );

      if (response.success) {
        return response.data;
      }

      throw new MarketAnalysisError(
        'Failed to fetch volatility time-series',
        'GET_VOLATILITY_ERROR'
      );
    } catch (error: any) {
      console.error('Get index volatility time-series failed:', error);
      throw error;
    }
  }

  /**
   * Get dashboard statistics
   * Returns aggregated stats including best performer, most volatile, market breadth, heatmap
   * 
   * @param timePeriod Time period for analysis (1m, 3m, 6m, 1y)
   * @returns Dashboard statistics
   */
  async getDashboardStatistics(
    timePeriod: '1m' | '3m' | '6m' | '1y' = '1y'
  ): Promise<DashboardStatisticsApiResponse['data']> {
    try {
      const params = new URLSearchParams();
      params.append('time_period', timePeriod);

      const response = await this.request<DashboardStatisticsApiResponse>(
        `/market-analysis/dashboard-statistics?${params.toString()}`,
        { method: 'GET' }
      );

      if (response.success && response.data) {
        return response.data;
      }

      throw new MarketAnalysisError(
        'Failed to get dashboard statistics',
        'GET_DASHBOARD_STATS_ERROR'
      );
    } catch (error: any) {
      console.error('Get dashboard statistics failed:', error);
      throw error;
    }
  }

  /**
   * Get chart data for an index
   */
  async getChartData(
    request: GetChartDataRequest
  ): Promise<GetChartDataResponse> {
    try {
      const params = new URLSearchParams();
      params.append('index_id', request.index_id.toString());
      params.append('granularity', request.granularity);
      params.append('time_period', request.time_period);
      
      if (request.start_date) params.append('start_date', request.start_date);
      if (request.end_date) params.append('end_date', request.end_date);
      if (request.page) params.append('page', request.page.toString());
      if (request.page_size) params.append('page_size', request.page_size.toString());

      const response = await this.request<GetChartDataResponse>(
        `/market-analysis/chart-data?${params.toString()}`,
        { method: 'GET' }
      );

      return response;
    } catch (error: any) {
      console.error('Get chart data failed:', error);
      throw error;
    }
  }

  /**
   * Get all indices with optional filtering
   */
  async getAllIndices(params?: any): Promise<{
    indices: IndexDetail[];
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
  }> {
    try {
      const queryParams = new URLSearchParams();
      if (params?.search) queryParams.append('search', params.search);
      if (params?.category) queryParams.append('category', params.category);
      if (params?.has_metrics !== undefined) queryParams.append('has_metrics', params.has_metrics.toString());
      if (params?.page) queryParams.append('page', params.page.toString());
      if (params?.page_size) queryParams.append('page_size', params.page_size.toString());

      const response = await this.request<any>(
        `/market-analysis/indices?${queryParams.toString()}`,
        { method: 'GET' }
      );

      return response;
    } catch (error: any) {
      console.error('Get all indices failed:', error);
      throw error;
    }
  }

  /**
   * Get a specific index by ID
   */
  async getIndexById(indexId: number): Promise<IndexDetail | null> {
    try {
      const response = await this.request<any>(
        `/market-analysis/indices/${indexId}`,
        { method: 'GET' }
      );

      return response.data || null;
    } catch (error: any) {
      console.error('Get index by ID failed:', error);
      throw error;
    }
  }

  /**
   * Get index returns for multiple periods (legacy - use getIndexReturnsTimeSeries instead)
   * @deprecated Use getIndexReturnsTimeSeries() instead
   */
  async getIndexReturns(
    indexId: number,
    periods: ('1m' | '3m' | '6m' | '1y' | 'ytd' | 'all')[]
  ): Promise<Record<string, number | null>> {
    try {
      // Use the new time-series method and return latest values
      const timeSeriesData = await this.getIndexReturnsTimeSeries(
        indexId,
        periods,
        'daily'
      );

      if (timeSeriesData.length === 0) {
        return {};
      }

      // Get the latest (last) record
      const latestRecord = timeSeriesData[timeSeriesData.length - 1];
      const result: Record<string, number | null> = {};

      periods.forEach(period => {
        const periodKey = `return_${period}`;
        result[period] = (latestRecord as any)[periodKey] || null;
      });

      return result;
    } catch (error: any) {
      console.error('Get index returns failed:', error);
      throw error;
    }
  }

  /**
   * Get index volatility metrics (legacy - use getIndexVolatilityTimeSeries instead)
   * @deprecated Use getIndexVolatilityTimeSeries() instead
   */
  async getIndexVolatility(indexId: number): Promise<{
    volatility_7d: number | null;
    volatility_14d: number | null;
    volatility_30d: number | null;
    volatility_60d: number | null;
    volatility_90d: number | null;
  }> {
    try {
      // Use the new time-series method and return latest values
      const timeSeriesData = await this.getIndexVolatilityTimeSeries(
        indexId,
        'daily'
      );

      if (timeSeriesData.length === 0) {
        return {
          volatility_7d: null,
          volatility_14d: null,
          volatility_30d: null,
          volatility_60d: null,
          volatility_90d: null
        };
      }

      // Get the latest (last) record
      const latestRecord = timeSeriesData[timeSeriesData.length - 1];

      return {
        volatility_7d: latestRecord.sd_7d || null,
        volatility_14d: latestRecord.sd_14d || null,
        volatility_30d: latestRecord.sd_21d || null, // Closest available
        volatility_60d: latestRecord.sd_42d || null,
        volatility_90d: latestRecord.sd_3m || null
      };
    } catch (error: any) {
      console.error('Get index volatility failed:', error);
      throw error;
    }
  }

  // ==================== COMMENTED OUT - NOT CURRENTLY USED ====================

  /**
   * Get correlation between index and mutual fund
   * @deprecated Not currently implemented - commented out
   */
  // async getCorrelation(
  //   indexId: number,
  //   mfId: number,
  //   granularity: 'daily' | 'weekly' | 'monthly'
  // ): Promise<{
  //   correlation: number;
  //   start_date: string;
  //   end_date: string;
  //   data_points: number;
  // }> { ... }

  /**
   * Get comparison data for multiple indices
   * @deprecated Not currently implemented - commented out
   */
  // async getMultiIndexComparison(
  //   indexIds: number[],
  //   timePeriod: '1m' | '3m' | '6m' | '1y'
  // ): Promise<Array<{
  //   index_id: number;
  //   index_name: string;
  //   returns: Record<string, number | null>;
  //   volatility: number | null;
  // }>> { ... }

  /**
   * Refresh all metrics (admin/scheduler endpoint)
   * @deprecated Not currently implemented - commented out
   */
  // async refreshAllMetrics(): Promise<{
  //   success: boolean;
  //   indices_updated: number;
  //   total_indices: number;
  //   execution_time_ms: number;
  //   errors: Array<{ index_id: number; error: string }>;
  // }> { ... }

  /**
   * Check calculation status for an index
   * @deprecated Not currently implemented - commented out
   */
  // async getCalculationStatus(indexId: number): Promise<{
  //   is_calculated: boolean;
  //   calculated_at: string | null;
  //   last_updated_at: string | null;
  //   calculation_error: string | null;
  // }> { ... }

  /**
   * Export index data as CSV
   */
  async exportChartDataAsCSV(
    indexId: number,
    granularity: 'daily' | 'weekly' | 'monthly',
    timePeriod: string,
    startDate?: string,
    endDate?: string
  ): Promise<Blob> {
    try {
      const params = new URLSearchParams();
      params.append('index_id', indexId.toString());
      params.append('granularity', granularity);
      params.append('time_period', timePeriod);
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);

      const response = await fetch(
        `${this.baseUrl}/market-analysis/export-csv?${params.toString()}`,
        {
          method: 'GET',
          headers: {
            'Accept': 'text/csv'
          }
        }
      );

      if (!response.ok) {
        throw new Error(`Export failed: ${response.statusText}`);
      }

      return await response.blob();
    } catch (error: any) {
      console.error('Export chart data failed:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const marketAnalysisService = new MarketAnalysisService();