// backend/src/controllers/investmentPlan.controller.ts
// Controller for Investment Plan management (Release 1.1 - Phase 1)

import { Request, Response } from 'express';
import { InvestmentPlanService } from '../services/investmentPlan.service';
import { CreateInvestmentPlanRequest, UpdateInvestmentPlanRequest } from '../types/investmentPlan.types';

interface AuthenticatedRequest extends Request {
  user?: {
    user_id: number;
    tenant_id: number;
  };
  environment?: 'live' | 'test';
}

export class InvestmentPlanController {
  private investmentPlanService: InvestmentPlanService;

  constructor() {
    this.investmentPlanService = new InvestmentPlanService();
  }

  /**
   * POST /api/customers/:customerId/investments
   * Create new investment plan
   */
  createInvestmentPlan = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { user, environment } = req;
      const isLive = environment === 'live';
      const customerId = parseInt(req.params.customerId);

      const data: CreateInvestmentPlanRequest = {
        ...req.body,
        customer_id: customerId
      };

      const result = await this.investmentPlanService.createInvestmentPlan(
        data,
        user!.tenant_id,
        isLive,
        user!.user_id
      );

      res.status(201).json({
        success: true,
        data: result,
        message: 'Investment plan created successfully'
      });
    } catch (error: any) {
      console.error('Error creating investment plan:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to create investment plan'
      });
    }
  };

  /**
   * GET /api/customers/:customerId/investments
   * Get all investment plans for a customer
   */
  getCustomerInvestmentPlans = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { user, environment } = req;
      const isLive = environment === 'live';
      const customerId = parseInt(req.params.customerId);

      const plans = await this.investmentPlanService.getCustomerInvestmentPlans(
        customerId,
        user!.tenant_id,
        isLive
      );

      res.status(200).json({
        success: true,
        data: {
          investments: plans,
          total: plans.length
        }
      });
    } catch (error: any) {
      console.error('Error getting investment plans:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get investment plans'
      });
    }
  };

  /**
   * GET /api/customers/:customerId/investments/:id
   * Get single investment plan by ID
   */
  getInvestmentPlanById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { user, environment } = req;
      const isLive = environment === 'live';
      const id = parseInt(req.params.id);

      const plan = await this.investmentPlanService.getInvestmentPlanById(
        id,
        user!.tenant_id,
        isLive
      );

      if (!plan) {
        res.status(404).json({
          success: false,
          error: 'Investment plan not found'
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: plan
      });
    } catch (error: any) {
      console.error('Error getting investment plan:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get investment plan'
      });
    }
  };

  /**
   * PUT /api/customers/:customerId/investments/:id
   * Update investment plan
   */
  updateInvestmentPlan = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { user, environment } = req;
      const isLive = environment === 'live';
      const id = parseInt(req.params.id);

      const data: UpdateInvestmentPlanRequest = req.body;

      const result = await this.investmentPlanService.updateInvestmentPlan(
        id,
        data,
        user!.tenant_id,
        isLive
      );

      res.status(200).json({
        success: true,
        data: result,
        message: 'Investment plan updated successfully'
      });
    } catch (error: any) {
      console.error('Error updating investment plan:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to update investment plan'
      });
    }
  };

  /**
   * DELETE /api/customers/:customerId/investments/:id
   * Delete investment plan (soft delete)
   */
  deleteInvestmentPlan = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { user, environment } = req;
      const isLive = environment === 'live';
      const id = parseInt(req.params.id);

      await this.investmentPlanService.deleteInvestmentPlan(
        id,
        user!.tenant_id,
        isLive
      );

      res.status(200).json({
        success: true,
        message: 'Investment plan deleted successfully'
      });
    } catch (error: any) {
      console.error('Error deleting investment plan:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to delete investment plan'
      });
    }
  };

  /**
   * PATCH /api/customers/:customerId/investments/:id/toggle-alerts
   * Toggle alerts enabled/disabled for an investment plan
   */
  toggleAlerts = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { user, environment } = req;
      const isLive = environment === 'live';
      const id = parseInt(req.params.id);

      const result = await this.investmentPlanService.toggleAlerts(
        id,
        user!.tenant_id,
        isLive
      );

      res.status(200).json({
        success: true,
        data: result,
        message: `Alerts ${result.alerts_enabled ? 'enabled' : 'disabled'} for investment plan`
      });
    } catch (error: any) {
      console.error('Error toggling alerts:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to toggle alerts'
      });
    }
  };

  /**
   * GET /api/family/:familyHeadId/investments
   * Get family investment summary
   */
  getFamilyInvestments = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { user, environment } = req;
      const isLive = environment === 'live';
      const familyHeadId = req.params.familyHeadId; // iwell_code

      const summary = await this.investmentPlanService.getFamilyInvestmentSummary(
        familyHeadId,
        user!.tenant_id,
        isLive
      );

      res.status(200).json({
        success: true,
        data: summary
      });
    } catch (error: any) {
      console.error('Error getting family investments:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get family investments'
      });
    }
  };

  /**
   * POST /api/family/:familyHeadId/investments/bulk
   * Bulk assign investment plans to all family members
   */
  bulkAssignToFamily = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { user, environment } = req;
      const isLive = environment === 'live';
      const familyHeadId = req.params.familyHeadId; // iwell_code

      const data: CreateInvestmentPlanRequest = req.body;

      const results = await this.investmentPlanService.bulkAssignToFamily(
        familyHeadId,
        data,
        user!.tenant_id,
        isLive,
        user!.user_id
      );

      res.status(201).json({
        success: true,
        data: {
          investments: results,
          total: results.length
        },
        message: `Investment plans created for ${results.length} family members`
      });
    } catch (error: any) {
      console.error('Error bulk assigning to family:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to bulk assign investment plans'
      });
    }
  };
}

// Export singleton instance
export const investmentPlanController = new InvestmentPlanController();
