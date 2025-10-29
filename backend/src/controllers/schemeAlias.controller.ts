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
    is_admin?: boolean;
  };
}

// Progress tracking state
interface BackfillProgress {
  userId: number;
  current: number;
  total: number;
  created: number;
  skipped: number;
  status: 'running' | 'completed' | 'cancelled' | 'error';
  startTime: Date;
  endTime?: Date;
  error?: string;
}

export class SchemeAliasController {
  private schemeAliasService: SchemeAliasService;
  private backfillProgress: Map<number, BackfillProgress> = new Map();
  private cancelRequests: Set<number> = new Set();

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
  /**
   * DELETE /api/scheme-aliases/:id
   * Delete (deactivate) alias - ADMIN ONLY
   */
  deleteAlias = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      // Check if user is admin
      if (!user.is_admin) {
        res.status(403).json({
          success: false,
          error: 'Admin access required. Please contact your administrator to delete aliases.'
        });
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
   * Start backfill process (returns immediately, processes in background)
   */
  backfillAliases = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const userId = user.user_id;

      // Check if backfill is already running for this user
      if (this.backfillProgress.has(userId) && this.backfillProgress.get(userId)!.status === 'running') {
        res.status(409).json({
          success: false,
          error: 'Backfill already in progress'
        });
        return;
      }

      // Initialize progress
      this.backfillProgress.set(userId, {
        userId,
        current: 0,
        total: 0,
        created: 0,
        skipped: 0,
        status: 'running',
        startTime: new Date()
      });

      // Clear any previous cancel request
      this.cancelRequests.delete(userId);

      // Start backfill in background
      this.runBackfillAsync(userId);

      // Return immediately
      res.json({
        success: true,
        message: 'Backfill started',
        data: { userId }
      });
    } catch (error: any) {
      console.error('Error in backfillAliases:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to start backfill'
      });
    }
  };

  /**
   * GET /api/scheme-aliases/backfill/progress
   * Get backfill progress
   */
  getBackfillProgress = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const progress = this.backfillProgress.get(user.user_id);

      if (!progress) {
        res.json({
          success: true,
          data: null
        });
        return;
      }

      res.json({
        success: true,
        data: progress
      });
    } catch (error: any) {
      console.error('Error in getBackfillProgress:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get progress'
      });
    }
  };

  /**
   * POST /api/scheme-aliases/backfill/cancel
   * Cancel running backfill
   */
  cancelBackfill = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const userId = user.user_id;
      const progress = this.backfillProgress.get(userId);

      if (!progress || progress.status !== 'running') {
        res.status(400).json({
          success: false,
          error: 'No backfill in progress'
        });
        return;
      }

      // Request cancellation
      this.cancelRequests.add(userId);

      res.json({
        success: true,
        message: 'Cancellation requested'
      });
    } catch (error: any) {
      console.error('Error in cancelBackfill:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to cancel backfill'
      });
    }
  };

  /**
   * Run backfill asynchronously with progress tracking
   */
  private async runBackfillAsync(userId: number): Promise<void> {
    try {
      const result = await this.schemeAliasService.backfillMissingAliases(
        userId,
        100, // batch size
        // Progress callback
        (progress) => {
          const existing = this.backfillProgress.get(userId);
          if (existing) {
            existing.current = progress.current;
            existing.total = progress.total;
            existing.created = progress.created;
            existing.skipped = progress.skipped;
          }
        },
        // Cancel check
        () => this.cancelRequests.has(userId)
      );

      // Update final status
      const progress = this.backfillProgress.get(userId);
      if (progress) {
        progress.status = result.cancelled ? 'cancelled' : 'completed';
        progress.endTime = new Date();
        progress.current = result.processed;
        progress.created = result.created;
      }

      // Clear cancel request
      this.cancelRequests.delete(userId);

      console.log(`[SchemeAliasController] Backfill ${result.cancelled ? 'cancelled' : 'completed'} for user ${userId}`);
    } catch (error: any) {
      console.error('[SchemeAliasController] Backfill error for user', userId, ':', error);
      const progress = this.backfillProgress.get(userId);
      if (progress) {
        progress.status = 'error';
        progress.endTime = new Date();
        progress.error = error.message;
      }
      this.cancelRequests.delete(userId);
    }
  }
}
