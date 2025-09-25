import { Request, Response } from 'express';
import { pool } from '../config/database';

interface AuthenticatedRequest extends Request {
  user?: {
    user_id: number;
    tenant_id: number;
  };
  environment?: 'live' | 'test';
}

export class LogsController {
  getLogs = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { 
        level, 
        source, 
        page = 1, 
        pageSize = 50,
        hours = 24 // Default last 24 hours
      } = req.query;

      let whereConditions = ['created_at >= NOW() - INTERVAL $1 hours'];
      let queryParams: any[] = [hours];
      let paramIndex = 2;

      if (level) {
        whereConditions.push(`level = $${paramIndex}`);
        queryParams.push(level);
        paramIndex++;
      }

      if (source) {
        whereConditions.push(`source = $${paramIndex}`);
        queryParams.push(source);
        paramIndex++;
      }

      const offset = (Number(page) - 1) * Number(pageSize);

      const logsQuery = `
        SELECT *, COUNT(*) OVER() as total_count
        FROM t_system_logs 
        WHERE ${whereConditions.join(' AND ')}
        ORDER BY created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;

      queryParams.push(Number(pageSize), offset);
      const result = await pool.query(logsQuery, queryParams);
      
      const logs = result.rows;
      const total = logs.length > 0 ? parseInt(logs[0].total_count) : 0;

      res.json({
        success: true,
        data: {
          logs: logs.map(({total_count, ...log}) => log), // Remove total_count from each log
          total,
          page: Number(page),
          pageSize: Number(pageSize)
        }
      });
    } catch (error: any) {
      console.error('Error fetching logs:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch logs'
      });
    }
  };

  getLogStats = async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const statsQuery = `
        SELECT 
          COUNT(*) FILTER (WHERE level = 'error' AND created_at >= NOW() - INTERVAL '24 hours') as errors_24h,
          COUNT(*) FILTER (WHERE level = 'warn' AND created_at >= NOW() - INTERVAL '24 hours') as warnings_24h,
          COUNT(*) FILTER (WHERE level = 'error' AND created_at >= NOW() - INTERVAL '7 days') as errors_7d,
          COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '1 hour') as logs_1h
        FROM t_system_logs
      `;
      
      const result = await pool.query(statsQuery);
      const stats = result.rows[0];

      res.json({
        success: true,
        data: {
          errors24h: parseInt(stats.errors_24h),
          warnings24h: parseInt(stats.warnings_24h),
          errors7d: parseInt(stats.errors_7d),
          logs1h: parseInt(stats.logs_1h)
        }
      });
    } catch (error: any) {
      console.error('Error fetching log statistics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch log statistics'
      });
    }
  };

  clearOldLogs = async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      // Keep only last 30 days
      const result = await pool.query(`
        DELETE FROM t_system_logs 
        WHERE created_at < NOW() - INTERVAL '30 days'
      `);

      res.json({
        success: true,
        message: `Cleaned up ${result.rowCount} old log entries`
      });
    } catch (error: any) {
      console.error('Error cleaning up logs:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to clean up logs'
      });
    }
  };

  logFrontendError = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { level, source, message, context, metadata, stack_trace } = req.body;

      await pool.query(`
        INSERT INTO t_system_logs (level, source, message, context, user_id, tenant_id, metadata, stack_trace)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
        level || 'error',
        source || 'frontend',
        message,
        context,
        req.user?.user_id,
        req.user?.tenant_id,
        JSON.stringify(metadata),
        stack_trace
      ]);

      res.json({ success: true, message: 'Error logged successfully' });
    } catch (error: any) {
      console.error('Error logging frontend error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to log error'
      });
    }
  };
}