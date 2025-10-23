// backend/src/services/tenantSeed.service.ts
import { PoolClient } from 'pg';

/**
 * Seeds all necessary master data for a new tenant
 * This includes bookmark reasons for both live and test environments
 *
 * NOTE: Transaction types are GLOBAL (not tenant-specific) and should be
 * seeded once in the database initialization scripts (02_tables.sql)
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
