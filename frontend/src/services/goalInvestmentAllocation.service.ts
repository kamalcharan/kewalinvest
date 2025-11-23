// frontend/src/services/goalInvestmentAllocation.service.ts
// Phase 2: Service for goal-investment allocation API calls

import { apiService } from './apiService';
import { API_ENDPOINTS } from './serviceURLs';
import {
  GoalInvestmentAllocation,
  GoalCalculationResult,
  InvestmentPlan
} from '../types/goal.types';

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

export interface AllocateInvestmentRequest {
  investment_plan_id: number;
  allocated_percentage?: number;
  allocated_amount?: number;
  notes?: string;
}

export interface UpdateAllocationRequest {
  allocated_percentage?: number;
  allocated_amount?: number;
  notes?: string;
}

export class GoalInvestmentAllocationService {
  /**
   * Allocate an investment plan to a goal
   */
  static async allocateInvestmentToGoal(
    goalId: number,
    data: AllocateInvestmentRequest
  ): Promise<ApiResponse<GoalInvestmentAllocation>> {
    try {
      const response = await apiService.post<ApiResponse<GoalInvestmentAllocation>>(
        API_ENDPOINTS.GOAL_ALLOCATIONS.CREATE(goalId),
        data
      );
      return response.data;
    } catch (error: any) {
      console.error('[GoalAllocationService] Error allocating investment:', error);
      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Failed to allocate investment'
      };
    }
  }

  /**
   * Get all allocations for a goal
   */
  static async getGoalAllocations(
    goalId: number
  ): Promise<ApiResponse<GoalInvestmentAllocation[]>> {
    try {
      const response = await apiService.get<ApiResponse<GoalInvestmentAllocation[]>>(
        API_ENDPOINTS.GOAL_ALLOCATIONS.LIST(goalId)
      );
      return response.data;
    } catch (error: any) {
      console.error('[GoalAllocationService] Error fetching allocations:', error);
      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Failed to fetch allocations'
      };
    }
  }

  /**
   * Update an allocation
   */
  static async updateAllocation(
    goalId: number,
    allocationId: number,
    data: UpdateAllocationRequest
  ): Promise<ApiResponse<GoalInvestmentAllocation>> {
    try {
      const response = await apiService.put<ApiResponse<GoalInvestmentAllocation>>(
        API_ENDPOINTS.GOAL_ALLOCATIONS.UPDATE(goalId, allocationId),
        data
      );
      return response.data;
    } catch (error: any) {
      console.error('[GoalAllocationService] Error updating allocation:', error);
      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Failed to update allocation'
      };
    }
  }

  /**
   * Remove an allocation
   */
  static async removeAllocation(
    goalId: number,
    allocationId: number
  ): Promise<ApiResponse<void>> {
    try {
      const response = await apiService.delete<ApiResponse<void>>(
        API_ENDPOINTS.GOAL_ALLOCATIONS.DELETE(goalId, allocationId)
      );
      return response.data;
    } catch (error: any) {
      console.error('[GoalAllocationService] Error removing allocation:', error);
      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Failed to remove allocation'
      };
    }
  }

  /**
   * Get goal calculations (progress, projections, etc.)
   */
  static async getGoalCalculations(
    goalId: number
  ): Promise<ApiResponse<GoalCalculationResult>> {
    try {
      const response = await apiService.get<ApiResponse<GoalCalculationResult>>(
        API_ENDPOINTS.GOAL_CALCULATIONS.GET(goalId)
      );
      return response.data;
    } catch (error: any) {
      console.error('[GoalAllocationService] Error fetching calculations:', error);
      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Failed to fetch calculations'
      };
    }
  }

  /**
   * Get asset breakdown for a goal
   */
  static async getAssetBreakdown(
    goalId: number
  ): Promise<ApiResponse<Record<string, number>>> {
    try {
      const response = await apiService.get<ApiResponse<Record<string, number>>>(
        API_ENDPOINTS.GOAL_CALCULATIONS.ASSET_BREAKDOWN(goalId)
      );
      return response.data;
    } catch (error: any) {
      console.error('[GoalAllocationService] Error fetching asset breakdown:', error);
      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Failed to fetch asset breakdown'
      };
    }
  }

  /**
   * Get all goals an investment plan is allocated to
   */
  static async getInvestmentGoals(
    investmentPlanId: number
  ): Promise<ApiResponse<Array<{ goal_id: number; goal_name: string; allocated_percentage: number }>>> {
    try {
      const response = await apiService.get<ApiResponse<Array<{ goal_id: number; goal_name: string; allocated_percentage: number }>>>(
        API_ENDPOINTS.INVESTMENT_GOALS.GET(investmentPlanId)
      );
      return response.data;
    } catch (error: any) {
      console.error('[GoalAllocationService] Error fetching investment goals:', error);
      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Failed to fetch investment goals'
      };
    }
  }
}

export default GoalInvestmentAllocationService;
