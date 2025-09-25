// backend/src/utils/jwt.utils.ts
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

export interface JWTPayload {
  user_id: number;
  tenant_id: number;
  email: string;
  exp?: number;
  iat?: number;
}

export const createAccessToken = (data: Omit<JWTPayload, 'exp' | 'iat'>): string => {
  return jwt.sign(data, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN as any  // Type assertion to bypass the type issue
  });
};

export const verifyToken = (token: string): JWTPayload => {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
};