// backend/src/services/goalInvestmentAllocation.service.ts
// Phase 2: Service for managing goal-investment plan allocations

import { Pool, PoolClient } from 'pg';
import { pool } from '../config/database';
import { GoalInvestmentAllocation, InvestmentPlan } from '../types/goal.types';

export class GoalInvestmentAllocationService {
  private db: Pool;

  constructor() {
    this.db = pool;
  }

  /**
   * Allocate an investment plan to a goal
   */
  async allocateInvestmentToGoal(
    tenantId: number,
    isLive: boolean,
    data: {
      goal_id: number;
      investment_plan_id: number;
      allocated_percentage?: number;
      allocated_amount?: number;
      notes?: string;
    },
    createdBy: number
  ): Promise<GoalInvestmentAllocation> {
    const query = `
      INSERT INTO t_goal_investment_allocations (
        tenant_id, is_live, goal_id, investment_plan_id,
        allocated_percentage, allocated_amount, notes, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;

    const result = await this.db.query(query, [
      tenantId,
      isLive,
      data.goal_id,
      data.investment_plan_id,
      data.allocated_percentage || null,
      data.allocated_amount || null,
      data.notes || null,
      createdBy
    ]);

    return result.rows[0];
  }

  /**
   * Get all allocations for a specific goal
   */
  async getAllocationsForGoal(
    tenantId: number,
    isLive: boolean,
    goalId: number
  ): Promise<GoalInvestmentAllocation[]> {
    const query = `
      SELECT
        gia.*,
        caa.customer_id,
        caa.asset_type_id,
        caa.principal_amount,
        caa.start_date,
        caa.has_started,
        caa.duration_months,
        caa.duration_years,
        caa.investment_type,
        caa.recurring_amount,
        caa.investment_frequency,
        caa.custom_assumption_rate,
        caa.scheme_code,
        mat.asset_type_code,
        mat.asset_type_name,
        mat.default_assumption_rate,
        mat.category
      FROM t_goal_investment_allocations gia
      INNER JOIN t_customer_asset_assignments caa ON gia.investment_plan_id = caa.id
      INNER JOIN m_asset_types mat ON caa.asset_type_id = mat.id
      WHERE gia.tenant_id = $1
        AND gia.is_live = $2
        AND gia.goal_id = $3
      ORDER BY gia.created_at DESC
    `;

    const result = await this.db.query(query, [tenantId, isLive, goalId]);

    return result.rows.map(row => ({
      id: row.id,
      tenant_id: row.tenant_id,
      is_live: row.is_live,
      goal_id: row.goal_id,
      investment_plan_id: row.investment_plan_id,
      allocated_percentage: row.allocated_percentage,
      allocated_amount: row.allocated_amount,
      notes: row.notes,
      created_at: row.created_at,
      updated_at: row.updated_at,
      created_by: row.created_by,
      investment_plan: {
        id: row.investment_plan_id,
        customer_id: row.customer_id,
        asset_type_id: row.asset_type_id,
        asset_type_code: row.asset_type_code,
        asset_type_name: row.asset_type_name,
        principal_amount: parseFloat(row.principal_amount),
        start_date: row.start_date,
        has_started: row.has_started,
        duration_months: row.duration_months,
        duration_years: row.duration_years,
        investment_type: row.investment_type,
        recurring_amount: row.recurring_amount ? parseFloat(row.recurring_amount) : null,
        investment_frequency: row.investment_frequency,
        custom_assumption_rate: row.custom_assumption_rate,
        default_assumption_rate: parseFloat(row.default_assumption_rate),
        scheme_code: row.scheme_code
      }
    }));
  }

  /**
   * Get all goals that an investment plan is allocated to
   */
  async getGoalsForInvestmentPlan(
    tenantId: number,
    isLive: boolean,
    investmentPlanId: number
  ): Promise<Array<{ goal_id: number; goal_name: string; allocated_percentage: number }>> {
    const query = `
      SELECT
        gia.goal_id,
        gia.allocated_percentage,
        jtbd.title as goal_name
      FROM t_goal_investment_allocations gia
      INNER JOIN t_jtbd_configurations jtbd ON gia.goal_id = jtbd.id
      WHERE gia.tenant_id = $1
        AND gia.is_live = $2
        AND gia.investment_plan_id = $3
        AND jtbd.is_active = true
      ORDER BY gia.created_at DESC
    `;

    const result = await this.db.query(query, [tenantId, isLive, investmentPlanId]);
    return result.rows;
  }

  /**
   * Update an allocation
   */
  async updateAllocation(
    allocationId: number,
    data: {
      allocated_percentage?: number;
      allocated_amount?: number;
      notes?: string;
    }
  ): Promise<GoalInvestmentAllocation> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (data.allocated_percentage !== undefined) {
      updates.push(`allocated_percentage = $${paramIndex++}`);
      values.push(data.allocated_percentage);
    }

    if (data.allocated_amount !== undefined) {
      updates.push(`allocated_amount = $${paramIndex++}`);
      values.push(data.allocated_amount);
    }

    if (data.notes !== undefined) {
      updates.push(`notes = $${paramIndex++}`);
      values.push(data.notes);
    }

    if (updates.length === 0) {
      throw new Error('No fields to update');
    }

    values.push(allocationId);

    const query = `
      UPDATE t_goal_investment_allocations
      SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await this.db.query(query, values);

    if (result.rows.length === 0) {
      throw new Error('Allocation not found');
    }

    return result.rows[0];
  }

  /**
   * Remove an allocation
   */
  async removeAllocation(allocationId: number): Promise<void> {
    const query = `
      DELETE FROM t_goal_investment_allocations
      WHERE id = $1
    `;

    await this.db.query(query, [allocationId]);
  }

  /**
   * Get allocation by ID
   */
  async getAllocationById(
    allocationId: number
  ): Promise<GoalInvestmentAllocation | null> {
    const query = `
      SELECT * FROM t_goal_investment_allocations
      WHERE id = $1
    `;

    const result = await this.db.query(query, [allocationId]);

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0];
  }

  /**
   * Calculate total allocated percentage for an investment plan
   */
  async getTotalAllocationForInvestmentPlan(
    tenantId: number,
    isLive: boolean,
    investmentPlanId: number
  ): Promise<number> {
    const query = `
      SELECT COALESCE(SUM(allocated_percentage), 0) as total
      FROM t_goal_investment_allocations
      WHERE tenant_id = $1
        AND is_live = $2
        AND investment_plan_id = $3
    `;

    const result = await this.db.query(query, [tenantId, isLive, investmentPlanId]);
    return parseFloat(result.rows[0].total);
  }

  /**
   * Check if allocation would exceed 100%
   */
  async validateAllocation(
    tenantId: number,
    isLive: boolean,
    investmentPlanId: number,
    newPercentage: number,
    excludeAllocationId?: number
  ): Promise<{ is_valid: boolean; current_total: number; new_total: number }> {
    const query = `
      SELECT COALESCE(SUM(allocated_percentage), 0) as total
      FROM t_goal_investment_allocations
      WHERE tenant_id = $1
        AND is_live = $2
        AND investment_plan_id = $3
        ${excludeAllocationId ? 'AND id != $4' : ''}
    `;

    const params = [tenantId, isLive, investmentPlanId];
    if (excludeAllocationId) {
      params.push(excludeAllocationId);
    }

    const result = await this.db.query(query, params);
    const currentTotal = parseFloat(result.rows[0].total);
    const newTotal = currentTotal + newPercentage;

    return {
      is_valid: newTotal <= 100,
      current_total: currentTotal,
      new_total: newTotal
    };
  }
}
