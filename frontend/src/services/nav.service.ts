// frontend/src/services/nav.service.ts
// File 11/14: Frontend NAV service client following existing patterns

import { API_ENDPOINTS, NAV_URLS, buildHeaders, getAPIErrorMessage, isAPIError } from './serviceURLs';

// Types (should match backend types)
export interface SchemeSearchResult {
  id: number;
  scheme_code: string;
  scheme_name: string;
  amc_name: string;
  scheme_type_name?: string;
  scheme_category_name?: string;
  launch_date?: string;
  is_bookmarked: boolean;
  latest_nav_value?: number;
  latest_nav_date?: string;
}

export interface SchemeBookmark {
  id: number;
  tenant_id: number;
  user_id: number;
  scheme_id: number;
  scheme_code: string;
  scheme_name: string;
  amc_name?: string;
  is_live: boolean;
  is_active: boolean;
  daily_download_enabled: boolean;
  download_time: string;
  historical_download_completed: boolean;
  created_at: string;
  updated_at: string;
  nav_records_count?: number;
  latest_nav_date?: string;
  latest_nav_value?: number;
}

export interface NavData {
  id: number;
  tenant_id: number;
  scheme_id: number;
  scheme_code: string;
  nav_date: string;
  nav_value: number;
  repurchase_price?: number;
  sale_price?: number;
  is_live: boolean;
  data_source: 'daily' | 'historical' | 'weekly';
  created_at: string;
  updated_at: string;
  scheme_name?: string;
  amc_name?: string;
}

export interface DownloadJob {
  id: number;
  tenant_id: number;
  job_type: 'daily' | 'historical' | 'weekly';
  scheme_ids: number[];
  scheduled_date: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  start_date?: string;
  end_date?: string;
  n8n_execution_id?: string;
  result_summary?: {
    total_schemes: number;
    successful_downloads: number;
    failed_downloads: number;
    total_records_inserted: number;
    total_records_updated: number;
    schemes_with_errors: Array<{
      scheme_code: string;
      error: string;
    }>;
    execution_time_ms: number;
  };
  error_details?: string;
  is_live: boolean;
  created_at: string;
  updated_at: string;
  schemes?: Array<{
    scheme_id: number;
    scheme_code: string;
    scheme_name: string;
  }>;
}

export interface DownloadProgress {
  jobId: number;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  progressPercentage: number;
  currentStep: string;
  processedSchemes: number;
  totalSchemes: number;
  processedRecords: number;
  estimatedTimeRemaining?: number;
  errors?: Array<{ scheme_code: string; error: string }>;
  startTime: string;
  lastUpdate: string;
}

export interface NavStatistics {
  total_schemes_tracked: number;
  total_nav_records: number;
  schemes_with_daily_download: number;
  schemes_with_historical_data: number;
  latest_nav_date: string;
  oldest_nav_date: string;
  download_jobs_today: number;
  failed_downloads_today: number;
}

// Request interfaces
export interface SchemeSearchParams {
  search: string;
  page?: number;
  page_size?: number;
  amc_name?: string;
  scheme_type?: number;
  scheme_category?: number;
}

export interface BookmarkSearchParams {
  page?: number;
  page_size?: number;
  search?: string;
  daily_download_only?: boolean;
  amc_name?: string;
}

export interface CreateBookmarkRequest {
  scheme_id: number;
  daily_download_enabled?: boolean;
  download_time?: string;
}

export interface UpdateBookmarkRequest {
  daily_download_enabled?: boolean;
  download_time?: string;
  historical_download_completed?: boolean;
}

export interface NavDataParams {
  scheme_id?: number;
  start_date?: string;
  end_date?: string;
  data_source?: 'daily' | 'historical' | 'weekly';
  page?: number;
  page_size?: number;
}

export interface HistoricalDownloadRequest {
  scheme_ids: number[];
  start_date: string;
  end_date: string;
}

export interface DownloadJobParams {
  status?: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  job_type?: 'daily' | 'historical' | 'weekly';
  page?: number;
  page_size?: number;
  date_from?: string;
  date_to?: string;
}

// API Response interfaces
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: {
    [key: string]: T[];
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
  };
}

// Service class
export class NavService {
  private baseURL: string;
  private defaultHeaders: Record<string, string>;

  constructor() {
    this.baseURL = process.env.REACT_APP_API_URL || 'http://localhost:8080';
    this.defaultHeaders = {
      'Content-Type': 'application/json',
    };
  }

  // ==================== PRIVATE HELPERS ====================

  private getAuthHeaders(): Record<string, string> {
    const token = localStorage.getItem('authToken');
    const tenantId = localStorage.getItem('tenantId');
    const environment = localStorage.getItem('environment') || 'live';

    return buildHeaders(token || undefined, tenantId || undefined, environment as 'live' | 'test');
  }

  private async makeRequest<T>(
    url: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...this.getAuthHeaders(),
          ...options.headers,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw {
          response: {
            status: response.status,
            data: data
          }
        };
      }

      return data;
    } catch (error: any) {
      console.error('NAV Service API Error:', error);
      throw {
        message: getAPIErrorMessage(error),
        status: error.response?.status,
        originalError: error
      };
    }
  }

  // ==================== SCHEME SEARCH ====================

  /**
   * Search available schemes for bookmarking
   */
  async searchSchemes(params: SchemeSearchParams): Promise<PaginatedResponse<SchemeSearchResult>> {
    const url = NAV_URLS.searchSchemes(params);
    return this.makeRequest<any>(url, { method: 'GET' });
  }

  // ==================== BOOKMARK MANAGEMENT ====================

  /**
   * Get user's bookmarked schemes
   */
  async getBookmarks(params: BookmarkSearchParams = {}): Promise<PaginatedResponse<SchemeBookmark>> {
    const url = NAV_URLS.getBookmarks(params);
    return this.makeRequest<any>(url, { method: 'GET' });
  }

  /**
   * Add scheme to bookmarks
   */
  async createBookmark(request: CreateBookmarkRequest): Promise<ApiResponse<SchemeBookmark>> {
    const url = NAV_URLS.createBookmark();
    return this.makeRequest<SchemeBookmark>(url, {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  /**
   * Update bookmark settings
   */
  async updateBookmark(bookmarkId: number, updates: UpdateBookmarkRequest): Promise<ApiResponse<SchemeBookmark>> {
    const url = NAV_URLS.updateBookmark(bookmarkId);
    return this.makeRequest<SchemeBookmark>(url, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  /**
   * Remove bookmark
   */
  async deleteBookmark(bookmarkId: number): Promise<ApiResponse<void>> {
    const url = NAV_URLS.deleteBookmark(bookmarkId);
    return this.makeRequest<void>(url, { method: 'DELETE' });
  }

  // ==================== NAV DATA ====================

  /**
   * Get NAV data with filtering
   */
  async getNavData(params: NavDataParams = {}): Promise<PaginatedResponse<NavData>> {
    const url = NAV_URLS.getNavData(params);
    return this.makeRequest<any>(url, { method: 'GET' });
  }

  /**
   * Get latest NAV for a specific scheme
   */
  async getLatestNav(schemeId: number): Promise<ApiResponse<NavData>> {
    const url = NAV_URLS.getLatestNav(schemeId);
    return this.makeRequest<NavData>(url, { method: 'GET' });
  }

  // ==================== DOWNLOAD OPERATIONS ====================

  /**
   * Trigger daily NAV download
   */
  async triggerDailyDownload(): Promise<ApiResponse<{ jobId: number; message: string; alreadyExists?: boolean }>> {
    const url = NAV_URLS.triggerDailyDownload();
    return this.makeRequest<any>(url, { method: 'POST' });
  }

  /**
   * Trigger historical NAV download
   */
  async triggerHistoricalDownload(request: HistoricalDownloadRequest): Promise<ApiResponse<{ jobId: number; message: string; estimatedTime: number }>> {
    const url = NAV_URLS.triggerHistoricalDownload();
    return this.makeRequest<any>(url, {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  /**
   * Get download progress (for UI polling)
   */
  async getDownloadProgress(jobId: number): Promise<ApiResponse<DownloadProgress>> {
    const url = NAV_URLS.getDownloadProgress(jobId);
    return this.makeRequest<DownloadProgress>(url, { method: 'GET' });
  }

  /**
   * Get download jobs history
   */
  async getDownloadJobs(params: DownloadJobParams = {}): Promise<PaginatedResponse<DownloadJob>> {
    const url = NAV_URLS.getDownloadJobs(params);
    return this.makeRequest<any>(url, { method: 'GET' });
  }

  /**
   * Cancel running download
   */
  async cancelDownloadJob(jobId: number): Promise<ApiResponse<void>> {
    const url = NAV_URLS.cancelDownloadJob(jobId);
    return this.makeRequest<void>(url, { method: 'DELETE' });
  }

  /**
   * Get active downloads
   */
  async getActiveDownloads(): Promise<ApiResponse<{ active_downloads: DownloadProgress[]; total_active: number }>> {
    const url = NAV_URLS.getActiveDownloads();
    return this.makeRequest<any>(url, { method: 'GET' });
  }

  // ==================== STATISTICS ====================

  /**
   * Get NAV statistics for dashboard
   */
  async getStatistics(): Promise<ApiResponse<NavStatistics>> {
    const url = NAV_URLS.getStatistics();
    return this.makeRequest<NavStatistics>(url, { method: 'GET' });
  }

  /**
   * Check if today's NAV data is available
   */
  async checkTodayData(): Promise<ApiResponse<{
    total_bookmarked_schemes: number;
    schemes_with_today_data: number;
    schemes_missing_data: number;
    data_available: boolean;
    message: string;
  }>> {
    const url = NAV_URLS.checkTodayData();
    return this.makeRequest<any>(url, { method: 'GET' });
  }

  // ==================== UTILITY METHODS ====================

  /**
   * Health check for NAV service
   */
  async healthCheck(): Promise<ApiResponse<{
    service: string;
    status: string;
    timestamp: string;
    version: string;
    environment: string;
  }>> {
    const url = NAV_URLS.healthCheck();
    return this.makeRequest<any>(url, { method: 'GET' });
  }

  /**
   * Get API documentation
   */
  async getApiDocs(): Promise<ApiResponse<any>> {
    const url = NAV_URLS.getApiDocs();
    return this.makeRequest<any>(url, { method: 'GET' });
  }

  // ==================== POLLING UTILITIES ====================

  /**
   * Poll download progress with automatic stop conditions
   * Returns a promise that resolves when download completes or fails
   */
  async pollDownloadProgress(
    jobId: number,
    onProgress?: (progress: DownloadProgress) => void,
    pollInterval: number = 2000
  ): Promise<DownloadProgress> {
    return new Promise((resolve, reject) => {
      const poll = async () => {
        try {
          const response = await this.getDownloadProgress(jobId);
          
          if (!response.success || !response.data) {
            reject(new Error('Failed to get download progress'));
            return;
          }

          const progress = response.data;
          
          // Notify progress callback
          if (onProgress) {
            onProgress(progress);
          }

          // Check if download is complete
          if (progress.status === 'completed' || progress.status === 'failed' || progress.status === 'cancelled') {
            resolve(progress);
            return;
          }

          // Continue polling
          setTimeout(poll, pollInterval);
          
        } catch (error) {
          reject(error);
        }
      };

      poll();
    });
  }

  /**
   * Start download with progress tracking (convenience method)
   */
  async startHistoricalDownloadWithTracking(
    request: HistoricalDownloadRequest,
    onProgress?: (progress: DownloadProgress) => void
  ): Promise<{ jobId: number; finalProgress: DownloadProgress }> {
    // Trigger the download
    const downloadResponse = await this.triggerHistoricalDownload(request);
    
    if (!downloadResponse.success || !downloadResponse.data) {
      throw new Error(downloadResponse.error || 'Failed to start download');
    }

    const jobId = downloadResponse.data.jobId;

    // Start progress polling
    const finalProgress = await this.pollDownloadProgress(jobId, onProgress);

    return { jobId, finalProgress };
  }

  /**
   * Check if schemes are already bookmarked (utility for UI)
   */
  async getBookmarkStatus(schemeIds: number[]): Promise<{ [schemeId: number]: boolean }> {
    try {
      const response = await this.getBookmarks({ page_size: 1000 });
      
      if (!response.success || !response.data.bookmarks) {
        return {};
      }

      const bookmarkedSchemeIds = new Set(response.data.bookmarks.map(b => b.scheme_id));
      
      return schemeIds.reduce((acc, schemeId) => {
        acc[schemeId] = bookmarkedSchemeIds.has(schemeId);
        return acc;
      }, {} as { [schemeId: number]: boolean });
      
    } catch (error) {
      console.error('Failed to get bookmark status:', error);
      return {};
    }
  }

  /**
   * Format estimated time for UI display
   */
  static formatEstimatedTime(milliseconds: number): string {
    if (milliseconds < 60000) { // Less than 1 minute
      return `${Math.ceil(milliseconds / 1000)} seconds`;
    } else if (milliseconds < 3600000) { // Less than 1 hour
      return `${Math.ceil(milliseconds / 60000)} minutes`;
    } else {
      const hours = Math.floor(milliseconds / 3600000);
      const minutes = Math.ceil((milliseconds % 3600000) / 60000);
      return `${hours}h ${minutes}m`;
    }
  }

  /**
   * Validate date range for historical downloads
   */
  static validateDateRange(startDate: Date, endDate: Date): { valid: boolean; error?: string } {
    if (startDate >= endDate) {
      return { valid: false, error: 'Start date must be before end date' };
    }

    const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysDiff > 183) { // 6 months
      return { valid: false, error: 'Date range cannot exceed 6 months' };
    }

    if (startDate > new Date()) {
      return { valid: false, error: 'Start date cannot be in the future' };
    }

    return { valid: true };
  }
}

// Export singleton instance
export const navService = new NavService();
export default navService;