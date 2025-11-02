// backend/src/routes/bookmark.routes.ts
// API routes for bookmark import and management

import express, { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { BookmarkImportService } from '../services/bookmarkImport.service';
import { FileParserService } from '../services/fileparser.service';
import { authMiddleware } from '../middleware/auth.middleware';

const router = express.Router();

// Define the BookmarkImportRow interface locally if not exported from service
interface BookmarkImportRow {
  scheme_code: string;
  isin: string;
  scheme_name: string;
}

// Configure multer for file uploads
const upload = multer({
  dest: 'uploads/bookmarks/',
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedExtensions = ['.csv', '.xlsx', '.xls'];
    const ext = path.extname(file.originalname).toLowerCase();
    
    if (allowedExtensions.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only CSV and Excel files are allowed.'));
    }
  }
});

const bookmarkService = new BookmarkImportService();
const fileParser = new FileParserService();

/**
 * POST /api/bookmarks/import
 * Upload and import bookmark CSV file
 * 
 * Expected CSV columns:
 * - scheme_code (required)
 * - isin (optional)
 * - scheme_name (required)
 */
router.post('/import', authMiddleware, upload.single('file'), async (req: Request, res: Response): Promise<void> => {
  let filePath: string | undefined;

  try {
    const { tenant_id, is_live, user_id } = req.body;

    // Validate required parameters
    if (!tenant_id || is_live === undefined || !user_id) {
      res.status(400).json({
        success: false,
        error: 'Missing required parameters: tenant_id, is_live, or user_id'
      });
      return;
    }

    // Validate file upload
    if (!req.file) {
      res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
      return;
    }

    filePath = req.file.path;

    console.log(`[BookmarkRoutes] Processing bookmark import for tenant ${tenant_id}, file: ${req.file.originalname}`);

    // Parse the uploaded file
    const parsed = await fileParser.parseFile(filePath);

    if (!parsed.rows || parsed.rows.length === 0) {
      res.status(400).json({
        success: false,
        error: 'File is empty or could not be parsed'
      });
      return;
    }

    // Validate required columns
    const requiredColumns = ['scheme_code', 'scheme_name'];
    const firstRow = parsed.rows[0];
    const missingColumns = requiredColumns.filter(col => !firstRow.hasOwnProperty(col));

    if (missingColumns.length > 0) {
      res.status(400).json({
        success: false,
        error: `Missing required columns: ${missingColumns.join(', ')}. Required: scheme_code, scheme_name (isin is optional)`
      });
      return;
    }

    // Type-cast parsed rows to BookmarkImportRow[]
    const bookmarkRows: BookmarkImportRow[] = parsed.rows.map(row => ({
      scheme_code: String(row.scheme_code || '').trim(),
      isin: String(row.isin || '').trim(),
      scheme_name: String(row.scheme_name || '').trim()
    }));

    // Import bookmarks
    const result = await bookmarkService.importBookmarks(
      parseInt(tenant_id),
      is_live === 'true' || is_live === true,
      parseInt(user_id),
      bookmarkRows
    );

    // Clean up uploaded file
    if (filePath) {
      fs.unlinkSync(filePath);
    }

    console.log(`[BookmarkRoutes] Import complete: ${result.bookmarksCreated} created, ${result.aliasesCreated} aliases`);

    res.json(result);
    return;

  } catch (error: any) {
    // Clean up uploaded file on error
    if (filePath) {
      try {
        fs.unlinkSync(filePath);
      } catch (unlinkError) {
        console.error('[BookmarkRoutes] Failed to delete uploaded file:', unlinkError);
      }
    }

    console.error('[BookmarkRoutes] Bookmark import error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Bookmark import failed'
    });
    return;
  }
});

/**
 * GET /api/bookmarks/stats
 * Get bookmark statistics for a tenant
 */
router.get('/stats', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { tenant_id, is_live } = req.query;

    if (!tenant_id || is_live === undefined) {
      res.status(400).json({
        success: false,
        error: 'Missing required parameters: tenant_id, is_live'
      });
      return;
    }

    const stats = await bookmarkService.getBookmarkStats(
      parseInt(tenant_id as string),
      is_live === 'true'
    );

    res.json({
      success: true,
      data: stats
    });
    return;

  } catch (error: any) {
    console.error('[BookmarkRoutes] Get stats error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch bookmark statistics'
    });
    return;
  }
});

/**
 * GET /api/bookmarks/list
 * Get list of bookmarks for a tenant
 */
router.get('/list', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { tenant_id, is_live, limit, offset } = req.query;

    if (!tenant_id || is_live === undefined) {
      res.status(400).json({
        success: false,
        error: 'Missing required parameters: tenant_id, is_live'
      });
      return;
    }

    const bookmarks = await bookmarkService.getBookmarks(
      parseInt(tenant_id as string),
      is_live === 'true',
      {
        limit: limit ? parseInt(limit as string) : undefined,
        offset: offset ? parseInt(offset as string) : undefined
      }
    );

    res.json({
      success: true,
      data: bookmarks,
      count: bookmarks.length
    });
    return;

  } catch (error: any) {
    console.error('[BookmarkRoutes] Get list error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch bookmarks'
    });
    return;
  }
});

/**
 * GET /api/bookmarks/check
 * Check if tenant has bookmarks (prerequisite for transaction import)
 */
router.get('/check', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { tenant_id, is_live } = req.query;

    if (!tenant_id || is_live === undefined) {
      res.status(400).json({
        success: false,
        error: 'Missing required parameters: tenant_id, is_live'
      });
      return;
    }

    const hasBookmarks = await bookmarkService.hasBookmarks(
      parseInt(tenant_id as string),
      is_live === 'true'
    );

    res.json({
      success: true,
      has_bookmarks: hasBookmarks,
      can_import_transactions: hasBookmarks
    });
    return;

  } catch (error: any) {
    console.error('[BookmarkRoutes] Check bookmarks error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to check bookmarks'
    });
    return;
  }
});

/**
 * DELETE /api/bookmarks/:id
 * Delete a bookmark (soft delete)
 */
router.delete('/:id', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { tenant_id, is_live } = req.query;

    if (!tenant_id || is_live === undefined) {
      res.status(400).json({
        success: false,
        error: 'Missing required parameters: tenant_id, is_live'
      });
      return;
    }

    await bookmarkService.deleteBookmark(
      parseInt(tenant_id as string),
      is_live === 'true',
      parseInt(id)
    );

    res.json({
      success: true,
      message: 'Bookmark deleted successfully'
    });
    return;

  } catch (error: any) {
    console.error('[BookmarkRoutes] Delete bookmark error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to delete bookmark'
    });
    return;
  }
});

/**
 * GET /api/bookmarks/template
 * Download CSV template for bookmark import
 */
router.get('/template', (req: Request, res: Response): void => {
  try {
    const csvContent = `scheme_code,isin,scheme_name
131578,INF579M01878,360 One Focused Fund (G)
152800,INF209KC1159,Aditya Birla SL Nifty India Defence Index Fund Reg (G)
112087,INF209K01256,Axis Arbitrage Fund (G)`;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="bookmark_template.csv"');
    res.send(csvContent);

  } catch (error: any) {
    console.error('[BookmarkRoutes] Template download error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate template'
    });
  }
});

export default router;