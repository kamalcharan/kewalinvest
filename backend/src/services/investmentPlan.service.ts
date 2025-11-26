// backend/src/services/investmentPlan.service.ts
// Service layer for Investment Plan management (Release 1.1 - Phase 1)

import pool from '../config/database';
import {
  InvestmentPlan,
  CreateInvestmentPlanRequest,
  UpdateInvestmentPlanRequest,
  InvestmentPlanWithCalculations,
  FamilyInvestmentSummary,
  InvestmentPlanValidationResult,
  InvestmentPlanValidationError
} from '../types/investmentPlan.types';

export class InvestmentPlanService {
  /**
   * Validate investment plan data
   */
  validateInvestmentPlan(data: CreateInvestmentPlanRequest | UpdateInvestmentPlanRequest, isUpdate: boolean = false): InvestmentPlanValidationResult {
    const errors: InvestmentPlanValidationError[] = [];

    if (!isUpdate) {
      const createData = data as CreateInvestmentPlanRequest;

      if (!createData.customer_id) {
        errors.push({ field: 'customer_id', message: 'Customer ID is required' });
      }

      if (!createData.asset_type_id) {
        errors.push({ field: 'asset_type_id', message: 'Asset Type ID is required' });
      }

      if (!createData.principal_amount || createData.principal_amount <= 0) {
        errors.push({ field: 'principal_amount', message: 'Principal amount must be greater than 0' });
      }

      if (!createData.start_date) {
        errors.push({ field: 'start_date', message: 'Start date is required' });
      }

      if (!createData.investment_type) {
        errors.push({ field: 'investment_type', message: 'Investment type is required' });
      } else if (!['one_time', 'sip', 'recurring'].includes(createData.investment_type)) {
        errors.push({ field: 'investment_type', message: 'Invalid investment type' });
      }

      // SIP/Recurring validations
      if (createData.investment_type === 'sip' || createData.investment_type === 'recurring') {
        if (!createData.recurring_amount || createData.recurring_amount <= 0) {
          errors.push({ field: 'recurring_amount', message: 'Recurring amount is required for SIP/recurring investments' });
        }
        if (!createData.investment_frequency) {
          errors.push({ field: 'investment_frequency', message: 'Investment frequency is required for SIP/recurring investments' });
        } else if (!['monthly', 'quarterly', 'yearly'].includes(createData.investment_frequency)) {
          errors.push({ field: 'investment_frequency', message: 'Invalid investment frequency' });
        }
      }

      // Duration validation (at least one must be provided)
      if (createData.duration_months && createData.duration_years) {
        errors.push({ field: 'duration', message: 'Provide either duration in months OR years, not both' });
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Check if investment name already exists for this customer
   */
  async checkDuplicateName(
    customerId: number,
    name: string,
    tenantId: number,
    isLive: boolean,
    excludeId?: number
  ): Promise<boolean> {
    const query = `
      SELECT id FROM t_customer_asset_assignments
      WHERE customer_id = $1
        AND tenant_id = $2
        AND is_live = $3
        AND is_active = true
        AND LOWER(TRIM(notes)) = LOWER(TRIM($4))
        ${excludeId ? `AND id != $5` : ''}
    `;

    const values = excludeId
      ? [customerId, tenantId, isLive, name, excludeId]
      : [customerId, tenantId, isLive, name];

    const result = await pool.query(query, values);
    return result.rows.length > 0;
  }

  /**
   * Create new investment plan
   */
  async createInvestmentPlan(
    data: CreateInvestmentPlanRequest,
    tenantId: number,
    isLive: boolean,
    userId: number
  ): Promise<InvestmentPlan> {
    // Validate
    const validation = this.validateInvestmentPlan(data);
    if (!validation.valid) {
      throw new Error(`Validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
    }

    // Check for duplicate investment name
    if (data.notes) {
      const isDuplicate = await this.checkDuplicateName(
        data.customer_id,
        data.notes,
        tenantId,
        isLive
      );
      if (isDuplicate) {
        throw new Error(`An investment plan with the name "${data.notes}" already exists for this customer`);
      }
    }

    // If MF asset type, verify scheme_code is bookmarked
    if (data.scheme_code) {
      await this.verifySchemeBookmark(data.scheme_code, tenantId, isLive);
    }

    const query = `
      INSERT INTO t_customer_asset_assignments (
        tenant_id, is_live, customer_id, asset_type_id,
        principal_amount, start_date, has_started,
        duration_months, duration_years,
        investment_type, recurring_amount, investment_frequency,
        custom_assumption_rate, scheme_code,
        notes, assigned_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *
    `;

    const values = [
      tenantId,
      isLive,
      data.customer_id,
      data.asset_type_id,
      data.principal_amount,
      data.start_date,
      data.has_started,
      data.duration_months || null,
      data.duration_years || null,
      data.investment_type,
      data.recurring_amount || null,
      data.investment_frequency || null,
      data.custom_assumption_rate || null,
      data.scheme_code || null,
      data.notes || null,
      userId
    ];

    const result = await pool.query(query, values);
    const createdPlan = result.rows[0];

    // Auto-create SIP/recurring alert if investment type is sip or recurring
    if (data.investment_type === 'sip' || data.investment_type === 'recurring') {
      await this.createSIPAlert(createdPlan, tenantId, isLive, userId);
    }

    return createdPlan;
  }

  /**
   * Create SIP/Recurring payment alert for an investment plan
   * Automatically called when creating SIP or recurring investment plans
   */
  private async createSIPAlert(
    investmentPlan: InvestmentPlan,
    tenantId: number,
    isLive: boolean,
    userId: number
  ): Promise<void> {
    try {
      // Calculate next payment date based on start_date and frequency
      const nextPaymentDate = this.calculateNextPaymentDate(
        investmentPlan.start_date,
        investmentPlan.investment_frequency || 'monthly'
      );

      // Get customer name for alert title
      const customerQuery = `
        SELECT c.name
        FROM t_contacts c
        JOIN t_customers cust ON cust.contact_id = c.id
        WHERE cust.id = $1
      `;
      const customerResult = await pool.query(customerQuery, [investmentPlan.customer_id]);
      const customerName = customerResult.rows[0]?.name || 'Customer';

      // Get asset type name
      const assetQuery = `SELECT asset_type_name FROM m_asset_types WHERE id = $1`;
      const assetResult = await pool.query(assetQuery, [investmentPlan.asset_type_id]);
      const assetTypeName = assetResult.rows[0]?.asset_type_name || 'Investment';

      // Build alert title
      const frequency = investmentPlan.investment_frequency || 'monthly';
      const frequencyLabel = frequency.charAt(0).toUpperCase() + frequency.slice(1);
      const title = `${frequencyLabel} ${investmentPlan.investment_type?.toUpperCase()} Payment Due - ${investmentPlan.notes || assetTypeName}`;

      // Build config_data JSONB
      const configData = {
        investment_plan_id: investmentPlan.id,
        customer_name: customerName,
        asset_type: assetTypeName,
        recurring_amount: investmentPlan.recurring_amount,
        frequency: investmentPlan.investment_frequency,
        scheme_code: investmentPlan.scheme_code || null,
        auto_generated: true,
        source: 'investment_plan_creation'
      };

      // Insert the alert
      const alertQuery = `
        INSERT INTO t_jtbd_configurations (
          tenant_id, is_live, customer_id, jtbd_type, jtbd_category,
          title, description, priority, is_active, config_data,
          next_alert_date, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      `;

      const alertValues = [
        tenantId,
        isLive,
        investmentPlan.customer_id,
        'goal_sip_plan',           // jtbd_type
        'alert',                   // jtbd_category
        title,
        `${frequencyLabel} payment of ₹${investmentPlan.recurring_amount?.toLocaleString('en-IN')} for ${investmentPlan.notes || assetTypeName}`,
        'medium',                  // priority
        true,                      // is_active
        JSON.stringify(configData),
        nextPaymentDate,
        userId
      ];

      await pool.query(alertQuery, alertValues);
      console.log(`✅ Created SIP alert for investment plan ${investmentPlan.id}`);
    } catch (error) {
      // Log error but don't fail the investment plan creation
      console.error('⚠️ Failed to create SIP alert:', error);
    }
  }

  /**
   * Calculate the next payment date based on start date and frequency
   */
  private calculateNextPaymentDate(
    startDate: string | Date | undefined,
    frequency: string
  ): string {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let baseDate = startDate ? new Date(startDate) : today;
    baseDate.setHours(0, 0, 0, 0);

    // If start date is in the future, that's the next payment date
    if (baseDate > today) {
      return baseDate.toISOString().split('T')[0];
    }

    // Calculate interval in months
    let intervalMonths = 1; // monthly default
    if (frequency === 'quarterly') intervalMonths = 3;
    if (frequency === 'yearly') intervalMonths = 12;

    // Find the next payment date after today
    let nextDate = new Date(baseDate);
    while (nextDate <= today) {
      nextDate.setMonth(nextDate.getMonth() + intervalMonths);
    }

    return nextDate.toISOString().split('T')[0];
  }

  /**
   * Get all investment plans for a customer
   */
  async getCustomerInvestmentPlans(
    customerId: number,
    tenantId: number,
    isLive: boolean
  ): Promise<InvestmentPlan[]> {
    const query = `
      SELECT
        ca.*,
        at.asset_type_code,
        at.asset_type_name,
        at.category,
        at.default_assumption_rate,
        at.display_order,
        at.description,
        sb.scheme_name,
        sb.alias_name as scheme_alias_name
      FROM t_customer_asset_assignments ca
      INNER JOIN m_asset_types at ON ca.asset_type_id = at.id
      LEFT JOIN t_scheme_bookmarks sb ON ca.scheme_code = sb.scheme_code
        AND sb.tenant_id = ca.tenant_id
        AND sb.is_live = ca.is_live
      WHERE ca.customer_id = $1
        AND ca.tenant_id = $2
        AND ca.is_live = $3
        AND ca.is_active = true
      ORDER BY ca.assigned_at DESC
    `;

    const result = await pool.query(query, [customerId, tenantId, isLive]);
    return result.rows;
  }

  /**
   * Get single investment plan by ID
   */
  async getInvestmentPlanById(
    id: number,
    tenantId: number,
    isLive: boolean
  ): Promise<InvestmentPlan | null> {
    const query = `
      SELECT
        ca.*,
        at.asset_type_code,
        at.asset_type_name,
        at.category,
        at.default_assumption_rate,
        at.display_order,
        at.description,
        sb.scheme_name,
        sb.alias_name as scheme_alias_name
      FROM t_customer_asset_assignments ca
      INNER JOIN m_asset_types at ON ca.asset_type_id = at.id
      LEFT JOIN t_scheme_bookmarks sb ON ca.scheme_code = sb.scheme_code
        AND sb.tenant_id = ca.tenant_id
        AND sb.is_live = ca.is_live
      WHERE ca.id = $1
        AND ca.tenant_id = $2
        AND ca.is_live = $3
    `;

    const result = await pool.query(query, [id, tenantId, isLive]);
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  /**
   * Update investment plan
   */
  async updateInvestmentPlan(
    id: number,
    data: UpdateInvestmentPlanRequest,
    tenantId: number,
    isLive: boolean
  ): Promise<InvestmentPlan> {
    // Validate
    const validation = this.validateInvestmentPlan(data, true);
    if (!validation.valid) {
      throw new Error(`Validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
    }

    // Build dynamic update query
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (data.principal_amount !== undefined) {
      updates.push(`principal_amount = $${paramIndex++}`);
      values.push(data.principal_amount);
    }
    if (data.start_date !== undefined) {
      updates.push(`start_date = $${paramIndex++}`);
      values.push(data.start_date);
    }
    if (data.has_started !== undefined) {
      updates.push(`has_started = $${paramIndex++}`);
      values.push(data.has_started);
    }
    if (data.duration_months !== undefined) {
      updates.push(`duration_months = $${paramIndex++}`);
      values.push(data.duration_months);
    }
    if (data.duration_years !== undefined) {
      updates.push(`duration_years = $${paramIndex++}`);
      values.push(data.duration_years);
    }
    if (data.investment_type !== undefined) {
      updates.push(`investment_type = $${paramIndex++}`);
      values.push(data.investment_type);
    }
    if (data.recurring_amount !== undefined) {
      updates.push(`recurring_amount = $${paramIndex++}`);
      values.push(data.recurring_amount);
    }
    if (data.investment_frequency !== undefined) {
      updates.push(`investment_frequency = $${paramIndex++}`);
      values.push(data.investment_frequency);
    }
    if (data.custom_assumption_rate !== undefined) {
      updates.push(`custom_assumption_rate = $${paramIndex++}`);
      values.push(data.custom_assumption_rate);
    }
    if (data.notes !== undefined) {
      updates.push(`notes = $${paramIndex++}`);
      values.push(data.notes);
    }

    if (updates.length === 0) {
      throw new Error('No fields to update');
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id, tenantId, isLive);

    const query = `
      UPDATE t_customer_asset_assignments
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex++}
        AND tenant_id = $${paramIndex++}
        AND is_live = $${paramIndex++}
      RETURNING *
    `;

    const result = await pool.query(query, values);
    if (result.rows.length === 0) {
      throw new Error('Investment plan not found');
    }

    return result.rows[0];
  }

  /**
   * Delete investment plan (soft delete)
   */
  async deleteInvestmentPlan(
    id: number,
    tenantId: number,
    isLive: boolean
  ): Promise<void> {
    const query = `
      UPDATE t_customer_asset_assignments
      SET is_active = false, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND tenant_id = $2 AND is_live = $3
    `;

    const result = await pool.query(query, [id, tenantId, isLive]);
    if (result.rowCount === 0) {
      throw new Error('Investment plan not found');
    }
  }

  /**
   * Toggle alerts enabled/disabled for an investment plan
   */
  async toggleAlerts(
    id: number,
    tenantId: number,
    isLive: boolean
  ): Promise<{ id: number; alerts_enabled: boolean }> {
    const query = `
      UPDATE t_customer_asset_assignments
      SET alerts_enabled = NOT COALESCE(alerts_enabled, true),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND tenant_id = $2 AND is_live = $3 AND is_active = true
      RETURNING id, alerts_enabled
    `;

    const result = await pool.query(query, [id, tenantId, isLive]);
    if (result.rowCount === 0) {
      throw new Error('Investment plan not found');
    }

    return result.rows[0];
  }

  /**
   * Get family investment summary
   */
  async getFamilyInvestmentSummary(
    familyHeadIwellCode: string,
    tenantId: number,
    isLive: boolean
  ): Promise<FamilyInvestmentSummary> {
    // Get family head
    const familyHeadQuery = `
      SELECT id FROM t_customers
      WHERE iwell_code = $1 AND tenant_id = $2 AND is_live = $3
    `;
    const familyHeadResult = await pool.query(familyHeadQuery, [familyHeadIwellCode, tenantId, isLive]);

    if (familyHeadResult.rows.length === 0) {
      throw new Error('Family head not found');
    }

    const familyHeadId = familyHeadResult.rows[0].id;

    // Get all family members
    const familyMembersQuery = `
      SELECT id, name FROM t_customers
      WHERE (id = $1 OR family_head_id = $1)
        AND tenant_id = $2
        AND is_live = $3
    `;
    const familyMembers = await pool.query(familyMembersQuery, [familyHeadId, tenantId, isLive]);
    const memberIds = familyMembers.rows.map(m => m.id);

    if (memberIds.length === 0) {
      throw new Error('No family members found');
    }

    // Get all investments for family
    const investmentsQuery = `
      SELECT
        ca.*,
        at.asset_type_code,
        at.asset_type_name,
        at.default_assumption_rate,
        c.name as customer_name
      FROM t_customer_asset_assignments ca
      INNER JOIN m_asset_types at ON ca.asset_type_id = at.id
      INNER JOIN t_customers c ON ca.customer_id = c.id
      WHERE ca.customer_id = ANY($1)
        AND ca.tenant_id = $2
        AND ca.is_live = $3
        AND ca.is_active = true
    `;
    const investments = await pool.query(investmentsQuery, [memberIds, tenantId, isLive]);

    // Calculate aggregations
    const summary: FamilyInvestmentSummary = {
      family_head_id: familyHeadId,
      family_head_iwell_code: familyHeadIwellCode,
      total_principal: 0,
      total_current_value: 0,
      total_gain_loss: 0,
      investments_by_asset_type: [],
      family_members: []
    };

    const assetTypeMap: { [key: string]: any } = {};
    const memberMap: { [key: number]: any } = {};

    investments.rows.forEach((inv: any) => {
      const principal = inv.principal_amount || 0;
      const currentValue = this.calculateCurrentValue(inv);
      const gainLoss = currentValue - principal;

      summary.total_principal += principal;
      summary.total_current_value += currentValue;
      summary.total_gain_loss += gainLoss;

      // By asset type
      if (!assetTypeMap[inv.asset_type_code]) {
        assetTypeMap[inv.asset_type_code] = {
          asset_type_code: inv.asset_type_code,
          asset_type_name: inv.asset_type_name,
          count: 0,
          total_principal: 0,
          total_current_value: 0
        };
      }
      assetTypeMap[inv.asset_type_code].count++;
      assetTypeMap[inv.asset_type_code].total_principal += principal;
      assetTypeMap[inv.asset_type_code].total_current_value += currentValue;

      // By member
      if (!memberMap[inv.customer_id]) {
        memberMap[inv.customer_id] = {
          customer_id: inv.customer_id,
          customer_name: inv.customer_name,
          total_principal: 0,
          total_current_value: 0,
          investment_count: 0
        };
      }
      memberMap[inv.customer_id].total_principal += principal;
      memberMap[inv.customer_id].total_current_value += currentValue;
      memberMap[inv.customer_id].investment_count++;
    });

    summary.investments_by_asset_type = Object.values(assetTypeMap);
    summary.family_members = Object.values(memberMap);

    return summary;
  }

  /**
   * Calculate current value of an investment
   */
  private calculateCurrentValue(investment: any): number {
    if (!investment.principal_amount || !investment.start_date || !investment.has_started) {
      return investment.principal_amount || 0;
    }

    const growthRate = (investment.custom_assumption_rate || investment.default_assumption_rate || 0) / 100;
    const startDate = new Date(investment.start_date);
    const today = new Date();
    const yearsElapsed = (today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25);

    if (yearsElapsed <= 0) {
      return investment.principal_amount;
    }

    if (investment.investment_type === 'one_time') {
      // Compound interest: FV = PV * (1 + r)^t
      return investment.principal_amount * Math.pow(1 + growthRate, yearsElapsed);
    } else if (investment.investment_type === 'sip' || investment.investment_type === 'recurring') {
      // SIP future value formula
      const recurringAmount = investment.recurring_amount || 0;
      const principal = investment.principal_amount || 0;

      // Calculate number of payments based on frequency
      let paymentsPerYear = 12; // monthly by default
      if (investment.investment_frequency === 'quarterly') paymentsPerYear = 4;
      if (investment.investment_frequency === 'yearly') paymentsPerYear = 1;

      const periodicRate = growthRate / paymentsPerYear;
      const totalPayments = Math.floor(yearsElapsed * paymentsPerYear);

      // Future value of lump sum principal
      const principalFV = principal * Math.pow(1 + growthRate, yearsElapsed);

      // Future value of SIP payments
      let sipFV = 0;
      if (totalPayments > 0 && periodicRate > 0) {
        sipFV = recurringAmount * ((Math.pow(1 + periodicRate, totalPayments) - 1) / periodicRate) * (1 + periodicRate);
      } else {
        sipFV = recurringAmount * totalPayments;
      }

      return principalFV + sipFV;
    }

    return investment.principal_amount;
  }

  /**
   * Verify that scheme is bookmarked for the tenant (for MF investments)
   */
  private async verifySchemeBookmark(
    schemeCode: string,
    tenantId: number,
    isLive: boolean
  ): Promise<void> {
    const query = `
      SELECT id FROM t_scheme_bookmarks
      WHERE scheme_code = $1
        AND tenant_id = $2
        AND is_live = $3
        AND is_active = true
    `;

    const result = await pool.query(query, [schemeCode, tenantId, isLive]);

    if (result.rows.length === 0) {
      throw new Error('Scheme must be bookmarked before creating MF investment');
    }
  }

  /**
   * Bulk assign investment plans to all family members
   */
  async bulkAssignToFamily(
    familyHeadIwellCode: string,
    data: CreateInvestmentPlanRequest,
    tenantId: number,
    isLive: boolean,
    userId: number
  ): Promise<InvestmentPlan[]> {
    // Get family head
    const familyHeadQuery = `
      SELECT id FROM t_customers
      WHERE iwell_code = $1 AND tenant_id = $2 AND is_live = $3
    `;
    const familyHeadResult = await pool.query(familyHeadQuery, [familyHeadIwellCode, tenantId, isLive]);

    if (familyHeadResult.rows.length === 0) {
      throw new Error('Family head not found');
    }

    const familyHeadId = familyHeadResult.rows[0].id;

    // Get all family members
    const familyMembersQuery = `
      SELECT id FROM t_customers
      WHERE (id = $1 OR family_head_id = $1)
        AND tenant_id = $2
        AND is_live = $3
    `;
    const familyMembers = await pool.query(familyMembersQuery, [familyHeadId, tenantId, isLive]);

    const results: InvestmentPlan[] = [];

    for (const member of familyMembers.rows) {
      const memberData = { ...data, customer_id: member.id };
      const plan = await this.createInvestmentPlan(memberData, tenantId, isLive, userId);
      results.push(plan);
    }

    return results;
  }
}
