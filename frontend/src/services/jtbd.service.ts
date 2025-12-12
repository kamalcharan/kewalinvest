// frontend/src/services/jtbd.service.ts

import apiService from './api.service';
import { API_ENDPOINTS } from './serviceURLs';
import {
  JTBDConfiguration,
  CreateJTBDRequest,
  UpdateJTBDRequest,
  JTBDDashboardStats,
  CustomerJTBDSummary,
  CalculatedAlertInstance,
  JTBDWithCommunication,
  AlertsByDate,
  // New unified types
  JTBDExecution,
  CreateExecutionRequest,
  UpdateExecutionRequest,
  CompleteExecutionRequest,
  CancelExecutionRequest,
  ExecutionFilters,
  ExecutionListResponse,
  CustomerJobsSummary,
} from '../types/jtbd.types';

// API Response wrappers
interface JTBDApiResponse {
  success: boolean;
  data: JTBDConfiguration;
  message?: string;
  error?: string;
}

interface JTBDListApiResponse {
  success: boolean;
  data: JTBDConfiguration[];
  error?: string;
}

interface JTBDStatsApiResponse {
  success: boolean;
  data: JTBDDashboardStats;
  error?: string;
}

interface JTBDSummaryApiResponse {
  success: boolean;
  data: CustomerJTBDSummary;
  error?: string;
}

interface JTBDOccurrencesApiResponse {
  success: boolean;
  data: CalculatedAlertInstance[];
  error?: string;
}

interface CustomerSchemesApiResponse {
  success: boolean;
  data: Array<{
    scheme_code: string;
    scheme_name: string;
    folio_no?: string;
  }>;
  error?: string;
}

interface TransactionTypesApiResponse {
  success: boolean;
  data: Array<{
    id: number;
    txn_code: string;
    txn_name: string;
    txn_type: 'Addition' | 'Deduction';
  }>;
  error?: string;
}

interface UpcomingAlertsApiResponse {
  success: boolean;
  data: JTBDWithCommunication[];
  meta?: {
    count: number;
    filters_applied: {
      date_range: string;
      priority: string;
      jtbd_type: string;
      status: string;
    };
  };
  error?: string;
}

interface AlertsByDateApiResponse {
  success: boolean;
  data: AlertsByDate[];
  error?: string;
}

// NEW: Execution API Response wrappers
interface ExecutionApiResponse {
  success: boolean;
  data: JTBDExecution;
  message?: string;
  error?: string;
}

interface ExecutionListApiResponse {
  success: boolean;
  data: ExecutionListResponse;
  error?: string;
}

interface ExecutionArrayApiResponse {
  success: boolean;
  data: JTBDExecution[];
  error?: string;
}

interface CustomerJobsSummaryApiResponse {
  success: boolean;
  data: CustomerJobsSummary;
  error?: string;
}

export class JTBDService {
  /**
   * Create new JTBD configuration
   */
  static async createJTBD(data: CreateJTBDRequest): Promise<JTBDApiResponse> {
    try {
      const url = API_ENDPOINTS.JTBD.CREATE;
      return await apiService.post<JTBDApiResponse>(url, data);
    } catch (error: any) {
      console.error('Error creating JTBD:', error);
      throw error;
    }
  }

  /**
   * Get all JTBDs for a customer
   */
  static async getCustomerJTBDs(customerId: number): Promise<JTBDListApiResponse> {
    try {
      const url = API_ENDPOINTS.JTBD.GET_CUSTOMER_JTBDS(customerId);
      return await apiService.get<JTBDListApiResponse>(url);
    } catch (error: any) {
      console.error('Error fetching customer JTBDs:', error);
      throw error;
    }
  }

  /**
   * Get single JTBD by ID
   */
  static async getJTBD(jtbdId: number): Promise<JTBDApiResponse> {
    try {
      const url = API_ENDPOINTS.JTBD.GET(jtbdId);
      return await apiService.get<JTBDApiResponse>(url);
    } catch (error: any) {
      console.error('Error fetching JTBD:', error);
      throw error;
    }
  }

  /**
   * Update JTBD configuration
   */
  static async updateJTBD(
    jtbdId: number,
    data: UpdateJTBDRequest
  ): Promise<JTBDApiResponse> {
    try {
      const url = API_ENDPOINTS.JTBD.UPDATE(jtbdId);
      return await apiService.put<JTBDApiResponse>(url, data);
    } catch (error: any) {
      console.error('Error updating JTBD:', error);
      throw error;
    }
  }

  /**
   * Delete JTBD configuration
   */
  static async deleteJTBD(jtbdId: number): Promise<{ success: boolean; message: string }> {
    try {
      const url = API_ENDPOINTS.JTBD.DELETE(jtbdId);
      return await apiService.delete(url);
    } catch (error: any) {
      console.error('Error deleting JTBD:', error);
      throw error;
    }
  }

  /**
   * Toggle JTBD active/inactive
   */
  static async toggleJTBD(jtbdId: number): Promise<JTBDApiResponse> {
    try {
      const url = API_ENDPOINTS.JTBD.TOGGLE(jtbdId);
      return await apiService.patch<JTBDApiResponse>(url, {});
    } catch (error: any) {
      console.error('Error toggling JTBD:', error);
      throw error;
    }
  }

  /**
   * Acknowledge alert (mark as done)
   */
  static async acknowledgeAlert(alertId: number): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      const url = API_ENDPOINTS.JTBD.ACKNOWLEDGE_ALERT(alertId);
      return await apiService.patch(url, {});
    } catch (error: any) {
      console.error('Error acknowledging alert:', error);
      throw error;
    }
  }

  /**
   * Dismiss alert
   */
  static async dismissAlert(alertId: number): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      const url = API_ENDPOINTS.JTBD.DISMISS_ALERT(alertId);
      return await apiService.patch(url, {});
    } catch (error: any) {
      console.error('Error dismissing alert:', error);
      throw error;
    }
  }

  /**
   * Get dashboard statistics
   */
  static async getDashboardStats(): Promise<JTBDStatsApiResponse> {
    try {
      const url = API_ENDPOINTS.JTBD.DASHBOARD_OVERVIEW;
      return await apiService.get<JTBDStatsApiResponse>(url);
    } catch (error: any) {
      console.error('Error fetching dashboard stats:', error);
      throw error;
    }
  }

  /**
   * Get customers without JTBD setup
   */
  static async getCustomersWithoutJTBD(): Promise<{
    success: boolean;
    data: Array<{
      id: number;
      name: string;
      jtbd_setup_status: string;
      jtbd_count: number;
    }>;
  }> {
    try {
      const url = API_ENDPOINTS.JTBD.CUSTOMERS_WITHOUT_JTBD;
      return await apiService.get(url);
    } catch (error: any) {
      console.error('Error fetching customers without JTBD:', error);
      throw error;
    }
  }

  /**
   * Get customer JTBD summary
   */
  static async getCustomerSummary(customerId: number): Promise<JTBDSummaryApiResponse> {
    try {
      const url = API_ENDPOINTS.JTBD.CUSTOMER_SUMMARY(customerId);
      return await apiService.get<JTBDSummaryApiResponse>(url);
    } catch (error: any) {
      console.error('Error fetching customer summary:', error);
      throw error;
    }
  }

  /**
   * Get available schemes for customer (for dropdown)
   */
  static async getCustomerSchemes(customerId: number): Promise<CustomerSchemesApiResponse> {
    try {
      const url = API_ENDPOINTS.JTBD.CUSTOMER_SCHEMES(customerId);
      return await apiService.get<CustomerSchemesApiResponse>(url);
    } catch (error: any) {
      console.error('Error fetching customer schemes:', error);
      throw error;
    }
  }

  /**
   * Get transaction types (for dropdown)
   */
  static async getTransactionTypes(): Promise<TransactionTypesApiResponse> {
    try {
      const url = API_ENDPOINTS.JTBD.TRANSACTION_TYPES;
      return await apiService.get<TransactionTypesApiResponse>(url);
    } catch (error: any) {
      console.error('Error fetching transaction types:', error);
      throw error;
    }
  }

  /**
   * Get portfolio alert occurrences
   */
  static async getPortfolioOccurrences(jtbdId: number): Promise<JTBDOccurrencesApiResponse> {
    try {
      const url = API_ENDPOINTS.JTBD.OCCURRENCES(jtbdId);
      return await apiService.get<JTBDOccurrencesApiResponse>(url);
    } catch (error: any) {
      console.error('Error fetching portfolio occurrences:', error);
      throw error;
    }
  }

  /**
   * ========================================================================
   * EXECUTION METHODS (Unified JTBD v2 - Meetings, SIP Plans, etc.)
   * ========================================================================
   */

  /**
   * Get executions with filters (bot-friendly queries)
   */
  static async getExecutions(filters?: ExecutionFilters): Promise<ExecutionListApiResponse> {
    try {
      const params = new URLSearchParams();

      if (filters?.customer_id) params.append('customer_id', filters.customer_id.toString());
      if (filters?.config_id) params.append('config_id', filters.config_id.toString());
      if (filters?.execution_type) params.append('execution_type', filters.execution_type);
      if (filters?.execution_status) params.append('execution_status', filters.execution_status);
      if (filters?.priority) params.append('priority', filters.priority);
      if (filters?.from_date) params.append('from_date', filters.from_date);
      if (filters?.to_date) params.append('to_date', filters.to_date);
      if (filters?.page) params.append('page', filters.page.toString());
      if (filters?.page_size) params.append('page_size', filters.page_size.toString());

      const url = `${API_ENDPOINTS.JTBD_V2.EXECUTION.LIST}?${params.toString()}`;
      return await apiService.get<ExecutionListApiResponse>(url);
    } catch (error: any) {
      console.error('Error fetching executions:', error);
      throw error;
    }
  }

  /**
   * Get single execution by ID
   */
  static async getExecution(executionId: number): Promise<ExecutionApiResponse> {
    try {
      const url = API_ENDPOINTS.JTBD_V2.EXECUTION.GET(executionId);
      return await apiService.get<ExecutionApiResponse>(url);
    } catch (error: any) {
      console.error('Error fetching execution:', error);
      throw error;
    }
  }

  /**
   * Create new execution (meeting, SIP instance, etc.)
   */
  static async createExecution(data: CreateExecutionRequest): Promise<ExecutionApiResponse> {
    try {
      const url = API_ENDPOINTS.JTBD_V2.EXECUTION.CREATE;
      return await apiService.post<ExecutionApiResponse>(url, data);
    } catch (error: any) {
      console.error('Error creating execution:', error);
      throw error;
    }
  }

  /**
   * Update execution
   */
  static async updateExecution(
    executionId: number,
    data: UpdateExecutionRequest
  ): Promise<ExecutionApiResponse> {
    try {
      const url = API_ENDPOINTS.JTBD_V2.EXECUTION.UPDATE(executionId);
      return await apiService.patch<ExecutionApiResponse>(url, data);
    } catch (error: any) {
      console.error('Error updating execution:', error);
      throw error;
    }
  }

  /**
   * Complete execution (with deviation tracking)
   */
  static async completeExecution(
    executionId: number,
    data: CompleteExecutionRequest
  ): Promise<ExecutionApiResponse> {
    try {
      const url = API_ENDPOINTS.JTBD_V2.EXECUTION.COMPLETE(executionId);
      return await apiService.post<ExecutionApiResponse>(url, data);
    } catch (error: any) {
      console.error('Error completing execution:', error);
      throw error;
    }
  }

  /**
   * Cancel execution (with reason)
   */
  static async cancelExecution(
    executionId: number,
    data: CancelExecutionRequest
  ): Promise<ExecutionApiResponse> {
    try {
      const url = API_ENDPOINTS.JTBD_V2.EXECUTION.CANCEL(executionId);
      return await apiService.post<ExecutionApiResponse>(url, data);
    } catch (error: any) {
      console.error('Error cancelling execution:', error);
      throw error;
    }
  }

  /**
   * Delete execution
   */
  static async deleteExecution(executionId: number): Promise<{ success: boolean; message: string }> {
    try {
      const url = API_ENDPOINTS.JTBD_V2.EXECUTION.DELETE(executionId);
      return await apiService.delete(url);
    } catch (error: any) {
      console.error('Error deleting execution:', error);
      throw error;
    }
  }

  /**
   * Get upcoming executions (dashboard view)
   */
  static async getUpcomingExecutions(days: number = 30): Promise<ExecutionArrayApiResponse> {
    try {
      const params = new URLSearchParams();
      params.append('days', days.toString());

      const url = `${API_ENDPOINTS.JTBD_V2.UPCOMING}?${params.toString()}`;
      return await apiService.get<ExecutionArrayApiResponse>(url);
    } catch (error: any) {
      console.error('Error fetching upcoming executions:', error);
      throw error;
    }
  }

  /**
   * Get customer jobs summary (execution overview)
   */
  static async getCustomerJobsSummary(customerId: number): Promise<CustomerJobsSummaryApiResponse> {
    try {
      const url = API_ENDPOINTS.JTBD_V2.CUSTOMER_SUMMARY(customerId);
      return await apiService.get<CustomerJobsSummaryApiResponse>(url);
    } catch (error: any) {
      console.error('Error fetching customer jobs summary:', error);
      throw error;
    }
  }

  /**
   * ========================================================================
   * DASHBOARD METHODS (Old JTBD system)
   * ========================================================================
   */

  /**
   * Get upcoming alerts with communication status
   * UPDATED: Added date range support
   */
  static async getUpcomingAlerts(
    daysAhead: number = 30,
    priority?: 'critical' | 'high' | 'medium' | 'low',
    jtbdType?: 'portfolio_alert' | 'time_based' | 'profile_trigger',
    status?: 'pending' | 'overdue',
    startDate?: string,  // NEW: YYYY-MM-DD format
    endDate?: string     // NEW: YYYY-MM-DD format
  ): Promise<UpcomingAlertsApiResponse> {
    try {
      const params = new URLSearchParams();
      
      // Use custom date range if provided, otherwise use days_ahead
      if (startDate && endDate) {
        params.append('start_date', startDate);
        params.append('end_date', endDate);
        console.log('📅 Using custom date range:', { startDate, endDate });
      } else {
        params.append('days_ahead', daysAhead.toString());
        console.log('📅 Using days ahead:', daysAhead);
      }
      
      if (priority) params.append('priority', priority);
      if (jtbdType) params.append('jtbd_type', jtbdType);
      if (status) params.append('status', status);

      const url = `${API_ENDPOINTS.JTBD.UPCOMING_ALERTS}?${params.toString()}`;
      console.log('🔵 Fetching upcoming alerts:', url);

      const response = await apiService.get<UpcomingAlertsApiResponse>(url);
      
      console.log('✅ Alerts fetched successfully:', {
        count: response.data.length,
        meta: response.meta
      });

      return response;
    } catch (error: any) {
      console.error('❌ Error fetching upcoming alerts:', error);
      throw error;
    }
  }

  /**
   * Get alerts grouped by date
   */
  static async getAlertsByDate(
    startDate: string,
    endDate: string
  ): Promise<AlertsByDateApiResponse> {
    try {
      const params = new URLSearchParams();
      params.append('start_date', startDate);
      params.append('end_date', endDate);

      const url = `${API_ENDPOINTS.JTBD.ALERTS_BY_DATE}?${params.toString()}`;
      return await apiService.get<AlertsByDateApiResponse>(url);
    } catch (error: any) {
      console.error('Error fetching alerts by date:', error);
      throw error;
    }
  }

  /**
   * Get communication queue
   */
  static async getCommunicationQueue(
    status?: 'pending' | 'scheduled' | 'sent' | 'failed',
    limit: number = 50
  ): Promise<UpcomingAlertsApiResponse> {
    try {
      const params = new URLSearchParams();
      params.append('limit', limit.toString());
      
      if (status) params.append('status', status);

      const url = `${API_ENDPOINTS.JTBD.COMMUNICATION_QUEUE}?${params.toString()}`;
      return await apiService.get<UpcomingAlertsApiResponse>(url);
    } catch (error: any) {
      console.error('Error fetching communication queue:', error);
      throw error;
    }
  }

  /**
   * HELPER METHODS
   */

  /**
   * Helper: Format frequency for display
   */
  static formatFrequency(frequency: string): string {
    const frequencies: Record<string, string> = {
      daily: 'Daily',
      fortnightly: 'Fortnightly',
      monthly: 'Monthly',
      quarterly: 'Quarterly',
      yearly: 'Yearly',
      NA: 'One-time'
    };
    return frequencies[frequency] || frequency;
  }

  /**
   * Helper: Get priority color
   */
  static getPriorityColor(priority: string): string {
    const colors: Record<string, string> = {
      critical: '#DC2626',
      high: '#F97316',
      medium: '#F59E0B',
      low: '#10B981'
    };
    return colors[priority] || '#6B7280';
  }

  /**
   * Helper: Get JTBD type label
   */
  static getTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      portfolio_alert: 'Portfolio Alert',
      time_based: 'Time-Based Alert',
      profile_trigger: 'Profile Trigger'
    };
    return labels[type] || type;
  }

  /**
   * Helper: Format date for display
   */
  static formatDate(dateString: string): string {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  /**
   * Helper: Calculate days until date
   */
  static getDaysUntil(dateString: string): number {
    const today = new Date();
    const targetDate = new Date(dateString);
    const diffTime = targetDate.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Helper: Get communication status badge color
   */
  static getCommunicationStatusColor(status: string): string {
    const colors: Record<string, string> = {
      pending: '#F59E0B',
      scheduled: '#3B82F6',
      sent: '#10B981',
      failed: '#DC2626'
    };
    return colors[status] || '#6B7280';
  }

  /**
   * Helper: Format communication status for display
   */
  static formatCommunicationStatus(status: string): string {
    const statuses: Record<string, string> = {
      pending: 'Pending',
      scheduled: 'Scheduled',
      sent: 'Sent',
      failed: 'Failed'
    };
    return statuses[status] || status;
  }

  /**
   * Helper: Format date to YYYY-MM-DD
   */
  static formatDateToYYYYMMDD(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Helper: Get date range for preset filters
   */
  static getPresetDateRange(preset: 'today' | '7days' | '30days' | 'overdue'): {
    startDate?: string;
    endDate?: string;
    daysAhead?: number;
    status?: 'overdue';
  } {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    switch (preset) {
      case 'today':
        return {
          startDate: this.formatDateToYYYYMMDD(today),
          endDate: this.formatDateToYYYYMMDD(today),
          daysAhead: 1
        };
      
      case '7days':
        const sevenDays = new Date(today);
        sevenDays.setDate(today.getDate() + 7);
        return {
          startDate: this.formatDateToYYYYMMDD(today),
          endDate: this.formatDateToYYYYMMDD(sevenDays),
          daysAhead: 7
        };
      
      case '30days':
        const thirtyDays = new Date(today);
        thirtyDays.setDate(today.getDate() + 30);
        return {
          startDate: this.formatDateToYYYYMMDD(today),
          endDate: this.formatDateToYYYYMMDD(thirtyDays),
          daysAhead: 30
        };
      
      case 'overdue':
        return {
          status: 'overdue'
        };
      
      default:
        return { daysAhead: 30 };
    }
  }
}

export default JTBDService;