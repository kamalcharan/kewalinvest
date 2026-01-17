// backend/src/routes/nav.routes.ts
// File 8/14: NAV routing with enhanced bookmark endpoints and scheduler management
// UPDATED: Added time-series endpoint for chart visualization

import { Router } from 'express';
import { NavController } from '../controllers/nav.controller';
import { BookmarkGapController } from '../controllers/bookmarkGap.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { environmentMiddleware } from '../middleware/environment.middleware';
import rateLimit from 'express-rate-limit';

const router = Router();
const navController = new NavController();
const bookmarkGapController = new BookmarkGapController();

// Apply authentication and environment middleware to all routes
router.use(authMiddleware);
router.use(environmentMiddleware);

// ==================== RATE LIMITING MIDDLEWARE ====================

// General API rate limiting
const generalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10000, // 1000 requests per 15 minutes
  message: {
    success: false,
    error: 'Too many requests, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for health checks or system operations
    return req.ip === '127.0.0.1' && req.headers['user-agent']?.includes('HealthCheck');
  }
});

// Strict rate limiting for download operations (to protect AMFI APIs)
const downloadRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 download requests per hour
  message: {
    success: false,
    error: 'Download rate limit exceeded. Please wait before triggering another download.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Rate limit per user per tenant
    const user = (req as any).user;
    return `${user?.tenant_id || 'unknown'}_${user?.user_id || 'unknown'}`;
  }
});

// Rate limiting for historical downloads (heavy operations)
const historicalDownloadRateLimit = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  max: 100, // 3 historical downloads per day
  message: {
    success: false,
    error: 'Historical download limit exceeded. You can only perform 300 historical downloads per day.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const user = (req as any).user;
    return `historical_${user?.tenant_id || 'unknown'}_${user?.user_id || 'unknown'}`;
  }
});

// Scheduler configuration rate limiting (prevent spam configuration changes)
const schedulerConfigRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // 20 scheduler config changes per hour
  message: {
    success: false,
    error: 'Scheduler configuration rate limit exceeded. Please wait before making more changes.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const user = (req as any).user;
    return `scheduler_${user?.tenant_id || 'unknown'}_${user?.user_id || 'unknown'}`;
  }
});

// Manual trigger rate limiting (prevent abuse of manual triggers)
const manualTriggerRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour  
  max: 5, // 5 manual triggers per hour
  message: {
    success: false,
    error: 'Manual trigger rate limit exceeded. Please wait before triggering another download.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const user = (req as any).user;
    return `manual_trigger_${user?.tenant_id || 'unknown'}_${user?.user_id || 'unknown'}`;
  }
});

// Apply general rate limiting to all routes
router.use(generalRateLimit);

// ==================== SCHEME SEARCH & MANAGEMENT ROUTES ====================

/**
 * Search available schemes for bookmarking
 * GET /api/nav/schemes/search?search=sbi&page=1&page_size=20
 */
router.get('/schemes/search', navController.searchSchemes);

// ==================== BOOKMARK MANAGEMENT ROUTES ====================

/**
 * Get user's bookmarked schemes
 * GET /api/nav/bookmarks?page=1&page_size=20&search=equity&daily_download_only=true
 */
router.get('/bookmarks', navController.getBookmarks);

/**
 * Add scheme to bookmarks
 * POST /api/nav/bookmarks
 * Body: { scheme_id: 123, daily_download_enabled: true, download_time: "22:00" }
 */
router.post('/bookmarks', navController.addBookmark);

/**
 * Update bookmark settings
 * PUT /api/nav/bookmarks/:id
 * Body: { daily_download_enabled: false, download_time: "21:30" }
 */
router.put('/bookmarks/:id', navController.updateBookmark);

/**
 * Remove bookmark
 * DELETE /api/nav/bookmarks/:id
 */
router.delete('/bookmarks/:id', navController.removeBookmark);

// ==================== ENHANCED BOOKMARK ENDPOINTS ====================

/**
 * Get NAV data for a specific bookmark
 * GET /api/nav/bookmarks/:id/nav-data
 * Query params: start_date, end_date, page, page_size
 * 
 * Returns paginated NAV data for the specific bookmarked scheme
 * with optional date range filtering
 */
router.get('/bookmarks/:id/nav-data', navController.getBookmarkNavData);

/**
 * Get comprehensive statistics for a specific bookmark
 * GET /api/nav/bookmarks/:id/stats
 * 
 * Returns: {
 *   bookmark_id: number,
 *   scheme_name: string,
 *   nav_records_count: number,
 *   earliest_nav_date: string,
 *   latest_nav_date: string,
 *   latest_nav_value: number,
 *   daily_download_enabled: boolean,
 *   last_download_status: string,
 *   date_range_days: number
 * }
 */
router.get('/bookmarks/:id/stats', navController.getBookmarkStats);

/**
 * Update bookmark download status (internal endpoint)
 * PUT /api/nav/bookmarks/:id/download-status
 * Body: {
 *   last_download_status: 'success' | 'failed' | 'pending',
 *   last_download_error?: string,
 *   last_download_attempt?: string
 * }
 * 
 * Note: This endpoint is primarily for internal use by download services
 * but can be used by admin interfaces for manual status updates
 */
router.put('/bookmarks/:id/download-status', navController.updateBookmarkDownloadStatus);

// ==================== BOOKMARK GAP DETECTION ROUTES ====================

/**
 * Get all unbookmarked schemes from customer portfolios (tenant-wide)
 * GET /api/nav/bookmark-gaps
 * 
 * Returns: {
 *   alert_type: 'critical' | 'warning',
 *   message: string,
 *   unbookmarked_schemes: [
 *     {
 *       scheme_code: string,
 *       scheme_name: string,
 *       customer_count: number,
 *       transaction_count: number,
 *       total_invested: number,
 *       last_transaction_date: Date,
 *       scheme_id: number | null,
 *       amc_name: string | null,
 *       exists_in_master: boolean
 *     }
 *   ],
 *   summary: {
 *     total_unbookmarked: number,
 *     total_customers_affected: number,
 *     total_investment_at_risk: number,
 *     schemes_not_in_master: number,
 *     schemes_not_bookmarked: number,
 *     last_checked: Date
 *   }
 * }
 * 
 * Use this to detect schemes in customer transactions that aren't being tracked
 * Critical: Schemes not in master data (need to be added to t_scheme_details)
 * Warning: Schemes exist but not bookmarked (need to bookmark for NAV tracking)
 */
router.get('/bookmark-gaps', bookmarkGapController.getUnbookmarkedSchemes);

/**
 * Get unbookmarked schemes for a specific customer
 * GET /api/nav/bookmark-gaps/customer/:customerId
 * 
 * Returns unbookmarked schemes from a single customer's portfolio
 * Useful for customer dashboard alerts or customer-specific portfolio analysis
 * 
 * Returns: {
 *   customer_id: number,
 *   unbookmarked_schemes: [...],
 *   total_unbookmarked: number,
 *   critical_count: number,
 *   warning_count: number
 * }
 */
router.get('/bookmark-gaps/customer/:customerId', bookmarkGapController.getCustomerUnbookmarkedSchemes);

/**
 * Get bookmark gap summary statistics (lightweight)
 * GET /api/nav/bookmark-gaps/summary
 * 
 * Returns only the summary without full scheme details
 * Useful for dashboard widgets or quick status checks
 * Much faster than full gap detection
 * 
 * Returns: {
 *   total_unbookmarked: number,
 *   total_customers_affected: number,
 *   total_investment_at_risk: number,
 *   schemes_not_in_master: number,
 *   schemes_not_bookmarked: number,
 *   last_checked: Date
 * }
 */
router.get('/bookmark-gaps/summary', bookmarkGapController.getGapSummary);

// ==================== NAV DATA ROUTES ====================

/**
 * Get NAV data with filtering and pagination
 * GET /api/nav/data?scheme_id=123&start_date=2024-01-01&end_date=2024-12-31&page=1&page_size=50
 */
router.get('/data', navController.getNavData);

/**
 * Delete all NAV data for a scheme
 * DELETE /api/nav/data/:schemeId
 * Admin only - requires authentication
 */
router.delete('/data/:schemeId', navController.deleteAllData);

/**
 * Get latest NAV for a specific scheme
 * GET /api/nav/schemes/:id/latest
 */
router.get('/schemes/:id/latest', navController.getLatestNav);

/**
 * Get NAV time series data for a specific scheme
 * GET /api/nav/timeseries/:schemeId
 * 
 * Path params:
 *   - schemeId: Scheme ID (integer)
 * 
 * Query params:
 *   - start_date: Start date (YYYY-MM-DD), optional
 *   - end_date: End date (YYYY-MM-DD), optional
 *   - granularity: 'daily' | 'weekly' | 'monthly' (default: 'daily')
 *   - include_metrics: Include calculated metrics (default: true)
 * 
 * Returns time-series data optimized for chart visualization
 * with optional calculated metrics (returns, volatility, etc.)
 * 
 * Response: {
 *   scheme_id: number,
 *   scheme_name: string,
 *   granularity: string,
 *   total_points: number,
 *   date_range: { start: string, end: string },
 *   data_points: [
 *     {
 *       date: string,
 *       nav: number,
 *       daily_return?: number,
 *       cumulative_return?: number,
 *       volatility?: number,
 *       min_nav?: number,
 *       max_nav?: number,
 *       avg_nav?: number
 *     }
 *   ],
 *   summary_metrics?: {
 *     current_nav: number,
 *     total_return: number,
 *     annualized_return: number,
 *     volatility: number,
 *     sharpe_ratio: number,
 *     max_drawdown: number
 *   }
 * }
 * 
 * Example: GET /api/nav/timeseries/123?granularity=weekly&start_date=2024-01-01
 */
router.get('/timeseries/:schemeId', navController.getNavTimeSeries);

// ==================== DOWNLOAD OPERATION ROUTES ====================

/**
 * Trigger daily NAV download (idempotent)
 * POST /api/nav/download/daily
 * 
 * Downloads today's NAV for all user's bookmarked schemes
 * Returns immediately if download already in progress
 * Returns data availability status if already downloaded
 */
router.post('/download/daily', downloadRateLimit, navController.triggerDailyDownload);

/**
 * Download NAV for a single scheme (from AMFI daily data)
 * POST /api/nav/download/scheme/:schemeCode
 *
 * Used by "Update NAV" button in Cruise Control
 * Downloads latest NAV from AMFI for the specified scheme
 */
router.post('/download/scheme/:schemeCode', downloadRateLimit, navController.downloadSchemeNav);

/**
 * Trigger historical NAV download (heavy operation)
 * POST /api/nav/download/historical
 * Body: { 
 *   scheme_ids: [123, 456], 
 *   start_date: "2024-01-01", 
 *   end_date: "2024-06-30" 
 * }
 * 
 * Limited to 6 months per request and 3 requests per day
 * Returns job_id for progress tracking
 * ENHANCED: Now updates bookmark download status automatically
 */
router.post('/download/historical', historicalDownloadRateLimit, navController.triggerHistoricalDownload);

/**
 * Get download progress for UI engagement
 * GET /api/nav/download/progress/:jobId
 * 
 * Returns: {
 *   progressPercentage: 45,
 *   currentStep: "Processing 2,300 of 5,000 records...",
 *   estimatedTimeRemaining: 120000,
 *   processedSchemes: 12,
 *   totalSchemes: 25
 * }
 */
router.get('/download/progress/:jobId', navController.getDownloadProgress);

/**
 * Get download jobs history
 * GET /api/nav/download/jobs?status=completed&job_type=daily&page=1&page_size=20
 */
router.get('/download/jobs', navController.getDownloadJobs);

/**
 * Cancel running download job
 * DELETE /api/nav/download/jobs/:jobId
 */
router.delete('/download/jobs/:jobId', navController.cancelDownloadJob);

/**
 * Get currently active downloads
 * GET /api/nav/download/active
 * 
 * Returns all downloads currently in progress across the system
 * Useful for admin dashboard or user notifications
 */
router.get('/download/active', navController.getActiveDownloads);

// ==================== STATISTICS & DASHBOARD ROUTES ====================

/**
 * Get NAV statistics for user dashboard
 * GET /api/nav/statistics
 * 
 * Returns: {
 *   total_schemes_tracked: 25,
 *   total_nav_records: 15000,
 *   schemes_with_daily_download: 20,
 *   schemes_with_historical_data: 15,
 *   latest_nav_date: "2024-09-25",
 *   download_jobs_today: 2,
 *   failed_downloads_today: 0
 * }
 */
router.get('/statistics', navController.getNavStatistics);

/**
 * Get detailed status for all bookmarked schemes
 * GET /api/nav/detailed-status
 *
 * Used by Cruise Control -> NAV Downloads UI
 * Returns download status, metrics status, and gap detection per scheme
 */
router.get('/detailed-status', navController.getDetailedStatus);

/**
 * Check if today's NAV data is available
 * GET /api/nav/check-today
 * 
 * Returns: {
 *   total_bookmarked_schemes: 25,
 *   schemes_with_today_data: 23,
 *   schemes_missing_data: 2,
 *   data_available: false,
 *   message: "2 schemes missing today's data"
 * }
 */
router.get('/check-today', navController.checkTodayNavData);

// ==================== SCHEDULER MANAGEMENT ROUTES ====================

/**
 * Get user's scheduler configuration
 * GET /api/nav/scheduler/config
 * 
 * Returns current scheduler settings including:
 * - schedule_type (daily/weekly/custom)
 * - download_time (HH:MM format)
 * - cron_expression
 * - is_enabled status
 * - next_execution_at timestamp
 */
router.get('/scheduler/config', navController.getSchedulerConfig);

/**
 * Create/Save scheduler configuration  
 * POST /api/nav/scheduler/config
 * Body: {
 *   schedule_type: 'daily' | 'weekly' | 'custom',
 *   download_time: 'HH:MM', // e.g., "23:00"
 *   cron_expression?: string, // optional, auto-generated if not provided
 *   is_enabled: boolean
 * }
 * 
 * Creates new scheduler config or updates existing one
 * Auto-generates cron expression from schedule_type + download_time
 * Starts/stops cron job based on is_enabled flag
 */
router.post('/scheduler/config', schedulerConfigRateLimit, navController.saveSchedulerConfig);

/**
 * Update existing scheduler configuration
 * PUT /api/nav/scheduler/config/:id
 * Body: {
 *   schedule_type?: 'daily' | 'weekly' | 'custom',
 *   download_time?: 'HH:MM',
 *   cron_expression?: string,
 *   is_enabled?: boolean
 * }
 * 
 * Updates specific fields of existing scheduler configuration
 * Automatically restarts cron job with new settings
 */
router.put('/scheduler/config/:id', schedulerConfigRateLimit, navController.updateSchedulerConfig);

/**
 * Delete scheduler configuration
 * DELETE /api/nav/scheduler/config
 * 
 * Removes user's scheduler configuration and stops any running cron job
 * This will disable all automated downloads for the user
 */
router.delete('/scheduler/config', schedulerConfigRateLimit, navController.deleteSchedulerConfig);

/**
 * Get scheduler status and recent executions
 * GET /api/nav/scheduler/status
 * 
 * Returns: {
 *   config: { ... scheduler configuration ... },
 *   is_running: boolean,
 *   cron_job_active: boolean,
 *   next_run: "2024-09-26T23:00:00Z",
 *   last_run: "2024-09-25T23:00:00Z", 
 *   recent_executions: [
 *     {
 *       execution_time: "2024-09-25T23:00:00Z",
 *       status: "success",
 *       n8n_execution_id: "abc123",
 *       execution_duration_ms: 45000
 *     }
 *   ]
 * }
 */
router.get('/scheduler/status', navController.getSchedulerStatus);

/**
 * Manually trigger scheduled download (bypass cron schedule)
 * POST /api/nav/scheduler/trigger
 * 
 * Immediately triggers a download via N8N workflow
 * Does not affect the regular schedule - this is a one-time manual trigger
 * Useful for testing or immediate downloads
 * 
 * Returns: {
 *   execution_id: "n8n_abc123",
 *   message: "Download triggered successfully via N8N"
 * }
 */
router.post('/scheduler/trigger', manualTriggerRateLimit, navController.triggerScheduledDownload);

/**
 * Get all active schedulers across system (admin endpoint)
 * GET /api/nav/scheduler/all-active
 * 
 * Returns system-wide view of all active schedulers
 * Useful for admin monitoring and system health checks
 * 
 * Returns: {
 *   active_schedulers: [
 *     {
 *       jobKey: "nav_scheduler_1_live_123",
 *       config: { ... },
 *       isActive: true
 *     }
 *   ],
 *   total_active: 15
 * }
 */
router.get('/scheduler/all-active', navController.getAllActiveSchedulers);

// ==================== N8N INTEGRATION ROUTES ====================

/**
 * N8N callback endpoint (webhook from N8N workflows)
 * POST /api/nav/n8n-callback
 * 
 * Called by N8N workflows when download operations complete
 * No authentication required (but should be secured at N8N level)
 * Body: {
 *   job_id: 123,
 *   status: "completed",
 *   result: { ... },
 *   error?: "error message"
 * }
 */
router.post('/n8n-callback', (req, res, next) => {
  // Skip authentication for N8N callbacks
  // In production, you might want IP whitelisting or secret token validation
  req.headers.authorization = 'Bearer system'; // Bypass auth for callbacks
  next();
}, navController.handleN8nCallback);

// ==================== HEALTH CHECK & SYSTEM ROUTES ====================

/**
 * Health check for NAV services
 * GET /api/nav/health
 */
router.get('/health', (req, res) => {
  try {
    // Basic health check - could be enhanced to check database connectivity,
    // AMFI API availability, N8N connectivity, etc.
    res.json({
      success: true,
      service: 'nav-service',
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      features: {
        schemes_search: true,
        bookmarks: true,
        enhanced_bookmarks: true,
        nav_data: true,
        timeseries_analytics: true, // NEW: Time series analytics feature
        downloads: true,
        scheduler: true,
        n8n_integration: !!process.env.N8N_BASE_URL,
        amfi_integration: true
      }
    });
  } catch (error: any) {
    res.status(503).json({
      success: false,
      service: 'nav-service',
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// ==================== ERROR HANDLING MIDDLEWARE ====================

/**
 * NAV-specific error handling middleware
 * Handles common NAV-related errors and provides user-friendly messages
 */
router.use((error: any, req: any, res: any, next: any) => {
  // Log the error for debugging
  console.error('[NAV Routes] Error:', error);

  // Handle specific NAV error codes
  const errorHandlers = {
    'SCHEME_NOT_FOUND': {
      status: 404,
      message: 'The requested scheme was not found'
    },
    'SCHEME_ALREADY_BOOKMARKED': {
      status: 409,
      message: 'This scheme is already in your bookmarks'
    },
    'BOOKMARK_NOT_FOUND': {
      status: 404,
      message: 'Bookmark not found or you do not have permission to access it'
    },
    'HISTORICAL_DOWNLOAD_COMPLETED': {
      status: 409,
      message: 'Historical download has already been completed for this scheme'
    },
    'NAV_DATA_ALREADY_EXISTS': {
      status: 200,
      message: 'NAV data already exists for the requested date'
    },
    'INVALID_DATE_RANGE': {
      status: 400,
      message: 'Invalid date range specified'
    },
    'AMFI_API_ERROR': {
      status: 503,
      message: 'External data service temporarily unavailable'
    },
    'N8N_EXECUTION_FAILED': {
      status: 502,
      message: 'Workflow execution failed'
    },
    'RATE_LIMIT_EXCEEDED': {
      status: 429,
      message: 'Too many requests. Please wait before trying again'
    },
    'DOWNLOAD_JOB_NOT_FOUND': {
      status: 404,
      message: 'Download job not found'
    },
    // Scheduler-specific error codes
    'SCHEDULER_CONFIG_NOT_FOUND': {
      status: 404,
      message: 'Scheduler configuration not found'
    },
    'INVALID_CRON_EXPRESSION': {
      status: 400,
      message: 'Invalid cron expression provided'
    },
    'SCHEDULER_ALREADY_EXISTS': {
      status: 409,
      message: 'User already has a scheduler configuration'
    },
    'N8N_WEBHOOK_FAILED': {
      status: 502,
      message: 'Failed to trigger N8N workflow'
    },
    'SCHEDULER_NOT_ENABLED': {
      status: 400,
      message: 'Scheduler is not enabled for this user'
    },
    // Bookmark-specific error codes
    'BOOKMARK_ACCESS_DENIED': {
      status: 403,
      message: 'You do not have permission to access this bookmark'
    },
    'INVALID_DOWNLOAD_STATUS': {
      status: 400,
      message: 'Invalid download status provided'
    },
    'NAV_DATA_NOT_AVAILABLE': {
      status: 404,
      message: 'NAV data is not available for the requested parameters'
    }
  };

  const errorHandler = errorHandlers[error.message as keyof typeof errorHandlers];
  
  if (errorHandler) {
    res.status(errorHandler.status).json({
      success: false,
      error: errorHandler.message,
      code: error.message
    });
  } else if (error.status) {
    // Express validation errors or other middleware errors
    res.status(error.status).json({
      success: false,
      error: error.message || 'Request validation failed'
    });
  } else {
    // Generic server error
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'An unexpected error occurred while processing your request'
    });
  }
});

// ==================== API DOCUMENTATION ====================

/**
 * API documentation endpoint
 * GET /api/nav/docs
 * 
 * Returns a summary of all available NAV API endpoints
 * Useful for frontend development and API discovery
 */
router.get('/docs', (req, res) => {
  const apiDocs = {
    service: 'NAV Tracking API',
    version: '1.0.0',
    base_url: '/api/nav',
    authentication: 'Bearer token required',
    endpoints: {
      scheme_search: {
        method: 'GET',
        path: '/schemes/search',
        description: 'Search available schemes for bookmarking',
        parameters: ['search', 'page', 'page_size', 'amc_name', 'scheme_type']
      },
      bookmarks: {
        list: { method: 'GET', path: '/bookmarks' },
        create: { method: 'POST', path: '/bookmarks' },
        update: { method: 'PUT', path: '/bookmarks/:id' },
        delete: { method: 'DELETE', path: '/bookmarks/:id' },
        nav_data: { 
          method: 'GET', 
          path: '/bookmarks/:id/nav-data',
          description: 'Get NAV data for specific bookmark',
          parameters: ['start_date', 'end_date', 'page', 'page_size']
        },
        stats: { 
          method: 'GET', 
          path: '/bookmarks/:id/stats',
          description: 'Get comprehensive bookmark statistics'
        },
        download_status: { 
          method: 'PUT', 
          path: '/bookmarks/:id/download-status',
          description: 'Update bookmark download status (internal)'
        }
      },
      bookmark_gaps: {
        tenant_wide: {
          method: 'GET',
          path: '/bookmark-gaps',
          description: 'Get all unbookmarked schemes from customer portfolios'
        },
        customer_specific: {
          method: 'GET',
          path: '/bookmark-gaps/customer/:customerId',
          description: 'Get unbookmarked schemes for a specific customer'
        },
        summary: {
          method: 'GET',
          path: '/bookmark-gaps/summary',
          description: 'Get bookmark gap summary statistics (lightweight)'
        }
      },
      nav_data: {
        list: { method: 'GET', path: '/data' },
        latest: { method: 'GET', path: '/schemes/:id/latest' },
        timeseries: { 
          method: 'GET', 
          path: '/timeseries/:schemeId',
          description: 'Get time-series data for chart visualization',
          parameters: ['start_date', 'end_date', 'granularity', 'include_metrics']
        }
      },
      downloads: {
        daily: { method: 'POST', path: '/download/daily', rate_limit: '10/hour' },
        historical: { method: 'POST', path: '/download/historical', rate_limit: '3/day' },
        progress: { method: 'GET', path: '/download/progress/:jobId' },
        jobs: { method: 'GET', path: '/download/jobs' },
        cancel: { method: 'DELETE', path: '/download/jobs/:jobId' },
        active: { method: 'GET', path: '/download/active' }
      },
      scheduler: {
        get_config: { method: 'GET', path: '/scheduler/config' },
        save_config: { method: 'POST', path: '/scheduler/config', rate_limit: '20/hour' },
        update_config: { method: 'PUT', path: '/scheduler/config/:id', rate_limit: '20/hour' },
        delete_config: { method: 'DELETE', path: '/scheduler/config', rate_limit: '20/hour' },
        get_status: { method: 'GET', path: '/scheduler/status' },
        manual_trigger: { method: 'POST', path: '/scheduler/trigger', rate_limit: '5/hour' },
        all_active: { method: 'GET', path: '/scheduler/all-active' }
      },
      statistics: {
        dashboard: { method: 'GET', path: '/statistics' },
        check_today: { method: 'GET', path: '/check-today' }
      },
      system: {
        health: { method: 'GET', path: '/health' },
        docs: { method: 'GET', path: '/docs' }
      }
    },
    rate_limits: {
      general: '100 requests per 15 minutes',
      downloads: '10 requests per hour',
      historical_downloads: '3 requests per day',
      scheduler_config: '20 requests per hour',
      manual_trigger: '5 requests per hour'
    },
    error_codes: Object.keys({
      'SCHEME_NOT_FOUND': 404,
      'SCHEME_ALREADY_BOOKMARKED': 409,
      'BOOKMARK_NOT_FOUND': 404,
      'HISTORICAL_DOWNLOAD_COMPLETED': 409,
      'INVALID_DATE_RANGE': 400,
      'AMFI_API_ERROR': 503,
      'RATE_LIMIT_EXCEEDED': 429,
      'SCHEDULER_CONFIG_NOT_FOUND': 404,
      'INVALID_CRON_EXPRESSION': 400,
      'SCHEDULER_ALREADY_EXISTS': 409,
      'N8N_WEBHOOK_FAILED': 502,
      'SCHEDULER_NOT_ENABLED': 400,
      'BOOKMARK_ACCESS_DENIED': 403,
      'INVALID_DOWNLOAD_STATUS': 400,
      'NAV_DATA_NOT_AVAILABLE': 404
    })
  };

  res.json({
    success: true,
    data: apiDocs
  });
});

export default router;