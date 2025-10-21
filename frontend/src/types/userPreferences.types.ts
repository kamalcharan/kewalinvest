// frontend/src/types/userPreferences.types.ts
// Frontend types for user chart preferences

/**
 * Chart preference from API
 */
export interface ChartPreference {
  index_id: number;
  line_color: string;
  created_at: string;
  updated_at: string;
}

/**
 * Request to save chart preference
 * POST /api/user/preferences/chart/:indexId
 */
export interface SaveChartPreferenceRequest {
  line_color: string;
}

/**
 * API response for getting a single preference
 * GET /api/user/preferences/chart/:indexId
 */
export interface GetChartPreferenceResponse {
  success: boolean;
  preference: ChartPreference | null;
  message?: string;
  execution_time_ms?: number;
}

/**
 * API response for saving a preference
 * POST /api/user/preferences/chart/:indexId
 */
export interface SaveChartPreferenceResponse {
  success: boolean;
  preference: ChartPreference;
  message: string;
  execution_time_ms?: number;
}

/**
 * API response for getting all preferences
 * GET /api/user/preferences/chart
 */
export interface GetAllPreferencesResponse {
  success: boolean;
  preferences: ChartPreference[];
  total: number;
  execution_time_ms?: number;
}

/**
 * API response for deleting a preference
 * DELETE /api/user/preferences/chart/:indexId
 */
export interface DeletePreferenceResponse {
  success: boolean;
  message: string;
  execution_time_ms?: number;
}

/**
 * Error response from API
 */
export interface PreferenceErrorResponse {
  success: false;
  error: string;
}

/**
 * Preference cache key for React Query
 */
export const PREFERENCE_QUERY_KEYS = {
  all: ['user-preferences'] as const,
  charts: () => [...PREFERENCE_QUERY_KEYS.all, 'chart'] as const,
  chart: (indexId: number) => [...PREFERENCE_QUERY_KEYS.charts(), indexId] as const,
  allCharts: () => [...PREFERENCE_QUERY_KEYS.charts(), 'all'] as const,
} as const;

/**
 * Custom error class for preference operations
 */
export class PreferenceError extends Error {
  constructor(message: string, public statusCode?: number) {
    super(message);
    this.name = 'PreferenceError';
  }
}

/**
 * Helper to validate hex color format on frontend
 */
export function isValidHexColor(color: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(color);
}

/**
 * Helper to normalize hex color (ensure uppercase, with #)
 */
export function normalizeHexColor(color: string): string {
  const cleaned = color.trim();
  
  // Add # if missing
  const withHash = cleaned.startsWith('#') ? cleaned : `#${cleaned}`;
  
  // Ensure uppercase for consistency
  return withHash.toUpperCase();
}