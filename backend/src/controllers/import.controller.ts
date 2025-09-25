// backend/src/controllers/import.controller.ts
import { Request, Response } from 'express';
import { ImportService } from '../services/import.service';
import { N8NIntegrationService } from '../services/n8nIntegration.service';
import { FileParserService } from '../services/fileParser.service';
import { FileImportType } from '../types/import.types';
import path from 'path';
import fs from 'fs/promises';

interface AuthRequest extends Request {
  user?: {
    user_id: number;
    username: string;
    email: string;
    tenant_id: number;
  };
}

export class ImportController {
  private importService: ImportService;
  private n8nService: N8NIntegrationService;
  private fileParser: FileParserService;
  private db: any; // Database connection from ImportService

  constructor() {
    this.importService = new ImportService();
    this.n8nService = new N8NIntegrationService();
    this.fileParser = new FileParserService();
    this.db = (this.importService as any).db; // Access the database connection
  }

  /**
   * Upload file - handled in routes
   */
  uploadFile = async (req: AuthRequest, res: Response): Promise<void> => {
    res.status(500).json({ 
      success: false, 
      error: 'Upload is handled by route middleware' 
    });
  };

  /**
   * Get file headers for mapping
   */
  getHeaders = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const { fileId } = req.params;
      const isLive = req.headers['x-environment'] === 'live';

      // Try to get file record from database
      let fileRecord;
      try {
        fileRecord = await this.importService.getFileUpload(
          user.tenant_id,
          isLive,
          parseInt(fileId)
        );
      } catch (dbError: any) {
        // Fallback to filesystem
        const customerPath = 'UserFiles/customers/pending';
        const transactionPath = 'UserFiles/transactions/pending';
        const schemePath = 'UserFiles/schemes/pending';
        
        let foundFile = null;
        let originalFilename = null;
        
        for (const dir of [customerPath, transactionPath, schemePath]) {
          try {
            const files = await fs.readdir(dir);
            for (const file of files) {
              if (file.startsWith(fileId)) {
                foundFile = path.join(dir, file);
                originalFilename = file;
                break;
              }
            }
          } catch (err) {
            continue;
          }
          if (foundFile) break;
        }
        
        if (!foundFile) {
          res.status(404).json({ success: false, error: 'File not found' });
          return;
        }
        
        fileRecord = {
          file_path: foundFile,
          original_filename: originalFilename,
          created_at: new Date()
        };
      }

      // Parse file to get headers and sample data
      const parsedFile = await this.fileParser.parseFile(fileRecord.file_path, { maxRows: 10 });

      res.json({
        success: true,
        data: {
          headers: parsedFile.headers,
          sampleData: parsedFile.rows,
          totalRows: parsedFile.totalRows,
          detectedColumns: parsedFile.headers.length,
          fileInfo: {
            id: fileId,
            filename: fileRecord.original_filename,
            uploadedAt: fileRecord.created_at
          }
        }
      });
    } catch (error: any) {
      console.error('Error getting file headers:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  };

  /**
   * Validate field mappings
   */
  validateMapping = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const { fileId, mappings } = req.body;
      const isLive = req.headers['x-environment'] === 'live';

      if (!fileId || !mappings) {
        res.status(400).json({ 
          success: false, 
          error: 'File ID and mappings are required' 
        });
        return;
      }

      // Get file to validate against its headers
      let filePath;
      
      try {
        const fileRecord = await this.importService.getFileUpload(
          user.tenant_id,
          isLive,
          parseInt(fileId)
        );
        filePath = fileRecord.file_path;
      } catch (dbError: any) {
        // Fallback to filesystem search
        const dirs = ['UserFiles/customers/pending', 'UserFiles/transactions/pending', 'UserFiles/schemes/pending'];
        for (const dir of dirs) {
          try {
            const files = await fs.readdir(dir);
            for (const file of files) {
              if (file.startsWith(fileId)) {
                filePath = path.join(dir, file);
                break;
              }
            }
          } catch (err) {
            continue;
          }
          if (filePath) break;
        }
      }

      if (!filePath) {
        res.status(404).json({ success: false, error: 'File not found for validation' });
        return;
      }

      // Parse file to get headers
      const parsedFile = await this.fileParser.parseFile(filePath, { maxRows: 1 });
      const fileHeaders = parsedFile.headers;

      // Validate mappings
      const errors: string[] = [];
      const warnings: string[] = [];

      if (!Array.isArray(mappings)) {
        res.status(400).json({ 
          success: false, 
          error: 'Mappings must be an array' 
        });
        return;
      }

      // Check each mapping
      mappings.forEach((mapping: any, index: number) => {
        if (!mapping.sourceField) {
          errors.push(`Mapping ${index + 1}: Source field is required`);
        }
        if (!mapping.targetField) {
          errors.push(`Mapping ${index + 1}: Target field is required`);
        }
        if (mapping.sourceField && !fileHeaders.includes(mapping.sourceField)) {
          errors.push(`Mapping ${index + 1}: Source field "${mapping.sourceField}" not found in file`);
        }
      });

      // Check for duplicate target fields
      const targetFields = mappings
        .map((m: any) => m.targetField)
        .filter(Boolean);
      const duplicates = targetFields.filter(
        (item: string, index: number) => targetFields.indexOf(item) !== index
      );
      if (duplicates.length > 0) {
        warnings.push(`Duplicate target fields: ${[...new Set(duplicates)].join(', ')}`);
      }

      res.json({ 
        success: true, 
        data: {
          isValid: errors.length === 0,
          errors,
          warnings
        }
      });

    } catch (error: any) {
      console.error('Error validating mappings:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  };

  /**
   * Start processing with staging
   */
  startProcessing = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const { fileId, mappings, sessionName } = req.body;
      const isLive = req.headers['x-environment'] === 'live';

      console.log('Processing request received:', { fileId, sessionName, mappingsCount: mappings?.length });

      if (!fileId || !mappings || !sessionName) {
        res.status(400).json({ 
          success: false, 
          error: 'File ID, mappings, and session name are required' 
        });
        return;
      }

      // Get file and validate mappings
      let filePath: string | undefined;
      let importType: FileImportType = 'CustomerData';
      
      // Try database first
      try {
        const fileRecord = await this.importService.getFileUpload(
          user.tenant_id,
          isLive,
          parseInt(fileId)
        );
        if (fileRecord) {
          filePath = fileRecord.file_path;
          importType = fileRecord.file_type;
          console.log('File found in database:', filePath, 'Import type:', importType);
        }
      } catch (dbError) {
        console.log('Database lookup failed, checking filesystem...');
      }

      // If not in database, search filesystem
      if (!filePath) {
        const syncFs = require('fs');
        const customerPath = 'UserFiles/customers/pending';
        const transactionPath = 'UserFiles/transactions/pending';
        const schemePath = 'UserFiles/schemes/pending';
        
        // Check customers folder
        if (syncFs.existsSync(customerPath)) {
          const customerFiles = syncFs.readdirSync(customerPath);
          for (const file of customerFiles) {
            if (file.includes(fileId)) {
              filePath = path.join(customerPath, file);
              importType = 'CustomerData';
              console.log('File found in customers folder:', filePath);
              break;
            }
          }
        }
        
        // Check transactions folder if not found
        if (!filePath && syncFs.existsSync(transactionPath)) {
          const transactionFiles = syncFs.readdirSync(transactionPath);
          for (const file of transactionFiles) {
            if (file.includes(fileId)) {
              filePath = path.join(transactionPath, file);
              importType = 'TransactionData';
              console.log('File found in transactions folder:', filePath);
              break;
            }
          }
        }

        // Check schemes folder if not found
        if (!filePath && syncFs.existsSync(schemePath)) {
          const schemeFiles = syncFs.readdirSync(schemePath);
          for (const file of schemeFiles) {
            if (file.includes(fileId)) {
              filePath = path.join(schemePath, file);
              importType = 'SchemeData';
              console.log('File found in schemes folder:', filePath);
              break;
            }
          }
        }
      }

      if (!filePath) {
        console.error('File not found for ID:', fileId);
        res.status(404).json({ success: false, error: 'File not found' });
        return;
      }

      // Verify file exists
      const syncFs = require('fs');
      if (!syncFs.existsSync(filePath)) {
        console.error('File path does not exist:', filePath);
        res.status(404).json({ success: false, error: 'File not found on disk' });
        return;
      }

      console.log('Parsing file for validation:', filePath);
      console.log('Import type detected:', importType);

      // Parse file to validate mappings
      const parsedFile = await this.fileParser.parseFile(filePath, { maxRows: 1 });
      const fileHeaders = parsedFile.headers;
      
      console.log('File headers found:', fileHeaders);
      console.log('Total rows in file:', parsedFile.totalRows);

      // Validate mappings
      const validationErrors: string[] = [];

      mappings.forEach((mapping: any, index: number) => {
        if (!mapping.sourceField || !mapping.targetField) {
          validationErrors.push(`Mapping ${index + 1}: Both source and target fields are required`);
        } else if (mapping.sourceField && !fileHeaders.includes(mapping.sourceField)) {
          validationErrors.push(
            `Mapping ${index + 1}: Source field "${mapping.sourceField}" not found in file. ` +
            `Available headers: [${fileHeaders.join(', ')}]`
          );
        }
      });

      if (validationErrors.length > 0) {
        console.error('Validation errors:', validationErrors);
        res.status(400).json({
          success: false,
          error: 'Invalid field mappings',
          errors: validationErrors,
          availableHeaders: fileHeaders
        });
        return;
      }

      // Create import session
      const session = await this.importService.createImportSession({
        sessionName,
        fileUploadId: parseInt(fileId),
        tenantId: user.tenant_id,
        isLive,
        importType,
        createdBy: user.user_id
      });

      console.log('Session created:', session.id, 'for import type:', importType);

      // Populate staging table
      try {
        const stagingResult = await this.importService.populateStagingTable({
          sessionId: session.id,
          tenantId: user.tenant_id,
          isLive,
          fileId: parseInt(fileId),
          filePath,
          importType,
          mappings
        });

        console.log('Staging completed, triggering processing for session:', session.id, 'type:', importType);
        
        // Use the same database processing for all import types
        let processingResult: { success: boolean; error?: string };
        const targetDuration = importType === 'CustomerData' ? 35000 : 30000;
        
        try {
          processingResult = await this.importService.triggerDatabaseProcessing(
            session.id,
            importType,  // Pass the import type to route to correct function
            targetDuration
          );
          console.log('Processing triggered successfully');
        } catch (error: any) {
          console.error('Database processing error:', error);
          processingResult = {
            success: false,
            error: error.message || 'Processing failed'
          };
        }

        if (!processingResult.success) {
          console.error('Failed to trigger processing:', processingResult.error);
          // Update session with error but still return success since staging worked
          await this.importService.updateImportSession(
            user.tenant_id,
            isLive,
            session.id,
            {
              status: 'failed',
              error_summary: processingResult.error || 'Processing failed'
            }
          );
        }

        res.json({
          success: true,
          data: {
            id: session.id,
            sessionId: session.id,
            session_name: sessionName,
            status: 'processing',
            totalRows: stagingResult.totalRows
          }
        });
        
      } catch (stagingError: any) {
        console.error('Staging error:', stagingError);
        
        // Update session with error
        await this.importService.updateImportSession(
          user.tenant_id,
          isLive,
          session.id,
          {
            status: 'failed',
            error_summary: `Staging failed: ${stagingError.message}`
          }
        );
        
        res.status(500).json({
          success: false,
          error: `Processing failed: ${stagingError.message}`
        });
      }

    } catch (error: any) {
      console.error('Error starting processing:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  };

  /**
   * Get processing status
   */
  getProcessingStatus = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const { sessionId } = req.params;
      const isLive = req.headers['x-environment'] === 'live';

      const session = await this.importService.getImportSession(
        user.tenant_id,
        isLive,
        parseInt(sessionId)
      );

      if (!session) {
        res.status(404).json({ success: false, error: 'Session not found' });
        return;
      }

      const progress = await this.importService.getStagingProgress(
        user.tenant_id,
        isLive,
        parseInt(sessionId)
      );

      res.json({
        success: true,
        data: {
          status: session.status,
          totalRecords: session.total_records,
          processedRecords: session.processed_records,
          successfulRecords: session.successful_records,
          failedRecords: session.failed_records,
          duplicateRecords: session.duplicate_records,
          processingStartedAt: session.processing_started_at,
          stagingProgress: progress
        }
      });

    } catch (error: any) {
      console.error('Error getting processing status:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  };

  /**
   * Get import results
   */
  getImportResults = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const { sessionId } = req.params;
      const { page = 1, pageSize = 20, status } = req.query;
      const isLive = req.headers['x-environment'] === 'live';

      const stagingRecords = await this.importService.getStagingRecords(
        user.tenant_id,
        isLive,
        parseInt(sessionId),
        {
          page: parseInt(page as string),
          pageSize: parseInt(pageSize as string),
          status: status as string
        }
      );

      const session = await this.importService.getImportSession(
        user.tenant_id,
        isLive,
        parseInt(sessionId)
      );

      res.json({
        success: true,
        data: {
          session,
          records: stagingRecords.records,
          pagination: {
            page: stagingRecords.page,
            pageSize: stagingRecords.pageSize,
            total: stagingRecords.total,
            totalPages: stagingRecords.totalPages
          },
          summary: {
            totalRows: session?.total_records || 0,
            successfulRows: session?.successful_records || 0,
            failedRows: session?.failed_records || 0,
            duplicateRows: session?.duplicate_records || 0
          }
        }
      });

    } catch (error: any) {
      console.error('Error getting import results:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  };

  /**
   * Cancel processing
   */
  cancelProcessing = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const { sessionId } = req.params;
      const isLive = req.headers['x-environment'] === 'live';

      await this.importService.cancelImportSession(
        user.tenant_id,
        isLive,
        parseInt(sessionId)
      );

      res.json({
        success: true,
        message: 'Import session cancelled'
      });

    } catch (error: any) {
      console.error('Error cancelling session:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  };

  /**
   * Get templates
   */
  getTemplates = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const { importType } = req.query;
      const isLive = req.headers['x-environment'] === 'live';

      const templates = await this.importService.getImportTemplates(
        user.tenant_id,
        isLive,
        importType as string
      );

      res.json({
        success: true,
        data: templates
      });

    } catch (error: any) {
      console.error('Error getting templates:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  };

  /**
   * Save template
   */
  saveTemplate = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const { templateName, importType, mappings, isDefault } = req.body;
      const isLive = req.headers['x-environment'] === 'live';

      if (!templateName || !importType || !mappings) {
        res.status(400).json({
          success: false,
          error: 'Template name, import type, and mappings are required'
        });
        return;
      }

      const template = await this.importService.saveImportTemplate({
        templateName,
        importType,
        mappings,
        isDefault: isDefault || false,
        tenantId: user.tenant_id,
        isLive,
        createdBy: user.user_id
      });

      res.json({
        success: true,
        data: template
      });

    } catch (error: any) {
      console.error('Error saving template:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  };

  /**
   * Update template
   */
  updateTemplate = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const { templateId } = req.params;
      const { templateName, mappings, isDefault } = req.body;
      const isLive = req.headers['x-environment'] === 'live';

      // Direct database update
      await this.db.query(
        `UPDATE t_import_field_mappings 
         SET template_name = COALESCE($1, template_name),
             field_mappings = COALESCE($2, field_mappings),
             is_default = COALESCE($3, is_default),
             template_version = template_version + 1,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $4 AND tenant_id = $5 AND is_live = $6`,
        [
          templateName || null,
          mappings ? JSON.stringify({ mappings }) : null,
          isDefault !== undefined ? isDefault : null,
          parseInt(templateId),
          user.tenant_id,
          isLive
        ]
      );

      res.json({
        success: true,
        message: 'Template updated successfully'
      });

    } catch (error: any) {
      console.error('Error updating template:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  };

  /**
   * Delete template
   */
  deleteTemplate = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const { templateId } = req.params;
      const isLive = req.headers['x-environment'] === 'live';

      // Direct database update
      await this.db.query(
        `UPDATE t_import_field_mappings 
         SET is_active = false, updated_at = CURRENT_TIMESTAMP
         WHERE id = $1 AND tenant_id = $2 AND is_live = $3`,
        [parseInt(templateId), user.tenant_id, isLive]
      );

      res.json({
        success: true,
        message: 'Template deleted successfully'
      });

    } catch (error: any) {
      console.error('Error deleting template:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  };

  /**
   * Get import sessions
   */
  getImportSessions = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const { page = 1, pageSize = 20, status } = req.query;
      const isLive = req.headers['x-environment'] === 'live';
      const offset = (parseInt(page as string) - 1) * parseInt(pageSize as string);

      let query = `
        SELECT s.*, f.original_filename 
        FROM t_import_sessions s
        LEFT JOIN t_file_uploads f ON s.file_upload_id = f.id
        WHERE s.tenant_id = $1 AND s.is_live = $2
      `;
      const params: any[] = [user.tenant_id, isLive];

      if (status) {
        params.push(status);
        query += ` AND s.status = $${params.length}`;
      }

      query += ` ORDER BY s.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
      params.push(parseInt(pageSize as string), offset);

      const result = await this.db.query(query, params);

      // Get total count
      let countQuery = `
        SELECT COUNT(*) as total 
        FROM t_import_sessions 
        WHERE tenant_id = $1 AND is_live = $2
      `;
      const countParams: any[] = [user.tenant_id, isLive];

      if (status) {
        countParams.push(status);
        countQuery += ` AND status = $${countParams.length}`;
      }

      const countResult = await this.db.query(countQuery, countParams);
      const total = parseInt(countResult.rows[0].total);

      res.json({
        success: true,
        data: {
          sessions: result.rows,
          pagination: {
            page: parseInt(page as string),
            pageSize: parseInt(pageSize as string),
            total,
            totalPages: Math.ceil(total / parseInt(pageSize as string))
          }
        }
      });

    } catch (error: any) {
      console.error('Error getting import sessions:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  };

  /**
   * Export errors
   */
  exportErrors = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const { sessionId } = req.params;
      const isLive = req.headers['x-environment'] === 'live';

      // Get failed records directly from database
      const result = await this.db.query(
        `SELECT row_number, raw_data, error_messages, warnings, processed_at
         FROM t_import_staging_data
         WHERE session_id = $1 AND tenant_id = $2 AND is_live = $3 
         AND processing_status = 'failed'
         ORDER BY row_number`,
        [parseInt(sessionId), user.tenant_id, isLive]
      );

      if (result.rows.length === 0) {
        res.status(404).json({ 
          success: false, 
          error: 'No error records found' 
        });
        return;
      }

      // Create CSV content
      const csvRows = ['Row Number,Original Data,Errors,Warnings,Processed At'];
      
      result.rows.forEach((row: any) => {
        const originalData = JSON.stringify(row.raw_data).replace(/"/g, '""');
        const errors = (row.error_messages || []).join('; ').replace(/"/g, '""');
        const warnings = (row.warnings || []).join('; ').replace(/"/g, '""');
        csvRows.push(
          `${row.row_number},"${originalData}","${errors}","${warnings}",${row.processed_at || ''}`
        );
      });

      const csvContent = csvRows.join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=import_errors_${sessionId}.csv`);
      res.send(csvContent);

    } catch (error: any) {
      console.error('Error exporting errors:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  };

  /**
   * Handle N8N callback
   */
  handleN8NCallback = async (req: Request, res: Response): Promise<void> => {
    try {
      const { sessionId, status, results } = req.body;

      if (!sessionId || !status || !results) {
        res.status(400).json({ 
          success: false, 
          error: 'Invalid callback payload' 
        });
        return;
      }

      await this.n8nService.handleCallback(req.body);

      res.json({
        success: true,
        message: `Callback processed for session ${sessionId}`
      });

    } catch (error: any) {
      console.error('Error handling N8N callback:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  };

  /**
   * Get file info
   */
  getFileInfo = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const { fileId } = req.params;
      const isLive = req.headers['x-environment'] === 'live';

      const fileRecord = await this.importService.getFileUpload(
        user.tenant_id,
        isLive,
        parseInt(fileId)
      );

      if (!fileRecord) {
        res.status(404).json({ success: false, error: 'File not found' });
        return;
      }

      const fileExists = await fs.access(fileRecord.file_path)
        .then(() => true)
        .catch(() => false);

      res.json({
        success: true,
        data: {
          ...fileRecord,
          fileExists
        }
      });

    } catch (error: any) {
      console.error('Error getting file info:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  };

  /**
   * Delete file
   */
  deleteFile = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const { fileId } = req.params;
      const isLive = req.headers['x-environment'] === 'live';

      const fileRecord = await this.importService.getFileUpload(
        user.tenant_id,
        isLive,
        parseInt(fileId)
      );

      if (!fileRecord) {
        res.status(404).json({ success: false, error: 'File not found' });
        return;
      }

      // Check if file is in use
      const activeSession = await this.db.query(
        `SELECT id FROM t_import_sessions 
         WHERE file_upload_id = $1 AND status IN ('pending', 'processing')`,
        [parseInt(fileId)]
      );

      if (activeSession.rows.length > 0) {
        res.status(400).json({ 
          success: false, 
          error: 'Cannot delete file - it is being used in an active import session' 
        });
        return;
      }

      // Delete physical file
      try {
        await fs.unlink(fileRecord.file_path);
      } catch (error) {
        console.warn('File not found on disk:', fileRecord.file_path);
      }

      // Delete database record
      await this.importService.deleteFileUpload(
        user.tenant_id,
        isLive,
        parseInt(fileId)
      );

      res.json({
        success: true,
        message: 'File deleted successfully'
      });

    } catch (error: any) {
      console.error('Error deleting file:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  };

  /**
   * Get staging status
   */
  getStagingStatus = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const { sessionId } = req.params;
      const isLive = req.headers['x-environment'] === 'live';

      const statistics = await this.importService.getStagingStatistics(
        user.tenant_id,
        isLive,
        parseInt(sessionId)
      );

      res.json({
        success: true,
        data: statistics
      });

    } catch (error: any) {
      console.error('Error getting staging status:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  };

  /**
   * Get staging records
   */
  getStagingRecords = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const { sessionId } = req.params;
      const { page = 1, pageSize = 100, status } = req.query;
      const isLive = req.headers['x-environment'] === 'live';

      const result = await this.importService.getStagingRecords(
        user.tenant_id,
        isLive,
        parseInt(sessionId),
        {
          page: parseInt(page as string),
          pageSize: parseInt(pageSize as string),
          status: status as string
        }
      );

      res.json({
        success: true,
        data: result
      });

    } catch (error: any) {
      console.error('Error getting staging records:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  };

  /**
   * Reprocess failed records
   */
  reprocessFailedRecords = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const { sessionId } = req.params;
      const isLive = req.headers['x-environment'] === 'live';

      const result = await this.importService.resetFailedRecords(
        user.tenant_id,
        isLive,
        parseInt(sessionId)
      );

      if (result.resetCount === 0) {
        res.json({
          success: true,
          data: {
            message: 'No failed records to reprocess',
            resetCount: 0
          }
        });
        return;
      }

      res.json({
        success: true,
        data: {
          message: `Reprocessing ${result.resetCount} failed records`,
          resetCount: result.resetCount
        }
      });

    } catch (error: any) {
      console.error('Error reprocessing failed records:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  };
}