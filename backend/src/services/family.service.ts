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

    const portfolioQuery = `
      SELECT
        cpt.customer_id,
        ct.name,
        c.iwell_code,
        CASE WHEN c.iwell_code = $3 THEN true ELSE false END as is_family_head,
        cpt.total_invested,
        cpt.current_value,
        cpt.total_returns,
        cpt.return_percentage,
        COUNT(DISTINCT cpt.scheme_code) as scheme_count
      FROM t_customer_portfolio_totals cpt
      JOIN t_customers c ON cpt.customer_id = c.id
      JOIN t_contacts ct ON c.contact_id = ct.id
      WHERE cpt.tenant_id = $1
        AND cpt.is_live = $2
        AND cpt.customer_id = ANY($4)
      GROUP BY
        cpt.customer_id, ct.name, c.iwell_code,
        cpt.total_invested, cpt.current_value,
        cpt.total_returns, cpt.return_percentage,
        is_family_head
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
   */
  async getFamilyAssetAllocation(
    tenantId: number,
    isLive: boolean,
    familyHeadIwellCode: string
  ): Promise<FamilyAssetAllocation> {
    // Get family members
    const members = await this.getFamilyMembers(tenantId, isLive, familyHeadIwellCode);
    const customerIds = members.map((m) => m.customer_id);

    // Get asset allocation by category for entire family
    const categoryQuery = `
      SELECT
        sd.scheme_category as category,
        SUM(cmp.current_value) as value,
        COUNT(DISTINCT cmp.scheme_code) as scheme_count
      FROM t_customer_master_portfolio cmp
      JOIN t_scheme_details sd ON cmp.scheme_code = sd.scheme_code
      WHERE cmp.tenant_id = $1
        AND cmp.is_live = $2
        AND cmp.customer_id = ANY($3)
        AND cmp.current_value > 0
      GROUP BY sd.scheme_category
      ORDER BY value DESC
    `;

    const categoryResult = await pool.query(categoryQuery, [tenantId, isLive, customerIds]);

    const totalValue = categoryResult.rows.reduce((sum, row) => sum + parseFloat(row.value), 0);

    const allocations: FamilyAssetCategory[] = categoryResult.rows.map((row) => ({
      category: row.category || 'Other',
      value: parseFloat(row.value),
      percentage: totalValue > 0 ? (parseFloat(row.value) / totalValue) * 100 : 0,
      scheme_count: parseInt(row.scheme_count)
    }));

    // Get allocation by member
    const memberAllocationQuery = `
      SELECT
        cmp.customer_id,
        ct.name,
        c.iwell_code,
        sd.scheme_category as category,
        SUM(cmp.current_value) as value
      FROM t_customer_master_portfolio cmp
      JOIN t_customers c ON cmp.customer_id = c.id
      JOIN t_contacts ct ON c.contact_id = ct.id
      JOIN t_scheme_details sd ON cmp.scheme_code = sd.scheme_code
      WHERE cmp.tenant_id = $1
        AND cmp.is_live = $2
        AND cmp.customer_id = ANY($3)
        AND cmp.current_value > 0
      GROUP BY cmp.customer_id, ct.name, c.iwell_code, sd.scheme_category
      ORDER BY ct.name, value DESC
    `;

    const memberAllocationResult = await pool.query(memberAllocationQuery, [
      tenantId,
      isLive,
      customerIds
    ]);

    // Group by member
    const byMemberMap = new Map<number, FamilyMemberAllocation>();

    memberAllocationResult.rows.forEach((row) => {
      if (!byMemberMap.has(row.customer_id)) {
        byMemberMap.set(row.customer_id, {
          customer_id: row.customer_id,
          name: row.name,
          iwell_code: row.iwell_code,
          allocations: []
        });
      }

      const member = byMemberMap.get(row.customer_id)!;
      const memberTotal = memberAllocationResult.rows
        .filter((r) => r.customer_id === row.customer_id)
        .reduce((sum, r) => sum + parseFloat(r.value), 0);

      member.allocations.push({
        category: row.category || 'Other',
        value: parseFloat(row.value),
        percentage: memberTotal > 0 ? (parseFloat(row.value) / memberTotal) * 100 : 0
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

    const goalsQuery = `
      SELECT
        jc.customer_id,
        ct.name,
        COUNT(*) as goal_count,
        SUM(
          CASE
            WHEN jc.tracking_type = 'time_based_goal'
            THEN (jc.config_data->>'target_amount')::numeric
            ELSE 0
          END
        ) as total_target,
        SUM(
          CASE
            WHEN jc.tracking_type = 'time_based_goal'
            THEN (
              SELECT SUM(current_value)
              FROM t_customer_master_portfolio cmp
              WHERE cmp.customer_id = jc.customer_id
                AND cmp.tenant_id = jc.tenant_id
                AND cmp.is_live = jc.is_live
            )
            ELSE 0
          END
        ) as current_value,
        SUM(
          CASE
            WHEN (jc.config_data->>'status') = 'on_track' THEN 1
            ELSE 0
          END
        ) as on_track_count,
        SUM(
          CASE
            WHEN (jc.config_data->>'status') = 'behind' THEN 1
            ELSE 0
          END
        ) as behind_count,
        SUM(
          CASE
            WHEN (jc.config_data->>'status') = 'ahead' THEN 1
            ELSE 0
          END
        ) as ahead_count
      FROM t_jtbd_configurations jc
      JOIN t_customers c ON jc.customer_id = c.id
      JOIN t_contacts ct ON c.contact_id = ct.id
      WHERE jc.tenant_id = $1
        AND jc.is_live = $2
        AND jc.customer_id = ANY($3)
        AND jc.tracking_type IN ('time_based_goal', 'price_based_goal', 'time_and_price_based_goal')
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
