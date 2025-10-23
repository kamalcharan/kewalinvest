// frontend/src/services/marketAnalysis.service.ts
// REFACTORED to match standard pattern (like jtbd.service.ts)

import apiService from './api.service';
import { API_ENDPOINTS } from './serviceURLs';
import {
  CalculateMetricsRequest,
  CalculateMetricsResponse,
  IndexMetrics,
  MarketAnalysisError,
  MarketDataRecord
} from '../types/marketAnalysis.types';

// ==================== RESPONSE INTERFACES ====================

// UPDATED: Now includes full MarketDataRecord fields
export interface ReturnTimeSeriesResponse {
  success: boolean;
  index_id: number;
  periods: string[];
  granularity: 'daily' | 'weekly' | 'monthly';
  date_range: {
    start_date: string;
    end_date: string;
  };
  data: MarketDataRecord[];  // CHANGED: Use full MarketDataRecord type
  total_records: number;
  execution_time_ms: number;
}

export interface VolatilityTimeSeriesResponse {
  success: boolean;
  index_id: number;
  granularity: 'daily' | 'weekly' | 'monthly';
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

// UPDATED: Added new fields from backend
interface IndexMetricsApiResponse {
  success: boolean;
  index_id: number;
  date: string;
  index_name: string;        // NEW
  index_code: string;        // NEW
  yahoo_symbol: string;      // NEW
  last_price: number;        // NEW
  metrics: {
    daily_return?: number | null;
    return_1w?: number | null;
    return_1m?: number | null;
    return_3m?: number | null;
    return_6m?: number | null;
    return_1y?: number | null;
    return_ytd?: number | null;
    return_all?: number | null;
    sd_7d?: number | null;
    sd_14d?: number | null;
    sd_21d?: number | null;
    sd_42d?: number | null;
    sd_3m?: number | null;
    sd_6m?: number | null;
    count_3m?: number;
    count_42d?: number;
    sharpe_ratio?: number | null;
    max_drawdown?: number | null;
    total_risk?: number | null;
    cagr?: number | null;
  };
  metrics_calculated_at?: string;
  error?: string;
}

// ==================== MAIN SERVICE CLASS ====================

export class MarketAnalysisService {
  /**
   * Calculate metrics for an index
   */
  static async calculateMetrics(
    request: CalculateMetricsRequest
  ): Promise<CalculateMetricsResponse> {
    try {
      const indexId = request.index_id;
      
      if (!indexId || indexId <= 0) {
        throw new MarketAnalysisError('Invalid index ID', 'INVALID_INDEX_ID');
      }

      const body = {
        recalculate: request.recalculate || false,
        as_of_date: request.as_of_date
      };

      const url = API_ENDPOINTS.MARKET_ANALYSIS.CALCULATE_METRICS(indexId);
      return await apiService.post<CalculateMetricsResponse>(url, body);
    } catch (error: any) {
      console.error('Calculate metrics failed:', error);
      throw error;
    }
  }

  /**
   * Get latest calculated metrics for an index
   * Returns null if metrics haven't been calculated yet (404)
   */
  static async getIndexMetrics(indexId: number): Promise<IndexMetrics | null> {
    try {
      const url = API_ENDPOINTS.MARKET_ANALYSIS.GET_METRICS(indexId);
      const response = await apiService.get<IndexMetricsApiResponse>(url);

      if (response.success) {
        const metricsData = response.metrics || {};
        return {
          id: response.index_id,
          index_id: response.index_id,
          date: response.date,

          // NEW: Map index metadata from response
          index_name: response.index_name || '',
          index_code: response.index_code || '',
          yahoo_symbol: response.yahoo_symbol || '',

          last_price: response.last_price || 0, // UPDATED: Use from response
          daily_return: metricsData.daily_return ?? null,
          return_1w: metricsData.return_1w ?? null,
          return_1m: metricsData.return_1m ?? null,
          return_3m: metricsData.return_3m ?? null,
          return_6m: metricsData.return_6m ?? null,
          return_1y: metricsData.return_1y ?? null,
          return_ytd: metricsData.return_ytd ?? null,
          return_all: metricsData.return_all ?? null,
          sd_7d: metricsData.sd_7d ?? null,
          sd_14d: metricsData.sd_14d ?? null,
          sd_21d: metricsData.sd_21d ?? null,
          sd_42d: metricsData.sd_42d ?? null,
          sd_3m: metricsData.sd_3m ?? null,
          sd_6m: metricsData.sd_6m ?? null,
          count_3m: metricsData.count_3m ?? null,
          count_42d: metricsData.count_42d ?? null,
          sharpe_ratio: metricsData.sharpe_ratio ?? null,
          max_drawdown: metricsData.max_drawdown ?? null,
          total_risk: metricsData.total_risk ?? null,
          cagr: metricsData.cagr ?? null,
          metrics_calculated_at: response.metrics_calculated_at || null,
          calculated_at: response.metrics_calculated_at || null,
          updated_at: null
        };
      }

      throw new MarketAnalysisError(
        response.error || 'Failed to get index metrics',
        'GET_METRICS_ERROR'
      );
    } catch (error: any) {
      // Handle 404 gracefully - metrics haven't been calculated yet
      if (error?.response?.status === 404 || error?.status === 404) {
        console.log(`No metrics calculated for index ${indexId} yet - this is expected for new indices`);
        return null;
      }
      // Log and re-throw other errors
      console.error('Get index metrics failed:', error);
      throw error;
    }
  }

  /**
   * Get time-series returns data for an index
   * UPDATED: Now returns full MarketDataRecord objects and supports 'weekly'
   */
  static async getIndexReturnsTimeSeries(
    indexId: number,
    periods: string[] = ['1m', '3m', '6m', '1y', 'ytd', 'all'],
    granularity: 'daily' | 'weekly' | 'monthly' = 'daily',
    startDate?: string,
    endDate?: string
  ): Promise<MarketDataRecord[]> {
    try {
      if (!indexId || indexId <= 0) {
        throw new MarketAnalysisError('Invalid index ID', 'INVALID_INDEX_ID');
      }

      if (!periods || periods.length === 0) {
        throw new MarketAnalysisError(
          'At least one period must be specified',
          'INVALID_PERIODS'
        );
      }

      const params: Record<string, any> = {
        index_id: indexId,
        periods: periods.join(','),
        granularity: granularity
      };
      
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;

      const url = API_ENDPOINTS.MARKET_ANALYSIS.INDEX_RETURNS;
      const urlWithParams = `${url}?${new URLSearchParams(params).toString()}`;
      
      const response = await apiService.get<ReturnTimeSeriesResponse>(urlWithParams);

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
   * UPDATED: Now supports 'weekly'
   */
  static async getIndexVolatilityTimeSeries(
    indexId: number,
    granularity: 'daily' | 'weekly' | 'monthly' = 'daily',
    startDate?: string,
    endDate?: string
  ): Promise<VolatilityTimeSeriesResponse['data']> {
    try {
      if (!indexId || indexId <= 0) {
        throw new MarketAnalysisError('Invalid index ID', 'INVALID_INDEX_ID');
      }

      const params: Record<string, any> = {
        granularity: granularity
      };
      
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;

      const url = API_ENDPOINTS.MARKET_ANALYSIS.INDEX_VOLATILITY(indexId);
      const urlWithParams = `${url}?${new URLSearchParams(params).toString()}`;
      
      const response = await apiService.get<VolatilityTimeSeriesResponse>(urlWithParams);

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
   */
  static async getDashboardStatistics(
    timePeriod: '1m' | '3m' | '6m' | '1y' = '1y'
  ): Promise<DashboardStatisticsApiResponse['data']> {
    try {
      const params = { time_period: timePeriod };
      const url = API_ENDPOINTS.MARKET_ANALYSIS.DASHBOARD_STATISTICS;
      const urlWithParams = `${url}?${new URLSearchParams(params).toString()}`;

      const response = await apiService.get<DashboardStatisticsApiResponse>(urlWithParams);

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
   * Get all indices with optional filtering
   */
  static async getAllIndices(params?: any): Promise<{
    indices: any[];
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
  }> {
    try {
      // This would typically call market.service or have its own endpoint
      // For now, returning empty structure
      console.warn('getAllIndices not implemented - use market.service instead');
      return {
        indices: [],
        total: 0,
        page: 1,
        page_size: 50,
        total_pages: 0
      };
    } catch (error: any) {
      console.error('Get all indices failed:', error);
      throw error;
    }
  }

  /**
   * Get a specific index by ID
   */
  static async getIndexById(indexId: number): Promise<any | null> {
    try {
      // This would typically call market.service
      console.warn('getIndexById not implemented - use market.service instead');
      return null;
    } catch (error: any) {
      console.error('Get index by ID failed:', error);
      throw error;
    }
  }

  /**
   * Legacy method - Get index returns for multiple periods (returns latest values)
   * @deprecated Use getIndexReturnsTimeSeries instead
   */
  static async getIndexReturns(
    indexId: number,
    periods: ('1m' | '3m' | '6m' | '1y' | 'ytd' | 'all')[]
  ): Promise<Record<string, number | null>> {
    try {
      const timeSeriesData = await this.getIndexReturnsTimeSeries(
        indexId,
        periods,
        'daily'
      );

      if (timeSeriesData.length === 0) {
        return {};
      }

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
   * Legacy method - Get index volatility metrics (returns latest values)
   * @deprecated Use getIndexVolatilityTimeSeries instead
   */
  static async getIndexVolatility(indexId: number): Promise<{
    volatility_7d: number | null;
    volatility_14d: number | null;
    volatility_30d: number | null;
    volatility_60d: number | null;
    volatility_90d: number | null;
  }> {
    try {
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

      const latestRecord = timeSeriesData[timeSeriesData.length - 1];

      return {
        volatility_7d: latestRecord.sd_7d || null,
        volatility_14d: latestRecord.sd_14d || null,
        volatility_30d: latestRecord.sd_21d || null,
        volatility_60d: latestRecord.sd_42d || null,
        volatility_90d: latestRecord.sd_3m || null
      };
    } catch (error: any) {
      console.error('Get index volatility failed:', error);
      throw error;
    }
  }

  /**
   * Export index data as CSV
   */
  static async exportChartDataAsCSV(
    indexId: number,
    granularity: 'daily' | 'weekly' | 'monthly',
    timePeriod: string,
    startDate?: string,
    endDate?: string
  ): Promise<Blob> {
    try {
      const params: Record<string, string> = {
        index_id: indexId.toString(),
        granularity: granularity,
        time_period: timePeriod
      };
      
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;

      // Note: This endpoint might not exist yet - placeholder implementation
      const url = `${API_ENDPOINTS.MARKET_ANALYSIS.INDEX_RETURNS}?${new URLSearchParams(params).toString()}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'text/csv'
        }
      });

      if (!response.ok) {
        throw new Error(`Export failed: ${response.statusText}`);
      }

      return await response.blob();
    } catch (error: any) {
      console.error('Export chart data failed:', error);
      throw error;
    }
  }

  // ==================== HELPER METHODS ====================

  /**
   * Format metric value for display
   */
  static formatMetricValue(value: number | null, decimals: number = 2): string {
    if (value === null || value === undefined) return '--';
    return `${value >= 0 ? '+' : ''}${value.toFixed(decimals)}%`;
  }

  /**
   * Format date for display
   */
  static formatDate(dateString: string): string {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  /**
   * Get status color based on value
   */
  static getStatusColor(value: number | null): string {
    if (value === null || value === undefined) return '#6B7280';
    if (value > 0) return '#10B981'; // Green
    if (value < 0) return '#DC2626'; // Red
    return '#6B7280'; // Gray
  }
}

// Export singleton instance for backward compatibility
export const marketAnalysisService = MarketAnalysisService;