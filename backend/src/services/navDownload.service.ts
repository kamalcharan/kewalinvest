// backend/src/services/navDownload.service.ts
// PRODUCTION READY: Sequential downloads with comprehensive error handling and crash prevention

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
  NAV_ERROR_CODES,
  DownloadChunk,
  SequentialDownloadRequest,
  SequentialDownloadResponse,
  SequentialJobProgress,
  DateRangeValidationResult
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
  
  // Sequential download progress fields
  parentJobId?: number;
  totalChunks?: number;
  completedChunks?: number;
  currentChunk?: {
    chunkNumber: number;
    startDate: Date;
    endDate: Date;
  };
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
  
  // In-memory locks to prevent race conditions
  private downloadLocks = new Map<string, DownloadLockInfo>();
  
  // Progress tracking for UI
  private progressUpdates = new Map<number, DownloadProgressUpdate>();
  
  // Sequential job progress tracking
  private sequentialProgress = new Map<number, SequentialJobProgress>();
  
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
   */
  async triggerDailyDownload(
    tenantId: number,
    isLive: boolean,
    userId: number
  ): Promise<{ jobId: number; message: string; alreadyExists?: boolean }> {
    const today = new Date().toISOString().split('T')[0];
    const lockKey = `daily_${tenantId}_${isLive}_${today}`;
    
    try {
      // Check for existing lock
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

      // Check if today's data already exists
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

      // Create download job
      const downloadJob = await this.navService.createDownloadJob(tenantId, isLive, userId, {
        job_type: 'daily',
        scheme_ids: schemesWithoutData,
        scheduled_date: new Date()
      });

      // Create download lock
      const lockInfo: DownloadLockInfo = {
        jobId: downloadJob.id,
        lockType: 'daily',
        lockedBy: userId,
        lockedAt: new Date(),
        schemeIds: schemesWithoutData
      };
      this.downloadLocks.set(lockKey, lockInfo);

      // Initialize progress tracking
      this.initializeProgressTracking(downloadJob.id, 'daily', schemesWithoutData.length);

      // CRASH PREVENTION: Execute download asynchronously with proper error handling
      setImmediate(async () => {
        try {
          await this.executeDownload(downloadJob.id, tenantId, isLive, userId);
        } catch (error: any) {
          SimpleLogger.error('NavDownload', 'Async daily download execution failed - SERVER DID NOT CRASH', 'triggerDailyDownload-async', {
            jobId: downloadJob.id, tenantId, userId, error: error.message
          }, userId, tenantId, error.stack);
          
          // Update job status to failed
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
   * Trigger historical NAV download with automatic chunking for >90 day requests
   */
  async triggerHistoricalDownload(
    tenantId: number,
    isLive: boolean,
    userId: number,
    request: SequentialDownloadRequest
  ): Promise<SequentialDownloadResponse> {
    const lockKey = `historical_${tenantId}_${isLive}_${userId}_${request.scheme_ids.join(',')}`;
    
    try {
      // Check for concurrent historical download
      if (this.downloadLocks.has(lockKey)) {
        const existingLock = this.downloadLocks.get(lockKey)!;
        throw new Error(`Historical download already in progress (Job ID: ${existingLock.jobId})`);
      }

      // Validate date range
      const validation = this.validateDateRange(request.start_date, request.end_date);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      // Check if historical download already completed
      for (const schemeId of request.scheme_ids) {
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

      // Determine if sequential download is needed
      const chunksRequired = validation.chunks_required!;

      if (chunksRequired === 1) {
        return await this.executeSingleHistoricalDownload(tenantId, isLive, userId, request);
      } else {
        return await this.executeSequentialHistoricalDownload(tenantId, isLive, userId, request, validation);
      }

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

      // CRASH PREVENTION: Execute download asynchronously with proper error handling
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

  // ==================== SEQUENTIAL DOWNLOAD METHODS ====================

  /**
   * Execute single historical download (<=90 days)
   */
  private async executeSingleHistoricalDownload(
    tenantId: number,
    isLive: boolean,
    userId: number,
    request: SequentialDownloadRequest
  ): Promise<SequentialDownloadResponse> {
    const daysDiff = Math.ceil((request.end_date.getTime() - request.start_date.getTime()) / (1000 * 60 * 60 * 24));
    const estimatedTimeMs = this.estimateDownloadTime(request.scheme_ids.length, daysDiff);

    const downloadJob = await this.navService.createDownloadJob(tenantId, isLive, userId, {
      job_type: 'historical',
      scheme_ids: request.scheme_ids,
      scheduled_date: new Date(),
      start_date: request.start_date,
      end_date: request.end_date
    });

    this.initializeProgressTracking(downloadJob.id, 'historical', request.scheme_ids.length, estimatedTimeMs);

    // CRASH PREVENTION: Execute download asynchronously with proper error handling
    setImmediate(async () => {
      try {
        await this.executeDownload(downloadJob.id, tenantId, isLive, userId);
      } catch (error: any) {
        SimpleLogger.error('NavDownload', 'Async single historical download execution failed - SERVER DID NOT CRASH', 'executeSingleHistoricalDownload-async', {
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
          SimpleLogger.error('NavDownload', 'Failed to update job status after async error', 'executeSingleHistoricalDownload-cleanup', {
            jobId: downloadJob.id, updateError: updateError.message
          }, userId, tenantId);
        }
      }
    });

    return {
      parent_job_id: downloadJob.id,
      total_chunks: 1,
      chunks: [{
        chunk_number: 1,
        start_date: request.start_date,
        end_date: request.end_date,
        day_count: daysDiff
      }],
      estimated_time_ms: estimatedTimeMs,
      message: `Historical download started for ${request.scheme_ids.length} schemes (${daysDiff} days)`
    };
  }

  /**
   * Execute sequential historical download (>90 days)
   */
  private async executeSequentialHistoricalDownload(
    tenantId: number,
    isLive: boolean,
    userId: number,
    request: SequentialDownloadRequest,
    validation: DateRangeValidationResult
  ): Promise<SequentialDownloadResponse> {
    const chunks = this.splitDateRangeIntoChunks(request.start_date, request.end_date);
    const totalEstimatedTime = chunks.reduce((total, chunk) => 
      total + this.estimateDownloadTime(request.scheme_ids.length, chunk.day_count), 0
    );

    // Create parent job
    const parentJob = await this.navService.createDownloadJob(tenantId, isLive, userId, {
      job_type: 'historical',
      scheme_ids: request.scheme_ids,
      scheduled_date: new Date(),
      start_date: request.start_date,
      end_date: request.end_date
    });

    // Create child jobs for each chunk
    const childJobs: NavDownloadJob[] = [];
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const childJob = await this.navService.createDownloadJob(tenantId, isLive, userId, {
        job_type: 'historical',
        scheme_ids: request.scheme_ids,
        scheduled_date: new Date(),
        start_date: chunk.start_date,
        end_date: chunk.end_date,
        parent_job_id: parentJob.id,
        chunk_number: i + 1,
        total_chunks: chunks.length
      });
      childJobs.push(childJob);
    }

    this.initializeSequentialProgress(parentJob.id, chunks, childJobs);

    // CRASH PREVENTION: Execute sequential downloads asynchronously with proper error handling
    setImmediate(async () => {
      try {
        await this.executeSequentialDownloads(parentJob.id, childJobs, tenantId, isLive, userId);
      } catch (error: any) {
        SimpleLogger.error('NavDownload', 'Async sequential download execution failed - SERVER DID NOT CRASH', 'executeSequentialHistoricalDownload-async', {
          parentJobId: parentJob.id, tenantId, userId, error: error.message
        }, userId, tenantId, error.stack);
        
        try {
          await this.navService.updateDownloadJob(tenantId, isLive, parentJob.id, {
            status: 'failed',
            error_details: error.message
          });
          this.updateSequentialProgress(parentJob.id, {
            overall_status: 'failed'
          });
        } catch (updateError: any) {
          SimpleLogger.error('NavDownload', 'Failed to update parent job status after async error', 'executeSequentialHistoricalDownload-cleanup', {
            parentJobId: parentJob.id, updateError: updateError.message
          }, userId, tenantId);
        }
      }
    });

    SimpleLogger.info('NavDownload', 'Sequential historical download initiated', 'executeSequentialHistoricalDownload', {
      tenantId, userId, parentJobId: parentJob.id, totalChunks: chunks.length,
      dateRange: `${request.start_date.toISOString().split('T')[0]} to ${request.end_date.toISOString().split('T')[0]}`,
      estimatedTimeMs: totalEstimatedTime
    }, userId, tenantId);

    return {
      parent_job_id: parentJob.id,
      total_chunks: chunks.length,
      chunks,
      estimated_time_ms: totalEstimatedTime,
      message: `Sequential download started: ${chunks.length} chunks for ${request.scheme_ids.length} schemes`
    };
  }

  /**
   * Execute sequential downloads one by one
   */
  private async executeSequentialDownloads(
    parentJobId: number,
    childJobs: NavDownloadJob[],
    tenantId: number,
    isLive: boolean,
    userId: number
  ): Promise<void> {
    try {
      await this.navService.updateDownloadJob(tenantId, isLive, parentJobId, {
        status: 'running'
      });

      for (let i = 0; i < childJobs.length; i++) {
        const childJob = childJobs[i];
        
        this.updateSequentialProgress(parentJobId, {
          current_chunk: {
            chunk_number: childJob.chunk_number!,
            start_date: childJob.start_date!,
            end_date: childJob.end_date!,
            status: 'running'
          }
        });

        SimpleLogger.info('NavDownload', 'Starting sequential chunk download', 'executeSequentialDownloads', {
          parentJobId, childJobId: childJob.id, chunkNumber: childJob.chunk_number,
          dateRange: `${childJob.start_date} to ${childJob.end_date}`
        }, userId, tenantId);

        try {
          await this.executeDownload(childJob.id, tenantId, isLive, userId);
          
          this.updateSequentialProgress(parentJobId, {
            completed_chunks: i + 1,
            progress_percentage: Math.round(((i + 1) / childJobs.length) * 100)
          });

        } catch (error: any) {
          SimpleLogger.error('NavDownload', 'Sequential chunk download failed but continuing', 'executeSequentialDownloads', {
            parentJobId, childJobId: childJob.id, chunkNumber: childJob.chunk_number,
            error: error.message
          }, userId, tenantId, error.stack);

          const currentProgress = this.sequentialProgress.get(parentJobId);
          if (currentProgress) {
            currentProgress.errors.push({
              chunk_number: childJob.chunk_number!,
              error: error.message,
              date_range: `${childJob.start_date} to ${childJob.end_date}`
            });
          }
        }
      }

      await this.navService.updateDownloadJob(tenantId, isLive, parentJobId, {
        status: 'completed'
      });

      this.updateSequentialProgress(parentJobId, {
        overall_status: 'completed'
      });

      SimpleLogger.info('NavDownload', 'Sequential download completed', 'executeSequentialDownloads', {
        parentJobId, totalChunks: childJobs.length, completedChunks: childJobs.length
      }, userId, tenantId);

    } catch (error: any) {
      await this.navService.updateDownloadJob(tenantId, isLive, parentJobId, {
        status: 'failed',
        error_details: error.message
      });

      this.updateSequentialProgress(parentJobId, {
        overall_status: 'failed'
      });

      SimpleLogger.error('NavDownload', 'Sequential download failed', 'executeSequentialDownloads', {
        parentJobId, error: error.message
      }, userId, tenantId, error.stack);

      throw error;
    }
  }

  /**
   * Split date range into 90-day chunks
   */
  private splitDateRangeIntoChunks(startDate: Date, endDate: Date): DownloadChunk[] {
    const chunks: DownloadChunk[] = [];
    let currentStart = new Date(startDate);
    let chunkNumber = 1;

    while (currentStart < endDate) {
      let currentEnd = new Date(currentStart);
      currentEnd.setDate(currentEnd.getDate() + 89);

      if (currentEnd > endDate) {
        currentEnd = new Date(endDate);
      }

      const dayCount = Math.ceil((currentEnd.getTime() - currentStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;

      chunks.push({
        chunk_number: chunkNumber,
        start_date: new Date(currentStart),
        end_date: new Date(currentEnd),
        day_count: dayCount
      });

      currentStart = new Date(currentEnd);
      currentStart.setDate(currentStart.getDate() + 1);
      chunkNumber++;
    }

    return chunks;
  }

  /**
   * Validate date range and determine chunking requirements
   */
  private validateDateRange(startDate: Date, endDate: Date): DateRangeValidationResult {
    if (startDate > endDate) {
      return {
        valid: false,
        error: 'Start date cannot be after end date'
      };
    }

    const today = new Date();
    if (endDate > today) {
      return {
        valid: false,
        error: 'End date cannot be in the future'
      };
    }

    const dayCount = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const chunksRequired = Math.ceil(dayCount / 90);

    return {
      valid: true,
      day_count: dayCount,
      chunks_required: chunksRequired
    };
  }

  // ==================== DOWNLOAD EXECUTION ====================

  /**
   * Execute download job with comprehensive error handling
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

      // Download data from AMFI with proper error handling
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
          if (!job.start_date || !job.end_date) {
            throw new Error('Historical download requires start and end dates');
          }
          
          this.updateProgress(jobId, {
            status: 'running',
            currentStep: `Fetching historical data from ${job.start_date} to ${job.end_date}...`,
            progressPercentage: 20
          });
          
          amfiResponse = await this.amfiService.downloadHistoricalNavData(
            new Date(job.start_date),
            new Date(job.end_date),
            { requestId: `historical_${jobId}_${Date.now()}` }
          );
        }
      } catch (amfiError: any) {
        // AMFI API errors should not crash the server
        const errorMessage = `AMFI API Error: ${amfiError.message}`;
        SimpleLogger.error('NavDownload', 'AMFI API call failed but server did not crash', 'executeDownload-amfi', {
          jobId, jobType: job.job_type, error: errorMessage,
          startDate: job.start_date, endDate: job.end_date
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

      // Filter data for tracked schemes
      const trackedSchemeCodes = await this.getSchemeCodesByIds(tenantId, isLive, job.schemes.map(s => s.scheme_id));
      const schemeCodeSet = new Set(trackedSchemeCodes);
      
      const filteredNavData = navData.filter(record => 
        schemeCodeSet.has(record.scheme_code)
      );

      // Add this debug logging:
SimpleLogger.info('NavDownload', 'Filtering debug', 'executeDownload', {
  totalAmfiRecords: navData.length,
  trackedSchemeCodes: Array.from(schemeCodeSet),
  filteredRecords: filteredNavData.length,
  sampleFilteredCodes: filteredNavData.slice(0, 5).map(r => r.scheme_code)
});

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

      // Process errors if any
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

      // Create result summary
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

      if (job.job_type === 'historical') {
        await this.markHistoricalDownloadCompleted(tenantId, isLive, userId, job.schemes.map(s => s.scheme_id));
      }

      this.cleanupAfterDownload(jobId, job.job_type, tenantId, isLive);

      SimpleLogger.info('NavDownload', 'Download job completed successfully', 'executeDownload', {
        jobId, tenantId, userId, jobType: job.job_type, 
        successfulDownloads: resultSummary.successful_downloads,
        failedDownloads: resultSummary.failed_downloads,
        recordsProcessed: resultSummary.total_records_inserted + resultSummary.total_records_updated,
        executionTimeMs: resultSummary.execution_time_ms,
        parentJobId: job.parent_job_id,
        chunkNumber: job.chunk_number
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

  // ==================== SEQUENTIAL PROGRESS TRACKING ====================

  private initializeSequentialProgress(
    parentJobId: number,
    chunks: DownloadChunk[],
    childJobs: NavDownloadJob[]
  ): void {
    const sequentialProgress: SequentialJobProgress = {
      parent_job_id: parentJobId,
      total_chunks: chunks.length,
      completed_chunks: 0,
      overall_status: 'pending',
      progress_percentage: 0,
      start_time: new Date(),
      errors: []
    };

    this.sequentialProgress.set(parentJobId, sequentialProgress);
  }

  private updateSequentialProgress(
    parentJobId: number,
    updates: Partial<SequentialJobProgress>
  ): void {
    const existing = this.sequentialProgress.get(parentJobId);
    if (!existing) return;

    const updated: SequentialJobProgress = {
      ...existing,
      ...updates
    };

    if (updated.completed_chunks > 0 && updated.total_chunks > 0) {
      const elapsedTime = Date.now() - existing.start_time.getTime();
      const avgTimePerChunk = elapsedTime / updated.completed_chunks;
      const remainingChunks = updated.total_chunks - updated.completed_chunks;
      const estimatedCompletion = new Date(Date.now() + (avgTimePerChunk * remainingChunks));
      updated.estimated_completion = estimatedCompletion;
    }

    this.sequentialProgress.set(parentJobId, updated);
  }

  async getSequentialProgress(parentJobId: number): Promise<SequentialJobProgress | null> {
    return this.sequentialProgress.get(parentJobId) || null;
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

  private estimateDownloadTime(schemeCount: number, dayCount: number): number {
    const baseTimePerScheme = 2000;
    const apiCallsNeeded = Math.ceil(dayCount / 30);
    return schemeCount * baseTimePerScheme * apiCallsNeeded;
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
    this.sequentialProgress.clear();
    SimpleLogger.info('NavDownload', 'All download locks and progress cleared', 'clearAllLocks');
  }
}