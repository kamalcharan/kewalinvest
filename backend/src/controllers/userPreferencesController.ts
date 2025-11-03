// backend/src/controllers/userPreferencesController.ts
// Controller for user chart preferences API endpoints

import { Request, Response } from 'express';
import { userPreferencesService } from '../services/userPreferences.service';
import { SimpleLogger } from '../services/simpleLogger.service';
import {
  SaveChartPreferenceRequest,
  InvalidColorError
} from '../types/user.types';

// Define the authenticated request interface
interface AuthenticatedRequest extends Request {
  user?: {
    user_id: number;
    tenant_id: number;
    email: string;
  };
}

export class UserPreferencesController {
  /**
   * GET /api/user/preferences/chart/:indexId
   * Get chart preference for a specific index
   */
  getChartPreference = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const startTime = Date.now();

    try {
      const userId = req.user?.user_id;
      const indexId = parseInt(req.params.indexId);

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      if (isNaN(indexId) || indexId <= 0) {
        res.status(400).json({
          success: false,
          error: 'Invalid index ID'
        });
        return;
      }

      SimpleLogger.info(
        'UserPreferencesController',
        'Get chart preference requested',
        'getChartPreference',
        { userId, indexId }
      );

      const preference = await userPreferencesService.getChartPreference(userId, indexId);

      res.json({
        success: true,
        preference: preference,
        message: preference 
          ? 'Preference found' 
          : 'No preference found, using theme default',
        execution_time_ms: Date.now() - startTime
      });

    } catch (error: any) {
      SimpleLogger.error(
        'UserPreferencesController',
        'Failed to get chart preference',
        'getChartPreference',
        { indexId: req.params.indexId, error: error.message },
        undefined,
        undefined,
        error.stack
      );

      res.status(500).json({
        success: false,
        error: error.message || 'Failed to retrieve chart preference'
      });
    }
  };

  /**
   * POST /api/user/preferences/chart/:indexId
   * Save or update chart preference for a specific index
   */
  saveChartPreference = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const startTime = Date.now();

    try {
      const userId = req.user?.user_id;
      const indexId = parseInt(req.params.indexId);
      const body = req.body as SaveChartPreferenceRequest;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      if (isNaN(indexId) || indexId <= 0) {
        res.status(400).json({
          success: false,
          error: 'Invalid index ID'
        });
        return;
      }

      if (!body.line_color) {
        res.status(400).json({
          success: false,
          error: 'line_color is required'
        });
        return;
      }

      SimpleLogger.info(
        'UserPreferencesController',
        'Save chart preference requested',
        'saveChartPreference',
        { userId, indexId, lineColor: body.line_color }
      );

      const preference = await userPreferencesService.saveChartPreference(
        userId,
        indexId,
        body.line_color
      );

      res.json({
        success: true,
        preference: preference,
        message: 'Chart preference saved successfully',
        execution_time_ms: Date.now() - startTime
      });

    } catch (error: any) {
      // Handle validation errors separately
      if (error instanceof InvalidColorError) {
        SimpleLogger.warn(
          'UserPreferencesController',
          'Invalid color format',
          'saveChartPreference',
          { indexId: req.params.indexId, error: error.message }
        );

        res.status(400).json({
          success: false,
          error: error.message
        });
        return;
      }

      SimpleLogger.error(
        'UserPreferencesController',
        'Failed to save chart preference',
        'saveChartPreference',
        { indexId: req.params.indexId, error: error.message },
        undefined,
        undefined,
        error.stack
      );

      res.status(500).json({
        success: false,
        error: error.message || 'Failed to save chart preference'
      });
    }
  };

  /**
   * GET /api/user/preferences/chart
   * Get all chart preferences for the authenticated user
   */
  getAllPreferences = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const startTime = Date.now();

    try {
      const userId = req.user?.user_id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      SimpleLogger.info(
        'UserPreferencesController',
        'Get all preferences requested',
        'getAllPreferences',
        { userId }
      );

      const preferences = await userPreferencesService.getAllUserPreferences(userId);

      res.json({
        success: true,
        preferences: preferences,
        total: preferences.length,
        execution_time_ms: Date.now() - startTime
      });

    } catch (error: any) {
      SimpleLogger.error(
        'UserPreferencesController',
        'Failed to get all preferences',
        'getAllPreferences',
        { error: error.message },
        undefined,
        undefined,
        error.stack
      );

      res.status(500).json({
        success: false,
        error: error.message || 'Failed to retrieve preferences'
      });
    }
  };

  /**
   * DELETE /api/user/preferences/chart/:indexId
   * Delete chart preference for a specific index (revert to theme default)
   */
  deleteChartPreference = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const startTime = Date.now();

    try {
      const userId = req.user?.user_id;
      const indexId = parseInt(req.params.indexId);

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      if (isNaN(indexId) || indexId <= 0) {
        res.status(400).json({
          success: false,
          error: 'Invalid index ID'
        });
        return;
      }

      SimpleLogger.info(
        'UserPreferencesController',
        'Delete chart preference requested',
        'deleteChartPreference',
        { userId, indexId }
      );

      const deleted = await userPreferencesService.deleteChartPreference(userId, indexId);

      res.json({
        success: true,
        message: deleted 
          ? 'Chart preference deleted successfully. Will use theme default.' 
          : 'No preference to delete. Already using theme default.',
        execution_time_ms: Date.now() - startTime
      });

    } catch (error: any) {
      SimpleLogger.error(
        'UserPreferencesController',
        'Failed to delete chart preference',
        'deleteChartPreference',
        { indexId: req.params.indexId, error: error.message },
        undefined,
        undefined,
        error.stack
      );

      res.status(500).json({
        success: false,
        error: error.message || 'Failed to delete chart preference'
      });
    }
  };

  // ==================== DEFAULT COMPARISON INDEX ====================

  /**
   * Get default comparison index for authenticated tenant
   * GET /api/user-preferences/default-comparison-index
   */
  getDefaultComparisonIndex = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const startTime = Date.now();

    try {
      const tenantId = req.user!.tenant_id;

      SimpleLogger.info(
        'UserPreferencesController',
        'Fetching default comparison index',
        'getDefaultComparisonIndex',
        { tenantId }
      );

      const result = await userPreferencesService.getDefaultComparisonIndex(tenantId);

      res.json({
        success: true,
        default_comparison_index_id: result,
        execution_time_ms: Date.now() - startTime
      });

    } catch (error: any) {
      SimpleLogger.error(
        'UserPreferencesController',
        'Failed to get default comparison index',
        'getDefaultComparisonIndex',
        { error: error.message },
        undefined,
        undefined,
        error.stack
      );

      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get default comparison index'
      });
    }
  };

  /**
   * Set default comparison index for authenticated tenant
   * POST /api/user-preferences/default-comparison-index
   * Body: { default_comparison_index_id: number }
   */
  setDefaultComparisonIndex = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const startTime = Date.now();

    try {
      const tenantId = req.user!.tenant_id;
      const { default_comparison_index_id } = req.body;

      // Validation
      if (!default_comparison_index_id || typeof default_comparison_index_id !== 'number') {
        res.status(400).json({
          success: false,
          error: 'Invalid default_comparison_index_id. Must be a number.'
        });
        return;
      }

      SimpleLogger.info(
        'UserPreferencesController',
        'Setting default comparison index',
        'setDefaultComparisonIndex',
        { tenantId, default_comparison_index_id }
      );

      await userPreferencesService.setDefaultComparisonIndex(tenantId, default_comparison_index_id);

      res.json({
        success: true,
        default_comparison_index_id,
        message: 'Default comparison index saved successfully',
        execution_time_ms: Date.now() - startTime
      });

    } catch (error: any) {
      SimpleLogger.error(
        'UserPreferencesController',
        'Failed to set default comparison index',
        'setDefaultComparisonIndex',
        { error: error.message },
        undefined,
        undefined,
        error.stack
      );

      res.status(500).json({
        success: false,
        error: error.message || 'Failed to set default comparison index'
      });
    }
  };
}

// Export singleton instance
export const userPreferencesController = new UserPreferencesController();