// backend/src/services/goal.service.ts

import { Pool, PoolClient } from 'pg';
import { pool } from '../config/database';
import { GoalCalculatorService } from './goal.calculator.service';
import { JTBDExecutionService } from './jtbd.execution.service';
import {
  GoalConfig,
  TimeBasedGoalConfig,
  PriceBasedGoalConfig,
  TimeAndPriceGoalConfig,
  GoalTrackingType,
  CreateGoalRequest,
  UpdateGoalRequest,
  GoalRecalculationResult,
  GoalProgressSnapshot,
  GoalSummary
} from '../types/goal.types';
import { JTBDConfiguration } from '../types/jtbd.types';

export class GoalService {
  private db: Pool;
  private calculator: GoalCalculatorService;

  constructor() {
    this.db = pool;
    this.calculator = new GoalCalculatorService();
  }

  // ==================== TYPE GUARDS ====================
  
  private isTimeBasedConfig(config: Partial<GoalConfig>): config is Partial<TimeBasedGoalConfig> {
    return config.goal_type === 'time_based_goal';
  }

  private isPriceBasedConfig(config: Partial<GoalConfig>): config is Partial<PriceBasedGoalConfig> {
    return config.goal_type === 'price_based_goal';
  }

  private isTimeAndPriceConfig(config: Partial<GoalConfig>): config is Partial<TimeAndPriceGoalConfig> {
    return config.goal_type === 'time_and_price_goal';
  }

  // ==================== CREATE ====================
  
  /**
   * Create new goal
   */
  async createGoal(
    tenantId: number,
    isLive: boolean,
    data: CreateGoalRequest,
    createdBy: number
  ): Promise<JTBDConfiguration> {
    const client = await this.db.connect();

    try {
      await client.query('BEGIN');

      // Validate goal configuration
      const validation = this.validateGoalConfig(data.goal_type, data.config_data);
      if (!validation.is_valid) {
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
      }

      // Phase 2: Use current_value directly (no scheme validation or portfolio calculation)
      const currentValue = data.config_data.current_value || 0;

      // Perform initial calculation based on goal type
      const finalConfig = await this.performInitialCalculation(
        data.goal_type,
        data.config_data,
        currentValue
      );

      // Insert into t_jtbd_configurations with jtbd_type = 'goal_tracking'
      const insertQuery = `
        INSERT INTO t_jtbd_configurations (
          tenant_id, is_live, customer_id, jtbd_type, jtbd_category, title, description,
          priority, config_data, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
      `;

      const result = await client.query(insertQuery, [
        tenantId,
        isLive,
        data.customer_id,
        'goal_tracking', // New jtbd_type
        'transactional', // jtbd_category - goals are transactional
        data.title,
        data.description || null,
        data.priority || 'medium',
        JSON.stringify(finalConfig),
        createdBy
      ]);

      const goalId = result.rows[0].id;

      // Create initial progress snapshot
      await this.createProgressSnapshot(
        client,
        tenantId,
        isLive,
        goalId,
        finalConfig,
        'goal_creation'
      );

      // Create SIP execution records for monthly investments (if applicable)
      if (finalConfig.monthly_contribution && finalConfig.monthly_contribution > 0) {
        console.log(`[Goal Service] Checking SIP execution creation for goal ${goalId}`);
        console.log(`[Goal Service] Goal type: ${finalConfig.goal_type}`);
        console.log(`[Goal Service] Monthly contribution: ${finalConfig.monthly_contribution}`);
        console.log(`[Goal Service] Final config:`, JSON.stringify(finalConfig, null, 2));

        let durationMonths = 0;
        let startDate = new Date(); // Default to today

        // Calculate duration based on goal type
        if (finalConfig.goal_type === 'time_based_goal') {
          const target = new Date(finalConfig.target_date);
          durationMonths = Math.ceil((target.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30.44)); // Avg month length
        } else if (finalConfig.goal_type === 'price_based_goal') {
          durationMonths = finalConfig.months_to_achievement || 0;
        } else if (finalConfig.goal_type === 'time_and_price_goal') {
          const target = new Date(finalConfig.target_date);
          durationMonths = Math.ceil((target.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30.44)); // Avg month length
        }

        console.log(`[Goal Service] Calculated duration: ${durationMonths} months`);

        if (durationMonths > 0 && durationMonths <= 600) { // Max 50 years = 600 months
          console.log(`[Goal Service] Creating ${durationMonths} monthly SIP executions for goal ${goalId}`);

          const executionService = new JTBDExecutionService();

          // Create execution records for each month (within same transaction)
          for (let month = 0; month < durationMonths; month++) {
            const scheduledDate = new Date(startDate);
            scheduledDate.setMonth(scheduledDate.getMonth() + month);

            // Format as YYYY-MM-DD
            const dateStr = scheduledDate.toISOString().split('T')[0];

            const sipExecutionData = {
              month_number: month + 1,
              total_months: durationMonths,
              sip_amount: finalConfig.monthly_contribution,
              goal_id: goalId,
              goal_title: data.title,
              goal_type: finalConfig.goal_type,
            };

            await executionService.createExecution(
              tenantId,
              isLive,
              {
                config_id: goalId,
                customer_id: data.customer_id,
                execution_type: 'goal_sip_plan',
                title: `SIP Payment ${month + 1}/${durationMonths} - ${data.title}`,
                description: `Monthly SIP of ₹${finalConfig.monthly_contribution}`,
                priority: 'medium',
                scheduled_date: dateStr,
                execution_data: sipExecutionData,
              },
              createdBy,
              client // Pass transaction client for FK constraint
            );
          }

          console.log(`[Goal Service] Successfully created ${durationMonths} SIP executions for goal ${goalId}`);
        } else {
          console.log(`[Goal Service] Skipping SIP execution creation - invalid duration: ${durationMonths}`);
        }
      } else {
        console.log(`[Goal Service] Skipping SIP execution creation - no monthly contribution or zero amount`);
      }

      // Update customer goal count
      await client.query(
        `UPDATE t_customers
         SET jtbd_count = jtbd_count + 1,
             has_jtbd_setup = true,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1 AND tenant_id = $2 AND is_live = $3`,
        [data.customer_id, tenantId, isLive]
      );

      await client.query('COMMIT');

      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error creating goal:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // ==================== READ ====================

  /**
   * Get single goal by ID
   */
  async getGoal(
    tenantId: number,
    isLive: boolean,
    goalId: number
  ): Promise<JTBDConfiguration | null> {
    try {
      const query = `
        SELECT * FROM t_jtbd_configurations
        WHERE id = $1 AND tenant_id = $2 AND is_live = $3 AND jtbd_type = 'goal_tracking'
      `;

      const result = await this.db.query(query, [goalId, tenantId, isLive]);

      if (result.rows.length === 0) {
        return null;
      }

      return result.rows[0];
    } catch (error) {
      console.error('Error getting goal:', error);
      throw error;
    }
  }

  /**
   * Get all goals for a customer
   */
  async getCustomerGoals(
    tenantId: number,
    isLive: boolean,
    customerId: number
  ): Promise<JTBDConfiguration[]> {
    try {
      const query = `
        SELECT * FROM t_jtbd_configurations
        WHERE tenant_id = $1 AND is_live = $2 AND customer_id = $3 AND jtbd_type = 'goal_tracking'
        ORDER BY priority DESC, created_at DESC
      `;

      const result = await this.db.query(query, [tenantId, isLive, customerId]);

      return result.rows;
    } catch (error) {
      console.error('Error getting customer goals:', error);
      throw error;
    }
  }

  /**
   * Get all goals across all customers (for tenant)
   */
  async getAllGoals(
    tenantId: number,
    isLive: boolean
  ): Promise<any[]> {
    try {
      const query = `
        SELECT
          j.id,
          j.customer_id,
          c.name as customer_name,
          j.title,
          j.description,
          j.priority,
          j.is_active,
          j.is_watchlisted,
          j.watchlist_reason,
          j.config_data,
          j.created_at,
          j.updated_at,
          (j.config_data->>'goal_type') as goal_type,
          (j.config_data->>'goal_name') as goal_name,
          COALESCE((j.config_data->>'target_amount')::numeric, 0) as target_amount,
          COALESCE((j.config_data->>'current_value')::numeric, 0) as current_value,
          (j.config_data->>'target_date') as target_date,
          COALESCE((j.config_data->>'deviation_percentage')::numeric, 0) as deviation_percentage,
          COALESCE((j.config_data->>'on_track')::boolean, true) as on_track,
          COALESCE((j.config_data->>'has_withdrawals')::boolean, false) as has_withdrawals
        FROM t_jtbd_configurations j
        JOIN t_customers cust ON cust.id = j.customer_id
        JOIN t_contacts c ON c.id = cust.contact_id
        WHERE j.tenant_id = $1
          AND j.is_live = $2
          AND j.jtbd_type = 'goal_tracking'
          AND j.is_active = true
        ORDER BY j.created_at DESC
      `;

      const result = await this.db.query(query, [tenantId, isLive]);

      return result.rows.map(row => ({
        id: row.id,
        customerId: row.customer_id,
        customerName: row.customer_name,
        title: row.title,
        description: row.description,
        priority: row.priority,
        isActive: row.is_active,
        isWatchlisted: row.is_watchlisted,
        watchlistReason: row.watchlist_reason,
        goalType: row.goal_type,
        goalName: row.goal_name,
        targetAmount: parseFloat(row.target_amount) || 0,
        currentValue: parseFloat(row.current_value) || 0,
        targetDate: row.target_date,
        deviationPercentage: parseFloat(row.deviation_percentage) || 0,
        onTrack: row.on_track,
        hasWithdrawals: row.has_withdrawals,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }));
    } catch (error) {
      console.error('Error getting all goals:', error);
      throw error;
    }
  }

  /**
   * Get goal summary for customer
   */
  async getCustomerGoalSummary(
    tenantId: number,
    isLive: boolean,
    customerId: number
  ): Promise<GoalSummary> {
    try {
      const query = `
        SELECT 
          COUNT(*) as total_goals,
          SUM(CASE 
            WHEN (config_data->>'on_track')::boolean = true THEN 1 
            ELSE 0 
          END) as goals_on_track,
          SUM(CASE 
            WHEN (config_data->>'deviation_percentage')::numeric < 0 THEN 1 
            ELSE 0 
          END) as goals_behind,
          SUM(CASE 
            WHEN (config_data->>'deviation_percentage')::numeric > 0 THEN 1 
            ELSE 0 
          END) as goals_ahead,
          SUM(COALESCE((config_data->>'target_amount')::numeric, 0)) as total_target_corpus,
          SUM(COALESCE((config_data->>'current_value')::numeric, 0)) as total_current_value
        FROM t_jtbd_configurations
        WHERE tenant_id = $1 AND is_live = $2 AND customer_id = $3 
          AND jtbd_type = 'goal_tracking' AND is_active = true
      `;

      const result = await this.db.query(query, [tenantId, isLive, customerId]);
      const row = result.rows[0];

      const totalGoals = parseInt(row.total_goals) || 0;
      const totalTarget = parseFloat(row.total_target_corpus) || 0;
      const totalCurrent = parseFloat(row.total_current_value) || 0;

      return {
        customer_id: customerId,
        total_goals: totalGoals,
        goals_on_track: parseInt(row.goals_on_track) || 0,
        goals_behind: parseInt(row.goals_behind) || 0,
        goals_ahead: parseInt(row.goals_ahead) || 0,
        total_target_corpus: totalTarget,
        total_current_value: totalCurrent,
        average_progress: totalTarget > 0 ? (totalCurrent / totalTarget) * 100 : 0
      };
    } catch (error) {
      console.error('Error getting customer goal summary:', error);
      throw error;
    }
  }

  /**
   * Get goal progress history
   */
  async getGoalProgressHistory(
    tenantId: number,
    isLive: boolean,
    goalId: number,
    limit: number = 12
  ): Promise<GoalProgressSnapshot[]> {
    try {
      const query = `
        SELECT * FROM t_goal_progress_snapshots
        WHERE tenant_id = $1 AND is_live = $2 AND goal_id = $3
        ORDER BY snapshot_date DESC
        LIMIT $4
      `;

      const result = await this.db.query(query, [tenantId, isLive, goalId, limit]);

      return result.rows;
    } catch (error) {
      console.error('Error getting goal progress history:', error);
      throw error;
    }
  }

  // ==================== UPDATE ====================

  /**
   * Update goal configuration
   */
  async updateGoal(
    tenantId: number,
    isLive: boolean,
    goalId: number,
    data: UpdateGoalRequest
  ): Promise<JTBDConfiguration | null> {
    const client = await this.db.connect();

    try {
      await client.query('BEGIN');

      // Get existing goal
      const existing = await this.getGoal(tenantId, isLive, goalId);
      if (!existing) {
        return null;
      }

      const updateFields: string[] = [];
      const queryParams: any[] = [];
      let paramIndex = 1;

      if (data.title !== undefined) {
        updateFields.push(`title = $${paramIndex}`);
        queryParams.push(data.title);
        paramIndex++;
      }

      if (data.description !== undefined) {
        updateFields.push(`description = $${paramIndex}`);
        queryParams.push(data.description);
        paramIndex++;
      }

      if (data.priority !== undefined) {
        updateFields.push(`priority = $${paramIndex}`);
        queryParams.push(data.priority);
        paramIndex++;
      }

      if (data.config_data !== undefined) {
        // Merge with existing config
        const existingConfig = existing.config_data as unknown as GoalConfig;
        const updatedConfig = { ...existingConfig, ...data.config_data };

        // Validate new config
        const validation = this.validateGoalConfig(existingConfig.goal_type, updatedConfig);
        if (!validation.is_valid) {
          throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
        }

        // Recalculate with new config
        const currentValue = await this.getGoalPortfolioValue(
          client,
          tenantId,
          isLive,
          existing.customer_id,
          updatedConfig.linked_schemes
        );

        const finalConfig = await this.performInitialCalculation(
          existingConfig.goal_type,
          updatedConfig,
          currentValue
        );

        updateFields.push(`config_data = ${paramIndex}`);
        queryParams.push(JSON.stringify(finalConfig));
        paramIndex++;

        // Create snapshot for this update
        await this.createProgressSnapshot(
          client,
          tenantId,
          isLive,
          goalId,
          finalConfig,
          'goal_update'
        );
      }

      updateFields.push('updated_at = CURRENT_TIMESTAMP');

      const updateQuery = `
        UPDATE t_jtbd_configurations
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex} AND tenant_id = $${paramIndex + 1} AND is_live = $${paramIndex + 2}
        RETURNING *
      `;

      queryParams.push(goalId, tenantId, isLive);

      const result = await client.query(updateQuery, queryParams);

      await client.query('COMMIT');

      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error updating goal:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Delete goal
   */
  async deleteGoal(
    tenantId: number,
    isLive: boolean,
    goalId: number
  ): Promise<boolean> {
    const client = await this.db.connect();

    try {
      await client.query('BEGIN');

      // Get goal to find customer_id
      const goal = await this.getGoal(tenantId, isLive, goalId);
      if (!goal) {
        return false;
      }

      // Delete goal (cascades to snapshots and alerts)
      await client.query(
        'DELETE FROM t_jtbd_configurations WHERE id = $1 AND tenant_id = $2 AND is_live = $3',
        [goalId, tenantId, isLive]
      );

      // Update customer goal count
      await client.query(
        `UPDATE t_customers 
         SET jtbd_count = GREATEST(jtbd_count - 1, 0),
             has_jtbd_setup = CASE 
               WHEN jtbd_count - 1 <= 0 THEN false 
               ELSE true 
             END,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1 AND tenant_id = $2 AND is_live = $3`,
        [goal.customer_id, tenantId, isLive]
      );

      await client.query('COMMIT');
      return true;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error deleting goal:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // ==================== RECALCULATION ====================

  /**
   * Recalculate single goal
   */
  async recalculateGoal(
    tenantId: number,
    isLive: boolean,
    goalId: number,
    trigger: string = 'manual'
  ): Promise<GoalRecalculationResult> {
    const client = await this.db.connect();

    try {
      await client.query('BEGIN');

      // Fetch goal
      const goal = await this.getGoal(tenantId, isLive, goalId);
      if (!goal) {
        throw new Error('Goal not found');
      }

      const config = goal.config_data as unknown as GoalConfig;

      // Get previous snapshot for comparison
      const previousSnapshot = await this.getLatestSnapshot(client, goalId);

      // Get current portfolio value (Phase 2: includes investment plan allocations)
      const currentValue = await this.getGoalPortfolioValue(
        client,
        tenantId,
        isLive,
        goal.customer_id,
        config.linked_schemes,
        goalId
      );

      // Recalculate based on goal type
      let recalculated: Partial<GoalConfig>;

      if (config.goal_type === 'time_based_goal') {
        recalculated = await this.calculator.recalculateTimeBasedGoal(
          config as TimeBasedGoalConfig,
          currentValue
        );
      } else if (config.goal_type === 'price_based_goal') {
        recalculated = await this.calculator.recalculatePriceBasedGoal(
          config as PriceBasedGoalConfig,
          currentValue
        );
      } else {
        recalculated = await this.calculator.recalculateTimeAndPriceGoal(
          config as TimeAndPriceGoalConfig,
          currentValue
        );
      }

      // Update goal config_data
      const updatedConfig = { ...config, ...recalculated } as GoalConfig;
      
      await client.query(
        `UPDATE t_jtbd_configurations 
         SET config_data = $1, updated_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [JSON.stringify(updatedConfig), goalId]
      );

      // Create progress snapshot
      await this.createProgressSnapshot(
        client,
        tenantId,
        isLive,
        goalId,
        updatedConfig,
        trigger
      );

      // Check if alerts need to be triggered
      await this.checkAndCreateAlerts(
        client,
        tenantId,
        isLive,
        goalId,
        goal.customer_id,
        updatedConfig,
        previousSnapshot
      );

      await client.query('COMMIT');

      // Build result
      return this.buildRecalculationResult(goal, updatedConfig, previousSnapshot);
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error recalculating goal:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Recalculate all active goals for a customer
   */
  async recalculateCustomerGoals(
    tenantId: number,
    isLive: boolean,
    customerId: number
  ): Promise<GoalRecalculationResult[]> {
    const goals = await this.getCustomerGoals(tenantId, isLive, customerId);
    const results: GoalRecalculationResult[] = [];

    for (const goal of goals) {
      if (goal.is_active) {
        try {
          const result = await this.recalculateGoal(tenantId, isLive, goal.id, 'customer_recalc');
          results.push(result);
        } catch (error) {
          console.error(`Error recalculating goal ${goal.id}:`, error);
        }
      }
    }

    return results;
  }

  /**
   * Recalculate all active goals (for scheduled job)
   */
  async recalculateAllGoals(
    tenantId: number,
    isLive: boolean
  ): Promise<{ success: number; failed: number }> {
    const query = `
      SELECT id FROM t_jtbd_configurations
      WHERE tenant_id = $1 AND is_live = $2 AND jtbd_type = 'goal_tracking' AND is_active = true
    `;

    const result = await this.db.query(query, [tenantId, isLive]);
    const goalIds = result.rows.map(row => row.id);

    let success = 0;
    let failed = 0;

    for (const goalId of goalIds) {
      try {
        await this.recalculateGoal(tenantId, isLive, goalId, 'scheduled_recalc');
        success++;
      } catch (error) {
        console.error(`Failed to recalculate goal ${goalId}:`, error);
        failed++;
      }
    }

    return { success, failed };
  }

  // ==================== PRIVATE HELPERS ====================

  /**
   * Validate goal configuration
   */
  private validateGoalConfig(
    goalType: GoalTrackingType,
    config: Partial<GoalConfig>
  ): { is_valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Common validations
    if (!config.goal_name) errors.push('goal_name is required');
    // DEPRECATED: Assumptions moved to asset types
    // if (!config.expected_return_rate || config.expected_return_rate <= 0) {
    //   errors.push('expected_return_rate must be positive');
    // }

    // DEPRECATED: Phase 2 - Scheme allocation moved to investment plan linking
    // Goals no longer have direct scheme allocations
    // if (!config.linked_schemes || config.linked_schemes.length === 0) {
    //   errors.push('At least one linked scheme is required');
    // } else {
    //   const totalAllocation = config.linked_schemes.reduce((sum, s) => sum + s.allocation_percentage, 0);
    //   if (Math.abs(totalAllocation - 100) > 0.01) {
    //     errors.push('Scheme allocation must sum to 100%');
    //   }
    // }

    // DEPRECATED: Phase 2 - Monthly contribution is part of investment plans, not goals
    // if (config.monthly_contribution === undefined || config.monthly_contribution < 0) {
    //   errors.push('monthly_contribution must be non-negative');
    // }

    // Type-specific validations using type assertions
    if (goalType === 'time_based_goal') {
      const timeConfig = config as Partial<TimeBasedGoalConfig>;
      if (!timeConfig.target_date) {
        errors.push('target_date is required for time-based goals');
      }
    } else if (goalType === 'price_based_goal') {
      const priceConfig = config as Partial<PriceBasedGoalConfig>;
      if (!priceConfig.target_amount || priceConfig.target_amount <= 0) {
        errors.push('target_amount must be positive for price-based goals');
      }
    } else if (goalType === 'time_and_price_goal') {
      const tpConfig = config as Partial<TimeAndPriceGoalConfig>;
      if (!tpConfig.target_date) {
        errors.push('target_date is required');
      }
      if (!tpConfig.target_amount || tpConfig.target_amount <= 0) {
        errors.push('target_amount must be positive');
      }
    }

    return { is_valid: errors.length === 0, errors };
  }

  /**
   * Validate linked schemes exist in portfolio
   * Note: In Phase 2, goals may not have linked_schemes (using investment plan allocations instead)
   */
  private async validateLinkedSchemes(
    client: PoolClient,
    tenantId: number,
    isLive: boolean,
    customerId: number,
    linkedSchemes: GoalConfig['linked_schemes']
  ): Promise<void> {
    // Phase 2: linked_schemes may be null/undefined when using investment plan allocations
    if (!linkedSchemes || !Array.isArray(linkedSchemes) || linkedSchemes.length === 0) {
      return; // Skip validation - goal uses investment plan allocations
    }

    for (const scheme of linkedSchemes) {
      const result = await client.query(
        `SELECT 1 FROM t_customer_master_portfolio
         WHERE tenant_id = $1 AND is_live = $2 AND customer_id = $3 AND scheme_code = $4`,
        [tenantId, isLive, customerId, scheme.scheme_code]
      );

      if (result.rows.length === 0) {
        throw new Error(`Scheme ${scheme.scheme_code} not found in customer's portfolio`);
      }
    }
  }

  /**
 * Get goal portfolio value from linked schemes (using month-end NAV)
 * Queries v_portfolio_current materialized view
 * Uses scheme_value_month_end for stable goal tracking
 * In Phase 2: Falls back to investment plan allocations if no linked_schemes
 */
private async getGoalPortfolioValue(
  client: PoolClient,
  tenantId: number,
  isLive: boolean,
  customerId: number,
  linkedSchemes: GoalConfig['linked_schemes'],
  goalId?: number
): Promise<number> {
  // Phase 2: If no linked_schemes, get value from investment plan allocations
  if (!linkedSchemes || !Array.isArray(linkedSchemes) || linkedSchemes.length === 0) {
    if (goalId) {
      return this.getGoalValueFromInvestmentPlans(client, tenantId, isLive, goalId);
    }
    return 0;
  }

  let totalValue = 0;

  for (const link of linkedSchemes) {
    try {
      const result = await client.query(
        `SELECT 
           scheme_code,
           total_units,
           month_end_nav_date,
           month_end_nav,
           scheme_value_month_end
         FROM v_portfolio_current
         WHERE tenant_id = $1 
           AND customer_id = $2 
           AND scheme_code = $3`,
        [tenantId, customerId, link.scheme_code]
      );

      if (result.rows.length > 0) {
        const row = result.rows[0];
        const schemeValue = parseFloat(row.scheme_value_month_end) || 0;
        
        // Apply allocation percentage
        const weightedValue = (schemeValue * link.allocation_percentage / 100);
        
        totalValue += weightedValue;

        console.log(
          `Scheme ${row.scheme_code}: ${row.total_units} units × ₹${row.month_end_nav} (${row.month_end_nav_date}) = ₹${schemeValue}. Weighted (${link.allocation_percentage}%): ₹${weightedValue}`
        );
      } else {
        console.warn(
          `Scheme ${link.scheme_code} not found in portfolio for tenant ${tenantId}, customer ${customerId}`
        );
      }
    } catch (error) {
      console.error(
        `Error fetching portfolio value for scheme ${link.scheme_code}:`,
        error
      );
      throw error;
    }
  }

  console.log(`Total goal portfolio value (month-end): ₹${totalValue}`);
  return totalValue;
}

  /**
   * Get goal value from investment plan allocations (Phase 2)
   * Uses t_goal_investment_allocations table
   * Note: Uses pool query (not transaction) to avoid transaction abort on table not found
   */
  private async getGoalValueFromInvestmentPlans(
    client: PoolClient,
    tenantId: number,
    isLive: boolean,
    goalId: number
  ): Promise<number> {
    try {
      // First check if the table exists (using pool to avoid transaction issues)
      const tableCheck = await this.db.query(
        `SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_name = 't_goal_investment_allocations'
        ) as exists`
      );

      if (!tableCheck.rows[0]?.exists) {
        console.log('t_goal_investment_allocations table does not exist yet - using default value');
        return 0;
      }

      // Get all investment plan allocations for this goal (using pool to avoid transaction issues)
      const result = await this.db.query(
        `SELECT
           gia.investment_plan_id,
           gia.allocated_percentage,
           caa.principal_amount,
           caa.asset_type_id,
           at.default_assumption_rate
         FROM t_goal_investment_allocations gia
         JOIN t_customer_asset_assignments caa ON caa.id = gia.investment_plan_id
         JOIN m_asset_types at ON at.id = caa.asset_type_id
         WHERE gia.goal_id = $1
           AND gia.tenant_id = $2
           AND gia.is_live = $3
           AND gia.is_active = true
           AND caa.is_active = true`,
        [goalId, tenantId, isLive]
      );

      if (result.rows.length === 0) {
        console.log(`No investment plan allocations found for goal ${goalId}`);
        return 0;
      }

      let totalValue = 0;

      for (const row of result.rows) {
        const principalAmount = parseFloat(row.principal_amount) || 0;
        const allocationPercentage = parseFloat(row.allocated_percentage) || 100;

        // Calculate allocated value
        const allocatedValue = (principalAmount * allocationPercentage) / 100;
        totalValue += allocatedValue;

        console.log(
          `Investment Plan ${row.investment_plan_id}: ₹${principalAmount} × ${allocationPercentage}% = ₹${allocatedValue}`
        );
      }

      console.log(`Total goal value from investment plans: ₹${totalValue}`);
      return totalValue;
    } catch (error) {
      console.error(`Error getting goal value from investment plans for goal ${goalId}:`, error);
      return 0;
    }
  }

  /**
   * Perform initial calculation for new goal
   */
  private async performInitialCalculation(
    goalType: GoalTrackingType,
    config: Partial<GoalConfig>,
    currentValue: number
  ): Promise<GoalConfig> {
    // Update config with current value
    const baseConfig = { ...config, current_value: currentValue };

    if (goalType === 'time_based_goal') {
      const timeConfig = baseConfig as TimeBasedGoalConfig;
      const recalculated = await this.calculator.recalculateTimeBasedGoal(
        timeConfig,
        currentValue
      );
      return { ...timeConfig, ...recalculated } as TimeBasedGoalConfig;
    } else if (goalType === 'price_based_goal') {
      const priceConfig = baseConfig as PriceBasedGoalConfig;
      const recalculated = await this.calculator.recalculatePriceBasedGoal(
        priceConfig,
        currentValue
      );
      return { ...priceConfig, ...recalculated } as PriceBasedGoalConfig;
    } else {
      const tpConfig = baseConfig as TimeAndPriceGoalConfig;
      const recalculated = await this.calculator.recalculateTimeAndPriceGoal(
        tpConfig,
        currentValue
      );
      return { ...tpConfig, ...recalculated } as TimeAndPriceGoalConfig;
    }
  }

  /**
   * Create progress snapshot
   */
  private async createProgressSnapshot(
    client: PoolClient,
    tenantId: number,
    isLive: boolean,
    goalId: number,
    config: GoalConfig,
    trigger: string
  ): Promise<void> {
    const insertQuery = `
      INSERT INTO t_goal_progress_snapshots (
        tenant_id, is_live, goal_id, snapshot_date,
        current_value, monthly_contribution,
        projected_corpus, projected_achievement_date,
        probability_of_success, on_track, deviation_percentage,
        recalculation_trigger
      ) VALUES ($1, $2, $3, CURRENT_DATE, $4, $5, $6, $7, $8, $9, $10, $11)
      ON CONFLICT (goal_id, snapshot_date) DO UPDATE SET
        current_value = EXCLUDED.current_value,
        monthly_contribution = EXCLUDED.monthly_contribution,
        projected_corpus = EXCLUDED.projected_corpus,
        projected_achievement_date = EXCLUDED.projected_achievement_date,
        probability_of_success = EXCLUDED.probability_of_success,
        on_track = EXCLUDED.on_track,
        deviation_percentage = EXCLUDED.deviation_percentage,
        recalculation_trigger = EXCLUDED.recalculation_trigger
    `;

    const projectedCorpus = config.goal_type === 'time_based_goal' || config.goal_type === 'time_and_price_goal'
      ? (config as TimeBasedGoalConfig | TimeAndPriceGoalConfig).projected_corpus
      : null;

    const projectedDate = config.goal_type === 'price_based_goal'
      ? (config as PriceBasedGoalConfig).projected_achievement_date
      : null;

    const probability = config.goal_type === 'time_and_price_goal'
      ? (config as TimeAndPriceGoalConfig).probability_of_success
      : null;

    const onTrack = config.goal_type === 'time_and_price_goal'
      ? (config as TimeAndPriceGoalConfig).on_track
      : null;

    const deviation = config.goal_type === 'time_and_price_goal'
      ? (config as TimeAndPriceGoalConfig).deviation_percentage
      : null;

    await client.query(insertQuery, [
      tenantId,
      isLive,
      goalId,
      config.current_value,
      config.monthly_contribution,
      projectedCorpus,
      projectedDate,
      probability,
      onTrack,
      deviation,
      trigger
    ]);
  }

  /**
   * Get latest snapshot
   */
  private async getLatestSnapshot(
    client: PoolClient,
    goalId: number
  ): Promise<GoalProgressSnapshot | null> {
    const result = await client.query(
      `SELECT * FROM t_goal_progress_snapshots 
       WHERE goal_id = $1 
       ORDER BY snapshot_date DESC 
       LIMIT 1`,
      [goalId]
    );

    return result.rows.length > 0 ? result.rows[0] : null;
  }

  /**
   * Check and create alerts based on goal status
   */
  private async checkAndCreateAlerts(
    client: PoolClient,
    tenantId: number,
    isLive: boolean,
    goalId: number,
    customerId: number,
    config: GoalConfig,
    previousSnapshot: GoalProgressSnapshot | null
  ): Promise<void> {
    const alerts: Array<{
      type: string;
      severity: string;
      message: string;
      action?: string;
      details?: any;
    }> = [];

    if (config.goal_type === 'time_and_price_goal') {
      const tpConfig = config as TimeAndPriceGoalConfig;

      // Behind schedule alert
      if (!tpConfig.on_track && tpConfig.corpus_gap < 0) {
        alerts.push({
          type: 'behind_schedule',
          severity: 'warning',
          message: `Goal is behind by ₹${Math.abs(tpConfig.corpus_gap).toLocaleString('en-IN')}`,
          action: tpConfig.action_required,
          details: {
            recommended_sip_increase: tpConfig.recommended_sip_increase
          }
        });
      }

      // Low probability alert
      if (tpConfig.probability_of_success < 60) {
        alerts.push({
          type: 'low_probability',
          severity: 'critical',
          message: `Only ${tpConfig.probability_of_success.toFixed(1)}% chance of achieving goal`,
          action: 'increase_sip',
          details: {
            recommended_sip_increase: tpConfig.recommended_sip_increase
          }
        });
      }

      // Significant deviation alert (compare with previous)
      if (previousSnapshot && previousSnapshot.deviation_percentage !== null) {
        const deviationChange = tpConfig.deviation_percentage - previousSnapshot.deviation_percentage;
        if (Math.abs(deviationChange) > 5) {
          alerts.push({
            type: 'significant_deviation',
            severity: 'warning',
            message: `Goal deviation changed by ${deviationChange.toFixed(1)}%`,
            details: {
              previous_deviation: previousSnapshot.deviation_percentage,
              current_deviation: tpConfig.deviation_percentage
            }
          });
        }
      }
    }

    // Insert alerts
    for (const alert of alerts) {
      const insertQuery = `
        INSERT INTO t_goal_alerts (
          tenant_id, is_live, goal_id, customer_id,
          alert_type, severity, message, action_required, action_details
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `;

      await client.query(insertQuery, [
        tenantId,
        isLive,
        goalId,
        customerId,
        alert.type,
        alert.severity,
        alert.message,
        alert.action || null,
        alert.details ? JSON.stringify(alert.details) : null
      ]);
    }
  }

  /**
   * Build recalculation result
   */
  private buildRecalculationResult(
    goal: JTBDConfiguration,
    updatedConfig: GoalConfig,
    previousSnapshot: GoalProgressSnapshot | null
  ): GoalRecalculationResult {
    const result: GoalRecalculationResult = {
      goal_id: goal.id,
      recalculated_at: new Date().toISOString(),
      current_value: updatedConfig.current_value,
      corpus_change_from_last: 0,
      alerts_triggered: []
    };

    if (previousSnapshot) {
      result.corpus_change_from_last = 
        ((updatedConfig.current_value - previousSnapshot.current_value) / previousSnapshot.current_value) * 100;
    }

    if (updatedConfig.goal_type === 'time_based_goal') {
      const config = updatedConfig as TimeBasedGoalConfig;
      result.projected_corpus = config.projected_corpus;
    } else if (updatedConfig.goal_type === 'price_based_goal') {
      const config = updatedConfig as PriceBasedGoalConfig;
      result.projected_achievement_date = config.projected_achievement_date;
      result.months_to_achievement = config.months_to_achievement;
    } else {
      const config = updatedConfig as TimeAndPriceGoalConfig;
      result.projected_corpus_at_target = config.projected_corpus;
      result.corpus_gap = config.corpus_gap;
      result.probability_of_success = config.probability_of_success;
      result.required_monthly_sip = config.required_monthly_sip;
      result.monthly_sip_gap = config.monthly_sip_gap;

      if (!config.on_track) {
        result.alerts_triggered.push('behind_schedule');
      }
      if (config.probability_of_success < 60) {
        result.alerts_triggered.push('low_probability');
      }
    }

    return result;
  }

  // ==================== GOAL TRACKING STATUS ====================

  /**
   * Get tracking status for a single goal
   */
  async getGoalTrackingStatus(
    tenantId: number,
    isLive: boolean,
    goalId: number
  ): Promise<any> {
    const client = await this.db.connect();
    try {
      // Get goal data
      const goalQuery = `
        SELECT id, customer_id, title, jtbd_type, config_data,
               is_watchlisted, watchlist_added_at, watchlist_reason,
               updated_at
        FROM t_jtbd_configurations
        WHERE tenant_id = $1 AND is_live = $2 AND id = $3
          AND jtbd_type = 'goal_tracking' AND is_active = true
      `;
      const goalResult = await client.query(goalQuery, [tenantId, isLive, goalId]);

      if (goalResult.rows.length === 0) {
        throw new Error('Goal not found');
      }

      const goal = goalResult.rows[0];
      const config = goal.config_data as any;

      // Calculate expected value
      const expectedValue = await this.calculateExpectedValue(config);
      const currentValue = config.current_value || 0;
      const performancePercentage = expectedValue > 0
        ? (currentValue / expectedValue) * 100
        : 100;

      return {
        goal_id: goal.id,
        customer_id: goal.customer_id,
        goal_name: config.goal_name,
        goal_type: config.goal_type,
        current_value: currentValue,
        expected_value: expectedValue,
        performance_percentage: Math.round(performancePercentage * 100) / 100,
        is_on_track: performancePercentage >= 100,
        variance_percentage: Math.round((performancePercentage - 100) * 100) / 100,
        is_in_watchlist: goal.is_watchlisted || false,
        watchlist_added_at: goal.watchlist_added_at,
        watchlist_reason: goal.watchlist_reason,
        last_calculated_at: new Date().toISOString()
      };
    } finally {
      client.release();
    }
  }

  /**
   * Get tracking status for all goals of a customer
   */
  async getCustomerGoalTrackingStatus(
    tenantId: number,
    isLive: boolean,
    customerId: number
  ): Promise<any[]> {
    const client = await this.db.connect();
    try {
      const query = `
        SELECT id
        FROM t_jtbd_configurations
        WHERE tenant_id = $1 AND is_live = $2 AND customer_id = $3
          AND jtbd_type = 'goal_tracking' AND is_active = true
      `;
      const result = await client.query(query, [tenantId, isLive, customerId]);

      const trackingStatuses = [];
      for (const row of result.rows) {
        const status = await this.getGoalTrackingStatus(tenantId, isLive, row.id);
        trackingStatuses.push(status);
      }

      return trackingStatuses;
    } finally {
      client.release();
    }
  }

  /**
   * Calculate expected value at current point in time
   * Based on monthly contributions and expected return rate
   */
  private async calculateExpectedValue(config: any): Promise<number> {
    const startDate = new Date(config.created_at || new Date());
    const currentDate = new Date();
    const monthsElapsed = this.getMonthsDifference(startDate, currentDate);

    // If no time has passed, expected value is the initial value
    if (monthsElapsed <= 0) {
      return config.current_value || 0;
    }

    const monthlyContribution = config.monthly_contribution || 0;
    // DEPRECATED: Assumptions moved to asset types - using default for backward compatibility
    const annualRate = 12; // Default return rate
    const monthlyRate = annualRate / 12 / 100;

    // Future Value of Series calculation
    // FV = PMT × (((1 + r)^n - 1) / r)
    let expectedValue = 0;
    if (monthlyRate > 0) {
      expectedValue = monthlyContribution *
        (Math.pow(1 + monthlyRate, monthsElapsed) - 1) / monthlyRate;
    } else {
      expectedValue = monthlyContribution * monthsElapsed;
    }

    // Add initial value with growth
    const initialValue = config.current_value || 0;
    expectedValue += initialValue * Math.pow(1 + monthlyRate, monthsElapsed);

    return Math.round(expectedValue);
  }

  /**
   * Get months difference between two dates
   */
  private getMonthsDifference(startDate: Date, endDate: Date): number {
    const years = endDate.getFullYear() - startDate.getFullYear();
    const months = endDate.getMonth() - startDate.getMonth();
    return years * 12 + months;
  }

  // ==================== ASSET ALLOCATION UTILIZATION ====================

  /**
   * Get asset allocation utilization for a customer
   * Shows how investment plans are allocated across goals
   */
  async getAssetAllocationUtilization(
    tenantId: number,
    isLive: boolean,
    customerId: number
  ): Promise<any[]> {
    // Get all investment plans for the customer with their allocations
    const query = `
      SELECT
        ip.id as plan_id,
        COALESCE(ip.notes, at.asset_type_name) as scheme_name,
        COALESCE(ip.scheme_code, at.asset_type_code, 'PLAN-' || ip.id::text) as scheme_code,
        at.asset_type_name,
        ip.principal_amount,
        ip.principal_amount as total_portfolio_value,
        COALESCE(
          (SELECT SUM(gia.allocated_percentage)
           FROM t_goal_investment_allocations gia
           WHERE gia.investment_plan_id = ip.id AND gia.is_active = true),
          0
        ) as total_allocated_percentage
      FROM t_customer_asset_assignments ip
      JOIN m_asset_types at ON ip.asset_type_id = at.id
      WHERE ip.tenant_id = $1
        AND ip.is_live = $2
        AND ip.customer_id = $3
        AND ip.is_active = true
      ORDER BY at.display_order, ip.assigned_at DESC
    `;

    const plansResult = await this.db.query(query, [tenantId, isLive, customerId]);

    // Get allocation breakdown for each plan
    const utilization = await Promise.all(
      plansResult.rows.map(async (plan: any) => {
        const totalValue = parseFloat(plan.total_portfolio_value) || 0;
        const allocatedPercentage = parseFloat(plan.total_allocated_percentage) || 0;
        const allocatedValue = (totalValue * allocatedPercentage) / 100;
        const availablePercentage = Math.max(0, 100 - allocatedPercentage);
        const availableValue = (totalValue * availablePercentage) / 100;

        // Get goal allocations for this plan
        const allocationQuery = `
          SELECT
            gia.goal_id,
            jc.title as goal_name,
            gia.allocated_percentage,
            (gia.allocated_percentage / 100.0 * $1) as allocation_value
          FROM t_goal_investment_allocations gia
          JOIN t_jtbd_configurations jc ON jc.id = gia.goal_id
          WHERE gia.investment_plan_id = $2
            AND gia.is_active = true
          ORDER BY gia.allocated_percentage DESC
        `;

        const allocationsResult = await this.db.query(allocationQuery, [totalValue, plan.plan_id]);

        return {
          scheme_code: plan.scheme_code,
          scheme_name: plan.scheme_name || plan.asset_type_name,
          total_portfolio_value: Math.round(totalValue),
          allocated_value: Math.round(allocatedValue),
          allocated_percentage: Math.round(allocatedPercentage * 100) / 100,
          available_value: Math.round(availableValue),
          available_percentage: Math.round(availablePercentage * 100) / 100,
          is_fully_allocated: allocatedPercentage >= 100,
          allocation_breakdown: allocationsResult.rows.map((alloc: any) => ({
            goal_id: alloc.goal_id,
            goal_name: alloc.goal_name,
            allocation_percentage: parseFloat(alloc.allocated_percentage),
            allocation_value: Math.round(parseFloat(alloc.allocation_value) || 0)
          }))
        };
      })
    );

    return utilization;
  }

  // ==================== WATCHLIST MANAGEMENT ====================

  /**
   * Add goal to watchlist
   */
  async addToWatchlist(
    tenantId: number,
    isLive: boolean,
    goalId: number,
    reason: string
  ): Promise<void> {
    const query = `
      UPDATE t_jtbd_configurations
      SET is_watchlisted = true,
          watchlist_added_at = NOW(),
          watchlist_reason = $1,
          updated_at = NOW()
      WHERE tenant_id = $2 AND is_live = $3 AND id = $4
    `;
    await this.db.query(query, [reason, tenantId, isLive, goalId]);
  }

  /**
   * Remove goal from watchlist
   */
  async removeFromWatchlist(
    tenantId: number,
    isLive: boolean,
    goalId: number
  ): Promise<void> {
    const query = `
      UPDATE t_jtbd_configurations
      SET is_watchlisted = false,
          watchlist_added_at = NULL,
          watchlist_reason = NULL,
          updated_at = NOW()
      WHERE tenant_id = $1 AND is_live = $2 AND id = $3
    `;
    await this.db.query(query, [tenantId, isLive, goalId]);
  }

  /**
   * Get all watchlist goals for a customer
   */
  async getWatchlistGoals(
    tenantId: number,
    isLive: boolean,
    customerId: number
  ): Promise<any[]> {
    const query = `
      SELECT id, title, config_data, watchlist_added_at, watchlist_reason
      FROM t_jtbd_configurations
      WHERE tenant_id = $1 AND is_live = $2 AND customer_id = $3
        AND jtbd_type = 'goal_tracking' AND is_active = true
        AND is_watchlisted = true
      ORDER BY watchlist_added_at DESC
    `;
    const result = await this.db.query(query, [tenantId, isLive, customerId]);
    return result.rows;
  }
}