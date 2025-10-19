// backend/src/services/bookmarkGap.service.ts
// Service for detecting schemes in customer portfolios that are not bookmarked

import { Pool } from 'pg';
import { pool } from '../config/database';
import { SimpleLogger } from './simpleLogger.service';
import {
  UnbookmarkedScheme,
  BookmarkGapSummary,
  BookmarkGapAlert,
  CustomerUnbookmarkedScheme
} from '../types/nav.types';

export class BookmarkGapService {
  private db: Pool;

  constructor() {
    this.db = pool;
  }

  /**
   * Get all unbookmarked schemes from customer portfolios (tenant-wide)
   */
  async getUnbookmarkedSchemes(
    tenantId: number,
    isLive: boolean
  ): Promise<BookmarkGapAlert> {
    try {
      const query = `
        SELECT 
          vt.scheme_code,
          vt.scheme_name,
          vt.customer_count,
          vt.transaction_count,
          vt.total_invested,
          vt.last_transaction_date,
          vt.first_transaction_date,
          sd.id as scheme_id,
          sd.amc_name,
          CASE WHEN sd.id IS NULL THEN false ELSE true END as exists_in_master
        FROM v_tenant_customer_schemes vt
        LEFT JOIN t_scheme_details sd 
          ON vt.scheme_code = sd.scheme_code 
          AND sd.is_active = true
        LEFT JOIN t_scheme_bookmarks sb 
          ON vt.tenant_id = sb.tenant_id 
          AND vt.is_live = sb.is_live 
          AND sd.id = sb.scheme_id
          AND sb.is_active = true
        WHERE vt.tenant_id = $1 
          AND vt.is_live = $2
          AND sb.id IS NULL  -- Not bookmarked
        ORDER BY 
          CASE WHEN sd.id IS NULL THEN 0 ELSE 1 END,  -- Critical (not in master) first
          vt.customer_count DESC, 
          vt.total_invested DESC
      `;

      const result = await this.db.query(query, [tenantId, isLive]);
      const unbookmarkedSchemes: UnbookmarkedScheme[] = result.rows;

      // Calculate summary
      const criticalCount = unbookmarkedSchemes.filter(s => !s.exists_in_master).length;
      const warningCount = unbookmarkedSchemes.filter(s => s.exists_in_master).length;
      
      const totalCustomersAffected = unbookmarkedSchemes.reduce(
        (sum, s) => sum + parseInt(s.customer_count as any), 0
      );
      
      const totalInvestmentAtRisk = unbookmarkedSchemes.reduce(
        (sum, s) => sum + parseFloat(s.total_invested as any || '0'), 0
      );

      const summary: BookmarkGapSummary = {
        total_unbookmarked: unbookmarkedSchemes.length,
        total_customers_affected: totalCustomersAffected,
        total_investment_at_risk: totalInvestmentAtRisk,
        schemes_not_in_master: criticalCount,
        schemes_not_bookmarked: warningCount,
        last_checked: new Date()
      };

      const alertType = criticalCount > 0 ? 'critical' : 'warning';
      const message = criticalCount > 0
        ? `${criticalCount} schemes in customer portfolios don't exist in master data. ${warningCount} schemes exist but are not bookmarked.`
        : `${warningCount} schemes in customer portfolios are not bookmarked for NAV tracking.`;

      SimpleLogger.error('BookmarkGapService', 'Bookmark gap detection completed', 'getUnbookmarkedSchemes', {
        tenantId, 
        totalUnbookmarked: unbookmarkedSchemes.length,
        critical: criticalCount,
        warning: warningCount
      }, undefined, tenantId);

      return {
        alert_type: alertType,
        message,
        unbookmarked_schemes: unbookmarkedSchemes,
        summary
      };

    } catch (error: any) {
      SimpleLogger.error('BookmarkGapService', 'Failed to get unbookmarked schemes', 'getUnbookmarkedSchemes', {
        tenantId, error: error.message
      }, undefined, tenantId, error.stack);
      throw error;
    }
  }

  /**
   * Get unbookmarked schemes for a specific customer
   */
  async getCustomerUnbookmarkedSchemes(
    tenantId: number,
    isLive: boolean,
    customerId: number
  ): Promise<CustomerUnbookmarkedScheme[]> {
    try {
      // First get customer name
      const customerQuery = `
        SELECT c.name 
        FROM t_customers cust
        JOIN t_contacts c ON c.id = cust.contact_id
        WHERE cust.id = $1 AND cust.tenant_id = $2 AND cust.is_live = $3
      `;
      const customerResult = await this.db.query(customerQuery, [customerId, tenantId, isLive]);
      
      if (customerResult.rows.length === 0) {
        throw new Error('Customer not found');
      }

      const customerName = customerResult.rows[0].name;

      // Get unbookmarked schemes from this customer's transactions
      const query = `
        SELECT DISTINCT ON (tt.scheme_code)
          tt.scheme_code,
          tt.scheme_name,
          tt.folio_no,
          COUNT(*) as transaction_count,
          SUM(CASE WHEN tt.portfolio_flag = true THEN tt.total_amount ELSE 0 END) as total_invested,
          MAX(tt.txn_date) as last_transaction_date,
          sd.id as scheme_id,
          CASE WHEN sd.id IS NULL THEN false ELSE true END as exists_in_master
        FROM t_transaction_table tt
        LEFT JOIN t_scheme_details sd 
          ON tt.scheme_code = sd.scheme_code 
          AND sd.is_active = true
        LEFT JOIN t_scheme_bookmarks sb 
          ON tt.tenant_id = sb.tenant_id 
          AND tt.is_live = sb.is_live 
          AND sd.id = sb.scheme_id
          AND sb.is_active = true
        WHERE tt.customer_id = $1
          AND tt.tenant_id = $2
          AND tt.is_live = $3
          AND tt.is_active = true
          AND sb.id IS NULL  -- Not bookmarked
        GROUP BY tt.scheme_code, tt.scheme_name, tt.folio_no, sd.id
        ORDER BY tt.scheme_code, 
          CASE WHEN sd.id IS NULL THEN 0 ELSE 1 END,  -- Critical first
          MAX(tt.txn_date) DESC
      `;

      const result = await this.db.query(query, [customerId, tenantId, isLive]);

      const unbookmarkedSchemes: CustomerUnbookmarkedScheme[] = result.rows.map(row => ({
        customer_id: customerId,
        customer_name: customerName,
        scheme_code: row.scheme_code,
        scheme_name: row.scheme_name,
        folio_no: row.folio_no,
        total_invested: parseFloat(row.total_invested || '0'),
        transaction_count: parseInt(row.transaction_count),
        last_transaction_date: row.last_transaction_date,
        scheme_id: row.scheme_id,
        exists_in_master: row.exists_in_master
      }));

      SimpleLogger.error('BookmarkGapService', 'Customer unbookmarked schemes retrieved', 'getCustomerUnbookmarkedSchemes', {
        tenantId, 
        customerId,
        unbookmarkedCount: unbookmarkedSchemes.length
      }, undefined, tenantId);

      return unbookmarkedSchemes;

    } catch (error: any) {
      SimpleLogger.error('BookmarkGapService', 'Failed to get customer unbookmarked schemes', 'getCustomerUnbookmarkedSchemes', {
        tenantId, 
        customerId, 
        error: error.message
      }, undefined, tenantId, error.stack);
      throw error;
    }
  }

  /**
   * Get summary statistics only (lightweight version)
   */
  async getGapSummary(
    tenantId: number,
    isLive: boolean
  ): Promise<BookmarkGapSummary> {
    try {
      const query = `
        SELECT 
          COUNT(*) as total_unbookmarked,
          SUM(vt.customer_count) as total_customers_affected,
          SUM(vt.total_invested) as total_investment_at_risk,
          COUNT(*) FILTER (WHERE sd.id IS NULL) as schemes_not_in_master,
          COUNT(*) FILTER (WHERE sd.id IS NOT NULL) as schemes_not_bookmarked
        FROM v_tenant_customer_schemes vt
        LEFT JOIN t_scheme_details sd 
          ON vt.scheme_code = sd.scheme_code 
          AND sd.is_active = true
        LEFT JOIN t_scheme_bookmarks sb 
          ON vt.tenant_id = sb.tenant_id 
          AND vt.is_live = sb.is_live 
          AND sd.id = sb.scheme_id
          AND sb.is_active = true
        WHERE vt.tenant_id = $1 
          AND vt.is_live = $2
          AND sb.id IS NULL
      `;

      const result = await this.db.query(query, [tenantId, isLive]);
      const stats = result.rows[0];

      return {
        total_unbookmarked: parseInt(stats.total_unbookmarked || '0'),
        total_customers_affected: parseInt(stats.total_customers_affected || '0'),
        total_investment_at_risk: parseFloat(stats.total_investment_at_risk || '0'),
        schemes_not_in_master: parseInt(stats.schemes_not_in_master || '0'),
        schemes_not_bookmarked: parseInt(stats.schemes_not_bookmarked || '0'),
        last_checked: new Date()
      };

    } catch (error: any) {
      SimpleLogger.error('BookmarkGapService', 'Failed to get gap summary', 'getGapSummary', {
        tenantId, error: error.message
      }, undefined, tenantId, error.stack);
      throw error;
    }
  }
}