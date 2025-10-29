// backend/src/services/stagingProcessor.service.ts
// Phase 2 Processor: Takes staged records and processes them into final tables

import { Pool, PoolClient } from 'pg';
import { pool } from '../config/database';
import { CustomerLookupService } from './customerLookup.service';
import { SchemeAliasService } from './schemeAlias.service';
import { ImportSession, FileImportType } from '../types/import.types';

interface ProcessingParams {
  sessionId: number;
  tenantId: number;
  isLive: boolean;
  importType: FileImportType;
  customerLookupMethod: 'iwell_code' | 'customer_name' | 'both';
  batchSize?: number;
  timeoutMs?: number;
}

interface ProcessingResult {
  success: boolean;
  processedCount: number;
  successCount: number;
  failedCount: number;
  duplicateCount: number;
  orphanCount: number;
  timedOut: boolean;
  lastProcessedId?: number;
  errorSummary?: string;
}

interface StagingRecord {
  id: number;
  row_number: number;
  mapped_data: any;
  status: string;
}

export class StagingProcessorService {
  private db: Pool;
  private customerLookup: CustomerLookupService;
  private schemeAlias: SchemeAliasService;

  constructor() {
    this.db = pool;
    this.customerLookup = new CustomerLookupService();
    this.schemeAlias = new SchemeAliasService();
  }

  /**
   * Main entry point for Phase 2 processing
   * Processes staged records into final tables with checkpoint/restart capability
   */
  async processSession(params: ProcessingParams): Promise<ProcessingResult> {
    const startTime = Date.now();
    const timeoutMs = params.timeoutMs || 20 * 60 * 1000; // 20 minutes default
    const batchSize = params.batchSize || 100;

    let processedCount = 0;
    let successCount = 0;
    let failedCount = 0;
    let duplicateCount = 0;
    let orphanCount = 0;
    let lastProcessedId: number | undefined;
    let timedOut = false;

    console.log(`[StagingProcessor] Starting Phase 2 for session ${params.sessionId}, lookup method: ${params.customerLookupMethod}`);

    try {
      // Update session status to 'processing'
      await this.updateSessionStatus(params.sessionId, 'processing', {
        processing_started_at: new Date()
      });

      // Get checkpoint (if restarting)
      const checkpoint = await this.getCheckpoint(params.sessionId);
      const startFromId = checkpoint?.last_processed_staging_id || 0;

      console.log(`[StagingProcessor] Starting from staging ID: ${startFromId} (checkpoint: ${checkpoint ? 'yes' : 'no'})`);

      // Process in batches
      while (true) {
        // Check timeout
        const elapsed = Date.now() - startTime;
        if (elapsed >= timeoutMs) {
          console.warn(`[StagingProcessor] Timeout reached (${elapsed}ms), saving checkpoint`);
          timedOut = true;
          break;
        }

        // Get next batch of pending records
        const batch = await this.getNextBatch(params.sessionId, startFromId, batchSize);

        if (batch.length === 0) {
          console.log(`[StagingProcessor] No more records to process`);
          break;
        }

        console.log(`[StagingProcessor] Processing batch of ${batch.length} records (starting from ID ${batch[0].id})`);

        // Process batch
        const batchResult = await this.processBatch(batch, params);

        processedCount += batchResult.processed;
        successCount += batchResult.success;
        failedCount += batchResult.failed;
        duplicateCount += batchResult.duplicate;
        orphanCount += batchResult.orphan;
        lastProcessedId = batch[batch.length - 1].id;

        // Update checkpoint
        await this.updateCheckpoint(params.sessionId, lastProcessedId, {
          processedCount,
          successCount,
          failedCount,
          duplicateCount,
          orphanCount
        });

        console.log(`[StagingProcessor] Batch complete: ${batchResult.success} success, ${batchResult.failed} failed, ${batchResult.duplicate} duplicate, ${batchResult.orphan} orphan`);
      }

      // Determine final status
      let finalStatus: string;
      if (timedOut) {
        finalStatus = 'pending_processing'; // Can be restarted
      } else if (failedCount > 0 || orphanCount > 0) {
        finalStatus = 'completed_with_errors';
      } else {
        finalStatus = 'completed';
      }

      // Update session with final counts
      await this.updateSessionStatus(params.sessionId, finalStatus, {
        processed_records: processedCount,
        successful_records: successCount,
        failed_records: failedCount,
        duplicate_records: duplicateCount,
        processing_completed_at: timedOut ? null : new Date(),
        last_processed_staging_id: lastProcessedId,
        can_restart: timedOut
      });

      console.log(`[StagingProcessor] Phase 2 complete for session ${params.sessionId}: ${successCount}/${processedCount} successful, status: ${finalStatus}`);

      return {
        success: !timedOut,
        processedCount,
        successCount,
        failedCount,
        duplicateCount,
        orphanCount,
        timedOut,
        lastProcessedId
      };

    } catch (error: any) {
      console.error(`[StagingProcessor] Error processing session ${params.sessionId}:`, error);

      // Update session to failed
      await this.updateSessionStatus(params.sessionId, 'failed', {
        error_summary: error.message,
        processed_records: processedCount,
        successful_records: successCount,
        failed_records: failedCount,
        duplicate_records: duplicateCount,
        last_processed_staging_id: lastProcessedId,
        can_restart: true
      });

      return {
        success: false,
        processedCount,
        successCount,
        failedCount,
        duplicateCount,
        orphanCount,
        timedOut: false,
        lastProcessedId,
        errorSummary: error.message
      };
    }
  }

  /**
   * Process a batch of staging records
   */
  private async processBatch(
    batch: StagingRecord[],
    params: ProcessingParams
  ): Promise<{
    processed: number;
    success: number;
    failed: number;
    duplicate: number;
    orphan: number;
  }> {
    let success = 0;
    let failed = 0;
    let duplicate = 0;
    let orphan = 0;

    for (const record of batch) {
      try {
        const result = await this.processRecord(record, params);

        if (result.status === 'success') {
          success++;
        } else if (result.status === 'failed') {
          failed++;
        } else if (result.status === 'duplicate') {
          duplicate++;
        } else if (result.status === 'orphan') {
          orphan++;
        }

        // Update staging record with result
        await this.updateStagingRecord(record.id, result);

      } catch (error: any) {
        console.error(`[StagingProcessor] Error processing record ${record.id}:`, error);
        failed++;

        // Update staging record as failed
        await this.updateStagingRecord(record.id, {
          status: 'failed',
          error_messages: [error.message],
          match_type: 'error',
          match_confidence: 'not_found'
        });
      }
    }

    return {
      processed: batch.length,
      success,
      failed,
      duplicate,
      orphan
    };
  }

  /**
   * Process a single staging record
   * Handles customer lookup, scheme lookup, and final table insertion
   */
  private async processRecord(
    record: StagingRecord,
    params: ProcessingParams
  ): Promise<{
    status: 'success' | 'failed' | 'duplicate' | 'orphan';
    error_messages?: string[];
    warnings?: string[];
    match_type?: string;
    match_confidence?: string;
    ambiguous_matches?: any;
    created_customer_id?: number;
    created_transaction_id?: number;
  }> {
    const data = record.mapped_data;
    const errors: string[] = [];
    const warnings: string[] = [];

    // ======================================================================
    // TRANSACTION DATA PROCESSING
    // ======================================================================
    if (params.importType === 'TransactionData') {
      // Step 1: Customer Lookup
      const customerResult = await this.customerLookup.findCustomerForTransaction(
        params.customerLookupMethod,
        {
          iwell_code: data.iwell_code,
          customer_name: data.customer_name,
          pan: data.pan
        },
        params.tenantId,
        params.isLive
      );

      if (!customerResult.customerId) {
        // Customer not found or ambiguous
        if (customerResult.matchConfidence === 'ambiguous') {
          return {
            status: 'failed',
            error_messages: [customerResult.errorMessage || 'Ambiguous customer match'],
            match_type: customerResult.matchType,
            match_confidence: 'ambiguous',
            ambiguous_matches: customerResult.ambiguousMatches
          };
        }

        return {
          status: 'orphan',
          error_messages: [customerResult.errorMessage || 'Customer not found'],
          match_type: customerResult.matchType,
          match_confidence: 'not_found'
        };
      }

      // Step 2: Scheme Lookup (if scheme_name provided)
      let schemeId: number | null = null;
      if (data.scheme_name) {
        const schemeResult = await this.schemeAlias.lookupSchemeByAlias(data.scheme_name);

        if (schemeResult.success && schemeResult.data) {
          schemeId = schemeResult.data.scheme_id;
        } else {
          warnings.push(`Scheme not found for name: ${data.scheme_name}`);
        }
      }

      // Step 3: Check for duplicates (same customer, scheme, date, amount)
      const duplicateCheck = await this.checkTransactionDuplicate({
        customer_id: customerResult.customerId,
        scheme_id: schemeId,
        transaction_date: data.transaction_date,
        transaction_amount: data.transaction_amount,
        transaction_type: data.transaction_type,
        tenant_id: params.tenantId,
        is_live: params.isLive
      });

      if (duplicateCheck.isDuplicate) {
        return {
          status: 'duplicate',
          error_messages: [`Duplicate transaction found (ID: ${duplicateCheck.existingId})`],
          match_type: customerResult.matchType,
          match_confidence: customerResult.matchConfidence,
          warnings
        };
      }

      // Step 4: Insert transaction
      try {
        const transactionId = await this.insertTransaction({
          customer_id: customerResult.customerId,
          scheme_id: schemeId,
          transaction_date: data.transaction_date,
          transaction_type: data.transaction_type,
          transaction_amount: data.transaction_amount,
          units: data.units,
          nav: data.nav,
          folio_number: data.folio_number,
          remarks: data.remarks,
          tenant_id: params.tenantId,
          is_live: params.isLive
        });

        return {
          status: 'success',
          match_type: customerResult.matchType,
          match_confidence: customerResult.matchConfidence,
          created_transaction_id: transactionId,
          warnings: warnings.length > 0 ? warnings : undefined
        };

      } catch (insertError: any) {
        console.error('[StagingProcessor] Transaction insert failed:', insertError);
        return {
          status: 'failed',
          error_messages: [`Database insert failed: ${insertError.message}`],
          match_type: customerResult.matchType,
          match_confidence: customerResult.matchConfidence
        };
      }
    }

    // ======================================================================
    // CUSTOMER DATA PROCESSING
    // ======================================================================
    if (params.importType === 'CustomerData') {
      // For customer imports, we'd insert into t_contacts and t_customers
      // This is a placeholder - implement based on your customer import logic
      return {
        status: 'success',
        match_type: 'direct_insert',
        match_confidence: 'high'
      };
    }

    // ======================================================================
    // SCHEME DATA PROCESSING
    // ======================================================================
    if (params.importType === 'SchemeData') {
      // For scheme imports, we'd insert into t_scheme_details
      // This is a placeholder - implement based on your scheme import logic
      return {
        status: 'success',
        match_type: 'direct_insert',
        match_confidence: 'high'
      };
    }

    // Unknown import type
    return {
      status: 'failed',
      error_messages: [`Unsupported import type: ${params.importType}`]
    };
  }

  /**
   * Check if transaction already exists (duplicate detection)
   */
  private async checkTransactionDuplicate(data: {
    customer_id: number;
    scheme_id: number | null;
    transaction_date: string;
    transaction_amount: number;
    transaction_type: string;
    tenant_id: number;
    is_live: boolean;
  }): Promise<{ isDuplicate: boolean; existingId?: number }> {
    try {
      const query = `
        SELECT id
        FROM t_transactions
        WHERE customer_id = $1
          AND tenant_id = $2
          AND is_live = $3
          AND transaction_date = $4
          AND transaction_amount = $5
          AND transaction_type = $6
          ${data.scheme_id ? 'AND scheme_id = $7' : 'AND scheme_id IS NULL'}
        LIMIT 1
      `;

      const params = [
        data.customer_id,
        data.tenant_id,
        data.is_live,
        data.transaction_date,
        data.transaction_amount,
        data.transaction_type
      ];

      if (data.scheme_id) {
        params.push(data.scheme_id);
      }

      const result = await this.db.query(query, params);

      if (result.rows.length > 0) {
        return { isDuplicate: true, existingId: result.rows[0].id };
      }

      return { isDuplicate: false };
    } catch (error) {
      console.error('[StagingProcessor] Error checking duplicate:', error);
      return { isDuplicate: false };
    }
  }

  /**
   * Insert transaction into t_transactions table
   */
  private async insertTransaction(data: {
    customer_id: number;
    scheme_id: number | null;
    transaction_date: string;
    transaction_type: string;
    transaction_amount: number;
    units?: number;
    nav?: number;
    folio_number?: string;
    remarks?: string;
    tenant_id: number;
    is_live: boolean;
  }): Promise<number> {
    const query = `
      INSERT INTO t_transactions (
        tenant_id,
        is_live,
        is_active,
        customer_id,
        scheme_id,
        transaction_date,
        transaction_type,
        transaction_amount,
        units,
        nav,
        folio_number,
        remarks,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
      RETURNING id
    `;

    const result = await this.db.query(query, [
      data.tenant_id,
      data.is_live,
      true, // is_active
      data.customer_id,
      data.scheme_id,
      data.transaction_date,
      data.transaction_type,
      data.transaction_amount,
      data.units || null,
      data.nav || null,
      data.folio_number || null,
      data.remarks || null
    ]);

    return result.rows[0].id;
  }

  /**
   * Get next batch of staging records to process
   */
  private async getNextBatch(
    sessionId: number,
    startFromId: number,
    batchSize: number
  ): Promise<StagingRecord[]> {
    const query = `
      SELECT id, row_number, mapped_data, status
      FROM t_import_staging_data
      WHERE import_session_id = $1
        AND id > $2
        AND status = 'pending_process'
      ORDER BY id ASC
      LIMIT $3
    `;

    const result = await this.db.query(query, [sessionId, startFromId, batchSize]);
    return result.rows;
  }

  /**
   * Update staging record with processing result
   */
  private async updateStagingRecord(
    stagingId: number,
    result: {
      status: string;
      error_messages?: string[];
      warnings?: string[];
      match_type?: string;
      match_confidence?: string;
      ambiguous_matches?: any;
      created_customer_id?: number;
      created_transaction_id?: number;
    }
  ): Promise<void> {
    const query = `
      UPDATE t_import_staging_data
      SET
        status = $1,
        error_messages = $2,
        warnings = $3,
        match_type = $4,
        match_confidence = $5,
        ambiguous_matches = $6,
        created_customer_id = $7,
        processed_at = NOW()
      WHERE id = $8
    `;

    await this.db.query(query, [
      result.status,
      result.error_messages || [],
      result.warnings || [],
      result.match_type || null,
      result.match_confidence || null,
      result.ambiguous_matches ? JSON.stringify(result.ambiguous_matches) : null,
      result.created_customer_id || null,
      stagingId
    ]);
  }

  /**
   * Get checkpoint data for session restart
   */
  private async getCheckpoint(sessionId: number): Promise<{
    last_processed_staging_id: number | null;
    restart_count: number;
  } | null> {
    const query = `
      SELECT last_processed_staging_id, restart_count
      FROM t_import_sessions
      WHERE id = $1
    `;

    const result = await this.db.query(query, [sessionId]);

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0];
  }

  /**
   * Update checkpoint during processing
   */
  private async updateCheckpoint(
    sessionId: number,
    lastProcessedId: number,
    counts: {
      processedCount: number;
      successCount: number;
      failedCount: number;
      duplicateCount: number;
      orphanCount: number;
    }
  ): Promise<void> {
    const query = `
      UPDATE t_import_sessions
      SET
        last_processed_staging_id = $1,
        processed_records = $2,
        successful_records = $3,
        failed_records = $4,
        duplicate_records = $5,
        processing_checkpoint = jsonb_build_object(
          'last_processed_id', $1,
          'processed', $2,
          'success', $3,
          'failed', $4,
          'duplicate', $5,
          'orphan', $6,
          'updated_at', NOW()
        )
      WHERE id = $7
    `;

    await this.db.query(query, [
      lastProcessedId,
      counts.processedCount,
      counts.successCount,
      counts.failedCount,
      counts.duplicateCount,
      counts.orphanCount,
      sessionId
    ]);
  }

  /**
   * Update session status and metadata
   */
  private async updateSessionStatus(
    sessionId: number,
    status: string,
    metadata: {
      processing_started_at?: Date | null;
      processing_completed_at?: Date | null;
      processed_records?: number;
      successful_records?: number;
      failed_records?: number;
      duplicate_records?: number;
      error_summary?: string;
      last_processed_staging_id?: number;
      can_restart?: boolean;
    }
  ): Promise<void> {
    const updates: string[] = ['status = $1'];
    const params: any[] = [status, sessionId];
    let paramIndex = 3;

    if (metadata.processing_started_at !== undefined) {
      updates.push(`processing_started_at = $${paramIndex++}`);
      params.splice(-1, 0, metadata.processing_started_at);
    }

    if (metadata.processing_completed_at !== undefined) {
      updates.push(`processing_completed_at = $${paramIndex++}`);
      params.splice(-1, 0, metadata.processing_completed_at);
    }

    if (metadata.processed_records !== undefined) {
      updates.push(`processed_records = $${paramIndex++}`);
      params.splice(-1, 0, metadata.processed_records);
    }

    if (metadata.successful_records !== undefined) {
      updates.push(`successful_records = $${paramIndex++}`);
      params.splice(-1, 0, metadata.successful_records);
    }

    if (metadata.failed_records !== undefined) {
      updates.push(`failed_records = $${paramIndex++}`);
      params.splice(-1, 0, metadata.failed_records);
    }

    if (metadata.duplicate_records !== undefined) {
      updates.push(`duplicate_records = $${paramIndex++}`);
      params.splice(-1, 0, metadata.duplicate_records);
    }

    if (metadata.error_summary !== undefined) {
      updates.push(`error_summary = $${paramIndex++}`);
      params.splice(-1, 0, metadata.error_summary);
    }

    if (metadata.last_processed_staging_id !== undefined) {
      updates.push(`last_processed_staging_id = $${paramIndex++}`);
      params.splice(-1, 0, metadata.last_processed_staging_id);
    }

    if (metadata.can_restart !== undefined) {
      updates.push(`can_restart = $${paramIndex++}`);
      params.splice(-1, 0, metadata.can_restart);
    }

    const query = `
      UPDATE t_import_sessions
      SET ${updates.join(', ')}, updated_at = NOW()
      WHERE id = $2
    `;

    await this.db.query(query, params);
  }

  /**
   * Restart a timed-out or failed session
   */
  async restartSession(sessionId: number): Promise<ProcessingResult> {
    console.log(`[StagingProcessor] Restarting session ${sessionId}`);

    // Get session details
    const sessionQuery = `
      SELECT
        tenant_id,
        is_live,
        import_type,
        customer_lookup_method,
        status,
        can_restart
      FROM t_import_sessions
      WHERE id = $1
    `;

    const sessionResult = await this.db.query(sessionQuery, [sessionId]);

    if (sessionResult.rows.length === 0) {
      throw new Error('Session not found');
    }

    const session = sessionResult.rows[0];

    if (!session.can_restart) {
      throw new Error('Session cannot be restarted (status: ' + session.status + ')');
    }

    // Increment restart count
    await this.db.query(
      'UPDATE t_import_sessions SET restart_count = restart_count + 1, last_restart_at = NOW() WHERE id = $1',
      [sessionId]
    );

    // Process from checkpoint
    return this.processSession({
      sessionId,
      tenantId: session.tenant_id,
      isLive: session.is_live,
      importType: session.import_type,
      customerLookupMethod: session.customer_lookup_method || 'iwell_code'
    });
  }
}
