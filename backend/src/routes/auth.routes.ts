// backend/src/routes/auth.routes.ts
import { Router, Request, Response } from 'express';
import { pool } from '../config/database';
import { hashPassword, verifyPassword } from '../utils/password.utils';
import { createAccessToken } from '../utils/jwt.utils';
import { authenticate } from '../middleware/auth.middleware';
import { seedTenantData } from '../services/tenantSeed.service';

interface AuthenticatedRequest extends Request {
  user?: {
    user_id: number;
    tenant_id: number;
    email: string;
  };
}

const router = Router();

// ============================================================================
// HELPER FUNCTIONS FOR TENANT CODE GENERATION
// ============================================================================

/**
 * Generate tenant code: First 4 chars of business name + 4 random digits
 * Example: "Acme Corp" -> "ACME1234"
 */
function generateTenantCode(businessName: string): string {
  // Get first 4 characters (uppercase, remove spaces and special chars)
  const prefix = businessName
    .replace(/[^a-zA-Z0-9]/g, '') // Remove special chars
    .toUpperCase()
    .slice(0, 4)
    .padEnd(4, 'X'); // Pad with X if less than 4 chars
  
  // Generate 4 random digits
  const randomDigits = Math.floor(1000 + Math.random() * 9000);
  
  return `${prefix}${randomDigits}`;
}

/**
 * Check if tenant_code already exists
 */
async function isTenantCodeUnique(tenantCode: string): Promise<boolean> {
  const result = await pool.query(
    'SELECT id FROM t_tenants WHERE tenant_code = $1',
    [tenantCode]
  );
  return result.rows.length === 0;
}

/**
 * Generate unique tenant code with retry logic
 */
async function generateUniqueTenantCode(businessName: string): Promise<string> {
  let attempts = 0;
  let tenantCode: string;
  
  do {
    tenantCode = generateTenantCode(businessName);
    attempts++;
    
    if (await isTenantCodeUnique(tenantCode)) {
      return tenantCode;
    }
    
    // If we've tried 5 times, append timestamp to ensure uniqueness
    if (attempts >= 5) {
      const timestamp = Date.now().toString().slice(-4);
      tenantCode = `${tenantCode.slice(0, 4)}${timestamp}`;
      return tenantCode;
    }
  } while (attempts < 10);
  
  throw new Error('Failed to generate unique tenant code');
}

// ============================================================================
// REGISTER ENDPOINT - CREATES TENANT + USER
// ============================================================================

router.post('/register', async (req: Request, res: Response): Promise<Response> => {
  const { email, password, business_name } = req.body;
  console.log('📝 REGISTER: Request received:', { email, business_name: business_name ? '***' : 'missing' });
  
  const client = await pool.connect();
  
  try {
    // ========== VALIDATION ==========
    if (!email || !password || !business_name) {
      console.log('❌ REGISTER: Missing required fields');
      return res.status(400).json({ 
        detail: 'Email, password, and business name are required' 
      });
    }

    if (password.length < 6) {
      console.log('❌ REGISTER: Password too short');
      return res.status(400).json({ 
        detail: 'Password must be at least 6 characters long' 
      });
    }

    if (business_name.trim().length < 2) {
      console.log('❌ REGISTER: Business name too short');
      return res.status(400).json({ 
        detail: 'Business name must be at least 2 characters long' 
      });
    }

    // ========== START TRANSACTION ==========
    await client.query('BEGIN');
    console.log('🔄 REGISTER: Transaction started');

    // ========== CHECK IF EMAIL EXISTS ==========
    const existingUser = await client.query(
      'SELECT id, email, tenant_id FROM t_users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      await client.query('ROLLBACK');
      console.log('❌ REGISTER: Email already exists');
      return res.status(400).json({ 
        detail: 'User with this email already exists' 
      });
    }

    // ========== GENERATE UNIQUE TENANT CODE ==========
    console.log('🔑 REGISTER: Generating tenant code for:', business_name);
    const tenantCode = await generateUniqueTenantCode(business_name);
    console.log('✅ REGISTER: Generated tenant code:', tenantCode);

    // ========== CREATE TENANT WITH SUBSCRIPTION ==========
    const subscriptionSettings = {
      subscription_start_date: new Date().toISOString().split('T')[0], // Today
      subscription_end_date: '2026-01-20' // Hardcoded end date
    };

    console.log('🏢 REGISTER: Creating tenant...');
    const tenantResult = await client.query(
      `INSERT INTO t_tenants (
        tenant_code, 
        tenant_name, 
        is_active, 
        is_admin,
        subscription_plan,
        settings,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW()) 
      RETURNING id, tenant_code, tenant_name, is_active, is_admin, subscription_plan, settings, created_at`,
      [tenantCode, business_name.trim(), true, true, 'basic', JSON.stringify(subscriptionSettings)]
    );

    const tenant = tenantResult.rows[0];
    console.log('✅ REGISTER: Tenant created with ID:', tenant.id);

    // ========== CREATE USER ==========
    const password_hash = await hashPassword(password);

    console.log('👤 REGISTER: Creating user...');
    const userResult = await client.query(
      `INSERT INTO t_users (
        tenant_id, 
        email, 
        password_hash, 
        is_active, 
        theme_preference, 
        environment_preference, 
        is_live,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW()) 
      RETURNING id, tenant_id, email, is_active, theme_preference, 
                environment_preference, created_at`,
      [tenant.id, email, password_hash, true, 'techy-simple', 'live', true]
    );

    const user = userResult.rows[0];
    console.log('✅ REGISTER: User created with ID:', user.id);

    // ========== SEED TENANT DATA ==========
    console.log('🌱 REGISTER: Seeding master data for new tenant...');
    await seedTenantData(tenant.id, user.id, client);
    console.log('✅ REGISTER: Tenant data seeded successfully');

    // ========== COMMIT TRANSACTION ==========
    await client.query('COMMIT');
    console.log('✅ REGISTER: Transaction committed successfully');

    // ========== CREATE JWT TOKEN ==========
    const access_token = createAccessToken({
      user_id: user.id,
      tenant_id: user.tenant_id,
      email: user.email
    });

    console.log('🎫 REGISTER: JWT token created');

    // ========== RETURN RESPONSE WITH TENANT INFO ==========
    return res.status(201).json({
      access_token,
      token_type: 'bearer',
      user: {
        id: user.id,
        tenant_id: user.tenant_id,
        email: user.email,
        is_active: user.is_active,
        theme_preference: user.theme_preference,
        environment_preference: user.environment_preference,
        created_at: user.created_at,
        tenant: {
          id: tenant.id,
          tenant_code: tenant.tenant_code,
          tenant_name: tenant.tenant_name,
          is_admin: tenant.is_admin,
          subscription_plan: tenant.subscription_plan,
          settings: tenant.settings
        }
      }
    });

  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('❌ REGISTER: Error occurred:', error);
    return res.status(500).json({ 
      detail: `Registration failed: ${error.message}` 
    });
  } finally {
    client.release();
  }
});

// ============================================================================
// LOGIN ENDPOINT - UPDATED TO RETURN TENANT INFO
// ============================================================================

router.post('/login', async (req: Request, res: Response): Promise<Response> => {
  const { email, password } = req.body;
  console.log('🔐 LOGIN: Request received for:', email);

  try {
    // ========== VALIDATION ==========
    if (!email || !password) {
      console.log('❌ LOGIN: Missing credentials');
      return res.status(400).json({ 
        detail: 'Email and password are required' 
      });
    }

    // ========== GET USER WITH TENANT INFO ==========
    console.log('🔍 LOGIN: Fetching user with tenant info...');
    const result = await pool.query(
      `SELECT 
        u.*, 
        t.tenant_code,
        t.tenant_name,
        t.is_admin as tenant_is_admin,
        t.subscription_plan,
        t.settings as tenant_settings
       FROM t_users u
       JOIN t_tenants t ON t.id = u.tenant_id
       WHERE u.email = $1 AND u.is_active = true AND t.is_active = true`,
      [email]
    );

    if (result.rows.length === 0) {
      console.log('❌ LOGIN: User not found or inactive');
      return res.status(401).json({ 
        detail: 'Invalid email or password',
        headers: { 'WWW-Authenticate': 'Bearer' }
      });
    }

    const user = result.rows[0];
    console.log('✅ LOGIN: User found:', user.id, '| Tenant:', user.tenant_id);

    // ========== VERIFY PASSWORD ==========
    const isValidPassword = await verifyPassword(password, user.password_hash);
    if (!isValidPassword) {
      console.log('❌ LOGIN: Invalid password');
      return res.status(401).json({ 
        detail: 'Invalid email or password',
        headers: { 'WWW-Authenticate': 'Bearer' }
      });
    }

    console.log('✅ LOGIN: Password verified');

    // ========== CREATE JWT TOKEN ==========
    const access_token = createAccessToken({
      user_id: user.id,
      tenant_id: user.tenant_id,
      email: user.email
    });

    console.log('🎫 LOGIN: JWT token created');

    // ========== RETURN RESPONSE WITH TENANT INFO ==========
    return res.json({
      access_token,
      token_type: 'bearer',
      user: {
        id: user.id,
        tenant_id: user.tenant_id,
        email: user.email,
        is_active: user.is_active,
        theme_preference: user.theme_preference,
        environment_preference: user.environment_preference,
        created_at: user.created_at,
        tenant: {
          id: user.tenant_id,
          tenant_code: user.tenant_code,
          tenant_name: user.tenant_name,
          is_admin: user.tenant_is_admin,
          subscription_plan: user.subscription_plan,
          settings: user.tenant_settings
        }
      }
    });

  } catch (error: any) {
    console.error('❌ LOGIN: Error occurred:', error);
    return res.status(500).json({ 
      detail: `Login failed: ${error.message}` 
    });
  }
});

// ============================================================================
// GET CURRENT USER - UPDATED TO RETURN TENANT INFO
// ============================================================================

router.get('/me', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
  try {
    const userId = req.user?.user_id;
    const tenantId = req.user?.tenant_id;

    console.log('👤 ME: Fetching user info for ID:', userId);

    const result = await pool.query(
      `SELECT 
        u.id, 
        u.tenant_id, 
        u.email, 
        u.is_active, 
        u.theme_preference, 
        u.environment_preference, 
        u.created_at,
        t.tenant_code,
        t.tenant_name,
        t.is_admin as tenant_is_admin,
        t.subscription_plan,
        t.settings as tenant_settings
       FROM t_users u
       JOIN t_tenants t ON t.id = u.tenant_id
       WHERE u.id = $1 AND u.tenant_id = $2`,
      [userId, tenantId]
    );

    if (result.rows.length === 0) {
      console.log('❌ ME: User not found');
      return res.status(404).json({ 
        detail: 'User not found' 
      });
    }

    const user = result.rows[0];
    console.log('✅ ME: User info retrieved');

    return res.json({
      id: user.id,
      tenant_id: user.tenant_id,
      email: user.email,
      is_active: user.is_active,
      theme_preference: user.theme_preference,
      environment_preference: user.environment_preference,
      created_at: user.created_at,
      tenant: {
        id: user.tenant_id,
        tenant_code: user.tenant_code,
        tenant_name: user.tenant_name,
        is_admin: user.tenant_is_admin,
        subscription_plan: user.subscription_plan,
        settings: user.tenant_settings
      }
    });

  } catch (error: any) {
    console.error('❌ ME: Error occurred:', error);
    return res.status(500).json({ 
      detail: `Failed to get user info: ${error.message}` 
    });
  }
});

// ============================================================================
// OTHER ENDPOINTS (UNCHANGED)
// ============================================================================

// Change password endpoint
router.patch('/change-password', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
  const { current_password, new_password } = req.body;
  const userId = req.user?.user_id;
  const tenantId = req.user?.tenant_id;

  try {
    // Validate input
    if (!current_password || !new_password) {
      return res.status(400).json({ 
        detail: 'Current password and new password are required' 
      });
    }

    if (new_password.length < 6) {
      return res.status(400).json({ 
        detail: 'New password must be at least 6 characters long' 
      });
    }

    // Get user's current password hash
    const result = await pool.query(
      'SELECT password_hash FROM t_users WHERE id = $1 AND tenant_id = $2',
      [userId, tenantId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        detail: 'User not found' 
      });
    }

    const user = result.rows[0];

    // Verify current password
    const isValidPassword = await verifyPassword(current_password, user.password_hash);
    if (!isValidPassword) {
      return res.status(400).json({ 
        detail: 'Current password is incorrect' 
      });
    }

    // Check if new password is different from current
    const isSamePassword = await verifyPassword(new_password, user.password_hash);
    if (isSamePassword) {
      return res.status(400).json({ 
        detail: 'New password must be different from current password' 
      });
    }

    // Hash new password
    const newPasswordHash = await hashPassword(new_password);

    // Update password
    await pool.query(
      `UPDATE t_users 
       SET password_hash = $1, updated_at = NOW() 
       WHERE id = $2 AND tenant_id = $3`,
      [newPasswordHash, userId, tenantId]
    );

    return res.json({
      message: 'Password updated successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Change password error:', error);
    return res.status(500).json({ 
      detail: `Password change failed: ${error.message}` 
    });
  }
});

// Update environment preference endpoint
router.patch('/environment', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
  const { environment_preference } = req.body;
  const userId = req.user?.user_id;
  const tenantId = req.user?.tenant_id;

  try {
    // Validate environment preference
    if (!environment_preference || !['live', 'test'].includes(environment_preference)) {
      return res.status(400).json({ 
        detail: "Environment preference must be 'live' or 'test'" 
      });
    }

    // Update user's environment preference
    const result = await pool.query(
      `UPDATE t_users 
       SET environment_preference = $1, 
           is_live = $2,
           updated_at = NOW() 
       WHERE id = $3 AND tenant_id = $4 
       RETURNING id, tenant_id, email, is_active, theme_preference, 
                 environment_preference, created_at`,
      [environment_preference, environment_preference === 'live', userId, tenantId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        detail: 'User not found' 
      });
    }

    const user = result.rows[0];
    return res.json({
      id: user.id,
      tenant_id: user.tenant_id,
      email: user.email,
      is_active: user.is_active,
      theme_preference: user.theme_preference,
      environment_preference: user.environment_preference,
      created_at: user.created_at
    });

  } catch (error: any) {
    console.error('Environment update error:', error);
    return res.status(500).json({ 
      detail: `Environment update failed: ${error.message}` 
    });
  }
});

export default router;