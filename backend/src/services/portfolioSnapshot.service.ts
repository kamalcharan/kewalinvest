// backend/src/services/portfolioSnapshot.service.ts
// Service for generating and managing portfolio snapshots

import { Pool } from 'pg';
import { pool } from '../config/database';
import {
  SnapshotGenerationRequest,
  SnapshotGenerationResult,
  PortfolioSnapshotData,
  PortfolioCalculationInput,
  SnapshotCustomerError,
  BackfillRequest,
  BackfillResult,
  BackfillMonthError
} from '../types/portfolioSnapshot.types';

export class PortfolioSnapshotService {
  private db: Pool;

  constructor() {
    this.db = pool;
  }

  /**
   * Generate portfolio snapshots for all customers in a tenant
   * Snapshots are created for the end of the previous month
   */
  async generateSnapshots(request: SnapshotGenerationRequest): Promise<SnapshotGenerationResult> {
    const startTime = Date.now();
    const errors: SnapshotCustomerError[] = [];

    let customersProcessed = 0;
    let customersFailed = 0;
    let snapshotsCreated = 0;
    let snapshotsUpdated = 0;

    try {
      // Determine snapshot date (end of previous month if not specified)
      const snapshotDate = request.snapshot_month_end || this.getEndOfPreviousMonth();

      console.log(`[SnapshotService] Starting snapshot generation for tenant ${request.tenant_id}, month-end: ${snapshotDate.toISOString().split('T')[0]}`);

      // Get all active customers for this tenant (or specific customers if requested)
      const customers = await this.getActiveCustomers(request.tenant_id, request.is_live, request.customer_ids);

      console.log(`[SnapshotService] Found ${customers.length} active customers`);

      // Process each customer
      for (const customer of customers) {
        try {
          const snapshotData = await this.calculatePortfolioValue({
            customer_id: customer.id,
            tenant_id: request.tenant_id,
            is_live: request.is_live,
            as_of_date: snapshotDate
          });

          // Save snapshot to database
          const isUpdate = await this.saveSnapshot(snapshotData);

          if (isUpdate) {
            snapshotsUpdated++;
          } else {
            snapshotsCreated++;
          }

          customersProcessed++;

        } catch (error: any) {
          customersFailed++;
          errors.push({
            customer_id: customer.id,
            customer_name: customer.name,
            error_message: error.message,
            error_code: error.code
          });

          console.error(`[SnapshotService] Failed to generate snapshot for customer ${customer.id}:`, error.message);
        }
      }

      const duration = Date.now() - startTime;

      console.log(`[SnapshotService] Snapshot generation complete. Processed: ${customersProcessed}, Failed: ${customersFailed}, Created: ${snapshotsCreated}, Updated: ${snapshotsUpdated}, Duration: ${duration}ms`);

      return {
        success: customersFailed === 0,
        snapshot_month_end: snapshotDate,
        customers_processed: customersProcessed,
        customers_failed: customersFailed,
        snapshots_created: snapshotsCreated,
        snapshots_updated: snapshotsUpdated,
        execution_duration_ms: duration,
        errors
      };

    } catch (error: any) {
      console.error('[SnapshotService] Fatal error during snapshot generation:', error);
      throw new Error(`Snapshot generation failed: ${error.message}`);
    }
  }

  /**
   * Calculate portfolio value for a specific customer as of a specific date
   */
  private async calculatePortfolioValue(input: PortfolioCalculationInput): Promise<PortfolioSnapshotData> {
    const { customer_id, tenant_id, is_live, as_of_date } = input;

    // Query to calculate portfolio metrics as of the snapshot date
    // CRITICAL FIX: Both scheme_id and scheme_code are NULL in t_transaction_table!
    // Solution: JOIN to t_scheme_details on scheme_name (case-insensitive), then to t_nav_data on scheme_id
    const query = `
      WITH transactions_up_to_date AS (
        SELECT
          t.scheme_name,
          sd.id as scheme_id,
          SUM(CASE WHEN t.txn_type_id IN (
            SELECT id FROM m_transaction_types WHERE txn_type = 'purchase'
          ) THEN t.units ELSE 0 END) as total_units_purchased,
          SUM(CASE WHEN t.txn_type_id IN (
            SELECT id FROM m_transaction_types WHERE txn_type = 'redemption'
          ) THEN t.units ELSE 0 END) as total_units_redeemed,
          SUM(CASE WHEN t.txn_type_id IN (
            SELECT id FROM m_transaction_types WHERE txn_type = 'purchase'
          ) THEN t.total_amount ELSE 0 END) as total_invested
        FROM t_transaction_table t
        LEFT JOIN t_scheme_details sd ON TRIM(UPPER(t.scheme_name)) = TRIM(UPPER(sd.scheme_name))
          AND sd.is_live = $3
        WHERE t.customer_id = $1
          AND t.tenant_id = $2
          AND t.is_live = $3
          AND t.txn_date <= $4
        GROUP BY t.scheme_name, sd.id
        HAVING sd.id IS NOT NULL  -- Only include schemes that matched
      ),
      portfolio_with_nav AS (
        SELECT
          t.*,
          (t.total_units_purchased - t.total_units_redeemed) as net_units,
          COALESCE(
            (SELECT n.nav_value
             FROM t_nav_data n
             WHERE n.scheme_id = t.scheme_id
               AND n.is_live = $3
               AND n.nav_date <= $4
             ORDER BY n.nav_date DESC
             LIMIT 1
            ), 0
          ) as latest_nav
        FROM transactions_up_to_date t
        WHERE (t.total_units_purchased - t.total_units_redeemed) > 0.001  -- Only schemes with positive units
      )
      SELECT
        COUNT(*) as total_schemes,
        SUM(total_invested) as total_invested,
        SUM(net_units) as total_units,
        SUM(net_units * latest_nav) as current_value
      FROM portfolio_with_nav
    `;

    const result = await this.db.query(query, [customer_id, tenant_id, is_live, as_of_date]);
    const row = result.rows[0];

    const totalInvested = parseFloat(row.total_invested) || 0;
    const currentValue = parseFloat(row.current_value) || 0;
    const totalReturns = currentValue - totalInvested;
    const returnPercentage = totalInvested > 0 ? (totalReturns / totalInvested) * 100 : 0;

    return {
      customer_id,
      snapshot_month_end: as_of_date,
      total_invested: totalInvested,
      current_value: currentValue,
      total_returns: totalReturns,
      return_percentage: returnPercentage,
      total_units: parseFloat(row.total_units) || 0,
      total_schemes: parseInt(row.total_schemes) || 0
    };
  }

  /**
   * Save snapshot to database (INSERT or UPDATE if exists)
   */
  private async saveSnapshot(snapshot: PortfolioSnapshotData): Promise<boolean> {
    // First, get tenant_id and is_live from customer record
    const customerQuery = `
      SELECT c.tenant_id, c.is_live
      FROM t_customers c
      WHERE c.id = $1
    `;

    const customerResult = await this.db.query(customerQuery, [snapshot.customer_id]);

    if (customerResult.rows.length === 0) {
      throw new Error(`Customer ${snapshot.customer_id} not found`);
    }

    const { tenant_id, is_live } = customerResult.rows[0];

    // Check if snapshot already exists
    const checkQuery = `
      SELECT id FROM t_monthly_portfolio_snapshots
      WHERE tenant_id = $1
        AND is_live = $2
        AND customer_id = $3
        AND snapshot_month_end = $4
    `;

    const existingSnapshot = await this.db.query(checkQuery, [
      tenant_id,
      is_live,
      snapshot.customer_id,
      snapshot.snapshot_month_end
    ]);

    if (existingSnapshot.rows.length > 0) {
      // UPDATE existing snapshot
      const updateQuery = `
        UPDATE t_monthly_portfolio_snapshots
        SET
          total_invested = $1,
          current_value = $2,
          total_returns = $3,
          return_percentage = $4,
          total_units = $5,
          total_schemes = $6,
          updated_at = CURRENT_TIMESTAMP
        WHERE tenant_id = $7
          AND is_live = $8
          AND customer_id = $9
          AND snapshot_month_end = $10
      `;

      await this.db.query(updateQuery, [
        snapshot.total_invested,
        snapshot.current_value,
        snapshot.total_returns,
        snapshot.return_percentage,
        snapshot.total_units,
        snapshot.total_schemes,
        tenant_id,
        is_live,
        snapshot.customer_id,
        snapshot.snapshot_month_end
      ]);

      return true; // Updated
    } else {
      // INSERT new snapshot
      const insertQuery = `
        INSERT INTO t_monthly_portfolio_snapshots (
          tenant_id,
          is_live,
          customer_id,
          snapshot_month_end,
          total_invested,
          current_value,
          total_returns,
          return_percentage,
          total_units,
          total_schemes,
          created_at,
          updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `;

      await this.db.query(insertQuery, [
        tenant_id,
        is_live,
        snapshot.customer_id,
        snapshot.snapshot_month_end,
        snapshot.total_invested,
        snapshot.current_value,
        snapshot.total_returns,
        snapshot.return_percentage,
        snapshot.total_units,
        snapshot.total_schemes
      ]);

      return false; // Inserted
    }
  }

  /**
   * Get all active customers for a tenant (optionally filtered by customer IDs)
   */
  private async getActiveCustomers(
    tenantId: number,
    isLive: boolean,
    customerIds?: number[]
  ): Promise<Array<{ id: number; name: string }>> {
    console.log(`[SnapshotService] getActiveCustomers - tenantId: ${tenantId}, is_live: ${isLive}, filter: ${customerIds ? customerIds.length + ' specific customers' : 'all customers'}`);

    let query = `
      SELECT c.id, ct.name
      FROM t_customers c
      JOIN t_contacts ct ON c.contact_id = ct.id
      WHERE c.tenant_id = $1
        AND c.is_live = $2
        AND c.is_active = true
    `;

    const params: any[] = [tenantId, isLive];

    // Add customer ID filter if provided
    if (customerIds && customerIds.length > 0) {
      query += ` AND c.id = ANY($3)`;
      params.push(customerIds);
    }

    query += ` ORDER BY c.id`;

    const result = await this.db.query(query, params);
    console.log(`[SnapshotService] getActiveCustomers - Found ${result.rows.length} customers`);

    // If no customers found, log diagnostic info
    if (result.rows.length === 0) {
      console.warn(`[SnapshotService] WARNING: No customers found for tenant ${tenantId}, is_live=${isLive}. Check if customers exist in correct environment.`);

      // Query to show what customers DO exist
      const diagnosticQuery = `
        SELECT
          COUNT(*) as total_customers,
          COUNT(*) FILTER (WHERE is_live = true) as live_count,
          COUNT(*) FILTER (WHERE is_live = false) as test_count,
          COUNT(*) FILTER (WHERE is_active = true) as active_count,
          COUNT(*) FILTER (WHERE is_active = false) as inactive_count
        FROM t_customers
        WHERE tenant_id = $1
      `;
      const diagnosticResult = await this.db.query(diagnosticQuery, [tenantId]);
      console.warn(`[SnapshotService] DIAGNOSTIC: Tenant ${tenantId} has:`, diagnosticResult.rows[0]);
    }

    return result.rows;
  }

  /**
   * Get end of previous month date
   */
  private getEndOfPreviousMonth(): Date {
    const now = new Date();
    const lastDayOfPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    return lastDayOfPrevMonth;
  }

  /**
   * Smart backfill - automatically detects missing months for each customer
   * and generates snapshots from first transaction to previous month
   */
  async smartBackfill(request: { tenant_id: number; is_live: boolean; customer_ids?: number[] }): Promise<BackfillResult> {
    const startTime = Date.now();
    const errors: BackfillMonthError[] = [];
    let totalSnapshotsCreated = 0;
    let totalSnapshotsUpdated = 0;
    let customersProcessed = 0;
    let customersFailed = 0;
    const monthsProcessedSet = new Set<string>();
    const customersWithErrors = new Set<number>();
    let lastMonthProcessed: Date | null = null;

    try {
      // Get customers to process
      const customers = await this.getActiveCustomers(request.tenant_id, request.is_live, request.customer_ids);

      const customerInfo = request.customer_ids
        ? `${request.customer_ids.length} customer(s)`
        : `all ${customers.length} customers`;

      console.log(`[SnapshotService] Starting smart backfill for ${customerInfo}`);

      // Process each customer
      for (const customer of customers) {
        let customerHadError = false;
        let customerSuccessful = false;

        try {
          // Get missing months for this customer
          const missingMonths = await this.getMissingMonths(customer.id, request.tenant_id, request.is_live);

          if (missingMonths.length === 0) {
            console.log(`[SnapshotService] Customer ${customer.id} (${customer.name}) - No missing snapshots`);
            customersProcessed++;
            continue;
          }

          console.log(`[SnapshotService] Customer ${customer.id} (${customer.name}) - Generating ${missingMonths.length} missing snapshots`);

          // Generate snapshots for missing months
          for (const monthEnd of missingMonths) {
            try {
              const snapshotData = await this.calculatePortfolioValue({
                customer_id: customer.id,
                tenant_id: request.tenant_id,
                is_live: request.is_live,
                as_of_date: monthEnd
              });

              // Save snapshot
              const isUpdate = await this.saveSnapshot(snapshotData);

              if (isUpdate) {
                totalSnapshotsUpdated++;
              } else {
                totalSnapshotsCreated++;
              }

              // Track unique months processed
              monthsProcessedSet.add(monthEnd.toISOString().slice(0, 7));
              lastMonthProcessed = monthEnd;
              customerSuccessful = true;

            } catch (error: any) {
              customerHadError = true;
              customersWithErrors.add(customer.id);
              errors.push({
                month: monthEnd,
                customer_id: customer.id,
                customer_name: customer.name,
                error_message: error.message
              });
              console.error(`[SnapshotService] Failed to generate snapshot for customer ${customer.id}, month ${monthEnd.toISOString().slice(0, 7)}:`, error.message);
            }
          }

          if (customerSuccessful) {
            customersProcessed++;
          }

        } catch (error: any) {
          customerHadError = true;
          customersWithErrors.add(customer.id);
          errors.push({
            month: new Date(),
            customer_id: customer.id,
            customer_name: customer.name,
            error_message: `Failed to process customer: ${error.message}`
          });
          console.error(`[SnapshotService] Failed to process customer ${customer.id}:`, error.message);
        }
      }

      customersFailed = customersWithErrors.size;
      const duration = Date.now() - startTime;
      const monthsProcessed = monthsProcessedSet.size;

      console.log(`[SnapshotService] Smart backfill complete. Customers: ${customersProcessed}/${customers.length}, Failed: ${customersFailed}, Unique months: ${monthsProcessed}, Created: ${totalSnapshotsCreated}, Updated: ${totalSnapshotsUpdated}, Duration: ${duration}ms`);

      return {
        success: errors.length === 0,
        snapshot_month_end: lastMonthProcessed || this.getEndOfPreviousMonth(),
        customers_processed: customersProcessed,
        customers_failed: customersFailed,
        months_processed: monthsProcessed,
        snapshots_created: totalSnapshotsCreated,
        snapshots_updated: totalSnapshotsUpdated,
        execution_duration_ms: duration,
        errors
      };

    } catch (error: any) {
      console.error('[SnapshotService] Fatal error during smart backfill:', error);
      throw new Error(`Smart backfill failed: ${error.message}`);
    }
  }

  /**
   * Backfill historical snapshots for multiple months (manual date range)
   */
  async backfillSnapshots(request: BackfillRequest): Promise<BackfillResult> {
    const startTime = Date.now();
    const errors: BackfillMonthError[] = [];
    let monthsProcessed = 0;
    let totalSnapshotsCreated = 0;
    let totalSnapshotsUpdated = 0;

    try {
      const customerInfo = request.customer_ids
        ? `for ${request.customer_ids.length} customer(s)`
        : 'for all customers';

      console.log(`[SnapshotService] Starting backfill ${customerInfo} from ${request.start_month.toISOString().split('T')[0]} to ${request.end_month.toISOString().split('T')[0]}`);

      // Generate list of month-end dates between start and end
      const monthEnds = this.generateMonthEndDates(request.start_month, request.end_month);

      for (const monthEnd of monthEnds) {
        try {
          const result = await this.generateSnapshots({
            tenant_id: request.tenant_id,
            is_live: request.is_live,
            snapshot_month_end: monthEnd,
            trigger_source: 'manual',
            customer_ids: request.customer_ids  // Pass customer filter
          });

          totalSnapshotsCreated += result.snapshots_created;
          totalSnapshotsUpdated += result.snapshots_updated;
          monthsProcessed++;

          // Collect errors from this month
          result.errors.forEach(err => {
            errors.push({
              month: monthEnd,
              customer_id: err.customer_id,
              error_message: err.error_message
            });
          });

        } catch (error: any) {
          errors.push({
            month: monthEnd,
            error_message: error.message
          });
        }
      }

      const duration = Date.now() - startTime;

      console.log(`[SnapshotService] Backfill complete. Months: ${monthsProcessed}, Created: ${totalSnapshotsCreated}, Updated: ${totalSnapshotsUpdated}, Duration: ${duration}ms`);

      return {
        success: errors.length === 0,
        snapshot_month_end: monthEnds.length > 0 ? monthEnds[monthEnds.length - 1] : undefined,
        customers_processed: 0, // Not tracked in manual backfill
        customers_failed: 0,
        months_processed: monthsProcessed,
        snapshots_created: totalSnapshotsCreated,
        snapshots_updated: totalSnapshotsUpdated,
        execution_duration_ms: duration,
        errors
      };

    } catch (error: any) {
      console.error('[SnapshotService] Fatal error during backfill:', error);
      throw new Error(`Backfill failed: ${error.message}`);
    }
  }

  /**
   * Generate array of month-end dates between start and end
   */
  private generateMonthEndDates(start: Date, end: Date): Date[] {
    const dates: Date[] = [];
    const current = new Date(start.getFullYear(), start.getMonth() + 1, 0); // End of start month

    while (current <= end) {
      dates.push(new Date(current));
      // Move to end of next month
      current.setMonth(current.getMonth() + 2);
      current.setDate(0);
    }

    return dates;
  }

  /**
   * Check if snapshot exists for a specific month and customer
   */
  async snapshotExists(customerId: number, tenantId: number, isLive: boolean, monthEnd: Date): Promise<boolean> {
    const query = `
      SELECT 1
      FROM t_monthly_portfolio_snapshots
      WHERE customer_id = $1
        AND tenant_id = $2
        AND is_live = $3
        AND snapshot_month_end = $4
      LIMIT 1
    `;

    const result = await this.db.query(query, [customerId, tenantId, isLive, monthEnd]);
    return result.rows.length > 0;
  }

  /**
   * Get missing snapshot months for a customer
   */
  async getMissingMonths(customerId: number, tenantId: number, isLive: boolean): Promise<Date[]> {
    // Get first transaction date
    const firstTxnQuery = `
      SELECT MIN(txn_date) as first_date
      FROM t_transaction_table
      WHERE customer_id = $1
        AND tenant_id = $2
        AND is_live = $3
    `;

    const firstResult = await this.db.query(firstTxnQuery, [customerId, tenantId, isLive]);
    const firstDate = firstResult.rows[0]?.first_date;

    if (!firstDate) {
      return []; // No transactions yet
    }

    // Get all existing snapshot months
    const snapshotsQuery = `
      SELECT snapshot_month_end
      FROM t_monthly_portfolio_snapshots
      WHERE customer_id = $1
        AND tenant_id = $2
        AND is_live = $3
      ORDER BY snapshot_month_end
    `;

    const snapshotsResult = await this.db.query(snapshotsQuery, [customerId, tenantId, isLive]);
    const existingMonths = new Set(snapshotsResult.rows.map(r => r.snapshot_month_end.toISOString()));

    // Generate expected months from first transaction to previous month
    const expectedMonths = this.generateMonthEndDates(
      new Date(firstDate),
      this.getEndOfPreviousMonth()
    );

    // Filter out months that already have snapshots
    return expectedMonths.filter(month => !existingMonths.has(month.toISOString()));
  }
}
