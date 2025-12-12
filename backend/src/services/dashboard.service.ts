// backend/src/services/dashboard.service.ts
// Dashboard service for main IFA/RIA dashboard

import { Pool } from 'pg';
import pool from '../config/database';
import { TransactionService } from './transaction.service';

const transactionService = new TransactionService();

interface DashboardSummary {
  totalAUM: number;
  aumChange: number; // MTD change percentage
  totalCustomers: number;
  activeCustomers: number;
  familyCount: number;
}

interface DownloadStatus {
  navDownloads: {
    success: number;
    failed: number;
    pending: number;
    lastRun: string | null;
  };
  marketDownloads: {
    success: number;
    failed: number;
    pending: number;
    lastRun: string | null;
  };
}

interface GoalsSummary {
  totalGoals: number;
  onTrack: number;
  needsAttention: number;
  offTrack: number;
  lastCalculatedAt: string | null;
  totalTargetValue: number;
  currentValue: number;
}

interface PendingAction {
  id: number;
  customerId: number;
  customerName: string;
  type: string;
  title: string;
  description: string;
  amount?: number;
  dueDate: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
}

export class DashboardService {
  private db: Pool;

  constructor() {
    this.db = pool;
  }

  /**
   * Get dashboard summary stats
   */
  async getSummary(tenantId: number, isLive: boolean): Promise<DashboardSummary> {
    try {
      console.log('[DashboardService] getSummary called with tenantId:', tenantId, 'isLive:', isLive);

      // Get customer stats
      const customerQuery = `
        SELECT
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE is_active = true) as active,
          COUNT(DISTINCT family_head_iwell_code) FILTER (
            WHERE family_head_iwell_code IS NOT NULL AND family_head_iwell_code != ''
          ) as family_count
        FROM t_customers
        WHERE tenant_id = $1 AND is_live = $2
      `;
      const customerResult = await this.db.query(customerQuery, [tenantId, isLive]);
      const customerStats = customerResult.rows[0];
      console.log('[DashboardService] Customer stats result:', customerStats);

      // Get AUM from latest portfolio snapshot
      const aumQuery = `
        SELECT
          COALESCE(SUM(ps.total_value), 0) as total_aum
        FROM t_portfolio_snapshots ps
        WHERE ps.tenant_id = $1
          AND ps.is_live = $2
          AND ps.snapshot_date = (
            SELECT MAX(snapshot_date)
            FROM t_portfolio_snapshots
            WHERE tenant_id = $1 AND is_live = $2
          )
      `;
      const aumResult = await this.db.query(aumQuery, [tenantId, isLive]);
      const totalAUM = parseFloat(aumResult.rows[0]?.total_aum || 0);
      console.log('[DashboardService] AUM result:', aumResult.rows[0], 'parsed totalAUM:', totalAUM);

      // Get MTD AUM change (compare with first day of month)
      const mtdQuery = `
        WITH current_aum AS (
          SELECT COALESCE(SUM(total_value), 0) as value
          FROM t_portfolio_snapshots
          WHERE tenant_id = $1 AND is_live = $2
            AND snapshot_date = (SELECT MAX(snapshot_date) FROM t_portfolio_snapshots WHERE tenant_id = $1 AND is_live = $2)
        ),
        month_start_aum AS (
          SELECT COALESCE(SUM(total_value), 0) as value
          FROM t_portfolio_snapshots
          WHERE tenant_id = $1 AND is_live = $2
            AND snapshot_date = (
              SELECT MIN(snapshot_date)
              FROM t_portfolio_snapshots
              WHERE tenant_id = $1 AND is_live = $2
                AND snapshot_date >= DATE_TRUNC('month', CURRENT_DATE)
            )
        )
        SELECT
          c.value as current_value,
          m.value as month_start_value,
          CASE
            WHEN m.value > 0 THEN ((c.value - m.value) / m.value * 100)
            ELSE 0
          END as mtd_change
        FROM current_aum c, month_start_aum m
      `;
      const mtdResult = await this.db.query(mtdQuery, [tenantId, isLive]);
      const aumChange = parseFloat(mtdResult.rows[0]?.mtd_change || 0);

      return {
        totalAUM,
        aumChange: Math.round(aumChange * 100) / 100,
        totalCustomers: parseInt(customerStats.total || 0),
        activeCustomers: parseInt(customerStats.active || 0),
        familyCount: parseInt(customerStats.family_count || 0)
      };
    } catch (error: any) {
      // If tables/columns don't exist, return empty data
      if (error.code === '42P01' || error.code === '42703') {
        console.log('Summary tables/columns do not exist yet, returning empty data');
        return {
          totalAUM: 0,
          aumChange: 0,
          totalCustomers: 0,
          activeCustomers: 0,
          familyCount: 0
        };
      }
      console.error('Error getting dashboard summary:', error);
      throw error;
    }
  }

  /**
   * Get download status for yesterday (downloads run after office hours)
   */
  async getDownloadStatus(tenantId: number, isLive: boolean): Promise<DownloadStatus> {
    try {
      // Use yesterday's date since downloads run after office hours (evening/night)
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);

      // NAV Downloads - from scheme bookmarks
      const navQuery = `
        SELECT
          COUNT(*) FILTER (WHERE sd.last_nav_download_status = 'success' AND sd.last_nav_download_date >= $3) as success,
          COUNT(*) FILTER (WHERE sd.last_nav_download_status = 'failed' AND sd.last_nav_download_date >= $3) as failed,
          COUNT(*) FILTER (WHERE sb.daily_download_enabled = true AND (sd.last_nav_download_date IS NULL OR sd.last_nav_download_date < $3)) as pending,
          MAX(sd.last_nav_download_date) as last_run
        FROM t_scheme_bookmarks sb
        JOIN t_scheme_details sd ON sd.id = sb.scheme_id
        WHERE sb.tenant_id = $1 AND sb.is_live = $2 AND sb.is_active = true
      `;
      const navResult = await this.db.query(navQuery, [tenantId, isLive, yesterday]);
      const navStats = navResult.rows[0];

      // Market Downloads - from market indices config (global table, no tenant_id)
      const marketQuery = `
        SELECT
          COUNT(*) FILTER (WHERE last_download_status = 'success' AND last_download_at >= $1) as success,
          COUNT(*) FILTER (WHERE last_download_status = 'failed' AND last_download_at >= $1) as failed,
          COUNT(*) FILTER (WHERE is_active = true AND (last_download_at IS NULL OR last_download_at < $1)) as pending,
          MAX(last_download_at) as last_run
        FROM t_market_indices
        WHERE is_active = true
      `;
      const marketResult = await this.db.query(marketQuery, [yesterday]);
      const marketStats = marketResult.rows[0];

      return {
        navDownloads: {
          success: parseInt(navStats?.success || 0),
          failed: parseInt(navStats?.failed || 0),
          pending: parseInt(navStats?.pending || 0),
          lastRun: navStats?.last_run ? new Date(navStats.last_run).toISOString() : null
        },
        marketDownloads: {
          success: parseInt(marketStats?.success || 0),
          failed: parseInt(marketStats?.failed || 0),
          pending: parseInt(marketStats?.pending || 0),
          lastRun: marketStats?.last_run ? new Date(marketStats.last_run).toISOString() : null
        }
      };
    } catch (error: any) {
      // If tables don't exist or column doesn't exist, return empty data
      if (error.code === '42P01' || error.code === '42703') {
        console.log('Download status tables/columns do not exist yet, returning empty data');
        return {
          navDownloads: { success: 0, failed: 0, pending: 0, lastRun: null },
          marketDownloads: { success: 0, failed: 0, pending: 0, lastRun: null }
        };
      }
      console.error('Error getting download status:', error);
      throw error;
    }
  }

  /**
   * Get goals summary across all customers
   */
  async getGoalsSummary(tenantId: number, isLive: boolean): Promise<GoalsSummary> {
    try {
      const query = `
        SELECT
          COUNT(*) as total_goals,
          COUNT(*) FILTER (WHERE progress_percentage >= 90) as on_track,
          COUNT(*) FILTER (WHERE progress_percentage >= 50 AND progress_percentage < 90) as needs_attention,
          COUNT(*) FILTER (WHERE progress_percentage < 50) as off_track,
          MAX(last_calculation_date) as last_calculated_at,
          COALESCE(SUM(target_amount), 0) as total_target_value,
          COALESCE(SUM(current_value), 0) as current_value
        FROM t_customer_goals
        WHERE tenant_id = $1 AND is_live = $2 AND is_active = true
      `;
      const result = await this.db.query(query, [tenantId, isLive]);
      const stats = result.rows[0];

      return {
        totalGoals: parseInt(stats?.total_goals || 0),
        onTrack: parseInt(stats?.on_track || 0),
        needsAttention: parseInt(stats?.needs_attention || 0),
        offTrack: parseInt(stats?.off_track || 0),
        lastCalculatedAt: stats?.last_calculated_at ? new Date(stats.last_calculated_at).toISOString() : null,
        totalTargetValue: parseFloat(stats?.total_target_value || 0),
        currentValue: parseFloat(stats?.current_value || 0)
      };
    } catch (error: any) {
      // If table/column doesn't exist, return empty data
      if (error.code === '42P01' || error.code === '42703') {
        console.log('Goals table/columns do not exist yet, returning empty data');
        return {
          totalGoals: 0,
          onTrack: 0,
          needsAttention: 0,
          offTrack: 0,
          lastCalculatedAt: null,
          totalTargetValue: 0,
          currentValue: 0
        };
      }
      console.error('Error getting goals summary:', error);
      throw error;
    }
  }

  /**
   * Get pending actions (upcoming JTBD alerts)
   */
  async getPendingActions(tenantId: number, isLive: boolean, limit: number = 10): Promise<{
    actions: PendingAction[];
    totalCount: number;
    criticalCount: number;
  }> {
    try {
      const query = `
        SELECT
          j.id,
          j.customer_id,
          c.name as customer_name,
          j.jtbd_type as type,
          j.title,
          j.description,
          j.amount,
          j.next_alert_date as due_date,
          j.priority,
          COUNT(*) OVER() as total_count,
          COUNT(*) FILTER (WHERE j.priority = 'critical') OVER() as critical_count
        FROM t_jtbd j
        JOIN t_customers cust ON cust.id = j.customer_id
        JOIN t_contacts c ON c.id = cust.contact_id
        WHERE j.tenant_id = $1
          AND j.is_live = $2
          AND j.is_active = true
          AND j.next_alert_date IS NOT NULL
          AND j.next_alert_date <= CURRENT_DATE + INTERVAL '30 days'
        ORDER BY
          CASE j.priority
            WHEN 'critical' THEN 1
            WHEN 'high' THEN 2
            WHEN 'medium' THEN 3
            ELSE 4
          END,
          j.next_alert_date ASC
        LIMIT $3
      `;

      const result = await this.db.query(query, [tenantId, isLive, limit]);

      const actions: PendingAction[] = result.rows.map(row => ({
        id: row.id,
        customerId: row.customer_id,
        customerName: row.customer_name,
        type: row.type,
        title: row.title,
        description: row.description || '',
        amount: row.amount ? parseFloat(row.amount) : undefined,
        dueDate: new Date(row.due_date).toISOString().split('T')[0],
        priority: row.priority
      }));

      return {
        actions,
        totalCount: parseInt(result.rows[0]?.total_count || 0),
        criticalCount: parseInt(result.rows[0]?.critical_count || 0)
      };
    } catch (error: any) {
      // If table/column doesn't exist, return empty data
      if (error.code === '42P01' || error.code === '42703') {
        console.log('JTBD table/columns do not exist yet, returning empty data');
        return {
          actions: [],
          totalCount: 0,
          criticalCount: 0
        };
      }
      console.error('Error getting pending actions:', error);
      throw error;
    }
  }

  /**
   * Get recent transactions (last 10 by default)
   * Uses existing TransactionService for consistency
   */
  async getRecentTransactions(tenantId: number, isLive: boolean, limit: number = 10): Promise<Array<{
    id: number;
    customerName: string;
    type: string;
    schemeName: string;
    amount: number;
    date: string;
  }>> {
    try {
      console.log('[DashboardService] getRecentTransactions called with tenantId:', tenantId, 'isLive:', isLive, 'limit:', limit);

      // Use existing TransactionService
      const result = await transactionService.getTransactions(tenantId, isLive, {
        page: 1,
        page_size: limit,
        sort_by: 'txn_date',
        sort_order: 'desc'
      });

      console.log('[DashboardService] TransactionService returned:', result.transactions.length, 'transactions, total:', result.pagination.total);

      const mapped = result.transactions.map((txn: any) => ({
        id: txn.id,
        customerName: txn.customer_name || 'Unknown Customer',
        type: txn.txn_type_name || txn.txn_type || 'Transaction',
        schemeName: txn.scheme_name || 'Unknown Scheme',
        amount: parseFloat(txn.total_amount || 0),
        date: txn.txn_date ? new Date(txn.txn_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
      }));

      console.log('[DashboardService] Returning mapped transactions:', mapped.length);
      return mapped;
    } catch (error: any) {
      console.error('[DashboardService] Error in getRecentTransactions:', error.message, error.code);
      // If table/column doesn't exist, return empty data
      if (error.code === '42P01' || error.code === '42703') {
        console.log('Transaction table/columns do not exist yet, returning empty data');
        return [];
      }
      console.error('Error getting recent transactions:', error);
      throw error;
    }
  }
}

export const dashboardService = new DashboardService();
