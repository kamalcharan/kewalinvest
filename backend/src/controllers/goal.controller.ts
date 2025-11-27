// backend/src/controllers/goal.controller.ts

import { Request, Response } from 'express';
import { GoalService } from '../services/goal.service';
import { CreateGoalRequest, UpdateGoalRequest, validateWithdrawals } from '../types/goal.types';

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

      // Validate withdrawals if present
      if (data.config_data.has_withdrawals && data.config_data.withdrawals) {
        const targetAmount = 'target_amount' in data.config_data ? data.config_data.target_amount : undefined;
        const targetDate = 'target_date' in data.config_data ? data.config_data.target_date : undefined;

        const withdrawalValidation = validateWithdrawals(
          data.config_data.withdrawals,
          targetAmount,
          targetDate
        );

        if (!withdrawalValidation.isValid) {
          res.status(400).json({
            success: false,
            error: 'Withdrawal validation failed',
            validation_errors: withdrawalValidation.errors
          });
          return;
        }
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

  // ==================== GOAL TRACKING STATUS ====================

  /**
   * Get tracking status for a single goal
   * GET /api/goals/:id/tracking-status
   */
  getGoalTrackingStatus = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
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

      const status = await this.goalService.getGoalTrackingStatus(
        user!.tenant_id,
        isLive,
        goalId
      );

      res.json({
        success: true,
        data: status
      });
    } catch (error: any) {
      console.error('Error getting goal tracking status:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get goal tracking status'
      });
    }
  };

  /**
   * Get tracking status for all customer goals
   * GET /api/goals/customer/:customerId/tracking-status
   */
  getCustomerGoalTrackingStatus = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
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

      const statuses = await this.goalService.getCustomerGoalTrackingStatus(
        user!.tenant_id,
        isLive,
        customerId
      );

      res.json({
        success: true,
        data: statuses
      });
    } catch (error: any) {
      console.error('Error getting customer goal tracking status:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get customer goal tracking status'
      });
    }
  };

  // ==================== ASSET ALLOCATION UTILIZATION ====================

  /**
   * Get asset allocation utilization for a customer
   * Shows how investment plans are allocated across goals
   * GET /api/goals/customer/:customerId/allocation-utilization
   */
  getAssetAllocationUtilization = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
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

      const utilization = await this.goalService.getAssetAllocationUtilization(
        user!.tenant_id,
        isLive,
        customerId
      );

      res.json({
        success: true,
        data: utilization
      });
    } catch (error: any) {
      console.error('Error getting asset allocation utilization:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get asset allocation utilization'
      });
    }
  };

  // ==================== WATCHLIST ====================

  /**
   * Add goal to watchlist
   * POST /api/goals/:id/watchlist
   */
  addToWatchlist = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { user, environment } = req;
      const isLive = environment === 'live';
      const goalId = parseInt(req.params.id);
      const { reason } = req.body;

      if (isNaN(goalId)) {
        res.status(400).json({
          success: false,
          error: 'Invalid goal ID'
        });
        return;
      }

      if (!reason) {
        res.status(400).json({
          success: false,
          error: 'Watchlist reason is required'
        });
        return;
      }

      await this.goalService.addToWatchlist(
        user!.tenant_id,
        isLive,
        goalId,
        reason
      );

      res.json({
        success: true,
        message: 'Goal added to watchlist'
      });
    } catch (error: any) {
      console.error('Error adding goal to watchlist:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to add goal to watchlist'
      });
    }
  };

  /**
   * Remove goal from watchlist
   * DELETE /api/goals/:id/watchlist
   */
  removeFromWatchlist = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
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

      await this.goalService.removeFromWatchlist(
        user!.tenant_id,
        isLive,
        goalId
      );

      res.json({
        success: true,
        message: 'Goal removed from watchlist'
      });
    } catch (error: any) {
      console.error('Error removing goal from watchlist:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to remove goal from watchlist'
      });
    }
  };

  /**
   * Get all watchlist goals for a customer
   * GET /api/goals/customer/:customerId/watchlist
   */
  getWatchlistGoals = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
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

      const goals = await this.goalService.getWatchlistGoals(
        user!.tenant_id,
        isLive,
        customerId
      );

      res.json({
        success: true,
        data: goals
      });
    } catch (error: any) {
      console.error('Error getting watchlist goals:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get watchlist goals'
      });
    }
  };
}