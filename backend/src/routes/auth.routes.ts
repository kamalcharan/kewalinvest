// backend/src/routes/auth.routes.ts
import { Router, Request, Response } from 'express';
import { pool } from '../config/database';
import { hashPassword, verifyPassword } from '../utils/password.utils';
import { createAccessToken } from '../utils/jwt.utils';
import { authenticate } from '../middleware/auth.middleware';

// Define the authenticated request interface
interface AuthenticatedRequest extends Request {
  user?: {
    user_id: number;
    tenant_id: number;
    email: string;
  };
}

const router = Router();

// Register endpoint
router.post('/register', async (req: Request, res: Response): Promise<Response> => {
  const { email, password } = req.body;
   console.log('📥 REGISTER: All headers:', req.headers);
  console.log('📥 REGISTER: X-Tenant-ID header:', req.headers['x-tenant-id']);

  // Get tenant_id from header (sent by frontend) or default to 1
  const tenantId = req.headers['x-tenant-id'] ? 
    parseInt(req.headers['x-tenant-id'] as string) : 1;
 console.log('📥 REGISTER: Final tenant ID being used:', tenantId);
  try {
    // Validate input
    if (!email || !password) {
      return res.status(400).json({ 
        detail: 'Email and password are required' 
      });
    }

    if (password.length < 6) {
      return res.status(400).json({ 
        detail: 'Password must be at least 6 characters long' 
      });
    }

    // Hash password
    const password_hash = await hashPassword(password);

    // Start transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Check if user already exists for this tenant
      const existingUser = await client.query(
        'SELECT id FROM t_users WHERE email = $1 AND tenant_id = $2',
        [email, tenantId]
      );

      if (existingUser.rows.length > 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ 
          detail: 'User with this email already exists' 
        });
      }

      // Create new user with specified tenant_id
      const result = await client.query(
        `INSERT INTO t_users (
          tenant_id, email, password_hash, 
          is_active, theme_preference, environment_preference, is_live
        ) VALUES ($1, $2, $3, $4, $5, $6, $7) 
        RETURNING id, tenant_id, email, is_active, theme_preference, 
                  environment_preference, created_at`,
        [tenantId, email, password_hash, true, 'techy-simple', 'live', true]
      );

      await client.query('COMMIT');
      const user = result.rows[0];

      // Create JWT token
      const access_token = createAccessToken({
        user_id: user.id,
        tenant_id: user.tenant_id,
        email: user.email
      });

      // Return response matching Python format
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
          created_at: user.created_at
        }
      });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error: any) {
    console.error('Registration error:', error);
    return res.status(500).json({ 
      detail: `Registration failed: ${error.message}` 
    });
  }
});

// Login endpoint
router.post('/login', async (req: Request, res: Response): Promise<Response> => {
  const { email, password } = req.body;

  try {
    // Validate input
    if (!email || !password) {
      return res.status(400).json({ 
        detail: 'Email and password are required' 
      });
    }

    // Get user by email
    const result = await pool.query(
      `SELECT * FROM t_users 
       WHERE email = $1 AND is_active = true`,
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ 
        detail: 'Invalid email or password',
        headers: { 'WWW-Authenticate': 'Bearer' }
      });
    }

    const user = result.rows[0];

    // Verify password
    const isValidPassword = await verifyPassword(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ 
        detail: 'Invalid email or password',
        headers: { 'WWW-Authenticate': 'Bearer' }
      });
    }

    // Create JWT token
    const access_token = createAccessToken({
      user_id: user.id,
      tenant_id: user.tenant_id,
      email: user.email
    });

    // Return response matching Python format
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
        created_at: user.created_at
      }
    });

  } catch (error: any) {
    console.error('Login error:', error);
    return res.status(500).json({ 
      detail: `Login failed: ${error.message}` 
    });
  }
});

// Get current user endpoint
router.get('/me', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
  try {
    const userId = req.user?.user_id;
    const tenantId = req.user?.tenant_id;

    const result = await pool.query(
      `SELECT id, tenant_id, email, is_active, theme_preference, 
              environment_preference, created_at 
       FROM t_users 
       WHERE id = $1 AND tenant_id = $2`,
      [userId, tenantId]
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
    console.error('Get user error:', error);
    return res.status(500).json({ 
      detail: `Failed to get user info: ${error.message}` 
    });
  }
});

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