// backend/src/routes/courseCorrection.routes.ts
// API routes for Course Correction (Scheme Code Migration) feature

import { Router, Request, Response } from 'express';
import { courseCorrectionService } from '../services/courseCorrection.service';
import { authMiddleware } from '../middleware/auth.middleware';
import { environmentMiddleware } from '../middleware/environment.middleware';
import {
  CreateCourseCorrectionRequest,
  GetCorrectionsParams,
  CourseCorrectionStatus
} from '../types/courseCorrection.types';

const router = Router();

// All routes require authentication and environment context
router.use(authMiddleware);
router.use(environmentMiddleware);

// ============================================================================
// IMPACT ANALYSIS
// ============================================================================

/**
 * GET /api/course-correction/impact/:schemeCode
 * Get impact analysis for a scheme code
 */
router.get('/impact/:schemeCode', async (req: Request, res: Response) => {
  try {
    const tenantId = parseInt(req.headers['x-tenant-id'] as string);
    const isLive = req.headers['x-environment'] === 'live';
    const { schemeCode } = req.params;

    if (!tenantId) {
      return res.status(400).json({ success: false, error: 'Tenant ID required' });
    }

    const analysis = await courseCorrectionService.getSchemeImpactAnalysis(tenantId, isLive, schemeCode);

    return res.json({
      success: true,
      data: analysis
    });
  } catch (error: any) {
    console.error('[CourseCorrection] Impact analysis error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// CORRECTIONS CRUD
// ============================================================================

/**
 * GET /api/course-correction/corrections
 * Get list of course corrections with pagination
 */
router.get('/corrections', async (req: Request, res: Response) => {
  try {
    const tenantId = parseInt(req.headers['x-tenant-id'] as string);
    const isLive = req.headers['x-environment'] === 'live';

    if (!tenantId) {
      return res.status(400).json({ success: false, error: 'Tenant ID required' });
    }

    const params: GetCorrectionsParams = {
      page: parseInt(req.query.page as string) || 1,
      page_size: parseInt(req.query.page_size as string) || 20,
      status: req.query.status as CourseCorrectionStatus | undefined,
      customer_id: req.query.customer_id ? parseInt(req.query.customer_id as string) : undefined,
      source_scheme_code: req.query.source_scheme_code as string | undefined
    };

    const { corrections, total } = await courseCorrectionService.getCorrections(tenantId, isLive, params);

    return res.json({
      success: true,
      data: {
        corrections,
        total,
        page: params.page,
        page_size: params.page_size,
        total_pages: Math.ceil(total / (params.page_size || 20))
      }
    });
  } catch (error: any) {
    console.error('[CourseCorrection] List corrections error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/course-correction/corrections/:id
 * Get single course correction by ID
 */
router.get('/corrections/:id', async (req: Request, res: Response) => {
  try {
    const tenantId = parseInt(req.headers['x-tenant-id'] as string);
    const isLive = req.headers['x-environment'] === 'live';
    const correctionId = parseInt(req.params.id);

    if (!tenantId) {
      return res.status(400).json({ success: false, error: 'Tenant ID required' });
    }

    const correction = await courseCorrectionService.getCorrectionById(tenantId, isLive, correctionId);

    if (!correction) {
      return res.status(404).json({ success: false, error: 'Correction not found' });
    }

    return res.json({
      success: true,
      data: correction
    });
  } catch (error: any) {
    console.error('[CourseCorrection] Get correction error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/course-correction/corrections/migrate
 * Complete migration in one step: Create → Execute → Regenerate Snapshots
 * Returns detailed progress for each step
 */
router.post('/corrections/migrate', async (req: Request, res: Response) => {
  try {
    const tenantId = parseInt(req.headers['x-tenant-id'] as string);
    const isLive = req.headers['x-environment'] === 'live';
    const userId = (req as any).user?.id;

    if (!tenantId) {
      return res.status(400).json({ success: false, error: 'Tenant ID required' });
    }

    const request: CreateCourseCorrectionRequest = req.body;

    if (!request.customer_id || !request.source_scheme_code || !request.target_scheme_code) {
      return res.status(400).json({
        success: false,
        error: 'customer_id, source_scheme_code, and target_scheme_code are required'
      });
    }

    if (request.source_scheme_code === request.target_scheme_code) {
      return res.status(400).json({
        success: false,
        error: 'Source and target scheme codes must be different'
      });
    }

    console.log(`[CourseCorrection] Starting migration for customer ${request.customer_id}: ${request.source_scheme_code} → ${request.target_scheme_code}`);

    const result = await courseCorrectionService.migrateAndComplete(tenantId, isLive, userId, request);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error,
        steps: result.steps
      });
    }

    return res.json({
      success: true,
      data: result
    });
  } catch (error: any) {
    console.error('[CourseCorrection] Migration error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/course-correction/corrections
 * Create a new course correction (pending status)
 */
router.post('/corrections', async (req: Request, res: Response) => {
  try {
    const tenantId = parseInt(req.headers['x-tenant-id'] as string);
    const isLive = req.headers['x-environment'] === 'live';
    const userId = (req as any).user?.id;

    if (!tenantId) {
      return res.status(400).json({ success: false, error: 'Tenant ID required' });
    }

    const request: CreateCourseCorrectionRequest = req.body;

    if (!request.customer_id || !request.source_scheme_code || !request.target_scheme_code) {
      return res.status(400).json({
        success: false,
        error: 'customer_id, source_scheme_code, and target_scheme_code are required'
      });
    }

    if (request.source_scheme_code === request.target_scheme_code) {
      return res.status(400).json({
        success: false,
        error: 'Source and target scheme codes must be different'
      });
    }

    const correction = await courseCorrectionService.createCorrection(tenantId, isLive, userId, request);

    return res.status(201).json({
      success: true,
      data: correction,
      message: 'Course correction created. Execute to apply changes.'
    });
  } catch (error: any) {
    console.error('[CourseCorrection] Create correction error:', error);
    return res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/course-correction/corrections/:id/execute
 * Execute a pending course correction
 */
router.post('/corrections/:id/execute', async (req: Request, res: Response) => {
  try {
    const tenantId = parseInt(req.headers['x-tenant-id'] as string);
    const isLive = req.headers['x-environment'] === 'live';
    const correctionId = parseInt(req.params.id);

    if (!tenantId) {
      return res.status(400).json({ success: false, error: 'Tenant ID required' });
    }

    const result = await courseCorrectionService.executeCorrection(tenantId, isLive, correctionId);

    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error });
    }

    return res.json({
      success: true,
      data: {
        updated_transactions: result.updated_transactions,
        message: `Successfully migrated ${result.updated_transactions} transactions`
      }
    });
  } catch (error: any) {
    console.error('[CourseCorrection] Execute correction error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/course-correction/corrections/:id/rollback
 * Rollback a completed course correction
 */
router.post('/corrections/:id/rollback', async (req: Request, res: Response) => {
  try {
    const tenantId = parseInt(req.headers['x-tenant-id'] as string);
    const isLive = req.headers['x-environment'] === 'live';
    const userId = (req as any).user?.id;
    const correctionId = parseInt(req.params.id);

    if (!tenantId) {
      return res.status(400).json({ success: false, error: 'Tenant ID required' });
    }

    const result = await courseCorrectionService.rollbackCorrection(tenantId, isLive, correctionId, userId);

    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error });
    }

    return res.json({
      success: true,
      data: {
        restored_transactions: result.restored_transactions,
        message: `Successfully rolled back ${result.restored_transactions} transactions`
      }
    });
  } catch (error: any) {
    console.error('[CourseCorrection] Rollback correction error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/course-correction/corrections/:id
 * Delete a pending course correction
 */
router.delete('/corrections/:id', async (req: Request, res: Response) => {
  try {
    const tenantId = parseInt(req.headers['x-tenant-id'] as string);
    const isLive = req.headers['x-environment'] === 'live';
    const correctionId = parseInt(req.params.id);

    if (!tenantId) {
      return res.status(400).json({ success: false, error: 'Tenant ID required' });
    }

    const deleted = await courseCorrectionService.deleteCorrection(tenantId, isLive, correctionId);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Correction not found or not in pending status'
      });
    }

    return res.json({
      success: true,
      message: 'Course correction deleted'
    });
  } catch (error: any) {
    console.error('[CourseCorrection] Delete correction error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/course-correction/corrections/:id/snapshot-done
 * Mark snapshot as regenerated
 */
router.post('/corrections/:id/snapshot-done', async (req: Request, res: Response) => {
  try {
    const tenantId = parseInt(req.headers['x-tenant-id'] as string);
    const isLive = req.headers['x-environment'] === 'live';
    const correctionId = parseInt(req.params.id);

    if (!tenantId) {
      return res.status(400).json({ success: false, error: 'Tenant ID required' });
    }

    const updated = await courseCorrectionService.markSnapshotRegenerated(tenantId, isLive, correctionId);

    if (!updated) {
      return res.status(404).json({ success: false, error: 'Correction not found' });
    }

    return res.json({
      success: true,
      message: 'Snapshot marked as regenerated'
    });
  } catch (error: any) {
    console.error('[CourseCorrection] Mark snapshot error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// BOOKMARKS (for source scheme selection)
// NOTE: For target scheme search, use NAV Tracking API: /api/nav/schemes/search
// ============================================================================

/**
 * GET /api/course-correction/bookmarks
 * Get bookmarked schemes for source selection
 */
router.get('/bookmarks', async (req: Request, res: Response) => {
  try {
    const tenantId = parseInt(req.headers['x-tenant-id'] as string);
    const isLive = req.headers['x-environment'] === 'live';

    if (!tenantId) {
      return res.status(400).json({ success: false, error: 'Tenant ID required' });
    }

    const bookmarks = await courseCorrectionService.getBookmarkedSchemes(tenantId, isLive);

    return res.json({
      success: true,
      data: bookmarks
    });
  } catch (error: any) {
    console.error('[CourseCorrection] Get bookmarks error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
