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
  processing_status: string;
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
    
    let processedCount = 0;
    let successCount = 0;
    let failedCount = 0;
    let duplicateCount = 0;
    let orphanCount = 0;
    let lastProcessedId: number | undefined;

    console.log(`[StagingProcessor] Starting Phase 2 for session ${params.sessionId}, type: ${params.importType}, lookup method: ${params.customerLookupMethod}`);

    try {
      // Update session status to 'processing'
      await this.updateSessionStatus(params.sessionId, 'processing', {
        processing_started_at: new Date()
      });

      // =====================================================
      // TRANSACTION DATA - Use PostgreSQL Function
      // =====================================================
      if (params.importType === 'TransactionData') {
        console.log(`[StagingProcessor] Using PostgreSQL function for TransactionData processing`);
        
        const result = await this.db.query(
          'SELECT * FROM process_transaction_import_session($1, $2)',
          [params.sessionId, params.customerLookupMethod || 'iwell_code']
        );

        const stats = result.rows[0];
        
        processedCount = stats.total_processed || 0;
        successCount = stats.successful || 0;
        failedCount = stats.failed || 0;
        duplicateCount = stats.duplicates || 0;
        orphanCount = stats.orphans || 0;

        console.log(`[StagingProcessor] PostgreSQL processing completed:`, {
          processed: processedCount,
          successful: successCount,
          failed: failedCount,
          duplicates: duplicateCount,
          orphans: orphanCount,
          timeSeconds: stats.processing_time_seconds
        });

        // Session status already updated by PostgreSQL function
        return {
          success: true,
          processedCount,
          successCount,
          failedCount,
          duplicateCount,
          orphanCount,
          timedOut: false
        };
      }

      // =====================================================
      // CUSTOMER DATA & SCHEME DATA - Use Existing Logic
      // =====================================================
      const timeoutMs = params.timeoutMs || 20 * 60 * 1000;
      const batchSize = params.batchSize || 100;
      let timedOut = false;

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
        finalStatus = 'pending_processing';
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
        orphan_records: orphanCount,
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
        orphan_records: orphanCount,
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

        // Note: For CustomerData and SchemeData, the DB function already updated the staging record
        // No need to update staging record here

      } catch (error: any) {
        console.error(`[StagingProcessor] Error processing record ${record.id}:`, error);
        failed++;
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
  }> {
    const data = record.mapped_data;

    // ======================================================================
    // TRANSACTION DATA - Should not reach here (handled by PostgreSQL)
    // ======================================================================
    if (params.importType === 'TransactionData') {
      console.warn(`[StagingProcessor] TransactionData record reached processRecord - this should not happen`);
      return {
        status: 'failed',
        error_messages: ['TransactionData should be processed by PostgreSQL function']
      };
    }

    // ======================================================================
    // CUSTOMER DATA PROCESSING
    // ======================================================================
    if (params.importType === 'CustomerData') {
      try {
        await this.db.query('SELECT process_single_customer_record($1)', [record.id]);

        // Read the staging record to get the status the DB function set
        const statusResult = await this.db.query(
          'SELECT processing_status FROM t_import_staging_data WHERE id = $1',
          [record.id]
        );

        const dbStatus = statusResult.rows[0]?.processing_status || 'failed';
        return { status: dbStatus as any };

      } catch (error: any) {
        console.error('[StagingProcessor] Customer import DB function error:', error);
        return { status: 'failed' };
      }
    }

    // ======================================================================
    // SCHEME DATA PROCESSING
    // ======================================================================
    if (params.importType === 'SchemeData') {
      try {
        await this.db.query('SELECT process_single_scheme_record($1)', [record.id]);

        // Read the staging record to get the status the DB function set
        const statusResult = await this.db.query(
          'SELECT processing_status FROM t_import_staging_data WHERE id = $1',
          [record.id]
        );

        const dbStatus = statusResult.rows[0]?.processing_status || 'failed';
        return { status: dbStatus as any };

      } catch (error: any) {
        console.error('[StagingProcessor] Scheme import DB function error:', error);
        return { status: 'failed' };
      }
    }

    // Unknown import type
    return {
      status: 'failed',
      error_messages: [`Unsupported import type: ${params.importType}`]
    };
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
      SELECT id, row_number, mapped_data, processing_status
      FROM t_import_staging_data
      WHERE session_id = $1
        AND id > $2
        AND processing_status = 'pending'
      ORDER BY id ASC
      LIMIT $3
    `;

    const result = await this.db.query(query, [sessionId, startFromId, batchSize]);
    return result.rows;
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
        orphan_records = $6,
        processing_checkpoint = jsonb_build_object(
          'last_processed_id', $7::bigint,
          'processed', $8::integer,
          'success', $9::integer,
          'failed', $10::integer,
          'duplicate', $11::integer,
          'orphan', $12::integer,
          'updated_at', NOW()
        )
      WHERE id = $13
    `;

    await this.db.query(query, [
      lastProcessedId,           // $1
      counts.processedCount,     // $2
      counts.successCount,       // $3
      counts.failedCount,        // $4
      counts.duplicateCount,     // $5
      counts.orphanCount,        // $6
      lastProcessedId,           // $7 (for JSONB)
      counts.processedCount,     // $8
      counts.successCount,       // $9
      counts.failedCount,        // $10
      counts.duplicateCount,     // $11
      counts.orphanCount,        // $12
      sessionId                  // $13
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
      orphan_records?: number;
      error_summary?: string;
      last_processed_staging_id?: number;
      can_restart?: boolean;
    }
  ): Promise<void> {
    const updates: string[] = ['status = $1'];
    const params: any[] = [status];
    let paramIndex = 2;

    if (metadata.processing_started_at !== undefined) {
      updates.push(`processing_started_at = $${paramIndex++}`);
      params.push(metadata.processing_started_at);
    }

    if (metadata.processing_completed_at !== undefined) {
      updates.push(`processing_completed_at = $${paramIndex++}`);
      params.push(metadata.processing_completed_at);
    }

    if (metadata.processed_records !== undefined) {
      updates.push(`processed_records = $${paramIndex++}`);
      params.push(metadata.processed_records);
    }

    if (metadata.successful_records !== undefined) {
      updates.push(`successful_records = $${paramIndex++}`);
      params.push(metadata.successful_records);
    }

    if (metadata.failed_records !== undefined) {
      updates.push(`failed_records = $${paramIndex++}`);
      params.push(metadata.failed_records);
    }

    if (metadata.duplicate_records !== undefined) {
      updates.push(`duplicate_records = $${paramIndex++}`);
      params.push(metadata.duplicate_records);
    }

    if (metadata.orphan_records !== undefined) {
      updates.push(`orphan_records = $${paramIndex++}`);
      params.push(metadata.orphan_records);
    }

    if (metadata.error_summary !== undefined) {
      updates.push(`error_summary = $${paramIndex++}`);
      params.push(metadata.error_summary);
    }

    if (metadata.last_processed_staging_id !== undefined) {
      updates.push(`last_processed_staging_id = $${paramIndex++}`);
      params.push(metadata.last_processed_staging_id);
    }

    if (metadata.can_restart !== undefined) {
      updates.push(`can_restart = $${paramIndex++}`);
      params.push(metadata.can_restart);
    }

    // sessionId goes last
    params.push(sessionId);

    const query = `
      UPDATE t_import_sessions
      SET ${updates.join(', ')}, updated_at = NOW()
      WHERE id = $${paramIndex}
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