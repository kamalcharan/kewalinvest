// backend/src/services/courseCorrection.service.ts
// Service for Course Correction (Scheme Code Migration) feature

import { pool } from '../config/database';
import {
  CourseCorrection,
  CourseCorrectionStatus,
  ImpactedCustomer,
  SchemeImpactAnalysis,
  CreateCourseCorrectionRequest,
  GetCorrectionsParams
} from '../types/courseCorrection.types';

export class CourseCorrectionService {

  // ============================================================================
  // IMPACT ANALYSIS
  // ============================================================================

  /**
   * Get impact analysis for a scheme code
   * Returns list of customers with transactions using this scheme
   */
  async getSchemeImpactAnalysis(
    tenantId: number,
    isLive: boolean,
    schemeCode: string
  ): Promise<SchemeImpactAnalysis> {
    // Get scheme name from bookmarks
    const schemeQuery = `
      SELECT scheme_name FROM t_scheme_bookmarks
      WHERE scheme_code = $1 AND tenant_id = $2 AND is_live = $3 AND is_active = true
      LIMIT 1
    `;
    const schemeResult = await pool.query(schemeQuery, [schemeCode, tenantId, isLive]);
    const schemeName = schemeResult.rows[0]?.scheme_name || null;

    // Get impacted customers using the database function
    const query = `SELECT * FROM get_scheme_impact_analysis($1, $2, $3)`;
    const result = await pool.query(query, [tenantId, isLive, schemeCode]);

    const customers: ImpactedCustomer[] = result.rows.map(row => ({
      customer_id: row.customer_id,
      customer_name: row.customer_name,
      transaction_count: parseInt(row.transaction_count),
      total_invested: parseFloat(row.total_invested) || 0,
      first_transaction_date: row.first_transaction_date,
      last_transaction_date: row.last_transaction_date,
      already_migrated: row.already_migrated
    }));

    const totalTransactions = customers.reduce((sum, c) => sum + c.transaction_count, 0);
    const totalInvested = customers.reduce((sum, c) => sum + c.total_invested, 0);

    return {
      scheme_code: schemeCode,
      scheme_name: schemeName,
      total_customers: customers.length,
      total_transactions: totalTransactions,
      total_invested: totalInvested,
      customers
    };
  }

  // ============================================================================
  // COURSE CORRECTION CRUD
  // ============================================================================

  /**
   * Get list of course corrections with pagination
   */
  async getCorrections(
    tenantId: number,
    isLive: boolean,
    params: GetCorrectionsParams
  ): Promise<{ corrections: CourseCorrection[]; total: number }> {
    const { page = 1, page_size = 20, status, customer_id, source_scheme_code } = params;
    const offset = (page - 1) * page_size;

    let whereClause = 'WHERE cc.tenant_id = $1 AND cc.is_live = $2';
    const queryParams: any[] = [tenantId, isLive];
    let paramIndex = 3;

    if (status) {
      whereClause += ` AND cc.status = $${paramIndex}`;
      queryParams.push(status);
      paramIndex++;
    }

    if (customer_id) {
      whereClause += ` AND cc.customer_id = $${paramIndex}`;
      queryParams.push(customer_id);
      paramIndex++;
    }

    if (source_scheme_code) {
      whereClause += ` AND cc.source_scheme_code = $${paramIndex}`;
      queryParams.push(source_scheme_code);
      paramIndex++;
    }

    // Get total count
    const countQuery = `SELECT COUNT(*) FROM t_course_corrections cc ${whereClause}`;
    const countResult = await pool.query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].count);

    // Get paginated results
    const query = `
      SELECT
        cc.*,
        u.name as created_by_name,
        rb.name as rolled_back_by_name
      FROM t_course_corrections cc
      LEFT JOIN t_users u ON u.id = cc.created_by
      LEFT JOIN t_users rb ON rb.id = cc.rolled_back_by
      ${whereClause}
      ORDER BY cc.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    queryParams.push(page_size, offset);

    const result = await pool.query(query, queryParams);

    return {
      corrections: result.rows,
      total
    };
  }

  /**
   * Get single course correction by ID
   */
  async getCorrectionById(
    tenantId: number,
    isLive: boolean,
    correctionId: number
  ): Promise<CourseCorrection | null> {
    const query = `
      SELECT
        cc.*,
        u.name as created_by_name,
        rb.name as rolled_back_by_name
      FROM t_course_corrections cc
      LEFT JOIN t_users u ON u.id = cc.created_by
      LEFT JOIN t_users rb ON rb.id = cc.rolled_back_by
      WHERE cc.id = $1 AND cc.tenant_id = $2 AND cc.is_live = $3
    `;
    const result = await pool.query(query, [correctionId, tenantId, isLive]);
    return result.rows[0] || null;
  }

  /**
   * Create a new course correction record (pending status)
   */
  async createCorrection(
    tenantId: number,
    isLive: boolean,
    userId: number,
    request: CreateCourseCorrectionRequest
  ): Promise<CourseCorrection> {
    // Get customer name
    const customerQuery = `
      SELECT co.name as customer_name
      FROM t_customers c
      JOIN t_contacts co ON co.id = c.contact_id
      WHERE c.id = $1 AND c.tenant_id = $2
    `;
    const customerResult = await pool.query(customerQuery, [request.customer_id, tenantId]);
    if (customerResult.rows.length === 0) {
      throw new Error('Customer not found');
    }
    const customerName = customerResult.rows[0].customer_name;

    // Get source scheme name
    const sourceSchemeQuery = `
      SELECT scheme_name FROM t_scheme_bookmarks
      WHERE scheme_code = $1 AND tenant_id = $2 AND is_live = $3 AND is_active = true
      LIMIT 1
    `;
    const sourceResult = await pool.query(sourceSchemeQuery, [request.source_scheme_code, tenantId, isLive]);
    const sourceSchemeName = sourceResult.rows[0]?.scheme_name || null;

    // Get target scheme name from master
    const targetSchemeQuery = `
      SELECT scheme_name FROM t_scheme_details
      WHERE scheme_code = $1 AND is_active = true
      LIMIT 1
    `;
    const targetResult = await pool.query(targetSchemeQuery, [request.target_scheme_code]);
    const targetSchemeName = targetResult.rows[0]?.scheme_name || null;

    // Get transaction count and total for this customer + source scheme
    const statsQuery = `
      SELECT COUNT(*) as txn_count, COALESCE(SUM(amount), 0) as total_invested
      FROM t_transaction_table
      WHERE customer_id = $1 AND scheme_code = $2 AND tenant_id = $3 AND is_live = $4
    `;
    const statsResult = await pool.query(statsQuery, [request.customer_id, request.source_scheme_code, tenantId, isLive]);
    const transactionCount = parseInt(statsResult.rows[0].txn_count);
    const totalInvested = parseFloat(statsResult.rows[0].total_invested);

    // Check if already migrated
    const existingQuery = `
      SELECT id FROM t_course_corrections
      WHERE customer_id = $1 AND source_scheme_code = $2 AND status = 'completed'
        AND tenant_id = $3 AND is_live = $4
    `;
    const existingResult = await pool.query(existingQuery, [request.customer_id, request.source_scheme_code, tenantId, isLive]);
    if (existingResult.rows.length > 0) {
      throw new Error('This customer has already been migrated for this scheme code');
    }

    // Insert the correction record
    const insertQuery = `
      INSERT INTO t_course_corrections (
        tenant_id, is_live, customer_id, customer_name,
        source_scheme_code, source_scheme_name,
        target_scheme_code, target_scheme_name,
        transaction_count, total_invested,
        status, notes, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'pending', $11, $12)
      RETURNING *
    `;
    const insertResult = await pool.query(insertQuery, [
      tenantId, isLive, request.customer_id, customerName,
      request.source_scheme_code, sourceSchemeName,
      request.target_scheme_code, targetSchemeName,
      transactionCount, totalInvested,
      request.notes || null, userId
    ]);

    return insertResult.rows[0];
  }

  /**
   * Execute a pending course correction
   */
  async executeCorrection(
    tenantId: number,
    isLive: boolean,
    correctionId: number
  ): Promise<{ success: boolean; updated_transactions?: number; error?: string }> {
    // Verify the correction belongs to this tenant
    const verifyQuery = `
      SELECT id FROM t_course_corrections
      WHERE id = $1 AND tenant_id = $2 AND is_live = $3 AND status = 'pending'
    `;
    const verifyResult = await pool.query(verifyQuery, [correctionId, tenantId, isLive]);
    if (verifyResult.rows.length === 0) {
      return { success: false, error: 'Correction not found or not in pending status' };
    }

    // Execute using database function
    const query = `SELECT execute_course_correction($1) as result`;
    const result = await pool.query(query, [correctionId]);
    const response = result.rows[0].result;

    return {
      success: response.success,
      updated_transactions: response.updated_transactions,
      error: response.error
    };
  }

  /**
   * Rollback a completed course correction
   */
  async rollbackCorrection(
    tenantId: number,
    isLive: boolean,
    correctionId: number,
    userId: number
  ): Promise<{ success: boolean; restored_transactions?: number; error?: string }> {
    // Verify the correction belongs to this tenant
    const verifyQuery = `
      SELECT id FROM t_course_corrections
      WHERE id = $1 AND tenant_id = $2 AND is_live = $3 AND status = 'completed'
    `;
    const verifyResult = await pool.query(verifyQuery, [correctionId, tenantId, isLive]);
    if (verifyResult.rows.length === 0) {
      return { success: false, error: 'Correction not found or not in completed status' };
    }

    // Rollback using database function
    const query = `SELECT rollback_course_correction($1, $2) as result`;
    const result = await pool.query(query, [correctionId, userId]);
    const response = result.rows[0].result;

    return {
      success: response.success,
      restored_transactions: response.restored_transactions,
      error: response.error
    };
  }

  /**
   * Delete a pending course correction
   */
  async deleteCorrection(
    tenantId: number,
    isLive: boolean,
    correctionId: number
  ): Promise<boolean> {
    const query = `
      DELETE FROM t_course_corrections
      WHERE id = $1 AND tenant_id = $2 AND is_live = $3 AND status = 'pending'
      RETURNING id
    `;
    const result = await pool.query(query, [correctionId, tenantId, isLive]);
    return result.rows.length > 0;
  }

  /**
   * Mark snapshot as regenerated
   */
  async markSnapshotRegenerated(
    tenantId: number,
    isLive: boolean,
    correctionId: number
  ): Promise<boolean> {
    const query = `
      UPDATE t_course_corrections
      SET snapshot_regenerated = true, snapshot_regenerated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND tenant_id = $2 AND is_live = $3
      RETURNING id
    `;
    const result = await pool.query(query, [correctionId, tenantId, isLive]);
    return result.rows.length > 0;
  }

  // ============================================================================
  // BOOKMARKS LIST (for source scheme selection)
  // NOTE: For target scheme search, use NAV Tracking API: /api/nav/schemes/search
  // ============================================================================

  /**
   * Get bookmarked schemes for source selection
   */
  async getBookmarkedSchemes(
    tenantId: number,
    isLive: boolean
  ): Promise<Array<{ scheme_code: string; scheme_name: string; amc_name: string }>> {
    const query = `
      SELECT DISTINCT scheme_code, scheme_name, amc_name
      FROM t_scheme_bookmarks
      WHERE tenant_id = $1 AND is_live = $2 AND is_active = true
      ORDER BY amc_name, scheme_name
    `;
    const result = await pool.query(query, [tenantId, isLive]);
    return result.rows;
  }
}

export const courseCorrectionService = new CourseCorrectionService();
