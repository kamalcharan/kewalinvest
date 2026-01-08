// frontend/src/hooks/useCourseCorrection.ts
// React Query hooks for Course Correction feature

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { courseCorrectionService } from '../services/courseCorrection.service';
import { toastService } from '../services/toast.service';
import {
  GetCorrectionsParams,
  CreateCourseCorrectionRequest
} from '../types/courseCorrection.types';

// Query Keys
export const COURSE_CORRECTION_KEYS = {
  all: ['course-correction'] as const,
  corrections: () => [...COURSE_CORRECTION_KEYS.all, 'corrections'] as const,
  correctionsList: (params?: GetCorrectionsParams) => [...COURSE_CORRECTION_KEYS.corrections(), params] as const,
  correction: (id: number) => [...COURSE_CORRECTION_KEYS.corrections(), id] as const,
  bookmarks: () => [...COURSE_CORRECTION_KEYS.all, 'bookmarks'] as const,
  customerSchemes: (customerId: number) => [...COURSE_CORRECTION_KEYS.all, 'customer-schemes', customerId] as const,
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
 * Get schemes that a customer has transactions for
 */
export function useCustomerSchemes(customerId: number | null) {
  return useQuery({
    queryKey: COURSE_CORRECTION_KEYS.customerSchemes(customerId || 0),
    queryFn: async () => {
      if (!customerId) return [];
      const response = await courseCorrectionService.getCustomerSchemes(customerId);
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch customer schemes');
      }
      return response.data;
    },
    enabled: !!customerId
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
 * Search schemes in master data
 */
export function useSchemeSearch(search: string, page: number = 1) {
  return useQuery({
    queryKey: COURSE_CORRECTION_KEYS.schemeSearch(search),
    queryFn: async () => {
      if (!search || search.length < 2) return { schemes: [], total: 0, page: 1, page_size: 20, total_pages: 0 };
      const response = await courseCorrectionService.searchSchemes(search, page);
      if (!response.success) {
        throw new Error(response.error || 'Failed to search schemes');
      }
      return response.data;
    },
    enabled: search.length >= 2
  });
}

// ============================================================================
// MUTATION HOOKS
// ============================================================================

/**
 * Create a new course correction
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
