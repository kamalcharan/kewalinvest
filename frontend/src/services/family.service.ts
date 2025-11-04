// frontend/src/services/family.service.ts

import apiService from './api.service';
import { API_ENDPOINTS } from './serviceURLs';
import type {
  FamilyMember,
  FamilyPortfolioSummary,
  FamilyAssetAllocation,
  FamilyGoalSummary,
  FamilyMeetingSummary
} from '../types/family.types';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export class FamilyService {
  /**
   * Get all family members
   * GET /api/family/:familyHeadIwellCode/members
   */
  static async getFamilyMembers(
    familyHeadIwellCode: string
  ): Promise<ApiResponse<FamilyMember[]>> {
    try {
      const url = API_ENDPOINTS.FAMILY.MEMBERS(familyHeadIwellCode);
      const response = await apiService.get<ApiResponse<FamilyMember[]>>(url);
      return response;
    } catch (error: any) {
      console.error('Failed to get family members:', error);
      return {
        success: false,
        error: error.message || 'Failed to get family members'
      };
    }
  }

  /**
   * Get family portfolio summary
   * GET /api/family/:familyHeadIwellCode/portfolio
   */
  static async getFamilyPortfolio(
    familyHeadIwellCode: string
  ): Promise<ApiResponse<FamilyPortfolioSummary>> {
    try {
      const url = API_ENDPOINTS.FAMILY.PORTFOLIO(familyHeadIwellCode);
      const response = await apiService.get<ApiResponse<FamilyPortfolioSummary>>(url);
      return response;
    } catch (error: any) {
      console.error('Failed to get family portfolio:', error);
      return {
        success: false,
        error: error.message || 'Failed to get family portfolio'
      };
    }
  }

  /**
   * Get family asset allocation
   * GET /api/family/:familyHeadIwellCode/asset-allocation
   */
  static async getFamilyAssetAllocation(
    familyHeadIwellCode: string
  ): Promise<ApiResponse<FamilyAssetAllocation>> {
    try {
      const url = API_ENDPOINTS.FAMILY.ASSET_ALLOCATION(familyHeadIwellCode);
      const response = await apiService.get<ApiResponse<FamilyAssetAllocation>>(url);
      return response;
    } catch (error: any) {
      console.error('Failed to get family asset allocation:', error);
      return {
        success: false,
        error: error.message || 'Failed to get family asset allocation'
      };
    }
  }

  /**
   * Get family goals summary
   * GET /api/family/:familyHeadIwellCode/goals
   */
  static async getFamilyGoals(
    familyHeadIwellCode: string
  ): Promise<ApiResponse<FamilyGoalSummary>> {
    try {
      const url = API_ENDPOINTS.FAMILY.GOALS(familyHeadIwellCode);
      const response = await apiService.get<ApiResponse<FamilyGoalSummary>>(url);
      return response;
    } catch (error: any) {
      console.error('Failed to get family goals:', error);
      return {
        success: false,
        error: error.message || 'Failed to get family goals'
      };
    }
  }

  /**
   * Get family meetings summary
   * GET /api/family/:familyHeadIwellCode/meetings
   */
  static async getFamilyMeetings(
    familyHeadIwellCode: string
  ): Promise<ApiResponse<FamilyMeetingSummary>> {
    try {
      const url = API_ENDPOINTS.FAMILY.MEETINGS(familyHeadIwellCode);
      const response = await apiService.get<ApiResponse<FamilyMeetingSummary>>(url);
      return response;
    } catch (error: any) {
      console.error('Failed to get family meetings:', error);
      return {
        success: false,
        error: error.message || 'Failed to get family meetings'
      };
    }
  }
}

export default FamilyService;
