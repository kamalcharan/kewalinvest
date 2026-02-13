// frontend/src/hooks/useAlias.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AliasService } from '../services/alias.service';
import type {
  CreateAliasRequest,
  UpdateAliasRequest
} from '../types/alias.types';

// ==================== QUERY KEYS ====================

export const ALIAS_KEYS = {
  all: ['aliases'] as const,
  list: (params?: { page?: number; search?: string }) => [...ALIAS_KEYS.all, 'list', params] as const,
  detail: (aliasId: number) => [...ALIAS_KEYS.all, 'detail', aliasId] as const,
  members: (aliasId: number) => [...ALIAS_KEYS.all, 'members', aliasId] as const,
  portfolio: (aliasId: number) => [...ALIAS_KEYS.all, 'portfolio', aliasId] as const,
  assetAllocation: (aliasId: number) => [...ALIAS_KEYS.all, 'asset-allocation', aliasId] as const,
  goals: (aliasId: number) => [...ALIAS_KEYS.all, 'goals', aliasId] as const,
  meetings: (aliasId: number) => [...ALIAS_KEYS.all, 'meetings', aliasId] as const,
  customerAlias: (customerId: number) => [...ALIAS_KEYS.all, 'customer', customerId] as const
};

// ==================== QUERIES ====================

/**
 * Hook to fetch all aliases with pagination
 */
export function useAliases(params?: { page?: number; page_size?: number; search?: string }) {
  return useQuery({
    queryKey: ALIAS_KEYS.list(params),
    queryFn: async () => {
      const result = await AliasService.getAliases(params);
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch aliases');
      }
      return {
        data: result.data!,
        pagination: result.pagination
      };
    }
  });
}

/**
 * Hook to fetch a single alias by ID
 */
export function useAlias(aliasId: number | null) {
  return useQuery({
    queryKey: ALIAS_KEYS.detail(aliasId!),
    queryFn: async () => {
      const result = await AliasService.getAlias(aliasId!);
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch alias');
      }
      return result.data!;
    },
    enabled: !!aliasId
  });
}

/**
 * Hook to fetch alias members
 */
export function useAliasMembers(aliasId: number | null) {
  return useQuery({
    queryKey: ALIAS_KEYS.members(aliasId!),
    queryFn: async () => {
      const result = await AliasService.getAliasMembers(aliasId!);
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch alias members');
      }
      return result.data!;
    },
    enabled: !!aliasId
  });
}

/**
 * Hook to fetch alias portfolio summary
 */
export function useAliasPortfolio(aliasId: number | null) {
  return useQuery({
    queryKey: ALIAS_KEYS.portfolio(aliasId!),
    queryFn: async () => {
      const result = await AliasService.getAliasPortfolio(aliasId!);
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch alias portfolio');
      }
      return result.data!;
    },
    enabled: !!aliasId
  });
}

/**
 * Hook to fetch alias asset allocation
 */
export function useAliasAssetAllocation(aliasId: number | null) {
  return useQuery({
    queryKey: ALIAS_KEYS.assetAllocation(aliasId!),
    queryFn: async () => {
      const result = await AliasService.getAliasAssetAllocation(aliasId!);
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch alias asset allocation');
      }
      return result.data!;
    },
    enabled: !!aliasId
  });
}

/**
 * Hook to fetch alias goals summary
 */
export function useAliasGoals(aliasId: number | null) {
  return useQuery({
    queryKey: ALIAS_KEYS.goals(aliasId!),
    queryFn: async () => {
      const result = await AliasService.getAliasGoals(aliasId!);
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch alias goals');
      }
      return result.data!;
    },
    enabled: !!aliasId
  });
}

/**
 * Hook to fetch alias meetings summary
 */
export function useAliasMeetings(aliasId: number | null) {
  return useQuery({
    queryKey: ALIAS_KEYS.meetings(aliasId!),
    queryFn: async () => {
      const result = await AliasService.getAliasMeetings(aliasId!);
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch alias meetings');
      }
      return result.data!;
    },
    enabled: !!aliasId
  });
}

/**
 * Hook to check if a customer is in an alias
 */
export function useCustomerAlias(customerId: number | null) {
  return useQuery({
    queryKey: ALIAS_KEYS.customerAlias(customerId!),
    queryFn: async () => {
      const result = await AliasService.getCustomerAlias(customerId!);
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch customer alias');
      }
      return result.data;
    },
    enabled: !!customerId
  });
}

// ==================== MUTATIONS ====================

/**
 * Hook to create a new alias
 */
export function useCreateAlias() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: CreateAliasRequest) => {
      const result = await AliasService.createAlias(request);
      if (!result.success) {
        throw new Error(result.error || 'Failed to create alias');
      }
      return result.data!;
    },
    onSuccess: () => {
      // Invalidate all alias queries
      queryClient.invalidateQueries({ queryKey: ALIAS_KEYS.all });
    }
  });
}

/**
 * Hook to update an alias
 */
export function useUpdateAlias() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ aliasId, request }: { aliasId: number; request: UpdateAliasRequest }) => {
      const result = await AliasService.updateAlias(aliasId, request);
      if (!result.success) {
        throw new Error(result.error || 'Failed to update alias');
      }
      return result.data!;
    },
    onSuccess: (_, { aliasId }) => {
      queryClient.invalidateQueries({ queryKey: ALIAS_KEYS.detail(aliasId) });
      queryClient.invalidateQueries({ queryKey: ALIAS_KEYS.list() });
    }
  });
}

/**
 * Hook to delete an alias
 */
export function useDeleteAlias() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (aliasId: number) => {
      const result = await AliasService.deleteAlias(aliasId);
      if (!result.success) {
        throw new Error(result.error || 'Failed to delete alias');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ALIAS_KEYS.all });
    }
  });
}

/**
 * Hook to add members to an alias
 */
export function useAddAliasMembers() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ aliasId, customerIds }: { aliasId: number; customerIds: number[] }) => {
      const result = await AliasService.addMembers(aliasId, customerIds);
      if (!result.success) {
        throw new Error(result.error || 'Failed to add members');
      }
    },
    onSuccess: (_, { aliasId }) => {
      queryClient.invalidateQueries({ queryKey: ALIAS_KEYS.detail(aliasId) });
      queryClient.invalidateQueries({ queryKey: ALIAS_KEYS.members(aliasId) });
      queryClient.invalidateQueries({ queryKey: ALIAS_KEYS.portfolio(aliasId) });
      queryClient.invalidateQueries({ queryKey: ALIAS_KEYS.goals(aliasId) });
      queryClient.invalidateQueries({ queryKey: ALIAS_KEYS.meetings(aliasId) });
      queryClient.invalidateQueries({ queryKey: ALIAS_KEYS.assetAllocation(aliasId) });
    }
  });
}

/**
 * Hook to remove members from an alias
 */
export function useRemoveAliasMembers() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ aliasId, customerIds }: { aliasId: number; customerIds: number[] }) => {
      const result = await AliasService.removeMembers(aliasId, customerIds);
      if (!result.success) {
        throw new Error(result.error || 'Failed to remove members');
      }
    },
    onSuccess: (_, { aliasId }) => {
      queryClient.invalidateQueries({ queryKey: ALIAS_KEYS.detail(aliasId) });
      queryClient.invalidateQueries({ queryKey: ALIAS_KEYS.members(aliasId) });
      queryClient.invalidateQueries({ queryKey: ALIAS_KEYS.portfolio(aliasId) });
      queryClient.invalidateQueries({ queryKey: ALIAS_KEYS.goals(aliasId) });
      queryClient.invalidateQueries({ queryKey: ALIAS_KEYS.meetings(aliasId) });
      queryClient.invalidateQueries({ queryKey: ALIAS_KEYS.assetAllocation(aliasId) });
    }
  });
}
