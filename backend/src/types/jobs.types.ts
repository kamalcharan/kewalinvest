// backend/src/types/jobs.types.ts
// Generic types for all job types in the system

// ============================================================================
// JOB TYPE ENUM
// ============================================================================

export enum JobType {
  PORTFOLIO_SNAPSHOT = 'PORTFOLIO_SNAPSHOT',
  NAV_DOWNLOAD = 'NAV_DOWNLOAD',
  MARKET_DOWNLOAD = 'MARKET_DOWNLOAD',
  // Add more job types here as needed:
  // DATA_CLEANUP = 'DATA_CLEANUP',
  // METRICS_CALCULATION = 'METRICS_CALCULATION',
  // REPORT_GENERATION = 'REPORT_GENERATION',
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
  last_executed_at?: Date;
  next_execution_at?: Date;
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
}

export interface UpdateJobConfigRequest {
  schedule_type?: 'daily' | 'weekly' | 'monthly' | 'custom';
  cron_expression?: string;
  is_enabled?: boolean;
  max_retries?: number;
  job_config?: any;
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
  trigger_source: 'scheduled' | 'manual';
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
  trigger_source: 'scheduled' | 'manual';
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

// Future job types will have their execution data types here:
// export interface DataCleanupExecutionData { ... }
// export interface MetricsCalculationExecutionData { ... }

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
