// backend/src/services/dataCleanup.service.ts
// Service for tenant self-service data cleanup (hard delete)

import { Pool, PoolClient } from 'pg';
import { pool } from '../config/database';
import { SimpleLogger } from './simpleLogger.service';

export interface CleanupPreview {
  transactions: number;
  importSessions: number;
  importStagingRecords: number;
  fileUploads: number;
  portfolioEntries: number;
  monthlySnapshots: number;
  goals: number;
  goalAlerts: number;
  goalProgressSnapshots: number;
  goalInvestmentAllocations: number;
  jtbdExecutions: number;
  customerAssetAssignments: number;
  totalRecords: number;
}

export interface CleanupResult {
  success: boolean;
  deletedCounts: CleanupPreview;
  error?: string;
  durationMs: number;
}

export class DataCleanupService {
  private db: Pool;

  constructor() {
    this.db = pool;
  }

  /**
   * Get preview of all data that will be deleted for a tenant
   * This is called before cleanup to show the user what will be affected
   */
  async getCleanupPreview(
    tenantId: number,
    isLive: boolean
  ): Promise<CleanupPreview> {
    try {
      console.log(`[DataCleanupService] Getting cleanup preview for tenant ${tenantId}, isLive: ${isLive}`);

      const query = `
        SELECT
          (SELECT COUNT(*) FROM t_transaction_table WHERE tenant_id = $1 AND is_live = $2) as transactions,
          (SELECT COUNT(*) FROM t_import_sessions WHERE tenant_id = $1 AND is_live = $2) as import_sessions,
          (SELECT COUNT(*) FROM t_import_staging_data WHERE tenant_id = $1 AND is_live = $2) as import_staging_records,
          (SELECT COUNT(*) FROM t_file_uploads WHERE tenant_id = $1 AND is_live = $2) as file_uploads,
          (SELECT COUNT(*) FROM t_customer_master_portfolio WHERE tenant_id = $1 AND is_live = $2) as portfolio_entries,
          (SELECT COUNT(*) FROM t_monthly_portfolio_snapshots WHERE tenant_id = $1 AND is_live = $2) as monthly_snapshots,
          (SELECT COUNT(*) FROM t_jtbd_configurations WHERE tenant_id = $1 AND is_live = $2) as goals,
          (SELECT COUNT(*) FROM t_goal_alerts WHERE tenant_id = $1 AND is_live = $2) as goal_alerts,
          (SELECT COUNT(*) FROM t_goal_progress_snapshots WHERE tenant_id = $1 AND is_live = $2) as goal_progress_snapshots,
          (SELECT COUNT(*) FROM t_goal_investment_allocations WHERE tenant_id = $1 AND is_live = $2) as goal_investment_allocations,
          (SELECT COUNT(*) FROM t_jtbd_executions WHERE tenant_id = $1 AND is_live = $2) as jtbd_executions,
          (SELECT COUNT(*) FROM t_customer_asset_assignments WHERE tenant_id = $1 AND is_live = $2) as customer_asset_assignments
      `;

      const result = await this.db.query(query, [tenantId, isLive]);
      const row = result.rows[0];

      const preview: CleanupPreview = {
        transactions: parseInt(row.transactions) || 0,
        importSessions: parseInt(row.import_sessions) || 0,
        importStagingRecords: parseInt(row.import_staging_records) || 0,
        fileUploads: parseInt(row.file_uploads) || 0,
        portfolioEntries: parseInt(row.portfolio_entries) || 0,
        monthlySnapshots: parseInt(row.monthly_snapshots) || 0,
        goals: parseInt(row.goals) || 0,
        goalAlerts: parseInt(row.goal_alerts) || 0,
        goalProgressSnapshots: parseInt(row.goal_progress_snapshots) || 0,
        goalInvestmentAllocations: parseInt(row.goal_investment_allocations) || 0,
        jtbdExecutions: parseInt(row.jtbd_executions) || 0,
        customerAssetAssignments: parseInt(row.customer_asset_assignments) || 0,
        totalRecords: 0
      };

      // Calculate total
      preview.totalRecords =
        preview.transactions +
        preview.importSessions +
        preview.importStagingRecords +
        preview.fileUploads +
        preview.portfolioEntries +
        preview.monthlySnapshots +
        preview.goals +
        preview.goalAlerts +
        preview.goalProgressSnapshots +
        preview.goalInvestmentAllocations +
        preview.jtbdExecutions +
        preview.customerAssetAssignments;

      console.log(`[DataCleanupService] Preview complete: ${preview.totalRecords} total records`);

      return preview;

    } catch (error: any) {
      console.error('[DataCleanupService] Error getting cleanup preview:', error);
      SimpleLogger.error('DataCleanupService', 'Failed to get cleanup preview', 'getCleanupPreview', {
        tenantId, isLive, error: error.message
      }, undefined, tenantId, error.stack);
      throw error;
    }
  }

  /**
   * Execute full data cleanup for a tenant
   * HARD DELETE - This is permanent and cannot be undone
   *
   * Delete order respects FK constraints:
   * 1. Goal-related tables (children first)
   * 2. Asset assignments
   * 3. Snapshots
   * 4. Portfolio entries
   * 5. Transactions
   * 6. Import pipeline (staging → sessions → files)
   */
  async executeCleanup(
    tenantId: number,
    isLive: boolean,
    executedBy: number
  ): Promise<CleanupResult> {
    const startTime = Date.now();
    const client = await this.db.connect();

    const deletedCounts: CleanupPreview = {
      transactions: 0,
      importSessions: 0,
      importStagingRecords: 0,
      fileUploads: 0,
      portfolioEntries: 0,
      monthlySnapshots: 0,
      goals: 0,
      goalAlerts: 0,
      goalProgressSnapshots: 0,
      goalInvestmentAllocations: 0,
      jtbdExecutions: 0,
      customerAssetAssignments: 0,
      totalRecords: 0
    };

    try {
      console.log(`[DataCleanupService] Starting cleanup for tenant ${tenantId}, isLive: ${isLive}, executedBy: ${executedBy}`);

      await client.query('BEGIN');

      // Step 1: Goal Investment Allocations
      const goalAllocResult = await client.query(
        'DELETE FROM t_goal_investment_allocations WHERE tenant_id = $1 AND is_live = $2',
        [tenantId, isLive]
      );
      deletedCounts.goalInvestmentAllocations = goalAllocResult.rowCount || 0;
      console.log(`[DataCleanupService] Deleted ${deletedCounts.goalInvestmentAllocations} goal investment allocations`);

      // Step 2: Goal Progress Snapshots
      const goalProgressResult = await client.query(
        'DELETE FROM t_goal_progress_snapshots WHERE tenant_id = $1 AND is_live = $2',
        [tenantId, isLive]
      );
      deletedCounts.goalProgressSnapshots = goalProgressResult.rowCount || 0;
      console.log(`[DataCleanupService] Deleted ${deletedCounts.goalProgressSnapshots} goal progress snapshots`);

      // Step 3: Goal Alerts
      const goalAlertsResult = await client.query(
        'DELETE FROM t_goal_alerts WHERE tenant_id = $1 AND is_live = $2',
        [tenantId, isLive]
      );
      deletedCounts.goalAlerts = goalAlertsResult.rowCount || 0;
      console.log(`[DataCleanupService] Deleted ${deletedCounts.goalAlerts} goal alerts`);

      // Step 4: JTBD Executions
      const jtbdExecResult = await client.query(
        'DELETE FROM t_jtbd_executions WHERE tenant_id = $1 AND is_live = $2',
        [tenantId, isLive]
      );
      deletedCounts.jtbdExecutions = jtbdExecResult.rowCount || 0;
      console.log(`[DataCleanupService] Deleted ${deletedCounts.jtbdExecutions} JTBD executions`);

      // Step 5: JTBD Configurations (Goals)
      const goalsResult = await client.query(
        'DELETE FROM t_jtbd_configurations WHERE tenant_id = $1 AND is_live = $2',
        [tenantId, isLive]
      );
      deletedCounts.goals = goalsResult.rowCount || 0;
      console.log(`[DataCleanupService] Deleted ${deletedCounts.goals} goals/JTBD configurations`);

      // Step 6: Customer Asset Assignments
      const assetAssignResult = await client.query(
        'DELETE FROM t_customer_asset_assignments WHERE tenant_id = $1 AND is_live = $2',
        [tenantId, isLive]
      );
      deletedCounts.customerAssetAssignments = assetAssignResult.rowCount || 0;
      console.log(`[DataCleanupService] Deleted ${deletedCounts.customerAssetAssignments} customer asset assignments`);

      // Step 7: Monthly Portfolio Snapshots
      const snapshotsResult = await client.query(
        'DELETE FROM t_monthly_portfolio_snapshots WHERE tenant_id = $1 AND is_live = $2',
        [tenantId, isLive]
      );
      deletedCounts.monthlySnapshots = snapshotsResult.rowCount || 0;
      console.log(`[DataCleanupService] Deleted ${deletedCounts.monthlySnapshots} monthly snapshots`);

      // Step 8: Customer Master Portfolio
      const portfolioResult = await client.query(
        'DELETE FROM t_customer_master_portfolio WHERE tenant_id = $1 AND is_live = $2',
        [tenantId, isLive]
      );
      deletedCounts.portfolioEntries = portfolioResult.rowCount || 0;
      console.log(`[DataCleanupService] Deleted ${deletedCounts.portfolioEntries} portfolio entries`);

      // Step 9: Transactions
      const txnResult = await client.query(
        'DELETE FROM t_transaction_table WHERE tenant_id = $1 AND is_live = $2',
        [tenantId, isLive]
      );
      deletedCounts.transactions = txnResult.rowCount || 0;
      console.log(`[DataCleanupService] Deleted ${deletedCounts.transactions} transactions`);

      // Step 10: Import Staging Data
      const stagingResult = await client.query(
        'DELETE FROM t_import_staging_data WHERE tenant_id = $1 AND is_live = $2',
        [tenantId, isLive]
      );
      deletedCounts.importStagingRecords = stagingResult.rowCount || 0;
      console.log(`[DataCleanupService] Deleted ${deletedCounts.importStagingRecords} import staging records`);

      // Step 11: Import Sessions
      const sessionsResult = await client.query(
        'DELETE FROM t_import_sessions WHERE tenant_id = $1 AND is_live = $2',
        [tenantId, isLive]
      );
      deletedCounts.importSessions = sessionsResult.rowCount || 0;
      console.log(`[DataCleanupService] Deleted ${deletedCounts.importSessions} import sessions`);

      // Step 12: File Uploads
      const filesResult = await client.query(
        'DELETE FROM t_file_uploads WHERE tenant_id = $1 AND is_live = $2',
        [tenantId, isLive]
      );
      deletedCounts.fileUploads = filesResult.rowCount || 0;
      console.log(`[DataCleanupService] Deleted ${deletedCounts.fileUploads} file uploads`);

      // Calculate total
      deletedCounts.totalRecords =
        deletedCounts.transactions +
        deletedCounts.importSessions +
        deletedCounts.importStagingRecords +
        deletedCounts.fileUploads +
        deletedCounts.portfolioEntries +
        deletedCounts.monthlySnapshots +
        deletedCounts.goals +
        deletedCounts.goalAlerts +
        deletedCounts.goalProgressSnapshots +
        deletedCounts.goalInvestmentAllocations +
        deletedCounts.jtbdExecutions +
        deletedCounts.customerAssetAssignments;

      await client.query('COMMIT');

      const durationMs = Date.now() - startTime;

      console.log(`[DataCleanupService] Cleanup complete: ${deletedCounts.totalRecords} total records deleted in ${durationMs}ms`);

      // Log the cleanup action
      SimpleLogger.info('DataCleanupService', 'Data cleanup executed successfully', 'executeCleanup', {
        tenantId,
        isLive,
        executedBy,
        deletedCounts,
        durationMs
      }, executedBy, tenantId);

      return {
        success: true,
        deletedCounts,
        durationMs
      };

    } catch (error: any) {
      await client.query('ROLLBACK');
      const durationMs = Date.now() - startTime;

      console.error('[DataCleanupService] Cleanup failed, rolled back:', error);
      SimpleLogger.error('DataCleanupService', 'Data cleanup failed', 'executeCleanup', {
        tenantId, isLive, executedBy, error: error.message
      }, executedBy, tenantId, error.stack);

      return {
        success: false,
        deletedCounts,
        error: error.message,
        durationMs
      };

    } finally {
      client.release();
    }
  }
}
