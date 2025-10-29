// frontend/src/hooks/useAliasBackfill.ts
// Sequential alias backfill hook - similar to bulk NAV download

import { useState, useCallback } from 'react';
import { SchemeAliasService } from '../services/schemeAlias.service';
import { toastService } from '../services/toast.service';
import { FrontendErrorLogger } from '../services/errorLogger.service';

export interface BackfillProgress {
  current: number;
  total: number;
  currentScheme: {
    scheme_code: string;
    scheme_name: string;
  } | null;
  isProcessing: boolean;
}

export interface BackfillResult {
  totalAttempted: number;
  successful: number;
  failed: number;
  skipped: number;
  details: Array<{
    schemeCode: string;
    schemeName: string;
    status: 'success' | 'failed';
    message?: string;
  }>;
}

export interface UseAliasBackfillReturn {
  processSchemes: (schemes: Array<{ scheme_id: number; scheme_code: string; scheme_name: string; scheme_nav_name?: string | null }>) => Promise<BackfillResult>;
  progress: BackfillProgress;
  cancel: () => void;
  isProcessing: boolean;
}

export const useAliasBackfill = (): UseAliasBackfillReturn => {
  const [progress, setProgress] = useState<BackfillProgress>({
    current: 0,
    total: 0,
    currentScheme: null,
    isProcessing: false
  });

  const [isCancelled, setIsCancelled] = useState(false);

  const processSchemes = useCallback(async (schemes: Array<{ scheme_id: number; scheme_code: string; scheme_name: string; scheme_nav_name?: string | null }>): Promise<BackfillResult> => {
    setIsCancelled(false);

    const result: BackfillResult = {
      totalAttempted: 0,
      successful: 0,
      failed: 0,
      skipped: 0,
      details: []
    };

    setProgress({
      current: 0,
      total: schemes.length,
      currentScheme: null,
      isProcessing: true
    });

    FrontendErrorLogger.info(
      'Starting SEQUENTIAL alias backfill',
      'useAliasBackfill',
      {
        totalSchemes: schemes.length
      }
    );

    // Process schemes ONE AT A TIME
    for (let i = 0; i < schemes.length; i++) {
      if (isCancelled) {
        result.skipped = schemes.length - i;

        FrontendErrorLogger.info(
          'Alias backfill cancelled by user',
          'useAliasBackfill',
          {
            processedCount: i,
            totalCount: schemes.length,
            remainingCount: result.skipped
          }
        );

        toastService.info(`Alias backfill cancelled. Processed ${i} of ${schemes.length} schemes.`);
        break;
      }

      const scheme = schemes[i];
      result.totalAttempted++;

      setProgress({
        current: i + 1,
        total: schemes.length,
        currentScheme: {
          scheme_code: scheme.scheme_code,
          scheme_name: scheme.scheme_name
        },
        isProcessing: true
      });

      try {
        FrontendErrorLogger.info(
          `[${i + 1}/${schemes.length}] Creating aliases for scheme`,
          'useAliasBackfill',
          {
            schemeCode: scheme.scheme_code,
            schemeName: scheme.scheme_name
          }
        );

        // Create aliases for this scheme
        const aliasesToCreate: string[] = [];

        // Add scheme_name as alias
        if (scheme.scheme_name) {
          aliasesToCreate.push(scheme.scheme_name);
        }

        // Add scheme_nav_name as alias (if different from scheme_name)
        if (scheme.scheme_nav_name &&
            scheme.scheme_nav_name.trim() !== '' &&
            scheme.scheme_nav_name.trim().toUpperCase() !== scheme.scheme_name.trim().toUpperCase()) {
          aliasesToCreate.push(scheme.scheme_nav_name);
        }

        if (aliasesToCreate.length === 0) {
          // No aliases to create, skip
          result.skipped++;
          result.details.push({
            schemeCode: scheme.scheme_code,
            schemeName: scheme.scheme_name,
            status: 'success',
            message: 'No aliases to create'
          });
          continue;
        }

        // Bulk create aliases for this scheme
        const response = await SchemeAliasService.bulkCreateAliases({
          scheme_code: scheme.scheme_code,
          aliases: aliasesToCreate,
          source: 'manual'
        });

        if (response.success) {
          result.successful++;
          result.details.push({
            schemeCode: scheme.scheme_code,
            schemeName: scheme.scheme_name,
            status: 'success',
            message: `Created ${response.created} aliases`
          });

          FrontendErrorLogger.info(
            'Aliases created successfully',
            'useAliasBackfill',
            {
              schemeCode: scheme.scheme_code,
              created: response.created,
              skipped: response.skipped
            }
          );

        } else {
          throw new Error('Failed to create aliases');
        }

      } catch (error: any) {
        result.failed++;
        const errorMessage = error?.response?.data?.error || error.message || 'Unknown error';

        result.details.push({
          schemeCode: scheme.scheme_code,
          schemeName: scheme.scheme_name,
          status: 'failed',
          message: errorMessage
        });

        FrontendErrorLogger.error(
          'Alias creation failed',
          'useAliasBackfill',
          {
            schemeCode: scheme.scheme_code,
            error: errorMessage
          },
          error.stack
        );
      }
    }

    // All done!
    setProgress({
      current: 0,
      total: 0,
      currentScheme: null,
      isProcessing: false
    });

    FrontendErrorLogger.info(
      'Alias backfill completed',
      'useAliasBackfill',
      {
        totalAttempted: result.totalAttempted,
        successful: result.successful,
        failed: result.failed,
        skipped: result.skipped,
        successRate: result.totalAttempted > 0
          ? `${((result.successful / result.totalAttempted) * 100).toFixed(1)}%`
          : '0%'
      }
    );

    // Show final summary
    if (result.successful > 0 && result.failed === 0) {
      toastService.success(
        `Successfully created aliases for ${result.successful} schemes!`
      );
    } else if (result.successful > 0) {
      toastService.info(
        `Backfill complete: ${result.successful} successful, ${result.failed} failed${result.skipped > 0 ? `, ${result.skipped} skipped` : ''}`
      );
    } else if (result.failed > 0) {
      toastService.error(
        `All ${result.failed} schemes failed. Please check logs.`
      );
    }

    return result;
  }, [isCancelled]);

  const cancel = useCallback(() => {
    setIsCancelled(true);

    FrontendErrorLogger.info(
      'Alias backfill cancellation requested',
      'useAliasBackfill',
      { currentProgress: progress.current, total: progress.total }
    );
  }, [progress]);

  return {
    processSchemes,
    progress,
    cancel,
    isProcessing: progress.isProcessing
  };
};
