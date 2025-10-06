// frontend/src/types/jtbd.types.ts

export interface JTBDConfiguration {
  id: number;
  tenant_id: number;
  is_live: boolean;
  customer_id: number;
  jtbd_type: 'portfolio_alert' | 'time_based' | 'profile_trigger';
  title: string;
  description?: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  is_active: boolean;
  config_data: PortfolioAlertConfig | TimeBasedConfig | ProfileTriggerConfig;
  next_alert_date?: string;
  created_by: number;
  created_at: string;
  updated_at: string;
}

// Portfolio Alert Configuration
export interface PortfolioAlertConfig {
  scheme_code: string;
  scheme_name: string;
  folio_no?: string;
  txn_type_id: number;
  txn_type: string;
  frequency: 'daily' | 'fortnightly' | 'monthly' | 'quarterly' | 'yearly' | 'NA';
  day_of_month?: number;
  deviation_days: number;
  amount: number;
  track_till_months: number;
}

// Time-Based Alert Configuration
export interface TimeBasedConfig {
  alert_date: number; // Day of month
  alert_month: number; // Month (1-12)
  is_recurring: boolean;
}

// Profile Trigger Configuration
export interface ProfileTriggerConfig {
  trigger_type: 'birthday' | 'anniversary';
  days_before: number;
}

// Request/Response types
export interface CreateJTBDRequest {
  customer_id: number;
  jtbd_type: 'portfolio_alert' | 'time_based' | 'profile_trigger';
  title: string;
  description?: string;
  priority?: 'critical' | 'high' | 'medium' | 'low';
  config_data: PortfolioAlertConfig | TimeBasedConfig | ProfileTriggerConfig;
}

export interface UpdateJTBDRequest {
  title?: string;
  description?: string;
  priority?: 'critical' | 'high' | 'medium' | 'low';
  is_active?: boolean;
  config_data?: PortfolioAlertConfig | TimeBasedConfig | ProfileTriggerConfig;
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