// backend/src/jobs/marketMetricsScheduler.ts
// Daily Metrics Calculation Scheduler (11 PM IST)

import cron from 'node-cron';
import { MarketService } from '../services/market.service';
import { marketMetricsCalculator } from '../services/marketMetricsCalculator.service';
import { SimpleLogger } from '../services/simpleLogger.service';
import { pool } from '../config/database';

interface SchedulerConfig {
  enabled: boolean;
  time: string; // HH:mm format (24-hour)
  timezone: string; // IANA timezone
  batchSize: number;
  retryFailed: boolean;
  retryAttempts: number;
}

interface JobResult {
  jobId: string;
  status: 'success' | 'partial' | 'failed';
  startedAt: Date;
  completedAt: Date;
  totalIndices: number;
  processedCount: number;
  failedCount: number;
  skippedCount: number;
  errors: Array<{ indexId: number; error: string }>;
  durationMs: number;
}

export class MarketMetricsScheduler {
  private marketService: MarketService;
  private config: SchedulerConfig;
  private task: cron.ScheduledTask | null = null;
  private isRunning: boolean = false;

  constructor() {
    this.marketService = new MarketService();
    this.config = {
      enabled: (process.env.MARKET_METRICS_ENABLED || 'true').toLowerCase() === 'true',
      time: process.env.MARKET_METRICS_CALC_TIME || '23:00',
      timezone: process.env.MARKET_METRICS_TIMEZONE || 'Asia/Kolkata',
      batchSize: parseInt(process.env.MARKET_METRICS_BATCH_SIZE || '50'),
      retryFailed: (process.env.MARKET_METRICS_RETRY_FAILED || 'true').toLowerCase() === 'true',
      retryAttempts: parseInt(process.env.MARKET_METRICS_RETRY_ATTEMPTS || '3')
    };

    SimpleLogger.info('MarketMetricsScheduler', 'Initialized', 'constructor', {
      enabled: this.config.enabled,
      time: this.config.time,
      timezone: this.config.timezone,
      batchSize: this.config.batchSize
    });
  }

  /**
   * Start the scheduler
   * Runs daily at configured time (default: 11 PM IST)
   */
  start(): void {
    if (!this.config.enabled) {
      SimpleLogger.warn('MarketMetricsScheduler', 'Scheduler is disabled', 'start', {
        reason: 'MARKET_METRICS_ENABLED is false'
      });
      return;
    }

    if (this.task) {
      SimpleLogger.warn('MarketMetricsScheduler', 'Scheduler already running', 'start');
      return;
    }

    // Parse time HH:mm
    const [hour, minute] = this.config.time.split(':').map(Number);

    // Create cron expression: run at HH:mm every day
    // Format: minute hour * * *
    const cronExpression = `${minute} ${hour} * * *`;

    try {
      // Schedule using cron with timezone
      this.task = cron.schedule(
        cronExpression,
        async () => {
          await this.runDailyCalculation();
        },
        {
          timezone: this.config.timezone,
          runOnInit: false
        }
      );

      SimpleLogger.info('MarketMetricsScheduler', 'Scheduler started', 'start', {
        cronExpression,
        timezone: this.config.timezone,
        nextRun: this.getNextRunTime()
      });

      console.log(`✅ Market Metrics Scheduler started`);
      console.log(`   Runs daily at ${this.config.time} ${this.config.timezone}`);
      console.log(`   Next run: ${this.getNextRunTime()}`);

    } catch (error: any) {
      SimpleLogger.error(
        'MarketMetricsScheduler',
        'Failed to start scheduler',
        'start',
        { error: error.message },
        undefined,
        undefined,
        error.stack
      );
      throw error;
    }
  }

  /**
   * Stop the scheduler
   */
  stop(): void {
    if (!this.task) {
      SimpleLogger.warn('MarketMetricsScheduler', 'Scheduler not running', 'stop');
      return;
    }

    this.task.stop();
    this.task = null;

    SimpleLogger.info('MarketMetricsScheduler', 'Scheduler stopped', 'stop');
    console.log('⏹️  Market Metrics Scheduler stopped');
  }

  /**
   * Get next scheduled run time
   */
  private getNextRunTime(): string {
    const now = new Date();
    const [hour, minute] = this.config.time.split(':').map(Number);

    let next = new Date(now);
    next.setHours(hour, minute, 0, 0);

    // If time has already passed today, schedule for tomorrow
    if (next <= now) {
      next.setDate(next.getDate() + 1);
    }

    return next.toLocaleString('en-IN', { timeZone: this.config.timezone });
  }

  /**
   * Main daily calculation job
   * This runs automatically at 11 PM IST every day
   */
  private async runDailyCalculation(): Promise<void> {
    if (this.isRunning) {
      SimpleLogger.warn('MarketMetricsScheduler', 'Calculation already in progress', 'runDailyCalculation');
      return;
    }

    const jobId = `metrics-${new Date().toISOString().split('T')[0]}-${Date.now()}`;
    const startTime = Date.now();
    const result: JobResult = {
      jobId,
      status: 'success',
      startedAt: new Date(),
      completedAt: new Date(),
      totalIndices: 0,
      processedCount: 0,
      failedCount: 0,
      skippedCount: 0,
      errors: [],
      durationMs: 0
    };

    this.isRunning = true;

    try {
      SimpleLogger.info('MarketMetricsScheduler', 'Daily calculation started', 'runDailyCalculation', { jobId });

      // Get all active indices
      const indicesResult = await this.marketService.getAllIndices({
        download_status: 'downloaded',
        page_size: 1000
      });

      const indices = indicesResult.indices;
      result.totalIndices = indices.length;

      if (indices.length === 0) {
        SimpleLogger.info('MarketMetricsScheduler', 'No indices with data to process', 'runDailyCalculation', { jobId });
        result.status = 'success';
        result.completedAt = new Date();
        result.durationMs = Date.now() - startTime;
        return;
      }

      // Process in batches
      for (let i = 0; i < indices.length; i += this.config.batchSize) {
        const batch = indices.slice(i, i + this.config.batchSize);

        const batchResults = await Promise.allSettled(
          batch.map(index => this.calculateMetricsForIndex(index.id))
        );

        // Process batch results
        for (const settledResult of batchResults) {
          if (settledResult.status === 'fulfilled') {
            if (settledResult.value.success) {
              result.processedCount++;
            } else {
              result.failedCount++;
              result.errors.push({
                indexId: settledResult.value.indexId,
                error: settledResult.value.error
              });
            }
          } else {
            result.failedCount++;
            result.errors.push({
              indexId: 0,
              error: settledResult.reason?.message || 'Unknown error'
            });
          }
        }
      }

      // Determine final status
      if (result.failedCount === 0) {
        result.status = 'success';
      } else if (result.processedCount > 0) {
        result.status = 'partial';
      } else {
        result.status = 'failed';
      }

      result.completedAt = new Date();
      result.durationMs = Date.now() - startTime;

      SimpleLogger.info('MarketMetricsScheduler', 'Daily calculation completed', 'runDailyCalculation', {
        jobId,
        status: result.status,
        processed: result.processedCount,
        failed: result.failedCount,
        durationMs: result.durationMs
      });

      console.log(`
✅ Market Metrics Calculation Completed
   Job ID: ${jobId}
   Status: ${result.status}
   Processed: ${result.processedCount}/${result.totalIndices}
   Failed: ${result.failedCount}
   Duration: ${(result.durationMs / 1000).toFixed(2)}s
      `);

    } catch (error: any) {
      result.status = 'failed';
      result.completedAt = new Date();
      result.durationMs = Date.now() - startTime;

      SimpleLogger.error(
        'MarketMetricsScheduler',
        'Daily calculation failed',
        'runDailyCalculation',
        {
          jobId,
          error: error.message,
          durationMs: result.durationMs
        },
        undefined,
        undefined,
        error.stack
      );

      console.error(`
❌ Market Metrics Calculation Failed
   Job ID: ${jobId}
   Error: ${error.message}
   Duration: ${(result.durationMs / 1000).toFixed(2)}s
      `);

    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Calculate metrics for a single index
   * Returns yesterday's metrics (for yesterday's EOD data)
   */
  private async calculateMetricsForIndex(
    indexId: number,
    attempt: number = 1
  ): Promise<{ success: boolean; indexId: number; error?: string }> {
    try {
      // Calculate for yesterday (assuming EOD data was downloaded yesterday)
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      // Get market data for index
      const marketData = await this.marketService.getMarketData(
        indexId,
        undefined, // Start from earliest
        yesterday,
        1,
        10000 // Get all records
      );

      if (marketData.data.length === 0) {
        return {
          success: true,
          indexId,
          error: 'No data available for index'
        };
      }

      // Find yesterday's data
      const yesterdayData = marketData.data.find(d => {
        const dataDate = new Date(d.date);
        return dataDate.toDateString() === yesterday.toDateString();
      });

      if (!yesterdayData) {
        return {
          success: true,
          indexId,
          error: 'No data for yesterday'
        };
      }

      // Check if metrics already calculated for yesterday
      if (yesterdayData.metrics_calculated_at) {
        return { success: true, indexId };
      }

      // Convert to PricePoint format
      const pricePoints = marketData.data.map(d => ({
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
          date: new Date(yesterdayData.date),
          close: yesterdayData.close,
          open: yesterdayData.open,
          high: yesterdayData.high,
          low: yesterdayData.low,
          volume: yesterdayData.volume
        },
        pricePoints
      );

      // Update database
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

      await pool.query(query, [
        yesterdayData.id,
        calculatedMetrics.daily_return,
        calculatedMetrics.return_1w,
        calculatedMetrics.return_1m,
        calculatedMetrics.return_3m,
        calculatedMetrics.return_6m,
        calculatedMetrics.return_1y,
        calculatedMetrics.return_ytd,
        calculatedMetrics.return_all,
        calculatedMetrics.sd_7d,
        calculatedMetrics.sd_14d,
        calculatedMetrics.sd_21d,
        calculatedMetrics.sd_42d,
        calculatedMetrics.sd_3m,
        calculatedMetrics.sd_6m,
        calculatedMetrics.count_3m,
        calculatedMetrics.count_42d,
        calculatedMetrics.sharpe_ratio,
        calculatedMetrics.max_drawdown,
        calculatedMetrics.total_risk,
        calculatedMetrics.cagr
      ]);

      return { success: true, indexId };

    } catch (error: any) {
      // Retry logic
      if (this.config.retryFailed && attempt < this.config.retryAttempts) {
        SimpleLogger.warn(
          'MarketMetricsScheduler',
          `Retrying calculation for index ${indexId}`,
          'calculateMetricsForIndex',
          { attempt, error: error.message }
        );

        // Wait before retry
        await new Promise(resolve =>
          setTimeout(resolve, parseInt(process.env.MARKET_METRICS_RETRY_DELAY_MS || '5000'))
        );

        return this.calculateMetricsForIndex(indexId, attempt + 1);
      }

      SimpleLogger.error(
        'MarketMetricsScheduler',
        'Failed to calculate metrics for index',
        'calculateMetricsForIndex',
        { indexId, attempt, error: error.message },
        undefined,
        undefined,
        error.stack
      );

      return {
        success: false,
        indexId,
        error: error.message || 'Calculation failed'
      };
    }
  }
}

// Export singleton instance
export const marketMetricsScheduler = new MarketMetricsScheduler();