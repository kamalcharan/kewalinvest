// frontend/src/types/courseCorrection.types.ts
// Types for Course Correction (Scheme Code Migration) feature

// ============================================================================
// Status Types
// ============================================================================

export type CourseCorrectionStatus = 'pending' | 'completed' | 'rolled_back' | 'failed';

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
}

export interface RollbackData {
  transactions: Array<{
    id: number;
    original_scheme_code: string;
    original_scheme_name?: string;
  }>;
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

export interface CustomerScheme {
  scheme_code: string;
  scheme_name: string | null;
  amc_name: string | null;
  transaction_count: number;
  total_invested: number;
  first_transaction_date: string;
  last_transaction_date: string;
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

export interface CustomerSchemesResponse {
  success: boolean;
  data: CustomerScheme[];
  error?: string;
}
