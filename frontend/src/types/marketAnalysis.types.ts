// frontend/src/types/marketAnalysis.types.ts

/**
 * Chart and visualization related types
 */
export interface ChartDataPoint {
  date: string;
  value: number;
  rawDate: number; // timestamp for sorting
}

export interface ChartStatistics {
  current: string;
  min: string;
  max: string;
  change: string;
  changePercent: string;
  isPositive: boolean;
}

/**
 * Index related types
 */
export interface IndexDetail {
  id: number;
  index_name: string;
  index_code: string;
  yahoo_symbol: string;
  category: 'broad' | 'sectoral' | 'thematic';
  description?: string;
  is_active: boolean;
  priority: number;
  last_price: number | null;
  price_date: string | null;
  has_metrics: boolean;
}

export interface IndexMetrics {
  id: number;
  index_id: number;
  
  // Price data
  last_price: number | null;
  price_date: Date | null;
  
  // Returns
  daily_return: number | null;         // daily%
  return_3m: number | null;            // 3M%
  return_6m: number | null;            // 6M%
  return_abs: number | null;           // AbsReturns (from start)
  cagr: number | null;                 // Compound Annual Growth Rate
  
  // Standard Deviations (Rolling Windows)
  sd_7d: number | null;                // 7dSD
  sd_14d: number | null;               // 14dSD
  sd_21d: number | null;               // 21dSD
  sd_42d: number | null;               // 42dSD
  sd_3m: number | null;                // 3mSD
  sd_6m: number | null;                // 6mSD
  
  // Counts (Data points in window)
  count_3m: number | null;             // 3MCount
  count_42d: number | null;            // 42dayCount
  
  // Risk metrics
  sharpe_ratio: number | null;
  max_drawdown: number | null;
  total_risk: number | null;
  
  // Metadata
  calculated_at: Date | null;
  calculated_by: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface IndexPerformance {
  id: number;
  index_name: string;
  index_code: string;
  return_value: number;
  status: 'positive' | 'negative' | 'neutral';
  has_metrics: boolean;
}

/**
 * Dashboard related types
 */
export interface DashboardKPICard {
  label: string;
  value: string | number;
  unit?: string;
  status: 'positive' | 'negative' | 'neutral';
  icon: string;
}

export interface DashboardStatistics {
  total_indices: number;
  calculated_indices: number;
  pending_indices: number;
  best_performer: string | null;
  best_performer_return: number | null;
  worst_performer: string | null;
  worst_performer_return: number | null;
  avg_correlation: number | null;
  market_breadth_percent: number | null;
}

/**
 * User preferences related types
 */
export interface UserChartPreference {
  id?: number;
  user_id: number;
  index_id: number;
  line_color: string; // hex format: #RRGGBB
  created_at?: Date;
  updated_at?: Date;
}

/**
 * API Request/Response types
 */
export interface CalculateMetricsRequest {
  index_id: number;
  recalculate?: boolean;
}

export interface CalculateMetricsResponse {
  success: boolean;
  data?: IndexMetrics;
  error?: string;
  message?: string;
  execution_time_ms?: number;
}

export interface GetChartDataRequest {
  index_id: number;
  granularity: 'daily' | 'weekly' | 'monthly';
  time_period: '1w' | '1m' | '3m' | '6m' | '1y' | 'all' | 'custom';
  start_date?: string; // ISO format: YYYY-MM-DD
  end_date?: string;   // ISO format: YYYY-MM-DD
  page?: number;
  page_size?: number;
}

export interface GetChartDataResponse {
  success: boolean;
  data: ChartDataPoint[];
  pagination?: {
    page: number;
    page_size: number;
    total: number;
    total_pages: number;
  };
  error?: string;
}

export interface GetIndexMetricsResponse {
  success: boolean;
  data?: IndexMetrics;
  error?: string;
}

export interface GetDashboardStatisticsResponse {
  success: boolean;
  data?: DashboardStatistics;
  error?: string;
}

export interface SaveColorPreferenceRequest {
  index_id: number;
  line_color: string;
}

export interface SaveColorPreferenceResponse {
  success: boolean;
  data?: UserChartPreference;
  error?: string;
}

export interface GetColorPreferenceResponse {
  success: boolean;
  data?: UserChartPreference;
  error?: string;
}

/**
 * Pagination types
 */
export interface PaginationParams {
  page: number;
  page_size: number;
}

export interface PaginationResponse {
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
}

/**
 * Filter types
 */
export interface DashboardFilters {
  time_period: '1m' | '3m' | '6m' | '1y';
  category: 'all' | 'broad' | 'sectoral' | 'thematic';
}

export interface ChartFilters {
  granularity: 'daily' | 'weekly' | 'monthly';
  time_period: '1w' | '1m' | '3m' | '6m' | '1y' | 'all' | 'custom';
  custom_start_date?: string;
  custom_end_date?: string;
}

/**
 * Error types
 */
export interface ApiError {
  message: string;
  code: string;
  details?: Record<string, any>;
}

export class MarketAnalysisError extends Error {
  constructor(
    public message: string,
    public code: string,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = 'MarketAnalysisError';
  }
}

/**
 * Component state types
 */
export interface ChartViewerState {
  viewMode: 'graph' | 'table';
  granularity: 'daily' | 'weekly' | 'monthly';
  timePeriod: '1w' | '1m' | '3m' | '6m' | '1y' | 'all' | 'custom';
  customStartDate: string;
  customEndDate: string;
  lineColor: string;
  currentPage: number;
  isLoading: boolean;
  error: string | null;
  data: ChartDataPoint[];
}

export interface IndexDetailPageState {
  activeTab: 'chart' | 'returns' | 'volatility' | 'statistics';
  isCalculating: boolean;
  calculationError: string | null;
  index: IndexDetail | null;
  metrics: IndexMetrics | null;
}

export interface MarketDashboardState {
  selectedPeriod: '1m' | '3m' | '6m' | '1y';
  isLoading: boolean;
  error: string | null;
  kpiCards: DashboardKPICard[];
  indexPerformances: IndexPerformance[];
  statistics: DashboardStatistics | null;
}

export interface MarketDataRecord {
  id: number;
  index_id: number;
  date: Date;
  
  // OHLCV
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
  adj_close?: number;
  data_source: string;
  
  // Returns (%)
  daily_return: number | null;
  return_1w: number | null;
  return_1m: number | null;
  return_3m: number | null;
  return_6m: number | null;
  return_1y: number | null;
  return_ytd: number | null;
  return_all: number | null;
  
  // Standard Deviations (%)
  sd_7d: number | null;
  sd_14d: number | null;
  sd_21d: number | null;
  sd_42d: number | null;
  sd_3m: number | null;
  sd_6m: number | null;
  
  // Counts
  count_3m: number | null;
  count_42d: number | null;
  
  // Risk Metrics
  sharpe_ratio: number | null;
  max_drawdown: number | null;
  total_risk: number | null;
  cagr: number | null;
  
  created_at: Date;
  updated_at: Date;
}

export interface CalculateMetricsRequest {
  index_id: number;
  recalculate?: boolean;       
  as_of_date?: string;         
}
