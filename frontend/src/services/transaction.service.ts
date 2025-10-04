// frontend/src/services/transaction.service.ts

import apiService from './api.service';
import { API_ENDPOINTS } from './serviceURLs';

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

export interface Transaction {
  id: number;
  customer_id: number;
  customer_name?: string;
  scheme_code: string;
  scheme_name: string;
  folio_no?: string;
  txn_type_id: number;
  txn_type_code?: string;
  txn_type_name?: string;
  txn_type?: 'Addition' | 'Deduction';
  txn_date: string;
  total_amount: number;
  units: number;
  nav: number;
  stamp_duty?: number;
  is_potential_duplicate: boolean;
  portfolio_flag: boolean;
  duplicate_reason?: string;
  staging_data?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface TransactionListResponse {
  success: boolean;
  data: {
    transactions: Transaction[];
    pagination: {
      page: number;
      page_size: number;
      total: number;
      total_pages: number;
    };
  };
  error?: string;
}

export interface TransactionDetailResponse {
  success: boolean;
  data: Transaction;
  error?: string;
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

export interface TransactionSummaryResponse {
  success: boolean;
  data: TransactionSummary;
  error?: string;
}

export class TransactionService {
  /**
   * Get list of transactions with filters
   */
  static async getTransactions(
    filters: TransactionFilters
  ): Promise<TransactionListResponse> {
    try {
      const queryParams = new URLSearchParams();

      if (filters.customer_id) queryParams.append('customer_id', filters.customer_id.toString());
      if (filters.scheme_code) queryParams.append('scheme_code', filters.scheme_code);
      if (filters.start_date) queryParams.append('start_date', filters.start_date);
      if (filters.end_date) queryParams.append('end_date', filters.end_date);
      if (filters.txn_type_id) queryParams.append('txn_type_id', filters.txn_type_id.toString());
      if (filters.is_potential_duplicate !== undefined) {
        queryParams.append('is_potential_duplicate', filters.is_potential_duplicate.toString());
      }
      if (filters.portfolio_flag !== undefined) {
        queryParams.append('portfolio_flag', filters.portfolio_flag.toString());
      }
      if (filters.page) queryParams.append('page', filters.page.toString());
      if (filters.page_size) queryParams.append('page_size', filters.page_size.toString());
      if (filters.sort_by) queryParams.append('sort_by', filters.sort_by);
      if (filters.sort_order) queryParams.append('sort_order', filters.sort_order);

      const url = `${API_ENDPOINTS.TRANSACTIONS.LIST}?${queryParams.toString()}`;
      return await apiService.get<TransactionListResponse>(url);
    } catch (error: any) {
      console.error('Error fetching transactions:', error);
      throw error;
    }
  }

  /**
   * Get transaction by ID
   */
  static async getTransactionById(
    transactionId: number
  ): Promise<TransactionDetailResponse> {
    try {
      const url = API_ENDPOINTS.TRANSACTIONS.GET(transactionId);
      return await apiService.get<TransactionDetailResponse>(url);
    } catch (error: any) {
      console.error('Error fetching transaction:', error);
      throw error;
    }
  }

  /**
   * Create new transaction
   */
  static async createTransaction(
    transactionData: CreateTransactionRequest
  ): Promise<TransactionDetailResponse> {
    try {
      const url = API_ENDPOINTS.TRANSACTIONS.CREATE;
      return await apiService.post<TransactionDetailResponse>(url, transactionData);
    } catch (error: any) {
      console.error('Error creating transaction:', error);
      throw error;
    }
  }

  /**
   * Update transaction
   */
  static async updateTransaction(
    transactionId: number,
    updates: UpdateTransactionRequest
  ): Promise<TransactionDetailResponse> {
    try {
      const url = API_ENDPOINTS.TRANSACTIONS.UPDATE(transactionId);
      return await apiService.put<TransactionDetailResponse>(url, updates);
    } catch (error: any) {
      console.error('Error updating transaction:', error);
      throw error;
    }
  }

  /**
   * Update portfolio flag (include/exclude from totals)
   */
  static async updatePortfolioFlag(
    transactionId: number,
    portfolioFlag: boolean
  ): Promise<{ success: boolean; data: { id: number; portfolio_flag: boolean }; message: string }> {
    try {
      const url = API_ENDPOINTS.TRANSACTIONS.UPDATE_PORTFOLIO_FLAG(transactionId);
      return await apiService.patch(url, { portfolio_flag: portfolioFlag });
    } catch (error: any) {
      console.error('Error updating portfolio flag:', error);
      throw error;
    }
  }

  /**
   * Delete transaction (soft delete)
   */
  static async deleteTransaction(
    transactionId: number
  ): Promise<{ success: boolean; message: string }> {
    try {
      const url = API_ENDPOINTS.TRANSACTIONS.DELETE(transactionId);
      return await apiService.delete(url);
    } catch (error: any) {
      console.error('Error deleting transaction:', error);
      throw error;
    }
  }

  /**
   * Get transaction summary statistics
   */
  static async getTransactionSummary(
    filters: TransactionFilters
  ): Promise<TransactionSummaryResponse> {
    try {
      const queryParams = new URLSearchParams();

      if (filters.customer_id) queryParams.append('customer_id', filters.customer_id.toString());
      if (filters.scheme_code) queryParams.append('scheme_code', filters.scheme_code);
      if (filters.start_date) queryParams.append('start_date', filters.start_date);
      if (filters.end_date) queryParams.append('end_date', filters.end_date);

      const url = `${API_ENDPOINTS.TRANSACTIONS.SUMMARY}?${queryParams.toString()}`;
      return await apiService.get<TransactionSummaryResponse>(url);
    } catch (error: any) {
      console.error('Error fetching transaction summary:', error);
      throw error;
    }
  }

  /**
   * Helper: Format date for display
   */
  static formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  /**
   * Helper: Format amount in INR
   */
  static formatAmount(amount: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  }

  /**
   * Helper: Format units
   */
  static formatUnits(units: number): string {
    return units.toFixed(4);
  }

  /**
   * Helper: Format NAV
   */
  static formatNAV(nav: number): string {
    return nav.toFixed(4);
  }

  /**
   * Helper: Get transaction type color
   */
  static getTransactionTypeColor(txnType?: 'Addition' | 'Deduction'): string {
    switch (txnType) {
      case 'Addition':
        return '#10B981'; // Green
      case 'Deduction':
        return '#EF4444'; // Red
      default:
        return '#6B7280'; // Gray
    }
  }

  /**
   * Helper: Get transaction type label
   */
  static getTransactionTypeLabel(txnType?: 'Addition' | 'Deduction'): string {
    switch (txnType) {
      case 'Addition':
        return 'Buy';
      case 'Deduction':
        return 'Sell';
      default:
        return 'Unknown';
    }
  }
}