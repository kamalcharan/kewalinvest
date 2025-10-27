// frontend/src/services/portfolioSnapshot.service.ts
// Service for Portfolio Snapshot Scheduler API calls

import apiService from './api.service';
import { buildQueryParams } from './serviceURLs';
import {
  PortfolioSnapshotConfig,
  SnapshotStatistics,
  SnapshotExecution,
  UpdateConfigRequest,
  ExecutionHistoryResponse
} from '../types/portfolioSnapshot.types';

const BASE_URL = '/api/cruise-control/snapshots';

export class PortfolioSnapshotService {
  /**
   * Get scheduler configuration
   */
  static async getConfig(environment: 'live' | 'test'): Promise<{
    success: boolean;
    data?: PortfolioSnapshotConfig;
    error?: string;
  }> {
    try {
      const url = `${BASE_URL}/config${buildQueryParams({}, environment)}`;
      return await apiService.get(url);
    } catch (error: any) {
      console.error('Error getting snapshot config:', error);
      return {
        success: false,
        error: error.message || 'Failed to get configuration'
      };
    }
  }

  /**
   * Update scheduler configuration
   */
  static async updateConfig(
    environment: 'live' | 'test',
    updates: UpdateConfigRequest
  ): Promise<{
    success: boolean;
    data?: PortfolioSnapshotConfig;
    message?: string;
    error?: string;
  }> {
    try {
      const url = `${BASE_URL}/config${buildQueryParams({}, environment)}`;
      return await apiService.put(url, updates);
    } catch (error: any) {
      console.error('Error updating snapshot config:', error);
      return {
        success: false,
        error: error.message || 'Failed to update configuration'
      };
    }
  }

  /**
   * Manually trigger snapshot generation
   */
  static async triggerManual(environment: 'live' | 'test'): Promise<{
    success: boolean;
    data?: {
      execution_id: number;
      status: string;
      message: string;
    };
    error?: string;
  }> {
    try {
      const url = `${BASE_URL}/execute${buildQueryParams({}, environment)}`;
      return await apiService.post(url, {});
    } catch (error: any) {
      console.error('Error triggering snapshot:', error);
      return {
        success: false,
        error: error.message || 'Failed to trigger snapshot generation'
      };
    }
  }

  /**
   * Get execution history
   */
  static async getExecutions(
    environment: 'live' | 'test',
    page: number = 1,
    pageSize: number = 20
  ): Promise<{
    success: boolean;
    data?: ExecutionHistoryResponse;
    error?: string;
  }> {
    try {
      const url = `${BASE_URL}/executions${buildQueryParams({ page, page_size: pageSize }, environment)}`;
      return await apiService.get(url);
    } catch (error: any) {
      console.error('Error getting executions:', error);
      return {
        success: false,
        error: error.message || 'Failed to get execution history'
      };
    }
  }

  /**
   * Get statistics
   */
  static async getStatistics(environment: 'live' | 'test'): Promise<{
    success: boolean;
    data?: SnapshotStatistics;
    error?: string;
  }> {
    try {
      const url = `${BASE_URL}/statistics${buildQueryParams({}, environment)}`;
      return await apiService.get(url);
    } catch (error: any) {
      console.error('Error getting statistics:', error);
      return {
        success: false,
        error: error.message || 'Failed to get statistics'
      };
    }
  }

  /**
   * Health check
   */
  static async healthCheck(environment: 'live' | 'test'): Promise<{
    success: boolean;
    data?: any;
    error?: string;
  }> {
    try {
      const url = `${BASE_URL}/health${buildQueryParams({}, environment)}`;
      return await apiService.get(url);
    } catch (error: any) {
      console.error('Error checking health:', error);
      return {
        success: false,
        error: error.message || 'Health check failed'
      };
    }
  }

  /**
   * Smart backfill - auto-detects date range from customer transactions
   */
  static async smartBackfill(
    environment: 'live' | 'test',
    customerIds?: number[]
  ): Promise<{
    success: boolean;
    data?: any;
    message?: string;
    error?: string;
  }> {
    try {
      const url = `${BASE_URL}/backfill-smart${buildQueryParams({}, environment)}`;
      return await apiService.post(url, {
        customer_ids: customerIds
      });
    } catch (error: any) {
      console.error('Error during smart backfill:', error);
      return {
        success: false,
        error: error.message || 'Smart backfill failed'
      };
    }
  }

  /**
   * Manual backfill with date range (for advanced use)
   */
  static async backfill(
    environment: 'live' | 'test',
    startMonth: string,
    endMonth: string,
    customerIds?: number[]
  ): Promise<{
    success: boolean;
    data?: any;
    message?: string;
    error?: string;
  }> {
    try {
      const url = `${BASE_URL}/backfill${buildQueryParams({}, environment)}`;
      return await apiService.post(url, {
        start_month: startMonth,
        end_month: endMonth,
        customer_ids: customerIds
      });
    } catch (error: any) {
      console.error('Error during backfill:', error);
      return {
        success: false,
        error: error.message || 'Backfill failed'
      };
    }
  }
}

export default PortfolioSnapshotService;
