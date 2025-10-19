// backend/src/controllers/goal.controller.ts

import { Request, Response } from 'express';
import { GoalService } from '../services/goal.service';
import { CreateGoalRequest, UpdateGoalRequest } from '../types/goal.types';

interface AuthenticatedRequest extends Request {
  user?: {
    user_id: number;
    tenant_id: number;
  };
  environment?: 'live' | 'test';
}

export class GoalController {
  private goalService: GoalService;

  constructor() {
    this.goalService = new GoalService();
  }

  /**
   * POST /api/goals
   * Create new goal
   */
  createGoal = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { user, environment } = req;
      const isLive = environment === 'live';
      const data = req.body as CreateGoalRequest;

      // Validation
      if (!data.customer_id) {
        res.status(400).json({
          success: false,
          error: 'customer_id is required'
        });
        return;
      }

      if (!data.goal_type) {
        res.status(400).json({
          success: false,
          error: 'goal_type is required'
        });
        return;
      }

      if (!['time_based_goal', 'price_based_goal', 'time_and_price_goal'].includes(data.goal_type)) {
        res.status(400).json({
          success: false,
          error: 'Invalid goal_type'
        });
        return;
      }

      if (!data.config_data) {
        res.status(400).json({
          success: false,
          error: 'config_data is required'
        });
        return;
      }

      const goal = await this.goalService.createGoal(
        user!.tenant_id,
        isLive,
        data,
        user!.user_id
      );

      res.status(201).json({
        success: true,
        data: goal,
        message: 'Goal created successfully'
      });
    } catch (error: any) {
      console.error('Error creating goal:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to create goal'
      });
    }
  };

  /**
   * GET /api/goals/customer/:customerId
   * Get all goals for a customer
   */
  getCustomerGoals = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { user, environment } = req;
      const isLive = environment === 'live';
      const customerId = parseInt(req.params.customerId);

      if (isNaN(customerId)) {
        res.status(400).json({
          success: false,
          error: 'Invalid customer ID'
        });
        return;
      }

      const goals = await this.goalService.getCustomerGoals(
        user!.tenant_id,
        isLive,
        customerId
      );

      res.json({
        success: true,
        data: goals
      });
    } catch (error: any) {
      console.error('Error getting customer goals:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get customer goals'
      });
    }
  };

  /**
   * GET /api/goals/:id
   * Get single goal by ID
   */
  getGoal = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { user, environment } = req;
      const isLive = environment === 'live';
      const goalId = parseInt(req.params.id);

      if (isNaN(goalId)) {
        res.status(400).json({
          success: false,
          error: 'Invalid goal ID'
        });
        return;
      }

      const goal = await this.goalService.getGoal(
        user!.tenant_id,
        isLive,
        goalId
      );

      if (!goal) {
        res.status(404).json({
          success: false,
          error: 'Goal not found'
        });
        return;
      }

      res.json({
        success: true,
        data: goal
      });
    } catch (error: any) {
      console.error('Error getting goal:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get goal'
      });
    }
  };

  /**
   * PUT /api/goals/:id
   * Update goal
   */
  updateGoal = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { user, environment } = req;
      const isLive = environment === 'live';
      const goalId = parseInt(req.params.id);
      const data = req.body as UpdateGoalRequest;

      if (isNaN(goalId)) {
        res.status(400).json({
          success: false,
          error: 'Invalid goal ID'
        });
        return;
      }

      const goal = await this.goalService.updateGoal(
        user!.tenant_id,
        isLive,
        goalId,
        data
      );

      if (!goal) {
        res.status(404).json({
          success: false,
          error: 'Goal not found'
        });
        return;
      }

      res.json({
        success: true,
        data: goal,
        message: 'Goal updated successfully'
      });
    } catch (error: any) {
      console.error('Error updating goal:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to update goal'
      });
    }
  };

  /**
   * DELETE /api/goals/:id
   * Delete goal
   */
  deleteGoal = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { user, environment } = req;
      const isLive = environment === 'live';
      const goalId = parseInt(req.params.id);

      if (isNaN(goalId)) {
        res.status(400).json({
          success: false,
          error: 'Invalid goal ID'
        });
        return;
      }

      const success = await this.goalService.deleteGoal(
        user!.tenant_id,
        isLive,
        goalId
      );

      if (!success) {
        res.status(404).json({
          success: false,
          error: 'Goal not found'
        });
        return;
      }

      res.json({
        success: true,
        message: 'Goal deleted successfully'
      });
    } catch (error: any) {
      console.error('Error deleting goal:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to delete goal'
      });
    }
  };

  /**
   * POST /api/goals/:id/recalculate
   * Recalculate single goal
   */
  recalculateGoal = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { user, environment } = req;
      const isLive = environment === 'live';
      const goalId = parseInt(req.params.id);

      if (isNaN(goalId)) {
        res.status(400).json({
          success: false,
          error: 'Invalid goal ID'
        });
        return;
      }

      const result = await this.goalService.recalculateGoal(
        user!.tenant_id,
        isLive,
        goalId,
        'manual'
      );

      res.json({
        success: true,
        data: result,
        message: 'Goal recalculated successfully'
      });
    } catch (error: any) {
      console.error('Error recalculating goal:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to recalculate goal'
      });
    }
  };

  /**
   * POST /api/goals/customer/:customerId/recalculate
   * Recalculate all goals for customer
   */
  recalculateCustomerGoals = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { user, environment } = req;
      const isLive = environment === 'live';
      const customerId = parseInt(req.params.customerId);

      if (isNaN(customerId)) {
        res.status(400).json({
          success: false,
          error: 'Invalid customer ID'
        });
        return;
      }

      const results = await this.goalService.recalculateCustomerGoals(
        user!.tenant_id,
        isLive,
        customerId
      );

      res.json({
        success: true,
        data: results,
        message: `Recalculated ${results.length} goals`
      });
    } catch (error: any) {
      console.error('Error recalculating customer goals:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to recalculate customer goals'
      });
    }
  };

  /**
   * GET /api/goals/customer/:customerId/summary
   * Get goal summary for customer
   */
  getCustomerGoalSummary = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { user, environment } = req;
      const isLive = environment === 'live';
      const customerId = parseInt(req.params.customerId);

      if (isNaN(customerId)) {
        res.status(400).json({
          success: false,
          error: 'Invalid customer ID'
        });
        return;
      }

      const summary = await this.goalService.getCustomerGoalSummary(
        user!.tenant_id,
        isLive,
        customerId
      );

      res.json({
        success: true,
        data: summary
      });
    } catch (error: any) {
      console.error('Error getting customer goal summary:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get customer goal summary'
      });
    }
  };

  /**
   * GET /api/goals/:id/history
   * Get goal progress history
   */
  getGoalHistory = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { user, environment } = req;
      const isLive = environment === 'live';
      const goalId = parseInt(req.params.id);
      const limit = parseInt(req.query.limit as string) || 12;

      if (isNaN(goalId)) {
        res.status(400).json({
          success: false,
          error: 'Invalid goal ID'
        });
        return;
      }

      const history = await this.goalService.getGoalProgressHistory(
        user!.tenant_id,
        isLive,
        goalId,
        limit
      );

      res.json({
        success: true,
        data: history
      });
    } catch (error: any) {
      console.error('Error getting goal history:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get goal history'
      });
    }
  };
}