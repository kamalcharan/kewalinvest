import { Request, Response, NextFunction } from 'express';
import { verifyToken, JWTPayload } from '../utils/jwt.utils';

export interface AuthenticatedRequest extends Request {
  user?: JWTPayload & {
    id: number;
    user_id: number;
    tenant_id: number;
    email: string;
    environment_preference?: string;
  };
}

export const authMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
 
):

 Promise<void> => {
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

    req.user = {
      ...payload,
      id: payload.user_id,
    };

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(401).json({ 
      detail: 'Invalid or expired token',
      headers: { 'WWW-Authenticate': 'Bearer' }
    });
  }
};

export const authenticate = authMiddleware;