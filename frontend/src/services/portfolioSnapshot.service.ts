// frontend/src/services/portfolioSnapshot.service.ts
// Service for Portfolio Snapshot Scheduler API calls
// Follows the exact pattern of bookmark.service.ts

import apiService from './api.service';
import { API_ENDPOINTS } from './serviceURLs';

// ==================== TYPES ====================

interface SnapshotConfig {
  id?: number;
  tenant_id: number;
  schedule_type: 'weekly' | 'monthly' | 'custom';
  cron_expression: string;
  is_enabled: boolean;
  max_retries: number;
  execution_count: number;
  last_success_at?: string;
  last_failure_at?: string;
  created_at: string;
  updated_at: string;
}

interface SnapshotExecution {
  id: number;
  config_id: number;
  execution_time: string;
  status: 'success' | 'failed' | 'running' | 'retrying';
  trigger_source: 'manual' | 'scheduled';
  retry_attempt: number;
  execution_data?: any;
  error_message?: string;
  execution_duration_ms?: number;
  created_at: string;
}

interface SnapshotStatistics {
  config: SnapshotConfig;
  last_execution?: SnapshotExecution;
  next_scheduled_run?: string;
  success_rate: number;
  average_duration_ms: number;
  total_executions: number;
  is_running: boolean;
}

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// ==================== PORTFOLIO SNAPSHOT SERVICE ====================

export class PortfolioSnapshotService {
  
  /**
   * Get scheduler configuration
   * GET /api/cruise-control/snapshots/config
   */
  static async getConfig(): Promise<ApiResponse<SnapshotConfig>> {
    try {
      const response = await apiService.get<ApiResponse<SnapshotConfig>>(
        API_ENDPOINTS.CRUISE_CONTROL.SNAPSHOTS.CONFIG
      );
      return response;
    } catch (error: any) {
      console.error('Failed to get snapshot config:', error);
      return {
        success: false,
        error: error.message || 'Failed to get configuration'
      };
    }
  }

  /**
   * Create scheduler configuration
   * POST /api/cruise-control/snapshots/config
   */
  static async createConfig(config: {
    schedule_type?: 'weekly' | 'monthly' | 'custom';
    cron_expression?: string;
    is_enabled?: boolean;
    max_retries?: number;
  }): Promise<ApiResponse<SnapshotConfig>> {
    try {
      const response = await apiService.post<ApiResponse<SnapshotConfig>>(
        API_ENDPOINTS.CRUISE_CONTROL.SNAPSHOTS.CONFIG,
        config
      );
      return response;
    } catch (error: any) {
      console.error('Failed to create snapshot config:', error);
      return {
        success: false,
        error: error.message || 'Failed to create configuration'
      };
    }
  }

  /**
   * Update scheduler configuration
   * PUT /api/cruise-control/snapshots/config
   */
  static async updateConfig(config: {
    schedule_type?: 'weekly' | 'monthly' | 'custom';
    cron_expression?: string;
    is_enabled?: boolean;
    max_retries?: number;
  }): Promise<ApiResponse<SnapshotConfig>> {
    try {
      const response = await apiService.put<ApiResponse<SnapshotConfig>>(
        API_ENDPOINTS.CRUISE_CONTROL.SNAPSHOTS.CONFIG,
        config
      );
      return response;
    } catch (error: any) {
      console.error('Failed to update snapshot config:', error);
      return {
        success: false,
        error: error.message || 'Failed to update configuration'
      };
    }
  }

  /**
   * Manually trigger snapshot generation
   * POST /api/cruise-control/snapshots/execute
   */
  static async triggerManual(): Promise<ApiResponse> {
    try {
      const response = await apiService.post<ApiResponse>(
        API_ENDPOINTS.CRUISE_CONTROL.SNAPSHOTS.EXECUTE,
        {}
      );
      return response;
    } catch (error: any) {
      console.error('Failed to trigger snapshot execution:', error);
      return {
        success: false,
        error: error.message || 'Failed to trigger execution'
      };
    }
  }

  /**
   * Get execution history
   * GET /api/cruise-control/snapshots/executions
   */
  static async getExecutions(
    page: number = 1,
    pageSize: number = 20
  ): Promise<ApiResponse<{
    executions: SnapshotExecution[];
    pagination: {
      page: number;
      page_size: number;
      total: number;
      total_pages: number;
    };
  }>> {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        page_size: pageSize.toString()
      });
      const url = `${API_ENDPOINTS.CRUISE_CONTROL.SNAPSHOTS.EXECUTIONS}?${params.toString()}`;
      const response = await apiService.get<any>(url);
      return response;
    } catch (error: any) {
      console.error('Failed to get executions:', error);
      return {
        success: false,
        error: error.message || 'Failed to get execution history'
      };
    }
  }

  /**
   * Get scheduler statistics
   * GET /api/cruise-control/snapshots/statistics
   */
  static async getStatistics(): Promise<ApiResponse<SnapshotStatistics>> {
    try {
      const response = await apiService.get<ApiResponse<SnapshotStatistics>>(
        API_ENDPOINTS.CRUISE_CONTROL.SNAPSHOTS.STATISTICS
      );
      return response;
    } catch (error: any) {
      console.error('Failed to get statistics:', error);
      return {
        success: false,
        error: error.message || 'Failed to get statistics'
      };
    }
  }

  /**
   * Smart backfill - auto-detects date range
   * POST /api/cruise-control/snapshots/backfill-smart
   * @param nonSchemeOnly - When true, only generates non-scheme (GOLD, FD, etc.) snapshots, preserving MF data
   */
  static async smartBackfill(customerIds?: number[], nonSchemeOnly?: boolean): Promise<ApiResponse> {
    try {
      const body: Record<string, any> = {};
      if (customerIds) body.customer_ids = customerIds;
      if (nonSchemeOnly) body.non_scheme_only = true;
      const response = await apiService.post<ApiResponse>(
        API_ENDPOINTS.CRUISE_CONTROL.SNAPSHOTS.BACKFILL_SMART,
        body
      );
      return response;
    } catch (error: any) {
      console.error('Failed to perform smart backfill:', error);
      return {
        success: false,
        error: error.message || 'Failed to perform smart backfill'
      };
    }
  }

  /**
   * Manual backfill with date range
   * POST /api/cruise-control/snapshots/backfill
   */
  static async backfill(
    startMonth: string,
    endMonth: string,
    customerIds?: number[]
  ): Promise<ApiResponse> {
    try {
      const response = await apiService.post<ApiResponse>(
        API_ENDPOINTS.CRUISE_CONTROL.SNAPSHOTS.BACKFILL,
        {
          start_month: startMonth,
          end_month: endMonth,
          customer_ids: customerIds
        }
      );
      return response;
    } catch (error: any) {
      console.error('Failed to perform backfill:', error);
      return {
        success: false,
        error: error.message || 'Failed to perform backfill'
      };
    }
  }

  /**
   * Health check
   * GET /api/cruise-control/snapshots/health
   */
  static async healthCheck(): Promise<ApiResponse> {
    try {
      const response = await apiService.get<ApiResponse>(
        API_ENDPOINTS.CRUISE_CONTROL.SNAPSHOTS.HEALTH
      );
      return response;
    } catch (error: any) {
      console.error('Failed to check health:', error);
      return {
        success: false,
        error: error.message || 'Health check failed'
      };
    }
  }

  // ==================== NEW OPERATION METHODS ====================

  /**
   * Drop all snapshots (DANGEROUS)
   * POST /api/cruise-control/snapshots/operations/drop-all
   */
  static async dropAllSnapshots(customerIds?: number[]): Promise<ApiResponse<{
    deleted_count: number;
    execution_duration_ms: number;
    message: string;
  }>> {
    try {
      const response = await apiService.post<any>(
        API_ENDPOINTS.PORTFOLIO_SNAPSHOTS.OPERATIONS.DROP_ALL,
        customerIds ? { customer_ids: customerIds } : {}
      );
      return response;
    } catch (error: any) {
      console.error('Failed to drop all snapshots:', error);
      return {
        success: false,
        error: error.message || 'Failed to drop snapshots'
      };
    }
  }

  /**
   * Generate only missing snapshots (SAFE)
   * POST /api/cruise-control/snapshots/operations/generate-missing
   */
  static async generateMissingSnapshots(customerIds?: number[]): Promise<ApiResponse<{
    message: string;
    status: string;
  }>> {
    try {
      const response = await apiService.post<any>(
        API_ENDPOINTS.PORTFOLIO_SNAPSHOTS.OPERATIONS.GENERATE_MISSING,
        customerIds ? { customer_ids: customerIds } : {}
      );
      return response;
    } catch (error: any) {
      console.error('Failed to generate missing snapshots:', error);
      return {
        success: false,
        error: error.message || 'Failed to generate missing snapshots'
      };
    }
  }

  /**
   * Update all snapshots (CREATE + UPDATE)
   * POST /api/cruise-control/snapshots/operations/update-all
   */
  static async updateAllSnapshots(customerIds?: number[]): Promise<ApiResponse<{
    message: string;
    status: string;
  }>> {
    try {
      const response = await apiService.post<any>(
        API_ENDPOINTS.PORTFOLIO_SNAPSHOTS.OPERATIONS.UPDATE_ALL,
        customerIds ? { customer_ids: customerIds } : {}
      );
      return response;
    } catch (error: any) {
      console.error('Failed to update all snapshots:', error);
      return {
        success: false,
        error: error.message || 'Failed to update all snapshots'
      };
    }
  }

  /**
   * Regenerate all snapshots (DROP + CREATE - VERY DANGEROUS)
   * POST /api/cruise-control/snapshots/operations/regenerate-all
   */
  static async regenerateAllSnapshots(customerIds?: number[]): Promise<ApiResponse<{
    message: string;
    status: string;
  }>> {
    try {
      const response = await apiService.post<any>(
        API_ENDPOINTS.PORTFOLIO_SNAPSHOTS.OPERATIONS.REGENERATE_ALL,
        customerIds ? { customer_ids: customerIds } : {}
      );
      return response;
    } catch (error: any) {
      console.error('Failed to regenerate all snapshots:', error);
      return {
        success: false,
        error: error.message || 'Failed to regenerate all snapshots'
      };
    }
  }

  /**
   * Get snapshot status for a specific customer
   * GET /api/cruise-control/snapshots/customer/:customerId/status
   */
  static async getCustomerSnapshotStatus(customerId: number): Promise<ApiResponse<{
    customer_id: number;
    latest_snapshot_date: string | null;
    last_generated_at: string | null;
    total_snapshots: number;
    earliest_snapshot_date: string | null;
    has_snapshots: boolean;
  }>> {
    try {
      const response = await apiService.get<any>(
        API_ENDPOINTS.PORTFOLIO_SNAPSHOTS.CUSTOMER_STATUS(customerId)
      );
      return response;
    } catch (error: any) {
      console.error('Failed to get customer snapshot status:', error);
      return {
        success: false,
        error: error.message || 'Failed to get customer snapshot status'
      };
    }
  }
}

// Export default for convenience
export default PortfolioSnapshotService;