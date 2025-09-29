// frontend/src/services/nav.service.ts
// UPDATED: Added sequential download types and launch_date support

import { NAV_URLS, buildHeaders, getAPIErrorMessage } from './serviceURLs';
import { toastService } from './toast.service';

// ==================== TYPE DEFINITIONS ====================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
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
  amc_name: string;
  daily_download_enabled: boolean;
  download_time: string;
  historical_download_completed: boolean;
  nav_records_count: number;
  latest_nav_date?: string;
  latest_nav_value?: number;
  earliest_nav_date?: string;
  launch_date?: string; // ADDED: Launch date support
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
  parent_job_id?: number; // ADDED: For sequential downloads
  chunk_number?: number; // ADDED: For sequential downloads
  total_chunks?: number; // ADDED: For sequential downloads
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

// ADDED: Sequential download types
export interface DownloadChunk {
  chunk_number: number;
  start_date: Date;
  end_date: Date;
  day_count: number;
}

export interface SequentialDownloadRequest {
  scheme_ids: number[];
  start_date: Date;
  end_date: Date;
}

export interface SequentialDownloadResponse {
  parent_job_id: number;
  total_chunks: number;
  chunks: DownloadChunk[];
  estimated_time_ms: number;
  message: string;
}

export interface SequentialJobProgress {
  parent_job_id: number;
  total_chunks: number;
  completed_chunks: number;
  overall_status: 'pending' | 'running' | 'completed' | 'failed';
  progress_percentage: number;
  start_time: Date;
  estimated_completion?: Date;
  current_chunk?: {
    chunk_number: number;
    start_date: Date;
    end_date: Date;
    status: 'pending' | 'running' | 'completed' | 'failed';
  };
  errors: Array<{
    chunk_number: number;
    error: string;
    date_range: string;
  }>;
}

export interface DateRangeValidationResult {
  valid: boolean;
  error?: string;
  day_count?: number;
  chunks_required?: number;
}

// UPDATED: Historical download request interface
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
  // ADDED: Sequential download progress fields
  parentJobId?: number;
  totalChunks?: number;
  completedChunks?: number;
  currentChunk?: {
    chunkNumber: number;
    startDate: Date;
    endDate: Date;
  };
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
      console.log('🌐 - Environment check:', this.getEnvironment());
      
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
        
        const errorData = errorText ? JSON.parse(errorText) : {};
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

  // ==================== ENHANCED BOOKMARK METHODS ====================

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
  ): Promise<ApiResponse<SequentialDownloadResponse>> {
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

  // UPDATED: Historical download now returns sequential download response
  async triggerHistoricalDownload(request: HistoricalDownloadRequest): Promise<ApiResponse<SequentialDownloadResponse>> {
    const url = NAV_URLS.triggerHistoricalDownload(this.getEnvironment());
    
    const response = await this.handleRequest<SequentialDownloadResponse>(url, {
      method: 'POST',
      body: JSON.stringify(request)
    });
    
    if (response.success) {
      toastService.success(response.data?.message || 'Historical download started');
    } else {
      toastService.error(response.error || 'Failed to trigger historical download');
    }
    
    return response as ApiResponse<SequentialDownloadResponse>;
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

  // ADDED: Get sequential download progress
  async getSequentialProgress(parentJobId: number): Promise<ApiResponse<SequentialJobProgress>> {
    console.log('📊 getSequentialProgress called with parentJobId:', parentJobId);
    
    const url = NAV_URLS.getSequentialProgress(parentJobId, this.getEnvironment());
    console.log('📊 Generated URL:', url);
    
    const response = await this.handleRequest<SequentialJobProgress>(url);
    console.log('📊 Sequential progress response:', response);
    
    return response as ApiResponse<SequentialJobProgress>;
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

  // UPDATED: Validate date range with 90-day limit and chunking info
  static validateDateRange(startDate: Date, endDate: Date): DateRangeValidationResult {
    if (startDate >= endDate) {
      return { valid: false, error: 'Start date must be before end date' };
    }

    const today = new Date();
    if (endDate > today) {
      return { valid: false, error: 'End date cannot be in the future' };
    }

    const dayCount = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const chunksRequired = Math.ceil(dayCount / 90);

    return {
      valid: true,
      day_count: dayCount,
      chunks_required: chunksRequired
    };
  }

  // ADDED: Calculate required chunks for a date range
  static calculateChunks(startDate: Date, endDate: Date): DownloadChunk[] {
    const chunks: DownloadChunk[] = [];
    let currentStart = new Date(startDate);
    let chunkNumber = 1;

    while (currentStart < endDate) {
      let currentEnd = new Date(currentStart);
      currentEnd.setDate(currentEnd.getDate() + 89); // 90-day chunk

      if (currentEnd > endDate) {
        currentEnd = new Date(endDate);
      }

      const dayCount = Math.ceil((currentEnd.getTime() - currentStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;

      chunks.push({
        chunk_number: chunkNumber,
        start_date: new Date(currentStart),
        end_date: new Date(currentEnd),
        day_count: dayCount
      });

      // Move to next chunk
      currentStart = new Date(currentEnd);
      currentStart.setDate(currentStart.getDate() + 1);
      chunkNumber++;
    }

    return chunks;
  }

  // ADDED: Estimate download time for chunks
  static estimateDownloadTime(schemeCount: number, totalDays: number): number {
    // Base time: ~2 seconds per scheme per chunk
    const baseTimePerScheme = 2000; // 2 seconds
    const chunksRequired = Math.ceil(totalDays / 90);
    
    return schemeCount * baseTimePerScheme * chunksRequired;
  }

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