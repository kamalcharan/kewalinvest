// backend/src/controllers/networth.controller.ts
// Controller for NetworthViewer API endpoints - Cycle 2
// Provides endpoints for networth summary, history, breakdown, and goals

import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { NetworthService } from '../services/networth.service';
import {
  NetworthSummaryRequest,
  NetworthHistoryRequest,
  NetworthBreakdownRequest,
  NetworthGoalsRequest,
  NetworthApiResponse,
  NetworthSummaryResponse,
  NetworthHistoryResponse,
  NetworthBreakdownResponse,
  NetworthGoalsResponse
} from '../types/networth.types';

export class NetworthController {
  private networthService: NetworthService;

  constructor() {
    this.networthService = new NetworthService();
  }

  // ==================== SUMMARY ENDPOINT ====================

  /**
   * GET /api/networth/summary
   * Get total networth across all assets with breakdown
   *
   * Query params:
   * - customer_id: number (optional if family_head_iwellcode provided)
   * - family_head_iwellcode: string (optional if customer_id provided)
   * - as_of_date: string (optional, ISO date)
   */
  getSummary = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const tenantId = req.user?.tenant_id;
      const isLive = req.headers['x-environment'] === 'live';

      if (!tenantId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        } as NetworthApiResponse<null>);
        return;
      }

      // Parse query parameters
      const customerId = req.query.customer_id
        ? parseInt(req.query.customer_id as string)
        : undefined;
      const familyHeadIwellcode = req.query.family_head_iwellcode as string | undefined;
      const asOfDateStr = req.query.as_of_date as string | undefined;

      // Validate: need either customer_id or family_head_iwellcode
      if (!customerId && !familyHeadIwellcode) {
        res.status(400).json({
          success: false,
          error: 'Either customer_id or family_head_iwellcode is required'
        } as NetworthApiResponse<null>);
        return;
      }

      const request: NetworthSummaryRequest = {
        customer_id: customerId,
        family_head_iwellcode: familyHeadIwellcode,
        as_of_date: asOfDateStr ? new Date(asOfDateStr) : undefined
      };

      console.log(`[NetworthController] getSummary - tenant: ${tenantId}, isLive: ${isLive}, customer: ${customerId || familyHeadIwellcode}`);

      const result = await this.networthService.getNetworthSummary(
        tenantId,
        isLive,
        request
      );

      res.status(200).json({
        success: true,
        data: result,
        message: 'Networth summary retrieved successfully'
      } as NetworthApiResponse<NetworthSummaryResponse>);

    } catch (error: any) {
      console.error('[NetworthController] Error getting summary:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get networth summary'
      } as NetworthApiResponse<null>);
    }
  };

  // ==================== HISTORY ENDPOINT ====================

  /**
   * GET /api/networth/history
   * Get historical timeline aggregated by month
   *
   * Query params:
   * - customer_id: number (optional if family_head_iwellcode provided)
   * - family_head_iwellcode: string (optional if customer_id provided)
   * - start_date: string (optional, ISO date)
   * - end_date: string (optional, ISO date)
   * - granularity: 'monthly' | 'quarterly' | 'yearly' (optional, default: monthly)
   */
  getHistory = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const tenantId = req.user?.tenant_id;
      const isLive = req.headers['x-environment'] === 'live';

      if (!tenantId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        } as NetworthApiResponse<null>);
        return;
      }

      // Parse query parameters
      const customerId = req.query.customer_id
        ? parseInt(req.query.customer_id as string)
        : undefined;
      const familyHeadIwellcode = req.query.family_head_iwellcode as string | undefined;
      const startDateStr = req.query.start_date as string | undefined;
      const endDateStr = req.query.end_date as string | undefined;
      const granularity = req.query.granularity as 'monthly' | 'quarterly' | 'yearly' | undefined;

      // Validate
      if (!customerId && !familyHeadIwellcode) {
        res.status(400).json({
          success: false,
          error: 'Either customer_id or family_head_iwellcode is required'
        } as NetworthApiResponse<null>);
        return;
      }

      const request: NetworthHistoryRequest = {
        customer_id: customerId,
        family_head_iwellcode: familyHeadIwellcode,
        start_date: startDateStr ? new Date(startDateStr) : undefined,
        end_date: endDateStr ? new Date(endDateStr) : undefined,
        granularity: granularity || 'monthly'
      };

      console.log(`[NetworthController] getHistory - tenant: ${tenantId}, isLive: ${isLive}, customer: ${customerId || familyHeadIwellcode}`);

      const result = await this.networthService.getNetworthHistory(
        tenantId,
        isLive,
        request
      );

      res.status(200).json({
        success: true,
        data: result,
        message: `Retrieved ${result.data_points} data points`
      } as NetworthApiResponse<NetworthHistoryResponse>);

    } catch (error: any) {
      console.error('[NetworthController] Error getting history:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get networth history'
      } as NetworthApiResponse<null>);
    }
  };

  // ==================== BREAKDOWN ENDPOINT ====================

  /**
   * GET /api/networth/breakdown
   * Get per-asset-type details with individual investment plans
   *
   * Query params:
   * - customer_id: number (optional if family_head_iwellcode provided)
   * - family_head_iwellcode: string (optional if customer_id provided)
   * - as_of_date: string (optional, ISO date)
   * - asset_type_codes: string (optional, comma-separated)
   */
  getBreakdown = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const tenantId = req.user?.tenant_id;
      const isLive = req.headers['x-environment'] === 'live';

      if (!tenantId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        } as NetworthApiResponse<null>);
        return;
      }

      // Parse query parameters
      const customerId = req.query.customer_id
        ? parseInt(req.query.customer_id as string)
        : undefined;
      const familyHeadIwellcode = req.query.family_head_iwellcode as string | undefined;
      const asOfDateStr = req.query.as_of_date as string | undefined;
      const assetTypeCodesStr = req.query.asset_type_codes as string | undefined;

      // Validate
      if (!customerId && !familyHeadIwellcode) {
        res.status(400).json({
          success: false,
          error: 'Either customer_id or family_head_iwellcode is required'
        } as NetworthApiResponse<null>);
        return;
      }

      // Parse asset type codes (comma-separated)
      const assetTypeCodes = assetTypeCodesStr
        ? assetTypeCodesStr.split(',').map(s => s.trim().toUpperCase())
        : undefined;

      const request: NetworthBreakdownRequest = {
        customer_id: customerId,
        family_head_iwellcode: familyHeadIwellcode,
        as_of_date: asOfDateStr ? new Date(asOfDateStr) : undefined,
        asset_type_codes: assetTypeCodes
      };

      console.log(`[NetworthController] getBreakdown - tenant: ${tenantId}, isLive: ${isLive}, customer: ${customerId || familyHeadIwellcode}`);

      const result = await this.networthService.getNetworthBreakdown(
        tenantId,
        isLive,
        request
      );

      res.status(200).json({
        success: true,
        data: result,
        message: `Retrieved breakdown for ${result.total_asset_types} asset types`
      } as NetworthApiResponse<NetworthBreakdownResponse>);

    } catch (error: any) {
      console.error('[NetworthController] Error getting breakdown:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get networth breakdown'
      } as NetworthApiResponse<null>);
    }
  };

  // ==================== GOALS ENDPOINT ====================

  /**
   * GET /api/networth/goals
   * Get goal achievability data
   *
   * Query params:
   * - customer_id: number (optional if family_head_iwellcode provided)
   * - family_head_iwellcode: string (optional if customer_id provided)
   * - projection_years: number (optional, default: 10)
   */
  getGoals = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const tenantId = req.user?.tenant_id;
      const isLive = req.headers['x-environment'] === 'live';

      if (!tenantId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        } as NetworthApiResponse<null>);
        return;
      }

      // Parse query parameters
      const customerId = req.query.customer_id
        ? parseInt(req.query.customer_id as string)
        : undefined;
      const familyHeadIwellcode = req.query.family_head_iwellcode as string | undefined;
      const projectionYears = req.query.projection_years
        ? parseInt(req.query.projection_years as string)
        : undefined;

      // Validate
      if (!customerId && !familyHeadIwellcode) {
        res.status(400).json({
          success: false,
          error: 'Either customer_id or family_head_iwellcode is required'
        } as NetworthApiResponse<null>);
        return;
      }

      const request: NetworthGoalsRequest = {
        customer_id: customerId,
        family_head_iwellcode: familyHeadIwellcode,
        projection_years: projectionYears
      };

      console.log(`[NetworthController] getGoals - tenant: ${tenantId}, isLive: ${isLive}, customer: ${customerId || familyHeadIwellcode}`);

      const result = await this.networthService.getNetworthGoals(
        tenantId,
        isLive,
        request
      );

      res.status(200).json({
        success: true,
        data: result,
        message: `Retrieved achievability for ${result.total_goals} goals`
      } as NetworthApiResponse<NetworthGoalsResponse>);

    } catch (error: any) {
      console.error('[NetworthController] Error getting goals:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get networth goals'
      } as NetworthApiResponse<null>);
    }
  };

  // ==================== HEALTH CHECK ====================

  /**
   * GET /api/networth/health
   * Health check endpoint
   */
  healthCheck = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      res.status(200).json({
        success: true,
        data: {
          status: 'healthy',
          service: 'NetworthViewer',
          version: '1.0.0',
          timestamp: new Date().toISOString(),
          endpoints: [
            'GET /api/networth/summary',
            'GET /api/networth/history',
            'GET /api/networth/breakdown',
            'GET /api/networth/goals'
          ]
        },
        message: 'NetworthViewer service is healthy'
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: 'Health check failed'
      });
    }
  };
}
