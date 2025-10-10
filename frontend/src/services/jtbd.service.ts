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
  AlertsByDate
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
  error?: string;
}

interface AlertsByDateApiResponse {
  success: boolean;
  data: AlertsByDate[];
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
   * DASHBOARD METHODS
   */

  /**
   * Get upcoming alerts with communication status
   */
  static async getUpcomingAlerts(
    daysAhead: number = 30,
    priority?: 'critical' | 'high' | 'medium' | 'low',
    jtbdType?: 'portfolio_alert' | 'time_based' | 'profile_trigger',
    status?: 'pending' | 'overdue'
  ): Promise<UpcomingAlertsApiResponse> {
    try {
      const params = new URLSearchParams();
      params.append('days_ahead', daysAhead.toString());
      
      if (priority) params.append('priority', priority);
      if (jtbdType) params.append('jtbd_type', jtbdType);
      if (status) params.append('status', status);

      const url = `${API_ENDPOINTS.JTBD.UPCOMING_ALERTS}?${params.toString()}`;
      return await apiService.get<UpcomingAlertsApiResponse>(url);
    } catch (error: any) {
      console.error('Error fetching upcoming alerts:', error);
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
}

export default JTBDService;