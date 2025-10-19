// frontend/src/types/market.types.ts
// Complete TypeScript types for Market Data Downloader

// ==================== ENUMS & CONSTANTS ====================

export type MarketIndexCategory = 'broad' | 'sectoral' | 'thematic';

export type DownloadStatus = 'success' | 'failed' | 'pending' | 'in_progress' | null;

export type FilterStatus = 'all' | 'downloaded' | 'pending' | 'failed';

export type JobType = 'historical' | 'eod' | 'manual';

export type JobStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

// Category labels for UI
export const CATEGORY_LABELS: Record<MarketIndexCategory, string> = {
  broad: 'Broad Market',
  sectoral: 'Sectoral',
  thematic: 'Thematic'
};

// Status colors for UI
export const STATUS_COLORS = {
  success: '#10B981',
  failed: '#EF4444',
  pending: '#F59E0B',
  in_progress: '#3B82F6'
};

// ==================== MARKET INDEX ====================

export interface MarketIndex {
  id: number;
  index_code: string;
  index_name: string;
  yahoo_symbol: string;
  category: MarketIndexCategory;
  description: string | null;
  is_active: boolean;
  priority: number;
  
  // Download Status
  total_records: number;
  earliest_date: string | null;
  latest_date: string | null;
  last_download_status: DownloadStatus;
  last_download_at: string | null;
  last_download_error: string | null;
  historical_data_available: boolean;
  
  // EOD Retry
  next_eod_retry_at: string | null;
  eod_retry_count: number;
  last_successful_eod_download_at: string | null;
  
  // Timestamps
  created_at: string;
  updated_at: string;
}

// ==================== MARKET DATA RECORDS ====================

export interface MarketDataRecord {
  id: number;
  index_id: number;
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number | null;
  adj_close: number | null;
  data_source: string;
  created_at: string;
  updated_at: string;
}

// ==================== DOWNLOAD JOB ====================

export interface MarketDownloadJob {
  id: number;
  job_type: JobType;
  index_id: number;
  start_date: string | null;
  end_date: string | null;
  status: JobStatus;
  error_details: string | null;
  records_inserted: number;
  records_updated: number;
  records_skipped: number;
  execution_time_ms: number | null;
  triggered_by: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

// ==================== STATISTICS ====================

export interface MarketStatistics {
  total_indices: number;
  downloaded_indices: number;
  pending_indices: number;
  failed_indices: number;
  total_data_points: number;
  earliest_date: string | null;
  latest_date: string | null;
  storage_size_mb: number;
}

// ==================== API REQUEST TYPES ====================

export interface GetIndicesParams {
  search?: string;
  category?: MarketIndexCategory;
  download_status?: FilterStatus;
  page?: number;
  page_size?: number;
}

export interface GetMarketDataParams {
  start_date?: string;
  end_date?: string;
  page?: number;
  page_size?: number;
}

export interface DownloadHistoricalRequest {
  index_id: number;
  start_date: string;
  end_date: string;
  skip_existing?: boolean;
}

export interface DownloadEODRequest {
  index_id: number;
}

// ==================== API RESPONSE TYPES ====================

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface GetIndicesResponse {
  indices: MarketIndex[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface GetMarketDataResponse {
  data: MarketDataRecord[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface DeleteDataResponse {
  deleted_count: number;
}

export interface DownloadJobResponse {
  index_id: number;
  start_date?: string;
  end_date?: string;
  status: string;
}

export interface HealthCheckResponse {
  yahoo_finance_connection: 'ok' | 'failed';
  timestamp: string;
}

// ==================== UI STATE TYPES ====================

export interface FilterState {
  category: MarketIndexCategory | 'all';
  status: FilterStatus;
  search: string;
}

export interface DownloadState {
  isDownloading: boolean;
  currentIndex: MarketIndex | null;
  progress: number;
  message: string;
}

export interface DeleteState {
  isDeleting: boolean;
  indexToDelete: MarketIndex | null;
  showConfirmation: boolean;
}

// ==================== COMPONENT PROPS ====================

export interface IndexCardProps {
  index: MarketIndex;
  onDownloadHistorical: (index: MarketIndex) => void;
  onDownloadEOD: (index: MarketIndex) => void;
  onDelete: (index: MarketIndex) => void;
  isDownloading?: boolean;
}

export interface StatisticsBarProps {
  stats: MarketStatistics;
  isLoading?: boolean;
}

export interface FilterBarProps {
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
  totalResults: number;
}

export interface DateRangePickerProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (startDate: string, endDate: string) => void;
  defaultStartDate?: string;
  defaultEndDate?: string;
  minDate?: string;
  maxDate?: string;
}

export interface DownloadProgressProps {
  isOpen: boolean;
  indexName: string;
  progress: number;
  message: string;
  onCancel?: () => void;
}

// ==================== UTILITY TYPES ====================

export interface DateRange {
  start: string;
  end: string;
}

export interface StatusBadge {
  label: string;
  color: string;
  icon: string;
}

// Helper type for index with computed properties
export interface EnhancedMarketIndex extends MarketIndex {
  statusBadge: StatusBadge;
  hasData: boolean;
  dataRangeText: string;
  lastUpdateText: string;
  canDownload: boolean;
  canDelete: boolean;
}

// ==================== ERROR TYPES ====================

export interface MarketError {
  code: string;
  message: string;
  details?: any;
}

export interface ValidationError {
  field: string;
  message: string;
}

// ==================== CONSTANTS FOR UI ====================

export const DEFAULT_PAGE_SIZE = 50;
export const MAX_DATE_RANGE_YEARS = 20;
export const MIN_HISTORICAL_DATE = '2000-01-01';

// Default date range (20 years)
export const getDefaultDateRange = (): DateRange => {
  const today = new Date();
  const twentyYearsAgo = new Date(today);
  twentyYearsAgo.setFullYear(today.getFullYear() - 20);
  
  return {
    start: twentyYearsAgo.toISOString().split('T')[0],
    end: today.toISOString().split('T')[0]
  };
};

// Format date for display
export const formatDate = (dateString: string | null): string => {
  if (!dateString) return 'N/A';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  } catch {
    return 'Invalid Date';
  }
};

// Format number with commas
export const formatNumber = (num: number): string => {
  return num.toLocaleString('en-IN');
};

// Calculate date range in days
export const getDateRangeDays = (startDate: string, endDate: string): number => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

// Get status badge configuration
export const getStatusBadge = (index: MarketIndex): StatusBadge => {
  if (index.last_download_status === 'in_progress') {
    return {
      label: 'Downloading...',
      color: STATUS_COLORS.in_progress,
      icon: '🔄'
    };
  }
  
  if (index.last_download_status === 'failed') {
    return {
      label: 'Failed',
      color: STATUS_COLORS.failed,
      icon: '❌'
    };
  }
  
  if (index.historical_data_available) {
    return {
      label: 'Downloaded',
      color: STATUS_COLORS.success,
      icon: '✅'
    };
  }
  
  return {
    label: 'Not Downloaded',
    color: STATUS_COLORS.pending,
    icon: '⏳'
  };
};

// Get time ago text
export const getTimeAgo = (dateString: string | null): string => {
  if (!dateString) return 'Never';
  
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 30) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    
    return formatDate(dateString);
  } catch {
    return 'Unknown';
  }
};

// Validate date range
export const validateDateRange = (startDate: string, endDate: string): ValidationError[] => {
  const errors: ValidationError[] = [];
  
  const start = new Date(startDate);
  const end = new Date(endDate);
  const today = new Date();
  const minDate = new Date(MIN_HISTORICAL_DATE);
  
  if (start >= end) {
    errors.push({
      field: 'dateRange',
      message: 'Start date must be before end date'
    });
  }
  
  if (end > today) {
    errors.push({
      field: 'endDate',
      message: 'End date cannot be in the future'
    });
  }
  
  if (start < minDate) {
    errors.push({
      field: 'startDate',
      message: `Start date cannot be before ${MIN_HISTORICAL_DATE}`
    });
  }
  
  const rangeDays = getDateRangeDays(startDate, endDate);
  const maxDays = MAX_DATE_RANGE_YEARS * 365;
  
  if (rangeDays > maxDays) {
    errors.push({
      field: 'dateRange',
      message: `Date range cannot exceed ${MAX_DATE_RANGE_YEARS} years`
    });
  }
  
  return errors;
};

// ==================== TYPE GUARDS ====================

export const isMarketIndex = (obj: any): obj is MarketIndex => {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof obj.id === 'number' &&
    typeof obj.index_code === 'string' &&
    typeof obj.index_name === 'string'
  );
};

export const isApiResponse = <T>(obj: any): obj is ApiResponse<T> => {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof obj.success === 'boolean'
  );
};

// ==================== EXPORT ALL ====================

export type {
  // Re-export for convenience
  MarketIndexCategory as Category,
  DownloadStatus as Status,
  FilterStatus as Filter
};