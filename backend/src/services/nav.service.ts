// backend/src/services/nav.service.ts
// File 4/14: Core NAV operations service extending existing scheme service

import { Pool } from 'pg';
import { pool } from '../config/database';
import { SchemeService, SchemeDetail } from './scheme.service';
import { SimpleLogger } from './simpleLogger.service';
import {
  SchemeBookmark,
  CreateSchemeBookmarkRequest,
  UpdateSchemeBookmarkRequest,
  SchemeBookmarkSearchParams,
  SchemeBookmarkListResponse,
  SchemeBookmarkWithStats,
  NavData,
  NavDataSearchParams,
  NavDataListResponse,
  CreateNavDataRequest,
  NavDownloadJob,
  CreateNavDownloadJobRequest,
  NavDownloadJobSearchParams,
  NavDownloadJobListResponse,
  NavDownloadJobWithSchemes,
  NavDownloadJobResult,
  ParsedNavRecord,
  N8nWebhookPayload,
  NavStatistics,
  SchemeNavSummary,
  NAV_ERROR_CODES
} from '../types/nav.types';

export class NavService {
  private db: Pool;
  private schemeService: SchemeService;

  constructor() {
    this.db = pool;
    this.schemeService = new SchemeService();
  }

  // ==================== BOOKMARK OPERATIONS ====================

  /**
   * Get user's bookmarked schemes with NAV statistics
   */
  async getUserBookmarks(
    tenantId: number,
    isLive: boolean,
    userId: number,
    params: SchemeBookmarkSearchParams = {}
  ): Promise<SchemeBookmarkListResponse> {
    try {
      const { page = 1, page_size = 20, search, daily_download_only, amc_name } = params;
      const offset = (page - 1) * page_size;

      let query = `
        SELECT 
          sb.*,
          (
            SELECT COUNT(*) FROM t_nav_data nd 
            WHERE nd.scheme_id = sb.scheme_id 
            AND nd.tenant_id = $1 
            AND nd.is_live = $2
          ) as nav_records_count,
          (
            SELECT MAX(nav_date) FROM t_nav_data nd 
            WHERE nd.scheme_id = sb.scheme_id 
            AND nd.tenant_id = $1 
            AND nd.is_live = $2
          ) as latest_nav_date,
          (
            SELECT nav_value FROM t_nav_data nd 
            WHERE nd.scheme_id = sb.scheme_id 
            AND nd.tenant_id = $1 
            AND nd.is_live = $2
            ORDER BY nav_date DESC LIMIT 1
          ) as latest_nav_value
        FROM t_scheme_bookmarks sb
        WHERE sb.tenant_id = $1 
          AND sb.is_live = $2 
          AND sb.user_id = $3 
          AND sb.is_active = true
      `;

      const queryParams: any[] = [tenantId, isLive, userId];
      let paramIndex = 4;

      if (search) {
        query += ` AND (sb.scheme_name ILIKE $${paramIndex} OR sb.scheme_code ILIKE $${paramIndex} OR sb.amc_name ILIKE $${paramIndex})`;
        queryParams.push(`%${search}%`);
        paramIndex++;
      }

      if (daily_download_only) {
        query += ` AND sb.daily_download_enabled = true`;
      }

      if (amc_name) {
        query += ` AND sb.amc_name = $${paramIndex}`;
        queryParams.push(amc_name);
        paramIndex++;
      }

      // Get total count
      const countQuery = query.replace(
        'SELECT sb.*, (SELECT COUNT(*) FROM t_nav_data nd WHERE nd.scheme_id = sb.scheme_id AND nd.tenant_id = $1 AND nd.is_live = $2) as nav_records_count, (SELECT MAX(nav_date) FROM t_nav_data nd WHERE nd.scheme_id = sb.scheme_id AND nd.tenant_id = $1 AND nd.is_live = $2) as latest_nav_date, (SELECT nav_value FROM t_nav_data nd WHERE nd.scheme_id = sb.scheme_id AND nd.tenant_id = $1 AND nd.is_live = $2 ORDER BY nav_date DESC LIMIT 1) as latest_nav_value', 
        'SELECT COUNT(*) as total'
      );
      const countResult = await this.db.query(countQuery, queryParams);
      const total = parseInt(countResult.rows[0].total);

      // Add pagination and ordering
      query += ` ORDER BY sb.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      queryParams.push(page_size, offset);

      const result = await this.db.query(query, queryParams);
      const total_pages = Math.ceil(total / page_size);

      return {
        bookmarks: result.rows,
        total,
        page,
        page_size,
        total_pages,
        has_next: page < total_pages,
        has_prev: page > 1
      };
    } catch (error: any) {
      SimpleLogger.error('NavService', 'Failed to get user bookmarks', 'getUserBookmarks', {
        tenantId, userId, params, error: error.message
      }, userId, tenantId, error.stack);
      throw error;
    }
  }

  /**
   * Add scheme to user's bookmarks with denormalized scheme data
   */
  async addBookmark(
    tenantId: number,
    isLive: boolean,
    userId: number,
    request: CreateSchemeBookmarkRequest
  ): Promise<SchemeBookmark> {
    const client = await this.db.connect();
    
    try {
      await client.query('BEGIN');

      // Get scheme details using existing scheme service
      const scheme = await this.schemeService.getSchemeByCode(tenantId, isLive, request.scheme_id.toString());
      if (!scheme) {
        throw new Error(NAV_ERROR_CODES.SCHEME_NOT_FOUND);
      }

      // Check if already bookmarked
      const existingQuery = `
        SELECT id FROM t_scheme_bookmarks
        WHERE tenant_id = $1 AND is_live = $2 AND user_id = $3 AND scheme_id = $4 AND is_active = true
      `;
      const existing = await client.query(existingQuery, [tenantId, isLive, userId, request.scheme_id]);

      if (existing.rows.length > 0) {
        throw new Error(NAV_ERROR_CODES.SCHEME_ALREADY_BOOKMARKED);
      }

      const insertQuery = `
        INSERT INTO t_scheme_bookmarks (
          tenant_id, user_id, scheme_id, scheme_code, scheme_name, amc_name,
          is_live, daily_download_enabled, download_time
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `;

      const result = await client.query(insertQuery, [
        tenantId,
        userId,
        request.scheme_id,
        scheme.scheme_code,
        scheme.scheme_name,
        scheme.amc_name || null,
        isLive,
        request.daily_download_enabled || false,
        request.download_time || '22:00'
      ]);

      await client.query('COMMIT');

      SimpleLogger.error('NavService', 'Scheme bookmarked successfully', 'addBookmark', {
        tenantId, userId, schemeId: request.scheme_id, schemeCode: scheme.scheme_code
      }, userId, tenantId);

      return result.rows[0];
    } catch (error: any) {
      await client.query('ROLLBACK');
      SimpleLogger.error('NavService', 'Failed to add bookmark', 'addBookmark', {
        tenantId, userId, schemeId: request.scheme_id, error: error.message
      }, userId, tenantId, error.stack);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Update bookmark settings
   */
  async updateBookmark(
    tenantId: number,
    isLive: boolean,
    userId: number,
    bookmarkId: number,
    updates: UpdateSchemeBookmarkRequest
  ): Promise<SchemeBookmark> {
    try {
      const updateFields: string[] = [];
      const queryParams: any[] = [tenantId, isLive, userId, bookmarkId];
      let paramIndex = 5;

      Object.entries(updates).forEach(([key, value]) => {
        if (value !== undefined) {
          const dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
          updateFields.push(`${dbKey} = $${paramIndex}`);
          queryParams.push(value);
          paramIndex++;
        }
      });

      if (updateFields.length === 0) {
        throw new Error('No fields to update');
      }

      updateFields.push('updated_at = CURRENT_TIMESTAMP');

      const query = `
        UPDATE t_scheme_bookmarks
        SET ${updateFields.join(', ')}
        WHERE tenant_id = $1 AND is_live = $2 AND user_id = $3 AND id = $4 AND is_active = true
        RETURNING *
      `;

      const result = await this.db.query(query, queryParams);
      
      if (result.rows.length === 0) {
        throw new Error(NAV_ERROR_CODES.BOOKMARK_NOT_FOUND);
      }

      SimpleLogger.error('NavService', 'Bookmark updated successfully', 'updateBookmark', {
        tenantId, userId, bookmarkId, updates
      }, userId, tenantId);

      return result.rows[0];
    } catch (error: any) {
      SimpleLogger.error('NavService', 'Failed to update bookmark', 'updateBookmark', {
        tenantId, userId, bookmarkId, updates, error: error.message
      }, userId, tenantId, error.stack);
      throw error;
    }
  }

  /**
   * Remove bookmark (soft delete)
   */
  async removeBookmark(
    tenantId: number,
    isLive: boolean,
    userId: number,
    bookmarkId: number
  ): Promise<void> {
    try {
      const query = `
        UPDATE t_scheme_bookmarks
        SET is_active = false, updated_at = CURRENT_TIMESTAMP
        WHERE tenant_id = $1 AND is_live = $2 AND user_id = $3 AND id = $4
      `;

      const result = await this.db.query(query, [tenantId, isLive, userId, bookmarkId]);
      
      if (result.rowCount === 0) {
        throw new Error(NAV_ERROR_CODES.BOOKMARK_NOT_FOUND);
      }

      SimpleLogger.error('NavService', 'Bookmark removed successfully', 'removeBookmark', {
        tenantId, userId, bookmarkId
      }, userId, tenantId);
    } catch (error: any) {
      SimpleLogger.error('NavService', 'Failed to remove bookmark', 'removeBookmark', {
        tenantId, userId, bookmarkId, error: error.message
      }, userId, tenantId, error.stack);
      throw error;
    }
  }

  // ==================== NAV DATA OPERATIONS ====================

  /**
   * Get NAV data for schemes with filtering and pagination
   */
  async getNavData(
    tenantId: number,
    isLive: boolean,
    params: NavDataSearchParams = {}
  ): Promise<NavDataListResponse> {
    try {
      const { scheme_id, start_date, end_date, data_source, page = 1, page_size = 50 } = params;
      const offset = (page - 1) * page_size;

      let query = `
        SELECT 
          nd.*,
          sd.scheme_name,
          sd.amc_name
        FROM t_nav_data nd
        JOIN t_scheme_details sd ON nd.scheme_id = sd.id
        WHERE nd.tenant_id = $1 AND nd.is_live = $2
      `;

      const queryParams: any[] = [tenantId, isLive];
      let paramIndex = 3;

      if (scheme_id) {
        query += ` AND nd.scheme_id = $${paramIndex}`;
        queryParams.push(scheme_id);
        paramIndex++;
      }

      if (start_date) {
        query += ` AND nd.nav_date >= $${paramIndex}`;
        queryParams.push(start_date);
        paramIndex++;
      }

      if (end_date) {
        query += ` AND nd.nav_date <= $${paramIndex}`;
        queryParams.push(end_date);
        paramIndex++;
      }

      if (data_source) {
        query += ` AND nd.data_source = $${paramIndex}`;
        queryParams.push(data_source);
        paramIndex++;
      }

      // Get total count
      const countQuery = query.replace('SELECT nd.*, sd.scheme_name, sd.amc_name', 'SELECT COUNT(*) as total');
      const countResult = await this.db.query(countQuery, queryParams);
      const total = parseInt(countResult.rows[0].total);

      // Add pagination and ordering
      query += ` ORDER BY nd.nav_date DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      queryParams.push(page_size, offset);

      const result = await this.db.query(query, queryParams);
      const total_pages = Math.ceil(total / page_size);

      return {
        nav_data: result.rows,
        total,
        page,
        page_size,
        total_pages,
        has_next: page < total_pages,
        has_prev: page > 1
      };
    } catch (error: any) {
      SimpleLogger.error('NavService', 'Failed to get NAV data', 'getNavData', {
        tenantId, params, error: error.message
      }, undefined, tenantId, error.stack);
      throw error;
    }
  }

  /**
   * Get latest NAV for a specific scheme
   */
  async getLatestNav(
    tenantId: number,
    isLive: boolean,
    schemeId: number
  ): Promise<NavData | null> {
    try {
      const query = `
        SELECT 
          nd.*,
          sd.scheme_name,
          sd.amc_name
        FROM t_nav_data nd
        JOIN t_scheme_details sd ON nd.scheme_id = sd.id
        WHERE nd.tenant_id = $1 AND nd.is_live = $2 AND nd.scheme_id = $3
        ORDER BY nd.nav_date DESC
        LIMIT 1
      `;

      const result = await this.db.query(query, [tenantId, isLive, schemeId]);
      return result.rows[0] || null;
    } catch (error: any) {
      SimpleLogger.error('NavService', 'Failed to get latest NAV', 'getLatestNav', {
        tenantId, schemeId, error: error.message
      }, undefined, tenantId, error.stack);
      throw error;
    }
  }

  /**
   * Bulk insert/update NAV data (upsert by scheme_id + nav_date)
   */
  async upsertNavData(
    tenantId: number,
    isLive: boolean,
    navRecords: ParsedNavRecord[]
  ): Promise<{ inserted: number; updated: number; errors: Array<{ scheme_code: string; error: string }> }> {
    const client = await this.db.connect();
    
    try {
      await client.query('BEGIN');
      
      let insertCount = 0;
      let updateCount = 0;
      const errors: Array<{ scheme_code: string; error: string }> = [];

      for (const record of navRecords) {
        try {
          // Get scheme_id from scheme_code using existing service
          const scheme = await this.schemeService.getSchemeByCode(tenantId, isLive, record.scheme_code);
          if (!scheme) {
            errors.push({ scheme_code: record.scheme_code, error: 'Scheme not found' });
            continue;
          }

          const upsertQuery = `
            INSERT INTO t_nav_data (
              tenant_id, scheme_id, scheme_code, nav_date, nav_value, 
              repurchase_price, sale_price, is_live, data_source
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            ON CONFLICT (tenant_id, scheme_id, nav_date, is_live)
            DO UPDATE SET
              nav_value = EXCLUDED.nav_value,
              repurchase_price = EXCLUDED.repurchase_price,
              sale_price = EXCLUDED.sale_price,
              data_source = EXCLUDED.data_source,
              updated_at = CURRENT_TIMESTAMP
            RETURNING (xmax = 0) as was_inserted
          `;

          const result = await client.query(upsertQuery, [
            tenantId,
            scheme.id,
            record.scheme_code,
            record.nav_date,
            record.nav_value,
            record.repurchase_price || null,
            record.sale_price || null,
            isLive,
            'daily' // Default data source
          ]);

          if (result.rows[0].was_inserted) {
            insertCount++;
          } else {
            updateCount++;
          }
        } catch (recordError: any) {
          errors.push({ 
            scheme_code: record.scheme_code, 
            error: recordError.message || 'Unknown error' 
          });
        }
      }

      await client.query('COMMIT');

      SimpleLogger.error('NavService', 'NAV data upserted successfully', 'upsertNavData', {
        tenantId, totalRecords: navRecords.length, inserted: insertCount, updated: updateCount, errors: errors.length
      }, undefined, tenantId);

      return { inserted: insertCount, updated: updateCount, errors };
    } catch (error: any) {
      await client.query('ROLLBACK');
      SimpleLogger.error('NavService', 'Failed to upsert NAV data', 'upsertNavData', {
        tenantId, recordCount: navRecords.length, error: error.message
      }, undefined, tenantId, error.stack);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Check if NAV data exists for specific schemes on a date
   */
  async checkNavDataExists(
    tenantId: number,
    isLive: boolean,
    schemeIds: number[],
    navDate: Date
  ): Promise<{ [schemeId: number]: boolean }> {
    try {
      const query = `
        SELECT DISTINCT scheme_id
        FROM t_nav_data
        WHERE tenant_id = $1 AND is_live = $2 AND scheme_id = ANY($3) AND nav_date = $4
      `;

      const result = await this.db.query(query, [tenantId, isLive, schemeIds, navDate]);
      const existingSchemes = new Set(result.rows.map(row => row.scheme_id));

      return schemeIds.reduce((acc, schemeId) => {
        acc[schemeId] = existingSchemes.has(schemeId);
        return acc;
      }, {} as { [schemeId: number]: boolean });
    } catch (error: any) {
      SimpleLogger.error('NavService', 'Failed to check NAV data existence', 'checkNavDataExists', {
        tenantId, schemeIds, navDate, error: error.message
      }, undefined, tenantId, error.stack);
      throw error;
    }
  }

  // ==================== DOWNLOAD JOB OPERATIONS ====================

  /**
   * Create a new download job for n8n workflow execution
   */
  async createDownloadJob(
    tenantId: number,
    isLive: boolean,
    userId: number,
    request: CreateNavDownloadJobRequest
  ): Promise<NavDownloadJob> {
    const client = await this.db.connect();
    
    try {
      await client.query('BEGIN');

      // Validate historical download constraints
      if (request.job_type === 'historical') {
        if (!request.start_date || !request.end_date) {
          throw new Error('Historical downloads require start_date and end_date');
        }

        // Check if historical download already completed for any scheme
        for (const schemeId of request.scheme_ids) {
          const bookmarkQuery = `
            SELECT historical_download_completed 
            FROM t_scheme_bookmarks 
            WHERE tenant_id = $1 AND is_live = $2 AND user_id = $3 AND scheme_id = $4 AND is_active = true
          `;
          const bookmarkResult = await client.query(bookmarkQuery, [tenantId, isLive, userId, schemeId]);
          
          if (bookmarkResult.rows.length > 0 && bookmarkResult.rows[0].historical_download_completed) {
            throw new Error(NAV_ERROR_CODES.HISTORICAL_DOWNLOAD_COMPLETED);
          }
        }
      }

      const insertQuery = `
        INSERT INTO t_nav_download_jobs (
          tenant_id, is_live, job_type, scheme_ids, scheduled_date,
          start_date, end_date, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `;

      const result = await client.query(insertQuery, [
        tenantId,
        isLive,
        request.job_type,
        request.scheme_ids,
        request.scheduled_date || new Date(),
        request.start_date || null,
        request.end_date || null,
        userId
      ]);

      await client.query('COMMIT');

      const job = result.rows[0];

      SimpleLogger.error('NavService', 'Download job created successfully', 'createDownloadJob', {
        tenantId, userId, jobId: job.id, jobType: request.job_type, schemeCount: request.scheme_ids.length
      }, userId, tenantId);

      return job;
    } catch (error: any) {
      await client.query('ROLLBACK');
      SimpleLogger.error('NavService', 'Failed to create download job', 'createDownloadJob', {
        tenantId, userId, request, error: error.message
      }, userId, tenantId, error.stack);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Update download job status and results (called by n8n webhook)
   */
  async updateDownloadJob(
    tenantId: number,
    isLive: boolean,
    jobId: number,
    updates: {
      status?: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
      n8n_execution_id?: string;
      result_summary?: NavDownloadJobResult;
      error_details?: string;
    }
  ): Promise<NavDownloadJob> {
    try {
      const updateFields: string[] = [];
      const queryParams: any[] = [tenantId, isLive, jobId];
      let paramIndex = 4;

      Object.entries(updates).forEach(([key, value]) => {
        if (value !== undefined) {
          const dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
          updateFields.push(`${dbKey} = $${paramIndex}`);
          queryParams.push(typeof value === 'object' ? JSON.stringify(value) : value);
          paramIndex++;
        }
      });

      if (updateFields.length === 0) {
        throw new Error('No fields to update');
      }

      updateFields.push('updated_at = CURRENT_TIMESTAMP');

      const query = `
        UPDATE t_nav_download_jobs
        SET ${updateFields.join(', ')}
        WHERE tenant_id = $1 AND is_live = $2 AND id = $3
        RETURNING *
      `;

      const result = await this.db.query(query, queryParams);
      
      if (result.rows.length === 0) {
        throw new Error(NAV_ERROR_CODES.DOWNLOAD_JOB_NOT_FOUND);
      }

      SimpleLogger.error('NavService', 'Download job updated successfully', 'updateDownloadJob', {
        tenantId, jobId, updates
      }, undefined, tenantId);

      return result.rows[0];
    } catch (error: any) {
      SimpleLogger.error('NavService', 'Failed to update download job', 'updateDownloadJob', {
        tenantId, jobId, updates, error: error.message
      }, undefined, tenantId, error.stack);
      throw error;
    }
  }

  /**
   * Get download jobs with scheme details
   */
  async getDownloadJobs(
    tenantId: number,
    isLive: boolean,
    params: NavDownloadJobSearchParams = {}
  ): Promise<NavDownloadJobListResponse> {
    try {
      const { status, job_type, page = 1, page_size = 20, date_from, date_to } = params;
      const offset = (page - 1) * page_size;

      let query = `
        SELECT ndj.*
        FROM t_nav_download_jobs ndj
        WHERE ndj.tenant_id = $1 AND ndj.is_live = $2
      `;

      const queryParams: any[] = [tenantId, isLive];
      let paramIndex = 3;

      if (status) {
        query += ` AND ndj.status = $${paramIndex}`;
        queryParams.push(status);
        paramIndex++;
      }

      if (job_type) {
        query += ` AND ndj.job_type = $${paramIndex}`;
        queryParams.push(job_type);
        paramIndex++;
      }

      if (date_from) {
        query += ` AND ndj.created_at >= $${paramIndex}`;
        queryParams.push(date_from);
        paramIndex++;
      }

      if (date_to) {
        query += ` AND ndj.created_at <= $${paramIndex}`;
        queryParams.push(date_to);
        paramIndex++;
      }

      // Get total count
      const countQuery = query.replace('SELECT ndj.*', 'SELECT COUNT(*) as total');
      const countResult = await this.db.query(countQuery, queryParams);
      const total = parseInt(countResult.rows[0].total);

      // Add pagination
      query += ` ORDER BY ndj.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      queryParams.push(page_size, offset);

      const result = await this.db.query(query, queryParams);
      const jobs = result.rows;

      // Enhance jobs with scheme details
      const jobsWithSchemes: NavDownloadJobWithSchemes[] = [];
      for (const job of jobs) {
        const schemes = await this.getSchemesByIds(tenantId, isLive, job.scheme_ids);
        jobsWithSchemes.push({
          ...job,
          schemes: schemes.map(s => ({
            scheme_id: s.id,
            scheme_code: s.scheme_code,
            scheme_name: s.scheme_name
          }))
        });
      }

      const total_pages = Math.ceil(total / page_size);

      return {
        jobs: jobsWithSchemes,
        total,
        page,
        page_size,
        total_pages,
        has_next: page < total_pages,
        has_prev: page > 1
      };
    } catch (error: any) {
      SimpleLogger.error('NavService', 'Failed to get download jobs', 'getDownloadJobs', {
        tenantId, params, error: error.message
      }, undefined, tenantId, error.stack);
      throw error;
    }
  }

  /**
   * Prepare n8n webhook payload for job execution
   */
  async prepareN8nPayload(
    tenantId: number,
    isLive: boolean,
    jobId: number,
    apiBaseUrl: string
  ): Promise<N8nWebhookPayload> {
    try {
      const query = `
        SELECT * FROM t_nav_download_jobs
        WHERE tenant_id = $1 AND is_live = $2 AND id = $3
      `;

      const result = await this.db.query(query, [tenantId, isLive, jobId]);
      
      if (result.rows.length === 0) {
        throw new Error(NAV_ERROR_CODES.DOWNLOAD_JOB_NOT_FOUND);
      }

      const job = result.rows[0];

      return {
        job_id: jobId,
        tenant_id: tenantId,
        is_live: isLive,
        job_type: job.job_type,
        scheme_ids: job.scheme_ids,
        start_date: job.start_date ? job.start_date.toISOString().split('T')[0] : undefined,
        end_date: job.end_date ? job.end_date.toISOString().split('T')[0] : undefined,
        api_base_url: apiBaseUrl
      };
    } catch (error: any) {
      SimpleLogger.error('NavService', 'Failed to prepare n8n payload', 'prepareN8nPayload', {
        tenantId, jobId, error: error.message
      }, undefined, tenantId, error.stack);
      throw error;
    }
  }

  // ==================== HELPER METHODS ====================

  /**
   * Get schemes by IDs (helper method)
   */
  private async getSchemesByIds(tenantId: number, isLive: boolean, schemeIds: number[]): Promise<SchemeDetail[]> {
    try {
      const query = `
        SELECT * FROM t_scheme_details
        WHERE tenant_id = $1 AND is_live = $2 AND id = ANY($3) AND is_active = true
        ORDER BY scheme_name
      `;

      const result = await this.db.query(query, [tenantId, isLive, schemeIds]);
      return result.rows;
    } catch (error) {
      console.error('Error getting schemes by IDs:', error);
      throw error;
    }
  }

  /**
   * Get NAV statistics for dashboard
   */
  async getNavStatistics(tenantId: number, isLive: boolean, userId: number): Promise<NavStatistics> {
    try {
      const statsQuery = `
        SELECT 
          (SELECT COUNT(*) FROM t_scheme_bookmarks WHERE tenant_id = $1 AND is_live = $2 AND user_id = $3 AND is_active = true) as total_schemes_tracked,
          (SELECT COUNT(*) FROM t_nav_data WHERE tenant_id = $1 AND is_live = $2) as total_nav_records,
          (SELECT COUNT(*) FROM t_scheme_bookmarks WHERE tenant_id = $1 AND is_live = $2 AND user_id = $3 AND is_active = true AND daily_download_enabled = true) as schemes_with_daily_download,
          (SELECT COUNT(*) FROM t_scheme_bookmarks WHERE tenant_id = $1 AND is_live = $2 AND user_id = $3 AND is_active = true AND historical_download_completed = true) as schemes_with_historical_data,
          (SELECT MAX(nav_date) FROM t_nav_data WHERE tenant_id = $1 AND is_live = $2) as latest_nav_date,
          (SELECT MIN(nav_date) FROM t_nav_data WHERE tenant_id = $1 AND is_live = $2) as oldest_nav_date,
          (SELECT COUNT(*) FROM t_nav_download_jobs WHERE tenant_id = $1 AND is_live = $2 AND DATE(created_at) = CURRENT_DATE) as download_jobs_today,
          (SELECT COUNT(*) FROM t_nav_download_jobs WHERE tenant_id = $1 AND is_live = $2 AND DATE(created_at) = CURRENT_DATE AND status = 'failed') as failed_downloads_today
      `;

      const result = await this.db.query(statsQuery, [tenantId, isLive, userId]);
      const stats = result.rows[0];

      return {
        total_schemes_tracked: parseInt(stats.total_schemes_tracked) || 0,
        total_nav_records: parseInt(stats.total_nav_records) || 0,
        schemes_with_daily_download: parseInt(stats.schemes_with_daily_download) || 0,
        schemes_with_historical_data: parseInt(stats.schemes_with_historical_data) || 0,
        latest_nav_date: stats.latest_nav_date || new Date(),
        oldest_nav_date: stats.oldest_nav_date || new Date(),
        download_jobs_today: parseInt(stats.download_jobs_today) || 0,
        failed_downloads_today: parseInt(stats.failed_downloads_today) || 0
      };
    } catch (error: any) {
      SimpleLogger.error('NavService', 'Failed to get NAV statistics', 'getNavStatistics', {
        tenantId, userId, error: error.message
      }, userId, tenantId, error.stack);
      throw error;
    }
  }
}