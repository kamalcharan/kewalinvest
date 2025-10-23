// backend/src/services/tenantSeed.service.ts
import { PoolClient } from 'pg';

/**
 * Seeds all necessary master data for a new tenant
 * This includes transaction types and bookmark reasons for both live and test environments
 *
 * @param tenantId - The ID of the newly created tenant
 * @param client - Database client (should be within a transaction)
 */
export async function seedTenantData(tenantId: number, client: PoolClient): Promise<void> {
  console.log(`🌱 SEED: Starting seed data for tenant ${tenantId}...`);

  try {
    // Seed for both environments
    for (const isLive of [true, false]) {
      const envLabel = isLive ? 'LIVE' : 'TEST';
      console.log(`🌱 SEED: Seeding ${envLabel} environment for tenant ${tenantId}...`);

      // ========== SEED TRANSACTION TYPES ==========
      await seedTransactionTypes(tenantId, isLive, client);

      // ========== SEED BOOKMARK REASONS ==========
      await seedBookmarkReasons(tenantId, isLive, client);
    }

    console.log(`✅ SEED: Completed seed data for tenant ${tenantId}`);
  } catch (error) {
    console.error(`❌ SEED: Failed to seed data for tenant ${tenantId}:`, error);
    throw error;
  }
}

/**
 * Seeds transaction types for a tenant environment
 */
async function seedTransactionTypes(
  tenantId: number,
  isLive: boolean,
  client: PoolClient
): Promise<void> {
  const transactionTypes = [
    { code: 'PURCHASE', label: 'Purchase', txn_type: 'BUY', display_order: 1 },
    { code: 'REDEMPTION', label: 'Redemption', txn_type: 'SELL', display_order: 2 },
    { code: 'SWITCH_IN', label: 'Switch In', txn_type: 'BUY', display_order: 3 },
    { code: 'SWITCH_OUT', label: 'Switch Out', txn_type: 'SELL', display_order: 4 },
    { code: 'DIVIDEND_PAYOUT', label: 'Dividend Payout', txn_type: 'SELL', display_order: 5 },
    { code: 'DIVIDEND_REINVEST', label: 'Dividend Reinvestment', txn_type: 'BUY', display_order: 6 },
    { code: 'SIP', label: 'SIP', txn_type: 'BUY', display_order: 7 },
    { code: 'SWP', label: 'SWP', txn_type: 'SELL', display_order: 8 },
    { code: 'STP_IN', label: 'STP In', txn_type: 'BUY', display_order: 9 },
    { code: 'STP_OUT', label: 'STP Out', txn_type: 'SELL', display_order: 10 },
    { code: 'BONUS', label: 'Bonus', txn_type: 'BUY', display_order: 11 },
    { code: 'MERGER_IN', label: 'Merger In', txn_type: 'BUY', display_order: 12 },
    { code: 'MERGER_OUT', label: 'Merger Out', txn_type: 'SELL', display_order: 13 },
    { code: 'SEGREGATION', label: 'Segregation', txn_type: 'BUY', display_order: 14 },
    { code: 'STAMP_DUTY', label: 'Stamp Duty Paid', txn_type: 'SELL', display_order: 15 },
    { code: 'STT_TAX', label: 'STT/Tax Paid', txn_type: 'SELL', display_order: 16 },
    { code: 'OTHER', label: 'Other', txn_type: 'BUY', display_order: 99 }
  ];

  for (const txnType of transactionTypes) {
    await client.query(
      `INSERT INTO m_transaction_types (
        tenant_id, is_live, transaction_code, transaction_label,
        transaction_type, display_order, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (tenant_id, is_live, transaction_code)
      DO UPDATE SET
        transaction_label = EXCLUDED.transaction_label,
        transaction_type = EXCLUDED.transaction_type,
        display_order = EXCLUDED.display_order,
        is_active = EXCLUDED.is_active,
        updated_at = CURRENT_TIMESTAMP`,
      [
        tenantId,
        isLive,
        txnType.code,
        txnType.label,
        txnType.txn_type,
        txnType.display_order,
        true
      ]
    );
  }

  console.log(`  ✅ Seeded ${transactionTypes.length} transaction types (is_live=${isLive})`);
}

/**
 * Seeds bookmark reasons for a tenant environment
 */
async function seedBookmarkReasons(
  tenantId: number,
  isLive: boolean,
  client: PoolClient
): Promise<void> {
  const bookmarkReasons = [
    { code: 'VIP', label: 'VIP Customer', display_order: 1 },
    { code: 'FOLLOW_UP', label: 'Follow-up Required', display_order: 2 },
    { code: 'IMPORTANT', label: 'Important', display_order: 3 },
    { code: 'HIGH_VALUE', label: 'High Value Client', display_order: 4 },
    { code: 'ATTENTION', label: 'Requires Attention', display_order: 5 },
    { code: 'PORTFOLIO_REVIEW', label: 'Portfolio Review Due', display_order: 6 },
    { code: 'TAX_PLANNING', label: 'Tax Planning', display_order: 7 },
    { code: 'OTHER', label: 'Other (Custom)', display_order: 99 }
  ];

  for (const reason of bookmarkReasons) {
    await client.query(
      `INSERT INTO m_bookmark_reasons (
        tenant_id, is_live, reason_code, reason_label,
        display_order, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (tenant_id, is_live, reason_code)
      DO UPDATE SET
        reason_label = EXCLUDED.reason_label,
        display_order = EXCLUDED.display_order,
        is_active = EXCLUDED.is_active,
        updated_at = CURRENT_TIMESTAMP`,
      [
        tenantId,
        isLive,
        reason.code,
        reason.label,
        reason.display_order,
        true
      ]
    );
  }

  console.log(`  ✅ Seeded ${bookmarkReasons.length} bookmark reasons (is_live=${isLive})`);
}
