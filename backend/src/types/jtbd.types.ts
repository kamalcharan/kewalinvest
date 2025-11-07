// backend/src/types/jtbd.types.ts
// Unified JTBD types - Configurations and Executions

import {
  JTBDCategory,
  JTBDType,
  JTBDPriority,
  JTBDFrequency,
  ExecutionStatus
} from '../constants/jtbd.constants';

// ============================================================================
// JTBD CONFIGURATION (t_jtbd_configurations table)
// ============================================================================

export interface JTBDConfiguration {
  id: number;
  tenant_id: number;
  is_live: boolean;
  customer_id: number;
  jtbd_category: JTBDCategory;
  jtbd_type: JTBDType;
  title: string;
  description?: string;
  priority: JTBDPriority;
  is_active: boolean;
  config_data: PortfolioAlertConfig | TimeBasedConfig | ProfileTriggerConfig | GoalTrackingConfig;
  next_alert_date?: string;
  created_by: number;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// CONFIG DATA INTERFACES (Stored in config_data JSONB)
// ============================================================================

// Portfolio Alert Configuration
export interface PortfolioAlertConfig {
  scheme_code: string;
  scheme_name: string;
  folio_no?: string;
  txn_type_id: number;
  txn_type: string;
  frequency: JTBDFrequency;
  day_of_month?: number;
  deviation_days: number;
  amount: number;
  track_till_months: number;
}

// Time-Based Alert Configuration
export interface TimeBasedConfig {
  alert_date: number; // Day of month (1-31)
  alert_month: number; // Month (1-12)
  is_recurring: boolean;
}

// Profile Trigger Configuration
export interface ProfileTriggerConfig {
  trigger_type: 'birthday' | 'anniversary';
  days_before: number;
}

// Goal Tracking Configuration
export interface GoalTrackingConfig {
  target_amount: number;
  current_value: number;
  target_date: string; // ISO date
  monthly_sip?: number;
  investment_frequency?: JTBDFrequency;
  risk_profile?: string;
  goal_category?: string;
}

// ============================================================================
// REQUEST/RESPONSE TYPES (Configuration)
// ============================================================================

export interface CreateJTBDRequest {
  customer_id: number;
  jtbd_type: JTBDType;
  title?: string;
  description?: string;
  priority?: JTBDPriority;
  config_data: PortfolioAlertConfig | TimeBasedConfig | ProfileTriggerConfig | GoalTrackingConfig;
}

export interface UpdateJTBDRequest {
  title?: string;
  description?: string;
  priority?: JTBDPriority;
  is_active?: boolean;
  config_data?: PortfolioAlertConfig | TimeBasedConfig | ProfileTriggerConfig | GoalTrackingConfig;
}

export interface JTBDFilters {
  customer_id?: number;
  jtbd_category?: JTBDCategory;
  jtbd_type?: JTBDType;
  priority?: JTBDPriority;
  is_active?: boolean;
  from_date?: string;
  to_date?: string;
  page?: number;
  page_size?: number;
}

export interface JTBDListResponse {
  jtbds: JTBDConfiguration[];
  total: number;
}

export interface JTBDDashboardStats {
  total: number;
  by_type: {
    portfolio_alert: number;
    time_based: number;
    profile_trigger: number;
  };
  by_priority: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  active_count: number;
  customers_without_jtbd: number;
}

export interface CustomerJTBDSummary {
  customer_id: number;
  jtbd_count: number;
  jtbd_setup_status: 'not_setup' | 'active';
  next_alert_date?: string;
  critical_count: number;
}

// For future alert instances (display only, not stored)
export interface CalculatedAlertInstance {
  occurrence_date: string;
  occurrence_number: number;
  within_range: boolean; // true if within deviation range
  amount: number;
}


// Communication Types
export type CommunicationStatus = 'pending' | 'scheduled' | 'sent' | 'failed' | 'cancelled';
export type CommunicationChannel = 'email' | 'whatsapp' | 'sms';

// Extended JTBD with Communication Data
export interface JTBDWithCommunication extends JTBDConfiguration {
  customer_name: string;
  customer_email?: string;
  customer_mobile?: string;
  
  // Communication fields (DUMMY DATA for now)
  communication_status: CommunicationStatus;
  communication_channel: CommunicationChannel;
  communication_sent_at?: string;
  communication_scheduled_at?: string;
  communication_read?: boolean;
  communication_clicked?: boolean;
  communication_error?: string;
}

// Dashboard Alert (lightweight)
export interface DashboardAlert {
  id: number;
  title: string;
  customer_id: number;
  customer_name: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  jtbd_type: 'portfolio_alert' | 'time_based' | 'profile_trigger';
  next_alert_date: string;
  communication_status: CommunicationStatus;
}

// Alerts grouped by date
export interface AlertsByDate {
  alert_date: string;
  alert_count: number;
  alerts: DashboardAlert[];
}

// ============================================================================
// JTBD EXECUTION (t_jtbd_executions table)
// ============================================================================

export interface JTBDExecution {
  id: number;
  tenant_id: number;
  is_live: boolean;
  config_id?: number; // Optional link to parent configuration
  customer_id: number;
  execution_type: JTBDType;
  title: string;
  description?: string;
  priority: JTBDPriority;
  scheduled_date: string; // ISO date
  scheduled_time?: string; // HH:MM format
  execution_status: ExecutionStatus;
  execution_date?: string; // ISO date
  execution_time?: string; // HH:MM format
  deviation_days?: number; // How many days late/early
  execution_data: MeetingExecutionData | SIPPlanExecutionData | Record<string, any>;
  created_by: number;
  created_at: string;
  updated_at: string;
  completed_by?: number;
  completed_at?: string;
}

// ============================================================================
// EXECUTION DATA INTERFACES (Stored in execution_data JSONB)
// ============================================================================

// Meeting Execution Data
export interface MeetingExecutionData {
  meeting_mode?: 'in_person' | 'video_call' | 'phone_call';
  location?: string;
  meeting_link?: string;
  duration_minutes?: number;
  agenda?: string;
  attendees?: string[];
  meeting_notes?: string;
  outcome?: string;
  follow_up_required?: boolean;
  follow_up_date?: string;
  cancellation_reason?: string;
}

// SIP Plan Execution Data
export interface SIPPlanExecutionData {
  amount: number;
  scheme_code: string;
  scheme_name: string;
  folio_no?: string;
  month_number: number; // 1-120
  total_months: number; // 120
  transaction_id?: string; // After completion
  payment_mode?: string;
  transaction_status?: 'pending' | 'completed' | 'failed';
}

// ============================================================================
// REQUEST/RESPONSE TYPES (Execution)
// ============================================================================

export interface CreateExecutionRequest {
  config_id?: number; // Optional link to parent config
  customer_id: number;
  execution_type: JTBDType;
  title: string;
  description?: string;
  priority?: JTBDPriority;
  scheduled_date: string; // ISO date "2025-01-15"
  scheduled_time?: string; // HH:MM "14:30"
  execution_data?: MeetingExecutionData | SIPPlanExecutionData | Record<string, any>;
}

export interface UpdateExecutionRequest {
  title?: string;
  description?: string;
  priority?: JTBDPriority;
  scheduled_date?: string;
  scheduled_time?: string;
  execution_status?: ExecutionStatus;
  execution_data?: MeetingExecutionData | SIPPlanExecutionData | Record<string, any>;
}

export interface CompleteExecutionRequest {
  execution_date?: string; // Defaults to today
  execution_time?: string; // HH:MM
  execution_data?: MeetingExecutionData | SIPPlanExecutionData | Record<string, any>;
}

export interface CancelExecutionRequest {
  cancellation_reason: string;
}

export interface ExecutionFilters {
  customer_id?: number;
  config_id?: number;
  execution_type?: JTBDType;
  execution_status?: ExecutionStatus;
  priority?: JTBDPriority;
  from_date?: string; // ISO date
  to_date?: string; // ISO date
  page?: number;
  page_size?: number;
}

export interface ExecutionListResponse {
  executions: JTBDExecution[];
  pagination: {
    page: number;
    page_size: number;
    total: number;
    total_pages: number;
  };
}

// ============================================================================
// COMBINED TYPES (For Customer View Timeline)
// ============================================================================

export interface CustomerJobsSummary {
  customer_id: number;
  total_executions: number;
  planned_count: number;
  due_count: number;
  overdue_count: number;
  completed_count: number;
  next_execution?: {
    id: number;
    execution_type: JTBDType;
    title: string;
    scheduled_date: string;
    days_until: number;
  };
}

// Unified JTBD item (for timeline view - combines configs and executions)
export interface UnifiedJTBDItem {
  id: number;
  source: 'config' | 'execution';
  customer_id: number;
  customer_name: string;
  jtbd_category: JTBDCategory;
  jtbd_type: JTBDType;
  title: string;
  description?: string;
  priority: JTBDPriority;
  scheduled_date: string;
  execution_status?: ExecutionStatus; // Only for executions
  is_active?: boolean; // Only for configs
  created_at: string;
}

// ============================================================================
// RE-EXPORT TYPES FROM CONSTANTS
// ============================================================================

export type {
  JTBDCategory,
  JTBDType,
  JTBDPriority,
  JTBDFrequency,
  ExecutionStatus,
};