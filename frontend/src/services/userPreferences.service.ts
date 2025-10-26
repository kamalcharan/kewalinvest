// frontend/src/services/userPreferences.service.ts
// API service for user chart preferences

import apiService from './api.service';
import { API_ENDPOINTS } from './serviceURLs';
import {
  ChartPreference,
  GetChartPreferenceResponse,
  SaveChartPreferenceRequest,
  SaveChartPreferenceResponse,
  GetAllPreferencesResponse,
  DeletePreferenceResponse,
  PreferenceError,
  isValidHexColor
} from '../types/userPreferences.types';

/**
 * Transform backend response to frontend ChartPreference type
 */
function transformToChartPreference(backendPref: any): ChartPreference {
  return {
    index_id: backendPref.index_id,
    line_color: backendPref.line_color,
    created_at: backendPref.created_at instanceof Date 
      ? backendPref.created_at.toISOString() 
      : backendPref.created_at,
    updated_at: backendPref.updated_at instanceof Date 
      ? backendPref.updated_at.toISOString() 
      : backendPref.updated_at,
  };
}

/**
 * User Preferences Service
 * Handles all API calls related to chart preferences
 */
export class UserPreferencesService {
  /**
   * Get chart preference for a specific index
   * Returns null if no preference exists (will use theme default)
   * 
   * GET /api/user/preferences/chart/:indexId
   */
  static async getColorPreference(indexId: number): Promise<ChartPreference | null> {
    try {
      if (!indexId || indexId <= 0) {
        throw new PreferenceError('Invalid index ID', 400);
      }

      const url = API_ENDPOINTS.USER_PREFERENCES.GET_CHART_PREFERENCE(indexId);
      const response = await apiService.get<GetChartPreferenceResponse>(url);

      if (response.success && response.preference) {
        return transformToChartPreference(response.preference);
      }

      // No preference found - return null (frontend will use theme default)
      return null;

    } catch (error: any) {
      // If 404 or preference not found, return null (not an error - use default)
      if (error.response?.status === 404 || error.message?.includes('not found')) {
        return null;
      }

      console.error('Get chart preference failed:', error);
      throw new PreferenceError(
        error.message || 'Failed to fetch chart preference',
        error.response?.status
      );
    }
  }

  /**
   * Save or update chart preference for a specific index
   * Validates color format before sending
   * 
   * POST /api/user/preferences/chart/:indexId
   */
  static async saveColorPreference(
    indexId: number,
    lineColor: string
  ): Promise<ChartPreference> {
    try {
      if (!indexId || indexId <= 0) {
        throw new PreferenceError('Invalid index ID', 400);
      }

      // Validate hex color format on frontend
      if (!isValidHexColor(lineColor)) {
        throw new PreferenceError(
          `Invalid hex color format: ${lineColor}. Expected format: #RRGGBB`,
          400
        );
      }

      const url = API_ENDPOINTS.USER_PREFERENCES.SAVE_CHART_PREFERENCE(indexId);
      const body: SaveChartPreferenceRequest = { line_color: lineColor };

      const response = await apiService.post<SaveChartPreferenceResponse>(url, body);

      if (response.success && response.preference) {
        return transformToChartPreference(response.preference);
      }

      throw new PreferenceError('Failed to save preference');

    } catch (error: any) {
      console.error('Save chart preference failed:', error);
      
      // Re-throw PreferenceError as-is
      if (error instanceof PreferenceError) {
        throw error;
      }

      throw new PreferenceError(
        error.message || 'Failed to save chart preference',
        error.response?.status
      );
    }
  }

  /**
   * Get all chart preferences for the current user
   * 
   * GET /api/user/preferences/chart
   */
  static async getAllColorPreferences(): Promise<ChartPreference[]> {
    try {
      const url = API_ENDPOINTS.USER_PREFERENCES.GET_ALL_CHART_PREFERENCES;
      const response = await apiService.get<GetAllPreferencesResponse>(url);

      if (response.success && response.preferences) {
        return response.preferences.map(transformToChartPreference);
      }

      return [];

    } catch (error: any) {
      console.error('Get all preferences failed:', error);
      throw new PreferenceError(
        error.message || 'Failed to fetch preferences',
        error.response?.status
      );
    }
  }

  /**
   * Delete chart preference for a specific index
   * After deletion, frontend should use theme default color
   * 
   * DELETE /api/user/preferences/chart/:indexId
   */
  static async deleteColorPreference(indexId: number): Promise<void> {
    try {
      if (!indexId || indexId <= 0) {
        throw new PreferenceError('Invalid index ID', 400);
      }

      const url = API_ENDPOINTS.USER_PREFERENCES.DELETE_CHART_PREFERENCE(indexId);
      const response = await apiService.delete<DeletePreferenceResponse>(url);

      if (!response.success) {
        throw new PreferenceError('Failed to delete preference');
      }

    } catch (error: any) {
      console.error('Delete chart preference failed:', error);
      throw new PreferenceError(
        error.message || 'Failed to delete chart preference',
        error.response?.status
      );
    }
  }

  /**
   * Batch get preferences for multiple indices
   * Useful for preloading preferences for dashboard
   */
  static async getPreferencesForIndices(indexIds: number[]): Promise<Map<number, string>> {
    try {
      const allPreferences = await this.getAllColorPreferences();
      
      const preferenceMap = new Map<number, string>();
      
      allPreferences.forEach(pref => {
        if (indexIds.includes(pref.index_id)) {
          preferenceMap.set(pref.index_id, pref.line_color);
        }
      });

      return preferenceMap;

    } catch (error: any) {
      console.error('Get preferences for indices failed:', error);
      // Return empty map on error - frontend will use defaults
      return new Map();
    }
  }

  /**
   * Check if preference exists for an index
   * Useful for UI indicators
   */
  static async hasPreference(indexId: number): Promise<boolean> {
    try {
      const preference = await this.getColorPreference(indexId);
      return preference !== null;
    } catch {
      return false;
    }
  }

  /**
   * Helper: Debounced save function
   * Use this for color pickers to avoid excessive API calls
   * Returns a debounced function that saves after delay
   * 
   * @param indexId - The index ID to save preference for
   * @param delayMs - Delay in milliseconds (default: 1000ms)
   * @returns Debounced save function
   * 
   * @example
   * const debouncedSave = UserPreferencesService.createDebouncedSave(indexId, 1000);
   * // In color picker onChange:
   * debouncedSave(newColor);
   */
  static createDebouncedSave(
    indexId: number,
    delayMs: number = 1000
  ): (color: string) => void {
    let timeoutId: NodeJS.Timeout | null = null;

    return (color: string) => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      timeoutId = setTimeout(async () => {
        try {
          await this.saveColorPreference(indexId, color);
          console.log(`Debounced save completed for index ${indexId}: ${color}`);
        } catch (error) {
          console.error('Debounced save failed:', error);
        }
      }, delayMs);
    };
  }

  /**
   * Batch save multiple preferences
   * Useful for bulk operations or importing settings
   * 
   * @param preferences - Array of preferences to save
   * @returns Results with success/failure for each
   */
  static async batchSavePreferences(
    preferences: Array<{ indexId: number; lineColor: string }>
  ): Promise<{
    successful: number;
    failed: number;
    results: Array<{ indexId: number; success: boolean; error?: string }>;
  }> {
    const results: Array<{ indexId: number; success: boolean; error?: string }> = [];
    let successful = 0;
    let failed = 0;

    for (const pref of preferences) {
      try {
        await this.saveColorPreference(pref.indexId, pref.lineColor);
        results.push({ indexId: pref.indexId, success: true });
        successful++;
      } catch (error: any) {
        results.push({ 
          indexId: pref.indexId, 
          success: false, 
          error: error.message 
        });
        failed++;
      }
    }

    return { successful, failed, results };
  }

  /**
   * Export all user preferences as JSON
   * Useful for backup or migration
   */
  static async exportPreferences(): Promise<string> {
    try {
      const preferences = await this.getAllColorPreferences();
      
      const exportData = {
        version: '1.0',
        exported_at: new Date().toISOString(),
        preferences: preferences.map(pref => ({
          index_id: pref.index_id,
          line_color: pref.line_color
        }))
      };

      return JSON.stringify(exportData, null, 2);

    } catch (error: any) {
      console.error('Export preferences failed:', error);
      throw new PreferenceError(
        error.message || 'Failed to export preferences',
        error.response?.status
      );
    }
  }

  /**
   * Import preferences from JSON
   * Useful for restoring backup or migration
   * 
   * @param jsonData - JSON string with preferences
   * @param overwrite - Whether to overwrite existing preferences (default: false)
   */
  static async importPreferences(
    jsonData: string,
    overwrite: boolean = false
  ): Promise<{
    imported: number;
    skipped: number;
    failed: number;
  }> {
    try {
      const data = JSON.parse(jsonData);
      
      if (!data.preferences || !Array.isArray(data.preferences)) {
        throw new PreferenceError('Invalid import data format');
      }

      let imported = 0;
      let skipped = 0;
      let failed = 0;

      for (const pref of data.preferences) {
        try {
          // Check if preference already exists
          if (!overwrite) {
            const exists = await this.hasPreference(pref.index_id);
            if (exists) {
              skipped++;
              continue;
            }
          }

          await this.saveColorPreference(pref.index_id, pref.line_color);
          imported++;
        } catch {
          failed++;
        }
      }

      return { imported, skipped, failed };

    } catch (error: any) {
      console.error('Import preferences failed:', error);
      throw new PreferenceError(
        error.message || 'Failed to import preferences',
        error.response?.status
      );
    }
  }

  /**
   * Reset all preferences for current user
   * WARNING: This will delete all saved color preferences
   */
  static async resetAllPreferences(): Promise<number> {
    try {
      const allPreferences = await this.getAllColorPreferences();
      
      let deletedCount = 0;
      
      for (const pref of allPreferences) {
        try {
          await this.deleteColorPreference(pref.index_id);
          deletedCount++;
        } catch (error) {
          console.error(`Failed to delete preference for index ${pref.index_id}:`, error);
        }
      }

      return deletedCount;

    } catch (error: any) {
      console.error('Reset all preferences failed:', error);
      throw new PreferenceError(
        error.message || 'Failed to reset preferences',
        error.response?.status
      );
    }
  }

  /**
   * Get preference statistics
   * Useful for analytics or debugging
   */
  static async getPreferenceStats(): Promise<{
    total: number;
    colors: Map<string, number>;
    mostUsedColor: string | null;
  }> {
    try {
      const preferences = await this.getAllColorPreferences();
      
      const colorCounts = new Map<string, number>();
      
      preferences.forEach(pref => {
        const count = colorCounts.get(pref.line_color) || 0;
        colorCounts.set(pref.line_color, count + 1);
      });

      let mostUsedColor: string | null = null;
      let maxCount = 0;
      
      colorCounts.forEach((count, color) => {
        if (count > maxCount) {
          maxCount = count;
          mostUsedColor = color;
        }
      });

      return {
        total: preferences.length,
        colors: colorCounts,
        mostUsedColor
      };

    } catch (error: any) {
      console.error('Get preference stats failed:', error);
      throw new PreferenceError(
        error.message || 'Failed to get preference statistics',
        error.response?.status
      );
    }
  }

  /**
   * Format error message for user display
   */
  static formatError(error: unknown): string {
    if (error instanceof PreferenceError) {
      return error.message;
    }

    if (error instanceof Error) {
      return error.message;
    }

    return 'An unexpected error occurred';
  }

  /**
   * Get default comparison index for portfolio performance charts
   * Returns null if no default index is set
   *
   * GET /api/user-preferences/default-comparison-index
   */
  static async getDefaultComparisonIndex(): Promise<{
    success: boolean;
    data?: { default_comparison_index_id: number | null };
    error?: string;
  }> {
    try {
      const url = API_ENDPOINTS.USER_PREFERENCES.GET_DEFAULT_COMPARISON_INDEX;
      const response = await apiService.get<{
        success: boolean;
        default_comparison_index_id: number | null;
      }>(url);

      return {
        success: response.success ?? true,
        data: {
          default_comparison_index_id: response.default_comparison_index_id ?? null
        }
      };

    } catch (error: any) {
      console.error('Get default comparison index failed:', error);
      return {
        success: false,
        error: error.message || 'Failed to fetch default comparison index'
      };
    }
  }

  /**
   * Set default comparison index for portfolio performance charts
   *
   * POST /api/user-preferences/default-comparison-index
   */
  static async setDefaultComparisonIndex(indexId: number): Promise<{
    success: boolean;
    data?: { default_comparison_index_id: number };
    error?: string;
  }> {
    try {
      if (!indexId || indexId <= 0) {
        throw new PreferenceError('Invalid index ID', 400);
      }

      const url = API_ENDPOINTS.USER_PREFERENCES.SET_DEFAULT_COMPARISON_INDEX;
      const body = { default_comparison_index_id: indexId };

      const response = await apiService.post<{
        success: boolean;
        default_comparison_index_id: number;
      }>(url, body);

      return {
        success: response.success ?? true,
        data: {
          default_comparison_index_id: response.default_comparison_index_id
        }
      };

    } catch (error: any) {
      console.error('Set default comparison index failed:', error);

      // Re-throw PreferenceError as-is
      if (error instanceof PreferenceError) {
        return {
          success: false,
          error: error.message
        };
      }

      return {
        success: false,
        error: error.message || 'Failed to save default comparison index'
      };
    }
  }
}

// Export singleton instance for convenience
export const userPreferencesService = UserPreferencesService;

// Default export
export default UserPreferencesService;