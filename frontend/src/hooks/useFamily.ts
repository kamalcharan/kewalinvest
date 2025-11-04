// frontend/src/hooks/useFamily.ts

import { useQuery } from '@tanstack/react-query';
import { FamilyService } from '../services/family.service';
import type {
  FamilyMember,
  FamilyPortfolioSummary,
  FamilyAssetAllocation,
  FamilyGoalSummary,
  FamilyMeetingSummary
} from '../types/family.types';

// ==================== QUERY KEYS ====================

export const FAMILY_KEYS = {
  all: ['family'] as const,
  members: (familyHeadIwellCode: string) => [...FAMILY_KEYS.all, 'members', familyHeadIwellCode] as const,
  portfolio: (familyHeadIwellCode: string) => [...FAMILY_KEYS.all, 'portfolio', familyHeadIwellCode] as const,
  assetAllocation: (familyHeadIwellCode: string) => [...FAMILY_KEYS.all, 'asset-allocation', familyHeadIwellCode] as const,
  goals: (familyHeadIwellCode: string) => [...FAMILY_KEYS.all, 'goals', familyHeadIwellCode] as const,
  meetings: (familyHeadIwellCode: string) => [...FAMILY_KEYS.all, 'meetings', familyHeadIwellCode] as const
};

// ==================== QUERIES ====================

/**
 * Hook to fetch family members
 */
export function useFamilyMembers(familyHeadIwellCode: string | null) {
  return useQuery({
    queryKey: FAMILY_KEYS.members(familyHeadIwellCode!),
    queryFn: async () => {
      const result = await FamilyService.getFamilyMembers(familyHeadIwellCode!);
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch family members');
      }
      return result.data!;
    },
    enabled: !!familyHeadIwellCode
  });
}

/**
 * Hook to fetch family portfolio summary
 */
export function useFamilyPortfolio(familyHeadIwellCode: string | null) {
  return useQuery({
    queryKey: FAMILY_KEYS.portfolio(familyHeadIwellCode!),
    queryFn: async () => {
      const result = await FamilyService.getFamilyPortfolio(familyHeadIwellCode!);
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch family portfolio');
      }
      return result.data!;
    },
    enabled: !!familyHeadIwellCode
  });
}

/**
 * Hook to fetch family asset allocation
 */
export function useFamilyAssetAllocation(familyHeadIwellCode: string | null) {
  return useQuery({
    queryKey: FAMILY_KEYS.assetAllocation(familyHeadIwellCode!),
    queryFn: async () => {
      const result = await FamilyService.getFamilyAssetAllocation(familyHeadIwellCode!);
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch family asset allocation');
      }
      return result.data!;
    },
    enabled: !!familyHeadIwellCode
  });
}

/**
 * Hook to fetch family goals summary
 */
export function useFamilyGoals(familyHeadIwellCode: string | null) {
  return useQuery({
    queryKey: FAMILY_KEYS.goals(familyHeadIwellCode!),
    queryFn: async () => {
      const result = await FamilyService.getFamilyGoals(familyHeadIwellCode!);
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch family goals');
      }
      return result.data!;
    },
    enabled: !!familyHeadIwellCode
  });
}

/**
 * Hook to fetch family meetings summary
 */
export function useFamilyMeetings(familyHeadIwellCode: string | null) {
  return useQuery({
    queryKey: FAMILY_KEYS.meetings(familyHeadIwellCode!),
    queryFn: async () => {
      const result = await FamilyService.getFamilyMeetings(familyHeadIwellCode!);
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch family meetings');
      }
      return result.data!;
    },
    enabled: !!familyHeadIwellCode
  });
}
