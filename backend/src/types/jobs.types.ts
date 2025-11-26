// backend/src/types/jobs.types.ts
// Generic types for all job types in the system

// ============================================================================
// JOB TYPE ENUM
// ============================================================================

export enum JobType {
  // Core scheduler jobs
  PORTFOLIO_SNAPSHOT = 'PORTFOLIO_SNAPSHOT',    // Friday 9 PM - Generate monthly portfolio snapshots
  NAV_DOWNLOAD = 'NAV_DOWNLOAD',                // Daily 9 PM - Download NAV for bookmarked schemes
  MARKET_OHLC_DOWNLOAD = 'MARKET_OHLC_DOWNLOAD', // Daily 9:30 PM - Download market index OHLC data
  GOAL_CALCULATION = 'GOAL_CALCULATION',        // Friday 8:30 PM - Recalculate all goals
  DAILY_ALERTS = 'DAILY_ALERTS',                // Daily 8 PM - Process and generate alert cards
}

// ============================================================================
// JOB TYPE REGISTRY
// ============================================================================

export interface JobTypeDefinition {
  code: JobType;
  name: string;
  description: string;
  default_cron_expression: string;
  default_max_retries: number;
  is_active: boolean;
  default_schedule_type: 'daily' | 'weekly' | 'monthly';
  failover_enabled: boolean;
  failover_cron_expression?: string;
  is_global: boolean;  // True for NAV/Market jobs that run once for all tenants
  created_at?: Date;
  updated_at?: Date;
}

// ============================================================================
// SCHEDULER CONFIGURATION
// ============================================================================

export interface JobSchedulerConfig {
  id?: number;
  tenant_id: number;
  job_type: JobType;
  user_id: number;
  is_live: boolean;
  schedule_type: 'daily' | 'weekly' | 'monthly' | 'custom';
  cron_expression: string;
  is_enabled: boolean;
  max_retries: number;
  job_config?: any;  // Job-specific configuration (JSON)

  // Failover support - if primary execution fails, retry at failover time
  failover_enabled: boolean;
  failover_cron_expression?: string;  // e.g., "0 22 * * *" for 10 PM failover

  // Tracking
  last_executed_at?: Date;
  next_execution_at?: Date;
  last_success_at?: Date;           // Track last successful execution
  execution_count: number;
  failure_count: number;
  created_at?: Date;
  updated_at?: Date;
}

export interface CreateJobConfigRequest {
  user_id: number;
  schedule_type?: 'daily' | 'weekly' | 'monthly' | 'custom';
  cron_expression?: string;
  is_enabled?: boolean;
  max_retries?: number;
  job_config?: any;
  failover_enabled?: boolean;
  failover_cron_expression?: string;
}

export interface UpdateJobConfigRequest {
  schedule_type?: 'daily' | 'weekly' | 'monthly' | 'custom';
  cron_expression?: string;
  is_enabled?: boolean;
  max_retries?: number;
  job_config?: any;
  failover_enabled?: boolean;
  failover_cron_expression?: string;
}

// ============================================================================
// JOB EXECUTION
// ============================================================================

export interface JobExecution {
  id: number;
  scheduler_config_id: number;
  job_type: JobType;
  tenant_id: number;
  is_live: boolean;
  execution_time: Date;
  status: 'success' | 'failed' | 'running' | 'retrying' | 'skipped';
  trigger_source: 'scheduled' | 'manual' | 'failover';
  retry_attempt: number;
  execution_data?: any;  // Job-specific results (JSON)
  error_message?: string;
  error_details?: any;
  execution_duration_ms?: number;
  started_at?: Date;
  completed_at?: Date;
  created_at: Date;
}

export interface JobExecutionRequest {
  tenant_id: number;
  is_live: boolean;
  trigger_source: 'scheduled' | 'manual';
  scheduler_config_id?: number;
  job_config?: any;
}

export interface JobExecutionResult {
  success: boolean;
  execution_data: any;  // Job-specific results
  execution_duration_ms: number;
  error?: string;
  error_details?: any;
}

// ============================================================================
// JOB STATISTICS
// ============================================================================

export interface JobStatistics {
  config: JobSchedulerConfig;
  is_running: boolean;
  last_execution?: JobExecution;
  next_scheduled_run?: Date;
  recent_executions: JobExecution[];
  success_rate: number;
  average_duration_ms: number;
  total_executions: number;
  successful_count: number;
  failed_count: number;
  running_count: number;
}

// ============================================================================
// JOB EXECUTOR INTERFACE (for job implementations)
// ============================================================================

export interface JobExecutionContext {
  tenant_id: number;
  is_live: boolean;
  trigger_source: 'scheduled' | 'manual' | 'failover';
  job_config?: any;
  scheduler_config_id?: number;
}

export interface JobExecutor {
  jobType: JobType;

  /**
   * Execute the job
   */
  execute(context: JobExecutionContext): Promise<JobExecutionResult>;

  /**
   * Validate job-specific configuration
   */
  validateConfig?(config: any): boolean;

  /**
   * Get default configuration for this job type
   */
  getDefaultConfig?(): any;
}

// ============================================================================
// JOB-SPECIFIC EXECUTION DATA TYPES
// ============================================================================

// Portfolio Snapshot Job
export interface PortfolioSnapshotExecutionData {
  snapshot_month_end: Date;
  customers_processed: number;
  customers_failed: number;
  snapshots_created: number;
  snapshots_updated: number;
  errors?: Array<{
    customer_id: number;
    customer_name?: string;
    error_message: string;
  }>;
}

// NAV Download Job
export interface NavDownloadExecutionData {
  download_date: Date;
  schemes_processed: number;
  schemes_updated: number;
  schemes_failed: number;
  errors?: Array<{
    scheme_code: string;
    scheme_name?: string;
    error_message: string;
  }>;
}

// Market OHLC Download Job
export interface MarketOhlcExecutionData {
  download_date: Date;
  indices_processed: number;
  indices_updated: number;
  indices_failed: number;
  errors?: Array<{
    index_id: number;
    index_name?: string;
    error_message: string;
  }>;
}

// Goal Calculation Job
export interface GoalCalculationExecutionData {
  calculation_date: Date;
  goals_processed: number;
  goals_updated: number;
  goals_failed: number;
  alerts_generated: number;
  errors?: Array<{
    goal_id: number;
    customer_id: number;
    error_message: string;
  }>;
}

// Daily Alerts Job
export interface DailyAlertsExecutionData {
  execution_date: Date;
  alerts_processed: number;
  alerts_triggered: number;
  alerts_skipped: number;
  customers_affected: number;
  errors?: Array<{
    alert_id: number;
    customer_id: number;
    error_message: string;
  }>;
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface GetJobConfigResponse {
  success: boolean;
  data?: JobSchedulerConfig;
  error?: string;
}

export interface UpdateJobConfigResponse {
  success: boolean;
  data?: JobSchedulerConfig;
  message?: string;
  error?: string;
}

export interface TriggerJobResponse {
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
    executions: JobExecution[];
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
  data?: JobStatistics;
  error?: string;
}

export interface GetJobTypesResponse {
  success: boolean;
  data?: JobTypeDefinition[];
  error?: string;
}
