// backend/src/services/marketDownload.service.ts
// Market Data Download Service - Orchestrates downloads from Yahoo Finance

import { MarketService, CreateMarketDataRequest } from './market.service';
import { MarketIndex } from '../types/market.types';
import { YahooFinanceService, YahooFinanceRecord } from './yahooFinance.service';
import { SimpleLogger } from './simpleLogger.service';

export interface DownloadResult {
  success: boolean;
  indexId: number;
  indexName: string;
  recordsInserted: number;
  recordsUpdated: number;
  recordsSkipped: number;
  error?: string;
  executionTimeMs: number;
}

export class MarketDownloadService {
  private marketService: MarketService;
  private yahooService: YahooFinanceService;

  constructor() {
    this.marketService = new MarketService();
    this.yahooService = new YahooFinanceService();
  }

  // ==================== PROVIDER VALIDATION ====================

  /**
   * Validate that the index has a configured and enabled data provider
   */
  private validateProvider(index: any): { valid: boolean; error?: string } {
    // Check if provider is enabled
    if (!index.provider_enabled) {
      return {
        valid: false,
        error: `Data provider not enabled for ${index.index_name}. Current provider: ${index.data_provider}`
      };
    }

    // Check if provider is configured
    if (index.data_provider === 'not_configured') {
      return {
        valid: false,
        error: `Data provider not configured for ${index.index_name}. Please configure a data provider first.`
      };
    }

    // Currently only Yahoo Finance is supported
    if (index.data_provider !== 'yahoo_finance') {
      return {
        valid: false,
        error: `Data provider '${index.data_provider}' not yet supported for ${index.index_name}. Currently only 'yahoo_finance' is supported.`
      };
    }

    // Check if provider symbol exists
    if (!index.provider_symbol) {
      return {
        valid: false,
        error: `Provider symbol not configured for ${index.index_name}`
      };
    }

    return { valid: true };
  }

  // ==================== HISTORICAL DOWNLOAD ====================

  /**
   * Download historical data for a specific index
   * @param indexId Database ID of the index
   * @param startDate Start date for download
   * @param endDate End date for download
   * @param skipExisting If true, skip if data already exists for this date range
   */
  async downloadHistoricalData(
    indexId: number,
    startDate: Date,
    endDate: Date,
    skipExisting: boolean = true
  ): Promise<DownloadResult> {
    const startTime = Date.now();
    
    try {
      // Get index details
      const index = await this.marketService.getIndexById(indexId);
      if (!index) {
        throw new Error('Index not found');
      }

      // ====== NEW: Validate provider ======
      const providerValidation = this.validateProvider(index);
      if (!providerValidation.valid) {
        throw new Error(providerValidation.error);
      }

      SimpleLogger.info('MarketDownload', 'Starting historical download', 'downloadHistoricalData', {
        indexId,
        indexName: index.index_name,
        provider: index.data_provider,
        providerSymbol: index.provider_symbol,
        dateRange: `${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`,
        skipExisting
      });

      // Check if data already exists
      if (skipExisting && index.historical_data_available) {
        // Check for date range overlap
        if (index.earliest_date && index.latest_date) {
          const existingStart = new Date(index.earliest_date);
          const existingEnd = new Date(index.latest_date);
          
          // Check if requested range overlaps with existing data
          const hasOverlap = !(endDate < existingStart || startDate > existingEnd);
          
          if (hasOverlap) {
            SimpleLogger.warn('MarketDownload', 'Date range overlaps with existing data', 'downloadHistoricalData', {
              indexId,
              requestedRange: `${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`,
              existingRange: `${index.earliest_date} to ${index.latest_date}`
            });

            return {
              success: false,
              indexId,
              indexName: index.index_name,
              recordsInserted: 0,
              recordsUpdated: 0,
              recordsSkipped: 0,
              error: `Data already exists for this date range. Existing: ${index.earliest_date} to ${index.latest_date}`,
              executionTimeMs: Date.now() - startTime
            };
          }
        }
      }

      // Create download job
      const job = await this.marketService.createDownloadJob(
        indexId,
        'historical',
        startDate,
        endDate,
        'user'
      );

      // Update index status to in_progress
      await this.marketService.updateIndexStatus(indexId, {
        last_download_status: 'in_progress',
        last_download_at: new Date()
      });

      await this.marketService.updateDownloadJob(job.id, {
        status: 'running'
      });

      // ====== MODIFIED: Use provider_symbol instead of yahoo_symbol ======
      const yahooResponse = await this.yahooService.downloadHistoricalData(
        index.provider_symbol,
        startDate,
        endDate,
        {
          requestId: `hist_${index.index_code}_${job.id}`,
          retryAttempts: 3,
          timeout: 30000
        }
      );

      if (!yahooResponse.success || yahooResponse.data.length === 0) {
        throw new Error(
          yahooResponse.error || 
          'No data returned from Yahoo Finance for the requested date range'
        );
      }

      SimpleLogger.info('MarketDownload', 'Received data from Yahoo Finance', 'downloadHistoricalData', {
        indexId,
        recordCount: yahooResponse.data.length
      });

      // Convert Yahoo Finance records to database format
      const dbRecords: CreateMarketDataRequest[] = yahooResponse.data.map(record => ({
        index_id: indexId,
        date: record.date,
        open: record.open,
        high: record.high,
        low: record.low,
        close: record.close,
        volume: record.volume,
        adj_close: record.adj_close,
        data_source: 'yahoo_finance'
      }));

      // Upsert data to database
      const upsertResult = await this.marketService.upsertMarketData(dbRecords);

      if (upsertResult.inserted === 0 && upsertResult.updated === 0) {
        throw new Error(
          `Failed to insert any records. Errors: ${upsertResult.errors.map(e => e.error).join('; ')}`
        );
      }

      const executionTimeMs = Date.now() - startTime;

      // Update job status
      await this.marketService.updateDownloadJob(job.id, {
        status: 'completed',
        records_inserted: upsertResult.inserted,
        records_updated: upsertResult.updated,
        records_skipped: upsertResult.errors.length,
        execution_time_ms: executionTimeMs
      });

      // Update index status
      await this.marketService.updateIndexStatus(indexId, {
        last_download_status: 'success',
        last_download_at: new Date()
      });

      SimpleLogger.info('MarketDownload', 'Historical download completed successfully', 'downloadHistoricalData', {
        indexId,
        indexName: index.index_name,
        inserted: upsertResult.inserted,
        updated: upsertResult.updated,
        errors: upsertResult.errors.length,
        executionTimeMs
      });

      return {
        success: true,
        indexId,
        indexName: index.index_name,
        recordsInserted: upsertResult.inserted,
        recordsUpdated: upsertResult.updated,
        recordsSkipped: upsertResult.errors.length,
        executionTimeMs
      };

    } catch (error: any) {
      const executionTimeMs = Date.now() - startTime;
      const errorMessage = error.message || 'Unknown error';

      SimpleLogger.error('MarketDownload', 'Historical download failed', 'downloadHistoricalData', {
        indexId,
        error: errorMessage,
        executionTimeMs
      }, undefined, undefined, error.stack);

      // Update index status to failed
      try {
        await this.marketService.updateIndexStatus(indexId, {
          last_download_status: 'failed',
          last_download_error: errorMessage,
          last_download_at: new Date()
        });
      } catch (statusError) {
        SimpleLogger.error('MarketDownload', 'Failed to update index status after error', 'downloadHistoricalData', {
          indexId,
          error: statusError
        });
      }

      const index = await this.marketService.getIndexById(indexId);
      
      return {
        success: false,
        indexId,
        indexName: index?.index_name || 'Unknown',
        recordsInserted: 0,
        recordsUpdated: 0,
        recordsSkipped: 0,
        error: errorMessage,
        executionTimeMs
      };
    }
  }

  // ==================== NEW: BULK HISTORICAL DOWNLOAD ====================

  /**
   * Download historical data for multiple indices sequentially
   * @param indexIds Array of index IDs to download
   * @param startDate Start date for download
   * @param endDate End date for download
   * @param onProgress Optional callback for progress updates
   */
  async bulkDownloadHistorical(
    indexIds: number[],
    startDate: Date,
    endDate: Date,
    onProgress?: (current: number, total: number, result: DownloadResult) => void
  ): Promise<{
    total: number;
    successful: number;
    failed: number;
    skipped: number;
    results: DownloadResult[];
  }> {
    const startTime = Date.now();

    try {
      SimpleLogger.info('MarketDownload', 'Starting bulk historical download', 'bulkDownloadHistorical', {
        totalIndices: indexIds.length,
        dateRange: `${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`
      });

      const results: DownloadResult[] = [];
      let successful = 0;
      let failed = 0;
      let skipped = 0;

      for (let i = 0; i < indexIds.length; i++) {
        const indexId = indexIds[i];

        SimpleLogger.info('MarketDownload', `Processing bulk download ${i + 1}/${indexIds.length}`, 'bulkDownloadHistorical', {
          indexId,
          progress: `${i + 1}/${indexIds.length}`
        });

        const result = await this.downloadHistoricalData(indexId, startDate, endDate, true);
        results.push(result);

        if (result.success) {
          if (result.recordsInserted > 0 || result.recordsUpdated > 0) {
            successful++;
          } else {
            skipped++;
          }
        } else {
          failed++;
        }

        // Call progress callback if provided
        if (onProgress) {
          onProgress(i + 1, indexIds.length, result);
        }

        // Rate limiting: 1 second delay between downloads (except last one)
        if (i < indexIds.length - 1) {
          await this.sleep(1000);
        }
      }

      const totalTime = Date.now() - startTime;

      SimpleLogger.info('MarketDownload', 'Bulk historical download completed', 'bulkDownloadHistorical', {
        total: indexIds.length,
        successful,
        failed,
        skipped,
        executionTimeMs: totalTime
      });

      return {
        total: indexIds.length,
        successful,
        failed,
        skipped,
        results
      };

    } catch (error: any) {
      SimpleLogger.error('MarketDownload', 'Bulk historical download failed', 'bulkDownloadHistorical', {
        error: error.message
      }, undefined, undefined, error.stack);

      throw error;
    }
  }

  // ==================== EOD DOWNLOAD ====================

  /**
   * Download latest/EOD data for a specific index
   */
  async downloadEODData(indexId: number): Promise<DownloadResult> {
    const startTime = Date.now();
    
    try {
      // Get index details
      const index = await this.marketService.getIndexById(indexId);
      if (!index) {
        throw new Error('Index not found');
      }

      // ====== NEW: Validate provider ======
      const providerValidation = this.validateProvider(index);
      if (!providerValidation.valid) {
        throw new Error(providerValidation.error);
      }

      SimpleLogger.info('MarketDownload', 'Starting EOD download', 'downloadEODData', {
        indexId,
        indexName: index.index_name,
        provider: index.data_provider,
        providerSymbol: index.provider_symbol
      });

      // Create download job
      const job = await this.marketService.createDownloadJob(
        indexId,
        'eod',
        undefined,
        undefined,
        'scheduler'
      );

      await this.marketService.updateDownloadJob(job.id, {
        status: 'running'
      });

      // ====== MODIFIED: Use provider_symbol instead of yahoo_symbol ======
      const yahooResponse = await this.yahooService.downloadLatestData(
        index.provider_symbol,
        {
          requestId: `eod_${index.index_code}_${job.id}`,
          retryAttempts: 3,
          timeout: 30000
        }
      );

      if (!yahooResponse.success || yahooResponse.data.length === 0) {
        throw new Error(
          yahooResponse.error || 
          'No EOD data available from Yahoo Finance'
        );
      }

      // Get only today's data (most recent)
      const latestRecord = yahooResponse.data[yahooResponse.data.length - 1];
      
      // Check if we already have this date
      const dataExists = await this.marketService.checkDataExists(indexId, latestRecord.date);
      
      if (dataExists) {
        SimpleLogger.info('MarketDownload', 'EOD data already exists, skipping', 'downloadEODData', {
          indexId,
          date: latestRecord.date
        });

        const executionTimeMs = Date.now() - startTime;

        await this.marketService.updateDownloadJob(job.id, {
          status: 'completed',
          records_skipped: 1,
          execution_time_ms: executionTimeMs
        });

        return {
          success: true,
          indexId,
          indexName: index.index_name,
          recordsInserted: 0,
          recordsUpdated: 0,
          recordsSkipped: 1,
          executionTimeMs
        };
      }

      // Convert to database format
      const dbRecord: CreateMarketDataRequest = {
        index_id: indexId,
        date: latestRecord.date,
        open: latestRecord.open,
        high: latestRecord.high,
        low: latestRecord.low,
        close: latestRecord.close,
        volume: latestRecord.volume,
        adj_close: latestRecord.adj_close,
        data_source: 'yahoo_finance'
      };

      // Upsert to database
      const upsertResult = await this.marketService.upsertMarketData([dbRecord]);

      const executionTimeMs = Date.now() - startTime;

      // Update job
      await this.marketService.updateDownloadJob(job.id, {
        status: 'completed',
        records_inserted: upsertResult.inserted,
        records_updated: upsertResult.updated,
        execution_time_ms: executionTimeMs
      });

      // Update index status
      await this.marketService.updateIndexStatus(indexId, {
        last_download_status: 'success',
        last_download_at: new Date()
      });

      SimpleLogger.info('MarketDownload', 'EOD download completed successfully', 'downloadEODData', {
        indexId,
        indexName: index.index_name,
        date: latestRecord.date,
        inserted: upsertResult.inserted,
        updated: upsertResult.updated,
        executionTimeMs
      });

      return {
        success: true,
        indexId,
        indexName: index.index_name,
        recordsInserted: upsertResult.inserted,
        recordsUpdated: upsertResult.updated,
        recordsSkipped: 0,
        executionTimeMs
      };

    } catch (error: any) {
      const executionTimeMs = Date.now() - startTime;
      const errorMessage = error.message || 'Unknown error';

      SimpleLogger.error('MarketDownload', 'EOD download failed', 'downloadEODData', {
        indexId,
        error: errorMessage,
        executionTimeMs
      }, undefined, undefined, error.stack);

      // Update index status
      try {
        await this.marketService.updateIndexStatus(indexId, {
          last_download_status: 'failed',
          last_download_error: errorMessage,
          last_download_at: new Date()
        });
      } catch (statusError) {
        SimpleLogger.error('MarketDownload', 'Failed to update status after error', 'downloadEODData', {
          indexId,
          error: statusError
        });
      }

      const index = await this.marketService.getIndexById(indexId);

      return {
        success: false,
        indexId,
        indexName: index?.index_name || 'Unknown',
        recordsInserted: 0,
        recordsUpdated: 0,
        recordsSkipped: 0,
        error: errorMessage,
        executionTimeMs
      };
    }
  }

  // ==================== BULK EOD DOWNLOAD ====================

  /**
   * Download EOD data for all active indices
   * Used by scheduler
   */
  async downloadEODForAllIndices(): Promise<{
    total: number;
    successful: number;
    failed: number;
    skipped: number;
    results: DownloadResult[];
  }> {
    const startTime = Date.now();
    
    try {
      SimpleLogger.info('MarketDownload', 'Starting bulk EOD download for all indices', 'downloadEODForAllIndices');

      // ====== MODIFIED: Filter for enabled providers only ======
      const { indices } = await this.marketService.getAllIndices({
        page: 1,
        page_size: 1000
      });

      // Filter for only provider-enabled indices
      const enabledIndices = indices.filter(idx => idx.provider_enabled);

      if (enabledIndices.length === 0) {
        SimpleLogger.warn('MarketDownload', 'No provider-enabled indices found for EOD download', 'downloadEODForAllIndices', {
          totalIndices: indices.length,
          enabledIndices: 0
        });
        return {
          total: 0,
          successful: 0,
          failed: 0,
          skipped: 0,
          results: []
        };
      }

      SimpleLogger.info('MarketDownload', 'Processing EOD for provider-enabled indices', 'downloadEODForAllIndices', {
        totalIndices: indices.length,
        enabledIndices: enabledIndices.length
      });

      const results: DownloadResult[] = [];
      let successful = 0;
      let failed = 0;
      let skipped = 0;

      // Download for each enabled index with rate limiting
      for (let i = 0; i < enabledIndices.length; i++) {
        const index = enabledIndices[i];
        
        SimpleLogger.info('MarketDownload', `Processing EOD for index ${i + 1}/${enabledIndices.length}`, 'downloadEODForAllIndices', {
          indexId: index.id,
          indexName: index.index_name
        });

        const result = await this.downloadEODData(index.id);
        results.push(result);

        if (result.success) {
          if (result.recordsSkipped > 0) {
            skipped++;
          } else {
            successful++;
          }
        } else {
          failed++;
        }

        // Rate limiting: wait 500ms between requests (except for last one)
        if (i < enabledIndices.length - 1) {
          await this.sleep(500);
        }
      }

      const totalTime = Date.now() - startTime;

      SimpleLogger.info('MarketDownload', 'Bulk EOD download completed', 'downloadEODForAllIndices', {
        total: enabledIndices.length,
        successful,
        failed,
        skipped,
        executionTimeMs: totalTime
      });

      return {
        total: enabledIndices.length,
        successful,
        failed,
        skipped,
        results
      };

    } catch (error: any) {
      SimpleLogger.error('MarketDownload', 'Bulk EOD download failed', 'downloadEODForAllIndices', {
        error: error.message
      }, undefined, undefined, error.stack);

      throw error;
    }
  }

  // ==================== UTILITY METHODS ====================

  /**
   * Validate date range for historical download
   */
  validateDateRange(startDate: Date, endDate: Date): { valid: boolean; error?: string } {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (startDate >= endDate) {
      return {
        valid: false,
        error: 'Start date must be before end date'
      };
    }

    if (endDate > today) {
      return {
        valid: false,
        error: 'End date cannot be in the future'
      };
    }

    // Yahoo Finance typically has data from 2000 onwards for major indices
    const minDate = new Date('2000-01-01');
    if (startDate < minDate) {
      return {
        valid: false,
        error: `Start date cannot be before ${minDate.toISOString().split('T')[0]}`
      };
    }

    // Check if date range is too large (more than 20 years)
    const maxRangeDays = Math.floor(20 * 365.25);
    const rangeDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (rangeDays > maxRangeDays) {
      return {
        valid: false,
        error: `Date range too large. Maximum: ${maxRangeDays} days (~20 years)`
      };
    }

    return { valid: true };
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Test connection to Yahoo Finance
   */
  async testConnection(): Promise<boolean> {
    return this.yahooService.testConnection();
  }
}