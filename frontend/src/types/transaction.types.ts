// frontend/src/types/transaction.types.ts

export interface Transaction {
  id: number;
  tenant_id: number;
  is_live: boolean;
  is_active: boolean;
  customer_id: number;
  scheme_code: string;
  scheme_name: string;
  folio_no?: string;
  txn_type_id: number;
  txn_date: string;
  total_amount: number;
  units: number;
  nav: number;
  stamp_duty?: number;
  staging_record_id?: number;
  import_session_id?: number;
  is_potential_duplicate: boolean;
  portfolio_flag: boolean;
  duplicate_reason?: string;
  created_at: string;
  updated_at: string;
}

export interface TransactionType {
  id: number;
  txn_code: string;
  txn_name: string;
  txn_type: 'Addition' | 'Deduction';
  is_active: boolean;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface TransactionWithDetails extends Transaction {
  customer_name?: string;
  txn_type_code?: string;
  txn_type_name?: string;
  txn_type?: 'Addition' | 'Deduction';
  staging_data?: Record<string, any>;
}

export interface TransactionFilters {
  customer_id?: number;
  scheme_code?: string;
  start_date?: string;
  end_date?: string;
  txn_type_id?: number;
  is_potential_duplicate?: boolean;
  portfolio_flag?: boolean;
  page?: number;
  page_size?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export interface TransactionListResponse {
  transactions: TransactionWithDetails[];
  pagination: {
    page: number;
    page_size: number;
    total: number;
    total_pages: number;
  };
}

export interface UpdatePortfolioFlagRequest {
  portfolio_flag: boolean;
}

export interface UpdatePortfolioFlagResponse {
  id: number;
  portfolio_flag: boolean;
}

export interface TransactionSummary {
  total_transactions: number;
  total_amount: number;
  total_units: number;
  addition_count: number;
  deduction_count: number;
  addition_amount: number;
  deduction_amount: number;
  duplicate_count: number;
  unique_schemes: number;
  date_range: {
    earliest: string;
    latest: string;
  };
}

export interface CreateTransactionRequest {
  customer_id: number;
  scheme_code: string;
  scheme_name: string;
  folio_no?: string;
  txn_type_id: number;
  txn_date: string;
  total_amount: number;
  units: number;
  nav: number;
  stamp_duty?: number;
  staging_record_id?: number;
  import_session_id?: number;
}

export interface UpdateTransactionRequest {
  scheme_name?: string;
  folio_no?: string;
  txn_type_id?: number;
  txn_date?: string;
  total_amount?: number;
  units?: number;
  nav?: number;
  stamp_duty?: number;
  portfolio_flag?: boolean;
  is_active?: boolean;
}

export interface TransactionValidationResult {
  is_valid: boolean;
  errors: string[];
  warnings: string[];
  is_duplicate: boolean;
  duplicate_reason?: string;
}

// API Response types
export interface GetTransactionsResponse {
  success: boolean;
  data: TransactionListResponse;
  error?: string;
}

export interface GetTransactionByIdResponse {
  success: boolean;
  data: TransactionWithDetails;
  error?: string;
}

export interface CreateTransactionResponse {
  success: boolean;
  data: Transaction;
  message: string;
  error?: string;
}

export interface UpdateTransactionResponse {
  success: boolean;
  data: Transaction;
  message: string;
  error?: string;
}

export interface UpdatePortfolioFlagAPIResponse {
  success: boolean;
  data: UpdatePortfolioFlagResponse;
  message: string;
  error?: string;
}

export interface DeleteTransactionResponse {
  success: boolean;
  message: string;
  error?: string;
}

export interface GetTransactionSummaryResponse {
  success: boolean;
  data: TransactionSummary;
  error?: string;
}