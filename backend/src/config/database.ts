// backend/src/config/database.ts
import { Pool, PoolClient } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// Create PostgreSQL connection pool

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://kewal_app_user:app123@localhost:5432/kewalinvest',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test database connection
export const testConnection = async (): Promise<void> => {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    console.log('✅ Database connected successfully at:', result.rows[0].now);
    
    // Check if tables exist
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('t_tenants', 't_users', 't_chat_sessions', 't_chat_messages')
    `);
    console.log('✅ Found tables:', tablesResult.rows.map((r: any) => r.table_name).join(', '));
    
    client.release();
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    throw error;
  }
};

// Set tenant context for RLS
export const setTenantContext = async (client: PoolClient, tenantId: number, environment: string = 'live'): Promise<void> => {
  await client.query(`SET app.current_tenant_id = $1`, [tenantId.toString()]);
  await client.query(`SET app.current_environment = $1`, [environment]);
};

// Helper to get environment filter
export const getEnvironmentFilter = (environment: string): boolean => {
  return environment === 'live';
};  