// frontend/src/hooks/useSystemStatus.ts
// Hooks for fetching system status, migrations, and health check data

import { useQuery } from '@tanstack/react-query';
import api from '../services/api.service';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface Migration {
  version: string;
  filename: string;
  name: string | null;
  description: string | null;
  applied_at: string;
  applied_by: string | null;
  execution_time_ms: number | null;
  status: 'success' | 'failed' | 'rolled_back';
  error_preview: string | null;
}

export interface MigrationStats {
  total: number;
  success: number;
  failed: number;
  last_migration_at: string | null;
}

export interface MigrationsResponse {
  tracking_enabled: boolean;
  message?: string;
  current_version: string | null;
  stats?: MigrationStats;
  migrations: Migration[];
}

export interface TableInfo {
  table_name: string;
  column_count: number;
}

export interface DatabaseStatusResponse {
  database_size: string;
  migration_version: string | null;
  migration_tracking_enabled: boolean;
  tables: {
    count: number;
    list: TableInfo[];
  };
  tenants: {
    total: number;
    active: number;
  };
  users: {
    total: number;
    active: number;
  };
  timestamp: string;
}

export interface TenantDataStatus {
  tenant_id: number;
  tenant_code: string;
  tenant_name: string;
  is_admin: boolean;
  is_active: boolean;
  created_at: string;
  bookmark_reasons_count: number;
  job_configs_count: number;
  snapshot_configs_count: number;
  user_count: number;
  customer_count: number;
  data_status: 'initialized' | 'partial' | 'not_initialized';
}

export interface TenantDataStatusResponse {
  summary: {
    total_tenants: number;
    initialized: number;
    partial: number;
    not_initialized: number;
  };
  tenants: TenantDataStatus[];
}

export interface HealthCheckTable {
  exists: boolean;
  row_count: number;
}

export interface HealthCheckResponse {
  overall_status: 'ok' | 'warning' | 'error';
  checks: {
    database_connection: { status: string; message?: string };
    required_tables: Record<string, HealthCheckTable>;
    job_types: {
      status: string;
      count: number;
      required: number;
      message?: string | null;
    };
    transaction_types: {
      status: string;
      count: number;
      required: number;
    };
  };
  timestamp: string;
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

const fetchMigrations = async (): Promise<MigrationsResponse> => {
  const response = await api.get('/system/migrations');
  return response.data;
};

const fetchDatabaseStatus = async (): Promise<DatabaseStatusResponse> => {
  const response = await api.get('/system/database-status');
  return response.data;
};

const fetchTenantDataStatus = async (): Promise<TenantDataStatusResponse> => {
  const response = await api.get('/system/tenant-data-status');
  return response.data;
};

const fetchHealthCheck = async (): Promise<HealthCheckResponse> => {
  const response = await api.get('/system/health-check');
  return response.data;
};

// ============================================================================
// REACT QUERY HOOKS
// ============================================================================

export const useMigrations = () => {
  return useQuery({
    queryKey: ['system', 'migrations'],
    queryFn: fetchMigrations,
    staleTime: 30 * 1000, // 30 seconds
    retry: 1
  });
};

export const useDatabaseStatus = () => {
  return useQuery({
    queryKey: ['system', 'database-status'],
    queryFn: fetchDatabaseStatus,
    staleTime: 60 * 1000, // 1 minute
    retry: 1
  });
};

export const useTenantDataStatus = () => {
  return useQuery({
    queryKey: ['system', 'tenant-data-status'],
    queryFn: fetchTenantDataStatus,
    staleTime: 60 * 1000, // 1 minute
    retry: 1
  });
};

export const useHealthCheck = () => {
  return useQuery({
    queryKey: ['system', 'health-check'],
    queryFn: fetchHealthCheck,
    staleTime: 30 * 1000, // 30 seconds
    retry: 1
  });
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

export const getStatusColor = (status: string): string => {
  switch (status) {
    case 'ok':
    case 'success':
    case 'initialized':
      return '#10B981'; // green
    case 'warning':
    case 'partial':
      return '#F59E0B'; // amber
    case 'error':
    case 'failed':
    case 'not_initialized':
      return '#EF4444'; // red
    default:
      return '#6B7280'; // gray
  }
};

export const getStatusIcon = (status: string): string => {
  switch (status) {
    case 'ok':
    case 'success':
    case 'initialized':
      return '✓';
    case 'warning':
    case 'partial':
      return '!';
    case 'error':
    case 'failed':
    case 'not_initialized':
      return '✗';
    default:
      return '?';
  }
};

export const formatMigrationDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};
