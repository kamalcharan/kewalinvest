// backend/src/jobs/marketOhlcDownload.executor.ts
// Market OHLC Download Job Executor - Daily 9:30 PM
// Downloads daily OHLC data for all registered market indices and calculates metrics

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
import { MarketService } from '../services/market.service';
import { marketMetricsCalculator } from '../services/marketMetricsCalculator.service';
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
  private marketService: MarketService;

  constructor() {
    this.db = pool;
    this.downloadService = new MarketDownloadService();
    this.marketService = new MarketService();
  }

  /**
   * Execute the market OHLC download job
   * Downloads EOD data for all indices and calculates metrics for newly downloaded data
   */
  async execute(context: JobExecutionContext): Promise<JobExecutionResult> {
    const startTime = Date.now();
    const executionData: MarketOhlcExecutionData = {
      download_date: new Date(),
      indices_processed: 0,
      indices_updated: 0,
      indices_failed: 0,
      metrics_calculated: 0,
      metrics_failed: 0,
      errors: []
    };

    try {
      SimpleLogger.info('MarketOhlcDownloadJob', 'Starting market OHLC download with metrics calculation', 'execute', {
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

      SimpleLogger.info('MarketOhlcDownloadJob', 'Market OHLC download completed, starting metrics calculation', 'execute', {
        total: result.total,
        successful: result.successful,
        failed: result.failed,
        skipped: result.skipped
      });

      // Calculate metrics for successfully downloaded indices
      const successfulDownloads = result.results.filter(r => r.success && r.recordsInserted > 0);

      for (const download of successfulDownloads) {
        try {
          await this.calculateMetricsForIndex(download.indexId);
          executionData.metrics_calculated = (executionData.metrics_calculated || 0) + 1;

          SimpleLogger.info('MarketOhlcDownloadJob', 'Metrics calculated for index', 'execute', {
            indexId: download.indexId,
            indexName: download.indexName
          });
        } catch (metricsError: any) {
          executionData.metrics_failed = (executionData.metrics_failed || 0) + 1;
          executionData.errors!.push({
            index_id: download.indexId,
            index_name: download.indexName,
            error_message: `Metrics calculation failed: ${metricsError.message}`
          });

          SimpleLogger.error('MarketOhlcDownloadJob', 'Metrics calculation failed for index', 'execute', {
            indexId: download.indexId,
            error: metricsError.message
          });
        }
      }

      SimpleLogger.info('MarketOhlcDownloadJob', 'Market OHLC job completed', 'execute', {
        total: result.total,
        successful: result.successful,
        failed: result.failed,
        skipped: result.skipped,
        metrics_calculated: executionData.metrics_calculated,
        metrics_failed: executionData.metrics_failed,
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
   * Calculate metrics for a specific index (for the latest date)
   * Only calculates for dates without metrics
   */
  private async calculateMetricsForIndex(indexId: number): Promise<void> {
    // Get all historical data for this index
    const allData = await this.marketService.getMarketData(
      indexId,
      undefined,
      undefined,
      1,
      100000
    );

    if (allData.data.length === 0) {
      throw new Error('No market data available for metrics calculation');
    }

    // Filter records without metrics (only calculate missing ones)
    const recordsToCalculate = allData.data.filter(d => !d.metrics_calculated_at);

    if (recordsToCalculate.length === 0) {
      SimpleLogger.info('MarketOhlcDownloadJob', 'All metrics already calculated', 'calculateMetricsForIndex', {
        indexId
      });
      return;
    }

    // Sort by date ascending (oldest first)
    recordsToCalculate.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Calculate for each missing date
    for (const record of recordsToCalculate) {
      const recordDate = new Date(record.date);

      // Get all historical data up to this date for context
      const historicalUpToDate = allData.data.filter(d =>
        new Date(d.date).getTime() <= recordDate.getTime()
      );

      // Convert to PricePoint format
      const pricePoints = historicalUpToDate.map(d => ({
        date: new Date(d.date),
        close: d.close,
        open: d.open,
        high: d.high,
        low: d.low,
        volume: d.volume
      }));

      // Calculate metrics
      const calculatedMetrics = await marketMetricsCalculator.calculateMetricsForDate(
        {
          date: recordDate,
          close: record.close,
          open: record.open,
          high: record.high,
          low: record.low,
          volume: record.volume
        },
        pricePoints
      );

      // Update database with metrics
      await this.updateMetricsInDatabase(record.id, calculatedMetrics);
    }

    SimpleLogger.info('MarketOhlcDownloadJob', 'Metrics calculation completed', 'calculateMetricsForIndex', {
      indexId,
      recordsProcessed: recordsToCalculate.length
    });
  }

  /**
   * Update metrics in database for a specific record
   */
  private async updateMetricsInDatabase(recordId: number, metrics: any): Promise<void> {
    const query = `
      UPDATE t_market_data_records
      SET
        daily_return = $2,
        return_1w = $3,
        return_1m = $4,
        return_3m = $5,
        return_6m = $6,
        return_1y = $7,
        return_ytd = $8,
        return_all = $9,
        sd_7d = $10,
        sd_14d = $11,
        sd_21d = $12,
        sd_42d = $13,
        sd_3m = $14,
        sd_6m = $15,
        count_3m = $16,
        count_42d = $17,
        sharpe_ratio = $18,
        max_drawdown = $19,
        total_risk = $20,
        cagr = $21,
        metrics_calculated_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `;

    const params = [
      recordId,
      metrics.daily_return,
      metrics.return_1w,
      metrics.return_1m,
      metrics.return_3m,
      metrics.return_6m,
      metrics.return_1y,
      metrics.return_ytd,
      metrics.return_all,
      metrics.sd_7d,
      metrics.sd_14d,
      metrics.sd_21d,
      metrics.sd_42d,
      metrics.sd_3m,
      metrics.sd_6m,
      metrics.count_3m,
      metrics.count_42d,
      metrics.sharpe_ratio,
      metrics.max_drawdown,
      metrics.total_risk,
      metrics.cagr
    ];

    await this.db.query(query, params);
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
