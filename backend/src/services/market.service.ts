// backend/src/services/market.service.ts
// Market Data Service - Complete Database Operations

import { Pool } from 'pg';
import { pool } from '../config/database';
import { SimpleLogger } from './simpleLogger.service';

// ==================== INTERFACES ====================

export interface MarketIndex {
  id: number;
  index_code: string;
  index_name: string;
  yahoo_symbol: string;
  category: 'broad' | 'sectoral' | 'thematic';
  description?: string;
  is_active: boolean;
  priority: number;
  
  // Download Status
  total_records: number;
  earliest_date: Date | null;
  latest_date: Date | null;
  last_download_status: 'success' | 'failed' | 'pending' | 'in_progress' | null;
  last_download_at: Date | null;
  last_download_error: string | null;
  historical_data_available: boolean;
  
  // EOD Retry
  next_eod_retry_at: Date | null;
  eod_retry_count: number;
  last_successful_eod_download_at: Date | null;
  
  created_at: Date;
  updated_at: Date;
}

export interface MarketDataRecord {
  id: number;
  index_id: number;
  date: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
  adj_close?: number;
  data_source: string;
  
  // Returns (various periods)
  daily_return?: number | null;
  return_1w?: number | null;
  return_1m?: number | null;
  return_3m?: number | null;
  return_6m?: number | null;
  return_1y?: number | null;
  return_ytd?: number | null;
  return_all?: number | null;
  
  // Volatility (Standard Deviation)
  sd_7d?: number | null;
  sd_14d?: number | null;
  sd_21d?: number | null;
  sd_42d?: number | null;
  sd_3m?: number | null;
  sd_6m?: number | null;
  
  // Counts
  count_3m?: number | null;
  count_42d?: number | null;
  
  // Risk metrics
  sharpe_ratio?: number | null;
  max_drawdown?: number | null;
  total_risk?: number | null;
  cagr?: number | null;
  
  // Calculation timestamp
  metrics_calculated_at?: Date | null;
  
  created_at: Date;
  updated_at: Date;
}

export interface MarketDownloadJob {
  id: number;
  job_type: 'historical' | 'eod' | 'manual';
  index_id: number;
  start_date?: Date;
  end_date?: Date;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  error_details?: string;
  records_inserted: number;
  records_updated: number;
  records_skipped: number;
  execution_time_ms?: number;
  triggered_by?: string;
  created_at: Date;
  updated_at: Date;
  completed_at?: Date;
}

export interface CreateMarketDataRequest {
  index_id: number;
  date: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
  adj_close?: number;
  data_source?: string;
}

export interface MarketStatistics {
  total_indices: number;
  downloaded_indices: number;
  pending_indices: number;
  failed_indices: number;
  total_data_points: number;
  earliest_date: Date | null;
  latest_date: Date | null;
  storage_size_mb: number;
}

export interface IndexSearchParams {
  search?: string;
  category?: 'broad' | 'sectoral' | 'thematic';
  download_status?: 'downloaded' | 'pending' | 'failed';
  page?: number;
  page_size?: number;
}

// ==================== MAIN SERVICE CLASS ====================

export class MarketService {
  private db: Pool;

  constructor() {
    this.db = pool;
  }

  // ==================== INDEX OPERATIONS ====================

  /**
   * Get all market indices with filtering and pagination
   */
  async getAllIndices(params: IndexSearchParams = {}): Promise<{
    indices: MarketIndex[];
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
  }> {
    try {
      const {
        search,
        category,
        download_status,
        page = 1,
        page_size = 50
      } = params;

      const offset = (page - 1) * page_size;
      let whereConditions: string[] = ['is_active = true'];
      const queryParams: any[] = [];
      let paramIndex = 1;

      // Search filter
      if (search) {
        whereConditions.push(`(index_code ILIKE $${paramIndex} OR index_name ILIKE $${paramIndex})`);
        queryParams.push(`%${search}%`);
        paramIndex++;
      }

      // Category filter
      if (category) {
        whereConditions.push(`category = $${paramIndex}`);
        queryParams.push(category);
        paramIndex++;
      }

      // Download status filter
      if (download_status === 'downloaded') {
        whereConditions.push('historical_data_available = true');
      } else if (download_status === 'pending') {
        whereConditions.push('(historical_data_available = false OR historical_data_available IS NULL)');
      } else if (download_status === 'failed') {
        whereConditions.push(`last_download_status = 'failed'`);
      }

      const whereClause = whereConditions.length > 0 
        ? `WHERE ${whereConditions.join(' AND ')}`
        : '';

      // Count query
      const countQuery = `
        SELECT COUNT(*) as total
        FROM t_market_indices
        ${whereClause}
      `;

      const countResult = await this.db.query(countQuery, queryParams);
      const total = parseInt(countResult.rows[0]?.total || '0');

      if (total === 0) {
        return {
          indices: [],
          total: 0,
          page,
          page_size,
          total_pages: 0
        };
      }

      // Data query
      const dataQuery = `
        SELECT *
        FROM t_market_indices
        ${whereClause}
        ORDER BY priority ASC, index_name ASC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;

      queryParams.push(page_size, offset);
      const result = await this.db.query(dataQuery, queryParams);

      const total_pages = Math.ceil(total / page_size);

      SimpleLogger.info('MarketService', 'Retrieved market indices', 'getAllIndices', {
        total,
        page,
        returned: result.rows.length,
        filters: { search, category, download_status }
      });

      return {
        indices: result.rows,
        total,
        page,
        page_size,
        total_pages
      };

    } catch (error: any) {
      SimpleLogger.error('MarketService', 'Failed to get market indices', 'getAllIndices', {
        params,
        error: error.message
      }, undefined, undefined, error.stack);
      throw error;
    }
  }

  /**
   * Get index by ID
   */
  async getIndexById(indexId: number): Promise<MarketIndex | null> {
    try {
      const query = 'SELECT * FROM t_market_indices WHERE id = $1';
      const result = await this.db.query(query, [indexId]);
      return result.rows[0] || null;
    } catch (error: any) {
      SimpleLogger.error('MarketService', 'Failed to get index by ID', 'getIndexById', {
        indexId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get index by code
   */
  async getIndexByCode(indexCode: string): Promise<MarketIndex | null> {
    try {
      const query = 'SELECT * FROM t_market_indices WHERE index_code = $1';
      const result = await this.db.query(query, [indexCode]);
      return result.rows[0] || null;
    } catch (error: any) {
      SimpleLogger.error('MarketService', 'Failed to get index by code', 'getIndexByCode', {
        indexCode,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Update index download status
   */
  async updateIndexStatus(
    indexId: number,
    status: {
      last_download_status: 'success' | 'failed' | 'in_progress' | 'pending';
      last_download_error?: string;
      last_download_at?: Date;
    }
  ): Promise<void> {
    try {
      const query = `
        UPDATE t_market_indices
        SET 
          last_download_status = $2,
          last_download_error = $3,
          last_download_at = $4,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `;

      await this.db.query(query, [
        indexId,
        status.last_download_status,
        status.last_download_error || null,
        status.last_download_at || new Date()
      ]);

      SimpleLogger.info('MarketService', 'Index status updated', 'updateIndexStatus', {
        indexId,
        status: status.last_download_status
      });

    } catch (error: any) {
      SimpleLogger.error('MarketService', 'Failed to update index status', 'updateIndexStatus', {
        indexId,
        status,
        error: error.message
      }, undefined, undefined, error.stack);
      throw error;
    }
  }

  /**
   * Update index statistics after data insertion
   */
  async updateIndexStatistics(indexId: number): Promise<void> {
    try {
      const statsQuery = `
        SELECT 
          MIN(date) as earliest_date,
          MAX(date) as latest_date,
          COUNT(*) as total_records
        FROM t_market_data_records
        WHERE index_id = $1
      `;
      
      const result = await this.db.query(statsQuery, [indexId]);
      
      if (result.rows.length > 0 && result.rows[0].total_records > 0) {
        const stats = result.rows[0];
        
        const updateQuery = `
          UPDATE t_market_indices
          SET 
            earliest_date = $2,
            latest_date = $3,
            total_records = $4,
            historical_data_available = true,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = $1
        `;
        
        await this.db.query(updateQuery, [
          indexId,
          stats.earliest_date,
          stats.latest_date,
          parseInt(stats.total_records)
        ]);
        
        SimpleLogger.info('MarketService', 'Index statistics updated', 'updateIndexStatistics', {
          indexId,
          totalRecords: stats.total_records,
          dateRange: `${stats.earliest_date} to ${stats.latest_date}`
        });
      }
    } catch (error: any) {
      SimpleLogger.error('MarketService', 'Failed to update index statistics', 'updateIndexStatistics', {
        indexId,
        error: error.message
      }, undefined, undefined, error.stack);
      // Don't throw - this is a secondary operation
    }
  }

  /**
   * Check if data exists for a specific date
   */
  async checkDataExists(indexId: number, date: Date): Promise<boolean> {
    try {
      const query = `
        SELECT EXISTS(
          SELECT 1 FROM t_market_data_records
          WHERE index_id = $1 AND date = $2
        ) as exists
      `;
      
      const result = await this.db.query(query, [indexId, date]);
      return result.rows[0]?.exists || false;
    } catch (error: any) {
      SimpleLogger.error('MarketService', 'Failed to check data existence', 'checkDataExists', {
        indexId,
        date,
        error: error.message
      });
      return false;
    }
  }

  // ==================== DATA OPERATIONS ====================

  /**
   * Upsert market data records (insert or update)
   */
  async upsertMarketData(
    records: CreateMarketDataRequest[]
  ): Promise<{ inserted: number; updated: number; errors: Array<{ date: string; error: string }> }> {
    const client = await this.db.connect();
    
    try {
      await client.query('BEGIN');
      
      if (!records || records.length === 0) {
        throw new Error('No market data records provided for upsert');
      }

      let insertCount = 0;
      let updateCount = 0;
      const errors: Array<{ date: string; error: string }> = [];
      const processedIndexIds = new Set<number>();

      SimpleLogger.info('MarketService', 'Starting market data upsert', 'upsertMarketData', {
        totalRecords: records.length
      });

      const BATCH_SIZE = 100;
      for (let batchStart = 0; batchStart < records.length; batchStart += BATCH_SIZE) {
        const batch = records.slice(batchStart, Math.min(batchStart + BATCH_SIZE, records.length));
        
        for (let i = 0; i < batch.length; i++) {
          const record = batch[i];
          const savepointName = `sp_${batchStart + i}`;
          
          try {
            await client.query(`SAVEPOINT ${savepointName}`);
            
            if (!record.index_id || !record.date || record.open === undefined || record.close === undefined) {
              throw new Error('Missing required fields (index_id, date, open, or close)');
            }

            processedIndexIds.add(record.index_id);

            const upsertQuery = `
              INSERT INTO t_market_data_records (
                index_id, date, open, high, low, close, 
                volume, adj_close, data_source
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
              ON CONFLICT (index_id, date)
              DO UPDATE SET
                open = EXCLUDED.open,
                high = EXCLUDED.high,
                low = EXCLUDED.low,
                close = EXCLUDED.close,
                volume = EXCLUDED.volume,
                adj_close = EXCLUDED.adj_close,
                data_source = EXCLUDED.data_source,
                updated_at = CURRENT_TIMESTAMP
              RETURNING (xmax = 0) as was_inserted
            `;

            const result = await client.query(upsertQuery, [
              record.index_id,
              record.date,
              record.open,
              record.high,
              record.low,
              record.close,
              record.volume || null,
              record.adj_close || null,
              record.data_source || 'yahoo_finance'
            ]);

            if (result.rows[0].was_inserted) {
              insertCount++;
            } else {
              updateCount++;
            }
            
            await client.query(`RELEASE SAVEPOINT ${savepointName}`);
            
          } catch (recordError: any) {
            try {
              await client.query(`ROLLBACK TO SAVEPOINT ${savepointName}`);
            } catch (rollbackError) {
              SimpleLogger.error('MarketService', 'Failed to rollback to savepoint', 'upsertMarketData-rollback', {
                savepointName,
                error: rollbackError
              });
            }
            
            errors.push({ 
              date: record.date?.toISOString().split('T')[0] || 'UNKNOWN', 
              error: recordError.message || 'Unknown database error' 
            });
            
            if (errors.length <= 5) {
              SimpleLogger.error('MarketService', 'Failed to upsert individual record', 'upsertMarketData-record', {
                indexId: record.index_id,
                date: record.date,
                error: recordError.message
              }, undefined, undefined, recordError.stack);
            }
          }
        }
      }

      if (insertCount === 0 && updateCount === 0) {
        await client.query('ROLLBACK');
        
        const errorSummary = errors.length > 0 
          ? `All ${records.length} records failed. Sample errors: ${errors.slice(0, 3).map(e => `${e.date}: ${e.error}`).join('; ')}`
          : 'No records were inserted or updated for unknown reasons';
        
        SimpleLogger.error('MarketService', 'Market data upsert failed - no records processed', 'upsertMarketData', {
          totalRecords: records.length, 
          errorCount: errors.length,
          sampleErrors: errors.slice(0, 5)
        });
        
        throw new Error(`Market data upsert failed: ${errorSummary}`);
      }

      await client.query('COMMIT');

      SimpleLogger.info('MarketService', 'Market data upserted successfully', 'upsertMarketData', {
        totalRecords: records.length, 
        inserted: insertCount, 
        updated: updateCount, 
        errors: errors.length,
        successRate: `${Math.round(((insertCount + updateCount) / records.length) * 100)}%`,
        affectedIndices: processedIndexIds.size
      });

      // Update statistics for all processed indices
      for (const indexId of processedIndexIds) {
        try {
          await this.updateIndexStatistics(indexId);
        } catch (statsError: any) {
          SimpleLogger.error('MarketService', 'Failed to update index statistics after upsert', 'upsertMarketData-stats', {
            indexId,
            error: statsError.message
          });
        }
      }

      return { inserted: insertCount, updated: updateCount, errors };
      
    } catch (error: any) {
      await client.query('ROLLBACK');
      
      SimpleLogger.error('MarketService', 'Failed to upsert market data', 'upsertMarketData', {
        recordCount: records.length,
        error: error.message
      }, undefined, undefined, error.stack);
      
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get market data for an index with date range filtering
   */
  async getMarketData(
    indexId: number,
    startDate?: Date,
    endDate?: Date,
    page: number = 1,
    pageSize: number = 100
  ): Promise<{
    data: MarketDataRecord[];
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
  }> {
    try {
      const offset = (page - 1) * pageSize;
      let whereConditions = ['index_id = $1'];
      const queryParams: any[] = [indexId];
      let paramIndex = 2;

      if (startDate) {
        whereConditions.push(`date >= $${paramIndex}`);
        queryParams.push(startDate);
        paramIndex++;
      }

      if (endDate) {
        whereConditions.push(`date <= $${paramIndex}`);
        queryParams.push(endDate);
        paramIndex++;
      }

      const whereClause = whereConditions.join(' AND ');

      // Count query
      const countQuery = `
        SELECT COUNT(*) as total
        FROM t_market_data_records
        WHERE ${whereClause}
      `;

      const countResult = await this.db.query(countQuery, queryParams);
      const total = parseInt(countResult.rows[0]?.total || '0');

      if (total === 0) {
        return {
          data: [],
          total: 0,
          page,
          page_size: pageSize,
          total_pages: 0
        };
      }

      // Data query
      const dataQuery = `
        SELECT *
        FROM t_market_data_records
        WHERE ${whereClause}
        ORDER BY date DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;

      queryParams.push(pageSize, offset);
      const result = await this.db.query(dataQuery, queryParams);

      const total_pages = Math.ceil(total / pageSize);

      return {
        data: result.rows,
        total,
        page,
        page_size: pageSize,
        total_pages
      };

    } catch (error: any) {
      SimpleLogger.error('MarketService', 'Failed to get market data', 'getMarketData', {
        indexId,
        startDate,
        endDate,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get latest market data for an index
   */
  async getLatestData(indexId: number): Promise<MarketDataRecord | null> {
    try {
      const query = `
        SELECT *
        FROM t_market_data_records
        WHERE index_id = $1
        ORDER BY date DESC
        LIMIT 1
      `;

      const result = await this.db.query(query, [indexId]);
      return result.rows[0] || null;
    } catch (error: any) {
      SimpleLogger.error('MarketService', 'Failed to get latest data', 'getLatestData', {
        indexId,
        error: error.message
      });
      return null;
    }
  }

  /**
   * Delete all data for an index
   */
  async deleteAllData(indexId: number): Promise<number> {
    const client = await this.db.connect();
    
    try {
      await client.query('BEGIN');

      // Get count before deletion
      const countQuery = 'SELECT COUNT(*) as total FROM t_market_data_records WHERE index_id = $1';
      const countResult = await client.query(countQuery, [indexId]);
      const recordCount = parseInt(countResult.rows[0]?.total || '0');

      if (recordCount === 0) {
        await client.query('COMMIT');
        return 0;
      }

      // Delete all records
      const deleteQuery = 'DELETE FROM t_market_data_records WHERE index_id = $1';
      await client.query(deleteQuery, [indexId]);

      // Update index statistics
      const updateQuery = `
        UPDATE t_market_indices
        SET 
          total_records = 0,
          earliest_date = NULL,
          latest_date = NULL,
          historical_data_available = false,
          last_download_status = NULL,
          last_download_error = NULL,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `;
      await client.query(updateQuery, [indexId]);

      await client.query('COMMIT');

      SimpleLogger.info('MarketService', 'All data deleted for index', 'deleteAllData', {
        indexId,
        recordsDeleted: recordCount
      });

      return recordCount;

    } catch (error: any) {
      await client.query('ROLLBACK');
      
      SimpleLogger.error('MarketService', 'Failed to delete all data', 'deleteAllData', {
        indexId,
        error: error.message
      }, undefined, undefined, error.stack);
      
      throw error;
    } finally {
      client.release();
    }
  }

  // ==================== JOB MANAGEMENT ====================

  /**
   * Create download job
   */
  async createDownloadJob(
    indexId: number,
    jobType: 'historical' | 'eod' | 'manual',
    startDate?: Date,
    endDate?: Date,
    triggeredBy: string = 'user'
  ): Promise<MarketDownloadJob> {
    try {
      const query = `
        INSERT INTO t_market_download_jobs (
          job_type, index_id, start_date, end_date, triggered_by, status
        ) VALUES ($1, $2, $3, $4, $5, 'pending')
        RETURNING *
      `;

      const result = await this.db.query(query, [
        jobType,
        indexId,
        startDate || null,
        endDate || null,
        triggeredBy
      ]);

      const job = result.rows[0];

      SimpleLogger.info('MarketService', 'Download job created', 'createDownloadJob', {
        jobId: job.id,
        indexId,
        jobType
      });

      return job;
    } catch (error: any) {
      SimpleLogger.error('MarketService', 'Failed to create download job', 'createDownloadJob', {
        indexId,
        jobType,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Update download job
   */
  async updateDownloadJob(
    jobId: number,
    updates: {
      status?: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
      error_details?: string;
      records_inserted?: number;
      records_updated?: number;
      records_skipped?: number;
      execution_time_ms?: number;
    }
  ): Promise<void> {
    try {
      const updateFields: string[] = [];
      const queryParams: any[] = [];
      let paramIndex = 1;

      Object.entries(updates).forEach(([key, value]) => {
        if (value !== undefined) {
          updateFields.push(`${key} = $${paramIndex}`);
          queryParams.push(value);
          paramIndex++;
        }
      });

      if (updateFields.length === 0) return;

      if (updates.status === 'completed' || updates.status === 'failed' || updates.status === 'cancelled') {
        updateFields.push(`completed_at = CURRENT_TIMESTAMP`);
      }

      updateFields.push('updated_at = CURRENT_TIMESTAMP');

      const query = `
        UPDATE t_market_download_jobs
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex}
      `;

      queryParams.push(jobId);
      await this.db.query(query, queryParams);

      SimpleLogger.info('MarketService', 'Download job updated', 'updateDownloadJob', {
        jobId,
        updates
      });

    } catch (error: any) {
      SimpleLogger.error('MarketService', 'Failed to update download job', 'updateDownloadJob', {
        jobId,
        updates,
        error: error.message
      });
      throw error;
    }
  }

  // ==================== STATISTICS ====================

  /**
   * Get market data statistics
   */
  async getStatistics(): Promise<MarketStatistics> {
    try {
      const query = `
        SELECT 
          (SELECT COUNT(*) FROM t_market_indices WHERE is_active = true) as total_indices,
          (SELECT COUNT(*) FROM t_market_indices WHERE is_active = true AND historical_data_available = true) as downloaded_indices,
          (SELECT COUNT(*) FROM t_market_indices WHERE is_active = true AND (historical_data_available = false OR historical_data_available IS NULL)) as pending_indices,
          (SELECT COUNT(*) FROM t_market_indices WHERE is_active = true AND last_download_status = 'failed') as failed_indices,
          (SELECT COUNT(*) FROM t_market_data_records) as total_data_points,
          (SELECT MIN(date) FROM t_market_data_records) as earliest_date,
          (SELECT MAX(date) FROM t_market_data_records) as latest_date,
          (SELECT pg_total_relation_size('t_market_data_records') / 1024.0 / 1024.0) as storage_size_mb
      `;

      const result = await this.db.query(query);
      const stats = result.rows[0];

      return {
        total_indices: parseInt(stats.total_indices) || 0,
        downloaded_indices: parseInt(stats.downloaded_indices) || 0,
        pending_indices: parseInt(stats.pending_indices) || 0,
        failed_indices: parseInt(stats.failed_indices) || 0,
        total_data_points: parseInt(stats.total_data_points) || 0,
        earliest_date: stats.earliest_date,
        latest_date: stats.latest_date,
        storage_size_mb: parseFloat(stats.storage_size_mb) || 0
      };

    } catch (error: any) {
      SimpleLogger.error('MarketService', 'Failed to get statistics', 'getStatistics', {
        error: error.message
      });
      
      return {
        total_indices: 0,
        downloaded_indices: 0,
        pending_indices: 0,
        failed_indices: 0,
        total_data_points: 0,
        earliest_date: null,
        latest_date: null,
        storage_size_mb: 0
      };
    }
  }
}