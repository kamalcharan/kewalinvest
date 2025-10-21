// frontend/src/services/schemeAnalysis.service.ts
// FIXED: Correct SchemeReadiness structure and constants

import { apiService } from './api.service';
import { FrontendErrorLogger } from './errorLogger.service';
import type {
  SchemeMetricsResponse,
  MetricsCalculationRequest,
  MetricsCalculationResponse,
  BulkMetricsRequest,
  BulkMetricsResult,
  SchemeReadiness,
  SchemeBookmark,
} from '../types/nav.types';
import { METRICS_CONSTANTS } from '../types/nav.types';

/**
 * SchemeAnalysisService
 * Handles all scheme analysis and metrics calculation operations
 */
export class SchemeAnalysisService {
  private static readonly BASE_PATH = '/api/nav/scheme-analysis';

  /**
   * Get latest calculated metrics for a scheme
   */
  static async getSchemeMetrics(
    schemeId: number,
    date?: string,
    environment: 'live' | 'test' = 'live'
  ): Promise<SchemeMetricsResponse> {
    try {
      FrontendErrorLogger.info(
        'Fetching scheme metrics',
        'SchemeAnalysisService.getSchemeMetrics',
        { schemeId, date, environment }
      );

      const url = `${this.BASE_PATH}/metrics/${schemeId}`;
      const params: Record<string, string> = { environment };
      
      if (date) {
        params.date = date;
      }

      const response = await apiService.get<SchemeMetricsResponse>(url, { params });

      if (!response || !response.success) {
        throw new Error('Failed to fetch scheme metrics');
      }

      FrontendErrorLogger.info(
        'Successfully fetched scheme metrics',
        'SchemeAnalysisService.getSchemeMetrics',
        {
          schemeId,
          date: response.date,
          executionTime: response.execution_time_ms,
        }
      );

      return response;

    } catch (error: any) {
      if (error.response?.status === 404) {
        FrontendErrorLogger.info(
          'No metrics found for scheme',
          'SchemeAnalysisService.getSchemeMetrics',
          { schemeId, date, statusCode: 404 }
        );
        
        throw new Error(`No calculated metrics found for scheme ${schemeId}`);
      }

      FrontendErrorLogger.error(
        'Failed to fetch scheme metrics',
        'SchemeAnalysisService.getSchemeMetrics',
        {
          schemeId,
          date,
          error: error.message,
          statusCode: error.response?.status,
        },
        error.stack
      );

      throw new Error(
        error.response?.data?.error || 
        error.message || 
        'Failed to fetch scheme metrics'
      );
    }
  }

  /**
   * Calculate metrics for a single scheme
   */
  static async calculateMetrics(
    schemeId: number,
    options?: MetricsCalculationRequest
  ): Promise<MetricsCalculationResponse> {
    try {
      FrontendErrorLogger.info(
        'Triggering metrics calculation',
        'SchemeAnalysisService.calculateMetrics',
        { schemeId, options }
      );

      const url = `${this.BASE_PATH}/calculate-metrics/${schemeId}`;
      const body = options || {};

      const response = await apiService.post<MetricsCalculationResponse>(url, body);

      if (!response || !response.success) {
        throw new Error('Failed to calculate metrics');
      }

      FrontendErrorLogger.info(
        'Successfully calculated metrics',
        'SchemeAnalysisService.calculateMetrics',
        {
          schemeId,
          date: response.date,
          calculationTime: response.calculation_time_ms,
        }
      );

      return response;

    } catch (error: any) {
      if (error.response?.status === 404) {
        FrontendErrorLogger.error(
          'Scheme not found for metrics calculation',
          'SchemeAnalysisService.calculateMetrics',
          { schemeId, statusCode: 404 }
        );
        
        throw new Error(`Scheme ${schemeId} not found`);
      }

      if (error.response?.status === 400) {
        FrontendErrorLogger.error(
          'Invalid request for metrics calculation',
          'SchemeAnalysisService.calculateMetrics',
          {
            schemeId,
            options,
            statusCode: 400,
            error: error.response?.data?.error,
          }
        );
        
        throw new Error(
          error.response?.data?.error || 
          'Invalid calculation request'
        );
      }

      FrontendErrorLogger.error(
        'Failed to calculate metrics',
        'SchemeAnalysisService.calculateMetrics',
        {
          schemeId,
          options,
          error: error.message,
          statusCode: error.response?.status,
        },
        error.stack
      );

      throw new Error(
        error.response?.data?.error || 
        error.message || 
        'Failed to calculate metrics'
      );
    }
  }

  /**
   * Batch calculate metrics for multiple schemes
   */
  static async batchCalculateMetrics(
    request: BulkMetricsRequest
  ): Promise<BulkMetricsResult> {
    try {
      FrontendErrorLogger.info(
        'Triggering bulk metrics calculation',
        'SchemeAnalysisService.batchCalculateMetrics',
        {
          totalSchemes: request.scheme_ids.length,
          batchSize: request.batch_size,
          delayMs: request.delay_ms,
        }
      );

      const url = `${this.BASE_PATH}/batch-calculate`;
      const body = request;

      const response = await apiService.post<BulkMetricsResult>(url, body);

      if (!response || !response.success) {
        throw new Error('Bulk calculation failed');
      }

      FrontendErrorLogger.info(
        'Bulk metrics calculation completed',
        'SchemeAnalysisService.batchCalculateMetrics',
        {
          totalSchemes: response.total_schemes,
          successful: response.successful,
          failed: response.failed,
          successRate: response.success_rate,
          executionTimeMinutes: response.execution_time_minutes,
        }
      );

      return response;

    } catch (error: any) {
      if (error.response?.status === 403) {
        FrontendErrorLogger.error(
          'Admin access required for bulk calculation',
          'SchemeAnalysisService.batchCalculateMetrics',
          { statusCode: 403 }
        );
        
        throw new Error('Admin access required for bulk metrics calculation');
      }

      if (error.response?.status === 400) {
        FrontendErrorLogger.error(
          'Invalid bulk calculation request',
          'SchemeAnalysisService.batchCalculateMetrics',
          {
            request,
            statusCode: 400,
            error: error.response?.data?.error,
          }
        );
        
        throw new Error(
          error.response?.data?.error || 
          'Invalid bulk calculation request'
        );
      }

      FrontendErrorLogger.error(
        'Bulk metrics calculation failed',
        'SchemeAnalysisService.batchCalculateMetrics',
        {
          totalSchemes: request.scheme_ids.length,
          error: error.message,
          statusCode: error.response?.status,
        },
        error.stack
      );

      throw new Error(
        error.response?.data?.error || 
        error.message || 
        'Bulk metrics calculation failed'
      );
    }
  }

  /**
   * Validate if a scheme is ready for metrics calculation
   * FIXED: Returns full SchemeReadiness object with scheme info
   * 
   * @param bookmark - Scheme bookmark with all info
   * @returns Complete SchemeReadiness object
   */
  static validateSchemeReadiness(bookmark: SchemeBookmark): SchemeReadiness {
    const navRecordsCount = bookmark.nav_records_count || 0;

    // FIXED: Return full SchemeReadiness structure
    if (navRecordsCount === 0) {
      return {
        scheme_id: bookmark.scheme_id,
        scheme_code: bookmark.scheme_code,
        scheme_name: bookmark.scheme_name,
        nav_records_count: navRecordsCount,
        status: 'no_data',
        message: 'No NAV data available. Download historical data first.',
      };
    }

    // FIXED: Use RECOMMENDED_MIN_RECORDS instead of MIN_NAV_RECORDS
    if (navRecordsCount < METRICS_CONSTANTS.RECOMMENDED_MIN_RECORDS) {
      return {
        scheme_id: bookmark.scheme_id,
        scheme_code: bookmark.scheme_code,
        scheme_name: bookmark.scheme_name,
        nav_records_count: navRecordsCount,
        status: 'partial',
        message: `Limited data (${navRecordsCount} records). Need at least ${METRICS_CONSTANTS.RECOMMENDED_MIN_RECORDS} for all metrics.`,
      };
    }

    // FIXED: Status can only be 'ready', 'partial', or 'no_data'
    return {
      scheme_id: bookmark.scheme_id,
      scheme_code: bookmark.scheme_code,
      scheme_name: bookmark.scheme_name,
      nav_records_count: navRecordsCount,
      status: 'ready',
      message: `Scheme has sufficient data (${navRecordsCount} records) for metrics calculation.`,
    };
  }

  /**
   * Check if metrics are stale
   * FIXED: Use hours instead of days
   */
  static isMetricsStale(metricsCalculatedAt: string): boolean {
    try {
      const calculatedDate = new Date(metricsCalculatedAt);
      const now = new Date();
      const hoursDiff = (now.getTime() - calculatedDate.getTime()) / (1000 * 60 * 60);

      // FIXED: Use STALE_THRESHOLD_HOURS instead of STALE_THRESHOLD_DAYS
      return hoursDiff > METRICS_CONSTANTS.STALE_THRESHOLD_HOURS;
    } catch (error) {
      FrontendErrorLogger.error(
        'Failed to parse metrics calculated date',
        'SchemeAnalysisService.isMetricsStale',
        { metricsCalculatedAt }
      );
      return true;
    }
  }

  /**
   * Get metrics age in days
   */
  static getMetricsAge(metricsCalculatedAt: string): number {
    try {
      const calculatedDate = new Date(metricsCalculatedAt);
      const now = new Date();
      const daysDiff = (now.getTime() - calculatedDate.getTime()) / (1000 * 60 * 60 * 24);

      return Math.floor(daysDiff);
    } catch (error) {
      FrontendErrorLogger.error(
        'Failed to parse metrics calculated date',
        'SchemeAnalysisService.getMetricsAge',
        { metricsCalculatedAt }
      );
      return -1;
    }
  }

  /**
   * Format metrics age for display
   */
  static formatMetricsAge(metricsCalculatedAt: string): string {
    const age = this.getMetricsAge(metricsCalculatedAt);

    if (age < 0) return 'Unknown age';
    if (age === 0) return 'Today';
    if (age === 1) return '1 day ago';
    if (age < 7) return `${age} days ago`;
    if (age < 30) {
      const weeks = Math.floor(age / 7);
      return weeks === 1 ? '1 week ago' : `${weeks} weeks ago`;
    }
    if (age < 365) {
      const months = Math.floor(age / 30);
      return months === 1 ? '1 month ago' : `${months} months ago`;
    }
    const years = Math.floor(age / 365);
    return years === 1 ? '1 year ago' : `${years} years ago`;
  }

  /**
   * Format date
   */
  static formatMetricsDate(date: string): string {
    try {
      const dateObj = new Date(date);
      return dateObj.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    } catch (error) {
      FrontendErrorLogger.error(
        'Failed to format metrics date',
        'SchemeAnalysisService.formatMetricsDate',
        { date }
      );
      return date;
    }
  }

  /**
   * Calculate success rate percentage
   */
  static calculateSuccessRate(successful: number, total: number): string {
    if (total === 0) return '0.0%';
    return ((successful / total) * 100).toFixed(1) + '%';
  }

  /**
   * Categorize schemes by readiness
   * FIXED: Returns SchemeReadiness objects, not bookmarks
   */
  static categorizeSchemes(bookmarks: SchemeBookmark[]): {
    ready: SchemeReadiness[];
    partial: SchemeReadiness[];
    noData: SchemeReadiness[];
  } {
    const ready: SchemeReadiness[] = [];
    const partial: SchemeReadiness[] = [];
    const noData: SchemeReadiness[] = [];

    bookmarks.forEach(bookmark => {
      const readiness = this.validateSchemeReadiness(bookmark);
      
      // FIXED: Only valid statuses: 'ready', 'partial', 'no_data'
      if (readiness.status === 'no_data') {
        noData.push(readiness);
      } else if (readiness.status === 'partial') {
        partial.push(readiness);
      } else {
        ready.push(readiness);
      }
    });

    return { ready, partial, noData };
  }
}

export const schemeAnalysisService = SchemeAnalysisService;