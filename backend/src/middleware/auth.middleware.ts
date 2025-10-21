import { Request, Response, NextFunction } from 'express';
import { verifyToken, JWTPayload } from '../utils/jwt.utils';
import { pool } from '../config/database';

export interface AuthenticatedRequest extends Request {
  user?: JWTPayload & {
    id: number;
    user_id: number;
    tenant_id: number;
    email: string;
    environment_preference?: string;
    tenant?: {
      id: number;
      tenant_code: string;
      tenant_name: string;
      is_admin: boolean;
      subscription_plan: string;
      settings: any;
    };
  };
}

export const authMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ 
        detail: 'No token provided',
        headers: { 'WWW-Authenticate': 'Bearer' }
      });
      return;
    }

    const token = authHeader.substring(7);
    const payload = verifyToken(token);

    // Fetch user WITH tenant info from database
    const result = await pool.query(
      `SELECT 
        u.id,
        u.tenant_id,
        u.email,
        u.environment_preference,
        t.id as tenant_id_check,
        t.tenant_code,
        t.tenant_name,
        t.is_admin,
        t.subscription_plan,
        t.settings as tenant_settings
       FROM t_users u
       JOIN t_tenants t ON t.id = u.tenant_id
       WHERE u.id = $1 AND u.tenant_id = $2 AND u.is_active = true AND t.is_active = true`,
      [payload.user_id, payload.tenant_id]
    );

    if (result.rows.length === 0) {
      console.error('❌ AUTH MIDDLEWARE: User or tenant not found or inactive');
      res.status(401).json({ 
        detail: 'Invalid or expired token',
        headers: { 'WWW-Authenticate': 'Bearer' }
      });
      return;
    }

    const user = result.rows[0];

    req.user = {
      ...payload,
      id: payload.user_id,
      environment_preference: user.environment_preference,
      tenant: {
        id: user.tenant_id,
        tenant_code: user.tenant_code,
        tenant_name: user.tenant_name,
        is_admin: user.is_admin === true,
        subscription_plan: user.subscription_plan,
        settings: user.tenant_settings
      }
    };

    console.log('✅ AUTH MIDDLEWARE: User authenticated');
    console.log('🏢 Tenant:', user.tenant_name);
    console.log('👑 Is Admin:', user.is_admin);

    next();
  } catch (error) {
    console.error('❌ Authentication error:', error);
    res.status(401).json({ 
      detail: 'Invalid or expired token',
      headers: { 'WWW-Authenticate': 'Bearer' }
    });
  }
};

export const authenticate = authMiddleware;