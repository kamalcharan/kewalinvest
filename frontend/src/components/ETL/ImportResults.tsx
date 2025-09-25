import React, { useState, useEffect } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { API_ENDPOINTS } from '../../services/serviceURLs';

interface ImportResultsProps {
  sessionId: number;
  onStartNewImport: () => void;
  onError: (error: string) => void;
}

interface ImportSession {
  id: number;
  session_name: string;
  status: string;
  total_records: number;
  successful_records: number;
  failed_records: number;
  duplicate_records: number;
  processing_started_at?: string;
  processing_completed_at?: string;
  error_summary?: string;
}

interface ImportRecord {
  id: number;
  row_number: number;
  raw_data: any;
  status: 'success' | 'failed' | 'duplicate' | 'skipped';
  error_messages: string[];
  warnings: string[];
  created_contact_id?: number;
  created_customer_id?: number;
  processed_at: string;
}

interface ResultsData {
  session: ImportSession;
  records: ImportRecord[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  summary: {
    totalRows: number;
    successfulRows: number;
    failedRows: number;
    duplicateRows: number;
    processingTime: number;
  };
}

const ImportResults: React.FC<ImportResultsProps> = ({
  sessionId,
  onStartNewImport,
  onError
}) => {
  const { theme, isDarkMode } = useTheme();
  const { tenantId, environment } = useAuth();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;
  
  const [resultsData, setResultsData] = useState<ResultsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isExporting, setIsExporting] = useState(false);

  // Fetch results on component mount and when filters change
  useEffect(() => {
    fetchResults();
  }, [sessionId, currentPage, statusFilter]);

  // Handle loading cursor
  useEffect(() => {
    if (isLoading || isExporting) {
      document.body.style.cursor = 'wait';
    } else {
      document.body.style.cursor = 'default';
    }
    
    return () => {
      document.body.style.cursor = 'default';
    };
  }, [isLoading, isExporting]);

  const fetchResults = async () => {
    try {
      setIsLoading(true);
      
      const token = localStorage.getItem('access_token');
      
      if (!token) {
        onError('Authentication token not found');
        setIsLoading(false);
        return;
      }
      
      const filterParam = statusFilter !== 'all' ? `&status=${statusFilter}` : '';
      
      const response = await fetch(
        `${API_ENDPOINTS.IMPORT.RESULTS(sessionId)}?page=${currentPage}&pageSize=20${filterParam}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            ...(tenantId && { 'X-Tenant-ID': String(tenantId) }),
            ...(environment && { 'X-Environment': environment })
          }
        }
      );

      const result = await response.json();

      if (result.success && result.data) {
        setResultsData(result.data);
      } else {
        console.error('Failed to fetch results:', result);
        // Don't set null, keep any existing data
        if (!resultsData) {
          // Only set empty structure if we have no data at all
          setResultsData({
            session: {
              id: sessionId,
              session_name: 'Unknown Session',
              status: 'unknown',
              total_records: 0,
              successful_records: 0,
              failed_records: 0,
              duplicate_records: 0
            },
            records: [],
            pagination: {
              page: 1,
              pageSize: 20,
              total: 0,
              totalPages: 0,
              hasNext: false,
              hasPrev: false
            },
            summary: {
              totalRows: 0,
              successfulRows: 0,
              failedRows: 0,
              duplicateRows: 0,
              processingTime: 0
            }
          });
        }
        onError(result.error || 'Failed to fetch import results');
      }

    } catch (error: any) {
      console.error('Network error:', error);
      onError('Network error while fetching results');
    } finally {
      setIsLoading(false);
    }
  };

  const exportErrors = async () => {
    try {
      setIsExporting(true);
      
      const token = localStorage.getItem('access_token');
      
      if (!token) {
        onError('Authentication token not found');
        setIsExporting(false);
        return;
      }
      
      const response = await fetch(API_ENDPOINTS.IMPORT.EXPORT_ERRORS(sessionId), {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          ...(tenantId && { 'X-Tenant-ID': String(tenantId) }),
          ...(environment && { 'X-Environment': environment })
        }
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `import_errors_${sessionId}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        onError('Failed to export error report');
      }

    } catch (error: any) {
      onError('Error exporting results');
    } finally {
      setIsExporting(false);
    }
  };

  const formatProcessingTime = (milliseconds: number): string => {
    if (!milliseconds || milliseconds < 0) return '0ms';
    if (milliseconds < 1000) return `${milliseconds}ms`;
    if (milliseconds < 60000) return `${(milliseconds / 1000).toFixed(1)}s`;
    return `${(milliseconds / 60000).toFixed(1)}min`;
  };

  const getStatusColor = (status: string) => {
    const statusColors = {
      success: colors.semantic.success,
      failed: colors.semantic.error,
      duplicate: colors.semantic.warning,
      skipped: colors.utility.secondaryText
    };
    return statusColors[status as keyof typeof statusColors] || colors.utility.secondaryText;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="20,6 9,17 4,12" />
          </svg>
        );
      case 'failed':
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
        );
      case 'duplicate':
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
        );
      case 'skipped':
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
          </svg>
        );
      default:
        return null;
    }
  };

  if (isLoading && !resultsData) {
    return (
      <div style={{
        padding: '60px 40px',
        textAlign: 'center' as const
      }}>
        <div style={{
          color: colors.semantic.info,
          marginBottom: '24px'
        }}>
          <div style={{
            width: '48px',
            height: '48px',
            border: `4px solid ${colors.semantic.info}30`,
            borderTop: `4px solid ${colors.semantic.info}`,
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto'
          }} />
        </div>
        <h3 style={{
          fontSize: '20px',
          fontWeight: '600',
          color: colors.utility.primaryText,
          marginBottom: '8px',
          margin: 0
        }}>
          Loading Import Results
        </h3>
        <p style={{
          fontSize: '14px',
          color: colors.utility.secondaryText,
          margin: 0
        }}>
          Fetching processing results...
        </p>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div style={{ padding: '40px' }}>
      {/* Header */}
      <div style={{
        marginBottom: '32px',
        textAlign: 'center' as const
      }}>
        <h2 style={{
          fontSize: '24px',
          fontWeight: '700',
          color: colors.utility.primaryText,
          marginBottom: '8px',
          margin: 0
        }}>
          Import Results
        </h2>
        <p style={{
          fontSize: '16px',
          color: colors.utility.secondaryText,
          margin: 0
        }}>
          {resultsData?.session ? 
            `Session: ${resultsData.session.session_name} • Status: ${resultsData.session.status}` :
            `Session ID: ${sessionId}`
          }
        </p>
      </div>

      {/* Summary Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px',
        marginBottom: '32px'
      }}>
        <div style={{
          padding: '20px',
          backgroundColor: colors.utility.secondaryBackground,
          borderRadius: '12px',
          border: `1px solid ${colors.utility.primaryText}10`,
          textAlign: 'center' as const
        }}>
          <div style={{
            fontSize: '32px',
            fontWeight: '700',
            color: colors.brand.primary,
            marginBottom: '8px'
          }}>
            {resultsData?.summary?.totalRows || 0}
          </div>
          <div style={{
            fontSize: '14px',
            color: colors.utility.secondaryText,
            marginBottom: '4px'
          }}>
            Total Records
          </div>
          {resultsData?.summary?.processingTime ? (
            <div style={{
              fontSize: '12px',
              color: colors.utility.secondaryText
            }}>
              Processing time: {formatProcessingTime(resultsData.summary.processingTime)}
            </div>
          ) : null}
        </div>

        <div style={{
          padding: '20px',
          backgroundColor: colors.utility.secondaryBackground,
          borderRadius: '12px',
          border: `1px solid ${colors.semantic.success}30`,
          textAlign: 'center' as const
        }}>
          <div style={{
            fontSize: '32px',
            fontWeight: '700',
            color: colors.semantic.success,
            marginBottom: '8px'
          }}>
            {resultsData?.summary?.successfulRows || 0}
          </div>
          <div style={{
            fontSize: '14px',
            color: colors.utility.secondaryText,
            marginBottom: '4px'
          }}>
            Successful
          </div>
          <div style={{
            fontSize: '12px',
            color: colors.utility.secondaryText
          }}>
            {resultsData?.summary?.totalRows && resultsData.summary.totalRows > 0 
              ? `${((resultsData.summary.successfulRows / resultsData.summary.totalRows) * 100).toFixed(1)}% success rate`
              : '0% success rate'}
          </div>
        </div>

        <div style={{
          padding: '20px',
          backgroundColor: colors.utility.secondaryBackground,
          borderRadius: '12px',
          border: `1px solid ${colors.semantic.error}30`,
          textAlign: 'center' as const
        }}>
          <div style={{
            fontSize: '32px',
            fontWeight: '700',
            color: colors.semantic.error,
            marginBottom: '8px'
          }}>
            {resultsData?.summary?.failedRows || 0}
          </div>
          <div style={{
            fontSize: '14px',
            color: colors.utility.secondaryText,
            marginBottom: '4px'
          }}>
            Failed
          </div>
          {resultsData?.summary?.failedRows && resultsData.summary.failedRows > 0 ? (
            <button
              onClick={exportErrors}
              disabled={isExporting}
              style={{
                fontSize: '11px',
                color: colors.semantic.error,
                backgroundColor: 'transparent',
                border: `1px solid ${colors.semantic.error}40`,
                borderRadius: '4px',
                padding: '4px 8px',
                cursor: isExporting ? 'not-allowed' : 'pointer',
                marginTop: '4px'
              }}
            >
              {isExporting ? 'Exporting...' : 'Export Errors'}
            </button>
          ) : null}
        </div>

        <div style={{
          padding: '20px',
          backgroundColor: colors.utility.secondaryBackground,
          borderRadius: '12px',
          border: `1px solid ${colors.semantic.warning}30`,
          textAlign: 'center' as const
        }}>
          <div style={{
            fontSize: '32px',
            fontWeight: '700',
            color: colors.semantic.warning,
            marginBottom: '8px'
          }}>
            {resultsData?.summary?.duplicateRows || 0}
          </div>
          <div style={{
            fontSize: '14px',
            color: colors.utility.secondaryText,
            marginBottom: '4px'
          }}>
            Duplicates
          </div>
          <div style={{
            fontSize: '12px',
            color: colors.utility.secondaryText
          }}>
            Skipped existing records
          </div>
        </div>
      </div>

      {/* Filters and Controls */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px',
        padding: '16px',
        backgroundColor: colors.utility.secondaryBackground,
        borderRadius: '8px'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px'
        }}>
          <label style={{
            fontSize: '14px',
            fontWeight: '600',
            color: colors.utility.primaryText
          }}>
            Filter by status:
          </label>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            style={{
              padding: '6px 12px',
              border: `1px solid ${colors.utility.primaryText}20`,
              borderRadius: '6px',
              backgroundColor: colors.utility.primaryBackground,
              color: colors.utility.primaryText,
              fontSize: '14px'
            }}
          >
            <option value="all">All Records</option>
            <option value="success">Successful Only</option>
            <option value="failed">Failed Only</option>
            <option value="duplicate">Duplicates Only</option>
            <option value="skipped">Skipped Only</option>
          </select>
        </div>

        <button
          onClick={onStartNewImport}
          style={{
            backgroundColor: colors.brand.primary,
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            padding: '10px 20px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer'
          }}
        >
          Start New Import
        </button>
      </div>

      {/* Results Table */}
      <div style={{
        backgroundColor: colors.utility.primaryBackground,
        borderRadius: '12px',
        border: `1px solid ${colors.utility.primaryText}10`,
        overflow: 'hidden'
      }}>
        {/* Table Header */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '60px 80px 1fr 200px 120px',
          gap: '16px',
          padding: '16px 20px',
          backgroundColor: colors.utility.secondaryBackground,
          borderBottom: `1px solid ${colors.utility.primaryText}10`,
          fontSize: '12px',
          fontWeight: '600',
          color: colors.utility.secondaryText
        }}>
          <div style={{ textAlign: 'center' as const }}>ROW</div>
          <div>STATUS</div>
          <div>DATA PREVIEW</div>
          <div>ISSUES</div>
          <div>PROCESSED</div>
        </div>

        {/* Table Body */}
        <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
          {!resultsData?.records || resultsData.records.length === 0 ? (
            <div style={{
              padding: '40px',
              textAlign: 'center' as const,
              color: colors.utility.secondaryText
            }}>
              <p>No records to display</p>
            </div>
          ) : (
            resultsData.records.map((record, index) => (
              <div
                key={record.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '60px 80px 1fr 200px 120px',
                  gap: '16px',
                  padding: '16px 20px',
                  borderBottom: index < resultsData.records.length - 1 ? `1px solid ${colors.utility.primaryText}10` : 'none',
                  fontSize: '13px'
                }}
              >
                {/* Row Number */}
                <div style={{
                  textAlign: 'center' as const,
                  fontWeight: '600',
                  color: colors.utility.secondaryText
                }}>
                  {record.row_number}
                </div>

                {/* Status */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  color: getStatusColor(record.status)
                }}>
                  {getStatusIcon(record.status)}
                  <span style={{
                    fontSize: '11px',
                    fontWeight: '600',
                    textTransform: 'uppercase' as const
                  }}>
                    {record.status}
                  </span>
                </div>

                {/* Data Preview */}
                <div style={{
                  fontSize: '12px',
                  fontFamily: 'monospace',
                  color: colors.utility.primaryText,
                  overflow: 'hidden'
                }}>
                  <div style={{
                    whiteSpace: 'nowrap' as const,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    {record.raw_data && typeof record.raw_data === 'object' ? 
                      Object.entries(record.raw_data).slice(0, 3).map(([key, value]) => 
                        `${key}: ${value}`
                      ).join(' • ') : 
                      'No data'}
                    {record.raw_data && typeof record.raw_data === 'object' && 
                     Object.keys(record.raw_data).length > 3 ? ' ...' : ''}
                  </div>
                </div>

                {/* Issues */}
                <div style={{
                  fontSize: '11px',
                  color: colors.semantic.error
                }}>
                  {record.error_messages && Array.isArray(record.error_messages) && record.error_messages.length > 0 ? (
                    <div>
                      {record.error_messages.slice(0, 2).map((error, i) => (
                        <div key={i} style={{ marginBottom: '2px' }}>
                          • {error}
                        </div>
                      ))}
                      {record.error_messages.length > 2 && (
                        <div>+ {record.error_messages.length - 2} more</div>
                      )}
                    </div>
                  ) : null}
                  {record.warnings && Array.isArray(record.warnings) && record.warnings.length > 0 ? (
                    <div style={{ color: colors.semantic.warning, marginTop: '4px' }}>
                      {record.warnings.slice(0, 1).map((warning, i) => (
                        <div key={i}>⚠ {warning}</div>
                      ))}
                    </div>
                  ) : null}
                </div>

                {/* Processed Time */}
                <div style={{
                  fontSize: '11px',
                  color: colors.utility.secondaryText
                }}>
                  {record.processed_at ? new Date(record.processed_at).toLocaleString() : 'Not processed'}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pagination */}
        {resultsData?.pagination && resultsData.pagination.totalPages > 1 ? (
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '16px 20px',
            borderTop: `1px solid ${colors.utility.primaryText}10`,
            backgroundColor: colors.utility.secondaryBackground
          }}>
            <div style={{
              fontSize: '12px',
              color: colors.utility.secondaryText
            }}>
              Page {resultsData.pagination.page} of {resultsData.pagination.totalPages} 
              ({resultsData.pagination.total} total records)
            </div>

            <div style={{
              display: 'flex',
              gap: '8px'
            }}>
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={!resultsData.pagination.hasPrev}
                style={{
                  padding: '6px 12px',
                  border: `1px solid ${colors.utility.primaryText}30`,
                  borderRadius: '4px',
                  backgroundColor: 'transparent',
                  color: colors.utility.primaryText,
                  fontSize: '12px',
                  cursor: resultsData.pagination.hasPrev ? 'pointer' : 'not-allowed',
                  opacity: resultsData.pagination.hasPrev ? 1 : 0.5
                }}
              >
                Previous
              </button>
              
              <button
                onClick={() => setCurrentPage(prev => prev + 1)}
                disabled={!resultsData.pagination.hasNext}
                style={{
                  padding: '6px 12px',
                  border: `1px solid ${colors.utility.primaryText}30`,
                  borderRadius: '4px',
                  backgroundColor: 'transparent',
                  color: colors.utility.primaryText,
                  fontSize: '12px',
                  cursor: resultsData.pagination.hasNext ? 'pointer' : 'not-allowed',
                  opacity: resultsData.pagination.hasNext ? 1 : 0.5
                }}
              >
                Next
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default ImportResults;