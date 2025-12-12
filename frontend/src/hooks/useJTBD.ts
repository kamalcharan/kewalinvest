// frontend/src/hooks/useJTBD.ts

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import JTBDService from '../services/jtbd.service';
import toastService from '../services/toast.service';
import {
  JTBDConfiguration,
  CreateJTBDRequest,
  UpdateJTBDRequest,
  JTBDDashboardStats,
  CustomerJTBDSummary,
  CalculatedAlertInstance,
  JTBDWithCommunication,
  AlertsByDate,
  // New unified types
  JTBDExecution,
  CreateExecutionRequest,
  UpdateExecutionRequest,
  CompleteExecutionRequest,
  CancelExecutionRequest,
  ExecutionFilters,
  ExecutionListResponse,
  CustomerJobsSummary,
} from '../types/jtbd.types';

// Query Keys for consistent caching
export const JTBD_QUERY_KEYS = {
  all: ['jtbd'] as const,
  lists: () => [...JTBD_QUERY_KEYS.all, 'list'] as const,
  list: (customerId: number) => [...JTBD_QUERY_KEYS.lists(), customerId] as const,
  details: () => [...JTBD_QUERY_KEYS.all, 'detail'] as const,
  detail: (id: number) => [...JTBD_QUERY_KEYS.details(), id] as const,
  summary: (customerId: number) => [...JTBD_QUERY_KEYS.all, 'summary', customerId] as const,
  stats: () => [...JTBD_QUERY_KEYS.all, 'stats'] as const,
  schemes: (customerId: number) => [...JTBD_QUERY_KEYS.all, 'schemes', customerId] as const,
  transactionTypes: () => [...JTBD_QUERY_KEYS.all, 'transaction-types'] as const,
  occurrences: (jtbdId: number) => [...JTBD_QUERY_KEYS.all, 'occurrences', jtbdId] as const,
  
  // Dashboard keys - UPDATED with date range support
  dashboard: () => [...JTBD_QUERY_KEYS.all, 'dashboard'] as const,
  upcomingAlerts: (params: {
    daysAhead?: number;
    priority?: string;
    jtbdType?: string;
    status?: string;
    startDate?: string;  // NEW
    endDate?: string;    // NEW
  }) => [...JTBD_QUERY_KEYS.dashboard(), 'upcoming', params] as const,
  alertsByDate: (startDate: string, endDate: string) =>
    [...JTBD_QUERY_KEYS.dashboard(), 'by-date', startDate, endDate] as const,
  communicationQueue: (status?: string, limit?: number) =>
    [...JTBD_QUERY_KEYS.dashboard(), 'queue', status || 'all', limit || 50] as const,

  // NEW: Execution keys (Unified JTBD v2)
  executions: () => [...JTBD_QUERY_KEYS.all, 'executions'] as const,
  executionsList: (filters?: ExecutionFilters) =>
    [...JTBD_QUERY_KEYS.executions(), 'list', filters] as const,
  executionDetail: (id: number) =>
    [...JTBD_QUERY_KEYS.executions(), 'detail', id] as const,
  upcomingExecutions: (days?: number) =>
    [...JTBD_QUERY_KEYS.executions(), 'upcoming', days || 30] as const,
  customerJobsSummary: (customerId: number) =>
    [...JTBD_QUERY_KEYS.all, 'jobs-summary', customerId] as const,
} as const;

// Error handling
const handleAPIError = (error: any, defaultMessage: string) => {
  console.error('JTBD API Error:', error);
  const message = error?.response?.data?.error || error?.message || defaultMessage;
  toastService.error(message);
  return new Error(message);
};

/**
 * Hook: Get all JTBDs for a customer
 */
export function useCustomerJTBDs(customerId?: number) {
  const { user, tenantId } = useAuth();

  return useQuery<JTBDConfiguration[], Error>({
    queryKey: customerId ? JTBD_QUERY_KEYS.list(customerId) : ['jtbd', 'empty'],
    queryFn: async (): Promise<JTBDConfiguration[]> => {
      if (!user || !tenantId || !customerId) {
        throw new Error('Authentication or customer ID required');
      }

      const response = await JTBDService.getCustomerJTBDs(customerId);
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch JTBDs');
      }

      return response.data;
    },
    enabled: !!user && !!tenantId && !!customerId,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook: Get single JTBD by ID
 */
export function useJTBD(jtbdId?: number) {
  const { user, tenantId } = useAuth();

  return useQuery<JTBDConfiguration, Error>({
    queryKey: jtbdId ? JTBD_QUERY_KEYS.detail(jtbdId) : ['jtbd', 'empty'],
    queryFn: async (): Promise<JTBDConfiguration> => {
      if (!user || !tenantId || !jtbdId) {
        throw new Error('Authentication or JTBD ID required');
      }

      const response = await JTBDService.getJTBD(jtbdId);
      
      if (!response.success) {
        throw new Error(response.error || 'JTBD not found');
      }

      return response.data;
    },
    enabled: !!user && !!tenantId && !!jtbdId,
    staleTime: 60 * 1000, // 1 minute
  });
}

/**
 * Hook: Get customer JTBD summary
 */
export function useCustomerJTBDSummary(customerId?: number) {
  const { user, tenantId } = useAuth();

  return useQuery<CustomerJTBDSummary, Error>({
    queryKey: customerId ? JTBD_QUERY_KEYS.summary(customerId) : ['jtbd', 'summary', 'empty'],
    queryFn: async (): Promise<CustomerJTBDSummary> => {
      if (!user || !tenantId || !customerId) {
        throw new Error('Authentication or customer ID required');
      }

      const response = await JTBDService.getCustomerSummary(customerId);
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch summary');
      }

      return response.data;
    },
    enabled: !!user && !!tenantId && !!customerId,
    staleTime: 30 * 1000,
  });
}

/**
 * Hook: Get dashboard statistics
 */
export function useJTBDStats() {
  const { user, tenantId } = useAuth();

  return useQuery<JTBDDashboardStats, Error>({
    queryKey: JTBD_QUERY_KEYS.stats(),
    queryFn: async (): Promise<JTBDDashboardStats> => {
      if (!user || !tenantId) {
        throw new Error('Authentication required');
      }

      const response = await JTBDService.getDashboardStats();
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch stats');
      }

      return response.data;
    },
    enabled: !!user && !!tenantId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Hook: Get customer schemes (for dropdown)
 */
export function useCustomerSchemes(customerId?: number) {
  const { user, tenantId } = useAuth();

  return useQuery({
    queryKey: customerId ? JTBD_QUERY_KEYS.schemes(customerId) : ['jtbd', 'schemes', 'empty'],
    queryFn: async () => {
      if (!user || !tenantId || !customerId) {
        throw new Error('Authentication or customer ID required');
      }

      const response = await JTBDService.getCustomerSchemes(customerId);
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch schemes');
      }

      return response.data;
    },
    enabled: !!user && !!tenantId && !!customerId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook: Get transaction types (for dropdown)
 */
export function useTransactionTypes() {
  const { user, tenantId } = useAuth();

  return useQuery({
    queryKey: JTBD_QUERY_KEYS.transactionTypes(),
    queryFn: async () => {
      if (!user || !tenantId) {
        throw new Error('Authentication required');
      }

      const response = await JTBDService.getTransactionTypes();
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch transaction types');
      }

      return response.data;
    },
    enabled: !!user && !!tenantId,
    staleTime: 10 * 60 * 1000, // 10 minutes (rarely changes)
  });
}

/**
 * Hook: Get portfolio alert occurrences
 */
export function usePortfolioOccurrences(jtbdId?: number) {
  const { user, tenantId } = useAuth();

  return useQuery<CalculatedAlertInstance[], Error>({
    queryKey: jtbdId ? JTBD_QUERY_KEYS.occurrences(jtbdId) : ['jtbd', 'occurrences', 'empty'],
    queryFn: async (): Promise<CalculatedAlertInstance[]> => {
      if (!user || !tenantId || !jtbdId) {
        throw new Error('Authentication or JTBD ID required');
      }

      const response = await JTBDService.getPortfolioOccurrences(jtbdId);
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch occurrences');
      }

      return response.data;
    },
    enabled: !!user && !!tenantId && !!jtbdId,
    staleTime: 60 * 1000,
  });
}

/**
 * Hook: Get upcoming alerts with communication status
 * UPDATED: Added date range support
 */
export function useUpcomingAlerts(
  daysAhead: number = 30,
  priority?: 'critical' | 'high' | 'medium' | 'low',
  jtbdType?: 'portfolio_alert' | 'time_based' | 'profile_trigger',
  status?: 'pending' | 'overdue',
  startDate?: string,  // NEW: YYYY-MM-DD format
  endDate?: string     // NEW: YYYY-MM-DD format
) {
  const { user, tenantId } = useAuth();

  return useQuery<JTBDWithCommunication[], Error>({
    queryKey: JTBD_QUERY_KEYS.upcomingAlerts({
      daysAhead,
      priority: priority || '',
      jtbdType: jtbdType || '',
      status: status || '',
      startDate: startDate || '',  // NEW
      endDate: endDate || ''        // NEW
    }),
    queryFn: async (): Promise<JTBDWithCommunication[]> => {
      if (!user || !tenantId) {
        throw new Error('Authentication required');
      }

      console.log('🔵 useUpcomingAlerts: Fetching with params:', {
        daysAhead,
        priority,
        jtbdType,
        status,
        startDate,
        endDate
      });

      const response = await JTBDService.getUpcomingAlerts(
        daysAhead,
        priority,
        jtbdType,
        status,
        startDate,  // NEW
        endDate     // NEW
      );

      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch upcoming alerts');
      }

      console.log('✅ useUpcomingAlerts: Data fetched successfully:', {
        count: response.data.length,
        meta: response.meta
      });

      return response.data;
    },
    enabled: !!user && !!tenantId,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook: Get alerts grouped by date
 */
export function useAlertsByDate(startDate: string, endDate: string, enabled: boolean = true) {
  const { user, tenantId } = useAuth();

  return useQuery<AlertsByDate[], Error>({
    queryKey: JTBD_QUERY_KEYS.alertsByDate(startDate, endDate),
    queryFn: async (): Promise<AlertsByDate[]> => {
      if (!user || !tenantId) {
        throw new Error('Authentication required');
      }

      const response = await JTBDService.getAlertsByDate(startDate, endDate);

      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch alerts by date');
      }

      return response.data;
    },
    enabled: !!user && !!tenantId && enabled && !!startDate && !!endDate,
    staleTime: 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook: Get communication queue
 */
export function useCommunicationQueue(
  status?: 'pending' | 'scheduled' | 'sent' | 'failed',
  limit: number = 50
) {
  const { user, tenantId } = useAuth();

  return useQuery<JTBDWithCommunication[], Error>({
    queryKey: JTBD_QUERY_KEYS.communicationQueue(status, limit),
    queryFn: async (): Promise<JTBDWithCommunication[]> => {
      if (!user || !tenantId) {
        throw new Error('Authentication required');
      }

      const response = await JTBDService.getCommunicationQueue(status, limit);

      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch communication queue');
      }

      return response.data;
    },
    enabled: !!user && !!tenantId,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}

// ============================================================================
// EXECUTION HOOKS (Unified JTBD v2 - Meetings, SIP Plans, etc.)
// ============================================================================

/**
 * Hook: Get executions with filters
 * Bot-friendly query hook for timeline views
 */
export function useJTBDExecutions(filters?: ExecutionFilters) {
  const { user, tenantId } = useAuth();

  return useQuery<ExecutionListResponse, Error>({
    queryKey: JTBD_QUERY_KEYS.executionsList(filters),
    queryFn: async (): Promise<ExecutionListResponse> => {
      if (!user || !tenantId) {
        throw new Error('Authentication required');
      }

      const response = await JTBDService.getExecutions(filters);

      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch executions');
      }

      return response.data;
    },
    enabled: !!user && !!tenantId,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook: Get single execution by ID
 */
export function useJTBDExecution(executionId?: number) {
  const { user, tenantId } = useAuth();

  return useQuery<JTBDExecution, Error>({
    queryKey: executionId ? JTBD_QUERY_KEYS.executionDetail(executionId) : ['jtbd', 'execution', 'empty'],
    queryFn: async (): Promise<JTBDExecution> => {
      if (!user || !tenantId || !executionId) {
        throw new Error('Authentication or execution ID required');
      }

      const response = await JTBDService.getExecution(executionId);

      if (!response.success) {
        throw new Error(response.error || 'Execution not found');
      }

      return response.data;
    },
    enabled: !!user && !!tenantId && !!executionId,
    staleTime: 60 * 1000, // 1 minute
  });
}

/**
 * Hook: Get upcoming executions (dashboard view)
 */
export function useUpcomingExecutions(days: number = 30) {
  const { user, tenantId } = useAuth();

  return useQuery<JTBDExecution[], Error>({
    queryKey: JTBD_QUERY_KEYS.upcomingExecutions(days),
    queryFn: async (): Promise<JTBDExecution[]> => {
      if (!user || !tenantId) {
        throw new Error('Authentication required');
      }

      const response = await JTBDService.getUpcomingExecutions(days);

      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch upcoming executions');
      }

      return response.data;
    },
    enabled: !!user && !!tenantId,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook: Get customer jobs summary (executions overview)
 */
export function useCustomerJobsSummary(customerId?: number) {
  const { user, tenantId } = useAuth();

  return useQuery<CustomerJobsSummary, Error>({
    queryKey: customerId ? JTBD_QUERY_KEYS.customerJobsSummary(customerId) : ['jtbd', 'jobs-summary', 'empty'],
    queryFn: async (): Promise<CustomerJobsSummary> => {
      if (!user || !tenantId || !customerId) {
        throw new Error('Authentication or customer ID required');
      }

      const response = await JTBDService.getCustomerJobsSummary(customerId);

      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch customer jobs summary');
      }

      return response.data;
    },
    enabled: !!user && !!tenantId && !!customerId,
    staleTime: 30 * 1000, // 30 seconds
  });
}

/**
 * Mutation: Create execution (meeting, SIP instance, etc.)
 */
export function useCreateExecution() {
  const queryClient = useQueryClient();
  const { user, tenantId } = useAuth();

  return useMutation<JTBDExecution, Error, CreateExecutionRequest>({
    mutationFn: async (data: CreateExecutionRequest) => {
      console.log('🔵 useCreateExecution: Starting mutation', {
        timestamp: new Date().toISOString(),
        customerId: data.customer_id,
        type: data.execution_type
      });

      if (!user || !tenantId) {
        throw new Error('Authentication required');
      }

      const response = await JTBDService.createExecution(data);

      if (!response.success) {
        throw new Error(response.error || 'Failed to create execution');
      }

      console.log('✅ useCreateExecution: Mutation successful', {
        timestamp: new Date().toISOString(),
        executionId: response.data.id
      });

      return response.data;
    },

    retry: false,

    onSuccess: (newExecution) => {
      console.log('🎉 useCreateExecution: onSuccess triggered', {
        timestamp: new Date().toISOString(),
        executionId: newExecution.id,
        customerId: newExecution.customer_id
      });

      // Invalidate executions list
      queryClient.invalidateQueries({
        queryKey: JTBD_QUERY_KEYS.executions()
      });

      // Invalidate upcoming executions
      queryClient.invalidateQueries({
        queryKey: JTBD_QUERY_KEYS.upcomingExecutions()
      });

      // Invalidate customer jobs summary
      queryClient.invalidateQueries({
        queryKey: JTBD_QUERY_KEYS.customerJobsSummary(newExecution.customer_id)
      });

      // Invalidate dashboard queries
      queryClient.invalidateQueries({
        queryKey: JTBD_QUERY_KEYS.dashboard()
      });

      // Set the new execution in cache
      queryClient.setQueryData(JTBD_QUERY_KEYS.executionDetail(newExecution.id), newExecution);

      toastService.success(`${newExecution.title} created successfully`);
    },

    onError: (error) => {
      console.error('❌ useCreateExecution: onError triggered', {
        timestamp: new Date().toISOString(),
        error: error.message
      });

      handleAPIError(error, 'Failed to create execution');
    },
  });
}

/**
 * Mutation: Update execution
 */
export function useUpdateExecution() {
  const queryClient = useQueryClient();
  const { user, tenantId } = useAuth();

  return useMutation<JTBDExecution, Error, { id: number; data: UpdateExecutionRequest }>({
    mutationFn: async ({ id, data }) => {
      if (!user || !tenantId) {
        throw new Error('Authentication required');
      }

      const response = await JTBDService.updateExecution(id, data);

      if (!response.success) {
        throw new Error(response.error || 'Failed to update execution');
      }

      return response.data;
    },

    retry: false,

    onSuccess: (updatedExecution) => {
      // Invalidate executions list
      queryClient.invalidateQueries({
        queryKey: JTBD_QUERY_KEYS.executions()
      });

      // Invalidate upcoming executions
      queryClient.invalidateQueries({
        queryKey: JTBD_QUERY_KEYS.upcomingExecutions()
      });

      // Invalidate customer jobs summary
      queryClient.invalidateQueries({
        queryKey: JTBD_QUERY_KEYS.customerJobsSummary(updatedExecution.customer_id)
      });

      // Update the execution in cache
      queryClient.setQueryData(JTBD_QUERY_KEYS.executionDetail(updatedExecution.id), updatedExecution);

      toastService.success(`${updatedExecution.title} updated successfully`);
    },

    onError: (error) => {
      handleAPIError(error, 'Failed to update execution');
    }
  });
}

/**
 * Mutation: Complete execution
 */
export function useCompleteExecution() {
  const queryClient = useQueryClient();
  const { user, tenantId } = useAuth();

  return useMutation<JTBDExecution, Error, { id: number; data: CompleteExecutionRequest }>({
    mutationFn: async ({ id, data }) => {
      if (!user || !tenantId) {
        throw new Error('Authentication required');
      }

      const response = await JTBDService.completeExecution(id, data);

      if (!response.success) {
        throw new Error(response.error || 'Failed to complete execution');
      }

      return response.data;
    },

    retry: false,

    onSuccess: (completedExecution) => {
      // Invalidate all execution-related queries
      queryClient.invalidateQueries({
        queryKey: JTBD_QUERY_KEYS.executions()
      });

      queryClient.invalidateQueries({
        queryKey: JTBD_QUERY_KEYS.upcomingExecutions()
      });

      queryClient.invalidateQueries({
        queryKey: JTBD_QUERY_KEYS.customerJobsSummary(completedExecution.customer_id)
      });

      // Update the execution in cache
      queryClient.setQueryData(JTBD_QUERY_KEYS.executionDetail(completedExecution.id), completedExecution);

      toastService.success(`${completedExecution.title} completed successfully`);
    },

    onError: (error) => {
      handleAPIError(error, 'Failed to complete execution');
    }
  });
}

/**
 * Mutation: Cancel execution
 */
export function useCancelExecution() {
  const queryClient = useQueryClient();
  const { user, tenantId } = useAuth();

  return useMutation<JTBDExecution, Error, { id: number; data: CancelExecutionRequest }>({
    mutationFn: async ({ id, data }) => {
      if (!user || !tenantId) {
        throw new Error('Authentication required');
      }

      const response = await JTBDService.cancelExecution(id, data);

      if (!response.success) {
        throw new Error(response.error || 'Failed to cancel execution');
      }

      return response.data;
    },

    retry: false,

    onSuccess: (cancelledExecution) => {
      // Invalidate all execution-related queries
      queryClient.invalidateQueries({
        queryKey: JTBD_QUERY_KEYS.executions()
      });

      queryClient.invalidateQueries({
        queryKey: JTBD_QUERY_KEYS.upcomingExecutions()
      });

      queryClient.invalidateQueries({
        queryKey: JTBD_QUERY_KEYS.customerJobsSummary(cancelledExecution.customer_id)
      });

      // Update the execution in cache
      queryClient.setQueryData(JTBD_QUERY_KEYS.executionDetail(cancelledExecution.id), cancelledExecution);

      toastService.success(`${cancelledExecution.title} cancelled`);
    },

    onError: (error) => {
      handleAPIError(error, 'Failed to cancel execution');
    }
  });
}

/**
 * Mutation: Delete execution
 */
export function useDeleteExecution() {
  const queryClient = useQueryClient();
  const { user, tenantId } = useAuth();

  return useMutation<void, Error, { id: number; customerId: number }>({
    mutationFn: async ({ id }) => {
      if (!user || !tenantId) {
        throw new Error('Authentication required');
      }

      const response = await JTBDService.deleteExecution(id);

      if (!response.success) {
        throw new Error('Failed to delete execution');
      }
    },

    retry: false,

    onSuccess: (_, { id, customerId }) => {
      // Invalidate all execution-related queries
      queryClient.invalidateQueries({
        queryKey: JTBD_QUERY_KEYS.executions()
      });

      queryClient.invalidateQueries({
        queryKey: JTBD_QUERY_KEYS.upcomingExecutions()
      });

      queryClient.invalidateQueries({
        queryKey: JTBD_QUERY_KEYS.customerJobsSummary(customerId)
      });

      queryClient.invalidateQueries({
        queryKey: JTBD_QUERY_KEYS.dashboard()
      });

      // Remove from cache
      queryClient.removeQueries({
        queryKey: JTBD_QUERY_KEYS.executionDetail(id)
      });

      toastService.success('Execution deleted successfully');
    },

    onError: (error) => {
      handleAPIError(error, 'Failed to delete execution');
    }
  });
}

// ============================================================================
// CONFIGURATION HOOKS (Original JTBD system)
// ============================================================================

/**
 * Mutation: Create JTBD
 * Enhanced with race condition protection
 */
export function useCreateJTBD() {
  const queryClient = useQueryClient();
  const { user, tenantId } = useAuth();

  return useMutation<JTBDConfiguration, Error, CreateJTBDRequest>({
    mutationFn: async (data: CreateJTBDRequest) => {
      console.log('🔵 useCreateJTBD: Starting mutation', {
        timestamp: new Date().toISOString(),
        customerId: data.customer_id,
        type: data.jtbd_type
      });

      if (!user || !tenantId) {
        throw new Error('Authentication required');
      }

      const response = await JTBDService.createJTBD(data);

      if (!response.success) {
        throw new Error(response.error || 'Failed to create JTBD');
      }

      console.log('✅ useCreateJTBD: Mutation successful', {
        timestamp: new Date().toISOString(),
        jtbdId: response.data.id
      });

      return response.data;
    },
    
    // CRITICAL: Disable retries to prevent duplicate submissions
    retry: false,
    
    onSuccess: (newJTBD) => {
      console.log('🎉 useCreateJTBD: onSuccess triggered', {
        timestamp: new Date().toISOString(),
        jtbdId: newJTBD.id,
        customerId: newJTBD.customer_id
      });

      // Invalidate customer's JTBD list
      queryClient.invalidateQueries({ 
        queryKey: JTBD_QUERY_KEYS.list(newJTBD.customer_id) 
      });
      
      // Invalidate customer summary
      queryClient.invalidateQueries({ 
        queryKey: JTBD_QUERY_KEYS.summary(newJTBD.customer_id) 
      });
      
      // Invalidate dashboard stats
      queryClient.invalidateQueries({ 
        queryKey: JTBD_QUERY_KEYS.stats() 
      });

      // Invalidate dashboard queries
      queryClient.invalidateQueries({ 
        queryKey: JTBD_QUERY_KEYS.dashboard() 
      });
      
      // Set the new JTBD in cache
      queryClient.setQueryData(JTBD_QUERY_KEYS.detail(newJTBD.id), newJTBD);
      
      toastService.success(`${newJTBD.title} created successfully`);
    },
    
    onError: (error) => {
      console.error('❌ useCreateJTBD: onError triggered', {
        timestamp: new Date().toISOString(),
        error: error.message
      });
      
      handleAPIError(error, 'Failed to create JTBD configuration');
    },
    
    onMutate: (variables) => {
      console.log('⏳ useCreateJTBD: onMutate triggered (mutation starting)', {
        timestamp: new Date().toISOString(),
        customerId: variables.customer_id,
        type: variables.jtbd_type
      });
    },
    
    onSettled: (data, error, variables) => {
      console.log('🏁 useCreateJTBD: onSettled triggered (mutation completed)', {
        timestamp: new Date().toISOString(),
        success: !!data,
        error: error?.message
      });
    }
  });
}

/**
 * Mutation: Update JTBD
 */
export function useUpdateJTBD() {
  const queryClient = useQueryClient();
  const { user, tenantId } = useAuth();

  return useMutation<JTBDConfiguration, Error, { id: number; data: UpdateJTBDRequest }>({
    mutationFn: async ({ id, data }) => {
      if (!user || !tenantId) {
        throw new Error('Authentication required');
      }

      const response = await JTBDService.updateJTBD(id, data);

      if (!response.success) {
        throw new Error(response.error || 'Failed to update JTBD');
      }

      return response.data;
    },
    
    retry: false,
    
    onSuccess: (updatedJTBD) => {
      // Invalidate customer's JTBD list
      queryClient.invalidateQueries({ 
        queryKey: JTBD_QUERY_KEYS.list(updatedJTBD.customer_id) 
      });
      
      // Invalidate customer summary
      queryClient.invalidateQueries({ 
        queryKey: JTBD_QUERY_KEYS.summary(updatedJTBD.customer_id) 
      });

      // Invalidate dashboard queries
      queryClient.invalidateQueries({ 
        queryKey: JTBD_QUERY_KEYS.dashboard() 
      });
      
      // Update the JTBD in cache
      queryClient.setQueryData(JTBD_QUERY_KEYS.detail(updatedJTBD.id), updatedJTBD);
      
      toastService.success(`${updatedJTBD.title} updated successfully`);
    },
    onError: (error) => {
      handleAPIError(error, 'Failed to update JTBD configuration');
    }
  });
}

/**
 * Mutation: Delete JTBD
 */
export function useDeleteJTBD() {
  const queryClient = useQueryClient();
  const { user, tenantId } = useAuth();

  return useMutation<void, Error, { id: number; customerId: number }>({
    mutationFn: async ({ id }) => {
      if (!user || !tenantId) {
        throw new Error('Authentication required');
      }

      const response = await JTBDService.deleteJTBD(id);

      if (!response.success) {
        throw new Error('Failed to delete JTBD');
      }
    },
    
    retry: false,
    
    onSuccess: (_, { id, customerId }) => {
      // Invalidate customer's JTBD list
      queryClient.invalidateQueries({ 
        queryKey: JTBD_QUERY_KEYS.list(customerId) 
      });
      
      // Invalidate customer summary
      queryClient.invalidateQueries({ 
        queryKey: JTBD_QUERY_KEYS.summary(customerId) 
      });
      
      // Invalidate dashboard stats
      queryClient.invalidateQueries({ 
        queryKey: JTBD_QUERY_KEYS.stats() 
      });

      // Invalidate dashboard queries
      queryClient.invalidateQueries({ 
        queryKey: JTBD_QUERY_KEYS.dashboard() 
      });
      
      // Remove from cache
      queryClient.removeQueries({ 
        queryKey: JTBD_QUERY_KEYS.detail(id) 
      });
      
      toastService.success('JTBD configuration deleted successfully');
    },
    onError: (error) => {
      handleAPIError(error, 'Failed to delete JTBD configuration');
    }
  });
}

/**
 * Mutation: Acknowledge alert (mark as done)
 */
export function useAcknowledgeAlert() {
  const queryClient = useQueryClient();
  const { user, tenantId } = useAuth();

  return useMutation<void, Error, { alertId: number; customerId: number }>({
    mutationFn: async ({ alertId }) => {
      if (!user || !tenantId) {
        throw new Error('Authentication required');
      }

      const response = await JTBDService.acknowledgeAlert(alertId);

      if (!response.success) {
        throw new Error(response.error || 'Failed to acknowledge alert');
      }
    },

    retry: false,

    onSuccess: (_, { customerId }) => {
      // Invalidate customer's JTBD list
      queryClient.invalidateQueries({
        queryKey: JTBD_QUERY_KEYS.list(customerId)
      });

      // Invalidate customer summary
      queryClient.invalidateQueries({
        queryKey: JTBD_QUERY_KEYS.summary(customerId)
      });

      // Invalidate dashboard queries
      queryClient.invalidateQueries({
        queryKey: JTBD_QUERY_KEYS.dashboard()
      });

      toastService.success('Alert marked as done');
    },
    onError: (error) => {
      handleAPIError(error, 'Failed to acknowledge alert');
    }
  });
}

/**
 * Mutation: Dismiss alert
 */
export function useDismissAlert() {
  const queryClient = useQueryClient();
  const { user, tenantId } = useAuth();

  return useMutation<void, Error, { alertId: number; customerId: number }>({
    mutationFn: async ({ alertId }) => {
      if (!user || !tenantId) {
        throw new Error('Authentication required');
      }

      const response = await JTBDService.dismissAlert(alertId);

      if (!response.success) {
        throw new Error(response.error || 'Failed to dismiss alert');
      }
    },

    retry: false,

    onSuccess: (_, { customerId }) => {
      // Invalidate customer's JTBD list
      queryClient.invalidateQueries({
        queryKey: JTBD_QUERY_KEYS.list(customerId)
      });

      // Invalidate customer summary
      queryClient.invalidateQueries({
        queryKey: JTBD_QUERY_KEYS.summary(customerId)
      });

      // Invalidate dashboard queries
      queryClient.invalidateQueries({
        queryKey: JTBD_QUERY_KEYS.dashboard()
      });

      toastService.success('Alert dismissed');
    },
    onError: (error) => {
      handleAPIError(error, 'Failed to dismiss alert');
    }
  });
}

/**
 * Mutation: Toggle JTBD active/inactive
 */
export function useToggleJTBD() {
  const queryClient = useQueryClient();
  const { user, tenantId } = useAuth();

  return useMutation<JTBDConfiguration, Error, number>({
    mutationFn: async (jtbdId: number) => {
      if (!user || !tenantId) {
        throw new Error('Authentication required');
      }

      const response = await JTBDService.toggleJTBD(jtbdId);

      if (!response.success) {
        throw new Error(response.error || 'Failed to toggle JTBD');
      }

      return response.data;
    },
    
    retry: false,
    
    onSuccess: (updatedJTBD) => {
      // Invalidate customer's JTBD list
      queryClient.invalidateQueries({ 
        queryKey: JTBD_QUERY_KEYS.list(updatedJTBD.customer_id) 
      });
      
      // Invalidate customer summary
      queryClient.invalidateQueries({ 
        queryKey: JTBD_QUERY_KEYS.summary(updatedJTBD.customer_id) 
      });

      // Invalidate dashboard queries
      queryClient.invalidateQueries({ 
        queryKey: JTBD_QUERY_KEYS.dashboard() 
      });
      
      // Update the JTBD in cache
      queryClient.setQueryData(JTBD_QUERY_KEYS.detail(updatedJTBD.id), updatedJTBD);
      
      toastService.success(
        updatedJTBD.is_active 
          ? `${updatedJTBD.title} activated` 
          : `${updatedJTBD.title} deactivated`
      );
    },
    onError: (error) => {
      handleAPIError(error, 'Failed to toggle JTBD configuration');
    }
  });
}

/**
 * Helper: Cache management
 */
export const jtbdQueryHelpers = {
  getCachedJTBDs: (queryClient: any, customerId: number) => {
    return queryClient.getQueryData(JTBD_QUERY_KEYS.list(customerId));
  },
  
  getCachedJTBD: (queryClient: any, jtbdId: number) => {
    return queryClient.getQueryData(JTBD_QUERY_KEYS.detail(jtbdId));
  },
  
  getCachedSummary: (queryClient: any, customerId: number) => {
    return queryClient.getQueryData(JTBD_QUERY_KEYS.summary(customerId));
  },
  
  getCachedStats: (queryClient: any) => {
    return queryClient.getQueryData(JTBD_QUERY_KEYS.stats());
  },
  
  getCachedUpcomingAlerts: (queryClient: any, params: {
    daysAhead?: number;
    priority?: string;
    jtbdType?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
  }) => {
    return queryClient.getQueryData(JTBD_QUERY_KEYS.upcomingAlerts(params));
  },
  
  getCachedAlertsByDate: (queryClient: any, startDate: string, endDate: string) => {
    return queryClient.getQueryData(JTBD_QUERY_KEYS.alertsByDate(startDate, endDate));
  },
  
  getCachedCommunicationQueue: (queryClient: any, status?: string, limit?: number) => {
    return queryClient.getQueryData(JTBD_QUERY_KEYS.communicationQueue(status, limit));
  },
};