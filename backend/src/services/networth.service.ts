// backend/src/services/networth.service.ts
// Service for NetworthViewer APIs - Cycle 2
// Aggregates multi-asset portfolio snapshots for networth visualization

import { Pool } from 'pg';
import { pool } from '../config/database';
import {
  NetworthSummaryRequest,
  NetworthSummaryResponse,
  NetworthHistoryRequest,
  NetworthHistoryResponse,
  NetworthHistoryPoint,
  NetworthBreakdownRequest,
  NetworthBreakdownResponse,
  NetworthGoalsRequest,
  NetworthGoalsResponse,
  AssetTypeSummary,
  AssetTypeBreakdown,
  InvestmentPlanDetail,
  GoalAchievability,
  FamilyMemberForNetworth,
  AssetTypeMaster,
  RawSnapshotRow,
  getAssetTypeColor
} from '../types/networth.types';

export class NetworthService {
  private db: Pool;

  constructor() {
    this.db = pool;
  }

  // ==================== SUMMARY API ====================

  /**
   * GET /api/networth/summary
   * Get total networth across all assets with breakdown
   */
  async getNetworthSummary(
    tenantId: number,
    isLive: boolean,
    request: NetworthSummaryRequest
  ): Promise<NetworthSummaryResponse> {
    try {
      // Determine customer IDs to aggregate
      let customerIds: number[] = [];
      let customerName: string | undefined;
      let familyMemberCount: number | undefined;

      if (request.family_head_iwellcode) {
        // Family view - get all family members
        const familyMembers = await this.getFamilyMembers(
          tenantId,
          isLive,
          request.family_head_iwellcode
        );
        customerIds = familyMembers.map(m => m.customer_id);
        familyMemberCount = familyMembers.length;
      } else if (request.customer_id) {
        // Individual view
        customerIds = [request.customer_id];
        customerName = await this.getCustomerName(request.customer_id, tenantId, isLive);
      } else {
        throw new Error('Either customer_id or family_head_iwellcode is required');
      }

      if (customerIds.length === 0) {
        throw new Error('No customers found for the given criteria');
      }

      // Get asset type master data for names
      const assetTypes = await this.getAssetTypeMaster();

      // Build byAssetType array
      const byAssetType: AssetTypeSummary[] = [];
      let totalNetworth = 0;
      let totalInvested = 0;
      let totalReturns = 0;
      let totalPlans = 0;

      // ================================================================
      // 1. GET SCHEME-BASED DATA (all scheme categories)
      // From t_monthly_portfolio_snapshots - NAV-based calculations
      // ================================================================
      const asOfDate = request.as_of_date || await this.getLatestSnapshotDate(
        tenantId,
        isLive,
        customerIds
      );

      if (asOfDate) {
        // Non-scheme asset types (manual investments like GOLD, FD, etc.)
        const nonSchemeAssetTypes = ['GOLD', 'SILVER', 'EQUITY', 'FD', 'PPF', 'EPF', 'NPS', 'REAL_ESTATE', 'INSURANCE', 'NSC', 'BONDS', 'OTHER', 'Growth'];

        const schemeQuery = `
          SELECT
            mps.asset_type_code,
            SUM(mps.total_invested) as total_invested,
            SUM(mps.current_value) as current_value,
            SUM(mps.total_returns) as total_returns,
            SUM(mps.total_schemes) as scheme_count,
            'NAV' as calculation_method
          FROM t_monthly_portfolio_snapshots mps
          WHERE mps.tenant_id = $1
            AND mps.is_live = $2
            AND mps.customer_id = ANY($3)
            AND mps.snapshot_month_end = $4
            AND mps.asset_type_code NOT IN (SELECT UNNEST($5::text[]))
          GROUP BY mps.asset_type_code
          ORDER BY SUM(mps.current_value) DESC
        `;

        const schemeResult = await this.db.query(schemeQuery, [
          tenantId,
          isLive,
          customerIds,
          asOfDate,
          nonSchemeAssetTypes
        ]);

        for (const row of schemeResult.rows) {
          const invested = parseFloat(row.total_invested) || 0;
          const value = parseFloat(row.current_value) || 0;
          const returns = parseFloat(row.total_returns) || 0;
          const schemeCount = parseInt(row.scheme_count) || 0;

          if (value > 0) {
            const assetType = assetTypes.find(at => at.asset_type_code === row.asset_type_code);
            byAssetType.push({
              asset_type_code: row.asset_type_code,
              asset_type_name: assetType?.asset_type_name || row.asset_type_code,
              total_invested: invested,
              current_value: value,
              total_returns: returns,
              return_percentage: invested > 0 ? (returns / invested) * 100 : 0,
              allocation_percentage: 0, // Will calculate after we have total
              plan_count: schemeCount,
              calculation_method: 'NAV' as const
            });

            totalNetworth += value;
            totalInvested += invested;
            totalReturns += returns;
            totalPlans += schemeCount;
          }
        }

        // ================================================================
        // 2. GET NON-SCHEME DATA (from t_monthly_portfolio_snapshots)
        // These are assumption-based values from investment plans (GOLD, FD, etc.)
        // ================================================================
        const nonSchemeQuery = `
          SELECT
            mps.asset_type_code,
            SUM(mps.total_invested) as total_invested,
            SUM(mps.current_value) as current_value,
            SUM(mps.total_returns) as total_returns,
            COUNT(DISTINCT mps.investment_plan_id) as plan_count,
            MAX(mps.calculation_method) as calculation_method
          FROM t_monthly_portfolio_snapshots mps
          WHERE mps.tenant_id = $1
            AND mps.is_live = $2
            AND mps.customer_id = ANY($3)
            AND mps.snapshot_month_end = $4
            AND mps.asset_type_code IN (SELECT UNNEST($5::text[]))
          GROUP BY mps.asset_type_code
          ORDER BY SUM(mps.current_value) DESC
        `;

        const nonSchemeResult = await this.db.query(nonSchemeQuery, [
          tenantId,
          isLive,
          customerIds,
          asOfDate,
          nonSchemeAssetTypes
        ]);

        for (const row of nonSchemeResult.rows) {
          const invested = parseFloat(row.total_invested) || 0;
          const value = parseFloat(row.current_value) || 0;
          const returns = parseFloat(row.total_returns) || 0;
          const planCount = parseInt(row.plan_count) || 0;

          totalNetworth += value;
          totalInvested += invested;
          totalReturns += returns;
          totalPlans += planCount;

          const assetType = assetTypes.find(at => at.asset_type_code === row.asset_type_code);

          byAssetType.push({
            asset_type_code: row.asset_type_code,
            asset_type_name: assetType?.asset_type_name || row.asset_type_code,
            total_invested: invested,
            current_value: value,
            total_returns: returns,
            return_percentage: invested > 0 ? (returns / invested) * 100 : 0,
            allocation_percentage: 0, // Will calculate after we have total
            plan_count: planCount,
            calculation_method: row.calculation_method as 'NAV' | 'ASSUMPTION' | 'MIXED'
          });
        }
      }

      // Sort by current value descending
      byAssetType.sort((a, b) => b.current_value - a.current_value);

      // Calculate allocation percentages
      byAssetType.forEach(asset => {
        asset.allocation_percentage = totalNetworth > 0
          ? (asset.current_value / totalNetworth) * 100
          : 0;
      });

      // Build chart data
      const chartData = {
        labels: byAssetType.map(a => a.asset_type_name),
        values: byAssetType.map(a => a.current_value),
        colors: byAssetType.map(a => getAssetTypeColor(a.asset_type_code))
      };

      const overallReturnPercentage = totalInvested > 0
        ? (totalReturns / totalInvested) * 100
        : 0;

      // Return empty response if no data at all
      if (byAssetType.length === 0) {
        return this.buildEmptySummaryResponse(request, customerName);
      }

      return {
        customer_id: request.customer_id,
        customer_name: customerName,
        family_head_iwellcode: request.family_head_iwellcode,
        family_member_count: familyMemberCount,
        as_of_date: asOfDate || new Date(),
        total_networth: Math.round(totalNetworth * 100) / 100,
        total_invested: Math.round(totalInvested * 100) / 100,
        total_returns: Math.round(totalReturns * 100) / 100,
        overall_return_percentage: Math.round(overallReturnPercentage * 100) / 100,
        by_asset_type: byAssetType,
        asset_type_count: byAssetType.length,
        total_investment_plans: totalPlans,
        chart_data: chartData
      };

    } catch (error: any) {
      console.error('[NetworthService] Error getting summary:', error);
      throw new Error(`Failed to get networth summary: ${error.message}`);
    }
  }

  // ==================== HISTORY API ====================

  /**
   * GET /api/networth/history
   * Get historical timeline aggregated by month
   * Now includes current real-time MF values as the latest data point
   */
  async getNetworthHistory(
    tenantId: number,
    isLive: boolean,
    request: NetworthHistoryRequest
  ): Promise<NetworthHistoryResponse> {
    try {
      // Determine customer IDs to aggregate
      let customerIds: number[] = [];

      if (request.family_head_iwellcode) {
        const familyMembers = await this.getFamilyMembers(
          tenantId,
          isLive,
          request.family_head_iwellcode
        );
        customerIds = familyMembers.map(m => m.customer_id);
      } else if (request.customer_id) {
        customerIds = [request.customer_id];
      } else {
        throw new Error('Either customer_id or family_head_iwellcode is required');
      }

      if (customerIds.length === 0) {
        throw new Error('No customers found for the given criteria');
      }

      // Get asset type master for names
      const assetTypes = await this.getAssetTypeMaster();

      // Build date filter
      let dateFilter = '';
      const params: any[] = [tenantId, isLive, customerIds];
      let paramIndex = 4;

      if (request.start_date) {
        dateFilter += ` AND mps.snapshot_month_end >= $${paramIndex}`;
        params.push(request.start_date);
        paramIndex++;
      }

      if (request.end_date) {
        dateFilter += ` AND mps.snapshot_month_end <= $${paramIndex}`;
        params.push(request.end_date);
        paramIndex++;
      }

      // Query for aggregated history by month from snapshots
      const historyQuery = `
        SELECT
          mps.snapshot_month_end,
          SUM(mps.total_invested) as total_invested,
          SUM(mps.current_value) as current_value,
          SUM(mps.total_returns) as total_returns
        FROM t_monthly_portfolio_snapshots mps
        WHERE mps.tenant_id = $1
          AND mps.is_live = $2
          AND mps.customer_id = ANY($3)
          ${dateFilter}
        GROUP BY mps.snapshot_month_end
        ORDER BY mps.snapshot_month_end ASC
      `;

      const historyResult = await this.db.query(historyQuery, params);

      // Query for breakdown by asset type per month (for stacked charts)
      const breakdownQuery = `
        SELECT
          mps.snapshot_month_end,
          mps.asset_type_code,
          SUM(mps.current_value) as current_value
        FROM t_monthly_portfolio_snapshots mps
        WHERE mps.tenant_id = $1
          AND mps.is_live = $2
          AND mps.customer_id = ANY($3)
          ${dateFilter}
        GROUP BY mps.snapshot_month_end, mps.asset_type_code
        ORDER BY mps.snapshot_month_end ASC, mps.asset_type_code
      `;

      const breakdownResult = await this.db.query(breakdownQuery, params);

      // Build breakdown map: date -> asset_type -> value
      const breakdownMap = new Map<string, Map<string, number>>();
      const allAssetTypes = new Set<string>();

      breakdownResult.rows.forEach(row => {
        const dateKey = row.snapshot_month_end.toISOString().split('T')[0];
        if (!breakdownMap.has(dateKey)) {
          breakdownMap.set(dateKey, new Map());
        }
        breakdownMap.get(dateKey)!.set(row.asset_type_code, parseFloat(row.current_value) || 0);
        allAssetTypes.add(row.asset_type_code);
      });

      // Build history points from snapshots
      const history: NetworthHistoryPoint[] = historyResult.rows.map(row => {
        const dateKey = row.snapshot_month_end.toISOString().split('T')[0];
        const invested = parseFloat(row.total_invested) || 0;
        const value = parseFloat(row.current_value) || 0;
        const returns = parseFloat(row.total_returns) || 0;

        // Get breakdown for this date
        const dateBreakdown = breakdownMap.get(dateKey);
        const byAssetType = dateBreakdown
          ? Array.from(dateBreakdown.entries()).map(([code, val]) => ({
              asset_type_code: code,
              current_value: val
            }))
          : [];

        return {
          date: dateKey,
          snapshot_month_end: row.snapshot_month_end,
          total_networth: value,
          total_invested: invested,
          total_returns: returns,
          return_percentage: invested > 0 ? (returns / invested) * 100 : 0,
          by_asset_type: byAssetType
        };
      });

      // ================================================================
      // IMPORTANT: Add current real-time data as the latest point
      // This ensures imported MF transactions are reflected immediately
      // ================================================================
      const currentSummary = await this.getNetworthSummary(tenantId, isLive, {
        customer_id: request.customer_id,
        family_head_iwellcode: request.family_head_iwellcode
      });

      if (currentSummary.total_networth > 0) {
        const now = new Date();
        const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        const currentDateKey = currentMonthEnd.toISOString().split('T')[0];

        // Check if we already have data for the current month
        const lastHistoryDate = history.length > 0 ? history[history.length - 1].date : null;
        const shouldAddCurrentPoint = !lastHistoryDate ||
          new Date(lastHistoryDate) < new Date(currentMonthEnd.getFullYear(), currentMonthEnd.getMonth(), 1);

        if (shouldAddCurrentPoint) {
          // Add current point with real-time values
          const currentBreakdown = currentSummary.by_asset_type.map(at => ({
            asset_type_code: at.asset_type_code,
            current_value: at.current_value
          }));

          history.push({
            date: currentDateKey,
            snapshot_month_end: currentMonthEnd,
            total_networth: currentSummary.total_networth,
            total_invested: currentSummary.total_invested,
            total_returns: currentSummary.total_returns,
            return_percentage: currentSummary.overall_return_percentage,
            by_asset_type: currentBreakdown
          });

          // Update breakdown map for chart
          const currentBreakdownMap = new Map<string, number>();
          currentSummary.by_asset_type.forEach(at => {
            currentBreakdownMap.set(at.asset_type_code, at.current_value);
            allAssetTypes.add(at.asset_type_code);
          });
          breakdownMap.set(currentDateKey, currentBreakdownMap);
        } else {
          // Update the last point with real-time scheme-based values (in case data was imported)
          const lastPoint = history[history.length - 1];
          const nonSchemeAssetTypes = ['GOLD', 'SILVER', 'EQUITY', 'FD', 'PPF', 'EPF', 'NPS', 'REAL_ESTATE', 'INSURANCE', 'NSC', 'BONDS', 'OTHER', 'Growth'];

          // Get all scheme categories from current summary (not in non-scheme list)
          const schemeCategories = currentSummary.by_asset_type
            .filter(at => !nonSchemeAssetTypes.includes(at.asset_type_code))
            .map(at => at.asset_type_code);

          // Update each scheme category in the last point with current values
          for (const schemeCategory of schemeCategories) {
            const schemeSummary = currentSummary.by_asset_type.find(at => at.asset_type_code === schemeCategory);
            if (schemeSummary) {
              // Find and update scheme category in by_asset_type
              const schemeIndex = lastPoint.by_asset_type.findIndex(at => at.asset_type_code === schemeCategory);
              const oldValue = schemeIndex >= 0 ? lastPoint.by_asset_type[schemeIndex].current_value : 0;

              if (schemeIndex >= 0) {
                lastPoint.by_asset_type[schemeIndex].current_value = schemeSummary.current_value;
              } else {
                lastPoint.by_asset_type.push({
                  asset_type_code: schemeCategory,
                  current_value: schemeSummary.current_value
                });
              }

              // Update totals
              lastPoint.total_networth = lastPoint.total_networth - oldValue + schemeSummary.current_value;
              lastPoint.total_invested = lastPoint.total_invested - (oldValue > 0 ? oldValue : 0) + schemeSummary.total_invested;
              lastPoint.total_returns = lastPoint.total_networth - lastPoint.total_invested;
              lastPoint.return_percentage = lastPoint.total_invested > 0
                ? (lastPoint.total_returns / lastPoint.total_invested) * 100
                : 0;

              // Update breakdown map
              const lastDateKey = lastPoint.date;
              if (breakdownMap.has(lastDateKey)) {
                breakdownMap.get(lastDateKey)!.set(schemeCategory, schemeSummary.current_value);
              }
              allAssetTypes.add(schemeCategory);
            }
          }
        }
      }

      // Calculate growth metrics
      const startingNetworth = history.length > 0 ? history[0].total_networth : 0;
      const endingNetworth = history.length > 0 ? history[history.length - 1].total_networth : 0;
      const absoluteGrowth = endingNetworth - startingNetworth;
      const percentageGrowth = startingNetworth > 0
        ? (absoluteGrowth / startingNetworth) * 100
        : 0;

      // Build chart-ready data
      const dates = history.map(h => h.date);
      const networthValues = history.map(h => h.total_networth);
      const investedValues = history.map(h => h.total_invested);

      // Get earliest start dates for each asset type from investment plans
      const startDateQuery = `
        SELECT
          atm.asset_type_code,
          MIN(caa.start_date) as earliest_start_date
        FROM t_customer_asset_assignments caa
        JOIN m_asset_types atm ON caa.asset_type_id = atm.id
        WHERE caa.tenant_id = $1
          AND caa.is_live = $2
          AND caa.customer_id = ANY($3)
          AND caa.is_active = true
        GROUP BY atm.asset_type_code
      `;
      const startDateResult = await this.db.query(startDateQuery, [tenantId, isLive, customerIds]);

      // Build map of asset_type_code -> earliest start date
      const assetStartDates = new Map<string, Date>();
      startDateResult.rows.forEach(row => {
        if (row.earliest_start_date) {
          assetStartDates.set(row.asset_type_code, new Date(row.earliest_start_date));
        }
      });

      // Build asset type series for stacked chart
      // Each asset type only includes dates from its actual start date
      const assetTypeSeries = Array.from(allAssetTypes).map(code => {
        const assetType = assetTypes.find(at => at.asset_type_code === code);

        // Get all values for this asset type
        const allValues = dates.map(date => {
          const dateBreakdown = breakdownMap.get(date);
          return dateBreakdown?.get(code) || 0;
        });

        // Get earliest start date for this asset type
        const earliestStartDate = assetStartDates.get(code);
        const nonSchemeAssetTypes = ['GOLD', 'SILVER', 'EQUITY', 'FD', 'PPF', 'EPF', 'NPS', 'REAL_ESTATE', 'INSURANCE', 'NSC', 'BONDS', 'OTHER', 'Growth'];

        // Find the first index where date >= start date
        let firstValidIndex = 0;
        const isSchemeCategory = !nonSchemeAssetTypes.includes(code);
        if (isSchemeCategory) {
          // For scheme-based assets (all scheme categories), use first non-zero value (has actual transactions)
          firstValidIndex = allValues.findIndex(v => v >= 100);
          if (firstValidIndex === -1) firstValidIndex = dates.length;
        } else if (earliestStartDate) {
          // For non-scheme assets, use the investment plan start date
          const startMonth = new Date(earliestStartDate.getFullYear(), earliestStartDate.getMonth(), 1);
          firstValidIndex = dates.findIndex(d => new Date(d) >= startMonth);
          if (firstValidIndex === -1) firstValidIndex = dates.length; // No valid dates
        }

        // If no valid data, return empty
        if (firstValidIndex >= dates.length) {
          return {
            asset_type_code: code,
            asset_type_name: assetType?.asset_type_name || code,
            values: [],
            dates: [],
            color: getAssetTypeColor(code)
          };
        }

        // Only include dates from when this asset type actually started
        const filteredDates = dates.slice(firstValidIndex);
        const filteredValues = allValues.slice(firstValidIndex);

        return {
          asset_type_code: code,
          asset_type_name: assetType?.asset_type_name || code,
          values: filteredValues,
          dates: filteredDates,  // Asset-specific dates
          color: getAssetTypeColor(code)
        };
      });

      return {
        customer_id: request.customer_id,
        family_head_iwellcode: request.family_head_iwellcode,
        history,
        start_date: history.length > 0 ? history[0].snapshot_month_end : new Date(),
        end_date: history.length > 0 ? history[history.length - 1].snapshot_month_end : new Date(),
        data_points: history.length,
        starting_networth: Math.round(startingNetworth * 100) / 100,
        ending_networth: Math.round(endingNetworth * 100) / 100,
        absolute_growth: Math.round(absoluteGrowth * 100) / 100,
        percentage_growth: Math.round(percentageGrowth * 100) / 100,
        chart_ready: {
          dates,
          networth_values: networthValues,
          invested_values: investedValues,
          by_asset_type: assetTypeSeries
        }
      };

    } catch (error: any) {
      console.error('[NetworthService] Error getting history:', error);
      throw new Error(`Failed to get networth history: ${error.message}`);
    }
  }

  // ==================== BREAKDOWN API ====================

  /**
   * GET /api/networth/breakdown
   * Get per-asset-type details with individual investment plans
   */
  async getNetworthBreakdown(
    tenantId: number,
    isLive: boolean,
    request: NetworthBreakdownRequest
  ): Promise<NetworthBreakdownResponse> {
    try {
      // Determine customer IDs to aggregate
      let customerIds: number[] = [];
      let customerName: string | undefined;

      if (request.family_head_iwellcode) {
        const familyMembers = await this.getFamilyMembers(
          tenantId,
          isLive,
          request.family_head_iwellcode
        );
        customerIds = familyMembers.map(m => m.customer_id);
      } else if (request.customer_id) {
        customerIds = [request.customer_id];
        customerName = await this.getCustomerName(request.customer_id, tenantId, isLive);
      } else {
        throw new Error('Either customer_id or family_head_iwellcode is required');
      }

      if (customerIds.length === 0) {
        throw new Error('No customers found for the given criteria');
      }

      // Get the as_of_date
      const asOfDate = request.as_of_date || await this.getLatestSnapshotDate(
        tenantId,
        isLive,
        customerIds
      );

      if (!asOfDate) {
        return {
          customer_id: request.customer_id,
          customer_name: customerName,
          family_head_iwellcode: request.family_head_iwellcode,
          as_of_date: new Date(),
          total_networth: 0,
          total_invested: 0,
          breakdown: [],
          total_asset_types: 0,
          total_investment_plans: 0
        };
      }

      // Get asset type master data
      const assetTypes = await this.getAssetTypeMaster();

      // Build asset type filter
      let assetTypeFilter = '';
      const params: any[] = [tenantId, isLive, customerIds, asOfDate];

      if (request.asset_type_codes && request.asset_type_codes.length > 0) {
        assetTypeFilter = ` AND mps.asset_type_code = ANY($5)`;
        params.push(request.asset_type_codes);
      }

      // Query for detailed snapshots with investment plan info
      const detailQuery = `
        SELECT
          mps.asset_type_code,
          mps.investment_plan_id,
          mps.total_invested,
          mps.current_value,
          mps.total_returns,
          mps.return_percentage,
          mps.calculation_method,
          mps.growth_rate_applied,
          caa.notes as plan_name,
          caa.start_date,
          caa.investment_type,
          caa.principal_amount,
          at.asset_type_name
        FROM t_monthly_portfolio_snapshots mps
        LEFT JOIN t_customer_asset_assignments caa ON mps.investment_plan_id = caa.id
        LEFT JOIN m_asset_types at ON caa.asset_type_id = at.id
        WHERE mps.tenant_id = $1
          AND mps.is_live = $2
          AND mps.customer_id = ANY($3)
          AND mps.snapshot_month_end = $4
          ${assetTypeFilter}
        ORDER BY mps.asset_type_code, mps.current_value DESC
      `;

      const detailResult = await this.db.query(detailQuery, params);

      // Group by asset type
      const assetTypeMap = new Map<string, {
        total_invested: number;
        current_value: number;
        total_returns: number;
        plans: InvestmentPlanDetail[];
      }>();

      let totalNetworth = 0;
      let totalInvested = 0;

      detailResult.rows.forEach(row => {
        const code = row.asset_type_code;
        const invested = parseFloat(row.total_invested) || 0;
        const value = parseFloat(row.current_value) || 0;
        const returns = parseFloat(row.total_returns) || 0;

        if (!assetTypeMap.has(code)) {
          assetTypeMap.set(code, {
            total_invested: 0,
            current_value: 0,
            total_returns: 0,
            plans: []
          });
        }

        const assetData = assetTypeMap.get(code)!;
        assetData.total_invested += invested;
        assetData.current_value += value;
        assetData.total_returns += returns;

        totalNetworth += value;
        totalInvested += invested;

        // Add plan details (if investment_plan_id exists)
        if (row.investment_plan_id) {
          const assetType = assetTypes.find(at => at.asset_type_code === code);
          assetData.plans.push({
            investment_plan_id: row.investment_plan_id,
            plan_name: row.plan_name || row.asset_type_name || `${code} Investment`,
            asset_type_code: code,
            asset_type_name: assetType?.asset_type_name || row.asset_type_name || code,
            principal_amount: parseFloat(row.principal_amount) || invested,
            current_value: value,
            total_returns: returns,
            return_percentage: parseFloat(row.return_percentage) || 0,
            growth_rate_applied: row.growth_rate_applied ? parseFloat(row.growth_rate_applied) : null,
            calculation_method: row.calculation_method as 'NAV' | 'ASSUMPTION',
            start_date: row.start_date,
            investment_type: row.investment_type || 'one_time'
          });
        }
      });

      // Build breakdown array
      const breakdown: AssetTypeBreakdown[] = Array.from(assetTypeMap.entries()).map(([code, data]) => {
        const assetType = assetTypes.find(at => at.asset_type_code === code);
        return {
          asset_type_code: code,
          asset_type_name: assetType?.asset_type_name || code,
          total_invested: Math.round(data.total_invested * 100) / 100,
          current_value: Math.round(data.current_value * 100) / 100,
          total_returns: Math.round(data.total_returns * 100) / 100,
          return_percentage: data.total_invested > 0
            ? Math.round((data.total_returns / data.total_invested) * 10000) / 100
            : 0,
          allocation_percentage: totalNetworth > 0
            ? Math.round((data.current_value / totalNetworth) * 10000) / 100
            : 0,
          default_assumption_rate: assetType?.default_assumption_rate || 0,
          investment_plans: data.plans
        };
      });

      // Sort by current value descending
      breakdown.sort((a, b) => b.current_value - a.current_value);

      const totalPlans = breakdown.reduce((sum, b) => sum + b.investment_plans.length, 0);

      return {
        customer_id: request.customer_id,
        customer_name: customerName,
        family_head_iwellcode: request.family_head_iwellcode,
        as_of_date: asOfDate,
        total_networth: Math.round(totalNetworth * 100) / 100,
        total_invested: Math.round(totalInvested * 100) / 100,
        breakdown,
        total_asset_types: breakdown.length,
        total_investment_plans: totalPlans
      };

    } catch (error: any) {
      console.error('[NetworthService] Error getting breakdown:', error);
      throw new Error(`Failed to get networth breakdown: ${error.message}`);
    }
  }

  // ==================== GOALS API ====================

  /**
   * GET /api/networth/goals
   * Get goal achievability data
   */
  async getNetworthGoals(
    tenantId: number,
    isLive: boolean,
    request: NetworthGoalsRequest
  ): Promise<NetworthGoalsResponse> {
    try {
      // Determine customer IDs
      let customerIds: number[] = [];

      if (request.family_head_iwellcode) {
        const familyMembers = await this.getFamilyMembers(
          tenantId,
          isLive,
          request.family_head_iwellcode
        );
        customerIds = familyMembers.map(m => m.customer_id);
      } else if (request.customer_id) {
        customerIds = [request.customer_id];
      } else {
        throw new Error('Either customer_id or family_head_iwellcode is required');
      }

      if (customerIds.length === 0) {
        throw new Error('No customers found for the given criteria');
      }

      const projectionYears = request.projection_years || 10;
      const projectionDate = new Date();
      projectionDate.setFullYear(projectionDate.getFullYear() + projectionYears);

      // Get current networth
      const summaryRequest: NetworthSummaryRequest = {
        customer_id: request.customer_id,
        family_head_iwellcode: request.family_head_iwellcode
      };

      const currentSummary = await this.getNetworthSummary(tenantId, isLive, summaryRequest);
      const currentNetworth = currentSummary.total_networth;

      // Get goals for these customers
      // Goals are stored in t_jtbd_configurations with jtbd_type = 'goal_tracking'
      // Goal data is in config_data JSONB column
      const goalsQuery = `
        SELECT
          g.id as goal_id,
          g.title as goal_name,
          (g.config_data->>'target_corpus')::numeric as target_amount,
          (g.config_data->>'target_date')::date as target_date,
          (g.config_data->>'current_value')::numeric as allocated_value,
          COALESCE((g.config_data->>'assumption_rate')::numeric, 8) as assumption_rate,
          g.customer_id
        FROM t_jtbd_configurations g
        WHERE g.tenant_id = $1
          AND g.is_live = $2
          AND g.customer_id = ANY($3)
          AND g.jtbd_type = 'goal_tracking'
          AND g.is_active = true
        ORDER BY (g.config_data->>'target_date')::date ASC NULLS LAST
      `;

      const goalsResult = await this.db.query(goalsQuery, [tenantId, isLive, customerIds]);

      // Calculate achievability for each goal
      const goals: GoalAchievability[] = [];
      let goalsOnTrack = 0;
      let goalsAtRisk = 0;
      let goalsBehind = 0;
      let totalTargetAmount = 0;
      let totalProjectedAmount = 0;

      for (const row of goalsResult.rows) {
        const targetAmount = parseFloat(row.target_amount) || 0;
        const currentAllocated = parseFloat(row.allocated_value) || 0;
        const assumptionRate = (parseFloat(row.assumption_rate) || 8) / 100;
        const targetDate = new Date(row.target_date);

        // Calculate years to target
        const yearsToTarget = Math.max(0,
          (targetDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 365.25)
        );

        // Project value at target date
        const projectedValue = currentAllocated * Math.pow(1 + assumptionRate, yearsToTarget);

        // Calculate achievability
        const achievabilityPercentage = targetAmount > 0
          ? (projectedValue / targetAmount) * 100
          : 100;

        const shortfallOrSurplus = projectedValue - targetAmount;

        // Determine status
        let status: 'on_track' | 'at_risk' | 'behind' | 'ahead';
        if (achievabilityPercentage >= 100) {
          status = 'ahead';
          goalsOnTrack++;
        } else if (achievabilityPercentage >= 90) {
          status = 'on_track';
          goalsOnTrack++;
        } else if (achievabilityPercentage >= 70) {
          status = 'at_risk';
          goalsAtRisk++;
        } else {
          status = 'behind';
          goalsBehind++;
        }

        totalTargetAmount += targetAmount;
        totalProjectedAmount += projectedValue;

        // Get contributing assets (simplified - uses overall allocation)
        const contributingAssets = currentSummary.by_asset_type.map(asset => ({
          asset_type_code: asset.asset_type_code,
          current_value: asset.current_value * (currentAllocated / currentNetworth || 0),
          projected_value: asset.current_value * (currentAllocated / currentNetworth || 0)
            * Math.pow(1 + assumptionRate, yearsToTarget)
        }));

        goals.push({
          goal_id: row.goal_id,
          goal_name: row.goal_name,
          target_amount: Math.round(targetAmount * 100) / 100,
          target_date: targetDate,
          current_allocated_value: Math.round(currentAllocated * 100) / 100,
          projected_value_at_target: Math.round(projectedValue * 100) / 100,
          shortfall_or_surplus: Math.round(shortfallOrSurplus * 100) / 100,
          achievability_percentage: Math.round(achievabilityPercentage * 100) / 100,
          status,
          contributing_assets: contributingAssets
        });
      }

      // Calculate projected networth (weighted average of all asset growth)
      const avgGrowthRate = 0.08; // Default 8% if no specific rates
      const projectedNetworth = currentNetworth * Math.pow(1 + avgGrowthRate, projectionYears);

      const overallAchievability = totalTargetAmount > 0
        ? (totalProjectedAmount / totalTargetAmount) * 100
        : 100;

      return {
        customer_id: request.customer_id,
        family_head_iwellcode: request.family_head_iwellcode,
        projection_date: projectionDate,
        current_networth: Math.round(currentNetworth * 100) / 100,
        projected_networth: Math.round(projectedNetworth * 100) / 100,
        goals,
        total_goals: goals.length,
        goals_on_track: goalsOnTrack,
        goals_at_risk: goalsAtRisk,
        goals_behind: goalsBehind,
        total_target_amount: Math.round(totalTargetAmount * 100) / 100,
        total_projected_amount: Math.round(totalProjectedAmount * 100) / 100,
        overall_achievability_percentage: Math.round(overallAchievability * 100) / 100
      };

    } catch (error: any) {
      console.error('[NetworthService] Error getting goals:', error);
      throw new Error(`Failed to get networth goals: ${error.message}`);
    }
  }

  // ==================== HELPER METHODS ====================

  /**
   * Get family members for a family head
   */
  private async getFamilyMembers(
    tenantId: number,
    isLive: boolean,
    familyHeadIwellCode: string
  ): Promise<FamilyMemberForNetworth[]> {
    const query = `
      SELECT
        cu.id as customer_id,
        c.name as customer_name,
        CASE WHEN cu.iwell_code = $3 THEN true ELSE false END as is_family_head
      FROM t_customers cu
      JOIN t_contacts c ON cu.contact_id = c.id
      WHERE cu.tenant_id = $1
        AND cu.is_live = $2
        AND cu.is_active = true
        AND (cu.iwell_code = $3 OR cu.family_head_iwell_code = $3)
      ORDER BY is_family_head DESC, c.name ASC
    `;

    const result = await this.db.query(query, [tenantId, isLive, familyHeadIwellCode]);
    return result.rows;
  }

  /**
   * Get customer name by ID
   */
  private async getCustomerName(
    customerId: number,
    tenantId: number,
    isLive: boolean
  ): Promise<string | undefined> {
    const query = `
      SELECT c.name
      FROM t_customers cu
      JOIN t_contacts c ON cu.contact_id = c.id
      WHERE cu.id = $1
        AND cu.tenant_id = $2
        AND cu.is_live = $3
    `;

    const result = await this.db.query(query, [customerId, tenantId, isLive]);
    return result.rows[0]?.name;
  }

  /**
   * Get latest snapshot date for given customers
   */
  private async getLatestSnapshotDate(
    tenantId: number,
    isLive: boolean,
    customerIds: number[]
  ): Promise<Date | null> {
    const query = `
      SELECT MAX(snapshot_month_end) as latest_date
      FROM t_monthly_portfolio_snapshots
      WHERE tenant_id = $1
        AND is_live = $2
        AND customer_id = ANY($3)
    `;

    const result = await this.db.query(query, [tenantId, isLive, customerIds]);
    return result.rows[0]?.latest_date || null;
  }

  /**
   * Get asset type master data
   */
  private async getAssetTypeMaster(): Promise<AssetTypeMaster[]> {
    const query = `
      SELECT
        id,
        asset_type_code,
        asset_type_name,
        default_assumption_rate,
        display_order
      FROM m_asset_types
      WHERE is_active = true
      ORDER BY display_order ASC
    `;

    const result = await this.db.query(query);
    return result.rows;
  }

  /**
   * Build empty summary response when no data exists
   */
  private buildEmptySummaryResponse(
    request: NetworthSummaryRequest,
    customerName?: string
  ): NetworthSummaryResponse {
    return {
      customer_id: request.customer_id,
      customer_name: customerName,
      family_head_iwellcode: request.family_head_iwellcode,
      as_of_date: new Date(),
      total_networth: 0,
      total_invested: 0,
      total_returns: 0,
      overall_return_percentage: 0,
      by_asset_type: [],
      asset_type_count: 0,
      total_investment_plans: 0,
      chart_data: {
        labels: [],
        values: [],
        colors: []
      }
    };
  }
}
