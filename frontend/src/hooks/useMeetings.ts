// frontend/src/hooks/useMeetings.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MeetingService } from '../services/meeting.service';
import type {
  CustomerMeeting,
  CreateMeetingRequest,
  UpdateMeetingRequest,
  CompleteMeetingRequest,
  CancelMeetingRequest,
  MeetingFilters,
  CustomerMeetingSummary
} from '../types/meeting.types';

// ==================== QUERY KEYS ====================

export const MEETING_KEYS = {
  all: ['meetings'] as const,
  lists: () => [...MEETING_KEYS.all, 'list'] as const,
  list: (filters?: MeetingFilters) => [...MEETING_KEYS.lists(), filters] as const,
  details: () => [...MEETING_KEYS.all, 'detail'] as const,
  detail: (id: number) => [...MEETING_KEYS.details(), id] as const,
  summary: (customerId: number) => [...MEETING_KEYS.all, 'summary', customerId] as const,
  upcoming: () => [...MEETING_KEYS.all, 'upcoming'] as const
};

// ==================== QUERIES ====================

/**
 * Hook to fetch meetings with filters
 */
export function useMeetings(filters?: MeetingFilters) {
  return useQuery({
    queryKey: MEETING_KEYS.list(filters),
    queryFn: async () => {
      const result = await MeetingService.getMeetings(filters);
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch meetings');
      }
      return result.data!;
    },
    enabled: !!filters?.customer_id // Only run if customer_id is provided
  });
}

/**
 * Hook to fetch customer meetings
 */
export function useCustomerMeetings(customerId: number | null, page: number = 1, pageSize: number = 20) {
  return useMeetings(
    customerId
      ? {
          customer_id: customerId,
          page,
          page_size: pageSize
        }
      : undefined
  );
}

/**
 * Hook to fetch a single meeting
 */
export function useMeeting(meetingId: number | null) {
  return useQuery({
    queryKey: MEETING_KEYS.detail(meetingId!),
    queryFn: async () => {
      const result = await MeetingService.getMeeting(meetingId!);
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch meeting');
      }
      return result.data!;
    },
    enabled: !!meetingId
  });
}

/**
 * Hook to fetch customer meeting summary
 */
export function useCustomerMeetingSummary(customerId: number | null) {
  return useQuery({
    queryKey: MEETING_KEYS.summary(customerId!),
    queryFn: async () => {
      const result = await MeetingService.getCustomerMeetingSummary(customerId!);
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch meeting summary');
      }
      return result.data!;
    },
    enabled: !!customerId
  });
}

/**
 * Hook to fetch upcoming meetings
 */
export function useUpcomingMeetings(daysAhead: number = 30) {
  return useQuery({
    queryKey: MEETING_KEYS.upcoming(),
    queryFn: async () => {
      const result = await MeetingService.getUpcomingMeetings(daysAhead);
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch upcoming meetings');
      }
      return result.data!;
    }
  });
}

// ==================== MUTATIONS ====================

/**
 * Hook to create a new meeting
 */
export function useCreateMeeting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateMeetingRequest) => {
      const result = await MeetingService.createMeeting(data);
      if (!result.success) {
        throw new Error(result.error || 'Failed to create meeting');
      }
      return result.data!;
    },
    onSuccess: (_, variables) => {
      // Invalidate customer meetings list
      queryClient.invalidateQueries({
        queryKey: MEETING_KEYS.list({ customer_id: variables.customer_id })
      });
      // Invalidate customer summary
      queryClient.invalidateQueries({
        queryKey: MEETING_KEYS.summary(variables.customer_id)
      });
      // Invalidate upcoming meetings
      queryClient.invalidateQueries({
        queryKey: MEETING_KEYS.upcoming()
      });
    }
  });
}

/**
 * Hook to update a meeting
 */
export function useUpdateMeeting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data
    }: {
      id: number;
      data: UpdateMeetingRequest;
    }) => {
      const result = await MeetingService.updateMeeting(id, data);
      if (!result.success) {
        throw new Error(result.error || 'Failed to update meeting');
      }
      return result.data!;
    },
    onSuccess: (meeting) => {
      // Invalidate the specific meeting
      queryClient.invalidateQueries({
        queryKey: MEETING_KEYS.detail(meeting.id)
      });
      // Invalidate customer meetings list
      queryClient.invalidateQueries({
        queryKey: MEETING_KEYS.list({ customer_id: meeting.customer_id })
      });
      // Invalidate customer summary
      queryClient.invalidateQueries({
        queryKey: MEETING_KEYS.summary(meeting.customer_id)
      });
    }
  });
}

/**
 * Hook to complete a meeting
 */
export function useCompleteMeeting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data
    }: {
      id: number;
      data: CompleteMeetingRequest;
    }) => {
      const result = await MeetingService.completeMeeting(id, data);
      if (!result.success) {
        throw new Error(result.error || 'Failed to complete meeting');
      }
      return result.data!;
    },
    onSuccess: (meeting) => {
      // Invalidate the specific meeting
      queryClient.invalidateQueries({
        queryKey: MEETING_KEYS.detail(meeting.id)
      });
      // Invalidate customer meetings list
      queryClient.invalidateQueries({
        queryKey: MEETING_KEYS.list({ customer_id: meeting.customer_id })
      });
      // Invalidate customer summary
      queryClient.invalidateQueries({
        queryKey: MEETING_KEYS.summary(meeting.customer_id)
      });
      // Invalidate upcoming meetings
      queryClient.invalidateQueries({
        queryKey: MEETING_KEYS.upcoming()
      });
    }
  });
}

/**
 * Hook to cancel a meeting
 */
export function useCancelMeeting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data
    }: {
      id: number;
      data: CancelMeetingRequest;
    }) => {
      const result = await MeetingService.cancelMeeting(id, data);
      if (!result.success) {
        throw new Error(result.error || 'Failed to cancel meeting');
      }
      return result.data!;
    },
    onSuccess: (meeting) => {
      // Invalidate the specific meeting
      queryClient.invalidateQueries({
        queryKey: MEETING_KEYS.detail(meeting.id)
      });
      // Invalidate customer meetings list
      queryClient.invalidateQueries({
        queryKey: MEETING_KEYS.list({ customer_id: meeting.customer_id })
      });
      // Invalidate customer summary
      queryClient.invalidateQueries({
        queryKey: MEETING_KEYS.summary(meeting.customer_id)
      });
      // Invalidate upcoming meetings
      queryClient.invalidateQueries({
        queryKey: MEETING_KEYS.upcoming()
      });
    }
  });
}

/**
 * Hook to delete a meeting
 */
export function useDeleteMeeting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      customerId
    }: {
      id: number;
      customerId: number;
    }) => {
      const result = await MeetingService.deleteMeeting(id);
      if (!result.success) {
        throw new Error(result.error || 'Failed to delete meeting');
      }
      return customerId; // Return customer ID for onSuccess
    },
    onSuccess: (customerId, variables) => {
      // Invalidate the specific meeting
      queryClient.invalidateQueries({
        queryKey: MEETING_KEYS.detail(variables.id)
      });
      // Invalidate customer meetings list
      queryClient.invalidateQueries({
        queryKey: MEETING_KEYS.list({ customer_id: customerId })
      });
      // Invalidate customer summary
      queryClient.invalidateQueries({
        queryKey: MEETING_KEYS.summary(customerId)
      });
      // Invalidate upcoming meetings
      queryClient.invalidateQueries({
        queryKey: MEETING_KEYS.upcoming()
      });
    }
  });
}
