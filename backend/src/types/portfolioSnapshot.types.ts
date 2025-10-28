// backend/src/types/portfolioSnapshot.types.ts
// Types for Portfolio Snapshot Scheduler feature

// ============================================================================
// SCHEDULER CONFIGURATION TYPES
// ============================================================================

export interface PortfolioSnapshotConfig {
  id?: number;
  tenant_id: number;
  user_id: number;
  is_live: boolean;
  schedule_type: 'weekly' | 'monthly' | 'custom';
  cron_expression: string;
  is_enabled: boolean;
  last_executed_at?: Date;
  next_execution_at?: Date;
  execution_count: number;
  failure_count: number;
  max_retries: number;
  created_at?: Date;
  updated_at?: Date;
}

export interface CreateSnapshotConfigRequest {
  user_id: number;
  schedule_type?: 'weekly' | 'monthly' | 'custom';
  cron_expression?: string;
  is_enabled?: boolean;
  max_retries?: number;
}

export interface UpdateSnapshotConfigRequest {
  schedule_type?: 'weekly' | 'monthly' | 'custom';
  cron_expression?: string;
  is_enabled?: boolean;
  max_retries?: number;
}

// ============================================================================
// EXECUTION TYPES
// ============================================================================

export interface SnapshotExecution {
  id: number;
  scheduler_config_id: number;
  tenant_id: number;
  is_live: boolean;
  execution_time: Date;
  status: 'success' | 'failed' | 'running' | 'retrying' | 'skipped';
  trigger_source: 'scheduled' | 'manual';
  snapshot_month_end: Date;
  customers_processed: number;
  customers_failed: number;
  snapshots_created: number;
  snapshots_updated: number;
  retry_attempt: number;
  error_message?: string;
  error_details?: any;
  execution_duration_ms?: number;
  started_at?: Date;
  completed_at?: Date;
  created_at: Date;
  execution_data?: any; // Frontend-compatible wrapper for snapshot data
}

export interface SnapshotExecutionSummary {
  total_executions: number;
  successful_executions: number;
  failed_executions: number;
  last_execution?: SnapshotExecution;
  next_scheduled?: Date;
  average_duration_ms?: number;
}

// ============================================================================
// SNAPSHOT GENERATION TYPES
// ============================================================================

export interface SnapshotGenerationRequest {
  tenant_id: number;
  is_live: boolean;
  snapshot_month_end?: Date;  // Defaults to end of previous month
  trigger_source: 'scheduled' | 'manual';
  scheduler_config_id?: number;
  customer_ids?: number[];  // Optional: specific customers only
}

export interface SnapshotGenerationResult {
  success: boolean;
  snapshot_month_end: Date;
  customers_processed: number;
  customers_failed: number;
  snapshots_created: number;
  snapshots_updated: number;
  execution_duration_ms: number;
  errors: SnapshotCustomerError[];
}

export interface SnapshotCustomerError {
  customer_id: number;
  customer_name?: string;
  error_message: string;
  error_code?: string;
}

// ============================================================================
// PORTFOLIO SNAPSHOT DATA TYPES
// ============================================================================

export interface PortfolioSnapshotData {
  customer_id: number;
  snapshot_month_end: Date;
  total_invested: number;
  current_value: number;
  total_returns: number;
  return_percentage: number;
  total_units: number;
  total_schemes: number;
}

export interface PortfolioCalculationInput {
  customer_id: number;
  tenant_id: number;
  is_live: boolean;
  as_of_date: Date;
}

// ============================================================================
// BACKFILL TYPES
// ============================================================================

export interface BackfillRequest {
  tenant_id: number;
  is_live: boolean;
  start_month: Date;  // First month to backfill
  end_month: Date;    // Last month to backfill
  customer_ids?: number[];  // Optional: specific customers only
}

export interface BackfillResult {
  success: boolean;
  snapshot_month_end?: Date;  // Last month processed (for execution tracking)
  customers_processed: number;  // Number of customers successfully processed
  customers_failed: number;  // Number of customers that had errors
  months_processed: number;
  snapshots_created: number;  // Renamed from total_snapshots_created
  snapshots_updated: number;  // Renamed from total_snapshots_updated
  execution_duration_ms: number;
  errors: BackfillMonthError[];
}

export interface BackfillMonthError {
  month: Date;
  customer_id?: number;
  customer_name?: string;  // Added for better error reporting
  error_message: string;
}

// ============================================================================
// STATISTICS & MONITORING TYPES
// ============================================================================

export interface SnapshotStatistics {
  config: PortfolioSnapshotConfig;
  is_running: boolean;
  last_execution?: SnapshotExecution;
  next_scheduled_run?: Date;
  recent_executions: SnapshotExecution[];
  success_rate: number;  // Percentage
  average_duration_ms: number;
  total_snapshots_generated: number;
}

export interface SnapshotHealthCheck {
  tenant_id: number;
  is_live: boolean;
  scheduler_enabled: boolean;
  last_run_status: 'success' | 'failed' | 'never_run';
  last_run_time?: Date;
  next_run_time?: Date;
  pending_months: Date[];  // Months missing snapshots
  health_status: 'healthy' | 'warning' | 'critical';
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface GetSnapshotConfigResponse {
  success: boolean;
  data?: PortfolioSnapshotConfig;
  error?: string;
}

export interface UpdateSnapshotConfigResponse {
  success: boolean;
  data?: PortfolioSnapshotConfig;
  message?: string;
  error?: string;
}

export interface TriggerSnapshotResponse {
  success: boolean;
  data?: {
    execution_id: number;
    status: string;
    message: string;
  };
  error?: string;
}

export interface GetExecutionsResponse {
  success: boolean;
  data?: {
    executions: SnapshotExecution[];
    pagination: {
      page: number;
      page_size: number;
      total: number;
      total_pages: number;
    };
  };
  error?: string;
}

export interface GetStatisticsResponse {
  success: boolean;
  data?: SnapshotStatistics;
  error?: string;
}
