// backend/src/types/market.types.ts
// Market Data Types - Updated with Metrics Columns

// ==================== EXISTING TYPES (Keep as-is) ====================

export interface MarketIndex {
  id: number;
  index_code: string;
  index_name: string;
  yahoo_symbol: string;
  category: 'broad' | 'sectoral' | 'thematic';
  description?: string;
  is_active: boolean;
  priority: number;
  
  // Download Status
  total_records: number;
  earliest_date: Date | null;
  latest_date: Date | null;
  last_download_status: 'success' | 'failed' | 'pending' | 'in_progress' | null;
  last_download_at: Date | null;
  last_download_error: string | null;
  historical_data_available: boolean;
  
  // EOD Retry
  next_eod_retry_at: Date | null;
  eod_retry_count: number;
  last_successful_eod_download_at: Date | null;
  
  created_at: Date;
  updated_at: Date;
}

// ==================== UPDATED: Added Metrics Columns ====================

export interface MarketDataRecord {
  id: number;
  index_id: number;
  date: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
  adj_close?: number;
  data_source: string;

  // ====== NEW METRIC COLUMNS (Added for daily calculations) ======
  
  // Returns (various periods)
  daily_return: number | null;
  return_1w: number | null;
  return_1m: number | null;
  return_3m: number | null;
  return_6m: number | null;
  return_1y: number | null;
  return_ytd: number | null;
  return_all: number | null;
  
  // Volatility (Standard Deviation)
  sd_7d: number | null;
  sd_14d: number | null;
  sd_21d: number | null;
  sd_42d: number | null;
  sd_3m: number | null;
  sd_6m: number | null;
  
  // Counts
  count_3m: number | null;
  count_42d: number | null;
  
  // Risk metrics
  sharpe_ratio: number | null;
  max_drawdown: number | null;
  total_risk: number | null;
  cagr: number | null;
  
  // Calculation timestamp
  metrics_calculated_at: Date | null;

  // ====== EXISTING TIMESTAMPS ======
  created_at: Date;
  updated_at: Date;
}

export interface MarketDownloadJob {
  id: number;
  job_type: 'historical' | 'eod' | 'manual';
  index_id: number;
  start_date?: Date;
  end_date?: Date;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  error_details?: string;
  records_inserted: number;
  records_updated: number;
  records_skipped: number;
  execution_time_ms?: number;
  triggered_by?: string;
  created_at: Date;
  updated_at: Date;
  completed_at?: Date;
}

export interface CreateMarketDataRequest {
  index_id: number;
  date: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
  adj_close?: number;
  data_source?: string;
}

export interface MarketStatistics {
  total_indices: number;
  downloaded_indices: number;
  pending_indices: number;
  failed_indices: number;
  total_data_points: number;
  earliest_date: Date | null;
  latest_date: Date | null;
  storage_size_mb: number;
}

export interface IndexSearchParams {
  search?: string;
  category?: 'broad' | 'sectoral' | 'thematic';
  download_status?: 'downloaded' | 'pending' | 'failed';
  page?: number;
  page_size?: number;
}

// ==================== NEW: Market Analysis Types ====================

export interface CalculateMetricsRequest {
  index_id: number;
  recalculate?: boolean; // If true, recalculate even if metrics exist
  as_of_date?: string; // ISO date, defaults to yesterday
}

export interface CalculateMetricsResponse {
  success: boolean;
  index_id: number;
  date: string;
  metrics: {
    daily_return: number | null;
    return_1w: number | null;
    return_1m: number | null;
    return_3m: number | null;
    return_6m: number | null;
    return_1y: number | null;
    return_ytd: number | null;
    return_all: number | null;
    sd_7d: number | null;
    sd_14d: number | null;
    sd_21d: number | null;
    sd_42d: number | null;
    sd_3m: number | null;
    sd_6m: number | null;
    count_3m: number;
    count_42d: number;
    sharpe_ratio: number | null;
    max_drawdown: number | null;
    total_risk: number | null;
    cagr: number | null;
  };
  records_processed: number;
  calculation_time_ms: number;
  message: string;
  error?: string;
}

export interface MetricsCalculationJob {
  job_id: string;
  index_id: number;
  status: 'pending' | 'running' | 'completed' | 'failed';
  started_at: Date;
  completed_at?: Date;
  error?: string;
  metrics_count: number;
}