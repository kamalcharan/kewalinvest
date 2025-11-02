// backend/src/services/tenantSeed.service.ts
import { PoolClient } from 'pg';

/**
 * Calculate the next Friday at 9 PM (21:00) from now
 * If today is Friday and it's before 9 PM, return today at 9 PM
 * Otherwise, return next Friday at 9 PM
 */
function getNextFridayAt9PM(): Date {
  const now = new Date();
  const currentDay = now.getDay(); // 0 = Sunday, 5 = Friday
  const currentHour = now.getHours();
  
  let daysUntilFriday: number;
  
  if (currentDay === 5) {
    // Today is Friday
    if (currentHour < 21) {
      // Before 9 PM, use today
      daysUntilFriday = 0;
    } else {
      // After 9 PM, use next Friday
      daysUntilFriday = 7;
    }
  } else if (currentDay < 5) {
    // Before Friday this week
    daysUntilFriday = 5 - currentDay;
  } else {
    // Saturday (6) or Sunday (0), go to next Friday
    daysUntilFriday = 7 - currentDay + 5;
  }
  
  const nextFriday = new Date(now);
  nextFriday.setDate(now.getDate() + daysUntilFriday);
  nextFriday.setHours(21, 0, 0, 0); // Set to 9:00:00 PM
  
  return nextFriday;
}

/**
 * Seeds all necessary master data for a new tenant
 * This includes bookmark reasons, job scheduler configs, and portfolio snapshot configs for both live and test environments
 *
 * NOTE: Global master data (Transaction types, Job types) are seeded once
 * in the database initialization scripts (05_seed_data.sql)
 *
 * @param tenantId - The ID of the newly created tenant
 * @param userId - The ID of the first user (admin) for this tenant
 * @param client - Database client (should be within a transaction)
 */
export async function seedTenantData(tenantId: number, userId: number, client: PoolClient): Promise<void> {
  console.log(`🌱 SEED: Starting seed data for tenant ${tenantId}...`);

  try {
    // Seed global job types first (if not already seeded)
    await seedGlobalJobTypes(client);

    // Seed for both environments
    for (const isLive of [true, false]) {
      const envLabel = isLive ? 'LIVE' : 'TEST';
      console.log(`🌱 SEED: Seeding ${envLabel} environment for tenant ${tenantId}...`);

      // ========== SEED BOOKMARK REASONS ==========
      await seedBookmarkReasons(tenantId, isLive, client);

      // ========== SEED JOB SCHEDULER CONFIGS ==========
      await seedJobSchedulerConfigs(tenantId, userId, isLive, client);

      // ========== SEED PORTFOLIO SNAPSHOT CONFIGS ==========
      await seedPortfolioSnapshotConfigs(tenantId, userId, isLive, client);
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
    { code: 'OTHER', label: 'Other (Custom)', display_order: 99 },
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

/**
 * Seeds global job types (if they don't already exist)
 * Job types are global master data shared across all tenants
 */
async function seedGlobalJobTypes(client: PoolClient): Promise<void> {
  const jobTypes = [
    {
      code: 'PORTFOLIO_SNAPSHOT',
      name: 'Portfolio Snapshot Generation',
      description: 'Generate monthly portfolio snapshots for all customers to enable performance tracking',
      default_cron_expression: '0 21 * * 5', // Friday 9 PM
      default_max_retries: 3
    }
  ];

  for (const jobType of jobTypes) {
    await client.query(
      `INSERT INTO m_job_types (
        code, name, description, default_cron_expression,
        default_max_retries, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (code) DO NOTHING`,
      [
        jobType.code,
        jobType.name,
        jobType.description,
        jobType.default_cron_expression,
        jobType.default_max_retries,
        true
      ]
    );
  }

  console.log(`  ✅ Ensured ${jobTypes.length} job types exist globally`);
}

/**
 * Seeds default job scheduler configurations for a tenant environment
 * Creates enabled scheduler configs for all active job types
 */
async function seedJobSchedulerConfigs(
  tenantId: number,
  userId: number,
  isLive: boolean,
  client: PoolClient
): Promise<void> {
  // Get all active job types
  const jobTypesResult = await client.query(
    `SELECT code, default_cron_expression, default_max_retries
     FROM m_job_types
     WHERE is_active = true`
  );

  const jobTypes = jobTypesResult.rows;

  for (const jobType of jobTypes) {
    // Create default scheduler config for this job type
    await client.query(
      `INSERT INTO t_job_scheduler_configs (
        tenant_id, job_type, user_id, is_live,
        schedule_type, cron_expression, is_enabled, max_retries,
        job_config
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (tenant_id, job_type, is_live)
      DO UPDATE SET
        cron_expression = EXCLUDED.cron_expression,
        max_retries = EXCLUDED.max_retries,
        updated_at = CURRENT_TIMESTAMP`,
      [
        tenantId,
        jobType.code,
        userId,
        isLive,
        'weekly', // Default to weekly schedule
        jobType.default_cron_expression || '0 21 * * 5', // Default Friday 9 PM
        true, // Enabled by default
        jobType.default_max_retries || 3,
        '{}' // Empty job config (can be customized later)
      ]
    );
  }

  console.log(`  ✅ Seeded ${jobTypes.length} job scheduler configs (is_live=${isLive})`);
}

/**
 * Seeds portfolio snapshot configuration for a tenant environment
 * Creates a default weekly schedule for Friday 9 PM with calculated next execution date
 */
async function seedPortfolioSnapshotConfigs(
  tenantId: number,
  userId: number,
  isLive: boolean,
  client: PoolClient
): Promise<void> {
  // Calculate next Friday at 9 PM
  const nextExecutionAt = getNextFridayAt9PM();
  
  console.log(`  📅 Next execution scheduled for: ${nextExecutionAt.toISOString()}`);

  await client.query(
    `INSERT INTO t_portfolio_snapshot_configs (
      tenant_id, user_id, is_live,
      schedule_type, cron_expression, is_enabled,
      next_execution_at, execution_count, failure_count, max_retries
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    ON CONFLICT (tenant_id, is_live)
    DO UPDATE SET
      user_id = EXCLUDED.user_id,
      schedule_type = EXCLUDED.schedule_type,
      cron_expression = EXCLUDED.cron_expression,
      is_enabled = EXCLUDED.is_enabled,
      next_execution_at = EXCLUDED.next_execution_at,
      max_retries = EXCLUDED.max_retries,
      updated_at = CURRENT_TIMESTAMP`,
    [
      tenantId,
      userId,
      isLive,
      'weekly',              // schedule_type
      '0 21 * * 5',          // cron_expression (Friday 9 PM)
      true,                  // is_enabled
      nextExecutionAt,       // next_execution_at (calculated)
      0,                     // execution_count
      0,                     // failure_count
      3                      // max_retries
    ]
  );

  console.log(`  ✅ Seeded portfolio snapshot config (is_live=${isLive})`);
}