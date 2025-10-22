// backend/src/services/navAnalytics.service.ts
// Analytics service for NAV data visualization and time-series queries
// Handles daily, weekly, and monthly aggregations for ChartViewer integration

import { Pool } from 'pg';
import { pool } from '../config/database';
import { SimpleLogger } from './simpleLogger.service';
import {
  NavTimeSeriesParams,
  NavTimeSeriesResponse,
  NavTimeSeriesDataPoint,
  MetricsCoverage
} from '../types/nav.types';

export class NavAnalyticsService {
  private db: Pool;

  constructor() {
    this.db = pool;
  }

  /**
   * Get NAV time series data with optional calculated metrics
   * Main entry point - delegates to granularity-specific methods
   * 
   * @param schemeId - Scheme ID
   * @param isLive - Live or test environment
   * @param params - Query parameters (dates, granularity, metrics)
   * @returns Time series data with NAV values and calculated metrics
   */
  async getNavTimeSeries(
    schemeId: number,
    isLive: boolean,
    params: NavTimeSeriesParams = {}
  ): Promise<NavTimeSeriesResponse> {
    const startTime = Date.now();

    try {
      // Validate schemeId
      if (!schemeId || schemeId <= 0) {
        throw new Error('Valid scheme ID is required');
      }

      // Extract and set defaults
      const {
        start_date,
        end_date,
        granularity = 'daily',
        include_metrics = true
      } = params;

      // ADD THIS DEBUG LOGGING
    SimpleLogger.info(
      'NavAnalyticsService',
      '🔍 DEBUG: Time-series query parameters',
      'getNavTimeSeries',
      {
        schemeId,
        isLive,  // ⭐ CHECK THIS VALUE
        granularity,
        startDate: start_date,
        endDate: end_date,
        includeMetrics: include_metrics
      }
    );

      // Validate dates if provided
      if (start_date && !this.isValidDate(start_date)) {
        throw new Error('Invalid start_date format. Use YYYY-MM-DD');
      }
      if (end_date && !this.isValidDate(end_date)) {
        throw new Error('Invalid end_date format. Use YYYY-MM-DD');
      }

      SimpleLogger.info(
        'NavAnalyticsService',
        'Starting time-series query',
        'getNavTimeSeries',
        {
          schemeId,
          isLive,
          granularity,
          startDate: start_date,
          endDate: end_date,
          includeMetrics: include_metrics
        }
      );

      // Get scheme details
      const schemeQuery = `
        SELECT id, scheme_code, scheme_name, amc_name
        FROM t_scheme_details
        WHERE id = $1 AND is_active = true
      `;
      const schemeResult = await this.db.query(schemeQuery, [schemeId]);

        // ADD THIS DEBUG LOGGING
SimpleLogger.info(
  'NavAnalyticsService',
  '🔍 DEBUG: Scheme lookup result',
  'getNavTimeSeries',
  {
    schemeId,
    found: schemeResult.rows.length > 0,
    schemeData: schemeResult.rows[0] || null
  }
);


      if (schemeResult.rows.length === 0) {
        throw new Error(`Scheme not found: ${schemeId}`);
      }

      const scheme = schemeResult.rows[0];

      // Delegate to appropriate method based on granularity
      let data: NavTimeSeriesDataPoint[];
      let actualDateRange: { start_date: string; end_date: string };

      switch (granularity) {
        case 'weekly':
          ({ data, actualDateRange } = await this.getWeeklyTimeSeries(
            schemeId,
            isLive,
            start_date,
            end_date,
            include_metrics
          ));
          break;

        case 'monthly':
          ({ data, actualDateRange } = await this.getMonthlyTimeSeries(
            schemeId,
            isLive,
            start_date,
            end_date,
            include_metrics
          ));
          break;

        case 'daily':
        default:
          ({ data, actualDateRange } = await this.getDailyTimeSeries(
            schemeId,
            isLive,
            start_date,
            end_date,
            include_metrics
          ));

          / ADD THIS DEBUG LOGGING
SimpleLogger.info(
  'NavAnalyticsService',
  '🔍 DEBUG: Time-series data retrieved',
  'getNavTimeSeries',
  {
    schemeId,
    isLive,
    granularity,
    dataPointsReturned: data.length,
    dateRange: actualDateRange
  }
);
          break;
      }

      // Calculate metrics coverage
      const metricsCoverage = this.calculateMetricsCoverage(data);

      const executionTime = Date.now() - startTime;

      SimpleLogger.info(
        'NavAnalyticsService',
        'Time-series query completed',
        'getNavTimeSeries',
        {
          schemeId,
          granularity,
          totalPoints: data.length,
          metricsCoverage: metricsCoverage.coverage_percentage.toFixed(1) + '%',
          executionTimeMs: executionTime
        }
      );

      return {
        scheme_id: scheme.id,
        scheme_code: scheme.scheme_code,
        scheme_name: scheme.scheme_name,
        amc_name: scheme.amc_name,
        granularity,
        date_range: actualDateRange,
        data,
        total_points: data.length,
        metrics_coverage: metricsCoverage
      };

    } catch (error: any) {
      const executionTime = Date.now() - startTime;

      SimpleLogger.error(
        'NavAnalyticsService',
        'Time-series query failed',
        'getNavTimeSeries',
        {
          schemeId,
          params,
          error: error.message,
          executionTimeMs: executionTime
        },
        undefined,
        undefined,
        error.stack
      );

      throw error;
    }
  }

  /**
   * Get daily time series (no aggregation)
   * Returns all NAV data points as-is
   */
  private async getDailyTimeSeries(
    schemeId: number,
    isLive: boolean,
    startDate?: string,
    endDate?: string,
    includeMetrics: boolean = true
  ): Promise<{
    data: NavTimeSeriesDataPoint[];
    actualDateRange: { start_date: string; end_date: string };
  }> {
    try {
      // Build query
      const { query, params } = this.buildTimeSeriesQuery(
        schemeId,
        isLive,
        startDate,
        endDate,
        includeMetrics,
        'daily'
      );

      const result = await this.db.query(query, params);

      if (result.rows.length === 0) {
        return {
          data: [],
          actualDateRange: {
            start_date: startDate || '',
            end_date: endDate || ''
          }
        };
      }

      // Transform rows to data points
      const data: NavTimeSeriesDataPoint[] = result.rows.map(row => ({
        date: row.nav_date,
        nav_value: parseFloat(row.nav_value),
        ...(includeMetrics && {
          daily_return: row.daily_return,
          return_1w: row.return_1w,
          return_1m: row.return_1m,
          return_3m: row.return_3m,
          return_6m: row.return_6m,
          return_1y: row.return_1y,
          return_ytd: row.return_ytd,
          return_all: row.return_all,
          sd_7d: row.sd_7d,
          sd_14d: row.sd_14d,
          sd_21d: row.sd_21d,
          sd_42d: row.sd_42d,
          sd_3m: row.sd_3m,
          sd_6m: row.sd_6m,
          sharpe_ratio: row.sharpe_ratio,
          max_drawdown: row.max_drawdown,
          total_risk: row.total_risk,
          cagr: row.cagr
        }),
        has_metrics: row.has_metrics,
        metrics_calculated_at: row.metrics_calculated_at
      }));

      // Get actual date range from results
      const actualDateRange = {
        start_date: data[0].date,
        end_date: data[data.length - 1].date
      };

      return { data, actualDateRange };

    } catch (error: any) {
      SimpleLogger.error(
        'NavAnalyticsService',
        'Failed to get daily time series',
        'getDailyTimeSeries',
        {
          schemeId,
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
   * Get weekly time series (last trading day of each week)
   * Week = Sunday to Saturday, returns MAX(nav_date) per week
   */
  private async getWeeklyTimeSeries(
    schemeId: number,
    isLive: boolean,
    startDate?: string,
    endDate?: string,
    includeMetrics: boolean = true
  ): Promise<{
    data: NavTimeSeriesDataPoint[];
    actualDateRange: { start_date: string; end_date: string };
  }> {
    try {
      // Build base conditions
      let whereConditions = `WHERE nd.scheme_id = $1 AND nd.is_live = $2`;
      const queryParams: any[] = [schemeId, isLive];
      let paramIndex = 3;

      if (startDate) {
        whereConditions += ` AND nd.nav_date >= $${paramIndex}`;
        queryParams.push(startDate);
        paramIndex++;
      }

      if (endDate) {
        whereConditions += ` AND nd.nav_date <= $${paramIndex}`;
        queryParams.push(endDate);
        paramIndex++;
      }

      // Weekly aggregation query
      // Use DISTINCT ON to get last trading day of each week
      const metricsFields = includeMetrics ? `
        nd.daily_return,
        nd.return_1w,
        nd.return_1m,
        nd.return_3m,
        nd.return_6m,
        nd.return_1y,
        nd.return_ytd,
        nd.return_all,
        nd.sd_7d,
        nd.sd_14d,
        nd.sd_21d,
        nd.sd_42d,
        nd.sd_3m,
        nd.sd_6m,
        nd.sharpe_ratio,
        nd.max_drawdown,
        nd.total_risk,
        nd.cagr,
      ` : '';

      const query = `
        SELECT DISTINCT ON (week_key)
          nd.nav_date,
          nd.nav_value,
          ${metricsFields}
          CASE WHEN nd.metrics_calculated_at IS NOT NULL THEN true ELSE false END as has_metrics,
          nd.metrics_calculated_at,
          DATE_TRUNC('week', nd.nav_date + INTERVAL '1 day') - INTERVAL '1 day' as week_key
        FROM t_nav_data nd
        ${whereConditions}
        ORDER BY week_key DESC, nd.nav_date DESC
      `;

      const result = await this.db.query(query, queryParams);

      if (result.rows.length === 0) {
        return {
          data: [],
          actualDateRange: {
            start_date: startDate || '',
            end_date: endDate || ''
          }
        };
      }

      // Transform and reverse (we queried DESC for DISTINCT ON, need ASC for chronological)
      const data: NavTimeSeriesDataPoint[] = result.rows
        .reverse()
        .map(row => ({
          date: row.nav_date,
          nav_value: parseFloat(row.nav_value),
          ...(includeMetrics && {
            daily_return: row.daily_return,
            return_1w: row.return_1w,
            return_1m: row.return_1m,
            return_3m: row.return_3m,
            return_6m: row.return_6m,
            return_1y: row.return_1y,
            return_ytd: row.return_ytd,
            return_all: row.return_all,
            sd_7d: row.sd_7d,
            sd_14d: row.sd_14d,
            sd_21d: row.sd_21d,
            sd_42d: row.sd_42d,
            sd_3m: row.sd_3m,
            sd_6m: row.sd_6m,
            sharpe_ratio: row.sharpe_ratio,
            max_drawdown: row.max_drawdown,
            total_risk: row.total_risk,
            cagr: row.cagr
          }),
          has_metrics: row.has_metrics,
          metrics_calculated_at: row.metrics_calculated_at
        }));

      const actualDateRange = {
        start_date: data[0].date,
        end_date: data[data.length - 1].date
      };

      return { data, actualDateRange };

    } catch (error: any) {
      SimpleLogger.error(
        'NavAnalyticsService',
        'Failed to get weekly time series',
        'getWeeklyTimeSeries',
        {
          schemeId,
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
   * Get monthly time series (last trading day of each month)
   * Returns MAX(nav_date) per month
   */
  private async getMonthlyTimeSeries(
    schemeId: number,
    isLive: boolean,
    startDate?: string,
    endDate?: string,
    includeMetrics: boolean = true
  ): Promise<{
    data: NavTimeSeriesDataPoint[];
    actualDateRange: { start_date: string; end_date: string };
  }> {
    try {
      // Build base conditions
      let whereConditions = `WHERE nd.scheme_id = $1 AND nd.is_live = $2`;
      const queryParams: any[] = [schemeId, isLive];
      let paramIndex = 3;

      if (startDate) {
        whereConditions += ` AND nd.nav_date >= $${paramIndex}`;
        queryParams.push(startDate);
        paramIndex++;
      }

      if (endDate) {
        whereConditions += ` AND nd.nav_date <= $${paramIndex}`;
        queryParams.push(endDate);
        paramIndex++;
      }

      // Monthly aggregation query
      // Use DISTINCT ON to get last trading day of each month
      const metricsFields = includeMetrics ? `
        nd.daily_return,
        nd.return_1w,
        nd.return_1m,
        nd.return_3m,
        nd.return_6m,
        nd.return_1y,
        nd.return_ytd,
        nd.return_all,
        nd.sd_7d,
        nd.sd_14d,
        nd.sd_21d,
        nd.sd_42d,
        nd.sd_3m,
        nd.sd_6m,
        nd.sharpe_ratio,
        nd.max_drawdown,
        nd.total_risk,
        nd.cagr,
      ` : '';

      const query = `
        SELECT DISTINCT ON (month_key)
          nd.nav_date,
          nd.nav_value,
          ${metricsFields}
          CASE WHEN nd.metrics_calculated_at IS NOT NULL THEN true ELSE false END as has_metrics,
          nd.metrics_calculated_at,
          DATE_TRUNC('month', nd.nav_date) as month_key
        FROM t_nav_data nd
        ${whereConditions}
        ORDER BY month_key DESC, nd.nav_date DESC
      `;

      const result = await this.db.query(query, queryParams);

      if (result.rows.length === 0) {
        return {
          data: [],
          actualDateRange: {
            start_date: startDate || '',
            end_date: endDate || ''
          }
        };
      }

      // Transform and reverse (we queried DESC for DISTINCT ON, need ASC for chronological)
      const data: NavTimeSeriesDataPoint[] = result.rows
        .reverse()
        .map(row => ({
          date: row.nav_date,
          nav_value: parseFloat(row.nav_value),
          ...(includeMetrics && {
            daily_return: row.daily_return,
            return_1w: row.return_1w,
            return_1m: row.return_1m,
            return_3m: row.return_3m,
            return_6m: row.return_6m,
            return_1y: row.return_1y,
            return_ytd: row.return_ytd,
            return_all: row.return_all,
            sd_7d: row.sd_7d,
            sd_14d: row.sd_14d,
            sd_21d: row.sd_21d,
            sd_42d: row.sd_42d,
            sd_3m: row.sd_3m,
            sd_6m: row.sd_6m,
            sharpe_ratio: row.sharpe_ratio,
            max_drawdown: row.max_drawdown,
            total_risk: row.total_risk,
            cagr: row.cagr
          }),
          has_metrics: row.has_metrics,
          metrics_calculated_at: row.metrics_calculated_at
        }));

      const actualDateRange = {
        start_date: data[0].date,
        end_date: data[data.length - 1].date
      };

      return { data, actualDateRange };

    } catch (error: any) {
      SimpleLogger.error(
        'NavAnalyticsService',
        'Failed to get monthly time series',
        'getMonthlyTimeSeries',
        {
          schemeId,
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
   * Build time-series SQL query with dynamic conditions
   * Used for daily queries (no aggregation)
   */
  private buildTimeSeriesQuery(
    schemeId: number,
    isLive: boolean,
    startDate?: string,
    endDate?: string,
    includeMetrics: boolean = true,
    granularity: 'daily' | 'weekly' | 'monthly' = 'daily'
  ): { query: string; params: any[] } {
    const params: any[] = [schemeId, isLive];
    let paramIndex = 3;

    // Select clause with optional metrics
    const metricsFields = includeMetrics ? `
      nd.daily_return,
      nd.return_1w,
      nd.return_1m,
      nd.return_3m,
      nd.return_6m,
      nd.return_1y,
      nd.return_ytd,
      nd.return_all,
      nd.sd_7d,
      nd.sd_14d,
      nd.sd_21d,
      nd.sd_42d,
      nd.sd_3m,
      nd.sd_6m,
      nd.sharpe_ratio,
      nd.max_drawdown,
      nd.total_risk,
      nd.cagr,
    ` : '';

    let query = `
      SELECT 
        nd.nav_date,
        nd.nav_value,
        ${metricsFields}
        CASE WHEN nd.metrics_calculated_at IS NOT NULL THEN true ELSE false END as has_metrics,
        nd.metrics_calculated_at
      FROM t_nav_data nd
      WHERE nd.scheme_id = $1 AND nd.is_live = $2
    `;

    // Add date filters
    if (startDate) {
      query += ` AND nd.nav_date >= $${paramIndex}`;
      params.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      query += ` AND nd.nav_date <= $${paramIndex}`;
      params.push(endDate);
      paramIndex++;
    }

    // Order by date ascending (chronological)
    query += ` ORDER BY nd.nav_date ASC`;

    return { query, params };
  }

  /**
   * Calculate metrics coverage statistics
   */
  private calculateMetricsCoverage(data: NavTimeSeriesDataPoint[]): MetricsCoverage {
    if (data.length === 0) {
      return {
        total_dates: 0,
        dates_with_metrics: 0,
        coverage_percentage: 0
      };
    }

    const datesWithMetrics = data.filter(d => d.has_metrics).length;
    const coveragePercentage = (datesWithMetrics / data.length) * 100;

    return {
      total_dates: data.length,
      dates_with_metrics: datesWithMetrics,
      coverage_percentage: parseFloat(coveragePercentage.toFixed(2))
    };
  }

  /**
   * Validate date format (YYYY-MM-DD)
   */
  private isValidDate(dateString: string): boolean {
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    if (!regex.test(dateString)) return false;

    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date.getTime());
  }
}

// Export singleton instance
export const navAnalyticsService = new NavAnalyticsService();