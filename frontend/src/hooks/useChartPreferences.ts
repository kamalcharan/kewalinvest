// frontend/src/hooks/useChartPreferences.ts
// React Query hooks for user chart preferences

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { toastService } from '../services/toast.service';
import { userPreferencesService } from '../services/userPreferences.service';
import {
  ChartPreference,
  PREFERENCE_QUERY_KEYS,
  PreferenceError
} from '../types/userPreferences.types';

// Enhanced error handling
const handleAPIError = (error: any, defaultMessage: string) => {
  console.error('Chart Preferences API Error:', error);
  
  const message = error instanceof PreferenceError 
    ? error.message 
    : defaultMessage;
  
  toastService.error(message);
  return new Error(message);
};

/**
 * Hook to fetch chart preference for a specific index
 * Returns null if no preference exists (frontend should use theme default)
 */
export function useChartPreference(indexId: number, enabled: boolean = true) {
  const { user } = useAuth();

  return useQuery<ChartPreference | null, Error>({
    queryKey: PREFERENCE_QUERY_KEYS.chart(indexId),
    queryFn: async (): Promise<ChartPreference | null> => {
      if (!user) {
        throw new Error('Authentication required');
      }

      try {
        return await userPreferencesService.getColorPreference(indexId);
      } catch (error) {
        // Don't show error toast for "not found" - it's expected
        if (error instanceof PreferenceError && error.message.includes('not found')) {
          return null;
        }
        throw handleAPIError(error, 'Failed to load chart preference');
      }
    },
    enabled: !!user && !!indexId && indexId > 0 && enabled,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
  });
}

/**
 * Hook to fetch all chart preferences for current user
 */
export function useAllChartPreferences(enabled: boolean = true) {
  const { user } = useAuth();

  return useQuery<ChartPreference[], Error>({
    queryKey: PREFERENCE_QUERY_KEYS.allCharts(),
    queryFn: async (): Promise<ChartPreference[]> => {
      if (!user) {
        throw new Error('Authentication required');
      }

      try {
        return await userPreferencesService.getAllColorPreferences();
      } catch (error) {
        throw handleAPIError(error, 'Failed to load preferences');
      }
    },
    enabled: !!user && enabled,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
  });
}

/**
 * Mutation hook to save chart preference
 * Includes optimistic updates for instant UI feedback
 */
export function useSaveChartPreference() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation<ChartPreference, Error, { indexId: number; lineColor: string }>({
    mutationFn: async (params: { indexId: number; lineColor: string }) => {
      if (!user) {
        throw new Error('Authentication required');
      }

      try {
        return await userPreferencesService.saveColorPreference(params.indexId, params.lineColor);
      } catch (error) {
        throw handleAPIError(error, 'Failed to save chart color');
      }
    },

    onMutate: async (params: { indexId: number; lineColor: string }) => {
      const { indexId, lineColor } = params;
      
      await queryClient.cancelQueries({ 
        queryKey: PREFERENCE_QUERY_KEYS.chart(indexId) 
      });

      const previousPreference = queryClient.getQueryData<ChartPreference | null>(
        PREFERENCE_QUERY_KEYS.chart(indexId)
      );

      // Optimistic update with ISO strings
      const optimisticPreference: ChartPreference = {
        index_id: indexId,
        line_color: lineColor,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      queryClient.setQueryData<ChartPreference | null>(
        PREFERENCE_QUERY_KEYS.chart(indexId),
        optimisticPreference
      );

      return { previousPreference, indexId };
    },

    onSuccess: (_data: ChartPreference, params: { indexId: number; lineColor: string }) => {
      queryClient.invalidateQueries({ 
        queryKey: PREFERENCE_QUERY_KEYS.chart(params.indexId) 
      });
      queryClient.invalidateQueries({ 
        queryKey: PREFERENCE_QUERY_KEYS.allCharts() 
      });

      toastService.success('Chart color saved');
    },

    onError: (_error: Error, params: { indexId: number; lineColor: string }, context: any) => {
      if (context?.previousPreference !== undefined) {
        queryClient.setQueryData(
          PREFERENCE_QUERY_KEYS.chart(params.indexId),
          context.previousPreference
        );
      }
    },
  });
}

/**
 * Mutation hook to delete chart preference
 * After deletion, frontend should fallback to theme default
 */
export function useDeleteChartPreference() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation<void, Error, number>({
    mutationFn: async (indexId: number) => {
      if (!user) {
        throw new Error('Authentication required');
      }

      try {
        await userPreferencesService.deleteColorPreference(indexId);
      } catch (error) {
        throw handleAPIError(error, 'Failed to delete preference');
      }
    },

    onSuccess: (_data: void, indexId: number) => {
      queryClient.setQueryData<ChartPreference | null>(
        PREFERENCE_QUERY_KEYS.chart(indexId),
        null
      );

      queryClient.invalidateQueries({ 
        queryKey: PREFERENCE_QUERY_KEYS.allCharts() 
      });

      toastService.success('Reverted to theme default color');
    },

    onError: (_error: Error) => {
      // Error already handled by handleAPIError in mutationFn
    },
  });
}

/**
 * Helper hook to get effective color (saved preference OR theme default)
 */
export function useEffectiveChartColor(indexId: number, defaultColor: string): string {
  const { data: preference, isLoading } = useChartPreference(indexId);

  if (isLoading) {
    return defaultColor;
  }

  return preference?.line_color || defaultColor;
}

/**
 * Helper hook to check if user has customized color for an index
 */
export function useHasCustomColor(indexId: number): boolean {
  const { data: preference, isLoading } = useChartPreference(indexId);

  if (isLoading) {
    return false;
  }

  return preference !== null;
}

/**
 * Cache management helpers
 */
export const chartPreferenceHelpers = {
  getCachedPreference: (queryClient: any, indexId: number): ChartPreference | null | undefined => {
    return queryClient.getQueryData(PREFERENCE_QUERY_KEYS.chart(indexId));
  },

  getAllCachedPreferences: (queryClient: any): ChartPreference[] | undefined => {
    return queryClient.getQueryData(PREFERENCE_QUERY_KEYS.allCharts());
  },

  setCachedPreference: (queryClient: any, indexId: number, preference: ChartPreference | null) => {
    queryClient.setQueryData(PREFERENCE_QUERY_KEYS.chart(indexId), preference);
  },

  invalidatePreference: (queryClient: any, indexId: number) => {
    queryClient.invalidateQueries({ 
      queryKey: PREFERENCE_QUERY_KEYS.chart(indexId) 
    });
  },

  invalidateAllPreferences: (queryClient: any) => {
    queryClient.invalidateQueries({ 
      queryKey: PREFERENCE_QUERY_KEYS.charts() 
    });
  },

  prefetchPreference: async (queryClient: any, indexId: number) => {
    await queryClient.prefetchQuery({
      queryKey: PREFERENCE_QUERY_KEYS.chart(indexId),
      staleTime: 10 * 60 * 1000,
    });
  },
};