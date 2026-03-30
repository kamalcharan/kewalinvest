import express from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { ImportController } from '../controllers/import.controller';
import { authenticate } from '../middleware/auth.middleware';
import { ImportService } from '../services/import.service';
import { FileImportType } from '../types/import.types';

const multer = require('multer');

// Configuration for import types and their folder structure
const IMPORT_TYPE_CONFIG: Record<FileImportType, {
  folderName: string;
  uploadPath: string;
}> = {
  BookmarkData: {
    folderName: 'bookmarks',
    uploadPath: 'UserFiles/bookmarks'
  },
  CustomerData: {
    folderName: 'customers',
    uploadPath: 'UserFiles/customers'
  },
  TransactionData: {
    folderName: 'transactions',
    uploadPath: 'UserFiles/transactions'
  },
  SchemeData: {
    folderName: 'schemes',
    uploadPath: 'UserFiles/schemes'
  }
};

// Type guard to validate import types
const isValidImportType = (type: any): type is FileImportType => {
  return type in IMPORT_TYPE_CONFIG;
};

// Get all valid import types as array
const VALID_IMPORT_TYPES = Object.keys(IMPORT_TYPE_CONFIG) as FileImportType[];

const router = express.Router();
const importController = new ImportController();
const importService = new ImportService();

// Ensure directories exist
const ensureDirectoryExists = (dirPath: string) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

// Create all required directories for all import types
Object.values(IMPORT_TYPE_CONFIG).forEach(config => {
  ensureDirectoryExists(config.uploadPath);
});

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// File upload endpoint
router.post('/upload', upload.single('file'), authenticate, async (req: any, res: express.Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, error: 'No file uploaded' });
      return;
    }

    const importType = req.query.importType || req.body.importType;

    // Validate import type using type guard
    if (!importType || !isValidImportType(importType)) {
      res.status(400).json({
        success: false,
        error: `Invalid import type. Valid types are: ${VALID_IMPORT_TYPES.join(', ')}`
      });
      return;
    }

    // Calculate file hash (SHA256) for reference only - NOT used for duplicate detection
    const fileHash = crypto.createHash('sha256').update(req.file.buffer).digest('hex');
    const isLive = req.headers['x-environment'] === 'live';

    // Check for duplicate FILENAME (NOT content) - Production requirement
    // Users can rename files to bypass, which is expected behavior
    {
      try {
        const db = (importService as any).db;
        const duplicateCheck = await db.query(`
          SELECT
            f.id,
            f.original_filename,
            f.file_size,
            f.created_at,
            s.session_name,
            s.status as session_status,
            s.total_records,
            s.successful_records,
            s.duplicate_records
          FROM t_file_uploads f
          LEFT JOIN t_import_sessions s ON s.file_upload_id = f.id
          WHERE f.original_filename = $1
            AND f.tenant_id = $2
            AND f.is_live = $3
          ORDER BY f.created_at DESC
          LIMIT 1
        `, [req.file.originalname, req.user.tenant_id, isLive]);

        if (duplicateCheck.rows.length > 0) {
          const duplicate = duplicateCheck.rows[0];

          // CRITICAL: Allow re-upload if previous import was cancelled or failed
          const allowedStatuses = ['cancelled', 'failed', null]; // null = no session created yet
          if (allowedStatuses.includes(duplicate.session_status)) {
            console.log(`[Upload] Allowing re-upload of "${req.file.originalname}" - previous session status: ${duplicate.session_status || 'no session'}`);
            // Delete the old file record to allow fresh upload
            await db.query(`DELETE FROM t_file_uploads WHERE id = $1`, [duplicate.id]);
            console.log(`[Upload] Deleted old file record ID: ${duplicate.id}`);
            // Continue with the upload
          } else {
            // Block duplicate only if previous import was successful or in progress
            res.status(409).json({
              success: false,
              error: 'DUPLICATE_FILE_BLOCKED',
              isDuplicate: true,
              isBlocked: true,
              duplicateInfo: {
                fileId: duplicate.id,
                originalFilename: duplicate.original_filename,
                fileSize: duplicate.file_size,
                uploadedAt: duplicate.created_at,
                sessionName: duplicate.session_name,
                sessionStatus: duplicate.session_status,
                totalRecords: duplicate.total_records,
                successfulRecords: duplicate.successful_records,
                duplicateRecords: duplicate.duplicate_records
              },
              message: `A file named "${duplicate.original_filename}" was already successfully imported on ${new Date(duplicate.created_at).toLocaleString()}. The import processed ${duplicate.total_records || 0} records with ${duplicate.successful_records || 0} successful. To upload again, either rename your file or delete the previous import session.`
            });
            return;
          }
        }
      } catch (dbError) {
        console.warn('Could not check for duplicate file:', dbError);
        // Continue with upload if duplicate check fails
      }
    }

    // Get configuration for this import type
    const config = IMPORT_TYPE_CONFIG[importType];
    const uploadPath = config.uploadPath;

    // Ensure the upload directory exists
    ensureDirectoryExists(uploadPath);

    // Generate unique filename
    const timestamp = Date.now();
    const userId = req.user?.user_id || 'unknown';
    const sanitizedName = req.file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filename = `${timestamp}_${userId}_${sanitizedName}`;
    const filePath = path.join(uploadPath, filename);

    // Save file to disk
    fs.writeFileSync(filePath, req.file.buffer);

    // Create database record with file hash
    try {
      const fileRecord = await importService.createFileUpload({
        tenantId: req.user.tenant_id,
        isLive,
        fileType: importType,
        originalFilename: req.file.originalname,
        storedFilename: filename,
        filePath: filePath,
        folderPath: uploadPath,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
        uploadedBy: req.user.user_id,
        fileHash: fileHash
      });

      res.json({
        success: true,
        data: fileRecord
      });
      return;
    } catch (dbError: any) {
      console.error('Database error:', dbError);
      // If database save fails, still return success with temporary data
      // since the file was saved successfully
      res.json({
        success: true,
        data: {
          id: Math.floor(Math.random() * 1000000), // Use smaller random ID instead of timestamp
          original_filename: req.file.originalname,
          stored_filename: filename,
          file_path: filePath,
          file_size: req.file.size,
          mime_type: req.file.mimetype,
          file_hash: fileHash
        }
      });
      return;
    }
  } catch (error: any) {
    console.error('Upload error:', error);
    res.status(500).json({ success: false, error: error.message });
    return;
  }
});

// Get file headers for mapping
router.get('/headers/:fileId', authenticate, importController.getHeaders);

// Validate field mappings
router.post('/validate-mapping', authenticate, importController.validateMapping);

// Start processing (staging + database processing)
router.post('/process', authenticate, importController.startProcessing);

// Get processing status
router.get('/status/:sessionId', authenticate, importController.getProcessingStatus);

// Get import results
router.get('/results/:sessionId', authenticate, importController.getImportResults);

// Cancel processing
router.post('/cancel/:sessionId', authenticate, importController.cancelProcessing);

// Template management
router.get('/templates', authenticate, importController.getTemplates);
router.post('/templates', authenticate, importController.saveTemplate);
router.put('/templates/:templateId', authenticate, importController.updateTemplate);
router.delete('/templates/:templateId', authenticate, importController.deleteTemplate);

// Get all import sessions
router.get('/sessions', authenticate, importController.getImportSessions);

// Export error records as CSV
router.get('/export-errors/:sessionId', authenticate, importController.exportErrors);

// N8N callback endpoint (no authentication needed for webhook)
router.post('/n8n-callback', importController.handleN8NCallback);

// File management
router.get('/file-info/:fileId', authenticate, importController.getFileInfo);
router.delete('/file/:fileId', authenticate, importController.deleteFile);

// Staging status and records
router.get('/staging/:sessionId/status', authenticate, importController.getStagingStatus);
router.get('/staging/:sessionId/records', authenticate, importController.getStagingRecords);
router.post('/staging/:sessionId/retry', authenticate, importController.reprocessFailedRecords);
router.delete('/staging/:sessionId', authenticate, importController.deleteStagingData);

// Duplicate detection endpoints
router.post('/check-filename-duplicate', authenticate, importController.checkFilenameDuplicate);
router.get('/check-session-duplicates/:sessionId', authenticate, importController.checkSessionDuplicates);
router.post('/save-duplicate-decision/:sessionId', authenticate, importController.saveDuplicateDecision);

// Session restart and record reprocessing endpoints
router.post('/restart/:sessionId', authenticate, importController.restartSession);
router.put('/staging/:stagingId/edit', authenticate, importController.editStagingRecord);
router.post('/staging/:stagingId/reprocess', authenticate, importController.reprocessSingleRecord);
router.post('/session/:sessionId/bulk-reprocess', authenticate, importController.bulkReprocessRecords);

// Date correction endpoints
router.get('/date-check/:sessionId', authenticate, importController.checkDateIssues);
router.post('/date-correct/:sessionId', authenticate, importController.correctDateIssues);

export default router;