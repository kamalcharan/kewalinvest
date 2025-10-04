// backend/src/types/portfolio.types.ts

export interface CustomerPortfolio {
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
  start_date?: Date;
  created_at: Date;
  updated_at: Date;
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
  last_transaction_date?: Date;
  last_refreshed_at: Date;
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
  last_transaction_date?: Date;
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
  refreshed_at: Date;
  affected_records: number;
  duration_ms: number;
}

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

export interface PortfolioTransaction {
  id: number;
  txn_date: Date;
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
  first_purchase_date?: Date;
  last_purchase_date?: Date;
  last_redemption_date?: Date;
  average_purchase_nav: number;
  total_purchases: number;
  total_redemptions: number;
  purchase_amount: number;
  redemption_amount: number;
}

export interface PortfolioXIRR {
  customer_id: number;
  scheme_code?: string;
  xirr_percentage: number;
  calculation_date: Date;
  cash_flows: Array<{
    date: Date;
    amount: number;
    type: 'Addition' | 'Deduction';
  }>;
}