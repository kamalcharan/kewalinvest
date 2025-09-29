// backend/src/services/navDownload.service.ts
// UPDATED: Simplified historical downloads using MFAPI.in scheme-by-scheme approach
// REMOVED: Complex sequential chunking logic (400+ lines removed)

import { Pool } from 'pg';
import { pool } from '../config/database';
import { NavService } from './nav.service';
import { AmfiDataSourceService } from './amfiDataSource.service';
import { SimpleLogger } from './simpleLogger.service';
import {
  NavDownloadJob,
  NavDownloadJobResult,
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
  estimatedTimeRemaining?: number;
  errors?: Array<{ scheme_id: number; scheme_code: string; error: string }>;
  startTime: Date;
  lastUpdate: Date;
}

export interface DownloadLockInfo {
  jobId: number;
  lockType: 'daily' | 'historical' | 'weekly';
  lockedBy: number;
  lockedAt: Date;
  schemeIds: number[];
}

export class NavDownloadService {
  private db: Pool;
  private navService: NavService;
  private amfiService: AmfiDataSourceService;
  
  private downloadLocks = new Map<string, DownloadLockInfo>();
  private progressUpdates = new Map<number, DownloadProgressUpdate>();
  
  private readonly API_BASE_URL: string;

  constructor() {
    this.db = pool;
    this.navService = new NavService();
    this.amfiService = new AmfiDataSourceService();
    this.API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:8080';
  }

  // ==================== PUBLIC DOWNLOAD METHODS ====================

  /**
   * Trigger daily NAV download (idempotent) - UNCHANGED
   */
  async triggerDailyDownload(
    tenantId: number,
    isLive: boolean,
    userId: number
  ): Promise<{ jobId: number; message: string; alreadyExists?: boolean }> {
    const today = new Date().toISOString().split('T')[0];
    const lockKey = `daily_${tenantId}_${isLive}_${today}`;
    
    try {
      if (this.downloadLocks.has(lockKey)) {
        const existingLock = this.downloadLocks.get(lockKey)!;
        return {
          jobId: existingLock.jobId,
          message: 'Daily download already in progress',
          alreadyExists: true
        };
      }

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

      const downloadJob = await this.navService.createDownloadJob(tenantId, isLive, userId, {
        job_type: 'daily',
        scheme_ids: schemesWithoutData,
        scheduled_date: new Date()
      });

      const lockInfo: DownloadLockInfo = {
        jobId: downloadJob.id,
        lockType: 'daily',
        lockedBy: userId,
        lockedAt: new Date(),
        schemeIds: schemesWithoutData
      };
      this.downloadLocks.set(lockKey, lockInfo);

      this.initializeProgressTracking(downloadJob.id, 'daily', schemesWithoutData.length);

      setImmediate(async () => {
        try {
          await this.executeDownload(downloadJob.id, tenantId, isLive, userId);
        } catch (error: any) {
          SimpleLogger.error('NavDownload', 'Async daily download execution failed - SERVER DID NOT CRASH', 'triggerDailyDownload-async', {
            jobId: downloadJob.id, tenantId, userId, error: error.message
          }, userId, tenantId, error.stack);
          
          try {
            await this.navService.updateDownloadJob(tenantId, isLive, downloadJob.id, {
              status: 'failed',
              error_details: error.message
            });
            this.updateProgress(downloadJob.id, {
              status: 'failed',
              currentStep: `Download failed: ${error.message}`,
              progressPercentage: 0
            });
          } catch (updateError: any) {
            SimpleLogger.error('NavDownload', 'Failed to update job status after async error', 'triggerDailyDownload-cleanup', {
              jobId: downloadJob.id, updateError: updateError.message
            }, userId, tenantId);
          }
        }
      });

      SimpleLogger.info('NavDownload', 'Daily download job created', 'triggerDailyDownload', {
        tenantId, userId, jobId: downloadJob.id, totalSchemes: schemesWithoutData.length
      }, userId, tenantId);

      return {
        jobId: downloadJob.id,
        message: `Daily download started for ${schemesWithoutData.length} schemes`
      };
    } catch (error: any) {
      this.downloadLocks.delete(lockKey);
      
      SimpleLogger.error('NavDownload', 'Failed to trigger daily download', 'triggerDailyDownload', {
        tenantId, userId, error: error.message
      }, userId, tenantId, error.stack);
      
      throw error;
    }
  }

  /**
   * UPDATED: Trigger historical NAV download using MFAPI.in (scheme-by-scheme)
   * No date chunking needed - MFAPI provides complete history per scheme
   */
  async triggerHistoricalDownload(
    tenantId: number,
    isLive: boolean,
    userId: number,
    request: { scheme_ids: number[]; start_date: Date; end_date: Date }
  ): Promise<{ jobId: number; message: string }> {
    const lockKey = `historical_${tenantId}_${isLive}_${userId}_${request.scheme_ids.join(',')}`;
    
    try {
      // Validate scheme_ids array
      if (!request.scheme_ids || !Array.isArray(request.scheme_ids) || request.scheme_ids.length === 0) {
        throw new Error('scheme_ids array is required and cannot be empty');
      }
      
      // Validate date range
      if (!request.start_date || !request.end_date) {
        throw new Error('start_date and end_date are required');
      }
      
      const startDate = new Date(request.start_date);
      const endDate = new Date(request.end_date);
      
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        throw new Error('Invalid date format');
      }
      
      if (startDate >= endDate) {
        throw new Error('start_date must be before end_date');
      }
      
      const today = new Date();
      if (endDate > today) {
        throw new Error('end_date cannot be in the future');
      }

      // Check for concurrent historical download
      if (this.downloadLocks.has(lockKey)) {
        const existingLock = this.downloadLocks.get(lockKey)!;
        throw new Error(`Historical download already in progress (Job ID: ${existingLock.jobId})`);
      }

      // Check historical download completion
      for (const schemeId of request.scheme_ids) {
        const bookmarks = await this.navService.getUserBookmarks(
          tenantId, 
          isLive, 
          userId,
          { page: 1, page_size: 1000 }
        );
        
        const bookmark = bookmarks.bookmarks.find(b => b.scheme_id === schemeId);
        
        if (bookmark && bookmark.historical_download_completed) {
          throw new Error(NAV_ERROR_CODES.HISTORICAL_DOWNLOAD_COMPLETED);
        }
      }

      // Create download job
      const downloadJob = await this.navService.createDownloadJob(
        tenantId, 
        isLive, 
        userId, 
        {
          job_type: 'historical',
          scheme_ids: request.scheme_ids,
          scheduled_date: new Date(),
          start_date: startDate,
          end_date: endDate
        }
      );

      // Create download lock
      const lockInfo: DownloadLockInfo = {
        jobId: downloadJob.id,
        lockType: 'historical',
        lockedBy: userId,
        lockedAt: new Date(),
        schemeIds: request.scheme_ids
      };
      this.downloadLocks.set(lockKey, lockInfo);

      // Initialize progress tracking (2 seconds per scheme estimate)
      const estimatedTimeMs = request.scheme_ids.length * 2000;
      this.initializeProgressTracking(
        downloadJob.id, 
        'historical', 
        request.scheme_ids.length, 
        estimatedTimeMs
      );

      // Execute download asynchronously with crash prevention
      setImmediate(async () => {
        try {
          await this.executeHistoricalDownload(
            downloadJob.id, 
            tenantId, 
            isLive, 
            userId, 
            request.scheme_ids,
            startDate,
            endDate
          );
        } catch (error: any) {
          SimpleLogger.error(
            'NavDownload', 
            'Async historical download execution failed - SERVER DID NOT CRASH', 
            'triggerHistoricalDownload-async',
            {
              jobId: downloadJob.id, 
              tenantId, 
              userId, 
              error: error.message
            }, 
            userId, 
            tenantId, 
            error.stack
          );
          
          try {
            await this.navService.updateDownloadJob(tenantId, isLive, downloadJob.id, {
              status: 'failed',
              error_details: error.message
            });
            
            this.updateProgress(downloadJob.id, {
              status: 'failed',
              currentStep: `Download failed: ${error.message}`,
              progressPercentage: 0
            });
          } catch (updateError: any) {
            SimpleLogger.error(
              'NavDownload', 
              'Failed to update job status after async error', 
              'triggerHistoricalDownload-cleanup',
              { jobId: downloadJob.id, updateError: updateError.message },
              userId, 
              tenantId
            );
          }
        }
      });

      SimpleLogger.info(
        'NavDownload', 
        'Historical download job created (MFAPI.in - scheme-by-scheme)', 
        'triggerHistoricalDownload',
        {
          tenantId, 
          userId, 
          jobId: downloadJob.id, 
          totalSchemes: request.scheme_ids.length,
          dateRange: `${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`
        }, 
        userId, 
        tenantId
      );

      return {
        jobId: downloadJob.id,
        message: `Historical download started for ${request.scheme_ids.length} schemes using MFAPI.in`
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
   * NEW: Execute historical download scheme-by-scheme using MFAPI.in
   */
  private async executeHistoricalDownload(
    jobId: number,
    tenantId: number,
    isLive: boolean,
    userId: number,
    schemeIds: number[],
    startDate: Date,
    endDate: Date
  ): Promise<void> {
    const startTime = Date.now();
    let processedSchemes = 0;
    let totalRecordsInserted = 0;
    let totalRecordsUpdated = 0;
    const schemeErrors: Array<{ scheme_id: number; scheme_code: string; error: string }> = [];

    try {
      await this.navService.updateDownloadJob(tenantId, isLive, jobId, {
        status: 'running'
      });
      
      this.updateProgress(jobId, {
        status: 'running',
        currentStep: 'Starting historical download using MFAPI.in...',
        progressPercentage: 0
      });

      // Get scheme codes upfront
      const schemeCodes = await this.getSchemeCodesByIds(tenantId, isLive, schemeIds);
      
      if (schemeCodes.length !== schemeIds.length) {
        throw new Error('Could not fetch all scheme codes');
      }
      
      SimpleLogger.info('NavDownload', 'Starting scheme-by-scheme processing', 'executeHistoricalDownload', {
        jobId,
        totalSchemes: schemeIds.length,
        dateRange: `${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`
      });

      // Process each scheme individually
      for (let i = 0; i < schemeIds.length; i++) {
        const schemeId = schemeIds[i];
        const schemeCode = schemeCodes[i];
        
        try {
          const currentProgress = Math.round(((i + 1) / schemeIds.length) * 100);
          this.updateProgress(jobId, {
            status: 'running',
            currentStep: `Processing scheme ${i + 1} of ${schemeIds.length}: ${schemeCode}`,
            progressPercentage: currentProgress,
            processedSchemes: i
          });
          
          SimpleLogger.info('NavDownload', `Processing scheme ${i + 1}/${schemeIds.length}`, 'executeHistoricalDownload', {
            jobId, schemeId, schemeCode
          });
          
          // Call MFAPI.in for this scheme with date range filtering
          const mfapiResponse = await this.amfiService.downloadFromMFAPI(
            schemeCode,
            startDate,
            endDate,
            {
              requestId: `hist_${jobId}_${schemeCode}`,
              retryAttempts: 3,
              timeout: 30000
            }
          );
          
          if (!mfapiResponse.success || !mfapiResponse.data || mfapiResponse.data.length === 0) {
            throw new Error(mfapiResponse.error || 'No data returned from MFAPI.in');
          }
          
          SimpleLogger.info('NavDownload', `Received ${mfapiResponse.data.length} NAV records from MFAPI.in`, 'executeHistoricalDownload', {
            jobId, schemeCode, recordCount: mfapiResponse.data.length
          });
          
          // Upsert NAV data to database
          const upsertResult = await this.navService.upsertNavData(
            tenantId,
            isLive,
            mfapiResponse.data
          );
          
          totalRecordsInserted += upsertResult.inserted;
          totalRecordsUpdated += upsertResult.updated;
          processedSchemes++;
          
          SimpleLogger.info('NavDownload', `Upserted NAV data for scheme`, 'executeHistoricalDownload', {
            jobId, schemeCode, inserted: upsertResult.inserted, updated: upsertResult.updated
          });
          
          this.updateProgress(jobId, {
            processedSchemes: processedSchemes,
            processedRecords: totalRecordsInserted + totalRecordsUpdated
          });
          
          // Rate limiting: wait 500ms before next scheme (except for last)
          if (i < schemeIds.length - 1) {
            await this.sleep(500);
          }
          
        } catch (schemeError: any) {
          SimpleLogger.error('NavDownload', 'Failed to process scheme, continuing with others', 'executeHistoricalDownload', {
            jobId, schemeId, schemeCode, error: schemeError.message
          }, userId, tenantId, schemeError.stack);
          
          schemeErrors.push({
            scheme_id: schemeId,
            scheme_code: schemeCode,
            error: schemeError.message || 'Unknown error'
          });
          
          this.updateProgress(jobId, {
            errors: schemeErrors
          });
        }
      }

      // Determine final status
      const finalStatus: 'completed' | 'failed' = 
        processedSchemes > 0 ? 'completed' : 'failed';
      
      const finalMessage = processedSchemes === schemeIds.length
        ? 'All schemes processed successfully'
        : schemeErrors.length === schemeIds.length
        ? 'All schemes failed to process'
        : `${processedSchemes} of ${schemeIds.length} schemes processed successfully`;

      // Create result summary
      const resultSummary: NavDownloadJobResult = {
        total_schemes: schemeIds.length,
        successful_downloads: processedSchemes,
        failed_downloads: schemeErrors.length,
        total_records_inserted: totalRecordsInserted,
        total_records_updated: totalRecordsUpdated,
        schemes_with_errors: schemeErrors,
        execution_time_ms: Date.now() - startTime,
        api_calls_made: schemeIds.length
      };

      await this.navService.updateDownloadJob(tenantId, isLive, jobId, {
        status: finalStatus,
        result_summary: resultSummary
      });

      this.updateProgress(jobId, {
        status: finalStatus,
        currentStep: finalMessage,
        progressPercentage: 100,
        processedSchemes: processedSchemes,
        processedRecords: totalRecordsInserted + totalRecordsUpdated,
        errors: schemeErrors
      });

      // Mark historical download complete only if all schemes succeeded
      if (schemeErrors.length === 0) {
        try {
          await this.markHistoricalDownloadCompleted(tenantId, isLive, userId, schemeIds);
        } catch (markError: any) {
          SimpleLogger.error('NavDownload', 'Failed to mark historical download complete', 'executeHistoricalDownload', {
            jobId, error: markError.message
          });
        }
      }

      this.cleanupAfterDownload(jobId, 'historical', tenantId, isLive);
      
      SimpleLogger.info('NavDownload', 'Historical download completed', 'executeHistoricalDownload', {
        jobId,
        tenantId,
        userId,
        totalSchemes: schemeIds.length,
        successfulSchemes: processedSchemes,
        failedSchemes: schemeErrors.length,
        recordsInserted: totalRecordsInserted,
        recordsUpdated: totalRecordsUpdated,
        executionTimeMs: Date.now() - startTime
      }, userId, tenantId);

    } catch (error: any) {
      const errorMessage = error.message || 'Unknown error';
      
      SimpleLogger.error('NavDownload', 'Historical download failed catastrophically', 'executeHistoricalDownload', {
        jobId, tenantId, userId, error: errorMessage, executionTimeMs: Date.now() - startTime
      }, userId, tenantId, error.stack);
      
      try {
        await this.navService.updateDownloadJob(tenantId, isLive, jobId, {
          status: 'failed',
          error_details: errorMessage
        });
        
        this.updateProgress(jobId, {
          status: 'failed',
          currentStep: `Download failed: ${errorMessage}`,
          progressPercentage: 0
        });
      } catch (updateError: any) {
        SimpleLogger.error('NavDownload', 'Failed to update job after error', 'executeHistoricalDownload', {
          jobId, updateError: updateError.message
        });
      }
      
      this.cleanupAfterDownload(jobId, 'historical', tenantId, isLive);
      
      throw error;
    }
  }

  /**
   * Trigger weekly NAV download - UNCHANGED
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

      const untrackedSchemes = await this.getUntrackedSchemesForWeeklyDownload(tenantId, isLive, 100);

      if (untrackedSchemes.length === 0) {
        return {
          jobId: 0,
          message: 'No untracked schemes found for weekly download'
        };
      }

      const downloadJob = await this.navService.createDownloadJob(tenantId, isLive, systemUserId, {
        job_type: 'weekly',
        scheme_ids: untrackedSchemes,
        scheduled_date: new Date()
      });

      const lockInfo: DownloadLockInfo = {
        jobId: downloadJob.id,
        lockType: 'weekly',
        lockedBy: systemUserId,
        lockedAt: new Date(),
        schemeIds: untrackedSchemes
      };
      this.downloadLocks.set(lockKey, lockInfo);

      this.initializeProgressTracking(downloadJob.id, 'weekly', untrackedSchemes.length);

      setImmediate(async () => {
        try {
          await this.executeDownload(downloadJob.id, tenantId, isLive, systemUserId);
        } catch (error: any) {
          SimpleLogger.error('NavDownload', 'Async weekly download execution failed - SERVER DID NOT CRASH', 'triggerWeeklyDownload-async', {
            jobId: downloadJob.id, tenantId, error: error.message
          }, systemUserId, tenantId, error.stack);
          
          try {
            await this.navService.updateDownloadJob(tenantId, isLive, downloadJob.id, {
              status: 'failed',
              error_details: error.message
            });
            this.updateProgress(downloadJob.id, {
              status: 'failed',
              currentStep: `Download failed: ${error.message}`,
              progressPercentage: 0
            });
          } catch (updateError: any) {
            SimpleLogger.error('NavDownload', 'Failed to update job status after async error', 'triggerWeeklyDownload-cleanup', {
              jobId: downloadJob.id, updateError: updateError.message
            }, systemUserId, tenantId);
          }
        }
      });

      return {
        jobId: downloadJob.id,
        message: `Weekly download started for ${untrackedSchemes.length} untracked schemes`
      };
    } catch (error: any) {
      this.downloadLocks.delete(lockKey);
      throw error;
    }
  }

  // ==================== DOWNLOAD EXECUTION (DAILY/WEEKLY) ====================

  /**
   * Execute download job - UPDATED to handle only daily/weekly
   * Historical downloads now use executeHistoricalDownload() instead
   */
  private async executeDownload(
    jobId: number,
    tenantId: number,
    isLive: boolean,
    userId: number
  ): Promise<void> {
    const startTime = Date.now();
    
    try {
      await this.navService.updateDownloadJob(tenantId, isLive, jobId, {
        status: 'running'
      });

      this.updateProgress(jobId, {
        status: 'running',
        currentStep: 'Fetching download job details...',
        progressPercentage: 5
      });

      const jobsResponse = await this.navService.getDownloadJobs(tenantId, isLive, { page: 1, page_size: 1000 });
      const job = jobsResponse.jobs.find(j => j.id === jobId);
      
      if (!job) {
        throw new Error('Download job not found');
      }

      this.updateProgress(jobId, {
        status: 'running',
        currentStep: 'Downloading NAV data from AMFI...',
        progressPercentage: 10
      });

      let navData: ParsedNavRecord[] = [];
      let amfiResponse;

      try {
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
          // Historical downloads should use executeHistoricalDownload() method
          throw new Error('Historical downloads should use executeHistoricalDownload() method');
        }
      } catch (amfiError: any) {
        const errorMessage = `AMFI API Error: ${amfiError.message}`;
        SimpleLogger.error('NavDownload', 'AMFI API call failed but server did not crash', 'executeDownload-amfi', {
          jobId, jobType: job.job_type, error: errorMessage
        }, userId, tenantId, amfiError.stack);
        
        throw new Error(errorMessage);
      }

      if (!amfiResponse || !amfiResponse.success || !amfiResponse.data) {
        throw new Error(amfiResponse?.error || 'Failed to download NAV data from AMFI');
      }

      navData = amfiResponse.data;

      this.updateProgress(jobId, {
        status: 'running',
        currentStep: `Processing ${navData.length} total records from AMFI...`,
        progressPercentage: 35
      });

      const trackedSchemeCodes = await this.getSchemeCodesByIds(tenantId, isLive, job.schemes.map(s => s.scheme_id));
      const schemeCodeSet = new Set(trackedSchemeCodes);
      
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
        SimpleLogger.warn('NavDownload', 'No NAV data found for tracked schemes', 'executeDownload', {
          jobId, totalAmfiRecords: navData.length, trackedSchemeCodesCount: trackedSchemeCodes.length
        }, userId, tenantId);
      }

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

      let schemesWithErrors: Array<{ scheme_id: number; scheme_code: string; error: string }> = [];
      
      if (upsertResult.errors.length > 0) {
        SimpleLogger.warn('NavDownload', 'Processing errors from upsert', 'executeDownload', {
          jobId, errorCount: upsertResult.errors.length, 
          errorCodes: upsertResult.errors.map(e => e.scheme_code),
          successfulInserts: upsertResult.inserted,
          successfulUpdates: upsertResult.updated
        }, userId, tenantId);

        const errorSchemeCodes = upsertResult.errors.map(e => e.scheme_code);
        const schemeIdMap = await this.getSchemeIdsByCodesMap(tenantId, isLive, errorSchemeCodes);
        
        schemesWithErrors = upsertResult.errors.map(error => {
          const schemeId = schemeIdMap[error.scheme_code];
          if (!schemeId) {
            SimpleLogger.warn('NavDownload', 'Scheme ID not found for error mapping', 'executeDownload', {
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

      const resultSummary: NavDownloadJobResult = {
        total_schemes: job.schemes.length,
        successful_downloads: job.schemes.length - upsertResult.errors.length,
        failed_downloads: upsertResult.errors.length,
        total_records_inserted: upsertResult.inserted,
        total_records_updated: upsertResult.updated,
        schemes_with_errors: schemesWithErrors,
        execution_time_ms: Date.now() - startTime,
        api_calls_made: 1
      };

      await this.navService.updateDownloadJob(tenantId, isLive, jobId, {
        status: 'completed',
        result_summary: resultSummary
      });

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

      this.cleanupAfterDownload(jobId, job.job_type, tenantId, isLive);

      SimpleLogger.info('NavDownload', 'Download job completed successfully', 'executeDownload', {
        jobId, tenantId, userId, jobType: job.job_type, 
        successfulDownloads: resultSummary.successful_downloads,
        failedDownloads: resultSummary.failed_downloads,
        recordsProcessed: resultSummary.total_records_inserted + resultSummary.total_records_updated,
        executionTimeMs: resultSummary.execution_time_ms
      }, userId, tenantId);
    } catch (error: any) {
      const errorMessage = error.message || 'Unknown error';
      
      try {
        await this.navService.updateDownloadJob(tenantId, isLive, jobId, {
          status: 'failed',
          error_details: errorMessage
        });

        this.updateProgress(jobId, {
          status: 'failed',
          currentStep: `Download failed: ${errorMessage}`,
          progressPercentage: 0
        });
      } catch (updateError: any) {
        SimpleLogger.error('NavDownload', 'Failed to update job status after execution error', 'executeDownload-update-error', {
          jobId, originalError: errorMessage, updateError: updateError.message
        }, userId, tenantId);
      }

      this.cleanupAfterDownload(jobId, 'unknown', tenantId, isLive);

      SimpleLogger.error('NavDownload', 'Download job failed but server did not crash', 'executeDownload', {
        jobId, tenantId, userId, error: errorMessage,
        executionTimeMs: Date.now() - startTime
      }, userId, tenantId, error.stack);

      throw error;
    }
  }

  // ==================== UTILITY METHODS ====================

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
      
      return schemeMap;
    } catch (error: any) {
      SimpleLogger.error('NavDownload', 'Failed to get scheme IDs by codes', 'getSchemeIdsByCodesMap', {
        tenantId, schemeCodes, error: error.message
      }, undefined, tenantId, error.stack);
      return {};
    }
  }

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
        ORDER BY ARRAY_POSITION($3, id)
      `;
      
      const result = await this.db.query(query, [tenantId, isLive, schemeIds]);
      return result.rows.map(row => row.scheme_code);
    } catch (error: any) {
      SimpleLogger.error('NavDownload', 'Failed to get scheme codes', 'getSchemeCodesByIds', {
        tenantId, schemeIds, error: error.message
      });
      return [];
    }
  }

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

  private updateProgress(jobId: number, updates: Partial<DownloadProgressUpdate>): void {
    const existing = this.progressUpdates.get(jobId);
    if (!existing) return;

    const updated: DownloadProgressUpdate = {
      ...existing,
      ...updates,
      lastUpdate: new Date()
    };

    if (updates.progressPercentage && updates.progressPercentage > 0) {
      const elapsedTime = Date.now() - existing.startTime.getTime();
      const estimatedTotal = (elapsedTime / updates.progressPercentage) * 100;
      updated.estimatedTimeRemaining = Math.max(0, estimatedTotal - elapsedTime);
    }

    this.progressUpdates.set(jobId, updated);
  }

  async getDownloadProgress(jobId: number): Promise<DownloadProgressUpdate | null> {
    return this.progressUpdates.get(jobId) || null;
  }

  async getActiveDownloads(): Promise<DownloadProgressUpdate[]> {
    return Array.from(this.progressUpdates.values()).filter(
      progress => progress.status === 'running' || progress.status === 'pending'
    );
  }

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

      const locksToRemove: string[] = [];
      for (const [key, lock] of this.downloadLocks.entries()) {
        if (lock.jobId === jobId) {
          locksToRemove.push(key);
        }
      }
      locksToRemove.forEach(key => this.downloadLocks.delete(key));

      SimpleLogger.info('NavDownload', 'Download cancelled by user', 'cancelDownload', {
        jobId, tenantId, userId
      }, userId, tenantId);
    } catch (error: any) {
      SimpleLogger.error('NavDownload', 'Failed to cancel download', 'cancelDownload', {
        jobId, tenantId, userId, error: error.message
      }, userId, tenantId, error.stack);
      throw error;
    }
  }

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
      
      SimpleLogger.info('NavDownload', 'Historical download marked as completed', 'markHistoricalDownloadCompleted', {
        tenantId, userId, schemeIds
      }, userId, tenantId);
    } catch (error: any) {
      SimpleLogger.error('NavDownload', 'Failed to mark historical download completed', 'markHistoricalDownloadCompleted', {
        tenantId, userId, schemeIds, error: error.message
      });
    }
  }

  private cleanupAfterDownload(
    jobId: number,
    jobType: string,
    tenantId: number,
    isLive: boolean
  ): void {
    setTimeout(() => {
      this.progressUpdates.delete(jobId);
    }, 5 * 60 * 1000);

    const locksToRemove: string[] = [];
    for (const [key, lock] of this.downloadLocks.entries()) {
      if (lock.jobId === jobId) {
        locksToRemove.push(key);
      }
    }
    locksToRemove.forEach(key => this.downloadLocks.delete(key));
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ==================== DEPRECATED N8N INTEGRATION ====================

  async handleN8nCallback(payload: N8nCallbackPayload): Promise<void> {
    try {
      SimpleLogger.warn('NavDownload', 'DEPRECATED: N8N callback received', 'handleN8nCallback', {
        payload, 
        deprecationNote: 'N8N callbacks should be handled by NavSchedulerService'
      });

      const { job_id, status, result, error } = payload;

      if (status === 'completed' && result) {
        SimpleLogger.info('NavDownload', 'N8N callback processing completed (deprecated path)', 'handleN8nCallback', {
          jobId: job_id, status, resultSummary: result
        });
      } else if (status === 'failed') {
        SimpleLogger.error('NavDownload', 'N8N callback processing failed (deprecated path)', 'handleN8nCallback', {
          jobId: job_id, status, error
        });
      }
    } catch (error: any) {
      SimpleLogger.error('NavDownload', 'Failed to handle N8N callback (deprecated)', 'handleN8nCallback', {
        payload, error: error.message
      }, undefined, undefined, error.stack);
    }
  }

  // ==================== ADMIN METHODS ====================

  public getDownloadLocks(): DownloadLockInfo[] {
    return Array.from(this.downloadLocks.values());
  }

  public clearAllLocks(): void {
    this.downloadLocks.clear();
    this.progressUpdates.clear();
    SimpleLogger.info('NavDownload', 'All download locks and progress cleared', 'clearAllLocks');
  }
}