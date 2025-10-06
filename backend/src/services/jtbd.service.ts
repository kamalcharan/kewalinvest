// backend/src/services/jtbd.service.ts

import { Pool } from 'pg';
import { pool } from '../config/database';
import { JTBDUtil } from '../utils/jtbd.util';
import {
  JTBDConfiguration,
  CreateJTBDRequest,
  UpdateJTBDRequest,
  JTBDListResponse,
  JTBDDashboardStats,
  CustomerJTBDSummary,
  PortfolioAlertConfig,
  TimeBasedConfig,
  ProfileTriggerConfig,
  CalculatedAlertInstance
} from '../types/jtbd.types';

export class JTBDService {
  private db: Pool;

  constructor() {
    this.db = pool;
  }

  /**
   * Create new JTBD configuration
   */
  async createJTBD(
    tenantId: number,
    isLive: boolean,
    data: CreateJTBDRequest,
    createdBy: number
  ): Promise<JTBDConfiguration> {
    const client = await this.db.connect();

    try {
      await client.query('BEGIN');

      // Validate configuration based on type
      const validation = this.validateConfig(data.jtbd_type, data.config_data);
      if (!validation.is_valid) {
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
      }

      // For portfolio alerts, validate scheme exists in customer's portfolio
      if (data.jtbd_type === 'portfolio_alert') {
        const portfolioConfig = data.config_data as PortfolioAlertConfig;
        const portfolioCheck = await client.query(
          `SELECT 1 FROM t_customer_master_portfolio 
           WHERE customer_id = $1 AND scheme_code = $2 AND tenant_id = $3 AND is_live = $4`,
          [data.customer_id, portfolioConfig.scheme_code, tenantId, isLive]
        );

        if (portfolioCheck.rows.length === 0) {
          throw new Error('Scheme not found in customer portfolio');
        }
      }

      // Calculate next alert date
      const nextAlertDate = await this.calculateNextAlertDate(
        data.jtbd_type,
        data.config_data,
        data.customer_id,
        client
      );

      // Generate title if not provided
      const title = data.title || JTBDUtil.generateTitle(data.jtbd_type, data.config_data);

      // Insert JTBD configuration
      const insertQuery = `
        INSERT INTO t_jtbd_configurations (
          tenant_id, is_live, customer_id, jtbd_type, title, description,
          priority, config_data, next_alert_date, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
      `;

      const result = await client.query(insertQuery, [
        tenantId,
        isLive,
        data.customer_id,
        data.jtbd_type,
        title,
        data.description || null,
        data.priority || 'medium',
        JSON.stringify(data.config_data),
        nextAlertDate,
        createdBy
      ]);

      // Update customer JTBD count and status
      await client.query(
        `UPDATE t_customers 
         SET jtbd_count = jtbd_count + 1,
             jtbd_setup_status = 'active',
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1 AND tenant_id = $2 AND is_live = $3`,
        [data.customer_id, tenantId, isLive]
      );

      await client.query('COMMIT');

      return {
        ...result.rows[0],
        config_data: JSON.parse(result.rows[0].config_data)
      };
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error creating JTBD:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get all JTBDs for a customer
   */
  async getCustomerJTBDs(
    tenantId: number,
    isLive: boolean,
    customerId: number
  ): Promise<JTBDConfiguration[]> {
    try {
      const query = `
        SELECT * FROM t_jtbd_configurations
        WHERE tenant_id = $1 AND is_live = $2 AND customer_id = $3
        ORDER BY priority DESC, created_at DESC
      `;

      const result = await this.db.query(query, [tenantId, isLive, customerId]);

      return result.rows.map(row => ({
        ...row,
        config_data: JSON.parse(row.config_data)
      }));
    } catch (error) {
      console.error('Error getting customer JTBDs:', error);
      throw error;
    }
  }

  /**
   * Get single JTBD by ID
   */
  async getJTBD(
    tenantId: number,
    isLive: boolean,
    jtbdId: number
  ): Promise<JTBDConfiguration | null> {
    try {
      const query = `
        SELECT * FROM t_jtbd_configurations
        WHERE id = $1 AND tenant_id = $2 AND is_live = $3
      `;

      const result = await this.db.query(query, [jtbdId, tenantId, isLive]);

      if (result.rows.length === 0) {
        return null;
      }

      return {
        ...result.rows[0],
        config_data: JSON.parse(result.rows[0].config_data)
      };
    } catch (error) {
      console.error('Error getting JTBD:', error);
      throw error;
    }
  }

  /**
   * Update JTBD configuration
   */
  async updateJTBD(
    tenantId: number,
    isLive: boolean,
    jtbdId: number,
    data: UpdateJTBDRequest
  ): Promise<JTBDConfiguration | null> {
    const client = await this.db.connect();

    try {
      await client.query('BEGIN');

      // Get existing JTBD
      const existing = await this.getJTBD(tenantId, isLive, jtbdId);
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

      if (data.is_active !== undefined) {
        updateFields.push(`is_active = $${paramIndex}`);
        queryParams.push(data.is_active);
        paramIndex++;
      }

      if (data.config_data !== undefined) {
        // Validate new config
        const validation = this.validateConfig(existing.jtbd_type, data.config_data);
        if (!validation.is_valid) {
          throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
        }

        updateFields.push(`config_data = $${paramIndex}`);
        queryParams.push(JSON.stringify(data.config_data));
        paramIndex++;

        // Recalculate next alert date
        const nextAlertDate = await this.calculateNextAlertDate(
          existing.jtbd_type,
          data.config_data,
          existing.customer_id,
          client
        );

        updateFields.push(`next_alert_date = $${paramIndex}`);
        queryParams.push(nextAlertDate);
        paramIndex++;
      }

      updateFields.push('updated_at = CURRENT_TIMESTAMP');

      const updateQuery = `
        UPDATE t_jtbd_configurations
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex} AND tenant_id = $${paramIndex + 1} AND is_live = $${paramIndex + 2}
        RETURNING *
      `;

      queryParams.push(jtbdId, tenantId, isLive);

      const result = await client.query(updateQuery, queryParams);

      await client.query('COMMIT');

      return {
        ...result.rows[0],
        config_data: JSON.parse(result.rows[0].config_data)
      };
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error updating JTBD:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Delete JTBD configuration
   */
  async deleteJTBD(
    tenantId: number,
    isLive: boolean,
    jtbdId: number
  ): Promise<boolean> {
    const client = await this.db.connect();

    try {
      await client.query('BEGIN');

      // Get JTBD to find customer_id
      const jtbd = await this.getJTBD(tenantId, isLive, jtbdId);
      if (!jtbd) {
        return false;
      }

      // Delete JTBD
      await client.query(
        'DELETE FROM t_jtbd_configurations WHERE id = $1 AND tenant_id = $2 AND is_live = $3',
        [jtbdId, tenantId, isLive]
      );

      // Update customer JTBD count
      await client.query(
        `UPDATE t_customers 
         SET jtbd_count = GREATEST(jtbd_count - 1, 0),
             jtbd_setup_status = CASE 
               WHEN jtbd_count - 1 <= 0 THEN 'not_setup' 
               ELSE 'active' 
             END,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1 AND tenant_id = $2 AND is_live = $3`,
        [jtbd.customer_id, tenantId, isLive]
      );

      await client.query('COMMIT');
      return true;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error deleting JTBD:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Toggle JTBD active status
   */
  async toggleJTBD(
    tenantId: number,
    isLive: boolean,
    jtbdId: number
  ): Promise<JTBDConfiguration | null> {
    try {
      const query = `
        UPDATE t_jtbd_configurations
        SET is_active = NOT is_active, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1 AND tenant_id = $2 AND is_live = $3
        RETURNING *
      `;

      const result = await this.db.query(query, [jtbdId, tenantId, isLive]);

      if (result.rows.length === 0) {
        return null;
      }

      return {
        ...result.rows[0],
        config_data: JSON.parse(result.rows[0].config_data)
      };
    } catch (error) {
      console.error('Error toggling JTBD:', error);
      throw error;
    }
  }

  /**
   * Get dashboard overview statistics
   */
  async getDashboardStats(
    tenantId: number,
    isLive: boolean
  ): Promise<JTBDDashboardStats> {
    try {
      const query = `
        SELECT 
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE jtbd_type = 'portfolio_alert') as portfolio_alert,
          COUNT(*) FILTER (WHERE jtbd_type = 'time_based') as time_based,
          COUNT(*) FILTER (WHERE jtbd_type = 'profile_trigger') as profile_trigger,
          COUNT(*) FILTER (WHERE priority = 'critical') as priority_critical,
          COUNT(*) FILTER (WHERE priority = 'high') as priority_high,
          COUNT(*) FILTER (WHERE priority = 'medium') as priority_medium,
          COUNT(*) FILTER (WHERE priority = 'low') as priority_low,
          COUNT(*) FILTER (WHERE is_active = true) as active_count
        FROM t_jtbd_configurations
        WHERE tenant_id = $1 AND is_live = $2
      `;

      const result = await this.db.query(query, [tenantId, isLive]);
      const row = result.rows[0];

      // Get customers without JTBD
      const customersQuery = `
        SELECT COUNT(*) as count
        FROM t_customers
        WHERE tenant_id = $1 AND is_live = $2 
          AND is_active = true
          AND (jtbd_count IS NULL OR jtbd_count = 0)
      `;
      const customersResult = await this.db.query(customersQuery, [tenantId, isLive]);

      return {
        total: parseInt(row.total) || 0,
        by_type: {
          portfolio_alert: parseInt(row.portfolio_alert) || 0,
          time_based: parseInt(row.time_based) || 0,
          profile_trigger: parseInt(row.profile_trigger) || 0
        },
        by_priority: {
          critical: parseInt(row.priority_critical) || 0,
          high: parseInt(row.priority_high) || 0,
          medium: parseInt(row.priority_medium) || 0,
          low: parseInt(row.priority_low) || 0
        },
        active_count: parseInt(row.active_count) || 0,
        customers_without_jtbd: parseInt(customersResult.rows[0].count) || 0
      };
    } catch (error) {
      console.error('Error getting dashboard stats:', error);
      throw error;
    }
  }

  /**
   * Get customer JTBD summary
   */
  async getCustomerSummary(
    tenantId: number,
    isLive: boolean,
    customerId: number
  ): Promise<CustomerJTBDSummary> {
    try {
      const query = `
        SELECT 
          COUNT(*) as jtbd_count,
          MIN(next_alert_date) as next_alert_date,
          COUNT(*) FILTER (WHERE priority = 'critical') as critical_count
        FROM t_jtbd_configurations
        WHERE tenant_id = $1 AND is_live = $2 AND customer_id = $3 AND is_active = true
      `;

      const result = await this.db.query(query, [tenantId, isLive, customerId]);
      const row = result.rows[0];

      return {
        customer_id: customerId,
        jtbd_count: parseInt(row.jtbd_count) || 0,
        jtbd_setup_status: parseInt(row.jtbd_count) > 0 ? 'active' : 'not_setup',
        next_alert_date: row.next_alert_date || undefined,
        critical_count: parseInt(row.critical_count) || 0
      };
    } catch (error) {
      console.error('Error getting customer summary:', error);
      throw error;
    }
  }

  /**
   * Get available schemes for customer (for dropdown)
   */
  async getCustomerSchemes(
    tenantId: number,
    isLive: boolean,
    customerId: number
  ): Promise<any[]> {
    try {
      const query = `
        SELECT DISTINCT
          scheme_code,
          scheme_name,
          folio_no
        FROM t_customer_master_portfolio
        WHERE tenant_id = $1 AND is_live = $2 AND customer_id = $3
        ORDER BY scheme_name
      `;

      const result = await this.db.query(query, [tenantId, isLive, customerId]);
      return result.rows;
    } catch (error) {
      console.error('Error getting customer schemes:', error);
      throw error;
    }
  }

  /**
   * Get transaction types (for dropdown)
   */
  async getTransactionTypes(): Promise<any[]> {
    try {
      const query = `
        SELECT id, txn_code, txn_name, txn_type
        FROM m_transaction_types
        ORDER BY txn_name
      `;

      const result = await this.db.query(query);
      return result.rows;
    } catch (error) {
      console.error('Error getting transaction types:', error);
      throw error;
    }
  }

  /**
   * Get calculated future occurrences for portfolio alert
   */
  async getPortfolioOccurrences(
    tenantId: number,
    isLive: boolean,
    jtbdId: number
  ): Promise<CalculatedAlertInstance[]> {
    try {
      const jtbd = await this.getJTBD(tenantId, isLive, jtbdId);
      
      if (!jtbd || jtbd.jtbd_type !== 'portfolio_alert') {
        return [];
      }

      const config = jtbd.config_data as PortfolioAlertConfig;
      return JTBDUtil.calculateAllOccurrences(config);
    } catch (error) {
      console.error('Error getting portfolio occurrences:', error);
      throw error;
    }
  }

  // ==================== PRIVATE HELPERS ====================

  /**
   * Validate configuration based on type
   */
  private validateConfig(type: string, config: any): { is_valid: boolean; errors: string[] } {
    switch (type) {
      case 'portfolio_alert':
        return JTBDUtil.validatePortfolioConfig(config);
      case 'time_based':
        return JTBDUtil.validateTimeConfig(config);
      case 'profile_trigger':
        return JTBDUtil.validateProfileConfig(config);
      default:
        return { is_valid: false, errors: ['Invalid JTBD type'] };
    }
  }

  /**
   * Calculate next alert date based on type
   */
  private async calculateNextAlertDate(
    type: string,
    config: any,
    customerId: number,
    client: any
  ): Promise<Date> {
    switch (type) {
      case 'portfolio_alert':
        return JTBDUtil.calculatePortfolioNextDate(config as PortfolioAlertConfig);

      case 'time_based':
        return JTBDUtil.calculateTimeNextDate(config as TimeBasedConfig);

      case 'profile_trigger':
        // Fetch customer dates
        const customerQuery = await client.query(
          'SELECT date_of_birth, anniversary_date FROM t_customers WHERE id = $1',
          [customerId]
        );

        if (customerQuery.rows.length === 0) {
          throw new Error('Customer not found');
        }

        const customer = customerQuery.rows[0];
        const profileConfig = config as ProfileTriggerConfig;

        return JTBDUtil.calculateProfileNextDate(
          profileConfig,
          customer.date_of_birth ? new Date(customer.date_of_birth) : undefined,
          customer.anniversary_date ? new Date(customer.anniversary_date) : undefined
        );

      default:
        throw new Error('Invalid JTBD type');
    }
  }
}