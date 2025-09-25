// backend/src/controllers/nav.controller.ts
// File 7/14: NAV API controller following existing patterns

import { Request, Response } from 'express';
import { NavService } from '../services/nav.service';
import { NavDownloadService } from '../services/navDownload.service';
import { AmfiDataSourceService } from '../services/amfiDataSource.service';
import { SchemeService } from '../services/scheme.service';
import { SimpleLogger } from '../services/simpleLogger.service';
import {
  SchemeBookmarkSearchParams,
  CreateSchemeBookmarkRequest,
  UpdateSchemeBookmarkRequest,
  NavDataSearchParams,
  CreateNavDownloadJobRequest,
  NavDownloadJobSearchParams,
  N8nCallbackPayload
} from '../types/nav.types';

interface AuthenticatedRequest extends Request {
  user?: {
    user_id: number;
    tenant_id: number;
  };
  environment?: 'live' | 'test';
}

export class NavController {
  private navService: NavService;
  private downloadService: NavDownloadService;
  private amfiService: AmfiDataSourceService;
  private schemeService: SchemeService;

  constructor() {
    this.navService = new NavService();
    this.downloadService = new NavDownloadService();
    this.amfiService = new AmfiDataSourceService();
    this.schemeService = new SchemeService();
  }

  // ==================== SCHEME SEARCH & MANAGEMENT ====================

  /**
   * Search available schemes for bookmarking
   * GET /api/nav/schemes/search
   */
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

      // Check which schemes are already bookmarked by this user
      const bookmarks = await this.navService.getUserBookmarks(
        user!.tenant_id,
        isLive,
        user!.user_id,
        { page: 1, page_size: 1000 }
      );

      const bookmarkedSchemeIds = new Set(bookmarks.bookmarks.map(b => b.scheme_id));

      const schemesWithBookmarkStatus = searchResults.schemes.map(scheme => ({
        ...scheme,
        is_bookmarked: bookmarkedSchemeIds.has(scheme.id),
        // Add latest NAV info if available
        latest_nav_value: null,
        latest_nav_date: null
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
   * Get user's bookmarked schemes
   * GET /api/nav/bookmarks
   */
  getBookmarks = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { user, environment } = req;
      const isLive = environment === 'live';

      const params: SchemeBookmarkSearchParams = {
        page: req.query.page ? Number(req.query.page) : 1,
        page_size: req.query.page_size ? Number(req.query.page_size) : 20,
        search: req.query.search as string,
        daily_download_only: req.query.daily_download_only === 'true',
        amc_name: req.query.amc_name as string
      };

      const result = await this.navService.getUserBookmarks(
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

  /**
   * Add scheme to bookmarks
   * POST /api/nav/bookmarks
   */
  addBookmark = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { user, environment } = req;
      const isLive = environment === 'live';

      const request: CreateSchemeBookmarkRequest = {
        scheme_id: req.body.scheme_id,
        daily_download_enabled: req.body.daily_download_enabled,
        download_time: req.body.download_time
      };

      // Validate scheme_id
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

  /**
   * Update bookmark settings
   * PUT /api/nav/bookmarks/:id
   */
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

  /**
   * Remove bookmark
   * DELETE /api/nav/bookmarks/:id
   */
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

  // ==================== NAV DATA OPERATIONS ====================

  /**
   * Get NAV data for schemes
   * GET /api/nav/data
   */
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

      // Validate date range if provided
      if (params.start_date && params.end_date && params.start_date > params.end_date) {
        res.status(400).json({
          success: false,
          error: 'Start date cannot be after end date'
        });
        return;
      }

      const result = await this.navService.getNavData(
        user!.tenant_id,
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

  /**
   * Get latest NAV for a specific scheme
   * GET /api/nav/schemes/:id/latest
   */
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
        user!.tenant_id,
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

  // ==================== DOWNLOAD OPERATIONS ====================

  /**
   * Trigger daily NAV download
   * POST /api/nav/download/daily
   */
  triggerDailyDownload = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { user, environment } = req;
      const isLive = environment === 'live';

      const result = await this.downloadService.triggerDailyDownload(
        user!.tenant_id,
        isLive,
        user!.user_id
      );

      const statusCode = result.alreadyExists ? 200 : 202; // 202 Accepted for async processing
      
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
   * Trigger historical NAV download
   * POST /api/nav/download/historical
   */
  triggerHistoricalDownload = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { user, environment } = req;
      const isLive = environment === 'live';

      const { scheme_ids, start_date, end_date } = req.body;

      // Validate required fields
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
          schemeIds: scheme_ids.map(Number),
          startDate,
          endDate
        }
      );

      res.status(202).json({ // 202 Accepted for async processing
        success: true,
        data: result,
        message: result.message
      });

    } catch (error: any) {
      SimpleLogger.error('NavController', 'Failed to trigger historical download', 'triggerHistoricalDownload', {
        tenantId: req.user?.tenant_id,
        userId: req.user?.user_id,
        request: req.body,
        error: error.message
      }, req.user?.user_id, req.user?.tenant_id, error.stack);

      if (error.message === 'HISTORICAL_DOWNLOAD_COMPLETED') {
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

  /**
   * Get download progress (for UI polling during long downloads)
   * GET /api/nav/download/progress/:jobId
   */
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

  /**
   * Get download jobs history
   * GET /api/nav/download/jobs
   */
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

  /**
   * Cancel running download
   * DELETE /api/nav/download/jobs/:jobId
   */
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

  // ==================== N8N WEBHOOK ENDPOINTS ====================

  /**
   * N8N callback endpoint (called by N8N workflows)
   * POST /api/nav/n8n-callback
   */
  handleN8nCallback = async (req: Request, res: Response): Promise<void> => {
    try {
      const payload: N8nCallbackPayload = req.body;

      // Basic validation
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

  // ==================== STATISTICS & DASHBOARD ====================

  /**
   * Get NAV statistics for dashboard
   * GET /api/nav/statistics
   */
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
   * Get active downloads for user dashboard
   * GET /api/nav/download/active
   */
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

  // ==================== MANUAL/ON-DEMAND OPERATIONS ====================

  /**
   * Check if NAV data exists for today (manual check)
   * GET /api/nav/check-today
   */
  checkTodayNavData = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { user, environment } = req;
      const isLive = environment === 'live';

      // Get user's bookmarked schemes
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
        user!.tenant_id,
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
}