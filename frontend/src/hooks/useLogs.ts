import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiService from '../services/api.service';

interface LogsFilter {
  level?: string;
  source?: string;
  hours?: string;
  page?: number;
  pageSize?: number;
}

interface LogEntry {
  id: number;
  level: string;
  source: string;
  message: string;
  context?: string;
  user_id?: number;
  tenant_id?: number;
  metadata?: any;
  stack_trace?: string;
  created_at: string;
}

interface LogsResponse {
  logs: LogEntry[];
  total: number;
  page: number;
  pageSize: number;
}

interface LogStats {
  errors24h: number;
  warnings24h: number;
  errors7d: number;
  logs1h: number;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
}

// Query keys for consistent caching
const LOGS_QUERY_KEYS = {
  all: ['logs'] as const,
  lists: () => [...LOGS_QUERY_KEYS.all, 'list'] as const,
  list: (filters: LogsFilter) => [...LOGS_QUERY_KEYS.lists(), filters] as const,
  stats: () => [...LOGS_QUERY_KEYS.all, 'stats'] as const,
};

export function useLogs(filters: LogsFilter = {}) {
  return useQuery({
    queryKey: LOGS_QUERY_KEYS.list(filters),
    queryFn: async (): Promise<LogsResponse> => {
      const response = await apiService.get('/logs', { 
        params: {
          level: filters.level || undefined,
          source: filters.source || undefined,
          hours: filters.hours || '24',
          page: filters.page || 1,
          pageSize: filters.pageSize || 50
        }
      }) as ApiResponse<LogsResponse>;

      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch logs');
      }

      return response.data;
    },
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 2 * 60 * 1000, // 2 minutes
    refetchOnWindowFocus: false,
    retry: 1,
    placeholderData: {
      logs: [],
      total: 0,
      page: 1,
      pageSize: 50
    }
  });
}

export function useLogStats() {
  return useQuery({
    queryKey: LOGS_QUERY_KEYS.stats(),
    queryFn: async (): Promise<LogStats> => {
      const response = await apiService.get('/logs/stats') as ApiResponse<LogStats>;

      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch log statistics');
      }

      return response.data;
    },
    staleTime: 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    retry: 1,
    placeholderData: {
      errors24h: 0,
      warnings24h: 0,
      errors7d: 0,
      logs1h: 0
    }
  });
}

export function useClearLogs() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<{ message: string }> => {
      const response = await apiService.delete('/logs/cleanup') as ApiResponse<{ message: string }>;

      if (!response.success) {
        throw new Error(response.error || 'Failed to clear logs');
      }

      return response.data;
    },
    onSuccess: () => {
      // Invalidate and refetch logs data
      queryClient.invalidateQueries({ queryKey: LOGS_QUERY_KEYS.all });
    },
    onError: (error: any) => {
      console.error('Error clearing logs:', error);
    }
  });
}

// Helper function to get log level color
export const getLogLevelColor = (level: string): string => {
  switch (level) {
    case 'error': return '#ff6b6b';
    case 'warn': return '#feca57';
    case 'info': return '#48dbfb';
    default: return '#ddd';
  }
};

// Helper function to format log timestamp
export const formatLogTimestamp = (timestamp: string): string => {
  return new Date(timestamp).toLocaleString();
};

// Helper function to check if log is recent (within last hour)
export const isRecentLog = (timestamp: string): boolean => {
  const logTime = new Date(timestamp).getTime();
  const oneHourAgo = Date.now() - (60 * 60 * 1000);
  return logTime > oneHourAgo;
};