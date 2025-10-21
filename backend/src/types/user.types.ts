// backend/src/types/user.types.ts
// Type definitions for user-related entities and operations

/**
 * User entity from database
 */
export interface User {
  id: number;
  tenant_id: number;
  email: string;
  password_hash?: string;  // Usually not exposed in responses
  is_active: boolean;
  theme_preference: string;
  environment_preference: 'live' | 'test';
  is_live: boolean;
  created_at: Date;
  updated_at?: Date;
}

/**
 * User response (safe to send to client)
 */
export interface UserResponse {
  id: number;
  tenant_id: number;
  email: string;
  is_active: boolean;
  theme_preference: string;
  environment_preference: 'live' | 'test';
  created_at: Date;
}

/**
 * Chart preference entity from database
 */
export interface ChartPreference {
  id: number;
  user_id: number;
  index_id: number;
  line_color: string;
  created_at: Date;
  updated_at: Date;
}

/**
 * Chart preference response (what API returns)
 */
export interface ChartPreferenceResponse {
  index_id: number;
  line_color: string;
  created_at: Date;
  updated_at: Date;
}

/**
 * Request to save chart preference
 * POST /api/user/preferences/chart/:indexId
 */
export interface SaveChartPreferenceRequest {
  line_color: string;  // Must be hex format: #RRGGBB
}

/**
 * API response for getting a single preference
 * GET /api/user/preferences/chart/:indexId
 */
export interface GetChartPreferenceApiResponse {
  success: boolean;
  preference: ChartPreferenceResponse | null;
  message?: string;
}

/**
 * API response for saving a preference
 * POST /api/user/preferences/chart/:indexId
 */
export interface SaveChartPreferenceApiResponse {
  success: boolean;
  preference: ChartPreferenceResponse;
  message: string;
}

/**
 * API response for getting all user preferences
 * GET /api/user/preferences/chart
 */
export interface GetAllPreferencesApiResponse {
  success: boolean;
  preferences: ChartPreferenceResponse[];
  total: number;
}

/**
 * API response for deleting a preference
 * DELETE /api/user/preferences/chart/:indexId
 */
export interface DeletePreferenceApiResponse {
  success: boolean;
  message: string;
}

/**
 * Validation error for hex color
 */
export class InvalidColorError extends Error {
  constructor(color: string) {
    super(`Invalid hex color format: ${color}. Expected format: #RRGGBB`);
    this.name = 'InvalidColorError';
  }
}

/**
 * Helper function to validate hex color format
 */
export function isValidHexColor(color: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(color);
}

/**
 * Helper function to validate and throw if invalid
 */
export function validateHexColor(color: string): void {
  if (!isValidHexColor(color)) {
    throw new InvalidColorError(color);
  }
}