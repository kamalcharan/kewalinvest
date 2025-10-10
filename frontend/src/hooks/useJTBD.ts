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
  AlertsByDate
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
  
  // Dashboard keys
  dashboard: () => [...JTBD_QUERY_KEYS.all, 'dashboard'] as const,
  upcomingAlerts: (params: {
    daysAhead: number;
    priority?: string;
    jtbdType?: string;
    status?: string;
  }) => [...JTBD_QUERY_KEYS.dashboard(), 'upcoming', params] as const,
  alertsByDate: (startDate: string, endDate: string) => 
    [...JTBD_QUERY_KEYS.dashboard(), 'by-date', startDate, endDate] as const,
  communicationQueue: (status?: string, limit?: number) => 
    [...JTBD_QUERY_KEYS.dashboard(), 'queue', status || 'all', limit || 50] as const,
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
 */
export function useUpcomingAlerts(
  daysAhead: number = 30,
  priority?: 'critical' | 'high' | 'medium' | 'low',
  jtbdType?: 'portfolio_alert' | 'time_based' | 'profile_trigger',
  status?: 'pending' | 'overdue'
) {
  const { user, tenantId } = useAuth();

  return useQuery<JTBDWithCommunication[], Error>({
    queryKey: JTBD_QUERY_KEYS.upcomingAlerts({
      daysAhead,
      priority: priority || '',
      jtbdType: jtbdType || '',
      status: status || ''
    }),
    queryFn: async (): Promise<JTBDWithCommunication[]> => {
      if (!user || !tenantId) {
        throw new Error('Authentication required');
      }

      const response = await JTBDService.getUpcomingAlerts(
        daysAhead,
        priority,
        jtbdType,
        status
      );

      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch upcoming alerts');
      }

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
    daysAhead: number;
    priority?: string;
    jtbdType?: string;
    status?: string;
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