// backend/src/types/monthlyTracking.types.ts

// ==================== MONTHLY UNITS TRACKING ====================

export interface MonthlyUnitsData {
  month: string; // YYYY-MM format
  month_display: string; // "Jan 2025" format
  scheme_code: string;
  scheme_name: string;
  opening_units: number; // Units at start of month
  closing_units: number; // Units at end of month
  units_added: number; // Units purchased during month
  units_redeemed: number; // Units redeemed during month
  net_change: number; // units_added - units_redeemed
  transaction_count: number;
}

export interface MonthlyUnitsResponse {
  customer_id: number;
  scheme_code: string;
  scheme_name: string;
  months: MonthlyUnitsData[];
  summary: {
    total_months: number;
    current_units: number;
    total_units_added: number;
    total_units_redeemed: number;
    average_monthly_units: number;
  };
}

// ==================== MONTHLY NAV PERFORMANCE ====================

export interface MonthlyNAVData {
  month: string; // YYYY-MM format
  month_display: string; // "Jan 2025" format
  scheme_code: string;
  scheme_name: string;
  opening_nav: number; // NAV at month start
  closing_nav: number; // NAV at month end
  lowest_nav: number; // Lowest NAV during month
  highest_nav: number; // Highest NAV during month
  nav_change: number; // closing_nav - opening_nav
  nav_change_percentage: number; // (nav_change / opening_nav) * 100
  days_tracked: number;
  is_estimated?: boolean; // True if using latest available NAV (shown as ** in UI)
}

export interface MonthlyNAVResponse {
  customer_id: number;
  scheme_code: string;
  scheme_name: string;
  months: MonthlyNAVData[];
  summary: {
    total_months: number;
    current_nav: number;
    average_nav: number;
    overall_change_percentage: number;
    best_month: {
      month: string;
      change_percentage: number;
    } | null;
    worst_month: {
      month: string;
      change_percentage: number;
    } | null;
  };
}

// ==================== MONTHLY MARKET VALUE ====================

export interface MonthlyMarketValueData {
  month: string; // YYYY-MM format
  month_display: string; // "Jan 2025" format
  scheme_code: string;
  scheme_name: string;
  current_month_units: number; // Units at end of current month
  previous_month_nav: number; // NAV used for valuation (current month's closing NAV; for incomplete months, latest available)
  market_value: number; // closing_nav × current_month_units
  invested_value: number; // Total investment till date
  profit_loss: number; // market_value - invested_value
  profit_loss_percentage: number; // (profit_loss / invested_value) * 100
  month_change: number; // Change from previous month's market value
  month_change_percentage: number | null; // MoM percentage change (cash-flow adjusted). null = uncomputable (no previous data)
  net_cash_flow: number; // Net cash flow for this month (additions - redemptions)
}

export interface MonthlyMarketValueResponse {
  customer_id: number;
  scheme_code: string;
  scheme_name: string;
  months: MonthlyMarketValueData[];
  summary: {
    total_months: number;
    current_market_value: number;
    total_invested: number;
    overall_profit_loss: number;
    overall_profit_loss_percentage: number;
    average_monthly_value: number;
  };
}

// ==================== FILTERS ====================

export interface MonthlyTrackingFilters {
  customer_id: number;
  scheme_code?: string; // Optional: filter by specific scheme
  months?: number; // Number of months to fetch (default: 12)
  from_month?: string; // YYYY-MM format
  to_month?: string; // YYYY-MM format
}

// ==================== API RESPONSES ====================

export interface GetMonthlyUnitsResponse {
  success: boolean;
  data?: MonthlyUnitsResponse;
  error?: string;
}

export interface GetMonthlyNAVResponse {
  success: boolean;
  data?: MonthlyNAVResponse;
  error?: string;
}

export interface GetMonthlyMarketValueResponse {
  success: boolean;
  data?: MonthlyMarketValueResponse;
  error?: string;
}

// ==================== CONSOLIDATED VIEW ====================

export interface MonthlyTrackingConsolidated {
  month: string;
  month_display: string;
  units_data: Omit<MonthlyUnitsData, 'month' | 'month_display'>;
  nav_data: Omit<MonthlyNAVData, 'month' | 'month_display'>;
  market_value_data: Omit<MonthlyMarketValueData, 'month' | 'month_display'>;
}

export interface ConsolidatedMonthlyResponse {
  customer_id: number;
  scheme_code: string;
  scheme_name: string;
  months: MonthlyTrackingConsolidated[];
}
