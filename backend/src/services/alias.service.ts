// backend/src/services/alias.service.ts

import pool from '../config/database';
import type {
  Alias,
  AliasMember,
  AliasWithMembers,
  AliasPortfolioSummary,
  AliasMemberPortfolio,
  AliasAssetAllocation,
  AliasAssetCategory,
  AliasMemberAllocation,
  AliasGoalSummary,
  AliasMeetingSummary,
  CreateAliasRequest,
  UpdateAliasRequest
} from '../types/alias.types';

export class AliasService {
  /**
   * Get all aliases for a tenant with member counts and AUM
   */
  async getAliases(
    tenantId: number,
    params: { page?: number; page_size?: number; search?: string }
  ): Promise<{ aliases: AliasWithMembers[]; total: number }> {
    const page = params.page || 1;
    const pageSize = params.page_size || 20;
    const offset = (page - 1) * pageSize;

    let whereClause = 'WHERE a.tenant_id = $1 AND a.is_active = true';
    const queryParams: any[] = [tenantId];
    let paramIndex = 2;

    if (params.search) {
      whereClause += ` AND (a.alias_name ILIKE $${paramIndex} OR a.description ILIKE $${paramIndex})`;
      queryParams.push(`%${params.search}%`);
      paramIndex++;
    }

    // Count query
    const countQuery = `
      SELECT COUNT(*) as total
      FROM t_customer_aliases a
      ${whereClause}
    `;
    const countResult = await pool.query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].total);

    // Main query with member info and AUM
    const query = `
      SELECT
        a.id,
        a.tenant_id,
        a.alias_name,
        a.description,
        a.created_by,
        a.created_at,
        a.updated_at,
        a.is_active,
        COUNT(am.id) as member_count,
        -- Get primary customer name
        (SELECT ct.name
         FROM t_customer_alias_members am2
         JOIN t_customers c ON am2.customer_id = c.id
         JOIN t_contacts ct ON c.contact_id = ct.id
         WHERE am2.alias_id = a.id AND am2.is_primary = true
         LIMIT 1) as primary_customer_name,
        -- Get total AUM from portfolio totals
        COALESCE((
          SELECT SUM(cpt.current_value)
          FROM t_customer_alias_members am3
          JOIN t_customer_portfolio_totals cpt ON am3.customer_id = cpt.customer_id
          WHERE am3.alias_id = a.id AND cpt.tenant_id = a.tenant_id
        ), 0) as total_aum
      FROM t_customer_aliases a
      LEFT JOIN t_customer_alias_members am ON a.id = am.alias_id
      ${whereClause}
      GROUP BY a.id
      ORDER BY a.updated_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    queryParams.push(pageSize, offset);
    const result = await pool.query(query, queryParams);

    return {
      aliases: result.rows.map(row => ({
        ...row,
        member_count: parseInt(row.member_count),
        total_aum: parseFloat(row.total_aum) || 0
      })),
      total
    };
  }

  /**
   * Get a single alias by ID with members
   */
  async getAlias(tenantId: number, aliasId: number): Promise<AliasWithMembers | null> {
    const query = `
      SELECT
        a.id,
        a.tenant_id,
        a.alias_name,
        a.description,
        a.created_by,
        a.created_at,
        a.updated_at,
        a.is_active,
        COUNT(am.id) as member_count,
        COALESCE((
          SELECT SUM(cpt.current_value)
          FROM t_customer_alias_members am2
          JOIN t_customer_portfolio_totals cpt ON am2.customer_id = cpt.customer_id
          WHERE am2.alias_id = a.id AND cpt.tenant_id = a.tenant_id
        ), 0) as total_aum
      FROM t_customer_aliases a
      LEFT JOIN t_customer_alias_members am ON a.id = am.alias_id
      WHERE a.id = $1 AND a.tenant_id = $2 AND a.is_active = true
      GROUP BY a.id
    `;

    const result = await pool.query(query, [aliasId, tenantId]);
    if (result.rows.length === 0) return null;

    const alias = result.rows[0];

    // Get members
    const members = await this.getAliasMembers(tenantId, aliasId);

    return {
      ...alias,
      member_count: parseInt(alias.member_count),
      total_aum: parseFloat(alias.total_aum) || 0,
      primary_customer_name: members.find(m => m.is_primary)?.name,
      members
    };
  }

  /**
   * Get all members of an alias
   */
  async getAliasMembers(tenantId: number, aliasId: number): Promise<AliasMember[]> {
    const query = `
      SELECT
        c.id as customer_id,
        c.contact_id,
        ct.name,
        c.iwell_code,
        am.is_primary,
        am.added_at,
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
         LIMIT 1) as mobile,
        -- Get current value
        COALESCE((
          SELECT SUM(current_value)
          FROM t_customer_portfolio_totals
          WHERE customer_id = c.id AND tenant_id = $1
        ), 0) as current_value
      FROM t_customer_alias_members am
      JOIN t_customers c ON am.customer_id = c.id
      JOIN t_contacts ct ON c.contact_id = ct.id
      JOIN t_customer_aliases a ON am.alias_id = a.id
      WHERE am.alias_id = $2 AND a.tenant_id = $1
      ORDER BY am.is_primary DESC, ct.name ASC
    `;

    const result = await pool.query(query, [tenantId, aliasId]);
    return result.rows.map(row => ({
      ...row,
      current_value: parseFloat(row.current_value) || 0
    }));
  }

  /**
   * Create a new alias with members
   */
  async createAlias(
    tenantId: number,
    userId: number,
    request: CreateAliasRequest
  ): Promise<Alias> {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Check if any customer is already in an alias
      const existingCheck = await client.query(
        `SELECT c.id, ct.name
         FROM t_customer_alias_members am
         JOIN t_customers c ON am.customer_id = c.id
         JOIN t_contacts ct ON c.contact_id = ct.id
         WHERE am.customer_id = ANY($1)`,
        [request.customer_ids]
      );

      if (existingCheck.rows.length > 0) {
        const names = existingCheck.rows.map(r => r.name).join(', ');
        throw new Error(`Customer(s) already in an alias: ${names}`);
      }

      // Create the alias
      const aliasResult = await client.query(
        `INSERT INTO t_customer_aliases (tenant_id, alias_name, description, created_by)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [tenantId, request.alias_name, request.description || null, userId]
      );

      const alias = aliasResult.rows[0];

      // Add members
      for (const customerId of request.customer_ids) {
        const isPrimary = customerId === request.primary_customer_id;
        await client.query(
          `INSERT INTO t_customer_alias_members (alias_id, customer_id, is_primary, added_by)
           VALUES ($1, $2, $3, $4)`,
          [alias.id, customerId, isPrimary, userId]
        );
      }

      await client.query('COMMIT');
      return alias;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Update an alias
   */
  async updateAlias(
    tenantId: number,
    aliasId: number,
    request: UpdateAliasRequest
  ): Promise<Alias | null> {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Update alias details
      const updates: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (request.alias_name !== undefined) {
        updates.push(`alias_name = $${paramIndex++}`);
        values.push(request.alias_name);
      }
      if (request.description !== undefined) {
        updates.push(`description = $${paramIndex++}`);
        values.push(request.description);
      }

      if (updates.length > 0) {
        values.push(aliasId, tenantId);
        const query = `
          UPDATE t_customer_aliases
          SET ${updates.join(', ')}
          WHERE id = $${paramIndex++} AND tenant_id = $${paramIndex}
          RETURNING *
        `;
        await client.query(query, values);
      }

      // Update primary customer if specified
      if (request.primary_customer_id !== undefined) {
        // Remove existing primary
        await client.query(
          `UPDATE t_customer_alias_members SET is_primary = false WHERE alias_id = $1`,
          [aliasId]
        );
        // Set new primary
        await client.query(
          `UPDATE t_customer_alias_members SET is_primary = true
           WHERE alias_id = $1 AND customer_id = $2`,
          [aliasId, request.primary_customer_id]
        );
      }

      await client.query('COMMIT');

      // Fetch updated alias
      const result = await pool.query(
        `SELECT * FROM t_customer_aliases WHERE id = $1 AND tenant_id = $2`,
        [aliasId, tenantId]
      );
      return result.rows[0] || null;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Add members to an alias
   */
  async addMembers(
    tenantId: number,
    aliasId: number,
    userId: number,
    customerIds: number[]
  ): Promise<void> {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Verify alias exists and belongs to tenant
      const aliasCheck = await client.query(
        `SELECT id FROM t_customer_aliases WHERE id = $1 AND tenant_id = $2 AND is_active = true`,
        [aliasId, tenantId]
      );
      if (aliasCheck.rows.length === 0) {
        throw new Error('Alias not found');
      }

      // Check if any customer is already in an alias
      const existingCheck = await client.query(
        `SELECT c.id, ct.name
         FROM t_customer_alias_members am
         JOIN t_customers c ON am.customer_id = c.id
         JOIN t_contacts ct ON c.contact_id = ct.id
         WHERE am.customer_id = ANY($1)`,
        [customerIds]
      );

      if (existingCheck.rows.length > 0) {
        const names = existingCheck.rows.map(r => r.name).join(', ');
        throw new Error(`Customer(s) already in an alias: ${names}`);
      }

      // Add members
      for (const customerId of customerIds) {
        await client.query(
          `INSERT INTO t_customer_alias_members (alias_id, customer_id, is_primary, added_by)
           VALUES ($1, $2, false, $3)`,
          [aliasId, customerId, userId]
        );
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Remove members from an alias
   */
  async removeMembers(
    tenantId: number,
    aliasId: number,
    customerIds: number[]
  ): Promise<void> {
    // Verify alias exists
    const aliasCheck = await pool.query(
      `SELECT id FROM t_customer_aliases WHERE id = $1 AND tenant_id = $2 AND is_active = true`,
      [aliasId, tenantId]
    );
    if (aliasCheck.rows.length === 0) {
      throw new Error('Alias not found');
    }

    await pool.query(
      `DELETE FROM t_customer_alias_members
       WHERE alias_id = $1 AND customer_id = ANY($2)`,
      [aliasId, customerIds]
    );
  }

  /**
   * Delete (soft-delete) an alias
   */
  async deleteAlias(tenantId: number, aliasId: number): Promise<void> {
    const result = await pool.query(
      `UPDATE t_customer_aliases SET is_active = false
       WHERE id = $1 AND tenant_id = $2`,
      [aliasId, tenantId]
    );

    if (result.rowCount === 0) {
      throw new Error('Alias not found');
    }
  }

  /**
   * Get aggregated portfolio summary for alias
   * (Reuses family service pattern)
   */
  async getAliasPortfolioSummary(
    tenantId: number,
    isLive: boolean,
    aliasId: number
  ): Promise<AliasPortfolioSummary> {
    // Get alias info
    const aliasResult = await pool.query(
      `SELECT alias_name FROM t_customer_aliases WHERE id = $1 AND tenant_id = $2`,
      [aliasId, tenantId]
    );
    if (aliasResult.rows.length === 0) {
      throw new Error('Alias not found');
    }

    const aliasName = aliasResult.rows[0].alias_name;

    // Get member customer IDs
    const members = await this.getAliasMembers(tenantId, aliasId);
    const customerIds = members.map(m => m.customer_id);

    if (customerIds.length === 0) {
      return {
        alias_id: aliasId,
        alias_name: aliasName,
        total_members: 0,
        total_invested: 0,
        total_current_value: 0,
        total_returns: 0,
        total_return_percentage: 0,
        members: []
      };
    }

    // Query portfolio totals - aggregate by customer
    const portfolioQuery = `
      SELECT
        cpt.customer_id,
        ct.name,
        c.iwell_code,
        am.is_primary,
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
      JOIN t_customer_alias_members am ON c.id = am.customer_id
      WHERE cpt.tenant_id = $1
        AND cpt.is_live = $2
        AND cpt.customer_id = ANY($3)
      GROUP BY cpt.customer_id, ct.name, c.iwell_code, am.is_primary
      ORDER BY am.is_primary DESC, ct.name ASC
    `;

    const portfolioResult = await pool.query(portfolioQuery, [tenantId, isLive, customerIds]);
    const memberPortfolios: AliasMemberPortfolio[] = portfolioResult.rows;

    // Calculate totals
    const totalInvested = memberPortfolios.reduce((sum, m) => sum + Number(m.total_invested), 0);
    const totalCurrentValue = memberPortfolios.reduce((sum, m) => sum + Number(m.current_value), 0);
    const totalReturns = totalCurrentValue - totalInvested;
    const totalReturnPercentage = totalInvested > 0 ? (totalReturns / totalInvested) * 100 : 0;

    // Add portfolio percentage for each member
    const membersWithPercentage = memberPortfolios.map(m => ({
      ...m,
      total_invested: Number(m.total_invested),
      current_value: Number(m.current_value),
      returns: Number(m.returns) || Number(m.current_value) - Number(m.total_invested),
      return_percentage: Number(m.return_percentage),
      scheme_count: Number(m.scheme_count),
      portfolio_percentage: totalCurrentValue > 0 ? (Number(m.current_value) / totalCurrentValue) * 100 : 0
    }));

    return {
      alias_id: aliasId,
      alias_name: aliasName,
      total_members: members.length,
      total_invested: totalInvested,
      total_current_value: totalCurrentValue,
      total_returns: totalReturns,
      total_return_percentage: totalReturnPercentage,
      members: membersWithPercentage
    };
  }

  /**
   * Get alias-wide asset allocation
   * (Reuses family service pattern)
   */
  async getAliasAssetAllocation(
    tenantId: number,
    isLive: boolean,
    aliasId: number
  ): Promise<AliasAssetAllocation> {
    // Get member customer IDs
    const members = await this.getAliasMembers(tenantId, aliasId);
    const customerIds = members.map(m => m.customer_id);

    if (customerIds.length === 0) {
      return {
        alias_id: aliasId,
        total_value: 0,
        allocations: [],
        by_member: []
      };
    }

    const allocations: AliasAssetCategory[] = [];
    const byMemberMap = new Map<number, AliasMemberAllocation>();
    let totalValue = 0;

    // GET MF DATA from t_customer_portfolio_totals
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
          percentage: 0,
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

    mfMemberResult.rows.forEach(row => {
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
        percentage: 0
      });
    });

    // GET NON-MF DATA from t_monthly_portfolio_snapshots
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

      nonMfResult.rows.forEach(row => {
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

      nonMfMemberResult.rows.forEach(row => {
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

    // Calculate percentages
    allocations.forEach(alloc => {
      alloc.percentage = totalValue > 0 ? (alloc.value / totalValue) * 100 : 0;
    });
    allocations.sort((a, b) => b.value - a.value);

    byMemberMap.forEach(member => {
      const memberTotal = member.allocations.reduce((sum, a) => sum + a.value, 0);
      member.allocations.forEach(alloc => {
        alloc.percentage = memberTotal > 0 ? (alloc.value / memberTotal) * 100 : 0;
      });
    });

    return {
      alias_id: aliasId,
      total_value: totalValue,
      allocations,
      by_member: Array.from(byMemberMap.values())
    };
  }

  /**
   * Get alias-wide goal summary
   */
  async getAliasGoalSummary(
    tenantId: number,
    isLive: boolean,
    aliasId: number
  ): Promise<AliasGoalSummary> {
    const members = await this.getAliasMembers(tenantId, aliasId);
    const customerIds = members.map(m => m.customer_id);

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

    const goalsByMember = goalsResult.rows.map(row => ({
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
   * Get alias-wide meeting summary
   * NOTE: Meetings are stored in t_jtbd_executions with execution_type IN ('client_meeting', 'portfolio_review', 'goal_review')
   */
  async getAliasMeetingSummary(
    tenantId: number,
    isLive: boolean,
    aliasId: number
  ): Promise<AliasMeetingSummary> {
    const members = await this.getAliasMembers(tenantId, aliasId);
    const customerIds = members.map(m => m.customer_id);

    // Query t_jtbd_executions for meeting types
    const meetingsQuery = `
      SELECT
        je.customer_id,
        ct.name,
        COUNT(*) as meeting_count,
        MAX(je.scheduled_date) FILTER (WHERE je.execution_status = 'completed') as last_meeting_date,
        SUM(CASE WHEN je.execution_status IN ('planned', 'due') THEN 1 ELSE 0 END) as upcoming_count,
        SUM(CASE WHEN je.execution_status = 'completed' THEN 1 ELSE 0 END) as completed_count
      FROM t_jtbd_executions je
      JOIN t_customers c ON je.customer_id = c.id
      JOIN t_contacts ct ON c.contact_id = ct.id
      WHERE je.tenant_id = $1
        AND je.is_live = $2
        AND je.customer_id = ANY($3)
        AND je.execution_type IN ('client_meeting', 'portfolio_review', 'goal_review')
      GROUP BY je.customer_id, ct.name
    `;

    const meetingsResult = await pool.query(meetingsQuery, [tenantId, isLive, customerIds]);

    const totalMeetings = meetingsResult.rows.reduce((sum, row) => sum + parseInt(row.meeting_count), 0);
    const upcomingCount = meetingsResult.rows.reduce((sum, row) => sum + parseInt(row.upcoming_count), 0);
    const completedCount = meetingsResult.rows.reduce((sum, row) => sum + parseInt(row.completed_count), 0);

    // Get next upcoming meeting from t_jtbd_executions
    const nextMeetingQuery = `
      SELECT
        je.customer_id,
        ct.name as customer_name,
        je.scheduled_date as meeting_date,
        je.execution_type as meeting_type
      FROM t_jtbd_executions je
      JOIN t_customers c ON je.customer_id = c.id
      JOIN t_contacts ct ON c.contact_id = ct.id
      WHERE je.tenant_id = $1
        AND je.is_live = $2
        AND je.customer_id = ANY($3)
        AND je.execution_type IN ('client_meeting', 'portfolio_review', 'goal_review')
        AND je.execution_status IN ('planned', 'due')
        AND je.scheduled_date >= CURRENT_DATE
      ORDER BY je.scheduled_date ASC
      LIMIT 1
    `;

    const nextMeetingResult = await pool.query(nextMeetingQuery, [tenantId, isLive, customerIds]);

    const meetingsByMember = meetingsResult.rows.map(row => ({
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

  /**
   * Check if a customer is already in an alias
   */
  async getCustomerAlias(tenantId: number, customerId: number): Promise<AliasWithMembers | null> {
    const query = `
      SELECT a.*
      FROM t_customer_aliases a
      JOIN t_customer_alias_members am ON a.id = am.alias_id
      WHERE am.customer_id = $1 AND a.tenant_id = $2 AND a.is_active = true
    `;

    const result = await pool.query(query, [customerId, tenantId]);
    if (result.rows.length === 0) return null;

    return this.getAlias(tenantId, result.rows[0].id);
  }
}
