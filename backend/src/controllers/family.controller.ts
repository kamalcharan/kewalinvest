// backend/src/controllers/family.controller.ts

import { Request, Response } from 'express';
import { FamilyService } from '../services/family.service';

interface AuthenticatedRequest extends Request {
  user?: {
    user_id: number;
    tenant_id: number;
  };
  environment?: {
    tenant_id: number;
    is_live: boolean;
  };
}

export class FamilyController {
  private familyService: FamilyService;

  constructor() {
    this.familyService = new FamilyService();
  }

  /**
   * Get all family members
   * GET /api/family/:familyHeadIwellCode/members
   */
  getFamilyMembers = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { environment } = req;
      const { familyHeadIwellCode } = req.params;

      if (!familyHeadIwellCode) {
        res.status(400).json({
          success: false,
          error: 'Family head IWELL code is required'
        });
        return;
      }

      const members = await this.familyService.getFamilyMembers(
        environment!.tenant_id,
        environment!.is_live,
        familyHeadIwellCode
      );

      res.json({
        success: true,
        data: members
      });
    } catch (error: any) {
      console.error('Error getting family members:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get family members'
      });
    }
  };

  /**
   * Get family portfolio summary
   * GET /api/family/:familyHeadIwellCode/portfolio
   */
  getFamilyPortfolio = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { environment } = req;
      const { familyHeadIwellCode } = req.params;

      if (!familyHeadIwellCode) {
        res.status(400).json({
          success: false,
          error: 'Family head IWELL code is required'
        });
        return;
      }

      const portfolio = await this.familyService.getFamilyPortfolioSummary(
        environment!.tenant_id,
        environment!.is_live,
        familyHeadIwellCode
      );

      res.json({
        success: true,
        data: portfolio
      });
    } catch (error: any) {
      console.error('Error getting family portfolio:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get family portfolio'
      });
    }
  };

  /**
   * Get family asset allocation
   * GET /api/family/:familyHeadIwellCode/asset-allocation
   */
  getFamilyAssetAllocation = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { environment } = req;
      const { familyHeadIwellCode } = req.params;

      if (!familyHeadIwellCode) {
        res.status(400).json({
          success: false,
          error: 'Family head IWELL code is required'
        });
        return;
      }

      const allocation = await this.familyService.getFamilyAssetAllocation(
        environment!.tenant_id,
        environment!.is_live,
        familyHeadIwellCode
      );

      res.json({
        success: true,
        data: allocation
      });
    } catch (error: any) {
      console.error('Error getting family asset allocation:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get family asset allocation'
      });
    }
  };

  /**
   * Get family goal summary
   * GET /api/family/:familyHeadIwellCode/goals
   */
  getFamilyGoals = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { environment } = req;
      const { familyHeadIwellCode } = req.params;

      if (!familyHeadIwellCode) {
        res.status(400).json({
          success: false,
          error: 'Family head IWELL code is required'
        });
        return;
      }

      const goals = await this.familyService.getFamilyGoalSummary(
        environment!.tenant_id,
        environment!.is_live,
        familyHeadIwellCode
      );

      res.json({
        success: true,
        data: goals
      });
    } catch (error: any) {
      console.error('Error getting family goals:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get family goals'
      });
    }
  };

  /**
   * Get family meeting summary
   * GET /api/family/:familyHeadIwellCode/meetings
   */
  getFamilyMeetings = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { environment } = req;
      const { familyHeadIwellCode } = req.params;

      if (!familyHeadIwellCode) {
        res.status(400).json({
          success: false,
          error: 'Family head IWELL code is required'
        });
        return;
      }

      const meetings = await this.familyService.getFamilyMeetingSummary(
        environment!.tenant_id,
        environment!.is_live,
        familyHeadIwellCode
      );

      res.json({
        success: true,
        data: meetings
      });
    } catch (error: any) {
      console.error('Error getting family meetings:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get family meetings'
      });
    }
  };
}
