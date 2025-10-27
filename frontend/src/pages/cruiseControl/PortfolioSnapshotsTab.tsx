// frontend/src/pages/cruiseControl/PortfolioSnapshotsTab.tsx
import React, { useState, useEffect } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/ThemeContext';
import { Play, Calendar, CheckCircle, XCircle, Clock, Activity, TrendingUp } from 'lucide-react';
import PortfolioSnapshotService from '../../services/portfolioSnapshot.service';
import { toastService } from '../../services/toast.service';
import type { SnapshotStatistics, SnapshotExecution } from '../../types/portfolioSnapshot.types';

export const PortfolioSnapshotsTab: React.FC = () => {
  const { theme, isDarkMode } = useTheme();
  const { environment } = useAuth() as any;
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;

  const [statistics, setStatistics] = useState<SnapshotStatistics | null>(null);
  const [executions, setExecutions] = useState<SnapshotExecution[]>([]);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Fetch data
  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsResponse, execResponse] = await Promise.all([
        PortfolioSnapshotService.getStatistics(environment),
        PortfolioSnapshotService.getExecutions(environment, page, 10)
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

  // Manual trigger
  const handleManualTrigger = async () => {
    setTriggering(true);
    try {
      const response = await PortfolioSnapshotService.triggerManual(environment);
      if (response.success) {
        toastService.success('Snapshot generation started! This may take a few minutes.');
        // Refresh after 2 seconds
        setTimeout(fetchData, 2000);
      } else {
        toastService.error(response.error || 'Failed to trigger snapshot generation');
      }
    } catch (error: any) {
      toastService.error('Failed to trigger snapshot generation');
    } finally {
      setTriggering(false);
    }
  };

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
          Please contact your administrator to set up the portfolio snapshot scheduler.
        </p>
      </div>
    );
  }

  const { config, last_execution, next_scheduled_run, success_rate, average_duration_ms, total_snapshots_generated } = statistics;

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
              Total Snapshots
            </h3>
          </div>
          <div style={{ fontSize: '32px', fontWeight: '700', color: colors.utility.primaryText, marginBottom: '4px' }}>
            {total_snapshots_generated.toLocaleString()}
          </div>
          <div style={{ fontSize: '12px', color: colors.utility.secondaryText }}>
            Avg duration: {formatDuration(average_duration_ms)}
          </div>
        </div>
      </div>

      {/* Manual Trigger Button */}
      <div style={{
        marginBottom: '32px',
        padding: '20px',
        backgroundColor: colors.utility.secondaryBackground,
        borderRadius: '12px',
        border: `1px solid ${colors.utility.primaryText}10`,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: '600', color: colors.utility.primaryText }}>
            Manual Snapshot Generation
          </h3>
          <p style={{ margin: 0, fontSize: '14px', color: colors.utility.secondaryText }}>
            Generate portfolio snapshots immediately for all customers. This will create snapshots for the end of the previous month.
          </p>
        </div>
        <button
          onClick={handleManualTrigger}
          disabled={triggering || statistics.is_running}
          style={{
            padding: '12px 24px',
            backgroundColor: triggering || statistics.is_running ? colors.utility.secondaryText : colors.brand.primary,
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: triggering || statistics.is_running ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            opacity: triggering || statistics.is_running ? 0.6 : 1,
            flexShrink: 0,
            marginLeft: '20px'
          }}
        >
          <Play size={16} />
          {triggering ? 'Starting...' : statistics.is_running ? 'Running...' : 'Generate Now'}
        </button>
      </div>

      {/* Execution History Table */}
      <div style={{
        backgroundColor: colors.utility.secondaryBackground,
        borderRadius: '12px',
        border: `1px solid ${colors.utility.primaryText}10`,
        overflow: 'hidden'
      }}>
        <div style={{ padding: '20px', borderBottom: `1px solid ${colors.utility.primaryText}10` }}>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: colors.utility.primaryText }}>
            Execution History
          </h3>
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
                    <th style={{ padding: '12px 20px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: colors.utility.secondaryText, textTransform: 'uppercase' }}>Status</th>
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
                        <td style={{ padding: '16px 20px', fontSize: '14px', color: colors.utility.secondaryText }}>
                          {exec.trigger_source === 'manual' ? '👤 Manual' : '⏰ Scheduled'}
                        </td>
                        <td style={{ padding: '16px 20px', fontSize: '14px', textAlign: 'center', color: colors.utility.primaryText }}>
                          {exec.customers_processed}
                          {exec.customers_failed > 0 && (
                            <span style={{ color: '#EF4444', marginLeft: '4px' }}>
                              (-{exec.customers_failed})
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '16px 20px', fontSize: '14px', textAlign: 'center', color: colors.utility.primaryText }}>
                          {exec.snapshots_created + exec.snapshots_updated}
                          <span style={{ fontSize: '12px', color: colors.utility.secondaryText, marginLeft: '4px' }}>
                            ({exec.snapshots_created}C/{exec.snapshots_updated}U)
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
