// frontend/src/pages/admin/SystemLogsPage.tsx

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
  const [showCleanupModal, setShowCleanupModal] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

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

  const handleShowCleanupModal = () => {
    setShowCleanupModal(true);
  };

  const handleConfirmCleanup = async () => {
    try {
      await clearLogsMutation.mutateAsync();
      setShowCleanupModal(false);
      handleRefresh();
    } catch (error) {
      console.error('Failed to clear logs:', error);
    }
  };

  const handleCancelCleanup = () => {
    setShowCleanupModal(false);
  };

  const handleCopyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
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

  // Icons
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
      <path d="m19,6v14a2,2 0 0 1-2,2H7a2,2 0 0 1-2,-2V6m3,0V4a2,2 0 0 1,2-2h4a2,2 0 0 1,2,2v2" />
    </svg>
  );

  const CopyIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );

  const CheckIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="20,6 9,17 4,12" />
    </svg>
  );

  const AlertCircleIcon = () => (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );

  const ChevronDownIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="6,9 12,15 18,9" />
    </svg>
  );

  const ChevronUpIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="18,15 12,9 6,15" />
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
              Monitor application errors and system events • Auto-refreshes every 30s
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
                opacity: isLoading ? 0.6 : 1,
                fontWeight: '500'
              }}
            >
              <RefreshIcon />
              {isLoading ? 'Loading...' : 'Refresh'}
            </button>
            
            <button
              onClick={handleShowCleanupModal}
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
                opacity: clearLogsMutation.isPending ? 0.6 : 1,
                fontWeight: '500'
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
          <div 
            style={{
              backgroundColor: colors.utility.secondaryBackground,
              borderRadius: '8px',
              padding: '20px',
              cursor: 'pointer',
              transition: 'transform 0.2s ease',
              border: `1px solid ${colors.utility.primaryText}10`
            }}
            onClick={() => handleFilterChange('level', 'error')}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
          >
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
          
          <div 
            style={{
              backgroundColor: colors.utility.secondaryBackground,
              borderRadius: '8px',
              padding: '20px',
              cursor: 'pointer',
              transition: 'transform 0.2s ease',
              border: `1px solid ${colors.utility.primaryText}10`
            }}
            onClick={() => handleFilterChange('level', 'warn')}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
          >
            <div style={{
              fontSize: '32px',
              fontWeight: '700',
              color: '#F59E0B',
              marginBottom: '4px'
            }}>
              {stats?.warnings24h || 0}
            </div>
            <div style={{ fontSize: '14px', color: colors.utility.secondaryText }}>
              Warnings (24h)
            </div>
          </div>
          
          <div 
            style={{
              backgroundColor: colors.utility.secondaryBackground,
              borderRadius: '8px',
              padding: '20px',
              cursor: 'pointer',
              transition: 'transform 0.2s ease',
              border: `1px solid ${colors.utility.primaryText}10`
            }}
            onClick={() => {
              handleFilterChange('level', 'error');
              handleFilterChange('hours', '168');
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
          >
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
          
          <div 
            style={{
              backgroundColor: colors.utility.secondaryBackground,
              borderRadius: '8px',
              padding: '20px',
              cursor: 'pointer',
              transition: 'transform 0.2s ease',
              border: `1px solid ${colors.utility.primaryText}10`
            }}
            onClick={() => handleFilterChange('hours', '1')}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
          >
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
          marginBottom: '20px',
          border: `1px solid ${colors.utility.primaryText}10`
        }}>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ flex: '0 0 auto' }}>
              <label style={{
                display: 'block',
                marginBottom: '6px',
                fontSize: '12px',
                fontWeight: '500',
                color: colors.utility.secondaryText,
                textTransform: 'uppercase'
              }}>
                Level
              </label>
              <select 
                value={filters.level} 
                onChange={(e) => handleFilterChange('level', e.target.value)}
                style={{
                  padding: '8px 12px',
                  border: `1px solid ${colors.utility.primaryText}20`,
                  borderRadius: '6px',
                  backgroundColor: colors.utility.primaryBackground,
                  color: colors.utility.primaryText,
                  fontSize: '14px',
                  cursor: 'pointer',
                  minWidth: '150px'
                }}
              >
                <option value="">All Levels</option>
                <option value="error">Errors</option>
                <option value="warn">Warnings</option>
                <option value="info">Info</option>
              </select>
            </div>

            <div style={{ flex: '0 0 auto' }}>
              <label style={{
                display: 'block',
                marginBottom: '6px',
                fontSize: '12px',
                fontWeight: '500',
                color: colors.utility.secondaryText,
                textTransform: 'uppercase'
              }}>
                Source
              </label>
              <select 
                value={filters.source} 
                onChange={(e) => handleFilterChange('source', e.target.value)}
                style={{
                  padding: '8px 12px',
                  border: `1px solid ${colors.utility.primaryText}20`,
                  borderRadius: '6px',
                  backgroundColor: colors.utility.primaryBackground,
                  color: colors.utility.primaryText,
                  fontSize: '14px',
                  cursor: 'pointer',
                  minWidth: '150px'
                }}
              >
                <option value="">All Sources</option>
                <option value="backend">Backend</option>
                <option value="frontend">Frontend</option>
                <option value="n8n">N8N</option>
              </select>
            </div>

            <div style={{ flex: '0 0 auto' }}>
              <label style={{
                display: 'block',
                marginBottom: '6px',
                fontSize: '12px',
                fontWeight: '500',
                color: colors.utility.secondaryText,
                textTransform: 'uppercase'
              }}>
                Time Range
              </label>
              <select 
                value={filters.hours} 
                onChange={(e) => handleFilterChange('hours', e.target.value)}
                style={{
                  padding: '8px 12px',
                  border: `1px solid ${colors.utility.primaryText}20`,
                  borderRadius: '6px',
                  backgroundColor: colors.utility.primaryBackground,
                  color: colors.utility.primaryText,
                  fontSize: '14px',
                  cursor: 'pointer',
                  minWidth: '150px'
                }}
              >
                <option value="1">Last Hour</option>
                <option value="6">Last 6 Hours</option>
                <option value="24">Last 24 Hours</option>
                <option value="168">Last Week</option>
              </select>
            </div>

            <div style={{
              marginLeft: 'auto',
              display: 'flex',
              alignItems: 'flex-end',
              paddingBottom: '8px'
            }}>
              <span style={{
                fontSize: '14px',
                color: colors.utility.secondaryText,
                fontWeight: '500'
              }}>
                {total} log{total !== 1 ? 's' : ''} found
              </span>
            </div>

            {(filters.level || filters.source || filters.hours !== '24') && (
              <button
                onClick={() => setFilters({ level: '', source: '', hours: '24' })}
                style={{
                  padding: '8px 12px',
                  backgroundColor: colors.semantic.error + '20',
                  color: colors.semantic.error,
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '13px',
                  cursor: 'pointer',
                  fontWeight: '500',
                  alignSelf: 'flex-end',
                  marginBottom: '8px'
                }}
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>

        {/* Logs List */}
        <div style={{
          backgroundColor: colors.utility.secondaryBackground,
          borderRadius: '12px',
          overflow: 'hidden',
          border: `1px solid ${colors.utility.primaryText}10`
        }}>
          {isLoading ? (
            <div style={{ 
              padding: '60px', 
              textAlign: 'center',
              color: colors.utility.secondaryText 
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
              Loading logs...
              <style>{`
                @keyframes spin {
                  0% { transform: rotate(0deg); }
                  100% { transform: rotate(360deg); }
                }
              `}</style>
            </div>
          ) : logs.length === 0 ? (
            <div style={{ 
              padding: '60px', 
              textAlign: 'center', 
              color: colors.utility.secondaryText 
            }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ margin: '0 auto 16px', opacity: 0.3 }}>
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14,2 14,8 20,8" />
              </svg>
              <div style={{ fontSize: '16px', fontWeight: '500', marginBottom: '8px' }}>
                No logs found
              </div>
              <div style={{ fontSize: '14px' }}>
                {(filters.level || filters.source || filters.hours !== '24') 
                  ? 'Try adjusting your filters'
                  : 'No logs have been recorded yet'
                }
              </div>
            </div>
          ) : (
            logs.map((log, index) => (
              <div
                key={log.id}
                style={{
                  borderLeft: `4px solid ${getLogLevelColor(log.level)}`,
                  padding: '16px 20px',
                  borderBottom: index < logs.length - 1 ? `1px solid ${colors.utility.primaryText}10` : 'none',
                  cursor: 'pointer',
                  backgroundColor: selectedLog?.id === log.id ? `${colors.brand.primary}08` : 'transparent',
                  transition: 'background-color 0.2s ease'
                }}
                onClick={() => setSelectedLog(selectedLog?.id === log.id ? null : log)}
                onMouseEnter={(e) => {
                  if (selectedLog?.id !== log.id) {
                    e.currentTarget.style.backgroundColor = `${colors.utility.primaryText}05`;
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedLog?.id !== log.id) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }
                }}
              >
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: '8px'
                }}>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{
                      background: getLogLevelColor(log.level),
                      color: 'white',
                      padding: '4px 10px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: '600',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}>
                      {log.level}
                    </span>
                    <span style={{ 
                      color: colors.utility.secondaryText, 
                      fontSize: '13px',
                      fontWeight: '500',
                      backgroundColor: colors.utility.primaryBackground,
                      padding: '3px 8px',
                      borderRadius: '4px'
                    }}>
                      {log.source}
                    </span>
                    {log.context && (
                      <span style={{ 
                        color: colors.utility.secondaryText, 
                        fontSize: '12px',
                        fontStyle: 'italic'
                      }}>
                        • {log.context}
                      </span>
                    )}
                    {isRecentLog(log.created_at) && (
                      <span style={{
                        background: colors.semantic.success,
                        color: 'white',
                        padding: '3px 8px',
                        borderRadius: '4px',
                        fontSize: '10px',
                        fontWeight: '600',
                        animation: 'pulse 2s ease-in-out infinite'
                      }}>
                        NEW
                      </span>
                    )}
                    {selectedLog?.id === log.id ? <ChevronUpIcon /> : <ChevronDownIcon />}
                  </div>
                  <span style={{ 
                    color: colors.utility.secondaryText, 
                    fontSize: '12px',
                    whiteSpace: 'nowrap'
                  }}>
                    {formatLogTimestamp(log.created_at)}
                  </span>
                </div>
                
                <div style={{ 
                  marginBottom: selectedLog?.id === log.id ? '12px' : '0', 
                  fontWeight: '500', 
                  color: colors.utility.primaryText,
                  fontSize: '14px',
                  lineHeight: '1.5'
                }}>
                  {log.message}
                </div>

                {selectedLog?.id === log.id && (
                  <div style={{ 
                    marginTop: '16px',
                    paddingTop: '16px',
                    borderTop: `1px solid ${colors.utility.primaryText}10`
                  }}>
                    {log.metadata && Object.keys(log.metadata).length > 0 && (
                      <div style={{ marginBottom: '12px' }}>
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: '8px'
                        }}>
                          <span style={{ 
                            fontSize: '13px', 
                            color: colors.utility.secondaryText,
                            fontWeight: '600',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px'
                          }}>
                            Metadata
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopyToClipboard(JSON.stringify(log.metadata, null, 2), `metadata-${log.id}`);
                            }}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '4px 8px',
                              backgroundColor: copiedField === `metadata-${log.id}` ? colors.semantic.success : colors.brand.primary,
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              fontSize: '11px',
                              cursor: 'pointer',
                              fontWeight: '500'
                            }}
                          >
                            {copiedField === `metadata-${log.id}` ? (
                              <><CheckIcon /> Copied!</>
                            ) : (
                              <><CopyIcon /> Copy</>
                            )}
                          </button>
                        </div>
                        <pre style={{
                          background: colors.utility.primaryBackground,
                          padding: '12px',
                          fontSize: '11px',
                          overflow: 'auto',
                          borderRadius: '6px',
                          border: `1px solid ${colors.utility.primaryText}10`,
                          margin: 0,
                          maxHeight: '300px',
                          color: colors.utility.primaryText,
                          fontFamily: '"Fira Code", "Courier New", monospace'
                        }}>
                          {JSON.stringify(log.metadata, null, 2)}
                        </pre>
                      </div>
                    )}
                    
                    {log.stack_trace && (
                      <div>
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: '8px'
                        }}>
                          <span style={{ 
                            fontSize: '13px', 
                            color: colors.utility.secondaryText,
                            fontWeight: '600',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px'
                          }}>
                            Stack Trace
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              // FIX: Check if stack_trace exists before copying
                              if (log.stack_trace) {
                                handleCopyToClipboard(log.stack_trace, `stack-${log.id}`);
                              }
                            }}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '4px 8px',
                              backgroundColor: copiedField === `stack-${log.id}` ? colors.semantic.success : colors.brand.primary,
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              fontSize: '11px',
                              cursor: 'pointer',
                              fontWeight: '500'
                            }}
                          >
                            {copiedField === `stack-${log.id}` ? (
                              <><CheckIcon /> Copied!</>
                            ) : (
                              <><CopyIcon /> Copy</>
                            )}
                          </button>
                        </div>
                        <pre style={{
                          background: colors.utility.primaryBackground,
                          padding: '12px',
                          fontSize: '11px',
                          overflow: 'auto',
                          borderRadius: '6px',
                          border: `1px solid ${colors.utility.primaryText}10`,
                          margin: 0,
                          maxHeight: '400px',
                          color: colors.utility.primaryText,
                          fontFamily: '"Fira Code", "Courier New", monospace',
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word'
                        }}>
                          {log.stack_trace}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Cleanup Confirmation Modal */}
      {showCleanupModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          backdropFilter: 'blur(4px)'
        }}>
          <div style={{
            backgroundColor: colors.utility.primaryBackground,
            borderRadius: '16px',
            padding: '32px',
            maxWidth: '480px',
            width: '90%',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
            border: `1px solid ${colors.utility.primaryText}10`,
            animation: 'modalSlideIn 0.2s ease-out'
          }}>
            {/* Icon */}
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              marginBottom: '20px'
            }}>
              <div style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                backgroundColor: colors.semantic.error + '15',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: colors.semantic.error
              }}>
                <AlertCircleIcon />
              </div>
            </div>

            {/* Title */}
            <h2 style={{
              margin: '0 0 12px 0',
              fontSize: '24px',
              fontWeight: '600',
              color: colors.utility.primaryText,
              textAlign: 'center'
            }}>
              Clean Up Old Logs
            </h2>

            {/* Message */}
            <p style={{
              margin: '0 0 24px 0',
              fontSize: '15px',
              color: colors.utility.secondaryText,
              textAlign: 'center',
              lineHeight: '1.6'
            }}>
              This will permanently delete all logs older than <strong style={{ color: colors.semantic.error }}>30 days</strong>.
              <br /><br />
              This action cannot be undone. Are you sure you want to continue?
            </p>

            {/* Buttons */}
            <div style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'center'
            }}>
              <button
                onClick={handleCancelCleanup}
                disabled={clearLogsMutation.isPending}
                style={{
                  backgroundColor: 'transparent',
                  color: colors.utility.secondaryText,
                  border: `1px solid ${colors.utility.secondaryText}40`,
                  borderRadius: '8px',
                  padding: '12px 24px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  minWidth: '120px'
                }}
              >
                Cancel
              </button>

              <button
                onClick={handleConfirmCleanup}
                disabled={clearLogsMutation.isPending}
                style={{
                  backgroundColor: colors.semantic.error,
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '12px 24px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  minWidth: '120px',
                  opacity: clearLogsMutation.isPending ? 0.6 : 1
                }}
              >
                {clearLogsMutation.isPending ? 'Cleaning...' : 'Delete Logs'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Animation */}
      <style>{`
        @keyframes modalSlideIn {
          from {
            opacity: 0;
            transform: translateY(-20px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.6;
          }
        }
      `}</style>
    </div>
  );
};

export default SystemLogsPage;