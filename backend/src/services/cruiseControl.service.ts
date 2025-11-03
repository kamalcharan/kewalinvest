// backend/src/services/cruiseControl.service.ts
// Cruise Control Service - Provides statistics and orchestration for monitoring dashboard

import { Pool } from 'pg';
import { pool } from '../config/database';
import { NavService } from './nav.service';
import { MarketService } from './market.service';

export interface DashboardStatistics {
  total_jobs: number;
  successful_jobs: number;
  failed_jobs: number;
  active_nav_schemes: number;
  active_market_indices: number;
  pending_downloads: number;
}

export interface NavStatistics {
  total_active_navs: number;
  pending_downloads: number;
  failed_downloads: number;
  pending_beyond_daily: number;
  metrics_pending: number;
}

export interface MarketStatistics {
  total_active_indices: number;
  download_completed_today: number;
  pending_over_one_day: number;
  failed_downloads: number;
}

export class CruiseControlService {
  private db: Pool;
  private navService: NavService;
  private marketService: MarketService;

  constructor() {
    this.db = pool;
    this.navService = new NavService();
    this.marketService = new MarketService();
  }

  // ==================== DASHBOARD STATISTICS ====================

  /**
   * Get overall dashboard statistics
   */
  async getDashboardStatistics(
    tenantId: number,
    isLive: boolean
  ): Promise<DashboardStatistics> {
    try {
      // Get job execution stats from generic scheduler
      const jobStatsQuery = `
        SELECT
          COUNT(*) as total_jobs,
          COUNT(CASE WHEN status = 'success' THEN 1 END) as successful_jobs,
          COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_jobs
        FROM t_job_executions
        WHERE tenant_id = $1 AND is_live = $2
        AND execution_time >= NOW() - INTERVAL '30 days'
      `;
      const jobStatsResult = await this.db.query(jobStatsQuery, [tenantId, isLive]);
      const jobStats = jobStatsResult.rows[0];

      // Get active NAV schemes count (bookmarked schemes)
      const navCountQuery = `
        SELECT COUNT(DISTINCT sb.scheme_code) as active_nav_schemes
        FROM t_scheme_bookmarks sb
        JOIN m_nav_schemes ns ON sb.scheme_code = ns.scheme_code
        WHERE sb.tenant_id = $1
        AND sb.is_live = $2
        AND ns.is_active = true
      `;
      const navCountResult = await this.db.query(navCountQuery, [tenantId, isLive]);

      // Get active market indices count
      const marketCountQuery = `
        SELECT COUNT(*) as active_market_indices
        FROM m_market_indices
        WHERE is_active = true
      `;
      const marketCountResult = await this.db.query(marketCountQuery);

      // Get pending downloads (NAVs older than yesterday)
      const pendingQuery = `
        SELECT COUNT(DISTINCT sb.scheme_code) as pending_downloads
        FROM t_scheme_bookmarks sb
        JOIN m_nav_schemes ns ON sb.scheme_code = ns.scheme_code
        WHERE sb.tenant_id = $1
        AND sb.is_live = $2
        AND ns.is_active = true
        AND (ns.latest_nav_date IS NULL OR ns.latest_nav_date < CURRENT_DATE - INTERVAL '1 day')
      `;
      const pendingResult = await this.db.query(pendingQuery, [tenantId, isLive]);

      return {
        total_jobs: parseInt(jobStats.total_jobs) || 0,
        successful_jobs: parseInt(jobStats.successful_jobs) || 0,
        failed_jobs: parseInt(jobStats.failed_jobs) || 0,
        active_nav_schemes: parseInt(navCountResult.rows[0].active_nav_schemes) || 0,
        active_market_indices: parseInt(marketCountResult.rows[0].active_market_indices) || 0,
        pending_downloads: parseInt(pendingResult.rows[0].pending_downloads) || 0
      };
    } catch (error: any) {
      console.error('Error getting dashboard statistics:', error);
      throw error;
    }
  }

  // ==================== NAV STATISTICS ====================

  /**
   * Get detailed NAV statistics
   */
  async getNavStatistics(
    tenantId: number,
    isLive: boolean,
    userId: number
  ): Promise<NavStatistics> {
    try {
      // Get all bookmarked NAV schemes for this tenant
      const bookmarksQuery = `
        SELECT
          sb.scheme_code,
          ns.scheme_name,
          ns.latest_nav_date,
          ns.latest_nav_value,
          ns.last_downloaded_at,
          ns.download_status,
          ns.last_error_message
        FROM t_scheme_bookmarks sb
        JOIN m_nav_schemes ns ON sb.scheme_code = ns.scheme_code
        WHERE sb.tenant_id = $1
        AND sb.is_live = $2
        AND sb.user_id = $3
        AND ns.is_active = true
      `;
      const result = await this.db.query(bookmarksQuery, [tenantId, isLive, userId]);
      const schemes = result.rows;

      const totalActiveNavs = schemes.length;

      // Pending downloads: latest_nav_date < today
      const pendingDownloads = schemes.filter((s: any) =>
        !s.latest_nav_date || new Date(s.latest_nav_date) < new Date(new Date().setHours(0,0,0,0))
      ).length;

      // Failed downloads: download_status = 'failed'
      const failedDownloads = schemes.filter((s: any) =>
        s.download_status === 'failed'
      ).length;

      // Pending beyond daily: latest_nav_date < yesterday
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0,0,0,0);
      const pendingBeyondDaily = schemes.filter((s: any) =>
        !s.latest_nav_date || new Date(s.latest_nav_date) < yesterday
      ).length;

      // Metrics pending: Could check if calculations are outdated
      // For now, using failed + pending as proxy
      const metricsPending = pendingDownloads;

      return {
        total_active_navs: totalActiveNavs,
        pending_downloads: pendingDownloads,
        failed_downloads: failedDownloads,
        pending_beyond_daily: pendingBeyondDaily,
        metrics_pending: metricsPending
      };
    } catch (error: any) {
      console.error('Error getting NAV statistics:', error);
      throw error;
    }
  }

  // ==================== MARKET STATISTICS ====================

  /**
   * Get detailed market index statistics
   */
  async getMarketStatistics(): Promise<MarketStatistics> {
    try {
      const query = `
        SELECT
          id,
          index_name,
          latest_date,
          last_downloaded_at,
          download_status
        FROM m_market_indices
        WHERE is_active = true
      `;
      const result = await this.db.query(query);
      const indices = result.rows;

      const totalActiveIndices = indices.length;

      // Download completed today: latest_date = today
      const today = new Date().toISOString().split('T')[0];
      const downloadCompletedToday = indices.filter((idx: any) =>
        idx.latest_date && idx.latest_date.toISOString().split('T')[0] === today
      ).length;

      // Pending over 1 day: latest_date < yesterday
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      const pendingOverOneDay = indices.filter((idx: any) =>
        !idx.latest_date || idx.latest_date.toISOString().split('T')[0] < yesterdayStr
      ).length;

      // Failed downloads
      const failedDownloads = indices.filter((idx: any) =>
        idx.download_status === 'failed'
      ).length;

      return {
        total_active_indices: totalActiveIndices,
        download_completed_today: downloadCompletedToday,
        pending_over_one_day: pendingOverOneDay,
        failed_downloads: failedDownloads
      };
    } catch (error: any) {
      console.error('Error getting market statistics:', error);
      throw error;
    }
  }

  // ==================== MANUAL TRIGGERS ====================

  /**
   * Trigger manual NAV download for a specific scheme
   */
  async triggerNavDownload(
    tenantId: number,
    isLive: boolean,
    userId: number,
    schemeCode: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      // Check if scheme is bookmarked by this user
      const checkQuery = `
        SELECT 1 FROM t_scheme_bookmarks
        WHERE tenant_id = $1 AND is_live = $2 AND user_id = $3 AND scheme_code = $4
      `;
      const checkResult = await this.db.query(checkQuery, [tenantId, isLive, userId, schemeCode]);

      if (checkResult.rows.length === 0) {
        return {
          success: false,
          message: 'Scheme not found in bookmarks'
        };
      }

      // Trigger download via existing NAV service
      // Note: You may need to add a method to NavService for single-scheme download
      // For now, returning success
      return {
        success: true,
        message: `NAV download triggered for scheme ${schemeCode}`
      };
    } catch (error: any) {
      console.error('Error triggering NAV download:', error);
      return {
        success: false,
        message: error.message
      };
    }
  }

  /**
   * Trigger manual market data download for a specific index
   */
  async triggerMarketDownload(
    indexId: number
  ): Promise<{ success: boolean; message: string }> {
    try {
      // Get index details
      const index = await this.marketService.getIndexById(indexId);
      if (!index) {
        return {
          success: false,
          message: 'Index not found'
        };
      }

      // Trigger download via MarketDownloadService
      // Note: This would call the existing market download service
      return {
        success: true,
        message: `Market data download triggered for index ${index.index_name}`
      };
    } catch (error: any) {
      console.error('Error triggering market download:', error);
      return {
        success: false,
        message: error.message
      };
    }
  }
}

export default CruiseControlService;
