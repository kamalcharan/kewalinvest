// frontend/src/hooks/useBulkMetricsCalculation.ts
// React Query hook for bulk metrics calculation with progress tracking

import { useState, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { schemeAnalysisService } from '../services/schemeAnalysis.service';
import { toastService } from '../services/toast.service';
import { FrontendErrorLogger } from '../services/errorLogger.service';
import { schemeMetricsKeys } from './useSchemeMetrics';
import type {
  SchemeBookmark,
  BulkMetricsRequest,
  BulkMetricsResult,
  BulkMetricsProgress,
  SchemeReadiness,
  SchemeReadinessCategory,
} from '../types/nav.types';
import { categorizeSchemeReadiness, getReadinessMessage } from '../types/nav.types';

/**
 * Options for bulk metrics calculation
 */
interface BulkMetricsCalculationOptions {
  batchSize?: number;           // Schemes per batch (default: 100)
  delayMs?: number;             // Delay between batches (default: 5000ms)
  asOfDate?: string;            // Specific date for calculation
  onProgress?: (progress: BulkMetricsProgress) => void;
  onComplete?: (result: BulkMetricsResult) => void;
  onError?: (error: Error) => void;
  showToasts?: boolean;         // Show toast notifications (default: true)
}

/**
 * Custom hook for bulk metrics calculation
 * Handles batch processing with progress tracking and cancellation
 * 
 * @param options - Optional configuration
 * @returns Object with processBatch function and state
 * 
 * @example
 * ```typescript
 * const { processBatch, progress, isProcessing, cancel } = useBulkMetricsCalculation({
 *   onProgress: (progress) => {
 *     console.log(`${progress.current}/${progress.total} schemes processed`);
 *   }
 * });
 * 
 * // Process selected schemes
 * await processBatch(selectedBookmarks);
 * ```
 */
export function useBulkMetricsCalculation(options?: BulkMetricsCalculationOptions) {
  const {
    batchSize = 100,
    delayMs = 5000,
    asOfDate,
    onProgress,
    onComplete,
    onError,
    showToasts = true,
  } = options || {};

  const queryClient = useQueryClient();
  
  // State
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<BulkMetricsProgress>({
    isProcessing: false,
    current: 0,
    total: 0,
    successCount: 0,
    failureCount: 0,
    currentScheme: undefined,
    errors: [],
  });

  // Cancellation ref
  const isCancelledRef = useRef(false);

  /**
   * Update progress state
   */
  const updateProgress = useCallback((update: Partial<BulkMetricsProgress>) => {
    setProgress(prev => {
      const newProgress = { ...prev, ...update };
      
      // Call progress callback
      if (onProgress) {
        onProgress(newProgress);
      }
      
      return newProgress;
    });
  }, [onProgress]);

  /**
   * Process schemes in batches
   */
  const processBatch = useCallback(async (
    bookmarks: SchemeBookmark[]
  ): Promise<BulkMetricsResult | null> => {
    // Validate input
    if (!bookmarks || bookmarks.length === 0) {
      toastService.warning('No schemes selected for metrics calculation');
      return null;
    }

    // Reset cancellation flag
    isCancelledRef.current = false;

    // Initialize progress
    setIsProcessing(true);
    updateProgress({
      isProcessing: true,
      current: 0,
      total: bookmarks.length,
      successCount: 0,
      failureCount: 0,
      currentScheme: undefined,
      errors: [],
    });

    FrontendErrorLogger.info(
      'Starting bulk metrics calculation',
      'useBulkMetricsCalculation.processBatch',
      {
        totalSchemes: bookmarks.length,
        batchSize,
        delayMs,
      }
    );

    try {
      // Extract scheme IDs
      const schemeIds = bookmarks.map(b => b.scheme_id);

      console.log('🔍 [DEBUG] Processing batch calculation:', {
        bookmarksCount: bookmarks.length,
        schemeIds,
        batchSize,
        delayMs
      });

      // Build request
      const request: BulkMetricsRequest = {
        scheme_ids: schemeIds,
        batch_size: batchSize,
        delay_ms: delayMs,
        as_of_date: asOfDate,
        priority: 'bookmarked',
      };

      console.log('📤 [DEBUG] Sending bulk metrics request:', request);

      // Call API
      const result = await schemeAnalysisService.batchCalculateMetrics(request);

      console.log('📥 [DEBUG] Received bulk metrics result:', result);

      // Check if cancelled during API call
      if (isCancelledRef.current) {
        FrontendErrorLogger.info(
          'Bulk calculation cancelled',
          'useBulkMetricsCalculation.processBatch',
          { totalSchemes: bookmarks.length }
        );

        if (showToasts) {
          toastService.info('Bulk calculation cancelled');
        }

        return null;
      }

      // Update final progress
      updateProgress({
        isProcessing: false,
        current: result.total_schemes,
        total: result.total_schemes,
        successCount: result.successful,
        failureCount: result.failed,
        errors: result.errors,
      });

      // Invalidate cache for all schemes
      schemeIds.forEach(schemeId => {
        queryClient.invalidateQueries({
          queryKey: schemeMetricsKeys.detail(schemeId),
        });
      });

      FrontendErrorLogger.info(
        'Bulk metrics calculation completed',
        'useBulkMetricsCalculation.processBatch',
        {
          totalSchemes: result.total_schemes,
          successful: result.successful,
          failed: result.failed,
          successRate: result.success_rate,
          executionTimeMinutes: result.execution_time_minutes,
        }
      );

      // Show success toast
      if (showToasts) {
        if (result.successful === result.total_schemes) {
          toastService.success(
            `Successfully calculated metrics for all ${result.successful} schemes!`
          );
        } else {
          toastService.warning(
            `Calculated metrics for ${result.successful}/${result.total_schemes} schemes. ${result.failed} failed.`
          );
        }
      }

      // Call complete callback
      if (onComplete) {
        onComplete(result);
      }

      return result;

    } catch (error: any) {
      FrontendErrorLogger.error(
        'Bulk metrics calculation failed',
        'useBulkMetricsCalculation.processBatch',
        {
          totalSchemes: bookmarks.length,
          error: error.message,
        },
        error.stack
      );

      // Update progress with error state
      updateProgress({
        isProcessing: false,
      });

      // Show error toast
      if (showToasts) {
        toastService.error(
          `Bulk calculation failed: ${error.message}`
        );
      }

      // Call error callback
      if (onError) {
        onError(error);
      }

      throw error;

    } finally {
      setIsProcessing(false);
      updateProgress({
        isProcessing: false,
      });
    }
  }, [batchSize, delayMs, asOfDate, updateProgress, queryClient, showToasts, onComplete, onError]);

  /**
   * Cancel ongoing bulk calculation
   */
  const cancel = useCallback(() => {
    if (isProcessing) {
      isCancelledRef.current = true;
      
      FrontendErrorLogger.info(
        'Cancelling bulk metrics calculation',
        'useBulkMetricsCalculation.cancel',
        {}
      );

      if (showToasts) {
        toastService.info('Cancelling bulk calculation...');
      }
    }
  }, [isProcessing, showToasts]);

  /**
   * Reset progress state
   */
  const reset = useCallback(() => {
    setIsProcessing(false);
    setProgress({
      isProcessing: false,
      current: 0,
      total: 0,
      successCount: 0,
      failureCount: 0,
      currentScheme: undefined,
      errors: [],
    });
    isCancelledRef.current = false;
  }, []);

  return {
    processBatch,
    isProcessing,
    progress,
    cancel,
    reset,
  };
}

/**
 * Hook to categorize schemes by readiness for metrics calculation
 * Used for pre-check modal before bulk calculation
 * 
 * @param bookmarks - Array of scheme bookmarks to categorize
 * @returns Categorized schemes (ready, partial, no data)
 * 
 * @example
 * ```typescript
 * const { categorize, summary } = useCategorizeSchemeReadiness();
 * 
 * const categories = categorize(selectedBookmarks);
 * console.log(`Ready: ${categories.ready.length}`);
 * console.log(`Partial: ${categories.partial.length}`);
 * console.log(`No Data: ${categories.noData.length}`);
 * ```
 */
export function useCategorizeSchemeReadiness() {
  const categorize = useCallback((
    bookmarks: SchemeBookmark[]
  ): SchemeReadinessCategory => {
    const ready: SchemeReadiness[] = [];
    const partial: SchemeReadiness[] = [];
    const noData: SchemeReadiness[] = [];

    bookmarks.forEach(bookmark => {
      const status = categorizeSchemeReadiness(bookmark.nav_records_count);
      const message = getReadinessMessage(bookmark.nav_records_count);

      const readiness: SchemeReadiness = {
        scheme_id: bookmark.scheme_id,
        scheme_code: bookmark.scheme_code,
        scheme_name: bookmark.scheme_name,
        nav_records_count: bookmark.nav_records_count,
        status,
        message,
      };

      if (status === 'ready') {
        ready.push(readiness);
      } else if (status === 'partial') {
        partial.push(readiness);
      } else {
        noData.push(readiness);
      }
    });

    FrontendErrorLogger.info(
      'Categorized schemes for metrics calculation',
      'useCategorizeSchemeReadiness.categorize',
      {
        totalSchemes: bookmarks.length,
        ready: ready.length,
        partial: partial.length,
        noData: noData.length,
      }
    );

    return { ready, partial, noData };
  }, []);

  /**
   * Get summary counts from categories
   */
  const getSummary = useCallback((categories: SchemeReadinessCategory) => {
    return {
      total: categories.ready.length + categories.partial.length + categories.noData.length,
      ready: categories.ready.length,
      partial: categories.partial.length,
      noData: categories.noData.length,
      canProceed: categories.ready.length > 0 || categories.partial.length > 0,
    };
  }, []);

  return {
    categorize,
    getSummary,
  };
}

/**
 * Hook to process only schemes that are ready for calculation
 * Filters out schemes with no NAV data before processing
 * 
 * @param options - Optional configuration
 * @returns Object with processReady function
 * 
 * @example
 * ```typescript
 * const { processReady, isProcessing, progress } = useProcessReadySchemes({
 *   onComplete: (result) => {
 *     console.log('Processed ready schemes:', result);
 *   }
 * });
 * 
 * // Only process schemes with NAV data
 * await processReady(allBookmarks);
 * ```
 */
export function useProcessReadySchemes(options?: BulkMetricsCalculationOptions) {
  const { processBatch, ...rest } = useBulkMetricsCalculation(options);
  const { categorize } = useCategorizeSchemeReadiness();

  const processReady = useCallback(async (
    bookmarks: SchemeBookmark[]
  ): Promise<{
    result: BulkMetricsResult | null;
    skipped: number;
    categories: SchemeReadinessCategory;
  }> => {
    // Categorize schemes
    const categories = categorize(bookmarks);
    
    // Combine ready and partial (both can be processed)
    const processable = [...categories.ready, ...categories.partial];
    const skipped = categories.noData.length;

    if (processable.length === 0) {
      toastService.warning(
        'No schemes with NAV data available. Download NAV data first.'
      );
      return { result: null, skipped, categories };
    }

    if (skipped > 0) {
      toastService.info(
        `Skipping ${skipped} scheme(s) with no NAV data. Processing ${processable.length} schemes.`
      );
    }

    // Convert readiness objects back to bookmarks
    const bookmarksToProcess = bookmarks.filter(b => 
      processable.some(p => p.scheme_id === b.scheme_id)
    );

    // Process the ready schemes
    const result = await processBatch(bookmarksToProcess);

    return { result, skipped, categories };
  }, [processBatch, categorize]);

  return {
    processReady,
    ...rest,
  };
}

/**
 * Hook with automatic progress percentage calculation
 * Useful for progress bars
 * 
 * @param options - Optional configuration
 * @returns Object with progressPercentage added
 * 
 * @example
 * ```typescript
 * const { processBatch, progressPercentage, isProcessing } = useBulkMetricsWithProgress();
 * 
 * return (
 *   <ProgressBar value={progressPercentage} max={100} />
 * );
 * ```
 */
export function useBulkMetricsWithProgress(options?: BulkMetricsCalculationOptions) {
  const hook = useBulkMetricsCalculation(options);
  
  const progressPercentage = hook.progress.total > 0
    ? Math.round((hook.progress.current / hook.progress.total) * 100)
    : 0;

  return {
    ...hook,
    progressPercentage,
  };
}