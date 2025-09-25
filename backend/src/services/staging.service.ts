import { Pool, PoolClient } from 'pg';
import { pool } from '../config/database';
import { FileParserService } from './fileParser.service';
import { EncryptionUtil } from '../utils/encryption.util';

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
  private readonly BATCH_SIZE = 500;

  constructor() {
    this.db = pool;
    this.fileParser = new FileParserService();
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

      // Update session with staging info - DO NOT mark as completed
      await client.query(`
        UPDATE t_import_sessions 
        SET 
          status = 'staged', -- Mark as staged, not completed
          staging_total_rows = $1,
          staging_completed_at = CURRENT_TIMESTAMP,
          total_records = $1,
          processed_records = 0,  -- Nothing processed yet
          successful_records = 0,  -- Nothing succeeded yet
          failed_records = 0,      -- No failures yet
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

    chunk.forEach((row, index) => {
      const rowNumber = startRowNumber + index + 1;
      
      try {
        const mappedData = this.applyFieldMappings(row, params.mappings);
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
    });

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
 * Apply field mappings to raw data with encryption and defaults
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
      // Convert to string and trim
      value = String(value).trim();

      // Apply transformation if specified
      if (value !== '' && mapping.transformation) {
        value = this.applyTransformation(value, mapping.transformation);
      }

      // Special handling for specific fields
      if (mapping.targetField === 'pan' && value !== '') {
        // Encrypt PAN using the encryption utility
        try {
          const upperPAN = value.toUpperCase();
          // Validate PAN format before encrypting
          if (EncryptionUtil.isValidPAN(upperPAN)) {
            value = EncryptionUtil.encrypt(upperPAN);
          } else {
            // Keep original value but it will likely fail validation later
            console.warn(`Invalid PAN format for value: ${EncryptionUtil.maskPAN(value)}`);
          }
        } catch (error) {
          console.error('Error encrypting PAN:', error);
          // Keep original value if encryption fails
        }
      } else if (mapping.targetField === 'iwell_code' && value !== '') {
        // Encrypt IWELL code using the same encryption utility
        try {
          const upperIwellCode = value.toUpperCase();
          value = EncryptionUtil.encrypt(upperIwellCode);
          console.log(`[StagingService] Encrypted IWELL code: ${upperIwellCode.substring(0, 3)}***`);
        } catch (error) {
          console.error('Error encrypting IWELL code:', error);
          // Keep original value if encryption fails
        }
      } else if (mapping.targetField === 'prefix') {
        // Default to 'Sri' if prefix is empty
        if (value === '') {
          value = 'Sri';
        }
      } else if (mapping.targetField === 'mobile' && value !== '') {
        // Format mobile number to international format
        value = this.formatMobileNumber(value);
      } else if (mapping.targetField === 'email' && value !== '') {
        // Lowercase and trim email
        value = value.toLowerCase().trim();
      } else if (mapping.targetField === 'scheme_code' && value !== '') {
        // Uppercase scheme codes for consistency
        value = value.toUpperCase().trim();
      } else if (mapping.targetField === 'scheme_minimum_amount' && value !== '') {
        // Convert amount to number, removing any commas
        const cleanedAmount = value.replace(/,/g, '');
        const parsedAmount = parseFloat(cleanedAmount);
        value = isNaN(parsedAmount) ? 0 : parsedAmount;
      } else if ((mapping.targetField === 'isin_div_payout' || 
                 mapping.targetField === 'isin_growth' || 
                 mapping.targetField === 'isin_div_reinvestment') && value !== '') {
        // Uppercase ISIN codes and remove any spaces
        value = value.toUpperCase().replace(/\s/g, '').trim();
      } else if ((mapping.targetField === 'launch_date' || 
                 mapping.targetField === 'closure_date') && value !== '') {
        // Format dates to YYYY-MM-DD
        try {
          // Try parsing the date
          const date = new Date(value);
          if (!isNaN(date.getTime())) {
            value = date.toISOString().split('T')[0];
          } else {
            // If standard parsing fails, try common formats
            const dateFormats = [
              /^(\d{2})[-\/](\d{2})[-\/](\d{4})$/, // DD-MM-YYYY or DD/MM/YYYY
              /^(\d{2})[-\/](\d{2})[-\/](\d{2})$/,  // DD-MM-YY or DD/MM/YY
              /^(\d{4})[-\/](\d{2})[-\/](\d{2})$/   // YYYY-MM-DD or YYYY/MM/DD
            ];
            
            let formattedDate = value;
            for (const format of dateFormats) {
              const match = value.match(format);
              if (match) {
                if (format === dateFormats[0]) {
                  // DD-MM-YYYY format
                  formattedDate = `${match[3]}-${match[2]}-${match[1]}`;
                } else if (format === dateFormats[1]) {
                  // DD-MM-YY format - assume 20YY for years 00-30, 19YY for 31-99
                  const year = parseInt(match[3]);
                  const fullYear = year <= 30 ? `20${match[3]}` : `19${match[3]}`;
                  formattedDate = `${fullYear}-${match[2]}-${match[1]}`;
                } else {
                  // YYYY-MM-DD format
                  formattedDate = `${match[1]}-${match[2]}-${match[3]}`;
                }
                break;
              }
            }
            value = formattedDate;
          }
        } catch (error) {
          console.warn(`Date parsing failed for ${mapping.targetField}: ${value}`);
          // Keep original value if date parsing fails
        }
      } else if (mapping.targetField === 'scheme_type' && value !== '') {
        // Normalize scheme type values
        const lowerValue = value.toLowerCase().trim();
        if (lowerValue === 'open' || lowerValue === 'open ended' || lowerValue === 'openended') {
          value = 'OpenEnded';
        } else if (lowerValue === 'close' || lowerValue === 'closed' || lowerValue === 'closed ended' || lowerValue === 'closedended') {
          value = 'ClosedEnded';
        }
        // Keep original value if it doesn't match known patterns
      } else if (mapping.targetField === 'amc_name' && value !== '') {
        // Standardize AMC names - trim and proper case
        value = value.trim();
        // Keep original casing as AMC names may have specific formatting
      } else if (mapping.targetField === 'scheme_nav_name' && value !== '') {
        // Just trim NAV names
        value = value.trim();
      }
    } else {
      // Handle null/undefined values
      if (mapping.targetField === 'prefix') {
        // Default prefix to 'Sri' even if null
        value = 'Sri';
      } else if (mapping.targetField === 'scheme_minimum_amount') {
        // Default minimum amount to 0 if null
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
    
    // Remove all non-digit characters
    let cleaned = mobile.replace(/\D/g, '');
    
    // Handle different formats
    if (cleaned.startsWith('91') && cleaned.length === 12) {
      // Has country code 91 (12 digits total)
      cleaned = '+' + cleaned;
    } else if (cleaned.length === 10) {
      // Indian number without country code
      cleaned = '+91' + cleaned;
    } else if (cleaned.length === 11 && cleaned.startsWith('0')) {
      // Remove leading 0 and add +91
      cleaned = '+91' + cleaned.substring(1);
    } else if (!cleaned.startsWith('+')) {
      // Any other format, ensure + prefix
      cleaned = '+' + cleaned;
    }
    
    // Validate final length (8-16 chars including +)
    if (cleaned.length < 8 || cleaned.length > 16) {
      // Return original if doesn't meet criteria
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
      // Skip validation for prefix - it has a default
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

  /**
   * Get staging records for a session
   */
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

  /**
   * Update staging record status
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

  /**
   * Batch update staging records
   */
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

  /**
   * Get staging statistics for a session
   */
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

  /**
   * Get next batch of pending records for processing
   */
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

  /**
   * Mark records as processing
   */
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

  /**
   * Reset failed records for retry
   */
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