// frontend/src/services/courseCorrection.service.ts
// Service for Course Correction (Scheme Code Migration) API calls

import { buildHeaders } from './serviceURLs';
import {
  CourseCorrectionListResponse,
  CourseCorrectionDetailResponse,
  ImpactAnalysisResponse,
  ExecuteResponse,
  RollbackResponse,
  BookmarksResponse,
  SchemeSearchResponse,
  CreateCourseCorrectionRequest,
  GetCorrectionsParams
} from '../types/courseCorrection.types';

// Use the same API base URL as other services
const API_BASE = (process.env.REACT_APP_API_URL || 'http://localhost:8080') + '/api';
const BASE_URL = `${API_BASE}/course-correction`;

class CourseCorrectionService {
  private getHeaders(): Record<string, string> {
    const token = localStorage.getItem('access_token');
    const tenantId = localStorage.getItem('tenant_id');
    const environment = localStorage.getItem('environment') as 'live' | 'test' || 'test';
    return buildHeaders(token || '', tenantId || '', environment);
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Request failed with status ${response.status}`);
    }
    return response.json();
  }

  // ============================================================================
  // BOOKMARKS & SCHEME SEARCH
  // ============================================================================

  /**
   * Get bookmarked schemes for source selection
   */
  async getBookmarks(): Promise<BookmarksResponse> {
    const response = await fetch(`${BASE_URL}/bookmarks`, {
      headers: this.getHeaders()
    });
    return this.handleResponse<BookmarksResponse>(response);
  }

  /**
   * Search schemes within bookmarks for target selection
   * Returns only bookmarked schemes (which have NAV data for portfolio calculations)
   */
  async searchSchemes(search: string, page: number = 1, pageSize: number = 20): Promise<SchemeSearchResponse> {
    const params = new URLSearchParams({
      search,
      page: page.toString(),
      page_size: pageSize.toString()
    });
    const response = await fetch(`${BASE_URL}/schemes/search?${params}`, {
      headers: this.getHeaders()
    });
    return this.handleResponse<SchemeSearchResponse>(response);
  }

  // ============================================================================
  // IMPACT ANALYSIS
  // ============================================================================

  /**
   * Get impact analysis for a scheme code
   */
  async getImpactAnalysis(schemeCode: string): Promise<ImpactAnalysisResponse> {
    const response = await fetch(`${BASE_URL}/impact/${encodeURIComponent(schemeCode)}`, {
      headers: this.getHeaders()
    });
    return this.handleResponse<ImpactAnalysisResponse>(response);
  }

  // ============================================================================
  // CORRECTIONS CRUD
  // ============================================================================

  /**
   * Get list of course corrections
   */
  async getCorrections(params?: GetCorrectionsParams): Promise<CourseCorrectionListResponse> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.page_size) searchParams.set('page_size', params.page_size.toString());
    if (params?.status) searchParams.set('status', params.status);
    if (params?.customer_id) searchParams.set('customer_id', params.customer_id.toString());
    if (params?.source_scheme_code) searchParams.set('source_scheme_code', params.source_scheme_code);

    const url = searchParams.toString() ? `${BASE_URL}/corrections?${searchParams}` : `${BASE_URL}/corrections`;
    const response = await fetch(url, {
      headers: this.getHeaders()
    });
    return this.handleResponse<CourseCorrectionListResponse>(response);
  }

  /**
   * Get single course correction by ID
   */
  async getCorrection(id: number): Promise<CourseCorrectionDetailResponse> {
    const response = await fetch(`${BASE_URL}/corrections/${id}`, {
      headers: this.getHeaders()
    });
    return this.handleResponse<CourseCorrectionDetailResponse>(response);
  }

  /**
   * Create a new course correction (pending status)
   */
  async createCorrection(request: CreateCourseCorrectionRequest): Promise<CourseCorrectionDetailResponse> {
    const response = await fetch(`${BASE_URL}/corrections`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(request)
    });
    return this.handleResponse<CourseCorrectionDetailResponse>(response);
  }

  /**
   * Execute a pending course correction
   */
  async executeCorrection(id: number): Promise<ExecuteResponse> {
    const response = await fetch(`${BASE_URL}/corrections/${id}/execute`, {
      method: 'POST',
      headers: this.getHeaders()
    });
    return this.handleResponse<ExecuteResponse>(response);
  }

  /**
   * Rollback a completed course correction
   */
  async rollbackCorrection(id: number): Promise<RollbackResponse> {
    const response = await fetch(`${BASE_URL}/corrections/${id}/rollback`, {
      method: 'POST',
      headers: this.getHeaders()
    });
    return this.handleResponse<RollbackResponse>(response);
  }

  /**
   * Delete a pending course correction
   */
  async deleteCorrection(id: number): Promise<{ success: boolean; message?: string; error?: string }> {
    const response = await fetch(`${BASE_URL}/corrections/${id}`, {
      method: 'DELETE',
      headers: this.getHeaders()
    });
    return this.handleResponse(response);
  }

  /**
   * Mark snapshot as regenerated
   */
  async markSnapshotDone(id: number): Promise<{ success: boolean; message?: string; error?: string }> {
    const response = await fetch(`${BASE_URL}/corrections/${id}/snapshot-done`, {
      method: 'POST',
      headers: this.getHeaders()
    });
    return this.handleResponse(response);
  }
}

export const courseCorrectionService = new CourseCorrectionService();
export default courseCorrectionService;
