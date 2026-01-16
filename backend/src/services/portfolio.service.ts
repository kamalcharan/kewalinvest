// backend/src/services/portfolio.service.ts

import { Pool } from 'pg';
import { pool } from '../config/database';
import {
  CustomerPortfolioResponse,
  CustomerPortfolioSummary,
  PortfolioHolding,
  AssetAllocation,
  PortfolioTotals,
  PortfolioFilters,
  RefreshPortfolioRequest,
  RefreshPortfolioResponse,
  PortfolioStatistics,
  SchemePortfolioDetails,
  PortfolioPerformanceMetric,
  DailyChange
} from '../types/portfolio.types';
import { PortfolioUtil } from '../utils/portfolio.util';

export class PortfolioService {
  private db: Pool;

  constructor() {
    this.db = pool;
  }

  /**
   * Get customer's complete portfolio with performance history
   * Includes: holdings, allocation, performance trends, daily changes
   */
  async getCustomerPortfolio(
    tenantId: number,
    isLive: boolean,
    customerId: number
  ): Promise<CustomerPortfolioResponse | null> {
    try {
      // ========================================
      // 1. GET CUSTOMER NAME
      // ========================================
      const customerQuery = `
        SELECT c.name 
        FROM t_customers cust
        JOIN t_contacts c ON c.id = cust.contact_id  
        WHERE cust.id = $1 AND cust.tenant_id = $2 AND cust.is_live = $3 AND cust.is_active = true
      `;
      const customerResult = await this.db.query(customerQuery, [customerId, tenantId, isLive]);

      if (customerResult.rows.length === 0) {
        console.log(`Customer not found: ${customerId}`);
        return null;
      }

      const customerName = customerResult.rows[0].name;

      // ========================================
      // 2. GET PORTFOLIO HOLDINGS
      // ========================================
      const holdingsQuery = `
        SELECT *
        FROM t_customer_portfolio_totals
        WHERE customer_id = $1 AND tenant_id = $2 AND is_live = $3
        ORDER BY current_value DESC
      `;
      const holdingsResult = await this.db.query(holdingsQuery, [customerId, tenantId, isLive]);

      // Return empty portfolio if no holdings
      if (holdingsResult.rows.length === 0) {
        console.log(`No holdings found for customer: ${customerId}`);
        return {
          customer_id: customerId,
          customer_name: customerName,
          summary: {
            customer_id: customerId,
            customer_name: customerName,
            total_invested: 0,
            current_value: 0,
            total_returns: 0,
            return_percentage: 0,
            total_schemes: 0,
            day_change: 0,
            day_change_percentage: 0
          },
          holdings: [],
          allocation: [],
          performance: []
        };
      }

      const holdings = holdingsResult.rows;

      // ========================================
      // 3. PARSE AND VALIDATE DATA
      // ========================================
      const parsedHoldings = holdings.map(h => ({
        ...h,
        total_invested: parseFloat(h.total_invested) || 0,
        current_value: parseFloat(h.current_value) || 0,
        total_returns: parseFloat(h.total_returns) || 0,
        return_percentage: parseFloat(h.return_percentage) || 0,
        total_units: parseFloat(h.total_units) || 0,
        latest_nav: parseFloat(h.latest_nav) || 0
      }));

      // ========================================
      // 4. CALCULATE SUMMARY
      // ========================================
      const summary = PortfolioUtil.calculatePortfolioSummary(parsedHoldings);
      const totalValue = summary.current_value;

      // ========================================
      // 5. TRANSFORM HOLDINGS WITH ALLOCATION
      // ========================================
      const holdingsWithAllocation: PortfolioHolding[] = parsedHoldings.map(h => ({
        portfolio_id: h.portfolio_id,
        scheme_code: h.scheme_code,
        scheme_name: h.scheme_name,
        fund_name: h.fund_name,
        category: h.category,
        sub_category: h.sub_category,
        folio_no: h.folio_no,
        total_units: h.total_units,
        total_invested: h.total_invested,
        latest_nav: h.latest_nav,
        current_value: h.current_value,
        total_returns: h.total_returns,
        return_percentage: h.return_percentage,
        allocation_percentage: PortfolioUtil.calculateAllocationPercentage(
          h.current_value,
          totalValue
        ),
        transaction_count: parseInt(h.transaction_count) || 0,
        last_transaction_date: h.last_transaction_date
      }));

      // ========================================
      // 6. CALCULATE ASSET ALLOCATION
      // ========================================
      const allocation = PortfolioUtil.calculateCategoryAllocation(parsedHoldings, totalValue);

      // ========================================
      // 7. GET PERFORMANCE HISTORY (FROM SNAPSHOTS)
      // IMPORTANT: Fetch ALL snapshots for full timeline, not just last 365 days
      // NOTE: Filter by scheme-based asset types (Open Ended, Close Ended, Interval Fund)
      //       NetworthViewer will use separate aggregated API in Cycle 2
      // ========================================
      let performance: PortfolioPerformanceMetric[] = [];
      try {
        const performanceQuery = `
          SELECT
            snapshot_month_end as date,
            SUM(total_invested) as invested,
            SUM(current_value) as current_value,
            SUM(total_returns) as returns,
            CASE
              WHEN SUM(total_invested) > 0
              THEN ((SUM(current_value) - SUM(total_invested)) / SUM(total_invested) * 100)
              ELSE 0
            END as return_percentage
          FROM t_monthly_portfolio_snapshots
          WHERE customer_id = $1
            AND tenant_id = $2
            AND is_live = $3
            AND asset_type_code IN ('Open Ended', 'Close Ended', 'Interval Fund')
          GROUP BY snapshot_month_end
          ORDER BY snapshot_month_end ASC
        `;

        const performanceResult = await this.db.query(performanceQuery, [customerId, tenantId, isLive]);

        performance = performanceResult.rows.map(row => ({
          date: row.date instanceof Date
            ? row.date.toISOString().split('T')[0]
            : row.date,
          invested: parseFloat(row.invested) || 0,
          current_value: parseFloat(row.current_value) || 0,
          returns: parseFloat(row.returns) || 0,
          return_percentage: parseFloat(row.return_percentage) || 0
        }));

        console.log(`Fetched ${performance.length} performance snapshots for customer ${customerId} (full timeline)`);
      } catch (error: any) {
        console.warn(`Failed to fetch performance history: ${error.message}`);
        performance = [];
      }

      // ========================================
      // 8. GET DAILY CHANGES
      // ========================================
      let dailyChange = { day_change: 0, day_change_percentage: 0 };
      try {
        dailyChange = await this.calculateDailyChanges(tenantId, isLive, customerId);
      } catch (error: any) {
        console.warn(`Failed to calculate daily changes: ${error.message}`);
      }

      // ========================================
      // 9. BUILD AND RETURN RESPONSE
      // ========================================
      const response: CustomerPortfolioResponse = {
        customer_id: customerId,
        customer_name: customerName,
        summary: {
          customer_id: customerId,
          customer_name: customerName,
          total_invested: summary.total_invested,
          current_value: summary.current_value,
          total_returns: summary.total_returns,
          return_percentage: summary.return_percentage,
          total_schemes: summary.total_schemes,
          day_change: dailyChange.day_change,
          day_change_percentage: dailyChange.day_change_percentage
        },
        holdings: holdingsWithAllocation,
        allocation,
        performance
      };

      console.log(`Successfully loaded portfolio for customer ${customerId}:`, {
        totalValue: summary.current_value,
        holdingsCount: holdingsWithAllocation.length,
        performanceSnapshots: performance.length
      });

      return response;
    } catch (error: any) {
      console.error('Error getting customer portfolio:', error);
      throw new Error(`Failed to get customer portfolio: ${error.message}`);
    }
  }

  /**
   * Calculate day changes (last two months)
   */
  private async calculateDailyChanges(
    tenantId: number,
    isLive: boolean,
    customerId: number
  ): Promise<{ day_change: number; day_change_percentage: number }> {
    try {
      // NOTE: Aggregate across scheme-based asset types (Open Ended, Close Ended, Interval Fund)
      const query = `
        WITH monthly_totals AS (
          SELECT
            snapshot_month_end,
            SUM(current_value) as current_value
          FROM t_monthly_portfolio_snapshots
          WHERE customer_id = $1 AND tenant_id = $2 AND is_live = $3
            AND asset_type_code IN ('Open Ended', 'Close Ended', 'Interval Fund')
          GROUP BY snapshot_month_end
          ORDER BY snapshot_month_end DESC
          LIMIT 2
        ),
        latest_months AS (
          SELECT
            snapshot_month_end,
            current_value,
            ROW_NUMBER() OVER (ORDER BY snapshot_month_end DESC) as rn
          FROM monthly_totals
        ),
        current_month AS (
          SELECT current_value FROM latest_months WHERE rn = 1
        ),
        previous_month AS (
          SELECT current_value FROM latest_months WHERE rn = 2
        )
        SELECT 
          COALESCE((SELECT current_value FROM current_month), 0) - COALESCE((SELECT current_value FROM previous_month), 0) as day_change,
          CASE 
            WHEN COALESCE((SELECT current_value FROM previous_month), 0) > 0 
            THEN (
              (COALESCE((SELECT current_value FROM current_month), 0) - COALESCE((SELECT current_value FROM previous_month), 0)) / 
              (SELECT current_value FROM previous_month)
            ) * 100
            ELSE 0
          END as day_change_percentage
      `;

      const result = await this.db.query(query, [customerId, tenantId, isLive]);

      if (result.rows.length === 0) {
        return { day_change: 0, day_change_percentage: 0 };
      }

      return {
        day_change: parseFloat(result.rows[0].day_change) || 0,
        day_change_percentage: parseFloat(result.rows[0].day_change_percentage) || 0
      };
    } catch (error: any) {
      console.error('Error calculating daily changes:', error);
      return { day_change: 0, day_change_percentage: 0 };
    }
  }

  /**
   * Get portfolio totals only (faster query)
   */
  async getPortfolioTotals(
    tenantId: number,
    isLive: boolean,
    customerId: number
  ): Promise<CustomerPortfolioSummary | null> {
    try {
      const query = `
        SELECT 
          SUM(total_invested) as total_invested,
          SUM(current_value) as current_value,
          SUM(total_returns) as total_returns,
          COUNT(*) as total_schemes,
          MAX(last_refreshed_at) as last_refreshed_at
        FROM t_customer_portfolio_totals
        WHERE customer_id = $1 AND tenant_id = $2 AND is_live = $3
      `;

      const result = await this.db.query(query, [customerId, tenantId, isLive]);

      if (result.rows.length === 0 || !result.rows[0].total_schemes) {
        return null;
      }

      const row = result.rows[0];
      const totalInvested = parseFloat(row.total_invested) || 0;
      const currentValue = parseFloat(row.current_value) || 0;

      // Get customer name
      const customerQuery = `
        SELECT c.name 
        FROM t_customers cust
        JOIN t_contacts c ON c.id = cust.contact_id
        WHERE cust.id = $1 AND cust.tenant_id = $2 AND cust.is_live = $3
      `;
      const customerResult = await this.db.query(customerQuery, [customerId, tenantId, isLive]);
      const customerName = customerResult.rows[0]?.name;

      return {
        customer_id: customerId,
        customer_name: customerName,
        total_invested: totalInvested,
        current_value: currentValue,
        total_returns: PortfolioUtil.calculateReturns(totalInvested, currentValue),
        return_percentage: PortfolioUtil.calculateReturnPercentage(totalInvested, currentValue),
        total_schemes: parseInt(row.total_schemes)
      };
    } catch (error: any) {
      console.error('Error getting portfolio totals:', error);
      throw new Error(`Failed to get portfolio totals: ${error.message}`);
    }
  }

  /**
   * Get scheme portfolio details with transactions
   */
  async getSchemePortfolioDetails(
    tenantId: number,
    isLive: boolean,
    customerId: number,
    schemeCode: string
  ): Promise<SchemePortfolioDetails | null> {
    try {
      // Get portfolio holding
      const holdingQuery = `
        SELECT *
        FROM t_customer_portfolio_totals
        WHERE customer_id = $1 AND scheme_code = $2 AND tenant_id = $3 AND is_live = $4
      `;
      const holdingResult = await this.db.query(holdingQuery, [
        customerId,
        schemeCode,
        tenantId,
        isLive
      ]);

      if (holdingResult.rows.length === 0) {
        return null;
      }

      const holding = holdingResult.rows[0];

      // Get recent transactions
      const txnQuery = `
        SELECT 
          tt.id,
          tt.txn_date,
          mtt.txn_code as txn_type_code,
          mtt.txn_name as txn_type_name,
          mtt.txn_type,
          tt.total_amount,
          tt.units,
          tt.nav,
          tt.is_potential_duplicate,
          tt.portfolio_flag
        FROM t_transaction_table tt
        LEFT JOIN m_transaction_types mtt ON tt.txn_type_id = mtt.id
        WHERE tt.customer_id = $1 
          AND tt.scheme_code = $2 
          AND tt.tenant_id = $3 
          AND tt.is_live = $4
          AND tt.is_active = true
        ORDER BY tt.txn_date DESC
        LIMIT 50
      `;
      const txnResult = await this.db.query(txnQuery, [customerId, schemeCode, tenantId, isLive]);

      // Calculate additional statistics
      const allTxnQuery = `
        SELECT 
          tt.txn_date,
          mtt.txn_type,
          tt.total_amount,
          tt.units,
          tt.nav
        FROM t_transaction_table tt
        LEFT JOIN m_transaction_types mtt ON tt.txn_type_id = mtt.id
        WHERE tt.customer_id = $1 
          AND tt.scheme_code = $2 
          AND tt.tenant_id = $3 
          AND tt.is_live = $4
          AND tt.is_active = true
          AND tt.portfolio_flag = true
        ORDER BY tt.txn_date ASC
      `;
      const allTxnResult = await this.db.query(allTxnQuery, [customerId, schemeCode, tenantId, isLive]);

      const purchases = allTxnResult.rows.filter(t => t.txn_type === 'Addition');
      const redemptions = allTxnResult.rows.filter(t => t.txn_type === 'Deduction');

      const purchaseAmount = purchases.reduce((sum, t) => sum + parseFloat(t.total_amount), 0);
      const redemptionAmount = redemptions.reduce((sum, t) => sum + parseFloat(t.total_amount), 0);

      const averagePurchaseNav = purchases.length > 0
        ? PortfolioUtil.calculateWeightedAverageNAV(purchases)
        : 0;

      const firstPurchase = purchases[0]?.txn_date;
      const lastPurchase = purchases[purchases.length - 1]?.txn_date;
      const lastRedemption = redemptions[redemptions.length - 1]?.txn_date;

      // Get total value for allocation
      const totalValueQuery = `
        SELECT SUM(current_value) as total_value
        FROM t_customer_portfolio_totals
        WHERE customer_id = $1 AND tenant_id = $2 AND is_live = $3
      `;
      const totalValueResult = await this.db.query(totalValueQuery, [customerId, tenantId, isLive]);
      const totalValue = parseFloat(totalValueResult.rows[0].total_value) || 0;

      return {
        portfolio_id: holding.portfolio_id,
        scheme_code: holding.scheme_code,
        scheme_name: holding.scheme_name,
        fund_name: holding.fund_name,
        category: holding.category,
        sub_category: holding.sub_category,
        folio_no: holding.folio_no,
        total_units: parseFloat(holding.total_units),
        total_invested: parseFloat(holding.total_invested),
        latest_nav: parseFloat(holding.latest_nav),
        current_value: parseFloat(holding.current_value),
        total_returns: parseFloat(holding.total_returns),
        return_percentage: parseFloat(holding.return_percentage),
        allocation_percentage: PortfolioUtil.calculateAllocationPercentage(
          parseFloat(holding.current_value),
          totalValue
        ),
        transaction_count: parseInt(holding.transaction_count),
        last_transaction_date: holding.last_transaction_date,
        recent_transactions: txnResult.rows,
        first_purchase_date: firstPurchase,
        last_purchase_date: lastPurchase,
        last_redemption_date: lastRedemption,
        average_purchase_nav: averagePurchaseNav,
        total_purchases: purchases.length,
        total_redemptions: redemptions.length,
        purchase_amount: PortfolioUtil.roundAmount(purchaseAmount),
        redemption_amount: PortfolioUtil.roundAmount(redemptionAmount)
      };
    } catch (error: any) {
      console.error('Error getting scheme portfolio details:', error);
      throw new Error(`Failed to get scheme portfolio details: ${error.message}`);
    }
  }

  /**
   * Get portfolio statistics across all customers
   */
  async getPortfolioStatistics(
    tenantId: number,
    isLive: boolean
  ): Promise<PortfolioStatistics> {
    try {
      // Overall statistics
      const statsQuery = `
        SELECT 
          COUNT(DISTINCT customer_id) as total_customers_with_portfolio,
          COUNT(DISTINCT scheme_code) as total_schemes_held,
          SUM(total_invested) as total_invested,
          SUM(current_value) as total_current_value,
          SUM(total_returns) as total_returns,
          AVG(return_percentage) as average_return_percentage
        FROM t_customer_portfolio_totals
        WHERE tenant_id = $1 AND is_live = $2
      `;
      const statsResult = await this.db.query(statsQuery, [tenantId, isLive]);
      const stats = statsResult.rows[0];

      // Top performing schemes
      const topPerformersQuery = `
        SELECT 
          scheme_code,
          scheme_name,
          AVG(return_percentage) as return_percentage,
          COUNT(DISTINCT customer_id) as customer_count
        FROM t_customer_portfolio_totals
        WHERE tenant_id = $1 AND is_live = $2
        GROUP BY scheme_code, scheme_name
        HAVING AVG(return_percentage) > 0
        ORDER BY return_percentage DESC
        LIMIT 10
      `;
      const topPerformersResult = await this.db.query(topPerformersQuery, [tenantId, isLive]);

      // Category breakdown
      const categoryQuery = `
        SELECT 
          COALESCE(category, 'Uncategorized') as category,
          SUM(total_invested) as total_invested,
          SUM(current_value) as current_value,
          COUNT(*) as scheme_count
        FROM t_customer_portfolio_totals
        WHERE tenant_id = $1 AND is_live = $2
        GROUP BY category
        ORDER BY current_value DESC
      `;
      const categoryResult = await this.db.query(categoryQuery, [tenantId, isLive]);

      const totalCurrentValue = parseFloat(stats.total_current_value) || 0;
      const categoryBreakdown = categoryResult.rows.map(row => ({
        category: row.category,
        total_invested: parseFloat(row.total_invested),
        current_value: parseFloat(row.current_value),
        percentage: PortfolioUtil.calculateAllocationPercentage(
          parseFloat(row.current_value),
          totalCurrentValue
        ),
        scheme_count: parseInt(row.scheme_count),
        returns: PortfolioUtil.calculateReturns(
          parseFloat(row.total_invested),
          parseFloat(row.current_value)
        ),
        return_percentage: PortfolioUtil.calculateReturnPercentage(
          parseFloat(row.total_invested),
          parseFloat(row.current_value)
        )
      }));

      return {
        total_customers_with_portfolio: parseInt(stats.total_customers_with_portfolio) || 0,
        total_schemes_held: parseInt(stats.total_schemes_held) || 0,
        total_invested: parseFloat(stats.total_invested) || 0,
        total_current_value: totalCurrentValue,
        total_returns: parseFloat(stats.total_returns) || 0,
        average_return_percentage: parseFloat(stats.average_return_percentage) || 0,
        top_performing_schemes: topPerformersResult.rows.map(row => ({
          scheme_code: row.scheme_code,
          scheme_name: row.scheme_name,
          return_percentage: parseFloat(row.return_percentage),
          customer_count: parseInt(row.customer_count)
        })),
        category_breakdown: categoryBreakdown
      };
    } catch (error: any) {
      console.error('Error getting portfolio statistics:', error);
      throw new Error(`Failed to get portfolio statistics: ${error.message}`);
    }
  }

  /**
   * Refresh portfolio totals materialized view
   */
  async refreshPortfolioTotals(
    request?: RefreshPortfolioRequest
  ): Promise<RefreshPortfolioResponse> {
    const startTime = Date.now();

    try {
      await this.db.query('REFRESH MATERIALIZED VIEW CONCURRENTLY t_customer_portfolio_totals');

      // Count affected records
      let affectedQuery = 'SELECT COUNT(*) as count FROM t_customer_portfolio_totals';
      const params: any[] = [];

      if (request?.customer_id) {
        affectedQuery += ' WHERE customer_id = $1';
        params.push(request.customer_id);
      } else if (request?.scheme_code) {
        affectedQuery += ' WHERE scheme_code = $1';
        params.push(request.scheme_code);
      }

      const countResult = await this.db.query(affectedQuery, params);
      const affectedRecords = parseInt(countResult.rows[0].count);

      const duration = Date.now() - startTime;

      return {
        success: true,
        refreshed_at: new Date(),
        affected_records: affectedRecords,
        duration_ms: duration
      };
    } catch (error: any) {
      console.error('Error refreshing portfolio totals:', error);
      throw new Error(`Failed to refresh portfolio totals: ${error.message}`);
    }
  }

  /**
   * Get portfolio holdings with filters
   */
  async getPortfolioHoldings(
    tenantId: number,
    isLive: boolean,
    filters: PortfolioFilters
  ): Promise<PortfolioHolding[]> {
    try {
      const baseConditions = ['tenant_id = $1', 'is_live = $2'];
      const params: any[] = [tenantId, isLive];
      let paramIndex = 3;

      const filterClause = PortfolioUtil.buildFilterWhereClause(
        {
          customer_id: filters.customer_id,
          scheme_code: filters.scheme_code,
          category: filters.category,
          sub_category: filters.sub_category,
          min_value: filters.min_value,
          max_value: filters.max_value
        },
        paramIndex
      );

      const whereClause = [...baseConditions, filterClause.where].join(' AND ');
      params.push(...filterClause.params);

      const sortBy = filters.sort_by || 'current_value';
      const sortOrder = filters.sort_order || 'desc';

      // Get total value for allocation
      const totalValueQuery = `
        SELECT SUM(current_value) as total_value
        FROM t_customer_portfolio_totals
        WHERE ${whereClause}
      `;
      const totalValueResult = await this.db.query(totalValueQuery, params);
      const totalValue = parseFloat(totalValueResult.rows[0].total_value) || 0;

      const query = `
        SELECT *
        FROM t_customer_portfolio_totals
        WHERE ${whereClause}
        ORDER BY ${sortBy} ${sortOrder.toUpperCase()}
      `;

      const result = await this.db.query(query, params);

      return result.rows.map(h => ({
        portfolio_id: h.portfolio_id,
        scheme_code: h.scheme_code,
        scheme_name: h.scheme_name,
        fund_name: h.fund_name,
        category: h.category,
        sub_category: h.sub_category,
        folio_no: h.folio_no,
        total_units: parseFloat(h.total_units),
        total_invested: parseFloat(h.total_invested),
        latest_nav: parseFloat(h.latest_nav),
        current_value: parseFloat(h.current_value),
        total_returns: parseFloat(h.total_returns),
        return_percentage: parseFloat(h.return_percentage),
        allocation_percentage: PortfolioUtil.calculateAllocationPercentage(
          parseFloat(h.current_value),
          totalValue
        ),
        allocation: parseFloat(h.allocation) || 0, // Goal allocation from t_customer_master_portfolio
        transaction_count: parseInt(h.transaction_count),
        last_transaction_date: h.last_transaction_date
      }));
    } catch (error: any) {
      console.error('Error getting portfolio holdings:', error);
      throw new Error(`Failed to get portfolio holdings: ${error.message}`);
    }
  }
}