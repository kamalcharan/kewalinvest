// backend/src/controllers/nav.controller.ts
// UPDATED: Added time-series endpoint for chart visualization

import { Request, Response } from 'express';
import { pool } from '../config/database';
import { NavService } from '../services/nav.service';
import { NavDownloadService } from '../services/navDownload.service';
import { NavSchedulerService } from '../services/navScheduler.service';
import { AmfiDataSourceService } from '../services/amfiDataSource.service';
import { SchemeService, SchemeDetail } from '../services/scheme.service';
import { SimpleLogger } from '../services/simpleLogger.service';
import { navAnalyticsService } from '../services/navAnalytics.service';
import {
  SchemeBookmarkSearchParams,
  CreateSchemeBookmarkRequest,
  UpdateSchemeBookmarkRequest,
  BookmarkNavDataParams,
  UpdateBookmarkDownloadStatus,
  NavDataSearchParams,
  NavDownloadJobSearchParams,
  N8nCallbackPayload
} from '../types/nav.types';

interface AuthenticatedRequest extends Request {
  user?: {
    user_id: number;
    tenant_id: number;
    tenant?: {
      id: number;
      tenant_code: string;
      tenant_name: string;
      is_admin: boolean;
      subscription_plan: string;
      settings: any;
    };
  };
  environment?: 'live' | 'test';
}

interface SchemeWithNavInfo extends SchemeDetail {
  is_bookmarked: boolean;
  latest_nav_value: number | null;
  latest_nav_date: Date | null;
}

export class NavController {
  private navService: NavService;
  private downloadService: NavDownloadService;
  private schedulerService: NavSchedulerService;
  private amfiService: AmfiDataSourceService;
  private schemeService: SchemeService;

  constructor() {
    this.navService = new NavService();
    this.downloadService = new NavDownloadService();
    this.schedulerService = new NavSchedulerService();
    this.amfiService = new AmfiDataSourceService();
    this.schemeService = new SchemeService();
  }

  // ==================== SCHEME SEARCH & MANAGEMENT ====================

  searchSchemes = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { user, environment } = req;
      const isLive = environment === 'live';
      
      const {
        search,
        amc_name,
        scheme_type,
        scheme_category,
        page = 1,
        page_size = 20
      } = req.query;

      if (!search || typeof search !== 'string' || search.trim().length < 2) {
        res.status(400).json({
          success: false,
          error: 'Search query must be at least 2 characters'
        });
        return;
      }

      const searchResults = await this.schemeService.getSchemes(
        user!.tenant_id,
        isLive,
        {
          page: Number(page),
          pageSize: Number(page_size),
          search: search.trim(),
          amcName: amc_name as string,
          schemeType: scheme_type ? Number(scheme_type) : undefined,
          schemeCategory: scheme_category ? Number(scheme_category) : undefined
        }
      );

      const bookmarks = await this.navService.getUserBookmarks(
        user!.tenant_id,
        isLive,
        user!.user_id,
        { page: 1, page_size: 1000 }
      );

      const bookmarkedSchemeIds = new Set(bookmarks.bookmarks.map(b => b.scheme_id));

      const schemesWithBookmarkStatus: SchemeWithNavInfo[] = searchResults.schemes.map(scheme => ({
        ...scheme,
        is_bookmarked: bookmarkedSchemeIds.has(scheme.id),
        latest_nav_value: null as number | null,
        latest_nav_date: null as Date | null
      }));

      res.json({
        success: true,
        data: {
          schemes: schemesWithBookmarkStatus,
          total: searchResults.total,
          page: searchResults.page,
          page_size: searchResults.pageSize,
          total_pages: Math.ceil(searchResults.total / searchResults.pageSize),
          has_next: searchResults.page * searchResults.pageSize < searchResults.total,
          has_prev: searchResults.page > 1
        }
      });
    } catch (error: any) {
      SimpleLogger.error('NavController', 'Failed to search schemes', 'searchSchemes', {
        tenantId: req.user?.tenant_id,
        userId: req.user?.user_id,
        searchQuery: req.query.search,
        error: error.message
      }, req.user?.user_id, req.user?.tenant_id, error.stack);

      res.status(500).json({
        success: false,
        error: error.message || 'Failed to search schemes'
      });
    }
  };

  // ==================== BOOKMARK MANAGEMENT ====================

  /**
   * Get user's bookmarked schemes (tenant-scoped, or all schemes for admin)
   */
  getBookmarks = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { user, environment } = req;
      const isLive = environment === 'live';

      // Check if admin user wants to see all schemes (not tenant-filtered)
      const isAdmin = user?.tenant?.is_admin === true;
      const showAll = isAdmin && req.query.show_all === 'true';

      const params: SchemeBookmarkSearchParams = {
        page: req.query.page ? Number(req.query.page) : 1,
        page_size: req.query.page_size ? Number(req.query.page_size) : 20,
        search: req.query.search as string,
        daily_download_only: req.query.daily_download_only as 'true' | 'false' | 'all' | undefined,
        amc_name: req.query.amc_name as string,
        has_historical_data: req.query.has_historical_data as 'true' | 'false' | 'all' | undefined,
        has_calculations: req.query.has_calculations as 'true' | 'false' | 'all' | undefined
      };

      const result = await this.navService.getUserBookmarks(
        user!.tenant_id,
        isLive,
        user!.user_id,
        params,
        showAll // Pass flag to skip tenant filtering for admin
      );

      res.json({
        success: true,
        data: result
      });
    } catch (error: any) {
      SimpleLogger.error('NavController', 'Failed to get bookmarks', 'getBookmarks', {
        tenantId: req.user?.tenant_id,
        userId: req.user?.user_id,
        params: req.query,
        error: error.message
      }, req.user?.user_id, req.user?.tenant_id, error.stack);

      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get bookmarks'
      });
    }
  };

  addBookmark = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { user, environment } = req;
      const isLive = environment === 'live';

      const request: CreateSchemeBookmarkRequest = {
        scheme_id: req.body.scheme_id,
        alias_name: req.body.alias_name,
        daily_download_enabled: req.body.daily_download_enabled,
        download_time: req.body.download_time
      };

      if (!request.scheme_id || !Number.isInteger(request.scheme_id)) {
        res.status(400).json({
          success: false,
          error: 'Valid scheme_id is required'
        });
        return;
      }

      const bookmark = await this.navService.addBookmark(
        user!.tenant_id,
        isLive,
        user!.user_id,
        request
      );

      res.status(201).json({
        success: true,
        data: bookmark,
        message: 'Scheme bookmarked successfully'
      });
    } catch (error: any) {
      SimpleLogger.error('NavController', 'Failed to add bookmark', 'addBookmark', {
        tenantId: req.user?.tenant_id,
        userId: req.user?.user_id,
        request: req.body,
        error: error.message
      }, req.user?.user_id, req.user?.tenant_id, error.stack);

      if (error.message === 'SCHEME_NOT_FOUND') {
        res.status(404).json({
          success: false,
          error: 'Scheme not found'
        });
      } else if (error.message === 'SCHEME_ALREADY_BOOKMARKED') {
        res.status(409).json({
          success: false,
          error: 'Scheme is already bookmarked'
        });
      } else {
        res.status(500).json({
          success: false,
          error: error.message || 'Failed to add bookmark'
        });
      }
    }
  };

  updateBookmark = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { user, environment } = req;
      const isLive = environment === 'live';
      const bookmarkId = parseInt(req.params.id);

      if (isNaN(bookmarkId)) {
        res.status(400).json({
          success: false,
          error: 'Invalid bookmark ID'
        });
        return;
      }

      const updates: UpdateSchemeBookmarkRequest = {
        alias_name: req.body.alias_name,
        daily_download_enabled: req.body.daily_download_enabled,
        download_time: req.body.download_time,
        historical_download_completed: req.body.historical_download_completed
      };

      const bookmark = await this.navService.updateBookmark(
        user!.tenant_id,
        isLive,
        user!.user_id,
        bookmarkId,
        updates
      );

      res.json({
        success: true,
        data: bookmark,
        message: 'Bookmark updated successfully'
      });
    } catch (error: any) {
      SimpleLogger.error('NavController', 'Failed to update bookmark', 'updateBookmark', {
        tenantId: req.user?.tenant_id,
        userId: req.user?.user_id,
        bookmarkId: req.params.id,
        updates: req.body,
        error: error.message
      }, req.user?.user_id, req.user?.tenant_id, error.stack);

      if (error.message === 'BOOKMARK_NOT_FOUND') {
        res.status(404).json({
          success: false,
          error: 'Bookmark not found'
        });
      } else {
        res.status(500).json({
          success: false,
          error: error.message || 'Failed to update bookmark'
        });
      }
    }
  };

  removeBookmark = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { user, environment } = req;
      const isLive = environment === 'live';
      const bookmarkId = parseInt(req.params.id);

      if (isNaN(bookmarkId)) {
        res.status(400).json({
          success: false,
          error: 'Invalid bookmark ID'
        });
        return;
      }

      await this.navService.removeBookmark(
        user!.tenant_id,
        isLive,
        user!.user_id,
        bookmarkId
      );

      res.json({
        success: true,
        message: 'Bookmark removed successfully'
      });
    } catch (error: any) {
      SimpleLogger.error('NavController', 'Failed to remove bookmark', 'removeBookmark', {
        tenantId: req.user?.tenant_id,
        userId: req.user?.user_id,
        bookmarkId: req.params.id,
        error: error.message
      }, req.user?.user_id, req.user?.tenant_id, error.stack);

      if (error.message === 'BOOKMARK_NOT_FOUND') {
        res.status(404).json({
          success: false,
          error: 'Bookmark not found'
        });
      } else {
        res.status(500).json({
          success: false,
          error: error.message || 'Failed to remove bookmark'
        });
      }
    }
  };

  getBookmarkNavData = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { user, environment } = req;
      const isLive = environment === 'live';
      const bookmarkId = parseInt(req.params.id);

      if (isNaN(bookmarkId)) {
        res.status(400).json({
          success: false,
          error: 'Invalid bookmark ID'
        });
        return;
      }

      const params: BookmarkNavDataParams = {
        bookmark_id: bookmarkId,
        start_date: req.query.start_date as string,
        end_date: req.query.end_date as string,
        page: req.query.page ? Number(req.query.page) : 1,
        page_size: req.query.page_size ? Number(req.query.page_size) : 50,
        granularity: (req.query.granularity as 'daily' | 'monthly') || 'daily'
      };

      if (params.start_date && params.end_date) {
        const startDate = new Date(params.start_date);
        const endDate = new Date(params.end_date);
        
        if (startDate > endDate) {
          res.status(400).json({
            success: false,
            error: 'Start date cannot be after end date'
          });
          return;
        }
      }

      const result = await this.navService.getBookmarkNavData(
        user!.tenant_id,
        isLive,
        user!.user_id,
        params
      );

      res.json({
        success: true,
        data: result
      });
    } catch (error: any) {
      SimpleLogger.error('NavController', 'Failed to get bookmark NAV data', 'getBookmarkNavData', {
        tenantId: req.user?.tenant_id,
        userId: req.user?.user_id,
        bookmarkId: req.params.id,
        error: error.message
      }, req.user?.user_id, req.user?.tenant_id, error.stack);

      if (error.message === 'Bookmark not found or access denied') {
        res.status(404).json({
          success: false,
          error: 'Bookmark not found'
        });
      } else {
        res.status(500).json({
          success: false,
          error: error.message || 'Failed to get bookmark NAV data'
        });
      }
    }
  };

  updateBookmarkDownloadStatus = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { user, environment } = req;
      const isLive = environment === 'live';
      const bookmarkId = parseInt(req.params.id);

      if (isNaN(bookmarkId)) {
        res.status(400).json({
          success: false,
          error: 'Invalid bookmark ID'
        });
        return;
      }

      const bookmarks = await this.navService.getUserBookmarks(
        user!.tenant_id,
        isLive,
        user!.user_id,
        { page: 1, page_size: 1000 }
      );

      const bookmark = bookmarks.bookmarks.find(b => b.id === bookmarkId);
      if (!bookmark) {
        res.status(404).json({
          success: false,
          error: 'Bookmark not found'
        });
        return;
      }

      const status: UpdateBookmarkDownloadStatus = {
        last_download_status: req.body.last_download_status,
        last_download_error: req.body.last_download_error,
        last_download_attempt: req.body.last_download_attempt ? new Date(req.body.last_download_attempt) : new Date()
      };

      await this.navService.updateBookmarkDownloadStatus(
        user!.tenant_id,
        isLive,
        user!.user_id,
        bookmark.scheme_id,
        status
      );

      res.json({
        success: true,
        message: 'Bookmark download status updated'
      });
    } catch (error: any) {
      SimpleLogger.error('NavController', 'Failed to update bookmark download status', 'updateBookmarkDownloadStatus', {
        tenantId: req.user?.tenant_id,
        userId: req.user?.user_id,
        bookmarkId: req.params.id,
        error: error.message
      }, req.user?.user_id, req.user?.tenant_id, error.stack);

      res.status(500).json({
        success: false,
        error: error.message || 'Failed to update download status'
      });
    }
  };

  getBookmarkStats = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { user, environment } = req;
      const isLive = environment === 'live';
      const bookmarkId = parseInt(req.params.id);

      if (isNaN(bookmarkId)) {
        res.status(400).json({
          success: false,
          error: 'Invalid bookmark ID'
        });
        return;
      }

      const bookmarks = await this.navService.getUserBookmarks(
        user!.tenant_id,
        isLive,
        user!.user_id,
        { page: 1, page_size: 1000 }
      );

      const bookmark = bookmarks.bookmarks.find(b => b.id === bookmarkId);
      if (!bookmark) {
        res.status(404).json({
          success: false,
          error: 'Bookmark not found'
        });
        return;
      }

      const stats = {
        bookmark_id: bookmark.id,
        scheme_name: bookmark.scheme_name,
        scheme_code: bookmark.scheme_code,
        amc_name: bookmark.amc_name,
        nav_records_count: bookmark.nav_records_count || 0,
        earliest_nav_date: bookmark.earliest_nav_date,
        latest_nav_date: bookmark.latest_nav_date,
        latest_nav_value: bookmark.latest_nav_value,
        daily_download_enabled: bookmark.daily_download_enabled,
        historical_download_completed: bookmark.historical_download_completed,
        last_download_status: bookmark.last_download_status,
        last_download_error: bookmark.last_download_error,
        last_download_attempt: bookmark.last_download_attempt,
        date_range_days: bookmark.earliest_nav_date && bookmark.latest_nav_date ? 
          Math.ceil((new Date(bookmark.latest_nav_date).getTime() - new Date(bookmark.earliest_nav_date).getTime()) / (1000 * 60 * 60 * 24)) : 0
      };

      res.json({
        success: true,
        data: stats
      });
    } catch (error: any) {
      SimpleLogger.error('NavController', 'Failed to get bookmark stats', 'getBookmarkStats', {
        tenantId: req.user?.tenant_id,
        userId: req.user?.user_id,
        bookmarkId: req.params.id,
        error: error.message
      }, req.user?.user_id, req.user?.tenant_id, error.stack);

      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get bookmark statistics'
      });
    }
  };

  // ==================== NAV DATA OPERATIONS ====================

  getNavData = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { user, environment } = req;
      const isLive = environment === 'live';

      const params: NavDataSearchParams = {
        scheme_id: req.query.scheme_id ? Number(req.query.scheme_id) : undefined,
        start_date: req.query.start_date ? new Date(req.query.start_date as string) : undefined,
        end_date: req.query.end_date ? new Date(req.query.end_date as string) : undefined,
        data_source: req.query.data_source as any,
        page: req.query.page ? Number(req.query.page) : 1,
        page_size: req.query.page_size ? Number(req.query.page_size) : 50
      };

      if (params.start_date && params.end_date && params.start_date > params.end_date) {
        res.status(400).json({
          success: false,
          error: 'Start date cannot be after end date'
        });
        return;
      }

      const result = await this.navService.getNavData(
        isLive,
        params
      );

      res.json({
        success: true,
        data: result
      });
    } catch (error: any) {
      SimpleLogger.error('NavController', 'Failed to get NAV data', 'getNavData', {
        tenantId: req.user?.tenant_id,
        params: req.query,
        error: error.message
      }, req.user?.user_id, req.user?.tenant_id, error.stack);

      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get NAV data'
      });
    }
  };

  getLatestNav = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { user, environment } = req;
      const isLive = environment === 'live';
      const schemeId = parseInt(req.params.id);

      if (isNaN(schemeId)) {
        res.status(400).json({
          success: false,
          error: 'Invalid scheme ID'
        });
        return;
      }

      const latestNav = await this.navService.getLatestNav(
        isLive,
        schemeId
      );

      if (!latestNav) {
        res.status(404).json({
          success: false,
          error: 'No NAV data found for this scheme'
        });
        return;
      }

      res.json({
        success: true,
        data: latestNav
      });
    } catch (error: any) {
      SimpleLogger.error('NavController', 'Failed to get latest NAV', 'getLatestNav', {
        tenantId: req.user?.tenant_id,
        schemeId: req.params.id,
        error: error.message
      }, req.user?.user_id, req.user?.tenant_id, error.stack);

      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get latest NAV'
      });
    }
  };

  /**
   * GET /api/nav/timeseries/:schemeId
   * Get NAV time series data for chart visualization
   * 
   * Path params:
   *   - schemeId: Scheme ID (integer)
   * 
   * Query params:
   *   - start_date: Start date (YYYY-MM-DD), optional
   *   - end_date: End date (YYYY-MM-DD), optional
   *   - granularity: 'daily' | 'weekly' | 'monthly', default: 'daily'
   *   - include_metrics: Include calculated metrics, default: true
   * 
   * Response: 200 with time series data
   */
  getNavTimeSeries = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const startTime = Date.now();
    
    try {
      // Extract and validate scheme ID
      const schemeId = parseInt(req.params.schemeId);
      
      if (isNaN(schemeId) || schemeId <= 0) {
        res.status(400).json({
          success: false,
          error: 'Invalid scheme ID. Must be a positive integer.'
        });
        return;
      }

      // Extract query parameters
      const {
        start_date,
        end_date,
        granularity = 'daily',
        include_metrics = 'true'
      } = req.query;

      // Validate granularity
      const validGranularities = ['daily', 'weekly', 'monthly'];
      if (granularity && !validGranularities.includes(granularity as string)) {
        res.status(400).json({
          success: false,
          error: `Invalid granularity. Must be one of: ${validGranularities.join(', ')}`
        });
        return;
      }

      // Get environment
      const isLive = req.environment === 'live';

      // Build params object
      const params = {
        start_date: start_date as string | undefined,
        end_date: end_date as string | undefined,
        granularity: granularity as 'daily' | 'weekly' | 'monthly',
        include_metrics: include_metrics !== 'false' // defaults to true unless explicitly set to 'false'
      };

      SimpleLogger.info(
        'NavController',
        'Time series request received',
        'getNavTimeSeries',
        {
          schemeId,
          isLive,
          params,
          userId: req.user?.user_id,
          tenantId: req.user?.tenant_id
        },
        req.user?.user_id,
        req.user?.tenant_id
      );

      // Call analytics service
      const result = await navAnalyticsService.getNavTimeSeries(
        schemeId,
        isLive,
        params
      );

      const executionTime = Date.now() - startTime;

      SimpleLogger.info(
        'NavController',
        'Time series data retrieved successfully',
        'getNavTimeSeries',
        {
          schemeId,
          granularity: result.granularity,
          totalPoints: result.total_points,
          metricsCoverage: result.metrics_coverage.coverage_percentage.toFixed(1) + '%',
          executionTimeMs: executionTime,
          userId: req.user?.user_id,
          tenantId: req.user?.tenant_id
        },
        req.user?.user_id,
        req.user?.tenant_id
      );

      // Return success response
      res.status(200).json({
        success: true,
        data: result,
        execution_time_ms: executionTime
      });

    } catch (error: any) {
      const executionTime = Date.now() - startTime;

      SimpleLogger.error(
        'NavController',
        'Failed to get time series data',
        'getNavTimeSeries',
        {
          schemeId: req.params.schemeId,
          error: error.message,
          executionTimeMs: executionTime,
          userId: req.user?.user_id,
          tenantId: req.user?.tenant_id
        },
        req.user?.user_id,
        req.user?.tenant_id,
        error.stack
      );

      // Handle specific error types
      if (error.message.includes('Scheme not found')) {
        res.status(404).json({
          success: false,
          error: error.message,
          execution_time_ms: executionTime
        });
        return;
      }

      if (error.message.includes('Invalid') || error.message.includes('format')) {
        res.status(400).json({
          success: false,
          error: error.message,
          execution_time_ms: executionTime
        });
        return;
      }

      // Generic error response
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve time series data',
        message: error.message,
        execution_time_ms: executionTime
      });
    }
  };

  // ==================== DOWNLOAD OPERATIONS ====================

  triggerDailyDownload = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { user, environment } = req;
      const isLive = environment === 'live';

      const result = await this.downloadService.triggerDailyDownload(
        user!.tenant_id,
        isLive,
        user!.user_id
      );

      const statusCode = result.alreadyExists ? 200 : 202;
      
      res.status(statusCode).json({
        success: true,
        data: result,
        message: result.message
      });
    } catch (error: any) {
      SimpleLogger.error('NavController', 'Failed to trigger daily download', 'triggerDailyDownload', {
        tenantId: req.user?.tenant_id,
        userId: req.user?.user_id,
        error: error.message
      }, req.user?.user_id, req.user?.tenant_id, error.stack);

      res.status(500).json({
        success: false,
        error: error.message || 'Failed to trigger daily download'
      });
    }
  };

  /**
   * Download NAV for a single scheme (latest data from AMFI)
   * Used by "Update NAV" button in Cruise Control
   *
   * IMPORTANT: NAV data is GLOBAL - if another tenant already downloaded today's data,
   * we return success without hitting AMFI again
   */
  downloadSchemeNav = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { user, environment } = req;
      const isLive = environment === 'live';
      const { schemeCode } = req.params;

      if (!schemeCode) {
        res.status(400).json({
          success: false,
          error: 'scheme_code is required'
        });
        return;
      }

      // Get scheme details
      const schemeQuery = `
        SELECT id, scheme_name FROM t_scheme_details WHERE scheme_code = $1
      `;
      const schemeResult = await pool.query(schemeQuery, [schemeCode]);

      if (schemeResult.rows.length === 0) {
        res.status(404).json({
          success: false,
          error: `Scheme not found: ${schemeCode}`
        });
        return;
      }

      const schemeId = schemeResult.rows[0].id;
      const schemeName = schemeResult.rows[0].scheme_name;

      // GLOBAL CHECK: Check if today's NAV data already exists (downloaded by any tenant)
      const today = new Date().toISOString().split('T')[0];
      const existingNavQuery = `
        SELECT nav_date, nav_value
        FROM t_nav_data
        WHERE scheme_id = $1 AND nav_date >= $2::date
        ORDER BY nav_date DESC
        LIMIT 1
      `;
      const existingNav = await pool.query(existingNavQuery, [schemeId, today]);

      if (existingNav.rows.length > 0) {
        // Today's NAV already exists (downloaded by another tenant) - return success
        const existingData = existingNav.rows[0];

        SimpleLogger.info('NavController', 'NAV already available (global)', 'downloadSchemeNav', {
          schemeCode,
          schemeName,
          nav_date: existingData.nav_date,
          source: 'cache'
        }, user!.user_id, user!.tenant_id);

        res.json({
          success: true,
          data: {
            scheme_code: schemeCode,
            scheme_name: schemeName,
            records_found: 1,
            records_inserted: 0,
            records_updated: 0,
            nav_date: existingData.nav_date,
            nav_value: existingData.nav_value,
            source: 'already_available'
          },
          message: `NAV already up to date for ${schemeName}`
        });
        return;
      }

      // NAV not available - download from MFAPI (supports backfill)
      // Get the last known NAV date to determine the date range for download
      const lastNavQuery = `
        SELECT MAX(nav_date) as last_date
        FROM t_nav_data
        WHERE scheme_id = $1
      `;
      const lastNavResult = await pool.query(lastNavQuery, [schemeId]);
      const lastKnownDate = lastNavResult.rows[0]?.last_date;

      // Calculate date range: from last known date (or 7 days ago) to today
      const endDate = new Date();
      let startDate: Date;
      if (lastKnownDate) {
        // Start from the day after last known date
        startDate = new Date(lastKnownDate);
        startDate.setDate(startDate.getDate() + 1);
      } else {
        // If no data exists, download last 7 days
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 7);
      }

      // If startDate is in the future (all data up to date), return success
      if (startDate > endDate) {
        res.json({
          success: true,
          data: {
            scheme_code: schemeCode,
            scheme_name: schemeName,
            records_found: 0,
            records_inserted: 0,
            records_updated: 0,
            message: 'NAV data already up to date'
          }
        });
        return;
      }

      SimpleLogger.info('NavController', 'Downloading NAV from MFAPI', 'downloadSchemeNav', {
        schemeCode,
        schemeName,
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        lastKnownDate: lastKnownDate || 'none'
      }, user!.user_id, user!.tenant_id);

      const mfapiResponse = await this.amfiService.downloadFromMFAPI(
        schemeCode,
        startDate,
        endDate,
        { requestId: `single_${schemeCode}_${Date.now()}` }
      );

      if (!mfapiResponse.success || !mfapiResponse.data) {
        throw new Error(mfapiResponse.error || 'Failed to download NAV from MFAPI');
      }

      const schemeNavData = mfapiResponse.data;

      if (schemeNavData.length === 0) {
        res.status(200).json({
          success: true,
          data: {
            scheme_code: schemeCode,
            scheme_name: schemeName,
            records_found: 0,
            message: 'No new NAV data available for this scheme'
          }
        });
        return;
      }

      // Upsert NAV data (globally available for all tenants)
      const upsertResult = await this.navService.upsertNavData(
        user!.tenant_id,
        isLive,
        schemeNavData
      );

      // Update scheme download status for statistics tracking
      await this.navService.updateSchemeNavStatus(schemeId, {
        last_download_status: 'success',
        last_download_date: new Date()
      });

      SimpleLogger.info('NavController', 'Single scheme NAV download completed', 'downloadSchemeNav', {
        schemeCode,
        schemeName,
        recordsFound: schemeNavData.length,
        inserted: upsertResult.inserted,
        updated: upsertResult.updated,
        source: 'mfapi',
        dateRange: `${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`
      }, user!.user_id, user!.tenant_id);

      res.json({
        success: true,
        data: {
          scheme_code: schemeCode,
          scheme_name: schemeName,
          records_found: schemeNavData.length,
          records_inserted: upsertResult.inserted,
          records_updated: upsertResult.updated,
          nav_date: schemeNavData[schemeNavData.length - 1]?.nav_date,
          nav_value: schemeNavData[schemeNavData.length - 1]?.nav_value,
          source: 'mfapi',
          backfilled_days: schemeNavData.length
        },
        message: `NAV updated for ${schemeName} (${schemeNavData.length} days)`
      });

    } catch (error: any) {
      // Update scheme download status on failure
      try {
        const schemeCode = req.params.schemeCode;
        const schemeQuery = `SELECT id FROM t_scheme_details WHERE scheme_code = $1`;
        const schemeResult = await pool.query(schemeQuery, [schemeCode]);
        if (schemeResult.rows.length > 0) {
          await this.navService.updateSchemeNavStatus(schemeResult.rows[0].id, {
            last_download_status: 'failed',
            last_download_error: error.message,
            last_download_date: new Date()
          });
        }
      } catch (statusError) {
        // Ignore status update errors
      }

      SimpleLogger.error('NavController', 'Failed to download scheme NAV', 'downloadSchemeNav', {
        schemeCode: req.params.schemeCode,
        error: error.message
      }, req.user?.user_id, req.user?.tenant_id, error.stack);

      res.status(500).json({
        success: false,
        error: error.message || 'Failed to trigger daily download'
      });
    }
  };

  /**
   * UPDATED: Trigger historical download with date range overlap detection
   */
  triggerHistoricalDownload = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { user, environment } = req;
      const isLive = environment === 'live';

      const { scheme_ids, start_date, end_date } = req.body;

      if (!scheme_ids || !Array.isArray(scheme_ids) || scheme_ids.length === 0) {
        res.status(400).json({
          success: false,
          error: 'scheme_ids array is required and cannot be empty'
        });
        return;
      }

      if (!start_date || !end_date) {
        res.status(400).json({
          success: false,
          error: 'start_date and end_date are required for historical downloads'
        });
        return;
      }

      const startDate = new Date(start_date);
      const endDate = new Date(end_date);

      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        res.status(400).json({
          success: false,
          error: 'Invalid date format'
        });
        return;
      }

      const result = await this.downloadService.triggerHistoricalDownload(
        user!.tenant_id,
        isLive,
        user!.user_id,
        {
          scheme_ids: scheme_ids.map(Number),
          start_date: startDate,
          end_date: endDate
        }
      );

      try {
        for (const schemeId of scheme_ids) {
          await this.navService.updateBookmarkDownloadStatus(
            user!.tenant_id,
            isLive,
            user!.user_id,
            schemeId,
            {
              last_download_status: 'pending',
              last_download_attempt: new Date()
            }
          );
        }
      } catch (statusError) {
        SimpleLogger.error('NavController', 'Failed to update bookmark status during historical download', 'triggerHistoricalDownload', {
          tenantId: user!.tenant_id,
          userId: user!.user_id,
          error: statusError
        });
      }

      res.status(202).json({
        success: true,
        data: {
          job_id: result.jobId,
          message: result.message
        }
      });
    } catch (error: any) {
      SimpleLogger.error('NavController', 'Failed to trigger historical download', 'triggerHistoricalDownload', {
        tenantId: req.user?.tenant_id,
        userId: req.user?.user_id,
        request: req.body,
        error: error.message
      }, req.user?.user_id, req.user?.tenant_id, error.stack);

      // UPDATED: Handle DATE_RANGE_OVERLAP error with detailed information
      if (error.message === 'DATE_RANGE_OVERLAP') {
        const existingData = (error as any).existingData;
        res.status(409).json({
          success: false,
          error: `Date range overlaps with existing data for ${existingData.scheme_name}. Existing data: ${existingData.earliest_date} to ${existingData.latest_date} (${existingData.record_count} records). Please adjust your date range to avoid overlap.`,
          existing_data: existingData
        });
      } else if (error.message === 'HISTORICAL_DOWNLOAD_COMPLETED') {
        res.status(409).json({
          success: false,
          error: 'Historical download already completed for one or more schemes'
        });
      } else {
        res.status(500).json({
          success: false,
          error: error.message || 'Failed to trigger historical download'
        });
      }
    }
  };

  getDownloadProgress = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const jobId = parseInt(req.params.jobId);

      if (isNaN(jobId)) {
        res.status(400).json({
          success: false,
          error: 'Invalid job ID'
        });
        return;
      }

      const progress = await this.downloadService.getDownloadProgress(jobId);

      if (!progress) {
        res.status(404).json({
          success: false,
          error: 'Download progress not found'
        });
        return;
      }

      res.json({
        success: true,
        data: progress
      });
    } catch (error: any) {
      SimpleLogger.error('NavController', 'Failed to get download progress', 'getDownloadProgress', {
        tenantId: req.user?.tenant_id,
        jobId: req.params.jobId,
        error: error.message
      }, req.user?.user_id, req.user?.tenant_id, error.stack);

      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get download progress'
      });
    }
  };

  getDownloadJobs = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { user, environment } = req;
      const isLive = environment === 'live';

      const params: NavDownloadJobSearchParams = {
        status: req.query.status as any,
        job_type: req.query.job_type as any,
        page: req.query.page ? Number(req.query.page) : 1,
        page_size: req.query.page_size ? Number(req.query.page_size) : 20,
        date_from: req.query.date_from ? new Date(req.query.date_from as string) : undefined,
        date_to: req.query.date_to ? new Date(req.query.date_to as string) : undefined
      };

      const result = await this.navService.getDownloadJobs(
        user!.tenant_id,
        isLive,
        params
      );

      res.json({
        success: true,
        data: result
      });
    } catch (error: any) {
      SimpleLogger.error('NavController', 'Failed to get download jobs', 'getDownloadJobs', {
        tenantId: req.user?.tenant_id,
        params: req.query,
        error: error.message
      }, req.user?.user_id, req.user?.tenant_id, error.stack);

      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get download jobs'
      });
    }
  };

  cancelDownloadJob = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { user, environment } = req;
      const isLive = environment === 'live';
      const jobId = parseInt(req.params.jobId);

      if (isNaN(jobId)) {
        res.status(400).json({
          success: false,
          error: 'Invalid job ID'
        });
        return;
      }

      await this.downloadService.cancelDownload(
        user!.tenant_id,
        isLive,
        jobId,
        user!.user_id
      );

      res.json({
        success: true,
        message: 'Download cancelled successfully'
      });
    } catch (error: any) {
      SimpleLogger.error('NavController', 'Failed to cancel download', 'cancelDownloadJob', {
        tenantId: req.user?.tenant_id,
        userId: req.user?.user_id,
        jobId: req.params.jobId,
        error: error.message
      }, req.user?.user_id, req.user?.tenant_id, error.stack);

      res.status(500).json({
        success: false,
        error: error.message || 'Failed to cancel download'
      });
    }
  };

  handleN8nCallback = async (req: Request, res: Response): Promise<void> => {
    try {
      const payload: N8nCallbackPayload = req.body;

      if (!payload.job_id || !payload.status) {
        res.status(400).json({
          success: false,
          error: 'Invalid callback payload'
        });
        return;
      }

      await this.downloadService.handleN8nCallback(payload);

      res.json({
        success: true,
        message: 'Callback processed successfully'
      });
    } catch (error: any) {
      SimpleLogger.error('NavController', 'Failed to handle N8N callback', 'handleN8nCallback', {
        payload: req.body,
        error: error.message
      }, undefined, undefined, error.stack);

      res.status(500).json({
        success: false,
        error: error.message || 'Failed to process callback'
      });
    }
  };

  getNavStatistics = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { user, environment } = req;
      const isLive = environment === 'live';

      const statistics = await this.navService.getNavStatistics(
        user!.tenant_id,
        isLive,
        user!.user_id
      );

      res.json({
        success: true,
        data: statistics
      });
    } catch (error: any) {
      SimpleLogger.error('NavController', 'Failed to get NAV statistics', 'getNavStatistics', {
        tenantId: req.user?.tenant_id,
        userId: req.user?.user_id,
        error: error.message
      }, req.user?.user_id, req.user?.tenant_id, error.stack);

      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get statistics'
      });
    }
  };

  /**
   * GET /api/nav/detailed-status
   * Get detailed status for all bookmarked schemes including download, metrics, and gaps
   * Used by Cruise Control -> NAV Downloads UI
   */
  getDetailedStatus = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { user, environment } = req;
      const isLive = environment === 'live';

      const result = await this.navService.getDetailedSchemeStatus(
        user!.tenant_id,
        isLive,
        user!.user_id
      );

      res.json({
        success: true,
        data: result
      });
    } catch (error: any) {
      SimpleLogger.error('NavController', 'Failed to get detailed status', 'getDetailedStatus', {
        tenantId: req.user?.tenant_id,
        userId: req.user?.user_id,
        error: error.message
      }, req.user?.user_id, req.user?.tenant_id, error.stack);

      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get detailed status'
      });
    }
  };

  getActiveDownloads = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const activeDownloads = await this.downloadService.getActiveDownloads();

      res.json({
        success: true,
        data: {
          active_downloads: activeDownloads,
          total_active: activeDownloads.length
        }
      });
    } catch (error: any) {
      SimpleLogger.error('NavController', 'Failed to get active downloads', 'getActiveDownloads', {
        tenantId: req.user?.tenant_id,
        error: error.message
      }, req.user?.user_id, req.user?.tenant_id, error.stack);

      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get active downloads'
      });
    }
  };

  checkTodayNavData = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { user, environment } = req;
      const isLive = environment === 'live';

      const bookmarks = await this.navService.getUserBookmarks(
        user!.tenant_id,
        isLive,
        user!.user_id,
        { page: 1, page_size: 1000 }
      );

      if (bookmarks.bookmarks.length === 0) {
        res.json({
          success: true,
          data: {
            total_bookmarked_schemes: 0,
            schemes_with_today_data: 0,
            schemes_missing_data: 0,
            data_available: false,
            message: 'No schemes bookmarked'
          }
        });
        return;
      }

      const schemeIds = bookmarks.bookmarks.map(b => b.scheme_id);
      const today = new Date();
      
      const existingData = await this.navService.checkNavDataExists(
        isLive,
        schemeIds,
        today
      );

      const schemesWithData = Object.values(existingData).filter(exists => exists).length;
      const schemesMissingData = schemeIds.length - schemesWithData;

      res.json({
        success: true,
        data: {
          total_bookmarked_schemes: schemeIds.length,
          schemes_with_today_data: schemesWithData,
          schemes_missing_data: schemesMissingData,
          data_available: schemesMissingData === 0,
          message: schemesMissingData === 0 
            ? 'All schemes have today\'s NAV data'
            : `${schemesMissingData} schemes missing today's data`
        }
      });
    } catch (error: any) {
      SimpleLogger.error('NavController', 'Failed to check today NAV data', 'checkTodayNavData', {
        tenantId: req.user?.tenant_id,
        userId: req.user?.user_id,
        error: error.message
      }, req.user?.user_id, req.user?.tenant_id, error.stack);

      res.status(500).json({
        success: false,
        error: error.message || 'Failed to check today\'s data'
      });
    }
  };

  // ==================== SCHEDULER MANAGEMENT ====================

  getSchedulerConfig = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { user, environment } = req;
      const isLive = environment === 'live';

      const config = await this.schedulerService.getSchedulerConfig(
        user!.tenant_id,
        isLive,
        user!.user_id
      );

      res.json({
        success: true,
        data: config
      });
    } catch (error: any) {
      SimpleLogger.error('NavController', 'Failed to get scheduler config', 'getSchedulerConfig', {
        tenantId: req.user?.tenant_id,
        userId: req.user?.user_id,
        error: error.message
      }, req.user?.user_id, req.user?.tenant_id, error.stack);

      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get scheduler configuration'
      });
    }
  };

  saveSchedulerConfig = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { user, environment } = req;
      const isLive = environment === 'live';

      const { schedule_type, download_time, cron_expression, is_enabled } = req.body;

      if (!schedule_type || !download_time || is_enabled === undefined) {
        res.status(400).json({
          success: false,
          error: 'schedule_type, download_time, and is_enabled are required'
        });
        return;
      }

      if (!/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(download_time)) {
        res.status(400).json({
          success: false,
          error: 'Invalid time format. Use HH:MM format (24-hour)'
        });
        return;
      }

      let finalCronExpression = cron_expression;
      if (!finalCronExpression) {
        finalCronExpression = this.generateCronExpression(schedule_type, download_time);
      }

      const config = {
        tenant_id: user!.tenant_id,
        user_id: user!.user_id,
        is_live: isLive,
        schedule_type,
        cron_expression: finalCronExpression,
        download_time,
        is_enabled,
        execution_count: 0, 
        failure_count: 0 
      };

      const savedConfig = await this.schedulerService.saveSchedulerConfig(config);

      res.json({
        success: true,
        data: savedConfig,
        message: 'Scheduler configuration saved successfully'
      });
    } catch (error: any) {
      SimpleLogger.error('NavController', 'Failed to save scheduler config', 'saveSchedulerConfig', {
        tenantId: req.user?.tenant_id,
        userId: req.user?.user_id,
        body: req.body,
        error: error.message
      }, req.user?.user_id, req.user?.tenant_id, error.stack);

      res.status(500).json({
        success: false,
        error: error.message || 'Failed to save scheduler configuration'
      });
    }
  };

  updateSchedulerConfig = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { user, environment } = req;
      const isLive = environment === 'live';
      const configId = parseInt(req.params.id);

      if (isNaN(configId)) {
        res.status(400).json({
          success: false,
          error: 'Invalid configuration ID'
        });
        return;
      }

      const { schedule_type, download_time, cron_expression, is_enabled } = req.body;

      const existingConfig = await this.schedulerService.getSchedulerConfig(
        user!.tenant_id,
        isLive,
        user!.user_id
      );

      if (!existingConfig || existingConfig.id !== configId) {
        res.status(404).json({
          success: false,
          error: 'Scheduler configuration not found'
        });
        return;
      }

      let finalCronExpression = cron_expression;
      if (schedule_type && download_time && !cron_expression) {
        finalCronExpression = this.generateCronExpression(schedule_type, download_time);
      }

      const updatedConfig = {
        ...existingConfig,
        ...(schedule_type && { schedule_type }),
        ...(download_time && { download_time }),
        ...(finalCronExpression && { cron_expression: finalCronExpression }),
        ...(is_enabled !== undefined && { is_enabled })
      };

      const savedConfig = await this.schedulerService.saveSchedulerConfig(updatedConfig);

      res.json({
        success: true,
        data: savedConfig,
        message: 'Scheduler configuration updated successfully'
      });
    } catch (error: any) {
      SimpleLogger.error('NavController', 'Failed to update scheduler config', 'updateSchedulerConfig', {
        tenantId: req.user?.tenant_id,
        userId: req.user?.user_id,
        configId: req.params.id,
        body: req.body,
        error: error.message
      }, req.user?.user_id, req.user?.tenant_id, error.stack);

      res.status(500).json({
        success: false,
        error: error.message || 'Failed to update scheduler configuration'
      });
    }
  };

  deleteSchedulerConfig = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { user, environment } = req;
      const isLive = environment === 'live';

      await this.schedulerService.deleteSchedulerConfig(
        user!.tenant_id,
        isLive,
        user!.user_id
      );

      res.json({
        success: true,
        message: 'Scheduler configuration deleted successfully'
      });
    } catch (error: any) {
      SimpleLogger.error('NavController', 'Failed to delete scheduler config', 'deleteSchedulerConfig', {
        tenantId: req.user?.tenant_id,
        userId: req.user?.user_id,
        error: error.message
      }, req.user?.user_id, req.user?.tenant_id, error.stack);

      res.status(500).json({
        success: false,
        error: error.message || 'Failed to delete scheduler configuration'
      });
    }
  };

  getSchedulerStatus = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { user, environment } = req;
      const isLive = environment === 'live';

      const status = await this.schedulerService.getSchedulerStatus(
        user!.tenant_id,
        isLive,
        user!.user_id
      );

      res.json({
        success: true,
        data: status
      });
    } catch (error: any) {
      SimpleLogger.error('NavController', 'Failed to get scheduler status', 'getSchedulerStatus', {
        tenantId: req.user?.tenant_id,
        userId: req.user?.user_id,
        error: error.message
      }, req.user?.user_id, req.user?.tenant_id, error.stack);

      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get scheduler status'
      });
    }
  };

  triggerScheduledDownload = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { user, environment } = req;
      const isLive = environment === 'live';

      const result = await this.schedulerService.manualTriggerDownload(
        user!.tenant_id,
        isLive,
        user!.user_id
      );

      if (result.success) {
        res.json({
          success: true,
          data: {
            execution_id: result.executionId,
            message: 'Download triggered successfully via N8N'
          }
        });
      } else {
        res.status(500).json({
          success: false,
          error: result.error || 'Failed to trigger download'
        });
      }
    } catch (error: any) {
      SimpleLogger.error('NavController', 'Failed to trigger scheduled download', 'triggerScheduledDownload', {
        tenantId: req.user?.tenant_id,
        userId: req.user?.user_id,
        error: error.message
      }, req.user?.user_id, req.user?.tenant_id, error.stack);

      res.status(500).json({
        success: false,
        error: error.message || 'Failed to trigger download'
      });
    }
  };

  getAllActiveSchedulers = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const activeSchedulers = await this.schedulerService.getAllActiveSchedulers();

      res.json({
        success: true,
        data: {
          active_schedulers: activeSchedulers,
          total_active: activeSchedulers.length
        }
      });
    } catch (error: any) {
      SimpleLogger.error('NavController', 'Failed to get all active schedulers', 'getAllActiveSchedulers', {
        error: error.message
      }, req.user?.user_id, req.user?.tenant_id, error.stack);

      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get active schedulers'
      });
    }
  };

  /**
   * Delete all NAV data for a scheme
   * DELETE /api/nav/data/:schemeId
   */
  deleteAllData = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const schemeId = parseInt(req.params.schemeId);
      const isLive = req.environment === 'live';

      if (isNaN(schemeId)) {
        res.status(400).json({
          success: false,
          error: 'Invalid scheme ID'
        });
        return;
      }

      const deletedCount = await this.navService.deleteAllData(schemeId, isLive);

      SimpleLogger.info('NavController', 'All NAV data deleted for scheme', 'deleteAllData', {
        schemeId,
        isLive,
        deletedCount
      });

      res.json({
        success: true,
        message: `Deleted ${deletedCount} NAV records`,
        data: {
          deleted_count: deletedCount
        }
      });
    } catch (error: any) {
      SimpleLogger.error('NavController', 'Failed to delete NAV data', 'deleteAllData', {
        schemeId: req.params.schemeId,
        error: error.message
      }, undefined, undefined, error.stack);

      res.status(500).json({
        success: false,
        error: error.message || 'Failed to delete NAV data'
      });
    }
  };

  private generateCronExpression(scheduleType: string, downloadTime: string): string {
    const [hours, minutes] = downloadTime.split(':').map(Number);

    switch (scheduleType) {
      case 'daily':
        return `${minutes} ${hours} * * *`;
      case 'weekly':
        return `${minutes} ${hours} * * 5`;
      case 'custom':
        return `${minutes} ${hours} * * *`;
      default:
        throw new Error('Invalid schedule type');
    }
  }
}