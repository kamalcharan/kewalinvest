// frontend/src/services/monthlyTracking.service.ts
// Service for monthly tracking API calls

import apiService from './api.service';
import { API_ENDPOINTS } from './serviceURLs';

// ==================== TYPES ====================

export interface MonthlyUnitsData {
  month: string; // YYYY-MM format
  month_display: string; // "Jan 2025" format
  scheme_code: string;
  scheme_name: string;
  opening_units: number;
  closing_units: number;
  units_added: number;
  units_redeemed: number;
  net_change: number;
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

export interface MonthlyNAVData {
  month: string; // YYYY-MM format
  month_display: string; // "Jan 2025" format
  scheme_code: string;
  scheme_name: string;
  opening_nav: number;
  closing_nav: number;
  lowest_nav: number;
  highest_nav: number;
  nav_change: number;
  nav_change_percentage: number;
  days_tracked: number;
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

export interface MonthlyMarketValueData {
  month: string; // YYYY-MM format
  month_display: string; // "Jan 2025" format
  scheme_code: string;
  scheme_name: string;
  current_month_units: number;
  previous_month_nav: number;
  market_value: number;
  invested_value: number;
  profit_loss: number;
  profit_loss_percentage: number;
  month_change: number;
  month_change_percentage: number;
  net_cash_flow: number;
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

export interface MonthlyTrackingFilters {
  customer_id: number;
  scheme_code: string;
  months?: number; // Default: 12
}

// ==================== API RESPONSE TYPES ====================

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// ==================== MONTHLY TRACKING SERVICE ====================

export class MonthlyTrackingService {
  /**
   * Get monthly units tracking
   * GET /api/portfolio/:customerId/monthly-units
   */
  static async getMonthlyUnits(
    customerId: number,
    schemeCode: string,
    months: number = 12
  ): Promise<ApiResponse<MonthlyUnitsResponse>> {
    try {
      const url = `${API_ENDPOINTS.PORTFOLIO.GET_MONTHLY_UNITS(customerId)}?scheme_code=${encodeURIComponent(schemeCode)}&months=${months}`;
      const response = await apiService.get<ApiResponse<MonthlyUnitsResponse>>(url);
      return response;
    } catch (error: any) {
      console.error('Failed to get monthly units:', error);
      return {
        success: false,
        error: error.message || 'Failed to get monthly units'
      };
    }
  }

  /**
   * Get monthly NAV performance
   * GET /api/portfolio/:customerId/monthly-nav
   */
  static async getMonthlyNAV(
    customerId: number,
    schemeCode: string,
    months: number = 12
  ): Promise<ApiResponse<MonthlyNAVResponse>> {
    try {
      const url = `${API_ENDPOINTS.PORTFOLIO.GET_MONTHLY_NAV(customerId)}?scheme_code=${encodeURIComponent(schemeCode)}&months=${months}`;
      const response = await apiService.get<ApiResponse<MonthlyNAVResponse>>(url);
      return response;
    } catch (error: any) {
      console.error('Failed to get monthly NAV:', error);
      return {
        success: false,
        error: error.message || 'Failed to get monthly NAV'
      };
    }
  }

  /**
   * Get monthly market value
   * GET /api/portfolio/:customerId/monthly-market-value
   */
  static async getMonthlyMarketValue(
    customerId: number,
    schemeCode: string,
    months: number = 12
  ): Promise<ApiResponse<MonthlyMarketValueResponse>> {
    try {
      const url = `${API_ENDPOINTS.PORTFOLIO.GET_MONTHLY_MARKET_VALUE(customerId)}?scheme_code=${encodeURIComponent(schemeCode)}&months=${months}`;
      const response = await apiService.get<ApiResponse<MonthlyMarketValueResponse>>(url);
      return response;
    } catch (error: any) {
      console.error('Failed to get monthly market value:', error);
      return {
        success: false,
        error: error.message || 'Failed to get monthly market value'
      };
    }
  }
}

// Export default for convenience
export default MonthlyTrackingService;
