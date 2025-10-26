// frontend/src/services/meeting.service.ts
// Service for customer meetings API calls

import apiService from './api.service';
import { API_ENDPOINTS } from './serviceURLs';

// ==================== TYPES ====================

export type MeetingType = 'review' | 'planning' | 'onboarding' | 'grievance' | 'other';
export type MeetingStatus = 'scheduled' | 'completed' | 'cancelled' | 'rescheduled';
export type MeetingMode = 'in_person' | 'video_call' | 'phone_call';

export interface CustomerMeeting {
  id: number;
  tenant_id: number;
  is_live: boolean;
  customer_id: number;
  meeting_type: MeetingType;
  meeting_mode: MeetingMode;
  scheduled_date: string;
  scheduled_time: string;
  duration_minutes: number;
  status: MeetingStatus;
  meeting_location?: string;
  meeting_link?: string;
  agenda?: string;
  notes?: string;
  outcome?: string;
  completed_at?: string;
  cancelled_at?: string;
  cancellation_reason?: string;
  created_by: number;
  created_at: string;
  updated_at: string;
}

export interface CreateMeetingRequest {
  customer_id: number;
  meeting_type: MeetingType;
  meeting_mode: MeetingMode;
  scheduled_date: string;
  scheduled_time: string;
  duration_minutes: number;
  meeting_location?: string;
  meeting_link?: string;
  agenda?: string;
}

export interface UpdateMeetingRequest {
  meeting_type?: MeetingType;
  meeting_mode?: MeetingMode;
  scheduled_date?: string;
  scheduled_time?: string;
  duration_minutes?: number;
  meeting_location?: string;
  meeting_link?: string;
  agenda?: string;
  notes?: string;
  status?: MeetingStatus;
}

export interface CompleteMeetingRequest {
  notes?: string;
  outcome?: string;
  completed_at?: string;
}

export interface CancelMeetingRequest {
  cancellation_reason: string;
}

export interface MeetingFilters {
  customer_id?: number;
  meeting_type?: MeetingType;
  status?: MeetingStatus;
  from_date?: string;
  to_date?: string;
  page?: number;
  page_size?: number;
}

export interface CustomerMeetingSummary {
  customer_id: number;
  total_meetings: number;
  scheduled_count: number;
  completed_count: number;
  cancelled_count: number;
  next_meeting?: {
    id: number;
    scheduled_date: string;
    scheduled_time: string;
    meeting_type: MeetingType;
    days_until: number;
  };
  last_meeting?: {
    id: number;
    completed_at: string;
    meeting_type: MeetingType;
    days_ago: number;
  };
}

export interface UpcomingMeeting {
  id: number;
  customer_id: number;
  customer_name: string;
  meeting_type: MeetingType;
  scheduled_date: string;
  scheduled_time: string;
  days_until: number;
  is_today: boolean;
  is_tomorrow: boolean;
  is_this_week: boolean;
}

// ==================== API RESPONSE TYPES ====================

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

interface PaginatedResponse<T> {
  meetings: T[];
  pagination: {
    page: number;
    page_size: number;
    total: number;
    total_pages: number;
  };
}

// ==================== MEETING SERVICE ====================

export class MeetingService {
  /**
   * Create new meeting
   * POST /api/meetings
   */
  static async createMeeting(
    data: CreateMeetingRequest
  ): Promise<ApiResponse<CustomerMeeting>> {
    try {
      const url = API_ENDPOINTS.MEETINGS.CREATE;
      const response = await apiService.post<ApiResponse<CustomerMeeting>>(url, data);
      return response;
    } catch (error: any) {
      console.error('Failed to create meeting:', error);
      return {
        success: false,
        error: error.message || 'Failed to create meeting'
      };
    }
  }

  /**
   * Get meeting by ID
   * GET /api/meetings/:id
   */
  static async getMeeting(
    meetingId: number
  ): Promise<ApiResponse<CustomerMeeting>> {
    try {
      const url = API_ENDPOINTS.MEETINGS.GET(meetingId);
      const response = await apiService.get<ApiResponse<CustomerMeeting>>(url);
      return response;
    } catch (error: any) {
      console.error('Failed to get meeting:', error);
      return {
        success: false,
        error: error.message || 'Failed to get meeting'
      };
    }
  }

  /**
   * Get meetings with filters
   * GET /api/meetings
   */
  static async getMeetings(
    filters?: MeetingFilters
  ): Promise<ApiResponse<PaginatedResponse<CustomerMeeting>>> {
    try {
      const params = new URLSearchParams();

      if (filters) {
        if (filters.customer_id) params.append('customer_id', filters.customer_id.toString());
        if (filters.meeting_type) params.append('meeting_type', filters.meeting_type);
        if (filters.status) params.append('status', filters.status);
        if (filters.from_date) params.append('from_date', filters.from_date);
        if (filters.to_date) params.append('to_date', filters.to_date);
        if (filters.page) params.append('page', filters.page.toString());
        if (filters.page_size) params.append('page_size', filters.page_size.toString());
      }

      const url = `${API_ENDPOINTS.MEETINGS.GET_ALL}?${params.toString()}`;
      const response = await apiService.get<ApiResponse<PaginatedResponse<CustomerMeeting>>>(url);
      return response;
    } catch (error: any) {
      console.error('Failed to get meetings:', error);
      return {
        success: false,
        error: error.message || 'Failed to get meetings'
      };
    }
  }

  /**
   * Get customer meeting summary
   * GET /api/meetings/customer/:customerId/summary
   */
  static async getCustomerMeetingSummary(
    customerId: number
  ): Promise<ApiResponse<CustomerMeetingSummary>> {
    try {
      const url = API_ENDPOINTS.MEETINGS.GET_CUSTOMER_SUMMARY(customerId);
      const response = await apiService.get<ApiResponse<CustomerMeetingSummary>>(url);
      return response;
    } catch (error: any) {
      console.error('Failed to get meeting summary:', error);
      return {
        success: false,
        error: error.message || 'Failed to get meeting summary'
      };
    }
  }

  /**
   * Get upcoming meetings
   * GET /api/meetings/upcoming
   */
  static async getUpcomingMeetings(
    daysAhead: number = 30
  ): Promise<ApiResponse<UpcomingMeeting[]>> {
    try {
      const url = `${API_ENDPOINTS.MEETINGS.GET_UPCOMING}?days_ahead=${daysAhead}`;
      const response = await apiService.get<ApiResponse<UpcomingMeeting[]>>(url);
      return response;
    } catch (error: any) {
      console.error('Failed to get upcoming meetings:', error);
      return {
        success: false,
        error: error.message || 'Failed to get upcoming meetings'
      };
    }
  }

  /**
   * Update meeting
   * PUT /api/meetings/:id
   */
  static async updateMeeting(
    meetingId: number,
    data: UpdateMeetingRequest
  ): Promise<ApiResponse<CustomerMeeting>> {
    try {
      const url = API_ENDPOINTS.MEETINGS.UPDATE(meetingId);
      const response = await apiService.put<ApiResponse<CustomerMeeting>>(url, data);
      return response;
    } catch (error: any) {
      console.error('Failed to update meeting:', error);
      return {
        success: false,
        error: error.message || 'Failed to update meeting'
      };
    }
  }

  /**
   * Complete meeting
   * POST /api/meetings/:id/complete
   */
  static async completeMeeting(
    meetingId: number,
    data: CompleteMeetingRequest
  ): Promise<ApiResponse<CustomerMeeting>> {
    try {
      const url = API_ENDPOINTS.MEETINGS.COMPLETE(meetingId);
      const response = await apiService.post<ApiResponse<CustomerMeeting>>(url, data);
      return response;
    } catch (error: any) {
      console.error('Failed to complete meeting:', error);
      return {
        success: false,
        error: error.message || 'Failed to complete meeting'
      };
    }
  }

  /**
   * Cancel meeting
   * POST /api/meetings/:id/cancel
   */
  static async cancelMeeting(
    meetingId: number,
    data: CancelMeetingRequest
  ): Promise<ApiResponse<CustomerMeeting>> {
    try {
      const url = API_ENDPOINTS.MEETINGS.CANCEL(meetingId);
      const response = await apiService.post<ApiResponse<CustomerMeeting>>(url, data);
      return response;
    } catch (error: any) {
      console.error('Failed to cancel meeting:', error);
      return {
        success: false,
        error: error.message || 'Failed to cancel meeting'
      };
    }
  }

  /**
   * Delete meeting
   * DELETE /api/meetings/:id
   */
  static async deleteMeeting(
    meetingId: number
  ): Promise<ApiResponse<null>> {
    try {
      const url = API_ENDPOINTS.MEETINGS.DELETE(meetingId);
      const response = await apiService.delete<ApiResponse<null>>(url);
      return response;
    } catch (error: any) {
      console.error('Failed to delete meeting:', error);
      return {
        success: false,
        error: error.message || 'Failed to delete meeting'
      };
    }
  }
}

// Export default for convenience
export default MeetingService;
