// backend/src/controllers/import.controller.ts
import { Request, Response } from 'express';
import { ImportService } from '../services/import.service';
import { N8NIntegrationService } from '../services/n8nIntegration.service';
import { FileParserService } from '../services/fileparser.service';
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
        const customerPath = 'UserFiles/customers';
        const transactionPath = 'UserFiles/transactions';
        const schemePath = 'UserFiles/schemes';
        
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
        const dirs = ['UserFiles/customers', 'UserFiles/transactions', 'UserFiles/schemes'];
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

      const { fileId, mappings, sessionName, customerLookupMethod } = req.body;
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
        const customerPath = 'UserFiles/customers';
        const transactionPath = 'UserFiles/transactions';
        const schemePath = 'UserFiles/schemes';
        
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

      // Create import session with validation
      const sessionResult = await this.importService.createImportSessionWithValidation({
        sessionName,
        fileUploadId: parseInt(fileId),
        tenantId: user.tenant_id,
        isLive,
        importType,
        createdBy: user.user_id
      });

      // Check if session creation was blocked due to missing prerequisites
      if (!sessionResult.allowed) {
        console.warn(`Session creation blocked for tenant ${user.tenant_id}: ${sessionResult.reason}`);
        res.status(400).json({
          success: false,
          error: sessionResult.reason || 'Import prerequisites not met'
        });
        return;
      }

      const session = sessionResult.session!;
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
          mappings,
          customerLookupMethod: customerLookupMethod || 'iwell_code'
        });

        console.log('Staging completed, triggering processing for session:', session.id, 'type:', importType);
        
        // Use the same database processing for all import types
        let processingResult: { success: boolean; error?: string };
        const targetDuration = 900000;
        
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

      // Extract orphan_records from processing_metadata and add as top-level field
      const sessionsWithOrphans = result.rows.map((session: any) => {
        const orphanRecords = session.processing_metadata?.orphan_records || 0;
        return {
          ...session,
          orphan_records: orphanRecords
        };
      });

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
          sessions: sessionsWithOrphans,
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
      // Support both offset/limit (from frontend) and page/pageSize formats
      const { page, pageSize, offset, limit, status } = req.query;
      const isLive = req.headers['x-environment'] === 'live';

      // Calculate page/pageSize from offset/limit if provided
      let calculatedPage = 1;
      let calculatedPageSize = 50;

      if (offset !== undefined && limit !== undefined) {
        // Frontend sends offset and limit
        calculatedPageSize = parseInt(limit as string) || 50;
        calculatedPage = Math.floor(parseInt(offset as string) / calculatedPageSize) + 1;
      } else {
        // Fallback to page/pageSize
        calculatedPage = parseInt(page as string) || 1;
        calculatedPageSize = parseInt(pageSize as string) || 50;
      }

      const result = await this.importService.getStagingRecords(
        user.tenant_id,
        isLive,
        parseInt(sessionId),
        {
          page: calculatedPage,
          pageSize: calculatedPageSize,
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

  /**
   * Delete staging data for a session
   * DELETE /api/import/staging/:sessionId
   */
  deleteStagingData = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const { sessionId } = req.params;
      const isLive = req.headers['x-environment'] === 'live';

      // Verify session belongs to user's tenant
      const sessionCheck = await this.db.query(
        `SELECT id, session_name, total_records, status, staging_data_deleted
         FROM t_import_sessions
         WHERE id = $1 AND tenant_id = $2 AND is_live = $3`,
        [parseInt(sessionId), user.tenant_id, isLive]
      );

      if (sessionCheck.rows.length === 0) {
        res.status(404).json({
          success: false,
          error: 'Session not found'
        });
        return;
      }

      const session = sessionCheck.rows[0];

      // Check if already deleted
      if (session.staging_data_deleted) {
        res.status(400).json({
          success: false,
          error: 'Staging data already deleted for this session'
        });
        return;
      }

      // Don't allow deletion if processing is in progress
      if (session.status === 'processing' || session.status === 'pending') {
        res.status(400).json({
          success: false,
          error: 'Cannot delete staging data while session is processing'
        });
        return;
      }

      // Delete staging records
      const deleteResult = await this.db.query(
        `DELETE FROM t_import_staging_data
         WHERE session_id = $1
         RETURNING id`,
        [parseInt(sessionId)]
      );

      const deletedCount = deleteResult.rowCount || 0;

      // Update session to mark staging as deleted
      await this.db.query(
        `UPDATE t_import_sessions
         SET
           staging_data_deleted = true,
           staging_deleted_at = CURRENT_TIMESTAMP,
           staging_deleted_by = $1,
           staging_deleted_reason = 'User deleted',
           updated_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [user.user_id, parseInt(sessionId)]
      );

      console.log(`User ${user.user_id} deleted ${deletedCount} staging records for session ${sessionId}`);

      res.json({
        success: true,
        data: {
          message: `Successfully deleted ${deletedCount} staging records`,
          deleted_count: deletedCount,
          session_id: parseInt(sessionId),
          session_name: session.session_name
        }
      });

    } catch (error: any) {
      console.error('Error deleting staging data:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to delete staging data'
      });
    }
  };

  /**
   * Check for filename duplicates (before upload)
   */
  checkFilenameDuplicate = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const { filename, fileSize } = req.body;
      const isLive = req.headers['x-environment'] === 'live';

      if (!filename || !fileSize) {
        res.status(400).json({
          success: false,
          error: 'Filename and file size are required'
        });
        return;
      }

      const duplicateCheck = await this.importService.checkFilenameDuplicate(
        user.tenant_id,
        isLive,
        filename,
        parseInt(fileSize)
      );

      res.json({
        success: true,
        data: duplicateCheck
      });

    } catch (error: any) {
      console.error('Error checking filename duplicate:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to check filename duplicate'
      });
    }
  };

  /**
   * Check for session-level duplicates (after staging)
   */
  checkSessionDuplicates = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const { sessionId } = req.params;
      const isLive = req.headers['x-environment'] === 'live';

      if (!sessionId) {
        res.status(400).json({
          success: false,
          error: 'Session ID is required'
        });
        return;
      }

      // Verify session ownership
      const session = await this.importService.getImportSession(
        user.tenant_id,
        isLive,
        parseInt(sessionId)
      );

      if (!session) {
        res.status(404).json({
          success: false,
          error: 'Session not found'
        });
        return;
      }

      const duplicateCheck = await this.importService.checkSessionDuplicatePercentage(
        parseInt(sessionId)
      );

      res.json({
        success: true,
        data: duplicateCheck
      });

    } catch (error: any) {
      console.error('Error checking session duplicates:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to check session duplicates'
      });
    }
  };

  /**
   * Save user's duplicate classification decision
   */
  saveDuplicateDecision = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const { sessionId } = req.params;
      const { classification, duplicateCheckResult } = req.body;
      const isLive = req.headers['x-environment'] === 'live';

      if (!sessionId || !classification) {
        res.status(400).json({
          success: false,
          error: 'Session ID and classification are required'
        });
        return;
      }

      if (!['user_marked_duplicate', 'user_marked_legitimate'].includes(classification)) {
        res.status(400).json({
          success: false,
          error: 'Invalid classification. Must be "user_marked_duplicate" or "user_marked_legitimate"'
        });
        return;
      }

      // Verify session ownership
      const session = await this.importService.getImportSession(
        user.tenant_id,
        isLive,
        parseInt(sessionId)
      );

      if (!session) {
        res.status(404).json({
          success: false,
          error: 'Session not found'
        });
        return;
      }

      await this.importService.saveDuplicateClassification(
        user.tenant_id,
        isLive,
        parseInt(sessionId),
        classification,
        duplicateCheckResult
      );

      res.json({
        success: true,
        data: {
          message: 'Duplicate classification saved successfully',
          sessionId: parseInt(sessionId),
          classification
        }
      });

    } catch (error: any) {
      console.error('Error saving duplicate decision:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to save duplicate decision'
      });
    }
  };

  // ========================================================================
  // NEW ENDPOINTS: Session Restart and Record Reprocessing
  // ========================================================================

  /**
   * POST /api/import/restart/:sessionId
   * Restart a timed-out or failed import session
   */
  restartSession = async (req: any, res: Response): Promise<void> => {
    try {
      const user = req.user;
      const { sessionId } = req.params;
      const isLive = req.headers['x-environment'] === 'live';

      if (!sessionId) {
        res.status(400).json({
          success: false,
          error: 'Session ID is required'
        });
        return;
      }

      // Verify session ownership
      const session = await this.importService.getImportSession(
        user.tenant_id,
        isLive,
        parseInt(sessionId)
      );

      if (!session) {
        res.status(404).json({
          success: false,
          error: 'Session not found'
        });
        return;
      }

      console.log(`[ImportController] Restarting session ${sessionId} for tenant ${user.tenant_id}`);

      const result = await this.importService.restartSession(
        parseInt(sessionId),
        user.tenant_id,
        isLive
      );

      if (result.success) {
        res.json({
          success: true,
          data: {
            message: result.message,
            sessionId: parseInt(sessionId)
          }
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.message
        });
      }

    } catch (error: any) {
      console.error('Error restarting session:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to restart session'
      });
    }
  };

  /**
   * PUT /api/import/staging/:stagingId/edit
   * Edit a staging record's mapped data
   */
  editStagingRecord = async (req: any, res: Response): Promise<void> => {
    try {
      const user = req.user;
      const { stagingId } = req.params;
      const { editedData } = req.body;
      const isLive = req.headers['x-environment'] === 'live';

      if (!stagingId || !editedData) {
        res.status(400).json({
          success: false,
          error: 'Staging ID and edited data are required'
        });
        return;
      }

      console.log(`[ImportController] Editing staging record ${stagingId} for tenant ${user.tenant_id}`);

      const result = await this.importService.editStagingRecord(
        parseInt(stagingId),
        editedData,
        user.user_id,
        user.tenant_id,
        isLive
      );

      if (result.success) {
        res.json({
          success: true,
          data: {
            message: result.message,
            stagingId: parseInt(stagingId)
          }
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.message
        });
      }

    } catch (error: any) {
      console.error('Error editing staging record:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to edit staging record'
      });
    }
  };

  /**
   * POST /api/import/staging/:stagingId/reprocess
   * Reprocess a single staging record
   */
  reprocessSingleRecord = async (req: any, res: Response): Promise<void> => {
    try {
      const user = req.user;
      const { stagingId } = req.params;
      const isLive = req.headers['x-environment'] === 'live';

      if (!stagingId) {
        res.status(400).json({
          success: false,
          error: 'Staging ID is required'
        });
        return;
      }

      console.log(`[ImportController] Reprocessing staging record ${stagingId} for tenant ${user.tenant_id}`);

      const result = await this.importService.reprocessSingleRecord(
        parseInt(stagingId),
        user.tenant_id,
        isLive
      );

      if (result.success) {
        res.json({
          success: true,
          data: {
            message: result.message,
            stagingId: parseInt(stagingId),
            status: result.status
          }
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.message,
          status: result.status
        });
      }

    } catch (error: any) {
      console.error('Error reprocessing staging record:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to reprocess staging record'
      });
    }
  };

  /**
   * POST /api/import/session/:sessionId/bulk-reprocess
   * Bulk reprocess multiple staging records
   */
  bulkReprocessRecords = async (req: any, res: Response): Promise<void> => {
    try {
      const user = req.user;
      const { sessionId } = req.params;
      const { recordIds } = req.body;
      const isLive = req.headers['x-environment'] === 'live';

      if (!sessionId || !recordIds || !Array.isArray(recordIds) || recordIds.length === 0) {
        res.status(400).json({
          success: false,
          error: 'Session ID and record IDs array are required'
        });
        return;
      }

      // Verify session ownership
      const session = await this.importService.getImportSession(
        user.tenant_id,
        isLive,
        parseInt(sessionId)
      );

      if (!session) {
        res.status(404).json({
          success: false,
          error: 'Session not found'
        });
        return;
      }

      console.log(`[ImportController] Bulk reprocessing ${recordIds.length} records for session ${sessionId}`);

      const result = await this.importService.bulkReprocessRecords(
        parseInt(sessionId),
        recordIds.map((id: any) => parseInt(id)),
        user.tenant_id,
        isLive
      );

      res.json({
        success: true,
        data: {
          message: result.message,
          sessionId: parseInt(sessionId),
          processed: result.processed,
          successful: result.successful,
          failed: result.failed
        }
      });

    } catch (error: any) {
      console.error('Error bulk reprocessing records:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to bulk reprocess records'
      });
    }
  };

  /**
   * Check date issues in a transaction import session
   * Compares raw_data TRANSACTION DATE (DD/MM/YYYY) with mapped_data txn_date
   */
  checkDateIssues = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const { sessionId } = req.params;
      const isLive = req.headers['x-environment'] === 'live';

      // Verify session exists and is a transaction import
      const sessionResult = await this.db.query(
        `SELECT id, import_type, status, total_records
         FROM t_import_sessions
         WHERE id = $1 AND tenant_id = $2 AND is_live = $3`,
        [sessionId, user.tenant_id, isLive]
      );

      if (sessionResult.rows.length === 0) {
        res.status(404).json({ success: false, error: 'Session not found' });
        return;
      }

      const session = sessionResult.rows[0];
      const isTransaction = session.import_type === 'transaction_import' || session.import_type === 'TransactionData';
      if (!isTransaction) {
        res.json({
          success: true,
          data: {
            sessionId: parseInt(sessionId),
            importType: session.import_type,
            isTransactionImport: false,
            message: 'Date check is only applicable for transaction imports'
          }
        });
        return;
      }

      // Use a single client so pg_temp function is available for the check query
      const client = await this.db.connect();
      try {
        // Safe date parsing helper function (handles bad date formats)
        await client.query(`
          CREATE OR REPLACE FUNCTION pg_temp.safe_to_date(text, text)
          RETURNS date AS $$
          BEGIN
            RETURN TO_DATE($1, $2);
          EXCEPTION WHEN OTHERS THEN
            RETURN NULL;
          END;
          $$ LANGUAGE plpgsql IMMUTABLE;
        `);

        // Check all staging records: compare raw date vs mapped date
        const checkResult = await client.query(
          `SELECT
            COUNT(*) AS total_records,
            COUNT(*) FILTER (
              WHERE raw_data->>'TRANSACTION DATE' IS NOT NULL
                AND mapped_data->>'txn_date' IS NOT NULL
                AND pg_temp.safe_to_date(raw_data->>'TRANSACTION DATE', 'DD/MM/YYYY') IS NOT NULL
                AND (mapped_data->>'txn_date')::date = pg_temp.safe_to_date(raw_data->>'TRANSACTION DATE', 'DD/MM/YYYY')
            ) AS correct_dates,
            COUNT(*) FILTER (
              WHERE raw_data->>'TRANSACTION DATE' IS NOT NULL
                AND mapped_data->>'txn_date' IS NOT NULL
                AND pg_temp.safe_to_date(raw_data->>'TRANSACTION DATE', 'DD/MM/YYYY') IS NOT NULL
                AND (mapped_data->>'txn_date')::date != pg_temp.safe_to_date(raw_data->>'TRANSACTION DATE', 'DD/MM/YYYY')
            ) AS wrong_dates,
            COUNT(*) FILTER (
              WHERE raw_data->>'TRANSACTION DATE' IS NULL
                OR mapped_data->>'txn_date' IS NULL
                OR pg_temp.safe_to_date(raw_data->>'TRANSACTION DATE', 'DD/MM/YYYY') IS NULL
            ) AS no_date,
            MAX((mapped_data->>'txn_date')::date) AS max_txn_date,
            MIN((mapped_data->>'txn_date')::date) AS min_txn_date
          FROM t_import_staging_data
          WHERE session_id = $1
            AND processing_status IN ('success', 'duplicate')`,
          [sessionId]
        );

        const stats = checkResult.rows[0];

        res.json({
          success: true,
          data: {
            sessionId: parseInt(sessionId),
            isTransactionImport: true,
            totalRecords: parseInt(stats.total_records),
            correctDates: parseInt(stats.correct_dates),
            wrongDates: parseInt(stats.wrong_dates),
            noDate: parseInt(stats.no_date),
            hasIssues: parseInt(stats.wrong_dates) > 0,
            maxTxnDate: stats.max_txn_date || null,
            minTxnDate: stats.min_txn_date || null
          }
        });
      } finally {
        client.release();
      }
    } catch (error: any) {
      console.error('Error checking date issues:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to check date issues'
      });
    }
  };

  /**
   * Correct date issues in a transaction import session
   * Re-parses raw TRANSACTION DATE (DD/MM/YYYY) and updates staging + transaction table
   */
  correctDateIssues = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }

      const { sessionId } = req.params;
      const isLive = req.headers['x-environment'] === 'live';

      // Verify session exists and is a transaction import
      const sessionResult = await this.db.query(
        `SELECT id, import_type FROM t_import_sessions
         WHERE id = $1 AND tenant_id = $2 AND is_live = $3`,
        [sessionId, user.tenant_id, isLive]
      );

      if (sessionResult.rows.length === 0) {
        res.status(404).json({ success: false, error: 'Session not found' });
        return;
      }

      const importType = sessionResult.rows[0].import_type;
      if (importType !== 'transaction_import' && importType !== 'TransactionData') {
        res.status(400).json({ success: false, error: 'Date correction is only applicable for transaction imports' });
        return;
      }

      // Use a single client for temp function + queries + updates
      const client = await this.db.connect();
      try {
        await client.query('BEGIN');

        // Safe date parsing helper
        await client.query(`
          CREATE OR REPLACE FUNCTION pg_temp.safe_to_date(text, text)
          RETURNS date AS $$
          BEGIN
            RETURN TO_DATE($1, $2);
          EXCEPTION WHEN OTHERS THEN
            RETURN NULL;
          END;
          $$ LANGUAGE plpgsql IMMUTABLE;
        `);

        // Find all staging records with wrong dates
        const wrongRecords = await client.query(
          `SELECT
            s.id AS staging_id,
            s.raw_data->>'TRANSACTION DATE' AS raw_date,
            s.mapped_data->>'txn_date' AS mapped_date,
            TO_CHAR(pg_temp.safe_to_date(s.raw_data->>'TRANSACTION DATE', 'DD/MM/YYYY'), 'YYYY-MM-DD') AS correct_date,
            t.id AS transaction_id
          FROM t_import_staging_data s
          LEFT JOIN t_transaction_table t ON t.staging_record_id = s.id
          WHERE s.session_id = $1
            AND s.processing_status IN ('success', 'duplicate')
            AND s.raw_data->>'TRANSACTION DATE' IS NOT NULL
            AND s.mapped_data->>'txn_date' IS NOT NULL
            AND pg_temp.safe_to_date(s.raw_data->>'TRANSACTION DATE', 'DD/MM/YYYY') IS NOT NULL
            AND (s.mapped_data->>'txn_date')::date != pg_temp.safe_to_date(s.raw_data->>'TRANSACTION DATE', 'DD/MM/YYYY')`,
          [sessionId]
        );

        if (wrongRecords.rows.length === 0) {
          await client.query('COMMIT');
          res.json({
            success: true,
            data: {
              sessionId: parseInt(sessionId),
              corrected: 0,
              stagingUpdated: 0,
              transactionsUpdated: 0,
              message: 'No date issues found. All dates are correct.'
            }
          });
          return;
        }

        let stagingUpdated = 0;
        let transactionsUpdated = 0;

        for (const record of wrongRecords.rows) {
          // Update staging mapped_data.txn_date
          await client.query(
            `UPDATE t_import_staging_data
             SET mapped_data = jsonb_set(mapped_data, '{txn_date}', to_jsonb($1::text)),
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $2`,
            [record.correct_date, record.staging_id]
          );
          stagingUpdated++;

          // Update transaction table txn_date
          if (record.transaction_id) {
            await client.query(
              `UPDATE t_transaction_table
               SET txn_date = $1::date,
                   updated_at = CURRENT_TIMESTAMP
               WHERE id = $2`,
              [record.correct_date, record.transaction_id]
            );
            transactionsUpdated++;
          }
        }

        await client.query('COMMIT');

        res.json({
          success: true,
          data: {
            sessionId: parseInt(sessionId),
            corrected: wrongRecords.rows.length,
            stagingUpdated,
            transactionsUpdated,
            message: `All ${wrongRecords.rows.length} records have been corrected. Transactions and monthly sheets will now show correct month data.`
          }
        });

      } catch (txError) {
        await client.query('ROLLBACK');
        throw txError;
      } finally {
        client.release();
      }

    } catch (error: any) {
      console.error('Error correcting date issues:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to correct date issues'
      });
    }
  };
}