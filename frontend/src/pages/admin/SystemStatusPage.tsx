// frontend/src/pages/admin/SystemStatusPage.tsx
// System Status Page - Shows migration status, database info, and health checks

import React, { useState } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import {
  useMigrations,
  useDatabaseStatus,
  useTenantDataStatus,
  useHealthCheck,
  getStatusColor,
  getStatusIcon,
  formatMigrationDate,
  Migration
} from '../../hooks/useSystemStatus';

type TabType = 'overview' | 'migrations' | 'tenants' | 'health';

const SystemStatusPage: React.FC = () => {
  const { theme, isDarkMode } = useTheme();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;

  const [activeTab, setActiveTab] = useState<TabType>('overview');

  const { data: migrations, isLoading: migrationsLoading, refetch: refetchMigrations } = useMigrations();
  const { data: dbStatus, isLoading: dbLoading, refetch: refetchDb } = useDatabaseStatus();
  const { data: tenantStatus, isLoading: tenantsLoading, refetch: refetchTenants } = useTenantDataStatus();
  const { data: healthCheck, isLoading: healthLoading, refetch: refetchHealth } = useHealthCheck();

  const isLoading = migrationsLoading || dbLoading || tenantsLoading || healthLoading;

  const handleRefresh = () => {
    refetchMigrations();
    refetchDb();
    refetchTenants();
    refetchHealth();
  };

  // Icons
  const RefreshIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="23,4 23,10 17,10" />
      <polyline points="1,20 1,14 7,14" />
      <path d="m20.49,9a9,9 0 1 1-2.13-5.36l4.64,4.36" />
    </svg>
  );

  const DatabaseIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
      <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
    </svg>
  );

  const CheckCircleIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22,4 12,14.01 9,11.01" />
    </svg>
  );

  const AlertTriangleIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="m21.73,18l-8-14a2,2 0 0 0-3.48,0l-8,14A2,2 0 0 0,4,21H20a2,2 0 0 0,1.73-3Z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );

  const XCircleIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <line x1="15" y1="9" x2="9" y2="15" />
      <line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  );

  const renderStatusBadge = (status: string) => {
    const color = getStatusColor(status);
    const icon = getStatusIcon(status);
    return (
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '4px 12px',
        backgroundColor: `${color}20`,
        color: color,
        borderRadius: '20px',
        fontSize: '12px',
        fontWeight: '600',
        textTransform: 'uppercase'
      }}>
        {icon} {status.replace('_', ' ')}
      </span>
    );
  };

  const tabStyle = (tab: TabType) => ({
    padding: '12px 24px',
    backgroundColor: activeTab === tab ? colors.brand.primary : 'transparent',
    color: activeTab === tab ? 'white' : colors.utility.secondaryText,
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'all 0.2s ease'
  });

  // Overview Tab
  const renderOverview = () => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
      {/* Database Version Card */}
      <div style={{
        backgroundColor: colors.utility.secondaryBackground,
        borderRadius: '12px',
        padding: '24px',
        border: `1px solid ${colors.utility.primaryText}10`
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            backgroundColor: `${colors.brand.primary}15`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: colors.brand.primary
          }}>
            <DatabaseIcon />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '16px', color: colors.utility.primaryText }}>Database Version</h3>
            <p style={{ margin: 0, fontSize: '13px', color: colors.utility.secondaryText }}>Current migration level</p>
          </div>
        </div>
        <div style={{ fontSize: '36px', fontWeight: '700', color: colors.brand.primary, marginBottom: '8px' }}>
          v{migrations?.current_version || '---'}
        </div>
        {migrations?.tracking_enabled ? (
          <p style={{ margin: 0, fontSize: '13px', color: colors.semantic.success }}>
            {getStatusIcon('ok')} Migration tracking enabled
          </p>
        ) : (
          <p style={{ margin: 0, fontSize: '13px', color: colors.semantic.warning }}>
            {getStatusIcon('warning')} Migration tracking not enabled
          </p>
        )}
      </div>

      {/* Health Status Card */}
      <div style={{
        backgroundColor: colors.utility.secondaryBackground,
        borderRadius: '12px',
        padding: '24px',
        border: `1px solid ${colors.utility.primaryText}10`
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            backgroundColor: `${getStatusColor(healthCheck?.overall_status || 'ok')}15`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: getStatusColor(healthCheck?.overall_status || 'ok')
          }}>
            {healthCheck?.overall_status === 'ok' ? <CheckCircleIcon /> :
             healthCheck?.overall_status === 'warning' ? <AlertTriangleIcon /> : <XCircleIcon />}
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '16px', color: colors.utility.primaryText }}>System Health</h3>
            <p style={{ margin: 0, fontSize: '13px', color: colors.utility.secondaryText }}>Overall status</p>
          </div>
        </div>
        <div style={{ marginBottom: '12px' }}>
          {renderStatusBadge(healthCheck?.overall_status || 'unknown')}
        </div>
        <div style={{ fontSize: '13px', color: colors.utility.secondaryText }}>
          <div>Job Types: {healthCheck?.checks?.job_types?.count || 0}/{healthCheck?.checks?.job_types?.required || 5}</div>
          <div>Transaction Types: {healthCheck?.checks?.transaction_types?.count || 0}/{healthCheck?.checks?.transaction_types?.required || 11}</div>
        </div>
      </div>

      {/* Database Size Card */}
      <div style={{
        backgroundColor: colors.utility.secondaryBackground,
        borderRadius: '12px',
        padding: '24px',
        border: `1px solid ${colors.utility.primaryText}10`
      }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', color: colors.utility.primaryText }}>Database Info</h3>
        <div style={{ display: 'grid', gap: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: colors.utility.secondaryText }}>Size</span>
            <span style={{ fontWeight: '600', color: colors.utility.primaryText }}>{dbStatus?.database_size || '---'}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: colors.utility.secondaryText }}>Tables</span>
            <span style={{ fontWeight: '600', color: colors.utility.primaryText }}>{dbStatus?.tables?.count || 0}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: colors.utility.secondaryText }}>Tenants</span>
            <span style={{ fontWeight: '600', color: colors.utility.primaryText }}>
              {dbStatus?.tenants?.active || 0} / {dbStatus?.tenants?.total || 0}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: colors.utility.secondaryText }}>Users</span>
            <span style={{ fontWeight: '600', color: colors.utility.primaryText }}>
              {dbStatus?.users?.active || 0} / {dbStatus?.users?.total || 0}
            </span>
          </div>
        </div>
      </div>

      {/* Tenant Status Summary Card */}
      <div style={{
        backgroundColor: colors.utility.secondaryBackground,
        borderRadius: '12px',
        padding: '24px',
        border: `1px solid ${colors.utility.primaryText}10`
      }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', color: colors.utility.primaryText }}>Tenant Data Status</h3>
        <div style={{ display: 'grid', gap: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: colors.utility.secondaryText }}>Initialized</span>
            <span style={{
              padding: '4px 12px',
              backgroundColor: `${colors.semantic.success}20`,
              color: colors.semantic.success,
              borderRadius: '12px',
              fontSize: '13px',
              fontWeight: '600'
            }}>
              {tenantStatus?.summary?.initialized || 0}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: colors.utility.secondaryText }}>Partial</span>
            <span style={{
              padding: '4px 12px',
              backgroundColor: '#F59E0B20',
              color: '#F59E0B',
              borderRadius: '12px',
              fontSize: '13px',
              fontWeight: '600'
            }}>
              {tenantStatus?.summary?.partial || 0}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: colors.utility.secondaryText }}>Not Initialized</span>
            <span style={{
              padding: '4px 12px',
              backgroundColor: `${colors.semantic.error}20`,
              color: colors.semantic.error,
              borderRadius: '12px',
              fontSize: '13px',
              fontWeight: '600'
            }}>
              {tenantStatus?.summary?.not_initialized || 0}
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  // Migrations Tab
  const renderMigrations = () => (
    <div style={{
      backgroundColor: colors.utility.secondaryBackground,
      borderRadius: '12px',
      overflow: 'hidden',
      border: `1px solid ${colors.utility.primaryText}10`
    }}>
      {!migrations?.tracking_enabled ? (
        <div style={{ padding: '60px', textAlign: 'center', color: colors.utility.secondaryText }}>
          <AlertTriangleIcon />
          <h3 style={{ margin: '16px 0 8px', color: colors.utility.primaryText }}>Migration Tracking Not Enabled</h3>
          <p style={{ margin: 0 }}>{migrations?.message || 'Run 00_migrations_tracking.sql to enable tracking.'}</p>
        </div>
      ) : (
        <>
          {/* Stats Header */}
          <div style={{
            padding: '20px',
            borderBottom: `1px solid ${colors.utility.primaryText}10`,
            display: 'flex',
            gap: '32px'
          }}>
            <div>
              <div style={{ fontSize: '24px', fontWeight: '700', color: colors.utility.primaryText }}>
                {migrations?.stats?.total || 0}
              </div>
              <div style={{ fontSize: '13px', color: colors.utility.secondaryText }}>Total Migrations</div>
            </div>
            <div>
              <div style={{ fontSize: '24px', fontWeight: '700', color: colors.semantic.success }}>
                {migrations?.stats?.success || 0}
              </div>
              <div style={{ fontSize: '13px', color: colors.utility.secondaryText }}>Successful</div>
            </div>
            <div>
              <div style={{ fontSize: '24px', fontWeight: '700', color: colors.semantic.error }}>
                {migrations?.stats?.failed || 0}
              </div>
              <div style={{ fontSize: '13px', color: colors.utility.secondaryText }}>Failed</div>
            </div>
            {migrations?.stats?.last_migration_at && (
              <div style={{ marginLeft: 'auto' }}>
                <div style={{ fontSize: '14px', fontWeight: '600', color: colors.utility.primaryText }}>
                  {formatMigrationDate(migrations.stats.last_migration_at)}
                </div>
                <div style={{ fontSize: '13px', color: colors.utility.secondaryText }}>Last Migration</div>
              </div>
            )}
          </div>

          {/* Migrations List */}
          <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
            {migrations?.migrations?.map((migration: Migration, index: number) => (
              <div
                key={migration.version}
                style={{
                  padding: '16px 20px',
                  borderBottom: index < (migrations.migrations?.length || 0) - 1 ? `1px solid ${colors.utility.primaryText}08` : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px'
                }}
              >
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '8px',
                  backgroundColor: `${getStatusColor(migration.status)}15`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: getStatusColor(migration.status),
                  fontWeight: '700',
                  fontSize: '14px'
                }}>
                  {migration.version}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '500', color: colors.utility.primaryText, marginBottom: '4px' }}>
                    {migration.filename}
                  </div>
                  <div style={{ fontSize: '13px', color: colors.utility.secondaryText }}>
                    {migration.name || 'No description'}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  {renderStatusBadge(migration.status)}
                  <div style={{ fontSize: '12px', color: colors.utility.secondaryText, marginTop: '4px' }}>
                    {formatMigrationDate(migration.applied_at)}
                    {migration.execution_time_ms && ` • ${migration.execution_time_ms}ms`}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );

  // Tenants Tab
  const renderTenants = () => (
    <div style={{
      backgroundColor: colors.utility.secondaryBackground,
      borderRadius: '12px',
      overflow: 'hidden',
      border: `1px solid ${colors.utility.primaryText}10`
    }}>
      {/* Header */}
      <div style={{
        padding: '16px 20px',
        borderBottom: `1px solid ${colors.utility.primaryText}10`,
        display: 'grid',
        gridTemplateColumns: '1fr 100px 100px 100px 100px 120px',
        gap: '12px',
        fontSize: '12px',
        fontWeight: '600',
        color: colors.utility.secondaryText,
        textTransform: 'uppercase'
      }}>
        <div>Tenant</div>
        <div style={{ textAlign: 'center' }}>Bookmarks</div>
        <div style={{ textAlign: 'center' }}>Jobs</div>
        <div style={{ textAlign: 'center' }}>Snapshots</div>
        <div style={{ textAlign: 'center' }}>Customers</div>
        <div style={{ textAlign: 'center' }}>Status</div>
      </div>

      {/* Tenant Rows */}
      <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
        {tenantStatus?.tenants?.map((tenant, index) => (
          <div
            key={tenant.tenant_id}
            style={{
              padding: '14px 20px',
              borderBottom: index < (tenantStatus.tenants?.length || 0) - 1 ? `1px solid ${colors.utility.primaryText}08` : 'none',
              display: 'grid',
              gridTemplateColumns: '1fr 100px 100px 100px 100px 120px',
              gap: '12px',
              alignItems: 'center'
            }}
          >
            <div>
              <div style={{ fontWeight: '500', color: colors.utility.primaryText }}>
                {tenant.tenant_name}
                {tenant.is_admin && (
                  <span style={{
                    marginLeft: '8px',
                    padding: '2px 6px',
                    backgroundColor: `${colors.brand.primary}20`,
                    color: colors.brand.primary,
                    borderRadius: '4px',
                    fontSize: '10px',
                    fontWeight: '600'
                  }}>
                    ADMIN
                  </span>
                )}
              </div>
              <div style={{ fontSize: '12px', color: colors.utility.secondaryText }}>{tenant.tenant_code}</div>
            </div>
            <div style={{ textAlign: 'center', fontWeight: '500', color: colors.utility.primaryText }}>
              {tenant.bookmark_reasons_count}
            </div>
            <div style={{ textAlign: 'center', fontWeight: '500', color: colors.utility.primaryText }}>
              {tenant.job_configs_count}
            </div>
            <div style={{ textAlign: 'center', fontWeight: '500', color: colors.utility.primaryText }}>
              {tenant.snapshot_configs_count}
            </div>
            <div style={{ textAlign: 'center', fontWeight: '500', color: colors.utility.primaryText }}>
              {tenant.customer_count}
            </div>
            <div style={{ textAlign: 'center' }}>
              {renderStatusBadge(tenant.data_status)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // Health Tab
  const renderHealth = () => (
    <div style={{ display: 'grid', gap: '20px' }}>
      {/* Overall Status */}
      <div style={{
        backgroundColor: colors.utility.secondaryBackground,
        borderRadius: '12px',
        padding: '24px',
        border: `1px solid ${colors.utility.primaryText}10`,
        display: 'flex',
        alignItems: 'center',
        gap: '20px'
      }}>
        <div style={{
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          backgroundColor: `${getStatusColor(healthCheck?.overall_status || 'ok')}15`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: getStatusColor(healthCheck?.overall_status || 'ok')
        }}>
          {healthCheck?.overall_status === 'ok' ? <CheckCircleIcon /> :
           healthCheck?.overall_status === 'warning' ? <AlertTriangleIcon /> : <XCircleIcon />}
        </div>
        <div>
          <h2 style={{ margin: '0 0 4px 0', fontSize: '24px', color: colors.utility.primaryText }}>
            System {healthCheck?.overall_status === 'ok' ? 'Healthy' : healthCheck?.overall_status === 'warning' ? 'Needs Attention' : 'Has Issues'}
          </h2>
          <p style={{ margin: 0, fontSize: '14px', color: colors.utility.secondaryText }}>
            Last checked: {healthCheck?.timestamp ? formatMigrationDate(healthCheck.timestamp) : '---'}
          </p>
        </div>
      </div>

      {/* Required Tables */}
      <div style={{
        backgroundColor: colors.utility.secondaryBackground,
        borderRadius: '12px',
        padding: '24px',
        border: `1px solid ${colors.utility.primaryText}10`
      }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', color: colors.utility.primaryText }}>Required Tables</h3>
        <div style={{ display: 'grid', gap: '12px' }}>
          {healthCheck?.checks?.required_tables && Object.entries(healthCheck.checks.required_tables).map(([table, info]) => (
            <div key={table} style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '12px 16px',
              backgroundColor: colors.utility.primaryBackground,
              borderRadius: '8px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ color: info.exists ? colors.semantic.success : colors.semantic.error }}>
                  {info.exists ? '✓' : '✗'}
                </span>
                <code style={{ fontSize: '13px', color: colors.utility.primaryText }}>{table}</code>
              </div>
              <span style={{ fontSize: '13px', color: colors.utility.secondaryText }}>
                {info.row_count} rows
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Critical Data Checks */}
      <div style={{
        backgroundColor: colors.utility.secondaryBackground,
        borderRadius: '12px',
        padding: '24px',
        border: `1px solid ${colors.utility.primaryText}10`
      }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', color: colors.utility.primaryText }}>Critical Data Checks</h3>
        <div style={{ display: 'grid', gap: '12px' }}>
          {/* Job Types */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '12px 16px',
            backgroundColor: colors.utility.primaryBackground,
            borderRadius: '8px'
          }}>
            <div>
              <div style={{ fontWeight: '500', color: colors.utility.primaryText }}>m_job_types</div>
              <div style={{ fontSize: '12px', color: colors.utility.secondaryText }}>
                Required for signup to work
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              {renderStatusBadge(healthCheck?.checks?.job_types?.status || 'unknown')}
              <div style={{ fontSize: '12px', color: colors.utility.secondaryText, marginTop: '4px' }}>
                {healthCheck?.checks?.job_types?.count || 0} / {healthCheck?.checks?.job_types?.required || 5} required
              </div>
            </div>
          </div>

          {/* Transaction Types */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '12px 16px',
            backgroundColor: colors.utility.primaryBackground,
            borderRadius: '8px'
          }}>
            <div>
              <div style={{ fontWeight: '500', color: colors.utility.primaryText }}>m_transaction_types</div>
              <div style={{ fontSize: '12px', color: colors.utility.secondaryText }}>
                Required for transaction imports
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              {renderStatusBadge(healthCheck?.checks?.transaction_types?.status || 'unknown')}
              <div style={{ fontSize: '12px', color: colors.utility.secondaryText, marginTop: '4px' }}>
                {healthCheck?.checks?.transaction_types?.count || 0} / {healthCheck?.checks?.transaction_types?.required || 11} required
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: colors.utility.primaryBackground,
      padding: '24px'
    }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px'
        }}>
          <div>
            <h1 style={{
              fontSize: '28px',
              fontWeight: '700',
              color: colors.utility.primaryText,
              margin: '0 0 4px 0'
            }}>
              System Status
            </h1>
            <p style={{
              fontSize: '14px',
              color: colors.utility.secondaryText,
              margin: 0
            }}>
              Database migrations, tenant data, and system health
            </p>
          </div>

          <button
            onClick={handleRefresh}
            disabled={isLoading}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 16px',
              backgroundColor: colors.brand.primary,
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              opacity: isLoading ? 0.6 : 1,
              fontWeight: '500'
            }}
          >
            <RefreshIcon />
            {isLoading ? 'Loading...' : 'Refresh'}
          </button>
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex',
          gap: '8px',
          marginBottom: '24px',
          backgroundColor: colors.utility.secondaryBackground,
          padding: '8px',
          borderRadius: '12px',
          width: 'fit-content'
        }}>
          <button style={tabStyle('overview')} onClick={() => setActiveTab('overview')}>Overview</button>
          <button style={tabStyle('migrations')} onClick={() => setActiveTab('migrations')}>Migrations</button>
          <button style={tabStyle('tenants')} onClick={() => setActiveTab('tenants')}>Tenants</button>
          <button style={tabStyle('health')} onClick={() => setActiveTab('health')}>Health Check</button>
        </div>

        {/* Tab Content */}
        {isLoading ? (
          <div style={{
            padding: '60px',
            textAlign: 'center',
            color: colors.utility.secondaryText,
            backgroundColor: colors.utility.secondaryBackground,
            borderRadius: '12px'
          }}>
            <div style={{
              width: '40px',
              height: '40px',
              border: `4px solid ${colors.brand.primary}20`,
              borderTop: `4px solid ${colors.brand.primary}`,
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 16px'
            }} />
            Loading system status...
            <style>{`
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
            `}</style>
          </div>
        ) : (
          <>
            {activeTab === 'overview' && renderOverview()}
            {activeTab === 'migrations' && renderMigrations()}
            {activeTab === 'tenants' && renderTenants()}
            {activeTab === 'health' && renderHealth()}
          </>
        )}
      </div>
    </div>
  );
};

export default SystemStatusPage;
