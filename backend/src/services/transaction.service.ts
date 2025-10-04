// backend/src/services/transaction.service.ts

import { Pool } from 'pg';
import { pool } from '../config/database';
import {
  Transaction,
  TransactionWithDetails,
  TransactionFilters,
  TransactionListResponse,
  CreateTransactionRequest,
  UpdateTransactionRequest,
  UpdatePortfolioFlagRequest,
  TransactionSummary
} from '../types/transaction.types';
import { TransactionUtil } from '../utils/transaction.util';

export class TransactionService {
  private db: Pool;

  constructor() {
    this.db = pool;
  }

  /**
   * Get transactions with filters and pagination
   */
  async getTransactions(
    tenantId: number,
    isLive: boolean,
    filters: TransactionFilters
  ): Promise<TransactionListResponse> {
    try {
      const page = filters.page || 1;
      const pageSize = filters.page_size || 100;
      const offset = (page - 1) * pageSize;
      const sortBy = filters.sort_by || 'txn_date';
      const sortOrder = filters.sort_order || 'desc';

      // Build WHERE clause
      const baseConditions = ['tt.tenant_id = $1', 'tt.is_live = $2', 'tt.is_active = true'];
      const params: any[] = [tenantId, isLive];
      let paramIndex = 3;

      // Apply filters
      const filterClause = TransactionUtil.buildFilterWhereClause(
        {
          customer_id: filters.customer_id,
          scheme_code: filters.scheme_code,
          start_date: filters.start_date,
          end_date: filters.end_date,
          txn_type_id: filters.txn_type_id,
          is_potential_duplicate: filters.is_potential_duplicate,
          portfolio_flag: filters.portfolio_flag
        },
        paramIndex
      );

      const whereClause = [...baseConditions, filterClause.where].join(' AND ');
      params.push(...filterClause.params);

      // Update paramIndex for pagination
      paramIndex += filterClause.params.length;

      // Main query with joins
      const query = `
        SELECT 
          tt.*,
          c.name as customer_name,
          mtt.txn_code as txn_type_code,
          mtt.txn_name as txn_type_name,
          mtt.txn_type
        FROM t_transaction_table tt
        LEFT JOIN t_customers c ON tt.customer_id = c.id
        LEFT JOIN m_transaction_types mtt ON tt.txn_type_id = mtt.id
        WHERE ${whereClause}
        ORDER BY tt.${sortBy} ${sortOrder.toUpperCase()}
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;

      params.push(pageSize, offset);

      const result = await this.db.query(query, params);

      // Get total count
      const countQuery = `
        SELECT COUNT(*) as total
        FROM t_transaction_table tt
        WHERE ${whereClause}
      `;

      const countResult = await this.db.query(countQuery, params.slice(0, paramIndex - 2));
      const total = parseInt(countResult.rows[0].total);

      return {
        transactions: result.rows,
        pagination: {
          page,
          page_size: pageSize,
          total,
          total_pages: Math.ceil(total / pageSize)
        }
      };
    } catch (error: any) {
      console.error('Error getting transactions:', error);
      throw new Error(`Failed to get transactions: ${error.message}`);
    }
  }

  /**
   * Get transaction by ID with full details including staging data
   */
  async getTransactionById(
    tenantId: number,
    isLive: boolean,
    transactionId: number
  ): Promise<TransactionWithDetails | null> {
    try {
      const query = `
        SELECT 
          tt.*,
          c.name as customer_name,
          mtt.txn_code as txn_type_code,
          mtt.txn_name as txn_type_name,
          mtt.txn_type,
          isd.raw_data as staging_data
        FROM t_transaction_table tt
        LEFT JOIN t_customers c ON tt.customer_id = c.id
        LEFT JOIN m_transaction_types mtt ON tt.txn_type_id = mtt.id
        LEFT JOIN t_import_staging_data isd ON tt.staging_record_id = isd.id
        WHERE tt.id = $1 AND tt.tenant_id = $2 AND tt.is_live = $3
      `;

      const result = await this.db.query(query, [transactionId, tenantId, isLive]);

      if (result.rows.length === 0) {
        return null;
      }

      return result.rows[0];
    } catch (error: any) {
      console.error('Error getting transaction by ID:', error);
      throw new Error(`Failed to get transaction: ${error.message}`);
    }
  }

  /**
   * Create new transaction (manual entry)
   */
  async createTransaction(
    tenantId: number,
    isLive: boolean,
    data: CreateTransactionRequest,
    createdBy: number
  ): Promise<Transaction> {
    const client = await this.db.connect();

    try {
      await client.query('BEGIN');

      // Validate transaction data
      const validation = TransactionUtil.validateTransaction(data);
      if (!validation.is_valid) {
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
      }

      // Check for duplicates
      const duplicateCheck = await this.checkDuplicate(
        tenantId,
        isLive,
        {
          customer_id: data.customer_id,
          scheme_code: data.scheme_code,
          txn_date: data.txn_date,
          total_amount: data.total_amount,
          txn_type_id: data.txn_type_id
        },
        client
      );

      // Create/update portfolio entry
      await this.upsertPortfolioEntry(
        tenantId,
        isLive,
        {
          customer_id: data.customer_id,
          scheme_code: data.scheme_code,
          scheme_name: data.scheme_name,
          folio_no: data.folio_no
        },
        client
      );

      // Insert transaction
      const insertQuery = `
        INSERT INTO t_transaction_table (
          tenant_id, is_live, customer_id, scheme_code, scheme_name, folio_no,
          txn_type_id, txn_date, total_amount, units, nav, stamp_duty,
          staging_record_id, import_session_id,
          is_potential_duplicate, portfolio_flag, duplicate_reason
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
        RETURNING *
      `;

      const insertParams = [
        tenantId,
        isLive,
        data.customer_id,
        TransactionUtil.sanitizeSchemeCode(data.scheme_code),
        data.scheme_name,
        data.folio_no ? TransactionUtil.sanitizeFolioNumber(data.folio_no) : null,
        data.txn_type_id,
        data.txn_date,
        TransactionUtil.formatAmount(data.total_amount),
        TransactionUtil.formatUnits(data.units),
        TransactionUtil.formatNAV(data.nav),
        data.stamp_duty ? TransactionUtil.formatAmount(data.stamp_duty) : null,
        data.staging_record_id || null,
        data.import_session_id || null,
        duplicateCheck.is_duplicate,
        true,
        duplicateCheck.is_duplicate ? TransactionUtil.generateDuplicateReason(duplicateCheck.count) : null
      ];

      const result = await client.query(insertQuery, insertParams);

      await client.query('COMMIT');

      return result.rows[0];
    } catch (error: any) {
      await client.query('ROLLBACK');
      console.error('Error creating transaction:', error);
      throw new Error(`Failed to create transaction: ${error.message}`);
    } finally {
      client.release();
    }
  }

  /**
   * Update transaction
   */
  async updateTransaction(
    tenantId: number,
    isLive: boolean,
    transactionId: number,
    data: UpdateTransactionRequest
  ): Promise<Transaction | null> {
    const client = await this.db.connect();

    try {
      await client.query('BEGIN');

      // Check if transaction exists
      const checkQuery = `
        SELECT * FROM t_transaction_table
        WHERE id = $1 AND tenant_id = $2 AND is_live = $3
      `;
      const checkResult = await client.query(checkQuery, [transactionId, tenantId, isLive]);

      if (checkResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return null;
      }

      // Build update query
      const updateFields: string[] = [];
      const params: any[] = [];
      let paramIndex = 1;

      if (data.scheme_name !== undefined) {
        updateFields.push(`scheme_name = $${paramIndex}`);
        params.push(data.scheme_name);
        paramIndex++;
      }

      if (data.folio_no !== undefined) {
        updateFields.push(`folio_no = $${paramIndex}`);
        params.push(data.folio_no ? TransactionUtil.sanitizeFolioNumber(data.folio_no) : null);
        paramIndex++;
      }

      if (data.txn_type_id !== undefined) {
        updateFields.push(`txn_type_id = $${paramIndex}`);
        params.push(data.txn_type_id);
        paramIndex++;
      }

      if (data.txn_date !== undefined) {
        updateFields.push(`txn_date = $${paramIndex}`);
        params.push(data.txn_date);
        paramIndex++;
      }

      if (data.total_amount !== undefined) {
        updateFields.push(`total_amount = $${paramIndex}`);
        params.push(TransactionUtil.formatAmount(data.total_amount));
        paramIndex++;
      }

      if (data.units !== undefined) {
        updateFields.push(`units = $${paramIndex}`);
        params.push(TransactionUtil.formatUnits(data.units));
        paramIndex++;
      }

      if (data.nav !== undefined) {
        updateFields.push(`nav = $${paramIndex}`);
        params.push(TransactionUtil.formatNAV(data.nav));
        paramIndex++;
      }

      if (data.stamp_duty !== undefined) {
        updateFields.push(`stamp_duty = $${paramIndex}`);
        params.push(data.stamp_duty ? TransactionUtil.formatAmount(data.stamp_duty) : null);
        paramIndex++;
      }

      if (data.portfolio_flag !== undefined) {
        updateFields.push(`portfolio_flag = $${paramIndex}`);
        params.push(data.portfolio_flag);
        paramIndex++;
      }

      if (data.is_active !== undefined) {
        updateFields.push(`is_active = $${paramIndex}`);
        params.push(data.is_active);
        paramIndex++;
      }

      if (updateFields.length === 0) {
        await client.query('ROLLBACK');
        return checkResult.rows[0];
      }

      updateFields.push('updated_at = CURRENT_TIMESTAMP');

      const updateQuery = `
        UPDATE t_transaction_table
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex} AND tenant_id = $${paramIndex + 1} AND is_live = $${paramIndex + 2}
        RETURNING *
      `;

      params.push(transactionId, tenantId, isLive);

      const result = await client.query(updateQuery, params);

      await client.query('COMMIT');

      return result.rows[0];
    } catch (error: any) {
      await client.query('ROLLBACK');
      console.error('Error updating transaction:', error);
      throw new Error(`Failed to update transaction: ${error.message}`);
    } finally {
      client.release();
    }
  }

  /**
   * Update portfolio flag (include/exclude from portfolio totals)
   */
  async updatePortfolioFlag(
    tenantId: number,
    isLive: boolean,
    transactionId: number,
    data: UpdatePortfolioFlagRequest
  ): Promise<{ id: number; portfolio_flag: boolean } | null> {
    try {
      const query = `
        UPDATE t_transaction_table
        SET portfolio_flag = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2 AND tenant_id = $3 AND is_live = $4
        RETURNING id, portfolio_flag
      `;

      const result = await this.db.query(query, [
        data.portfolio_flag,
        transactionId,
        tenantId,
        isLive
      ]);

      if (result.rows.length === 0) {
        return null;
      }

      // Trigger portfolio totals refresh (async, don't wait)
      this.refreshPortfolioTotals().catch(err => {
        console.error('Error refreshing portfolio totals:', err);
      });

      return result.rows[0];
    } catch (error: any) {
      console.error('Error updating portfolio flag:', error);
      throw new Error(`Failed to update portfolio flag: ${error.message}`);
    }
  }

  /**
   * Delete transaction (soft delete)
   */
  async deleteTransaction(
    tenantId: number,
    isLive: boolean,
    transactionId: number
  ): Promise<boolean> {
    try {
      const query = `
        UPDATE t_transaction_table
        SET is_active = false, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1 AND tenant_id = $2 AND is_live = $3
      `;

      const result = await this.db.query(query, [transactionId, tenantId, isLive]);

      return result.rowCount > 0;
    } catch (error: any) {
      console.error('Error deleting transaction:', error);
      throw new Error(`Failed to delete transaction: ${error.message}`);
    }
  }

  /**
   * Get transaction summary statistics
   */
  async getTransactionSummary(
    tenantId: number,
    isLive: boolean,
    filters?: TransactionFilters
  ): Promise<TransactionSummary> {
    try {
      // Build WHERE clause
      const baseConditions = ['tenant_id = $1', 'is_live = $2', 'is_active = true'];
      const params: any[] = [tenantId, isLive];
      let paramIndex = 3;

      const filterClause = TransactionUtil.buildFilterWhereClause(
        filters || {},
        paramIndex
      );

      const whereClause = [...baseConditions, filterClause.where].join(' AND ');
      params.push(...filterClause.params);

      const query = `
        SELECT 
          COUNT(*) as total_transactions,
          SUM(total_amount) as total_amount,
          SUM(units) as total_units,
          COUNT(CASE WHEN mtt.txn_type = 'Addition' THEN 1 END) as addition_count,
          COUNT(CASE WHEN mtt.txn_type = 'Deduction' THEN 1 END) as deduction_count,
          SUM(CASE WHEN mtt.txn_type = 'Addition' THEN total_amount ELSE 0 END) as addition_amount,
          SUM(CASE WHEN mtt.txn_type = 'Deduction' THEN total_amount ELSE 0 END) as deduction_amount,
          COUNT(CASE WHEN is_potential_duplicate = true THEN 1 END) as duplicate_count,
          COUNT(DISTINCT scheme_code) as unique_schemes,
          MIN(txn_date) as earliest_date,
          MAX(txn_date) as latest_date
        FROM t_transaction_table tt
        LEFT JOIN m_transaction_types mtt ON tt.txn_type_id = mtt.id
        WHERE ${whereClause}
      `;

      const result = await this.db.query(query, params);
      const row = result.rows[0];

      return {
        total_transactions: parseInt(row.total_transactions) || 0,
        total_amount: parseFloat(row.total_amount) || 0,
        total_units: parseFloat(row.total_units) || 0,
        addition_count: parseInt(row.addition_count) || 0,
        deduction_count: parseInt(row.deduction_count) || 0,
        addition_amount: parseFloat(row.addition_amount) || 0,
        deduction_amount: parseFloat(row.deduction_amount) || 0,
        duplicate_count: parseInt(row.duplicate_count) || 0,
        unique_schemes: parseInt(row.unique_schemes) || 0,
        date_range: {
          earliest: row.earliest_date,
          latest: row.latest_date
        }
      };
    } catch (error: any) {
      console.error('Error getting transaction summary:', error);
      throw new Error(`Failed to get transaction summary: ${error.message}`);
    }
  }

  /**
   * Check for duplicate transaction
   */
  private async checkDuplicate(
    tenantId: number,
    isLive: boolean,
    data: {
      customer_id: number;
      scheme_code: string;
      txn_date: string;
      total_amount: number;
      txn_type_id: number;
    },
    client: any
  ): Promise<{ is_duplicate: boolean; count: number }> {
    const query = `
      SELECT COUNT(*) as count
      FROM t_transaction_table
      WHERE customer_id = $1
        AND scheme_code = $2
        AND txn_date = $3
        AND total_amount = $4
        AND txn_type_id = $5
        AND tenant_id = $6
        AND is_live = $7
        AND is_active = true
    `;

    const result = await client.query(query, [
      data.customer_id,
      TransactionUtil.sanitizeSchemeCode(data.scheme_code),
      data.txn_date,
      TransactionUtil.formatAmount(data.total_amount),
      data.txn_type_id,
      tenantId,
      isLive
    ]);

    const count = parseInt(result.rows[0].count);
    return {
      is_duplicate: count > 0,
      count
    };
  }

  /**
   * Upsert portfolio entry
   */
  private async upsertPortfolioEntry(
    tenantId: number,
    isLive: boolean,
    data: {
      customer_id: number;
      scheme_code: string;
      scheme_name: string;
      folio_no?: string;
    },
    client: any
  ): Promise<void> {
    const query = `
      INSERT INTO t_customer_master_portfolio (
        tenant_id, is_live, customer_id, scheme_code, scheme_name, folio_no
      ) VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (customer_id, scheme_code, tenant_id, is_live)
      DO UPDATE SET
        scheme_name = EXCLUDED.scheme_name,
        folio_no = COALESCE(EXCLUDED.folio_no, t_customer_master_portfolio.folio_no),
        updated_at = CURRENT_TIMESTAMP
    `;

    await client.query(query, [
      tenantId,
      isLive,
      data.customer_id,
      TransactionUtil.sanitizeSchemeCode(data.scheme_code),
      data.scheme_name,
      data.folio_no ? TransactionUtil.sanitizeFolioNumber(data.folio_no) : null
    ]);
  }

  /**
   * Refresh portfolio totals materialized view
   */
  private async refreshPortfolioTotals(): Promise<void> {
    try {
      await this.db.query('REFRESH MATERIALIZED VIEW CONCURRENTLY t_customer_portfolio_totals');
    } catch (error: any) {
      console.error('Error refreshing portfolio totals:', error);
      // Don't throw - this is a background operation
    }
  }
}