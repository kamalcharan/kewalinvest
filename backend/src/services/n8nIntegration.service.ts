// backend/src/services/n8nIntegration.service.ts
import { ImportService } from './import.service';
import { FileImportType } from '../types/import.types';

interface N8NTriggerParams {
  sessionId: number;
  importType: string;
  tenantId: number;
  isLive: boolean;
  batchSize?: number;
  callbackUrl?: string;
  metadata?: any;
}

interface N8NCallbackPayload {
  sessionId: number;
  batchNumber: number;
  status: 'processing' | 'completed' | 'failed';
  processedRecords: number;
  results: Array<{
    stagingRecordId: number;
    status: 'success' | 'failed' | 'duplicate' | 'skipped';
    errorMessages?: string[];
    warnings?: string[];
    createdRecordId?: number;
    createdRecordType?: string;
  }>;
  summary?: {
    successCount: number;
    failedCount: number;
    duplicateCount: number;
    processingTime: number;
  };
  error?: string;
}

export class N8NIntegrationService {
  private importService: ImportService;
  private readonly N8N_BASE_URL: string;
  private readonly N8N_API_KEY: string | undefined;
  private readonly WEBHOOK_TIMEOUT: number;
  private readonly MAX_RETRIES: number = 3;
  private readonly RETRY_DELAY: number = 1000;

  constructor() {
    this.importService = new ImportService();
    this.N8N_BASE_URL = process.env.N8N_BASE_URL || 'http://localhost:5678';
    this.N8N_API_KEY = process.env.N8N_API_KEY;
    this.WEBHOOK_TIMEOUT = parseInt(process.env.N8N_WEBHOOK_TIMEOUT || '30000');
  }

  /**
   * Trigger N8N workflow for data processing
   */
  async triggerWorkflow(params: N8NTriggerParams): Promise<{ 
    success: boolean; 
    executionId?: string; 
    error?: string 
  }> {
    const { sessionId, importType, tenantId, isLive, batchSize = 100 } = params;

    try {
      console.log(`[N8N] Triggering workflow for session ${sessionId}, type: ${importType}`);

      // Update session status to processing
      await this.importService.updateImportSession(tenantId, isLive, sessionId, {
        status: 'processing',
        processing_started_at: new Date(),
        batch_size: batchSize
      });

      // Build webhook URL
      const webhookUrl = `${this.N8N_BASE_URL}/webhook/master-import-processor`;
      
      // Build callback URL
      const callbackUrl = params.callbackUrl || 
        `${process.env.API_BASE_URL || 'http://localhost:8080'}/api/import/n8n-callback`;

      // Prepare payload
      const payload = {
        sessionId,
        importType,
        tenantId,
        isLive,
        batchSize,
        callbackUrl,
        apiBaseUrl: process.env.API_BASE_URL || 'http://localhost:8080',
        metadata: {
          triggerTime: new Date().toISOString(),
          environment: process.env.NODE_ENV,
          ...params.metadata
        }
      };

      // Make request with retry logic
      let lastError: Error | null = null;
      let executionId: string | null = null;

      for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
        try {
          executionId = await this.makeWebhookRequest(webhookUrl, payload);
          break;
        } catch (error: any) {
          lastError = error;
          console.error(`[N8N] Attempt ${attempt} failed:`, error.message);
          
          if (attempt < this.MAX_RETRIES) {
            const delay = this.RETRY_DELAY * Math.pow(2, attempt - 1);
            console.log(`[N8N] Retrying in ${delay}ms...`);
            await this.sleep(delay);
          }
        }
      }

      if (!executionId && lastError) {
        throw lastError;
      }

      // Update session with execution ID
      await this.importService.updateImportSession(tenantId, isLive, sessionId, {
        n8n_execution_id: executionId,
        n8n_webhook_id: 'master-import-processor'
      });

      console.log(`[N8N] Workflow triggered successfully, executionId: ${executionId}`);

      return {
        success: true,
        executionId: executionId || undefined
      };

    } catch (error: any) {
      console.error(`[N8N] Workflow trigger failed for session ${sessionId}:`, error);
      
      // Update session with failure
      await this.importService.updateImportSession(tenantId, isLive, sessionId, {
        status: 'failed',
        error_summary: `N8N workflow trigger failed: ${error.message}`,
        processing_completed_at: new Date()
      });

      return {
        success: false,
        error: error.message || 'Failed to trigger N8N workflow'
      };
    }
  }

  /**
   * Make webhook request to N8N
   */
  private async makeWebhookRequest(url: string, payload: any): Promise<string> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.WEBHOOK_TIMEOUT);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.N8N_API_KEY && { 'Authorization': `Bearer ${this.N8N_API_KEY}` })
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json() as any;
      
      const executionId = result.executionId || 
                         result.id || 
                         result.data?.executionId ||
                         `n8n_${Date.now()}_${payload.sessionId}`;

      return executionId;

    } catch (error: any) {
      if (error.name === 'AbortError') {
        throw new Error(`N8N webhook timeout after ${this.WEBHOOK_TIMEOUT}ms`);
      }
      throw error;
    }
  }

  /**
   * Handle N8N callback with processing results
   */
  async handleCallback(payload: N8NCallbackPayload): Promise<void> {
    const { sessionId, batchNumber, status, results, summary } = payload;

    console.log(`[N8N Callback] Session ${sessionId}, Batch ${batchNumber}, Status: ${status}`);
    console.log(`[N8N Callback] Results: ${results.length} records processed`);

    const client = await this.importService['db'].connect();
    let sessionData: any = null;

    try {
      await client.query('BEGIN');

      // Get session to verify it exists
      const sessionResult = await client.query(
        'SELECT * FROM t_import_sessions WHERE id = $1',
        [sessionId]
      );

      if (sessionResult.rows.length === 0) {
        throw new Error(`Session ${sessionId} not found`);
      }

      sessionData = sessionResult.rows[0];

      // Process each result
      for (const result of results) {
        await client.query(`
          UPDATE t_import_staging_data
          SET 
            processing_status = $1,
            error_messages = $2,
            warnings = $3,
            created_record_id = $4,
            created_record_type = $5,
            processed_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = $6 AND session_id = $7
        `, [
          result.status,
          result.errorMessages || null,
          result.warnings || null,
          result.createdRecordId || null,
          result.createdRecordType || null,
          result.stagingRecordId,
          sessionId
        ]);
      }

      // Update session statistics
      const statsResult = await client.query(`
        SELECT 
          COUNT(*) as total_count,
          COUNT(*) FILTER (WHERE processing_status = 'success') as success_count,
          COUNT(*) FILTER (WHERE processing_status = 'failed') as failed_count,
          COUNT(*) FILTER (WHERE processing_status = 'duplicate') as duplicate_count,
          COUNT(*) FILTER (WHERE processing_status IN ('success', 'failed', 'duplicate', 'skipped')) as processed_count,
          COUNT(*) FILTER (WHERE processing_status = 'pending') as pending_count
        FROM t_import_staging_data
        WHERE session_id = $1
      `, [sessionId]);

      const stats = statsResult.rows[0];

      // Determine overall session status
      let sessionStatus = 'processing';
      if (stats.pending_count === 0) {
        sessionStatus = stats.failed_count > 0 ? 'completed_with_errors' : 'completed';
      } else if (status === 'failed') {
        sessionStatus = 'failed';
      }

      // Update session
      await client.query(`
        UPDATE t_import_sessions
        SET 
          status = $1,
          total_records = $2,
          processed_records = $3,
          successful_records = $4,
          failed_records = $5,
          duplicate_records = $6,
          current_batch = $7,
          last_processed_row = $8,
          processing_metadata = processing_metadata || $9::jsonb,
          ${sessionStatus.startsWith('completed') || sessionStatus === 'failed' 
            ? 'processing_completed_at = CURRENT_TIMESTAMP,' : ''}
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $10
      `, [
        sessionStatus,
        stats.total_count,
        stats.processed_count,
        stats.success_count,
        stats.failed_count,
        stats.duplicate_count,
        batchNumber,
        Math.max(...results.map(r => r.stagingRecordId)),
        JSON.stringify({ 
          lastBatch: batchNumber, 
          lastBatchTime: new Date().toISOString(),
          ...summary 
        }),
        sessionId
      ]);

      await client.query('COMMIT');

      console.log(`[N8N Callback] Session ${sessionId} updated successfully`);

    } catch (error: any) {
      await client.query('ROLLBACK');
      console.error('[N8N Callback] Error processing callback:', error);
      
      // Try to update session with error
      if (sessionData) {
        try {
          await this.importService.updateImportSession(
            sessionData.tenant_id,
            sessionData.is_live,
            sessionId,
            {
              status: 'failed',
              error_summary: `Callback processing failed: ${error.message}`,
              processing_completed_at: new Date()
            }
          );
        } catch (updateError) {
          console.error('[N8N Callback] Failed to update session with error:', updateError);
        }
      }
      
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Cancel N8N workflow execution
   */
  async cancelWorkflow(executionId: string): Promise<boolean> {
    if (!this.N8N_API_KEY) {
      console.warn('[N8N] Cannot cancel workflow - API key not configured');
      return false;
    }

    try {
      console.log(`[N8N] Cancelling workflow execution: ${executionId}`);

      const response = await fetch(
        `${this.N8N_BASE_URL}/api/v1/executions/${executionId}/stop`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.N8N_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: '{}'
        }
      );

      if (response.status === 200) {
        console.log(`[N8N] Successfully cancelled workflow: ${executionId}`);
        return true;
      } else if (response.status === 404) {
        console.log(`[N8N] Workflow ${executionId} not found or already completed`);
        return true;
      } else {
        console.error(`[N8N] Failed to cancel workflow: ${response.status}`);
        return false;
      }

    } catch (error: any) {
      console.error('[N8N] Error cancelling workflow:', error);
      return false;
    }
  }

  /**
   * Get workflow execution status
   */
  async getWorkflowStatus(executionId: string): Promise<any> {
    if (!this.N8N_API_KEY) {
      return null;
    }

    try {
      const response = await fetch(
        `${this.N8N_BASE_URL}/api/v1/executions/${executionId}`,
        {
          headers: {
            'Authorization': `Bearer ${this.N8N_API_KEY}`
          }
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const execution = await response.json() as any;
      
      return {
        id: execution.id,
        workflowId: execution.workflowId,
        status: execution.finished 
          ? (execution.mode === 'error' ? 'error' : 'success')
          : 'running',
        startedAt: execution.startedAt,
        stoppedAt: execution.stoppedAt,
        executionTime: execution.executionTime,
        data: execution.data
      };

    } catch (error: any) {
      console.error('[N8N] Error fetching workflow status:', error);
      return null;
    }
  }

  /**
   * Test N8N connectivity
   */
  async testConnection(): Promise<{ 
    success: boolean; 
    message: string; 
    latency?: number 
  }> {
    const startTime = Date.now();

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(
        `${this.N8N_BASE_URL}/healthz`,
        { signal: controller.signal }
      );

      clearTimeout(timeoutId);
      const latency = Date.now() - startTime;

      if (response.status === 200) {
        return {
          success: true,
          message: `Connected to N8N (${latency}ms)`,
          latency
        };
      } else {
        return {
          success: false,
          message: `N8N health check failed: ${response.status}`,
          latency
        };
      }

    } catch (error: any) {
      const latency = Date.now() - startTime;
      
      if (error.name === 'AbortError') {
        return {
          success: false,
          message: 'N8N connection timeout (5s)',
          latency
        };
      }
      
      return {
        success: false,
        message: `N8N connection failed: ${error.message}`,
        latency
      };
    }
  }

  /**
   * Validate N8N configuration
   */
  async validateConfiguration(): Promise<{ 
    isValid: boolean; 
    errors: string[]; 
    warnings: string[] 
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check environment variables
    if (!process.env.N8N_BASE_URL) {
      errors.push('N8N_BASE_URL environment variable not configured');
    } else {
      try {
        new URL(process.env.N8N_BASE_URL);
      } catch {
        errors.push('N8N_BASE_URL is not a valid URL');
      }
    }

    if (!this.N8N_API_KEY) {
      warnings.push('N8N_API_KEY not configured - workflow management features disabled');
    }

    if (!process.env.API_BASE_URL) {
      warnings.push('API_BASE_URL not configured - N8N callbacks may fail');
    }

    // Test connectivity if URL is configured
    if (process.env.N8N_BASE_URL && errors.length === 0) {
      const connectionTest = await this.testConnection();
      if (!connectionTest.success) {
        errors.push(`N8N connectivity test failed: ${connectionTest.message}`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Helper: Sleep for retry logic
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
} 