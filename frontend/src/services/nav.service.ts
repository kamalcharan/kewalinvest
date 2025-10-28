// frontend/src/services/nav.service.ts
// UPDATED: Enhanced 409 error handling with existing_data details and improved toast messages
// UPDATED: Corrected bookmark gap detection method names and added bulk bookmark functionality

import { NAV_URLS, buildHeaders, getAPIErrorMessage } from './serviceURLs';
import { toastService } from './toast.service';

// ==================== TYPE DEFINITIONS ====================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  existing_data?: {
    scheme_id: number;
    scheme_name: string;
    earliest_date: string;
    latest_date: string;
    record_count: number;
  };
}

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
  launch_date?: string;
}

export interface SchemeSearchParams {
  search: string;
  page?: number;
  page_size?: number;
  amc_name?: string;
  scheme_type?: number;
  scheme_category?: number;
}

export interface SchemeBookmark {
  id: number;
  scheme_id: number;
  scheme_code: string;
  scheme_name: string;
  scheme_nav_name?: string;
  amc_name: string;
  alias_name?: string;
  daily_download_enabled: boolean;
  download_time: string;
  historical_download_completed: boolean;
  nav_records_count: number;
  latest_nav_date?: string;
  latest_nav_value?: number;
  earliest_nav_date?: string;
  launch_date?: string;
  created_at: string;
  updated_at: string;
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
  has_historical_data?: 'true' | 'false';  // Server-side filter for NAV data availability
  has_calculations?: string; // Filter for schemes with/without calculations
  show_all?: string; // Admin flag to show all schemes across tenants
}

export interface CreateBookmarkRequest {
  scheme_id: number;
  alias_name?: string;
  daily_download_enabled?: boolean;
  download_time?: string;
}

export interface UpdateBookmarkRequest {
  alias_name?: string;
  daily_download_enabled?: boolean;
  download_time?: string;
  historical_download_completed?: boolean;
}

export interface BookmarkNavDataParams {
  bookmark_id: number;
  start_date?: string;
  end_date?: string;
  page?: number;
  page_size?: number;
  granularity?: 'daily' | 'monthly';
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

export interface NavStatistics {
  total_schemes_tracked: number;
  schemes_with_daily_download: number;
  schemes_with_historical_data: number;
  schemes_without_calculations: number;
  latest_nav_date: string;
  oldest_nav_date: string;
  download_jobs_today: number;
  failed_downloads_today: number;
}

export interface UnbookmarkedScheme {
  scheme_code: string;
  scheme_name: string;
  customer_count: number;
  transaction_count: number;
  total_invested: number;
  last_transaction_date: string;
  first_transaction_date: string;
  scheme_id: number | null;
  amc_name: string | null;
  exists_in_master: boolean;
}

export interface BookmarkGapSummary {
  total_unbookmarked: number;
  total_customers_affected: number;
  total_investment_at_risk: number;
  schemes_not_in_master: number;
  schemes_not_bookmarked: number;
  last_checked: string;
}

export interface CustomerUnbookmarkedScheme {
  customer_id: number;
  customer_name: string;
  scheme_code: string;
  scheme_name: string;
  folio_no: string;
  total_invested: number;
  transaction_count: number;
  last_transaction_date: string;
  scheme_id: number | null;
  exists_in_master: boolean;
}

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

    console.log('🔧 NavService getAuthHeaders():');
    console.log('🔧 - token exists:', !!token);
    console.log('🔧 - tenantId:', tenantId);
    console.log('🔧 - environment from localStorage:', localStorage.getItem('environment'));
    console.log('🔧 - final environment used:', environment);

    const headers = buildHeaders(token || '', tenantId || '', environment);
    console.log('🔧 - final headers:', headers);
    return headers;
  }

  private getEnvironment(): 'live' | 'test' {
    const env = localStorage.getItem('environment') as 'live' | 'test';
    console.log('🔍 NavService getEnvironment():', env);
    console.log('🔍 localStorage.getItem("environment"):', localStorage.getItem('environment'));
    console.log('🔍 Final returned environment:', env || 'test');
    return env || 'test';
  }

  private async handleRequest<T>(
    url: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T> | PaginatedResponse<T>> {
    try {
      console.log('🌐 NavService handleRequest:');
      console.log('🌐 - URL:', url);
      
      const headers = this.getAuthHeaders();
      console.log('🌐 - Headers:', headers);
      
      const response = await fetch(url, {
        headers,
        ...options
      });

      console.log('🌐 - Response status:', response.status);
      console.log('🌐 - Response ok:', response.ok);

      if (!response.ok) {
        console.error('🌐 - Response not ok, status:', response.status);
        const errorText = await response.text();
        console.error('🌐 - Error response text:', errorText);
        
        let errorData: any = {};
        try {
          errorData = errorText ? JSON.parse(errorText) : {};
        } catch (parseError) {
          errorData = { error: errorText };
        }
        
        // Handle 429 with actual backend error message
        if (response.status === 429) {
          return {
            success: false,
            error: errorData.error || 'Too many requests. Please wait a moment before trying again.'
          };
        }
        
        // Enhanced 409 handling with existing_data extraction
        if (response.status === 409) {
          const errorMsg = errorData.error || '';
          const existingData = errorData.existing_data;
          
          // Check if this is a date range overlap error with details
          if (existingData) {
            return {
              success: false,
              error: errorMsg,
              existing_data: existingData
            };
          }
          
          // Other 409 conflicts
          return {
            success: false,
            error: errorMsg || 'A conflict occurred. The requested operation cannot be completed.'
          };
        }
        
        throw new Error(getAPIErrorMessage(errorData));
      }

      const data = await response.json();
      console.log('🌐 - Success response data:', data);
      return data;
    } catch (error: any) {
      console.error('🌐 NavService Error:', error);
      console.error('🌐 URL was:', url);
      return {
        success: false,
        error: error.message || 'An unexpected error occurred'
      };
    }
  }

  // ==================== SCHEME SEARCH OPERATIONS ====================

  async searchSchemes(params: SchemeSearchParams): Promise<PaginatedResponse<{ schemes: SchemeSearchResult[] }>> {
    const url = NAV_URLS.searchSchemes(params, this.getEnvironment());
    
    const response = await this.handleRequest<{ schemes: SchemeSearchResult[] }>(url);
    
    if (!response.success) {
      toastService.error(response.error || 'Failed to search schemes');
    }
    
    return response as PaginatedResponse<{ schemes: SchemeSearchResult[] }>;
  }

  // ==================== BOOKMARK OPERATIONS ====================

  async getBookmarks(params?: BookmarkSearchParams): Promise<PaginatedResponse<{ bookmarks: SchemeBookmark[] }>> {
    const url = NAV_URLS.getBookmarks(params, this.getEnvironment());
    
    const response = await this.handleRequest<{ bookmarks: SchemeBookmark[] }>(url);
    
    if (!response.success) {
      toastService.error(response.error || 'Failed to load bookmarks');
    }
    
    return response as PaginatedResponse<{ bookmarks: SchemeBookmark[] }>;
  }

  async createBookmark(request: CreateBookmarkRequest): Promise<ApiResponse<SchemeBookmark>> {
    const url = NAV_URLS.createBookmark(this.getEnvironment());
    
    const response = await this.handleRequest<SchemeBookmark>(url, {
      method: 'POST',
      body: JSON.stringify(request)
    });
    
    return response as ApiResponse<SchemeBookmark>;
  }

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

  /**
   * Delete all NAV data for a scheme
   */
  async deleteNavData(schemeId: number): Promise<ApiResponse<{ deleted_count: number }>> {
    const url = NAV_URLS.deleteNavData(schemeId, this.getEnvironment());

    const response = await this.handleRequest<{ deleted_count: number }>(url, {
      method: 'DELETE'
    });

    if (response.success) {
      const deletedCount = response.data?.deleted_count || 0;
      toastService.success(`Successfully deleted ${deletedCount.toLocaleString()} NAV records`);
    } else {
      toastService.error(response.error || 'Failed to delete NAV data');
    }

    return response as ApiResponse<{ deleted_count: number }>;
  }

  // ==================== ENHANCED BOOKMARK METHODS ====================

  async getBookmarkNavData(params: BookmarkNavDataParams): Promise<PaginatedResponse<{ nav_data: NavData[] }>> {
    const url = NAV_URLS.getBookmarkNavData(params.bookmark_id, {
      start_date: params.start_date,
      end_date: params.end_date,
      page: params.page,
      page_size: params.page_size,
      granularity: params.granularity
    }, this.getEnvironment());
    
    const response = await this.handleRequest<{ nav_data: NavData[] }>(url);
    
    if (!response.success) {
      toastService.error(response.error || 'Failed to load bookmark NAV data');
    }
    
    return response as PaginatedResponse<{ nav_data: NavData[] }>;
  }

  async getBookmarkStats(bookmarkId: number): Promise<ApiResponse<BookmarkStats>> {
    const url = NAV_URLS.getBookmarkStats(bookmarkId, this.getEnvironment());
    
    const response = await this.handleRequest<BookmarkStats>(url);
    
    if (!response.success) {
      toastService.error(response.error || 'Failed to load bookmark statistics');
    }
    
    return response as ApiResponse<BookmarkStats>;
  }

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

  async getBookmarkDownloadStatus(bookmarkIds: number[]): Promise<ApiResponse<{
    [bookmarkId: number]: {
      status: 'success' | 'failed' | 'pending' | 'no-data';
      lastAttempt?: string;
      error?: string;
    }
  }>> {
    try {
      const statusMap: { [bookmarkId: number]: any } = {};

      bookmarkIds.forEach(bookmarkId => {
        statusMap[bookmarkId] = {
          status: 'no-data',
          lastAttempt: undefined,
          error: undefined
        };
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

  async triggerHistoricalDownloadForBookmarks(
    bookmarkIds: number[], 
    startDate: string, 
    endDate: string
  ): Promise<ApiResponse<{ job_id: number; message: string; total_schemes: number; estimated_time_ms: number }>> {
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

    const request: HistoricalDownloadRequest = {
      scheme_ids: schemeIds,
      start_date: startDate,
      end_date: endDate
    };

    const response = await this.triggerHistoricalDownload(request);

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
      }
    }

    return response;
  }

  // ==================== NAV DATA OPERATIONS ====================

  async getNavData(params?: NavDataParams): Promise<PaginatedResponse<{ nav_data: NavData[] }>> {
    const url = NAV_URLS.getNavData(params, this.getEnvironment());
    
    const response = await this.handleRequest<{ nav_data: NavData[] }>(url);
    
    if (!response.success) {
      toastService.error(response.error || 'Failed to load NAV data');
    }
    
    return response as PaginatedResponse<{ nav_data: NavData[] }>;
  }

  async getLatestNav(schemeId: number): Promise<ApiResponse<NavData>> {
    const url = NAV_URLS.getLatestNav(schemeId, this.getEnvironment());
    
    const response = await this.handleRequest<NavData>(url);
    
    if (!response.success) {
      toastService.error(response.error || 'Failed to load latest NAV');
    }
    
    return response as ApiResponse<NavData>;
  }

  // ==================== DOWNLOAD OPERATIONS ====================

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

  async triggerHistoricalDownload(
    request: HistoricalDownloadRequest
  ): Promise<ApiResponse<{ job_id: number; message: string; total_schemes: number; estimated_time_ms: number }>> {
    const url = NAV_URLS.triggerHistoricalDownload(this.getEnvironment());
    
    const response = await this.handleRequest<{ 
      job_id: number; 
      message: string;
      total_schemes: number;
      estimated_time_ms: number;
    }>(url, {
      method: 'POST',
      body: JSON.stringify(request)
    });
    
    if (response.success) {
      const schemeCount = response.data?.total_schemes || request.scheme_ids.length;
      toastService.success(`Historical download started for ${schemeCount} scheme${schemeCount > 1 ? 's' : ''}`);
    } else {
      // Show detailed toast for date range overlap errors
      if ((response as any).existing_data) {
        const existingData = (response as any).existing_data;
        toastService.error(
          `Date range overlap detected for ${existingData.scheme_name}. ` +
          `Existing data: ${new Date(existingData.earliest_date).toLocaleDateString()} to ` +
          `${new Date(existingData.latest_date).toLocaleDateString()} ` +
          `(${existingData.record_count} records). Please adjust your date range.`
        );
      } else {
        toastService.error(response.error || 'Failed to trigger historical download');
      }
    }
    
    return response as ApiResponse<{ 
      job_id: number; 
      message: string;
      total_schemes: number;
      estimated_time_ms: number;
    }>;
  }

  async getDownloadProgress(jobId: number): Promise<ApiResponse<DownloadProgress>> {
    console.log('📊 getDownloadProgress called with jobId:', jobId);
    console.log('📊 Current environment:', this.getEnvironment());
    
    const url = NAV_URLS.getDownloadProgress(jobId, this.getEnvironment());
    console.log('📊 Generated URL:', url);
    
    const response = await this.handleRequest<DownloadProgress>(url);
    console.log('📊 Response:', response);
    
    return response as ApiResponse<DownloadProgress>;
  }

  async getDownloadJobs(params?: DownloadJobParams): Promise<PaginatedResponse<{ jobs: DownloadJob[] }>> {
    const url = NAV_URLS.getDownloadJobs(params, this.getEnvironment());
    
    const response = await this.handleRequest<{ jobs: DownloadJob[] }>(url);
    
    if (!response.success) {
      toastService.error(response.error || 'Failed to load download jobs');
    }
    
    return response as PaginatedResponse<{ jobs: DownloadJob[] }>;
  }

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

  async getActiveDownloads(): Promise<ApiResponse<{ active_downloads: DownloadProgress[] }>> {
    const url = NAV_URLS.getActiveDownloads(this.getEnvironment());
    
    const response = await this.handleRequest<{ active_downloads: DownloadProgress[] }>(url);
    
    if (!response.success) {
      toastService.error(response.error || 'Failed to load active downloads');
    }
    
    return response as ApiResponse<{ active_downloads: DownloadProgress[] }>;
  }

  // ==================== STATISTICS OPERATIONS ====================

  async getStatistics(): Promise<ApiResponse<NavStatistics>> {
    const url = NAV_URLS.getStatistics(this.getEnvironment());
    
    const response = await this.handleRequest<NavStatistics>(url);
    
    if (!response.success) {
      toastService.error(response.error || 'Failed to load statistics');
    }
    
    return response as ApiResponse<NavStatistics>;
  }

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
    
    return response as ApiResponse<{
      total_bookmarked_schemes: number;
      schemes_with_today_data: number;
      schemes_missing_data: number;
      data_available: boolean;
      message: string;
    }>;
  }

  // ==================== BOOKMARK GAP DETECTION ====================

  async getBookmarkGapsSummary(): Promise<ApiResponse<BookmarkGapSummary>> {
    const url = NAV_URLS.getBookmarkGapsSummary(this.getEnvironment());
    
    const response = await this.handleRequest<BookmarkGapSummary>(url);
    
    if (!response.success) {
      toastService.error(response.error || 'Failed to load bookmark gap summary');
    }
    
    return response as ApiResponse<BookmarkGapSummary>;
  }

  async getBookmarkGaps(params?: {
    page?: number;
    page_size?: number;
    sort_by?: string;
    sort_order?: string;
  }): Promise<ApiResponse<UnbookmarkedScheme[]>> {
    const url = NAV_URLS.getBookmarkGaps(params || {}, this.getEnvironment());
    
    const response = await this.handleRequest<UnbookmarkedScheme[]>(url);
    
    if (!response.success) {
      toastService.error(response.error || 'Failed to load unbookmarked schemes');
    }
    
    return response as ApiResponse<UnbookmarkedScheme[]>;
  }

  async getCustomerBookmarkGaps(customerId: number): Promise<ApiResponse<CustomerUnbookmarkedScheme[]>> {
    const url = NAV_URLS.getCustomerBookmarkGaps(customerId, {}, this.getEnvironment());
    
    const response = await this.handleRequest<CustomerUnbookmarkedScheme[]>(url);
    
    if (!response.success) {
      toastService.error(response.error || 'Failed to load customer unbookmarked schemes');
    }
    
    return response as ApiResponse<CustomerUnbookmarkedScheme[]>;
  }

  async bulkBookmarkSchemes(schemeCodes: string[]): Promise<ApiResponse<{
    success_count: number;
    failed_count: number;
    skipped_count: number;
    results: Array<{
      scheme_code: string;
      scheme_name: string;
      status: 'success' | 'failed' | 'skipped';
      error?: string;
      bookmark_id?: number;
    }>;
  }>> {
    const url = NAV_URLS.bulkBookmarkSchemes(this.getEnvironment());
    
    const response = await this.handleRequest<{
      success_count: number;
      failed_count: number;
      skipped_count: number;
      results: Array<{
        scheme_code: string;
        scheme_name: string;
        status: 'success' | 'failed' | 'skipped';
        error?: string;
        bookmark_id?: number;
      }>;
    }>(url, {
      method: 'POST',
      body: JSON.stringify({ scheme_codes: schemeCodes })
    });
    
    if (response.success) {
      const data = response.data;
      if (data) {
        toastService.success(
          `Successfully bookmarked ${data.success_count} scheme(s). ` +
          `${data.skipped_count > 0 ? `Skipped ${data.skipped_count} (already bookmarked). ` : ''}` +
          `${data.failed_count > 0 ? `Failed ${data.failed_count}.` : ''}`
        );
      }
    } else {
      toastService.error(response.error || 'Failed to bulk bookmark schemes');
    }
    
    return response as ApiResponse<{
      success_count: number;
      failed_count: number;
      skipped_count: number;
      results: Array<{
        scheme_code: string;
        scheme_name: string;
        status: 'success' | 'failed' | 'skipped';
        error?: string;
        bookmark_id?: number;
      }>;
    }>;
  }

  // ==================== SCHEDULER OPERATIONS ====================

  async getSchedulerConfig(): Promise<ApiResponse<SchedulerConfig>> {
    const url = NAV_URLS.getSchedulerConfig(this.getEnvironment());
    
    const response = await this.handleRequest<SchedulerConfig>(url);
    
    if (!response.success) {
      if (!response.error?.includes('not found')) {
        toastService.error(response.error || 'Failed to load scheduler config');
      }
    }
    
    return response as ApiResponse<SchedulerConfig>;
  }

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

  async getSchedulerStatus(): Promise<ApiResponse<SchedulerStatus>> {
    const url = NAV_URLS.getSchedulerStatus(this.getEnvironment());
    
    const response = await this.handleRequest<SchedulerStatus>(url);
    
    if (!response.success) {
      toastService.error(response.error || 'Failed to load scheduler status');
    }
    
    return response as ApiResponse<SchedulerStatus>;
  }

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

  async getAllActiveSchedulers(): Promise<ApiResponse<{ active_schedulers: any[]; total_active: number }>> {
    const url = NAV_URLS.getAllActiveSchedulers(this.getEnvironment());
    
    const response = await this.handleRequest<{ active_schedulers: any[]; total_active: number }>(url);
    
    if (!response.success) {
      toastService.error(response.error || 'Failed to load active schedulers');
    }
    
    return response as ApiResponse<{ active_schedulers: any[]; total_active: number }>;
  }

  // ==================== UTILITY METHODS ====================

  static formatEstimatedTime(ms: number): string {
    if (ms < 60000) {
      return `${Math.round(ms / 1000)} seconds`;
    } else if (ms < 3600000) {
      return `${Math.round(ms / 60000)} minutes`;
    } else {
      return `${Math.round(ms / 3600000)} hours`;
    }
  }

  static validateDateRange(startDate: Date, endDate: Date): { valid: boolean; error?: string; day_count?: number } {
    if (startDate >= endDate) {
      return { valid: false, error: 'Start date must be before end date' };
    }

    const today = new Date();
    if (endDate > today) {
      return { valid: false, error: 'End date cannot be in the future' };
    }

    const dayCount = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    
    return {
      valid: true,
      day_count: dayCount
    };
  }

  static generateCronExpression(scheduleType: string, downloadTime: string): string {
    const [hours, minutes] = downloadTime.split(':').map(Number);

    switch (scheduleType) {
      case 'daily':
        return `${minutes} ${hours} * * *`;
      case 'weekly':
        return `${minutes} ${hours} * * 5`;
      default:
        return `${minutes} ${hours} * * *`;
    }
  }

  static formatDateRange(earliestDate?: string, latestDate?: string): string {
    if (!earliestDate && !latestDate) return 'No NAV data';
    if (!earliestDate && latestDate) return `Latest: ${new Date(latestDate).toLocaleDateString()}`;
    if (earliestDate && !latestDate) return `From: ${new Date(earliestDate).toLocaleDateString()}`;
    
    if (!earliestDate || !latestDate) return 'No NAV data';
    
    const earliest = new Date(earliestDate).toLocaleDateString();
    const latest = new Date(latestDate).toLocaleDateString();
    
    if (earliest === latest) {
      return `Single date: ${earliest}`;
    }
    
    return `${earliest} - ${latest}`;
  }

  static getDownloadStatusDisplay(bookmark: SchemeBookmark): {
    status: 'success' | 'failed' | 'pending' | 'no-data';
    color: string;
    label: string;
    icon: string;
  } {
    if (bookmark.last_download_status === 'failed') {
      return {
        status: 'failed',
        color: '#ef4444',
        label: 'Download Failed',
        icon: '❌'
      };
    }
    
    if (bookmark.last_download_status === 'pending') {
      return {
        status: 'pending',
        color: '#f59e0b',
        label: 'Download Pending',
        icon: '⏳'
      };
    }
    
    if (bookmark.nav_records_count > 0) {
      return {
        status: 'success',
        color: '#22c55e',
        label: 'Data Available',
        icon: '✅'
      };
    }
    
    return {
      status: 'no-data',
      color: '#6b7280',
      label: 'No Data',
      icon: '⚪'
    };
  }
}

// ==================== SINGLETON EXPORT ====================

export const navService = new NavService();
export default navService;