// backend/src/services/portfolioSnapshot.service.ts
// Service for Portfolio Snapshot generation, backfill, and operations
// FIXED: Correct table/column names and proper fund manager calculations

import { Pool } from 'pg';
import { pool } from '../config/database';
import {
  SnapshotGenerationRequest,
  SnapshotGenerationResult,
  BackfillRequest,
  BackfillResult,
  PortfolioSnapshotData,
  SnapshotCustomerError,
  BackfillMonthError,
  DropAllSnapshotsResult,
  GenerateMissingResult,
  RegenerateAllResult
} from '../types/portfolioSnapshot.types';

interface CustomerInfo {
  customer_id: number;
  customer_name: string;
}

interface CustomerDateRange {
  firstTransactionDate: Date | null;
  lastTransactionDate: Date | null;
}

export class PortfolioSnapshotService {
  private db: Pool;

  constructor() {
    this.db = pool;
  }

  // ==================== MAIN GENERATION METHOD ====================

  /**
   * Generate portfolio snapshots for all active customers
   * This is the main method called by scheduled jobs
   */
  async generateSnapshots(request: SnapshotGenerationRequest): Promise<SnapshotGenerationResult> {
    const startTime = Date.now();
    const errors: SnapshotCustomerError[] = [];
    
    let customersProcessed = 0;
    let customersFailed = 0;
    let snapshotsCreated = 0;
    let snapshotsUpdated = 0;

    try {
      // Determine snapshot month end (default: last month)
      const snapshotMonthEnd = request.snapshot_month_end || this.getLastMonthEnd();

      console.log(`[SnapshotService] Generating snapshots for ${request.tenant_id} (${request.is_live ? 'live' : 'test'}) as of ${snapshotMonthEnd.toISOString()}`);

      // Get customers to process
      const customers = await this.getCustomersToProcess(
        request.tenant_id,
        request.is_live,
        request.customer_ids
      );

      console.log(`[SnapshotService] Processing ${customers.length} customers`);

      // Process each customer
      for (const customer of customers) {
        try {
          // Calculate snapshot data
          const snapshotData = await this.calculateSnapshotData(
            customer.customer_id,
            snapshotMonthEnd,
            request.tenant_id,
            request.is_live
          );

          // Check if snapshot already exists
          const existing = await this.getExistingSnapshot(
            customer.customer_id,
            snapshotMonthEnd,
            request.tenant_id,
            request.is_live
          );

          if (existing) {
            // Update existing snapshot
            await this.updateSnapshot(existing.id, snapshotData);
            snapshotsUpdated++;
          } else {
            // Create new snapshot
            await this.createSnapshot(snapshotData);
            snapshotsCreated++;
          }

          customersProcessed++;

        } catch (error: any) {
          console.error(`[SnapshotService] Error processing customer ${customer.customer_id}:`, error);
          customersFailed++;
          errors.push({
            customer_id: customer.customer_id,
            customer_name: customer.customer_name,
            error_message: error.message
          });
        }
      }

      const duration = Date.now() - startTime;

      console.log(`[SnapshotService] Generation complete: ${snapshotsCreated} created, ${snapshotsUpdated} updated in ${duration}ms`);

      return {
        success: true,
        snapshot_month_end: snapshotMonthEnd,
        customers_processed: customersProcessed,
        customers_failed: customersFailed,
        snapshots_created: snapshotsCreated,
        snapshots_updated: snapshotsUpdated,
        execution_duration_ms: duration,
        errors
      };

    } catch (error: any) {
      const duration = Date.now() - startTime;
      console.error('[SnapshotService] Error in generateSnapshots:', error);

      return {
        success: false,
        snapshot_month_end: request.snapshot_month_end || this.getLastMonthEnd(),
        customers_processed: customersProcessed,
        customers_failed: customersFailed,
        snapshots_created: snapshotsCreated,
        snapshots_updated: snapshotsUpdated,
        execution_duration_ms: duration,
        errors: [...errors, { customer_id: 0, error_message: error.message }]
      };
    }
  }

  // ==================== SMART BACKFILL METHOD ====================

  /**
   * Smart backfill - automatically detects missing months per customer
   * Generates snapshots from first transaction to last month
   */
  async smartBackfill(params: {
    tenant_id: number;
    is_live: boolean;
    customer_ids?: number[];
  }): Promise<BackfillResult> {
    const startTime = Date.now();
    const errors: BackfillMonthError[] = [];

    let customersProcessed = 0;
    let customersFailed = 0;
    let monthsProcessed = 0;
    let snapshotsCreated = 0;
    let snapshotsUpdated = 0;

    try {
      console.log(`[SnapshotService] Smart backfill: Processing tenant ${params.tenant_id}${params.customer_ids ? ` (${params.customer_ids.length} customers)` : ' (all customers)'}`);

      // Get customers to process
      const customers = await this.getCustomersToProcess(
        params.tenant_id,
        params.is_live,
        params.customer_ids
      );

      console.log(`[SnapshotService] Smart backfill: Found ${customers.length} customers to process`);

      // Process each customer
      for (const customer of customers) {
        try {
          // Get date range from customer's transactions
          const { firstTransactionDate, lastTransactionDate } = await this.getCustomerDateRange(
            customer.customer_id,
            params.tenant_id,
            params.is_live
          );

          if (!firstTransactionDate || !lastTransactionDate) {
            console.log(`[SnapshotService] No transactions for customer ${customer.customer_id}, skipping`);
            continue;
          }

          // Generate list of months from first transaction to last month
          const months = this.generateMonthList(firstTransactionDate, lastTransactionDate);
          console.log(`[SnapshotService] Customer ${customer.customer_id}: Processing ${months.length} months`);

          monthsProcessed += months.length;

          // Generate/update snapshot for each month
          for (const monthEnd of months) {
            try {
              // Calculate snapshot data
              const snapshotData = await this.calculateSnapshotData(
                customer.customer_id,
                monthEnd,
                params.tenant_id,
                params.is_live
              );

              // Check if snapshot already exists
              const existing = await this.getExistingSnapshot(
                customer.customer_id,
                monthEnd,
                params.tenant_id,
                params.is_live
              );

              if (existing) {
                // Update existing snapshot
                await this.updateSnapshot(existing.id, snapshotData);
                snapshotsUpdated++;
              } else {
                // Create new snapshot
                await this.createSnapshot(snapshotData);
                snapshotsCreated++;
              }

            } catch (error: any) {
              console.error(`[SnapshotService] Error processing month ${monthEnd.toISOString()} for customer ${customer.customer_id}:`, error);
              errors.push({
                month: monthEnd,
                customer_id: customer.customer_id,
                customer_name: customer.customer_name,
                error_message: error.message
              });
            }
          }

          customersProcessed++;

        } catch (error: any) {
          console.error(`[SnapshotService] Error processing customer ${customer.customer_id}:`, error);
          customersFailed++;
          errors.push({
            month: new Date(),
            customer_id: customer.customer_id,
            customer_name: customer.customer_name,
            error_message: error.message
          });
        }
      }

      const duration = Date.now() - startTime;
      const lastMonth = this.getLastMonthEnd();

      console.log(`[SnapshotService] Smart backfill complete: ${customersProcessed} customers, ${snapshotsCreated} created, ${snapshotsUpdated} updated in ${duration}ms`);

      return {
        success: true,
        snapshot_month_end: lastMonth,
        customers_processed: customersProcessed,
        customers_failed: customersFailed,
        months_processed: monthsProcessed,
        snapshots_created: snapshotsCreated,
        snapshots_updated: snapshotsUpdated,
        execution_duration_ms: duration,
        errors
      };

    } catch (error: any) {
      const duration = Date.now() - startTime;
      console.error('[SnapshotService] Error in smartBackfill:', error);

      return {
        success: false,
        snapshot_month_end: this.getLastMonthEnd(),
        customers_processed: customersProcessed,
        customers_failed: customersFailed,
        months_processed: monthsProcessed,
        snapshots_created: snapshotsCreated,
        snapshots_updated: snapshotsUpdated,
        execution_duration_ms: duration,
        errors: [...errors, { month: new Date(), error_message: error.message }]
      };
    }
  }

  // ==================== MANUAL BACKFILL METHOD ====================

  /**
   * Manual backfill with specific date range
   * Generates snapshots for specified months
   */
  async backfillSnapshots(request: BackfillRequest): Promise<BackfillResult> {
    const startTime = Date.now();
    const errors: BackfillMonthError[] = [];

    let customersProcessed = 0;
    let customersFailed = 0;
    let monthsProcessed = 0;
    let snapshotsCreated = 0;
    let snapshotsUpdated = 0;

    try {
      console.log(`[SnapshotService] Manual backfill: ${request.start_month.toISOString()} to ${request.end_month.toISOString()}`);

      // Get customers to process
      const customers = await this.getCustomersToProcess(
        request.tenant_id,
        request.is_live,
        request.customer_ids
      );

      // Generate month list
      const months = this.generateMonthList(request.start_month, request.end_month);
      console.log(`[SnapshotService] Processing ${customers.length} customers for ${months.length} months`);

      // Process each customer
      for (const customer of customers) {
        try {
          for (const monthEnd of months) {
            try {
              // Calculate snapshot data
              const snapshotData = await this.calculateSnapshotData(
                customer.customer_id,
                monthEnd,
                request.tenant_id,
                request.is_live
              );

              // Check if snapshot already exists
              const existing = await this.getExistingSnapshot(
                customer.customer_id,
                monthEnd,
                request.tenant_id,
                request.is_live
              );

              if (existing) {
                await this.updateSnapshot(existing.id, snapshotData);
                snapshotsUpdated++;
              } else {
                await this.createSnapshot(snapshotData);
                snapshotsCreated++;
              }

              monthsProcessed++;

            } catch (error: any) {
              console.error(`[SnapshotService] Error processing month ${monthEnd.toISOString()}:`, error);
              errors.push({
                month: monthEnd,
                customer_id: customer.customer_id,
                customer_name: customer.customer_name,
                error_message: error.message
              });
            }
          }

          customersProcessed++;

        } catch (error: any) {
          console.error(`[SnapshotService] Error processing customer ${customer.customer_id}:`, error);
          customersFailed++;
        }
      }

      const duration = Date.now() - startTime;

      return {
        success: true,
        snapshot_month_end: request.end_month,
        customers_processed: customersProcessed,
        customers_failed: customersFailed,
        months_processed: monthsProcessed,
        snapshots_created: snapshotsCreated,
        snapshots_updated: snapshotsUpdated,
        execution_duration_ms: duration,
        errors
      };

    } catch (error: any) {
      const duration = Date.now() - startTime;
      console.error('[SnapshotService] Error in backfillSnapshots:', error);

      return {
        success: false,
        snapshot_month_end: request.end_month,
        customers_processed: customersProcessed,
        customers_failed: customersFailed,
        months_processed: monthsProcessed,
        snapshots_created: snapshotsCreated,
        snapshots_updated: snapshotsUpdated,
        execution_duration_ms: duration,
        errors: [...errors, { month: new Date(), error_message: error.message }]
      };
    }
  }

  // ==================== NEW OPERATION METHODS ====================

  /**
   * Drop all snapshots for a tenant
   * DANGEROUS: Deletes all portfolio snapshot data
   */
  async dropAllSnapshots(params: {
    tenant_id: number;
    is_live: boolean;
    customer_ids?: number[];
  }): Promise<DropAllSnapshotsResult> {
    const startTime = Date.now();

    try {
      let query = `
        DELETE FROM t_monthly_portfolio_snapshots
        WHERE tenant_id = $1 AND is_live = $2
      `;
      
      const queryParams: any[] = [params.tenant_id, params.is_live];

      // Optional: Filter by specific customers
      if (params.customer_ids && params.customer_ids.length > 0) {
        query += ` AND customer_id = ANY($3)`;
        queryParams.push(params.customer_ids);
      }

      const result = await this.db.query(query, queryParams);
      const deletedCount = result.rowCount || 0;

      const duration = Date.now() - startTime;

      console.log(`[SnapshotService] Dropped ${deletedCount} snapshots for tenant ${params.tenant_id} in ${duration}ms`);

      return {
        success: true,
        deleted_count: deletedCount,
        execution_duration_ms: duration,
        message: deletedCount > 0 
          ? `Successfully deleted ${deletedCount} snapshot(s)` 
          : 'No snapshots found to delete'
      };

    } catch (error: any) {
      const duration = Date.now() - startTime;
      console.error('[SnapshotService] Error dropping snapshots:', error);
      
      return {
        success: false,
        deleted_count: 0,
        execution_duration_ms: duration,
        message: `Failed to drop snapshots: ${error.message}`
      };
    }
  }

  /**
   * Generate only missing snapshots (CREATE only, no UPDATE)
   * Safe: Only fills gaps, never overwrites existing data
   */
  async generateMissingSnapshots(params: {
    tenant_id: number;
    is_live: boolean;
    customer_ids?: number[];
  }): Promise<GenerateMissingResult> {
    const startTime = Date.now();
    const errors: any[] = [];

    let customersProcessed = 0;
    let customersFailed = 0;
    let snapshotsCreated = 0;
    let snapshotsSkipped = 0;
    let monthsProcessed = 0;

    try {
      // DETAILED LOGGING
      console.log('='.repeat(80));
      console.log(`[SnapshotService] GENERATE MISSING - START`);
      console.log(`[SnapshotService] Tenant: ${params.tenant_id}, IsLive: ${params.is_live}`);
      console.log(`[SnapshotService] Customer Filter: ${params.customer_ids ? params.customer_ids.join(',') : 'ALL'}`);
      console.log('='.repeat(80));

      // Get customers to process
      const customers = await this.getCustomersToProcess(params.tenant_id, params.is_live, params.customer_ids);
      
      console.log(`[SnapshotService] ✓ Found ${customers.length} active customers to process`);
      
      if (customers.length === 0) {
        console.log(`[SnapshotService] ⚠️  NO ACTIVE CUSTOMERS FOUND!`);
      }

      for (const customer of customers) {
        try {
          console.log(`\n[SnapshotService] Processing customer ${customer.customer_id} (${customer.customer_name})...`);
          
          const { firstTransactionDate, lastTransactionDate } = await this.getCustomerDateRange(
            customer.customer_id,
            params.tenant_id,
            params.is_live
          );

          console.log(`[SnapshotService]   - First Transaction: ${firstTransactionDate}`);
          console.log(`[SnapshotService]   - Last Transaction: ${lastTransactionDate}`);

          if (!firstTransactionDate || !lastTransactionDate) {
            console.log(`[SnapshotService]   ⚠️  No transactions with portfolio_flag=true for customer ${customer.customer_id}`);
            continue;
          }

          // Generate month list
          const months = this.generateMonthList(firstTransactionDate, lastTransactionDate);
          console.log(`[SnapshotService]   - Months to process: ${months.length}`);
          
          if (months.length === 0) {
            console.log(`[SnapshotService]   ⚠️  No months generated for customer ${customer.customer_id}`);
            continue;
          }

          monthsProcessed += months.length;

          for (const monthEnd of months) {
            // Check if snapshot already exists
            const existing = await this.getExistingSnapshot(customer.customer_id, monthEnd, params.tenant_id, params.is_live);

            if (existing) {
              console.log(`[SnapshotService]   - ${monthEnd.toISOString().split('T')[0]}: SKIPPED (exists)`);
              snapshotsSkipped++;
              continue;
            }

            console.log(`[SnapshotService]   - ${monthEnd.toISOString().split('T')[0]}: CREATING...`);

            // CREATE new snapshot
            const snapshotData = await this.calculateSnapshotData(
              customer.customer_id,
              monthEnd,
              params.tenant_id,
              params.is_live
            );

            console.log(`[SnapshotService]     → Invested: ${snapshotData.total_invested}, Value: ${snapshotData.current_value}, Schemes: ${snapshotData.total_schemes}`);

            await this.createSnapshot(snapshotData);
            snapshotsCreated++;
            console.log(`[SnapshotService]     ✓ Created`);
          }

          customersProcessed++;
          console.log(`[SnapshotService]   ✓ Customer ${customer.customer_id} complete`);

        } catch (error: any) {
          console.error(`[SnapshotService]   ✗ Error processing customer ${customer.customer_id}:`, error.message);
          customersFailed++;
          errors.push({
            customer_id: customer.customer_id,
            error: error.message
          });
        }
      }

      const duration = Date.now() - startTime;
      const lastMonth = this.getLastMonthEnd();

      console.log('='.repeat(80));
      console.log(`[SnapshotService] GENERATE MISSING - COMPLETE`);
      console.log(`[SnapshotService] Customers Processed: ${customersProcessed}`);
      console.log(`[SnapshotService] Snapshots Created: ${snapshotsCreated}`);
      console.log(`[SnapshotService] Snapshots Skipped: ${snapshotsSkipped}`);
      console.log(`[SnapshotService] Duration: ${duration}ms`);
      console.log('='.repeat(80));

      return {
        snapshot_month_end: lastMonth,
        customers_processed: customersProcessed,
        customers_failed: customersFailed,
        snapshots_created: snapshotsCreated,
        snapshots_skipped: snapshotsSkipped,
        months_processed: monthsProcessed,
        errors,
        execution_duration_ms: duration
      };

    } catch (error: any) {
      const duration = Date.now() - startTime;
      console.error('[SnapshotService] ✗ FATAL ERROR in generateMissingSnapshots:', error);
      
      return {
        snapshot_month_end: this.getLastMonthEnd(),
        customers_processed: customersProcessed,
        customers_failed: customersFailed,
        snapshots_created: snapshotsCreated,
        snapshots_skipped: snapshotsSkipped,
        months_processed: monthsProcessed,
        errors: [...errors, { error: error.message }],
        execution_duration_ms: duration
      };
    }
  }

  /**
   * Update all snapshots (CREATE + UPDATE)
   * This is the current smartBackfill behavior - kept for compatibility
   */
  async updateAllSnapshots(params: {
    tenant_id: number;
    is_live: boolean;
    customer_ids?: number[];
  }): Promise<BackfillResult> {
    // This is essentially the current smartBackfill logic
    return this.smartBackfill(params);
  }

  /**
   * Regenerate all snapshots (DROP + CREATE)
   * VERY DANGEROUS: Deletes all snapshots then rebuilds from scratch
   */
  async regenerateAllSnapshots(params: {
    tenant_id: number;
    is_live: boolean;
    customer_ids?: number[];
  }): Promise<RegenerateAllResult> {
    const startTime = Date.now();
    const errors: any[] = [];

    try {
      // Step 1: Drop all snapshots
      console.log(`[SnapshotService] Regenerate: Dropping all snapshots for tenant ${params.tenant_id}`);
      
      const dropResult = await this.dropAllSnapshots(params);
      
      if (!dropResult.success) {
        throw new Error(`Failed to drop snapshots: ${dropResult.message}`);
      }

      console.log(`[SnapshotService] Regenerate: Dropped ${dropResult.deleted_count} snapshots`);

      // Step 2: Generate all snapshots fresh (CREATE only, no UPDATE since we just dropped all)
      console.log(`[SnapshotService] Regenerate: Creating fresh snapshots`);
      
      const generateResult = await this.generateMissingSnapshots(params);

      const duration = Date.now() - startTime;

      console.log(`[SnapshotService] Regenerate completed: ${generateResult.snapshots_created} created in ${duration}ms`);

      return {
        snapshot_month_end: generateResult.snapshot_month_end,
        customers_processed: generateResult.customers_processed,
        customers_failed: generateResult.customers_failed,
        snapshots_created: generateResult.snapshots_created,
        snapshots_deleted: dropResult.deleted_count,
        months_processed: generateResult.months_processed,
        errors: [...errors, ...generateResult.errors],
        execution_duration_ms: duration
      };

    } catch (error: any) {
      const duration = Date.now() - startTime;
      console.error('[SnapshotService] Error in regenerateAllSnapshots:', error);
      
      return {
        snapshot_month_end: this.getLastMonthEnd(),
        customers_processed: 0,
        customers_failed: 0,
        snapshots_created: 0,
        snapshots_deleted: 0,
        months_processed: 0,
        errors: [...errors, { error: error.message }],
        execution_duration_ms: duration
      };
    }
  }

  // ==================== CALCULATION & DATA METHODS ====================

  /**
   * Calculate snapshot data for a customer as of a specific date
   * FIXED: Proper fund manager calculation with NET invested amount
   * FIXED: Correct table/column names (nav_value, nav_date, m_transaction_types)
   */
  private async calculateSnapshotData(
    customerId: number,
    asOfDate: Date,
    tenantId: number,
    isLive: boolean
  ): Promise<PortfolioSnapshotData> {
    // Query to calculate portfolio totals as of the snapshot date
    const query = `
      WITH customer_transactions AS (
        SELECT 
          t.scheme_code,
          -- Calculate units by transaction type
          SUM(CASE 
            WHEN tt.txn_type = 'Addition' THEN t.units 
            ELSE 0 
          END) as total_units_purchased,
          SUM(CASE 
            WHEN tt.txn_type = 'Deduction' THEN t.units 
            ELSE 0 
          END) as total_units_redeemed,
          -- Calculate invested amount (purchases)
          SUM(CASE 
            WHEN tt.txn_type = 'Addition' THEN t.total_amount 
            ELSE 0 
          END) as total_invested,
          -- Calculate redemption proceeds (sales)
          SUM(CASE 
            WHEN tt.txn_type = 'Deduction' THEN t.total_amount 
            ELSE 0 
          END) as total_redemption_proceeds
        FROM t_transaction_table t
        INNER JOIN m_transaction_types tt ON t.txn_type_id = tt.id
        WHERE t.customer_id = $1
          AND t.tenant_id = $2
          AND t.is_live = $3
          AND t.txn_date <= $4
          AND t.portfolio_flag = true
        GROUP BY t.scheme_code
        HAVING (SUM(CASE WHEN tt.txn_type = 'Addition' THEN t.units ELSE 0 END) - 
                SUM(CASE WHEN tt.txn_type = 'Deduction' THEN t.units ELSE 0 END)) > 0.001
      ),
      scheme_navs AS (
        SELECT DISTINCT ON (n.scheme_code)
          n.scheme_code,
          n.nav_value
        FROM t_nav_data n
        WHERE n.nav_date <= $4
          AND n.is_live = $3
        ORDER BY n.scheme_code, n.nav_date DESC
      )
      SELECT 
        COALESCE(SUM(ct.total_invested), 0) as total_invested,
        COALESCE(SUM(ct.total_redemption_proceeds), 0) as total_redemption_proceeds,
        COALESCE(SUM((ct.total_units_purchased - ct.total_units_redeemed) * sn.nav_value), 0) as current_value,
        COUNT(DISTINCT ct.scheme_code) as total_schemes,
        COALESCE(SUM(ct.total_units_purchased - ct.total_units_redeemed), 0) as total_units
      FROM customer_transactions ct
      LEFT JOIN scheme_navs sn ON sn.scheme_code = ct.scheme_code
    `;

    const result = await this.db.query(query, [customerId, tenantId, isLive, asOfDate]);
    
    if (result.rows.length === 0) {
      throw new Error(`No data found for customer ${customerId}`);
    }

    const row = result.rows[0];
    
    // CORRECTED FUND MANAGER CALCULATION
    const totalInvested = parseFloat(row.total_invested) || 0;
    const totalRedemptionProceeds = parseFloat(row.total_redemption_proceeds) || 0;
    const netInvested = totalInvested - totalRedemptionProceeds; // Net amount still invested
    const currentValue = parseFloat(row.current_value) || 0;
    const totalReturns = currentValue - netInvested; // Returns on NET invested amount
    const returnPercentage = netInvested > 0 ? (totalReturns / netInvested) * 100 : 0;

    return {
      customer_id: customerId,
      snapshot_month_end: asOfDate,
      total_invested: netInvested, // Store NET invested amount
      current_value: currentValue,
      total_returns: totalReturns,
      return_percentage: returnPercentage,
      total_units: parseFloat(row.total_units) || 0,
      total_schemes: parseInt(row.total_schemes) || 0
    };
  }

  /**
   * Create a new snapshot record
   * FIXED: Using tenant_id and is_live from customer table via id column
   */
  private async createSnapshot(data: PortfolioSnapshotData): Promise<void> {
    const query = `
      INSERT INTO t_monthly_portfolio_snapshots (
        customer_id,
        snapshot_month_end,
        total_invested,
        current_value,
        total_returns,
        return_percentage,
        total_units,
        total_schemes,
        tenant_id,
        is_live,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 
        (SELECT tenant_id FROM t_customers WHERE id = $1),
        (SELECT is_live FROM t_customers WHERE id = $1),
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `;

    await this.db.query(query, [
      data.customer_id,
      data.snapshot_month_end,
      data.total_invested,
      data.current_value,
      data.total_returns,
      data.return_percentage,
      data.total_units,
      data.total_schemes
    ]);
  }

  /**
   * Update an existing snapshot record
   */
  private async updateSnapshot(snapshotId: number, data: PortfolioSnapshotData): Promise<void> {
    const query = `
      UPDATE t_monthly_portfolio_snapshots
      SET 
        total_invested = $1,
        current_value = $2,
        total_returns = $3,
        return_percentage = $4,
        total_units = $5,
        total_schemes = $6,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $7
    `;

    await this.db.query(query, [
      data.total_invested,
      data.current_value,
      data.total_returns,
      data.return_percentage,
      data.total_units,
      data.total_schemes,
      snapshotId
    ]);
  }

  /**
   * Check if a snapshot already exists
   */
  private async getExistingSnapshot(
    customerId: number,
    monthEnd: Date,
    tenantId: number,
    isLive: boolean
  ): Promise<any | null> {
    const query = `
      SELECT id, snapshot_month_end, created_at
      FROM t_monthly_portfolio_snapshots
      WHERE customer_id = $1 
        AND snapshot_month_end = $2
        AND tenant_id = $3
        AND is_live = $4
    `;

    const result = await this.db.query(query, [customerId, monthEnd, tenantId, isLive]);
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  // ==================== HELPER METHODS ====================

  /**
   * Get list of customers to process
   * FIXED: Changed to use id (not customer_id) and JOIN with t_contacts for name
   */
  private async getCustomersToProcess(
    tenantId: number,
    isLive: boolean,
    customerIds?: number[]
  ): Promise<CustomerInfo[]> {
    let query = `
      SELECT 
        cu.id as customer_id, 
        c.name as customer_name
      FROM t_customers cu
      INNER JOIN t_contacts c ON cu.contact_id = c.id
      WHERE cu.tenant_id = $1 
        AND cu.is_live = $2 
        AND cu.is_active = true
    `;

    const params: any[] = [tenantId, isLive];

    if (customerIds && customerIds.length > 0) {
      query += ` AND cu.id = ANY($3)`;
      params.push(customerIds);
    }

    query += ` ORDER BY cu.id`;

    console.log('🔍 GET CUSTOMERS TO PROCESS:');
    console.log('   Query:', query);
    console.log('   Params:', params);

    const result = await this.db.query(query, params);
    
    console.log('   Result Count:', result.rows.length);
    if (result.rows.length === 0) {
      console.log('   ⚠️  NO CUSTOMERS FOUND!');
      console.log('   Run this to verify: SELECT cu.id, c.name, cu.is_active FROM t_customers cu JOIN t_contacts c ON cu.contact_id = c.id WHERE cu.tenant_id = ' + tenantId + ' AND cu.is_live = ' + isLive);
    } else {
      console.log('   ✓ Found customers:', result.rows.map(r => `${r.customer_id}:${r.customer_name}`).join(', '));
    }

    return result.rows;
  }

  /**
   * Get date range from customer's first and last transactions
   * FIXED: Changed to t_transaction_table, txn_date, and portfolio_flag
   */
  private async getCustomerDateRange(
    customerId: number,
    tenantId: number,
    isLive: boolean
  ): Promise<CustomerDateRange> {
    const query = `
      SELECT 
        MIN(txn_date) as first_transaction_date,
        MAX(txn_date) as last_transaction_date
      FROM t_transaction_table
      WHERE customer_id = $1
        AND tenant_id = $2
        AND is_live = $3
        AND portfolio_flag = true
    `;

    const result = await this.db.query(query, [customerId, tenantId, isLive]);

    if (result.rows.length === 0) {
      return { firstTransactionDate: null, lastTransactionDate: null };
    }

    return {
      firstTransactionDate: result.rows[0].first_transaction_date,
      lastTransactionDate: result.rows[0].last_transaction_date
    };
  }

  /**
   * Generate list of month-end dates from start to end date
   */
  private generateMonthList(startDate: Date, endDate: Date): Date[] {
    const months: Date[] = [];
    
    // Get end of last month (we don't generate for current month)
    const lastMonth = this.getLastMonthEnd();
    
    // Adjust end date to not go beyond last month
    const effectiveEndDate = endDate > lastMonth ? lastMonth : endDate;

    let current = new Date(startDate);
    // Move to end of the month
    current = new Date(current.getFullYear(), current.getMonth() + 1, 0);

    while (current <= effectiveEndDate) {
      months.push(new Date(current));
      
      // Move to next month end
      current = new Date(current.getFullYear(), current.getMonth() + 2, 0);
    }

    return months;
  }

  /**
   * Get last month end date (for use as snapshot_month_end default)
   */
  private getLastMonthEnd(): Date {
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    return lastMonth;
  }
}