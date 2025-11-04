// frontend/src/types/meeting.types.ts

export type MeetingType = 'review' | 'planning' | 'onboarding' | 'grievance' | 'other';
export type MeetingStatus = 'scheduled' | 'completed' | 'cancelled' | 'rescheduled';
export type MeetingMode = 'in_person' | 'video_call' | 'phone_call';

// ==================== CUSTOMER MEETING ====================
export interface CustomerMeeting {
  id: number;
  tenant_id: number;
  is_live: boolean;
  customer_id: number;
  meeting_type: MeetingType;
  meeting_mode: MeetingMode;
  scheduled_date: string; // ISO date
  scheduled_time: string; // HH:MM format
  duration_minutes: number;
  status: MeetingStatus;

  // Optional fields
  meeting_location?: string; // For in-person meetings
  meeting_link?: string; // For video calls
  agenda?: string;
  notes?: string;
  outcome?: string;

  // Completion tracking
  completed_at?: string;
  cancelled_at?: string;
  cancellation_reason?: string;

  // Metadata
  created_by: number;
  created_at: string;
  updated_at: string;
}

// ==================== CREATE MEETING ====================
export interface CreateMeetingRequest {
  customer_id: number;
  meeting_type: MeetingType;
  meeting_mode: MeetingMode;
  scheduled_date: string; // ISO date: "2025-12-25"
  scheduled_time: string; // HH:MM: "14:30"
  duration_minutes: number; // Default: 60
  meeting_location?: string;
  meeting_link?: string;
  agenda?: string;
}

// ==================== UPDATE MEETING ====================
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

// ==================== COMPLETE MEETING ====================
export interface CompleteMeetingRequest {
  notes?: string;
  outcome?: string;
  completed_at?: string; // Optional, defaults to NOW()
}

// ==================== CANCEL MEETING ====================
export interface CancelMeetingRequest {
  cancellation_reason: string;
}

// ==================== MEETING FILTERS ====================
export interface MeetingFilters {
  customer_id?: number;
  meeting_type?: MeetingType;
  status?: MeetingStatus;
  from_date?: string; // ISO date
  to_date?: string; // ISO date
  page?: number;
  page_size?: number;
}

// ==================== MEETING SUMMARY ====================
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

// ==================== UPCOMING MEETINGS DASHBOARD ====================
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

// ==================== API RESPONSES ====================
export interface GetMeetingsResponse {
  success: boolean;
  data?: {
    meetings: CustomerMeeting[];
    pagination: {
      page: number;
      page_size: number;
      total: number;
      total_pages: number;
    };
  };
  error?: string;
}

export interface GetMeetingResponse {
  success: boolean;
  data?: CustomerMeeting;
  error?: string;
}

export interface CreateMeetingResponse {
  success: boolean;
  data?: CustomerMeeting;
  error?: string;
}

export interface UpdateMeetingResponse {
  success: boolean;
  data?: CustomerMeeting;
  error?: string;
}

export interface DeleteMeetingResponse {
  success: boolean;
  message?: string;
  error?: string;
}

export interface GetMeetingSummaryResponse {
  success: boolean;
  data?: CustomerMeetingSummary;
  error?: string;
}

export interface GetUpcomingMeetingsResponse {
  success: boolean;
  data?: UpcomingMeeting[];
  error?: string;
}

// ==================== UI HELPERS ====================
export const MEETING_TYPE_LABELS: Record<MeetingType, string> = {
  review: 'Portfolio Review',
  planning: 'Financial Planning',
  onboarding: 'Client Onboarding',
  grievance: 'Grievance Resolution',
  other: 'General Meeting'
};

export const MEETING_MODE_LABELS: Record<MeetingMode, string> = {
  in_person: 'In-Person',
  video_call: 'Video Call',
  phone_call: 'Phone Call'
};

export const MEETING_STATUS_LABELS: Record<MeetingStatus, string> = {
  scheduled: 'Scheduled',
  completed: 'Completed',
  cancelled: 'Cancelled',
  rescheduled: 'Rescheduled'
};
