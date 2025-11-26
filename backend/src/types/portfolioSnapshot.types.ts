// backend/src/types/portfolioSnapshot.types.ts
// Types for Portfolio Snapshot Scheduler feature
// UPDATED: Added operation types for different snapshot generation modes

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
// SNAPSHOT OPERATION TYPES (NEW)
// ============================================================================

/**
 * Operation types for different snapshot generation modes
 */
export type SnapshotOperationType = 
  | 'generate_missing'    // Only create missing snapshots (safe)
  | 'update_all'         // Create + update existing (current smartBackfill behavior)
  | 'regenerate_all'     // Drop all then create fresh (dangerous)
  | 'drop_all';          // Delete all snapshots (very dangerous)

/**
 * Request for snapshot operations
 */
export interface SnapshotOperationRequest {
  operation_type: SnapshotOperationType;
  customer_ids?: number[];
}

/**
 * Response for snapshot operations
 */
export interface SnapshotOperationResponse {
  success: boolean;
  data?: {
    execution_id: number;
    status: 'running' | 'completed' | 'failed';
    message: string;
  };
  error?: string;
}

/**
 * Result from dropping all snapshots
 */
export interface DropAllSnapshotsResult {
  success: boolean;
  deleted_count: number;
  execution_duration_ms: number;
  message: string;
}

/**
 * Result from generating missing snapshots only
 */
export interface GenerateMissingResult {
  snapshot_month_end: Date;
  customers_processed: number;
  customers_failed: number;
  snapshots_created: number;
  snapshots_skipped: number;  // NEW: Tracks how many were skipped (already exist)
  months_processed: number;
  errors: any[];
  execution_duration_ms: number;
}

/**
 * Result from regenerating all snapshots (drop + create)
 */
export interface RegenerateAllResult {
  snapshot_month_end: Date;
  customers_processed: number;
  customers_failed: number;
  snapshots_created: number;
  snapshots_deleted: number;  // NEW: Tracks how many were deleted
  months_processed: number;
  errors: any[];
  execution_duration_ms: number;
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
  trigger_source: 'scheduled' | 'manual' | 'failover';
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
  trigger_source?: 'scheduled' | 'manual' | 'failover';  // Optional, defaults to 'manual'
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

/**
 * Calculation method for snapshot values
 */
export type SnapshotCalculationMethod = 'NAV' | 'ASSUMPTION';

/**
 * Base portfolio snapshot data (for MF - NAV based)
 */
export interface PortfolioSnapshotData {
  customer_id: number;
  snapshot_month_end: Date;
  total_invested: number;
  current_value: number;
  total_returns: number;
  return_percentage: number;
  total_units: number;
  total_schemes: number;
  // Multi-asset support fields
  asset_type_code?: string;           // 'MF', 'RE', 'GOLD', 'FD', etc.
  investment_plan_id?: number | null; // FK to t_customer_asset_assignments
  calculation_method?: SnapshotCalculationMethod;  // 'NAV' or 'ASSUMPTION'
  growth_rate_applied?: number | null; // Rate used for assumption-based calculation
  actual_amount?: number | null;       // User-entered override value
}

/**
 * Asset snapshot data (for non-MF assets - assumption based)
 */
export interface AssetSnapshotData {
  customer_id: number;
  snapshot_month_end: Date;
  investment_plan_id: number;
  asset_type_code: string;
  total_invested: number;
  current_value: number;
  total_returns: number;
  return_percentage: number;
  calculation_method: 'ASSUMPTION';
  growth_rate_applied: number;
  actual_amount?: number | null;
  // These are null for non-MF
  total_units: null;
  total_schemes: null;
}

/**
 * Investment plan details for snapshot calculation
 */
export interface InvestmentPlanForSnapshot {
  id: number;
  customer_id: number;
  asset_type_id: number;
  asset_type_code: string;
  principal_amount: number;
  start_date: Date;
  has_started: boolean;
  duration_months: number | null;
  duration_years: number | null;
  investment_type: 'one_time' | 'sip' | 'recurring';
  recurring_amount: number | null;
  investment_frequency: 'monthly' | 'quarterly' | 'yearly' | null;
  custom_assumption_rate: number | null;
  default_assumption_rate: number;
  notes: string | null;
}

/**
 * Networth summary for a customer (aggregated across all assets)
 */
export interface NetworthSummary {
  customer_id: number;
  snapshot_month_end: Date;
  total_networth: number;
  total_invested: number;
  total_returns: number;
  return_percentage: number;
  by_asset_type: AssetTypeBreakdown[];
}

/**
 * Breakdown by asset type
 */
export interface AssetTypeBreakdown {
  asset_type_code: string;
  asset_type_name?: string;
  total_invested: number;
  current_value: number;
  total_returns: number;
  return_percentage: number;
  plan_count: number;
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