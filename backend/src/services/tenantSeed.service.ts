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
      default_max_retries: 3,
      default_schedule_type: 'weekly',
      is_global: false
    },
    {
      code: 'DAILY_ALERTS',
      name: 'Daily Alerts',
      description: 'Process and generate daily alert cards for customers (birthdays, anniversaries, reminders)',
      default_cron_expression: '0 20 * * *', // Daily 8 PM
      default_max_retries: 3,
      default_schedule_type: 'daily',
      is_global: false
    },
    {
      code: 'GOAL_CALCULATION',
      name: 'Goal Calculation',
      description: 'Recalculate all goals and create progress snapshots',
      default_cron_expression: '30 20 * * 5', // Friday 8:30 PM
      default_max_retries: 3,
      default_schedule_type: 'weekly',
      is_global: false
    },
    {
      code: 'NAV_DOWNLOAD',
      name: 'NAV Download',
      description: 'Download daily NAV data for all tracked schemes',
      default_cron_expression: '0 21 * * *', // Daily 9 PM
      default_max_retries: 3,
      default_schedule_type: 'daily',
      is_global: true
    },
    {
      code: 'MARKET_OHLC_DOWNLOAD',
      name: 'Market OHLC Download',
      description: 'Download daily OHLC data for all market indices',
      default_cron_expression: '30 21 * * *', // Daily 9:30 PM
      default_max_retries: 3,
      default_schedule_type: 'daily',
      is_global: true
    }
  ];

  for (const jobType of jobTypes) {
    await client.query(
      `INSERT INTO m_job_types (
        code, name, description, default_cron_expression,
        default_max_retries, is_active, default_schedule_type, is_global
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (code) DO NOTHING`,
      [
        jobType.code,
        jobType.name,
        jobType.description,
        jobType.default_cron_expression,
        jobType.default_max_retries,
        true,
        jobType.default_schedule_type,
        jobType.is_global
      ]
    );
  }

  console.log(`  ✅ Ensured ${jobTypes.length} job types exist globally`);
}

/**
 * Seeds default job scheduler configurations for a tenant environment
 * Creates enabled scheduler configs for per-tenant job types only
 * Global jobs (NAV_DOWNLOAD, MARKET_OHLC_DOWNLOAD) are seeded separately with tenant_id = 0
 */
async function seedJobSchedulerConfigs(
  tenantId: number,
  userId: number,
  isLive: boolean,
  client: PoolClient
): Promise<void> {
  // Get per-tenant job types (is_global = false or NULL)
  const jobTypesResult = await client.query(
    `SELECT code, default_cron_expression, default_max_retries, default_schedule_type
     FROM m_job_types
     WHERE is_active = true AND (is_global = false OR is_global IS NULL)`
  );

  const jobTypes = jobTypesResult.rows;

  for (const jobType of jobTypes) {
    // Create default scheduler config for this job type
    await client.query(
      `INSERT INTO t_job_scheduler_configs (
        tenant_id, job_type, user_id, is_live,
        schedule_type, cron_expression, is_enabled, max_retries,
        job_config, next_execution_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
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
        jobType.default_schedule_type || 'daily',
        jobType.default_cron_expression || '0 21 * * 5',
        true, // Enabled by default
        jobType.default_max_retries || 3,
        '{}', // Empty job config (can be customized later)
        calculateNextExecution(jobType.default_cron_expression || '0 21 * * 5')
      ]
    );
  }

  console.log(`  ✅ Seeded ${jobTypes.length} per-tenant job scheduler configs (is_live=${isLive})`);

  // Seed global jobs only once (use tenant_id = 0 for global jobs)
  // Only seed for is_live = true to avoid duplicates
  if (isLive) {
    const globalJobTypesResult = await client.query(
      `SELECT code, default_cron_expression, default_max_retries, default_schedule_type
       FROM m_job_types
       WHERE is_active = true AND is_global = true`
    );

    const globalJobTypes = globalJobTypesResult.rows;

    for (const jobType of globalJobTypes) {
      await client.query(
        `INSERT INTO t_job_scheduler_configs (
          tenant_id, job_type, user_id, is_live,
          schedule_type, cron_expression, is_enabled, max_retries,
          job_config, next_execution_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (tenant_id, job_type, is_live)
        DO NOTHING`,
        [
          0, // tenant_id = 0 for global jobs
          jobType.code,
          userId,
          true, // Global jobs always use is_live = true
          jobType.default_schedule_type || 'daily',
          jobType.default_cron_expression || '0 21 * * *',
          true, // Enabled by default
          jobType.default_max_retries || 3,
          '{}',
          calculateNextExecution(jobType.default_cron_expression || '0 21 * * *')
        ]
      );
    }

    if (globalJobTypes.length > 0) {
      console.log(`  ✅ Ensured ${globalJobTypes.length} global job scheduler configs exist`);
    }
  }
}

/**
 * Calculate next execution time from a cron expression
 * Simple implementation for daily/weekly schedules
 */
function calculateNextExecution(cronExpression: string): Date {
  const parts = cronExpression.split(' ');
  if (parts.length !== 5) {
    // Default to next day 9 PM
    const nextRun = new Date();
    nextRun.setDate(nextRun.getDate() + 1);
    nextRun.setHours(21, 0, 0, 0);
    return nextRun;
  }

  const [minuteStr, hourStr, , , dayOfWeekStr] = parts;
  const minute = parseInt(minuteStr);
  const hour = parseInt(hourStr);
  const dayOfWeek = dayOfWeekStr === '*' ? null : parseInt(dayOfWeekStr);

  const now = new Date();
  const nextRun = new Date(now);
  nextRun.setSeconds(0, 0);

  if (dayOfWeek === null) {
    // Daily schedule
    nextRun.setHours(hour, minute, 0, 0);
    if (nextRun <= now) {
      nextRun.setDate(nextRun.getDate() + 1);
    }
  } else {
    // Weekly schedule
    const currentDay = now.getDay();
    let daysUntilTarget = (dayOfWeek - currentDay + 7) % 7;
    if (daysUntilTarget === 0) {
      const targetTime = new Date(now);
      targetTime.setHours(hour, minute, 0, 0);
      if (now >= targetTime) {
        daysUntilTarget = 7;
      }
    }
    nextRun.setDate(now.getDate() + daysUntilTarget);
    nextRun.setHours(hour, minute, 0, 0);
  }

  return nextRun;
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