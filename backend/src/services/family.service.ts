// backend/src/services/family.service.ts

import pool from '../config/database';
import type {
  FamilyMember,
  FamilyPortfolioSummary,
  FamilyMemberPortfolio,
  FamilyAssetAllocation,
  FamilyAssetCategory,
  FamilyMemberAllocation,
  FamilyGoalSummary,
  FamilyMeetingSummary
} from '../types/family.types';

export class FamilyService {
  /**
   * Get all family members for a given family head IWELL code
   */
  async getFamilyMembers(
    tenantId: number,
    isLive: boolean,
    familyHeadIwellCode: string
  ): Promise<FamilyMember[]> {
    const query = `
      SELECT
        c.id as customer_id,
        c.contact_id,
        ct.name,
        c.iwell_code,
        c.family_head_name,
        c.family_head_iwell_code,
        c.onboarding_status,
        c.created_at,
        CASE
          WHEN c.iwell_code = $3 THEN true
          ELSE false
        END as is_family_head,
        -- Get email
        (SELECT channel_value
         FROM t_contact_channels
         WHERE contact_id = c.contact_id
           AND channel_type = 'email'
           AND is_active = true
         LIMIT 1) as email,
        -- Get mobile
        (SELECT channel_value
         FROM t_contact_channels
         WHERE contact_id = c.contact_id
           AND channel_type = 'mobile'
           AND is_active = true
         LIMIT 1) as mobile
      FROM t_customers c
      JOIN t_contacts ct ON c.contact_id = ct.id
      WHERE c.tenant_id = $1
        AND c.is_live = $2
        AND (c.family_head_iwell_code = $3 OR c.iwell_code = $3)
      ORDER BY is_family_head DESC, ct.name ASC
    `;

    const result = await pool.query(query, [tenantId, isLive, familyHeadIwellCode]);
    return result.rows;
  }

  /**
   * Get aggregated portfolio summary for entire family
   */
  async getFamilyPortfolioSummary(
    tenantId: number,
    isLive: boolean,
    familyHeadIwellCode: string
  ): Promise<FamilyPortfolioSummary> {
    // Get family members
    const members = await this.getFamilyMembers(tenantId, isLive, familyHeadIwellCode);

    if (members.length === 0) {
      throw new Error('No family members found');
    }

    const familyHead = members.find((m) => m.is_family_head);

    // Get portfolio data for each member
    const customerIds = members.map((m) => m.customer_id);

    // Query portfolio totals - aggregate by customer to avoid duplicates
    const portfolioQuery = `
      SELECT
        cpt.customer_id,
        ct.name,
        c.iwell_code,
        CASE WHEN c.iwell_code = $3 THEN true ELSE false END as is_family_head,
        SUM(cpt.total_invested) as total_invested,
        SUM(cpt.current_value) as current_value,
        SUM(cpt.total_returns) as total_returns,
        CASE
          WHEN SUM(cpt.total_invested) > 0
          THEN (SUM(cpt.total_returns) / SUM(cpt.total_invested)) * 100
          ELSE 0
        END as return_percentage,
        COUNT(DISTINCT cpt.scheme_code) as scheme_count
      FROM t_customer_portfolio_totals cpt
      JOIN t_customers c ON cpt.customer_id = c.id
      JOIN t_contacts ct ON c.contact_id = ct.id
      WHERE cpt.tenant_id = $1
        AND cpt.is_live = $2
        AND cpt.customer_id = ANY($4)
      GROUP BY
        cpt.customer_id, ct.name, c.iwell_code, is_family_head
      ORDER BY is_family_head DESC, ct.name ASC
    `;

    const portfolioResult = await pool.query(portfolioQuery, [
      tenantId,
      isLive,
      familyHeadIwellCode,
      customerIds
    ]);

    const memberPortfolios: FamilyMemberPortfolio[] = portfolioResult.rows;

    // Calculate totals
    const totalInvested = memberPortfolios.reduce((sum, m) => sum + Number(m.total_invested), 0);
    const totalCurrentValue = memberPortfolios.reduce((sum, m) => sum + Number(m.current_value), 0);
    const totalReturns = totalCurrentValue - totalInvested;
    const totalReturnPercentage = totalInvested > 0 ? (totalReturns / totalInvested) * 100 : 0;

    // Add portfolio percentage for each member
    const membersWithPercentage = memberPortfolios.map((m) => ({
      ...m,
      portfolio_percentage: totalCurrentValue > 0 ? (Number(m.current_value) / totalCurrentValue) * 100 : 0
    }));

    return {
      family_head_iwell_code: familyHeadIwellCode,
      family_head_name: familyHead?.name || 'Unknown',
      total_members: members.length,
      total_invested: totalInvested,
      total_current_value: totalCurrentValue,
      total_returns: totalReturns,
      total_return_percentage: totalReturnPercentage,
      day_change: 0, // TODO: Implement daily change calculation
      day_change_percentage: 0,
      members: membersWithPercentage
    };
  }

  /**
   * Get family-wide asset allocation
   * Uses t_customer_portfolio_totals for MF (real-time NAV) + t_monthly_portfolio_snapshots for non-MF
   */
  async getFamilyAssetAllocation(
    tenantId: number,
    isLive: boolean,
    familyHeadIwellCode: string
  ): Promise<FamilyAssetAllocation> {
    // Get family members
    const members = await this.getFamilyMembers(tenantId, isLive, familyHeadIwellCode);
    const customerIds = members.map((m) => m.customer_id);

    if (customerIds.length === 0) {
      return {
        family_head_iwell_code: familyHeadIwellCode,
        total_value: 0,
        allocations: [],
        by_member: []
      };
    }

    const allocations: FamilyAssetCategory[] = [];
    const byMemberMap = new Map<number, FamilyMemberAllocation>();
    let totalValue = 0;

    // ================================================================
    // 1. GET MF DATA from t_customer_portfolio_totals (real-time NAV)
    // ================================================================
    const mfQuery = `
      SELECT
        'MF' as category,
        SUM(cpt.current_value) as value,
        COUNT(DISTINCT cpt.scheme_code) as scheme_count
      FROM t_customer_portfolio_totals cpt
      WHERE cpt.tenant_id = $1
        AND cpt.is_live = $2
        AND cpt.customer_id = ANY($3)
        AND cpt.current_value > 0
    `;
    const mfResult = await pool.query(mfQuery, [tenantId, isLive, customerIds]);

    if (mfResult.rows.length > 0 && mfResult.rows[0].value) {
      const mfValue = parseFloat(mfResult.rows[0].value) || 0;
      if (mfValue > 0) {
        allocations.push({
          category: 'Mutual Funds',
          value: mfValue,
          percentage: 0, // Will calculate after we have total
          scheme_count: parseInt(mfResult.rows[0].scheme_count) || 0
        });
        totalValue += mfValue;
      }
    }

    // Get MF allocation by member
    const mfMemberQuery = `
      SELECT
        cpt.customer_id,
        ct.name,
        c.iwell_code,
        'Mutual Funds' as category,
        SUM(cpt.current_value) as value
      FROM t_customer_portfolio_totals cpt
      JOIN t_customers c ON cpt.customer_id = c.id
      JOIN t_contacts ct ON c.contact_id = ct.id
      WHERE cpt.tenant_id = $1
        AND cpt.is_live = $2
        AND cpt.customer_id = ANY($3)
        AND cpt.current_value > 0
      GROUP BY cpt.customer_id, ct.name, c.iwell_code
      ORDER BY ct.name
    `;
    const mfMemberResult = await pool.query(mfMemberQuery, [tenantId, isLive, customerIds]);

    mfMemberResult.rows.forEach((row) => {
      if (!byMemberMap.has(row.customer_id)) {
        byMemberMap.set(row.customer_id, {
          customer_id: row.customer_id,
          name: row.name,
          iwell_code: row.iwell_code,
          allocations: []
        });
      }
      const member = byMemberMap.get(row.customer_id)!;
      member.allocations.push({
        category: row.category,
        value: parseFloat(row.value) || 0,
        percentage: 0 // Will calculate later
      });
    });

    // ================================================================
    // 2. GET NON-MF DATA from t_monthly_portfolio_snapshots
    // ================================================================
    const latestDateQuery = `
      SELECT MAX(snapshot_month_end) as latest_date
      FROM t_monthly_portfolio_snapshots
      WHERE tenant_id = $1 AND is_live = $2 AND customer_id = ANY($3)
        AND asset_type_code != 'MF'
    `;
    const latestDateResult = await pool.query(latestDateQuery, [tenantId, isLive, customerIds]);
    const latestDate = latestDateResult.rows[0]?.latest_date;

    if (latestDate) {
      const nonMfQuery = `
        SELECT
          COALESCE(mps.asset_type_code, 'Other') as category,
          SUM(mps.current_value) as value,
          COUNT(DISTINCT mps.investment_plan_id) as scheme_count
        FROM t_monthly_portfolio_snapshots mps
        WHERE mps.tenant_id = $1
          AND mps.is_live = $2
          AND mps.customer_id = ANY($3)
          AND mps.snapshot_month_end = $4
          AND mps.asset_type_code != 'MF'
          AND mps.current_value > 0
        GROUP BY COALESCE(mps.asset_type_code, 'Other')
        ORDER BY value DESC
      `;
      const nonMfResult = await pool.query(nonMfQuery, [tenantId, isLive, customerIds, latestDate]);

      nonMfResult.rows.forEach((row) => {
        const value = parseFloat(row.value) || 0;
        if (value > 0) {
          allocations.push({
            category: row.category || 'Other',
            value: value,
            percentage: 0,
            scheme_count: parseInt(row.scheme_count) || 0
          });
          totalValue += value;
        }
      });

      // Get non-MF allocation by member
      const nonMfMemberQuery = `
        SELECT
          mps.customer_id,
          ct.name,
          c.iwell_code,
          COALESCE(mps.asset_type_code, 'Other') as category,
          SUM(mps.current_value) as value
        FROM t_monthly_portfolio_snapshots mps
        JOIN t_customers c ON mps.customer_id = c.id
        JOIN t_contacts ct ON c.contact_id = ct.id
        WHERE mps.tenant_id = $1
          AND mps.is_live = $2
          AND mps.customer_id = ANY($3)
          AND mps.snapshot_month_end = $4
          AND mps.asset_type_code != 'MF'
          AND mps.current_value > 0
        GROUP BY mps.customer_id, ct.name, c.iwell_code, COALESCE(mps.asset_type_code, 'Other')
        ORDER BY ct.name, value DESC
      `;
      const nonMfMemberResult = await pool.query(nonMfMemberQuery, [tenantId, isLive, customerIds, latestDate]);

      nonMfMemberResult.rows.forEach((row) => {
        if (!byMemberMap.has(row.customer_id)) {
          byMemberMap.set(row.customer_id, {
            customer_id: row.customer_id,
            name: row.name,
            iwell_code: row.iwell_code,
            allocations: []
          });
        }
        const member = byMemberMap.get(row.customer_id)!;
        member.allocations.push({
          category: row.category || 'Other',
          value: parseFloat(row.value) || 0,
          percentage: 0
        });
      });
    }

    // ================================================================
    // 3. CALCULATE PERCENTAGES
    // ================================================================
    // Update allocation percentages
    allocations.forEach((alloc) => {
      alloc.percentage = totalValue > 0 ? (alloc.value / totalValue) * 100 : 0;
    });

    // Sort allocations by value descending
    allocations.sort((a, b) => b.value - a.value);

    // Update member allocation percentages
    byMemberMap.forEach((member) => {
      const memberTotal = member.allocations.reduce((sum, a) => sum + a.value, 0);
      member.allocations.forEach((alloc) => {
        alloc.percentage = memberTotal > 0 ? (alloc.value / memberTotal) * 100 : 0;
      });
    });

    return {
      family_head_iwell_code: familyHeadIwellCode,
      total_value: totalValue,
      allocations,
      by_member: Array.from(byMemberMap.values())
    };
  }

  /**
   * Get family-wide goal summary
   */
  async getFamilyGoalSummary(
    tenantId: number,
    isLive: boolean,
    familyHeadIwellCode: string
  ): Promise<FamilyGoalSummary> {
    // Get family members
    const members = await this.getFamilyMembers(tenantId, isLive, familyHeadIwellCode);
    const customerIds = members.map((m) => m.customer_id);

    // Goal status is stored differently based on goal type:
    // - time_and_price: on_track (boolean)
    // - price_based: pace_status ('ahead'|'on_track'|'behind')
    // - time_based: on_track (boolean) or calculated dynamically
    const goalsQuery = `
      SELECT
        jc.customer_id,
        ct.name,
        COUNT(*) as goal_count,
        SUM(COALESCE((jc.config_data->>'target_corpus')::numeric, COALESCE((jc.config_data->>'target_amount')::numeric, 0))) as total_target,
        SUM(COALESCE((jc.config_data->>'current_value')::numeric, 0)) as current_value,
        SUM(
          CASE
            WHEN (jc.config_data->>'on_track')::boolean = true THEN 1
            WHEN (jc.config_data->>'pace_status') = 'on_track' THEN 1
            WHEN (jc.config_data->>'pace_status') = 'ahead' THEN 1
            ELSE 0
          END
        ) as on_track_count,
        SUM(
          CASE
            WHEN (jc.config_data->>'on_track')::boolean = false THEN 1
            WHEN (jc.config_data->>'pace_status') = 'behind' THEN 1
            ELSE 0
          END
        ) as behind_count,
        SUM(
          CASE
            WHEN (jc.config_data->>'pace_status') = 'ahead' THEN 1
            ELSE 0
          END
        ) as ahead_count
      FROM t_jtbd_configurations jc
      JOIN t_customers c ON jc.customer_id = c.id
      JOIN t_contacts ct ON c.contact_id = ct.id
      WHERE jc.tenant_id = $1
        AND jc.is_live = $2
        AND jc.customer_id = ANY($3)
        AND jc.jtbd_type = 'goal_tracking'
        AND jc.is_active = true
      GROUP BY jc.customer_id, ct.name
    `;

    const goalsResult = await pool.query(goalsQuery, [tenantId, isLive, customerIds]);

    const totalGoals = goalsResult.rows.reduce((sum, row) => sum + parseInt(row.goal_count), 0);
    const totalTarget = goalsResult.rows.reduce((sum, row) => sum + parseFloat(row.total_target || 0), 0);
    const totalCurrent = goalsResult.rows.reduce((sum, row) => sum + parseFloat(row.current_value || 0), 0);
    const onTrackCount = goalsResult.rows.reduce((sum, row) => sum + parseInt(row.on_track_count), 0);
    const behindCount = goalsResult.rows.reduce((sum, row) => sum + parseInt(row.behind_count), 0);
    const aheadCount = goalsResult.rows.reduce((sum, row) => sum + parseInt(row.ahead_count), 0);

    const goalsByMember = goalsResult.rows.map((row) => ({
      customer_id: row.customer_id,
      name: row.name,
      goal_count: parseInt(row.goal_count),
      total_target: parseFloat(row.total_target || 0),
      current_value: parseFloat(row.current_value || 0)
    }));

    return {
      total_goals: totalGoals,
      total_target_amount: totalTarget,
      total_current_value: totalCurrent,
      on_track_count: onTrackCount,
      behind_count: behindCount,
      ahead_count: aheadCount,
      goals_by_member: goalsByMember
    };
  }

  /**
   * Get family-wide meeting summary
   */
  async getFamilyMeetingSummary(
    tenantId: number,
    isLive: boolean,
    familyHeadIwellCode: string
  ): Promise<FamilyMeetingSummary> {
    // Get family members
    const members = await this.getFamilyMembers(tenantId, isLive, familyHeadIwellCode);
    const customerIds = members.map((m) => m.customer_id);

    const meetingsQuery = `
      SELECT
        cm.customer_id,
        ct.name,
        COUNT(*) as meeting_count,
        MAX(cm.scheduled_date) FILTER (WHERE cm.status = 'completed') as last_meeting_date,
        SUM(CASE WHEN cm.status = 'scheduled' THEN 1 ELSE 0 END) as upcoming_count,
        SUM(CASE WHEN cm.status = 'completed' THEN 1 ELSE 0 END) as completed_count
      FROM t_customer_meetings cm
      JOIN t_customers c ON cm.customer_id = c.id
      JOIN t_contacts ct ON c.contact_id = ct.id
      WHERE cm.tenant_id = $1
        AND cm.is_live = $2
        AND cm.customer_id = ANY($3)
      GROUP BY cm.customer_id, ct.name
    `;

    const meetingsResult = await pool.query(meetingsQuery, [tenantId, isLive, customerIds]);

    const totalMeetings = meetingsResult.rows.reduce((sum, row) => sum + parseInt(row.meeting_count), 0);
    const upcomingCount = meetingsResult.rows.reduce((sum, row) => sum + parseInt(row.upcoming_count), 0);
    const completedCount = meetingsResult.rows.reduce((sum, row) => sum + parseInt(row.completed_count), 0);

    // Get next upcoming meeting
    const nextMeetingQuery = `
      SELECT
        cm.customer_id,
        ct.name as customer_name,
        cm.scheduled_date as meeting_date,
        cm.meeting_type
      FROM t_customer_meetings cm
      JOIN t_customers c ON cm.customer_id = c.id
      JOIN t_contacts ct ON c.contact_id = ct.id
      WHERE cm.tenant_id = $1
        AND cm.is_live = $2
        AND cm.customer_id = ANY($3)
        AND cm.status = 'scheduled'
        AND cm.scheduled_date >= CURRENT_DATE
      ORDER BY cm.scheduled_date ASC
      LIMIT 1
    `;

    const nextMeetingResult = await pool.query(nextMeetingQuery, [tenantId, isLive, customerIds]);

    const meetingsByMember = meetingsResult.rows.map((row) => ({
      customer_id: row.customer_id,
      name: row.name,
      meeting_count: parseInt(row.meeting_count),
      last_meeting_date: row.last_meeting_date
    }));

    return {
      total_meetings: totalMeetings,
      upcoming_count: upcomingCount,
      completed_count: completedCount,
      next_meeting: nextMeetingResult.rows[0] || undefined,
      meetings_by_member: meetingsByMember
    };
  }
}
