// backend/src/config/database.ts
import { Pool, PoolClient } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

/**
 * PostgreSQL Connection Pool Configuration
 *
 * Connection settings optimized for production use with proper timeout handling
 * for both regular operations and long-running import processes.
 */
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://kewal_app_user:app123@localhost:5432/kewalinvest',

  // Connection Pool Settings
  max: 20,                         // Maximum number of clients in the pool
  min: 2,                          // Minimum number of clients in the pool
  idleTimeoutMillis: 30000,        // 30 seconds - how long a client can be idle before being removed
  connectionTimeoutMillis: 10000,  // 10 seconds - how long to wait for a connection

  // Statement Timeout
  statement_timeout: 0,            // No timeout - managed per operation for flexibility

  // Pool Settings
  allowExitOnIdle: true            // Allow process to exit if all clients are idle
});

// Handle pool errors - prevents app crash on connection issues
pool.on('error', (err: Error) => {
  console.error('Unexpected database pool error:', err.message);
  // Don't exit - let the pool recover
});

// Log when a client is acquired (debug)
pool.on('connect', () => {
  console.log('New database client connected');
});

/**
 * Test database connection and verify core tables exist
 */
export const testConnection = async (): Promise<void> => {
  try {
    const client = await pool.connect();
    
    // Test connection
    const result = await client.query('SELECT NOW()');
    console.log('✅ Database connected successfully at:', result.rows[0].now);
    
    // Verify core tables exist
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('t_tenants', 't_users', 't_chat_sessions', 't_chat_messages')
      ORDER BY table_name
    `);
    
    const foundTables = tablesResult.rows.map((r: any) => r.table_name);
    console.log('✅ Found tables:', foundTables.join(', '));
    
    if (foundTables.length === 0) {
      console.warn('⚠️  Warning: No core tables found. Database may need initialization.');
    }
    
    client.release();
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    throw error;
  }
};

/**
 * Set tenant context for Row-Level Security (RLS)
 * 
 * @param client - PostgreSQL client
 * @param tenantId - Tenant ID to set in context
 * @param environment - Environment ('live' or 'test')
 */
export const setTenantContext = async (
  client: PoolClient, 
  tenantId: number, 
  environment: string = 'live'
): Promise<void> => {
  try {
    await client.query(`SET app.current_tenant_id = $1`, [tenantId.toString()]);
    await client.query(`SET app.current_environment = $1`, [environment]);
  } catch (error) {
    console.error('Failed to set tenant context:', error);
    throw error;
  }
};

/**
 * Set statement timeout for specific operations
 * 
 * @param client - PostgreSQL client
 * @param timeoutMs - Timeout in milliseconds (0 = no timeout)
 * 
 * @example
 * await setStatementTimeout(client, 30000); // 30 second timeout
 */
export const setStatementTimeout = async (
  client: PoolClient, 
  timeoutMs: number
): Promise<void> => {
  try {
    await client.query(`SET statement_timeout = ${timeoutMs}`);
  } catch (error) {
    console.error('Failed to set statement timeout:', error);
    throw error;
  }
};

/**
 * Disable statement timeout for long-running operations
 * Use this for import processes or other operations that may take extended time
 * 
 * @param client - PostgreSQL client
 * 
 * @example
 * await disableStatementTimeout(client);
 * // ... long-running operation
 * await resetStatementTimeout(client);
 */
export const disableStatementTimeout = async (client: PoolClient): Promise<void> => {
  try {
    await client.query('SET statement_timeout = 0');
  } catch (error) {
    console.error('Failed to disable statement timeout:', error);
    throw error;
  }
};

/**
 * Reset statement timeout to default (or pool setting)
 * Always call this after completing long-running operations
 * 
 * @param client - PostgreSQL client
 */
export const resetStatementTimeout = async (client: PoolClient): Promise<void> => {
  try {
    await client.query('SET statement_timeout = DEFAULT');
  } catch (error) {
    console.warn('Failed to reset statement timeout:', error);
    // Don't throw - this is a cleanup operation
  }
};

/**
 * Execute a query with a specific timeout
 * Automatically resets timeout after query completes
 * 
 * @param client - PostgreSQL client
 * @param query - SQL query string
 * @param params - Query parameters
 * @param timeoutMs - Timeout in milliseconds
 * @returns Query result
 * 
 * @example
 * const result = await executeWithTimeout(
 *   client,
 *   'SELECT * FROM customers WHERE id = $1',
 *   [customerId],
 *   5000 // 5 second timeout
 * );
 */
export const executeWithTimeout = async (
  client: PoolClient,
  query: string,
  params: any[] = [],
  timeoutMs: number = 30000
): Promise<any> => {
  try {
    await setStatementTimeout(client, timeoutMs);
    const result = await client.query(query, params);
    return result;
  } finally {
    await resetStatementTimeout(client);
  }
};

/**
 * Get environment filter value for queries
 * 
 * @param environment - Environment string ('live' or 'test')
 * @returns Boolean value for is_live column
 */
export const getEnvironmentFilter = (environment: string): boolean => {
  return environment === 'live';
};

/**
 * Gracefully shutdown the database pool
 * Call this when shutting down the application
 */
export const closePool = async (): Promise<void> => {
  try {
    await pool.end();
    console.log('✅ Database pool closed successfully');
  } catch (error) {
    console.error('❌ Error closing database pool:', error);
    throw error;
  }
};

/**
 * Get pool statistics for monitoring
 * 
 * @returns Pool statistics
 */
export const getPoolStats = () => {
  return {
    totalCount: pool.totalCount,
    idleCount: pool.idleCount,
    waitingCount: pool.waitingCount
  };
};

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing database pool...');
  await closePool();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, closing database pool...');
  await closePool();
  process.exit(0);
});

// Export pool as default
export default pool;