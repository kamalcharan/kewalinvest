// backend/src/jobs/marketOhlcDownload.executor.ts
// Market OHLC Download Job Executor - Daily 9:30 PM
// Downloads daily OHLC data for all registered market indices

import { Pool } from 'pg';
import { pool } from '../config/database';
import {
  JobType,
  JobExecutor,
  JobExecutionContext,
  JobExecutionResult,
  MarketOhlcExecutionData
} from '../types/jobs.types';
import { MarketDownloadService } from '../services/marketDownload.service';
import { SimpleLogger } from '../services/simpleLogger.service';

/**
 * Market OHLC Download Job Executor
 *
 * Downloads End-of-Day (EOD) OHLC data for all registered market indices.
 * Uses Yahoo Finance as the data provider.
 *
 * For each provider-enabled index:
 * 1. Fetches latest OHLC data from Yahoo Finance
 * 2. Checks if data already exists for the date
 * 3. Inserts/updates the data in t_market_data
 * 4. Updates index status (last_download_status, last_download_at)
 *
 * Schedule: Daily 9:30 PM IST
 * This is a GLOBAL job - market data is shared across all tenants.
 */
export class MarketOhlcDownloadExecutor implements JobExecutor {
  readonly jobType = JobType.MARKET_OHLC_DOWNLOAD;
  private db: Pool;
  private downloadService: MarketDownloadService;

  constructor() {
    this.db = pool;
    this.downloadService = new MarketDownloadService();
  }

  /**
   * Execute the market OHLC download job
   */
  async execute(context: JobExecutionContext): Promise<JobExecutionResult> {
    const startTime = Date.now();
    const executionData: MarketOhlcExecutionData = {
      download_date: new Date(),
      indices_processed: 0,
      indices_updated: 0,
      indices_failed: 0,
      errors: []
    };

    try {
      SimpleLogger.info('MarketOhlcDownloadJob', 'Starting market OHLC download', 'execute', {
        trigger_source: context.trigger_source
      });

      // Use the existing service method that downloads EOD for all indices
      const result = await this.downloadService.downloadEODForAllIndices();

      executionData.indices_processed = result.total;
      executionData.indices_updated = result.successful;
      executionData.indices_failed = result.failed;

      // Collect errors from failed downloads
      for (const downloadResult of result.results) {
        if (!downloadResult.success && downloadResult.error) {
          executionData.errors!.push({
            index_id: downloadResult.indexId,
            index_name: downloadResult.indexName,
            error_message: downloadResult.error
          });
        }
      }

      SimpleLogger.info('MarketOhlcDownloadJob', 'Market OHLC download completed', 'execute', {
        total: result.total,
        successful: result.successful,
        failed: result.failed,
        skipped: result.skipped,
        duration_ms: Date.now() - startTime
      });

      // Consider job successful if more than 80% succeeded or there were no enabled indices
      const successRate = executionData.indices_processed > 0
        ? executionData.indices_updated / executionData.indices_processed
        : 1;

      return {
        success: successRate >= 0.8 || executionData.indices_processed === 0,
        execution_data: executionData,
        execution_duration_ms: Date.now() - startTime,
        error: successRate < 0.8 ? `${executionData.indices_failed} indices failed to download` : undefined
      };

    } catch (error: any) {
      SimpleLogger.error('MarketOhlcDownloadJob', 'Market OHLC download failed', 'execute', {
        error: error.message
      }, undefined, undefined, error.stack);

      return {
        success: false,
        execution_data: executionData,
        execution_duration_ms: Date.now() - startTime,
        error: error.message,
        error_details: { stack: error.stack }
      };
    }
  }

  /**
   * Validate job configuration
   */
  validateConfig(config: any): boolean {
    return true;
  }

  /**
   * Get default configuration
   */
  getDefaultConfig(): any {
    return {
      schedule_type: 'daily',
      cron_expression: '30 21 * * *' // Daily 9:30 PM
    };
  }
}

// Export singleton instance
export const marketOhlcDownloadExecutor = new MarketOhlcDownloadExecutor();
