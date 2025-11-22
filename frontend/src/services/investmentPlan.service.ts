// frontend/src/services/investmentPlan.service.ts
// API service for Investment Plans (Release 1.1 - Phase 1)

import apiService from './api.service';
import { API_ENDPOINTS } from './serviceURLs';
import {
  InvestmentPlan,
  CreateInvestmentPlanRequest,
  UpdateInvestmentPlanRequest,
  FamilyInvestmentSummary
} from '../types/investmentPlan.types';

// API Response Types
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

interface InvestmentPlanListData {
  investments: InvestmentPlan[];
  total: number;
}

export class InvestmentPlanService {
  /**
   * Get all investment plans for a customer
   */
  static async getCustomerInvestmentPlans(customerId: number): Promise<InvestmentPlan[]> {
    try {
      const response = await apiService.get<ApiResponse<InvestmentPlanListData>>(
        API_ENDPOINTS.INVESTMENT_PLANS.LIST(customerId)
      );
      return response.data?.investments || [];
    } catch (error: any) {
      console.error('Failed to get investment plans:', error);
      throw error;
    }
  }

  /**
   * Get single investment plan by ID
   */
  static async getInvestmentPlanById(customerId: number, id: number): Promise<InvestmentPlan> {
    try {
      const response = await apiService.get<ApiResponse<InvestmentPlan>>(
        API_ENDPOINTS.INVESTMENT_PLANS.GET(customerId, id)
      );
      if (!response.data) {
        throw new Error('Investment plan not found');
      }
      return response.data;
    } catch (error: any) {
      console.error('Failed to get investment plan:', error);
      throw error;
    }
  }

  /**
   * Create new investment plan
   */
  static async createInvestmentPlan(
    customerId: number,
    data: CreateInvestmentPlanRequest
  ): Promise<InvestmentPlan> {
    try {
      const response = await apiService.post<ApiResponse<InvestmentPlan>>(
        API_ENDPOINTS.INVESTMENT_PLANS.CREATE(customerId),
        data
      );
      if (!response.data) {
        throw new Error('Failed to create investment plan');
      }
      return response.data;
    } catch (error: any) {
      console.error('Failed to create investment plan:', error);
      throw error;
    }
  }

  /**
   * Update investment plan
   */
  static async updateInvestmentPlan(
    customerId: number,
    id: number,
    data: UpdateInvestmentPlanRequest
  ): Promise<InvestmentPlan> {
    try {
      const response = await apiService.put<ApiResponse<InvestmentPlan>>(
        API_ENDPOINTS.INVESTMENT_PLANS.UPDATE(customerId, id),
        data
      );
      if (!response.data) {
        throw new Error('Failed to update investment plan');
      }
      return response.data;
    } catch (error: any) {
      console.error('Failed to update investment plan:', error);
      throw error;
    }
  }

  /**
   * Delete investment plan
   */
  static async deleteInvestmentPlan(customerId: number, id: number): Promise<void> {
    try {
      await apiService.delete(
        API_ENDPOINTS.INVESTMENT_PLANS.DELETE(customerId, id)
      );
    } catch (error: any) {
      console.error('Failed to delete investment plan:', error);
      throw error;
    }
  }

  /**
   * Get family investment summary
   */
  static async getFamilyInvestmentSummary(familyHeadIwellCode: string): Promise<FamilyInvestmentSummary> {
    try {
      const response = await apiService.get<ApiResponse<FamilyInvestmentSummary>>(
        API_ENDPOINTS.INVESTMENT_PLANS.FAMILY_SUMMARY(familyHeadIwellCode)
      );
      if (!response.data) {
        throw new Error('Failed to get family investment summary');
      }
      return response.data;
    } catch (error: any) {
      console.error('Failed to get family investment summary:', error);
      throw error;
    }
  }

  /**
   * Bulk assign investment plans to all family members
   */
  static async bulkAssignToFamily(
    familyHeadIwellCode: string,
    data: CreateInvestmentPlanRequest
  ): Promise<InvestmentPlan[]> {
    try {
      const response = await apiService.post<ApiResponse<InvestmentPlanListData>>(
        API_ENDPOINTS.INVESTMENT_PLANS.FAMILY_BULK_ASSIGN(familyHeadIwellCode),
        data
      );
      return response.data?.investments || [];
    } catch (error: any) {
      console.error('Failed to bulk assign to family:', error);
      throw error;
    }
  }
}

// Export singleton instance methods
export const investmentPlanService = {
  getCustomerInvestmentPlans: InvestmentPlanService.getCustomerInvestmentPlans,
  getInvestmentPlanById: InvestmentPlanService.getInvestmentPlanById,
  createInvestmentPlan: InvestmentPlanService.createInvestmentPlan,
  updateInvestmentPlan: InvestmentPlanService.updateInvestmentPlan,
  deleteInvestmentPlan: InvestmentPlanService.deleteInvestmentPlan,
  getFamilyInvestmentSummary: InvestmentPlanService.getFamilyInvestmentSummary,
  bulkAssignToFamily: InvestmentPlanService.bulkAssignToFamily
};
