// backend/src/services/courseCorrection.service.ts
// Service for Course Correction (Scheme Code Migration) feature
// Step-by-step tracking for better debugging and rollback control

import { pool } from '../config/database';
import {
  CourseCorrection,
  CourseCorrectionStatus,
  ImpactedCustomer,
  SchemeImpactAnalysis,
  CreateCourseCorrectionRequest,
  GetCorrectionsParams
} from '../types/courseCorrection.types';
import { PortfolioSnapshotService } from './portfolioSnapshot.service';

// Step status type
type StepStatus = 'pending' | 'pass' | 'fail';

// Migration result with all 8 steps
export interface MigrationResult {
  success: boolean;
  correction_id?: number;
  steps: {
    step_1_check_existing: { status: StepStatus; message?: string };
    step_2_get_customer: { status: StepStatus; message?: string };
    step_3_get_source_scheme: { status: StepStatus; message?: string };
    step_4_get_target_scheme: { status: StepStatus; message?: string };
    step_5_count_txns: { status: StepStatus; message?: string; count?: number };
    step_6_backup: { status: StepStatus; message?: string };
    step_7_update_txns: { status: StepStatus; message?: string; count?: number };
    step_8_snapshots: { status: StepStatus; message?: string };
  };
  summary?: {
    customer_id: number;
    customer_name: string;
    source_scheme_code: string;
    source_scheme_name: string | null;
    target_scheme_code: string;
    target_scheme_name: string | null;
    transactions_updated: number;
    total_invested: number;
  };
  error?: string;
  failed_step?: number;
}

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

    // Get paginated results with step statuses
    const query = `
      SELECT
        cc.*,
        u.email as created_by_name,
        rb.email as rolled_back_by_name
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
        u.email as created_by_name,
        rb.email as rolled_back_by_name
      FROM t_course_corrections cc
      LEFT JOIN t_users u ON u.id = cc.created_by
      LEFT JOIN t_users rb ON rb.id = cc.rolled_back_by
      WHERE cc.id = $1 AND cc.tenant_id = $2 AND cc.is_live = $3
    `;
    const result = await pool.query(query, [correctionId, tenantId, isLive]);
    return result.rows[0] || null;
  }

  /**
   * Helper: Update step status in database
   */
  private async updateStepStatus(
    correctionId: number,
    stepColumn: string,
    status: StepStatus,
    errorMessage?: string
  ): Promise<void> {
    let query = `UPDATE t_course_corrections SET ${stepColumn} = $1`;
    const params: any[] = [status];

    if (status === 'fail' && errorMessage) {
      query += `, error_message = $2 WHERE id = $3`;
      params.push(errorMessage, correctionId);
    } else {
      query += ` WHERE id = $2`;
      params.push(correctionId);
    }

    await pool.query(query, params);
  }

  /**
   * Rollback a completed course correction
   * After rollback, regenerates portfolio snapshots for the customer
   */
  async rollbackCorrection(
    tenantId: number,
    isLive: boolean,
    correctionId: number,
    userId: number
  ): Promise<{ success: boolean; restored_transactions?: number; snapshots_regenerated?: number; error?: string }> {
    // Verify the correction belongs to this tenant and has backup, get customer_id for snapshot regen
    const verifyQuery = `
      SELECT id, customer_id, step_6_backup, step_7_update_txns FROM t_course_corrections
      WHERE id = $1 AND tenant_id = $2 AND is_live = $3
    `;
    const verifyResult = await pool.query(verifyQuery, [correctionId, tenantId, isLive]);

    if (verifyResult.rows.length === 0) {
      return { success: false, error: 'Correction not found' };
    }

    const correction = verifyResult.rows[0];

    // Can only rollback if step 7 (update) passed
    if (correction.step_7_update_txns !== 'pass') {
      return { success: false, error: 'Cannot rollback - transactions were not updated (step 7 not passed)' };
    }

    // Use the v2 rollback function
    const query = `SELECT rollback_course_correction_v2($1, $2) as result`;
    const result = await pool.query(query, [correctionId, userId]);
    const response = result.rows[0].result;

    if (!response.success) {
      return {
        success: false,
        error: response.error
      };
    }

    // Regenerate snapshots for the customer after rollback
    let snapshotsRegenerated = 0;
    try {
      console.log(`[CourseCorrection] Rollback complete, regenerating snapshots for customer ${correction.customer_id}...`);
      const snapshotService = new PortfolioSnapshotService();
      const snapshotResult = await snapshotService.smartBackfill({
        tenant_id: tenantId,
        is_live: isLive,
        customer_ids: [correction.customer_id]
      });

      if (snapshotResult.success) {
        snapshotsRegenerated = snapshotResult.snapshots_created + snapshotResult.snapshots_updated;
        console.log(`[CourseCorrection] Snapshots regenerated: ${snapshotsRegenerated}`);
      }
    } catch (snapshotError: any) {
      console.error(`[CourseCorrection] Snapshot regeneration failed after rollback:`, snapshotError.message);
      // Don't fail the rollback, just log the error
    }

    return {
      success: true,
      restored_transactions: response.restored_transactions,
      snapshots_regenerated: snapshotsRegenerated
    };
  }

  /**
   * Delete a course correction (only if step 6+ was reached)
   */
  async deleteCorrection(
    tenantId: number,
    isLive: boolean,
    correctionId: number
  ): Promise<{ success: boolean; error?: string }> {
    // Check if the correction exists and get its state
    const checkQuery = `
      SELECT id, step_6_backup, step_7_update_txns, status
      FROM t_course_corrections
      WHERE id = $1 AND tenant_id = $2 AND is_live = $3
    `;
    const checkResult = await pool.query(checkQuery, [correctionId, tenantId, isLive]);

    if (checkResult.rows.length === 0) {
      return { success: false, error: 'Correction not found' };
    }

    const correction = checkResult.rows[0];

    // If transactions were updated (step 7 passed), must rollback first
    if (correction.step_7_update_txns === 'pass' && correction.status !== 'rolled_back') {
      return { success: false, error: 'Must rollback before deleting - transactions were modified' };
    }

    // Delete the record
    const deleteQuery = `
      DELETE FROM t_course_corrections
      WHERE id = $1 AND tenant_id = $2 AND is_live = $3
      RETURNING id
    `;
    const result = await pool.query(deleteQuery, [correctionId, tenantId, isLive]);

    return { success: result.rows.length > 0 };
  }

  /**
   * Mark snapshot as regenerated (step 8)
   */
  async markSnapshotRegenerated(
    tenantId: number,
    isLive: boolean,
    correctionId: number
  ): Promise<boolean> {
    const query = `
      UPDATE t_course_corrections
      SET snapshot_regenerated = true,
          snapshot_regenerated_at = CURRENT_TIMESTAMP,
          step_8_snapshots = 'pass'
      WHERE id = $1 AND tenant_id = $2 AND is_live = $3
      RETURNING id
    `;
    const result = await pool.query(query, [correctionId, tenantId, isLive]);
    return result.rows.length > 0;
  }

  // ============================================================================
  // STEP-BY-STEP MIGRATION
  // ============================================================================

  /**
   * Complete migration with step-by-step tracking:
   * Step 0: Create Record (with all steps pending)
   * Step 1: Check Existing Migrations
   * Step 2: Get Customer Name
   * Step 3: Get Source Scheme Name
   * Step 4: Get Target Scheme Name
   * Step 5: Count Transactions
   * Step 6: Backup Transactions
   * Step 7: Update Transactions
   * Step 8: Regenerate Snapshots
   */
  async migrateAndComplete(
    tenantId: number,
    isLive: boolean,
    userId: number,
    request: CreateCourseCorrectionRequest
  ): Promise<MigrationResult> {
    const result: MigrationResult = {
      success: false,
      steps: {
        step_1_check_existing: { status: 'pending' },
        step_2_get_customer: { status: 'pending' },
        step_3_get_source_scheme: { status: 'pending' },
        step_4_get_target_scheme: { status: 'pending' },
        step_5_count_txns: { status: 'pending' },
        step_6_backup: { status: 'pending' },
        step_7_update_txns: { status: 'pending' },
        step_8_snapshots: { status: 'pending' }
      }
    };

    let correctionId: number | null = null;
    let customerName: string = '';
    let sourceSchemeName: string | null = null;
    let targetSchemeName: string | null = null;
    let transactionCount: number = 0;
    let totalInvested: number = 0;

    try {
      // ========== STEP 0: Create Record with all steps pending ==========
      console.log(`[CourseCorrection] Step 0: Creating correction record...`);
      const insertQuery = `
        INSERT INTO t_course_corrections (
          tenant_id, is_live, customer_id, customer_name,
          source_scheme_code, source_scheme_name,
          target_scheme_code, target_scheme_name,
          transaction_count, total_invested,
          status, notes, created_by,
          step_1_check_existing, step_2_get_customer, step_3_get_source_scheme,
          step_4_get_target_scheme, step_5_count_txns, step_6_backup,
          step_7_update_txns, step_8_snapshots
        ) VALUES ($1, $2, $3, '', $4, '', $5, '', 0, 0, 'pending', $6, $7,
          'pending', 'pending', 'pending', 'pending', 'pending', 'pending', 'pending', 'pending')
        RETURNING id
      `;
      const insertResult = await pool.query(insertQuery, [
        tenantId, isLive, request.customer_id,
        request.source_scheme_code, request.target_scheme_code,
        request.notes || null, userId
      ]);
      correctionId = insertResult.rows[0].id;
      result.correction_id = correctionId;
      console.log(`[CourseCorrection] Step 0 complete: Correction ID ${correctionId}`);

      // ========== STEP 1: Check Existing Migrations ==========
      console.log(`[CourseCorrection] Step 1: Checking existing migrations...`);
      try {
        const existingQuery = `
          SELECT id, status, target_scheme_code, executed_at,
                 step_1_check_existing, step_2_get_customer, step_3_get_source_scheme,
                 step_4_get_target_scheme, step_5_count_txns, step_6_backup,
                 step_7_update_txns, step_8_snapshots
          FROM t_course_corrections
          WHERE customer_id = $1 AND source_scheme_code = $2
            AND tenant_id = $3 AND is_live = $4 AND id != $5
          ORDER BY created_at DESC
        `;
        const existingResult = await pool.query(existingQuery, [
          request.customer_id, request.source_scheme_code, tenantId, isLive, correctionId
        ]);

        for (const existing of existingResult.rows) {
          // Only block if ALL steps passed (full success)
          const allStepsPassed =
            existing.step_1_check_existing === 'pass' &&
            existing.step_2_get_customer === 'pass' &&
            existing.step_3_get_source_scheme === 'pass' &&
            existing.step_4_get_target_scheme === 'pass' &&
            existing.step_5_count_txns === 'pass' &&
            existing.step_6_backup === 'pass' &&
            existing.step_7_update_txns === 'pass' &&
            existing.step_8_snapshots === 'pass';

          if (existing.status === 'completed' && allStepsPassed) {
            const executedDate = existing.executed_at
              ? new Date(existing.executed_at).toLocaleDateString('en-IN')
              : 'unknown date';
            throw new Error(
              `Migration already completed on ${executedDate}. ` +
              `Transactions were migrated to ${existing.target_scheme_code}. ` +
              `Use 'Rollback' from history if you need to undo this migration.`
            );
          }
          // Don't delete failed/pending records - keep for debugging
        }

        await this.updateStepStatus(correctionId, 'step_1_check_existing', 'pass');
        result.steps.step_1_check_existing = { status: 'pass', message: 'No blocking migrations found' };
        console.log(`[CourseCorrection] Step 1 complete`);

      } catch (error: any) {
        await this.updateStepStatus(correctionId, 'step_1_check_existing', 'fail', error.message);
        await pool.query('UPDATE t_course_corrections SET status = $1 WHERE id = $2', ['failed', correctionId]);
        result.steps.step_1_check_existing = { status: 'fail', message: error.message };
        result.error = error.message;
        result.failed_step = 1;
        return result;
      }

      // ========== STEP 2: Get Customer Name ==========
      console.log(`[CourseCorrection] Step 2: Getting customer name...`);
      try {
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

        customerName = customerResult.rows[0].customer_name;
        await pool.query(
          'UPDATE t_course_corrections SET customer_name = $1, step_2_get_customer = $2 WHERE id = $3',
          [customerName, 'pass', correctionId]
        );
        result.steps.step_2_get_customer = { status: 'pass', message: customerName };
        console.log(`[CourseCorrection] Step 2 complete: ${customerName}`);

      } catch (error: any) {
        await this.updateStepStatus(correctionId, 'step_2_get_customer', 'fail', error.message);
        await pool.query('UPDATE t_course_corrections SET status = $1 WHERE id = $2', ['failed', correctionId]);
        result.steps.step_2_get_customer = { status: 'fail', message: error.message };
        result.error = error.message;
        result.failed_step = 2;
        return result;
      }

      // ========== STEP 3: Get Source Scheme Name ==========
      console.log(`[CourseCorrection] Step 3: Getting source scheme name...`);
      try {
        const sourceSchemeQuery = `
          SELECT scheme_name FROM t_scheme_bookmarks
          WHERE scheme_code = $1 AND tenant_id = $2 AND is_live = $3 AND is_active = true
          LIMIT 1
        `;
        const sourceResult = await pool.query(sourceSchemeQuery, [request.source_scheme_code, tenantId, isLive]);
        sourceSchemeName = sourceResult.rows[0]?.scheme_name || null;

        await pool.query(
          'UPDATE t_course_corrections SET source_scheme_name = $1, step_3_get_source_scheme = $2 WHERE id = $3',
          [sourceSchemeName, 'pass', correctionId]
        );
        result.steps.step_3_get_source_scheme = { status: 'pass', message: sourceSchemeName || 'Not in bookmarks' };
        console.log(`[CourseCorrection] Step 3 complete: ${sourceSchemeName || 'N/A'}`);

      } catch (error: any) {
        await this.updateStepStatus(correctionId, 'step_3_get_source_scheme', 'fail', error.message);
        await pool.query('UPDATE t_course_corrections SET status = $1 WHERE id = $2', ['failed', correctionId]);
        result.steps.step_3_get_source_scheme = { status: 'fail', message: error.message };
        result.error = error.message;
        result.failed_step = 3;
        return result;
      }

      // ========== STEP 4: Get Target Scheme Name ==========
      console.log(`[CourseCorrection] Step 4: Getting target scheme name...`);
      try {
        const targetSchemeQuery = `
          SELECT scheme_name FROM t_scheme_details
          WHERE scheme_code = $1 AND is_active = true
          LIMIT 1
        `;
        const targetResult = await pool.query(targetSchemeQuery, [request.target_scheme_code]);
        targetSchemeName = targetResult.rows[0]?.scheme_name || null;

        if (!targetSchemeName) {
          throw new Error(`Target scheme ${request.target_scheme_code} not found in master data`);
        }

        await pool.query(
          'UPDATE t_course_corrections SET target_scheme_name = $1, step_4_get_target_scheme = $2 WHERE id = $3',
          [targetSchemeName, 'pass', correctionId]
        );
        result.steps.step_4_get_target_scheme = { status: 'pass', message: targetSchemeName };
        console.log(`[CourseCorrection] Step 4 complete: ${targetSchemeName}`);

        // ========== STEP 4b: Validate NAV data exists for target scheme ==========
        console.log(`[CourseCorrection] Step 4b: Checking NAV data for target scheme...`);
        const navCheckQuery = `
          SELECT COUNT(*) as nav_count
          FROM t_nav_data
          WHERE scheme_code = $1
        `;
        const navCheckResult = await pool.query(navCheckQuery, [request.target_scheme_code]);
        const navCount = parseInt(navCheckResult.rows[0].nav_count);

        if (navCount === 0) {
          const navError = `No NAV data available for target scheme ${request.target_scheme_code}. Please download NAV data for this scheme first before proceeding with migration.`;
          await this.updateStepStatus(correctionId, 'step_4_get_target_scheme', 'fail', navError);
          await pool.query('UPDATE t_course_corrections SET status = $1, error_message = $2 WHERE id = $3', ['failed', navError, correctionId]);
          result.steps.step_4_get_target_scheme = { status: 'fail', message: navError };
          result.error = navError;
          result.failed_step = 4;
          return result;
        }
        console.log(`[CourseCorrection] Step 4b complete: ${navCount} NAV records found`);

      } catch (error: any) {
        await this.updateStepStatus(correctionId, 'step_4_get_target_scheme', 'fail', error.message);
        await pool.query('UPDATE t_course_corrections SET status = $1 WHERE id = $2', ['failed', correctionId]);
        result.steps.step_4_get_target_scheme = { status: 'fail', message: error.message };
        result.error = error.message;
        result.failed_step = 4;
        return result;
      }

      // ========== STEP 5: Count Transactions ==========
      console.log(`[CourseCorrection] Step 5: Counting transactions...`);
      try {
        const statsQuery = `
          SELECT COUNT(*) as txn_count, COALESCE(SUM(total_amount), 0) as total_invested
          FROM t_transaction_table
          WHERE customer_id = $1 AND scheme_code = $2 AND tenant_id = $3 AND is_live = $4
        `;
        const statsResult = await pool.query(statsQuery, [
          request.customer_id, request.source_scheme_code, tenantId, isLive
        ]);
        transactionCount = parseInt(statsResult.rows[0].txn_count);
        totalInvested = parseFloat(statsResult.rows[0].total_invested);

        if (transactionCount === 0) {
          throw new Error(`No transactions found for scheme ${request.source_scheme_code}`);
        }

        await pool.query(
          'UPDATE t_course_corrections SET transaction_count = $1, total_invested = $2, step_5_count_txns = $3 WHERE id = $4',
          [transactionCount, totalInvested, 'pass', correctionId]
        );
        result.steps.step_5_count_txns = { status: 'pass', message: `${transactionCount} transactions`, count: transactionCount };
        console.log(`[CourseCorrection] Step 5 complete: ${transactionCount} transactions`);

      } catch (error: any) {
        await this.updateStepStatus(correctionId, 'step_5_count_txns', 'fail', error.message);
        await pool.query('UPDATE t_course_corrections SET status = $1 WHERE id = $2', ['failed', correctionId]);
        result.steps.step_5_count_txns = { status: 'fail', message: error.message };
        result.error = error.message;
        result.failed_step = 5;
        return result;
      }

      // ========== STEP 6 & 7: Backup and Update Transactions (via DB function) ==========
      console.log(`[CourseCorrection] Steps 6-7: Executing backup and update...`);
      try {
        const executeQuery = `SELECT execute_course_correction_v2($1) as result`;
        const executeResult = await pool.query(executeQuery, [correctionId]);
        const dbResult = executeResult.rows[0].result;

        if (!dbResult.success) {
          const failedStep = dbResult.step || 6;
          result.steps.step_6_backup = { status: failedStep === 6 ? 'fail' : 'pass', message: failedStep === 6 ? dbResult.error : 'Completed' };
          result.steps.step_7_update_txns = { status: failedStep === 7 ? 'fail' : 'pending', message: failedStep === 7 ? dbResult.error : undefined };
          result.error = dbResult.error;
          result.failed_step = failedStep;
          await pool.query('UPDATE t_course_corrections SET status = $1 WHERE id = $2', ['failed', correctionId]);
          return result;
        }

        result.steps.step_6_backup = { status: 'pass', message: 'Transactions backed up' };
        result.steps.step_7_update_txns = {
          status: 'pass',
          message: `${dbResult.updated_transactions} transactions updated`,
          count: dbResult.updated_transactions
        };
        console.log(`[CourseCorrection] Steps 6-7 complete: ${dbResult.updated_transactions} updated`);

      } catch (error: any) {
        await this.updateStepStatus(correctionId, 'step_6_backup', 'fail', error.message);
        await pool.query('UPDATE t_course_corrections SET status = $1 WHERE id = $2', ['failed', correctionId]);
        result.steps.step_6_backup = { status: 'fail', message: error.message };
        result.error = error.message;
        result.failed_step = 6;
        return result;
      }

      // ========== STEP 8: Regenerate Snapshots ==========
      console.log(`[CourseCorrection] Step 8: Regenerating snapshots...`);
      try {
        const snapshotService = new PortfolioSnapshotService();
        const snapshotResult = await snapshotService.smartBackfill({
          tenant_id: tenantId,
          is_live: isLive,
          customer_ids: [request.customer_id]
        });

        if (snapshotResult.success) {
          await this.markSnapshotRegenerated(tenantId, isLive, correctionId);
          result.steps.step_8_snapshots = {
            status: 'pass',
            message: `${snapshotResult.snapshots_created + snapshotResult.snapshots_updated} snapshots regenerated`
          };
          console.log(`[CourseCorrection] Step 8 complete`);
        } else {
          await this.updateStepStatus(correctionId, 'step_8_snapshots', 'fail', 'Snapshot regeneration had errors');
          result.steps.step_8_snapshots = { status: 'fail', message: 'Snapshot regeneration had errors' };
        }

      } catch (snapshotError: any) {
        await this.updateStepStatus(correctionId, 'step_8_snapshots', 'fail', snapshotError.message);
        result.steps.step_8_snapshots = { status: 'fail', message: snapshotError.message };
        // Don't return early - migration is still successful, just snapshots failed
      }

      // ========== FINALIZE ==========
      // Check if all steps passed
      const allPassed =
        result.steps.step_1_check_existing.status === 'pass' &&
        result.steps.step_2_get_customer.status === 'pass' &&
        result.steps.step_3_get_source_scheme.status === 'pass' &&
        result.steps.step_4_get_target_scheme.status === 'pass' &&
        result.steps.step_5_count_txns.status === 'pass' &&
        result.steps.step_6_backup.status === 'pass' &&
        result.steps.step_7_update_txns.status === 'pass' &&
        result.steps.step_8_snapshots.status === 'pass';

      // Update final status - completed only if ALL steps pass
      await pool.query(
        'UPDATE t_course_corrections SET status = $1 WHERE id = $2',
        [allPassed ? 'completed' : 'failed', correctionId]
      );

      result.success = allPassed;
      result.summary = {
        customer_id: request.customer_id,
        customer_name: customerName,
        source_scheme_code: request.source_scheme_code,
        source_scheme_name: sourceSchemeName,
        target_scheme_code: request.target_scheme_code,
        target_scheme_name: targetSchemeName,
        transactions_updated: result.steps.step_7_update_txns.count || 0,
        total_invested: totalInvested
      };

      console.log(`[CourseCorrection] Migration ${allPassed ? 'completed successfully' : 'completed with errors'}`);
      return result;

    } catch (error: any) {
      console.error(`[CourseCorrection] Migration failed:`, error);
      if (correctionId) {
        await pool.query(
          'UPDATE t_course_corrections SET status = $1, error_message = $2 WHERE id = $3',
          ['failed', error.message, correctionId]
        );
      }
      result.error = error.message;
      return result;
    }
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
