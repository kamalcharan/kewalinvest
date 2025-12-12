// frontend/src/services/alias.service.ts

import apiService from './api.service';
import { API_ENDPOINTS } from './serviceURLs';
import type {
  AliasWithMembers,
  AliasMember,
  AliasPortfolioSummary,
  AliasAssetAllocation,
  AliasGoalSummary,
  AliasMeetingSummary,
  CreateAliasRequest,
  UpdateAliasRequest,
  Alias
} from '../types/alias.types';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

interface PaginatedResponse<T> extends ApiResponse<T> {
  pagination?: {
    page: number;
    page_size: number;
    total: number;
    total_pages: number;
  };
}

export class AliasService {
  /**
   * Get all aliases with pagination
   * GET /api/aliases
   */
  static async getAliases(params?: {
    page?: number;
    page_size?: number;
    search?: string;
  }): Promise<PaginatedResponse<AliasWithMembers[]>> {
    try {
      const queryParams = new URLSearchParams();
      if (params?.page) queryParams.append('page', params.page.toString());
      if (params?.page_size) queryParams.append('page_size', params.page_size.toString());
      if (params?.search) queryParams.append('search', params.search);

      const url = `${API_ENDPOINTS.ALIAS.LIST}${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      const response = await apiService.get<PaginatedResponse<AliasWithMembers[]>>(url);
      return response;
    } catch (error: any) {
      console.error('Failed to get aliases:', error);
      return {
        success: false,
        error: error.message || 'Failed to get aliases'
      };
    }
  }

  /**
   * Get a single alias by ID
   * GET /api/aliases/:id
   */
  static async getAlias(aliasId: number): Promise<ApiResponse<AliasWithMembers>> {
    try {
      const url = API_ENDPOINTS.ALIAS.GET(aliasId);
      const response = await apiService.get<ApiResponse<AliasWithMembers>>(url);
      return response;
    } catch (error: any) {
      console.error('Failed to get alias:', error);
      return {
        success: false,
        error: error.message || 'Failed to get alias'
      };
    }
  }

  /**
   * Get alias members
   * GET /api/aliases/:id/members
   */
  static async getAliasMembers(aliasId: number): Promise<ApiResponse<AliasMember[]>> {
    try {
      const url = API_ENDPOINTS.ALIAS.MEMBERS(aliasId);
      const response = await apiService.get<ApiResponse<AliasMember[]>>(url);
      return response;
    } catch (error: any) {
      console.error('Failed to get alias members:', error);
      return {
        success: false,
        error: error.message || 'Failed to get alias members'
      };
    }
  }

  /**
   * Create a new alias
   * POST /api/aliases
   */
  static async createAlias(request: CreateAliasRequest): Promise<ApiResponse<Alias>> {
    try {
      const url = API_ENDPOINTS.ALIAS.CREATE;
      const response = await apiService.post<ApiResponse<Alias>>(url, request);
      return response;
    } catch (error: any) {
      console.error('Failed to create alias:', error);
      return {
        success: false,
        error: error.message || 'Failed to create alias'
      };
    }
  }

  /**
   * Update an alias
   * PUT /api/aliases/:id
   */
  static async updateAlias(aliasId: number, request: UpdateAliasRequest): Promise<ApiResponse<Alias>> {
    try {
      const url = API_ENDPOINTS.ALIAS.UPDATE(aliasId);
      const response = await apiService.put<ApiResponse<Alias>>(url, request);
      return response;
    } catch (error: any) {
      console.error('Failed to update alias:', error);
      return {
        success: false,
        error: error.message || 'Failed to update alias'
      };
    }
  }

  /**
   * Delete an alias
   * DELETE /api/aliases/:id
   */
  static async deleteAlias(aliasId: number): Promise<ApiResponse<void>> {
    try {
      const url = API_ENDPOINTS.ALIAS.DELETE(aliasId);
      const response = await apiService.delete<ApiResponse<void>>(url);
      return response;
    } catch (error: any) {
      console.error('Failed to delete alias:', error);
      return {
        success: false,
        error: error.message || 'Failed to delete alias'
      };
    }
  }

  /**
   * Add members to an alias
   * POST /api/aliases/:id/members
   */
  static async addMembers(aliasId: number, customerIds: number[]): Promise<ApiResponse<void>> {
    try {
      const url = API_ENDPOINTS.ALIAS.ADD_MEMBERS(aliasId);
      const response = await apiService.post<ApiResponse<void>>(url, { customer_ids: customerIds });
      return response;
    } catch (error: any) {
      console.error('Failed to add members:', error);
      return {
        success: false,
        error: error.message || 'Failed to add members'
      };
    }
  }

  /**
   * Remove members from an alias
   * DELETE /api/aliases/:id/members
   */
  static async removeMembers(aliasId: number, customerIds: number[]): Promise<ApiResponse<void>> {
    try {
      const url = API_ENDPOINTS.ALIAS.REMOVE_MEMBERS(aliasId);
      const response = await apiService.delete<ApiResponse<void>>(url, { data: { customer_ids: customerIds } });
      return response;
    } catch (error: any) {
      console.error('Failed to remove members:', error);
      return {
        success: false,
        error: error.message || 'Failed to remove members'
      };
    }
  }

  /**
   * Get alias portfolio summary
   * GET /api/aliases/:id/portfolio
   */
  static async getAliasPortfolio(aliasId: number): Promise<ApiResponse<AliasPortfolioSummary>> {
    try {
      const url = API_ENDPOINTS.ALIAS.PORTFOLIO(aliasId);
      const response = await apiService.get<ApiResponse<AliasPortfolioSummary>>(url);
      return response;
    } catch (error: any) {
      console.error('Failed to get alias portfolio:', error);
      return {
        success: false,
        error: error.message || 'Failed to get alias portfolio'
      };
    }
  }

  /**
   * Get alias asset allocation
   * GET /api/aliases/:id/asset-allocation
   */
  static async getAliasAssetAllocation(aliasId: number): Promise<ApiResponse<AliasAssetAllocation>> {
    try {
      const url = API_ENDPOINTS.ALIAS.ASSET_ALLOCATION(aliasId);
      const response = await apiService.get<ApiResponse<AliasAssetAllocation>>(url);
      return response;
    } catch (error: any) {
      console.error('Failed to get alias asset allocation:', error);
      return {
        success: false,
        error: error.message || 'Failed to get alias asset allocation'
      };
    }
  }

  /**
   * Get alias goals summary
   * GET /api/aliases/:id/goals
   */
  static async getAliasGoals(aliasId: number): Promise<ApiResponse<AliasGoalSummary>> {
    try {
      const url = API_ENDPOINTS.ALIAS.GOALS(aliasId);
      const response = await apiService.get<ApiResponse<AliasGoalSummary>>(url);
      return response;
    } catch (error: any) {
      console.error('Failed to get alias goals:', error);
      return {
        success: false,
        error: error.message || 'Failed to get alias goals'
      };
    }
  }

  /**
   * Get alias meetings summary
   * GET /api/aliases/:id/meetings
   */
  static async getAliasMeetings(aliasId: number): Promise<ApiResponse<AliasMeetingSummary>> {
    try {
      const url = API_ENDPOINTS.ALIAS.MEETINGS(aliasId);
      const response = await apiService.get<ApiResponse<AliasMeetingSummary>>(url);
      return response;
    } catch (error: any) {
      console.error('Failed to get alias meetings:', error);
      return {
        success: false,
        error: error.message || 'Failed to get alias meetings'
      };
    }
  }

  /**
   * Get alias for a specific customer
   * GET /api/aliases/customer/:customerId
   */
  static async getCustomerAlias(customerId: number): Promise<ApiResponse<AliasWithMembers | null>> {
    try {
      const url = API_ENDPOINTS.ALIAS.CUSTOMER_ALIAS(customerId);
      const response = await apiService.get<ApiResponse<AliasWithMembers | null>>(url);
      return response;
    } catch (error: any) {
      console.error('Failed to get customer alias:', error);
      return {
        success: false,
        error: error.message || 'Failed to get customer alias'
      };
    }
  }
}

export default AliasService;
