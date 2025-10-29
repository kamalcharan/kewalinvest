// frontend/src/services/schemeAlias.service.ts

import apiService from './api.service';
import { API_ENDPOINTS } from './serviceURLs';

// ==================== TYPE DEFINITIONS ====================

export interface SchemeAlias {
  id: number;
  scheme_id: number;
  scheme_code: string | null;
  alias_name: string;
  alias_name_normalized: string;
  source: 'auto' | 'manual' | 'import';
  is_active: boolean;
  created_by: number | null;
  created_at: string;
  updated_at: string;
}

export interface SchemeAliasWithScheme extends SchemeAlias {
  scheme_name: string;
  scheme_nav_name: string | null;
  amc_name: string | null;
}

export interface SchemeLookupResult {
  scheme_id: number;
  scheme_code: string;
  scheme_name: string;
  matched_alias: string;
}

export interface CreateSchemeAliasRequest {
  scheme_id?: number;
  scheme_code?: string;
  alias_name: string;
  source?: 'manual' | 'import';
}

export interface UpdateSchemeAliasRequest {
  alias_name?: string;
  is_active?: boolean;
}

export interface BulkCreateAliasesRequest {
  scheme_code: string;
  aliases: string[];
  source?: 'import' | 'manual';
}

export interface SchemeAliasFilters {
  scheme_id?: number;
  scheme_code?: string;
  search?: string;
  source?: 'auto' | 'manual' | 'import';
  is_active?: boolean;
  page?: number;
  page_size?: number;
}

export interface AliasStatistics {
  total_aliases: number;
  active_aliases: number;
  schemes_with_aliases: number;
  avg_aliases_per_scheme: number;
  recent_additions: number;
}

// ==================== RESPONSE TYPES ====================

export interface SchemeAliasResponse {
  success: boolean;
  data?: SchemeAliasWithScheme;
  error?: string;
}

export interface SchemeAliasListResponse {
  success: boolean;
  data?: SchemeAliasWithScheme[];
  total?: number;
  page?: number;
  page_size?: number;
  error?: string;
}

export interface SchemeAliasDeleteResponse {
  success: boolean;
  message?: string;
  error?: string;
}

export interface BulkCreateAliasesResponse {
  success: boolean;
  created: number;
  skipped: number;
  errors: Array<{
    alias: string;
    error: string;
  }>;
}

export interface SchemeLookupResponse {
  success: boolean;
  data?: SchemeLookupResult;
  error?: string;
}

export interface AliasStatisticsResponse {
  success: boolean;
  data?: AliasStatistics;
  error?: string;
}

export interface BackfillResponse {
  success: boolean;
  data?: {
    created: number;
  };
  message?: string;
  error?: string;
}

export interface BackfillProgress {
  userId: number;
  current: number;
  total: number;
  created: number;
  skipped: number;
  status: 'running' | 'completed' | 'cancelled' | 'error';
  startTime: string;
  endTime?: string;
  error?: string;
}

export interface BackfillProgressResponse {
  success: boolean;
  data?: BackfillProgress | null;
  error?: string;
}

export interface CancelBackfillResponse {
  success: boolean;
  message?: string;
  error?: string;
}

// ==================== SERVICE CLASS ====================

export class SchemeAliasService {
  /**
   * Get list of aliases with filters
   */
  static async getAliases(
    filters: SchemeAliasFilters = {}
  ): Promise<SchemeAliasListResponse> {
    try {
      const queryParams = new URLSearchParams();

      if (filters.scheme_id) queryParams.append('scheme_id', filters.scheme_id.toString());
      if (filters.scheme_code) queryParams.append('scheme_code', filters.scheme_code);
      if (filters.search) queryParams.append('search', filters.search);
      if (filters.source) queryParams.append('source', filters.source);
      if (filters.is_active !== undefined) queryParams.append('is_active', filters.is_active.toString());
      if (filters.page) queryParams.append('page', filters.page.toString());
      if (filters.page_size) queryParams.append('page_size', filters.page_size.toString());

      const url = `${API_ENDPOINTS.SCHEME_ALIASES.LIST}?${queryParams.toString()}`;
      return await apiService.get<SchemeAliasListResponse>(url);
    } catch (error: any) {
      console.error('Error fetching scheme aliases:', error);
      throw error;
    }
  }

  /**
   * Get single alias by ID
   */
  static async getAliasById(aliasId: number): Promise<SchemeAliasResponse> {
    try {
      const url = API_ENDPOINTS.SCHEME_ALIASES.GET(aliasId);
      return await apiService.get<SchemeAliasResponse>(url);
    } catch (error: any) {
      console.error('Error fetching alias:', error);
      throw error;
    }
  }

  /**
   * Create new alias
   */
  static async createAlias(
    request: CreateSchemeAliasRequest
  ): Promise<SchemeAliasResponse> {
    try {
      const url = API_ENDPOINTS.SCHEME_ALIASES.CREATE;
      return await apiService.post<SchemeAliasResponse>(url, request);
    } catch (error: any) {
      console.error('Error creating alias:', error);
      throw error;
    }
  }

  /**
   * Update existing alias
   */
  static async updateAlias(
    aliasId: number,
    request: UpdateSchemeAliasRequest
  ): Promise<SchemeAliasResponse> {
    try {
      const url = API_ENDPOINTS.SCHEME_ALIASES.UPDATE(aliasId);
      return await apiService.put<SchemeAliasResponse>(url, request);
    } catch (error: any) {
      console.error('Error updating alias:', error);
      throw error;
    }
  }

  /**
   * Delete (deactivate) alias
   */
  static async deleteAlias(aliasId: number): Promise<SchemeAliasDeleteResponse> {
    try {
      const url = API_ENDPOINTS.SCHEME_ALIASES.DELETE(aliasId);
      return await apiService.delete<SchemeAliasDeleteResponse>(url);
    } catch (error: any) {
      console.error('Error deleting alias:', error);
      throw error;
    }
  }

  /**
   * Bulk create multiple aliases for one scheme
   */
  static async bulkCreateAliases(
    request: BulkCreateAliasesRequest
  ): Promise<BulkCreateAliasesResponse> {
    try {
      const url = API_ENDPOINTS.SCHEME_ALIASES.BULK;
      return await apiService.post<BulkCreateAliasesResponse>(url, request);
    } catch (error: any) {
      console.error('Error bulk creating aliases:', error);
      throw error;
    }
  }

  /**
   * Lookup scheme by alias name (for testing/debugging)
   */
  static async lookupByAlias(aliasName: string): Promise<SchemeLookupResponse> {
    try {
      const url = API_ENDPOINTS.SCHEME_ALIASES.LOOKUP;
      return await apiService.post<SchemeLookupResponse>(url, { alias_name: aliasName });
    } catch (error: any) {
      console.error('Error looking up alias:', error);
      throw error;
    }
  }

  /**
   * Get alias statistics for dashboard
   */
  static async getStatistics(): Promise<AliasStatisticsResponse> {
    try {
      const url = API_ENDPOINTS.SCHEME_ALIASES.STATISTICS;
      return await apiService.get<AliasStatisticsResponse>(url);
    } catch (error: any) {
      console.error('Error fetching alias statistics:', error);
      throw error;
    }
  }

  /**
   * Backfill missing aliases for all schemes (async operation)
   * Returns immediately, processes in background
   */
  static async backfillAliases(): Promise<BackfillResponse> {
    try {
      const url = API_ENDPOINTS.SCHEME_ALIASES.BACKFILL;
      return await apiService.post<BackfillResponse>(url, {});
    } catch (error: any) {
      console.error('Error backfilling aliases:', error);
      throw error;
    }
  }

  /**
   * Get backfill progress for current user
   */
  static async getBackfillProgress(): Promise<BackfillProgressResponse> {
    try {
      const url = API_ENDPOINTS.SCHEME_ALIASES.BACKFILL_PROGRESS;
      return await apiService.get<BackfillProgressResponse>(url);
    } catch (error: any) {
      console.error('Error fetching backfill progress:', error);
      throw error;
    }
  }

  /**
   * Cancel running backfill for current user
   */
  static async cancelBackfill(): Promise<CancelBackfillResponse> {
    try {
      const url = API_ENDPOINTS.SCHEME_ALIASES.BACKFILL_CANCEL;
      return await apiService.post<CancelBackfillResponse>(url, {});
    } catch (error: any) {
      console.error('Error cancelling backfill:', error);
      throw error;
    }
  }

  /**
   * Get aliases for specific scheme (convenience method)
   */
  static async getAliasesForScheme(schemeId: number): Promise<SchemeAliasListResponse> {
    return this.getAliases({ scheme_id: schemeId });
  }

  /**
   * Get aliases by scheme code (convenience method)
   */
  static async getAliasesBySchemeCode(schemeCode: string): Promise<SchemeAliasListResponse> {
    return this.getAliases({ scheme_code: schemeCode });
  }

  /**
   * Search aliases (convenience method)
   */
  static async searchAliases(searchTerm: string, page: number = 1, pageSize: number = 50): Promise<SchemeAliasListResponse> {
    return this.getAliases({ search: searchTerm, page, page_size: pageSize });
  }
}

export default SchemeAliasService;
