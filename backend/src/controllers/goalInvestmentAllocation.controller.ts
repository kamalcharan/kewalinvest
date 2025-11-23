// backend/src/controllers/goalInvestmentAllocation.controller.ts
// Phase 2: Controller for goal-investment allocation endpoints

import { Request, Response } from 'express';
import { GoalInvestmentAllocationService } from '../services/goalInvestmentAllocation.service';
import { GoalCalculationPhase2Service } from '../services/goalCalculationPhase2.service';

interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    tenant_id: number;
    environment_preference: string;
  };
}

export class GoalInvestmentAllocationController {
  private allocationService: GoalInvestmentAllocationService;
  private calculationService: GoalCalculationPhase2Service;

  constructor() {
    this.allocationService = new GoalInvestmentAllocationService();
    this.calculationService = new GoalCalculationPhase2Service();
  }

  /**
   * POST /api/goals/:goalId/allocations
   * Allocate an investment plan to a goal
   */
  allocateInvestment = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { goalId } = req.params;
      const { investment_plan_id, allocated_percentage, allocated_amount, notes } = req.body;

      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized'
        });
        return;
      }

      const tenantId = req.user.tenant_id;
      const isLive = req.user.environment_preference === 'live';
      const createdBy = req.user.id;

      // Validate inputs
      if (!investment_plan_id) {
        res.status(400).json({
          success: false,
          message: 'investment_plan_id is required'
        });
        return;
      }

      if (allocated_percentage && (allocated_percentage < 0 || allocated_percentage > 100)) {
        res.status(400).json({
          success: false,
          message: 'allocated_percentage must be between 0 and 100'
        });
        return;
      }

      // Check if allocation would exceed 100%
      if (allocated_percentage) {
        const validation = await this.allocationService.validateAllocation(
          tenantId,
          isLive,
          investment_plan_id,
          allocated_percentage
        );

        if (!validation.is_valid) {
          res.status(400).json({
            success: false,
            message: `Allocation would exceed 100%. Current total: ${validation.current_total}%, New total would be: ${validation.new_total}%`
          });
          return;
        }
      }

      const allocation = await this.allocationService.allocateInvestmentToGoal(
        tenantId,
        isLive,
        {
          goal_id: parseInt(goalId),
          investment_plan_id,
          allocated_percentage,
          allocated_amount,
          notes
        },
        createdBy
      );

      res.status(201).json({
        success: true,
        message: 'Investment allocated to goal successfully',
        data: allocation
      });
    } catch (error: any) {
      console.error('[GoalAllocation] Error allocating investment:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to allocate investment to goal'
      });
    }
  };

  /**
   * GET /api/goals/:goalId/allocations
   * Get all allocations for a goal
   */
  getGoalAllocations = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { goalId } = req.params;

      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized'
        });
        return;
      }

      const tenantId = req.user.tenant_id;
      const isLive = req.user.environment_preference === 'live';

      const allocations = await this.allocationService.getAllocationsForGoal(
        tenantId,
        isLive,
        parseInt(goalId)
      );

      res.status(200).json({
        success: true,
        data: allocations
      });
    } catch (error: any) {
      console.error('[GoalAllocation] Error getting allocations:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get goal allocations'
      });
    }
  };

  /**
   * PUT /api/goals/:goalId/allocations/:allocationId
   * Update an allocation
   */
  updateAllocation = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { allocationId } = req.params;
      const { allocated_percentage, allocated_amount, notes } = req.body;

      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized'
        });
        return;
      }

      const tenantId = req.user.tenant_id;
      const isLive = req.user.environment_preference === 'live';

      // Validate percentage if provided
      if (allocated_percentage !== undefined) {
        if (allocated_percentage < 0 || allocated_percentage > 100) {
          res.status(400).json({
            success: false,
            message: 'allocated_percentage must be between 0 and 100'
          });
          return;
        }

        // Get existing allocation
        const existing = await this.allocationService.getAllocationById(parseInt(allocationId));
        if (!existing) {
          res.status(404).json({
            success: false,
            message: 'Allocation not found'
          });
          return;
        }

        // Validate new total
        const validation = await this.allocationService.validateAllocation(
          tenantId,
          isLive,
          existing.investment_plan_id,
          allocated_percentage,
          parseInt(allocationId) // Exclude this allocation from total
        );

        if (!validation.is_valid) {
          res.status(400).json({
            success: false,
            message: `Update would exceed 100%. Current total: ${validation.current_total}%, New total would be: ${validation.new_total}%`
          });
          return;
        }
      }

      const updatedAllocation = await this.allocationService.updateAllocation(
        parseInt(allocationId),
        {
          allocated_percentage,
          allocated_amount,
          notes
        }
      );

      res.status(200).json({
        success: true,
        message: 'Allocation updated successfully',
        data: updatedAllocation
      });
    } catch (error: any) {
      console.error('[GoalAllocation] Error updating allocation:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to update allocation'
      });
    }
  };

  /**
   * DELETE /api/goals/:goalId/allocations/:allocationId
   * Remove an allocation
   */
  removeAllocation = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { allocationId } = req.params;

      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized'
        });
        return;
      }

      await this.allocationService.removeAllocation(parseInt(allocationId));

      res.status(200).json({
        success: true,
        message: 'Allocation removed successfully'
      });
    } catch (error: any) {
      console.error('[GoalAllocation] Error removing allocation:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to remove allocation'
      });
    }
  };

  /**
   * GET /api/goals/:goalId/calculations
   * Get goal calculations (progress, projections, etc.)
   */
  getGoalCalculations = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { goalId } = req.params;

      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized'
        });
        return;
      }

      const tenantId = req.user.tenant_id;
      const isLive = req.user.environment_preference === 'live';

      const calculations = await this.calculationService.calculateGoalProgress(
        tenantId,
        isLive,
        parseInt(goalId)
      );

      res.status(200).json({
        success: true,
        data: calculations
      });
    } catch (error: any) {
      console.error('[GoalAllocation] Error calculating goal:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to calculate goal progress'
      });
    }
  };

  /**
   * GET /api/goals/:goalId/asset-breakdown
   * Get asset allocation breakdown for a goal
   */
  getAssetBreakdown = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { goalId } = req.params;

      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized'
        });
        return;
      }

      const tenantId = req.user.tenant_id;
      const isLive = req.user.environment_preference === 'live';

      const breakdown = await this.calculationService.getAssetBreakdown(
        tenantId,
        isLive,
        parseInt(goalId)
      );

      res.status(200).json({
        success: true,
        data: breakdown
      });
    } catch (error: any) {
      console.error('[GoalAllocation] Error getting asset breakdown:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get asset breakdown'
      });
    }
  };

  /**
   * GET /api/investments/:investmentPlanId/goals
   * Get all goals an investment plan is allocated to
   */
  getInvestmentGoals = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { investmentPlanId } = req.params;

      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized'
        });
        return;
      }

      const tenantId = req.user.tenant_id;
      const isLive = req.user.environment_preference === 'live';

      const goals = await this.allocationService.getGoalsForInvestmentPlan(
        tenantId,
        isLive,
        parseInt(investmentPlanId)
      );

      res.status(200).json({
        success: true,
        data: goals
      });
    } catch (error: any) {
      console.error('[GoalAllocation] Error getting investment goals:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get goals for investment'
      });
    }
  };
}
