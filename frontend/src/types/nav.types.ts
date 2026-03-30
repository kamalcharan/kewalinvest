// frontend/src/types/nav.types.ts
// Frontend type definitions for NAV tracking and bookmark gap detection

// ==================== BOOKMARK GAP DETECTION TYPES ====================

export interface BookmarkGapSummary {
  total_unbookmarked: number;
  total_customers_affected: number;
  total_investment_at_risk: number;
  schemes_not_in_master: number;
  schemes_not_bookmarked: number;
  last_checked: string;
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

export interface BookmarkGapAlert {
  alert_type: 'critical' | 'warning';
  message: string;
  unbookmarked_schemes: UnbookmarkedScheme[];
  summary: BookmarkGapSummary;
}

// ==================== SCHEME BOOKMARK TYPES ====================

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
  metrics_calculated_at?: string | null;  // ISO datetime when metrics were last calculated
}

// ==================== BULK BOOKMARK TYPES ====================

export interface BulkBookmarkResult {
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
}

// ==================== SCHEME METRICS TYPES ====================
// Added for Scheme Analysis & Metrics Calculation Integration

/**
 * Scheme Metrics Data Structure
 * Represents all calculated financial metrics for a mutual fund scheme
 */
export interface SchemeMetrics {
  // Returns (in percentage)
  daily_return: number | null;    // Daily return (today vs yesterday)
  return_1w: number | null;       // 1-week return
  return_1m: number | null;       // 1-month return
  return_3m: number | null;       // 3-month return
  return_6m: number | null;       // 6-month return
  return_1y: number | null;       // 1-year return
  return_ytd: number | null;      // Year-to-date return
  return_all: number | null;      // All-time return (since inception)
  
  // Volatility (Standard Deviation in percentage)
  sd_7d: number | null;           // 7-day rolling volatility
  sd_14d: number | null;          // 14-day rolling volatility
  sd_21d: number | null;          // 21-day rolling volatility
  sd_42d: number | null;          // 42-day rolling volatility
  sd_3m: number | null;           // 3-month rolling volatility
  sd_6m: number | null;           // 6-month rolling volatility
  
  // Data Point Counts
  count_3m: number;               // Number of data points in 3-month period
  count_42d: number;              // Number of data points in 42-day period
  
  // Advanced Metrics
  sharpe_ratio: number | null;    // Sharpe ratio (risk-adjusted return)
  max_drawdown: number | null;    // Maximum drawdown (%)
  total_risk: number | null;      // Total risk metric (composite)
  cagr: number | null;            // Compound Annual Growth Rate (%)
}

/**
 * Complete metrics response from API
 */
export interface SchemeMetricsResponse {
  success: boolean;
  scheme_id: number;
  scheme_code: string;
  scheme_name: string;
  amc_name: string;
  date: string;                   // YYYY-MM-DD format
  nav_value: number;
  metrics: SchemeMetrics;
  metrics_calculated_at: string;  // ISO datetime
  execution_time_ms: number;
}

/**
 * Request body for single scheme metrics calculation
 */
export interface MetricsCalculationRequest {
  as_of_date?: string;            // YYYY-MM-DD format, defaults to latest
  recalculate?: boolean;          // Force recalculation if metrics exist
}

/**
 * Response from single scheme metrics calculation
 */
export interface MetricsCalculationResponse {
  success: boolean;
  scheme_id: number;
  date: string;                   // YYYY-MM-DD format
  metrics: SchemeMetrics;
  calculation_time_ms: number;
  message?: string;
}

/**
 * Request body for bulk metrics calculation
 */
export interface BulkMetricsRequest {
  scheme_ids: number[];           // Array of scheme IDs to calculate
  as_of_date?: string;            // YYYY-MM-DD format, optional
  batch_size?: number;            // Schemes per batch (default: 100)
  delay_ms?: number;              // Delay between batches (default: 5000ms)
  priority?: 'bookmarked' | 'all'; // Priority filter (default: 'all')
}

/**
 * Individual error detail in bulk calculation
 */
export interface BulkMetricsError {
  scheme_id: number;
  scheme_code: string;
  error: string;
}

/**
 * Response from bulk metrics calculation
 */
export interface BulkMetricsResult {
  success: boolean;
  total_schemes: number;
  successful: number;
  failed: number;
  success_rate: string;           // Percentage as string (e.g., "97.0%")
  execution_time_ms: number;
  execution_time_minutes: number;
  errors: BulkMetricsError[];
  message: string;
}

/**
 * Metrics calculation status
 * Used for badge display and UI state
 */
export type MetricsStatus = 
  | 'none'          // No metrics calculated yet
  | 'calculating'   // Calculation in progress
  | 'available'     // Metrics available and up-to-date
  | 'outdated'      // Metrics exist but stale (>24 hours)
  | 'error';        // Calculation failed

/**
 * Metrics calculation progress (for single scheme)
 */
export interface MetricsCalculationProgress {
  scheme_id: number;
  status: MetricsStatus;
  started_at: string;             // ISO datetime
  completed_at?: string;          // ISO datetime
  error_message?: string;
}

/**
 * Scheme readiness for metrics calculation
 * Used in pre-check modal
 */
export interface SchemeReadiness {
  scheme_id: number;
  scheme_code: string;
  scheme_name: string;
  nav_records_count: number;
  status: 'ready' | 'partial' | 'no_data';
  message: string;
}

/**
 * Categorized schemes for bulk calculation pre-check
 */
export interface SchemeReadinessCategory {
  ready: SchemeReadiness[];       // Sufficient data (>100 records recommended)
  partial: SchemeReadiness[];     // Some data but limited (<100 records)
  noData: SchemeReadiness[];      // No NAV data available
}

/**
 * Bulk metrics calculation progress tracking
 */
export interface BulkMetricsProgress {
  isProcessing: boolean;
  current: number;                // Current scheme being processed
  total: number;                  // Total schemes to process
  successCount: number;
  failureCount: number;
  currentScheme?: string;         // Current scheme name (optional)
  errors: BulkMetricsError[];
}

/**
 * Metrics health check response
 */
export interface MetricsHealthCheck {
  success: boolean;
  service: string;
  status: 'healthy' | 'degraded' | 'down';
  timestamp: string;              // ISO datetime
}

// ==================== METRICS HELPER FUNCTIONS ====================

/**
 * Helper function to determine metrics status
 */
export function getMetricsStatus(
  metricsCalculatedAt: string | null | undefined,
  isCalculating: boolean = false
): MetricsStatus {
  if (isCalculating) return 'calculating';
  if (!metricsCalculatedAt) return 'none';
  
  const calculatedDate = new Date(metricsCalculatedAt);
  const now = new Date();
  const hoursSinceCalculation = (now.getTime() - calculatedDate.getTime()) / (1000 * 60 * 60);
  
  if (hoursSinceCalculation > 24) return 'outdated';
  return 'available';
}

/**
 * Helper function to categorize scheme readiness
 */
export function categorizeSchemeReadiness(
  navRecordsCount: number
): 'ready' | 'partial' | 'no_data' {
  if (navRecordsCount === 0) return 'no_data';
  if (navRecordsCount < 100) return 'partial';
  return 'ready';
}

/**
 * Helper function to get readiness message
 */
export function getReadinessMessage(navRecordsCount: number): string {
  if (navRecordsCount === 0) {
    return 'No NAV data available. Download historical data first.';
  }
  if (navRecordsCount < 100) {
    return `Limited data (${navRecordsCount} records). Some metrics may be unavailable.`;
  }
  return `Ready for calculation (${navRecordsCount} records available).`;
}

/**
 * Helper function to format metrics value for display
 * Handles null values and formats percentages/decimals appropriately
 */
export function formatMetricValue(
  value: number | null,
  type: 'percentage' | 'decimal' = 'percentage',
  decimals: number = 2
): string {
  if (value === null || value === undefined) return '--';
  
  if (type === 'percentage') {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(decimals)}%`;
  }
  
  return value.toFixed(decimals);
}

// ==================== METRICS CONSTANTS ====================

/**
 * Constants for metrics calculation
 */
export const METRICS_CONSTANTS = {
  RECOMMENDED_MIN_RECORDS: 100,
  PARTIAL_DATA_THRESHOLD: 100,
  STALE_THRESHOLD_HOURS: 24,
  DEFAULT_BATCH_SIZE: 100,
  DEFAULT_BATCH_DELAY_MS: 5000,
  CACHE_DURATION_MS: 5 * 60 * 1000, // 5 minutes
} as const;


// ==================== NAV TIME SERIES TYPES (FRONTEND) ====================
// For ChartViewer integration and scheme analytics visualization

/**
 * Parameters for time-series query (frontend request)
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
 * Complete time-series response from API
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