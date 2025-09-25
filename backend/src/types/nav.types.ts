// backend/src/types/nav.types.ts
// File 3/14: TypeScript interfaces for NAV tracking system

export interface SchemeBookmark {
  id: number;
  tenant_id: number;
  user_id: number;
  scheme_id: number;
  scheme_code: string;                    // Denormalized from t_scheme_details
  scheme_name: string;                    // Denormalized from t_scheme_details  
  amc_name?: string;                      // Denormalized from t_scheme_details
  is_live: boolean;
  is_active: boolean;
  daily_download_enabled: boolean;
  download_time: string;                  // HH:MM format (e.g., "22:00")
  historical_download_completed: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface CreateSchemeBookmarkRequest {
  scheme_id: number;
  daily_download_enabled?: boolean;
  download_time?: string;                 // Defaults to "22:00"
}

export interface UpdateSchemeBookmarkRequest {
  daily_download_enabled?: boolean;
  download_time?: string;
  historical_download_completed?: boolean;
}

export interface SchemeBookmarkSearchParams {
  page?: number;
  page_size?: number;
  search?: string;                        // Search in scheme_name, scheme_code, amc_name
  daily_download_only?: boolean;
  amc_name?: string;
}

export interface SchemeBookmarkListResponse {
  bookmarks: SchemeBookmarkWithStats[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

export interface SchemeBookmarkWithStats extends SchemeBookmark {
  nav_records_count: number;              // Total NAV records available
  latest_nav_date?: Date;                 // Most recent NAV date
  latest_nav_value?: number;              // Most recent NAV value
}

// ==================== NAV DATA TYPES ====================

export interface NavData {
  id: number;
  tenant_id: number;
  scheme_id: number;
  scheme_code: string;                    // Denormalized for performance
  nav_date: Date;
  nav_value: number;                      // Decimal(15,4)
  repurchase_price?: number;              // Decimal(15,4)
  sale_price?: number;                    // Decimal(15,4)
  is_live: boolean;
  data_source: 'daily' | 'historical' | 'weekly';
  created_at: Date;
  updated_at: Date;
  // Joined fields from scheme_details (when needed)
  scheme_name?: string;
  amc_name?: string;
}

export interface NavDataSearchParams {
  scheme_id?: number;
  start_date?: Date;
  end_date?: Date;
  data_source?: 'daily' | 'historical' | 'weekly';
  page?: number;
  page_size?: number;
}

export interface NavDataListResponse {
  nav_data: NavData[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

export interface CreateNavDataRequest {
  scheme_id: number;
  nav_date: Date;
  nav_value: number;
  repurchase_price?: number;
  sale_price?: number;
  data_source: 'daily' | 'historical' | 'weekly';
}

// ==================== DOWNLOAD JOB TYPES ====================

export interface NavDownloadJob {
  id: number;
  tenant_id: number;
  job_type: 'daily' | 'historical' | 'weekly';
  scheme_ids: number[];
  scheduled_date: Date;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  start_date?: Date;                      // For historical downloads
  end_date?: Date;                        // For historical downloads
  n8n_execution_id?: string;              // n8n workflow execution reference
  result_summary?: NavDownloadJobResult;
  error_details?: string;
  is_live: boolean;
  created_at: Date;
  updated_at: Date;
  created_by?: number;
}

export interface NavDownloadJobResult {
  total_schemes: number;
  successful_downloads: number;
  failed_downloads: number;
  total_records_inserted: number;
  total_records_updated: number;
  schemes_with_errors: Array<{
    scheme_id: number;
    scheme_code: string;
    error: string;
  }>;
  execution_time_ms: number;
  api_calls_made: number;
}

export interface CreateNavDownloadJobRequest {
  job_type: 'daily' | 'historical' | 'weekly';
  scheme_ids: number[];
  scheduled_date?: Date;                  // Defaults to now for immediate execution
  start_date?: Date;                      // Required for historical downloads
  end_date?: Date;                        // Required for historical downloads
}

export interface NavDownloadJobSearchParams {
  status?: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  job_type?: 'daily' | 'historical' | 'weekly';
  page?: number;
  page_size?: number;
  date_from?: Date;
  date_to?: Date;
}

export interface NavDownloadJobListResponse {
  jobs: NavDownloadJobWithSchemes[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

export interface NavDownloadJobWithSchemes extends NavDownloadJob {
  schemes: Array<{
    scheme_id: number;
    scheme_code: string;
    scheme_name: string;
  }>;
}

// ==================== AMFI DATA SOURCE TYPES ====================

export interface AmfiNavRecord {
  'Scheme Code': string;
  'ISIN Div Payout/ ISIN Growth': string;
  'ISIN Div Reinvestment': string;
  'Scheme Name': string;
  'Net Asset Value': string;
  'Date': string;
}

export interface AmfiHistoricalNavRecord {
  'Scheme Code': string;
  'Scheme Name': string;
  'Net Asset Value': string;
  'Repurchase Price': string;
  'Sale Price': string;
  'Date': string;
}

export interface ParsedNavRecord {
  scheme_code: string;
  scheme_name: string;
  nav_value: number;
  repurchase_price?: number;
  sale_price?: number;
  nav_date: Date;
  isin_div_payout_growth?: string;
  isin_div_reinvestment?: string;
}

// ==================== N8N INTEGRATION TYPES ====================

export interface N8nWebhookPayload {
  job_id: number;
  tenant_id: number;
  is_live: boolean;
  job_type: 'daily' | 'historical' | 'weekly';
  scheme_ids: number[];
  start_date?: string;                    // ISO date string
  end_date?: string;                      // ISO date string
  api_base_url: string;                   // Backend API URL for callbacks
  auth_token?: string;                    // For authenticated callbacks
}

export interface N8nCallbackPayload {
  job_id: number;
  execution_id: string;
  status: 'completed' | 'failed';
  result?: NavDownloadJobResult;
  error?: string;
}

// ==================== STATISTICS TYPES ====================

export interface NavStatistics {
  total_schemes_tracked: number;
  total_nav_records: number;
  schemes_with_daily_download: number;
  schemes_with_historical_data: number;
  latest_nav_date: Date;
  oldest_nav_date: Date;
  download_jobs_today: number;
  failed_downloads_today: number;
}

export interface SchemeNavSummary {
  scheme_id: number;
  scheme_code: string;
  scheme_name: string;
  amc_name: string;
  latest_nav_date?: Date;
  latest_nav_value?: number;
  nav_records_count: number;
  first_nav_date?: Date;
  last_updated: Date;
  is_bookmarked: boolean;
  daily_download_enabled: boolean;
}

// ==================== ERROR TYPES ====================

export interface NavError {
  code: string;
  message: string;
  details?: any;
}

export interface NavValidationError extends NavError {
  field: string;
  value: any;
}

// Common error codes
export const NAV_ERROR_CODES = {
  SCHEME_NOT_FOUND: 'SCHEME_NOT_FOUND',
  SCHEME_ALREADY_BOOKMARKED: 'SCHEME_ALREADY_BOOKMARKED',
  BOOKMARK_NOT_FOUND: 'BOOKMARK_NOT_FOUND',
  HISTORICAL_DOWNLOAD_COMPLETED: 'HISTORICAL_DOWNLOAD_COMPLETED',
  NAV_DATA_ALREADY_EXISTS: 'NAV_DATA_ALREADY_EXISTS',
  INVALID_DATE_RANGE: 'INVALID_DATE_RANGE',
  AMFI_API_ERROR: 'AMFI_API_ERROR',
  N8N_EXECUTION_FAILED: 'N8N_EXECUTION_FAILED',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  INVALID_NAV_FORMAT: 'INVALID_NAV_FORMAT',
  DOWNLOAD_JOB_NOT_FOUND: 'DOWNLOAD_JOB_NOT_FOUND'
} as const;

// ==================== FRONTEND-SPECIFIC TYPES ====================

export interface NavDashboardData {
  statistics: NavStatistics;
  recent_downloads: NavDownloadJob[];
  bookmarked_schemes: SchemeBookmarkWithStats[];
  alerts: Array<{
    type: 'info' | 'warning' | 'error';
    message: string;
    scheme_code?: string;
    timestamp: Date;
  }>;
}

export interface SchemeSearchResult {
  id: number;
  scheme_code: string;
  scheme_name: string;
  amc_name: string;
  scheme_type_name?: string;
  scheme_category_name?: string;
  launch_date?: Date;
  is_bookmarked: boolean;
  latest_nav_value?: number;
  latest_nav_date?: Date;
}

// ==================== UTILITY TYPES ====================

export type NavDataSource = 'daily' | 'historical' | 'weekly';
export type DownloadJobStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
export type DownloadJobType = 'daily' | 'historical' | 'weekly';

// Environment-aware request interface
export interface AuthenticatedNavRequest {
  user?: {
    user_id: number;
    tenant_id: number;
  };
  environment?: 'live' | 'test';
}

// Success response wrapper
export interface NavApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Pagination helper
export interface PaginationParams {
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: PaginationParams;
}