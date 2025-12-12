// backend/src/controllers/alias.controller.ts

import { Request, Response } from 'express';
import { AliasService } from '../services/alias.service';
import type { CreateAliasRequest, UpdateAliasRequest } from '../types/alias.types';

interface AuthenticatedRequest extends Request {
  user?: {
    user_id: number;
    tenant_id: number;
  };
  environment?: 'live' | 'test';
}

export class AliasController {
  private aliasService: AliasService;

  constructor() {
    this.aliasService = new AliasService();
  }

  /**
   * Get all aliases
   * GET /api/aliases
   */
  getAliases = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { user } = req;
      const tenantId = user!.tenant_id;

      const { page, page_size, search } = req.query;

      const result = await this.aliasService.getAliases(tenantId, {
        page: page ? parseInt(page as string) : 1,
        page_size: page_size ? parseInt(page_size as string) : 20,
        search: search as string
      });

      res.json({
        success: true,
        data: result.aliases,
        pagination: {
          page: page ? parseInt(page as string) : 1,
          page_size: page_size ? parseInt(page_size as string) : 20,
          total: result.total,
          total_pages: Math.ceil(result.total / (page_size ? parseInt(page_size as string) : 20))
        }
      });
    } catch (error: any) {
      console.error('Error getting aliases:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get aliases'
      });
    }
  };

  /**
   * Get a single alias by ID
   * GET /api/aliases/:id
   */
  getAlias = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { user } = req;
      const tenantId = user!.tenant_id;
      const aliasId = parseInt(req.params.id);

      if (isNaN(aliasId)) {
        res.status(400).json({
          success: false,
          error: 'Invalid alias ID'
        });
        return;
      }

      const alias = await this.aliasService.getAlias(tenantId, aliasId);

      if (!alias) {
        res.status(404).json({
          success: false,
          error: 'Alias not found'
        });
        return;
      }

      res.json({
        success: true,
        data: alias
      });
    } catch (error: any) {
      console.error('Error getting alias:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get alias'
      });
    }
  };

  /**
   * Get alias members
   * GET /api/aliases/:id/members
   */
  getAliasMembers = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { user } = req;
      const tenantId = user!.tenant_id;
      const aliasId = parseInt(req.params.id);

      if (isNaN(aliasId)) {
        res.status(400).json({
          success: false,
          error: 'Invalid alias ID'
        });
        return;
      }

      const members = await this.aliasService.getAliasMembers(tenantId, aliasId);

      res.json({
        success: true,
        data: members
      });
    } catch (error: any) {
      console.error('Error getting alias members:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get alias members'
      });
    }
  };

  /**
   * Create a new alias
   * POST /api/aliases
   */
  createAlias = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { user } = req;
      const tenantId = user!.tenant_id;
      const userId = user!.user_id;

      const { alias_name, description, customer_ids, primary_customer_id } = req.body as CreateAliasRequest;

      if (!alias_name || !customer_ids || customer_ids.length < 2) {
        res.status(400).json({
          success: false,
          error: 'Alias name and at least 2 customer IDs are required'
        });
        return;
      }

      if (!primary_customer_id || !customer_ids.includes(primary_customer_id)) {
        res.status(400).json({
          success: false,
          error: 'Primary customer ID must be one of the selected customers'
        });
        return;
      }

      const alias = await this.aliasService.createAlias(tenantId, userId, {
        alias_name,
        description,
        customer_ids,
        primary_customer_id
      });

      res.status(201).json({
        success: true,
        data: alias
      });
    } catch (error: any) {
      console.error('Error creating alias:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to create alias'
      });
    }
  };

  /**
   * Update an alias
   * PUT /api/aliases/:id
   */
  updateAlias = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { user } = req;
      const tenantId = user!.tenant_id;
      const aliasId = parseInt(req.params.id);

      if (isNaN(aliasId)) {
        res.status(400).json({
          success: false,
          error: 'Invalid alias ID'
        });
        return;
      }

      const { alias_name, description, primary_customer_id } = req.body as UpdateAliasRequest;

      const alias = await this.aliasService.updateAlias(tenantId, aliasId, {
        alias_name,
        description,
        primary_customer_id
      });

      if (!alias) {
        res.status(404).json({
          success: false,
          error: 'Alias not found'
        });
        return;
      }

      res.json({
        success: true,
        data: alias
      });
    } catch (error: any) {
      console.error('Error updating alias:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to update alias'
      });
    }
  };

  /**
   * Add members to an alias
   * POST /api/aliases/:id/members
   */
  addMembers = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { user } = req;
      const tenantId = user!.tenant_id;
      const userId = user!.user_id;
      const aliasId = parseInt(req.params.id);

      if (isNaN(aliasId)) {
        res.status(400).json({
          success: false,
          error: 'Invalid alias ID'
        });
        return;
      }

      const { customer_ids } = req.body;

      if (!customer_ids || !Array.isArray(customer_ids) || customer_ids.length === 0) {
        res.status(400).json({
          success: false,
          error: 'At least one customer ID is required'
        });
        return;
      }

      await this.aliasService.addMembers(tenantId, aliasId, userId, customer_ids);

      res.json({
        success: true,
        message: 'Members added successfully'
      });
    } catch (error: any) {
      console.error('Error adding members:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to add members'
      });
    }
  };

  /**
   * Remove members from an alias
   * DELETE /api/aliases/:id/members
   */
  removeMembers = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { user } = req;
      const tenantId = user!.tenant_id;
      const aliasId = parseInt(req.params.id);

      if (isNaN(aliasId)) {
        res.status(400).json({
          success: false,
          error: 'Invalid alias ID'
        });
        return;
      }

      const { customer_ids } = req.body;

      if (!customer_ids || !Array.isArray(customer_ids) || customer_ids.length === 0) {
        res.status(400).json({
          success: false,
          error: 'At least one customer ID is required'
        });
        return;
      }

      await this.aliasService.removeMembers(tenantId, aliasId, customer_ids);

      res.json({
        success: true,
        message: 'Members removed successfully'
      });
    } catch (error: any) {
      console.error('Error removing members:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to remove members'
      });
    }
  };

  /**
   * Delete an alias
   * DELETE /api/aliases/:id
   */
  deleteAlias = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { user } = req;
      const tenantId = user!.tenant_id;
      const aliasId = parseInt(req.params.id);

      if (isNaN(aliasId)) {
        res.status(400).json({
          success: false,
          error: 'Invalid alias ID'
        });
        return;
      }

      await this.aliasService.deleteAlias(tenantId, aliasId);

      res.json({
        success: true,
        message: 'Alias deleted successfully'
      });
    } catch (error: any) {
      console.error('Error deleting alias:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to delete alias'
      });
    }
  };

  /**
   * Get alias portfolio summary
   * GET /api/aliases/:id/portfolio
   */
  getAliasPortfolio = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { user, environment } = req;
      const isLive = environment === 'live';
      const tenantId = user!.tenant_id;
      const aliasId = parseInt(req.params.id);

      if (isNaN(aliasId)) {
        res.status(400).json({
          success: false,
          error: 'Invalid alias ID'
        });
        return;
      }

      const portfolio = await this.aliasService.getAliasPortfolioSummary(tenantId, isLive, aliasId);

      res.json({
        success: true,
        data: portfolio
      });
    } catch (error: any) {
      console.error('Error getting alias portfolio:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get alias portfolio'
      });
    }
  };

  /**
   * Get alias asset allocation
   * GET /api/aliases/:id/asset-allocation
   */
  getAliasAssetAllocation = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { user, environment } = req;
      const isLive = environment === 'live';
      const tenantId = user!.tenant_id;
      const aliasId = parseInt(req.params.id);

      if (isNaN(aliasId)) {
        res.status(400).json({
          success: false,
          error: 'Invalid alias ID'
        });
        return;
      }

      const allocation = await this.aliasService.getAliasAssetAllocation(tenantId, isLive, aliasId);

      res.json({
        success: true,
        data: allocation
      });
    } catch (error: any) {
      console.error('Error getting alias asset allocation:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get alias asset allocation'
      });
    }
  };

  /**
   * Get alias goal summary
   * GET /api/aliases/:id/goals
   */
  getAliasGoals = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { user, environment } = req;
      const isLive = environment === 'live';
      const tenantId = user!.tenant_id;
      const aliasId = parseInt(req.params.id);

      if (isNaN(aliasId)) {
        res.status(400).json({
          success: false,
          error: 'Invalid alias ID'
        });
        return;
      }

      const goals = await this.aliasService.getAliasGoalSummary(tenantId, isLive, aliasId);

      res.json({
        success: true,
        data: goals
      });
    } catch (error: any) {
      console.error('Error getting alias goals:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get alias goals'
      });
    }
  };

  /**
   * Get alias meeting summary
   * GET /api/aliases/:id/meetings
   */
  getAliasMeetings = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { user, environment } = req;
      const isLive = environment === 'live';
      const tenantId = user!.tenant_id;
      const aliasId = parseInt(req.params.id);

      if (isNaN(aliasId)) {
        res.status(400).json({
          success: false,
          error: 'Invalid alias ID'
        });
        return;
      }

      const meetings = await this.aliasService.getAliasMeetingSummary(tenantId, isLive, aliasId);

      res.json({
        success: true,
        data: meetings
      });
    } catch (error: any) {
      console.error('Error getting alias meetings:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get alias meetings'
      });
    }
  };

  /**
   * Get alias for a specific customer (if exists)
   * GET /api/aliases/customer/:customerId
   */
  getCustomerAlias = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { user } = req;
      const tenantId = user!.tenant_id;
      const customerId = parseInt(req.params.customerId);

      if (isNaN(customerId)) {
        res.status(400).json({
          success: false,
          error: 'Invalid customer ID'
        });
        return;
      }

      const alias = await this.aliasService.getCustomerAlias(tenantId, customerId);

      res.json({
        success: true,
        data: alias
      });
    } catch (error: any) {
      console.error('Error getting customer alias:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get customer alias'
      });
    }
  };
}
