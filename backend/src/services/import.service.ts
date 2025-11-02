// backend/src/services/import.service.ts
import { Pool } from 'pg';
import { pool } from '../config/database';
import { SimpleLogger } from './simpleLogger.service';
import { 
  FileUpload, 
  ImportSession, 
  ImportFieldMapping,
  FileImportType,
  ValidationResult
} from '../types/import.types';
import { FileParserService } from './fileparser.service';
import { StagingService, StagingResult, StagingRecord } from './staging.service';
import { SchemeService } from './scheme.service';
import { BookmarkImportService } from './bookmarkImport.service';

interface CreateFileUploadParams {
  tenantId: number;
  isLive: boolean;
  fileType: FileImportType;
  originalFilename: string;
  storedFilename: string;
  filePath: string;
  folderPath: string;
  fileSize: number;
  mimeType: string;
  uploadedBy: number;
  fileHash?: string; // Optional SHA256 hash for duplicate detection
}

interface CreateImportSessionParams {
  sessionName: string;
  fileUploadId: number;
  tenantId: number;
  isLive: boolean;
  importType: FileImportType;
  createdBy: number;
  customerLookupMethod?: string;
}

interface SaveTemplateParams {
  templateName: string;
  importType: FileImportType;
  mappings: any[];
  isDefault: boolean;
  tenantId: number;
  isLive: boolean;
  createdBy: number;
}

interface GetResultsParams {
  page: number;
  pageSize: number;
  status?: string;
}

export class ImportService {
  private db: Pool;
  private fileParser: FileParserService;
  private stagingService: StagingService;

  // Map frontend values to database values for t_file_uploads
  private fileTypeMap: Record<string, string> = {
    'BookmarkData': 'bookmark_import',
    'CustomerData': 'customer_import',
    'TransactionData': 'transaction_import',
    'SchemeData': 'scheme_import' 
  };

  // Reverse map for database to frontend
  private fileTypeReverseMap: Record<string, string> = {
    'bookmark_import': 'BookmarkData',
    'customer_import': 'CustomerData',
    'transaction_import': 'TransactionData',
    'scheme_import': 'SchemeData'
  };

  constructor() {
    this.db = pool;
    this.fileParser = new FileParserService();
    this.stagingService = new StagingService();
  }

  /**
   * Type guard for customer lookup method
   */
  private validateLookupMethod(method: any): 'iwell_code' | 'customer_name' | 'both' {
    if (method === 'customer_name' || method === 'both') {
      return method;
    }
    return 'iwell_code';
  }

  /**
   * Validate prerequisites before allowing transaction import
   * Ensures bookmarks exist before transactions can be imported
   */
  async validateTransactionImportPrerequisites(
    tenantId: number,
    isLive: boolean
  ): Promise<{ allowed: boolean; reason?: string; bookmark_count?: number }> {
    try {
      const bookmarkService = new BookmarkImportService();
      
      // Check if tenant has any bookmarks
      const hasBookmarks = await bookmarkService.hasBookmarks(tenantId, isLive);
      
      if (!hasBookmarks) {
        return {
          allowed: false,
          reason: 'No scheme bookmarks found. Please import scheme bookmarks before importing transactions.',
          bookmark_count: 0
        };
      }

      // Get bookmark count for additional context
      const stats = await bookmarkService.getBookmarkStats(tenantId, isLive);
      
      // Optional: Warn if bookmark count is very low
      if (stats.total_bookmarks < 10) {
        console.warn(`[ImportService] Tenant ${tenantId} has only ${stats.total_bookmarks} bookmarks. Transaction matching may be limited.`);
      }

      return {
        allowed: true,
        bookmark_count: stats.total_bookmarks
      };

    } catch (error: any) {
      console.error('[ImportService] Error validating prerequisites:', error);
      SimpleLogger.error('ImportService', 'Failed to validate transaction import prerequisites', 'validateTransactionImportPrerequisites', {
        tenantId, isLive, error: error.message
      }, undefined, tenantId, error.stack);
      
      // On error, allow import but log the issue
      return {
        allowed: true,
        reason: 'Warning: Could not verify bookmark status. Proceed with caution.'
      };
    }
  }

  /**
   * Check for filename duplicates before upload
   */
  async checkFilenameDuplicate(
    tenantId: number,
    isLive: boolean,
    filename: string,
    fileSize: number
  ): Promise<any> {
    try {
      const query = `SELECT check_filename_duplicate($1, $2, $3, $4) as result`;

      const result = await this.db.query(query, [
        tenantId,
        isLive,
        filename,
        fileSize
      ]);

      return result.rows[0].result;
    } catch (error: any) {
      console.error('Error checking filename duplicate:', error);
      SimpleLogger.error('ImportService', 'Filename duplicate check failed', 'checkFilenameDuplicate', {
        tenantId, isLive, filename, fileSize, error: error.message
      }, undefined, tenantId, error.stack);
      throw error;
    }
  }

  /**
   * Create file upload record
   */
  async createFileUpload(params: CreateFileUploadParams): Promise<FileUpload> {
    try {
      // Map frontend file type to database file type for t_file_uploads
      const dbFileType = this.fileTypeMap[params.fileType] || params.fileType;

      const query = `
        INSERT INTO t_file_uploads (
          tenant_id, is_live, file_type, original_filename, stored_filename,
          file_path, folder_path, file_size, mime_type, file_hash, uploaded_by,
          processing_status, processed_records, failed_records
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING *
      `;

      const result = await this.db.query(query, [
        params.tenantId,
        params.isLive,
        dbFileType, // Use mapped value for t_file_uploads
        params.originalFilename,
        params.storedFilename,
        params.filePath,
        params.folderPath,
        params.fileSize,
        params.mimeType,
        params.fileHash || null, // file_hash (optional)
        params.uploadedBy,
        'pending', // processing_status
        0, // processed_records
        0  // failed_records
      ]);

      // Map back to frontend format in the returned object
      const fileUpload = result.rows[0];
      if (fileUpload && this.fileTypeReverseMap[fileUpload.file_type]) {
        fileUpload.file_type = this.fileTypeReverseMap[fileUpload.file_type];
      }

      return fileUpload;
    } catch (error: any) {
      console.error('Error creating file upload:', error);
      SimpleLogger.error('ImportService', 'Failed to create file upload record', 'createFileUpload', {
        tenantId: params.tenantId,
        fileType: params.fileType,
        filename: params.originalFilename,
        error: error.message
      }, params.uploadedBy, params.tenantId, error.stack);
      throw error;
    }
  }

  /**
   * Get file upload record
   */
  async getFileUpload(tenantId: number, isLive: boolean, fileId: number): Promise<FileUpload | null> {
    try {
      const query = `
        SELECT * FROM t_file_uploads
        WHERE id = $1 AND tenant_id = $2 AND is_live = $3
      `;

      const result = await this.db.query(query, [fileId, tenantId, isLive]);
      
      if (result.rows[0]) {
        const fileUpload = result.rows[0];
        // Map database file type back to frontend format
        if (fileUpload.file_type && this.fileTypeReverseMap[fileUpload.file_type]) {
          fileUpload.file_type = this.fileTypeReverseMap[fileUpload.file_type];
        }
        return fileUpload;
      }
      
      return null;
    } catch (error: any) {
      console.error('Error getting file upload:', error);
      SimpleLogger.error('ImportService', 'Failed to retrieve file upload record', 'getFileUpload', { 
        fileId, tenantId, isLive, error: error.message 
      }, undefined, tenantId, error.stack);
      throw error;
    }
  }

  /**
   * Create import session
   */
 async createImportSession(params: CreateImportSessionParams): Promise<ImportSession> {
  try {
    // Validate and normalize customer lookup method
    const lookupMethod = this.validateLookupMethod(params.customerLookupMethod);

    // t_import_sessions expects frontend format (CustomerData, TransactionData)
    // so we DON'T map here
    const query = `
      INSERT INTO t_import_sessions (
        session_name, file_upload_id, tenant_id, is_live, import_type,
        status, total_records, processed_records, successful_records,
        failed_records, duplicate_records, created_by, customer_lookup_method
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `;

    const result = await this.db.query(query, [
      params.sessionName,
      params.fileUploadId,
      params.tenantId,
      params.isLive,
      params.importType, // Use original value for t_import_sessions
      'pending', // status
      0, // total_records
      0, // processed_records
      0, // successful_records
      0, // failed_records
      0, // duplicate_records
      params.createdBy,
      lookupMethod  // ✅ Now properly typed
    ]);

    return result.rows[0];
  } catch (error: any) {
    console.error('Error creating import session:', error);
    SimpleLogger.error('ImportService', 'Failed to create import session', 'createImportSession', { 
      sessionName: params.sessionName,
      importType: params.importType,
      tenantId: params.tenantId,
      error: error.message 
    }, params.createdBy, params.tenantId, error.stack);
    throw error;
  }
}
  /**
   * Create import session with prerequisite validation
   * UPDATED VERSION - adds bookmark validation
   */
  async createImportSessionWithValidation(params: CreateImportSessionParams): Promise<{
    session?: ImportSession;
    allowed: boolean;
    reason?: string;
  }> {
    try {
      // Only validate for transaction imports
      if (params.importType === 'TransactionData') {
        const validation = await this.validateTransactionImportPrerequisites(
          params.tenantId,
          params.isLive
        );
        
        if (!validation.allowed) {
          console.warn(`[ImportService] Transaction import blocked for tenant ${params.tenantId}: ${validation.reason}`);
          return {
            allowed: false,
            reason: validation.reason
          };
        }
        
        console.log(`[ImportService] Transaction import allowed for tenant ${params.tenantId}. Bookmarks: ${validation.bookmark_count}`);
      }

      // Create session normally
      const session = await this.createImportSession(params);
      
      return {
        session,
        allowed: true
      };

    } catch (error: any) {
      console.error('[ImportService] Error creating session with validation:', error);
      SimpleLogger.error('ImportService', 'Failed to create import session', 'createImportSessionWithValidation', {
        sessionName: params.sessionName,
        importType: params.importType,
        error: error.message
      }, params.createdBy, params.tenantId, error.stack);
      throw error;
    }
  }

  /**
   * Get import session
   */
  async getImportSession(tenantId: number, isLive: boolean, sessionId: number): Promise<ImportSession | null> {
    try {
      const query = `
        SELECT * FROM t_import_sessions
        WHERE id = $1 AND tenant_id = $2 AND is_live = $3
      `;

      const result = await this.db.query(query, [sessionId, tenantId, isLive]);
      
      if (result.rows[0]) {
        return result.rows[0];
      }
      
      return null;
    } catch (error: any) {
      console.error('Error getting import session:', error);
      SimpleLogger.error('ImportService', 'Failed to retrieve import session', 'getImportSession', { 
        sessionId, tenantId, isLive, error: error.message 
      }, undefined, tenantId, error.stack);
      throw error;
    }
  }

  /**
   * Update import session status
   */
  async updateImportSession(
    tenantId: number, 
    isLive: boolean, 
    sessionId: number, 
    updates: Partial<ImportSession>
  ): Promise<void> {
    try {
      const updateFields: string[] = [];
      const queryParams: any[] = [];
      let paramIndex = 1;

      // Build dynamic update query
      Object.keys(updates).forEach(key => {
        if (key !== 'id' && key !== 'tenant_id' && key !== 'is_live') {
          updateFields.push(`${key} = $${paramIndex}`);
          queryParams.push((updates as any)[key]);
          paramIndex++;
        }
      });

      if (updateFields.length === 0) return;

      updateFields.push('updated_at = CURRENT_TIMESTAMP');

      const query = `
        UPDATE t_import_sessions 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex} AND tenant_id = $${paramIndex + 1} AND is_live = $${paramIndex + 2}
      `;

      queryParams.push(sessionId, tenantId, isLive);
      await this.db.query(query, queryParams);

    } catch (error: any) {
      console.error('Error updating import session:', error);
      SimpleLogger.error('ImportService', 'Failed to update import session', 'updateImportSession', { 
        sessionId, tenantId, updates, error: error.message 
      }, undefined, tenantId, error.stack);
      throw error;
    }
  }

  /**
   * Cancel import session
   */
  async cancelImportSession(tenantId: number, isLive: boolean, sessionId: number): Promise<void> {
    try {
      const query = `
        UPDATE t_import_sessions 
        SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP
        WHERE id = $1 AND tenant_id = $2 AND is_live = $3
      `;

      await this.db.query(query, [sessionId, tenantId, isLive]);
    } catch (error: any) {
      console.error('Error cancelling import session:', error);
      SimpleLogger.error('ImportService', 'Failed to cancel import session', 'cancelImportSession', { 
        sessionId, tenantId, isLive, error: error.message 
      }, undefined, tenantId, error.stack);
      throw error;
    }
  }

  /**
   * Validate field mappings
   */
  async validateFieldMappings(fileRecord: FileUpload, mappings: any[]): Promise<ValidationResult> {
    try {
      // Basic validation - can be enhanced later
      const errors: any[] = [];
      const warnings: any[] = [];

      // Check if mappings exist
      if (!mappings || mappings.length === 0) {
        errors.push({
          field: 'mappings',
          message: 'Field mappings are required',
          code: 'MISSING_MAPPINGS'
        });
      }

      // Check for required field mappings based on import type
      // fileRecord.file_type is already in frontend format after getFileUpload
      if (fileRecord.file_type === 'CustomerData') {
        const requiredFields = ['name', 'prefix'];
        const mappedFields = mappings.map(m => m.target);
        
        requiredFields.forEach(field => {
          if (!mappedFields.includes(field)) {
            errors.push({
              field: field,
              message: `Required field '${field}' is not mapped`,
              code: 'MISSING_REQUIRED_FIELD'
            });
          }
        });
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings
      };

    } catch (error: any) {
      console.error('Error validating field mappings:', error);
      SimpleLogger.error('ImportService', 'Field mapping validation failed', 'validateFieldMappings', { 
        fileType: fileRecord.file_type, 
        mappingCount: mappings?.length || 0,
        error: error.message 
      }, undefined, undefined, error.stack);
      return {
        isValid: false,
        errors: [{ field: 'validation', message: 'Validation failed', code: 'VALIDATION_ERROR' }],
        warnings: []
      };
    }
  }

  /**
   * Get import templates
   */
  async getImportTemplates(tenantId: number, isLive: boolean, importType?: string): Promise<ImportFieldMapping[]> {
    try {
      let query = `
        SELECT * FROM t_import_field_mappings
        WHERE tenant_id = $1 AND is_live = $2 AND is_active = true
      `;
      const queryParams: any[] = [tenantId, isLive];

      if (importType) {
        // Check if t_import_field_mappings uses frontend or backend format
        // Assuming it uses backend format like t_file_uploads
        const dbImportType = this.fileTypeMap[importType] || importType;
        query += ` AND import_type = $3`;
        queryParams.push(dbImportType);
      }

      query += ` ORDER BY is_default DESC, template_name ASC`;

      const result = await this.db.query(query, queryParams);
      
      // Map database import types back to frontend format
      const templates = result.rows.map(template => {
        if (template.import_type && this.fileTypeReverseMap[template.import_type]) {
          template.import_type = this.fileTypeReverseMap[template.import_type];
        }
        return template;
      });
      
      return templates;
    } catch (error: any) {
      console.error('Error getting import templates:', error);
      SimpleLogger.error('ImportService', 'Failed to retrieve import templates', 'getImportTemplates', { 
        tenantId, isLive, importType, error: error.message 
      }, undefined, tenantId, error.stack);
      throw error;
    }
  }

  /**
   * Save import template
   */
  async saveImportTemplate(params: SaveTemplateParams): Promise<ImportFieldMapping> {
    try {
      // Map frontend import type to database format for t_import_field_mappings
      const dbImportType = this.fileTypeMap[params.importType] || params.importType;

      // If setting as default, unset other defaults for this import type
      if (params.isDefault) {
        await this.db.query(
          `UPDATE t_import_field_mappings 
           SET is_default = false 
           WHERE tenant_id = $1 AND is_live = $2 AND import_type = $3`,
          [params.tenantId, params.isLive, dbImportType]
        );
      }

      const query = `
        INSERT INTO t_import_field_mappings (
          tenant_id, is_live, import_type, template_name, template_version,
          field_mappings, is_default, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `;

      const result = await this.db.query(query, [
        params.tenantId,
        params.isLive,
        dbImportType, // Use mapped value
        params.templateName,
        1, // template_version
        JSON.stringify({ mappings: params.mappings }),
        params.isDefault,
        params.createdBy
      ]);

      // Map back to frontend format
      const template = result.rows[0];
      if (template && this.fileTypeReverseMap[template.import_type]) {
        template.import_type = this.fileTypeReverseMap[template.import_type];
      }

      return template;
    } catch (error: any) {
      console.error('Error saving import template:', error);
      SimpleLogger.error('ImportService', 'Failed to save import template', 'saveImportTemplate', { 
        templateName: params.templateName,
        importType: params.importType,
        tenantId: params.tenantId,
        error: error.message 
      }, params.createdBy, params.tenantId, error.stack);
      throw error;
    }
  }

  /**
   * Get import results
   */
  async getImportResults(
    tenantId: number, 
    isLive: boolean, 
    sessionId: number, 
    params: GetResultsParams
  ): Promise<any> {
    try {
      const { page = 1, pageSize = 20, status } = params;
      const offset = (page - 1) * pageSize;

      // Get session info
      const session = await this.getImportSession(tenantId, isLive, sessionId);
      if (!session) {
        throw new Error('Session not found');
      }

      // Build results query
      let resultsQuery = `
        SELECT * FROM t_import_record_results
        WHERE import_session_id = $1 AND tenant_id = $2 AND is_live = $3
      `;
      const queryParams: any[] = [sessionId, tenantId, isLive];
      
      if (status) {
        resultsQuery += ` AND status = $4`;
        queryParams.push(status);
      }

      resultsQuery += ` ORDER BY row_number ASC LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`;
      queryParams.push(pageSize, offset);

      const resultsResult = await this.db.query(resultsQuery, queryParams);

      // Get total count
      let countQuery = `
        SELECT COUNT(*) as total FROM t_import_record_results
        WHERE import_session_id = $1 AND tenant_id = $2 AND is_live = $3
      `;
      const countParams: any[] = [sessionId, tenantId, isLive];
      
      if (status) {
        countQuery += ` AND status = $4`;
        countParams.push(status);
      }

      const countResult = await this.db.query(countQuery, countParams);
      const total = parseInt(countResult.rows[0].total);

      return {
        session,
        records: resultsResult.rows,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
          hasNext: page * pageSize < total,
          hasPrev: page > 1
        },
        summary: {
          totalRows: session.total_records,
          successfulRows: session.successful_records,
          failedRows: session.failed_records,
          duplicateRows: session.duplicate_records,
          processingTime: session.processing_completed_at && session.processing_started_at ?
            new Date(session.processing_completed_at).getTime() - new Date(session.processing_started_at).getTime() :
            0
        }
      };

    } catch (error: any) {
      console.error('Error getting import results:', error);
      SimpleLogger.error('ImportService', 'Failed to retrieve import results', 'getImportResults', { 
        sessionId, tenantId, page: params.page, error: error.message 
      }, undefined, tenantId, error.stack);
      throw error;
    }
  }

  /**
   * Delete file upload
   */
  async deleteFileUpload(tenantId: number, isLive: boolean, fileId: number): Promise<void> {
    try {
      const query = `
        UPDATE t_file_uploads 
        SET is_active = false, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1 AND tenant_id = $2 AND is_live = $3
      `;

      await this.db.query(query, [fileId, tenantId, isLive]);
    } catch (error: any) {
      console.error('Error deleting file upload:', error);
      SimpleLogger.error('ImportService', 'Failed to delete file upload', 'deleteFileUpload', { 
        fileId, tenantId, isLive, error: error.message 
      }, undefined, tenantId, error.stack);
      throw error;
    }
  }

  /**
   * Check for session-level duplicates (for customer imports only)
   */
  async checkSessionDuplicatePercentage(sessionId: number): Promise<any> {
    try {
      const query = `SELECT check_session_duplicate_percentage($1) as result`;

      const result = await this.db.query(query, [sessionId]);

      return result.rows[0].result;
    } catch (error: any) {
      console.error('Error checking session duplicate percentage:', error);
      SimpleLogger.error('ImportService', 'Session duplicate check failed', 'checkSessionDuplicatePercentage', {
        sessionId, error: error.message
      }, undefined, undefined, error.stack);
      throw error;
    }
  }

  /**
   * Save duplicate classification decision by user
   */
  async saveDuplicateClassification(
    tenantId: number,
    isLive: boolean,
    sessionId: number,
    classification: 'user_marked_duplicate' | 'user_marked_legitimate',
    duplicateCheckResult: any
  ): Promise<void> {
    try {
      await this.updateImportSession(tenantId, isLive, sessionId, {
        duplicate_classification: classification,
        duplicate_check_result: duplicateCheckResult,
        duplicate_user_decision_at: new Date()
      });
    } catch (error: any) {
      console.error('Error saving duplicate classification:', error);
      SimpleLogger.error('ImportService', 'Failed to save duplicate classification', 'saveDuplicateClassification', {
        sessionId, tenantId, classification, error: error.message
      }, undefined, tenantId, error.stack);
      throw error;
    }
  }

  /**
   * Populate staging table from uploaded file
   */
  async populateStagingTable(params: {
    sessionId: number;
    tenantId: number;
    isLive: boolean;
    fileId: number;
    filePath: string;
    importType: string;
    mappings: any[];
    customerLookupMethod?: string; 
  }): Promise<StagingResult> {
    try {
      console.log(`[ImportService] Starting staging population for session ${params.sessionId}`);

      // Update current stage: parsing
      await this.updateImportSession(params.tenantId, params.isLive, params.sessionId, {
        current_stage: 'parsing'
      });

      // Validate file exists
      const fileRecord = await this.getFileUpload(params.tenantId, params.isLive, params.fileId);
      if (!fileRecord) {
        throw new Error(`File upload record ${params.fileId} not found`);
      }

      // Update current stage: staging
      await this.updateImportSession(params.tenantId, params.isLive, params.sessionId, {
        current_stage: 'staging'
      });

      // Call staging service to populate table
      const result = await this.stagingService.populateStagingTable({
        sessionId: params.sessionId,
        tenantId: params.tenantId,
        isLive: params.isLive,
        fileId: params.fileId,
        filePath: params.filePath,
        importType: params.importType,
        mappings: params.mappings
      });

      console.log(`[ImportService] Staging completed: ${result.totalRows} rows in ${result.duration}ms`);

      // Update file upload status
      await this.db.query(`
        UPDATE t_file_uploads
        SET
          processing_status = 'processing',
          processed_records = $1,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $2 AND tenant_id = $3 AND is_live = $4
      `, [result.totalRows, params.fileId, params.tenantId, params.isLive]);

      // Update current stage: validating
      await this.updateImportSession(params.tenantId, params.isLive, params.sessionId, {
        current_stage: 'validating',
        status: 'staged'
      });

      // Store customer lookup method if provided (for TransactionData imports)
if (params.customerLookupMethod) {
  const validatedMethod = this.validateLookupMethod(params.customerLookupMethod);
  await this.updateImportSession(params.tenantId, params.isLive, params.sessionId, {
    customer_lookup_method: validatedMethod
  });
}

      return result;

    } catch (error: any) {
      console.error('[ImportService] Staging population failed:', error);
      SimpleLogger.error('ImportService', 'Staging table population failed', 'populateStagingTable', {
        sessionId: params.sessionId,
        importType: params.importType,
        filePath: params.filePath,
        error: error.message
      }, undefined, params.tenantId, error.stack);

      // Update session with error
      await this.updateImportSession(params.tenantId, params.isLive, params.sessionId, {
        status: 'failed',
        current_stage: 'failed',
        error_summary: `Staging failed: ${error.message}`,
        processing_completed_at: new Date()
      });

      throw error;
    }
  }

  /**
   * Get staging records for a session
   */
  async getStagingRecords(
    tenantId: number,
    isLive: boolean,
    sessionId: number,
    params: {
      status?: string;
      page?: number;
      pageSize?: number;
    }
  ): Promise<{
    records: StagingRecord[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }> {
    try {
      const { status, page = 1, pageSize = 100 } = params;
      const offset = (page - 1) * pageSize;

      const result = await this.stagingService.getStagingRecords(
        sessionId,
        tenantId,
        isLive,
        { status, offset, limit: pageSize }
      );

      return {
        records: result.records,
        total: result.total,
        page,
        pageSize,
        totalPages: Math.ceil(result.total / pageSize)
      };

    } catch (error: any) {
      console.error('[ImportService] Error fetching staging records:', error);
      SimpleLogger.error('ImportService', 'Failed to fetch staging records', 'getStagingRecords', { 
        sessionId, tenantId, page: params.page, error: error.message 
      }, undefined, tenantId, error.stack);
      throw error;
    }
  }

  /**
   * Update staging record from N8N callback
   */
  async updateStagingRecord(
    recordId: number,
    updates: {
      processing_status?: string;
      error_messages?: string[];
      warnings?: string[];
      created_record_id?: number;
      created_record_type?: string;
    }
  ): Promise<void> {
    try {
      await this.stagingService.updateStagingRecord(recordId, updates);
    } catch (error: any) {
      console.error('[ImportService] Error updating staging record:', error);
      SimpleLogger.error('ImportService', 'Failed to update staging record', 'updateStagingRecord', { 
        recordId, updates, error: error.message 
      }, undefined, undefined, error.stack);
      throw error;
    }
  }

  /**
   * Batch update staging records
   */
  async batchUpdateStagingRecords(
    sessionId: number,
    updates: Array<{
      recordId: number;
      status: string;
      errorMessages?: string[];
      createdRecordId?: number;
      createdRecordType?: string;
    }>
  ): Promise<void> {
    const client = await this.db.connect();
    
    try {
      await client.query('BEGIN');

      // Update each record
      for (const update of updates) {
        await client.query(`
          UPDATE t_import_staging_data
          SET 
            processing_status = $1,
            error_messages = $2,
            created_record_id = $3,
            created_record_type = $4,
            processed_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = $5 AND session_id = $6
        `, [
          update.status,
          update.errorMessages || null,
          update.createdRecordId || null,
          update.createdRecordType || null,
          update.recordId,
          sessionId
        ]);
      }

      // Update session counters
      const statsResult = await client.query(`
        SELECT 
          COUNT(*) FILTER (WHERE processing_status = 'success') as success_count,
          COUNT(*) FILTER (WHERE processing_status = 'failed') as failed_count,
          COUNT(*) FILTER (WHERE processing_status = 'duplicate') as duplicate_count,
          COUNT(*) FILTER (WHERE processing_status IN ('success', 'failed', 'duplicate', 'skipped')) as processed_count
        FROM t_import_staging_data
        WHERE session_id = $1
      `, [sessionId]);

      const stats = statsResult.rows[0];

      await client.query(`
        UPDATE t_import_sessions
        SET 
          successful_records = $1,
          failed_records = $2,
          duplicate_records = $3,
          processed_records = $4,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $5
      `, [
        stats.success_count,
        stats.failed_count,
        stats.duplicate_count,
        stats.processed_count,
        sessionId
      ]);

      await client.query('COMMIT');

    } catch (error: any) {
      await client.query('ROLLBACK');
      console.error('[ImportService] Batch update failed:', error);
      SimpleLogger.error('ImportService', 'Batch staging update failed', 'batchUpdateStagingRecords', { 
        sessionId, updateCount: updates.length, error: error.message 
      }, undefined, undefined, error.stack);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get staging statistics for monitoring
   */
  async getStagingStatistics(
    tenantId: number,
    isLive: boolean,
    sessionId: number
  ): Promise<any> {
    try {
      const result = await this.stagingService.getStagingStatistics(
        sessionId,
        tenantId,
        isLive
      );

      // Add session info
      const session = await this.getImportSession(tenantId, isLive, sessionId);
      
      return {
        ...result,
        session: {
          id: session?.id,
          name: session?.session_name,
          status: session?.status,
          n8n_execution_id: session?.n8n_execution_id
        }
      };

    } catch (error: any) {
      console.error('[ImportService] Error fetching staging statistics:', error);
      SimpleLogger.error('ImportService', 'Failed to fetch staging statistics', 'getStagingStatistics', { 
        sessionId, tenantId, isLive, error: error.message 
      }, undefined, tenantId, error.stack);
      throw error;
    }
  }

  /**
   * Get next batch of records for N8N processing
   */
  async getNextStagingBatch(
    sessionId: number,
    batchSize: number = 100
  ): Promise<StagingRecord[]> {
    try {
      const records = await this.stagingService.getNextBatch(sessionId, batchSize);
      
      // Mark them as processing
      if (records.length > 0) {
        const recordIds = records.map(r => r.id);
        await this.stagingService.markRecordsAsProcessing(recordIds);
      }

      return records;

    } catch (error: any) {
      console.error('[ImportService] Error fetching next batch:', error);
      SimpleLogger.error('ImportService', 'Failed to fetch next staging batch', 'getNextStagingBatch', { 
        sessionId, batchSize, error: error.message 
      }, undefined, undefined, error.stack);
      throw error;
    }
  }

  /**
   * Reset failed records for retry
   */
  async resetFailedRecords(
    tenantId: number,
    isLive: boolean,
    sessionId: number
  ): Promise<{ resetCount: number }> {
    try {
      // Verify session ownership
      const session = await this.getImportSession(tenantId, isLive, sessionId);
      if (!session) {
        throw new Error('Session not found');
      }

      const resetCount = await this.stagingService.resetFailedRecords(sessionId);

      // Update session status if needed
      if (resetCount > 0) {
        await this.updateImportSession(tenantId, isLive, sessionId, {
          status: 'pending',
          error_summary: null
        });
      }

      return { resetCount };

    } catch (error: any) {
      console.error('[ImportService] Error resetting failed records:', error);
      SimpleLogger.error('ImportService', 'Failed to reset failed records', 'resetFailedRecords', { 
        sessionId, tenantId, isLive, error: error.message 
      }, undefined, tenantId, error.stack);
      throw error;
    }
  }

  /**
   * Get staging progress for real-time monitoring
   */
  async getStagingProgress(
    tenantId: number,
    isLive: boolean,
    sessionId: number
  ): Promise<any> {
    try {
      const query = `
        SELECT * FROM v_import_staging_progress
        WHERE session_id = $1
      `;

      const result = await this.db.query(query, [sessionId]);
      
      if (result.rows.length === 0) {
        throw new Error('Session not found');
      }

      const progress = result.rows[0];

      // Verify tenant access
      const session = await this.getImportSession(tenantId, isLive, sessionId);
      if (!session) {
        throw new Error('Access denied');
      }

      return {
        sessionId: progress.session_id,
        sessionName: progress.session_name,
        importType: progress.import_type,
        status: progress.session_status,
        totalRows: progress.staging_total_rows,
        pendingRows: progress.pending_rows,
        processingRows: progress.processing_rows,
        successRows: progress.success_rows,
        failedRows: progress.failed_rows,
        completionPercentage: progress.completion_percentage,
        avgSecondsPerRecord: progress.avg_seconds_per_record,
        estimatedTimeRemaining: progress.pending_rows && progress.avg_seconds_per_record
          ? Math.round(progress.pending_rows * progress.avg_seconds_per_record)
          : null
      };

    } catch (error: any) {
      console.error('[ImportService] Error fetching staging progress:', error);
      SimpleLogger.error('ImportService', 'Failed to fetch staging progress', 'getStagingProgress', { 
        sessionId, tenantId, isLive, error: error.message 
      }, undefined, tenantId, error.stack);
      throw error;
    }
  }


/**
 * Trigger database function to process import with controlled timing
 * Uses StagingProcessorService for Phase 2 processing
 */
async triggerDatabaseProcessing(
  sessionId: number,
  importType: string,
  targetDurationMs: number = 30000
): Promise<{ success: boolean; error?: string }> {
  try {
    // Verify session exists and is ready
    const sessionCheck = await this.db.query(
      'SELECT status, staging_total_rows, tenant_id, is_live, created_by, customer_lookup_method FROM t_import_sessions WHERE id = $1',
      [sessionId]
    );

    if (sessionCheck.rows.length === 0) {
      throw new Error('Session not found');
    }

    if (sessionCheck.rows[0].staging_total_rows === 0) {
      throw new Error('No records to process');
    }

    const sessionInfo = sessionCheck.rows[0];

    // Update current stage: processing
    await this.updateImportSession(
      sessionInfo.tenant_id,
      sessionInfo.is_live,
      sessionId,
      {
        current_stage: 'processing',
        status: 'pending_processing',  // Changed from 'processing'
        processing_started_at: new Date()
      }
    );

    // ============================================================
    // HANDLE BOOKMARKDATA DIFFERENTLY - USE SERVICE NOT DB FUNCTION
    // ============================================================
    if (importType === 'BookmarkData') {
      console.log('✅ Processing bookmarks via BookmarkImportService for session', sessionId);
      
      // Process asynchronously using service
      this.processBookmarkImportDirect(sessionId, sessionInfo)
        .then(result => {
          if (result.success) {
            console.log(`✅ Bookmark processing completed for session ${sessionId}`);
          } else {
            console.error(`❌ Bookmark processing failed for session ${sessionId}:`, result.error);
          }
        })
        .catch(error => {
          console.error(`❌ Bookmark processing error for session ${sessionId}:`, error);
        });

      return { success: true };
    }

    // ============================================================
    // FOR ALL OTHER IMPORT TYPES, USE StagingProcessorService
    // ============================================================
    const lookupMethod = this.validateLookupMethod(sessionInfo.customer_lookup_method);
    console.log(`Starting Phase 2 processing for session ${sessionId}, type: ${importType}, lookup method: ${lookupMethod}`);

    // Import StagingProcessorService dynamically
    const { StagingProcessorService } = await import('./stagingProcessor.service');
    const processor = new StagingProcessorService();

    // Process asynchronously
    processor.processSession({
      sessionId,
      tenantId: sessionInfo.tenant_id,
      isLive: sessionInfo.is_live,
      importType: importType as any,
      customerLookupMethod: lookupMethod,
      timeoutMs: targetDurationMs
    })
    .then(result => {
      if (result.success) {
        console.log(`✅ Processing completed for session ${sessionId}: ${result.successCount}/${result.processedCount} successful`);
      } else {
        console.error(`❌ Processing failed for session ${sessionId}:`, result.errorSummary);
      }
    })
    .catch(error => {
      console.error(`❌ Processing error for session ${sessionId}:`, error);
    });

    return { success: true };

  } catch (error: any) {
    console.error('Error triggering processing:', error);
    SimpleLogger.error('ImportService', 'Failed to trigger processing', 'triggerDatabaseProcessing', {
      sessionId, importType, error: error.message
    }, undefined, undefined, error.stack);
    return {
      success: false,
      error: error.message || 'Failed to start processing'
    };
  }
}
/**
 * Process bookmark import directly using BookmarkImportService
 * This bypasses the database function approach used for other import types
 */
private async processBookmarkImportDirect(
  sessionId: number, 
  sessionInfo: any
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log(`[ImportService] Starting bookmark processing for session ${sessionId}`);

    // Get staging records
    const stagingQuery = `
      SELECT id, row_number, mapped_data 
      FROM t_import_staging_data 
      WHERE session_id = $1 
        AND tenant_id = $2 
        AND is_live = $3 
        AND processing_status = 'pending'
      ORDER BY row_number
    `;
    
    const stagingResult = await this.db.query(stagingQuery, [
      sessionId,
      sessionInfo.tenant_id,
      sessionInfo.is_live
    ]);

    const stagingRecords = stagingResult.rows;

    if (stagingRecords.length === 0) {
      console.log(`[ImportService] No records to process for session ${sessionId}`);
      await this.updateImportSession(sessionInfo.tenant_id, sessionInfo.is_live, sessionId, {
        status: 'completed',
        current_stage: 'completed',
        processing_completed_at: new Date()
      });
      return { success: true };
    }

    console.log(`[ImportService] Processing ${stagingRecords.length} bookmark records`);

    // Transform staging records to bookmark import format
    const bookmarkRows = stagingRecords.map((record: any) => ({
      scheme_code: String(record.mapped_data.scheme_code || '').trim(),
      isin: String(record.mapped_data.isin || '').trim(),
      scheme_name: String(record.mapped_data.scheme_name || '').trim()
    }));

    // Use existing BookmarkImportService
    const bookmarkService = new BookmarkImportService();
    const result = await bookmarkService.importBookmarks(
      sessionInfo.tenant_id,
      sessionInfo.is_live,
      sessionInfo.created_by || 1,
      bookmarkRows
    );

    console.log(`[ImportService] Bookmark import completed:`, result);

    // Update staging records with success status
    for (const record of stagingRecords) {
      await this.db.query(`
        UPDATE t_import_staging_data
        SET 
          processing_status = 'success',
          processed_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [record.id]);
    }

    // Update session with results
    await this.updateImportSession(sessionInfo.tenant_id, sessionInfo.is_live, sessionId, {
      status: 'completed',
      current_stage: 'completed',
      successful_records: result.bookmarksCreated,
      duplicate_records: 0,
      failed_records: result.errors?.length || 0,
      processed_records: stagingRecords.length,
      processing_completed_at: new Date()
    });

    console.log(`[ImportService] Session ${sessionId} updated with bookmark results`);

    return { success: true };

  } catch (error: any) {
    console.error(`[ImportService] Bookmark processing error for session ${sessionId}:`, error);
    
    // Update session with error
    await this.updateImportSession(sessionInfo.tenant_id, sessionInfo.is_live, sessionId, {
      status: 'failed',
      current_stage: 'failed',
      error_summary: `Bookmark processing failed: ${error.message}`,
      processing_completed_at: new Date()
    });

    SimpleLogger.error('ImportService', 'Bookmark processing failed', 'processBookmarkImportDirect', {
      sessionId, error: error.message
    }, undefined, sessionInfo.tenant_id, error.stack);

    return { 
      success: false, 
      error: error.message || 'Bookmark processing failed' 
    };
  }
}

/**
 * Process scheme import specifically
 */
async processSchemeImport(
  sessionId: number,
  tenantId: number,
  isLive: boolean
): Promise<{ success: boolean; message: string }> {
  const client = await this.db.connect();
  
  try {
    await client.query('BEGIN');
    
    // Get staging records for this session
    const stagingQuery = `
      SELECT * FROM t_scheme_staging_data
      WHERE session_id = $1 
        AND tenant_id = $2 
        AND is_live = $3 
        AND processing_status = 'pending'
      ORDER BY row_number
    `;
    
    const stagingResult = await client.query(stagingQuery, [sessionId, tenantId, isLive]);
    const stagingRecords = stagingResult.rows;
    
    if (stagingRecords.length === 0) {
      return { success: false, message: 'No records to process' };
    }
    
    let successCount = 0;
    let failedCount = 0;
    let duplicateCount = 0;
    
    // Get SchemeService instance
    const schemeService = new SchemeService();
    
    for (const record of stagingRecords) {
      try {
        const mappedData = record.mapped_data;
        
        // Check for duplicate
        const isDuplicate = await schemeService.checkSchemeDuplicate(
          tenantId,
          isLive,
          mappedData.scheme_code
        );
        
        if (isDuplicate) {
          // Update existing scheme
          await schemeService.updateScheme(
            tenantId,
            isLive,
            mappedData.scheme_code,
            {
              amc_name: mappedData.amc_name,
              scheme_name: mappedData.scheme_name,
              scheme_nav_name: mappedData.scheme_nav_name,
              scheme_minimum_amount: mappedData.scheme_minimum_amount,
              launch_date: mappedData.launch_date,
              closure_date: mappedData.closure_date,
              isin_div_payout: mappedData.isin_div_payout,
              isin_growth: mappedData.isin_growth,
              isin_div_reinvestment: mappedData.isin_div_reinvestment
            }
          );
          
          duplicateCount++;
          
          // Update staging record
          await client.query(`
            UPDATE t_scheme_staging_data
            SET processing_status = 'duplicate',
                processed_at = CURRENT_TIMESTAMP
            WHERE id = $1
          `, [record.id]);
        } else {
          // Get master IDs for type and category
          let schemeTypeId = null;
          let schemeCategoryId = null;
          
          if (mappedData.scheme_type) {
            const schemeType = await schemeService.getMasterByName(
              tenantId,
              isLive,
              'scheme_type',
              mappedData.scheme_type
            );
            schemeTypeId = schemeType?.id || null;
          }
          
          if (mappedData.scheme_category) {
            const schemeCategory = await schemeService.getMasterByName(
              tenantId,
              isLive,
              'scheme_category',
              mappedData.scheme_category
            );
            schemeCategoryId = schemeCategory?.id || null;
          }
          
          // Create new scheme
          await schemeService.createScheme({
            tenant_id: tenantId,
            is_live: isLive,
            amc_name: mappedData.amc_name,
            scheme_code: mappedData.scheme_code,
            scheme_name: mappedData.scheme_name,
            scheme_type_id: schemeTypeId,
            scheme_category_id: schemeCategoryId,
            scheme_nav_name: mappedData.scheme_nav_name,
            scheme_minimum_amount: mappedData.scheme_minimum_amount,
            launch_date: mappedData.launch_date,
            closure_date: mappedData.closure_date,
            isin_div_payout: mappedData.isin_div_payout,
            isin_growth: mappedData.isin_growth,
            isin_div_reinvestment: mappedData.isin_div_reinvestment
          });
          
          successCount++;
          
          // Update staging record
          await client.query(`
            UPDATE t_scheme_staging_data
            SET processing_status = 'success',
                processed_at = CURRENT_TIMESTAMP
            WHERE id = $1
          `, [record.id]);
        }
      } catch (error: any) {
        failedCount++;
        
        // Update staging record with error
        await client.query(`
          UPDATE t_scheme_staging_data
          SET processing_status = 'failed',
              error_messages = $1,
              processed_at = CURRENT_TIMESTAMP
          WHERE id = $2
        `, [[error.message], record.id]);
      }
    }
    
    // Update session statistics
    await client.query(`
      UPDATE t_import_sessions
      SET status = 'completed',
          processed_records = $1,
          successful_records = $2,
          failed_records = $3,
          duplicate_records = $4,
          processing_completed_at = CURRENT_TIMESTAMP
      WHERE id = $5
    `, [
      stagingRecords.length,
      successCount,
      failedCount,
      duplicateCount,
      sessionId
    ]);
    
    await client.query('COMMIT');
    
    return {
      success: true,
      message: `Processed ${successCount} schemes successfully, ${duplicateCount} duplicates updated, ${failedCount} failed`
    };
    
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Error processing scheme import:', error);
    SimpleLogger.error('ImportService', 'Scheme import processing failed', 'processSchemeImport', {
      sessionId, tenantId, isLive, error: error.message
    }, undefined, tenantId, error.stack);
    return { success: false, message: error.message };
  } finally {
    client.release();
  }
}

  // ========================================================================
  // NEW METHODS: Session Restart and Record Reprocessing
  // ========================================================================

  /**
   * Restart a timed-out or failed import session
   * Uses checkpoint data to continue from where it left off
   */
  async restartSession(
    sessionId: number,
    tenantId: number,
    isLive: boolean
  ): Promise<{ success: boolean; message: string }> {
    try {
      // Verify session exists and can be restarted
      const sessionQuery = `
        SELECT
          id,
          status,
          can_restart,
          import_type,
          customer_lookup_method,
          last_processed_staging_id,
          restart_count
        FROM t_import_sessions
        WHERE id = $1
          AND tenant_id = $2
          AND is_live = $3
      `;

      const sessionResult = await this.db.query(sessionQuery, [sessionId, tenantId, isLive]);

      if (sessionResult.rows.length === 0) {
        return { success: false, message: 'Import session not found' };
      }

      const session = sessionResult.rows[0];

      // Check if session can be restarted
      if (!session.can_restart) {
        return {
          success: false,
          message: `Session cannot be restarted (current status: ${session.status})`
        };
      }

      // Valid statuses for restart: 'pending_processing', 'processing', 'failed'
      const restartableStatuses = ['pending_processing', 'processing', 'failed'];
      if (!restartableStatuses.includes(session.status)) {
        return {
          success: false,
          message: `Session status '${session.status}' cannot be restarted. Valid statuses: ${restartableStatuses.join(', ')}`
        };
      }

      console.log(`[ImportService] Restarting session ${sessionId}, status: ${session.status}, last_processed_id: ${session.last_processed_staging_id || 'none'}`);

      // Import StagingProcessorService dynamically to avoid circular deps
      const { StagingProcessorService } = await import('./stagingProcessor.service');
      const processor = new StagingProcessorService();

      // Restart processing from checkpoint
      const result = await processor.restartSession(sessionId);

      return {
        success: result.success,
        message: result.timedOut
          ? `Session processing timed out again. Processed ${result.successCount}/${result.processedCount} records. Can be restarted.`
          : `Session restarted successfully. Processed ${result.successCount}/${result.processedCount} records.`
      };

    } catch (error: any) {
      console.error(`[ImportService] Error restarting session ${sessionId}:`, error);
      SimpleLogger.error('ImportService', 'Session restart failed', 'restartSession', {
        sessionId, tenantId, isLive, error: error.message
      }, undefined, tenantId, error.stack);
      return { success: false, message: error.message };
    }
  }

  /**
   * Edit a staging record's mapped data
   * Records the edit in edit_history and prepares for reprocessing
   */
  async editStagingRecord(
    stagingId: number,
    editedData: Record<string, any>,
    editedBy: number,
    tenantId: number,
    isLive: boolean
  ): Promise<{ success: boolean; message: string }> {
    const client = await this.db.connect();

    try {
      await client.query('BEGIN');

      // Get current record
      const currentQuery = `
        SELECT
          id,
          import_session_id,
          tenant_id,
          is_live,
          mapped_data,
          edit_history
        FROM t_import_staging_data
        WHERE id = $1
          AND tenant_id = $2
          AND is_live = $3
      `;

      const currentResult = await client.query(currentQuery, [stagingId, tenantId, isLive]);

      if (currentResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return { success: false, message: 'Staging record not found' };
      }

      const currentRecord = currentResult.rows[0];
      const oldData = currentRecord.mapped_data;
      const editHistory = currentRecord.edit_history || [];

      // Build edit history entries for changed fields
      const editEntries: any[] = [];
      for (const [field, newValue] of Object.entries(editedData)) {
        const oldValue = oldData[field];
        if (oldValue !== newValue) {
          editEntries.push({
            edited_at: new Date().toISOString(),
            edited_by: editedBy,
            field,
            old_value: oldValue,
            new_value: newValue
          });
        }
      }

      // Merge edited data with existing data
      const updatedData = { ...oldData, ...editedData };

      // Update record
      const updateQuery = `
        UPDATE t_import_staging_data
        SET
          mapped_data = $1,
          edit_history = $2,
          edited_at = NOW(),
          edited_by = $3,
          processing_status = 'pending_process',
          error_messages = NULL,
          warnings = NULL,
          match_type = NULL,
          match_confidence = NULL,
          ambiguous_matches = NULL
        WHERE id = $4
      `;

      await client.query(updateQuery, [
        JSON.stringify(updatedData),
        JSON.stringify([...editHistory, ...editEntries]),
        editedBy,
        stagingId
      ]);

      await client.query('COMMIT');

      console.log(`[ImportService] Staging record ${stagingId} edited successfully, ${editEntries.length} fields changed`);

      return {
        success: true,
        message: `Record updated successfully. ${editEntries.length} field(s) changed.`
      };

    } catch (error: any) {
      await client.query('ROLLBACK');
      console.error(`[ImportService] Error editing staging record ${stagingId}:`, error);
      SimpleLogger.error('ImportService', 'Record edit failed', 'editStagingRecord', {
        stagingId, tenantId, isLive, error: error.message
      }, undefined, tenantId, error.stack);
      return { success: false, message: error.message };
    } finally {
      client.release();
    }
  }

  /**
   * Reprocess a single staging record
   * Used after editing a failed/orphan/duplicate record
   */
  async reprocessSingleRecord(
    stagingId: number,
    tenantId: number,
    isLive: boolean
  ): Promise<{ success: boolean; message: string; status?: string }> {
    try {
      // Get record details
      const recordQuery = `
        SELECT
          s.id,
          s.import_session_id,
          s.row_number,
          s.mapped_data,
          s.status,
          sess.import_type,
          sess.customer_lookup_method
        FROM t_import_staging_data s
        INNER JOIN t_import_sessions sess ON sess.id = s.import_session_id
        WHERE s.id = $1
          AND s.tenant_id = $2
          AND s.is_live = $3
      `;

      const recordResult = await this.db.query(recordQuery, [stagingId, tenantId, isLive]);

      if (recordResult.rows.length === 0) {
        return { success: false, message: 'Staging record not found' };
      }

      const record = recordResult.rows[0];

      console.log(`[ImportService] Reprocessing single record ${stagingId}, session: ${record.import_session_id}`);

      // Import StagingProcessorService
      const { StagingProcessorService } = await import('./stagingProcessor.service');
      const processor = new StagingProcessorService();

      // Process the single record
      const result = await (processor as any).processRecord(
        {
          id: record.id,
          row_number: record.row_number,
          mapped_data: record.mapped_data,
          status: record.status
        },
        {
          sessionId: record.import_session_id,
          tenantId,
          isLive,
          importType: record.import_type,
          customerLookupMethod: record.customer_lookup_method || 'iwell_code'
        }
      );

      // Update staging record with result
      await this.db.query(`
        UPDATE t_import_staging_data
        SET
          status = $1,
          error_messages = $2,
          warnings = $3,
          match_type = $4,
          match_confidence = $5,
          ambiguous_matches = $6,
          created_customer_id = $7,
          reprocess_count = reprocess_count + 1,
          last_reprocess_at = NOW(),
          processed_at = NOW()
        WHERE id = $8
      `, [
        result.status,
        result.error_messages || null,
        result.warnings || null,
        result.match_type || null,
        result.match_confidence || null,
        result.ambiguous_matches ? JSON.stringify(result.ambiguous_matches) : null,
        result.created_customer_id || null,
        stagingId
      ]);

      // Update session counters
      await this.updateSessionCounters(record.import_session_id);

      console.log(`[ImportService] Record ${stagingId} reprocessed with status: ${result.status}`);

      return {
        success: result.status === 'success',
        status: result.status,
        message: result.status === 'success'
          ? 'Record processed successfully'
          : result.error_messages?.[0] || 'Processing failed'
      };

    } catch (error: any) {
      console.error(`[ImportService] Error reprocessing record ${stagingId}:`, error);
      SimpleLogger.error('ImportService', 'Record reprocess failed', 'reprocessSingleRecord', {
        stagingId, tenantId, isLive, error: error.message
      }, undefined, tenantId, error.stack);
      return { success: false, message: error.message };
    }
  }

  /**
   * Bulk reprocess multiple staging records
   * Used for reprocessing all failed/orphan records in a session
   */
  async bulkReprocessRecords(
    sessionId: number,
    recordIds: number[],
    tenantId: number,
    isLive: boolean
  ): Promise<{
    success: boolean;
    message: string;
    processed: number;
    successful: number;
    failed: number;
  }> {
    let processed = 0;
    let successful = 0;
    let failed = 0;

    try {
      console.log(`[ImportService] Bulk reprocessing ${recordIds.length} records for session ${sessionId}`);

      for (const recordId of recordIds) {
        const result = await this.reprocessSingleRecord(recordId, tenantId, isLive);
        processed++;

        if (result.success) {
          successful++;
        } else {
          failed++;
        }
      }

      return {
        success: true,
        message: `Bulk reprocess complete: ${successful} successful, ${failed} failed`,
        processed,
        successful,
        failed
      };

    } catch (error: any) {
      console.error(`[ImportService] Error in bulk reprocess:`, error);
      SimpleLogger.error('ImportService', 'Bulk reprocess failed', 'bulkReprocessRecords', {
        sessionId, recordCount: recordIds.length, tenantId, isLive, error: error.message
      }, undefined, tenantId, error.stack);
      return {
        success: false,
        message: error.message,
        processed,
        successful,
        failed
      };
    }
  }

  /**
   * Update session counters after reprocessing records
   * Recalculates totals from staging table
   */
  private async updateSessionCounters(sessionId: number): Promise<void> {
    const query = `
      UPDATE t_import_sessions
      SET
        successful_records = (
          SELECT COUNT(*) FROM t_import_staging_data
          WHERE import_session_id = $1 AND status = 'success'
        ),
        failed_records = (
          SELECT COUNT(*) FROM t_import_staging_data
          WHERE import_session_id = $1 AND status = 'failed'
        ),
        duplicate_records = (
          SELECT COUNT(*) FROM t_import_staging_data
          WHERE import_session_id = $1 AND status = 'duplicate'
        ),
        processed_records = (
          SELECT COUNT(*) FROM t_import_staging_data
          WHERE import_session_id = $1 AND status IN ('success', 'failed', 'duplicate', 'orphan')
        ),
        updated_at = NOW()
      WHERE id = $1
    `;

    await this.db.query(query, [sessionId]);
  }

}