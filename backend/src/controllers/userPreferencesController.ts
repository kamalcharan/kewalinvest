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
}

// Export singleton instance
export const userPreferencesController = new UserPreferencesController();