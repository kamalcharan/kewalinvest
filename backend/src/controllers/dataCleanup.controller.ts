// backend/src/controllers/dataCleanup.controller.ts
// Controller for tenant self-service data cleanup

import { Request, Response } from 'express';
import { DataCleanupService } from '../services/dataCleanup.service';

export class DataCleanupController {
  private dataCleanupService: DataCleanupService;

  constructor() {
    this.dataCleanupService = new DataCleanupService();
  }

  /**
   * GET /api/cruise-control/data-cleanup/preview
   * Get preview of all data that will be deleted
   */
  getCleanupPreview = async (req: Request, res: Response): Promise<void> => {
    try {
      const tenantId = (req as any).tenantId;
      const isLive = (req as any).isLive;

      if (!tenantId) {
        res.status(400).json({
          success: false,
          error: 'Tenant ID is required'
        });
        return;
      }

      const preview = await this.dataCleanupService.getCleanupPreview(tenantId, isLive);

      res.json({
        success: true,
        data: preview
      });

    } catch (error: any) {
      console.error('[DataCleanupController] Error getting preview:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get cleanup preview'
      });
    }
  };

  /**
   * POST /api/cruise-control/data-cleanup/execute
   * Execute the cleanup (hard delete all tenant data)
   *
   * Body: {
   *   confirmationText: "DELETE" - Required confirmation
   * }
   */
  executeCleanup = async (req: Request, res: Response): Promise<void> => {
    try {
      const tenantId = (req as any).tenantId;
      const isLive = (req as any).isLive;
      const userId = (req as any).userId;
      const { confirmationText } = req.body;

      if (!tenantId) {
        res.status(400).json({
          success: false,
          error: 'Tenant ID is required'
        });
        return;
      }

      // Require explicit confirmation
      if (confirmationText !== 'DELETE') {
        res.status(400).json({
          success: false,
          error: 'Invalid confirmation. Please type "DELETE" to confirm.'
        });
        return;
      }

      console.log(`[DataCleanupController] Cleanup requested by user ${userId} for tenant ${tenantId}`);

      const result = await this.dataCleanupService.executeCleanup(tenantId, isLive, userId);

      if (result.success) {
        res.json({
          success: true,
          data: {
            message: 'Data cleanup completed successfully',
            deletedCounts: result.deletedCounts,
            durationMs: result.durationMs
          }
        });
      } else {
        res.status(500).json({
          success: false,
          error: result.error || 'Cleanup failed'
        });
      }

    } catch (error: any) {
      console.error('[DataCleanupController] Error executing cleanup:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to execute cleanup'
      });
    }
  };
}
