// frontend/src/services/portfolio.service.ts

import apiService from './api.service';
import { API_ENDPOINTS } from './serviceURLs';
import {
  PortfolioFilters,
  PortfolioHolding,
  AssetAllocation,
  CustomerPortfolioSummary,
  CustomerPortfolioResponse,
  SchemePortfolioDetails,
  PortfolioStatistics,
  CustomerPortfolioApiResponse,
  PortfolioTotalsApiResponse,
  SchemePortfolioDetailsApiResponse,
  PortfolioHoldingsApiResponse,
  PortfolioStatisticsApiResponse,
  RefreshPortfolioApiResponse
} from '../types/portfolio.types';

export class PortfolioService {
  /**
   * Get customer's complete portfolio
   */
  static async getCustomerPortfolio(
    customerId: number
  ): Promise<CustomerPortfolioApiResponse> {
    try {
      const url = API_ENDPOINTS.PORTFOLIO.CUSTOMER_PORTFOLIO(customerId);
      return await apiService.get<CustomerPortfolioApiResponse>(url);
    } catch (error: any) {
      console.error('Error fetching customer portfolio:', error);
      throw error;
    }
  }

  /**
   * Get portfolio totals only (faster query)
   */
  static async getPortfolioTotals(
    customerId: number
  ): Promise<PortfolioTotalsApiResponse> {
    try {
      const url = API_ENDPOINTS.PORTFOLIO.CUSTOMER_TOTALS(customerId);
      return await apiService.get<PortfolioTotalsApiResponse>(url);
    } catch (error: any) {
      console.error('Error fetching portfolio totals:', error);
      throw error;
    }
  }

  /**
   * Get scheme portfolio details with transactions
   */
  static async getSchemePortfolioDetails(
    customerId: number,
    schemeCode: string
  ): Promise<SchemePortfolioDetailsApiResponse> {
    try {
      const url = API_ENDPOINTS.PORTFOLIO.SCHEME_DETAILS(customerId, schemeCode);
      return await apiService.get<SchemePortfolioDetailsApiResponse>(url);
    } catch (error: any) {
      console.error('Error fetching scheme portfolio details:', error);
      throw error;
    }
  }

  /**
   * Get portfolio holdings with filters
   */
  static async getPortfolioHoldings(
    filters: PortfolioFilters
  ): Promise<PortfolioHoldingsApiResponse> {
    try {
      const queryParams = new URLSearchParams();

      if (filters.customer_id) queryParams.append('customer_id', filters.customer_id.toString());
      if (filters.scheme_code) queryParams.append('scheme_code', filters.scheme_code);
      if (filters.category) queryParams.append('category', filters.category);
      if (filters.sub_category) queryParams.append('sub_category', filters.sub_category);
      if (filters.min_value) queryParams.append('min_value', filters.min_value.toString());
      if (filters.max_value) queryParams.append('max_value', filters.max_value.toString());
      if (filters.sort_by) queryParams.append('sort_by', filters.sort_by);
      if (filters.sort_order) queryParams.append('sort_order', filters.sort_order);

      const url = `${API_ENDPOINTS.PORTFOLIO.HOLDINGS}?${queryParams.toString()}`;
      return await apiService.get<PortfolioHoldingsApiResponse>(url);
    } catch (error: any) {
      console.error('Error fetching portfolio holdings:', error);
      throw error;
    }
  }

  /**
   * Get portfolio statistics
   */
  static async getPortfolioStatistics(): Promise<PortfolioStatisticsApiResponse> {
    try {
      const url = API_ENDPOINTS.PORTFOLIO.STATISTICS;
      return await apiService.get<PortfolioStatisticsApiResponse>(url);
    } catch (error: any) {
      console.error('Error fetching portfolio statistics:', error);
      throw error;
    }
  }

  /**
   * Refresh portfolio totals
   */
  static async refreshPortfolioTotals(
    request: {
      customer_id?: number;
      scheme_code?: string;
      force?: boolean;
    }
  ): Promise<RefreshPortfolioApiResponse> {
    try {
      const url = API_ENDPOINTS.PORTFOLIO.REFRESH;
      return await apiService.post<RefreshPortfolioApiResponse>(url, request);
    } catch (error: any) {
      console.error('Error refreshing portfolio totals:', error);
      throw error;
    }
  }

  /**
   * Helper: Format currency (Indian Rupees)
   */
  static formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  }

  /**
   * Helper: Format percentage
   */
  static formatPercentage(percentage: number): string {
    const sign = percentage >= 0 ? '+' : '';
    return `${sign}${percentage.toFixed(2)}%`;
  }

  /**
   * Helper: Get return color
   */
  static getReturnColor(returnValue: number): string {
    if (returnValue > 0) return '#10B981'; // Green
    if (returnValue < 0) return '#EF4444'; // Red
    return '#6B7280'; // Gray
  }

  /**
   * Helper: Format large numbers (Lakhs/Crores)
   */
  static formatLargeNumber(amount: number): string {
    const absAmount = Math.abs(amount);
    const sign = amount < 0 ? '-' : '';

    if (absAmount >= 10000000) {
      // 1 crore
      return `${sign}₹${(absAmount / 10000000).toFixed(2)}Cr`;
    } else if (absAmount >= 100000) {
      // 1 lakh
      return `${sign}₹${(absAmount / 100000).toFixed(2)}L`;
    } else if (absAmount >= 1000) {
      // 1 thousand
      return `${sign}₹${(absAmount / 1000).toFixed(2)}K`;
    } else {
      return this.formatCurrency(amount);
    }
  }

  /**
   * Helper: Get category color
   */
  static getCategoryColor(category: string): string {
    const colors: Record<string, string> = {
      Equity: '#3B82F6',
      Debt: '#10B981',
      Hybrid: '#F59E0B',
      Liquid: '#6366F1',
      'Money Market': '#8B5CF6',
      Gold: '#EAB308',
      Uncategorized: '#6B7280'
    };

    return colors[category] || colors.Uncategorized;
  }

  /**
   * Helper: Calculate allocation percentage
   */
  static calculateAllocationPercentage(value: number, totalValue: number): number {
    if (!totalValue || totalValue === 0) return 0;
    return Math.round((value / totalValue) * 10000) / 100;
  }

  /**
   * Helper: Sort holdings by value
   */
  static sortHoldingsByValue(holdings: PortfolioHolding[], ascending: boolean = false): PortfolioHolding[] {
    return [...holdings].sort((a, b) =>
      ascending ? a.current_value - b.current_value : b.current_value - a.current_value
    );
  }

  /**
   * Helper: Sort holdings by returns
   */
  static sortHoldingsByReturns(holdings: PortfolioHolding[], ascending: boolean = false): PortfolioHolding[] {
    return [...holdings].sort((a, b) =>
      ascending ? a.return_percentage - b.return_percentage : b.return_percentage - a.return_percentage
    );
  }

  /**
   * Helper: Get top performers
   */
  static getTopPerformers(holdings: PortfolioHolding[], count: number = 5): PortfolioHolding[] {
    return this.sortHoldingsByReturns(holdings, false).slice(0, count);
  }

  /**
   * Helper: Get bottom performers
   */
  static getBottomPerformers(holdings: PortfolioHolding[], count: number = 5): PortfolioHolding[] {
    return this.sortHoldingsByReturns(holdings, true).slice(0, count);
  }

  /**
   * Helper: Filter holdings by category
   */
  static filterByCategory(holdings: PortfolioHolding[], categories: string[]): PortfolioHolding[] {
    return holdings.filter(h => categories.includes(h.category || 'Uncategorized'));
  }

  /**
   * Helper: Calculate portfolio summary from holdings
   */
  static calculateSummary(holdings: PortfolioHolding[]): {
    total_invested: number;
    current_value: number;
    total_returns: number;
    return_percentage: number;
  } {
    let totalInvested = 0;
    let currentValue = 0;

    holdings.forEach(holding => {
      totalInvested += holding.total_invested || 0;
      currentValue += holding.current_value || 0;
    });

    const totalReturns = currentValue - totalInvested;
    const returnPercentage = totalInvested > 0 ? (totalReturns / totalInvested) * 100 : 0;

    return {
      total_invested: totalInvested,
      current_value: currentValue,
      total_returns: totalReturns,
      return_percentage: Math.round(returnPercentage * 100) / 100
    };
  }
}

// Export types for convenience
export type {
  PortfolioFilters,
  PortfolioHolding,
  AssetAllocation,
  CustomerPortfolioSummary,
  CustomerPortfolioResponse,
  SchemePortfolioDetails,
  PortfolioStatistics
};