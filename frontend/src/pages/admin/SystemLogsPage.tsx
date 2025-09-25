import React, { useState, useEffect } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { useLogs, useLogStats, useClearLogs, getLogLevelColor, formatLogTimestamp, isRecentLog } from '../../hooks/useLogs';

interface LogFilters {
  level: string;
  source: string;
  hours: string;
}

const SystemLogsPage: React.FC = () => {
  const { theme, isDarkMode } = useTheme();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;

  const [filters, setFilters] = useState<LogFilters>({
    level: '',
    source: '',
    hours: '24'
  });

  const [selectedLog, setSelectedLog] = useState<any>(null);

  const { data: logsData, isLoading, refetch } = useLogs(filters);
  const { data: stats, refetch: refetchStats } = useLogStats();
  const clearLogsMutation = useClearLogs();

  const logs = logsData?.logs || [];
  const total = logsData?.total || 0;

  const handleFilterChange = (key: keyof LogFilters, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleRefresh = () => {
    refetch();
    refetchStats();
  };

  const handleClearLogs = async () => {
    if (window.confirm('Clear logs older than 30 days? This action cannot be undone.')) {
      try {
        await clearLogsMutation.mutateAsync();
        alert('Old logs cleared successfully');
      } catch (error) {
        alert('Failed to clear logs');
      }
    }
  };

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      refetch();
      refetchStats();
    }, 30000);
    
    return () => clearInterval(interval);
  }, [refetch, refetchStats]);

  const RefreshIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="23,4 23,10 17,10" />
      <polyline points="1,20 1,14 7,14" />
      <path d="m20.49,9a9,9 0 1 1-2.13-5.36l4.64,4.36" />
    </svg>
  );

  const TrashIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="3,6 5,6 21,6" />
      <path d="m19,6v14a2,2 0 0 1-2,2H7a2,2 0 0 1-2-2V6m3,0V4a2,2 0 0 1,2-2h4a2,2 0 0 1,2,2v2" />
    </svg>
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
              System Logs
            </h1>
            <p style={{
              fontSize: '14px',
              color: colors.utility.secondaryText,
              margin: 0
            }}>
              Monitor application errors and system events
            </p>
          </div>
          
          <div style={{ display: 'flex', gap: '12px' }}>
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
                opacity: isLoading ? 0.6 : 1
              }}
            >
              <RefreshIcon />
              {isLoading ? 'Loading...' : 'Refresh'}
            </button>
            
            <button
              onClick={handleClearLogs}
              disabled={clearLogsMutation.isPending}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 16px',
                backgroundColor: colors.semantic.error,
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                opacity: clearLogsMutation.isPending ? 0.6 : 1
              }}
            >
              <TrashIcon />
              {clearLogsMutation.isPending ? 'Cleaning...' : 'Clean Up'}
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '16px',
          marginBottom: '24px'
        }}>
          <div style={{
            backgroundColor: colors.utility.secondaryBackground,
            borderRadius: '8px',
            padding: '20px'
          }}>
            <div style={{
              fontSize: '32px',
              fontWeight: '700',
              color: colors.semantic.error,
              marginBottom: '4px'
            }}>
              {stats?.errors24h || 0}
            </div>
            <div style={{ fontSize: '14px', color: colors.utility.secondaryText }}>
              Errors (24h)
            </div>
          </div>
          
          <div style={{
            backgroundColor: colors.utility.secondaryBackground,
            borderRadius: '8px',
            padding: '20px'
          }}>
            <div style={{
              fontSize: '32px',
              fontWeight: '700',
              color: '#feca57',
              marginBottom: '4px'
            }}>
              {stats?.warnings24h || 0}
            </div>
            <div style={{ fontSize: '14px', color: colors.utility.secondaryText }}>
              Warnings (24h)
            </div>
          </div>
          
          <div style={{
            backgroundColor: colors.utility.secondaryBackground,
            borderRadius: '8px',
            padding: '20px'
          }}>
            <div style={{
              fontSize: '32px',
              fontWeight: '700',
              color: colors.utility.primaryText,
              marginBottom: '4px'
            }}>
              {stats?.errors7d || 0}
            </div>
            <div style={{ fontSize: '14px', color: colors.utility.secondaryText }}>
              Errors (7d)
            </div>
          </div>
          
          <div style={{
            backgroundColor: colors.utility.secondaryBackground,
            borderRadius: '8px',
            padding: '20px'
          }}>
            <div style={{
              fontSize: '32px',
              fontWeight: '700',
              color: colors.brand.primary,
              marginBottom: '4px'
            }}>
              {stats?.logs1h || 0}
            </div>
            <div style={{ fontSize: '14px', color: colors.utility.secondaryText }}>
              Recent (1h)
            </div>
          </div>
        </div>

        {/* Filters */}
        <div style={{
          backgroundColor: colors.utility.secondaryBackground,
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '20px'
        }}>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <select 
              value={filters.level} 
              onChange={(e) => handleFilterChange('level', e.target.value)}
              style={{
                padding: '8px 12px',
                border: `1px solid ${colors.utility.primaryText}20`,
                borderRadius: '6px',
                backgroundColor: colors.utility.primaryBackground,
                color: colors.utility.primaryText,
                fontSize: '14px'
              }}
            >
              <option value="">All Levels</option>
              <option value="error">Errors</option>
              <option value="warn">Warnings</option>
              <option value="info">Info</option>
            </select>

            <select 
              value={filters.source} 
              onChange={(e) => handleFilterChange('source', e.target.value)}
              style={{
                padding: '8px 12px',
                border: `1px solid ${colors.utility.primaryText}20`,
                borderRadius: '6px',
                backgroundColor: colors.utility.primaryBackground,
                color: colors.utility.primaryText,
                fontSize: '14px'
              }}
            >
              <option value="">All Sources</option>
              <option value="backend">Backend</option>
              <option value="frontend">Frontend</option>
              <option value="n8n">N8N</option>
            </select>

            <select 
              value={filters.hours} 
              onChange={(e) => handleFilterChange('hours', e.target.value)}
              style={{
                padding: '8px 12px',
                border: `1px solid ${colors.utility.primaryText}20`,
                borderRadius: '6px',
                backgroundColor: colors.utility.primaryBackground,
                color: colors.utility.primaryText,
                fontSize: '14px'
              }}
            >
              <option value="1">Last Hour</option>
              <option value="6">Last 6 Hours</option>
              <option value="24">Last 24 Hours</option>
              <option value="168">Last Week</option>
            </select>

            <span style={{
              marginLeft: 'auto',
              fontSize: '14px',
              color: colors.utility.secondaryText
            }}>
              {total} logs found
            </span>
          </div>
        </div>

        {/* Logs List */}
        <div style={{
          backgroundColor: colors.utility.secondaryBackground,
          borderRadius: '12px',
          overflow: 'hidden'
        }}>
          {isLoading ? (
            <div style={{ padding: '40px', textAlign: 'center' }}>Loading logs...</div>
          ) : logs.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: colors.utility.secondaryText }}>
              No logs found for the selected filters
            </div>
          ) : (
            logs.map((log) => (
              <div
                key={log.id}
                style={{
                  borderLeft: `4px solid ${getLogLevelColor(log.level)}`,
                  padding: '16px',
                  borderBottom: `1px solid ${colors.utility.primaryText}10`,
                  cursor: 'pointer',
                  backgroundColor: selectedLog?.id === log.id ? `${colors.brand.primary}10` : 'transparent'
                }}
                onClick={() => setSelectedLog(selectedLog?.id === log.id ? null : log)}
              >
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: '8px'
                }}>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <span style={{
                      background: getLogLevelColor(log.level),
                      color: 'white',
                      padding: '3px 8px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: 'bold'
                    }}>
                      {log.level.toUpperCase()}
                    </span>
                    <span style={{ color: colors.utility.secondaryText, fontSize: '13px' }}>
                      {log.source}
                    </span>
                    {log.context && (
                      <span style={{ color: colors.utility.secondaryText, fontSize: '12px' }}>
                        {log.context}
                      </span>
                    )}
                    {isRecentLog(log.created_at) && (
                      <span style={{
                        background: colors.semantic.success,
                        color: 'white',
                        padding: '2px 6px',
                        borderRadius: '3px',
                        fontSize: '10px'
                      }}>
                        NEW
                      </span>
                    )}
                  </div>
                  <span style={{ color: colors.utility.secondaryText, fontSize: '12px' }}>
                    {formatLogTimestamp(log.created_at)}
                  </span>
                </div>
                
                <div style={{ marginBottom: '8px', fontWeight: '500', color: colors.utility.primaryText }}>
                  {log.message}
                </div>

                {selectedLog?.id === log.id && (
                  <div style={{ marginTop: '12px' }}>
                    {log.metadata && Object.keys(log.metadata).length > 0 && (
                      <details style={{ marginBottom: '8px' }}>
                        <summary style={{ fontSize: '12px', color: colors.utility.secondaryText, cursor: 'pointer' }}>
                          Metadata
                        </summary>
                        <pre style={{
                          background: colors.utility.primaryBackground,
                          padding: '8px',
                          marginTop: '4px',
                          fontSize: '11px',
                          overflow: 'auto',
                          borderRadius: '4px'
                        }}>
                          {JSON.stringify(log.metadata, null, 2)}
                        </pre>
                      </details>
                    )}
                    
                    {log.stack_trace && (
                      <details>
                        <summary style={{ fontSize: '12px', color: colors.utility.secondaryText, cursor: 'pointer' }}>
                          Stack Trace
                        </summary>
                        <pre style={{
                          background: colors.utility.primaryBackground,
                          padding: '8px',
                          marginTop: '4px',
                          fontSize: '11px',
                          overflow: 'auto',
                          borderRadius: '4px'
                        }}>
                          {log.stack_trace}
                        </pre>
                      </details>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default SystemLogsPage;