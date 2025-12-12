// backend/src/services/nav.service.ts
// FIXED: Removed broken updateBookmarkDownloadStatus(), using updateSchemeNavStatus() instead
// ADDED: Bookmark gaps methods for identifying unbookmarked schemes

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
  BookmarkNavDataParams,
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
  UnbookmarkedScheme,
  BookmarkGapSummary,
  CustomerUnbookmarkedScheme,
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
   * Get user's bookmarked schemes with NAV statistics (tenant-scoped or all for admin)
   */
  async getUserBookmarks(
    tenantId: number,
    isLive: boolean,
    userId: number,
    params: SchemeBookmarkSearchParams = {},
    showAll: boolean = false
  ): Promise<SchemeBookmarkListResponse> {
    try {
      const { page = 1, page_size = 20, search, daily_download_only, amc_name, has_historical_data, has_calculations } = params;
      const offset = (page - 1) * page_size;

    let baseQuery: string;
    const queryParams: any[] = [];
    let paramIndex = 1;

    if (showAll) {
      // ADMIN MODE: Query from t_scheme_details (all schemes), LEFT JOIN bookmarks
      baseQuery = `
        FROM t_scheme_details sd
        LEFT JOIN t_scheme_bookmarks sb ON sd.id = sb.scheme_id
          AND sb.is_live = $${paramIndex}
          AND sb.is_active = true
        WHERE sd.is_active = true
      `;
      queryParams.push(isLive);
      paramIndex++;
    } else {
      // REGULAR MODE: Query from t_scheme_bookmarks (only bookmarked schemes)
      baseQuery = `
        FROM t_scheme_bookmarks sb
        JOIN t_scheme_details sd ON sb.scheme_id = sd.id
        WHERE sb.is_live = $${paramIndex}
          AND sb.is_active = true
          AND sb.tenant_id = $${paramIndex + 1}
      `;
      queryParams.push(isLive, tenantId);
      paramIndex += 2;
    }

    if (search) {
      if (showAll) {
        baseQuery += ` AND (sd.scheme_name ILIKE $${paramIndex} OR sd.scheme_code ILIKE $${paramIndex} OR sd.amc_name ILIKE $${paramIndex})`;
      } else {
        baseQuery += ` AND (sb.scheme_name ILIKE $${paramIndex} OR sb.scheme_code ILIKE $${paramIndex} OR sb.amc_name ILIKE $${paramIndex} OR sb.alias_name ILIKE $${paramIndex})`;
      }
      queryParams.push(`%${search}%`);
      paramIndex++;
    }

    if (daily_download_only && !showAll) {
      baseQuery += ` AND sb.daily_download_enabled = true`;
    }

    if (amc_name) {
      const amcColumn = showAll ? 'sd.amc_name' : 'sb.amc_name';
      baseQuery += ` AND ${amcColumn} = $${paramIndex}`;
      queryParams.push(amc_name);
      paramIndex++;
    }

    // Filter by historical data availability (NAV records count)
    if (has_historical_data === 'true') {
      baseQuery += ` AND sd.total_nav_records > 0`;
      SimpleLogger.info('NavService', 'Filtering for schemes WITH historical data', 'getUserBookmarks', {
        has_historical_data, tenantId, page, showAll
      });
    } else if (has_historical_data === 'false') {
      baseQuery += ` AND (sd.total_nav_records IS NULL OR sd.total_nav_records = 0)`;
      SimpleLogger.info('NavService', 'Filtering for schemes WITHOUT historical data', 'getUserBookmarks', {
        has_historical_data, tenantId, page, showAll
      });
    }
    // 'all' or undefined = no filter, show all

    // Filter by calculations availability (check if ANY NAV records have calculated metrics)
    // NOTE: t_nav_data is GLOBAL - not filtered by is_live
    if (has_calculations === 'true') {
      baseQuery += ` AND EXISTS (
        SELECT 1 FROM t_nav_data nd
        WHERE nd.scheme_id = sb.scheme_id
          AND nd.metrics_calculated_at IS NOT NULL
        LIMIT 1
      )`;
      SimpleLogger.info('NavService', 'Filtering for schemes WITH calculations', 'getUserBookmarks', {
        has_calculations, tenantId, page
      });
    } else if (has_calculations === 'false') {
      baseQuery += ` AND sd.total_nav_records > 0 AND NOT EXISTS (
        SELECT 1 FROM t_nav_data nd
        WHERE nd.scheme_id = sb.scheme_id
          AND nd.metrics_calculated_at IS NOT NULL
        LIMIT 1
      )`;
      SimpleLogger.info('NavService', 'Filtering for schemes WITHOUT calculations', 'getUserBookmarks', {
        has_calculations, tenantId, page
      });
    }
    // 'all' or undefined = no filter, show all

    const countQuery = `SELECT COUNT(*) as total ${baseQuery}`;
    SimpleLogger.info('NavService', 'Executing count query', 'getUserBookmarks', {
      countQuery: countQuery.substring(0, 200),
      params: queryParams,
      has_historical_data,
      showAll
    });
    const countResult = await this.db.query(countQuery, queryParams);
    const total = countResult.rows.length > 0 && countResult.rows[0]?.total ?
      parseInt(countResult.rows[0].total) : 0;

    if (total === 0) {
      return {
        bookmarks: [],
        total: 0,
        page,
        page_size,
        total_pages: 0,
        has_next: false,
        has_prev: false
      };
    }

    let dataQuery: string;

    if (showAll) {
      // ADMIN MODE: Use scheme_details as primary source
      dataQuery = `
        SELECT
          sb.id,
          sb.tenant_id,
          sb.user_id,
          sd.id as scheme_id,
          sd.scheme_code,
          sd.scheme_name,
          sd.amc_name,
          sb.alias_name,
          COALESCE(sb.is_live, $1) as is_live,
          true as is_active,
          COALESCE(sb.daily_download_enabled, false) as daily_download_enabled,
          COALESCE(sb.download_time, '00:00') as download_time,
          COALESCE(sb.historical_download_completed, false) as historical_download_completed,
          COALESCE(sb.created_at, CURRENT_TIMESTAMP) as created_at,
          COALESCE(sb.updated_at, CURRENT_TIMESTAMP) as updated_at,
          sd.scheme_nav_name,
          sd.launch_date,
          sd.last_nav_download_date,
          sd.last_nav_download_status,
          sd.last_nav_download_error,
          sd.historical_data_available,
          sd.earliest_nav_date,
          sd.latest_nav_date,
          sd.total_nav_records as nav_records_count,
          (SELECT nav_value
           FROM t_nav_data nd
           WHERE nd.scheme_id = sd.id
             AND nd.is_live = $1
           ORDER BY nav_date DESC
           LIMIT 1
          ) as latest_nav_value
        ${baseQuery}
        ORDER BY sd.scheme_code ASC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;
    } else {
      // REGULAR MODE: Use bookmarks as primary source
      dataQuery = `
        SELECT
          sb.id,
          sb.tenant_id,
          sb.user_id,
          sb.scheme_id,
          sb.scheme_code,
          sb.scheme_name,
          sb.amc_name,
          sb.alias_name,
          sb.is_live,
          sb.is_active,
          sb.daily_download_enabled,
          sb.download_time,
          sb.historical_download_completed,
          sb.created_at,
          sb.updated_at,
          sd.scheme_nav_name,
          sd.launch_date,
          sd.last_nav_download_date,
          sd.last_nav_download_status,
          sd.last_nav_download_error,
          sd.historical_data_available,
          sd.earliest_nav_date,
          sd.latest_nav_date,
          sd.total_nav_records as nav_records_count,
          (SELECT nav_value
           FROM t_nav_data nd
           WHERE nd.scheme_id = sb.scheme_id
             AND nd.is_live = $1
           ORDER BY nav_date DESC
           LIMIT 1
          ) as latest_nav_value
        ${baseQuery}
        ORDER BY sb.created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;
    }

    queryParams.push(page_size, offset);
    const result = await this.db.query(dataQuery, queryParams);
    const total_pages = Math.ceil(total / page_size);

    SimpleLogger.info('NavService', 'User bookmarks retrieved successfully', 'getUserBookmarks', {
      tenantId,
      userId,
      total,
      page,
      bookmarksReturned: result.rows.length
    });

    return {
      bookmarks: result.rows || [],
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
    
    return {
      bookmarks: [],
      total: 0,
      page: params.page || 1,
      page_size: params.page_size || 20,
      total_pages: 0,
      has_next: false,
      has_prev: false
    };
  }
}

  /**
   * Update global scheme NAV download status in t_scheme_details
   * This is the correct method to use for updating NAV download status
   */
  async updateSchemeNavStatus(
    schemeId: number,
    status: {
      last_download_status: 'success' | 'failed' | 'in_progress' | 'pending';
      last_download_error?: string;
      last_download_date?: Date;
    }
  ): Promise<void> {
    try {
      const query = `
        UPDATE t_scheme_details
        SET 
          last_nav_download_status = $2,
          last_nav_download_error = $3,
          last_nav_download_date = $4,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `;

      await this.db.query(query, [
        schemeId,
        status.last_download_status,
        status.last_download_error || null,
        status.last_download_date || new Date()
      ]);

      SimpleLogger.info('NavService', 'Scheme NAV status updated', 'updateSchemeNavStatus', {
        schemeId, status: status.last_download_status
      });

    } catch (error: any) {
      SimpleLogger.error('NavService', 'Failed to update scheme NAV status', 'updateSchemeNavStatus', {
        schemeId, status, error: error.message
      }, undefined, undefined, error.stack);
      throw error;
    }
  }

  /**
   * DEPRECATED: This method is kept for backward compatibility but redirects to updateSchemeNavStatus
   * Will be removed in future versions
   */
  async updateBookmarkDownloadStatus(
    tenantId: number,
    isLive: boolean,
    userId: number,
    schemeId: number,
    status: {
      last_download_status: 'success' | 'failed' | 'pending' | 'in_progress';
      last_download_error?: string;
      last_download_attempt?: Date;
    }
  ): Promise<void> {
    SimpleLogger.info('NavService', 'updateBookmarkDownloadStatus called (deprecated, redirecting to updateSchemeNavStatus)', 'updateBookmarkDownloadStatus', {
      tenantId, userId, schemeId
    }, userId, tenantId);
    
    // Redirect to the correct method
    return this.updateSchemeNavStatus(schemeId, {
      last_download_status: status.last_download_status,
      last_download_error: status.last_download_error,
      last_download_date: status.last_download_attempt
    });
  }

  /**
   * Update NAV statistics in t_scheme_details after data insertion
   * This should be called after upserting NAV data
   */
  async updateSchemeNavStatistics(schemeId: number, isLive: boolean): Promise<void> {
    try {
      const statsQuery = `
        SELECT 
          MIN(nav_date) as earliest_date,
          MAX(nav_date) as latest_date,
          COUNT(*) as total_records
        FROM t_nav_data
        WHERE scheme_id = $1 AND is_live = $2
      `;
      
      const result = await this.db.query(statsQuery, [schemeId, isLive]);
      
      if (result.rows.length > 0 && result.rows[0].total_records > 0) {
        const stats = result.rows[0];
        
        const updateQuery = `
          UPDATE t_scheme_details
          SET 
            earliest_nav_date = $2,
            latest_nav_date = $3,
            total_nav_records = $4,
            historical_data_available = true,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = $1
        `;
        
        await this.db.query(updateQuery, [
          schemeId,
          stats.earliest_date,
          stats.latest_date,
          parseInt(stats.total_records)
        ]);
        
        SimpleLogger.info('NavService', 'Scheme NAV statistics updated', 'updateSchemeNavStatistics', {
          schemeId, totalRecords: stats.total_records
        });
      }
    } catch (error: any) {
      SimpleLogger.error('NavService', 'Failed to update scheme NAV statistics', 'updateSchemeNavStatistics', {
        schemeId, error: error.message
      }, undefined, undefined, error.stack);
      // Don't throw - this is a secondary operation
    }
  }

  /**
   * Get NAV data for a specific bookmark
   */
  async getBookmarkNavData(
    tenantId: number,
    isLive: boolean,
    userId: number,
    params: BookmarkNavDataParams
  ): Promise<NavDataListResponse> {
    try {
      const bookmarkQuery = `
        SELECT scheme_id FROM t_scheme_bookmarks
        WHERE tenant_id = $1 AND is_live = $2 AND id = $3 AND is_active = true
      `;
      const bookmarkResult = await this.db.query(bookmarkQuery, [tenantId, isLive, params.bookmark_id]);
      
      if (bookmarkResult.rows.length === 0) {
        throw new Error('Bookmark not found or access denied');
      }

      const schemeId = bookmarkResult.rows[0].scheme_id;

      if (params.granularity === 'monthly') {
        return await this.getMonthlyNavData(
          isLive,
          schemeId,
          params
        );
      }

      const navParams: NavDataSearchParams = {
        scheme_id: schemeId,
        start_date: params.start_date ? new Date(params.start_date) : undefined,
        end_date: params.end_date ? new Date(params.end_date) : undefined,
        page: params.page || 1,
        page_size: params.page_size || 50
      };

      return await this.getNavData(isLive, navParams);

    } catch (error: any) {
      SimpleLogger.error('NavService', 'Failed to get bookmark NAV data', 'getBookmarkNavData', {
        tenantId, userId, params, error: error.message
      }, userId, tenantId, error.stack);
      throw error;
    }
  }

  /**
   * Get monthly closing NAV data (last trading day of each month)
   */
  private async getMonthlyNavData(
    isLive: boolean,
    schemeId: number,
    params: BookmarkNavDataParams
  ): Promise<NavDataListResponse> {
    try {
      const { start_date, end_date, page = 1, page_size = 50 } = params;
      const offset = (page - 1) * page_size;

      let baseQuery = `
        FROM (
          SELECT DISTINCT ON (DATE_TRUNC('month', nav_date))
            nd.id,
            nd.scheme_id,
            nd.scheme_code,
            nd.nav_date,
            nd.nav_value,
            nd.repurchase_price,
            nd.sale_price,
            nd.is_live,
            nd.data_source,
            nd.created_at,
            nd.updated_at,
            sd.scheme_name,
            sd.amc_name,
            DATE_TRUNC('month', nav_date) as month_key
          FROM t_nav_data nd
          JOIN t_scheme_details sd ON nd.scheme_id = sd.id
          WHERE nd.is_live = $1 
            AND nd.scheme_id = $2
      `;

      const queryParams: any[] = [isLive, schemeId];
      let paramIndex = 3;

      if (start_date) {
        baseQuery += ` AND nd.nav_date >= $${paramIndex}`;
        queryParams.push(new Date(start_date));
        paramIndex++;
      }

      if (end_date) {
        baseQuery += ` AND nd.nav_date <= $${paramIndex}`;
        queryParams.push(new Date(end_date));
        paramIndex++;
      }

      baseQuery += `
          ORDER BY DATE_TRUNC('month', nav_date) DESC, nav_date DESC
        ) monthly_data
      `;

      const countQuery = `SELECT COUNT(*) as total ${baseQuery}`;
      const countResult = await this.db.query(countQuery, queryParams);
      const total = countResult.rows.length > 0 && countResult.rows[0]?.total ? 
        parseInt(countResult.rows[0].total) : 0;

      if (total === 0) {
        return {
          nav_data: [],
          total: 0,
          page,
          page_size,
          total_pages: 0,
          has_next: false,
          has_prev: false
        };
      }

      const dataQuery = `
        SELECT 
          id,
          scheme_id,
          scheme_code,
          nav_date,
          nav_value,
          repurchase_price,
          sale_price,
          is_live,
          data_source,
          created_at,
          updated_at,
          scheme_name,
          amc_name
        ${baseQuery}
        ORDER BY nav_date DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;

      queryParams.push(page_size, offset);
      const result = await this.db.query(dataQuery, queryParams);
      const total_pages = Math.ceil(total / page_size);

      SimpleLogger.info('NavService', 'Monthly NAV data retrieved successfully', 'getMonthlyNavData', {
        schemeId, totalMonths: total, page, page_size
      });

      return {
        nav_data: result.rows || [],
        total,
        page,
        page_size,
        total_pages,
        has_next: page < total_pages,
        has_prev: page > 1
      };
    } catch (error: any) {
      SimpleLogger.error('NavService', 'Failed to get monthly NAV data', 'getMonthlyNavData', {
        schemeId, params, error: error.message
      }, undefined, undefined, error.stack);
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

      if (!request.scheme_id || !Number.isInteger(request.scheme_id)) {
        throw new Error('Valid scheme_id is required');
      }

      const scheme = await this.schemeService.getSchemeById(tenantId, isLive, request.scheme_id);
      if (!scheme) {
        throw new Error(NAV_ERROR_CODES.SCHEME_NOT_FOUND);
      }

      const existingQuery = `
        SELECT id FROM t_scheme_bookmarks
        WHERE tenant_id = $1 AND is_live = $2 AND scheme_id = $3 AND is_active = true
      `;
      const existing = await client.query(existingQuery, [tenantId, isLive, request.scheme_id]);

      if (existing.rows.length > 0) {
        throw new Error(NAV_ERROR_CODES.SCHEME_ALREADY_BOOKMARKED);
      }

      const insertQuery = `
        INSERT INTO t_scheme_bookmarks (
          tenant_id, user_id, scheme_id, scheme_code, scheme_name, amc_name, alias_name,
          is_live, daily_download_enabled, download_time
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
      `;

      const result = await client.query(insertQuery, [
        tenantId,
        userId,
        request.scheme_id,
        scheme.scheme_code,
        scheme.scheme_name,
        scheme.amc_name || null,
        request.alias_name || null,
        isLive,
        request.daily_download_enabled ?? true,  // Default to true - auto-enable daily download
        request.download_time || '22:00'
      ]);

      await client.query('COMMIT');

      SimpleLogger.info('NavService', 'Scheme bookmarked successfully', 'addBookmark', {
        tenantId, userId, schemeId: request.scheme_id, schemeCode: scheme.scheme_code, aliasName: request.alias_name
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
      const queryParams: any[] = [tenantId, isLive, bookmarkId];
      let paramIndex = 4;

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
        WHERE tenant_id = $1 AND is_live = $2 AND id = $3 AND is_active = true
        RETURNING *
      `;

      const result = await this.db.query(query, queryParams);
      
      if (result.rows.length === 0) {
        throw new Error(NAV_ERROR_CODES.BOOKMARK_NOT_FOUND);
      }

      SimpleLogger.info('NavService', 'Bookmark updated successfully', 'updateBookmark', {
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
        WHERE tenant_id = $1 AND is_live = $2 AND id = $3
      `;

      const result = await this.db.query(query, [tenantId, isLive, bookmarkId]);
      
      if (result.rowCount === 0) {
        throw new Error(NAV_ERROR_CODES.BOOKMARK_NOT_FOUND);
      }

      SimpleLogger.info('NavService', 'Bookmark removed successfully', 'removeBookmark', {
        tenantId, userId, bookmarkId
      }, userId, tenantId);
    } catch (error: any) {
      SimpleLogger.error('NavService', 'Failed to remove bookmark', 'removeBookmark', {
        tenantId, userId, bookmarkId, error: error.message
      }, userId, tenantId, error.stack);
      throw error;
    }
  }

  // ==================== BOOKMARK GAPS ====================

  /**
   * Get all unbookmarked schemes across system (global view)
   * Uses existing v_tenant_customer_schemes view + JOIN with bookmarks
   */
  async getBookmarkGaps(
    tenantId: number,
    isLive: boolean,
    params?: {
      page?: number;
      page_size?: number;
      sort_by?: string;
      sort_order?: string;
    }
  ): Promise<UnbookmarkedScheme[]> {
    try {
      const { page = 1, page_size = 50, sort_by = 'customer_count', sort_order = 'desc' } = params || {};
      const offset = (page - 1) * page_size;

      // Query: Use existing view to find schemes NOT bookmarked
      const query = `
        SELECT 
          vcs.scheme_code,
          vcs.scheme_name,
          vcs.customer_count,
          vcs.transaction_count,
          vcs.total_invested,
          vcs.last_transaction_date,
          vcs.first_transaction_date,
          sd.id as scheme_id,
          sd.amc_name,
          CASE WHEN sd.id IS NOT NULL THEN true ELSE false END as exists_in_master
        FROM v_tenant_customer_schemes vcs
        LEFT JOIN t_scheme_details sd ON vcs.scheme_code = sd.scheme_code
        WHERE vcs.tenant_id = $1 
          AND vcs.is_live = $2
          AND vcs.scheme_code NOT IN (
            SELECT DISTINCT scheme_code FROM t_scheme_bookmarks 
            WHERE tenant_id = $1 AND is_live = $2 AND is_active = true
          )
        ORDER BY 
          ${sort_by === 'customer_count' ? 'vcs.customer_count' : 'vcs.total_invested'} 
          ${sort_order === 'asc' ? 'ASC' : 'DESC'}
        LIMIT $3 OFFSET $4
      `;

      const result = await this.db.query(query, [tenantId, isLive, page_size, offset]);

      SimpleLogger.info('NavService', 'Bookmark gaps retrieved successfully', 'getBookmarkGaps', {
        tenantId,
        totalGaps: result.rows.length,
        page,
        sort_by
      });

      // Convert date strings to Date objects
      return (result.rows || []).map(row => ({
        ...row,
        last_transaction_date: row.last_transaction_date ? new Date(row.last_transaction_date) : new Date(),
        first_transaction_date: row.first_transaction_date ? new Date(row.first_transaction_date) : new Date()
      }));
    } catch (error: any) {
      SimpleLogger.error('NavService', 'Failed to get bookmark gaps', 'getBookmarkGaps', {
        tenantId, params, error: error.message
      }, undefined, tenantId, error.stack);
      return [];
    }
  }

  /**
   * Get bookmark gaps summary (aggregated statistics)
   * Shows overall impact of unbookmarked schemes
   */
  async getBookmarkGapsSummary(
    tenantId: number,
    isLive: boolean
  ): Promise<BookmarkGapSummary> {
    try {
      const query = `
        SELECT 
          COUNT(DISTINCT vcs.scheme_code) as total_unbookmarked,
          COUNT(DISTINCT vcs.customer_code) as total_customers_affected,
          COALESCE(SUM(vcs.total_invested), 0) as total_investment_at_risk,
          COUNT(DISTINCT CASE 
            WHEN sd.id IS NULL THEN vcs.scheme_code 
          END) as schemes_not_in_master,
          COUNT(DISTINCT CASE 
            WHEN sd.id IS NOT NULL THEN vcs.scheme_code 
          END) as schemes_not_bookmarked,
          NOW() as last_checked
        FROM v_tenant_customer_schemes vcs
        LEFT JOIN t_scheme_details sd ON vcs.scheme_code = sd.scheme_code
        WHERE vcs.tenant_id = $1 
          AND vcs.is_live = $2
          AND vcs.scheme_code NOT IN (
            SELECT DISTINCT scheme_code FROM t_scheme_bookmarks 
            WHERE tenant_id = $1 AND is_live = $2 AND is_active = true
          )
      `;

      const result = await this.db.query(query, [tenantId, isLive]);
      const summary = result.rows[0] || {};

      SimpleLogger.info('NavService', 'Bookmark gap summary retrieved', 'getBookmarkGapsSummary', {
        tenantId,
        totalUnbookmarked: summary.total_unbookmarked,
        customersAffected: summary.total_customers_affected
      });

      return {
        total_unbookmarked: parseInt(summary.total_unbookmarked) || 0,
        total_customers_affected: parseInt(summary.total_customers_affected) || 0,
        total_investment_at_risk: parseFloat(summary.total_investment_at_risk) || 0,
        schemes_not_in_master: parseInt(summary.schemes_not_in_master) || 0,
        schemes_not_bookmarked: parseInt(summary.schemes_not_bookmarked) || 0,
        last_checked: new Date(summary.last_checked)
      };
    } catch (error: any) {
      SimpleLogger.error('NavService', 'Failed to get bookmark gaps summary', 'getBookmarkGapsSummary', {
        tenantId, error: error.message
      }, undefined, tenantId, error.stack);

      return {
        total_unbookmarked: 0,
        total_customers_affected: 0,
        total_investment_at_risk: 0,
        schemes_not_in_master: 0,
        schemes_not_bookmarked: 0,
        last_checked: new Date()
      };
    }
  }

  /**
   * Get customer-specific unbookmarked schemes
   * Get all schemes for ONE customer from transaction history, check against bookmarks
   */
  async getCustomerBookmarkGaps(
    customerId: number
  ): Promise<CustomerUnbookmarkedScheme[]> {
    try {
      if (!customerId || customerId <= 0) {
        throw new Error('Valid customer ID is required');
      }

      // Query: Get all schemes for this customer from transactions
      // Then check which ones are NOT bookmarked
      const query = `
        SELECT 
          tt.customer_id,
          c.prefix || ' ' || c.name as customer_name,
          tt.scheme_code,
          tt.scheme_name,
          cmp.folio_no,
          COALESCE(SUM(CASE WHEN tt.portfolio_flag = true THEN tt.total_amount ELSE 0 END), 0) as total_invested,
          COUNT(DISTINCT tt.id) as transaction_count,
          MAX(tt.txn_date) as last_transaction_date,
          sd.id as scheme_id,
          CASE WHEN sd.id IS NOT NULL THEN true ELSE false END as exists_in_master
        FROM t_transaction_table tt
        LEFT JOIN t_customers c ON tt.customer_id = c.id
        LEFT JOIN t_customer_master_portfolio cmp ON tt.customer_id = cmp.customer_id 
          AND tt.scheme_code = cmp.scheme_code
        LEFT JOIN t_scheme_details sd ON tt.scheme_code = sd.scheme_code
        WHERE tt.customer_id = $1
          AND tt.is_active = true
          AND tt.scheme_code NOT IN (
            SELECT DISTINCT scheme_code FROM t_scheme_bookmarks 
            WHERE is_active = true
          )
        GROUP BY 
          tt.customer_id,
          c.prefix,
          c.name,
          tt.scheme_code, 
          tt.scheme_name,
          cmp.folio_no,
          sd.id
        ORDER BY tt.scheme_name ASC
      `;

      const result = await this.db.query(query, [customerId]);

      SimpleLogger.info('NavService', 'Customer bookmark gaps retrieved', 'getCustomerBookmarkGaps', {
        customerId,
        gapsFound: result.rows.length
      });

      // Convert date strings to Date objects and ensure we always return an array
      return (Array.isArray(result.rows) ? result.rows : []).map(row => ({
        ...row,
        last_transaction_date: row.last_transaction_date ? new Date(row.last_transaction_date) : new Date()
      }));
    } catch (error: any) {
      SimpleLogger.error('NavService', 'Failed to get customer bookmark gaps', 'getCustomerBookmarkGaps', {
        customerId, error: error.message
      }, undefined, undefined, error.stack);
      
      return [];
    }
  }

  // ==================== NAV DATA OPERATIONS ====================

  /**
   * Get NAV data for schemes with filtering and pagination
   */
  async getNavData(
    isLive: boolean,
    params: NavDataSearchParams = {}
  ): Promise<NavDataListResponse> {
    try {
      const { scheme_id, start_date, end_date, data_source, page = 1, page_size = 50 } = params;
      const offset = (page - 1) * page_size;

      let baseQuery = `
        FROM t_nav_data nd
        JOIN t_scheme_details sd ON nd.scheme_id = sd.id
        WHERE nd.is_live = $1
      `;

      const queryParams: any[] = [isLive];
      let paramIndex = 2;

      if (scheme_id) {
        baseQuery += ` AND nd.scheme_id = $${paramIndex}`;
        queryParams.push(scheme_id);
        paramIndex++;
      }

      if (start_date) {
        baseQuery += ` AND nd.nav_date >= $${paramIndex}`;
        queryParams.push(start_date);
        paramIndex++;
      }

      if (end_date) {
        baseQuery += ` AND nd.nav_date <= $${paramIndex}`;
        queryParams.push(end_date);
        paramIndex++;
      }

      if (data_source) {
        baseQuery += ` AND nd.data_source = $${paramIndex}`;
        queryParams.push(data_source);
        paramIndex++;
      }

      const countQuery = `SELECT COUNT(*) as total ${baseQuery}`;
      const countResult = await this.db.query(countQuery, queryParams);
      const total = countResult.rows.length > 0 && countResult.rows[0]?.total ? 
        parseInt(countResult.rows[0].total) : 0;

      if (total === 0) {
        return {
          nav_data: [],
          total: 0,
          page,
          page_size,
          total_pages: 0,
          has_next: false,
          has_prev: false
        };
      }

      const dataQuery = `
        SELECT 
          nd.*,
          sd.scheme_name,
          sd.amc_name
        ${baseQuery}
        ORDER BY nd.nav_date DESC 
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;

      queryParams.push(page_size, offset);
      const result = await this.db.query(dataQuery, queryParams);
      const total_pages = Math.ceil(total / page_size);

      return {
        nav_data: result.rows || [],
        total,
        page,
        page_size,
        total_pages,
        has_next: page < total_pages,
        has_prev: page > 1
      };
    } catch (error: any) {
      SimpleLogger.error('NavService', 'Failed to get NAV data', 'getNavData', {
        params, error: error.message
      }, undefined, undefined, error.stack);
      
      return {
        nav_data: [],
        total: 0,
        page: params.page || 1,
        page_size: params.page_size || 50,
        total_pages: 0,
        has_next: false,
        has_prev: false
      };
    }
  }

  /**
   * Get latest NAV for a specific scheme
   */
  async getLatestNav(
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
        WHERE nd.is_live = $1 AND nd.scheme_id = $2
        ORDER BY nd.nav_date DESC
        LIMIT 1
      `;

      const result = await this.db.query(query, [isLive, schemeId]);
      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error: any) {
      SimpleLogger.error('NavService', 'Failed to get latest NAV', 'getLatestNav', {
        schemeId, error: error.message
      }, undefined, undefined, error.stack);
      return null;
    }
  }

  /**
   * Check if NAV data exists for specific schemes on a date
   */
  async checkNavDataExists(
    isLive: boolean,
    schemeIds: number[],
    navDate: Date
  ): Promise<{ [schemeId: number]: boolean }> {
    try {
      if (!schemeIds || schemeIds.length === 0) {
        return {};
      }

      const query = `
        SELECT DISTINCT scheme_id
        FROM t_nav_data
        WHERE is_live = $1 AND scheme_id = ANY($2) AND nav_date = $3
      `;

      const result = await this.db.query(query, [isLive, schemeIds, navDate]);
      const existingSchemes = new Set((result.rows || []).map(row => row.scheme_id));

      return schemeIds.reduce((acc, schemeId) => {
        acc[schemeId] = existingSchemes.has(schemeId);
        return acc;
      }, {} as { [schemeId: number]: boolean });
    } catch (error: any) {
      SimpleLogger.error('NavService', 'Failed to check NAV data existence', 'checkNavDataExists', {
        schemeIds, navDate, error: error.message
      }, undefined, undefined, error.stack);
      
      return schemeIds.reduce((acc, schemeId) => {
        acc[schemeId] = false;
        return acc;
      }, {} as { [schemeId: number]: boolean });
    }
  }

  // ==================== STATISTICS ====================

  /**
   * Get NAV statistics for dashboard (tenant-scoped)
   */
  async getNavStatistics(tenantId: number, isLive: boolean, userId: number): Promise<NavStatistics> {
    try {
      // NOTE: t_nav_data is GLOBAL (not filtered by is_live) - NAV data is shared across environments
      // Only t_scheme_bookmarks and t_nav_download_jobs are filtered by is_live
      const statsQuery = `
        SELECT
          COALESCE((SELECT COUNT(*) FROM t_scheme_bookmarks WHERE tenant_id = $1 AND is_live = $2 AND is_active = true), 0) as total_schemes_tracked,
          COALESCE((SELECT COUNT(*) FROM t_scheme_bookmarks WHERE tenant_id = $1 AND is_live = $2 AND is_active = true AND daily_download_enabled = true), 0) as schemes_with_daily_download,
          COALESCE((
            SELECT COUNT(DISTINCT sb.scheme_id)
            FROM t_scheme_bookmarks sb
            WHERE sb.tenant_id = $1
              AND sb.is_live = $2
              AND sb.is_active = true
              AND EXISTS (
                SELECT 1 FROM t_nav_data nd
                WHERE nd.scheme_id = sb.scheme_id
                LIMIT 1
              )
          ), 0) as schemes_with_historical_data,
          COALESCE((
            SELECT COUNT(DISTINCT sb.scheme_id)
            FROM t_scheme_bookmarks sb
            WHERE sb.tenant_id = $1
              AND sb.is_live = $2
              AND sb.is_active = true
              AND EXISTS (
                SELECT 1 FROM t_nav_data nd
                WHERE nd.scheme_id = sb.scheme_id
                LIMIT 1
              )
              AND NOT EXISTS (
                SELECT 1 FROM t_nav_data nd
                WHERE nd.scheme_id = sb.scheme_id
                  AND nd.metrics_calculated_at IS NOT NULL
                LIMIT 1
              )
          ), 0) as schemes_without_calculations,
          (SELECT MAX(nav_date) FROM t_nav_data) as latest_nav_date,
          (SELECT MIN(nav_date) FROM t_nav_data) as oldest_nav_date,
          COALESCE((SELECT COUNT(*) FROM t_nav_download_jobs WHERE tenant_id = $1 AND is_live = $2 AND DATE(created_at) = CURRENT_DATE), 0) as download_jobs_today,
          COALESCE((SELECT COUNT(*) FROM t_nav_download_jobs WHERE tenant_id = $1 AND is_live = $2 AND DATE(created_at) = CURRENT_DATE AND status = 'failed'), 0) as failed_downloads_today
      `;

      const result = await this.db.query(statsQuery, [tenantId, isLive]);
      const stats = result.rows.length > 0 ? result.rows[0] : {};

      // Debug logging to trace the issue
      SimpleLogger.info('NavService', 'Statistics query result', 'getNavStatistics', {
        tenantId,
        isLive,
        userId,
        total_schemes_tracked: stats.total_schemes_tracked,
        schemes_with_historical_data: stats.schemes_with_historical_data,
        schemes_without_calculations: stats.schemes_without_calculations
      }, userId, tenantId);

      return {
        total_schemes_tracked: parseInt(stats.total_schemes_tracked) || 0,
        schemes_with_daily_download: parseInt(stats.schemes_with_daily_download) || 0,
        schemes_with_historical_data: parseInt(stats.schemes_with_historical_data) || 0,
        schemes_without_calculations: parseInt(stats.schemes_without_calculations) || 0,
        latest_nav_date: stats.latest_nav_date || new Date(),
        oldest_nav_date: stats.oldest_nav_date || new Date(),
        download_jobs_today: parseInt(stats.download_jobs_today) || 0,
        failed_downloads_today: parseInt(stats.failed_downloads_today) || 0
      };
    } catch (error: any) {
      SimpleLogger.error('NavService', 'Failed to get NAV statistics', 'getNavStatistics', {
        tenantId, userId, error: error.message
      }, userId, tenantId, error.stack);

      return {
        total_schemes_tracked: 0,
        schemes_with_daily_download: 0,
        schemes_with_historical_data: 0,
        schemes_without_calculations: 0,
        latest_nav_date: new Date(),
        oldest_nav_date: new Date(),
        download_jobs_today: 0,
        failed_downloads_today: 0
      };
    }
  }

  /**
   * Bulk insert/update NAV data (upsert by scheme_id + nav_date)
   * FIXED: Also updates t_scheme_details statistics after successful upsert
   */
  async upsertNavData(
    tenantId: number,
    isLive: boolean,
    navRecords: ParsedNavRecord[]
  ): Promise<{ inserted: number; updated: number; errors: Array<{ scheme_code: string; error: string }> }> {
    const client = await this.db.connect();
    
    try {
      await client.query('BEGIN');
      
      if (!navRecords || navRecords.length === 0) {
        throw new Error('No NAV records provided for upsert');
      }

      let insertCount = 0;
      let updateCount = 0;
      const errors: Array<{ scheme_code: string; error: string }> = [];
      const processedSchemeIds = new Set<number>();

      SimpleLogger.info('NavService', 'Starting NAV data upsert', 'upsertNavData', {
        tenantId, totalRecords: navRecords.length
      }, undefined, tenantId);

      const BATCH_SIZE = 100;
      for (let batchStart = 0; batchStart < navRecords.length; batchStart += BATCH_SIZE) {
        const batch = navRecords.slice(batchStart, Math.min(batchStart + BATCH_SIZE, navRecords.length));
        
        for (let i = 0; i < batch.length; i++) {
          const record = batch[i];
          const savepointName = `sp_${batchStart + i}`;
          
          try {
            await client.query(`SAVEPOINT ${savepointName}`);
            
            if (!record.scheme_code || !record.nav_date || record.nav_value === undefined || record.nav_value === null) {
              throw new Error('Missing required fields (scheme_code, nav_date, or nav_value)');
            }

            const schemeQuery = `
              SELECT id, scheme_code, scheme_name
              FROM t_scheme_details 
              WHERE scheme_code = $1 AND is_active = true
            `;
            const schemeResult = await client.query(schemeQuery, [record.scheme_code]);
            
            if (schemeResult.rows.length === 0) {
              throw new Error('Scheme not found in global master database');
            }

            const scheme = schemeResult.rows[0];
            processedSchemeIds.add(scheme.id);

            const upsertQuery = `
              INSERT INTO t_nav_data (
                scheme_id, scheme_code, nav_date, nav_value, 
                repurchase_price, sale_price, is_live, data_source
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
              ON CONFLICT (scheme_id, nav_date, is_live)
              DO UPDATE SET
                nav_value = EXCLUDED.nav_value,
                repurchase_price = EXCLUDED.repurchase_price,
                sale_price = EXCLUDED.sale_price,
                data_source = EXCLUDED.data_source,
                updated_at = CURRENT_TIMESTAMP
              RETURNING (xmax = 0) as was_inserted
            `;

            const result = await client.query(upsertQuery, [
              scheme.id,
              record.scheme_code,
              record.nav_date,
              record.nav_value,
              record.repurchase_price || null,
              record.sale_price || null,
              isLive,
              record.data_source || 'historical'
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
              SimpleLogger.error('NavService', 'Failed to rollback to savepoint', 'upsertNavData-rollback', {
                savepointName, error: rollbackError
              }, undefined, tenantId);
            }
            
            errors.push({ 
              scheme_code: record.scheme_code || 'UNKNOWN', 
              error: recordError.message || 'Unknown database error' 
            });
            
            if (errors.length <= 5) {
              SimpleLogger.error('NavService', 'Failed to upsert individual NAV record', 'upsertNavData-record', {
                tenantId, schemeCode: record.scheme_code, error: recordError.message
              }, undefined, tenantId, recordError.stack);
            }
          }
        }
      }

      if (insertCount === 0 && updateCount === 0) {
        await client.query('ROLLBACK');
        
        const errorSummary = errors.length > 0 
          ? `All ${navRecords.length} records failed. Sample errors: ${errors.slice(0, 3).map(e => `${e.scheme_code}: ${e.error}`).join('; ')}`
          : 'No records were inserted or updated for unknown reasons';
        
        SimpleLogger.error('NavService', 'NAV data upsert failed - no records processed', 'upsertNavData', {
          tenantId, 
          totalRecords: navRecords.length, 
          errorCount: errors.length,
          sampleErrors: errors.slice(0, 5)
        }, undefined, tenantId);
        
        throw new Error(`NAV upsert failed: ${errorSummary}`);
      }

      await client.query('COMMIT');

      SimpleLogger.info('NavService', 'NAV data upserted successfully', 'upsertNavData', {
        tenantId, 
        totalRecords: navRecords.length, 
        inserted: insertCount, 
        updated: updateCount, 
        errors: errors.length,
        successRate: `${Math.round(((insertCount + updateCount) / navRecords.length) * 100)}%`,
        affectedSchemes: processedSchemeIds.size
      }, undefined, tenantId);

      // FIXED: Update t_scheme_details statistics for all processed schemes
      for (const schemeId of processedSchemeIds) {
        try {
          await this.updateSchemeNavStatistics(schemeId, isLive);
        } catch (statsError: any) {
          SimpleLogger.error('NavService', 'Failed to update scheme statistics after upsert', 'upsertNavData-stats', {
            schemeId, error: statsError.message
          }, undefined, tenantId);
          // Don't fail the whole operation for stats update failure
        }
      }

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

  // ==================== DOWNLOAD JOB OPERATIONS ====================

  /**
   * Create download job with date range overlap detection
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

      if (request.job_type === 'historical') {
        if (!request.start_date || !request.end_date) {
          throw new Error('Historical downloads require start_date and end_date');
        }

        for (const schemeId of request.scheme_ids) {
          const overlapQuery = `
            SELECT 
              MIN(nav_date) as earliest_date,
              MAX(nav_date) as latest_date,
              COUNT(*) as record_count
            FROM t_nav_data 
            WHERE is_live = $1 
              AND scheme_id = $2
          `;
          const overlapResult = await client.query(overlapQuery, [isLive, schemeId]);
          
          if (overlapResult.rows.length > 0 && overlapResult.rows[0].record_count > 0) {
            const existingData = overlapResult.rows[0];
            const existingStart = new Date(existingData.earliest_date);
            const existingEnd = new Date(existingData.latest_date);
            const requestedStart = new Date(request.start_date);
            const requestedEnd = new Date(request.end_date);
            
            const hasOverlap = !(requestedEnd < existingStart || requestedStart > existingEnd);
            
            if (hasOverlap) {
              const schemeQuery = `SELECT scheme_name FROM t_scheme_details WHERE id = $1`;
              const schemeResult = await client.query(schemeQuery, [schemeId]);
              const schemeName = schemeResult.rows[0]?.scheme_name || 'Unknown Scheme';
              
              const error = new Error('DATE_RANGE_OVERLAP');
              (error as any).existingData = {
                scheme_id: schemeId,
                scheme_name: schemeName,
                earliest_date: existingStart.toISOString().split('T')[0],
                latest_date: existingEnd.toISOString().split('T')[0],
                record_count: parseInt(existingData.record_count)
              };
              throw error;
            }
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

      SimpleLogger.info('NavService', 'Download job created successfully', 'createDownloadJob', {
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
   * Update download job status and results
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

      SimpleLogger.info('NavService', 'Download job updated successfully', 'updateDownloadJob', {
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

      let baseQuery = `
        FROM t_nav_download_jobs ndj
        WHERE ndj.tenant_id = $1 AND ndj.is_live = $2
      `;

      const queryParams: any[] = [tenantId, isLive];
      let paramIndex = 3;

      if (status) {
        baseQuery += ` AND ndj.status = $${paramIndex}`;
        queryParams.push(status);
        paramIndex++;
      }

      if (job_type) {
        baseQuery += ` AND ndj.job_type = $${paramIndex}`;
        queryParams.push(job_type);
        paramIndex++;
      }

      if (date_from) {
        baseQuery += ` AND ndj.created_at >= $${paramIndex}`;
        queryParams.push(date_from);
        paramIndex++;
      }

      if (date_to) {
        baseQuery += ` AND ndj.created_at <= $${paramIndex}`;
        queryParams.push(date_to);
        paramIndex++;
      }

      const countQuery = `SELECT COUNT(*) as total ${baseQuery}`;
      const countResult = await this.db.query(countQuery, queryParams);
      const total = countResult.rows.length > 0 && countResult.rows[0]?.total ? 
        parseInt(countResult.rows[0].total) : 0;

      if (total === 0) {
        return {
          jobs: [],
          total: 0,
          page,
          page_size,
          total_pages: 0,
          has_next: false,
          has_prev: false
        };
      }

      const dataQuery = `
        SELECT ndj.*
        ${baseQuery}
        ORDER BY ndj.created_at DESC 
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;

      queryParams.push(page_size, offset);
      const result = await this.db.query(dataQuery, queryParams);
      const jobs = result.rows || [];

      const jobsWithSchemes: NavDownloadJobWithSchemes[] = [];
      for (const job of jobs) {
        try {
          const schemes = await this.getSchemesByIds(job.scheme_ids || []);
          jobsWithSchemes.push({
            ...job,
            schemes: schemes.map(s => ({
              scheme_id: s.id,
              scheme_code: s.scheme_code,
              scheme_name: s.scheme_name
            }))
          });
        } catch (error) {
          jobsWithSchemes.push({
            ...job,
            schemes: []
          });
        }
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
      
      return {
        jobs: [],
        total: 0,
        page: params.page || 1,
        page_size: params.page_size || 20,
        total_pages: 0,
        has_next: false,
        has_prev: false
      };
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
  private async getSchemesByIds(schemeIds: number[]): Promise<SchemeDetail[]> {
    try {
      if (!schemeIds || schemeIds.length === 0) {
        return [];
      }

      const query = `
        SELECT * FROM t_scheme_details
        WHERE id = ANY($1) AND is_active = true
        ORDER BY scheme_name
      `;

      const result = await this.db.query(query, [schemeIds]);
      return result.rows || [];
    } catch (error) {
      console.error('Error getting schemes by IDs:', error);
      return [];
    }
  }

  /**
   * Delete all NAV data for a scheme
   * Similar to market data deletion - removes all records and updates statistics
   */
  async deleteAllData(schemeId: number, isLive: boolean): Promise<number> {
    const client = await this.db.connect();

    try {
      await client.query('BEGIN');

      // Get count before deletion
      const countQuery = 'SELECT COUNT(*) as total FROM t_nav_data WHERE scheme_id = $1 AND is_live = $2';
      const countResult = await client.query(countQuery, [schemeId, isLive]);
      const recordCount = parseInt(countResult.rows[0]?.total || '0');

      if (recordCount === 0) {
        await client.query('COMMIT');
        return 0;
      }

      // Delete all NAV records for the scheme
      const deleteQuery = 'DELETE FROM t_nav_data WHERE scheme_id = $1 AND is_live = $2';
      await client.query(deleteQuery, [schemeId, isLive]);

      // Update scheme statistics to reflect no data
      const updateQuery = `
        UPDATE t_scheme_details
        SET
          total_nav_records = 0,
          earliest_nav_date = NULL,
          latest_nav_date = NULL,
          historical_data_available = false,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `;
      await client.query(updateQuery, [schemeId]);

      await client.query('COMMIT');

      SimpleLogger.info('NavService', 'All NAV data deleted for scheme', 'deleteAllData', {
        schemeId,
        isLive,
        recordsDeleted: recordCount
      });

      return recordCount;

    } catch (error: any) {
      await client.query('ROLLBACK');

      SimpleLogger.error('NavService', 'Failed to delete all NAV data', 'deleteAllData', {
        schemeId,
        isLive,
        error: error.message
      }, undefined, undefined, error.stack);

      throw error;
    } finally {
      client.release();
    }
  }

  // ==================== CRUISE CONTROL - DETAILED STATUS ====================

  /**
   * Get detailed status for all bookmarked schemes including download status, metrics status, and gaps
   * Used by Cruise Control -> NAV Downloads UI
   */
  async getDetailedSchemeStatus(tenantId: number, isLive: boolean, userId: number): Promise<{
    statistics: {
      total_schemes: number;
      download_success_today: number;
      download_failed_today: number;
      download_pending: number;
      metrics_calculated: number;
      metrics_pending: number;
      schemes_with_gaps: number;
    };
    schemes: Array<{
      id: number;
      scheme_id: number;
      scheme_code: string;
      scheme_name: string;
      amc_name: string | null;
      category: string | null;
      daily_download_enabled: boolean;

      // Download status
      download_status: 'success' | 'failed' | 'pending' | 'not_configured';
      last_download_at: string | null;
      last_download_error: string | null;

      // Data info
      earliest_date: string | null;
      latest_date: string | null;
      total_records: number;

      // Metrics status
      metrics_status: 'calculated' | 'pending' | 'partial';
      metrics_calculated_count: number;
      metrics_pending_count: number;
      last_metrics_calculated_at: string | null;

      // Gap detection
      has_gaps: boolean;
      gap_count: number;
      gaps: Array<{ start_date: string; end_date: string; missing_days: number }>;
    }>;
  }> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Get all bookmarked schemes with their NAV data stats
      const schemesQuery = `
        WITH scheme_stats AS (
          SELECT
            nd.scheme_id,
            COUNT(*) as total_records,
            MIN(nd.nav_date) as earliest_date,
            MAX(nd.nav_date) as latest_date,
            COUNT(nd.metrics_calculated_at) as metrics_calculated_count,
            COUNT(*) - COUNT(nd.metrics_calculated_at) as metrics_pending_count,
            MAX(nd.metrics_calculated_at) as last_metrics_calculated_at
          FROM t_nav_data nd
          GROUP BY nd.scheme_id
        )
        SELECT
          sb.id,
          sb.scheme_id,
          sd.scheme_code,
          sd.scheme_name,
          sd.amc_name,
          sd.category,
          sb.daily_download_enabled,
          sb.last_download_status,
          sb.last_download_at,
          sb.last_download_error,
          COALESCE(ss.total_records, 0) as total_records,
          ss.earliest_date,
          ss.latest_date,
          COALESCE(ss.metrics_calculated_count, 0) as metrics_calculated_count,
          COALESCE(ss.metrics_pending_count, 0) as metrics_pending_count,
          ss.last_metrics_calculated_at
        FROM t_scheme_bookmarks sb
        JOIN t_scheme_details sd ON sd.scheme_id = sb.scheme_id
        LEFT JOIN scheme_stats ss ON ss.scheme_id = sb.scheme_id
        WHERE sb.tenant_id = $1
          AND sb.is_live = $2
          AND sb.is_active = true
        ORDER BY sd.scheme_name
      `;

      const schemesResult = await this.db.query(schemesQuery, [tenantId, isLive]);

      // Process each scheme to determine status and detect gaps
      const schemes: any[] = [];
      let downloadSuccessToday = 0;
      let downloadFailedToday = 0;
      let downloadPending = 0;
      let metricsCalculated = 0;
      let metricsPending = 0;
      let schemesWithGaps = 0;

      for (const row of schemesResult.rows) {
        // Determine download status
        let downloadStatus: 'success' | 'failed' | 'pending' | 'not_configured' = 'pending';

        if (!row.daily_download_enabled) {
          downloadStatus = 'not_configured';
        } else if (row.last_download_status === 'success') {
          downloadStatus = 'success';
          if (row.last_download_at) {
            const downloadDate = new Date(row.last_download_at);
            downloadDate.setHours(0, 0, 0, 0);
            if (downloadDate.getTime() === today.getTime()) {
              downloadSuccessToday++;
            }
          }
        } else if (row.last_download_status === 'failed') {
          downloadStatus = 'failed';
          if (row.last_download_at) {
            const downloadDate = new Date(row.last_download_at);
            downloadDate.setHours(0, 0, 0, 0);
            if (downloadDate.getTime() === today.getTime()) {
              downloadFailedToday++;
            }
          }
        } else {
          downloadPending++;
        }

        // Determine metrics status
        let metricsStatus: 'calculated' | 'pending' | 'partial' = 'pending';
        if (row.metrics_pending_count === 0 && row.metrics_calculated_count > 0) {
          metricsStatus = 'calculated';
          metricsCalculated++;
        } else if (row.metrics_calculated_count > 0 && row.metrics_pending_count > 0) {
          metricsStatus = 'partial';
          metricsPending++;
        } else {
          metricsPending++;
        }

        // Detect gaps in data
        const gaps = await this.detectNavDataGaps(row.scheme_id, row.earliest_date, row.latest_date);
        const hasGaps = gaps.length > 0;
        if (hasGaps) {
          schemesWithGaps++;
        }

        schemes.push({
          id: row.id,
          scheme_id: row.scheme_id,
          scheme_code: row.scheme_code,
          scheme_name: row.scheme_name,
          amc_name: row.amc_name,
          category: row.category,
          daily_download_enabled: row.daily_download_enabled,
          download_status: downloadStatus,
          last_download_at: row.last_download_at,
          last_download_error: row.last_download_error,
          earliest_date: row.earliest_date,
          latest_date: row.latest_date,
          total_records: parseInt(row.total_records) || 0,
          metrics_status: metricsStatus,
          metrics_calculated_count: parseInt(row.metrics_calculated_count) || 0,
          metrics_pending_count: parseInt(row.metrics_pending_count) || 0,
          last_metrics_calculated_at: row.last_metrics_calculated_at,
          has_gaps: hasGaps,
          gap_count: gaps.length,
          gaps: gaps
        });
      }

      return {
        statistics: {
          total_schemes: schemes.length,
          download_success_today: downloadSuccessToday,
          download_failed_today: downloadFailedToday,
          download_pending: downloadPending,
          metrics_calculated: metricsCalculated,
          metrics_pending: metricsPending,
          schemes_with_gaps: schemesWithGaps
        },
        schemes
      };

    } catch (error: any) {
      SimpleLogger.error('NavService', 'Failed to get detailed scheme status', 'getDetailedSchemeStatus', {
        tenantId,
        error: error.message
      }, userId, tenantId, error.stack);
      throw error;
    }
  }

  /**
   * Detect gaps in NAV data for a scheme
   * Only checks for missing trading days (excludes weekends)
   */
  private async detectNavDataGaps(
    schemeId: number,
    earliestDate: string | null,
    latestDate: string | null
  ): Promise<Array<{ start_date: string; end_date: string; missing_days: number }>> {
    if (!earliestDate || !latestDate) {
      return [];
    }

    try {
      // Get all dates we have data for
      const datesQuery = `
        SELECT DISTINCT nav_date as date
        FROM t_nav_data
        WHERE scheme_id = $1
        ORDER BY nav_date
      `;
      const datesResult = await this.db.query(datesQuery, [schemeId]);

      if (datesResult.rows.length < 2) {
        return [];
      }

      const existingDates = new Set(
        datesResult.rows.map(r => new Date(r.date).toISOString().split('T')[0])
      );

      const gaps: Array<{ start_date: string; end_date: string; missing_days: number }> = [];
      let currentGapStart: Date | null = null;
      let missingDays = 0;

      // Iterate through date range and find gaps (only trading days)
      const start = new Date(earliestDate);
      const end = new Date(latestDate);
      const current = new Date(start);

      while (current <= end) {
        const currentStr = current.toISOString().split('T')[0];
        const dayOfWeek = current.getDay();

        // Skip weekends (Saturday = 6, Sunday = 0)
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
          if (!existingDates.has(currentStr)) {
            // Missing day
            if (!currentGapStart) {
              currentGapStart = new Date(current);
              missingDays = 1;
            } else {
              missingDays++;
            }
          } else {
            // Have data - close any open gap
            if (currentGapStart && missingDays > 0) {
              const previousDay = new Date(current);
              previousDay.setDate(previousDay.getDate() - 1);
              // Go back to last missing day (skip weekends)
              while (previousDay.getDay() === 0 || previousDay.getDay() === 6) {
                previousDay.setDate(previousDay.getDate() - 1);
              }

              gaps.push({
                start_date: currentGapStart.toISOString().split('T')[0],
                end_date: previousDay.toISOString().split('T')[0],
                missing_days: missingDays
              });
            }
            currentGapStart = null;
            missingDays = 0;
          }
        }

        current.setDate(current.getDate() + 1);
      }

      // Close any remaining gap
      if (currentGapStart && missingDays > 0) {
        gaps.push({
          start_date: currentGapStart.toISOString().split('T')[0],
          end_date: end.toISOString().split('T')[0],
          missing_days: missingDays
        });
      }

      return gaps;
    } catch (error: any) {
      SimpleLogger.error('NavService', 'Failed to detect NAV data gaps', 'detectNavDataGaps', {
        schemeId,
        error: error.message
      });
      return [];
    }
  }
}