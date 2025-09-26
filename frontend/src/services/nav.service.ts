// frontend/src/services/nav.service.ts
// File 5/14: Complete frontend service for NAV operations with enhanced bookmark functionality

import { NAV_URLS, buildHeaders, getAPIErrorMessage } from './serviceURLs';
import { toastService } from './toast.service';

// ==================== TYPE DEFINITIONS ====================

// API Response wrapper
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Paginated response wrapper
export interface PaginatedResponse<T> {
  success: boolean;
  data?: {
    [K in keyof T]: T[K];
  } & {
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
  };
  error?: string;
}

// Scheme search types
export interface SchemeSearchResult {
  id: number;
  scheme_code: string;
  scheme_name: string;
  amc_name: string;
  scheme_type_name?: string;
  scheme_category_name?: string;
  is_bookmarked: boolean;
  latest_nav_value?: number;
  latest_nav_date?: string;
}

export interface SchemeSearchParams {
  search: string;
  page?: number;
  page_size?: number;
  amc_name?: string;
  scheme_type?: number;
  scheme_category?: number;
}

// ENHANCED: Updated bookmark types with new fields
export interface SchemeBookmark {
  id: number;
  scheme_id: number;
  scheme_code: string;
  scheme_name: string;
  amc_name: string;
  daily_download_enabled: boolean;
  download_time: string;
  historical_download_completed: boolean;
  nav_records_count: number;
  latest_nav_date?: string;
  latest_nav_value?: number;
  earliest_nav_date?: string; // ADDED: First NAV record date
  created_at: string;
  updated_at: string;
  
  // ADDED: Download status tracking
  last_download_status?: 'success' | 'failed' | 'pending' | null;
  last_download_error?: string;
  last_download_attempt?: string;
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

// ADDED: New interfaces for enhanced bookmark functionality
export interface BookmarkNavDataParams {
  bookmark_id: number;
  start_date?: string;
  end_date?: string;
  page?: number;
  page_size?: number;
}

export interface BookmarkStats {
  bookmark_id: number;
  scheme_name: string;
  scheme_code: string;
  amc_name: string;
  nav_records_count: number;
  earliest_nav_date?: string;
  latest_nav_date?: string;
  latest_nav_value?: number;
  daily_download_enabled: boolean;
  historical_download_completed: boolean;
  last_download_status?: 'success' | 'failed' | 'pending' | null;
  last_download_error?: string;
  last_download_attempt?: string;
  date_range_days: number;
}

export interface UpdateBookmarkDownloadStatus {
  last_download_status: 'success' | 'failed' | 'pending';
  last_download_error?: string;
  last_download_attempt?: string;
}

// NAV data types
export interface NavData {
  id: number;
  scheme_id: number;
  scheme_code: string;
  scheme_name: string;
  amc_name: string;
  nav_date: string;
  nav_value: number;
  repurchase_price?: number;
  sale_price?: number;
  data_source: string;
  created_at: string;
}

export interface NavDataParams {
  scheme_id?: number;
  start_date?: string;
  end_date?: string;
  data_source?: string;
  page?: number;
  page_size?: number;
}

// Download types
export interface DownloadJob {
  id: number;
  job_type: 'daily' | 'historical' | 'weekly';
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  schemes: Array<{
    scheme_id: number;
    scheme_code: string;
    scheme_name: string;
  }>;
  scheduled_date: string;
  start_date?: string;
  end_date?: string;
  result_summary?: {
    total_schemes: number;
    successful_downloads: number;
    failed_downloads: number;
    total_records_inserted: number;
    total_records_updated: number;
    execution_time_ms: number;
  };
  created_at: string;
  updated_at: string;
}

export interface DownloadJobParams {
  status?: string;
  job_type?: string;
  page?: number;
  page_size?: number;
  date_from?: string;
  date_to?: string;
}

export interface HistoricalDownloadRequest {
  scheme_ids: number[];
  start_date: string;
  end_date: string;
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
  errors?: Array<{
    scheme_id: number;
    scheme_code: string;
    error: string;
  }>;
  startTime: string;
  lastUpdate: string;
}

// Statistics types
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

// Scheduler types
export interface SchedulerConfig {
  id?: number;
  schedule_type: 'daily' | 'weekly' | 'custom';
  download_time: string;
  cron_expression?: string;
  is_enabled: boolean;
  next_execution_at?: string;
  last_executed_at?: string;
  execution_count?: number;
  failure_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface SchedulerStatus {
  config: SchedulerConfig;
  is_running: boolean;
  cron_job_active: boolean;
  next_run: string | null;
  last_run: string | null;
  recent_executions: Array<{
    id: number;
    execution_time: string;
    status: 'success' | 'failed' | 'skipped';
    n8n_execution_id?: string;
    error_message?: string;
    execution_duration_ms?: number;
  }>;
}

// ==================== NAV SERVICE CLASS ====================

export class NavService {
 private getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('access_token'); 
  const tenantId = localStorage.getItem('tenant_id'); 
  const environment = localStorage.getItem('environment') as 'live' | 'test' || 'test';

  return buildHeaders(token || '', tenantId || '', environment);
}

  private getEnvironment(): 'live' | 'test' {
    return (localStorage.getItem('environment') as 'live' | 'test') || 'test';
  }

  private async handleRequest<T>(
    url: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T> | PaginatedResponse<T>> {
    try {
      const response = await fetch(url, {
        headers: this.getAuthHeaders(),
        ...options
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(getAPIErrorMessage(errorData));
      }

      const data = await response.json();
      return data;
    } catch (error: any) {
      console.error('NAV API Error:', error);
      return {
        success: false,
        error: error.message || 'An unexpected error occurred'
      };
    }
  }

  // ==================== SCHEME SEARCH OPERATIONS ====================

  /**
   * Search schemes for bookmarking
   */
  async searchSchemes(params: SchemeSearchParams): Promise<PaginatedResponse<{ schemes: SchemeSearchResult[] }>> {
    const url = NAV_URLS.searchSchemes(params, this.getEnvironment());
    
    const response = await this.handleRequest<{ schemes: SchemeSearchResult[] }>(url);
    
    if (!response.success) {
      toastService.error(response.error || 'Failed to search schemes');
    }
    
    return response as PaginatedResponse<{ schemes: SchemeSearchResult[] }>;
  }

  // ==================== BOOKMARK OPERATIONS ====================

  /**
   * Get user's bookmarked schemes
   */
  async getBookmarks(params?: BookmarkSearchParams): Promise<PaginatedResponse<{ bookmarks: SchemeBookmark[] }>> {
    const url = NAV_URLS.getBookmarks(params, this.getEnvironment());
    
    const response = await this.handleRequest<{ bookmarks: SchemeBookmark[] }>(url);
    
    if (!response.success) {
      toastService.error(response.error || 'Failed to load bookmarks');
    }
    
    return response as PaginatedResponse<{ bookmarks: SchemeBookmark[] }>;
  }

  /**
   * Create new bookmark
   */
  async createBookmark(request: CreateBookmarkRequest): Promise<ApiResponse<SchemeBookmark>> {
    const url = NAV_URLS.createBookmark(this.getEnvironment());
    
    const response = await this.handleRequest<SchemeBookmark>(url, {
      method: 'POST',
      body: JSON.stringify(request)
    });
    
    if (response.success) {
      toastService.success('Scheme bookmarked successfully');
    } else {
      toastService.error(response.error || 'Failed to bookmark scheme');
    }
    
    return response as ApiResponse<SchemeBookmark>;
  }

  /**
   * Update bookmark settings
   */
  async updateBookmark(id: number, updates: UpdateBookmarkRequest): Promise<ApiResponse<SchemeBookmark>> {
    const url = NAV_URLS.updateBookmark(id, this.getEnvironment());
    
    const response = await this.handleRequest<SchemeBookmark>(url, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
    
    if (response.success) {
      toastService.success('Bookmark updated successfully');
    } else {
      toastService.error(response.error || 'Failed to update bookmark');
    }
    
    return response as ApiResponse<SchemeBookmark>;
  }

  /**
   * Delete bookmark
   */
  async deleteBookmark(id: number): Promise<ApiResponse<void>> {
    const url = NAV_URLS.deleteBookmark(id, this.getEnvironment());
    
    const response = await this.handleRequest<void>(url, {
      method: 'DELETE'
    });
    
    if (response.success) {
      toastService.success('Bookmark removed successfully');
    } else {
      toastService.error(response.error || 'Failed to remove bookmark');
    }
    
    return response as ApiResponse<void>;
  }

  // ==================== ENHANCED BOOKMARK METHODS ====================

  /**
   * Get NAV data for a specific bookmark
   */
  async getBookmarkNavData(params: BookmarkNavDataParams): Promise<PaginatedResponse<{ nav_data: NavData[] }>> {
    const url = NAV_URLS.getBookmarkNavData(params.bookmark_id, {
      start_date: params.start_date,
      end_date: params.end_date,
      page: params.page,
      page_size: params.page_size
    }, this.getEnvironment());
    
    const response = await this.handleRequest<{ nav_data: NavData[] }>(url);
    
    if (!response.success) {
      toastService.error(response.error || 'Failed to load bookmark NAV data');
    }
    
    return response as PaginatedResponse<{ nav_data: NavData[] }>;
  }

  /**
   * Get comprehensive statistics for a bookmark
   */
  async getBookmarkStats(bookmarkId: number): Promise<ApiResponse<BookmarkStats>> {
    const url = NAV_URLS.getBookmarkStats(bookmarkId, this.getEnvironment());
    
    const response = await this.handleRequest<BookmarkStats>(url);
    
    if (!response.success) {
      toastService.error(response.error || 'Failed to load bookmark statistics');
    }
    
    return response as ApiResponse<BookmarkStats>;
  }

  /**
   * Update bookmark download status (internal use)
   */
  async updateBookmarkDownloadStatus(
    bookmarkId: number, 
    status: UpdateBookmarkDownloadStatus
  ): Promise<ApiResponse<void>> {
    const url = NAV_URLS.updateBookmarkDownloadStatus(bookmarkId, this.getEnvironment());
    
    const response = await this.handleRequest<void>(url, {
      method: 'PUT',
      body: JSON.stringify(status)
    });
    
    if (!response.success) {
      console.warn('Failed to update bookmark download status:', response.error);
    }
    
    return response as ApiResponse<void>;
  }

  /**
   * ENHANCED: Trigger historical download with bookmark status updates
   */
  async triggerHistoricalDownloadForBookmarks(
    bookmarkIds: number[], 
    startDate: string, 
    endDate: string
  ): Promise<ApiResponse<{ jobId: number; message: string; estimatedTime: number }>> {
    // First get the scheme IDs for these bookmarks
    const bookmarksResponse = await this.getBookmarks({ page: 1, page_size: 1000 });
    
    if (!bookmarksResponse.success || !bookmarksResponse.data) {
      return {
        success: false,
        error: 'Failed to get bookmark details'
      };
    }

    const relevantBookmarks = bookmarksResponse.data.bookmarks.filter(b => 
      bookmarkIds.includes(b.id)
    );

    if (relevantBookmarks.length === 0) {
      return {
        success: false,
        error: 'No valid bookmarks found'
      };
    }

    const schemeIds = relevantBookmarks.map(b => b.scheme_id);

    // Trigger the historical download using existing method
    const request: HistoricalDownloadRequest = {
      scheme_ids: schemeIds,
      start_date: startDate,
      end_date: endDate
    };

    const response = await this.triggerHistoricalDownload(request);

    // If successful, update bookmark statuses to pending
    if (response.success) {
      try {
        for (const bookmarkId of bookmarkIds) {
          await this.updateBookmarkDownloadStatus(bookmarkId, {
            last_download_status: 'pending',
            last_download_attempt: new Date().toISOString()
          });
        }
      } catch (statusError) {
        console.warn('Failed to update bookmark status after triggering download:', statusError);
        // Don't fail the main operation if status update fails
      }
    }

    return response;
  }

  /**
   * Get bookmark download status summary
   */
  async getBookmarkDownloadStatus(bookmarkIds: number[]): Promise<ApiResponse<{
    [bookmarkId: number]: {
      status: 'success' | 'failed' | 'pending' | 'no-data';
      lastAttempt?: string;
      error?: string;
    }
  }>> {
    try {
      const bookmarksResponse = await this.getBookmarks({ page: 1, page_size: 1000 });
      
      if (!bookmarksResponse.success || !bookmarksResponse.data) {
        return {
          success: false,
          error: 'Failed to get bookmark status'
        };
      }

      const statusMap: { [bookmarkId: number]: any } = {};

      bookmarkIds.forEach(bookmarkId => {
        const bookmark = bookmarksResponse.data!.bookmarks.find(b => b.id === bookmarkId);
        
        if (bookmark) {
          statusMap[bookmarkId] = {
            status: bookmark.last_download_status || 
                   (bookmark.nav_records_count > 0 ? 'success' : 'no-data'),
            lastAttempt: bookmark.last_download_attempt,
            error: bookmark.last_download_error
          };
        } else {
          statusMap[bookmarkId] = {
            status: 'no-data'
          };
        }
      });

      return {
        success: true,
        data: statusMap
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to get download status'
      };
    }
  }

  // ==================== NAV DATA OPERATIONS ====================

  /**
   * Get NAV data with filtering
   */
  async getNavData(params?: NavDataParams): Promise<PaginatedResponse<{ nav_data: NavData[] }>> {
    const url = NAV_URLS.getNavData(params, this.getEnvironment());
    
    const response = await this.handleRequest<{ nav_data: NavData[] }>(url);
    
    if (!response.success) {
      toastService.error(response.error || 'Failed to load NAV data');
    }
    
    return response as PaginatedResponse<{ nav_data: NavData[] }>;
  }

  /**
   * Get latest NAV for specific scheme
   */
  async getLatestNav(schemeId: number): Promise<ApiResponse<NavData>> {
    const url = NAV_URLS.getLatestNav(schemeId, this.getEnvironment());
    
    const response = await this.handleRequest<NavData>(url);
    
    if (!response.success) {
      toastService.error(response.error || 'Failed to load latest NAV');
    }
    
    return response as ApiResponse<NavData>;
  }

  // ==================== DOWNLOAD OPERATIONS ====================

  /**
   * Trigger daily NAV download
   */
  async triggerDailyDownload(): Promise<ApiResponse<{ jobId: number; message: string; alreadyExists?: boolean }>> {
    const url = NAV_URLS.triggerDailyDownload(this.getEnvironment());
    
    const response = await this.handleRequest<{ jobId: number; message: string; alreadyExists?: boolean }>(url, {
      method: 'POST'
    });
    
    if (response.success) {
      toastService.success(response.data?.message || 'Daily download started');
    } else {
      toastService.error(response.error || 'Failed to trigger daily download');
    }
    
    return response as ApiResponse<{ jobId: number; message: string; alreadyExists?: boolean }>;
  }

  /**
   * Trigger historical NAV download
   */
  async triggerHistoricalDownload(request: HistoricalDownloadRequest): Promise<ApiResponse<{ jobId: number; message: string; estimatedTime: number }>> {
    const url = NAV_URLS.triggerHistoricalDownload(this.getEnvironment());
    
    const response = await this.handleRequest<{ jobId: number; message: string; estimatedTime: number }>(url, {
      method: 'POST',
      body: JSON.stringify(request)
    });
    
    if (response.success) {
      toastService.success(response.data?.message || 'Historical download started');
    } else {
      toastService.error(response.error || 'Failed to trigger historical download');
    }
    
    return response as ApiResponse<{ jobId: number; message: string; estimatedTime: number }>;
  }

  /**
   * Get download progress
   */
  async getDownloadProgress(jobId: number): Promise<ApiResponse<DownloadProgress>> {
    const url = NAV_URLS.getDownloadProgress(jobId, this.getEnvironment());
    
    const response = await this.handleRequest<DownloadProgress>(url);
    
    // Don't show error toast for progress requests (they poll frequently)
    return response as ApiResponse<DownloadProgress>;
  }

  /**
   * Get download jobs history
   */
  async getDownloadJobs(params?: DownloadJobParams): Promise<PaginatedResponse<{ jobs: DownloadJob[] }>> {
    const url = NAV_URLS.getDownloadJobs(params, this.getEnvironment());
    
    const response = await this.handleRequest<{ jobs: DownloadJob[] }>(url);
    
    if (!response.success) {
      toastService.error(response.error || 'Failed to load download jobs');
    }
    
    return response as PaginatedResponse<{ jobs: DownloadJob[] }>;
  }

  /**
   * Cancel download job
   */
  async cancelDownloadJob(jobId: number): Promise<ApiResponse<void>> {
    const url = NAV_URLS.cancelDownload(jobId, this.getEnvironment());
    
    const response = await this.handleRequest<void>(url, {
      method: 'DELETE'
    });
    
    if (response.success) {
      toastService.success('Download cancelled successfully');
    } else {
      toastService.error(response.error || 'Failed to cancel download');
    }
    
    return response as ApiResponse<void>;
  }

  /**
   * Get active downloads
   */
  async getActiveDownloads(): Promise<ApiResponse<{ active_downloads: DownloadProgress[] }>> {
    const url = NAV_URLS.getActiveDownloads(this.getEnvironment());
    
    const response = await this.handleRequest<{ active_downloads: DownloadProgress[] }>(url);
    
    if (!response.success) {
      toastService.error(response.error || 'Failed to load active downloads');
    }
    
    return response as ApiResponse<{ active_downloads: DownloadProgress[] }>;
  }

  // ==================== STATISTICS OPERATIONS ====================

  /**
   * Get NAV statistics
   */
  async getStatistics(): Promise<ApiResponse<NavStatistics>> {
    const url = NAV_URLS.getStatistics(this.getEnvironment());
    
    const response = await this.handleRequest<NavStatistics>(url);
    
    if (!response.success) {
      toastService.error(response.error || 'Failed to load statistics');
    }
    
    return response as ApiResponse<NavStatistics>;
  }

  /**
   * Check today's data availability
   */
  async checkTodayData(): Promise<ApiResponse<{
    total_bookmarked_schemes: number;
    schemes_with_today_data: number;
    schemes_missing_data: number;
    data_available: boolean;
    message: string;
  }>> {
    const url = NAV_URLS.checkTodayData(this.getEnvironment());
    
    const response = await this.handleRequest<{
      total_bookmarked_schemes: number;
      schemes_with_today_data: number;
      schemes_missing_data: number;
      data_available: boolean;
      message: string;
    }>(url);
    
    // Don't show error toast - this is used for status checking
    return response as ApiResponse<{
      total_bookmarked_schemes: number;
      schemes_with_today_data: number;
      schemes_missing_data: number;
      data_available: boolean;
      message: string;
    }>;
  }

  // ==================== SCHEDULER OPERATIONS ====================

  /**
   * Get scheduler configuration
   */
  async getSchedulerConfig(): Promise<ApiResponse<SchedulerConfig>> {
    const url = NAV_URLS.getSchedulerConfig(this.getEnvironment());
    
    const response = await this.handleRequest<SchedulerConfig>(url);
    
    if (!response.success) {
      // Don't show error toast if config doesn't exist (404 is expected)
      if (!response.error?.includes('not found')) {
        toastService.error(response.error || 'Failed to load scheduler config');
      }
    }
    
    return response as ApiResponse<SchedulerConfig>;
  }

  /**
   * Save scheduler configuration
   */
  async saveSchedulerConfig(config: Omit<SchedulerConfig, 'id'>): Promise<ApiResponse<SchedulerConfig>> {
    const url = NAV_URLS.saveSchedulerConfig(this.getEnvironment());
    
    const response = await this.handleRequest<SchedulerConfig>(url, {
      method: 'POST',
      body: JSON.stringify(config)
    });
    
    if (response.success) {
      toastService.success('Scheduler configuration saved successfully');
    } else {
      toastService.error(response.error || 'Failed to save scheduler configuration');
    }
    
    return response as ApiResponse<SchedulerConfig>;
  }

  /**
   * Update scheduler configuration
   */
  async updateSchedulerConfig(id: number, updates: Partial<SchedulerConfig>): Promise<ApiResponse<SchedulerConfig>> {
    const url = NAV_URLS.updateSchedulerConfig(id, this.getEnvironment());
    
    const response = await this.handleRequest<SchedulerConfig>(url, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
    
    if (response.success) {
      toastService.success('Scheduler configuration updated successfully');
    } else {
      toastService.error(response.error || 'Failed to update scheduler configuration');
    }
    
    return response as ApiResponse<SchedulerConfig>;
  }

  /**
   * Delete scheduler configuration
   */
  async deleteSchedulerConfig(): Promise<ApiResponse<void>> {
    const url = NAV_URLS.deleteSchedulerConfig(this.getEnvironment());
    
    const response = await this.handleRequest<void>(url, {
      method: 'DELETE'
    });
    
    if (response.success) {
      toastService.success('Scheduler configuration deleted successfully');
    } else {
      toastService.error(response.error || 'Failed to delete scheduler configuration');
    }
    
    return response as ApiResponse<void>;
  }

  /**
   * Get scheduler status
   */
  async getSchedulerStatus(): Promise<ApiResponse<SchedulerStatus>> {
    const url = NAV_URLS.getSchedulerStatus(this.getEnvironment());
    
    const response = await this.handleRequest<SchedulerStatus>(url);
    
    if (!response.success) {
      toastService.error(response.error || 'Failed to load scheduler status');
    }
    
    return response as ApiResponse<SchedulerStatus>;
  }

  /**
   * Manually trigger scheduled download
   */
  async triggerScheduledDownload(): Promise<ApiResponse<{ execution_id: string; message: string }>> {
    const url = NAV_URLS.triggerScheduledDownload(this.getEnvironment());
    
    const response = await this.handleRequest<{ execution_id: string; message: string }>(url, {
      method: 'POST'
    });
    
    if (response.success) {
      toastService.success(response.data?.message || 'Download triggered successfully');
    } else {
      toastService.error(response.error || 'Failed to trigger download');
    }
    
    return response as ApiResponse<{ execution_id: string; message: string }>;
  }

  /**
   * Get all active schedulers (admin)
   */
  async getAllActiveSchedulers(): Promise<ApiResponse<{ active_schedulers: any[]; total_active: number }>> {
    const url = NAV_URLS.getAllActiveSchedulers(this.getEnvironment());
    
    const response = await this.handleRequest<{ active_schedulers: any[]; total_active: number }>(url);
    
    if (!response.success) {
      toastService.error(response.error || 'Failed to load active schedulers');
    }
    
    return response as ApiResponse<{ active_schedulers: any[]; total_active: number }>;
  }

  // ==================== UTILITY METHODS ====================

  /**
   * Format estimated time for display
   */
  static formatEstimatedTime(ms: number): string {
    if (ms < 60000) {
      return `${Math.round(ms / 1000)} seconds`;
    } else if (ms < 3600000) {
      return `${Math.round(ms / 60000)} minutes`;
    } else {
      return `${Math.round(ms / 3600000)} hours`;
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
    if (daysDiff > 183) {
      return { valid: false, error: 'Date range cannot exceed 6 months' };
    }

    const today = new Date();
    if (endDate > today) {
      return { valid: false, error: 'End date cannot be in the future' };
    }

    return { valid: true };
  }

  /**
   * Generate cron expression from schedule type and time
   */
  static generateCronExpression(scheduleType: string, downloadTime: string): string {
    const [hours, minutes] = downloadTime.split(':').map(Number);

    switch (scheduleType) {
      case 'daily':
        return `${minutes} ${hours} * * *`;
      case 'weekly':
        return `${minutes} ${hours} * * 5`; // Friday
      default:
        return `${minutes} ${hours} * * *`;
    }
  }

 /**
 * ADDED: Utility - Format date range for display
 */
static formatDateRange(earliestDate?: string, latestDate?: string): string {
  if (!earliestDate && !latestDate) return 'No NAV data';
  if (!earliestDate && latestDate) return `Latest: ${new Date(latestDate).toLocaleDateString()}`;
  if (earliestDate && !latestDate) return `From: ${new Date(earliestDate).toLocaleDateString()}`;
  
  // Both dates exist at this point, but TypeScript needs explicit checks
  if (!earliestDate || !latestDate) return 'No NAV data';
  
  const earliest = new Date(earliestDate).toLocaleDateString();
  const latest = new Date(latestDate).toLocaleDateString();
  
  if (earliest === latest) {
    return `Single date: ${earliest}`;
  }
  
  return `${earliest} - ${latest}`;
}

  /**
   * ADDED: Utility - Get download status display info
   */
  static getDownloadStatusDisplay(bookmark: SchemeBookmark): {
    status: 'success' | 'failed' | 'pending' | 'no-data';
    color: string;
    label: string;
    icon: string;
  } {
    if (bookmark.last_download_status === 'failed') {
      return {
        status: 'failed',
        color: '#ef4444', // red-500
        label: 'Download Failed',
        icon: '❌'
      };
    }
    
    if (bookmark.last_download_status === 'pending') {
      return {
        status: 'pending',
        color: '#f59e0b', // amber-500
        label: 'Download Pending',
        icon: '⏳'
      };
    }
    
    if (bookmark.nav_records_count > 0) {
      return {
        status: 'success',
        color: '#22c55e', // green-500
        label: 'Data Available',
        icon: '✅'
      };
    }
    
    return {
      status: 'no-data',
      color: '#6b7280', // gray-500
      label: 'No Data',
      icon: '⚪'
    };
  }
}

// ==================== SINGLETON EXPORT ====================

export const navService = new NavService();
export default navService;