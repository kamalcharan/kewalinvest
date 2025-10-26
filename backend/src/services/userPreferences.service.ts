// backend/src/services/userPreferences.service.ts
// Service layer for user chart preferences

import { pool } from '../config/database';
import { SimpleLogger } from './simpleLogger.service';
import {
  ChartPreference,
  ChartPreferenceResponse,
  validateHexColor,
  InvalidColorError
} from '../types/user.types';

export class UserPreferencesService {
  /**
   * Get chart preference for a specific index
   * Returns null if no preference exists (will use theme default)
   */
  async getChartPreference(userId: number, indexId: number): Promise<ChartPreferenceResponse | null> {
    try {
      SimpleLogger.info(
        'UserPreferencesService',
        'Fetching chart preference',
        'getChartPreference',
        { userId, indexId }
      );

      const query = `
        SELECT index_id, line_color, created_at, updated_at
        FROM t_user_chart_preferences
        WHERE user_id = $1 AND index_id = $2
      `;

      const result = await pool.query(query, [userId, indexId]);

      if (result.rows.length === 0) {
        SimpleLogger.info(
          'UserPreferencesService',
          'No preference found, will use theme default',
          'getChartPreference',
          { userId, indexId }
        );
        return null;
      }

      const pref = result.rows[0];
      return {
        index_id: pref.index_id,
        line_color: pref.line_color,
        created_at: pref.created_at,
        updated_at: pref.updated_at
      };

    } catch (error: any) {
      SimpleLogger.error(
        'UserPreferencesService',
        'Failed to get chart preference',
        'getChartPreference',
        { userId, indexId, error: error.message },
        undefined,
        undefined,
        error.stack
      );
      throw error;
    }
  }

  /**
   * Save or update chart preference (UPSERT)
   * Validates color format before saving
   */
  async saveChartPreference(
    userId: number,
    indexId: number,
    lineColor: string
  ): Promise<ChartPreferenceResponse> {
    try {
      // Validate hex color format
      validateHexColor(lineColor);

      SimpleLogger.info(
        'UserPreferencesService',
        'Saving chart preference',
        'saveChartPreference',
        { userId, indexId, lineColor }
      );

      // UPSERT using ON CONFLICT
      const query = `
        INSERT INTO t_user_chart_preferences (user_id, index_id, line_color)
        VALUES ($1, $2, $3)
        ON CONFLICT (user_id, index_id)
        DO UPDATE SET 
          line_color = EXCLUDED.line_color,
          updated_at = CURRENT_TIMESTAMP
        RETURNING index_id, line_color, created_at, updated_at
      `;

      const result = await pool.query(query, [userId, indexId, lineColor]);

      if (result.rows.length === 0) {
        throw new Error('Failed to save preference');
      }

      const pref = result.rows[0];

      SimpleLogger.info(
        'UserPreferencesService',
        'Chart preference saved successfully',
        'saveChartPreference',
        { userId, indexId, lineColor }
      );

      return {
        index_id: pref.index_id,
        line_color: pref.line_color,
        created_at: pref.created_at,
        updated_at: pref.updated_at
      };

    } catch (error: any) {
      if (error instanceof InvalidColorError) {
        SimpleLogger.warn(
          'UserPreferencesService',
          'Invalid color format',
          'saveChartPreference',
          { userId, indexId, lineColor, error: error.message }
        );
        throw error;
      }

      SimpleLogger.error(
        'UserPreferencesService',
        'Failed to save chart preference',
        'saveChartPreference',
        { userId, indexId, lineColor, error: error.message },
        undefined,
        undefined,
        error.stack
      );
      throw error;
    }
  }

  /**
   * Get all chart preferences for a user
   * Returns empty array if no preferences exist
   */
  async getAllUserPreferences(userId: number): Promise<ChartPreferenceResponse[]> {
    try {
      SimpleLogger.info(
        'UserPreferencesService',
        'Fetching all chart preferences',
        'getAllUserPreferences',
        { userId }
      );

      const query = `
        SELECT index_id, line_color, created_at, updated_at
        FROM t_user_chart_preferences
        WHERE user_id = $1
        ORDER BY index_id ASC
      `;

      const result = await pool.query(query, [userId]);

      SimpleLogger.info(
        'UserPreferencesService',
        'All preferences fetched successfully',
        'getAllUserPreferences',
        { userId, count: result.rows.length }
      );

      return result.rows.map(pref => ({
        index_id: pref.index_id,
        line_color: pref.line_color,
        created_at: pref.created_at,
        updated_at: pref.updated_at
      }));

    } catch (error: any) {
      SimpleLogger.error(
        'UserPreferencesService',
        'Failed to get all chart preferences',
        'getAllUserPreferences',
        { userId, error: error.message },
        undefined,
        undefined,
        error.stack
      );
      throw error;
    }
  }

  /**
   * Delete chart preference for a specific index
   * Returns true if deleted, false if didn't exist
   */
  async deleteChartPreference(userId: number, indexId: number): Promise<boolean> {
    try {
      SimpleLogger.info(
        'UserPreferencesService',
        'Deleting chart preference',
        'deleteChartPreference',
        { userId, indexId }
      );

      const query = `
        DELETE FROM t_user_chart_preferences
        WHERE user_id = $1 AND index_id = $2
        RETURNING id
      `;

      const result = await pool.query(query, [userId, indexId]);

      const deleted = result.rows.length > 0;

      SimpleLogger.info(
        'UserPreferencesService',
        deleted ? 'Preference deleted successfully' : 'No preference to delete',
        'deleteChartPreference',
        { userId, indexId, deleted }
      );

      return deleted;

    } catch (error: any) {
      SimpleLogger.error(
        'UserPreferencesService',
        'Failed to delete chart preference',
        'deleteChartPreference',
        { userId, indexId, error: error.message },
        undefined,
        undefined,
        error.stack
      );
      throw error;
    }
  }

  /**
   * Check if a preference exists for user and index
   */
  async preferenceExists(userId: number, indexId: number): Promise<boolean> {
    try {
      const query = `
        SELECT 1 FROM t_user_chart_preferences
        WHERE user_id = $1 AND index_id = $2
        LIMIT 1
      `;

      const result = await pool.query(query, [userId, indexId]);
      return result.rows.length > 0;

    } catch (error: any) {
      SimpleLogger.error(
        'UserPreferencesService',
        'Failed to check preference existence',
        'preferenceExists',
        { userId, indexId, error: error.message },
        undefined,
        undefined,
        error.stack
      );
      throw error;
    }
  }

  /**
   * Bulk delete all preferences for a user
   * Useful for cleanup operations
   */
  async deleteAllUserPreferences(userId: number): Promise<number> {
    try {
      SimpleLogger.info(
        'UserPreferencesService',
        'Deleting all chart preferences for user',
        'deleteAllUserPreferences',
        { userId }
      );

      const query = `
        DELETE FROM t_user_chart_preferences
        WHERE user_id = $1
        RETURNING id
      `;

      const result = await pool.query(query, [userId]);

      SimpleLogger.info(
        'UserPreferencesService',
        'All preferences deleted',
        'deleteAllUserPreferences',
        { userId, deletedCount: result.rows.length }
      );

      return result.rows.length;

    } catch (error: any) {
      SimpleLogger.error(
        'UserPreferencesService',
        'Failed to delete all preferences',
        'deleteAllUserPreferences',
        { userId, error: error.message },
        undefined,
        undefined,
        error.stack
      );
      throw error;
    }
  }

  // ==================== DEFAULT COMPARISON INDEX ====================

  /**
   * Get default comparison index for user
   * Returns null if not set
   */
  async getDefaultComparisonIndex(userId: number): Promise<number | null> {
    try {
      const query = `
        SELECT default_comparison_index_id
        FROM t_users
        WHERE id = $1
      `;

      const result = await pool.query(query, [userId]);

      if (result.rows.length === 0) {
        return null;
      }

      return result.rows[0].default_comparison_index_id || null;

    } catch (error: any) {
      SimpleLogger.error(
        'UserPreferencesService',
        'Failed to get default comparison index',
        'getDefaultComparisonIndex',
        { userId, error: error.message },
        undefined,
        undefined,
        error.stack
      );
      throw error;
    }
  }

  /**
   * Set default comparison index for user
   */
  async setDefaultComparisonIndex(userId: number, indexId: number): Promise<void> {
    try {
      const query = `
        UPDATE t_users
        SET default_comparison_index_id = $1,
            updated_at = NOW()
        WHERE id = $2
      `;

      await pool.query(query, [indexId, userId]);

      SimpleLogger.info(
        'UserPreferencesService',
        'Default comparison index set',
        'setDefaultComparisonIndex',
        { userId, indexId }
      );

    } catch (error: any) {
      SimpleLogger.error(
        'UserPreferencesService',
        'Failed to set default comparison index',
        'setDefaultComparisonIndex',
        { userId, indexId, error: error.message },
        undefined,
        undefined,
        error.stack
      );
      throw error;
    }
  }
}

// Export singleton instance
export const userPreferencesService = new UserPreferencesService();