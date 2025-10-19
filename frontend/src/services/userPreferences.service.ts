// frontend/src/services/userPreferences.service.ts

import {
  UserChartPreference,
  SaveColorPreferenceRequest,
  SaveColorPreferenceResponse,
  GetColorPreferenceResponse,
  MarketAnalysisError,
  ApiError
} from '../types/marketAnalysis.types';

class UserPreferencesService {
  private baseUrl: string;
  private timeout: number = 10000; // 10 seconds for preferences

  constructor() {
    // TODO: Replace with environment variable
    this.baseUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';
  }

  /**
   * Make HTTP request with error handling
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        }
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData: ApiError = await response.json().catch(() => ({
          message: `HTTP ${response.status}: ${response.statusText}`,
          code: `HTTP_${response.status}`
        }));

        throw new MarketAnalysisError(
          errorData.message,
          errorData.code,
          errorData.details
        );
      }

      return await response.json();
    } catch (error: any) {
      if (error instanceof MarketAnalysisError) {
        throw error;
      }

      if (error.name === 'AbortError') {
        throw new MarketAnalysisError(
          'Request timeout',
          'TIMEOUT',
          { timeout: this.timeout }
        );
      }

      throw new MarketAnalysisError(
        error.message || 'Unknown error',
        'NETWORK_ERROR',
        { originalError: error }
      );
    }
  }

  /**
   * Validate hex color format
   */
  private isValidHexColor(color: string): boolean {
    return /^#[0-9A-F]{6}$/i.test(color);
  }

  /**
   * Save or update chart color preference for an index
   */
  async saveColorPreference(
    indexId: number,
    lineColor: string
  ): Promise<UserChartPreference> {
    try {
      // Validate color format
      if (!this.isValidHexColor(lineColor)) {
        throw new MarketAnalysisError(
          'Invalid hex color format. Use #RRGGBB format.',
          'INVALID_COLOR_FORMAT',
          { color: lineColor }
        );
      }

      const request: SaveColorPreferenceRequest = {
        index_id: indexId,
        line_color: lineColor
      };

      const response = await this.request<SaveColorPreferenceResponse>(
        '/user-preferences/chart-colors',
        {
          method: 'POST',
          body: JSON.stringify(request)
        }
      );

      if (!response.success) {
        throw new MarketAnalysisError(
          response.error || 'Failed to save color preference',
          'SAVE_PREFERENCE_ERROR'
        );
      }

      if (!response.data) {
        throw new MarketAnalysisError(
          'No data returned from server',
          'NO_DATA_ERROR'
        );
      }

      console.log('Color preference saved:', {
        indexId,
        color: lineColor
      });

      return response.data;
    } catch (error: any) {
      console.error('Save color preference failed:', error);
      throw error;
    }
  }

  /**
   * Get chart color preference for an index
   */
  async getColorPreference(indexId: number): Promise<UserChartPreference | null> {
    try {
      const response = await this.request<GetColorPreferenceResponse>(
        `/user-preferences/chart-colors/${indexId}`,
        { method: 'GET' }
      );

      if (!response.success) {
        // 404 is expected if no preference exists
        if (response.error?.includes('404') || response.error?.includes('not found')) {
          return null;
        }

        throw new MarketAnalysisError(
          response.error || 'Failed to get color preference',
          'GET_PREFERENCE_ERROR'
        );
      }

      return response.data || null;
    } catch (error: any) {
      // Handle 404 gracefully
      if (error instanceof MarketAnalysisError && error.code === 'HTTP_404') {
        console.log('No color preference found for index:', indexId);
        return null;
      }

      console.error('Get color preference failed:', error);
      throw error;
    }
  }

  /**
   * Get all chart color preferences for the current user
   */
  async getAllColorPreferences(): Promise<UserChartPreference[]> {
    try {
      const response = await this.request<{ success: boolean; data: UserChartPreference[]; error?: string }>(
        '/user-preferences/chart-colors',
        { method: 'GET' }
      );

      if (!response.success) {
        throw new MarketAnalysisError(
          response.error || 'Failed to get color preferences',
          'GET_PREFERENCES_ERROR'
        );
      }

      return response.data || [];
    } catch (error: any) {
      console.error('Get all color preferences failed:', error);
      throw error;
    }
  }

  /**
   * Delete chart color preference for an index
   * Reverts to default theme color
   */
  async deleteColorPreference(indexId: number): Promise<void> {
    try {
      const response = await this.request<{ success: boolean; message: string; error?: string }>(
        `/user-preferences/chart-colors/${indexId}`,
        { method: 'DELETE' }
      );

      if (!response.success) {
        throw new MarketAnalysisError(
          response.error || 'Failed to delete color preference',
          'DELETE_PREFERENCE_ERROR'
        );
      }

      console.log('Color preference deleted for index:', indexId);
    } catch (error: any) {
      console.error('Delete color preference failed:', error);
      throw error;
    }
  }

  /**
   * Delete all chart color preferences
   * Reverts all to default theme colors
   */
  async deleteAllColorPreferences(): Promise<void> {
    try {
      const response = await this.request<{ success: boolean; message: string; error?: string }>(
        '/user-preferences/chart-colors',
        { method: 'DELETE' }
      );

      if (!response.success) {
        throw new MarketAnalysisError(
          response.error || 'Failed to delete all color preferences',
          'DELETE_ALL_PREFERENCES_ERROR'
        );
      }

      console.log('All color preferences deleted');
    } catch (error: any) {
      console.error('Delete all color preferences failed:', error);
      throw error;
    }
  }

  /**
   * Batch update color preferences
   * Useful for bot operations
   */
  async batchUpdateColorPreferences(
    preferences: Array<{ index_id: number; line_color: string }>
  ): Promise<UserChartPreference[]> {
    try {
      // Validate all colors first
      for (const pref of preferences) {
        if (!this.isValidHexColor(pref.line_color)) {
          throw new MarketAnalysisError(
            `Invalid hex color format for index ${pref.index_id}. Use #RRGGBB format.`,
            'INVALID_COLOR_FORMAT',
            { index_id: pref.index_id, color: pref.line_color }
          );
        }
      }

      const response = await this.request<{ success: boolean; data: UserChartPreference[]; error?: string }>(
        '/user-preferences/chart-colors/batch',
        {
          method: 'POST',
          body: JSON.stringify({ preferences })
        }
      );

      if (!response.success) {
        throw new MarketAnalysisError(
          response.error || 'Failed to batch update color preferences',
          'BATCH_UPDATE_ERROR'
        );
      }

      console.log('Batch color preferences updated:', preferences.length);

      return response.data || [];
    } catch (error: any) {
      console.error('Batch update color preferences failed:', error);
      throw error;
    }
  }

  /**
   * Get or create preference with default
   * Returns existing preference or creates one with provided default color
   */
  async getOrCreateColorPreference(
    indexId: number,
    defaultColor: string = '#f83b46'
  ): Promise<UserChartPreference> {
    try {
      // Try to get existing preference
      const existing = await this.getColorPreference(indexId);
      if (existing) {
        return existing;
      }

      // Create new preference with default color
      return await this.saveColorPreference(indexId, defaultColor);
    } catch (error: any) {
      console.error('Get or create color preference failed:', error);
      throw error;
    }
  }

  /**
   * Export preferences as JSON
   * Useful for data export/import
   */
  async exportPreferencesAsJSON(): Promise<Blob> {
    try {
      const preferences = await this.getAllColorPreferences();
      
      const json = JSON.stringify(preferences, null, 2);
      return new Blob([json], { type: 'application/json' });
    } catch (error: any) {
      console.error('Export preferences failed:', error);
      throw error;
    }
  }

  /**
   * Import preferences from JSON
   * Useful for data import
   */
  async importPreferencesFromJSON(file: File): Promise<UserChartPreference[]> {
    try {
      const text = await file.text();
      const preferences = JSON.parse(text) as Array<{ index_id: number; line_color: string }>;

      // Validate before importing
      for (const pref of preferences) {
        if (!pref.index_id || !this.isValidHexColor(pref.line_color)) {
          throw new MarketAnalysisError(
            'Invalid preference data in file',
            'INVALID_IMPORT_DATA',
            { file: file.name }
          );
        }
      }

      return await this.batchUpdateColorPreferences(preferences);
    } catch (error: any) {
      console.error('Import preferences failed:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const userPreferencesService = new UserPreferencesService();