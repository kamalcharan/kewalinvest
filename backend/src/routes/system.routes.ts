// backend/src/routes/system.routes.ts
// System administration routes - migration status, database info, etc.
// Only accessible by admin tenants (is_admin = true)

import { Router, Request, Response } from 'express';
import { pool } from '../config/database';
import { authenticate } from '../middleware/auth.middleware';

interface AuthenticatedRequest extends Request {
  user?: {
    user_id: number;
    tenant_id: number;
    email: string;
  };
}

const router = Router();

// ============================================================================
// MIDDLEWARE: Admin-only access
// ============================================================================
const requireAdmin = async (req: AuthenticatedRequest, res: Response, next: Function) => {
  try {
    const tenantId = req.user?.tenant_id;

    if (!tenantId) {
      return res.status(401).json({ detail: 'Authentication required' });
    }

    // Check if tenant is admin
    const result = await pool.query(
      'SELECT is_admin FROM t_tenants WHERE id = $1',
      [tenantId]
    );

    if (result.rows.length === 0 || !result.rows[0].is_admin) {
      return res.status(403).json({ detail: 'Admin access required' });
    }

    return next();
  } catch (error: any) {
    console.error('Admin check error:', error);
    return res.status(500).json({ detail: 'Failed to verify admin status' });
  }
};

// ============================================================================
// GET /api/system/migrations - Get migration status
// ============================================================================
router.get('/migrations', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Check if t_migrations table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS(
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 't_migrations'
      ) as exists
    `);

    if (!tableCheck.rows[0].exists) {
      return res.json({
        tracking_enabled: false,
        message: 'Migration tracking not enabled. Run 00_migrations_tracking.sql first.',
        current_version: null,
        migrations: []
      });
    }

    // Get current version
    const versionResult = await pool.query(`
      SELECT COALESCE(MAX(version), '000') as current_version
      FROM t_migrations
      WHERE status = 'success'
    `);

    // Get all migrations
    const migrationsResult = await pool.query(`
      SELECT
        version,
        filename,
        name,
        description,
        applied_at,
        applied_by,
        execution_time_ms,
        status,
        CASE
          WHEN error_message IS NOT NULL THEN LEFT(error_message, 200)
          ELSE NULL
        END as error_preview
      FROM t_migrations
      ORDER BY version DESC
    `);

    // Get stats
    const statsResult = await pool.query(`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'success') as success,
        COUNT(*) FILTER (WHERE status = 'failed') as failed,
        MAX(applied_at) as last_migration_at
      FROM t_migrations
    `);

    return res.json({
      tracking_enabled: true,
      current_version: versionResult.rows[0].current_version,
      stats: statsResult.rows[0],
      migrations: migrationsResult.rows
    });

  } catch (error: any) {
    console.error('Get migrations error:', error);
    return res.status(500).json({ detail: `Failed to get migrations: ${error.message}` });
  }
});

// ============================================================================
// GET /api/system/database-status - Get overall database status
// ============================================================================
router.get('/database-status', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Get table counts
    const tablesResult = await pool.query(`
      SELECT
        table_name,
        (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
      FROM information_schema.tables t
      WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);

    // Get database size
    const sizeResult = await pool.query(`
      SELECT pg_size_pretty(pg_database_size(current_database())) as database_size
    `);

    // Get tenant count
    const tenantResult = await pool.query(`
      SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE is_active = true) as active
      FROM t_tenants
    `);

    // Get user count
    const userResult = await pool.query(`
      SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE is_active = true) as active
      FROM t_users
    `);

    // Get migration version if tracking is enabled
    let migrationVersion = null;
    const migrationCheck = await pool.query(`
      SELECT EXISTS(
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 't_migrations'
      ) as exists
    `);

    if (migrationCheck.rows[0].exists) {
      const versionResult = await pool.query(`
        SELECT COALESCE(MAX(version), '000') as version
        FROM t_migrations
        WHERE status = 'success'
      `);
      migrationVersion = versionResult.rows[0].version;
    }

    return res.json({
      database_size: sizeResult.rows[0].database_size,
      migration_version: migrationVersion,
      migration_tracking_enabled: migrationCheck.rows[0].exists,
      tables: {
        count: tablesResult.rows.length,
        list: tablesResult.rows
      },
      tenants: tenantResult.rows[0],
      users: userResult.rows[0],
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Get database status error:', error);
    return res.status(500).json({ detail: `Failed to get database status: ${error.message}` });
  }
});

// ============================================================================
// GET /api/system/tenant-data-status - Get data initialization status per tenant
// ============================================================================
router.get('/tenant-data-status', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT
        t.id as tenant_id,
        t.tenant_code,
        t.tenant_name,
        t.is_admin,
        t.is_active,
        t.created_at,
        (SELECT COUNT(*) FROM m_bookmark_reasons WHERE tenant_id = t.id) as bookmark_reasons_count,
        (SELECT COUNT(*) FROM t_job_scheduler_configs WHERE tenant_id = t.id) as job_configs_count,
        (SELECT COUNT(*) FROM t_portfolio_snapshot_configs WHERE tenant_id = t.id) as snapshot_configs_count,
        (SELECT COUNT(*) FROM t_users WHERE tenant_id = t.id) as user_count,
        (SELECT COUNT(*) FROM t_customers WHERE tenant_id = t.id) as customer_count,
        CASE
          WHEN (SELECT COUNT(*) FROM m_bookmark_reasons WHERE tenant_id = t.id) >= 16
               AND (SELECT COUNT(*) FROM t_job_scheduler_configs WHERE tenant_id = t.id) >= 6
               AND (SELECT COUNT(*) FROM t_portfolio_snapshot_configs WHERE tenant_id = t.id) >= 2
          THEN 'initialized'
          WHEN (SELECT COUNT(*) FROM m_bookmark_reasons WHERE tenant_id = t.id) > 0
               OR (SELECT COUNT(*) FROM t_job_scheduler_configs WHERE tenant_id = t.id) > 0
          THEN 'partial'
          ELSE 'not_initialized'
        END as data_status
      FROM t_tenants t
      ORDER BY t.id
    `);

    // Summary stats
    const summary = {
      total_tenants: result.rows.length,
      initialized: result.rows.filter(r => r.data_status === 'initialized').length,
      partial: result.rows.filter(r => r.data_status === 'partial').length,
      not_initialized: result.rows.filter(r => r.data_status === 'not_initialized').length
    };

    return res.json({
      summary,
      tenants: result.rows
    });

  } catch (error: any) {
    console.error('Get tenant data status error:', error);
    return res.status(500).json({ detail: `Failed to get tenant data status: ${error.message}` });
  }
});

// ============================================================================
// GET /api/system/health-check - Comprehensive health check
// ============================================================================
router.get('/health-check', authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const checks: Record<string, any> = {};

    // 1. Database connection
    try {
      await pool.query('SELECT 1');
      checks.database_connection = { status: 'ok' };
    } catch (e: any) {
      checks.database_connection = { status: 'error', message: e.message };
    }

    // 2. Required master tables
    const requiredTables = [
      'm_job_types',
      'm_transaction_types',
      'm_bookmark_reasons',
      't_tenants',
      't_users'
    ];

    checks.required_tables = {};
    for (const table of requiredTables) {
      const result = await pool.query(`
        SELECT EXISTS(
          SELECT 1 FROM information_schema.tables
          WHERE table_name = $1
        ) as exists,
        CASE WHEN EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = $1)
          THEN (SELECT COUNT(*) FROM ${table})
          ELSE 0
        END as row_count
      `, [table]);

      checks.required_tables[table] = {
        exists: result.rows[0].exists,
        row_count: parseInt(result.rows[0].row_count) || 0
      };
    }

    // 3. m_job_types data check (critical for signup)
    const jobTypesResult = await pool.query(`
      SELECT COUNT(*) as count FROM m_job_types WHERE is_active = true
    `);
    checks.job_types = {
      status: parseInt(jobTypesResult.rows[0].count) >= 5 ? 'ok' : 'warning',
      count: parseInt(jobTypesResult.rows[0].count),
      required: 5,
      message: parseInt(jobTypesResult.rows[0].count) < 5
        ? 'Missing job types - signup may fail'
        : null
    };

    // 4. m_transaction_types check
    const txnTypesResult = await pool.query(`
      SELECT COUNT(*) as count FROM m_transaction_types WHERE is_active = true
    `);
    checks.transaction_types = {
      status: parseInt(txnTypesResult.rows[0].count) >= 11 ? 'ok' : 'warning',
      count: parseInt(txnTypesResult.rows[0].count),
      required: 11
    };

    // Overall status
    const hasErrors = Object.values(checks).some(
      (c: any) => c.status === 'error' || (c.required_tables && Object.values(c.required_tables).some((t: any) => !t.exists))
    );
    const hasWarnings = Object.values(checks).some((c: any) => c.status === 'warning');

    return res.json({
      overall_status: hasErrors ? 'error' : hasWarnings ? 'warning' : 'ok',
      checks,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Health check error:', error);
    return res.status(500).json({ detail: `Health check failed: ${error.message}` });
  }
});

export default router;
