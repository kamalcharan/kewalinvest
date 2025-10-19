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