// backend/src/server.ts
// UPDATED: Added bookmark routes and time-series analytics route
// UPDATED: Added Jobs Scheduler and Cruise Control routes
// UPDATED: Added Portfolio Snapshot operations routes
// UPDATED: Added Market Analysis bulk metrics calculation

import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';

// Import routes
import authRoutes from './routes/auth.routes';
import contactRoutes from './routes/contact.routes';
import customerRoutes from './routes/customer.routes';
import importRoutes from './routes/import.routes';
import schemeRoutes from './routes/scheme.routes';
import navRoutes from './routes/nav.routes';
import transactionRoutes from './routes/transaction.routes';
import portfolioRoutes from './routes/portfolio.routes';
import jtbdRoutes from './routes/jtbd.routes';
import jtbdUnifiedRoutes from './routes/jtbd.unified.routes'; // NEW: Unified JTBD (configs + executions)
import marketRoutes from './routes/market.routes';
import marketAnalysisRoutes from './routes/marketAnalysis.routes';
import goalRoutes from './routes/goal.routes';
import userPreferencesRoutes from './routes/userPreferences.routes';
import schemeAnalysisRoutes from './routes/schemeAnalysis.routes';
import familyRoutes from './routes/family.routes';
import schemeAliasRoutes from './routes/schemeAlias.routes';
import bookmarkRoutes from './routes/bookmark.routes';
import jobsRoutes from './routes/jobs.routes';
import cruiseControlRoutes from './routes/cruiseControl.routes';
import assetTypeRoutes from './routes/assetType.routes';
import customerAssetRoutes from './routes/customerAsset.routes';
import investmentPlanRoutes from './routes/investmentPlan.routes';
import goalInvestmentAllocationRoutes from './routes/goalInvestmentAllocation.routes'; // Release 1.1 - Phase 2
import networthRoutes from './routes/networth.routes'; // Release 1.1 - Cycle 2: NetworthViewer
import dashboardRoutes from './routes/dashboard.routes'; // Main Dashboard API

// Import database connection
import { testConnection } from './config/database';

// Import logs controller and simple logger
import { LogsController } from './controllers/logs.controller';
import { SimpleLogger } from './services/simpleLogger.service';

// CHANGED: Remove problematic import, use dynamic import instead
// OLD: import { NavSchedulerService } from './services/navScheduler.service';

// Load environment variables
dotenv.config();

// Create Express app
const app: Application = express();
const PORT = process.env.PORT || 8080;

// CHANGED: Declare without import
let navScheduler: any;

// Initialize controllers
const logsController = new LogsController();

// Middleware
app.use(helmet()); // Security headers
app.use(compression()); // Compress responses

// CORS configuration with proper headers for authentication
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'X-Tenant-ID', 
    'X-Environment'
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS']
}));

// Body parsing middleware - IMPORTANT: express-fileupload is configured in import.routes.ts
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10000, // Limit each IP to 10000 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});

// Apply rate limiter to all API routes except import
app.use('/api', (req, res, next) => {
  if (req.path.startsWith('/import/')) {
    return next();
  }
  return limiter(req, res, next);
});

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'OK',
    message: 'KewalInvest Backend is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    features: {
      contacts: true,
      customers: true,
      customer_bookmarks: true,
      customer_activation: true,
      customer_family_accounts: true,
      schemes: true,
      transactions: true,
      portfolio: true,
      import: true,
      staging: true,
      import_customer_name_lookup: true, // NEW: Customer lookup by name with PAN tiebreaker
      import_two_phase_processing: true, // NEW: Staged processing with restart capability
      import_record_editing: true, // NEW: Edit and reprocess failed/orphan records
      logs: true,
      nav: true,
      nav_enhanced_bookmarks: true,
      nav_bookmark_gaps: true,
      nav_scheduler: !!navScheduler,
      nav_timeseries_analytics: true, // NEW: Time series analytics
      bookmarks: true, // NEW: Bookmark import and management
      bookmark_import: true, // NEW: Bookmark CSV/Excel import
      bookmark_templates: true, // NEW: Downloadable bookmark templates
      market_data: true,
      market_indices: true,
      market_downloads: true,
      market_analysis: true,
      market_analysis_metrics: true,
      market_analysis_bulk_metrics: true, // NEW: Bulk metrics calculation for multiple indices
      market_analysis_dashboard: true,
      market_analysis_returns: true,
      market_analysis_volatility: true,
      scheme_analysis: true,
      scheme_analysis_metrics: true,
      scheme_analysis_batch: true,
      jtbd: true,
      jtbd_dashboard: true,
      jtbd_unified: true, // NEW: Unified JTBD with configs + executions + meetings
      jtbd_executions: true, // NEW: Meeting and SIP plan execution tracking
      jtbd_timeline: true, // NEW: Timeline view for customer jobs
      goals: true,
      goal_recalculation: true,
      goal_history: true,
      goal_tracking_status: true, // NEW: Goal tracking with performance %
      goal_watchlist: true, // NEW: Auto-watchlist for underperforming goals
      asset_allocation_utilization: true, // NEW: Show scheme allocation to goals
      user_preferences: true,
      chart_preferences: true,
      default_comparison_index: true, // NEW: Default index for performance charts
      customer_meetings: true, // NEW: Customer meeting management
      meeting_summary: true, // NEW: Meeting summary and upcoming
      scheme_aliases: true, // NEW: Scheme alias management for flexible imports
      jobs_scheduler: true,
      cruise_control_snapshots: true,
      cruise_control_snapshot_operations: true, // NEW: Snapshot operations (drop, generate, update, regenerate)
      n8n: !!process.env.N8N_BASE_URL || !!process.env.N8N_WEBHOOK_URL,
      // Release 1.1 - Phase 1: Multi-Asset Portfolio
      asset_types: true,
      customer_asset_assignments: true,
      family_asset_aggregation: true,
      // Release 1.1 - Cycle 2: NetworthViewer
      networth_viewer: true,
      networth_summary: true,
      networth_history: true,
      networth_breakdown: true,
      networth_goals: true
    }
  });
});

// Base route
app.get('/', (_req: Request, res: Response) => {
  res.json({
    message: 'Welcome to KewalInvest API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      api: '/api'
    }
  });
});

// API routes overview
app.get('/api', (_req: Request, res: Response) => {
  res.json({
    message: 'API endpoint',
    availableRoutes: {
      auth: '/api/auth',
      contacts: '/api/contacts',
      customers: '/api/customers',
      schemes: '/api/schemes',
      transactions: '/api/transactions',
      portfolio: '/api/portfolio',
      import: '/api/import',
      logs: '/api/logs',
      nav: '/api/nav',
      bookmarks: '/api/bookmarks',
      market: '/api/market',
      market_analysis: '/api/market-analysis',
      scheme_analysis: '/api/scheme-analysis',
      scheme_aliases: '/api/scheme-aliases',
      jtbd: '/api/jtbd',
      goals: '/api/goals',
      user_preferences: '/api/user-preferences',
      meetings: '/api/meetings',
      jobs: '/api/jobs',
      cruise_control: '/api/cruise-control',
      cruise_control_operations: '/api/cruise-control/snapshots/operations',
      networth: '/api/networth'
    }
  });
});

// ============ REGISTER API ROUTES ============
app.use('/api/auth', authRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/schemes', schemeRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/portfolio', portfolioRoutes);
app.use('/api/import', importRoutes);
app.use('/api/nav', navRoutes);
app.use('/api/bookmarks', bookmarkRoutes);
app.use('/api/market', marketRoutes);
app.use('/api/market-analysis', marketAnalysisRoutes);
app.use('/api/scheme-analysis', schemeAnalysisRoutes);
app.use('/api/scheme-aliases', schemeAliasRoutes);
app.use('/api/jtbd', jtbdRoutes); // OLD: Will be deprecated - use jtbd-v2 for new features
app.use('/api/jtbd-v2', jtbdUnifiedRoutes); // NEW: Unified JTBD (configs + executions, meetings consolidated)
app.use('/api/goals', goalRoutes);
app.use('/api/user-preferences', userPreferencesRoutes);
// OLD: app.use('/api/meetings', meetingRoutes); // REMOVED: Replaced by /api/jtbd-v2
app.use('/api/family', familyRoutes);
app.use('/api/jobs', jobsRoutes);
app.use('/api/cruise-control', cruiseControlRoutes);
app.use('/api/asset-types', assetTypeRoutes); // Release 1.1 - Phase 1: Asset Types (master data)
app.use('/api', investmentPlanRoutes); // Release 1.1 - Phase 1: Investment Plans (full CRUD)
app.use('/api', goalInvestmentAllocationRoutes); // Release 1.1 - Phase 2: Goal-Investment Allocations
app.use('/api/networth', networthRoutes); // Release 1.1 - Cycle 2: NetworthViewer APIs
app.use('/api/dashboard', dashboardRoutes); // Main Dashboard API

// System logs routes
app.get('/api/logs', logsController.getLogs);
app.get('/api/logs/stats', logsController.getLogStats);
app.delete('/api/logs/cleanup', logsController.clearOldLogs);
app.post('/api/logs/frontend-error', logsController.logFrontendError);

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Cannot ${_req.method} ${_req.url}`,
    availableEndpoints: [
      'GET /health',
      'GET /api',
      
      // Auth endpoints
      'POST /api/auth/login',
      'POST /api/auth/register',
      'GET /api/auth/me',
      'POST /api/auth/change-password',
      'GET /api/auth/environment',
      
      // Contact endpoints
      'GET /api/contacts',
      'POST /api/contacts',
      'GET /api/contacts/stats',
      'GET /api/contacts/search/:query',
      'GET /api/contacts/check-exists',
      'GET /api/contacts/export',
      'POST /api/contacts/bulk',
      'GET /api/contacts/:id',
      'PUT /api/contacts/:id',
      'DELETE /api/contacts/:id',
      'POST /api/contacts/:id/convert-to-customer',
      'POST /api/contacts/:id/channels',
      'PUT /api/contacts/:id/channels/:channelId',
      'DELETE /api/contacts/:id/channels/:channelId',
      'PUT /api/contacts/:id/channels/:channelId/primary',
      
      // Customer endpoints
      'GET /api/customers',
      'POST /api/customers',
      'GET /api/customers/stats',
      'GET /api/customers/bookmark-reasons',
      'GET /api/customers/family/:familyCode',
      'GET /api/customers/:id',
      'PUT /api/customers/:id',
      'DELETE /api/customers/:id',
      'PUT /api/customers/:id/activate',
      'POST /api/customers/:id/bookmark',
      'PATCH /api/customers/:id/bookmark',
      'DELETE /api/customers/:id/bookmark',
      'POST /api/customers/:id/addresses',
      'PUT /api/customers/:id/addresses/:addressId',
      'DELETE /api/customers/:id/addresses/:addressId',
      
      // Scheme endpoints
      'GET /api/schemes',
      'GET /api/schemes/types',
      'GET /api/schemes/categories',
      'GET /api/schemes/masters',
      'GET /api/schemes/:schemeCode',
      'POST /api/schemes',
      'PUT /api/schemes/:schemeCode',
      'POST /api/schemes/validate-isin',
      
      // Transaction endpoints
      'GET /api/transactions',
      'GET /api/transactions/summary',
      'GET /api/transactions/:id',
      'POST /api/transactions',
      'PUT /api/transactions/:id',
      'PATCH /api/transactions/:id/portfolio-flag',
      'DELETE /api/transactions/:id',
      
      // Portfolio endpoints
      'GET /api/portfolio/holdings',
      'GET /api/portfolio/statistics',
      'POST /api/portfolio/refresh',
      'GET /api/portfolio/:customerId',
      'GET /api/portfolio/:customerId/totals',
      'GET /api/portfolio/:customerId/scheme/:schemeCode',
      
      // Import endpoints
      'POST /api/import/upload',
      'GET /api/import/headers/:fileId',
      'POST /api/import/validate-mapping',
      'POST /api/import/process',
      'GET /api/import/status/:sessionId',
      'GET /api/import/results/:sessionId',
      'POST /api/import/cancel/:sessionId',
      'GET /api/import/templates',
      'POST /api/import/templates',
      'PUT /api/import/templates/:templateId',
      'DELETE /api/import/templates/:templateId',
      'GET /api/import/sessions',
      'GET /api/import/export-errors/:sessionId',
      'POST /api/import/n8n-callback',
      'GET /api/import/file-info/:fileId',
      'DELETE /api/import/file/:fileId',
      
      // Staging endpoints
      'GET /api/import/staging/:sessionId/status',
      'GET /api/import/staging/:sessionId/records',
      'POST /api/import/staging/:sessionId/retry',

      // Session restart and record reprocessing endpoints
      'POST /api/import/restart/:sessionId',
      'PUT /api/import/staging/:stagingId/edit',
      'POST /api/import/staging/:stagingId/reprocess',
      'POST /api/import/session/:sessionId/bulk-reprocess',
      
      // NAV endpoints
      'GET /api/nav/schemes/search',
      'GET /api/nav/bookmarks',
      'POST /api/nav/bookmarks',
      'PUT /api/nav/bookmarks/:id',
      'DELETE /api/nav/bookmarks/:id',
      'GET /api/nav/bookmarks/:id/nav-data',
      'GET /api/nav/bookmarks/:id/stats',
      'PUT /api/nav/bookmarks/:id/download-status',
      'GET /api/nav/bookmark-gaps',
      'GET /api/nav/bookmark-gaps/customer/:customerId',
      'GET /api/nav/bookmark-gaps/summary',
      'GET /api/nav/data',
      'GET /api/nav/schemes/:id/latest',
      'GET /api/nav/timeseries/:schemeId', // NEW: Time series analytics
      'POST /api/nav/download/daily',
      'POST /api/nav/download/historical',
      'GET /api/nav/download/progress/:jobId',
      'GET /api/nav/download/jobs',
      'DELETE /api/nav/download/jobs/:jobId',
      'GET /api/nav/download/active',
      'GET /api/nav/statistics',
      'GET /api/nav/check-today',
      'GET /api/nav/health',
      'POST /api/nav/n8n-callback',
      
      // NAV Scheduler endpoints
      'GET /api/nav/scheduler/config',
      'POST /api/nav/scheduler/config',
      'PUT /api/nav/scheduler/config/:id',
      'DELETE /api/nav/scheduler/config',
      'GET /api/nav/scheduler/status',
      'POST /api/nav/scheduler/trigger',
      'GET /api/nav/scheduler/all-active',
      
      // Bookmark endpoints
      'POST /api/bookmarks/import',
      'GET /api/bookmarks/stats',
      'GET /api/bookmarks/list',
      'GET /api/bookmarks/check',
      'DELETE /api/bookmarks/:id',
      'GET /api/bookmarks/template',
      
      // Market Data endpoints
      'GET /api/market/indices',
      'GET /api/market/indices/:id',
      'GET /api/market/data/:indexId',
      'GET /api/market/data/:indexId/latest',
      'DELETE /api/market/data/:indexId',
      'POST /api/market/download/historical',
      'POST /api/market/download/eod',
      'POST /api/market/download/eod-all',
      'GET /api/market/statistics',
      'GET /api/market/health',
      
      // Market Analysis endpoints
      'GET /api/market-analysis/health',
      'POST /api/market-analysis/calculate-metrics/:indexId',
      'POST /api/market-analysis/bulk-calculate-metrics', // NEW: Bulk metrics calculation
      'GET /api/market-analysis/metrics/:indexId',
      'GET /api/market-analysis/dashboard-statistics',
      'GET /api/market-analysis/index-returns',
      'GET /api/market-analysis/index-volatility/:indexId',
      
      // Scheme Analysis endpoints
      'GET /api/scheme-analysis/health',
      'POST /api/scheme-analysis/calculate-metrics/:schemeId',
      'GET /api/scheme-analysis/metrics/:schemeId',
      'POST /api/scheme-analysis/batch-calculate',
      
      // JTBD endpoints
      'POST /api/jtbd',
      'GET /api/jtbd/customer/:customerId',
      'GET /api/jtbd/:id',
      'PUT /api/jtbd/:id',
      'DELETE /api/jtbd/:id',
      'PATCH /api/jtbd/:id/toggle',
      'GET /api/jtbd/dashboard/overview',
      'GET /api/jtbd/dashboard/customers-without-jtbd',
      'GET /api/jtbd/dashboard/upcoming-alerts',
      'GET /api/jtbd/dashboard/alerts-by-date',
      'GET /api/jtbd/dashboard/communication-queue',
      'GET /api/jtbd/customer/:customerId/summary',
      'GET /api/jtbd/schemes/:customerId',
      'GET /api/jtbd/transaction-types',
      'GET /api/jtbd/:id/occurrences',
      
      // Goal endpoints
      'POST /api/goals',
      'GET /api/goals/customer/:customerId',
      'GET /api/goals/:id',
      'PUT /api/goals/:id',
      'DELETE /api/goals/:id',
      'POST /api/goals/:id/recalculate',
      'POST /api/goals/customer/:customerId/recalculate',
      'GET /api/goals/customer/:customerId/summary',
      'GET /api/goals/:id/history',
      
      // User Preferences endpoints
      'GET /api/user-preferences/chart',
      'GET /api/user-preferences/chart/:indexId',
      'POST /api/user-preferences/chart/:indexId',
      'DELETE /api/user-preferences/chart/:indexId',
      
      // Jobs Scheduler endpoints
      'GET /api/jobs/types',
      'GET /api/jobs/:jobType/config',
      'POST /api/jobs/:jobType/config',
      'PUT /api/jobs/:jobType/config',
      'POST /api/jobs/:jobType/execute',
      'GET /api/jobs/:jobType/executions',
      'GET /api/jobs/:jobType/statistics',
      'GET /api/jobs/:jobType/health',
      
      // Cruise Control - Portfolio Snapshots
      'GET /api/cruise-control/snapshots/config',
      'POST /api/cruise-control/snapshots/config',
      'PUT /api/cruise-control/snapshots/config',
      'POST /api/cruise-control/snapshots/execute',
      'GET /api/cruise-control/snapshots/executions',
      'GET /api/cruise-control/snapshots/statistics',
      'GET /api/cruise-control/snapshots/health',
      'POST /api/cruise-control/snapshots/backfill-smart',
      'POST /api/cruise-control/snapshots/backfill',
      
      // Cruise Control - Snapshot Operations (NEW)
      'POST /api/cruise-control/snapshots/operations/drop-all',
      'POST /api/cruise-control/snapshots/operations/generate-missing',
      'POST /api/cruise-control/snapshots/operations/update-all',
      'POST /api/cruise-control/snapshots/operations/regenerate-all',
      
      // NetworthViewer endpoints (Release 1.1 - Cycle 2)
      'GET /api/networth/summary',
      'GET /api/networth/history',
      'GET /api/networth/breakdown',
      'GET /api/networth/goals',
      'GET /api/networth/health',

      // System logs endpoints
      'GET /api/logs',
      'GET /api/logs/stats',
      'DELETE /api/logs/cleanup',
      'POST /api/logs/frontend-error'
    ]
  });
});

// Global error handler with logging
app.use((err: any, req: Request, res: Response, _next: NextFunction): void => {
  const errorId = Date.now().toString(36) + Math.random().toString(36);
  const statusCode = err.status || err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  // Log to both console (existing behavior) AND database
  console.error('Error:', err);
  SimpleLogger.error('Express', message, req.path, {
    errorId,
    statusCode,
    method: req.method,
    url: req.originalUrl,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    body: req.method !== 'GET' ? req.body : undefined,
    query: req.query,
    params: req.params
  }, (req as any).user?.user_id, (req as any).user?.tenant_id, err.stack);
  
  // Handle file upload errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    res.status(400).json({
      success: false,
      error: 'File size too large. Maximum size is 10MB.',
      errorId
    });
    return;
  }
  
  if (err.message && err.message.includes('Invalid file type')) {
    res.status(400).json({
      success: false,
      error: err.message,
      errorId
    });
    return;
  }

  if (err.message && err.message.includes('Invalid import type')) {
    res.status(400).json({
      success: false,
      error: err.message,
      errorId
    });
    return;
  }
  
  res.status(statusCode).json({
    success: false,
    error: message,
    errorId,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// CHANGED: Updated graceful shutdown handlers
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down NAV scheduler gracefully...');
  try {
    if (navScheduler && navScheduler.shutdownSchedulers) {
      await navScheduler.shutdownSchedulers();
      console.log('NAV Scheduler shut down successfully');
    }
  } catch (error) {
    console.error('Error shutting down NAV scheduler:', error);
  } finally {
    process.exit(0);
  }
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down NAV scheduler gracefully...');
  try {
    if (navScheduler && navScheduler.shutdownSchedulers) {
      await navScheduler.shutdownSchedulers();
      console.log('NAV Scheduler shut down successfully');
    }
  } catch (error) {
    console.error('Error shutting down NAV scheduler:', error);
  } finally {
    process.exit(0);
  }
});

// CHANGED: Use dynamic import in server startup
app.listen(PORT, async () => {
  console.log(`
╔════════════════════════════════════════╗
║                                        ║
║     KewalInvest Backend Server         ║
║                                        ║
╠════════════════════════════════════════╣
║  Status: ✅ Running                    ║
║  Port: ${PORT.toString().padEnd(29)}║
║  Environment: ${(process.env.NODE_ENV || 'development').padEnd(21)}║
║  Time: ${new Date().toLocaleString().padEnd(25)}║
║                                        ║
║  📋 Available Routes:                  ║
║  • GET  /health                        ║
║                                        ║
║  Auth:                                 ║
║  • POST /api/auth/login                ║
║  • POST /api/auth/register             ║
║  • GET  /api/auth/me                   ║
║  • POST /api/auth/change-password      ║
║  • GET  /api/auth/environment          ║
║                                        ║
║  Contacts:                             ║
║  • GET  /api/contacts                  ║
║  • POST /api/contacts                  ║
║  • GET  /api/contacts/stats            ║
║  • GET  /api/contacts/search/:query    ║
║  • GET  /api/contacts/:id              ║
║  • PUT  /api/contacts/:id              ║
║  • DELETE /api/contacts/:id            ║
║  • POST /api/contacts/:id/convert      ║
║  • POST /api/contacts/:id/channels     ║
║                                        ║
║  Customers:                            ║
║  • GET  /api/customers                 ║
║  • POST /api/customers                 ║
║  • GET  /api/customers/stats           ║
║  • GET  /api/customers/bookmark-reasons║
║  • GET  /api/customers/family/:code    ║
║  • GET  /api/customers/:id             ║
║  • PUT  /api/customers/:id             ║
║  • DELETE /api/customers/:id           ║
║  • PUT  /api/customers/:id/activate    ║
║  • POST /api/customers/:id/bookmark    ║
║  • PATCH /api/customers/:id/bookmark   ║
║  • DELETE /api/customers/:id/bookmark  ║
║  • POST /api/customers/:id/addresses   ║
║  • PUT  /api/customers/:id/addresses/..║
║  • DELETE /api/customers/:id/addresses/║
║                                        ║
║  Schemes:                              ║
║  • GET  /api/schemes                   ║
║  • GET  /api/schemes/types             ║
║  • GET  /api/schemes/categories        ║
║  • GET  /api/schemes/masters           ║
║  • GET  /api/schemes/:schemeCode       ║
║  • POST /api/schemes                   ║
║  • PUT  /api/schemes/:schemeCode       ║
║                                        ║
║  Transactions:                         ║
║  • GET  /api/transactions              ║
║  • GET  /api/transactions/summary      ║
║  • GET  /api/transactions/:id          ║
║  • POST /api/transactions              ║
║  • PUT  /api/transactions/:id          ║
║  • PATCH /api/transactions/:id/...     ║
║  • DELETE /api/transactions/:id        ║
║                                        ║
║  Portfolio:                            ║
║  • GET  /api/portfolio/holdings        ║
║  • GET  /api/portfolio/statistics      ║
║  • POST /api/portfolio/refresh         ║
║  • GET  /api/portfolio/:customerId     ║
║  • GET  /api/portfolio/:id/totals      ║
║  • GET  /api/portfolio/:id/scheme/:sc  ║
║                                        ║
║  NAV Tracking:                         ║
║  • GET  /api/nav/schemes/search        ║
║  • GET  /api/nav/bookmarks             ║
║  • POST /api/nav/bookmarks             ║
║  • GET  /api/nav/data                  ║
║  • GET  /api/nav/timeseries/:schemeId  ║
║  • POST /api/nav/download/daily        ║
║  • POST /api/nav/download/historical   ║
║  • GET  /api/nav/download/progress/:id ║
║  • GET  /api/nav/statistics            ║
║                                        ║
║  📋 Enhanced Bookmarks:                ║
║  • GET  /api/nav/bookmarks/:id/nav-data║
║  • GET  /api/nav/bookmarks/:id/stats   ║
║  • PUT  /api/nav/bookmarks/:id/download║
║                                        ║
║  🔍 Bookmark Gap Detection:            ║
║  • GET  /api/nav/bookmark-gaps         ║
║  • GET  /api/nav/bookmark-gaps/cust/:id║
║  • GET  /api/nav/bookmark-gaps/summary ║
║                                        ║
║  🔖 Bookmark Import & Management:      ║
║  • POST /api/bookmarks/import          ║
║  • GET  /api/bookmarks/stats           ║
║  • GET  /api/bookmarks/list            ║
║  • GET  /api/bookmarks/check           ║
║  • DELETE /api/bookmarks/:id           ║
║  • GET  /api/bookmarks/template        ║
║                                        ║
║  📅 NAV Scheduler:                     ║
║  • GET  /api/nav/scheduler/config      ║
║  • POST /api/nav/scheduler/config      ║
║  • GET  /api/nav/scheduler/status      ║
║  • POST /api/nav/scheduler/trigger     ║
║                                        ║
║  📊 Market Data:                       ║
║  • GET  /api/market/indices            ║
║  • GET  /api/market/indices/:id        ║
║  • GET  /api/market/data/:indexId      ║
║  • GET  /api/market/data/:id/latest    ║
║  • DELETE /api/market/data/:indexId    ║
║  • POST /api/market/download/historical║
║  • POST /api/market/download/eod       ║
║  • POST /api/market/download/eod-all   ║
║  • GET  /api/market/statistics         ║
║  • GET  /api/market/health             ║
║                                        ║
║  📈 Market Analysis:                   ║
║  • GET  /api/market-analysis/health    ║
║  • POST /api/market-analysis/calc/:id  ║
║  • POST /api/market-analysis/bulk-calc ║
║  • GET  /api/market-analysis/metrics   ║
║  • GET  /api/market-analysis/dashboard ║
║  • GET  /api/market-analysis/returns   ║
║  • GET  /api/market-analysis/volatility║
║                                        ║
║  📊 Scheme Analysis:                   ║
║  • GET  /api/scheme-analysis/health    ║
║  • POST /api/scheme-analysis/calc/:id  ║
║  • GET  /api/scheme-analysis/metrics/:i║
║  • POST /api/scheme-analysis/batch-calc║
║                                        ║
║  🎯 JTBD:                              ║
║  • POST /api/jtbd                      ║
║  • GET  /api/jtbd/customer/:customerId ║
║  • GET  /api/jtbd/:id                  ║
║  • PUT  /api/jtbd/:id                  ║
║  • DELETE /api/jtbd/:id                ║
║  • PATCH /api/jtbd/:id/toggle          ║
║                                        ║
║  📊 JTBD Dashboard:                    ║
║  • GET  /api/jtbd/dashboard/overview   ║
║  • GET  /api/jtbd/dashboard/customers..║
║  • GET  /api/jtbd/dashboard/upcoming.. ║
║  • GET  /api/jtbd/dashboard/alerts-by..║
║  • GET  /api/jtbd/dashboard/comm-queue ║
║  • GET  /api/jtbd/customer/:id/summary ║
║  • GET  /api/jtbd/schemes/:customerId  ║
║  • GET  /api/jtbd/transaction-types    ║
║  • GET  /api/jtbd/:id/occurrences      ║
║                                        ║
║  🎯 Goals:                             ║
║  • POST /api/goals                     ║
║  • GET  /api/goals/customer/:id        ║
║  • GET  /api/goals/:id                 ║
║  • PUT  /api/goals/:id                 ║
║  • DELETE /api/goals/:id               ║
║  • POST /api/goals/:id/recalculate     ║
║  • POST /api/goals/customer/:id/recalc ║
║  • GET  /api/goals/customer/:id/summary║
║  • GET  /api/goals/:id/history         ║
║                                        ║
║  ⚙️  User Preferences:                 ║
║  • GET  /api/user-preferences/chart    ║
║  • GET  /api/user-preferences/chart/:id║
║  • POST /api/user-preferences/chart/:id║
║  • DELETE /api/user-preferences/chart..║
║                                        ║
║  🔖 Customer Bookmarks:                ║
║  • GET  /api/customers/bookmark-reasons║
║  • POST /api/customers/:id/bookmark    ║
║  • PATCH /api/customers/:id/bookmark   ║
║  • DELETE /api/customers/:id/bookmark  ║
║                                        ║
║  ⏰ Jobs Scheduler:                    ║
║  • GET  /api/jobs/types                ║
║  • GET  /api/jobs/:jobType/config      ║
║  • POST /api/jobs/:jobType/config      ║
║  • PUT  /api/jobs/:jobType/config      ║
║  • POST /api/jobs/:jobType/execute     ║
║  • GET  /api/jobs/:jobType/executions  ║
║  • GET  /api/jobs/:jobType/statistics  ║
║  • GET  /api/jobs/:jobType/health      ║
║                                        ║
║  🚢 Cruise Control Snapshots:         ║
║  • GET  /api/cruise-control/snapshots..║
║  • POST /api/cruise-control/snapshots..║
║  • PUT  /api/cruise-control/snapshots..║
║  • POST /api/cruise-control/snapshots..║
║  • GET  /api/cruise-control/snapshots..║
║  • GET  /api/cruise-control/snapshots..║
║  • GET  /api/cruise-control/snapshots..║
║  • POST /api/cruise-control/snapshots..║
║  • POST /api/cruise-control/snapshots..║
║                                        ║
║  🔧 Snapshot Operations (NEW):        ║
║  • POST /api/cruise-control/snapshots..║
║         /operations/drop-all           ║
║  • POST /api/cruise-control/snapshots..║
║         /operations/generate-missing   ║
║  • POST /api/cruise-control/snapshots..║
║         /operations/update-all         ║
║  • POST /api/cruise-control/snapshots..║
║         /operations/regenerate-all     ║
║                                        ║
║  Import & ETL:                         ║
║  • POST /api/import/upload             ║
║  • GET  /api/import/headers/:fileId    ║
║  • POST /api/import/validate-mapping   ║
║  • POST /api/import/process            ║
║  • GET  /api/import/status/:sessionId  ║
║  • GET  /api/import/results/:sessionId ║
║  • POST /api/import/cancel/:sessionId  ║
║  • GET  /api/import/templates          ║
║  • POST /api/import/templates          ║
║  • GET  /api/import/sessions           ║
║  • GET  /api/import/file-info/:fileId  ║
║  • DELETE /api/import/file/:fileId     ║
║                                        ║
║  Staging:                              ║
║  • GET  /api/import/staging/:id/status ║
║  • GET  /api/import/staging/:id/records║
║  • POST /api/import/staging/:id/retry  ║
║                                        ║
║  Import Restart & Reprocess:           ║
║  • POST /api/import/restart/:sessionId ║
║  • PUT  /api/import/staging/:id/edit   ║
║  • POST /api/import/staging/:id/reprocess
║  • POST /api/import/session/:id/bulk...║
║                                        ║
║  System Logs:                          ║
║  • GET  /api/logs                      ║
║  • GET  /api/logs/stats                ║
║  • DELETE /api/logs/cleanup            ║
║  • POST /api/logs/frontend-error       ║
╚════════════════════════════════════════╝
  `);
  
  // Test database connection
  try {
    await testConnection();
    console.log('✅ Database connected successfully');
    console.log('✅ Contact management endpoints ready');
    console.log('✅ Customer management endpoints ready');
    console.log('✅ Customer bookmark system ready');
    console.log('✅ Customer activation feature ready');
    console.log('✅ Customer family accounts ready');
    console.log('✅ Scheme management endpoints ready');
    console.log('✅ Transaction management endpoints ready');
    console.log('✅ Portfolio tracking endpoints ready');
    console.log('✅ NAV tracking endpoints ready');
    console.log('✅ NAV time-series analytics ready'); // NEW
    console.log('✅ Enhanced bookmark endpoints ready');
    console.log('✅ Bookmark gap detection ready');
    console.log('✅ Bookmark import and management ready'); // NEW
    console.log('✅ Bookmark CSV/Excel import ready'); // NEW
    console.log('✅ Bookmark template downloads ready'); // NEW
    console.log('✅ Market data endpoints ready');
    console.log('✅ Market indices management ready');
    console.log('✅ Market data downloads ready');
    console.log('✅ Market analysis endpoints ready');
    console.log('✅ Market analysis metrics endpoints ready');
    console.log('✅ Market analysis bulk metrics calculation ready'); // NEW
    console.log('✅ Market analysis dashboard endpoints ready');
    console.log('✅ Market analysis returns endpoints ready');
    console.log('✅ Market analysis volatility endpoints ready');
    console.log('✅ Scheme analysis endpoints ready');
    console.log('✅ Scheme analysis metrics calculation ready');
    console.log('✅ Scheme analysis batch processing ready');
    console.log('✅ JTBD endpoints ready');
    console.log('✅ JTBD Dashboard endpoints ready');
    console.log('✅ Goal management endpoints ready');
    console.log('✅ Goal recalculation ready');
    console.log('✅ Goal history tracking ready');
    console.log('✅ User preferences endpoints ready');
    console.log('✅ Chart preferences management ready');
    console.log('✅ Jobs Scheduler endpoints ready');
    console.log('✅ Cruise Control - Portfolio Snapshots ready');
    console.log('✅ Cruise Control - Snapshot Operations ready (drop/generate/update/regenerate)'); // NEW
    console.log('✅ Import & ETL endpoints ready (using express-fileupload)');
    console.log('✅ Staging table system ready');
    console.log('✅ Customer name-based lookup ready');
    console.log('✅ Two-phase import processing ready');
    console.log('✅ Import session restart capability ready');
    console.log('✅ Record editing and reprocessing ready');
    console.log('✅ System logs endpoints ready');
    
    // CHANGED: Dynamic import and initialization of NAV Scheduler Service
    try {
      console.log('📅 Initializing NAV Scheduler Service...');
      
      // Use dynamic import to avoid TypeScript compilation issues
      const { NavSchedulerService } = await import('./services/navScheduler.service');
      navScheduler = new NavSchedulerService();
      await navScheduler.initializeSchedulers();
      
      console.log('✅ NAV Scheduler Service initialized successfully');
    } catch (schedulerError: any) {
      console.error('⚠️  NAV Scheduler initialization failed:', schedulerError.message);
      console.log('📅 NAV Scheduler will be available but no active schedules will run');
      // Don't fail server startup if scheduler fails - just log the error
    }
    
    // Check N8N configuration
    if (process.env.N8N_BASE_URL || process.env.N8N_WEBHOOK_URL) {
      console.log('✅ N8N integration configured');
      console.log(`📡 N8N Base URL: ${process.env.N8N_BASE_URL || 'Not set'}`);
      console.log(`🔗 N8N Webhook: ${process.env.N8N_NAV_WEBHOOK_NAME || 'nav-download-trigger'}`);
    } else {
      console.log('⚠️  N8N integration not configured (N8N_BASE_URL/N8N_WEBHOOK_URL missing)');
      console.log('📅 Scheduler will be available but cannot trigger N8N workflows');
    }
    
    // Check and create file storage directories
    const fs = require('fs');
    const path = require('path');
    
    // Define all required directories (simplified - no pending/processed subfolders)
    const directories = [
      'UserFiles',
      'UserFiles/bookmarks',
      'UserFiles/customers',
      'UserFiles/transactions',
      'UserFiles/schemes',
      'uploads',
      'uploads/bookmarks'
    ];
    
    // Create directories if they don't exist
    directories.forEach(dir => {
      const dirPath = path.join(process.cwd(), dir);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
        console.log(`✅ Created directory: ${dir}`);
      }
    });
    
    console.log('✅ All file upload directories verified/created');
    
    // Final status summary
    console.log(`
╔════════════════════════════════════════╗
║          🎉 STARTUP COMPLETE 🎉        ║
╠════════════════════════════════════════╣
║  Database: ✅ Connected                ║
║  Transactions: ✅ Ready                ║
║  Portfolio: ✅ Ready                   ║
║  NAV Routes: ✅ Ready                  ║
║  NAV Time Series: ✅ Ready             ║
║  Enhanced Bookmarks: ✅ Ready          ║
║  Bookmark Gap Detection: ✅ Ready      ║
║  Bookmark Import: ✅ Ready             ║
║  Customer Bookmarks: ✅ Ready          ║
║  Customer Activation: ✅ Ready         ║
║  Customer Family Accounts: ✅ Ready    ║
║  Market Data: ✅ Ready                 ║
║  Market Indices: ✅ Ready              ║
║  Market Downloads: ✅ Ready            ║
║  Market Analysis: ✅ Ready             ║
║  Market Analysis Metrics: ✅ Ready     ║
║  Market Analysis Bulk Calc: ✅ Ready   ║
║  Market Analysis Dashboard: ✅ Ready   ║
║  Market Analysis Returns: ✅ Ready     ║
║  Market Analysis Volatility: ✅ Ready  ║
║  Scheme Analysis: ✅ Ready             ║
║  Scheme Analysis Metrics: ✅ Ready     ║
║  Scheme Analysis Batch: ✅ Ready       ║
║  JTBD: ✅ Ready                        ║
║  JTBD Dashboard: ✅ Ready              ║
║  Goals: ✅ Ready                       ║
║  Goal Recalculation: ✅ Ready          ║
║  Goal History: ✅ Ready                ║
║  User Preferences: ✅ Ready            ║
║  Chart Preferences: ✅ Ready           ║
║  Jobs Scheduler: ✅ Ready              ║
║  Cruise Control Snapshots: ✅ Ready    ║
║  Snapshot Operations: ✅ Ready         ║
║  NAV Scheduler: ${navScheduler ? '✅' : '⚠️ '} ${navScheduler ? 'Active' : 'Failed'}        ║
║  N8N Integration: ${process.env.N8N_BASE_URL ? '✅' : '⚠️ '} ${process.env.N8N_BASE_URL ? 'Configured' : 'Missing'}     ║
║  File Storage: ✅ Ready                ║
╚════════════════════════════════════════╝
    `);
    
  } catch (error) {
    console.error('❌ Failed to connect to database:', error);
    console.log('⚠️  Server started but database connection failed');
    console.log('📅 NAV Scheduler will not be initialized without database');
  }
});