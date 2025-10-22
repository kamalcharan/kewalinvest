// backend/src/types/nav.types.ts
// UPDATED: 
// 1. Removed tenant_id from NavData (global NAV repository)
// 2. Added alias_name to SchemeBookmark (tenant custom naming)
// 3. Added bookmark gap detection types
// 4. Added data_source to ParsedNavRecord

export interface SchemeBookmark {
  id: number;
  tenant_id: number;
  user_id: number;
  scheme_id: number;
  scheme_code: string;
  scheme_name: string;
  amc_name: string;
  alias_name?: string; // ADDED: Custom scheme name for tenant
  is_live: boolean;
  is_active: boolean;
  daily_download_enabled: boolean;
  download_time: string;
  historical_download_completed: boolean;
  created_at: Date;
  updated_at: Date;
  
  nav_records_count?: number;
  latest_nav_date?: Date;
  latest_nav_value?: number;
  earliest_nav_date?: Date;
  launch_date?: Date;
  
  last_download_status?: 'success' | 'failed' | 'pending' | null;
  last_download_error?: string;
  last_download_attempt?: Date;
}

export interface CreateSchemeBookmarkRequest {
  scheme_id: number;
  alias_name?: string; // ADDED: Optional custom name during creation
  daily_download_enabled?: boolean;
  download_time?: string;
}

export interface UpdateSchemeBookmarkRequest {
  alias_name?: string; // ADDED: Update custom name
  daily_download_enabled?: boolean;
  download_time?: string;
  historical_download_completed?: boolean;
}

export interface SchemeBookmarkSearchParams {
  page?: number;
  page_size?: number;
  search?: string;
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
  nav_records_count: number;
  latest_nav_date: Date | null;
  latest_nav_value: number | null;
  earliest_nav_date: Date | null;
  launch_date: Date | null;
  last_download_status: 'success' | 'failed' | 'pending' | null;
}

export interface BookmarkNavDataParams {
  bookmark_id: number;
  start_date?: string;
  end_date?: string;
  page?: number;
  page_size?: number;
  granularity?: 'daily' | 'monthly';
}

export interface UpdateBookmarkDownloadStatus {
  last_download_status: 'success' | 'failed' | 'pending';
  last_download_error?: string;
  last_download_attempt?: Date;
}

// ==================== NAV DATA TYPES ====================

export interface NavData {
  id: number;
  // REMOVED: tenant_id - NAV data is now global across all tenants
  scheme_id: number;
  scheme_code: string;
  nav_date: Date;
  nav_value: number;
  repurchase_price?: number;
  sale_price?: number;
  is_live: boolean;
  data_source: 'daily' | 'historical' | 'weekly';
  created_at: Date;
  updated_at: Date;
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
  start_date?: Date;
  end_date?: Date;
  n8n_execution_id?: string;
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
  scheduled_date?: Date;
  start_date?: Date;
  end_date?: Date;
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

// ==================== BOOKMARK GAP DETECTION TYPES (NEW) ====================

export interface UnbookmarkedScheme {
  scheme_code: string;
  scheme_name: string;
  customer_count: number;
  transaction_count: number;
  total_invested: number;
  last_transaction_date: Date;
  first_transaction_date: Date;
  scheme_id: number | null; // null if scheme doesn't exist in t_scheme_details
  amc_name: string | null;
  exists_in_master: boolean; // true if found in t_scheme_details
}

export interface BookmarkGapSummary {
  total_unbookmarked: number;
  total_customers_affected: number;
  total_investment_at_risk: number;
  schemes_not_in_master: number; // Critical: schemes in transactions but not in master
  schemes_not_bookmarked: number; // Warning: schemes in master but not bookmarked
  last_checked: Date;
}

export interface BookmarkGapAlert {
  alert_type: 'critical' | 'warning';
  message: string;
  unbookmarked_schemes: UnbookmarkedScheme[];
  summary: BookmarkGapSummary;
}

export interface CustomerUnbookmarkedScheme {
  customer_id: number;
  customer_name: string;
  scheme_code: string;
  scheme_name: string;
  folio_no: string;
  total_invested: number;
  transaction_count: number;
  last_transaction_date: Date;
  scheme_id: number | null;
  exists_in_master: boolean;
}

export interface BulkBookmarkRequest {
  scheme_codes: string[];
  daily_download_enabled?: boolean;
  download_time?: string;
}

export interface BulkBookmarkResult {
  success_count: number;
  failed_count: number;
  skipped_count: number; // Already bookmarked
  results: Array<{
    scheme_code: string;
    scheme_name: string;
    status: 'success' | 'failed' | 'skipped';
    error?: string;
    bookmark_id?: number;
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

export interface ParsedNavRecord {
  scheme_code: string;
  scheme_name: string;
  nav_value: number;
  repurchase_price?: number;
  sale_price?: number;
  nav_date: Date | null;
  isin_div_payout_growth?: string;
  isin_div_reinvestment?: string;
  data_source?: 'daily' | 'historical' | 'weekly'; // ADDED: Track data source
}

// ==================== N8N INTEGRATION TYPES ====================

export interface N8nWebhookPayload {
  job_id: number;
  tenant_id: number;
  is_live: boolean;
  job_type: 'daily' | 'historical' | 'weekly';
  scheme_ids: number[];
  start_date?: string;
  end_date?: string;
  api_base_url: string;
  auth_token?: string;
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
  DOWNLOAD_JOB_NOT_FOUND: 'DOWNLOAD_JOB_NOT_FOUND',
  DATE_RANGE_OVERLAP: 'DATE_RANGE_OVERLAP' // ADDED: For historical download overlap detection
} as const;

// ==================== FRONTEND-SPECIFIC TYPES ====================

export interface NavDashboardData {
  statistics: NavStatistics;
  recent_downloads: NavDownloadJob[];
  bookmarked_schemes: SchemeBookmarkWithStats[];
  bookmark_gap_alert?: BookmarkGapAlert; // ADDED: Gap detection alert
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

export interface AuthenticatedNavRequest {
  user?: {
    user_id: number;
    tenant_id: number;
  };
  environment?: 'live' | 'test';
}

export interface NavApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

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

// ==================== NAV TIME SERIES TYPES ====================
// For ChartViewer integration and scheme analytics

/**
 * Parameters for time-series query
 */
export interface NavTimeSeriesParams {
  start_date?: string;      // YYYY-MM-DD format
  end_date?: string;        // YYYY-MM-DD format
  granularity?: 'daily' | 'weekly' | 'monthly';  // Default: daily
  include_metrics?: boolean; // Include calculated metrics (default: true)
}

/**
 * Single data point in time-series
 * Contains NAV value and optional calculated metrics
 */
export interface NavTimeSeriesDataPoint {
  date: string;              // YYYY-MM-DD format
  nav_value: number;         // NAV value for this date
  
  // Optional metrics (if calculated and include_metrics = true)
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
  sharpe_ratio?: number | null;
  max_drawdown?: number | null;
  total_risk?: number | null;
  cagr?: number | null;
  
  // Metadata
  has_metrics: boolean;
  metrics_calculated_at?: string | null;  // ISO datetime
}

/**
 * Metrics coverage statistics
 */
export interface MetricsCoverage {
  total_dates: number;
  dates_with_metrics: number;
  coverage_percentage: number;
}

/**
 * Complete time-series response
 * Optimized for chart visualization
 */
export interface NavTimeSeriesResponse {
  scheme_id: number;
  scheme_code: string;
  scheme_name: string;
  amc_name: string;
  granularity: 'daily' | 'weekly' | 'monthly';
  date_range: {
    start_date: string;      // YYYY-MM-DD
    end_date: string;        // YYYY-MM-DD
  };
  data: NavTimeSeriesDataPoint[];
  total_points: number;
  metrics_coverage: MetricsCoverage;
}