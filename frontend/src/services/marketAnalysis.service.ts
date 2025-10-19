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
   * Get metrics for a specific index
   */
  async getIndexMetrics(indexId: number): Promise<IndexMetrics | null> {
    try {
      const response = await this.request<GetIndexMetricsResponse>(
        `/market-analysis/index-metrics/${indexId}`,
        { method: 'GET' }
      );

      if (response.success) {
        return response.data || null;
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
   * Get all indices with optional filtering
   */
  async getAllIndices(params?: {
    search?: string;
    category?: 'broad' | 'sectoral' | 'thematic';
    has_metrics?: boolean;
    page?: number;
    page_size?: number;
  }): Promise<{
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
   * Get dashboard statistics
   */
  async getDashboardStatistics(timePeriod?: '1m' | '3m' | '6m' | '1y'): Promise<DashboardStatistics | null> {
    try {
      const params = timePeriod ? `?time_period=${timePeriod}` : '';
      
      const response = await this.request<GetDashboardStatisticsResponse>(
        `/market-analysis/dashboard-statistics${params}`,
        { method: 'GET' }
      );

      if (response.success) {
        return response.data || null;
      }

      throw new MarketAnalysisError(
        response.error || 'Failed to get dashboard statistics',
        'GET_STATS_ERROR'
      );
    } catch (error: any) {
      console.error('Get dashboard statistics failed:', error);
      throw error;
    }
  }

  /**
   * Get index returns for a specific period
   */
  async getIndexReturns(
    indexId: number,
    periods: ('1m' | '3m' | '6m' | '1y' | 'ytd' | 'all')[]
  ): Promise<Record<string, number | null>> {
    try {
      const params = new URLSearchParams();
      params.append('index_id', indexId.toString());
      params.append('periods', periods.join(','));

      const response = await this.request<any>(
        `/market-analysis/index-returns?${params.toString()}`,
        { method: 'GET' }
      );

      return response.data || {};
    } catch (error: any) {
      console.error('Get index returns failed:', error);
      throw error;
    }
  }

  /**
   * Get index volatility metrics
   */
  async getIndexVolatility(indexId: number): Promise<{
    volatility_7d: number | null;
    volatility_14d: number | null;
    volatility_30d: number | null;
    volatility_60d: number | null;
    volatility_90d: number | null;
  }> {
    try {
      const response = await this.request<any>(
        `/market-analysis/index-volatility/${indexId}`,
        { method: 'GET' }
      );

      return response.data || {};
    } catch (error: any) {
      console.error('Get index volatility failed:', error);
      throw error;
    }
  }

  /**
   * Get correlation between index and mutual fund
   */
  async getCorrelation(
    indexId: number,
    mfId: number,
    granularity: 'daily' | 'weekly' | 'monthly'
  ): Promise<{
    correlation: number;
    start_date: string;
    end_date: string;
    data_points: number;
  }> {
    try {
      const params = new URLSearchParams();
      params.append('index_id', indexId.toString());
      params.append('mf_id', mfId.toString());
      params.append('granularity', granularity);

      const response = await this.request<any>(
        `/market-analysis/correlation?${params.toString()}`,
        { method: 'GET' }
      );

      return response.data || {};
    } catch (error: any) {
      console.error('Get correlation failed:', error);
      throw error;
    }
  }

  /**
   * Get comparison data for multiple indices
   */
  async getMultiIndexComparison(
    indexIds: number[],
    timePeriod: '1m' | '3m' | '6m' | '1y'
  ): Promise<Array<{
    index_id: number;
    index_name: string;
    returns: Record<string, number | null>;
    volatility: number | null;
  }>> {
    try {
      const params = new URLSearchParams();
      params.append('index_ids', indexIds.join(','));
      params.append('time_period', timePeriod);

      const response = await this.request<any>(
        `/market-analysis/multi-index-comparison?${params.toString()}`,
        { method: 'GET' }
      );

      return response.data || [];
    } catch (error: any) {
      console.error('Get multi-index comparison failed:', error);
      throw error;
    }
  }

  /**
   * Refresh all metrics (admin/scheduler endpoint)
   * Used by the 11 PM scheduled job
   */
  async refreshAllMetrics(): Promise<{
    success: boolean;
    indices_updated: number;
    total_indices: number;
    execution_time_ms: number;
    errors: Array<{ index_id: number; error: string }>;
  }> {
    try {
      const response = await this.request<any>(
        '/market-analysis/refresh-all-metrics',
        { method: 'POST' }
      );

      return response;
    } catch (error: any) {
      console.error('Refresh all metrics failed:', error);
      throw error;
    }
  }

  /**
   * Check calculation status for an index
   */
  async getCalculationStatus(indexId: number): Promise<{
    is_calculated: boolean;
    calculated_at: string | null;
    last_updated_at: string | null;
    calculation_error: string | null;
  }> {
    try {
      const response = await this.request<any>(
        `/market-analysis/calculation-status/${indexId}`,
        { method: 'GET' }
      );

      return response.data || {};
    } catch (error: any) {
      console.error('Get calculation status failed:', error);
      throw error;
    }
  }

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