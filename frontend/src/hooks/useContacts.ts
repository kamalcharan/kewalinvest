import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import toastService from '../services/toast.service';
import apiService from '../services/api.service';
import { buildQueryParams, getAPIErrorMessage } from '../services/serviceURLs';
import {
  Contact,
  ContactChannel,
  CreateContactRequest,
  UpdateContactRequest,
  ContactSearchParams,
  ContactListResponse,
  BulkActionRequest,
  BulkActionResponse,
  CreateChannelRequest,
  UpdateChannelRequest
} from '../types/contact.types';

// Enhanced type for the transformed contact list response
interface EnhancedContactListResponse extends ContactListResponse {
  contactsByStatus: {
    active: Contact[];
    inactive: Contact[];
    customers: Contact[];
    prospects: Contact[];
  };
  contactsByPrefix: Record<string, number>;
  summary: {
    total: number;
    showing: number;
    hasMore: boolean;
    avgChannelsPerContact: number;
  };
}

// Query Keys for consistent caching and AI-friendly data access
export const CONTACT_QUERY_KEYS = {
  all: ['contacts'] as const,
  lists: () => [...CONTACT_QUERY_KEYS.all, 'list'] as const,
  list: (params: ContactSearchParams) => [...CONTACT_QUERY_KEYS.lists(), params] as const,
  details: () => [...CONTACT_QUERY_KEYS.all, 'detail'] as const,
  detail: (id: number) => [...CONTACT_QUERY_KEYS.details(), id] as const,
  stats: () => [...CONTACT_QUERY_KEYS.all, 'stats'] as const,
  search: (query: string) => [...CONTACT_QUERY_KEYS.all, 'search', query] as const,
  exists: (email?: string, mobile?: string) => [...CONTACT_QUERY_KEYS.all, 'exists', { email, mobile }] as const,
  channels: () => [...CONTACT_QUERY_KEYS.all, 'channels'] as const,
  channel: (contactId: number, channelId: number) => [...CONTACT_QUERY_KEYS.channels(), contactId, channelId] as const,
} as const;

// Enhanced error handling utility
const handleAPIError = (error: any, defaultMessage: string) => {
  console.error('API Error:', error);
  
  if (error?.response?.status === 404) {
    toastService.error('Service temporarily unavailable. Please contact support if this persists.');
    return new Error('Service not found');
  }
  
  if (error?.response?.status === 401) {
    toastService.error('Please log in again to continue.');
    return new Error('Authentication required');
  }
  
  if (error?.response?.status === 403) {
    toastService.error('You don\'t have permission to perform this action.');
    return new Error('Permission denied');
  }
  
  if (error?.response?.status >= 500) {
    toastService.error('Server error. Our team has been notified. Please try again later.');
    return new Error('Server error');
  }
  
  const message = getAPIErrorMessage(error) || defaultMessage;
  toastService.error(message);
  return new Error(message);
};

// Hook for getting contact list with enhanced error handling
export function useContacts(params: ContactSearchParams = {}) {
  const { user, tenantId, environment } = useAuth();

  return useQuery<ContactListResponse, Error, EnhancedContactListResponse>({
    queryKey: CONTACT_QUERY_KEYS.list(params),
    queryFn: async (): Promise<ContactListResponse> => {
      if (!user || !tenantId) {
        throw new Error('Authentication required');
      }

      try {
        // Use apiService instead of raw axios
        const endpoint = `/contacts${buildQueryParams(params, environment)}`;
        const response = await apiService.get<{ success: boolean; data: ContactListResponse; error?: string }>(endpoint);
        
        if (!response.success) {
          throw new Error(response.error || 'Failed to fetch contacts');
        }

        return response.data;
      } catch (error) {
        throw handleAPIError(error, 'Failed to load contacts');
      }
    },
    enabled: !!user && !!tenantId,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: (failureCount, error) => {
      // Don't retry 404s or auth errors
      if (error?.message?.includes('Service not found') || 
          error?.message?.includes('Authentication required')) {
        return false;
      }
      return failureCount < 2;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    refetchOnWindowFocus: false,
    // Transform the data and add computed properties
    select: (data: ContactListResponse): EnhancedContactListResponse => {
      // Ensure contacts is always an array
      const contacts = data.contacts || [];
      
      return {
        ...data,
        contacts, // Ensure this is properly typed
        contactsByStatus: {
          active: contacts.filter(c => c.is_active),
          inactive: contacts.filter(c => !c.is_active),
          customers: contacts.filter(c => c.is_customer),
          prospects: contacts.filter(c => !c.is_customer)
        },
        contactsByPrefix: contacts.reduce((acc, contact) => {
          acc[contact.prefix] = (acc[contact.prefix] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        summary: {
          total: data.total || 0,
          showing: contacts.length,
          hasMore: data.has_next || false,
          avgChannelsPerContact: contacts.length > 0 
            ? contacts.reduce((sum, c) => sum + (c.channel_count || 0), 0) / contacts.length 
            : 0
        }
      };
    },
    // Provide fallback data structure with proper typing
    placeholderData: (): ContactListResponse => ({
      contacts: [],
      total: 0,
      page: 1,
      page_size: 20,
      total_pages: 0,
      has_next: false,
      has_prev: false
    })
  });
}

// Hook for contact statistics with enhanced error handling
export function useContactStats() {
  const { user, tenantId, environment } = useAuth();

  return useQuery({
    queryKey: CONTACT_QUERY_KEYS.stats(),
    queryFn: async () => {
      if (!user || !tenantId) {
        throw new Error('Authentication required');
      }

      try {
        const endpoint = `/contacts/stats${buildQueryParams({}, environment)}`;
        const response = await apiService.get<{ success: boolean; data: any; error?: string }>(endpoint);
        
        if (!response.success) {
          throw new Error(response.error || 'Failed to fetch contact statistics');
        }

        return response.data;
      } catch (error) {
        throw handleAPIError(error, 'Failed to load contact statistics');
      }
    },
    enabled: !!user && !!tenantId,
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: (failureCount, error) => {
      if (error?.message?.includes('Service not found')) {
        return false;
      }
      return failureCount < 2;
    },
    select: (stats) => ({
      ...stats,
      percentages: {
        activeRate: stats.total > 0 ? (stats.active / stats.total * 100).toFixed(1) : '0',
        customerRate: stats.total > 0 ? (stats.customers / stats.total * 100).toFixed(1) : '0',
        recentRate: stats.total > 0 ? (stats.recent / stats.total * 100).toFixed(1) : '0'
      },
      health: {
        status: stats.active > stats.inactive ? 'healthy' : 'needs_attention',
        customerConversion: stats.customers / Math.max(stats.total, 1),
        growth: stats.recent > 0 ? 'growing' : 'stable'
      }
    }),
    // Provide fallback stats
    placeholderData: {
      total: 0,
      active: 0,
      inactive: 0,
      customers: 0,
      recent: 0,
      percentages: { activeRate: '0', customerRate: '0', recentRate: '0' },
      health: { status: 'healthy', customerConversion: 0, growth: 'stable' }
    }
  });
}

// Hook for getting a single contact by ID
export function useContact(contactId: number) {
  const { user, tenantId, environment } = useAuth();

  return useQuery({
    queryKey: CONTACT_QUERY_KEYS.detail(contactId),
    queryFn: async (): Promise<Contact> => {
      if (!user || !tenantId) {
        throw new Error('Authentication required');
      }

      try {
        const endpoint = `/contacts/${contactId}${buildQueryParams({}, environment)}`;
        const response = await apiService.get<{ success: boolean; data: Contact; error?: string }>(endpoint);
        
        if (!response.success) {
          throw new Error(response.error || 'Contact not found');
        }

        return response.data;
      } catch (error) {
        throw handleAPIError(error, 'Failed to load contact details');
      }
    },
    enabled: !!user && !!tenantId && !!contactId && contactId > 0,
    staleTime: 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 1,
    select: (contact) => ({
      ...contact,
      insights: {
        primaryContact: {
          email: contact.channels?.find(ch => ch.channel_type === 'email' && ch.is_primary)?.channel_value,
          mobile: contact.channels?.find(ch => ch.channel_type === 'mobile' && ch.is_primary)?.channel_value,
          whatsapp: contact.channels?.find(ch => ch.channel_type === 'whatsapp' && ch.is_primary)?.channel_value
        },
        channelBreakdown: contact.channels?.reduce((acc, ch) => {
          acc[ch.channel_type] = (acc[ch.channel_type] || 0) + 1;
          return acc;
        }, {} as Record<string, number>) || {},
        hasMultipleChannels: (contact.channels?.length || 0) > 1,
        accountAge: contact.created_at ? Math.floor((Date.now() - new Date(contact.created_at).getTime()) / (1000 * 60 * 60 * 24)) : 0,
        isRecentlyUpdated: contact.updated_at ? (Date.now() - new Date(contact.updated_at).getTime()) < (7 * 24 * 60 * 60 * 1000) : false
      }
    })
  });
}

// Hook for searching contacts with enhanced error handling
export function useContactSearch(query: string, enabled: boolean = true) {
  const { user, tenantId, environment } = useAuth();

  return useQuery({
    queryKey: CONTACT_QUERY_KEYS.search(query),
    queryFn: async (): Promise<Contact[]> => {
      if (!user || !tenantId || !query || query.length < 2) {
        return [];
      }

      try {
        const endpoint = `/contacts/search/${encodeURIComponent(query)}${buildQueryParams({}, environment)}`;
        const response = await apiService.get<{ success: boolean; data: Contact[]; error?: string }>(endpoint);
        
        if (!response.success) {
          throw new Error(response.error || 'Search failed');
        }

        return response.data;
      } catch (error) {
        // Don't show error toasts for search failures - just return empty results
        console.warn('Search failed:', error);
        return [];
      }
    },
    enabled: !!user && !!tenantId && enabled && query.length >= 2,
    staleTime: 15 * 1000,
    gcTime: 2 * 60 * 1000,
    retry: false, // Don't retry search failures
    select: (contacts) => contacts.map(contact => ({
      ...contact,
      searchRelevance: {
        nameMatch: contact.name.toLowerCase().includes(query.toLowerCase()),
        emailMatch: contact.channels?.some(ch => 
          ch.channel_type === 'email' && ch.channel_value.toLowerCase().includes(query.toLowerCase())
        ),
        mobileMatch: contact.channels?.some(ch => 
          ch.channel_type === 'mobile' && ch.channel_value.includes(query)
        ),
        exactMatch: contact.name.toLowerCase() === query.toLowerCase()
      }
    }))
  });
}

// Hook for checking if contact exists
export function useContactExists(email?: string, mobile?: string) {
  const { user, tenantId, environment } = useAuth();

  return useQuery({
    queryKey: CONTACT_QUERY_KEYS.exists(email, mobile),
    queryFn: async () => {
      if (!user || !tenantId || (!email && !mobile)) {
        return { exists: false };
      }

      try {
        const endpoint = `/contacts/check-exists${buildQueryParams({ email, mobile }, environment)}`;
        const response = await apiService.get<{ success: boolean; data: any; error?: string }>(endpoint);
        
        if (!response.success) {
          return { exists: false };
        }

        return response.data;
      } catch (error) {
        console.warn('Contact existence check failed:', error);
        return { exists: false };
      }
    },
    enabled: !!user && !!tenantId && (!!email || !!mobile),
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: false
  });
}

// Mutation hook for creating contacts with enhanced UX
export function useCreateContact() {
  const queryClient = useQueryClient();
  const { user, tenantId } = useAuth();

  return useMutation({
    mutationFn: async (contactData: CreateContactRequest): Promise<Contact> => {
      if (!user || !tenantId) {
        throw new Error('Authentication required');
      }

      const response = await apiService.post<{ success: boolean; data: Contact; error?: string }>('/contacts', contactData);

      if (!response.success) {
        throw new Error(response.error || 'Failed to create contact');
      }

      return response.data;
    },
    onSuccess: (newContact) => {
      queryClient.invalidateQueries({ queryKey: CONTACT_QUERY_KEYS.lists() });
      queryClient.invalidateQueries({ queryKey: CONTACT_QUERY_KEYS.stats() });
      queryClient.setQueryData(CONTACT_QUERY_KEYS.detail(newContact.id), newContact);
      toastService.success(`Contact "${newContact.name}" created successfully`);
    },
    onError: (error) => {
      handleAPIError(error, 'Failed to create contact');
    }
  });
}

// Mutation hook for updating contacts
export function useUpdateContact() {
  const queryClient = useQueryClient();
  const { user, tenantId } = useAuth();

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: UpdateContactRequest }): Promise<Contact> => {
      if (!user || !tenantId) {
        throw new Error('Authentication required');
      }

      const response = await apiService.put<{ success: boolean; data: Contact; error?: string }>(`/contacts/${id}`, data);

      if (!response.success) {
        throw new Error(response.error || 'Failed to update contact');
      }

      return response.data;
    },
    onSuccess: (updatedContact) => {
      queryClient.invalidateQueries({ queryKey: CONTACT_QUERY_KEYS.lists() });
      queryClient.invalidateQueries({ queryKey: CONTACT_QUERY_KEYS.stats() });
      queryClient.setQueryData(CONTACT_QUERY_KEYS.detail(updatedContact.id), updatedContact);
      toastService.success(`Contact "${updatedContact.name}" updated successfully`);
    },
    onError: (error) => {
      handleAPIError(error, 'Failed to update contact');
    }
  });
}

// Mutation hook for deleting contacts
export function useDeleteContact() {
  const queryClient = useQueryClient();
  const { user, tenantId } = useAuth();

  return useMutation({
    mutationFn: async (contactId: number): Promise<void> => {
      if (!user || !tenantId) {
        throw new Error('Authentication required');
      }

      const response = await apiService.delete<{ success: boolean; error?: string }>(`/contacts/${contactId}`);

      if (!response.success) {
        throw new Error(response.error || 'Failed to delete contact');
      }
    },
    onSuccess: (_, contactId) => {
      queryClient.invalidateQueries({ queryKey: CONTACT_QUERY_KEYS.lists() });
      queryClient.invalidateQueries({ queryKey: CONTACT_QUERY_KEYS.stats() });
      queryClient.removeQueries({ queryKey: CONTACT_QUERY_KEYS.detail(contactId) });
      toastService.success('Contact deleted successfully');
    },
    onError: (error) => {
      handleAPIError(error, 'Failed to delete contact');
    }
  });
}

// Mutation hook for bulk contact actions
export function useBulkContactAction() {
  const queryClient = useQueryClient();
  const { user, tenantId } = useAuth();

  return useMutation({
    mutationFn: async (request: BulkActionRequest): Promise<BulkActionResponse> => {
      if (!user || !tenantId) {
        throw new Error('Authentication required');
      }

      const response = await apiService.post<{ success: boolean; data: BulkActionResponse; error?: string }>('/contacts/bulk', request);

      if (!response.success) {
        throw new Error(response.error || 'Bulk action failed');
      }

      return response.data;
    },
    onSuccess: (result, request) => {
      queryClient.invalidateQueries({ queryKey: CONTACT_QUERY_KEYS.lists() });
      queryClient.invalidateQueries({ queryKey: CONTACT_QUERY_KEYS.stats() });
      
      const actionLabel = request.action.charAt(0).toUpperCase() + request.action.slice(1);
      toastService.success(`${actionLabel} action completed: ${result.affected_count} contacts processed`);
      
      if (request.action === 'export' && result.export_url) {
        toastService.info('Export ready for download', { autoClose: 5000 });
      }
    },
    onError: (error) => {
      handleAPIError(error, 'Bulk action failed');
    }
  });
}

// Mutation hook for adding channels
export function useAddChannel() {
  const queryClient = useQueryClient();
  const { user, tenantId } = useAuth();

  return useMutation({
    mutationFn: async ({ contactId, channelData }: { contactId: number; channelData: Omit<CreateChannelRequest, 'contact_id'> }): Promise<ContactChannel> => {
      if (!user || !tenantId) {
        throw new Error('Authentication required');
      }

      const response = await apiService.post<{ success: boolean; data: ContactChannel; error?: string }>(`/contacts/${contactId}/channels`, channelData);

      if (!response.success) {
        throw new Error(response.error || 'Failed to add channel');
      }

      return response.data;
    },
    onSuccess: (_, { contactId }) => {
      queryClient.invalidateQueries({ queryKey: CONTACT_QUERY_KEYS.detail(contactId) });
      queryClient.invalidateQueries({ queryKey: CONTACT_QUERY_KEYS.lists() });
      toastService.success('Communication channel added successfully');
    },
    onError: (error) => {
      handleAPIError(error, 'Failed to add channel');
    }
  });
}

// Mutation hook for updating channels
export function useUpdateChannel() {
  const queryClient = useQueryClient();
  const { user, tenantId } = useAuth();

  return useMutation({
    mutationFn: async ({ 
      contactId, 
      channelId, 
      data 
    }: { 
      contactId: number; 
      channelId: number; 
      data: UpdateChannelRequest; 
    }): Promise<ContactChannel> => {
      if (!user || !tenantId) {
        throw new Error('Authentication required');
      }

      const response = await apiService.put<{ success: boolean; data: ContactChannel; error?: string }>(`/contacts/${contactId}/channels/${channelId}`, data);

      if (!response.success) {
        throw new Error(response.error || 'Failed to update channel');
      }

      return response.data;
    },
    onSuccess: (_, { contactId }) => {
      queryClient.invalidateQueries({ queryKey: CONTACT_QUERY_KEYS.detail(contactId) });
      queryClient.invalidateQueries({ queryKey: CONTACT_QUERY_KEYS.lists() });
      toastService.success('Communication channel updated successfully');
    },
    onError: (error) => {
      handleAPIError(error, 'Failed to update channel');
    }
  });
}

// Mutation hook for deleting channels
export function useDeleteChannel() {
  const queryClient = useQueryClient();
  const { user, tenantId } = useAuth();

  return useMutation({
    mutationFn: async ({ 
      contactId, 
      channelId 
    }: { 
      contactId: number; 
      channelId: number; 
    }): Promise<void> => {
      if (!user || !tenantId) {
        throw new Error('Authentication required');
      }

      const response = await apiService.delete<{ success: boolean; error?: string }>(`/contacts/${contactId}/channels/${channelId}`);

      if (!response.success) {
        throw new Error(response.error || 'Failed to delete channel');
      }
    },
    onSuccess: (_, { contactId }) => {
      queryClient.invalidateQueries({ queryKey: CONTACT_QUERY_KEYS.detail(contactId) });
      queryClient.invalidateQueries({ queryKey: CONTACT_QUERY_KEYS.lists() });
      toastService.success('Communication channel removed successfully');
    },
    onError: (error) => {
      handleAPIError(error, 'Failed to remove channel');
    }
  });
}

// Mutation hook for setting primary channels
export function useSetPrimaryChannel() {
  const queryClient = useQueryClient();
  const { user, tenantId } = useAuth();

  return useMutation({
    mutationFn: async ({ 
      contactId, 
      channelId 
    }: { 
      contactId: number; 
      channelId: number; 
    }): Promise<void> => {
      if (!user || !tenantId) {
        throw new Error('Authentication required');
      }

      const response = await apiService.put<{ success: boolean; error?: string }>(`/contacts/${contactId}/channels/${channelId}/primary`, {});

      if (!response.success) {
        throw new Error(response.error || 'Failed to set primary channel');
      }
    },
    onSuccess: (_, { contactId }) => {
      queryClient.invalidateQueries({ queryKey: CONTACT_QUERY_KEYS.detail(contactId) });
      queryClient.invalidateQueries({ queryKey: CONTACT_QUERY_KEYS.lists() });
      toastService.success('Primary channel updated successfully');
    },
    onError: (error) => {
      handleAPIError(error, 'Failed to set primary channel');
    }
  });
}

// AI-friendly helper functions for chatbot integration
export const contactQueryHelpers = {
  getCachedContacts: (queryClient: any, params: ContactSearchParams = {}) => {
    return queryClient.getQueryData(CONTACT_QUERY_KEYS.list(params));
  },
  
  getCachedContact: (queryClient: any, contactId: number) => {
    return queryClient.getQueryData(CONTACT_QUERY_KEYS.detail(contactId));
  },
  
  getCachedStats: (queryClient: any) => {
    return queryClient.getQueryData(CONTACT_QUERY_KEYS.stats());
  },
  
  isDataFresh: (queryClient: any, queryKey: any, maxAgeMs: number = 60000) => {
    const queryState = queryClient.getQueryState(queryKey);
    if (!queryState || !queryState.dataUpdatedAt) return false;
    return Date.now() - queryState.dataUpdatedAt < maxAgeMs;
  },
  
  prefetchContactData: async (queryClient: any, contactId: number) => {
    await queryClient.prefetchQuery({
      queryKey: CONTACT_QUERY_KEYS.detail(contactId),
      staleTime: 30 * 1000
    });
  }
};