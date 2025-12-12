// backend/src/controllers/market.controller.ts
// Market Data API Controller

import { Request, Response } from 'express';
import { MarketService } from '../services/market.service';
import { MarketDownloadService } from '../services/marketDownload.service';
import { SimpleLogger } from '../services/simpleLogger.service';

export class MarketController {
  private marketService: MarketService;
  private downloadService: MarketDownloadService;

  constructor() {
    this.marketService = new MarketService();
    this.downloadService = new MarketDownloadService();
  }

  // ==================== INDEX OPERATIONS ====================

  /**
   * GET /api/market/indices
   * Get all market indices with filtering
   */
  getAllIndices = async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        search,
        category,
        download_status,
        page = 1,
        page_size = 50
      } = req.query;

      const result = await this.marketService.getAllIndices({
        search: search as string,
        category: category as any,
        download_status: download_status as any,
        page: Number(page),
        page_size: Number(page_size)
      });

      res.json({
        success: true,
        data: result
      });
    } catch (error: any) {
      SimpleLogger.error('MarketController', 'Failed to get indices', 'getAllIndices', {
        query: req.query,
        error: error.message
      }, undefined, undefined, error.stack);

      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get market indices'
      });
    }
  };

  /**
   * GET /api/market/indices/:id
   * Get specific index details
   */
  getIndexById = async (req: Request, res: Response): Promise<void> => {
    try {
      const indexId = parseInt(req.params.id);

      if (isNaN(indexId)) {
        res.status(400).json({
          success: false,
          error: 'Invalid index ID'
        });
        return;
      }

      const index = await this.marketService.getIndexById(indexId);

      if (!index) {
        res.status(404).json({
          success: false,
          error: 'Index not found'
        });
        return;
      }

      res.json({
        success: true,
        data: index
      });
    } catch (error: any) {
      SimpleLogger.error('MarketController', 'Failed to get index', 'getIndexById', {
        indexId: req.params.id,
        error: error.message
      });

      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get index'
      });
    }
  };

  // ==================== DATA OPERATIONS ====================

  /**
   * GET /api/market/data/:indexId
   * Get market data for an index
   */
  getMarketData = async (req: Request, res: Response): Promise<void> => {
    try {
      const indexId = parseInt(req.params.indexId);
      const {
        start_date,
        end_date,
        page = 1,
        page_size = 100
      } = req.query;

      if (isNaN(indexId)) {
        res.status(400).json({
          success: false,
          error: 'Invalid index ID'
        });
        return;
      }

      const result = await this.marketService.getMarketData(
        indexId,
        start_date ? new Date(start_date as string) : undefined,
        end_date ? new Date(end_date as string) : undefined,
        Number(page),
        Number(page_size)
      );

      res.json({
        success: true,
        data: result
      });
    } catch (error: any) {
      SimpleLogger.error('MarketController', 'Failed to get market data', 'getMarketData', {
        indexId: req.params.indexId,
        query: req.query,
        error: error.message
      });

      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get market data'
      });
    }
  };

  /**
   * GET /api/market/data/:indexId/latest
   * Get latest market data for an index
   */
  getLatestData = async (req: Request, res: Response): Promise<void> => {
    try {
      const indexId = parseInt(req.params.indexId);

      if (isNaN(indexId)) {
        res.status(400).json({
          success: false,
          error: 'Invalid index ID'
        });
        return;
      }

      const data = await this.marketService.getLatestData(indexId);

      if (!data) {
        res.status(404).json({
          success: false,
          error: 'No data found for this index'
        });
        return;
      }

      res.json({
        success: true,
        data
      });
    } catch (error: any) {
      SimpleLogger.error('MarketController', 'Failed to get latest data', 'getLatestData', {
        indexId: req.params.indexId,
        error: error.message
      });

      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get latest data'
      });
    }
  };

  /**
   * DELETE /api/market/data/:indexId
   * Delete all data for an index
   */
  deleteAllData = async (req: Request, res: Response): Promise<void> => {
    try {
      const indexId = parseInt(req.params.indexId);

      if (isNaN(indexId)) {
        res.status(400).json({
          success: false,
          error: 'Invalid index ID'
        });
        return;
      }

      const deletedCount = await this.marketService.deleteAllData(indexId);

      SimpleLogger.info('MarketController', 'All data deleted for index', 'deleteAllData', {
        indexId,
        deletedCount
      });

      res.json({
        success: true,
        message: `Deleted ${deletedCount} records`,
        data: {
          deleted_count: deletedCount
        }
      });
    } catch (error: any) {
      SimpleLogger.error('MarketController', 'Failed to delete data', 'deleteAllData', {
        indexId: req.params.indexId,
        error: error.message
      }, undefined, undefined, error.stack);

      res.status(500).json({
        success: false,
        error: error.message || 'Failed to delete data'
      });
    }
  };

  // ==================== DOWNLOAD OPERATIONS ====================

  /**
   * POST /api/market/download/historical
   * Trigger historical data download for an index
   */
  downloadHistorical = async (req: Request, res: Response): Promise<void> => {
    try {
      const { index_id, start_date, end_date, skip_existing = true } = req.body;

      // Validation
      if (!index_id || !start_date || !end_date) {
        res.status(400).json({
          success: false,
          error: 'index_id, start_date, and end_date are required'
        });
        return;
      }

      const startDate = new Date(start_date);
      const endDate = new Date(end_date);

      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        res.status(400).json({
          success: false,
          error: 'Invalid date format. Use YYYY-MM-DD'
        });
        return;
      }

      // Validate date range
      const validation = this.downloadService.validateDateRange(startDate, endDate);
      if (!validation.valid) {
        res.status(400).json({
          success: false,
          error: validation.error
        });
        return;
      }

      // Execute download asynchronously
      SimpleLogger.info('MarketController', 'Starting historical download', 'downloadHistorical', {
        indexId: index_id,
        startDate: start_date,
        endDate: end_date,
        skipExisting: skip_existing
      });

      // Trigger download in background
      this.downloadService.downloadHistoricalData(
        index_id,
        startDate,
        endDate,
        skip_existing
      ).then(result => {
        SimpleLogger.info('MarketController', 'Historical download completed', 'downloadHistorical-async', {
          indexId: index_id,
          success: result.success,
          recordsInserted: result.recordsInserted,
          recordsUpdated: result.recordsUpdated
        });
      }).catch(error => {
        SimpleLogger.error('MarketController', 'Historical download failed', 'downloadHistorical-async', {
          indexId: index_id,
          error: error.message
        });
      });

      res.status(202).json({
        success: true,
        message: 'Historical download started',
        data: {
          index_id,
          start_date,
          end_date,
          status: 'processing'
        }
      });

    } catch (error: any) {
      SimpleLogger.error('MarketController', 'Failed to trigger historical download', 'downloadHistorical', {
        body: req.body,
        error: error.message
      }, undefined, undefined, error.stack);

      res.status(500).json({
        success: false,
        error: error.message || 'Failed to trigger historical download'
      });
    }
  };

  /**
   * POST /api/market/download/eod
   * Trigger EOD download for a specific index
   */
  downloadEOD = async (req: Request, res: Response): Promise<void> => {
    try {
      const { index_id } = req.body;

      if (!index_id) {
        res.status(400).json({
          success: false,
          error: 'index_id is required'
        });
        return;
      }

      SimpleLogger.info('MarketController', 'Starting EOD download', 'downloadEOD', {
        indexId: index_id
      });

      // Execute download asynchronously
      this.downloadService.downloadEODData(index_id)
        .then(result => {
          SimpleLogger.info('MarketController', 'EOD download completed', 'downloadEOD-async', {
            indexId: index_id,
            success: result.success,
            recordsInserted: result.recordsInserted
          });
        })
        .catch(error => {
          SimpleLogger.error('MarketController', 'EOD download failed', 'downloadEOD-async', {
            indexId: index_id,
            error: error.message
          });
        });

      res.status(202).json({
        success: true,
        message: 'EOD download started',
        data: {
          index_id,
          status: 'processing'
        }
      });

    } catch (error: any) {
      SimpleLogger.error('MarketController', 'Failed to trigger EOD download', 'downloadEOD', {
        body: req.body,
        error: error.message
      });

      res.status(500).json({
        success: false,
        error: error.message || 'Failed to trigger EOD download'
      });
    }
  };

  /**
   * POST /api/market/download/eod-all
   * Trigger EOD download for all indices (scheduler calls this)
   */
  downloadEODAll = async (req: Request, res: Response): Promise<void> => {
    try {
      SimpleLogger.info('MarketController', 'Starting bulk EOD download', 'downloadEODAll');

      // Execute in background
      this.downloadService.downloadEODForAllIndices()
        .then(result => {
          SimpleLogger.info('MarketController', 'Bulk EOD download completed', 'downloadEODAll-async', {
            total: result.total,
            successful: result.successful,
            failed: result.failed,
            skipped: result.skipped
          });
        })
        .catch(error => {
          SimpleLogger.error('MarketController', 'Bulk EOD download failed', 'downloadEODAll-async', {
            error: error.message
          });
        });

      res.status(202).json({
        success: true,
        message: 'Bulk EOD download started for all indices',
        data: {
          status: 'processing'
        }
      });

    } catch (error: any) {
      SimpleLogger.error('MarketController', 'Failed to trigger bulk EOD download', 'downloadEODAll', {
        error: error.message
      });

      res.status(500).json({
        success: false,
        error: error.message || 'Failed to trigger bulk EOD download'
      });
    }
  };

  // ==================== STATISTICS ====================

  /**
   * GET /api/market/statistics
   * Get market data statistics
   */
  getStatistics = async (req: Request, res: Response): Promise<void> => {
    try {
      const stats = await this.marketService.getStatistics();

      res.json({
        success: true,
        data: stats
      });
    } catch (error: any) {
      SimpleLogger.error('MarketController', 'Failed to get statistics', 'getStatistics', {
        error: error.message
      });

      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get statistics'
      });
    }
  };

  /**
   * GET /api/market/detailed-status
   * Get detailed status for all indices including download, metrics, and gaps
   * Used by Cruise Control -> Market Downloads UI
   */
  getDetailedStatus = async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await this.marketService.getDetailedIndexStatus();

      res.json({
        success: true,
        data: result
      });
    } catch (error: any) {
      SimpleLogger.error('MarketController', 'Failed to get detailed status', 'getDetailedStatus', {
        error: error.message
      });

      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get detailed status'
      });
    }
  };

  // ==================== HEALTH CHECK ====================

  /**
   * GET /api/market/health
   * Test Yahoo Finance connection
   */
  healthCheck = async (req: Request, res: Response): Promise<void> => {
    try {
      const isConnected = await this.downloadService.testConnection();

      res.json({
        success: true,
        data: {
          yahoo_finance_connection: isConnected ? 'ok' : 'failed',
          timestamp: new Date().toISOString()
        }
      });
    } catch (error: any) {
      SimpleLogger.error('MarketController', 'Health check failed', 'healthCheck', {
        error: error.message
      });

      res.status(500).json({
        success: false,
        error: error.message || 'Health check failed'
      });
    }
  };
}