// frontend/src/services/bookmark.service.ts
// Service for bookmark import and management API calls

import apiService from './api.service';
import { API_ENDPOINTS } from './serviceURLs';

// ==================== TYPES ====================

export interface BookmarkImportRow {
  scheme_code: string;
  isin: string;
  scheme_name: string;
}

export interface BookmarkImportResult {
  success: boolean;
  totalRows: number;
  bookmarksCreated: number;
  bookmarksUpdated: number;
  aliasesCreated: number;
  errors: BookmarkImportError[];
  duration: number;
}

export interface BookmarkImportError {
  row: number;
  scheme_code: string;
  error: string;
}

export interface BookmarkStats {
  total_bookmarks: number;
  unique_amcs: number;
  total_aliases: number;
  oldest_bookmark: string | null;
  newest_bookmark: string | null;
}

export interface Bookmark {
  id: number;
  scheme_id: number;
  scheme_code: string;
  scheme_name: string;
  amc_name: string;
  daily_download_enabled: boolean;
  created_at: string;
  updated_at: string;
  alias_count: number;
}

export interface CheckBookmarksResponse {
  success: boolean;
  has_bookmarks: boolean;
  can_import_transactions: boolean;
}

// ==================== API RESPONSE TYPES ====================

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  count?: number;
}

// ==================== BOOKMARK SERVICE ====================

export class BookmarkService {
  /**
   * Upload and import bookmark CSV file
   * POST /api/bookmarks/import
   */
  static async importBookmarks(
    file: File,
    tenantId: number,
    isLive: boolean,
    userId: number
  ): Promise<BookmarkImportResult> {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('tenant_id', tenantId.toString());
      formData.append('is_live', isLive.toString());
      formData.append('user_id', userId.toString());

      const url = API_ENDPOINTS.BOOKMARKS.IMPORT;
      const response = await apiService.post<BookmarkImportResult>(url, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      return response;
    } catch (error: any) {
      console.error('Failed to import bookmarks:', error);
      return {
        success: false,
        totalRows: 0,
        bookmarksCreated: 0,
        bookmarksUpdated: 0,
        aliasesCreated: 0,
        errors: [],
        duration: 0,
        ...error.response?.data
      };
    }
  }

  /**
   * Get bookmark statistics for a tenant
   * GET /api/bookmarks/stats
   */
  static async getBookmarkStats(
    tenantId: number,
    isLive: boolean
  ): Promise<ApiResponse<BookmarkStats>> {
    try {
      const url = API_ENDPOINTS.BOOKMARKS.STATS(tenantId, isLive);
      const response = await apiService.get<ApiResponse<BookmarkStats>>(url);
      return response;
    } catch (error: any) {
      console.error('Failed to get bookmark stats:', error);
      return {
        success: false,
        error: error.message || 'Failed to get bookmark statistics'
      };
    }
  }

  /**
   * Get list of bookmarks for a tenant
   * GET /api/bookmarks/list
   */
  static async getBookmarks(
    tenantId: number,
    isLive: boolean,
    options?: { limit?: number; offset?: number }
  ): Promise<ApiResponse<Bookmark[]>> {
    try {
      const params = new URLSearchParams({
        tenant_id: tenantId.toString(),
        is_live: isLive.toString(),
        ...(options?.limit && { limit: options.limit.toString() }),
        ...(options?.offset && { offset: options.offset.toString() })
      });

      const url = `${API_ENDPOINTS.BOOKMARKS.LIST}?${params.toString()}`;
      const response = await apiService.get<ApiResponse<Bookmark[]>>(url);
      return response;
    } catch (error: any) {
      console.error('Failed to get bookmarks:', error);
      return {
        success: false,
        error: error.message || 'Failed to get bookmarks'
      };
    }
  }

  /**
   * Check if tenant has bookmarks (prerequisite for transaction import)
   * GET /api/bookmarks/check
   */
  static async checkBookmarks(
    tenantId: number,
    isLive: boolean
  ): Promise<CheckBookmarksResponse> {
    try {
      const url = API_ENDPOINTS.BOOKMARKS.CHECK(tenantId, isLive);
      const response = await apiService.get<CheckBookmarksResponse>(url);
      return response;
    } catch (error: any) {
      console.error('Failed to check bookmarks:', error);
      return {
        success: false,
        has_bookmarks: false,
        can_import_transactions: false
      };
    }
  }

  /**
   * Delete a bookmark
   * DELETE /api/bookmarks/:id
   */
  static async deleteBookmark(
    bookmarkId: number,
    tenantId: number,
    isLive: boolean
  ): Promise<ApiResponse<null>> {
    try {
      const url = API_ENDPOINTS.BOOKMARKS.DELETE(bookmarkId, tenantId, isLive);
      const response = await apiService.delete<ApiResponse<null>>(url);
      return response;
    } catch (error: any) {
      console.error('Failed to delete bookmark:', error);
      return {
        success: false,
        error: error.message || 'Failed to delete bookmark'
      };
    }
  }

  /**
   * Download CSV template for bookmark import
   * GET /api/bookmarks/template
   */
  static downloadTemplate(): void {
    const url = API_ENDPOINTS.BOOKMARKS.TEMPLATE;
    const link = document.createElement('a');
    link.href = url;
    link.download = 'bookmark_template.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  /**
   * Validate CSV file before upload
   */
  static validateBookmarkFile(file: File): { valid: boolean; error?: string } {
    // Check file type
    const allowedExtensions = ['.csv', '.xlsx', '.xls'];
    const fileName = file.name.toLowerCase();
    const hasValidExtension = allowedExtensions.some(ext => fileName.endsWith(ext));

    if (!hasValidExtension) {
      return {
        valid: false,
        error: 'Invalid file type. Please upload a CSV or Excel file.'
      };
    }

    // Check file size (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return {
        valid: false,
        error: 'File size exceeds 10MB limit.'
      };
    }

    return { valid: true };
  }
}

// Export default for convenience
export default BookmarkService;