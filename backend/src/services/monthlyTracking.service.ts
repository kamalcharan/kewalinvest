// backend/src/services/monthlyTracking.service.ts

import { Pool } from 'pg';
import { pool } from '../config/database';
import {
  MonthlyUnitsData,
  MonthlyUnitsResponse,
  MonthlyNAVData,
  MonthlyNAVResponse,
  MonthlyMarketValueData,
  MonthlyMarketValueResponse,
  MonthlyTrackingFilters
} from '../types/monthlyTracking.types';

export class MonthlyTrackingService {
  private db: Pool;

  constructor() {
    this.db = pool;
  }

  /**
   * Helper: Generate month list (YYYY-MM format)
   */
  private generateMonthList(months: number): string[] {
    const monthList: string[] = [];
    const now = new Date();

    for (let i = months - 1; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthList.push(monthStr);
    }

    return monthList;
  }

  /**
   * Helper: Format month for display (Jan 2025)
   */
  private formatMonthDisplay(month: string): string {
    const [year, monthNum] = month.split('-');
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${monthNames[parseInt(monthNum) - 1]} ${year}`;
  }

  /**
   * Helper: Get scheme details
   */
  private async getSchemeDetails(
    schemeCode: string
  ): Promise<{ scheme_name: string }> {
    const query = `
      SELECT scheme_name
      FROM t_scheme_details
      WHERE scheme_code = $1
      LIMIT 1
    `;
    const result = await this.db.query(query, [schemeCode]);
    return result.rows[0] || { scheme_name: schemeCode };
  }

  // ==================== MONTHLY UNITS TRACKING ====================

  /**
   * Get monthly units data for a customer/scheme
   * Aggregates transaction data to show units movement per month
   */
  async getMonthlyUnits(
    tenantId: number,
    isLive: boolean,
    filters: MonthlyTrackingFilters
  ): Promise<MonthlyUnitsResponse> {
    try {
      const { customer_id, scheme_code, months = 12 } = filters;

      if (!customer_id || !scheme_code) {
        throw new Error('customer_id and scheme_code are required');
      }

      const schemeDetails = await this.getSchemeDetails(scheme_code);
      const monthList = this.generateMonthList(months);

      // Get transaction type mapping (Addition vs Deduction)
      const txnTypeQuery = `
        SELECT id, txn_type
        FROM m_transaction_types
      `;
      const txnTypeResult = await this.db.query(txnTypeQuery);
      const txnTypeMap = new Map<number, string>();
      txnTypeResult.rows.forEach(row => {
        txnTypeMap.set(row.id, row.txn_type);
      });

      // Get all transactions for the period
      const fromMonth = monthList[0];
      const toMonth = monthList[monthList.length - 1];

      // CRITICAL FIX: First get cumulative units BEFORE the display period
      // This ensures we account for all historical transactions
      const priorUnitsQuery = `
        SELECT
          txn_type_id,
          SUM(units) as total_units
        FROM t_transaction_table
        WHERE tenant_id = $1
          AND is_live = $2
          AND customer_id = $3
          AND scheme_code = $4
          AND is_active = true
          AND portfolio_flag = true
          AND TO_CHAR(txn_date, 'YYYY-MM') < $5
        GROUP BY txn_type_id
      `;

      const priorResult = await this.db.query(priorUnitsQuery, [
        tenantId,
        isLive,
        customer_id,
        scheme_code,
        fromMonth
      ]);

      // Calculate cumulative units from all prior transactions
      let priorCumulativeUnits = 0;
      priorResult.rows.forEach(row => {
        const txnType = txnTypeMap.get(row.txn_type_id);
        const units = parseFloat(row.total_units) || 0;
        if (txnType === 'Addition') {
          priorCumulativeUnits += units;
        } else if (txnType === 'Deduction') {
          priorCumulativeUnits -= Math.abs(units);
        }
      });

      const transactionQuery = `
        SELECT
          TO_CHAR(txn_date, 'YYYY-MM') as month,
          txn_type_id,
          SUM(units) as total_units,
          COUNT(*) as count
        FROM t_transaction_table
        WHERE tenant_id = $1
          AND is_live = $2
          AND customer_id = $3
          AND scheme_code = $4
          AND is_active = true
          AND portfolio_flag = true
          AND TO_CHAR(txn_date, 'YYYY-MM') >= $5
          AND TO_CHAR(txn_date, 'YYYY-MM') <= $6
        GROUP BY TO_CHAR(txn_date, 'YYYY-MM'), txn_type_id
        ORDER BY month
      `;

      const txnResult = await this.db.query(transactionQuery, [
        tenantId,
        isLive,
        customer_id,
        scheme_code,
        fromMonth,
        toMonth
      ]);

      // Build monthly data - start with prior cumulative units
      const monthlyData: MonthlyUnitsData[] = [];
      let cumulativeUnits = priorCumulativeUnits;

      for (const month of monthList) {
        const monthTxns = txnResult.rows.filter(r => r.month === month);

        let unitsAdded = 0;
        let unitsRedeemed = 0;
        let transactionCount = 0;

        monthTxns.forEach(txn => {
          const txnType = txnTypeMap.get(txn.txn_type_id);
          const units = parseFloat(txn.total_units) || 0;
          const count = parseInt(txn.count) || 0;

          if (txnType === 'Addition') {
            unitsAdded += units;
          } else if (txnType === 'Deduction') {
            unitsRedeemed += Math.abs(units);
          }
          transactionCount += count;
        });

        const openingUnits = cumulativeUnits;
        const netChange = unitsAdded - unitsRedeemed;
        const closingUnits = openingUnits + netChange;
        cumulativeUnits = closingUnits;

        monthlyData.push({
          month,
          month_display: this.formatMonthDisplay(month),
          scheme_code,
          scheme_name: schemeDetails.scheme_name,
          opening_units: Math.round(openingUnits * 1000) / 1000,
          closing_units: Math.round(closingUnits * 1000) / 1000,
          units_added: Math.round(unitsAdded * 1000) / 1000,
          units_redeemed: Math.round(unitsRedeemed * 1000) / 1000,
          net_change: Math.round(netChange * 1000) / 1000,
          transaction_count: transactionCount
        });
      }

      // Calculate summary
      const totalUnitsAdded = monthlyData.reduce((sum, m) => sum + m.units_added, 0);
      const totalUnitsRedeemed = monthlyData.reduce((sum, m) => sum + m.units_redeemed, 0);
      const currentUnits = monthlyData[monthlyData.length - 1]?.closing_units || 0;
      const averageMonthlyUnits = monthlyData.reduce((sum, m) => sum + m.closing_units, 0) / monthlyData.length;

      return {
        customer_id,
        scheme_code,
        scheme_name: schemeDetails.scheme_name,
        months: monthlyData,
        summary: {
          total_months: monthlyData.length,
          current_units: Math.round(currentUnits * 1000) / 1000,
          total_units_added: Math.round(totalUnitsAdded * 1000) / 1000,
          total_units_redeemed: Math.round(totalUnitsRedeemed * 1000) / 1000,
          average_monthly_units: Math.round(averageMonthlyUnits * 1000) / 1000
        }
      };

    } catch (error: any) {
      console.error('Error getting monthly units:', error);
      throw new Error(`Failed to get monthly units: ${error.message}`);
    }
  }

  // ==================== MONTHLY NAV PERFORMANCE ====================

  /**
   * Get monthly NAV performance for a customer/scheme
   * Shows opening, closing, high, low NAV for each month
   */
  async getMonthlyNAVPerformance(
    tenantId: number,
    isLive: boolean,
    filters: MonthlyTrackingFilters
  ): Promise<MonthlyNAVResponse> {
    try {
      const { customer_id, scheme_code, months = 12 } = filters;

      if (!customer_id || !scheme_code) {
        throw new Error('customer_id and scheme_code are required');
      }

      const schemeDetails = await this.getSchemeDetails(scheme_code);
      const monthList = this.generateMonthList(months);

      // Get NAV data for all months
      // Use scheme_code directly - NAV data is global (not filtered by is_live)
      const fromMonth = monthList[0];
      const toMonth = monthList[monthList.length - 1];

      // First, get the latest available NAV for this scheme (fallback for incomplete months)
      const latestNavQuery = `
        SELECT nav_value, nav_date
        FROM t_nav_data
        WHERE scheme_code = $1
        ORDER BY nav_date DESC
        LIMIT 1
      `;
      const latestNavResult = await this.db.query(latestNavQuery, [scheme_code]);
      const latestAvailableNav = latestNavResult.rows[0]
        ? parseFloat(latestNavResult.rows[0].nav_value)
        : 0;

      const navQuery = `
        SELECT
          TO_CHAR(nav_date, 'YYYY-MM') as month,
          nav_date,
          nav_value
        FROM t_nav_data
        WHERE scheme_code = $1
          AND TO_CHAR(nav_date, 'YYYY-MM') >= $2
          AND TO_CHAR(nav_date, 'YYYY-MM') <= $3
        ORDER BY nav_date
      `;

      const navResult = await this.db.query(navQuery, [
        scheme_code,
        fromMonth,
        toMonth
      ]);

      // Build monthly NAV data
      const monthlyData: MonthlyNAVData[] = [];
      let lastKnownNav = 0; // Track last known NAV for fallback

      for (const month of monthList) {
        const monthNavs = navResult.rows.filter(r => r.month === month);

        if (monthNavs.length === 0) {
          // No NAV data for this month - use latest available NAV with is_estimated flag
          const estimatedNav = lastKnownNav > 0 ? lastKnownNav : latestAvailableNav;
          monthlyData.push({
            month,
            month_display: this.formatMonthDisplay(month),
            scheme_code,
            scheme_name: schemeDetails.scheme_name,
            opening_nav: Math.round(estimatedNav * 10000) / 10000,
            closing_nav: Math.round(estimatedNav * 10000) / 10000,
            lowest_nav: Math.round(estimatedNav * 10000) / 10000,
            highest_nav: Math.round(estimatedNav * 10000) / 10000,
            nav_change: 0,
            nav_change_percentage: 0,
            days_tracked: 0,
            is_estimated: estimatedNav > 0 // Mark as estimated if we have a value
          });
          continue;
        }

        const openingNav = parseFloat(monthNavs[0].nav_value);
        const closingNav = parseFloat(monthNavs[monthNavs.length - 1].nav_value);
        const navValues = monthNavs.map(n => parseFloat(n.nav_value));
        const lowestNav = Math.min(...navValues);
        const highestNav = Math.max(...navValues);
        const navChange = closingNav - openingNav;
        const navChangePercentage = openingNav > 0 ? (navChange / openingNav) * 100 : 0;

        monthlyData.push({
          month,
          month_display: this.formatMonthDisplay(month),
          scheme_code,
          scheme_name: schemeDetails.scheme_name,
          opening_nav: Math.round(openingNav * 10000) / 10000,
          closing_nav: Math.round(closingNav * 10000) / 10000,
          lowest_nav: Math.round(lowestNav * 10000) / 10000,
          highest_nav: Math.round(highestNav * 10000) / 10000,
          nav_change: Math.round(navChange * 10000) / 10000,
          nav_change_percentage: Math.round(navChangePercentage * 100) / 100,
          days_tracked: monthNavs.length,
          is_estimated: false
        });

        // Update lastKnownNav for future months that might be missing data
        lastKnownNav = closingNav;
      }

      // Calculate summary
      const currentNav = monthlyData[monthlyData.length - 1]?.closing_nav || 0;
      const firstNav = monthlyData[0]?.opening_nav || 0;
      const overallChangePercentage = firstNav > 0
        ? ((currentNav - firstNav) / firstNav) * 100
        : 0;

      const validMonths = monthlyData.filter(m => m.closing_nav > 0);
      const averageNav = validMonths.length > 0
        ? validMonths.reduce((sum, m) => sum + m.closing_nav, 0) / validMonths.length
        : 0;

      // Find best and worst months
      const monthsWithChange = monthlyData.filter(m => m.opening_nav > 0);
      let bestMonth = null;
      let worstMonth = null;

      if (monthsWithChange.length > 0) {
        const sorted = [...monthsWithChange].sort((a, b) =>
          b.nav_change_percentage - a.nav_change_percentage
        );
        bestMonth = {
          month: sorted[0].month_display,
          change_percentage: sorted[0].nav_change_percentage
        };
        worstMonth = {
          month: sorted[sorted.length - 1].month_display,
          change_percentage: sorted[sorted.length - 1].nav_change_percentage
        };
      }

      return {
        customer_id,
        scheme_code,
        scheme_name: schemeDetails.scheme_name,
        months: monthlyData,
        summary: {
          total_months: monthlyData.length,
          current_nav: Math.round(currentNav * 10000) / 10000,
          average_nav: Math.round(averageNav * 10000) / 10000,
          overall_change_percentage: Math.round(overallChangePercentage * 100) / 100,
          best_month: bestMonth,
          worst_month: worstMonth
        }
      };

    } catch (error: any) {
      console.error('Error getting monthly NAV performance:', error);
      throw new Error(`Failed to get monthly NAV performance: ${error.message}`);
    }
  }

  // ==================== MONTHLY MARKET VALUE ====================

  /**
   * Get monthly market value for a customer/scheme
   * Formula: Previous Month NAV × Current Month Units
   */
  async getMonthlyMarketValue(
    tenantId: number,
    isLive: boolean,
    filters: MonthlyTrackingFilters
  ): Promise<MonthlyMarketValueResponse> {
    try {
      const { customer_id, scheme_code, months = 12 } = filters;

      if (!customer_id || !scheme_code) {
        throw new Error('customer_id and scheme_code are required');
      }

      // Get monthly units and NAV data
      const unitsResponse = await this.getMonthlyUnits(tenantId, isLive, filters);
      const navResponse = await this.getMonthlyNAVPerformance(tenantId, isLive, filters);

      // Get invested value per month (cumulative)
      const monthList = this.generateMonthList(months);
      const fromMonth = monthList[0];
      const toMonth = monthList[monthList.length - 1];

      // CRITICAL FIX: First get cumulative invested BEFORE the display period
      const priorInvestedQuery = `
        SELECT
          SUM(CASE WHEN mtt.txn_type = 'Addition' THEN total_amount ELSE 0 END) as invested
        FROM t_transaction_table tt
        LEFT JOIN m_transaction_types mtt ON tt.txn_type_id = mtt.id
        WHERE tt.tenant_id = $1
          AND tt.is_live = $2
          AND tt.customer_id = $3
          AND tt.scheme_code = $4
          AND tt.is_active = true
          AND tt.portfolio_flag = true
          AND TO_CHAR(tt.txn_date, 'YYYY-MM') < $5
      `;

      const priorInvestedResult = await this.db.query(priorInvestedQuery, [
        tenantId,
        isLive,
        customer_id,
        scheme_code,
        fromMonth
      ]);

      const priorInvested = parseFloat(priorInvestedResult.rows[0]?.invested) || 0;

      const investedQuery = `
        SELECT
          TO_CHAR(txn_date, 'YYYY-MM') as month,
          SUM(CASE WHEN mtt.txn_type = 'Addition' THEN total_amount ELSE 0 END) as invested,
          SUM(CASE WHEN mtt.txn_type = 'Deduction' THEN total_amount ELSE 0 END) as redeemed
        FROM t_transaction_table tt
        LEFT JOIN m_transaction_types mtt ON tt.txn_type_id = mtt.id
        WHERE tt.tenant_id = $1
          AND tt.is_live = $2
          AND tt.customer_id = $3
          AND tt.scheme_code = $4
          AND tt.is_active = true
          AND tt.portfolio_flag = true
          AND TO_CHAR(tt.txn_date, 'YYYY-MM') >= $5
          AND TO_CHAR(tt.txn_date, 'YYYY-MM') <= $6
        GROUP BY TO_CHAR(txn_date, 'YYYY-MM')
        ORDER BY month
      `;

      const investedResult = await this.db.query(investedQuery, [
        tenantId,
        isLive,
        customer_id,
        scheme_code,
        fromMonth,
        toMonth
      ]);

      const investedMap = new Map<string, number>();
      const cashFlowMap = new Map<string, number>();  // Per-month net cash flow (additions - redemptions)
      let cumulativeInvested = priorInvested;  // Start with prior invested amount
      investedResult.rows.forEach(row => {
        const monthInvested = parseFloat(row.invested) || 0;
        const monthRedeemed = Math.abs(parseFloat(row.redeemed) || 0);
        cumulativeInvested += monthInvested;
        investedMap.set(row.month, cumulativeInvested);
        cashFlowMap.set(row.month, monthInvested - monthRedeemed);
      });

      // Build monthly market value data
      const monthlyData: MonthlyMarketValueData[] = [];
      let previousMonthMarketValue = 0;

      for (let i = 0; i < monthList.length; i++) {
        const month = monthList[i];
        const unitsData = unitsResponse.months[i];
        const navData = navResponse.months[i];

        // Use current month's closing NAV directly
        // For current/incomplete month, latest available NAV is used (see getMonthlyNAVPerformance)
        // At month-end, the scheduler updates with actual EOM NAV
        const navToUse = navData.closing_nav;
        const currentMonthUnits = unitsData.closing_units;

        // FIX: When units <= 0 (investor exited), show market value as 0
        const rawMarketValue = navToUse * currentMonthUnits;
        const marketValue = currentMonthUnits <= 0 ? 0 : rawMarketValue;

        // Get cumulative invested value up to this month
        // Start with priorInvested as the base (for months before display period)
        let investedValue = priorInvested;
        for (const [m, inv] of investedMap.entries()) {
          if (m <= month) {
            investedValue = inv;  // investedMap values already include priorInvested
          }
        }

        const profitLoss = marketValue - investedValue;
        const profitLossPercentage = investedValue > 0
          ? (profitLoss / investedValue) * 100
          : 0;

        // Calculate MoM (Month-over-Month) change — cash-flow adjusted
        // Subtracts net cash flow so MoM reflects actual investment performance,
        // not capital additions/redemptions
        const netCashFlow = cashFlowMap.get(month) || 0;
        const monthChange = marketValue - previousMonthMarketValue;
        const adjustedMonthChange = monthChange - netCashFlow;
        const monthChangePercentage = previousMonthMarketValue > 0
          ? (adjustedMonthChange / previousMonthMarketValue) * 100
          : 0;

        monthlyData.push({
          month,
          month_display: this.formatMonthDisplay(month),
          scheme_code,
          scheme_name: unitsData.scheme_name,
          current_month_units: Math.round(currentMonthUnits * 1000) / 1000,
          previous_month_nav: Math.round(navToUse * 10000) / 10000,
          market_value: Math.round(marketValue * 100) / 100,
          invested_value: Math.round(investedValue * 100) / 100,
          profit_loss: Math.round(profitLoss * 100) / 100,
          profit_loss_percentage: Math.round(profitLossPercentage * 100) / 100,
          month_change: Math.round(monthChange * 100) / 100,
          month_change_percentage: Math.round(monthChangePercentage * 100) / 100,
          net_cash_flow: Math.round(netCashFlow * 100) / 100
        });

        // Update previous month market value for next iteration's MoM calculation
        previousMonthMarketValue = marketValue;
      }

      // Calculate summary
      const currentMarketValue = monthlyData[monthlyData.length - 1]?.market_value || 0;
      const totalInvested = monthlyData[monthlyData.length - 1]?.invested_value || 0;
      const overallProfitLoss = currentMarketValue - totalInvested;
      const overallProfitLossPercentage = totalInvested > 0
        ? (overallProfitLoss / totalInvested) * 100
        : 0;
      const averageMonthlyValue = monthlyData.reduce((sum, m) => sum + m.market_value, 0) / monthlyData.length;

      return {
        customer_id,
        scheme_code,
        scheme_name: unitsResponse.scheme_name,
        months: monthlyData,
        summary: {
          total_months: monthlyData.length,
          current_market_value: Math.round(currentMarketValue * 100) / 100,
          total_invested: Math.round(totalInvested * 100) / 100,
          overall_profit_loss: Math.round(overallProfitLoss * 100) / 100,
          overall_profit_loss_percentage: Math.round(overallProfitLossPercentage * 100) / 100,
          average_monthly_value: Math.round(averageMonthlyValue * 100) / 100
        }
      };

    } catch (error: any) {
      console.error('Error getting monthly market value:', error);
      throw new Error(`Failed to get monthly market value: ${error.message}`);
    }
  }

  // ==================== ALL SCHEMES MONTHLY SNAPSHOTS ====================

  /**
   * Get monthly snapshots for ALL schemes in customer's portfolio
   * Returns all schemes with their monthly data in one API call
   */
  async getAllSchemesMonthlySnapshots(
    tenantId: number,
    isLive: boolean,
    customerId: number,
    months: number = 12
  ): Promise<any> {
    try {
      // If months=0, auto-detect from customer's first transaction date
      let actualMonths = months;
      let firstTransactionDate: string | null = null;

      if (months === 0) {
        const firstTxnQuery = `
          SELECT MIN(txn_date) as first_date
          FROM t_transaction_table
          WHERE tenant_id = $1
            AND is_live = $2
            AND customer_id = $3
            AND is_active = true
            AND portfolio_flag = true
        `;
        const result = await this.db.query(firstTxnQuery, [tenantId, isLive, customerId]);
        const firstDate = result.rows[0]?.first_date;

        if (firstDate) {
          firstTransactionDate = new Date(firstDate).toISOString().split('T')[0];
          const now = new Date();
          const first = new Date(firstDate);
          actualMonths = (now.getFullYear() - first.getFullYear()) * 12
            + (now.getMonth() - first.getMonth()) + 1;
          actualMonths = Math.max(actualMonths, 1);
        } else {
          actualMonths = 12; // Fallback if no transactions
        }
      }

      // Get all active schemes from customer's portfolio
      // Join with t_scheme_details and t_scheme_masters to get actual scheme category
      const schemesQuery = `
        SELECT
          cmp.scheme_code,
          cmp.scheme_name,
          COALESCE(sm.name, cmp.category, 'Uncategorized') as category,
          COALESCE(cmp.sub_category, '') as sub_category
        FROM t_customer_master_portfolio cmp
        LEFT JOIN t_scheme_details sd ON cmp.scheme_code = sd.scheme_code
        LEFT JOIN t_scheme_masters sm ON sd.scheme_category_id = sm.id
        WHERE cmp.tenant_id = $1
          AND cmp.is_live = $2
          AND cmp.customer_id = $3
          AND cmp.is_active = true
        ORDER BY cmp.scheme_name
      `;

      const schemesResult = await this.db.query(schemesQuery, [
        tenantId,
        isLive,
        customerId
      ]);

      if (schemesResult.rows.length === 0) {
        return {
          customer_id: customerId,
          schemes: [],
          months_count: actualMonths,
          first_transaction_date: firstTransactionDate
        };
      }

      // Fetch all monthly data for each scheme (units, NAV, market value) in parallel
      const schemePromises = schemesResult.rows.map(async (scheme) => {
        const filters = {
          customer_id: customerId,
          scheme_code: scheme.scheme_code,
          months: actualMonths
        };

        try {
          // Fetch all three datasets in parallel for efficiency
          const [unitsData, navData, marketValueData] = await Promise.all([
            this.getMonthlyUnits(tenantId, isLive, filters),
            this.getMonthlyNAVPerformance(tenantId, isLive, filters),
            this.getMonthlyMarketValue(tenantId, isLive, filters)
          ]);

          // Combine all data into a unified structure
          const unitsMonths = (unitsData.months || []) as any[];
          const navMonths = (navData.months || []) as any[];
          const marketValueMonths = (marketValueData.months || []) as any[];

          // Create combined monthly data with all metrics
          const combinedMonthlyData = unitsMonths.map((unitsMonth: any, idx: number) => {
            const navMonth = navMonths[idx] || {};
            const marketValueMonth = marketValueMonths[idx] || {};

            return {
              month: unitsMonth.month,
              month_display: unitsMonth.month_display,
              // Units data
              opening_units: unitsMonth.opening_units,
              units_added: unitsMonth.units_added,
              units_redeemed: unitsMonth.units_redeemed,
              closing_units: unitsMonth.closing_units,
              // NAV data
              opening_nav: navMonth.opening_nav,
              closing_nav: navMonth.closing_nav,
              nav_change: navMonth.nav_change,
              nav_change_percentage: navMonth.nav_change_percentage,
              has_nav_data: navMonth.closing_nav != null && navMonth.closing_nav !== undefined && navMonth.closing_nav > 0,
              is_estimated: navMonth.is_estimated || false, // True if NAV is estimated (show ** in UI)
              // Market Value data
              market_value: marketValueMonth.market_value,
              month_change: marketValueMonth.month_change,
              month_change_percentage: marketValueMonth.month_change_percentage,
              net_cash_flow: marketValueMonth.net_cash_flow || 0
            };
          });

          // Reverse the array to show newest month first
          const reversedMonthlyData = combinedMonthlyData.reverse();

          return {
            scheme_code: scheme.scheme_code,
            scheme_name: scheme.scheme_name || scheme.scheme_code,
            category: scheme.category,
            sub_category: scheme.sub_category,
            monthly_data: reversedMonthlyData,
            summary: {
              units: unitsData.summary || {},
              nav: navData.summary || {},
              market_value: marketValueData.summary || {}
            }
          };
        } catch (error) {
          console.error(`Error fetching data for scheme ${scheme.scheme_code}:`, error);
          return {
            scheme_code: scheme.scheme_code,
            scheme_name: scheme.scheme_name || scheme.scheme_code,
            category: scheme.category,
            sub_category: scheme.sub_category,
            monthly_data: [] as any[],
            summary: {
              units: {},
              nav: {},
              market_value: {}
            },
            error: 'Failed to load data'
          };
        }
      });

      const schemes = await Promise.all(schemePromises);

      return {
        customer_id: customerId,
        schemes,
        months_count: actualMonths,
        first_transaction_date: firstTransactionDate
      };

    } catch (error: any) {
      console.error('Error getting all schemes monthly snapshots:', error);
      throw new Error(`Failed to get monthly snapshots: ${error.message}`);
    }
  }
}
