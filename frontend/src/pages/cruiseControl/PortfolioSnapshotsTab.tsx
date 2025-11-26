// frontend/src/pages/cruiseControl/PortfolioSnapshotsTab.tsx
import React, { useState, useEffect } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { Calendar, CheckCircle, XCircle, Clock, Activity, TrendingUp } from 'lucide-react';
import JobsService from '../../services/jobs.service';
import { SnapshotOperationsButtonGroup } from '../../components/cruiseControl/SnapshotOperationsButtonGroup';
import { toastService } from '../../services/toast.service';
import type { JobStatistics, JobExecution, JobType, PortfolioSnapshotExecutionData } from '../../types/jobs.types';

const JOB_TYPE: JobType = 'PORTFOLIO_SNAPSHOT' as JobType;

export const PortfolioSnapshotsTab: React.FC = () => {
  const { theme, isDarkMode } = useTheme();
  const { environment } = useAuth() as any;
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;

  const [statistics, setStatistics] = useState<JobStatistics | null>(null);
  const [executions, setExecutions] = useState<JobExecution[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Fetch data
  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsResponse, execResponse] = await Promise.all([
        JobsService.getStatistics(JOB_TYPE, environment),
        JobsService.getExecutions(JOB_TYPE, environment, page, 25)
      ]);

      if (statsResponse.success && statsResponse.data) {
        setStatistics(statsResponse.data);
      }

      if (execResponse.success && execResponse.data) {
        setExecutions(execResponse.data.executions);
        setTotalPages(execResponse.data.pagination.total_pages);
      }
    } catch (error: any) {
      console.error('Error fetching snapshot data:', error);
      toastService.error('Failed to load snapshot data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [environment, page]);

  // Format date
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    return date.toLocaleString('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short'
    });
  };

  // Format duration
  const formatDuration = (ms?: number) => {
    if (!ms) return 'N/A';
    if (ms < 1000) return `${ms}ms`;
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m ${seconds % 60}s`;
  };

  // Get status color and icon
  const getStatusDisplay = (status: string) => {
    switch (status) {
      case 'success':
        return {
          color: '#10B981',
          bg: '#10B98115',
          icon: <CheckCircle size={16} />,
          label: 'Success'
        };
      case 'failed':
        return {
          color: '#EF4444',
          bg: '#EF444415',
          icon: <XCircle size={16} />,
          label: 'Failed'
        };
      case 'running':
        return {
          color: '#3B82F6',
          bg: '#3B82F615',
          icon: <Activity size={16} />,
          label: 'Running'
        };
      case 'retrying':
        return {
          color: '#F59E0B',
          bg: '#F59E0B15',
          icon: <Clock size={16} />,
          label: 'Retrying'
        };
      default:
        return {
          color: colors.utility.secondaryText,
          bg: colors.utility.secondaryBackground,
          icon: <Clock size={16} />,
          label: status
        };
    }
  };

  // Get operation type display
  const getOperationDisplay = (execData: PortfolioSnapshotExecutionData | undefined) => {
    const operation = (execData as any)?.operation;
    
    const operationMap: Record<string, { label: string; color: string; icon: string }> = {
      drop_all: { label: 'Drop All', color: '#EF4444', icon: '🗑️' },
      generate_missing: { label: 'Generate Missing', color: '#10B981', icon: '➕' },
      update_all: { label: 'Update All', color: '#3B82F6', icon: '🔄' },
      regenerate_all: { label: 'Regenerate All', color: '#F59E0B', icon: '♻️' }
    };

    if (!operation || !operationMap[operation]) {
      return {
        label: 'Snapshot',
        color: colors.utility.secondaryText,
        icon: '📸'
      };
    }

    return operationMap[operation];
  };

  // Get execution result summary - UPDATED to handle different operation types
  const getExecutionResult = (execData: PortfolioSnapshotExecutionData | undefined, status: string) => {
    if (status === 'running') {
      return { message: 'Processing...', color: '#3B82F6', icon: '⏳' };
    }

    if (!execData) {
      return { message: 'No data', color: colors.utility.secondaryText, icon: '—' };
    }

    // Check operation type to handle different result structures
    const operation = (execData as any).operation;

    // Handle DROP ALL operation
    if (operation === 'drop_all') {
      const deletedCount = (execData as any).deleted_count || 0;
      
      if (deletedCount === 0) {
        return {
          message: 'No snapshots found',
          color: '#F59E0B',
          icon: '⚠️'
        };
      }
      
      return {
        message: `${deletedCount} snapshots deleted`,
        color: '#EF4444',
        icon: '🗑️'
      };
    }

    // Handle GENERATE MISSING operation
    if (operation === 'generate_missing') {
      const snapshotsCreated = execData.snapshots_created || 0;
      const snapshotsSkipped = (execData as any).snapshots_skipped || 0;
      const customersProcessed = execData.customers_processed || 0;

      if (customersProcessed === 0) {
        return {
          message: 'No active customers',
          color: '#F59E0B',
          icon: '⚠️'
        };
      }

      if (snapshotsCreated === 0 && snapshotsSkipped > 0) {
        return {
          message: `All up-to-date (${snapshotsSkipped})`,
          color: '#10B981',
          icon: '✓'
        };
      }

      if (snapshotsCreated === 0) {
        return {
          message: 'No missing snapshots',
          color: '#10B981',
          icon: '✓'
        };
      }

      return {
        message: `${snapshotsCreated} new, ${snapshotsSkipped} existing`,
        color: '#10B981',
        icon: '✓'
      };
    }

    // Handle UPDATE ALL operation
    if (operation === 'update_all') {
      const snapshotsCreated = execData.snapshots_created || 0;
      const snapshotsUpdated = execData.snapshots_updated || 0;
      const customersProcessed = execData.customers_processed || 0;

      if (customersProcessed === 0) {
        return {
          message: 'No active customers',
          color: '#F59E0B',
          icon: '⚠️'
        };
      }

      if (snapshotsCreated === 0 && snapshotsUpdated === 0) {
        return {
          message: 'No changes needed',
          color: '#10B981',
          icon: '✓'
        };
      }

      return {
        message: `${snapshotsCreated}C / ${snapshotsUpdated}U`,
        color: '#10B981',
        icon: '✓'
      };
    }

    // Handle REGENERATE ALL operation
    if (operation === 'regenerate_all') {
      const snapshotsDeleted = (execData as any).snapshots_deleted || 0;
      const snapshotsCreated = execData.snapshots_created || 0;
      const customersProcessed = execData.customers_processed || 0;

      if (customersProcessed === 0) {
        return {
          message: 'No active customers',
          color: '#F59E0B',
          icon: '⚠️'
        };
      }

      if (snapshotsDeleted === 0 && snapshotsCreated === 0) {
        return {
          message: 'No snapshots to regenerate',
          color: '#F59E0B',
          icon: '⚠️'
        };
      }

      return {
        message: `${snapshotsDeleted}D → ${snapshotsCreated}C`,
        color: '#F59E0B',
        icon: '🔄'
      };
    }

    // Default handling for regular snapshots (scheduled/manual without operation type)
    const customersProcessed = execData.customers_processed || 0;
    const customersFailed = execData.customers_failed || 0;
    const snapshotsCreated = execData.snapshots_created || 0;
    const snapshotsUpdated = execData.snapshots_updated || 0;
    const totalSnapshots = snapshotsCreated + snapshotsUpdated;

    if (customersProcessed === 0) {
      return {
        message: 'No active customers',
        color: '#F59E0B',
        icon: '⚠️'
      };
    }

    if (totalSnapshots === 0) {
      return {
        message: 'No snapshots generated',
        color: '#F59E0B',
        icon: '⚠️'
      };
    }

    if (customersFailed > 0 && customersFailed === customersProcessed) {
      return {
        message: 'All customers failed',
        color: '#EF4444',
        icon: '❌'
      };
    }

    if (customersFailed > 0) {
      return {
        message: `${customersProcessed - customersFailed}/${customersProcessed} successful`,
        color: '#F59E0B',
        icon: '⚠️'
      };
    }

    return {
      message: `${totalSnapshots} snapshots generated`,
      color: '#10B981',
      icon: '✓'
    };
  };

  if (loading && !statistics) {
    return (
      <div style={{
        textAlign: 'center',
        padding: '60px 20px',
        color: colors.utility.secondaryText
      }}>
        Loading snapshot scheduler data...
      </div>
    );
  }

  if (!statistics) {
    return (
      <div style={{
        textAlign: 'center',
        padding: '60px 20px',
        color: colors.utility.secondaryText
      }}>
        <p>No scheduler configuration found.</p>
        <p style={{ fontSize: '14px', marginTop: '8px' }}>
          The portfolio snapshot scheduler will be automatically configured on first run.
        </p>
        <p style={{ fontSize: '14px', marginTop: '4px' }}>
          If you continue to see this message, please check the database migration has been run.
        </p>
      </div>
    );
  }

  const { config, last_execution, next_scheduled_run, success_rate, average_duration_ms, total_executions } = statistics;

  return (
    <div>
      {/* Statistics Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '20px',
        marginBottom: '32px'
      }}>
        {/* Last Run Card */}
        <div style={{
          backgroundColor: colors.utility.secondaryBackground,
          borderRadius: '12px',
          padding: '20px',
          border: `1px solid ${colors.utility.primaryText}10`
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
            <Calendar size={20} style={{ color: colors.brand.primary }} />
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: colors.utility.primaryText }}>
              Last Run
            </h3>
          </div>
          <div style={{ fontSize: '14px', color: colors.utility.secondaryText }}>
            {formatDate(last_execution?.execution_time)}
          </div>
          {last_execution && (
            <div style={{ marginTop: '8px' }}>
              {(() => {
                const statusDisplay = getStatusDisplay(last_execution.status);
                return (
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: '600',
                    color: statusDisplay.color,
                    backgroundColor: statusDisplay.bg
                  }}>
                    {statusDisplay.icon}
                    {statusDisplay.label}
                  </span>
                );
              })()}
            </div>
          )}
        </div>

        {/* Next Scheduled Card */}
        <div style={{
          backgroundColor: colors.utility.secondaryBackground,
          borderRadius: '12px',
          padding: '20px',
          border: `1px solid ${colors.utility.primaryText}10`
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
            <Clock size={20} style={{ color: colors.brand.secondary }} />
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: colors.utility.primaryText }}>
              Next Scheduled
            </h3>
          </div>
          <div style={{ fontSize: '14px', color: colors.utility.secondaryText }}>
            {config.is_enabled ? formatDate(next_scheduled_run) : 'Disabled'}
          </div>
          <div style={{ marginTop: '8px', fontSize: '12px', color: colors.utility.secondaryText }}>
            {config.schedule_type === 'weekly' && 'Runs every Friday at 9:00 PM'}
            {config.schedule_type === 'monthly' && 'Runs monthly'}
            {config.schedule_type === 'custom' && `Custom: ${config.cron_expression}`}
          </div>
        </div>

        {/* Success Rate Card */}
        <div style={{
          backgroundColor: colors.utility.secondaryBackground,
          borderRadius: '12px',
          padding: '20px',
          border: `1px solid ${colors.utility.primaryText}10`
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
            <TrendingUp size={20} style={{ color: '#10B981' }} />
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: colors.utility.primaryText }}>
              Success Rate
            </h3>
          </div>
          <div style={{ fontSize: '32px', fontWeight: '700', color: colors.utility.primaryText, marginBottom: '4px' }}>
            {success_rate.toFixed(1)}%
          </div>
          <div style={{ fontSize: '12px', color: colors.utility.secondaryText }}>
            {config.execution_count} total executions
          </div>
        </div>

        {/* Total Snapshots Card */}
        <div style={{
          backgroundColor: colors.utility.secondaryBackground,
          borderRadius: '12px',
          padding: '20px',
          border: `1px solid ${colors.utility.primaryText}10`
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
            <Activity size={20} style={{ color: colors.brand.tertiary }} />
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: colors.utility.primaryText }}>
              Total Executions
            </h3>
          </div>
          <div style={{ fontSize: '32px', fontWeight: '700', color: colors.utility.primaryText, marginBottom: '4px' }}>
            {total_executions.toLocaleString()}
          </div>
          <div style={{ fontSize: '12px', color: colors.utility.secondaryText }}>
            Avg duration: {formatDuration(average_duration_ms)}
          </div>
        </div>
      </div>

      {/* Snapshot Operations */}
      <div style={{
        marginBottom: '32px',
        padding: '20px',
        backgroundColor: colors.utility.secondaryBackground,
        borderRadius: '12px',
        border: `1px solid ${colors.utility.primaryText}10`
      }}>
        <div style={{ marginBottom: '16px' }}>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: '600', color: colors.utility.primaryText }}>
            Snapshot Operations
          </h3>
          <p style={{ margin: 0, fontSize: '14px', color: colors.utility.secondaryText }}>
            Choose an operation to manage portfolio snapshots. "Generate Missing" only creates new snapshots (safe), while "Update All" recalculates existing data.
          </p>
        </div>
        
        <SnapshotOperationsButtonGroup
          onOperationComplete={fetchData}
          isRunning={statistics.is_running}
        />
      </div>

      {/* Execution History Table */}
      <div style={{
        backgroundColor: colors.utility.secondaryBackground,
        borderRadius: '12px',
        border: `1px solid ${colors.utility.primaryText}10`,
        overflow: 'hidden'
      }}>
        <div style={{ padding: '20px', borderBottom: `1px solid ${colors.utility.primaryText}10`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: '0 0 4px 0', fontSize: '18px', fontWeight: '600', color: colors.utility.primaryText }}>
              Execution History
            </h3>
            <div style={{ fontSize: '12px', color: colors.utility.secondaryText }}>
              Showing {executions.length} {executions.length === 1 ? 'execution' : 'executions'} in <span style={{ fontWeight: '600', color: colors.brand.primary }}>{environment.toUpperCase()}</span> environment
            </div>
          </div>
          <button
            onClick={() => fetchData()}
            disabled={loading}
            style={{
              padding: '8px 16px',
              backgroundColor: colors.brand.primary,
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1,
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Activity size={14} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>

        {executions.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: colors.utility.secondaryText }}>
            No execution history yet
          </div>
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: colors.utility.primaryBackground }}>
                    <th style={{ padding: '12px 20px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: colors.utility.secondaryText, textTransform: 'uppercase' }}>Date/Time</th>
                    <th style={{ padding: '12px 20px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: colors.utility.secondaryText, textTransform: 'uppercase' }}>Operation</th>
                    <th style={{ padding: '12px 20px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: colors.utility.secondaryText, textTransform: 'uppercase' }}>Status</th>
                    <th style={{ padding: '12px 20px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: colors.utility.secondaryText, textTransform: 'uppercase' }}>Result</th>
                    <th style={{ padding: '12px 20px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: colors.utility.secondaryText, textTransform: 'uppercase' }}>Trigger</th>
                    <th style={{ padding: '12px 20px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: colors.utility.secondaryText, textTransform: 'uppercase' }}>Customers</th>
                    <th style={{ padding: '12px 20px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: colors.utility.secondaryText, textTransform: 'uppercase' }}>Snapshots</th>
                    <th style={{ padding: '12px 20px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: colors.utility.secondaryText, textTransform: 'uppercase' }}>Duration</th>
                    <th style={{ padding: '12px 20px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: colors.utility.secondaryText, textTransform: 'uppercase' }}>Retry</th>
                  </tr>
                </thead>
                <tbody>
                  {executions.map((exec, idx) => {
                    const statusDisplay = getStatusDisplay(exec.status);
                    const execData = exec.execution_data as PortfolioSnapshotExecutionData | undefined;
                    const operationDisplay = getOperationDisplay(execData);
                    
                    return (
                      <tr
                        key={exec.id}
                        style={{
                          borderTop: idx > 0 ? `1px solid ${colors.utility.primaryText}10` : 'none'
                        }}
                      >
                        <td style={{ padding: '16px 20px', fontSize: '14px', color: colors.utility.primaryText }}>
                          {formatDate(exec.execution_time)}
                        </td>
                        <td style={{ padding: '16px 20px' }}>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            fontSize: '13px',
                            fontWeight: '500',
                            color: operationDisplay.color
                          }}>
                            <span>{operationDisplay.icon}</span>
                            <span>{operationDisplay.label}</span>
                          </span>
                        </td>
                        <td style={{ padding: '16px 20px' }}>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '4px 10px',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: '600',
                            color: statusDisplay.color,
                            backgroundColor: statusDisplay.bg
                          }}>
                            {statusDisplay.icon}
                            {statusDisplay.label}
                          </span>
                        </td>
                        <td style={{ padding: '16px 20px' }}>
                          {(() => {
                            const result = getExecutionResult(execData, exec.status);
                            return (
                              <span style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                fontSize: '13px',
                                fontWeight: '500',
                                color: result.color
                              }}>
                                <span>{result.icon}</span>
                                <span>{result.message}</span>
                              </span>
                            );
                          })()}
                        </td>
                        <td style={{ padding: '16px 20px', fontSize: '14px', color: colors.utility.secondaryText }}>
                          {exec.trigger_source === 'manual' ? '👤 Manual' : '⏰ Scheduled'}
                        </td>
                        <td style={{ padding: '16px 20px', fontSize: '14px', textAlign: 'center', color: colors.utility.primaryText }}>
                          {execData?.customers_processed || 0}
                          {(execData?.customers_failed || 0) > 0 && (
                            <span style={{ color: '#EF4444', marginLeft: '4px' }}>
                              (-{execData?.customers_failed})
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '16px 20px', fontSize: '14px', textAlign: 'center', color: colors.utility.primaryText }}>
                          {(execData?.snapshots_created || 0) + (execData?.snapshots_updated || 0)}
                          <span style={{ fontSize: '12px', color: colors.utility.secondaryText, marginLeft: '4px' }}>
                            ({execData?.snapshots_created || 0}C/{execData?.snapshots_updated || 0}U)
                          </span>
                        </td>
                        <td style={{ padding: '16px 20px', fontSize: '14px', textAlign: 'center', color: colors.utility.secondaryText }}>
                          {formatDuration(exec.execution_duration_ms)}
                        </td>
                        <td style={{ padding: '16px 20px', fontSize: '14px', textAlign: 'center', color: colors.utility.secondaryText }}>
                          {exec.retry_attempt > 0 ? `Attempt ${exec.retry_attempt + 1}` : '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div style={{
                padding: '16px 20px',
                borderTop: `1px solid ${colors.utility.primaryText}10`,
                display: 'flex',
                justifyContent: 'center',
                gap: '8px'
              }}>
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: page === 1 ? colors.utility.secondaryBackground : colors.brand.primary,
                    color: page === 1 ? colors.utility.secondaryText : 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '14px',
                    cursor: page === 1 ? 'not-allowed' : 'pointer'
                  }}
                >
                  Previous
                </button>
                <span style={{
                  padding: '8px 16px',
                  fontSize: '14px',
                  color: colors.utility.primaryText,
                  display: 'flex',
                  alignItems: 'center'
                }}>
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: page === totalPages ? colors.utility.secondaryBackground : colors.brand.primary,
                    color: page === totalPages ? colors.utility.secondaryText : 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '14px',
                    cursor: page === totalPages ? 'not-allowed' : 'pointer'
                  }}
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default PortfolioSnapshotsTab;