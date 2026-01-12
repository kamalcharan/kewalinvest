// frontend/src/hooks/useCourseCorrection.ts
// React Query hooks for Course Correction feature
// NOTE: Scheme search uses NAV Tracking service (not duplicate API)

import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { courseCorrectionService } from '../services/courseCorrection.service';
import { navService, SchemeSearchParams, SchemeSearchResult } from '../services/nav.service';
import { toastService } from '../services/toast.service';
import {
  GetCorrectionsParams,
  CreateCourseCorrectionRequest,
  MigrationResult
} from '../types/courseCorrection.types';

// Query Keys
export const COURSE_CORRECTION_KEYS = {
  all: ['course-correction'] as const,
  corrections: () => [...COURSE_CORRECTION_KEYS.all, 'corrections'] as const,
  correctionsList: (params?: GetCorrectionsParams) => [...COURSE_CORRECTION_KEYS.corrections(), params] as const,
  correction: (id: number) => [...COURSE_CORRECTION_KEYS.corrections(), id] as const,
  bookmarks: () => [...COURSE_CORRECTION_KEYS.all, 'bookmarks'] as const,
  impact: (schemeCode: string) => [...COURSE_CORRECTION_KEYS.all, 'impact', schemeCode] as const,
  schemeSearch: (search: string) => [...COURSE_CORRECTION_KEYS.all, 'scheme-search', search] as const,
};

// ============================================================================
// QUERY HOOKS
// ============================================================================

/**
 * Get list of course corrections
 */
export function useCorrections(params?: GetCorrectionsParams) {
  return useQuery({
    queryKey: COURSE_CORRECTION_KEYS.correctionsList(params),
    queryFn: async () => {
      const response = await courseCorrectionService.getCorrections(params);
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch corrections');
      }
      return response.data;
    }
  });
}

/**
 * Get single course correction
 */
export function useCorrection(id: number) {
  return useQuery({
    queryKey: COURSE_CORRECTION_KEYS.correction(id),
    queryFn: async () => {
      const response = await courseCorrectionService.getCorrection(id);
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch correction');
      }
      return response.data;
    },
    enabled: !!id
  });
}

/**
 * Get bookmarked schemes for source selection
 */
export function useBookmarkedSchemes() {
  return useQuery({
    queryKey: COURSE_CORRECTION_KEYS.bookmarks(),
    queryFn: async () => {
      const response = await courseCorrectionService.getBookmarks();
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch bookmarks');
      }
      return response.data;
    }
  });
}

/**
 * Get impact analysis for a scheme code
 */
export function useImpactAnalysis(schemeCode: string | null) {
  return useQuery({
    queryKey: COURSE_CORRECTION_KEYS.impact(schemeCode || ''),
    queryFn: async () => {
      if (!schemeCode) return null;
      const response = await courseCorrectionService.getImpactAnalysis(schemeCode);
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch impact analysis');
      }
      return response.data;
    },
    enabled: !!schemeCode
  });
}

/**
 * Search schemes using NAV Tracking service (global scheme master)
 * Returns a function to trigger search on button click (not on keystroke)
 */
export function useSchemeSearch() {
  const [schemes, setSchemes] = useState<SchemeSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [lastSearchTerm, setLastSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<{
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
  } | null>(null);

  const searchSchemes = useCallback(async (search: string, page: number = 1) => {
    if (!search || search.trim().length < 2) {
      setError('Search must be at least 2 characters');
      return;
    }

    setIsLoading(true);
    setError(null);
    setLastSearchTerm(search.trim());

    try {
      const params: SchemeSearchParams = {
        search: search.trim(),
        page,
        page_size: 20
      };
      const response = await navService.searchSchemes(params);

      if (response.success && response.data) {
        setSchemes(response.data.schemes || []);
        setPagination({
          total: response.data.total,
          page: response.data.page,
          page_size: response.data.page_size,
          total_pages: response.data.total_pages
        });
      } else {
        setError(response.error || 'Search failed');
        setSchemes([]);
      }
    } catch (err: any) {
      setError(err.message || 'Search failed');
      setSchemes([]);
    } finally {
      setIsLoading(false);
      setHasSearched(true);
    }
  }, []);

  const clearSearch = useCallback(() => {
    setSchemes([]);
    setError(null);
    setPagination(null);
    setHasSearched(false);
    setLastSearchTerm('');
  }, []);

  return {
    schemes,
    isLoading,
    hasSearched,
    lastSearchTerm,
    error,
    pagination,
    searchSchemes,
    clearSearch
  };
}

// ============================================================================
// MUTATION HOOKS
// ============================================================================

/**
 * Create a new course correction (pending only - use useMigrateCorrection for complete flow)
 */
export function useCreateCorrection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: CreateCourseCorrectionRequest) => {
      const response = await courseCorrectionService.createCorrection(request);
      if (!response.success) {
        throw new Error(response.error || 'Failed to create correction');
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: COURSE_CORRECTION_KEYS.corrections() });
      toastService.success('Course correction created');
    },
    onError: (error: Error) => {
      toastService.error(error.message);
    }
  });
}

/**
 * Complete migration in one step: Create → Execute → Regenerate Snapshots
 * Returns detailed progress for each step
 */
export function useMigrateCorrection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: CreateCourseCorrectionRequest): Promise<MigrationResult> => {
      const response = await courseCorrectionService.migrateCorrection(request);
      if (!response.success) {
        throw new Error(response.error || 'Migration failed');
      }
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: COURSE_CORRECTION_KEYS.corrections() });
      // Don't show toast here - let the modal show the completion state
    },
    onError: (error: Error) => {
      toastService.error(error.message);
    }
  });
}

/**
 * Execute a pending course correction
 */
export function useExecuteCorrection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const response = await courseCorrectionService.executeCorrection(id);
      if (!response.success) {
        throw new Error(response.error || 'Failed to execute correction');
      }
      return response.data;
    },
    onSuccess: (data: { updated_transactions: number; message: string } | undefined) => {
      queryClient.invalidateQueries({ queryKey: COURSE_CORRECTION_KEYS.corrections() });
      toastService.success(data?.message || 'Migration executed successfully');
    },
    onError: (error: Error) => {
      toastService.error(error.message);
    }
  });
}

/**
 * Rollback a completed course correction
 */
export function useRollbackCorrection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const response = await courseCorrectionService.rollbackCorrection(id);
      if (!response.success) {
        throw new Error(response.error || 'Failed to rollback correction');
      }
      return response.data;
    },
    onSuccess: (data: { restored_transactions: number; message: string } | undefined) => {
      queryClient.invalidateQueries({ queryKey: COURSE_CORRECTION_KEYS.corrections() });
      toastService.success(data?.message || 'Rollback completed successfully');
    },
    onError: (error: Error) => {
      toastService.error(error.message);
    }
  });
}

/**
 * Delete a pending course correction
 */
export function useDeleteCorrection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const response = await courseCorrectionService.deleteCorrection(id);
      if (!response.success) {
        throw new Error(response.error || 'Failed to delete correction');
      }
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: COURSE_CORRECTION_KEYS.corrections() });
      toastService.success('Correction deleted');
    },
    onError: (error: Error) => {
      toastService.error(error.message);
    }
  });
}

/**
 * Mark snapshot as regenerated
 */
export function useMarkSnapshotDone() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const response = await courseCorrectionService.markSnapshotDone(id);
      if (!response.success) {
        throw new Error(response.error || 'Failed to mark snapshot as done');
      }
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: COURSE_CORRECTION_KEYS.corrections() });
      toastService.success('Snapshot marked as regenerated');
    },
    onError: (error: Error) => {
      toastService.error(error.message);
    }
  });
}
