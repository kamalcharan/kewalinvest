// frontend/src/services/goal.service.ts
// Service for goal management API calls

import apiService from './api.service';
import { API_ENDPOINTS } from './serviceURLs';

// ==================== TYPES ====================

export interface GoalTrackingStatus {
  goal_id: number;
  customer_id: number;
  goal_name: string;
  goal_type: string;
  current_value: number;
  expected_value: number;
  performance_percentage: number;
  is_on_track: boolean;
  variance_percentage: number;
  is_in_watchlist: boolean;
  watchlist_added_at?: string;
  watchlist_reason?: string;
  last_calculated_at: string;
}

export interface SchemeAllocationUtilization {
  scheme_code: string;
  scheme_name: string;
  total_portfolio_value: number;
  allocated_value: number;
  allocated_percentage: number;
  available_value: number;
  available_percentage: number;
  is_fully_allocated: boolean;
  allocation_breakdown: {
    goal_id: number;
    goal_name: string;
    allocation_percentage: number;
    allocation_value: number;
  }[];
}

export interface WatchlistGoal {
  id: number;
  title: string;
  config_data: any;
  watchlist_added_at: string;
  watchlist_reason: string;
}

// ==================== API RESPONSE TYPES ====================

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// ==================== GOAL SERVICE ====================

export class GoalService {
  /**
   * Get tracking status for a single goal
   * GET /api/goals/:id/tracking-status
   */
  static async getGoalTrackingStatus(
    goalId: number
  ): Promise<ApiResponse<GoalTrackingStatus>> {
    try {
      const url = API_ENDPOINTS.GOALS.GET_TRACKING_STATUS(goalId);
      const response = await apiService.get<ApiResponse<GoalTrackingStatus>>(url);
      return response;
    } catch (error: any) {
      console.error('Failed to get goal tracking status:', error);
      return {
        success: false,
        error: error.message || 'Failed to get goal tracking status'
      };
    }
  }

  /**
   * Get tracking status for all customer goals
   * GET /api/goals/customer/:customerId/tracking-status
   */
  static async getCustomerGoalTrackingStatus(
    customerId: number
  ): Promise<ApiResponse<GoalTrackingStatus[]>> {
    try {
      const url = API_ENDPOINTS.GOALS.GET_CUSTOMER_TRACKING_STATUS(customerId);
      const response = await apiService.get<ApiResponse<GoalTrackingStatus[]>>(url);
      return response;
    } catch (error: any) {
      console.error('Failed to get customer goal tracking status:', error);
      return {
        success: false,
        error: error.message || 'Failed to get customer goal tracking status'
      };
    }
  }

  /**
   * Get asset allocation utilization for a customer
   * GET /api/goals/customer/:customerId/allocation-utilization
   */
  static async getAssetAllocationUtilization(
    customerId: number
  ): Promise<ApiResponse<SchemeAllocationUtilization[]>> {
    try {
      const url = API_ENDPOINTS.GOALS.GET_ALLOCATION_UTILIZATION(customerId);
      const response = await apiService.get<ApiResponse<SchemeAllocationUtilization[]>>(url);
      return response;
    } catch (error: any) {
      console.error('Failed to get asset allocation utilization:', error);
      return {
        success: false,
        error: error.message || 'Failed to get asset allocation utilization'
      };
    }
  }

  /**
   * Add goal to watchlist
   * POST /api/goals/:id/watchlist
   */
  static async addToWatchlist(
    goalId: number,
    reason: string
  ): Promise<ApiResponse<null>> {
    try {
      const url = API_ENDPOINTS.GOALS.ADD_TO_WATCHLIST(goalId);
      const response = await apiService.post<ApiResponse<null>>(url, { reason });
      return response;
    } catch (error: any) {
      console.error('Failed to add goal to watchlist:', error);
      return {
        success: false,
        error: error.message || 'Failed to add goal to watchlist'
      };
    }
  }

  /**
   * Remove goal from watchlist
   * DELETE /api/goals/:id/watchlist
   */
  static async removeFromWatchlist(
    goalId: number
  ): Promise<ApiResponse<null>> {
    try {
      const url = API_ENDPOINTS.GOALS.REMOVE_FROM_WATCHLIST(goalId);
      const response = await apiService.delete<ApiResponse<null>>(url);
      return response;
    } catch (error: any) {
      console.error('Failed to remove goal from watchlist:', error);
      return {
        success: false,
        error: error.message || 'Failed to remove goal from watchlist'
      };
    }
  }

  /**
   * Get all watchlist goals for a customer
   * GET /api/goals/customer/:customerId/watchlist
   */
  static async getWatchlistGoals(
    customerId: number
  ): Promise<ApiResponse<WatchlistGoal[]>> {
    try {
      const url = API_ENDPOINTS.GOALS.GET_WATCHLIST(customerId);
      const response = await apiService.get<ApiResponse<WatchlistGoal[]>>(url);
      return response;
    } catch (error: any) {
      console.error('Failed to get watchlist goals:', error);
      return {
        success: false,
        error: error.message || 'Failed to get watchlist goals'
      };
    }
  }
}

// Export default for convenience
export default GoalService;
