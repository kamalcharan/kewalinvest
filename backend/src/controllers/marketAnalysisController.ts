// backend/src/controllers/marketAnalysisController.ts
// Market Analysis API Controller - Metrics Calculation & Time-Series Data

import { Request, Response } from 'express';
import { MarketService, ReturnTimeSeriesData, VolatilityTimeSeriesData, DashboardStatisticsResponse } from '../services/market.service';
import { marketMetricsCalculator } from '../services/marketMetricsCalculator.service';
import { SimpleLogger } from '../services/simpleLogger.service';
import { CalculateMetricsRequest, CalculateMetricsResponse } from '../types/market.types';

export class MarketAnalysisController {
  private marketService: MarketService;

  constructor() {
    this.marketService = new MarketService();
  }

  /**
   * POST /api/market-analysis/calculate-metrics/:indexId
   * Calculate metrics for an index on demand
   * Called when user clicks "Calculate" button on index detail page
   */
  calculateMetrics = async (req: Request, res: Response): Promise<void> => {
    const startTime = Date.now();
    const indexId = parseInt(req.params.indexId);

    try {
      // Validate index ID
      if (isNaN(indexId) || indexId <= 0) {
        res.status(400).json({
          success: false,
          error: 'Invalid index ID'
        });
        return;
      }

      // Get request body
      const body = req.body as CalculateMetricsRequest;
      const recalculate = body.recalculate || false;
      
      // Default to yesterday if no date provided
      const asOfDate = body.as_of_date 
        ? new Date(body.as_of_date)
        : new Date(new Date().setDate(new Date().getDate() - 1));

      SimpleLogger.info('MarketAnalysisController', 'Calculate metrics requested', 'calculateMetrics', {
        indexId,
        recalculate,
        asOfDate: asOfDate.toISOString().split('T')[0]
      });

      // Get index details
      const index = await this.marketService.getIndexById(indexId);
      if (!index) {
        res.status(404).json({
          success: false,
          error: `Index not found: ${indexId}`
        });
        return;
      }

      // Check if metrics already calculated for this date
      if (!recalculate) {
        const existingData = await this.marketService.getMarketData(
          indexId,
          asOfDate,
          asOfDate,
          1,
          1
        );

        if (existingData.data.length > 0 && existingData.data[0].metrics_calculated_at) {
          SimpleLogger.info('MarketAnalysisController', 'Metrics already calculated', 'calculateMetrics', {
            indexId,
            date: asOfDate.toISOString().split('T')[0],
            calculatedAt: existingData.data[0].metrics_calculated_at
          });

          res.json({
            success: true,
            index_id: indexId,
            date: asOfDate.toISOString().split('T')[0],
            metrics: {
              daily_return: existingData.data[0].daily_return,
              return_1w: existingData.data[0].return_1w,
              return_1m: existingData.data[0].return_1m,
              return_3m: existingData.data[0].return_3m,
              return_6m: existingData.data[0].return_6m,
              return_1y: existingData.data[0].return_1y,
              return_ytd: existingData.data[0].return_ytd,
              return_all: existingData.data[0].return_all,
              sd_7d: existingData.data[0].sd_7d,
              sd_14d: existingData.data[0].sd_14d,
              sd_21d: existingData.data[0].sd_21d,
              sd_42d: existingData.data[0].sd_42d,
              sd_3m: existingData.data[0].sd_3m,
              sd_6m: existingData.data[0].sd_6m,
              count_3m: existingData.data[0].count_3m || 0,
              count_42d: existingData.data[0].count_42d || 0,
              sharpe_ratio: existingData.data[0].sharpe_ratio,
              max_drawdown: existingData.data[0].max_drawdown,
              total_risk: existingData.data[0].total_risk,
              cagr: existingData.data[0].cagr
            },
            records_processed: 1,
            calculation_time_ms: Date.now() - startTime,
            message: 'Metrics already calculated for this date'
          } as CalculateMetricsResponse);
          return;
        }
      }

      // Fetch all historical data for index up to asOfDate
      const historicalData = await this.marketService.getMarketData(
        indexId,
        undefined, // Start from earliest
        asOfDate,
        1,
        10000 // Get all records
      );

      if (historicalData.data.length === 0) {
        SimpleLogger.warn('MarketAnalysisController', 'No historical data found', 'calculateMetrics', {
          indexId,
          asOfDate: asOfDate.toISOString().split('T')[0]
        });

        res.status(404).json({
          success: false,
          error: `No historical data available for index ${indexId}. Please download historical data first.`
        });
        return;
      }

      // Find today's price point
      const todayData = historicalData.data.find(d => {
        const dataDate = new Date(d.date);
        return dataDate.toDateString() === asOfDate.toDateString();
      });

      if (!todayData) {
        SimpleLogger.warn('MarketAnalysisController', 'No data for calculation date', 'calculateMetrics', {
          indexId,
          date: asOfDate.toISOString().split('T')[0],
          availableDates: `${historicalData.data[0].date} to ${historicalData.data[historicalData.data.length - 1].date}`
        });

        res.status(404).json({
          success: false,
          error: `No market data available for ${asOfDate.toISOString().split('T')[0]}. Please ensure EOD data is downloaded for this date.`
        });
        return;
      }

      // Convert to PricePoint format for calculator
      const pricePoints = historicalData.data.map(d => ({
        date: new Date(d.date),
        close: d.close,
        open: d.open,
        high: d.high,
        low: d.low,
        volume: d.volume
      }));

      // Calculate metrics using calculator service
      const calculatedMetrics = await marketMetricsCalculator.calculateMetricsForDate(
        {
          date: new Date(todayData.date),
          close: todayData.close,
          open: todayData.open,
          high: todayData.high,
          low: todayData.low,
          volume: todayData.volume
        },
        pricePoints
      );

      // Update database with calculated metrics
      await this.updateMetricsInDatabase(indexId, asOfDate, calculatedMetrics, todayData.id);

      SimpleLogger.info('MarketAnalysisController', 'Metrics calculated successfully', 'calculateMetrics', {
        indexId,
        date: asOfDate.toISOString().split('T')[0],
        calculationTimeMs: Date.now() - startTime
      });

      // Return successful response
      res.json({
        success: true,
        index_id: indexId,
        date: asOfDate.toISOString().split('T')[0],
        metrics: {
          daily_return: calculatedMetrics.daily_return,
          return_1w: calculatedMetrics.return_1w,
          return_1m: calculatedMetrics.return_1m,
          return_3m: calculatedMetrics.return_3m,
          return_6m: calculatedMetrics.return_6m,
          return_1y: calculatedMetrics.return_1y,
          return_ytd: calculatedMetrics.return_ytd,
          return_all: calculatedMetrics.return_all,
          sd_7d: calculatedMetrics.sd_7d,
          sd_14d: calculatedMetrics.sd_14d,
          sd_21d: calculatedMetrics.sd_21d,
          sd_42d: calculatedMetrics.sd_42d,
          sd_3m: calculatedMetrics.sd_3m,
          sd_6m: calculatedMetrics.sd_6m,
          count_3m: calculatedMetrics.count_3m,
          count_42d: calculatedMetrics.count_42d,
          sharpe_ratio: calculatedMetrics.sharpe_ratio,
          max_drawdown: calculatedMetrics.max_drawdown,
          total_risk: calculatedMetrics.total_risk,
          cagr: calculatedMetrics.cagr
        },
        records_processed: 1,
        calculation_time_ms: Date.now() - startTime,
        message: 'Metrics calculated and stored successfully'
      } as CalculateMetricsResponse);

    } catch (error: any) {
      SimpleLogger.error(
        'MarketAnalysisController',
        'Failed to calculate metrics',
        'calculateMetrics',
        {
          indexId,
          error: error.message
        },
        undefined,
        undefined,
        error.stack
      );

      res.status(500).json({
        success: false,
        error: error.message || 'Failed to calculate metrics',
        message: 'An error occurred while calculating metrics'
      });
    }
  };

  /**
   * GET /api/market-analysis/metrics/:indexId
   * Get latest calculated metrics for an index
   */
  getLatestMetrics = async (req: Request, res: Response): Promise<void> => {
    const indexId = parseInt(req.params.indexId);

    try {
      if (isNaN(indexId) || indexId <= 0) {
        res.status(400).json({
          success: false,
          error: 'Invalid index ID'
        });
        return;
      }

      // Get latest data with metrics
      const latestData = await this.marketService.getLatestData(indexId);

      if (!latestData) {
        res.status(404).json({
          success: false,
          error: `No data found for index ${indexId}`
        });
        return;
      }

      if (!latestData.metrics_calculated_at) {
        res.status(404).json({
          success: false,
          error: `No calculated metrics available for index ${indexId}. Please run calculations first.`
        });
        return;
      }

      res.json({
        success: true,
        index_id: indexId,
        date: latestData.date,
        metrics: {
          daily_return: latestData.daily_return,
          return_1w: latestData.return_1w,
          return_1m: latestData.return_1m,
          return_3m: latestData.return_3m,
          return_6m: latestData.return_6m,
          return_1y: latestData.return_1y,
          return_ytd: latestData.return_ytd,
          return_all: latestData.return_all,
          sd_7d: latestData.sd_7d,
          sd_14d: latestData.sd_14d,
          sd_21d: latestData.sd_21d,
          sd_42d: latestData.sd_42d,
          sd_3m: latestData.sd_3m,
          sd_6m: latestData.sd_6m,
          count_3m: latestData.count_3m,
          count_42d: latestData.count_42d,
          sharpe_ratio: latestData.sharpe_ratio,
          max_drawdown: latestData.max_drawdown,
          total_risk: latestData.total_risk,
          cagr: latestData.cagr
        },
        metrics_calculated_at: latestData.metrics_calculated_at
      });

    } catch (error: any) {
      SimpleLogger.error(
        'MarketAnalysisController',
        'Failed to get latest metrics',
        'getLatestMetrics',
        { indexId, error: error.message },
        undefined,
        undefined,
        error.stack
      );

      res.status(500).json({
        success: false,
        error: error.message || 'Failed to retrieve metrics'
      });
    }
  };

  /**
   * GET /api/market-analysis/index-returns
   * Get time-series returns data for an index
   * Query params:
   *   - index_id (required): Index ID
   *   - periods (optional): Comma-separated list of periods (1m,3m,6m,1y,ytd,all,daily,1w) - default: all
   *   - start_date (optional): ISO date format (YYYY-MM-DD)
   *   - end_date (optional): ISO date format (YYYY-MM-DD)
   *   - granularity (optional): 'daily' or 'monthly' - default: 'daily'
   */
  getIndexReturnsTimeSeries = async (req: Request, res: Response): Promise<void> => {
    const startTime = Date.now();

    try {
      // Extract and validate parameters
      const indexIdParam = req.query.index_id as string;
      const periodsParam = req.query.periods as string | undefined;
      const startDateParam = req.query.start_date as string | undefined;
      const endDateParam = req.query.end_date as string | undefined;
      const granularityParam = (req.query.granularity as string | undefined) || 'daily';

      // Validate index ID
      if (!indexIdParam) {
        res.status(400).json({
          success: false,
          error: 'index_id query parameter is required'
        });
        return;
      }

      const indexId = parseInt(indexIdParam);
      if (isNaN(indexId) || indexId <= 0) {
        res.status(400).json({
          success: false,
          error: 'Invalid index ID'
        });
        return;
      }

      // Validate granularity
      if (granularityParam !== 'daily' && granularityParam !== 'monthly') {
        res.status(400).json({
          success: false,
          error: 'granularity must be either "daily" or "monthly"'
        });
        return;
      }

      // Parse periods
      const defaultPeriods = ['1m', '3m', '6m', '1y', 'ytd', 'all'];
      const periods = periodsParam 
        ? periodsParam.split(',').map(p => p.trim())
        : defaultPeriods;

      // Validate periods
      const validPeriods = ['daily', '1w', '1m', '3m', '6m', '1y', 'ytd', 'all'];
      const invalidPeriods = periods.filter(p => !validPeriods.includes(p));
      if (invalidPeriods.length > 0) {
        res.status(400).json({
          success: false,
          error: `Invalid periods: ${invalidPeriods.join(', ')}. Valid periods: ${validPeriods.join(', ')}`
        });
        return;
      }

      // Parse dates
      let startDate: Date | undefined;
      let endDate: Date | undefined;

      if (startDateParam) {
        startDate = new Date(startDateParam);
        if (isNaN(startDate.getTime())) {
          res.status(400).json({
            success: false,
            error: 'start_date must be a valid ISO date (YYYY-MM-DD)'
          });
          return;
        }
      }

      if (endDateParam) {
        endDate = new Date(endDateParam);
        if (isNaN(endDate.getTime())) {
          res.status(400).json({
            success: false,
            error: 'end_date must be a valid ISO date (YYYY-MM-DD)'
          });
          return;
        }
      }

      // Ensure end_date is after start_date
      if (startDate && endDate && startDate >= endDate) {
        res.status(400).json({
          success: false,
          error: 'start_date must be before end_date'
        });
        return;
      }

      SimpleLogger.info('MarketAnalysisController', 'Fetching returns time-series', 'getIndexReturnsTimeSeries', {
        indexId,
        periods: periods.join(','),
        granularity: granularityParam,
        startDate: startDate?.toISOString().split('T')[0],
        endDate: endDate?.toISOString().split('T')[0]
      });

      // Call service method
      const timeSeries: ReturnTimeSeriesData[] = await this.marketService.getIndexReturnsTimeSeries(
        indexId,
        periods,
        startDate,
        endDate,
        granularityParam as 'daily' | 'monthly'
      );

      SimpleLogger.info('MarketAnalysisController', 'Returns time-series retrieved successfully', 'getIndexReturnsTimeSeries', {
        indexId,
        dataPoints: timeSeries.length,
        executionTimeMs: Date.now() - startTime
      });

      res.json({
        success: true,
        index_id: indexId,
        periods: periods,
        granularity: granularityParam,
        date_range: {
          start_date: startDate?.toISOString().split('T')[0] || 'earliest',
          end_date: endDate?.toISOString().split('T')[0] || 'latest'
        },
        data: timeSeries,
        total_records: timeSeries.length,
        execution_time_ms: Date.now() - startTime
      });

    } catch (error: any) {
      SimpleLogger.error(
        'MarketAnalysisController',
        'Failed to get returns time-series',
        'getIndexReturnsTimeSeries',
        {
          indexId: req.query.index_id,
          error: error.message
        },
        undefined,
        undefined,
        error.stack
      );

      res.status(500).json({
        success: false,
        error: error.message || 'Failed to retrieve returns time-series data'
      });
    }
  };

  /**
   * GET /api/market-analysis/index-volatility/:indexId
   * Get time-series volatility data for an index
   * Query params:
   *   - start_date (optional): ISO date format (YYYY-MM-DD)
   *   - end_date (optional): ISO date format (YYYY-MM-DD)
   *   - granularity (optional): 'daily' or 'monthly' - default: 'daily'
   */
  getIndexVolatilityTimeSeries = async (req: Request, res: Response): Promise<void> => {
    const startTime = Date.now();

    try {
      // Extract and validate parameters
      const indexId = parseInt(req.params.indexId);
      const startDateParam = req.query.start_date as string | undefined;
      const endDateParam = req.query.end_date as string | undefined;
      const granularityParam = (req.query.granularity as string | undefined) || 'daily';

      // Validate index ID
      if (isNaN(indexId) || indexId <= 0) {
        res.status(400).json({
          success: false,
          error: 'Invalid index ID'
        });
        return;
      }

      // Validate granularity
      if (granularityParam !== 'daily' && granularityParam !== 'monthly') {
        res.status(400).json({
          success: false,
          error: 'granularity must be either "daily" or "monthly"'
        });
        return;
      }

      // Parse dates
      let startDate: Date | undefined;
      let endDate: Date | undefined;

      if (startDateParam) {
        startDate = new Date(startDateParam);
        if (isNaN(startDate.getTime())) {
          res.status(400).json({
            success: false,
            error: 'start_date must be a valid ISO date (YYYY-MM-DD)'
          });
          return;
        }
      }

      if (endDateParam) {
        endDate = new Date(endDateParam);
        if (isNaN(endDate.getTime())) {
          res.status(400).json({
            success: false,
            error: 'end_date must be a valid ISO date (YYYY-MM-DD)'
          });
          return;
        }
      }

      // Ensure end_date is after start_date
      if (startDate && endDate && startDate >= endDate) {
        res.status(400).json({
          success: false,
          error: 'start_date must be before end_date'
        });
        return;
      }

      SimpleLogger.info('MarketAnalysisController', 'Fetching volatility time-series', 'getIndexVolatilityTimeSeries', {
        indexId,
        granularity: granularityParam,
        startDate: startDate?.toISOString().split('T')[0],
        endDate: endDate?.toISOString().split('T')[0]
      });

      // Call service method
      const timeSeries: VolatilityTimeSeriesData[] = await this.marketService.getIndexVolatilityTimeSeries(
        indexId,
        startDate,
        endDate,
        granularityParam as 'daily' | 'monthly'
      );

      SimpleLogger.info('MarketAnalysisController', 'Volatility time-series retrieved successfully', 'getIndexVolatilityTimeSeries', {
        indexId,
        dataPoints: timeSeries.length,
        executionTimeMs: Date.now() - startTime
      });

      res.json({
        success: true,
        index_id: indexId,
        granularity: granularityParam,
        date_range: {
          start_date: startDate?.toISOString().split('T')[0] || 'earliest',
          end_date: endDate?.toISOString().split('T')[0] || 'latest'
        },
        data: timeSeries,
        total_records: timeSeries.length,
        execution_time_ms: Date.now() - startTime
      });

    } catch (error: any) {
      SimpleLogger.error(
        'MarketAnalysisController',
        'Failed to get volatility time-series',
        'getIndexVolatilityTimeSeries',
        {
          indexId: req.params.indexId,
          error: error.message
        },
        undefined,
        undefined,
        error.stack
      );

      res.status(500).json({
        success: false,
        error: error.message || 'Failed to retrieve volatility time-series data'
      });
    }
  };

  /**
   * GET /api/market-analysis/dashboard-statistics
   * Get aggregated dashboard statistics across all indices
   * Query params:
   *   - time_period (optional): '1m', '3m', '6m', or '1y' - default: '1y'
   */
  getDashboardStatistics = async (req: Request, res: Response): Promise<void> => {
    const startTime = Date.now();

    try {
      // Extract and validate parameters
      const timePeriodParam = (req.query.time_period as string | undefined) || '1y';

      // Validate time period
      const validTimePeriods = ['1m', '3m', '6m', '1y'];
      if (!validTimePeriods.includes(timePeriodParam)) {
        res.status(400).json({
          success: false,
          error: `time_period must be one of: ${validTimePeriods.join(', ')}`
        });
        return;
      }

      SimpleLogger.info('MarketAnalysisController', 'Fetching dashboard statistics', 'getDashboardStatistics', {
        timePeriod: timePeriodParam
      });

      // Call service method
      const stats: DashboardStatisticsResponse = await this.marketService.getDashboardAggregateStats(
        timePeriodParam as '1m' | '3m' | '6m' | '1y'
      );

      SimpleLogger.info('MarketAnalysisController', 'Dashboard statistics retrieved successfully', 'getDashboardStatistics', {
        timePeriod: timePeriodParam,
        analyzedIndices: stats.total_indices_analyzed,
        executionTimeMs: Date.now() - startTime
      });

      res.json({
        success: true,
        time_period: timePeriodParam,
        data: {
          best_performer: stats.best_performer,
          most_volatile: stats.most_volatile,
          market_breadth: stats.market_breadth,
          total_indices_analyzed: stats.total_indices_analyzed,
          indices_up: stats.indices_up,
          indices_down: stats.indices_down,
          heatmap: stats.heatmap
        },
        execution_time_ms: Date.now() - startTime
      });

    } catch (error: any) {
      SimpleLogger.error(
        'MarketAnalysisController',
        'Failed to get dashboard statistics',
        'getDashboardStatistics',
        {
          error: error.message
        },
        undefined,
        undefined,
        error.stack
      );

      res.status(500).json({
        success: false,
        error: error.message || 'Failed to retrieve dashboard statistics'
      });
    }
  };

  /**
   * Private method to update metrics in database
   */
  private async updateMetricsInDatabase(
    indexId: number,
    date: Date,
    metrics: any,
    recordId: number
  ): Promise<void> {
    try {
      // Update the market data record with calculated metrics
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

      // Use the pool directly (assuming you have access to it)
      const { pool } = require('../config/database');
      await pool.query(query, params);

      SimpleLogger.info('MarketAnalysisController', 'Metrics updated in database', 'updateMetricsInDatabase', {
        indexId,
        date: date.toISOString().split('T')[0],
        recordId
      });

    } catch (error: any) {
      SimpleLogger.error(
        'MarketAnalysisController',
        'Failed to update metrics in database',
        'updateMetricsInDatabase',
        {
          indexId,
          error: error.message
        },
        undefined,
        undefined,
        error.stack
      );
      throw error;
    }
  }
}

export const marketAnalysisController = new MarketAnalysisController();