// backend/src/controllers/logs.controller.ts

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

      // Convert hours to integer
      const hoursNum = parseInt(hours as string) || 24;

      let whereConditions = [`created_at >= NOW() - make_interval(hours => $1)`];
      let queryParams: any[] = [hoursNum];
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
        SELECT 
          id,
          level,
          source,
          message,
          context,
          user_id,
          tenant_id,
          metadata,
          stack_trace,
          created_at,
          COUNT(*) OVER() as total_count
        FROM t_system_logs 
        WHERE ${whereConditions.join(' AND ')}
        ORDER BY created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;

      queryParams.push(Number(pageSize), offset);
      
      console.log('📋 Logs Query:', logsQuery);
      console.log('📋 Query Params:', queryParams);
      
      const result = await pool.query(logsQuery, queryParams);
      
      const logs = result.rows;
      const total = logs.length > 0 ? parseInt(logs[0].total_count) : 0;

      console.log(`📋 Found ${logs.length} logs, total: ${total}`);

      res.json({
        success: true,
        data: {
          logs: logs.map(({total_count, ...log}) => ({
            ...log,
            metadata: typeof log.metadata === 'string' ? JSON.parse(log.metadata) : log.metadata
          })),
          total,
          page: Number(page),
          pageSize: Number(pageSize)
        }
      });
    } catch (error: any) {
      console.error('❌ Error fetching logs:', error);
      console.error('❌ Error stack:', error.stack);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch logs',
        details: error.message // Include error details for debugging
      });
    }
  };

  getLogStats = async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const statsQuery = `
        SELECT 
          COUNT(*) FILTER (WHERE level = 'error' AND created_at >= NOW() - make_interval(hours => 24)) as errors_24h,
          COUNT(*) FILTER (WHERE level = 'warn' AND created_at >= NOW() - make_interval(hours => 24)) as warnings_24h,
          COUNT(*) FILTER (WHERE level = 'error' AND created_at >= NOW() - make_interval(days => 7)) as errors_7d,
          COUNT(*) FILTER (WHERE created_at >= NOW() - make_interval(hours => 1)) as logs_1h
        FROM t_system_logs
      `;
      
      console.log('📊 Fetching log statistics...');
      
      const result = await pool.query(statsQuery);
      const stats = result.rows[0];

      console.log('📊 Stats:', stats);

      res.json({
        success: true,
        data: {
          errors24h: parseInt(stats.errors_24h) || 0,
          warnings24h: parseInt(stats.warnings_24h) || 0,
          errors7d: parseInt(stats.errors_7d) || 0,
          logs1h: parseInt(stats.logs_1h) || 0
        }
      });
    } catch (error: any) {
      console.error('❌ Error fetching log statistics:', error);
      console.error('❌ Error stack:', error.stack);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch log statistics',
        details: error.message
      });
    }
  };

  clearOldLogs = async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      // Keep only last 30 days
      const result = await pool.query(`
        DELETE FROM t_system_logs 
        WHERE created_at < NOW() - make_interval(days => 30)
      `);

      console.log(`🗑️ Cleaned up ${result.rowCount} old log entries`);

      res.json({
        success: true,
        message: `Cleaned up ${result.rowCount} old log entries`
      });
    } catch (error: any) {
      console.error('❌ Error cleaning up logs:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to clean up logs',
        details: error.message
      });
    }
  };

  logFrontendError = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { level, source, message, context, metadata, stack_trace } = req.body;

      console.log('📝 Logging frontend error:', { level, source, message, context });

      await pool.query(`
        INSERT INTO t_system_logs (level, source, message, context, user_id, tenant_id, metadata, stack_trace)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
        level || 'error',
        source || 'frontend',
        message,
        context || null,
        req.user?.user_id || null,
        req.user?.tenant_id || null,
        JSON.stringify(metadata || {}),
        stack_trace || null
      ]);

      res.json({ success: true, message: 'Error logged successfully' });
    } catch (error: any) {
      console.error('❌ Error logging frontend error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to log error',
        details: error.message
      });
    }
  };
}