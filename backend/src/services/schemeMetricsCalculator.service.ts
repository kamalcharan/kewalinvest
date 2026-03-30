// backend/src/services/schemeMetricsCalculator.service.ts
// Service for calculating metrics for mutual fund schemes
// Wrapper around marketMetricsCalculator to work with NAV data

import { Pool } from 'pg';
import { pool } from '../config/database';
import { marketMetricsCalculator, PricePoint, CalculatedMetrics } from './marketMetricsCalculator.service';
import { SimpleLogger } from './simpleLogger.service';

interface NavDataRecord {
  id: number;
  scheme_id: number;
  scheme_code: string;
  nav_date: Date;
  nav_value: number;
  is_live: boolean;
}

// Extended interface that allows calculated_at to be Date or string (from DB)
interface StoredCalculatedMetrics extends Omit<CalculatedMetrics, 'calculated_at'> {
  calculated_at?: Date | string;
}

interface CalculationResult {
  success: boolean;
  schemeId: number;
  date: string;
  metrics?: CalculatedMetrics;
  error?: string;
}

interface BatchCalculationResult {
  totalSchemes: number;
  successful: number;
  failed: number;
  errors: Array<{
    schemeId: number;
    schemeCode: string;
    error: string;
  }>;
  executionTimeMs: number;
}

export class SchemeMetricsCalculator {
  private db: Pool;

  constructor() {
    this.db = pool;
  }

  /**
   * Calculate metrics for a single scheme on a specific date
   * @param schemeId Scheme ID
   * @param asOfDate Date to calculate metrics for (defaults to latest available)
   * @param isLive Whether to use live or test data
   * @returns Calculation result with metrics
   */
  async calculateForScheme(
    schemeId: number,
    asOfDate?: Date,
    isLive: boolean = true
  ): Promise<CalculationResult> {
    const startTime = Date.now();

    try {
      // Validate inputs
      if (!schemeId || schemeId <= 0) {
        throw new Error('Invalid scheme ID');
      }

      // Step 1: Get scheme details
      const schemeQuery = `
        SELECT id, scheme_code, scheme_name 
        FROM t_scheme_details 
        WHERE id = $1 AND is_active = true
      `;
      const schemeResult = await this.db.query(schemeQuery, [schemeId]);

      if (schemeResult.rows.length === 0) {
        throw new Error(`Scheme not found: ${schemeId}`);
      }

      const scheme = schemeResult.rows[0];

      // Step 2: Fetch all NAV data up to asOfDate
      const navData = await this.getNavDataForScheme(schemeId, asOfDate, isLive);

      if (navData.length === 0) {
        throw new Error(`No NAV data available for scheme ${scheme.scheme_code}`);
      }

      // Step 3: Check if metrics already calculated for this date
      const targetDate = asOfDate || navData[navData.length - 1].nav_date;
      const existingMetrics = await this.checkMetricsExist(schemeId, targetDate, isLive);

      if (existingMetrics) {
        SimpleLogger.info(
          'SchemeMetricsCalculator',
          'Metrics already calculated',
          'calculateForScheme',
          {
            schemeId,
            schemeCode: scheme.scheme_code,
            date: targetDate.toISOString().split('T')[0],
            calculatedAt: existingMetrics.calculated_at
          }
        );

        return {
          success: true,
          schemeId,
          date: targetDate.toISOString().split('T')[0],
          metrics: existingMetrics as CalculatedMetrics,
          error: 'Metrics already calculated for this date'
        };
      }

      // Step 4: Convert NAV data to PricePoint format
      const pricePoints: PricePoint[] = navData.map(nd => ({
        date: new Date(nd.nav_date),
        close: nd.nav_value,
        open: nd.nav_value,  // NAV doesn't have open/high/low, use same value
        high: nd.nav_value,
        low: nd.nav_value,
        volume: 0  // Not applicable for NAV
      }));

      // Step 5: Get today's NAV (last record)
      const todayNav = pricePoints[pricePoints.length - 1];

      SimpleLogger.info(
        'SchemeMetricsCalculator',
        'Starting metrics calculation',
        'calculateForScheme',
        {
          schemeId,
          schemeCode: scheme.scheme_code,
          date: todayNav.date.toISOString().split('T')[0],
          totalDataPoints: pricePoints.length
        }
      );

      // Step 6: Calculate metrics using existing calculator
      const calculatedMetrics = await marketMetricsCalculator.calculateMetricsForDate(
        todayNav,
        pricePoints
      );

      // Step 7: Store metrics in database
      await this.storeMetrics(schemeId, todayNav.date, calculatedMetrics, isLive);

      const executionTime = Date.now() - startTime;

      SimpleLogger.info(
        'SchemeMetricsCalculator',
        'Metrics calculated successfully',
        'calculateForScheme',
        {
          schemeId,
          schemeCode: scheme.scheme_code,
          date: calculatedMetrics.date,
          executionTimeMs: executionTime
        }
      );

      return {
        success: true,
        schemeId,
        date: calculatedMetrics.date,
        metrics: calculatedMetrics
      };

    } catch (error: any) {
      const executionTime = Date.now() - startTime;

      SimpleLogger.error(
        'SchemeMetricsCalculator',
        'Failed to calculate metrics',
        'calculateForScheme',
        {
          schemeId,
          asOfDate: asOfDate?.toISOString().split('T')[0],
          error: error.message,
          executionTimeMs: executionTime
        },
        undefined,
        undefined,
        error.stack
      );

      return {
        success: false,
        schemeId,
        date: asOfDate?.toISOString().split('T')[0] || 'unknown',
        error: error.message
      };
    }
  }

  /**
   * Calculate metrics for ALL pending dates for a scheme
   * This calculates metrics for every NAV record that doesn't have metrics_calculated_at set
   * @param schemeId Scheme ID
   * @param isLive Whether to use live or test data
   * @returns Calculation result with count of calculated dates
   */
  async calculateAllPendingForScheme(
    schemeId: number,
    isLive: boolean = true
  ): Promise<{
    success: boolean;
    schemeId: number;
    totalDates: number;
    calculatedDates: number;
    skippedDates: number;
    errors: string[];
    executionTimeMs: number;
  }> {
    const startTime = Date.now();
    const errors: string[] = [];
    let calculatedDates = 0;
    let skippedDates = 0;

    try {
      // Get scheme details
      const schemeQuery = `
        SELECT id, scheme_code, scheme_name
        FROM t_scheme_details
        WHERE id = $1 AND is_active = true
      `;
      const schemeResult = await this.db.query(schemeQuery, [schemeId]);

      if (schemeResult.rows.length === 0) {
        throw new Error(`Scheme not found: ${schemeId}`);
      }

      const scheme = schemeResult.rows[0];

      // Get all NAV dates that need metrics calculation
      const pendingDatesQuery = `
        SELECT nav_date, nav_value
        FROM t_nav_data
        WHERE scheme_id = $1
          AND metrics_calculated_at IS NULL
        ORDER BY nav_date ASC
      `;
      const pendingResult = await this.db.query(pendingDatesQuery, [schemeId]);
      const pendingDates = pendingResult.rows;

      // Debug: Check total records vs pending
      const totalQuery = `SELECT COUNT(*) as total, COUNT(metrics_calculated_at) as with_metrics FROM t_nav_data WHERE scheme_id = $1`;
      const totalResult = await this.db.query(totalQuery, [schemeId]);
      const { total, with_metrics } = totalResult.rows[0] || { total: 0, with_metrics: 0 };

      SimpleLogger.info(
        'SchemeMetricsCalculator',
        'NAV data status for scheme',
        'calculateAllPendingForScheme',
        {
          schemeId,
          schemeCode: scheme.scheme_code,
          totalRecords: total,
          recordsWithMetrics: with_metrics,
          pendingToCalculate: pendingDates.length
        }
      );

      if (pendingDates.length === 0) {
        SimpleLogger.info(
          'SchemeMetricsCalculator',
          'No pending dates to calculate',
          'calculateAllPendingForScheme',
          { schemeId, schemeCode: scheme.scheme_code, totalRecords: total, alreadyCalculated: with_metrics }
        );

        return {
          success: true,
          schemeId,
          totalDates: 0,
          calculatedDates: 0,
          skippedDates: 0,
          errors: [],
          executionTimeMs: Date.now() - startTime
        };
      }

      SimpleLogger.info(
        'SchemeMetricsCalculator',
        `Starting calculation for ${pendingDates.length} pending dates`,
        'calculateAllPendingForScheme',
        { schemeId, schemeCode: scheme.scheme_code, pendingCount: pendingDates.length }
      );

      // Get ALL NAV data for the scheme (needed for historical calculations)
      const allNavData = await this.getNavDataForScheme(schemeId, undefined, isLive);

      if (allNavData.length === 0) {
        throw new Error(`No NAV data available for scheme ${scheme.scheme_code}`);
      }

      // Convert to PricePoint format
      const allPricePoints: PricePoint[] = allNavData.map(nd => ({
        date: new Date(nd.nav_date),
        close: nd.nav_value,
        open: nd.nav_value,
        high: nd.nav_value,
        low: nd.nav_value,
        volume: 0
      }));

      // Calculate metrics for each pending date
      for (const pendingDate of pendingDates) {
        try {
          const targetDate = new Date(pendingDate.nav_date);

          // Get price points up to this date for calculation
          const pricePointsUpToDate = allPricePoints.filter(pp => pp.date <= targetDate);

          if (pricePointsUpToDate.length < 2) {
            // Need at least 2 data points for meaningful calculations
            skippedDates++;
            continue;
          }

          const todayNav = pricePointsUpToDate[pricePointsUpToDate.length - 1];

          // Calculate metrics
          const calculatedMetrics = await marketMetricsCalculator.calculateMetricsForDate(
            todayNav,
            pricePointsUpToDate
          );

          // Store metrics
          await this.storeMetrics(schemeId, targetDate, calculatedMetrics, isLive);
          calculatedDates++;

        } catch (dateError: any) {
          errors.push(`Date ${pendingDate.nav_date}: ${dateError.message}`);
          skippedDates++;
        }
      }

      const executionTime = Date.now() - startTime;

      SimpleLogger.info(
        'SchemeMetricsCalculator',
        'Completed calculating all pending dates',
        'calculateAllPendingForScheme',
        {
          schemeId,
          schemeCode: scheme.scheme_code,
          totalDates: pendingDates.length,
          calculatedDates,
          skippedDates,
          errors: errors.length,
          executionTimeMs: executionTime
        }
      );

      return {
        success: true,
        schemeId,
        totalDates: pendingDates.length,
        calculatedDates,
        skippedDates,
        errors,
        executionTimeMs: executionTime
      };

    } catch (error: any) {
      const executionTime = Date.now() - startTime;

      SimpleLogger.error(
        'SchemeMetricsCalculator',
        'Failed to calculate all pending dates',
        'calculateAllPendingForScheme',
        {
          schemeId,
          error: error.message,
          executionTimeMs: executionTime
        },
        undefined,
        undefined,
        error.stack
      );

      return {
        success: false,
        schemeId,
        totalDates: 0,
        calculatedDates,
        skippedDates,
        errors: [error.message, ...errors],
        executionTimeMs: executionTime
      };
    }
  }

  /**
   * Calculate metrics for multiple schemes in batch
   * Processes schemes in batches without delays for maximum throughput
   *
   * @param schemeIds Array of scheme IDs to calculate
   * @param asOfDate Date to calculate metrics for (defaults to latest available)
   * @param isLive Whether to use live or test data
   * @param batchSize Number of schemes to process in each batch (default: 100)
   * @param delayMs Delay between batches in milliseconds (deprecated, no longer used)
   * @returns Batch calculation result
   */
  async batchCalculateSchemes(
    schemeIds: number[],
    asOfDate?: Date,
    isLive: boolean = true,
    batchSize: number = 100,
    delayMs: number = 0  // Deprecated: no longer applies delays
  ): Promise<BatchCalculationResult> {
    const startTime = Date.now();

    SimpleLogger.info(
      'SchemeMetricsCalculator',
      'Starting batch calculation',
      'batchCalculateSchemes',
      {
        totalSchemes: schemeIds.length,
        batchSize,
        delayMs,
        asOfDate: asOfDate?.toISOString().split('T')[0] || 'latest'
      }
    );

    const result: BatchCalculationResult = {
      totalSchemes: schemeIds.length,
      successful: 0,
      failed: 0,
      errors: [],
      executionTimeMs: 0
    };

    // Process in batches
    for (let i = 0; i < schemeIds.length; i += batchSize) {
      const batch = schemeIds.slice(i, Math.min(i + batchSize, schemeIds.length));
      const batchNumber = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(schemeIds.length / batchSize);

      SimpleLogger.info(
        'SchemeMetricsCalculator',
        `Processing batch ${batchNumber}/${totalBatches}`,
        'batchCalculateSchemes',
        {
          batchNumber,
          totalBatches,
          batchSize: batch.length,
          processed: i,
          remaining: schemeIds.length - i
        }
      );

      // Process each scheme in current batch
      for (const schemeId of batch) {
        try {
          const calculationResult = await this.calculateAllPendingForScheme(schemeId, isLive);

          if (calculationResult.success) {
            result.successful++;
          } else {
            result.failed++;
            result.errors.push({
              schemeId,
              schemeCode: `SCHEME_${schemeId}`,
              error: calculationResult.errors.join('; ') || 'Unknown error'
            });
          }

        } catch (error: any) {
          result.failed++;
          result.errors.push({
            schemeId,
            schemeCode: `SCHEME_${schemeId}`,
            error: error.message
          });

          SimpleLogger.error(
            'SchemeMetricsCalculator',
            'Scheme calculation failed in batch',
            'batchCalculateSchemes',
            {
              schemeId,
              batchNumber,
              error: error.message
            },
            undefined,
            undefined,
            error.stack
          );
        }
      }

      // NOTE: Rate limiter removed as per user request
      // No delay between batches for maximum throughput
      SimpleLogger.info(
        'SchemeMetricsCalculator',
        `Batch ${batchNumber} complete`,
        'batchCalculateSchemes',
        {
          successfulSoFar: result.successful,
          failedSoFar: result.failed
        }
      );
    }

    result.executionTimeMs = Date.now() - startTime;

    SimpleLogger.info(
      'SchemeMetricsCalculator',
      'Batch calculation completed',
      'batchCalculateSchemes',
      {
        totalSchemes: result.totalSchemes,
        successful: result.successful,
        failed: result.failed,
        successRate: `${Math.round((result.successful / result.totalSchemes) * 100)}%`,
        executionTimeMs: result.executionTimeMs,
        executionTimeMinutes: Math.round(result.executionTimeMs / 60000)
      }
    );

    return result;
  }

  /**
   * Fetch NAV data for a scheme up to a specific date
   * Returns all historical data needed for metrics calculation
   * NOTE: t_nav_data is GLOBAL - not filtered by is_live
   */
  private async getNavDataForScheme(
    schemeId: number,
    asOfDate?: Date,
    isLive: boolean = true  // Kept for API compatibility but not used
  ): Promise<NavDataRecord[]> {
    try {
      let query = `
        SELECT
          id,
          scheme_id,
          scheme_code,
          nav_date,
          nav_value,
          is_live
        FROM t_nav_data
        WHERE scheme_id = $1
      `;

      const params: any[] = [schemeId];

      if (asOfDate) {
        query += ` AND nav_date <= $2`;
        params.push(asOfDate);
      }

      query += ` ORDER BY nav_date ASC`;

      const result = await this.db.query(query, params);
      return result.rows;

    } catch (error: any) {
      SimpleLogger.error(
        'SchemeMetricsCalculator',
        'Failed to fetch NAV data',
        'getNavDataForScheme',
        {
          schemeId,
          asOfDate: asOfDate?.toISOString().split('T')[0],
          error: error.message
        },
        undefined,
        undefined,
        error.stack
      );
      throw error;
    }
  }

  /**
   * Check if metrics already exist for a scheme on a specific date
   * NOTE: t_nav_data is GLOBAL - not filtered by is_live
   */
  private async checkMetricsExist(
    schemeId: number,
    date: Date,
    isLive: boolean  // Kept for API compatibility but not used
  ): Promise<StoredCalculatedMetrics | null> {
    try {
      const query = `
        SELECT
          nav_date as date,
          daily_return,
          return_1w,
          return_1m,
          return_3m,
          return_6m,
          return_1y,
          return_ytd,
          return_all,
          sd_7d,
          sd_14d,
          sd_21d,
          sd_42d,
          sd_3m,
          sd_6m,
          count_3m,
          count_42d,
          sharpe_ratio,
          max_drawdown,
          total_risk,
          cagr,
          metrics_calculated_at as calculated_at
        FROM t_nav_data
        WHERE scheme_id = $1
          AND nav_date = $2
          AND metrics_calculated_at IS NOT NULL
      `;

      const result = await this.db.query(query, [schemeId, date]);

      if (result.rows.length > 0) {
        return result.rows[0];
      }

      return null;

    } catch (error: any) {
      SimpleLogger.error(
        'SchemeMetricsCalculator',
        'Failed to check existing metrics',
        'checkMetricsExist',
        {
          schemeId,
          date: date.toISOString().split('T')[0],
          error: error.message
        },
        undefined,
        undefined,
        error.stack
      );
      return null;
    }
  }

  /**
   * Store calculated metrics in database
   */
  private async storeMetrics(
    schemeId: number,
    date: Date,
    metrics: CalculatedMetrics,
    isLive: boolean
  ): Promise<void> {
    try {
      // NOTE: t_nav_data is GLOBAL - not filtered by is_live
      const query = `
        UPDATE t_nav_data
        SET
          daily_return = $3,
          return_1w = $4,
          return_1m = $5,
          return_3m = $6,
          return_6m = $7,
          return_1y = $8,
          return_ytd = $9,
          return_all = $10,
          sd_7d = $11,
          sd_14d = $12,
          sd_21d = $13,
          sd_42d = $14,
          sd_3m = $15,
          sd_6m = $16,
          count_3m = $17,
          count_42d = $18,
          sharpe_ratio = $19,
          max_drawdown = $20,
          total_risk = $21,
          cagr = $22,
          metrics_calculated_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
        WHERE scheme_id = $1
          AND nav_date = $2::date
      `;

      // Format date as YYYY-MM-DD string to avoid timezone issues
      const dateStr = date.toISOString().split('T')[0];

      const params = [
        schemeId,
        dateStr,
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
        // Note: isLive removed - t_nav_data is global
      ];

      const result = await this.db.query(query, params);

      if (result.rowCount === 0) {
        throw new Error(`No NAV record found to update for scheme ${schemeId} on ${date.toISOString().split('T')[0]}`);
      }

      // Debug logging to confirm metrics were stored
      SimpleLogger.info(
        'SchemeMetricsCalculator',
        'Metrics stored successfully - metrics_calculated_at should now be set',
        'storeMetrics',
        {
          schemeId,
          date: date.toISOString().split('T')[0],
          isLive,
          rowsUpdated: result.rowCount
        }
      );

    } catch (error: any) {
      SimpleLogger.error(
        'SchemeMetricsCalculator',
        'Failed to store metrics',
        'storeMetrics',
        {
          schemeId,
          date: date.toISOString().split('T')[0],
          error: error.message
        },
        undefined,
        undefined,
        error.stack
      );
      throw error;
    }
  }

  /**
   * Utility: Delay execution
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const schemeMetricsCalculator = new SchemeMetricsCalculator();