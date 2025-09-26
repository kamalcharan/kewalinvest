// frontend/src/components/nav/NavDataViewerModal.tsx
// Modal to view paginated NAV data for specific bookmark

import React, { useState, useEffect } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { useNavData } from '../../hooks/useNavData';
import { toastService } from '../../services/toast.service';
import { FrontendErrorLogger } from '../../services/errorLogger.service';
import type { SchemeBookmark, NavData } from '../../services/nav.service';

interface NavDataViewerModalProps {
  isOpen: boolean;
  bookmark: SchemeBookmark | null;
  onClose: () => void;
}

export const NavDataViewerModal: React.FC<NavDataViewerModalProps> = ({
  isOpen,
  bookmark,
  onClose
}) => {
  const { theme, isDarkMode } = useTheme();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;
  const { fetchNavData } = useNavData();

  // State
  const [navData, setNavData] = useState<NavData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20);
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // Load NAV data when modal opens
  useEffect(() => {
    if (isOpen && bookmark) {
      resetFilters();
      loadNavData();
    }
  }, [isOpen, bookmark]);

  const resetFilters = () => {
    setCurrentPage(1);
    setStartDate('');
    setEndDate('');
    setError(null);
    
    // Set default date range if bookmark has data
    if (bookmark?.earliest_nav_date && bookmark?.latest_nav_date) {
      // Show last 3 months by default
      const end = new Date(bookmark.latest_nav_date);
      const start = new Date(end);
      start.setMonth(start.getMonth() - 3);
      
      setEndDate(end.toISOString().split('T')[0]);
      setStartDate(start.toISOString().split('T')[0]);
    }
  };

  const loadNavData = async (page: number = 1) => {
    if (!bookmark) return;

    setIsLoading(true);
    setError(null);

    try {
      const params = {
        scheme_id: bookmark.scheme_id,
        page,
        page_size: pageSize,
        ...(startDate && { start_date: startDate }),
        ...(endDate && { end_date: endDate })
      };

      const response = await fetchNavData(params);
      
      if (response.success && response.data) {
        setNavData(response.data.nav_data || []);
        setTotalRecords(response.data.total || 0);
        setTotalPages(response.data.total_pages || 0);
        setCurrentPage(response.data.page || 1);
      } else {
        setError(response.error || 'Failed to load NAV data');
        setNavData([]);
      }
    } catch (err: any) {
      FrontendErrorLogger.error(
        'Failed to load NAV data',
        'NavDataViewerModal',
        {
          bookmarkId: bookmark.id,
          schemeId: bookmark.scheme_id,
          error: err.message
        },
        err.stack
      );
      setError(err.message || 'Failed to load NAV data');
      setNavData([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages && !isLoading) {
      setCurrentPage(newPage);
      loadNavData(newPage);
    }
  };

  const handleFilterChange = () => {
    setCurrentPage(1);
    loadNavData(1);
  };

  const handleExportData = () => {
    if (navData.length === 0) {
      toastService.warning('No data to export');
      return;
    }

    try {
      // Create CSV content
      const headers = ['Date', 'NAV Value', 'Repurchase Price', 'Sale Price'];
      const csvContent = [
        headers.join(','),
        ...navData.map(row => [
          new Date(row.nav_date).toLocaleDateString(),
          row.nav_value.toFixed(4),
          row.repurchase_price?.toFixed(4) || 'N/A',
          row.sale_price?.toFixed(4) || 'N/A'
        ].join(','))
      ].join('\n');

      // Download CSV file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `${bookmark?.scheme_code}_nav_data.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toastService.success('NAV data exported successfully');
    } catch (error: any) {
      toastService.error('Failed to export data');
    }
  };

  if (!isOpen || !bookmark) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: colors.utility.primaryBackground,
        borderRadius: '16px',
        padding: '24px',
        width: '90%',
        maxWidth: '1000px',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
        border: `1px solid ${colors.utility.primaryText}10`
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '20px',
          paddingBottom: '16px',
          borderBottom: `1px solid ${colors.utility.primaryText}10`
        }}>
          <div>
            <h3 style={{
              fontSize: '20px',
              fontWeight: '600',
              color: colors.utility.primaryText,
              margin: '0 0 4px 0',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              📊 NAV Data Viewer
            </h3>
            <p style={{
              fontSize: '14px',
              color: colors.utility.secondaryText,
              margin: 0
            }}>
              {bookmark.scheme_name} ({bookmark.scheme_code})
            </p>
          </div>
          
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              onClick={handleExportData}
              disabled={navData.length === 0 || isLoading}
              style={{
                padding: '8px 12px',
                backgroundColor: navData.length === 0 || isLoading 
                  ? colors.utility.secondaryText 
                  : colors.brand.secondary,
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: navData.length === 0 || isLoading ? 'not-allowed' : 'pointer',
                fontSize: '12px',
                fontWeight: '500'
              }}
            >
              📥 Export CSV
            </button>
            
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '24px',
                color: colors.utility.secondaryText,
                cursor: 'pointer',
                padding: '4px',
                borderRadius: '4px',
                transition: 'color 0.2s ease'
              }}
            >
              ×
            </button>
          </div>
        </div>

        {/* Filters */}
        <div style={{
          display: 'flex',
          gap: '12px',
          alignItems: 'end',
          marginBottom: '20px',
          flexWrap: 'wrap'
        }}>
          <div>
            <label style={{
              display: 'block',
              fontSize: '12px',
              fontWeight: '500',
              color: colors.utility.primaryText,
              marginBottom: '4px'
            }}>
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              disabled={isLoading}
              style={{
                padding: '6px 8px',
                border: `1px solid ${colors.utility.primaryText}20`,
                borderRadius: '4px',
                backgroundColor: colors.utility.primaryBackground,
                color: colors.utility.primaryText,
                fontSize: '12px',
                outline: 'none'
              }}
            />
          </div>

          <div>
            <label style={{
              display: 'block',
              fontSize: '12px',
              fontWeight: '500',
              color: colors.utility.primaryText,
              marginBottom: '4px'
            }}>
              End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              disabled={isLoading}
              style={{
                padding: '6px 8px',
                border: `1px solid ${colors.utility.primaryText}20`,
                borderRadius: '4px',
                backgroundColor: colors.utility.primaryBackground,
                color: colors.utility.primaryText,
                fontSize: '12px',
                outline: 'none'
              }}
            />
          </div>

          <button
            onClick={handleFilterChange}
            disabled={isLoading}
            style={{
              padding: '6px 12px',
              backgroundColor: isLoading ? colors.utility.secondaryText : colors.brand.primary,
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              fontSize: '12px',
              fontWeight: '500'
            }}
          >
            Apply Filter
          </button>

          <button
            onClick={() => {
              resetFilters();
              loadNavData(1);
            }}
            disabled={isLoading}
            style={{
              padding: '6px 12px',
              backgroundColor: 'transparent',
              color: colors.utility.secondaryText,
              border: `1px solid ${colors.utility.secondaryText}`,
              borderRadius: '4px',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              fontSize: '12px',
              fontWeight: '500'
            }}
          >
            Reset
          </button>
        </div>

        {/* Data Summary */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px',
          padding: '8px 0'
        }}>
          <div style={{
            fontSize: '14px',
            color: colors.utility.primaryText,
            fontWeight: '500'
          }}>
            {totalRecords > 0 ? `${totalRecords.toLocaleString()} records found` : 'No records found'}
          </div>
          
          {totalPages > 1 && (
            <div style={{
              fontSize: '12px',
              color: colors.utility.secondaryText
            }}>
              Page {currentPage} of {totalPages}
            </div>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div style={{
            padding: '12px',
            backgroundColor: colors.semantic.error + '10',
            color: colors.semantic.error,
            borderRadius: '6px',
            marginBottom: '16px',
            border: `1px solid ${colors.semantic.error}30`,
            fontSize: '14px'
          }}>
            {error}
          </div>
        )}

        {/* Data Table */}
        <div style={{
          flex: 1,
          overflow: 'auto',
          border: `1px solid ${colors.utility.primaryText}10`,
          borderRadius: '8px'
        }}>
          {isLoading ? (
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              padding: '40px',
              color: colors.utility.secondaryText
            }}>
              <span style={{
                width: '24px',
                height: '24px',
                border: '3px solid transparent',
                borderTop: `3px solid ${colors.brand.primary}`,
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                marginRight: '12px'
              }} />
              Loading NAV data...
            </div>
          ) : navData.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '40px',
              color: colors.utility.secondaryText
            }}>
              <div style={{ fontSize: '32px', marginBottom: '12px' }}>📊</div>
              <p style={{ margin: 0 }}>
                No NAV data found for the selected date range
              </p>
            </div>
          ) : (
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '14px'
            }}>
              <thead>
                <tr style={{
                  backgroundColor: colors.utility.secondaryBackground,
                  borderBottom: `1px solid ${colors.utility.primaryText}10`
                }}>
                  <th style={{
                    padding: '12px 16px',
                    textAlign: 'left',
                    fontWeight: '600',
                    color: colors.utility.primaryText,
                    borderRight: `1px solid ${colors.utility.primaryText}10`
                  }}>
                    Date
                  </th>
                  <th style={{
                    padding: '12px 16px',
                    textAlign: 'right',
                    fontWeight: '600',
                    color: colors.utility.primaryText,
                    borderRight: `1px solid ${colors.utility.primaryText}10`
                  }}>
                    NAV Value
                  </th>
                  <th style={{
                    padding: '12px 16px',
                    textAlign: 'right',
                    fontWeight: '600',
                    color: colors.utility.primaryText,
                    borderRight: `1px solid ${colors.utility.primaryText}10`
                  }}>
                    Repurchase Price
                  </th>
                  <th style={{
                    padding: '12px 16px',
                    textAlign: 'right',
                    fontWeight: '600',
                    color: colors.utility.primaryText
                  }}>
                    Sale Price
                  </th>
                </tr>
              </thead>
              <tbody>
                {navData.map((row, index) => (
                  <tr
                    key={`${row.scheme_id}-${row.nav_date}`}
                    style={{
                      borderBottom: `1px solid ${colors.utility.primaryText}05`,
                      backgroundColor: index % 2 === 0 
                        ? 'transparent' 
                        : colors.utility.primaryText + '02'
                    }}
                  >
                    <td style={{
                      padding: '10px 16px',
                      color: colors.utility.primaryText,
                      borderRight: `1px solid ${colors.utility.primaryText}05`
                    }}>
                      {new Date(row.nav_date).toLocaleDateString()}
                    </td>
                    <td style={{
                      padding: '10px 16px',
                      textAlign: 'right',
                      color: colors.brand.primary,
                      fontWeight: '600',
                      borderRight: `1px solid ${colors.utility.primaryText}05`
                    }}>
                      ₹{row.nav_value.toFixed(4)}
                    </td>
                    <td style={{
                      padding: '10px 16px',
                      textAlign: 'right',
                      color: colors.utility.secondaryText,
                      borderRight: `1px solid ${colors.utility.primaryText}05`
                    }}>
                      {row.repurchase_price ? `₹${row.repurchase_price.toFixed(4)}` : 'N/A'}
                    </td>
                    <td style={{
                      padding: '10px 16px',
                      textAlign: 'right',
                      color: colors.utility.secondaryText
                    }}>
                      {row.sale_price ? `₹${row.sale_price.toFixed(4)}` : 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '8px',
            marginTop: '16px',
            paddingTop: '16px',
            borderTop: `1px solid ${colors.utility.primaryText}10`
          }}>
            <button
              onClick={() => handlePageChange(1)}
              disabled={currentPage === 1 || isLoading}
              style={{
                padding: '6px 10px',
                backgroundColor: (currentPage === 1 || isLoading) 
                  ? colors.utility.secondaryBackground 
                  : colors.brand.primary,
                color: (currentPage === 1 || isLoading) 
                  ? colors.utility.secondaryText 
                  : 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: (currentPage === 1 || isLoading) ? 'not-allowed' : 'pointer',
                fontSize: '12px'
              }}
            >
              First
            </button>
            
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1 || isLoading}
              style={{
                padding: '6px 10px',
                backgroundColor: (currentPage === 1 || isLoading) 
                  ? colors.utility.secondaryBackground 
                  : colors.brand.primary,
                color: (currentPage === 1 || isLoading) 
                  ? colors.utility.secondaryText 
                  : 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: (currentPage === 1 || isLoading) ? 'not-allowed' : 'pointer',
                fontSize: '12px'
              }}
            >
              Previous
            </button>

            <span style={{
              padding: '6px 12px',
              fontSize: '12px',
              color: colors.utility.primaryText,
              fontWeight: '500'
            }}>
              {currentPage} / {totalPages}
            </span>

            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages || isLoading}
              style={{
                padding: '6px 10px',
                backgroundColor: (currentPage === totalPages || isLoading) 
                  ? colors.utility.secondaryBackground 
                  : colors.brand.primary,
                color: (currentPage === totalPages || isLoading) 
                  ? colors.utility.secondaryText 
                  : 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: (currentPage === totalPages || isLoading) ? 'not-allowed' : 'pointer',
                fontSize: '12px'
              }}
            >
              Next
            </button>
            
            <button
              onClick={() => handlePageChange(totalPages)}
              disabled={currentPage === totalPages || isLoading}
              style={{
                padding: '6px 10px',
                backgroundColor: (currentPage === totalPages || isLoading) 
                  ? colors.utility.secondaryBackground 
                  : colors.brand.primary,
                color: (currentPage === totalPages || isLoading) 
                  ? colors.utility.secondaryText 
                  : 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: (currentPage === totalPages || isLoading) ? 'not-allowed' : 'pointer',
                fontSize: '12px'
              }}
            >
              Last
            </button>
          </div>
        )}
      </div>

      {/* CSS Animation */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};