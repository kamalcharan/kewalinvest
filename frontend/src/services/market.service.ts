// frontend/src/services/market.service.ts
// Complete API service for Market Data operations

import apiService from './api.service';
import {
  MarketIndex,
  MarketDataRecord,
  MarketStatistics,
  GetIndicesParams,
  GetMarketDataParams,
  DownloadHistoricalRequest,
  DownloadEODRequest,
  ApiResponse,
  GetIndicesResponse,
  GetMarketDataResponse,
  DeleteDataResponse,
  DownloadJobResponse,
  HealthCheckResponse
} from '../types/market.types';

// ==================== BASE CONFIGURATION ====================

export class MarketService {
  // ==================== HELPER METHODS ====================

  /**
   * Build query string from params
   */
  private static buildQueryString(params: Record<string, any>): string {
    const filtered = Object.entries(params)
      .filter(([_, value]) => value !== undefined && value !== null && value !== '')
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
      .join('&');
    
    return filtered ? `?${filtered}` : '';
  }

  // ==================== INDEX OPERATIONS ====================

  /**
   * Get all market indices with filtering and pagination
   * GET /api/market/indices
   */
  static async getAllIndices(params?: GetIndicesParams): Promise<ApiResponse<GetIndicesResponse>> {
    try {
      const queryString = params ? this.buildQueryString(params) : '';
      const endpoint = `/market/indices${queryString}`;
      
      return await apiService.get<ApiResponse<GetIndicesResponse>>(endpoint);
    } catch (error: any) {
      console.error('Error fetching indices:', error);
      return {
        success: false,
        error: error.message || 'Failed to fetch indices',
        data: undefined
      };
    }
  }

  /**
   * Get specific index by ID
   * GET /api/market/indices/:id
   */
  static async getIndexById(indexId: number): Promise<ApiResponse<MarketIndex>> {
    try {
      const endpoint = `/market/indices/${indexId}`;
      return await apiService.get<ApiResponse<MarketIndex>>(endpoint);
    } catch (error: any) {
      console.error('Error fetching index:', error);
      return {
        success: false,
        error: error.message || 'Failed to fetch index',
        data: undefined
      };
    }
  }

  // ==================== DATA OPERATIONS ====================

  /**
   * Get market data for an index with optional date range filtering
   * GET /api/market/data/:indexId
   */
  static async getMarketData(
    indexId: number,
    params?: GetMarketDataParams
  ): Promise<ApiResponse<GetMarketDataResponse>> {
    try {
      const queryString = params ? this.buildQueryString(params) : '';
      const endpoint = `/market/data/${indexId}${queryString}`;
      
      return await apiService.get<ApiResponse<GetMarketDataResponse>>(endpoint);
    } catch (error: any) {
      console.error('Error fetching market data:', error);
      return {
        success: false,
        error: error.message || 'Failed to fetch market data',
        data: undefined
      };
    }
  }

  /**
   * Get latest market data for an index
   * GET /api/market/data/:indexId/latest
   */
  static async getLatestData(indexId: number): Promise<ApiResponse<MarketDataRecord>> {
    try {
      const endpoint = `/market/data/${indexId}/latest`;
      return await apiService.get<ApiResponse<MarketDataRecord>>(endpoint);
    } catch (error: any) {
      console.error('Error fetching latest data:', error);
      return {
        success: false,
        error: error.message || 'Failed to fetch latest data',
        data: undefined
      };
    }
  }

  /**
   * Get monthly index data for portfolio comparison
   * Fetches index data at monthly granularity for the same date range as portfolio
   * GET /api/market-analysis/index-returns
   */
  static async getIndexMonthlyDataForComparison(
    indexId: number,
    startDate: string | Date,
    endDate: string | Date
  ): Promise<{
    success: boolean;
    data?: Array<{ date: string; value: number }>;
    index_name?: string;
    error?: string;
  }> {
    try {
      // Convert dates to ISO format (YYYY-MM-DD)
      const start = typeof startDate === 'string' 
        ? startDate 
        : startDate.toISOString().split('T')[0];
      const end = typeof endDate === 'string' 
        ? endDate 
        : endDate.toISOString().split('T')[0];

      // Build query parameters
      const params = {
        index_id: indexId,
        granularity: 'monthly',
        start_date: start,
        end_date: end,
        periods: '1m,3m,6m,1y,all' // Required by backend, but we'll use close values
      };

      const queryString = this.buildQueryString(params);
      const endpoint = `/market-analysis/index-returns${queryString}`;

      // Fetch data from backend
      const response = await apiService.get<any>(endpoint);

      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch comparison data');
      }

      // Transform data to simple date-value pairs
      // Backend returns array with close prices and various metrics
      const transformedData = response.data.map((point: any) => ({
        date: point.date,
        value: point.close // Use close price as the comparison value
      }));

      // Get index name
      let indexName = 'Index';
      try {
        const indexInfo = await this.getIndexById(indexId);
        if (indexInfo.success && indexInfo.data?.index_name) {
          indexName = indexInfo.data.index_name;
        }
      } catch (err) {
        console.warn('Could not fetch index name:', err);
      }

      return {
        success: true,
        data: transformedData,
        index_name: indexName
      };

    } catch (error: any) {
      console.error('Error fetching comparison data:', error);
      return {
        success: false,
        error: error.message || 'Failed to fetch comparison data'
      };
    }
  }

  /**
   * Delete all data for an index
   * DELETE /api/market/data/:indexId
   */
  static async deleteAllData(indexId: number): Promise<ApiResponse<DeleteDataResponse>> {
    try {
      const endpoint = `/market/data/${indexId}`;
      return await apiService.delete<ApiResponse<DeleteDataResponse>>(endpoint);
    } catch (error: any) {
      console.error('Error deleting data:', error);
      return {
        success: false,
        error: error.message || 'Failed to delete data',
        data: undefined
      };
    }
  }

  // ==================== DOWNLOAD OPERATIONS ====================

  /**
   * Trigger historical data download (20 years)
   * POST /api/market/download/historical
   */
  static async downloadHistorical(
    request: DownloadHistoricalRequest
  ): Promise<ApiResponse<DownloadJobResponse>> {
    try {
      const endpoint = '/market/download/historical';
      return await apiService.post<ApiResponse<DownloadJobResponse>>(endpoint, request);
    } catch (error: any) {
      console.error('Error downloading historical data:', error);
      return {
        success: false,
        error: error.message || 'Failed to download historical data',
        data: undefined
      };
    }
  }

  /**
   * Trigger EOD (End of Day) download for a specific index
   * POST /api/market/download/eod
   */
  static async downloadEOD(
    request: DownloadEODRequest
  ): Promise<ApiResponse<DownloadJobResponse>> {
    try {
      const endpoint = '/market/download/eod';
      return await apiService.post<ApiResponse<DownloadJobResponse>>(endpoint, request);
    } catch (error: any) {
      console.error('Error downloading EOD data:', error);
      return {
        success: false,
        error: error.message || 'Failed to download EOD data',
        data: undefined
      };
    }
  }

  /**
   * Trigger EOD download for all indices (scheduler endpoint)
   * POST /api/market/download/eod-all
   */
  static async downloadEODAll(): Promise<ApiResponse<DownloadJobResponse>> {
    try {
      const endpoint = '/market/download/eod-all';
      return await apiService.post<ApiResponse<DownloadJobResponse>>(endpoint);
    } catch (error: any) {
      console.error('Error downloading EOD for all indices:', error);
      return {
        success: false,
        error: error.message || 'Failed to download EOD for all indices',
        data: undefined
      };
    }
  }

  // ==================== STATISTICS ====================

  /**
   * Get market data statistics
   * GET /api/market/statistics
   */
  static async getStatistics(): Promise<ApiResponse<MarketStatistics>> {
    try {
      const endpoint = '/market/statistics';
      return await apiService.get<ApiResponse<MarketStatistics>>(endpoint);
    } catch (error: any) {
      console.error('Error fetching statistics:', error);
      return {
        success: false,
        error: error.message || 'Failed to fetch statistics',
        data: undefined
      };
    }
  }

  // ==================== HEALTH CHECK ====================

  /**
   * Health check and Yahoo Finance connection test
   * GET /api/market/health
   */
  static async healthCheck(): Promise<ApiResponse<HealthCheckResponse>> {
    try {
      const endpoint = '/market/health';
      return await apiService.get<ApiResponse<HealthCheckResponse>>(endpoint);
    } catch (error: any) {
      console.error('Error checking health:', error);
      return {
        success: false,
        error: error.message || 'Failed to check health',
        data: undefined
      };
    }
  }

  // ==================== UTILITY METHODS ====================

  /**
   * Test if API is reachable
   */
  static async testConnection(): Promise<boolean> {
    try {
      const result = await this.healthCheck();
      return result.success && result.data?.yahoo_finance_connection === 'ok';
    } catch {
      return false;
    }
  }

  /**
   * Get data for a specific date range (convenience method)
   */
  static async getDataRange(
    indexId: number,
    startDate: string,
    endDate: string,
    pageSize: number = 1000
  ): Promise<ApiResponse<GetMarketDataResponse>> {
    return this.getMarketData(indexId, {
      start_date: startDate,
      end_date: endDate,
      page: 1,
      page_size: pageSize
    });
  }

  /**
   * Download last 20 years of data (convenience method)
   */
  static async downloadLast20Years(indexId: number): Promise<ApiResponse<DownloadJobResponse>> {
    const today = new Date();
    const twentyYearsAgo = new Date(today);
    twentyYearsAgo.setFullYear(today.getFullYear() - 20);

    return this.downloadHistorical({
      index_id: indexId,
      start_date: twentyYearsAgo.toISOString().split('T')[0],
      end_date: today.toISOString().split('T')[0],
      skip_existing: true
    });
  }

  /**
   * Check if index has any data
   */
  static async hasData(indexId: number): Promise<boolean> {
    try {
      const index = await this.getIndexById(indexId);
      return index.success && index.data?.historical_data_available === true;
    } catch {
      return false;
    }
  }

  /**
   * Get record count for an index
   */
  static async getRecordCount(indexId: number): Promise<number> {
    try {
      const index = await this.getIndexById(indexId);
      return index.data?.total_records || 0;
    } catch {
      return 0;
    }
  }

  /**
   * Search indices by name or code
   */
  static async searchIndices(searchTerm: string, pageSize: number = 50): Promise<ApiResponse<GetIndicesResponse>> {
    return this.getAllIndices({
      search: searchTerm,
      page: 1,
      page_size: pageSize
    });
  }

  /**
   * Get indices by category
   */
  static async getIndicesByCategory(
    category: 'broad' | 'sectoral' | 'thematic',
    pageSize: number = 50
  ): Promise<ApiResponse<GetIndicesResponse>> {
    return this.getAllIndices({
      category,
      page: 1,
      page_size: pageSize
    });
  }

  /**
   * Get indices by download status
   */
  static async getIndicesByStatus(
    status: 'downloaded' | 'pending' | 'failed',
    pageSize: number = 50
  ): Promise<ApiResponse<GetIndicesResponse>> {
    return this.getAllIndices({
      download_status: status,
      page: 1,
      page_size: pageSize
    });
  }

  /**
   * Get all downloaded indices
   */
  static async getDownloadedIndices(pageSize: number = 1000): Promise<ApiResponse<GetIndicesResponse>> {
    return this.getIndicesByStatus('downloaded', pageSize);
  }

  /**
   * Get all pending indices
   */
  static async getPendingIndices(pageSize: number = 1000): Promise<ApiResponse<GetIndicesResponse>> {
    return this.getIndicesByStatus('pending', pageSize);
  }

  /**
   * Get all failed downloads
   */
  static async getFailedIndices(pageSize: number = 1000): Promise<ApiResponse<GetIndicesResponse>> {
    return this.getIndicesByStatus('failed', pageSize);
  }

  // ==================== BATCH OPERATIONS ====================

  /**
   * Download historical data for multiple indices (sequential)
   */
  static async downloadMultipleHistorical(
    indexIds: number[],
    startDate: string,
    endDate: string,
    onProgress?: (current: number, total: number, indexId: number) => void
  ): Promise<{
    successful: number;
    failed: number;
    results: Array<{ indexId: number; success: boolean; error?: string }>;
  }> {
    const results: Array<{ indexId: number; success: boolean; error?: string }> = [];
    let successful = 0;
    let failed = 0;

    for (let i = 0; i < indexIds.length; i++) {
      const indexId = indexIds[i];
      
      try {
        onProgress?.(i + 1, indexIds.length, indexId);
        
        const result = await this.downloadHistorical({
          index_id: indexId,
          start_date: startDate,
          end_date: endDate,
          skip_existing: true
        });

        if (result.success) {
          successful++;
          results.push({ indexId, success: true });
        } else {
          failed++;
          results.push({ indexId, success: false, error: result.error });
        }

        // Rate limiting: wait 1 second between requests
        if (i < indexIds.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

      } catch (error: any) {
        failed++;
        results.push({ indexId, success: false, error: error.message });
      }
    }

    return { successful, failed, results };
  }

  /**
   * Download EOD for multiple indices (sequential)
   */
  static async downloadMultipleEOD(
    indexIds: number[],
    onProgress?: (current: number, total: number, indexId: number) => void
  ): Promise<{
    successful: number;
    failed: number;
    results: Array<{ indexId: number; success: boolean; error?: string }>;
  }> {
    const results: Array<{ indexId: number; success: boolean; error?: string }> = [];
    let successful = 0;
    let failed = 0;

    for (let i = 0; i < indexIds.length; i++) {
      const indexId = indexIds[i];
      
      try {
        onProgress?.(i + 1, indexIds.length, indexId);
        
        const result = await this.downloadEOD({ index_id: indexId });

        if (result.success) {
          successful++;
          results.push({ indexId, success: true });
        } else {
          failed++;
          results.push({ indexId, success: false, error: result.error });
        }

        // Rate limiting: wait 500ms between requests
        if (i < indexIds.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }

      } catch (error: any) {
        failed++;
        results.push({ indexId, success: false, error: error.message });
      }
    }

    return { successful, failed, results };
  }

  /**
   * Delete data for multiple indices
   */
  static async deleteMultiple(
    indexIds: number[],
    onProgress?: (current: number, total: number, indexId: number) => void
  ): Promise<{
    successful: number;
    failed: number;
    totalDeleted: number;
    results: Array<{ indexId: number; success: boolean; deletedCount?: number; error?: string }>;
  }> {
    const results: Array<{ indexId: number; success: boolean; deletedCount?: number; error?: string }> = [];
    let successful = 0;
    let failed = 0;
    let totalDeleted = 0;

    for (let i = 0; i < indexIds.length; i++) {
      const indexId = indexIds[i];
      
      try {
        onProgress?.(i + 1, indexIds.length, indexId);
        
        const result = await this.deleteAllData(indexId);

        if (result.success && result.data) {
          successful++;
          totalDeleted += result.data.deleted_count;
          results.push({ 
            indexId, 
            success: true, 
            deletedCount: result.data.deleted_count 
          });
        } else {
          failed++;
          results.push({ indexId, success: false, error: result.error });
        }

      } catch (error: any) {
        failed++;
        results.push({ indexId, success: false, error: error.message });
      }
    }

    return { successful, failed, totalDeleted, results };
  }

  // ==================== ERROR HANDLING ====================

  /**
   * Parse API error for user-friendly message
   */
  static parseError(error: string | undefined): string {
    if (!error) return 'An unknown error occurred';

    // Common error patterns
    const patterns: Record<string, string> = {
      'Network error': 'Cannot connect to server. Please check your internet connection.',
      'timeout': 'Request timed out. Please try again.',
      'Invalid date': 'Please check your date range.',
      'already exists': 'Data already exists for this date range.',
      'not found': 'Index not found. Please refresh the page.',
      '401': 'Authentication required. Please log in.',
      '403': 'Access denied.',
      '404': 'Resource not found.',
      '500': 'Server error. Please try again later.',
      '503': 'Service temporarily unavailable.'
    };

    for (const [pattern, message] of Object.entries(patterns)) {
      if (error.toLowerCase().includes(pattern.toLowerCase())) {
        return message;
      }
    }

    return error;
  }
}

// ==================== EXPORTS ====================

export default MarketService;