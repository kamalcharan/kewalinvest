// backend/src/services/navDownload.service.ts
// File 6/14: Download orchestration with progress tracking and optimized direct AMFI calls

import { Pool } from 'pg';
import { pool } from '../config/database';
import { NavService } from './nav.service';
import { AmfiDataSourceService } from './amfiDataSource.service';
import { SimpleLogger } from './simpleLogger.service';
import {
  NavDownloadJob,
  CreateNavDownloadJobRequest,
  NavDownloadJobResult,
  N8nWebhookPayload,
  N8nCallbackPayload,
  ParsedNavRecord,
  NAV_ERROR_CODES
} from '../types/nav.types';

export interface DownloadProgressUpdate {
  jobId: number;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  progressPercentage: number;
  currentStep: string;
  processedSchemes: number;
  totalSchemes: number;
  processedRecords: number;
  estimatedTimeRemaining?: number; // in milliseconds
  errors?: Array<{ scheme_id: number; scheme_code: string; error: string }>;
  startTime: Date;
  lastUpdate: Date;
}

export interface DownloadLockInfo {
  jobId: number;
  lockType: 'daily' | 'historical' | 'weekly';
  lockedBy: number; // user_id
  lockedAt: Date;
  schemeIds: number[];
}

export class NavDownloadService {
  private db: Pool;
  private navService: NavService;
  private amfiService: AmfiDataSourceService;
  
  // In-memory locks to prevent race conditions
  private downloadLocks = new Map<string, DownloadLockInfo>();
  
  // Progress tracking for UI
  private progressUpdates = new Map<number, DownloadProgressUpdate>();
  
  // API configuration
  private readonly API_BASE_URL: string;

  constructor() {
    this.db = pool;
    this.navService = new NavService();
    this.amfiService = new AmfiDataSourceService();
    this.API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:8080';
  }

  // ==================== PUBLIC DOWNLOAD METHODS ====================

  /**
   * Trigger daily NAV download (idempotent)
   * Called by N8N daily trigger or manual UI action
   */
  async triggerDailyDownload(
    tenantId: number,
    isLive: boolean,
    userId: number
  ): Promise<{ jobId: number; message: string; alreadyExists?: boolean }> {
    const today = new Date().toISOString().split('T')[0];
    const lockKey = `daily_${tenantId}_${isLive}_${today}`;
    
    try {
      // Check for existing lock (prevent concurrent downloads)
      if (this.downloadLocks.has(lockKey)) {
        const existingLock = this.downloadLocks.get(lockKey)!;
        return {
          jobId: existingLock.jobId,
          message: 'Daily download already in progress',
          alreadyExists: true
        };
      }

      // Get all schemes with daily download enabled
      const bookmarks = await this.navService.getUserBookmarks(
        tenantId, 
        isLive, 
        userId, 
        { page: 1, page_size: 1000, daily_download_only: true }
      );

      if (bookmarks.bookmarks.length === 0) {
        throw new Error('No schemes configured for daily download');
      }

      const schemeIds = bookmarks.bookmarks.map(b => b.scheme_id);

      // Check if today's data already exists for all schemes
      const existingData = await this.navService.checkNavDataExists(
        tenantId,
        isLive,
        schemeIds,
        new Date()
      );

      const schemesWithoutData = schemeIds.filter(id => !existingData[id]);
      
      if (schemesWithoutData.length === 0) {
        return {
          jobId: 0,
          message: `Daily NAV data already exists for all ${schemeIds.length} tracked schemes`,
          alreadyExists: true
        };
      }

      // Create download job with correct property names
      const job = await this.navService.createDownloadJob(tenantId, isLive, userId, {
        job_type: 'daily',
        scheme_ids: schemesWithoutData,
        scheduled_date: new Date()
      });

      // Create download lock
      const lockInfo: DownloadLockInfo = {
        jobId: job.id,
        lockType: 'daily',
        lockedBy: userId,
        lockedAt: new Date(),
        schemeIds: schemesWithoutData
      };
      this.downloadLocks.set(lockKey, lockInfo);

      // Initialize progress tracking
      this.initializeProgressTracking(job.id, 'daily', schemesWithoutData.length);

      // Execute download asynchronously (DIRECT AMFI CALL - NO N8N)
      setImmediate(() => this.executeDownload(job.id, tenantId, isLive, userId));

      SimpleLogger.error('NavDownload', 'Daily download job created', 'triggerDailyDownload', {
        tenantId, userId, jobId: job.id, totalSchemes: schemesWithoutData.length,
        directAmfiCall: true
      }, userId, tenantId);

      return {
        jobId: job.id,
        message: `Daily download started for ${schemesWithoutData.length} schemes`
      };

    } catch (error: any) {
      // Clean up lock on error
      this.downloadLocks.delete(lockKey);
      
      SimpleLogger.error('NavDownload', 'Failed to trigger daily download', 'triggerDailyDownload', {
        tenantId, userId, error: error.message
      }, userId, tenantId, error.stack);
      
      throw error;
    }
  }

  /**
   * Trigger historical NAV download with progress tracking
   * For UI engagement during long downloads (4 months data)
   */
  async triggerHistoricalDownload(
    tenantId: number,
    isLive: boolean,
    userId: number,
    request: {
      schemeIds: number[];
      startDate: Date;
      endDate: Date;
    }
  ): Promise<{ jobId: number; message: string; estimatedTime: number }> {
    const lockKey = `historical_${tenantId}_${isLive}_${userId}_${request.schemeIds.join(',')}`;
    
    try {
      // Check for concurrent historical download by same user
      if (this.downloadLocks.has(lockKey)) {
        const existingLock = this.downloadLocks.get(lockKey)!;
        throw new Error(`Historical download already in progress (Job ID: ${existingLock.jobId})`);
      }

      // Validate date range (max 6 months)
      const daysDiff = Math.ceil((request.endDate.getTime() - request.startDate.getTime()) / (1000 * 60 * 60 * 24));
      if (daysDiff > 183) {
        throw new Error('Historical download limited to 6 months per request');
      }

      // Check if historical download already completed for any scheme
      for (const schemeId of request.schemeIds) {
        const bookmarks = await this.navService.getUserBookmarks(
          tenantId, 
          isLive, 
          userId,
          { page: 1, page_size: 1, search: schemeId.toString() }
        );

        if (bookmarks.bookmarks.length > 0 && bookmarks.bookmarks[0].historical_download_completed) {
          throw new Error(NAV_ERROR_CODES.HISTORICAL_DOWNLOAD_COMPLETED);
        }
      }

      // Estimate download time (rough calculation)
      const estimatedTimeMs = this.estimateDownloadTime(request.schemeIds.length, daysDiff);

      // Create download job with correct property names
      const job = await this.navService.createDownloadJob(tenantId, isLive, userId, {
        job_type: 'historical',
        scheme_ids: request.schemeIds,
        scheduled_date: new Date(),
        start_date: request.startDate,
        end_date: request.endDate
      });

      // Create download lock
      const lockInfo: DownloadLockInfo = {
        jobId: job.id,
        lockType: 'historical',
        lockedBy: userId,
        lockedAt: new Date(),
        schemeIds: request.schemeIds
      };
      this.downloadLocks.set(lockKey, lockInfo);

      // Initialize progress tracking with estimated time
      this.initializeProgressTracking(job.id, 'historical', request.schemeIds.length, estimatedTimeMs);

      // Execute download asynchronously (DIRECT AMFI CALL - NO N8N)
      setImmediate(() => this.executeDownload(job.id, tenantId, isLive, userId));

      SimpleLogger.error('NavDownload', 'Historical download job created', 'triggerHistoricalDownload', {
        tenantId, userId, jobId: job.id, schemeCount: request.schemeIds.length, 
        dayRange: daysDiff, estimatedTimeMs, directAmfiCall: true
      }, userId, tenantId);

      return {
        jobId: job.id,
        message: `Historical download started for ${request.schemeIds.length} schemes (${daysDiff} days)`,
        estimatedTime: estimatedTimeMs
      };

    } catch (error: any) {
      this.downloadLocks.delete(lockKey);
      
      SimpleLogger.error('NavDownload', 'Failed to trigger historical download', 'triggerHistoricalDownload', {
        tenantId, userId, request, error: error.message
      }, userId, tenantId, error.stack);
      
      throw error;
    }
  }

  /**
   * Trigger weekly NAV download for untracked schemes
   * Called by N8N weekly trigger (Fridays)
   */
  async triggerWeeklyDownload(
    tenantId: number,
    isLive: boolean,
    systemUserId: number = 1
  ): Promise<{ jobId: number; message: string }> {
    const lockKey = `weekly_${tenantId}_${isLive}`;
    
    try {
      if (this.downloadLocks.has(lockKey)) {
        const existingLock = this.downloadLocks.get(lockKey)!;
        throw new Error(`Weekly download already in progress (Job ID: ${existingLock.jobId})`);
      }

      // Get sample of untracked schemes (e.g., top 100 by market cap)
      const untrackedSchemes = await this.getUntrackedSchemesForWeeklyDownload(tenantId, isLive, 100);

      if (untrackedSchemes.length === 0) {
        return {
          jobId: 0,
          message: 'No untracked schemes found for weekly download'
        };
      }

      // Create download job with correct property names
      const job = await this.navService.createDownloadJob(tenantId, isLive, systemUserId, {
        job_type: 'weekly',
        scheme_ids: untrackedSchemes,
        scheduled_date: new Date()
      });

      // Create download lock
      const lockInfo: DownloadLockInfo = {
        jobId: job.id,
        lockType: 'weekly',
        lockedBy: systemUserId,
        lockedAt: new Date(),
        schemeIds: untrackedSchemes
      };
      this.downloadLocks.set(lockKey, lockInfo);

      // Initialize progress tracking
      this.initializeProgressTracking(job.id, 'weekly', untrackedSchemes.length);

      // Execute download asynchronously (DIRECT AMFI CALL - NO N8N)
      setImmediate(() => this.executeDownload(job.id, tenantId, isLive, systemUserId));

      return {
        jobId: job.id,
        message: `Weekly download started for ${untrackedSchemes.length} untracked schemes`
      };

    } catch (error: any) {
      this.downloadLocks.delete(lockKey);
      throw error;
    }
  }

  // ==================== DOWNLOAD EXECUTION (OPTIMIZED) ====================

  /**
   * Execute download job with progress updates and proper error handling
   * OPTIMIZED: Direct AMFI download without N8N workflow calls
   */
  private async executeDownload(
    jobId: number,
    tenantId: number,
    isLive: boolean,
    userId: number
  ): Promise<void> {
    const startTime = Date.now();
    
    try {
      // Update job status to running
      await this.navService.updateDownloadJob(tenantId, isLive, jobId, {
        status: 'running'
      });

      this.updateProgress(jobId, {
        status: 'running',
        currentStep: 'Fetching download job details...',
        progressPercentage: 5
      });

      // Get job details
      const jobs = await this.navService.getDownloadJobs(tenantId, isLive, { page: 1, page_size: 1 });
      const job = jobs.jobs.find(j => j.id === jobId);
      
      if (!job) {
        throw new Error('Download job not found');
      }

      this.updateProgress(jobId, {
        status: 'running',
        currentStep: 'Downloading NAV data directly from AMFI...',
        progressPercentage: 10
      });

      let navData: ParsedNavRecord[] = [];
      let amfiResponse;

      // OPTIMIZED: Direct AMFI API calls - faster than N8N routing
      if (job.job_type === 'daily' || job.job_type === 'weekly') {
        this.updateProgress(jobId, {
          status: 'running',
          currentStep: 'Fetching latest NAV data from AMFI...',
          progressPercentage: 20
        });

        amfiResponse = await this.amfiService.downloadDailyNavData({
          requestId: `${job.job_type}_${jobId}_${Date.now()}`
        });
      } else if (job.job_type === 'historical') {
        if (!job.start_date || !job.end_date) {
          throw new Error('Historical download requires start and end dates');
        }
        
        this.updateProgress(jobId, {
          status: 'running',
          currentStep: `Fetching historical data from ${job.start_date.toDateString()} to ${job.end_date.toDateString()}...`,
          progressPercentage: 20
        });
        
        amfiResponse = await this.amfiService.downloadHistoricalNavData(
          job.start_date,
          job.end_date,
          { requestId: `historical_${jobId}_${Date.now()}` }
        );
      }

      if (!amfiResponse.success || !amfiResponse.data) {
        throw new Error(amfiResponse.error || 'Failed to download NAV data from AMFI');
      }

      navData = amfiResponse.data;

      this.updateProgress(jobId, {
        status: 'running',
        currentStep: `Processing ${navData.length} total records from AMFI...`,
        progressPercentage: 35
      });

      // OPTIMIZED: More efficient scheme filtering
      const trackedSchemeCodes = await this.getSchemeCodesByIds(tenantId, isLive, job.scheme_ids);
      const schemeCodeSet = new Set(trackedSchemeCodes); // Use Set for O(1) lookups
      
      const filteredNavData = navData.filter(record => 
        schemeCodeSet.has(record.scheme_code)
      );

      this.updateProgress(jobId, {
        status: 'running',
        currentStep: `Processing ${filteredNavData.length} NAV records for tracked schemes...`,
        progressPercentage: 50,
        processedRecords: filteredNavData.length
      });

      if (filteredNavData.length === 0) {
        SimpleLogger.error('NavDownload', 'No NAV data found for tracked schemes', 'executeDownload', {
          jobId, totalAmfiRecords: navData.length, trackedSchemeCodesCount: trackedSchemeCodes.length
        }, userId, tenantId);
      }

      // OPTIMIZED: Batch upsert with progress updates
      this.updateProgress(jobId, {
        status: 'running',
        currentStep: 'Saving NAV data to database...',
        progressPercentage: 70
      });

      const upsertResult = await this.navService.upsertNavData(
        tenantId,
        isLive,
        filteredNavData
      );

      this.updateProgress(jobId, {
        status: 'running',
        currentStep: 'Finalizing download and processing results...',
        progressPercentage: 90
      });

      // OPTIMIZED: Efficient error mapping with better logging
      let schemesWithErrors: Array<{ scheme_id: number; scheme_code: string; error: string }> = [];
      
      if (upsertResult.errors.length > 0) {
        SimpleLogger.error('NavDownload', 'Processing errors from upsert', 'executeDownload', {
          jobId, errorCount: upsertResult.errors.length, 
          errorCodes: upsertResult.errors.map(e => e.scheme_code),
          successfulInserts: upsertResult.inserted,
          successfulUpdates: upsertResult.updated
        }, userId, tenantId);

        // Get scheme IDs for error schemes (batch operation)
        const errorSchemeCodes = upsertResult.errors.map(e => e.scheme_code);
        const schemeIdMap = await this.getSchemeIdsByCodesMap(tenantId, isLive, errorSchemeCodes);
        
        schemesWithErrors = upsertResult.errors.map(error => {
          const schemeId = schemeIdMap[error.scheme_code];
          if (!schemeId) {
            SimpleLogger.error('NavDownload', 'Scheme ID not found for error mapping', 'executeDownload', {
              jobId, schemeCode: error.scheme_code, error: error.error
            }, userId, tenantId);
          }
          
          return {
            scheme_id: schemeId || 0,
            scheme_code: error.scheme_code,
            error: error.error
          };
        });
      }

      // Create comprehensive result summary
      const resultSummary: NavDownloadJobResult = {
        total_schemes: job.scheme_ids.length,
        successful_downloads: job.scheme_ids.length - upsertResult.errors.length,
        failed_downloads: upsertResult.errors.length,
        total_records_inserted: upsertResult.inserted,
        total_records_updated: upsertResult.updated,
        schemes_with_errors: schemesWithErrors,
        execution_time_ms: Date.now() - startTime,
        api_calls_made: 1 // Direct AMFI call - no N8N overhead
      };

      // Update job with completion
      await this.navService.updateDownloadJob(tenantId, isLive, jobId, {
        status: 'completed',
        result_summary: resultSummary
      });

      // Update progress with final status including errors
      this.updateProgress(jobId, {
        status: 'completed',
        currentStep: schemesWithErrors.length > 0 
          ? `Download completed with ${schemesWithErrors.length} errors`
          : 'Download completed successfully',
        progressPercentage: 100,
        processedSchemes: resultSummary.successful_downloads,
        processedRecords: resultSummary.total_records_inserted + resultSummary.total_records_updated,
        errors: schemesWithErrors
      });

      // Mark historical download as completed for bookmarks
      if (job.job_type === 'historical') {
        await this.markHistoricalDownloadCompleted(tenantId, isLive, userId, job.scheme_ids);
      }

      // Clean up locks and progress tracking
      this.cleanupAfterDownload(jobId, job.job_type, tenantId, isLive);

      SimpleLogger.error('NavDownload', 'Download job completed successfully', 'executeDownload', {
        jobId, tenantId, userId, jobType: job.job_type, 
        successfulDownloads: resultSummary.successful_downloads,
        failedDownloads: resultSummary.failed_downloads,
        recordsProcessed: resultSummary.total_records_inserted + resultSummary.total_records_updated,
        executionTimeMs: resultSummary.execution_time_ms,
        directAmfiCall: true // Flag to indicate direct call optimization
      }, userId, tenantId);

    } catch (error: any) {
      const errorMessage = error.message || 'Unknown error';
      
      // Update job with failure
      await this.navService.updateDownloadJob(tenantId, isLive, jobId, {
        status: 'failed',
        error_details: errorMessage
      }).catch(console.error);

      this.updateProgress(jobId, {
        status: 'failed',
        currentStep: `Download failed: ${errorMessage}`,
        progressPercentage: 0
      });

      // Clean up locks and progress tracking
      this.cleanupAfterDownload(jobId, job.job_type, tenantId, isLive);

      SimpleLogger.error('NavDownload', 'Download job failed', 'executeDownload', {
        jobId, tenantId, userId, error: errorMessage,
        executionTimeMs: Date.now() - startTime,
        directAmfiCall: true
      }, userId, tenantId, error.stack);

      throw error;
    }
  }

  // ==================== SCHEME ID MAPPING UTILITIES (OPTIMIZED) ====================

  /**
   * Get scheme IDs by scheme codes for proper error mapping
   * This ensures we always have valid scheme IDs in our error reports
   */
  private async getSchemeIdsByCodesMap(
    tenantId: number,
    isLive: boolean,
    schemeCodes: string[]
  ): Promise<{ [code: string]: number }> {
    try {
      if (schemeCodes.length === 0) return {};

      const query = `
        SELECT id, scheme_code 
        FROM t_scheme_details
        WHERE tenant_id = $1 
          AND is_live = $2 
          AND scheme_code = ANY($3) 
          AND is_active = true
      `;
      
      const result = await this.db.query(query, [tenantId, isLive, schemeCodes]);
      
      const schemeMap: { [code: string]: number } = {};
      result.rows.forEach(row => {
        schemeMap[row.scheme_code] = row.id;
      });
      
      // Log any scheme codes that weren't found
      const foundCodes = new Set(Object.keys(schemeMap));
      const missingCodes = schemeCodes.filter(code => !foundCodes.has(code));
      
      if (missingCodes.length > 0) {
        SimpleLogger.error('NavDownload', 'Some scheme codes not found in database', 'getSchemeIdsByCodesMap', {
          tenantId, isLive, missingCodes, foundCount: result.rows.length, totalRequested: schemeCodes.length
        });
      }
      
      return schemeMap;
    } catch (error: any) {
      SimpleLogger.error('NavDownload', 'Failed to get scheme IDs by codes', 'getSchemeIdsByCodesMap', {
        tenantId, schemeCodes, error: error.message
      }, undefined, tenantId, error.stack);
      return {}; // Return empty map on error
    }
  }

  /**
   * Get scheme codes by IDs (for filtering downloaded data)
   * OPTIMIZED: Single query with Set for efficient lookups
   */
  private async getSchemeCodesByIds(
    tenantId: number,
    isLive: boolean,
    schemeIds: number[]
  ): Promise<string[]> {
    try {
      if (schemeIds.length === 0) return [];

      const query = `
        SELECT scheme_code FROM t_scheme_details
        WHERE tenant_id = $1 AND is_live = $2 AND id = ANY($3) AND is_active = true
      `;
      
      const result = await this.db.query(query, [tenantId, isLive, schemeIds]);
      const codes = result.rows.map(row => row.scheme_code);

      // Log if some scheme IDs weren't found
      if (codes.length !== schemeIds.length) {
        SimpleLogger.error('NavDownload', 'Some scheme IDs not found', 'getSchemeCodesByIds', {
          tenantId, requestedCount: schemeIds.length, foundCount: codes.length,
          missingCount: schemeIds.length - codes.length
        });
      }

      return codes;
    } catch (error: any) {
      SimpleLogger.error('NavDownload', 'Failed to get scheme codes', 'getSchemeCodesByIds', {
        tenantId, schemeIds, error: error.message
      });
      return [];
    }
  }

  // ==================== PROGRESS TRACKING FOR UI ====================

  /**
   * Initialize progress tracking for UI engagement
   */
  private initializeProgressTracking(
    jobId: number, 
    jobType: string, 
    totalSchemes: number,
    estimatedTime?: number
  ): void {
    const progressUpdate: DownloadProgressUpdate = {
      jobId,
      status: 'pending',
      progressPercentage: 0,
      currentStep: 'Initializing download...',
      processedSchemes: 0,
      totalSchemes,
      processedRecords: 0,
      startTime: new Date(),
      lastUpdate: new Date(),
      estimatedTimeRemaining: estimatedTime
    };

    this.progressUpdates.set(jobId, progressUpdate);
  }

  /**
   * Update progress for UI (called frequently during download)
   */
  private updateProgress(jobId: number, updates: Partial<DownloadProgressUpdate>): void {
    const existing = this.progressUpdates.get(jobId);
    if (!existing) return;

    const updated: DownloadProgressUpdate = {
      ...existing,
      ...updates,
      lastUpdate: new Date()
    };

    // Calculate estimated time remaining
    if (updates.progressPercentage && updates.progressPercentage > 0) {
      const elapsedTime = Date.now() - existing.startTime.getTime();
      const estimatedTotal = (elapsedTime / updates.progressPercentage) * 100;
      updated.estimatedTimeRemaining = Math.max(0, estimatedTotal - elapsedTime);
    }

    this.progressUpdates.set(jobId, updated);

    // In production, you might emit this to websocket or SSE for real-time UI updates
    SimpleLogger.error('NavDownload', 'Progress update', 'updateProgress', {
      jobId, status: updates.status, percentage: updates.progressPercentage, 
      step: updates.currentStep, errorCount: updates.errors?.length || 0
    });
  }

  /**
   * Get current progress for UI polling
   */
  async getDownloadProgress(jobId: number): Promise<DownloadProgressUpdate | null> {
    return this.progressUpdates.get(jobId) || null;
  }

  /**
   * Get all active downloads for user dashboard
   */
  async getActiveDownloads(): Promise<DownloadProgressUpdate[]> {
    return Array.from(this.progressUpdates.values()).filter(
      progress => progress.status === 'running' || progress.status === 'pending'
    );
  }

  // ==================== N8N INTEGRATION (DEPRECATED - KEEPING FOR COMPATIBILITY) ====================

  /**
   * Handle N8N callback (DEPRECATED - keeping for backward compatibility)
   * Note: With hybrid approach, N8N callbacks are handled by NavSchedulerService
   * This method remains for any existing N8N workflows that might still call it
   */
  async handleN8nCallback(payload: N8nCallbackPayload): Promise<void> {
    try {
      SimpleLogger.error('NavDownload', 'DEPRECATED: N8N callback received in download service', 'handleN8nCallback', {
        payload, 
        deprecationNote: 'N8N callbacks should be handled by NavSchedulerService'
      }, undefined, undefined);

      // For backward compatibility, still process the callback
      const { job_id, status, result, error } = payload;

      if (status === 'completed' && result) {
        // Note: This is a simplified handler - full logic is in NavSchedulerService
        SimpleLogger.error('NavDownload', 'N8N callback processing completed (deprecated path)', 'handleN8nCallback', {
          jobId: job_id,
          status,
          resultSummary: result
        });
      } else if (status === 'failed') {
        SimpleLogger.error('NavDownload', 'N8N callback processing failed (deprecated path)', 'handleN8nCallback', {
          jobId: job_id,
          status,
          error
        });
      }

    } catch (error: any) {
      SimpleLogger.error('NavDownload', 'Failed to handle N8N callback (deprecated)', 'handleN8nCallback', {
        payload, error: error.message
      }, undefined, undefined, error.stack);
    }
  }

  // ==================== UTILITY METHODS ====================

  /**
   * Cancel running download
   */
  async cancelDownload(
    tenantId: number,
    isLive: boolean,
    jobId: number,
    userId: number
  ): Promise<void> {
    try {
      await this.navService.updateDownloadJob(tenantId, isLive, jobId, {
        status: 'cancelled'
      });

      this.updateProgress(jobId, {
        status: 'cancelled',
        currentStep: 'Download cancelled by user'
      });

      // Clean up locks
      const locksToRemove: string[] = [];
      for (const [key, lock] of this.downloadLocks.entries()) {
        if (lock.jobId === jobId) {
          locksToRemove.push(key);
        }
      }
      locksToRemove.forEach(key => this.downloadLocks.delete(key));

      SimpleLogger.error('NavDownload', 'Download cancelled by user', 'cancelDownload', {
        jobId, tenantId, userId
      }, userId, tenantId);

    } catch (error: any) {
      SimpleLogger.error('NavDownload', 'Failed to cancel download', 'cancelDownload', {
        jobId, tenantId, userId, error: error.message
      }, userId, tenantId, error.stack);
      throw error;
    }
  }

  /**
   * Estimate download time for UI (rough calculation)
   */
  private estimateDownloadTime(schemeCount: number, dayCount: number): number {
    // Base time: ~2 seconds per scheme per API call
    // Historical data might require multiple API calls for large date ranges
    const baseTimePerScheme = 2000; // 2 seconds
    const apiCallsNeeded = Math.ceil(dayCount / 30); // Rough estimate of API calls needed
    
    return schemeCount * baseTimePerScheme * apiCallsNeeded;
  }

  /**
   * Get untracked schemes for weekly download
   */
  private async getUntrackedSchemesForWeeklyDownload(
    tenantId: number,
    isLive: boolean,
    limit: number
  ): Promise<number[]> {
    try {
      const query = `
        SELECT sd.id 
        FROM t_scheme_details sd
        WHERE sd.tenant_id = $1 AND sd.is_live = $2 AND sd.is_active = true
        AND NOT EXISTS (
          SELECT 1 FROM t_scheme_bookmarks sb 
          WHERE sb.scheme_id = sd.id 
          AND sb.tenant_id = $1 
          AND sb.is_live = $2 
          AND sb.is_active = true
        )
        ORDER BY sd.scheme_name
        LIMIT $3
      `;
      
      const result = await this.db.query(query, [tenantId, isLive, limit]);
      return result.rows.map(row => row.id);
    } catch (error: any) {
      SimpleLogger.error('NavDownload', 'Failed to get untracked schemes', 'getUntrackedSchemesForWeeklyDownload', {
        tenantId, limit, error: error.message
      });
      return [];
    }
  }

  /**
   * Mark historical download as completed
   */
  private async markHistoricalDownloadCompleted(
    tenantId: number,
    isLive: boolean,
    userId: number,
    schemeIds: number[]
  ): Promise<void> {
    try {
      const query = `
        UPDATE t_scheme_bookmarks
        SET historical_download_completed = true, updated_at = CURRENT_TIMESTAMP
        WHERE tenant_id = $1 AND is_live = $2 AND user_id = $3 AND scheme_id = ANY($4) AND is_active = true
      `;
      
      await this.db.query(query, [tenantId, isLive, userId, schemeIds]);
      
      SimpleLogger.error('NavDownload', 'Historical download marked as completed', 'markHistoricalDownloadCompleted', {
        tenantId, userId, schemeIds
      }, userId, tenantId);
    } catch (error: any) {
      SimpleLogger.error('NavDownload', 'Failed to mark historical download completed', 'markHistoricalDownloadCompleted', {
        tenantId, userId, schemeIds, error: error.message
      });
    }
  }

  /**
   * Clean up after download completion
   */
  private cleanupAfterDownload(
    jobId: number,
    jobType: string,
    tenantId: number,
    isLive: boolean
  ): void {
    // Remove from progress tracking after 5 minutes (allow UI to fetch final status)
    setTimeout(() => {
      this.progressUpdates.delete(jobId);
      SimpleLogger.error('NavDownload', 'Progress tracking cleaned up', 'cleanupAfterDownload', {
        jobId, jobType
      });
    }, 5 * 60 * 1000);

    // Remove download locks immediately
    const locksToRemove: string[] = [];
    for (const [key, lock] of this.downloadLocks.entries()) {
      if (lock.jobId === jobId) {
        locksToRemove.push(key);
      }
    }
    locksToRemove.forEach(key => this.downloadLocks.delete(key));
    
    if (locksToRemove.length > 0) {
      SimpleLogger.error('NavDownload', 'Download locks cleaned up', 'cleanupAfterDownload', {
        jobId, jobType, locksRemoved: locksToRemove.length
      });
    }
  }

  /**
   * Get download lock status (for debugging)
   */
  public getDownloadLocks(): DownloadLockInfo[] {
    return Array.from(this.downloadLocks.values());
  }

  /**
   * Clear all locks and progress (for testing/recovery)
   */
  public clearAllLocks(): void {
    this.downloadLocks.clear();
    this.progressUpdates.clear();
    SimpleLogger.error('NavDownload', 'All download locks and progress cleared', 'clearAllLocks');
  }
}