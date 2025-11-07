// backend/src/services/jtbd.execution.service.ts
// JTBD Execution Service - Handles meetings, SIP plans, and other execution records

import { Pool, PoolClient } from 'pg';
import { pool } from '../config/database';
import {
  JTBDExecution,
  CreateExecutionRequest,
  UpdateExecutionRequest,
  CompleteExecutionRequest,
  CancelExecutionRequest,
  ExecutionFilters,
  ExecutionListResponse,
  CustomerJobsSummary,
  MeetingExecutionData,
  SIPPlanExecutionData
} from '../types/jtbd.types';
import { EXECUTION_STATUS, JTBD_CATEGORY } from '../constants/jtbd.constants';

export class JTBDExecutionService {
  private db: Pool;

  constructor() {
    this.db = pool;
  }

  // ==================== CREATE ====================

  /**
   * Create new execution (meeting, SIP plan instance, etc.)
   */
  async createExecution(
    tenantId: number,
    isLive: boolean,
    data: CreateExecutionRequest,
    createdBy: number
  ): Promise<JTBDExecution> {
    const query = `
      INSERT INTO t_jtbd_executions (
        tenant_id, is_live, config_id, customer_id, execution_type,
        title, description, priority, scheduled_date, scheduled_time,
        execution_status, execution_data, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `;

    const values = [
      tenantId,
      isLive,
      data.config_id || null,
      data.customer_id,
      data.execution_type,
      data.title,
      data.description || null,
      data.priority || 'medium',
      data.scheduled_date,
      data.scheduled_time || null,
      EXECUTION_STATUS.PLANNED,
      JSON.stringify(data.execution_data || {}),
      createdBy
    ];

    const result = await this.db.query(query, values);
    return result.rows[0];
  }

  /**
   * Bulk create executions (for goal SIP plans - 120 instances)
   */
  async bulkCreateExecutions(
    tenantId: number,
    isLive: boolean,
    executions: CreateExecutionRequest[],
    createdBy: number
  ): Promise<JTBDExecution[]> {
    const client = await this.db.connect();

    try {
      await client.query('BEGIN');

      const results: JTBDExecution[] = [];

      for (const execution of executions) {
        const query = `
          INSERT INTO t_jtbd_executions (
            tenant_id, is_live, config_id, customer_id, execution_type,
            title, description, priority, scheduled_date, scheduled_time,
            execution_status, execution_data, created_by
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
          RETURNING *
        `;

        const values = [
          tenantId,
          isLive,
          execution.config_id || null,
          execution.customer_id,
          execution.execution_type,
          execution.title,
          execution.description || null,
          execution.priority || 'medium',
          execution.scheduled_date,
          execution.scheduled_time || null,
          EXECUTION_STATUS.PLANNED,
          JSON.stringify(execution.execution_data || {}),
          createdBy
        ];

        const result = await client.query(query, values);
        results.push(result.rows[0]);
      }

      await client.query('COMMIT');
      return results;

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // ==================== READ ====================

  /**
   * Get execution by ID
   */
  async getExecutionById(
    tenantId: number,
    isLive: boolean,
    executionId: number
  ): Promise<JTBDExecution | null> {
    const query = `
      SELECT * FROM t_jtbd_executions
      WHERE tenant_id = $1 AND is_live = $2 AND id = $3
    `;

    const result = await this.db.query(query, [tenantId, isLive, executionId]);
    return result.rows[0] || null;
  }

  /**
   * Get executions with filters and pagination
   */
  async getExecutions(
    tenantId: number,
    isLive: boolean,
    filters: ExecutionFilters
  ): Promise<ExecutionListResponse> {
    const page = filters.page || 1;
    const pageSize = filters.page_size || 20;
    const offset = (page - 1) * pageSize;

    // Build WHERE conditions
    const conditions: string[] = ['tenant_id = $1', 'is_live = $2'];
    const params: any[] = [tenantId, isLive];
    let paramIndex = 3;

    if (filters.customer_id) {
      conditions.push(`customer_id = $${paramIndex}`);
      params.push(filters.customer_id);
      paramIndex++;
    }

    if (filters.config_id) {
      conditions.push(`config_id = $${paramIndex}`);
      params.push(filters.config_id);
      paramIndex++;
    }

    if (filters.execution_type) {
      conditions.push(`execution_type = $${paramIndex}`);
      params.push(filters.execution_type);
      paramIndex++;
    }

    if (filters.execution_status) {
      conditions.push(`execution_status = $${paramIndex}`);
      params.push(filters.execution_status);
      paramIndex++;
    }

    if (filters.priority) {
      conditions.push(`priority = $${paramIndex}`);
      params.push(filters.priority);
      paramIndex++;
    }

    if (filters.from_date) {
      conditions.push(`scheduled_date >= $${paramIndex}`);
      params.push(filters.from_date);
      paramIndex++;
    }

    if (filters.to_date) {
      conditions.push(`scheduled_date <= $${paramIndex}`);
      params.push(filters.to_date);
      paramIndex++;
    }

    const whereClause = conditions.join(' AND ');

    // Count total
    const countQuery = `
      SELECT COUNT(*) as total
      FROM t_jtbd_executions
      WHERE ${whereClause}
    `;
    const countResult = await this.db.query(countQuery, params);
    const total = parseInt(countResult.rows[0].total);

    // Get paginated data
    const dataQuery = `
      SELECT *
      FROM t_jtbd_executions
      WHERE ${whereClause}
      ORDER BY scheduled_date DESC, scheduled_time DESC NULLS LAST, created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    const dataResult = await this.db.query(dataQuery, [...params, pageSize, offset]);

    return {
      executions: dataResult.rows,
      pagination: {
        page,
        page_size: pageSize,
        total,
        total_pages: Math.ceil(total / pageSize)
      }
    };
  }

  /**
   * Get customer jobs summary
   */
  async getCustomerJobsSummary(
    tenantId: number,
    isLive: boolean,
    customerId: number
  ): Promise<CustomerJobsSummary> {
    // Get counts
    const countsQuery = `
      SELECT
        COUNT(*) as total_executions,
        COUNT(*) FILTER (WHERE execution_status = '${EXECUTION_STATUS.PLANNED}') as planned_count,
        COUNT(*) FILTER (WHERE execution_status = '${EXECUTION_STATUS.DUE}') as due_count,
        COUNT(*) FILTER (
          WHERE execution_status IN ('${EXECUTION_STATUS.PLANNED}', '${EXECUTION_STATUS.DUE}')
          AND scheduled_date < CURRENT_DATE
        ) as overdue_count,
        COUNT(*) FILTER (WHERE execution_status = '${EXECUTION_STATUS.COMPLETED}') as completed_count
      FROM t_jtbd_executions
      WHERE tenant_id = $1 AND is_live = $2 AND customer_id = $3
    `;
    const countsResult = await this.db.query(countsQuery, [tenantId, isLive, customerId]);
    const counts = countsResult.rows[0];

    // Get next execution
    const nextExecutionQuery = `
      SELECT
        id, execution_type, title, scheduled_date,
        DATE_PART('day', scheduled_date::timestamp - CURRENT_DATE) as days_until
      FROM t_jtbd_executions
      WHERE tenant_id = $1 AND is_live = $2 AND customer_id = $3
        AND execution_status IN ('${EXECUTION_STATUS.PLANNED}', '${EXECUTION_STATUS.DUE}')
        AND scheduled_date >= CURRENT_DATE
      ORDER BY scheduled_date ASC, scheduled_time ASC NULLS LAST
      LIMIT 1
    `;
    const nextExecutionResult = await this.db.query(nextExecutionQuery, [tenantId, isLive, customerId]);

    return {
      customer_id: customerId,
      total_executions: parseInt(counts.total_executions),
      planned_count: parseInt(counts.planned_count),
      due_count: parseInt(counts.due_count),
      overdue_count: parseInt(counts.overdue_count),
      completed_count: parseInt(counts.completed_count),
      next_execution: nextExecutionResult.rows[0] ? {
        id: nextExecutionResult.rows[0].id,
        execution_type: nextExecutionResult.rows[0].execution_type,
        title: nextExecutionResult.rows[0].title,
        scheduled_date: nextExecutionResult.rows[0].scheduled_date,
        days_until: parseInt(nextExecutionResult.rows[0].days_until)
      } : undefined
    };
  }

  /**
   * Get upcoming executions across all customers (for dashboard)
   */
  async getUpcomingExecutions(
    tenantId: number,
    isLive: boolean,
    daysAhead: number = 30,
    executionType?: string
  ): Promise<JTBDExecution[]> {
    const conditions: string[] = [
      'e.tenant_id = $1',
      'e.is_live = $2',
      `e.execution_status IN ('${EXECUTION_STATUS.PLANNED}', '${EXECUTION_STATUS.DUE}')`,
      'e.scheduled_date BETWEEN CURRENT_DATE AND $3'
    ];

    const params: any[] = [tenantId, isLive, new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000).toISOString().split('T')[0]];

    if (executionType) {
      conditions.push('e.execution_type = $4');
      params.push(executionType);
    }

    const query = `
      SELECT e.*, c.name as customer_name
      FROM t_jtbd_executions e
      JOIN t_customers c ON c.id = e.customer_id AND c.tenant_id = e.tenant_id AND c.is_live = e.is_live
      WHERE ${conditions.join(' AND ')}
      ORDER BY e.scheduled_date ASC, e.scheduled_time ASC NULLS LAST
    `;

    const result = await this.db.query(query, params);
    return result.rows;
  }

  // ==================== UPDATE ====================

  /**
   * Update execution details
   */
  async updateExecution(
    tenantId: number,
    isLive: boolean,
    executionId: number,
    data: UpdateExecutionRequest
  ): Promise<JTBDExecution> {
    const updates: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (data.title !== undefined) {
      updates.push(`title = $${paramIndex}`);
      params.push(data.title);
      paramIndex++;
    }

    if (data.description !== undefined) {
      updates.push(`description = $${paramIndex}`);
      params.push(data.description);
      paramIndex++;
    }

    if (data.priority !== undefined) {
      updates.push(`priority = $${paramIndex}`);
      params.push(data.priority);
      paramIndex++;
    }

    if (data.scheduled_date !== undefined) {
      updates.push(`scheduled_date = $${paramIndex}`);
      params.push(data.scheduled_date);
      paramIndex++;
    }

    if (data.scheduled_time !== undefined) {
      updates.push(`scheduled_time = $${paramIndex}`);
      params.push(data.scheduled_time);
      paramIndex++;
    }

    if (data.execution_status !== undefined) {
      updates.push(`execution_status = $${paramIndex}`);
      params.push(data.execution_status);
      paramIndex++;
    }

    if (data.execution_data !== undefined) {
      updates.push(`execution_data = $${paramIndex}`);
      params.push(JSON.stringify(data.execution_data));
      paramIndex++;
    }

    updates.push(`updated_at = NOW()`);

    const query = `
      UPDATE t_jtbd_executions
      SET ${updates.join(', ')}
      WHERE tenant_id = $${paramIndex}
        AND is_live = $${paramIndex + 1}
        AND id = $${paramIndex + 2}
      RETURNING *
    `;

    params.push(tenantId, isLive, executionId);
    const result = await this.db.query(query, params);

    if (result.rows.length === 0) {
      throw new Error('Execution not found');
    }

    return result.rows[0];
  }

  /**
   * Mark execution as completed
   */
  async completeExecution(
    tenantId: number,
    isLive: boolean,
    executionId: number,
    data: CompleteExecutionRequest,
    completedBy: number
  ): Promise<JTBDExecution> {
    // Get current execution to calculate deviation
    const currentExecution = await this.getExecutionById(tenantId, isLive, executionId);
    if (!currentExecution) {
      throw new Error('Execution not found');
    }

    const executionDate = data.execution_date || new Date().toISOString().split('T')[0];
    const scheduledDate = new Date(currentExecution.scheduled_date);
    const actualDate = new Date(executionDate);
    const deviationDays = Math.floor((actualDate.getTime() - scheduledDate.getTime()) / (1000 * 60 * 60 * 24));

    // Merge existing execution_data with new data
    const mergedData = {
      ...currentExecution.execution_data,
      ...data.execution_data
    };

    const query = `
      UPDATE t_jtbd_executions
      SET execution_status = $1,
          execution_date = $2,
          execution_time = $3,
          deviation_days = $4,
          execution_data = $5,
          completed_by = $6,
          completed_at = NOW(),
          updated_at = NOW()
      WHERE tenant_id = $7 AND is_live = $8 AND id = $9
      RETURNING *
    `;

    const result = await this.db.query(query, [
      EXECUTION_STATUS.COMPLETED,
      executionDate,
      data.execution_time || null,
      deviationDays,
      JSON.stringify(mergedData),
      completedBy,
      tenantId,
      isLive,
      executionId
    ]);

    if (result.rows.length === 0) {
      throw new Error('Execution not found');
    }

    return result.rows[0];
  }

  /**
   * Cancel execution
   */
  async cancelExecution(
    tenantId: number,
    isLive: boolean,
    executionId: number,
    data: CancelExecutionRequest
  ): Promise<JTBDExecution> {
    // Get current execution to merge data
    const currentExecution = await this.getExecutionById(tenantId, isLive, executionId);
    if (!currentExecution) {
      throw new Error('Execution not found');
    }

    // Merge cancellation reason into execution_data
    const mergedData = {
      ...currentExecution.execution_data,
      cancellation_reason: data.cancellation_reason
    };

    const query = `
      UPDATE t_jtbd_executions
      SET execution_status = $1,
          execution_data = $2,
          updated_at = NOW()
      WHERE tenant_id = $3 AND is_live = $4 AND id = $5
      RETURNING *
    `;

    const result = await this.db.query(query, [
      EXECUTION_STATUS.CANCELLED,
      JSON.stringify(mergedData),
      tenantId,
      isLive,
      executionId
    ]);

    if (result.rows.length === 0) {
      throw new Error('Execution not found');
    }

    return result.rows[0];
  }

  // ==================== DELETE ====================

  /**
   * Delete execution
   */
  async deleteExecution(
    tenantId: number,
    isLive: boolean,
    executionId: number
  ): Promise<void> {
    const query = `
      DELETE FROM t_jtbd_executions
      WHERE tenant_id = $1 AND is_live = $2 AND id = $3
    `;

    const result = await this.db.query(query, [tenantId, isLive, executionId]);

    if (result.rowCount === 0) {
      throw new Error('Execution not found');
    }
  }

  /**
   * Delete all executions for a config (when goal is deleted, delete all SIP plan instances)
   */
  async deleteExecutionsByConfig(
    tenantId: number,
    isLive: boolean,
    configId: number
  ): Promise<number> {
    const query = `
      DELETE FROM t_jtbd_executions
      WHERE tenant_id = $1 AND is_live = $2 AND config_id = $3
    `;

    const result = await this.db.query(query, [tenantId, isLive, configId]);
    return result.rowCount || 0;
  }

  // ==================== UTILITY ====================

  /**
   * Update overdue statuses (should be run daily via cron)
   */
  async updateOverdueStatuses(
    tenantId: number,
    isLive: boolean
  ): Promise<number> {
    const query = `
      UPDATE t_jtbd_executions
      SET execution_status = $1,
          updated_at = NOW()
      WHERE tenant_id = $2
        AND is_live = $3
        AND execution_status = '${EXECUTION_STATUS.PLANNED}'
        AND scheduled_date < CURRENT_DATE
    `;

    const result = await this.db.query(query, [
      EXECUTION_STATUS.DUE,
      tenantId,
      isLive
    ]);

    return result.rowCount || 0;
  }
}
