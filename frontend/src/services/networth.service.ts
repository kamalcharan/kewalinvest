// frontend/src/services/networth.service.ts
// Service for NetworthViewer API calls - Cycle 3 Frontend

import apiService from './api.service';
import { NETWORTH_URLS } from './serviceURLs';
import {
  NetworthSummaryRequest,
  NetworthHistoryRequest,
  NetworthBreakdownRequest,
  NetworthGoalsRequest,
  NetworthSummaryApiResponse,
  NetworthHistoryApiResponse,
  NetworthBreakdownApiResponse,
  NetworthGoalsApiResponse,
  NetworthApiResponse,
  ASSET_TYPE_COLORS,
  getAssetTypeColor
} from '../types/networth.types';

export class NetworthService {
  /**
   * Get networth summary for a customer or family
   */
  static async getSummary(
    request: NetworthSummaryRequest
  ): Promise<NetworthSummaryApiResponse> {
    try {
      const params: Record<string, any> = {};
      if (request.customer_id) params.customer_id = request.customer_id;
      if (request.family_head_iwellcode) params.family_head_iwellcode = request.family_head_iwellcode;
      if (request.as_of_date) params.as_of_date = request.as_of_date;

      const url = NETWORTH_URLS.getSummary(params);
      return await apiService.get<NetworthSummaryApiResponse>(url);
    } catch (error: any) {
      console.error('Error fetching networth summary:', error);
      throw error;
    }
  }

  /**
   * Get networth history for a customer or family
   */
  static async getHistory(
    request: NetworthHistoryRequest
  ): Promise<NetworthHistoryApiResponse> {
    try {
      const params: Record<string, any> = {};
      if (request.customer_id) params.customer_id = request.customer_id;
      if (request.family_head_iwellcode) params.family_head_iwellcode = request.family_head_iwellcode;
      if (request.start_date) params.start_date = request.start_date;
      if (request.end_date) params.end_date = request.end_date;
      if (request.granularity) params.granularity = request.granularity;

      const url = NETWORTH_URLS.getHistory(params);
      return await apiService.get<NetworthHistoryApiResponse>(url);
    } catch (error: any) {
      console.error('Error fetching networth history:', error);
      throw error;
    }
  }

  /**
   * Get networth breakdown by asset type
   */
  static async getBreakdown(
    request: NetworthBreakdownRequest
  ): Promise<NetworthBreakdownApiResponse> {
    try {
      const params: Record<string, any> = {};
      if (request.customer_id) params.customer_id = request.customer_id;
      if (request.family_head_iwellcode) params.family_head_iwellcode = request.family_head_iwellcode;
      if (request.as_of_date) params.as_of_date = request.as_of_date;
      if (request.asset_type_codes) params.asset_type_codes = request.asset_type_codes.join(',');

      const url = NETWORTH_URLS.getBreakdown(params);
      return await apiService.get<NetworthBreakdownApiResponse>(url);
    } catch (error: any) {
      console.error('Error fetching networth breakdown:', error);
      throw error;
    }
  }

  /**
   * Get networth goals achievability
   */
  static async getGoals(
    request: NetworthGoalsRequest
  ): Promise<NetworthGoalsApiResponse> {
    try {
      const params: Record<string, any> = {};
      if (request.customer_id) params.customer_id = request.customer_id;
      if (request.family_head_iwellcode) params.family_head_iwellcode = request.family_head_iwellcode;
      if (request.projection_years) params.projection_years = request.projection_years;

      const url = NETWORTH_URLS.getGoals(params);
      return await apiService.get<NetworthGoalsApiResponse>(url);
    } catch (error: any) {
      console.error('Error fetching networth goals:', error);
      throw error;
    }
  }

  /**
   * Health check endpoint
   */
  static async healthCheck(): Promise<NetworthApiResponse<any>> {
    try {
      const url = NETWORTH_URLS.getHealth();
      return await apiService.get<NetworthApiResponse<any>>(url);
    } catch (error: any) {
      console.error('Error checking networth health:', error);
      throw error;
    }
  }

  // ==================== HELPER METHODS ====================

  /**
   * Format currency (Indian Rupees) - NULL SAFE
   */
  static formatCurrency(amount: number | null | undefined): string {
    if (amount === null || amount === undefined || isNaN(amount)) {
      return '₹0';
    }

    if (amount >= 10000000) {
      return `₹${(amount / 10000000).toFixed(2)}Cr`;
    } else if (amount >= 100000) {
      return `₹${(amount / 100000).toFixed(2)}L`;
    }
    return `₹${amount.toLocaleString('en-IN')}`;
  }

  /**
   * Format large currency for compact display
   */
  static formatLargeCurrency(amount: number | null | undefined): string {
    if (amount === null || amount === undefined || isNaN(amount)) {
      return '₹0';
    }

    const absAmount = Math.abs(amount);
    const sign = amount < 0 ? '-' : '';

    if (absAmount >= 10000000) {
      return `${sign}₹${(absAmount / 10000000).toFixed(2)}Cr`;
    } else if (absAmount >= 100000) {
      return `${sign}₹${(absAmount / 100000).toFixed(2)}L`;
    } else if (absAmount >= 1000) {
      return `${sign}₹${(absAmount / 1000).toFixed(1)}K`;
    }
    return `${sign}₹${absAmount.toLocaleString('en-IN')}`;
  }

  /**
   * Format percentage - NULL SAFE
   */
  static formatPercentage(value: number | null | undefined, showSign: boolean = true): string {
    if (value === null || value === undefined || isNaN(value)) {
      return '0.0%';
    }
    const sign = showSign && value > 0 ? '+' : '';
    return `${sign}${value.toFixed(1)}%`;
  }

  /**
   * Get color based on return value - NULL SAFE
   */
  static getReturnColor(returnValue: number | null | undefined): string {
    if (returnValue === null || returnValue === undefined || isNaN(returnValue)) {
      return '#6B7280'; // Gray
    }
    if (returnValue > 0) return '#10B981'; // Green
    if (returnValue < 0) return '#EF4444'; // Red
    return '#6B7280'; // Gray
  }

  /**
   * Get asset type color
   */
  static getAssetTypeColor(assetTypeCode: string): string {
    return getAssetTypeColor(assetTypeCode);
  }

  /**
   * Get all asset type colors
   */
  static getAssetTypeColors(): Record<string, string> {
    return ASSET_TYPE_COLORS;
  }

  /**
   * Format date for display
   */
  static formatDate(dateString: string | null | undefined): string {
    if (!dateString) return '-';

    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return dateString;
    }
  }

  /**
   * Format month-year for chart labels
   */
  static formatMonthYear(dateString: string | null | undefined): string {
    if (!dateString) return '-';

    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-IN', {
        month: 'short',
        year: '2-digit'
      });
    } catch {
      return dateString;
    }
  }

  /**
   * Get status color for goal achievability
   */
  static getGoalStatusColor(status: string): string {
    switch (status) {
      case 'on_track':
        return '#10B981'; // Green
      case 'ahead':
        return '#3B82F6'; // Blue
      case 'at_risk':
        return '#F59E0B'; // Amber
      case 'behind':
        return '#EF4444'; // Red
      default:
        return '#6B7280'; // Gray
    }
  }

  /**
   * Get status label for goal achievability
   */
  static getGoalStatusLabel(status: string): string {
    switch (status) {
      case 'on_track':
        return 'On Track';
      case 'ahead':
        return 'Ahead';
      case 'at_risk':
        return 'At Risk';
      case 'behind':
        return 'Behind';
      default:
        return status;
    }
  }

  /**
   * Calculate allocation percentages from breakdown
   */
  static calculateAllocationPercentages(
    breakdown: Array<{ current_value: number }>
  ): number[] {
    const totalValue = breakdown.reduce((sum, item) => sum + (item.current_value || 0), 0);
    if (totalValue === 0) return breakdown.map(() => 0);

    return breakdown.map(item =>
      Math.round(((item.current_value || 0) / totalValue) * 1000) / 10
    );
  }

  /**
   * Sort asset types by value (descending)
   */
  static sortByValue<T extends { current_value: number }>(items: T[]): T[] {
    return [...items].sort((a, b) => (b.current_value || 0) - (a.current_value || 0));
  }

  /**
   * Sort asset types by return percentage (descending)
   */
  static sortByReturns<T extends { return_percentage: number }>(items: T[]): T[] {
    return [...items].sort((a, b) => (b.return_percentage || 0) - (a.return_percentage || 0));
  }
}

// Export types for convenience
export type {
  NetworthSummaryRequest,
  NetworthHistoryRequest,
  NetworthBreakdownRequest,
  NetworthGoalsRequest
};
