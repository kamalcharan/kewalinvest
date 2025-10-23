// backend/src/controllers/marketAnalysisController.ts
// Market Analysis API Controller - PRODUCTION READY WITH BATCH PROCESSING

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
   * Calculate metrics for an index - ASYNC BATCH PROCESSING
   *
   * MODES:
   * 1. Default (no params): Calculate ALL dates with missing metrics
   * 2. as_of_date provided: Calculate for specific date only
   * 3. recalculate=true: Force recalculate ALL dates (ASYNC for large datasets)
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

      const body = req.body as CalculateMetricsRequest;
      const recalculate = body.recalculate || false;
      const asOfDate = body.as_of_date ? new Date(body.as_of_date) : null;

      SimpleLogger.info('MarketAnalysisController', 'Calculate metrics requested', 'calculateMetrics', {
        indexId,
        recalculate,
        asOfDate: asOfDate?.toISOString().split('T')[0] || 'batch mode (all missing)'
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

      // CASE 1: Calculate for specific date (SYNCHRONOUS - fast)
      if (asOfDate) {
        const result = await this.calculateForSingleDate(indexId, asOfDate, recalculate, startTime);
        res.json(result);
        return;
      }

      // CASE 2: Batch calculate
      // Check dataset size first
      const allData = await this.marketService.getMarketData(
        indexId,
        undefined,
        undefined,
        1,
        1
      );

      const totalRecords = allData.total || 0;

      // If dataset is large (>500 records) and recalculate=true, run async
      if (totalRecords > 500 && recalculate) {
        SimpleLogger.info('MarketAnalysisController', 'Large dataset detected - running async', 'calculateMetrics', {
          indexId,
          totalRecords,
          threshold: 500
        });

        // Start calculation in background
        this.calculateBatchMetrics(indexId, recalculate, startTime).then(result => {
          SimpleLogger.info('MarketAnalysisController', 'Async batch calculation completed', 'calculateMetrics-async', {
            indexId,
            processed: result.records_processed,
            timeMs: result.calculation_time_ms
          });
        }).catch(error => {
          SimpleLogger.error('MarketAnalysisController', 'Async batch calculation failed', 'calculateMetrics-async', {
            indexId,
            error: error.message
          });
        });

        // Return immediately with 202 Accepted
        res.status(202).json({
          success: true,
          index_id: indexId,
          date: 'batch',
          metrics: {} as any,
          records_processed: 0,
          calculation_time_ms: Date.now() - startTime,
          message: `Calculation started in background. Processing ${totalRecords} records. This may take several minutes.`,
          status: 'processing',
          estimated_time_minutes: Math.ceil(totalRecords / 50) // ~50 records per minute
        });
        return;
      }

      // Small dataset or only calculating missing - run synchronously
      const result = await this.calculateBatchMetrics(indexId, recalculate, startTime);
      res.json(result);

    } catch (error: any) {
      SimpleLogger.error(
        'MarketAnalysisController',
        'Failed to calculate metrics',
        'calculateMetrics',
        { indexId, error: error.message },
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
   * Calculate metrics for a single specific date
   */
  private async calculateForSingleDate(
    indexId: number,
    asOfDate: Date,
    recalculate: boolean,
    startTime: number
  ): Promise<CalculateMetricsResponse> {
    // Check if metrics already exist and recalculate is false
    if (!recalculate) {
      const existingData = await this.marketService.getMarketData(
        indexId,
        asOfDate,
        asOfDate,
        1,
        1
      );

      if (existingData.data.length > 0 && existingData.data[0].metrics_calculated_at) {
        const existing = existingData.data[0];
        SimpleLogger.info('MarketAnalysisController', 'Metrics already calculated', 'calculateForSingleDate', {
          indexId,
          date: asOfDate.toISOString().split('T')[0],
          calculatedAt: existing.metrics_calculated_at
        });

        return {
          success: true,
          index_id: indexId,
          date: asOfDate.toISOString().split('T')[0],
          metrics: {
            daily_return: existing.daily_return,
            return_1w: existing.return_1w,
            return_1m: existing.return_1m,
            return_3m: existing.return_3m,
            return_6m: existing.return_6m,
            return_1y: existing.return_1y,
            return_ytd: existing.return_ytd,
            return_all: existing.return_all,
            sd_7d: existing.sd_7d,
            sd_14d: existing.sd_14d,
            sd_21d: existing.sd_21d,
            sd_42d: existing.sd_42d,
            sd_3m: existing.sd_3m,
            sd_6m: existing.sd_6m,
            count_3m: existing.count_3m || 0,
            count_42d: existing.count_42d || 0,
            sharpe_ratio: existing.sharpe_ratio,
            max_drawdown: existing.max_drawdown,
            total_risk: existing.total_risk,
            cagr: existing.cagr
          },
          records_processed: 1,
          calculation_time_ms: Date.now() - startTime,
          message: 'Metrics already calculated for this date'
        };
      }
    }

    // Fetch all historical data up to asOfDate
    const historicalData = await this.marketService.getMarketData(
      indexId,
      undefined,
      asOfDate,
      1,
      10000
    );

    if (historicalData.data.length === 0) {
      throw new Error(
        `No historical data available for index ${indexId}. Please download historical data first.`
      );
    }

    // Find data for the specific date
    const todayData = historicalData.data.find(d => {
      const dataDate = new Date(d.date);
      return dataDate.toDateString() === asOfDate.toDateString();
    });

    if (!todayData) {
      throw new Error(
        `No market data available for ${asOfDate.toISOString().split('T')[0]}. Please ensure EOD data is downloaded for this date.`
      );
    }

    // Convert to PricePoint format
    const pricePoints = historicalData.data.map(d => ({
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
        date: new Date(todayData.date),
        close: todayData.close,
        open: todayData.open,
        high: todayData.high,
        low: todayData.low,
        volume: todayData.volume
      },
      pricePoints
    );

    // Update database
    await this.updateMetricsInDatabase(indexId, asOfDate, calculatedMetrics, todayData.id);

    SimpleLogger.info('MarketAnalysisController', 'Single date metrics calculated', 'calculateForSingleDate', {
      indexId,
      date: asOfDate.toISOString().split('T')[0],
      calculationTimeMs: Date.now() - startTime
    });

    return {
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
    };
  }

  /**
   * Batch calculate metrics for multiple dates
   * If recalculate=true: Calculate for ALL dates
   * If recalculate=false: Calculate only for dates missing metrics
   */
  private async calculateBatchMetrics(
    indexId: number,
    recalculate: boolean,
    startTime: number
  ): Promise<CalculateMetricsResponse> {
    // Fetch ALL historical data for this index
    const allData = await this.marketService.getMarketData(
      indexId,
      undefined,
      undefined,
      1,
      100000 // Get all records
    );

    if (allData.data.length === 0) {
      throw new Error(
        `No historical data available for index ${indexId}. Please download historical data first.`
      );
    }

    SimpleLogger.info('MarketAnalysisController', 'Starting batch calculation', 'calculateBatchMetrics', {
      indexId,
      totalRecords: allData.data.length,
      recalculate
    });

    // Filter records that need calculation
    let recordsToCalculate = allData.data;
    
    if (!recalculate) {
      // Only process records without metrics
      recordsToCalculate = allData.data.filter(d => !d.metrics_calculated_at);
      
      SimpleLogger.info('MarketAnalysisController', 'Filtered records needing calculation', 'calculateBatchMetrics', {
        totalRecords: allData.data.length,
        recordsWithoutMetrics: recordsToCalculate.length,
        recordsWithMetrics: allData.data.length - recordsToCalculate.length
      });
    }

    if (recordsToCalculate.length === 0) {
      return {
        success: true,
        index_id: indexId,
        date: 'batch',
        metrics: {} as any,
        records_processed: 0,
        calculation_time_ms: Date.now() - startTime,
        message: 'All records already have calculated metrics. Use recalculate=true to force recalculation.'
      };
    }

    // Sort by date ascending (oldest first) for proper calculation
    recordsToCalculate.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let processedCount = 0;
    let errorCount = 0;
    const errors: Array<{ date: string; error: string }> = [];

    // Process each date
    for (const record of recordsToCalculate) {
      try {
        const recordDate = new Date(record.date);
        
        // Get all historical data UP TO this date (for calculation context)
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

        // Update database
        await this.updateMetricsInDatabase(indexId, recordDate, calculatedMetrics, record.id);
        
        processedCount++;

        // Log progress every 100 records
        if (processedCount % 100 === 0) {
          SimpleLogger.info('MarketAnalysisController', 'Batch calculation progress', 'calculateBatchMetrics', {
            indexId,
            processed: processedCount,
            total: recordsToCalculate.length,
            percentage: Math.round((processedCount / recordsToCalculate.length) * 100)
          });
        }

      } catch (error: any) {
        errorCount++;
        errors.push({
          date: new Date(record.date).toISOString().split('T')[0],
          error: error.message
        });

        // Log first 5 errors only
        if (errorCount <= 5) {
          SimpleLogger.error('MarketAnalysisController', 'Failed to calculate metrics for date', 'calculateBatchMetrics', {
            indexId,
            date: record.date,
            error: error.message
          });
        }
      }
    }

    const calculationTime = Date.now() - startTime;

    SimpleLogger.info('MarketAnalysisController', 'Batch calculation completed', 'calculateBatchMetrics', {
      indexId,
      totalRecords: recordsToCalculate.length,
      processed: processedCount,
      errors: errorCount,
      calculationTimeMs: calculationTime,
      recordsPerSecond: Math.round(processedCount / (calculationTime / 1000))
    });

    return {
      success: true,
      index_id: indexId,
      date: 'batch',
      metrics: {} as any, // Not applicable for batch
      records_processed: processedCount,
      calculation_time_ms: calculationTime,
      message: `Batch calculation completed. Processed ${processedCount} records${errorCount > 0 ? `, ${errorCount} errors` : ''}.`,
      error: errorCount > 0 ? `${errorCount} records failed. First error: ${errors[0]?.error}` : undefined
    };
  }

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

      // NEW: Join with t_market_indices to get index metadata
      const query = `
        SELECT 
          mdr.*,
          mi.index_name,
          mi.index_code,
          mi.yahoo_symbol,
          mdr.close as last_price
        FROM t_market_data_records mdr
        JOIN t_market_indices mi ON mi.id = mdr.index_id
        WHERE mdr.index_id = $1
        ORDER BY mdr.date DESC 
        LIMIT 1
      `;

      const { pool } = require('../config/database');
      const result = await pool.query(query, [indexId]);
      const latestData = result.rows[0] || null;

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
        index_name: latestData.index_name,
        index_code: latestData.index_code,
        yahoo_symbol: latestData.yahoo_symbol,
        last_price: latestData.last_price,
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
   */
  getIndexReturnsTimeSeries = async (req: Request, res: Response): Promise<void> => {
    const startTime = Date.now();

    try {
      const indexIdParam = req.query.index_id as string;
      const periodsParam = req.query.periods as string | undefined;
      const startDateParam = req.query.start_date as string | undefined;
      const endDateParam = req.query.end_date as string | undefined;
      const granularityParam = (req.query.granularity as string | undefined) || 'daily';

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

      if (granularityParam !== 'daily' && granularityParam !== 'weekly' && granularityParam !== 'monthly') {
        res.status(400).json({
          success: false,
          error: 'granularity must be "daily", "weekly", or "monthly"'
        });
        return;
      }

      const defaultPeriods = ['1m', '3m', '6m', '1y', 'ytd', 'all'];
      const periods = periodsParam 
        ? periodsParam.split(',').map(p => p.trim())
        : defaultPeriods;

      const validPeriods = ['daily', '1w', '1m', '3m', '6m', '1y', 'ytd', 'all'];
      const invalidPeriods = periods.filter(p => !validPeriods.includes(p));
      if (invalidPeriods.length > 0) {
        res.status(400).json({
          success: false,
          error: `Invalid periods: ${invalidPeriods.join(', ')}. Valid periods: ${validPeriods.join(', ')}`
        });
        return;
      }

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

      const timeSeries: ReturnTimeSeriesData[] = await this.marketService.getIndexReturnsTimeSeries(
        indexId,
        periods,
        startDate,
        endDate,
        granularityParam as 'daily' | 'weekly' | 'monthly'
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
        { indexId: req.query.index_id, error: error.message },
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
   */
  getIndexVolatilityTimeSeries = async (req: Request, res: Response): Promise<void> => {
    const startTime = Date.now();

    try {
      const indexId = parseInt(req.params.indexId);
      const startDateParam = req.query.start_date as string | undefined;
      const endDateParam = req.query.end_date as string | undefined;
      const granularityParam = (req.query.granularity as string | undefined) || 'daily';

      if (isNaN(indexId) || indexId <= 0) {
        res.status(400).json({
          success: false,
          error: 'Invalid index ID'
        });
        return;
      }

      if (granularityParam !== 'daily' && granularityParam !== 'weekly' && granularityParam !== 'monthly') {
        res.status(400).json({
          success: false,
          error: 'granularity must be "daily", "weekly", or "monthly"'
        });
        return;
      }

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

      const timeSeries: VolatilityTimeSeriesData[] = await this.marketService.getIndexVolatilityTimeSeries(
        indexId,
        startDate,
        endDate,
        granularityParam as 'daily' | 'weekly' | 'monthly'
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
        { indexId: req.params.indexId, error: error.message },
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
   */
  getDashboardStatistics = async (req: Request, res: Response): Promise<void> => {
    const startTime = Date.now();

    try {
      const timePeriodParam = (req.query.time_period as string | undefined) || '1y';

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
        { error: error.message },
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

      const { pool } = require('../config/database');
      await pool.query(query, params);

    } catch (error: any) {
      SimpleLogger.error(
        'MarketAnalysisController',
        'Failed to update metrics in database',
        'updateMetricsInDatabase',
        { indexId, error: error.message },
        undefined,
        undefined,
        error.stack
      );
      throw error;
    }
  }
}

export const marketAnalysisController = new MarketAnalysisController();