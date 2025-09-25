// backend/src/services/import.service.ts
import { Pool } from 'pg';
import { pool } from '../config/database';
import { SimpleLogger } from './simpleLogger.service';  // ADD THIS LINE
import { 
  FileUpload, 
  ImportSession, 
  ImportFieldMapping,
  FileImportType,
  ValidationResult
} from '../types/import.types';
import { FileParserService } from './fileParser.service';
import { StagingService, StagingResult, StagingRecord } from './staging.service';
import { SchemeService } from './scheme.service';  

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
}

interface CreateImportSessionParams {
  sessionName: string;
  fileUploadId: number;
  tenantId: number;
  isLive: boolean;
  importType: FileImportType;
  createdBy: number;
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
    'CustomerData': 'customer_import',
    'TransactionData': 'transaction_import',
    'SchemeData': 'scheme_import' 
  };

  // Reverse map for database to frontend
  private fileTypeReverseMap: Record<string, string> = {
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
   * Create file upload record
   */
  async createFileUpload(params: CreateFileUploadParams): Promise<FileUpload> {
    try {
      // Map frontend file type to database file type for t_file_uploads
      const dbFileType = this.fileTypeMap[params.fileType] || params.fileType;

      const query = `
        INSERT INTO t_file_uploads (
          tenant_id, is_live, file_type, original_filename, stored_filename,
          file_path, folder_path, file_size, mime_type, uploaded_by,
          processing_status, processed_records, failed_records
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
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
      // t_import_sessions expects frontend format (CustomerData, TransactionData)
      // so we DON'T map here
      const query = `
        INSERT INTO t_import_sessions (
          session_name, file_upload_id, tenant_id, is_live, import_type,
          status, total_records, processed_records, successful_records,
          failed_records, duplicate_records, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
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
        params.createdBy
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
  }): Promise<StagingResult> {
    try {
      console.log(`[ImportService] Starting staging population for session ${params.sessionId}`);
      
      // Validate file exists
      const fileRecord = await this.getFileUpload(params.tenantId, params.isLive, params.fileId);
      if (!fileRecord) {
        throw new Error(`File upload record ${params.fileId} not found`);
      }

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
 */
async triggerDatabaseProcessing(
  sessionId: number,
  importType: string,  // Add this parameter
  targetDurationMs: number = 30000
): Promise<{ success: boolean; error?: string }> {
  const client = await this.db.connect();
  
  try {
    // Start processing asynchronously - don't wait for completion
    
    // First, verify session exists and is ready
    const sessionCheck = await client.query(
      'SELECT status, staging_total_rows, tenant_id, is_live FROM t_import_sessions WHERE id = $1',
      [sessionId]
    );
    
    if (sessionCheck.rows.length === 0) {
      throw new Error('Session not found');
    }
    
    if (sessionCheck.rows[0].staging_total_rows === 0) {
      throw new Error('No records to process');
    }
    
    // Select the correct database function based on import type
    let processingFunction: string;
    
    switch(importType) {
      case 'SchemeData':
        processingFunction = 'process_scheme_import_with_timing';
        break;
      case 'CustomerData':
        processingFunction = 'process_customer_import_with_timing';
        break;
      case 'TransactionData':
        processingFunction = 'process_transaction_import_with_timing';
        break;
      default:
        console.error(`Unknown import type: ${importType}, defaulting to customer`);
        SimpleLogger.warn('ImportService', 'Unknown import type, using default', 'triggerDatabaseProcessing', { 
          sessionId, importType, defaulting: 'process_customer_import_with_timing' 
        }, undefined, sessionCheck.rows[0].tenant_id);
        processingFunction = 'process_customer_import_with_timing';
    }
    
    console.log(`Calling database function: ${processingFunction} for session ${sessionId}`);
    
    // Execute processing function - this will run synchronously
    // In production, you might want to use pg_background or a job queue
    const processingPromise = client.query(
      `SELECT ${processingFunction}($1, $2)`,
      [sessionId, targetDurationMs]
    ).catch(error => {
      console.error(`Processing error for session ${sessionId}:`, error);
      SimpleLogger.error('ImportService', 'Database processing function failed', 'triggerDatabaseProcessing', { 
        sessionId, processingFunction, error: error.message 
      }, undefined, sessionCheck.rows[0].tenant_id, error.stack);
      // Update session with error
      this.updateImportSession(
        sessionCheck.rows[0].tenant_id,
        sessionCheck.rows[0].is_live,
        sessionId,
        {
          status: 'failed',
          error_summary: error.message,
          processing_completed_at: new Date()
        }
      );
    });
    
    // Don't await - let it run in background
    processingPromise.then(result => {
      if (result && result.rows[0]) {
        console.log(`Processing completed for session ${sessionId}:`, result.rows[0]);
      }
    });
    
    return { success: true };
    
  } catch (error: any) {
    console.error('Error triggering database processing:', error);
    SimpleLogger.error('ImportService', 'Failed to trigger database processing', 'triggerDatabaseProcessing', { 
      sessionId, importType, error: error.message 
    }, undefined, undefined, error.stack);
    return { 
      success: false, 
      error: error.message || 'Failed to start processing' 
    };
  } finally {
    client.release();
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

}