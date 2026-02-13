// frontend/src/hooks/useCustomers.ts

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import toastService from '../services/toast.service';
import apiService from '../services/api.service';
import { API_ENDPOINTS, CUSTOMER_URLS, buildQueryParams, getAPIErrorMessage } from '../services/serviceURLs';
import {
  CustomerWithContact,
  CustomerAddress,
  CreateCustomerRequest,
  UpdateCustomerRequest,
  CreateAddressRequest,
  UpdateAddressRequest,
  CustomerSearchParams,
  CustomerListResponse,
  CustomerStats,
  ConvertToCustomerRequest,
  BookmarkReason,
  BookmarkReasonsResponse,
  CreateCustomerBookmarkRequest,
  UpdateCustomerBookmarkRequest,
  BookmarkResponse
} from '../types/customer.types';

// Query Keys for consistent caching
// UPDATED: Added bookmark-related and family-related keys
export const CUSTOMER_QUERY_KEYS = {
  all: ['customers'] as const,
  lists: () => [...CUSTOMER_QUERY_KEYS.all, 'list'] as const,
  list: (params: CustomerSearchParams) => [...CUSTOMER_QUERY_KEYS.lists(), params] as const,
  details: () => [...CUSTOMER_QUERY_KEYS.all, 'detail'] as const,
  detail: (id: number) => [...CUSTOMER_QUERY_KEYS.details(), id] as const,
  stats: () => [...CUSTOMER_QUERY_KEYS.all, 'stats'] as const,
  addresses: (customerId: number) => [...CUSTOMER_QUERY_KEYS.detail(customerId), 'addresses'] as const,
  bookmarkReasons: () => [...CUSTOMER_QUERY_KEYS.all, 'bookmark-reasons'] as const,
  familyMembers: (familyCode: string) => [...CUSTOMER_QUERY_KEYS.all, 'family', familyCode] as const,
} as const;

// Enhanced error handling
const handleAPIError = (error: any, defaultMessage: string) => {
  console.error('API Error:', error);
  
  const message = getAPIErrorMessage(error) || defaultMessage;
  toastService.error(message);
  return new Error(message);
};

// Hook for getting customer list
export function useCustomers(params: CustomerSearchParams = {}) {
  const { user, tenantId, environment } = useAuth();

  return useQuery<CustomerListResponse, Error>({
    queryKey: CUSTOMER_QUERY_KEYS.list(params),
    queryFn: async (): Promise<CustomerListResponse> => {
      if (!user || !tenantId) {
        throw new Error('Authentication required');
      }

      try {
        const endpoint = `${API_ENDPOINTS.CUSTOMERS.LIST}${buildQueryParams(params, environment)}`;
        const response = await apiService.get<{ success: boolean; data: CustomerListResponse; error?: string }>(endpoint);
        
        if (!response.success) {
          throw new Error(response.error || 'Failed to fetch customers');
        }

        return response.data;
      } catch (error) {
        throw handleAPIError(error, 'Failed to load customers');
      }
    },
    enabled: !!user && !!tenantId,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: 2,
    refetchOnWindowFocus: false,
  });
}

// Hook for getting single customer
export function useCustomer(customerId: number) {
  const { user, tenantId, environment } = useAuth();

  return useQuery<CustomerWithContact, Error>({
    queryKey: CUSTOMER_QUERY_KEYS.detail(customerId),
    queryFn: async (): Promise<CustomerWithContact> => {
      if (!user || !tenantId) {
        throw new Error('Authentication required');
      }

      try {
        const endpoint = `${API_ENDPOINTS.CUSTOMERS.GET(customerId)}${buildQueryParams({}, environment)}`;
        const response = await apiService.get<{ success: boolean; data: CustomerWithContact; error?: string }>(endpoint);
        
        if (!response.success) {
          throw new Error(response.error || 'Customer not found');
        }

        return response.data;
      } catch (error) {
        throw handleAPIError(error, 'Failed to load customer details');
      }
    },
    enabled: !!user && !!tenantId && !!customerId && customerId > 0,
    staleTime: 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 1,
  });
}

// Hook for customer statistics
export function useCustomerStats() {
  const { user, tenantId, environment } = useAuth();

  return useQuery<CustomerStats, Error>({
    queryKey: CUSTOMER_QUERY_KEYS.stats(),
    queryFn: async (): Promise<CustomerStats> => {
      if (!user || !tenantId) {
        throw new Error('Authentication required');
      }

      try {
        const endpoint = `${API_ENDPOINTS.CUSTOMERS.STATS}${buildQueryParams({}, environment)}`;
        const response = await apiService.get<{ success: boolean; data: CustomerStats; error?: string }>(endpoint);
        
        if (!response.success) {
          throw new Error(response.error || 'Failed to fetch customer statistics');
        }

        return response.data;
      } catch (error) {
        throw handleAPIError(error, 'Failed to load customer statistics');
      }
    },
    enabled: !!user && !!tenantId,
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 2,
  });
}

// Mutation for creating customer
export function useCreateCustomer() {
  const queryClient = useQueryClient();
  const { user, tenantId, environment } = useAuth();

  return useMutation<CustomerWithContact, Error, CreateCustomerRequest>({
    mutationFn: async (customerData: CreateCustomerRequest): Promise<CustomerWithContact> => {
      if (!user || !tenantId) {
        throw new Error('Authentication required');
      }

      const endpoint = `${API_ENDPOINTS.CUSTOMERS.CREATE}${buildQueryParams({}, environment)}`;
      const response = await apiService.post<{ success: boolean; data: CustomerWithContact; error?: string }>(
        endpoint,
        customerData
      );

      if (!response.success) {
        throw new Error(response.error || 'Failed to create customer');
      }

      return response.data;
    },
    onSuccess: (newCustomer) => {
      queryClient.invalidateQueries({ queryKey: CUSTOMER_QUERY_KEYS.lists() });
      queryClient.invalidateQueries({ queryKey: CUSTOMER_QUERY_KEYS.stats() });
      queryClient.setQueryData(CUSTOMER_QUERY_KEYS.detail(newCustomer.id), newCustomer);
      toastService.success(`Customer "${newCustomer.name}" created successfully`);
    },
    onError: (error) => {
      handleAPIError(error, 'Failed to create customer');
    }
  });
}

// Mutation for updating customer
export function useUpdateCustomer() {
  const queryClient = useQueryClient();
  const { user, tenantId, environment } = useAuth();

  return useMutation<CustomerWithContact, Error, { id: number; data: UpdateCustomerRequest }>({
    mutationFn: async ({ id, data }): Promise<CustomerWithContact> => {
      if (!user || !tenantId) {
        throw new Error('Authentication required');
      }

      const endpoint = `${API_ENDPOINTS.CUSTOMERS.UPDATE(id)}${buildQueryParams({}, environment)}`;
      const response = await apiService.put<{ success: boolean; data: CustomerWithContact; error?: string }>(
        endpoint,
        data
      );

      if (!response.success) {
        throw new Error(response.error || 'Failed to update customer');
      }

      return response.data;
    },
    onSuccess: (updatedCustomer) => {
      queryClient.invalidateQueries({ queryKey: CUSTOMER_QUERY_KEYS.lists() });
      queryClient.invalidateQueries({ queryKey: CUSTOMER_QUERY_KEYS.stats() });
      queryClient.setQueryData(CUSTOMER_QUERY_KEYS.detail(updatedCustomer.id), updatedCustomer);
      toastService.success(`Customer "${updatedCustomer.name}" updated successfully`);
    },
    onError: (error) => {
      handleAPIError(error, 'Failed to update customer');
    }
  });
}

// Mutation for deleting customer
export function useDeleteCustomer() {
  const queryClient = useQueryClient();
  const { user, tenantId, environment } = useAuth();

  return useMutation<void, Error, number>({
    mutationFn: async (customerId: number): Promise<void> => {
      if (!user || !tenantId) {
        throw new Error('Authentication required');
      }

      const endpoint = `${API_ENDPOINTS.CUSTOMERS.DELETE(customerId)}${buildQueryParams({}, environment)}`;
      const response = await apiService.delete<{ success: boolean; error?: string }>(endpoint);

      if (!response.success) {
        throw new Error(response.error || 'Failed to delete customer');
      }
    },
    onSuccess: (_, customerId) => {
      queryClient.invalidateQueries({ queryKey: CUSTOMER_QUERY_KEYS.lists() });
      queryClient.invalidateQueries({ queryKey: CUSTOMER_QUERY_KEYS.stats() });
      queryClient.removeQueries({ queryKey: CUSTOMER_QUERY_KEYS.detail(customerId) });
      toastService.success('Customer deactivated successfully');
    },
    onError: (error) => {
      handleAPIError(error, 'Failed to deactivate customer');
    }
  });
}

// Mutation for activating customer (NEW)
export function useActivateCustomer() {
  const queryClient = useQueryClient();
  const { user, tenantId, environment } = useAuth();

  return useMutation<void, Error, number>({
    mutationFn: async (customerId: number): Promise<void> => {
      if (!user || !tenantId) {
        throw new Error('Authentication required');
      }

      const endpoint = `${API_ENDPOINTS.CUSTOMERS.ACTIVATE(customerId)}${buildQueryParams({}, environment)}`;
      const response = await apiService.put<{ success: boolean; error?: string }>(endpoint, {});

      if (!response.success) {
        throw new Error(response.error || 'Failed to activate customer');
      }
    },
    onSuccess: (_, customerId) => {
      queryClient.invalidateQueries({ queryKey: CUSTOMER_QUERY_KEYS.lists() });
      queryClient.invalidateQueries({ queryKey: CUSTOMER_QUERY_KEYS.stats() });
      queryClient.invalidateQueries({ queryKey: CUSTOMER_QUERY_KEYS.detail(customerId) });
      toastService.success('Customer activated successfully');
    },
    onError: (error) => {
      handleAPIError(error, 'Failed to activate customer');
    }
  });
}

// Mutation for converting contact to customer
export function useConvertToCustomer() {
  const queryClient = useQueryClient();
  const { user, tenantId, environment } = useAuth();

  return useMutation<CustomerWithContact, Error, { contactId: number; data: ConvertToCustomerRequest }>({
    mutationFn: async ({ contactId, data }): Promise<CustomerWithContact> => {
      if (!user || !tenantId) {
        throw new Error('Authentication required');
      }

      const endpoint = `${API_ENDPOINTS.CONTACTS.CONVERT_TO_CUSTOMER(contactId)}${buildQueryParams({}, environment)}`;
      const response = await apiService.post<{ success: boolean; data: CustomerWithContact; error?: string }>(
        endpoint,
        data
      );

      if (!response.success) {
        throw new Error(response.error || 'Failed to convert contact to customer');
      }

      return response.data;
    },
    onSuccess: (newCustomer) => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      queryClient.invalidateQueries({ queryKey: CUSTOMER_QUERY_KEYS.lists() });
      queryClient.invalidateQueries({ queryKey: CUSTOMER_QUERY_KEYS.stats() });
      queryClient.setQueryData(CUSTOMER_QUERY_KEYS.detail(newCustomer.id), newCustomer);
      toastService.success('Contact successfully converted to customer');
    },
    onError: (error) => {
      handleAPIError(error, 'Failed to convert contact to customer');
    }
  });
}

// Mutation for adding customer address
export function useAddCustomerAddress() {
  const queryClient = useQueryClient();
  const { user, tenantId, environment } = useAuth();

  return useMutation<CustomerAddress, Error, { customerId: number; data: CreateAddressRequest }>({
    mutationFn: async ({ customerId, data }): Promise<CustomerAddress> => {
      if (!user || !tenantId) {
        throw new Error('Authentication required');
      }

      const endpoint = `${API_ENDPOINTS.CUSTOMERS.ADD_ADDRESS(customerId)}${buildQueryParams({}, environment)}`;
      const response = await apiService.post<{ success: boolean; data: CustomerAddress; error?: string }>(
        endpoint,
        data
      );

      if (!response.success) {
        throw new Error(response.error || 'Failed to add address');
      }

      return response.data;
    },
    onSuccess: (_, { customerId }) => {
      queryClient.invalidateQueries({ queryKey: CUSTOMER_QUERY_KEYS.detail(customerId) });
      queryClient.invalidateQueries({ queryKey: CUSTOMER_QUERY_KEYS.addresses(customerId) });
      toastService.success('Address added successfully');
    },
    onError: (error) => {
      handleAPIError(error, 'Failed to add address');
    }
  });
}

// Mutation for updating customer address
export function useUpdateCustomerAddress() {
  const queryClient = useQueryClient();
  const { user, tenantId, environment } = useAuth();

  return useMutation<CustomerAddress, Error, { customerId: number; addressId: number; data: UpdateAddressRequest }>({
    mutationFn: async ({ customerId, addressId, data }): Promise<CustomerAddress> => {
      if (!user || !tenantId) {
        throw new Error('Authentication required');
      }

      const endpoint = `${API_ENDPOINTS.CUSTOMERS.UPDATE_ADDRESS(customerId, addressId)}${buildQueryParams({}, environment)}`;
      const response = await apiService.put<{ success: boolean; data: CustomerAddress; error?: string }>(
        endpoint,
        data
      );

      if (!response.success) {
        throw new Error(response.error || 'Failed to update address');
      }

      return response.data;
    },
    onSuccess: (_, { customerId }) => {
      queryClient.invalidateQueries({ queryKey: CUSTOMER_QUERY_KEYS.detail(customerId) });
      queryClient.invalidateQueries({ queryKey: CUSTOMER_QUERY_KEYS.addresses(customerId) });
      toastService.success('Address updated successfully');
    },
    onError: (error) => {
      handleAPIError(error, 'Failed to update address');
    }
  });
}

// Mutation for deleting customer address
export function useDeleteCustomerAddress() {
  const queryClient = useQueryClient();
  const { user, tenantId, environment } = useAuth();

  return useMutation<void, Error, { customerId: number; addressId: number }>({
    mutationFn: async ({ customerId, addressId }): Promise<void> => {
      if (!user || !tenantId) {
        throw new Error('Authentication required');
      }

      const endpoint = `${API_ENDPOINTS.CUSTOMERS.DELETE_ADDRESS(customerId, addressId)}${buildQueryParams({}, environment)}`;
      const response = await apiService.delete<{ success: boolean; error?: string }>(endpoint);

      if (!response.success) {
        throw new Error(response.error || 'Failed to delete address');
      }
    },
    onSuccess: (_, { customerId }) => {
      queryClient.invalidateQueries({ queryKey: CUSTOMER_QUERY_KEYS.detail(customerId) });
      queryClient.invalidateQueries({ queryKey: CUSTOMER_QUERY_KEYS.addresses(customerId) });
      toastService.success('Address deleted successfully');
    },
    onError: (error) => {
      handleAPIError(error, 'Failed to delete address');
    }
  });
}

// ==================== BOOKMARK HOOKS (NEW) ====================

/**
 * Hook for getting bookmark reasons
 * Fetches the list of available bookmark reasons for the tenant
 */
export function useBookmarkReasons() {
  const { user, tenantId, environment } = useAuth();

  return useQuery<BookmarkReason[], Error>({
    queryKey: CUSTOMER_QUERY_KEYS.bookmarkReasons(),
    queryFn: async (): Promise<BookmarkReason[]> => {
      if (!user || !tenantId) {
        throw new Error('Authentication required');
      }

      try {
        const endpoint = CUSTOMER_URLS.getBookmarkReasons(environment);
        const response = await apiService.get<BookmarkReasonsResponse>(endpoint);
        
        if (!response.success) {
          throw new Error('Failed to fetch bookmark reasons');
        }

        return response.data.reasons;
      } catch (error) {
        throw handleAPIError(error, 'Failed to load bookmark reasons');
      }
    },
    enabled: !!user && !!tenantId,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes (reasons don't change often)
    gcTime: 30 * 60 * 1000,
    retry: 2,
  });
}

/**
 * Mutation for bookmarking a customer
 * Creates or updates a bookmark for the specified customer
 */
export function useBookmarkCustomer() {
  const queryClient = useQueryClient();
  const { user, tenantId, environment } = useAuth();

  return useMutation<void, Error, { customerId: number; data: CreateCustomerBookmarkRequest }>({
    mutationFn: async ({ customerId, data }): Promise<void> => {
      if (!user || !tenantId) {
        throw new Error('Authentication required');
      }

      const endpoint = CUSTOMER_URLS.addBookmark(customerId, environment);
      const response = await apiService.post<BookmarkResponse>(endpoint, data);

      if (!response.success) {
        throw new Error(response.error || 'Failed to bookmark customer');
      }
    },
    onSuccess: (_, { customerId }) => {
      // Invalidate customer lists to refresh bookmark status
      queryClient.invalidateQueries({ queryKey: CUSTOMER_QUERY_KEYS.lists() });
      // Invalidate stats to update bookmarked count
      queryClient.invalidateQueries({ queryKey: CUSTOMER_QUERY_KEYS.stats() });
      // Invalidate specific customer detail to show updated bookmark
      queryClient.invalidateQueries({ queryKey: CUSTOMER_QUERY_KEYS.detail(customerId) });
      
      toastService.success('Customer bookmarked successfully');
    },
    onError: (error) => {
      handleAPIError(error, 'Failed to bookmark customer');
    }
  });
}

/**
 * Mutation for removing a bookmark from a customer
 * Soft deletes the bookmark
 */
export function useUnbookmarkCustomer() {
  const queryClient = useQueryClient();
  const { user, tenantId, environment } = useAuth();

  return useMutation<void, Error, number>({
    mutationFn: async (customerId: number): Promise<void> => {
      if (!user || !tenantId) {
        throw new Error('Authentication required');
      }

      const endpoint = CUSTOMER_URLS.removeBookmark(customerId, environment);
      const response = await apiService.delete<{ success: boolean; message: string; error?: string }>(endpoint);

      if (!response.success) {
        throw new Error(response.error || 'Failed to remove bookmark');
      }
    },
    onSuccess: (_, customerId) => {
      // Invalidate customer lists to refresh bookmark status
      queryClient.invalidateQueries({ queryKey: CUSTOMER_QUERY_KEYS.lists() });
      // Invalidate stats to update bookmarked count
      queryClient.invalidateQueries({ queryKey: CUSTOMER_QUERY_KEYS.stats() });
      // Invalidate specific customer detail to remove bookmark
      queryClient.invalidateQueries({ queryKey: CUSTOMER_QUERY_KEYS.detail(customerId) });
      
      toastService.success('Bookmark removed successfully');
    },
    onError: (error) => {
      handleAPIError(error, 'Failed to remove bookmark');
    }
  });
}

/**
 * Mutation for updating an existing bookmark
 * Updates bookmark reason or notes
 */
export function useUpdateBookmark() {
  const queryClient = useQueryClient();
  const { user, tenantId, environment } = useAuth();

  return useMutation<void, Error, { customerId: number; data: UpdateCustomerBookmarkRequest }>({
    mutationFn: async ({ customerId, data }): Promise<void> => {
      if (!user || !tenantId) {
        throw new Error('Authentication required');
      }

      const endpoint = CUSTOMER_URLS.updateBookmark(customerId, environment);
      const response = await apiService.patch<BookmarkResponse>(endpoint, data);

      if (!response.success) {
        throw new Error(response.error || 'Failed to update bookmark');
      }
    },
    onSuccess: (_, { customerId }) => {
      // Invalidate customer lists to refresh bookmark info
      queryClient.invalidateQueries({ queryKey: CUSTOMER_QUERY_KEYS.lists() });
      // Invalidate specific customer detail to show updated bookmark
      queryClient.invalidateQueries({ queryKey: CUSTOMER_QUERY_KEYS.detail(customerId) });

      toastService.success('Bookmark updated successfully');
    },
    onError: (error) => {
      handleAPIError(error, 'Failed to update bookmark');
    }
  });
}

// ==================== FAMILY HOOKS (NEW) ====================

/**
 * Hook for getting family members by family code
 * Fetches all members of a family including the family head
 */
export function useFamilyMembers(familyCode: string, enabled: boolean = true) {
  const { user, tenantId, environment } = useAuth();

  return useQuery<{ family_code: string; members: Array<{ id: number; name: string; iwell_code: string; is_family_head: boolean }>; total: number }, Error>({
    queryKey: CUSTOMER_QUERY_KEYS.familyMembers(familyCode),
    queryFn: async () => {
      if (!user || !tenantId) {
        throw new Error('Authentication required');
      }

      try {
        const endpoint = CUSTOMER_URLS.getFamilyMembers(familyCode, environment);
        const response = await apiService.get<{ success: boolean; data: { family_code: string; members: Array<{ id: number; name: string; iwell_code: string; is_family_head: boolean }>; total: number }; error?: string }>(endpoint);

        if (!response.success) {
          throw new Error(response.error || 'Failed to fetch family members');
        }

        return response.data;
      } catch (error) {
        throw handleAPIError(error, 'Failed to load family members');
      }
    },
    enabled: !!user && !!tenantId && !!familyCode && enabled,
    staleTime: 2 * 60 * 1000, // Cache for 2 minutes
    gcTime: 10 * 60 * 1000,
    retry: 1,
  });
}

// Helper functions for cache management
export const customerQueryHelpers = {
  getCachedCustomers: (queryClient: any, params: CustomerSearchParams = {}) => {
    return queryClient.getQueryData(CUSTOMER_QUERY_KEYS.list(params));
  },
  
  getCachedCustomer: (queryClient: any, customerId: number) => {
    return queryClient.getQueryData(CUSTOMER_QUERY_KEYS.detail(customerId));
  },
  
  getCachedStats: (queryClient: any) => {
    return queryClient.getQueryData(CUSTOMER_QUERY_KEYS.stats());
  },
  
  getCachedBookmarkReasons: (queryClient: any) => {
    return queryClient.getQueryData(CUSTOMER_QUERY_KEYS.bookmarkReasons());
  },
  
  prefetchCustomerData: async (queryClient: any, customerId: number) => {
    await queryClient.prefetchQuery({
      queryKey: CUSTOMER_QUERY_KEYS.detail(customerId),
      staleTime: 30 * 1000
    });
  },
  
  prefetchBookmarkReasons: async (queryClient: any) => {
    await queryClient.prefetchQuery({
      queryKey: CUSTOMER_QUERY_KEYS.bookmarkReasons(),
      staleTime: 5 * 60 * 1000
    });
  }
};