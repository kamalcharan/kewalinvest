// frontend/src/components/Import/SessionRecordsTable.tsx
import React, { useState, useEffect } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { apiService } from '../../services/api.service';
import { ImportSession, FileImportType } from '../../types/import.types';
import RecordModal from './RecordModal';

interface StagingRecord {
  id: number;
  row_number: number;
  processing_status: string;
  error_messages?: string[];
  warnings?: string[];
  raw_data: any;
  mapped_data: any;
  processed_at?: string;
}

interface SessionRecordsTableProps {
  session: ImportSession | null;
}

// API Response type
interface RecordsResponse {
  success: boolean;
  data: {
    records: StagingRecord[];
    total: number;
  };
  message?: string;
}

const SessionRecordsTable: React.FC<SessionRecordsTableProps> = ({ session }) => {
  const { theme, isDarkMode } = useTheme();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;
  
  const [records, setRecords] = useState<StagingRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<string>('all');
  const [selectedRecord, setSelectedRecord] = useState<StagingRecord | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [page, setPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const pageSize = 50; // Default 50 records as per requirement

  useEffect(() => {
    if (session) {
      setPage(1); // Reset to first page when session changes
      fetchRecords();
    }
  }, [session?.id, filter]);

  useEffect(() => {
    if (session) {
      fetchRecords();
    }
  }, [page]);

  const fetchRecords = async () => {
    if (!session) return;
    
    try {
      setLoading(true);
      const params = new URLSearchParams({
        status: filter === 'all' ? '' : filter,
        offset: ((page - 1) * pageSize).toString(),
        limit: pageSize.toString()
      });
      
      const response = await apiService.get<RecordsResponse>(
        `/import/staging/${session.id}/records?${params}`
      );
      
      if (response && response.data) {
        setRecords(response.data.records || []);
        setTotalRecords(response.data.total || 0);
      }
    } catch (error) {
      console.error('Error fetching records:', error);
      setRecords([]);
      setTotalRecords(0);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusColors: Record<string, { bg: string; text: string }> = {
      'success': { bg: colors.semantic.success + '20', text: colors.semantic.success },
      'failed': { bg: colors.semantic.error + '20', text: colors.semantic.error },
      'duplicate': { bg: colors.semantic.warning + '20', text: colors.semantic.warning },
      'pending': { bg: colors.utility.secondaryText + '20', text: colors.utility.secondaryText },
      'processing': { bg: colors.semantic.info + '20', text: colors.semantic.info }
    };

    const statusStyle = statusColors[status] || statusColors['pending'];

    return (
      <span style={{
        padding: '4px 8px',
        borderRadius: '4px',
        fontSize: '11px',
        fontWeight: '600',
        backgroundColor: statusStyle.bg,
        color: statusStyle.text,
        textTransform: 'uppercase'
      }}>
        {status}
      </span>
    );
  };

  const getDisplayColumns = (): string[] => {
    if (!session) return [];
    
    const importType = session.import_type as string; // Cast to string for comparison
    
    if (importType === 'customer_import' || importType === 'CustomerData') {
      return ['name', 'email', 'mobile', 'pan', 'city'];
    } else if (importType === 'scheme_import' || importType === 'SchemeData') {
      return ['scheme_code', 'scheme_name', 'amc_name', 'scheme_type', 'scheme_category'];
    } else {
      return ['transaction_id', 'amount', 'date', 'customer_id', 'description'];
    }
  };

  const getColumnLabel = (column: string): string => {
    return column
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const getFieldValue = (record: StagingRecord, field: string): string => {
    const value = record.mapped_data?.[field];
    if (value === null || value === undefined || value === '') {
      return '-';
    }
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    return String(value);
  };

  const displayColumns = getDisplayColumns();
  const totalPages = Math.ceil(totalRecords / pageSize);

  if (!session) {
    return (
      <div style={{
        padding: '60px 20px',
        textAlign: 'center',
        backgroundColor: colors.utility.secondaryBackground,
        borderRadius: '12px',
        border: `1px solid ${colors.utility.primaryText}10`
      }}>
        <div style={{
          fontSize: '48px',
          marginBottom: '16px',
          opacity: 0.5
        }}>
          📋
        </div>
        <p style={{
          fontSize: '16px',
          color: colors.utility.secondaryText
        }}>
          Select a session from the sidebar to view records
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Filter Bar */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px',
        padding: '12px',
        backgroundColor: colors.utility.secondaryBackground,
        borderRadius: '8px',
        border: `1px solid ${colors.utility.primaryText}10`
      }}>
        <div style={{
          display: 'flex',
          gap: '8px',
          flex: 1
        }}>
          {['all', 'success', 'failed', 'duplicate', 'pending'].map(filterType => (
            <button
              key={filterType}
              onClick={() => {
                setFilter(filterType);
                setPage(1);
              }}
              style={{
                padding: '6px 12px',
                backgroundColor: filter === filterType 
                  ? colors.brand.primary 
                  : colors.utility.primaryBackground,
                color: filter === filterType 
                  ? 'white' 
                  : colors.utility.primaryText,
                border: `1px solid ${
                  filter === filterType 
                    ? colors.brand.primary 
                    : colors.utility.primaryText + '20'
                }`,
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: '500',
                cursor: 'pointer',
                textTransform: 'capitalize',
                transition: 'all 0.2s'
              }}
            >
              {filterType}
            </button>
          ))}
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <span style={{
            fontSize: '12px',
            color: colors.utility.secondaryText
          }}>
            Showing {records.length} of {totalRecords} records
          </span>
          <button
            onClick={fetchRecords}
            style={{
              padding: '6px 12px',
              backgroundColor: colors.utility.primaryBackground,
              border: `1px solid ${colors.utility.primaryText}20`,
              borderRadius: '6px',
              color: colors.utility.secondaryText,
              fontSize: '12px',
              cursor: 'pointer'
            }}
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Records Table */}
      <div style={{
        backgroundColor: colors.utility.primaryBackground,
        borderRadius: '12px',
        border: `1px solid ${colors.utility.primaryText}10`,
        overflow: 'hidden'
      }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            minWidth: '1000px'
          }}>
            <thead>
              <tr style={{
                backgroundColor: colors.utility.secondaryBackground
              }}>
                <th style={{ 
                  padding: '14px', 
                  textAlign: 'left', 
                  fontSize: '11px', 
                  fontWeight: '600', 
                  color: colors.utility.secondaryText,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  minWidth: '70px',
                  position: 'sticky',
                  left: 0,
                  backgroundColor: colors.utility.secondaryBackground,
                  zIndex: 1
                }}>
                  Row #
                </th>
                {displayColumns.map(col => (
                  <th key={col} style={{ 
                    padding: '14px', 
                    textAlign: 'left', 
                    fontSize: '11px', 
                    fontWeight: '600', 
                    color: colors.utility.secondaryText,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    minWidth: '140px'
                  }}>
                    {getColumnLabel(col)}
                  </th>
                ))}
                <th style={{ 
                  padding: '14px', 
                  textAlign: 'center', 
                  fontSize: '11px', 
                  fontWeight: '600', 
                  color: colors.utility.secondaryText,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  minWidth: '100px'
                }}>
                  Status
                </th>
                <th style={{ 
                  padding: '14px', 
                  textAlign: 'left', 
                  fontSize: '11px', 
                  fontWeight: '600', 
                  color: colors.utility.secondaryText,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  minWidth: '250px'
                }}>
                  Error/Warning
                </th>
                <th style={{ 
                  padding: '14px', 
                  textAlign: 'center', 
                  fontSize: '11px', 
                  fontWeight: '600', 
                  color: colors.utility.secondaryText,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  minWidth: '80px'
                }}>
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={displayColumns.length + 4} style={{
                    padding: '48px',
                    textAlign: 'center',
                    color: colors.utility.secondaryText
                  }}>
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '12px'
                    }}>
                      <div style={{
                        width: '40px',
                        height: '40px',
                        border: `3px solid ${colors.brand.primary}`,
                        borderTopColor: 'transparent',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite'
                      }} />
                      Loading records...
                    </div>
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={displayColumns.length + 4} style={{
                    padding: '48px',
                    textAlign: 'center',
                    color: colors.utility.secondaryText
                  }}>
                    No records found
                  </td>
                </tr>
              ) : (
                records.map((record, index) => (
                  <tr 
                    key={record.id}
                    style={{
                      backgroundColor: index % 2 === 0 
                        ? 'transparent'
                        : colors.brand.alternate + '20', // Using alternate color with 20% opacity
                      borderTop: `1px solid ${colors.utility.primaryText}05`,
                      cursor: 'pointer',
                      transition: 'background-color 0.2s'
                    }}
                    onClick={() => {
                      setSelectedRecord(record);
                      setShowModal(true);
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = colors.brand.tertiary + '15'; // Tertiary color on hover
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = index % 2 === 0 
                        ? 'transparent'
                        : colors.brand.alternate + '20';
                    }}
                  >
                    <td style={{ 
                      padding: '14px', 
                      fontSize: '13px', 
                      fontWeight: '600', 
                      color: colors.utility.primaryText,
                      position: 'sticky',
                      left: 0,
                      backgroundColor: index % 2 === 0 
                        ? colors.utility.primaryBackground
                        : colors.brand.alternate + '20', // Match row background
                      zIndex: 1,
                      transition: 'background-color 0.2s'
                    }}>
                      {record.row_number}
                    </td>
                    {displayColumns.map(col => (
                      <td key={col} style={{ 
                        padding: '14px', 
                        fontSize: '13px', 
                        color: colors.utility.primaryText,
                        maxWidth: '200px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {getFieldValue(record, col)}
                      </td>
                    ))}
                    <td style={{ 
                      padding: '14px', 
                      textAlign: 'center' 
                    }}>
                      {getStatusBadge(record.processing_status)}
                    </td>
                    <td style={{ 
                      padding: '14px', 
                      fontSize: '12px', 
                      color: record.error_messages?.length 
                        ? colors.semantic.error 
                        : colors.semantic.warning,
                      maxWidth: '300px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {record.error_messages?.join(', ') || record.warnings?.join(', ') || '-'}
                    </td>
                    <td style={{ 
                      padding: '14px', 
                      textAlign: 'center' 
                    }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedRecord(record);
                          setShowModal(true);
                        }}
                        style={{
                          padding: '4px 10px',
                          backgroundColor: 'transparent',
                          color: colors.brand.primary,
                          border: `1px solid ${colors.brand.primary}`,
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: '500',
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                        onMouseOver={(e) => {
                          e.currentTarget.style.backgroundColor = colors.brand.primary;
                          e.currentTarget.style.color = 'white';
                        }}
                        onMouseOut={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                          e.currentTarget.style.color = colors.brand.primary;
                        }}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Add CSS for spinner animation */}
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: '20px',
          padding: '16px',
          backgroundColor: colors.utility.secondaryBackground,
          borderRadius: '8px',
          border: `1px solid ${colors.utility.primaryText}10`
        }}>
          <div style={{
            fontSize: '13px',
            color: colors.utility.secondaryText
          }}>
            Page {page} of {totalPages} • {totalRecords} total records
          </div>
          
          <div style={{
            display: 'flex',
            gap: '8px',
            alignItems: 'center'
          }}>
            <button
              onClick={() => setPage(1)}
              disabled={page === 1}
              style={{
                padding: '8px 12px',
                backgroundColor: colors.utility.primaryBackground,
                color: page === 1 ? colors.utility.secondaryText : colors.utility.primaryText,
                border: `1px solid ${colors.utility.primaryText}20`,
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: '500',
                cursor: page === 1 ? 'not-allowed' : 'pointer',
                opacity: page === 1 ? 0.5 : 1,
                transition: 'all 0.2s'
              }}
            >
              First
            </button>
            
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              style={{
                padding: '8px 12px',
                backgroundColor: colors.utility.primaryBackground,
                color: page === 1 ? colors.utility.secondaryText : colors.utility.primaryText,
                border: `1px solid ${colors.utility.primaryText}20`,
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: '500',
                cursor: page === 1 ? 'not-allowed' : 'pointer',
                opacity: page === 1 ? 0.5 : 1,
                transition: 'all 0.2s'
              }}
            >
              Previous
            </button>
            
            {/* Page Number Input */}
            <input
              type="number"
              min={1}
              max={totalPages}
              value={page}
              onChange={(e) => {
                const newPage = parseInt(e.target.value);
                if (newPage >= 1 && newPage <= totalPages) {
                  setPage(newPage);
                }
              }}
              style={{
                width: '60px',
                padding: '8px',
                backgroundColor: colors.utility.primaryBackground,
                color: colors.utility.primaryText,
                border: `1px solid ${colors.utility.primaryText}20`,
                borderRadius: '6px',
                fontSize: '12px',
                textAlign: 'center'
              }}
            />
            
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              style={{
                padding: '8px 12px',
                backgroundColor: colors.utility.primaryBackground,
                color: page >= totalPages ? colors.utility.secondaryText : colors.utility.primaryText,
                border: `1px solid ${colors.utility.primaryText}20`,
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: '500',
                cursor: page >= totalPages ? 'not-allowed' : 'pointer',
                opacity: page >= totalPages ? 0.5 : 1,
                transition: 'all 0.2s'
              }}
            >
              Next
            </button>
            
            <button
              onClick={() => setPage(totalPages)}
              disabled={page === totalPages}
              style={{
                padding: '8px 12px',
                backgroundColor: colors.utility.primaryBackground,
                color: page === totalPages ? colors.utility.secondaryText : colors.utility.primaryText,
                border: `1px solid ${colors.utility.primaryText}20`,
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: '500',
                cursor: page === totalPages ? 'not-allowed' : 'pointer',
                opacity: page === totalPages ? 0.5 : 1,
                transition: 'all 0.2s'
              }}
            >
              Last
            </button>
          </div>
        </div>
      )}

      {/* Record Detail Modal */}
      {showModal && selectedRecord && (
        <RecordModal
          record={selectedRecord}
          onClose={() => {
            setShowModal(false);
            setSelectedRecord(null);
          }}
        />
      )}
    </div>
  );
};

export default SessionRecordsTable;