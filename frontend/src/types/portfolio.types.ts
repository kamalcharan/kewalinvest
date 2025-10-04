// frontend/src/types/portfolio.types.ts
// Backend API Types - All types match actual database/API responses

// ============================================================================
// CORE PORTFOLIO TYPES
// ============================================================================

export interface CustomerPortfolioRecord {
  id: number;
  tenant_id: number;
  is_live: boolean;
  is_active: boolean;
  customer_id: number;
  scheme_code: string;
  scheme_name: string;
  folio_no?: string;
  category?: string;
  sub_category?: string;
  fund_name?: string;
  start_date?: string;
  created_at: string;
  updated_at: string;
}

export interface PortfolioTotals {
  portfolio_id: number;
  tenant_id: number;
  is_live: boolean;
  customer_id: number;
  scheme_code: string;
  scheme_name: string;
  fund_name?: string;
  category?: string;
  sub_category?: string;
  folio_no?: string;
  total_units: number;
  total_invested: number;
  latest_nav: number;
  current_value: number;
  total_returns: number;
  return_percentage: number;
  transaction_count: number;
  last_transaction_date?: string;
  last_refreshed_at: string;
}

export interface CustomerPortfolioSummary {
  customer_id: number;
  customer_name?: string;
  total_invested: number;
  current_value: number;
  total_returns: number;
  return_percentage: number;
  total_schemes: number;
  day_change?: number;
  day_change_percentage?: number;
}

export interface PortfolioHolding {
  portfolio_id: number;
  scheme_code: string;
  scheme_name: string;
  fund_name?: string;
  category?: string;
  sub_category?: string;
  folio_no?: string;
  total_units: number;
  total_invested: number;
  latest_nav: number;
  current_value: number;
  total_returns: number;
  return_percentage: number;
  allocation_percentage: number;
  transaction_count: number;
  last_transaction_date?: string;
}

export interface AssetAllocation {
  category: string;
  total_invested: number;
  current_value: number;
  percentage: number;
  scheme_count: number;
  returns: number;
  return_percentage: number;
}

export interface PortfolioPerformanceMetric {
  date: string;
  invested: number;
  current_value: number;
  returns: number;
  return_percentage: number;
}

export interface CustomerPortfolioResponse {
  customer_id: number;
  customer_name?: string;
  summary: CustomerPortfolioSummary;
  holdings: PortfolioHolding[];
  allocation: AssetAllocation[];
  performance?: PortfolioPerformanceMetric[];
}

// ============================================================================
// FILTERS & REQUESTS
// ============================================================================

export interface PortfolioFilters {
  customer_id?: number;
  scheme_code?: string;
  category?: string;
  sub_category?: string;
  min_value?: number;
  max_value?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export interface RefreshPortfolioRequest {
  customer_id?: number;
  scheme_code?: string;
  force?: boolean;
}

export interface RefreshPortfolioResponse {
  success: boolean;
  refreshed_at: string;
  affected_records: number;
  duration_ms: number;
}

// ============================================================================
// STATISTICS & ANALYTICS
// ============================================================================

export interface PortfolioStatistics {
  total_customers_with_portfolio: number;
  total_schemes_held: number;
  total_invested: number;
  total_current_value: number;
  total_returns: number;
  average_return_percentage: number;
  top_performing_schemes: Array<{
    scheme_code: string;
    scheme_name: string;
    return_percentage: number;
    customer_count: number;
  }>;
  category_breakdown: AssetAllocation[];
}

// ============================================================================
// TRANSACTIONS
// ============================================================================

export interface PortfolioTransaction {
  id: number;
  txn_date: string;
  txn_type_code: string;
  txn_type_name: string;
  txn_type: 'Addition' | 'Deduction';
  total_amount: number;
  units: number;
  nav: number;
  is_potential_duplicate: boolean;
  portfolio_flag: boolean;
}

export interface SchemePortfolioDetails extends PortfolioHolding {
  recent_transactions: PortfolioTransaction[];
  first_purchase_date?: string;
  last_purchase_date?: string;
  last_redemption_date?: string;
  average_purchase_nav: number;
  total_purchases: number;
  total_redemptions: number;
  purchase_amount: number;
  redemption_amount: number;
}

// ============================================================================
// XIRR CALCULATION
// ============================================================================

export interface PortfolioXIRR {
  customer_id: number;
  scheme_code?: string;
  xirr_percentage: number;
  calculation_date: string;
  cash_flows: Array<{
    date: string;
    amount: number;
    type: 'Addition' | 'Deduction';
  }>;
}

// ============================================================================
// API RESPONSE WRAPPERS
// ============================================================================

export interface CustomerPortfolioApiResponse {
  success: boolean;
  data?: CustomerPortfolioResponse;
  error?: string;
}

export interface PortfolioTotalsApiResponse {
  success: boolean;
  data?: CustomerPortfolioSummary;
  error?: string;
}

export interface PortfolioHoldingsApiResponse {
  success: boolean;
  data?: PortfolioHolding[];
  error?: string;
}

export interface SchemePortfolioDetailsApiResponse {
  success: boolean;
  data?: SchemePortfolioDetails;
  error?: string;
}

export interface PortfolioStatisticsApiResponse {
  success: boolean;
  data?: PortfolioStatistics;
  error?: string;
}

export interface RefreshPortfolioApiResponse {
  success: boolean;
  data?: RefreshPortfolioResponse;
  error?: string;
  message?: string;
}