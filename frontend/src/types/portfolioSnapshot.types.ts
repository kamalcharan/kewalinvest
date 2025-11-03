// frontend/src/types/portfolioSnapshot.types.ts
// Frontend types for Portfolio Snapshot Scheduler

export interface PortfolioSnapshotConfig {
  id: number;
  tenant_id: number;
  user_id: number;
  is_live: boolean;
  schedule_type: 'weekly' | 'monthly' | 'custom';
  cron_expression: string;
  is_enabled: boolean;
  last_executed_at?: string;
  next_execution_at?: string;
  execution_count: number;
  failure_count: number;
  max_retries: number;
  created_at: string;
  updated_at: string;
}

export interface SnapshotExecution {
  id: number;
  scheduler_config_id: number;
  tenant_id: number;
  is_live: boolean;
  execution_time: string;
  status: 'success' | 'failed' | 'running' | 'retrying' | 'skipped';
  trigger_source: 'scheduled' | 'manual';
  snapshot_month_end: string;
  customers_processed: number;
  customers_failed: number;
  snapshots_created: number;
  snapshots_updated: number;
  retry_attempt: number;
  error_message?: string;
  error_details?: any;
  execution_duration_ms?: number;
  started_at?: string;
  completed_at?: string;
  created_at: string;
}

export interface SnapshotStatistics {
  config: PortfolioSnapshotConfig;
  is_running: boolean;
  last_execution?: SnapshotExecution;
  next_scheduled_run?: string;
  recent_executions: SnapshotExecution[];
  success_rate: number;
  average_duration_ms: number;
  total_snapshots_generated: number;
}

export interface UpdateConfigRequest {
  schedule_type?: 'weekly' | 'monthly' | 'custom';
  cron_expression?: string;
  is_enabled?: boolean;
  max_retries?: number;
}

export interface ExecutionHistoryResponse {
  executions: SnapshotExecution[];
  pagination: {
    page: number;
    page_size: number;
    total: number;
    total_pages: number;
  };
}

// ==================== ADD THESE 3 INTERFACES AT THE END ====================

/**
 * Portfolio snapshot data from database (monthly portfolio value record)
 */
export interface PortfolioSnapshot {
  id: number;
  customer_id: number;
  snapshot_month_end: string;
  total_invested: number;
  current_value: number;
  total_returns: number;
  return_percentage: number;
  total_units: number;
  total_schemes: number;
  created_at: string;
  updated_at: string;
}

/**
 * Portfolio snapshot with calculated month-over-month changes
 */
export interface PortfolioSnapshotWithMoM extends PortfolioSnapshot {
  mom_change_percentage: number | null;
  mom_change_absolute: number | null;
}

/**
 * API response when fetching snapshots for a customer
 */
export interface CustomerSnapshotsResponse {
  success: boolean;
  data: {
    customer_id: number;
    customer_name: string;
    snapshots: PortfolioSnapshot[];
    total_snapshots: number;
  };
  error?: string;
}