// backend/src/controllers/schemeAlias.controller.ts

import { Request, Response } from 'express';
import { SchemeAliasService } from '../services/schemeAlias.service';
import {
  CreateSchemeAliasRequest,
  UpdateSchemeAliasRequest,
  BulkCreateAliasesRequest,
  SchemeAliasFilters
} from '../types/scheme.types';

interface AuthRequest extends Request {
  user?: {
    user_id: number;
    username: string;
    email: string;
    tenant_id: number;
  };
}

export class SchemeAliasController {
  private schemeAliasService: SchemeAliasService;

  constructor() {
    this.schemeAliasService = new SchemeAliasService();
  }

  /**
   * GET /api/scheme-aliases
   * Get list of scheme aliases with optional filters
   */
  getAliases = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const filters: SchemeAliasFilters = {
        scheme_id: req.query.scheme_id ? parseInt(req.query.scheme_id as string) : undefined,
        scheme_code: req.query.scheme_code as string,
        search: req.query.search as string,
        source: req.query.source as 'auto' | 'manual' | 'import',
        is_active: req.query.is_active === 'true' ? true :
                   req.query.is_active === 'false' ? false : undefined,
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        page_size: req.query.page_size ? parseInt(req.query.page_size as string) : 100
      };

      const result = await this.schemeAliasService.getAliases(filters);

      res.json(result);
    } catch (error: any) {
      console.error('Error in getAliases:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch aliases'
      });
    }
  };

  /**
   * GET /api/scheme-aliases/:id
   * Get single alias by ID
   */
  getAliasById = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const aliasId = parseInt(req.params.id);

      if (isNaN(aliasId)) {
        res.status(400).json({
          success: false,
          error: 'Invalid alias ID'
        });
        return;
      }

      const result = await this.schemeAliasService.getAliasById(aliasId);

      if (!result.success) {
        res.status(404).json(result);
        return;
      }

      res.json(result);
    } catch (error: any) {
      console.error('Error in getAliasById:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch alias'
      });
    }
  };

  /**
   * POST /api/scheme-aliases
   * Create new scheme alias
   */
  createAlias = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const request: CreateSchemeAliasRequest = {
        scheme_id: req.body.scheme_id,
        scheme_code: req.body.scheme_code,
        alias_name: req.body.alias_name,
        source: req.body.source || 'manual'
      };

      // Validation
      if (!request.alias_name || request.alias_name.trim() === '') {
        res.status(400).json({
          success: false,
          error: 'alias_name is required'
        });
        return;
      }

      if (!request.scheme_id && !request.scheme_code) {
        res.status(400).json({
          success: false,
          error: 'Either scheme_id or scheme_code is required'
        });
        return;
      }

      const result = await this.schemeAliasService.createAlias(user.user_id, request);

      if (!result.success) {
        res.status(400).json(result);
        return;
      }

      res.status(201).json(result);
    } catch (error: any) {
      console.error('Error in createAlias:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to create alias'
      });
    }
  };

  /**
   * PUT /api/scheme-aliases/:id
   * Update existing alias
   */
  updateAlias = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const aliasId = parseInt(req.params.id);

      if (isNaN(aliasId)) {
        res.status(400).json({
          success: false,
          error: 'Invalid alias ID'
        });
        return;
      }

      const request: UpdateSchemeAliasRequest = {
        alias_name: req.body.alias_name,
        is_active: req.body.is_active
      };

      const result = await this.schemeAliasService.updateAlias(aliasId, request);

      if (!result.success) {
        res.status(400).json(result);
        return;
      }

      res.json(result);
    } catch (error: any) {
      console.error('Error in updateAlias:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to update alias'
      });
    }
  };

  /**
   * DELETE /api/scheme-aliases/:id
   * Delete (deactivate) alias
   */
  deleteAlias = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const aliasId = parseInt(req.params.id);

      if (isNaN(aliasId)) {
        res.status(400).json({
          success: false,
          error: 'Invalid alias ID'
        });
        return;
      }

      const result = await this.schemeAliasService.deleteAlias(aliasId);

      if (!result.success) {
        res.status(404).json(result);
        return;
      }

      res.json(result);
    } catch (error: any) {
      console.error('Error in deleteAlias:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to delete alias'
      });
    }
  };

  /**
   * POST /api/scheme-aliases/bulk
   * Bulk create multiple aliases for one scheme
   */
  bulkCreateAliases = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const request: BulkCreateAliasesRequest = {
        scheme_code: req.body.scheme_code,
        aliases: req.body.aliases,
        source: req.body.source || 'manual'
      };

      // Validation
      if (!request.scheme_code) {
        res.status(400).json({
          success: false,
          error: 'scheme_code is required'
        });
        return;
      }

      if (!Array.isArray(request.aliases) || request.aliases.length === 0) {
        res.status(400).json({
          success: false,
          error: 'aliases array is required and must not be empty'
        });
        return;
      }

      const result = await this.schemeAliasService.bulkCreateAliases(user.user_id, request);

      res.json(result);
    } catch (error: any) {
      console.error('Error in bulkCreateAliases:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to bulk create aliases'
      });
    }
  };

  /**
   * POST /api/scheme-aliases/lookup
   * Lookup scheme by alias name (for testing/debugging)
   */
  lookupByAlias = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const aliasName = req.body.alias_name || req.query.alias_name;

      if (!aliasName) {
        res.status(400).json({
          success: false,
          error: 'alias_name is required'
        });
        return;
      }

      const result = await this.schemeAliasService.lookupSchemeByAlias(aliasName as string);

      res.json(result);
    } catch (error: any) {
      console.error('Error in lookupByAlias:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to lookup alias'
      });
    }
  };

  /**
   * GET /api/scheme-aliases/statistics
   * Get alias statistics (for dashboard)
   */
  getStatistics = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const stats = await this.schemeAliasService.getStatistics();

      res.json({
        success: true,
        data: stats
      });
    } catch (error: any) {
      console.error('Error in getStatistics:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch statistics'
      });
    }
  };

  /**
   * POST /api/scheme-aliases/backfill
   * Backfill missing aliases for schemes
   */
  backfillAliases = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const result = await this.schemeAliasService.backfillMissingAliases(user.user_id);

      res.json({
        success: true,
        data: result
      });
    } catch (error: any) {
      console.error('Error in backfillAliases:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to backfill aliases'
      });
    }
  };
}
