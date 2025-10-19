// frontend/src/services/market.service.ts
// Complete API service for Market Data operations

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

class MarketService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = process.env.REACT_APP_API_URL || 'http://localhost:8080';
  }

  // ==================== HELPER METHODS ====================

  /**
   * Generic fetch wrapper with error handling
   */
  private async fetchApi<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const url = `${this.baseUrl}${endpoint}`;
      
      const defaultHeaders: HeadersInit = {
        'Content-Type': 'application/json',
      };

      const response = await fetch(url, {
        ...options,
        headers: {
          ...defaultHeaders,
          ...options.headers,
        },
      });

      // Parse response
      const data = await response.json();

      // Handle non-2xx responses
      if (!response.ok) {
        return {
          success: false,
          error: data.error || data.message || `HTTP ${response.status}: ${response.statusText}`,
          data: undefined
        };
      }

      // Success response
      return {
        success: data.success !== false,
        data: data.data || data,
        message: data.message
      };

    } catch (error: any) {
      console.error(`API Error [${endpoint}]:`, error);
      
      return {
        success: false,
        error: error.message || 'Network error occurred',
        data: undefined
      };
    }
  }

  /**
   * Build query string from params
   */
  private buildQueryString(params: Record<string, any>): string {
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
  async getAllIndices(params?: GetIndicesParams): Promise<ApiResponse<GetIndicesResponse>> {
    const queryString = params ? this.buildQueryString(params) : '';
    return this.fetchApi<GetIndicesResponse>(`/api/market/indices${queryString}`);
  }

  /**
   * Get specific index by ID
   * GET /api/market/indices/:id
   */
  async getIndexById(indexId: number): Promise<ApiResponse<MarketIndex>> {
    return this.fetchApi<MarketIndex>(`/api/market/indices/${indexId}`);
  }

  // ==================== DATA OPERATIONS ====================

  /**
   * Get market data for an index with optional date range filtering
   * GET /api/market/data/:indexId
   */
  async getMarketData(
    indexId: number,
    params?: GetMarketDataParams
  ): Promise<ApiResponse<GetMarketDataResponse>> {
    const queryString = params ? this.buildQueryString(params) : '';
    return this.fetchApi<GetMarketDataResponse>(`/api/market/data/${indexId}${queryString}`);
  }

  /**
   * Get latest market data for an index
   * GET /api/market/data/:indexId/latest
   */
  async getLatestData(indexId: number): Promise<ApiResponse<MarketDataRecord>> {
    return this.fetchApi<MarketDataRecord>(`/api/market/data/${indexId}/latest`);
  }

  /**
   * Delete all data for an index
   * DELETE /api/market/data/:indexId
   */
  async deleteAllData(indexId: number): Promise<ApiResponse<DeleteDataResponse>> {
    return this.fetchApi<DeleteDataResponse>(`/api/market/data/${indexId}`, {
      method: 'DELETE'
    });
  }

  // ==================== DOWNLOAD OPERATIONS ====================

  /**
   * Trigger historical data download (20 years)
   * POST /api/market/download/historical
   */
  async downloadHistorical(
    request: DownloadHistoricalRequest
  ): Promise<ApiResponse<DownloadJobResponse>> {
    return this.fetchApi<DownloadJobResponse>('/api/market/download/historical', {
      method: 'POST',
      body: JSON.stringify(request)
    });
  }

  /**
   * Trigger EOD (End of Day) download for a specific index
   * POST /api/market/download/eod
   */
  async downloadEOD(
    request: DownloadEODRequest
  ): Promise<ApiResponse<DownloadJobResponse>> {
    return this.fetchApi<DownloadJobResponse>('/api/market/download/eod', {
      method: 'POST',
      body: JSON.stringify(request)
    });
  }

  /**
   * Trigger EOD download for all indices (scheduler endpoint)
   * POST /api/market/download/eod-all
   */
  async downloadEODAll(): Promise<ApiResponse<DownloadJobResponse>> {
    return this.fetchApi<DownloadJobResponse>('/api/market/download/eod-all', {
      method: 'POST'
    });
  }

  // ==================== STATISTICS ====================

  /**
   * Get market data statistics
   * GET /api/market/statistics
   */
  async getStatistics(): Promise<ApiResponse<MarketStatistics>> {
    return this.fetchApi<MarketStatistics>('/api/market/statistics');
  }

  // ==================== HEALTH CHECK ====================

  /**
   * Health check and Yahoo Finance connection test
   * GET /api/market/health
   */
  async healthCheck(): Promise<ApiResponse<HealthCheckResponse>> {
    return this.fetchApi<HealthCheckResponse>('/api/market/health');
  }

  // ==================== UTILITY METHODS ====================

  /**
   * Test if API is reachable
   */
  async testConnection(): Promise<boolean> {
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
  async getDataRange(
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
  async downloadLast20Years(indexId: number): Promise<ApiResponse<DownloadJobResponse>> {
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
  async hasData(indexId: number): Promise<boolean> {
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
  async getRecordCount(indexId: number): Promise<number> {
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
  async searchIndices(searchTerm: string, pageSize: number = 50): Promise<ApiResponse<GetIndicesResponse>> {
    return this.getAllIndices({
      search: searchTerm,
      page: 1,
      page_size: pageSize
    });
  }

  /**
   * Get indices by category
   */
  async getIndicesByCategory(
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
  async getIndicesByStatus(
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
  async getDownloadedIndices(pageSize: number = 1000): Promise<ApiResponse<GetIndicesResponse>> {
    return this.getIndicesByStatus('downloaded', pageSize);
  }

  /**
   * Get all pending indices
   */
  async getPendingIndices(pageSize: number = 1000): Promise<ApiResponse<GetIndicesResponse>> {
    return this.getIndicesByStatus('pending', pageSize);
  }

  /**
   * Get all failed downloads
   */
  async getFailedIndices(pageSize: number = 1000): Promise<ApiResponse<GetIndicesResponse>> {
    return this.getIndicesByStatus('failed', pageSize);
  }

  // ==================== BATCH OPERATIONS ====================

  /**
   * Download historical data for multiple indices (sequential)
   */
  async downloadMultipleHistorical(
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
  async downloadMultipleEOD(
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
  async deleteMultiple(
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
  parseError(error: string | undefined): string {
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

  // ==================== LOGGING (OPTIONAL) ====================

  /**
   * Log API call (for debugging)
   */
  private logApiCall(endpoint: string, method: string = 'GET', data?: any): void {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[MarketService] ${method} ${endpoint}`, data || '');
    }
  }
}

// ==================== SINGLETON INSTANCE ====================

const marketService = new MarketService();

// ==================== EXPORTS ====================

export { marketService, MarketService };
export default marketService;