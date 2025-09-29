// backend/src/controllers/nav.controller.ts
// File 7/14: NAV API controller with enhanced bookmark endpoints and scheduler management

import { Request, Response } from 'express';
import { NavService } from '../services/nav.service';
import { NavDownloadService } from '../services/navDownload.service';
import { NavSchedulerService } from '../services/navScheduler.service';
import { AmfiDataSourceService } from '../services/amfiDataSource.service';
import { SchemeService, SchemeDetail } from '../services/scheme.service';
import { SimpleLogger } from '../services/simpleLogger.service';
import {
  SchemeBookmarkSearchParams,
  CreateSchemeBookmarkRequest,
  UpdateSchemeBookmarkRequest,
  BookmarkNavDataParams,
  UpdateBookmarkDownloadStatus,
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

// Enhanced scheme type with NAV info
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

      const schemesWithBookmarkStatus: SchemeWithNavInfo[] = searchResults.schemes.map(scheme => ({
        ...scheme,
        is_bookmarked: bookmarkedSchemeIds.has(scheme.id),
        // Add latest NAV info if available - properly typed as null initially
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

  // ==================== ENHANCED BOOKMARK ENDPOINTS ====================

  /**
   * Get NAV data for a specific bookmark
   * GET /api/nav/bookmarks/:id/nav-data
   */
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
        page_size: req.query.page_size ? Number(req.query.page_size) : 50
      };

      // Validate date range if provided
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

  /**
   * Update bookmark download status (called internally after downloads)
   * PUT /api/nav/bookmarks/:id/download-status
   */
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

      // First get the bookmark to find the scheme_id
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

  /**
   * Get bookmark statistics summary
   * GET /api/nav/bookmarks/:id/stats
   */
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

      // Get bookmark details with stats
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

      // Calculate additional stats
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
   * ENHANCED: Trigger historical NAV download with bookmark status update
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
    scheme_ids: scheme_ids.map(Number), // ✅ Correct property name
    start_date: startDate,              // ✅ Correct property name
    end_date: endDate                   // ✅ Correct property name
  }
);

      // ENHANCED: Update bookmark download status for each scheme
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
        // Log but don't fail the download if status update fails
        SimpleLogger.error('NavController', 'Failed to update bookmark status during historical download', 'triggerHistoricalDownload', {
          tenantId: user!.tenant_id,
          userId: user!.user_id,
          error: statusError
        });
      }

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

  // ==================== SCHEDULER MANAGEMENT ENDPOINTS ====================

  /**
   * Get scheduler configuration
   * GET /api/nav/scheduler/config
   */
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

  /**
   * Save scheduler configuration
   * POST /api/nav/scheduler/config
   * Body: {
   *   schedule_type: 'daily' | 'weekly' | 'custom',
   *   download_time: 'HH:MM',
   *   cron_expression?: string,
   *   is_enabled: boolean
   * }
   */
  saveSchedulerConfig = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { user, environment } = req;
      const isLive = environment === 'live';

      const { schedule_type, download_time, cron_expression, is_enabled } = req.body;

      // Validation
      if (!schedule_type || !download_time || is_enabled === undefined) {
        res.status(400).json({
          success: false,
          error: 'schedule_type, download_time, and is_enabled are required'
        });
        return;
      }

      // Validate time format (HH:MM)
      if (!/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(download_time)) {
        res.status(400).json({
          success: false,
          error: 'Invalid time format. Use HH:MM format (24-hour)'
        });
        return;
      }

      // Generate cron expression if not provided
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

  /**
   * Update existing scheduler configuration
   * PUT /api/nav/scheduler/config/:id
   */
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

      // Get existing config first
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

      // Generate cron expression if schedule changed
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

  /**
   * Delete scheduler configuration
   * DELETE /api/nav/scheduler/config
   */
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

  /**
   * Get scheduler status
   * GET /api/nav/scheduler/status
   */
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

  /**
   * Manually trigger download (bypassing schedule)
   * POST /api/nav/scheduler/trigger
   */
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

  /**
   * Get all active schedulers (admin endpoint)
   * GET /api/nav/scheduler/all-active
   */
  getAllActiveSchedulers = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      // This could be restricted to admin users only
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

  // ==================== HELPER METHODS ====================

  /**
   * Generate cron expression based on schedule type and time
   */
  private generateCronExpression(scheduleType: string, downloadTime: string): string {
    const [hours, minutes] = downloadTime.split(':').map(Number);

    switch (scheduleType) {
      case 'daily':
        // Every day at specified time
        return `${minutes} ${hours} * * *`;
      
      case 'weekly':
        // Every Friday at specified time
        return `${minutes} ${hours} * * 5`;
      
      case 'custom':
        // Default to daily if custom not specified
        return `${minutes} ${hours} * * *`;
      
      default:
        throw new Error('Invalid schedule type');
    }
  }
}