// frontend/src/components/ETL/HeaderPreview.tsx
import React, { useState, useEffect } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { API_ENDPOINTS } from '../../services/serviceURLs';

interface HeaderPreviewProps {
  fileId: number;
  fileName: string;
  onHeadersConfirmed: (headerData: any) => void;
  onError: (error: string) => void;
  disabled?: boolean;
}

interface HeaderData {
  headers: string[];
  sampleData: any[];
  totalRows: number;
  detectedColumns: number;
}

const HeaderPreview: React.FC<HeaderPreviewProps> = ({
  fileId,
  fileName,
  onHeadersConfirmed,
  onError,
  disabled = false
}) => {
  const { theme, isDarkMode } = useTheme();
  const { tenantId, environment } = useAuth();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;
  
  const [headerData, setHeaderData] = useState<HeaderData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch headers on component mount
  useEffect(() => {
    fetchHeaders();
  }, [fileId]);

  const fetchHeaders = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const token = localStorage.getItem('access_token');
      const response = await fetch(API_ENDPOINTS.IMPORT.HEADERS(fileId), {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'X-Tenant-ID': String(tenantId),
          'X-Environment': environment || 'test'
        }
      });

      const result = await response.json();

   if (result.success) {
  // Ensure all required fields exist
  const data = result.data || {};
  const validData: HeaderData = {
    headers: data.headers || [],
    sampleData: data.sampleData || [],
    totalRows: data.totalRows || 0,
    detectedColumns: data.detectedColumns || 0
  };
  setHeaderData(validData);
} else {
  const errorMsg = result.error || 'Failed to detect headers';
  setError(errorMsg);
  onError(errorMsg);
}

    } catch (error: any) {
      const errorMsg = 'Network error while detecting headers';
      setError(errorMsg);
      onError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmHeaders = () => {
    if (headerData) {
      onHeadersConfirmed(headerData);
    }
  };

  const handleRetry = () => {
    fetchHeaders();
  };

  // Format cell value for display
  const formatCellValue = (value: any): string => {
    if (value === null || value === undefined) {
      return '';
    }
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    return String(value);
  };

  // Get column type suggestion based on sample data
  const getColumnType = (header: string, sampleValues: any[]): string => {
    const nonEmptyValues = sampleValues.filter(v => v !== null && v !== undefined && v !== '');
    
    if (nonEmptyValues.length === 0) return 'text';

    // Check for common patterns
    const headerLower = header.toLowerCase();
    
    // Email detection
    if (headerLower.includes('email') || headerLower.includes('mail')) {
      return 'email';
    }
    
    // Phone detection
    if (headerLower.includes('phone') || headerLower.includes('mobile') || headerLower.includes('contact')) {
      return 'phone';
    }
    
    // Date detection
    if (headerLower.includes('date') || headerLower.includes('birth') || headerLower.includes('anniversary')) {
      return 'date';
    }
    
    // PAN detection
    if (headerLower.includes('pan')) {
      return 'pan';
    }
    
    // Number detection
    const isNumeric = nonEmptyValues.every(v => !isNaN(Number(v)));
    if (isNumeric) {
      return 'number';
    }
    
    return 'text';
  };

  // Icons
  const FileIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14,2H6a2,2 0 0,0 -2,2v16a2,2 0 0,0 2,2h12a2,2 0 0,0 2,-2V8z" />
      <polyline points="14,2 14,8 20,8" />
    </svg>
  );

  const CheckIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="20,6 9,17 4,12" />
    </svg>
  );

  const RefreshIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="23,4 23,10 17,10" />
      <polyline points="1,20 1,14 7,14" />
      <path d="M20.49,9A9,9 0 0,0 5.64,5.64L1,10m22,4l-4.64,4.36A9,9 0 0,1 3.51,15" />
    </svg>
  );

  const AlertIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );

  if (isLoading) {
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
          marginBottom: '8px'
        }}>
          Analyzing File Headers
        </h3>
        <p style={{
          fontSize: '14px',
          color: colors.utility.secondaryText
        }}>
          Reading and detecting columns from your file...
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

  if (error) {
    return (
      <div style={{
        padding: '40px',
        textAlign: 'center' as const
      }}>
        <div style={{
          color: colors.semantic.error,
          marginBottom: '24px'
        }}>
          <AlertIcon />
        </div>

        <h3 style={{
          fontSize: '20px',
          fontWeight: '600',
          color: colors.utility.primaryText,
          marginBottom: '8px'
        }}>
          Unable to Read File Headers
        </h3>
        <p style={{
          fontSize: '14px',
          color: colors.utility.secondaryText,
          marginBottom: '24px'
        }}>
          {error}
        </p>

        <button
          onClick={handleRetry}
          style={{
            backgroundColor: colors.brand.primary,
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            padding: '12px 24px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            margin: '0 auto'
          }}
        >
          <RefreshIcon />
          Try Again
        </button>
      </div>
    );
  }

  if (!headerData) {
    return null;
  }

  return (
    <div style={{
      padding: '40px'
    }}>
      {/* Header */}
      <div style={{
        marginBottom: '32px',
        textAlign: 'center' as const
      }}>
        <h2 style={{
          fontSize: '24px',
          fontWeight: '700',
          color: colors.utility.primaryText,
          marginBottom: '8px'
        }}>
          Preview File Headers
        </h2>
        <p style={{
          fontSize: '16px',
          color: colors.utility.secondaryText
        }}>
          Review the detected columns and sample data from your file
        </p>
      </div>

      {/* File Info */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '16px',
        marginBottom: '32px',
        padding: '16px',
        backgroundColor: colors.utility.secondaryBackground,
        borderRadius: '12px',
        border: `1px solid ${colors.utility.primaryText}10`
      }}>
        <div style={{
          color: colors.utility.secondaryText
        }}>
          <FileIcon />
        </div>
        
        <div>
          <div style={{
            fontSize: '14px',
            fontWeight: '600',
            color: colors.utility.primaryText
          }}>
            {fileName}
          </div>
          <div style={{
            fontSize: '12px',
            color: colors.utility.secondaryText
          }}>
            {headerData.detectedColumns} columns • {headerData.totalRows} total rows
          </div>
        </div>
      </div>

      {/* Data Preview Table */}
      <div style={{
        backgroundColor: colors.utility.primaryBackground,
        borderRadius: '12px',
        border: `1px solid ${colors.utility.primaryText}10`,
        overflow: 'hidden',
        marginBottom: '32px'
      }}>
        <div style={{
          padding: '16px 20px',
          backgroundColor: colors.utility.secondaryBackground,
          borderBottom: `1px solid ${colors.utility.primaryText}10`
        }}>
          <h4 style={{
            fontSize: '16px',
            fontWeight: '600',
            color: colors.utility.primaryText,
            marginBottom: '4px'
          }}>
            Sample Data Preview
          </h4>
          <p style={{
            fontSize: '12px',
            color: colors.utility.secondaryText
          }}>
            Showing first {headerData.sampleData.length} rows
          </p>
        </div>

        <div style={{
          overflowX: 'auto'
        }}>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse' as const
          }}>
            {/* Header Row */}
            <thead>
              <tr style={{
                backgroundColor: colors.utility.secondaryBackground
              }}>
                <th style={{
                  padding: '12px 16px',
                  textAlign: 'left' as const,
                  fontSize: '11px',
                  fontWeight: '600',
                  color: colors.utility.secondaryText,
                  borderRight: `1px solid ${colors.utility.primaryText}10`,
                  minWidth: '60px'
                }}>
                  ROW
                </th>
                {headerData.headers.map((header, index) => {
                  const sampleValues = headerData.sampleData.map(row => row[header]);
                  const columnType = getColumnType(header, sampleValues);
                  
                  return (
                    <th key={index} style={{
                      padding: '12px 16px',
                      textAlign: 'left' as const,
                      fontSize: '12px',
                      fontWeight: '600',
                      color: colors.utility.primaryText,
                      borderRight: index < headerData.headers.length - 1 ? `1px solid ${colors.utility.primaryText}10` : 'none',
                      minWidth: '150px',
                      position: 'relative' as const
                    }}>
                      <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px'
                      }}>
                        <span>{header}</span>
                        <span style={{
                          fontSize: '10px',
                          color: colors.utility.secondaryText,
                          backgroundColor: colors.utility.primaryText + '10',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          alignSelf: 'flex-start'
                        }}>
                          {columnType}
                        </span>
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>

            {/* Data Rows */}
            <tbody>
              {headerData.sampleData.map((row, rowIndex) => (
                <tr key={rowIndex} style={{
                  borderBottom: rowIndex < headerData.sampleData.length - 1 ? `1px solid ${colors.utility.primaryText}10` : 'none'
                }}>
                  <td style={{
                    padding: '12px 16px',
                    fontSize: '11px',
                    color: colors.utility.secondaryText,
                    borderRight: `1px solid ${colors.utility.primaryText}10`,
                    backgroundColor: colors.utility.secondaryBackground
                  }}>
                    {rowIndex + 1}
                  </td>
                  {headerData.headers.map((header, colIndex) => (
                    <td key={colIndex} style={{
                      padding: '12px 16px',
                      fontSize: '13px',
                      color: colors.utility.primaryText,
                      borderRight: colIndex < headerData.headers.length - 1 ? `1px solid ${colors.utility.primaryText}10` : 'none',
                      fontFamily: 'monospace',
                      maxWidth: '200px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap' as const
                    }}>
                      {formatCellValue(row[header]) || (
                        <span style={{
                          color: colors.utility.secondaryText,
                          fontStyle: 'italic'
                        }}>
                          (empty)
                        </span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary Stats */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px',
        marginBottom: '32px'
      }}>
        <div style={{
          padding: '16px',
          backgroundColor: colors.utility.secondaryBackground,
          borderRadius: '8px',
          border: `1px solid ${colors.utility.primaryText}10`,
          textAlign: 'center' as const
        }}>
          <div style={{
            fontSize: '24px',
            fontWeight: '700',
            color: colors.brand.primary,
            marginBottom: '4px'
          }}>
            {headerData.detectedColumns}
          </div>
          <div style={{
            fontSize: '12px',
            color: colors.utility.secondaryText
          }}>
            Columns Detected
          </div>
        </div>

        <div style={{
          padding: '16px',
          backgroundColor: colors.utility.secondaryBackground,
          borderRadius: '8px',
          border: `1px solid ${colors.utility.primaryText}10`,
          textAlign: 'center' as const
        }}>
          <div style={{
            fontSize: '24px',
            fontWeight: '700',
            color: colors.semantic.success,
            marginBottom: '4px'
          }}>
            {headerData.totalRows}
          </div>
          <div style={{
            fontSize: '12px',
            color: colors.utility.secondaryText
          }}>
            Total Rows
          </div>
        </div>

        <div style={{
          padding: '16px',
          backgroundColor: colors.utility.secondaryBackground,
          borderRadius: '8px',
          border: `1px solid ${colors.utility.primaryText}10`,
          textAlign: 'center' as const
        }}>
          <div style={{
            fontSize: '24px',
            fontWeight: '700',
            color: colors.semantic.info,
            marginBottom: '4px'
          }}>
            {headerData.sampleData.length}
          </div>
          <div style={{
            fontSize: '12px',
            color: colors.utility.secondaryText
          }}>
            Preview Rows
          </div>
        </div>
      </div>

      {/* Action Button */}
      <div style={{
        textAlign: 'center' as const
      }}>
        <button
          onClick={handleConfirmHeaders}
          disabled={disabled}
          style={{
            backgroundColor: colors.brand.primary,
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            padding: '16px 32px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: disabled ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            margin: '0 auto',
            opacity: disabled ? 0.6 : 1
          }}
        >
          <CheckIcon />
          Confirm Headers & Continue
        </button>

        <p style={{
          fontSize: '12px',
          color: colors.utility.secondaryText,
          marginTop: '12px'
        }}>
          The columns look correct? Proceed to field mapping
        </p>
      </div>
    </div>
  );
};

export default HeaderPreview;