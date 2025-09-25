// backend/src/server.ts

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

// Import database connection
import { testConnection } from './config/database';

// Import logs controller and simple logger
import { LogsController } from './controllers/logs.controller';
import { SimpleLogger } from './services/simpleLogger.service';

// Load environment variables
dotenv.config();

// Create Express app
const app: Application = express();
const PORT = process.env.PORT || 8080;

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
  max: 100, // Limit each IP to 100 requests per windowMs
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
      schemes: true,
      import: true,
      staging: true,
      logs: true,
      nav: true,
      n8n: !!process.env.N8N_BASE_URL || !!process.env.N8N_WEBHOOK_URL
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
      import: '/api/import',
      logs: '/api/logs',
      nav: '/api/nav'
    }
  });
});

// ============ REGISTER API ROUTES ============
app.use('/api/auth', authRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/schemes', schemeRoutes);
app.use('/api/import', importRoutes);
app.use('/api/nav', navRoutes);

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
      'GET /api/customers/:id',
      'PUT /api/customers/:id',
      'DELETE /api/customers/:id',
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
      
      // NAV endpoints
      'GET /api/nav/schemes/search',
      'GET /api/nav/bookmarks',
      'POST /api/nav/bookmarks',
      'PUT /api/nav/bookmarks/:id',
      'DELETE /api/nav/bookmarks/:id',
      'GET /api/nav/data',
      'GET /api/nav/schemes/:id/latest',
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

// Start server
app.listen(PORT, async () => {
  console.log(`
╔════════════════════════════════════════╗
║                                        ║
║     KewalInvest Backend Server         ║
║                                        ║
╠════════════════════════════════════════╣
║  Status: ✅ Running                    ║
║  Port: ${PORT}                            ║
║  Environment: ${process.env.NODE_ENV || 'development'}          ║
║  Time: ${new Date().toLocaleString()}         ║
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
║  • GET  /api/customers/:id             ║
║  • PUT  /api/customers/:id             ║
║  • DELETE /api/customers/:id           ║
║  • POST /api/customers/:id/addresses   ║
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
║  NAV Tracking:                         ║
║  • GET  /api/nav/schemes/search        ║
║  • GET  /api/nav/bookmarks             ║
║  • POST /api/nav/bookmarks             ║
║  • GET  /api/nav/data                  ║
║  • POST /api/nav/download/daily        ║
║  • POST /api/nav/download/historical   ║
║  • GET  /api/nav/download/progress/:id ║
║  • GET  /api/nav/statistics            ║
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
    console.log('✅ Scheme management endpoints ready');
    console.log('✅ NAV tracking endpoints ready');
    console.log('✅ Import & ETL endpoints ready (using express-fileupload)');
    console.log('✅ Staging table system ready');
    console.log('✅ System logs endpoints ready');
    
    // Check N8N configuration
    if (process.env.N8N_BASE_URL || process.env.N8N_WEBHOOK_URL) {
      console.log('✅ N8N integration configured');
    } else {
      console.log('⚠️  N8N integration not configured (N8N_BASE_URL/N8N_WEBHOOK_URL missing)');
    }
    
    // Check and create file storage directories
    const fs = require('fs');
    const path = require('path');
    
    // Define all required directories
    const directories = [
      'UserFiles',
      'UserFiles/customers',
      'UserFiles/customers/pending',
      'UserFiles/customers/processed',
      'UserFiles/transactions',
      'UserFiles/transactions/pending',
      'UserFiles/transactions/processed',
      'UserFiles/schemes',
      'UserFiles/schemes/pending',
      'UserFiles/schemes/processed'
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
    
  } catch (error) {
    console.error('❌ Failed to connect to database:', error);
  }
});