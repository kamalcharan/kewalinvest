// frontend/src/types/courseCorrection.types.ts
// Types for Course Correction (Scheme Code Migration) feature
// Updated with step-by-step tracking

// ============================================================================
// Status Types
// ============================================================================

export type CourseCorrectionStatus = 'pending' | 'completed' | 'rolled_back' | 'failed';
export type StepStatus = 'pending' | 'pass' | 'fail';

// ============================================================================
// Core Types
// ============================================================================

export interface CourseCorrection {
  id: number;
  tenant_id: number;
  is_live: boolean;
  customer_id: number;
  customer_name: string;
  source_scheme_code: string;
  source_scheme_name: string | null;
  target_scheme_code: string;
  target_scheme_name: string | null;
  transaction_count: number;
  total_invested: number;
  status: CourseCorrectionStatus;
  rollback_data: RollbackData | null;
  backup_data: RollbackData | null;
  notes: string | null;
  error_message: string | null;
  created_by: number;
  created_by_name?: string;
  created_at: string;
  executed_at: string | null;
  rolled_back_at: string | null;
  rolled_back_by: number | null;
  rolled_back_by_name?: string;
  snapshot_regenerated: boolean;
  snapshot_regenerated_at: string | null;
  // Step tracking
  step_1_check_existing?: StepStatus;
  step_2_get_customer?: StepStatus;
  step_3_get_source_scheme?: StepStatus;
  step_4_get_target_scheme?: StepStatus;
  step_5_count_txns?: StepStatus;
  step_6_backup?: StepStatus;
  step_7_update_txns?: StepStatus;
  step_8_snapshots?: StepStatus;
}

export interface RollbackData {
  transactions: Array<{
    id: number;
    original_scheme_code: string;
    original_scheme_name?: string;
  }>;
  backup_timestamp?: string;
}

// ============================================================================
// Impact Analysis Types
// ============================================================================

export interface ImpactedCustomer {
  customer_id: number;
  customer_name: string;
  transaction_count: number;
  total_invested: number;
  first_transaction_date: string;
  last_transaction_date: string;
  already_migrated: boolean;
}

export interface SchemeImpactAnalysis {
  scheme_code: string;
  scheme_name: string | null;
  total_customers: number;
  total_transactions: number;
  total_invested: number;
  customers: ImpactedCustomer[];
}

// ============================================================================
// Bookmark & Scheme Types
// ============================================================================

export interface BookmarkedScheme {
  scheme_code: string;
  scheme_name: string;
  amc_name: string;
}

export interface SchemeSearchResult {
  id: number;
  scheme_code: string;
  scheme_name: string;
  scheme_nav_name: string | null;
  amc_name: string;
}

// ============================================================================
// Request Types
// ============================================================================

export interface CreateCourseCorrectionRequest {
  customer_id: number;
  source_scheme_code: string;
  target_scheme_code: string;
  notes?: string;
}

export interface GetCorrectionsParams {
  page?: number;
  page_size?: number;
  status?: CourseCorrectionStatus;
  customer_id?: number;
  source_scheme_code?: string;
}

// ============================================================================
// Response Types
// ============================================================================

export interface CourseCorrectionListResponse {
  success: boolean;
  data: {
    corrections: CourseCorrection[];
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
  };
  error?: string;
}

export interface CourseCorrectionDetailResponse {
  success: boolean;
  data: CourseCorrection;
  error?: string;
}

export interface ImpactAnalysisResponse {
  success: boolean;
  data: SchemeImpactAnalysis;
  error?: string;
}

export interface ExecuteResponse {
  success: boolean;
  data?: {
    updated_transactions: number;
    message: string;
  };
  error?: string;
}

export interface RollbackResponse {
  success: boolean;
  data?: {
    restored_transactions: number;
    message: string;
  };
  error?: string;
}

export interface DeleteResponse {
  success: boolean;
  error?: string;
}

export interface BookmarksResponse {
  success: boolean;
  data: BookmarkedScheme[];
  error?: string;
}

export interface SchemeSearchResponse {
  success: boolean;
  data: {
    schemes: SchemeSearchResult[];
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
  };
  error?: string;
}

// ============================================================================
// Migration Types (Step-by-step tracking)
// ============================================================================

export interface MigrationStep {
  status: StepStatus;
  message?: string;
  count?: number;
}

export interface MigrationResult {
  success: boolean;
  correction_id?: number;
  steps: {
    step_1_check_existing: MigrationStep;
    step_2_get_customer: MigrationStep;
    step_3_get_source_scheme: MigrationStep;
    step_4_get_target_scheme: MigrationStep;
    step_5_count_txns: MigrationStep;
    step_6_backup: MigrationStep;
    step_7_update_txns: MigrationStep;
    step_8_snapshots: MigrationStep;
  };
  summary?: {
    customer_id: number;
    customer_name: string;
    source_scheme_code: string;
    source_scheme_name: string | null;
    target_scheme_code: string;
    target_scheme_name: string | null;
    transactions_updated: number;
    total_invested: number;
  };
  error?: string;
  failed_step?: number;
}

export interface MigrateResponse {
  success: boolean;
  data: MigrationResult;
  error?: string;
}

// ============================================================================
// Step Labels for Display
// ============================================================================

export const STEP_LABELS: Record<string, string> = {
  step_1_check_existing: 'Check Existing Migrations',
  step_2_get_customer: 'Get Customer Name',
  step_3_get_source_scheme: 'Get Source Scheme',
  step_4_get_target_scheme: 'Get Target Scheme',
  step_5_count_txns: 'Count Transactions',
  step_6_backup: 'Backup Transactions',
  step_7_update_txns: 'Update Transactions',
  step_8_snapshots: 'Regenerate Snapshots'
};
