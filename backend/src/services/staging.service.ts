// backend/src/services/staging.service.ts

// backend/src/services/staging.service.ts

import { Pool, PoolClient } from 'pg';
import { pool } from '../config/database';
import { FileParserService } from './fileParser.service';
import { EncryptionUtil } from '../utils/encryption.util';
import { CustomerLookupService } from './customerLookup.service';

export interface StagingParams {
  sessionId: number;
  tenantId: number;
  isLive: boolean;
  fileId: number;
  filePath: string;
  importType: string;
  mappings: FieldMapping[];
}

export interface FieldMapping {
  sourceField: string;
  targetField: string;
  isRequired: boolean;
  transformation?: string;
  isActive: boolean;
}

export interface StagingResult {
  totalRows: number;
  successRows: number;
  failedRows: number;
  errors: Array<{ row: number; error: string }>;
  duration: number;
}

export interface StagingRecord {
  id: number;
  session_id: number;
  row_number: number;
  raw_data: any;
  mapped_data: any;
  processing_status: string;
  error_messages?: string[];
  warnings?: string[];
  created_record_id?: number;
  created_record_type?: string;
  processed_at?: Date;
}

export class StagingService {
  private db: Pool;
  private fileParser: FileParserService;
  private customerLookup: CustomerLookupService;
  private readonly BATCH_SIZE = 500;

  constructor() {
    this.db = pool;
    this.fileParser = new FileParserService();
    this.customerLookup = new CustomerLookupService();
  }

  /**
   * Populate staging table from uploaded file
   */
  async populateStagingTable(params: StagingParams): Promise<StagingResult> {
    const startTime = Date.now();
    const errors: Array<{ row: number; error: string }> = [];
    let successRows = 0;
    let failedRows = 0;

    const client = await this.db.connect();

    try {
      await client.query('BEGIN');

      // Parse the actual file
      console.log(`[StagingService] Parsing file: ${params.filePath}`);
      const parsedFile = await this.fileParser.parseFile(params.filePath);
      const fileRows = parsedFile.rows;
      console.log(`[StagingService] Found ${fileRows.length} rows in file`);

      // Process in batches
      for (let i = 0; i < fileRows.length; i += this.BATCH_SIZE) {
        const chunk = fileRows.slice(i, i + this.BATCH_SIZE);
        await this.processStagingChunk(
          client,
          chunk,
          i,
          params,
          errors
        );
        successRows += chunk.length;
      }

      // Update session with staging info
      await client.query(`
        UPDATE t_import_sessions 
        SET 
          status = 'staged',
          staging_total_rows = $1,
          staging_completed_at = CURRENT_TIMESTAMP,
          total_records = $1,
          processed_records = 0,
          successful_records = 0,
          failed_records = 0,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
      `, [successRows, params.sessionId]);

      await client.query('COMMIT');

      const duration = Date.now() - startTime;

      return {
        totalRows: successRows,
        successRows,
        failedRows,
        errors,
        duration
      };

    } catch (error: any) {
      await client.query('ROLLBACK');
      console.error('Error populating staging table:', error);
      throw new Error(`Staging population failed: ${error.message}`);
    } finally {
      client.release();
    }
  }

  /**
   * Process a chunk of data for staging
   */
  private async processStagingChunk(
    client: PoolClient,
    chunk: Record<string, any>[],
    startRowNumber: number,
    params: StagingParams,
    errors: Array<{ row: number; error: string }>
  ): Promise<void> {
    const values: any[] = [];
    const placeholders: string[] = [];
    let paramIndex = 1;

    for (let idx = 0; idx < chunk.length; idx++) {
      const row = chunk[idx];
      const rowNumber = startRowNumber + idx + 1;
      
      try {
        const mappedData = this.applyFieldMappings(row, params.mappings);
        
        // Add customer_id lookup for transaction imports
        if (params.importType === 'TransactionData' && mappedData.iwell_code) {
          const customerId = await this.customerLookup.findCustomerByIwellCode(
            mappedData.iwell_code,
            params.tenantId,
            params.isLive
          );
          if (customerId) {
            mappedData.customer_id = customerId;
            console.log(`[StagingService] Customer ${customerId} found for IWELL: ${mappedData.iwell_code.substring(0, 3)}***`);
          } else {
            console.warn(`[StagingService] No customer found for IWELL: ${mappedData.iwell_code.substring(0, 3)}***`);
          }
        }
        
        const validation = this.validateMappedData(mappedData, params.mappings);
        
        placeholders.push(`($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3}, $${paramIndex + 4}, $${paramIndex + 5}, $${paramIndex + 6}, $${paramIndex + 7})`);
        
        values.push(
          params.tenantId,
          params.isLive,
          params.sessionId,
          params.importType,
          rowNumber,
          JSON.stringify(row),
          JSON.stringify(mappedData),
          validation.warnings.length > 0 ? validation.warnings : null
        );
        
        paramIndex += 8;

      } catch (error: any) {
        errors.push({
          row: rowNumber,
          error: error.message
        });
      }
    }

    if (placeholders.length > 0) {
      const query = `
        INSERT INTO t_import_staging_data (
          tenant_id, is_live, session_id, import_type, 
          row_number, raw_data, mapped_data, warnings
        ) VALUES ${placeholders.join(', ')}
      `;
      
      await client.query(query, values);
    }
  }

  /**
   * Apply field mappings to raw data - NO ENCRYPTION
   */
  private applyFieldMappings(
    rawData: Record<string, any>,
    mappings: FieldMapping[]
  ): Record<string, any> {
    const mappedData: Record<string, any> = {};
    const activeMappings = mappings.filter(m => m.isActive && m.targetField);

    activeMappings.forEach(mapping => {
      let value = rawData[mapping.sourceField];

      if (value !== undefined && value !== null) {
        value = String(value).trim();

        if (value !== '' && mapping.transformation) {
          value = this.applyTransformation(value, mapping.transformation);
        }

        // Special handling - NO ENCRYPTION
        if (mapping.targetField === 'pan' && value !== '') {
          const upperPAN = value.toUpperCase();
          if (EncryptionUtil.isValidPAN(upperPAN)) {
            value = upperPAN;
          } else {
            console.warn(`Invalid PAN format for value: ${EncryptionUtil.maskPAN(value)}`);
          }
        } else if (mapping.targetField === 'iwell_code' && value !== '') {
          // Just uppercase - NO encryption
          value = value.toUpperCase();
          console.log(`[StagingService] IWELL code: ${value.substring(0, 3)}***`);
        } else if (mapping.targetField === 'prefix') {
          if (value === '') {
            value = 'Sri';
          }
        } else if (mapping.targetField === 'mobile' && value !== '') {
          value = this.formatMobileNumber(value);
        } else if (mapping.targetField === 'email' && value !== '') {
          value = value.toLowerCase().trim();
        } else if (mapping.targetField === 'scheme_code' && value !== '') {
          value = value.toUpperCase().trim();
        } else if (mapping.targetField === 'scheme_minimum_amount' && value !== '') {
          const cleanedAmount = value.replace(/,/g, '');
          const parsedAmount = parseFloat(cleanedAmount);
          value = isNaN(parsedAmount) ? 0 : parsedAmount;
        } else if ((mapping.targetField === 'isin_div_payout' || 
                   mapping.targetField === 'isin_growth' || 
                   mapping.targetField === 'isin_div_reinvestment') && value !== '') {
          value = value.toUpperCase().replace(/\s/g, '').trim();
        } else if ((mapping.targetField === 'launch_date' || 
                   mapping.targetField === 'closure_date' ||
                   mapping.targetField === 'txn_date' ||
                   mapping.targetField === 'sip_regd_date') && value !== '') {
          try {
            const date = new Date(value);
            if (!isNaN(date.getTime())) {
              value = date.toISOString().split('T')[0];
            } else {
              const dateFormats = [
                /^(\d{2})[-\/](\d{2})[-\/](\d{4})$/,
                /^(\d{2})[-\/](\d{2})[-\/](\d{2})$/,
                /^(\d{4})[-\/](\d{2})[-\/](\d{2})$/
              ];
              
              let formattedDate = value;
              for (const format of dateFormats) {
                const match = value.match(format);
                if (match) {
                  if (format === dateFormats[0]) {
                    // DD-MM-YYYY
                    formattedDate = `${match[3]}-${match[2]}-${match[1]}`;
                  } else if (format === dateFormats[1]) {
                    // DD-MM-YY
                    const year = parseInt(match[3]);
                    const fullYear = year <= 30 ? `20${match[3]}` : `19${match[3]}`;
                    formattedDate = `${fullYear}-${match[2]}-${match[1]}`;
                  } else {
                    // YYYY-MM-DD
                    formattedDate = `${match[1]}-${match[2]}-${match[3]}`;
                  }
                  break;
                }
              }
              value = formattedDate;
            }
          } catch (error) {
            console.warn(`Date parsing failed for ${mapping.targetField}: ${value}`);
          }
        } else if (mapping.targetField === 'scheme_type' && value !== '') {
          const lowerValue = value.toLowerCase().trim();
          if (lowerValue === 'open' || lowerValue === 'open ended' || lowerValue === 'openended') {
            value = 'OpenEnded';
          } else if (lowerValue === 'close' || lowerValue === 'closed' || lowerValue === 'closed ended' || lowerValue === 'closedended') {
            value = 'ClosedEnded';
          }
        } else if (mapping.targetField === 'amc_name' && value !== '') {
          value = value.trim();
        } else if (mapping.targetField === 'scheme_nav_name' && value !== '') {
          value = value.trim();
        }
      } else {
        if (mapping.targetField === 'prefix') {
          value = 'Sri';
        } else if (mapping.targetField === 'scheme_minimum_amount') {
          value = 0;
        } else {
          value = '';
        }
      }

      if (mapping.targetField) {
        mappedData[mapping.targetField] = value;
      }
    });

    return mappedData;
  }

  /**
   * Apply transformation rules to a value
   */
  private applyTransformation(value: any, transformation: string): any {
    if (value === null || value === undefined || value === '') {
      return value;
    }

    const stringValue = String(value);

    switch (transformation.toLowerCase()) {
      case 'uppercase':
        return stringValue.toUpperCase();
      case 'lowercase':
        return stringValue.toLowerCase();
      case 'trim':
        return stringValue.trim();
      case 'normalize_phone':
        return stringValue.replace(/\D/g, '');
      case 'format_date':
        try {
          const date = new Date(stringValue);
          if (!isNaN(date.getTime())) {
            return date.toISOString().split('T')[0];
          }
        } catch {
          // Return original if parsing fails
        }
        return stringValue;
      default:
        return value;
    }
  }

  /**
   * Format mobile number to international format
   */
  private formatMobileNumber(mobile: string): string {
    if (!mobile || mobile.trim() === '') return '';
    
    let cleaned = mobile.replace(/\D/g, '');
    
    if (cleaned.startsWith('91') && cleaned.length === 12) {
      cleaned = '+' + cleaned;
    } else if (cleaned.length === 10) {
      cleaned = '+91' + cleaned;
    } else if (cleaned.length === 11 && cleaned.startsWith('0')) {
      cleaned = '+91' + cleaned.substring(1);
    } else if (!cleaned.startsWith('+')) {
      cleaned = '+' + cleaned;
    }
    
    if (cleaned.length < 8 || cleaned.length > 16) {
      return mobile;
    }
    
    return cleaned;
  }

  /**
   * Validate mapped data
   */
  private validateMappedData(
    mappedData: Record<string, any>,
    mappings: FieldMapping[]
  ): { isValid: boolean; warnings: string[] } {
    const warnings: string[] = [];
    const requiredMappings = mappings.filter(m => m.isRequired && m.isActive);
    
    requiredMappings.forEach(mapping => {
      if (mapping.targetField === 'prefix') {
        return;
      }
      
      const value = mappedData[mapping.targetField];
      if (value === null || value === undefined || value === '') {
        warnings.push(`Required field '${mapping.targetField}' is empty`);
      }
    });

    return {
      isValid: warnings.length === 0,
      warnings
    };
  }

  async getStagingRecords(
    sessionId: number,
    tenantId: number,
    isLive: boolean,
    filters?: {
      status?: string;
      offset?: number;
      limit?: number;
    }
  ): Promise<{ records: StagingRecord[]; total: number }> {
    try {
      const { status = null, offset = 0, limit = 100 } = filters || {};

      let query = `
        SELECT * FROM t_import_staging_data
        WHERE session_id = $1 AND tenant_id = $2 AND is_live = $3
      `;
      const params: any[] = [sessionId, tenantId, isLive];

      if (status) {
        params.push(status);
        query += ` AND processing_status = $${params.length}`;
      }

      query += ` ORDER BY row_number ASC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
      params.push(limit, offset);

      const recordsResult = await this.db.query(query, params);

      let countQuery = `
        SELECT COUNT(*) as total FROM t_import_staging_data
        WHERE session_id = $1 AND tenant_id = $2 AND is_live = $3
      `;
      const countParams: any[] = [sessionId, tenantId, isLive];

      if (status) {
        countParams.push(status);
        countQuery += ` AND processing_status = $${countParams.length}`;
      }

      const countResult = await this.db.query(countQuery, countParams);

      return {
        records: recordsResult.rows,
        total: parseInt(countResult.rows[0].total)
      };

    } catch (error: any) {
      console.error('Error fetching staging records:', error);
      throw error;
    }
  }

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
      const updateFields: string[] = [];
      const params: any[] = [];
      let paramIndex = 1;

      Object.entries(updates).forEach(([key, value]) => {
        updateFields.push(`${key} = $${paramIndex}`);
        params.push(value);
        paramIndex++;
      });

      if (updateFields.length === 0) return;

      updateFields.push('processed_at = CURRENT_TIMESTAMP');
      updateFields.push('updated_at = CURRENT_TIMESTAMP');

      const query = `
        UPDATE t_import_staging_data 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex}
      `;
      params.push(recordId);

      await this.db.query(query, params);

    } catch (error: any) {
      console.error('Error updating staging record:', error);
      throw error;
    }
  }

  async batchUpdateStagingRecords(
    sessionId: number,
    recordIds: number[],
    updates: {
      processing_status?: string;
      processed_at?: Date;
    }
  ): Promise<void> {
    if (recordIds.length === 0) return;

    try {
      const updateFields: string[] = [];
      const params: any[] = [sessionId];
      let paramIndex = 2;

      Object.entries(updates).forEach(([key, value]) => {
        updateFields.push(`${key} = $${paramIndex}`);
        params.push(value);
        paramIndex++;
      });

      updateFields.push('updated_at = CURRENT_TIMESTAMP');

      const query = `
        UPDATE t_import_staging_data 
        SET ${updateFields.join(', ')}
        WHERE session_id = $1 AND id = ANY($${paramIndex})
      `;
      params.push(recordIds);

      await this.db.query(query, params);

    } catch (error: any) {
      console.error('Error batch updating staging records:', error);
      throw error;
    }
  }

  async getStagingStatistics(
    sessionId: number,
    tenantId: number,
    isLive: boolean
  ): Promise<any> {
    try {
      const query = `
        SELECT * FROM v_import_staging_statistics
        WHERE session_id = $1 AND tenant_id = $2 AND is_live = $3
      `;

      const result = await this.db.query(query, [sessionId, tenantId, isLive]);
      return result.rows[0] || null;

    } catch (error: any) {
      console.error('Error fetching staging statistics:', error);
      throw error;
    }
  }

  async getNextBatch(
    sessionId: number,
    batchSize: number = 100
  ): Promise<StagingRecord[]> {
    try {
      const query = `
        SELECT * FROM t_import_staging_data
        WHERE session_id = $1 AND processing_status = 'pending'
        ORDER BY row_number ASC
        LIMIT $2
        FOR UPDATE SKIP LOCKED
      `;

      const result = await this.db.query(query, [sessionId, batchSize]);
      return result.rows;

    } catch (error: any) {
      console.error('Error fetching next batch:', error);
      throw error;
    }
  }

  async markRecordsAsProcessing(recordIds: number[]): Promise<void> {
    if (recordIds.length === 0) return;

    try {
      const query = `
        UPDATE t_import_staging_data 
        SET processing_status = 'processing', updated_at = CURRENT_TIMESTAMP
        WHERE id = ANY($1)
      `;

      await this.db.query(query, [recordIds]);

    } catch (error: any) {
      console.error('Error marking records as processing:', error);
      throw error;
    }
  }

  async resetFailedRecords(sessionId: number): Promise<number> {
    try {
      const query = `
        UPDATE t_import_staging_data 
        SET 
          processing_status = 'pending',
          error_messages = NULL,
          warnings = NULL,
          processed_at = NULL,
          updated_at = CURRENT_TIMESTAMP
        WHERE session_id = $1 AND processing_status = 'failed'
        RETURNING id
      `;

      const result = await this.db.query(query, [sessionId]);
      return result.rows.length;

    } catch (error: any) {
      console.error('Error resetting failed records:', error);
      throw error;
    }
  }
}