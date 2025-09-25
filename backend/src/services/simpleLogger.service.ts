import { pool } from '../config/database';

export class SimpleLogger {
  static async log(
    level: 'error' | 'warn' | 'info',
    source: string,
    message: string,
    context?: string,
    metadata?: any,
    userId?: number,
    tenantId?: number,
    stack?: string
  ) {
    try {
      // Always log to console for immediate visibility (preserves existing behavior)
      console.log(`[${level.toUpperCase()}] ${source}: ${message}`, metadata || '');
      
      // Store in database for UI access
      await pool.query(`
        INSERT INTO t_system_logs (level, source, message, context, user_id, tenant_id, metadata, stack_trace)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [level, source, message, context, userId, tenantId, JSON.stringify(metadata), stack]);
    } catch (err) {
      // Don't let logging break the app - fallback to console only
      console.error('Database logging failed:', err);
      console.log(`[${level.toUpperCase()}] ${source}: ${message}`, metadata || '');
    }
  }

  static error(source: string, message: string, context?: string, metadata?: any, userId?: number, tenantId?: number, stack?: string) {
    this.log('error', source, message, context, metadata, userId, tenantId, stack);
  }

  static warn(source: string, message: string, context?: string, metadata?: any, userId?: number, tenantId?: number) {
    this.log('warn', source, message, context, metadata, userId, tenantId);
  }

  static info(source: string, message: string, context?: string, metadata?: any, userId?: number, tenantId?: number) {
    this.log('info', source, message, context, metadata, userId, tenantId);
  }
}