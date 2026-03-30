// frontend/src/components/nav/NavDataViewer.tsx
// Reusable NAV data viewer component with graph/table views

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { useBookmarkNavData } from '../../hooks/useNavData';
import { toastService } from '../../services/toast.service';
import { FrontendErrorLogger } from '../../services/errorLogger.service';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend 
} from 'recharts';
import type { SchemeBookmark } from '../../services/nav.service';

interface NavDataViewerProps {
  bookmark: SchemeBookmark;
  onExport?: (data: any[]) => void;
}

type ViewMode = 'graph' | 'table';
type Granularity = 'daily' | 'monthly';
type TimePeriod = '1w' | '1m' | '6m' | '1y' | '2y' | 'all' | 'custom';

export const NavDataViewer: React.FC<NavDataViewerProps> = ({
  bookmark,
  onExport
}) => {
  const { theme, isDarkMode } = useTheme();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;
  
  const { 
    navData, 
    isLoading, 
    error, 
    fetchNavData, 
    clearData, 
    pagination 
  } = useBookmarkNavData();

  // State
  const [viewMode, setViewMode] = useState<ViewMode>('graph');
  const [granularity, setGranularity] = useState<Granularity>('monthly');
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('1y');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 50;

  // Calculate date range based on time period
  const getDateRange = useCallback((period: TimePeriod): { startDate: string; endDate: string } | null => {
    if (period === 'custom') {
      if (customStartDate && customEndDate) {
        return { startDate: customStartDate, endDate: customEndDate };
      }
      return null;
    }

    if (period === 'all') {
      const startStr = bookmark?.earliest_nav_date
        ? new Date(bookmark.earliest_nav_date).toISOString().split('T')[0]
        : '2000-01-01';
      return {
        startDate: startStr,
        endDate: new Date().toISOString().split('T')[0]
      };
    }

    const endDate = new Date();
    const startDate = new Date();

    switch (period) {
      case '1w': startDate.setDate(startDate.getDate() - 7); break;
      case '1m': startDate.setMonth(startDate.getMonth() - 1); break;
      case '6m': startDate.setMonth(startDate.getMonth() - 6); break;
      case '1y': startDate.setFullYear(startDate.getFullYear() - 1); break;
      case '2y': startDate.setFullYear(startDate.getFullYear() - 2); break;
      default: return null;
    }

    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0]
    };
  }, [bookmark, customStartDate, customEndDate]);

  // Safe number formatting
  const formatNavValue = (value: any): string => {
    if (value === null || value === undefined) return 'N/A';
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(numValue)) return 'N/A';
    return numValue.toFixed(4);
  };

  // Load NAV data
  const loadNavData = useCallback(() => {
    const dateRange = getDateRange(timePeriod);
    if (!dateRange) {
      if (timePeriod === 'custom') {
        toastService.warning('Please select valid dates for custom range');
      }
      return;
    }

    const params = {
      bookmark_id: bookmark.id,
      page: currentPage,
      page_size: viewMode === 'graph' ? 1000 : pageSize,
      start_date: dateRange.startDate,
      end_date: dateRange.endDate,
      granularity: granularity
    };

    fetchNavData(params);
  }, [bookmark, getDateRange, timePeriod, currentPage, viewMode, granularity, fetchNavData]);

  // Initial load and reload on parameter changes
  useEffect(() => {
    setCurrentPage(1);
    loadNavData();
  }, [timePeriod, granularity]);

  // Reload when page changes (table view only)
  useEffect(() => {
    if (viewMode === 'table' && currentPage > 1) {
      loadNavData();
    }
  }, [currentPage]);

  // Cleanup on unmount
  useEffect(() => {
    return () => clearData();
  }, [clearData]);

  // Prepare chart data
  const chartData = useMemo(() => {
    if (navData.length === 0) return [];
    
    const processed = navData.map((item) => {
      const date = new Date(item.nav_date);
      const navValue = parseFloat(formatNavValue(item.nav_value));
      
      return {
        date: date.toLocaleDateString('en-US', {
          month: 'short',
          day: granularity === 'daily' ? 'numeric' : undefined,
          year: 'numeric'
        }),
        nav: navValue,
        fullDate: item.nav_date,
        rawDate: date.getTime()
      };
    }).sort((a, b) => a.rawDate - b.rawDate);
    
    return processed;
  }, [navData, granularity]);

  // Calculate statistics
  const statistics = useMemo(() => {
    if (navData.length === 0) return null;

    const values = navData.map(d => parseFloat(formatNavValue(d.nav_value))).filter(v => !isNaN(v));
    if (values.length === 0) return null;

    const minNav = Math.min(...values);
    const maxNav = Math.max(...values);
    const currentNav = values[0];
    const oldestNav = values[values.length - 1];
    const change = currentNav - oldestNav;
    const changePercent = oldestNav !== 0 ? ((change / oldestNav) * 100).toFixed(2) : '0.00';

    return {
      current: currentNav.toFixed(4),
      min: minNav.toFixed(4),
      max: maxNav.toFixed(4),
      change: change.toFixed(4),
      changePercent,
      isPositive: change >= 0
    };
  }, [navData]);

  // Handle export
  const handleExportData = () => {
    if (navData.length === 0) {
      toastService.warning('No data to export');
      return;
    }

    if (onExport) {
      onExport(navData);
      return;
    }

    try {
      const headers = ['Date', 'NAV Value'];
      const csvContent = [
        headers.join(','),
        ...navData.map(row => [
          new Date(row.nav_date).toLocaleDateString(),
          formatNavValue(row.nav_value)
        ].join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      const filename = `${bookmark.scheme_code}_nav_${granularity}_${timePeriod}.csv`;
      
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toastService.success('NAV data exported successfully');
      
      FrontendErrorLogger.info('NAV data exported', 'NavDataViewer', {
        bookmarkId: bookmark.id,
        recordCount: navData.length,
        granularity,
        timePeriod
      });
    } catch (error: any) {
      FrontendErrorLogger.error('Failed to export NAV data', 'NavDataViewer', {
        bookmarkId: bookmark.id,
        error: error.message
      }, error.stack);
      toastService.error('Failed to export data');
    }
  };

  // Handle page change
  const handlePageChange = (newPage: number) => {
    if (!pagination || newPage < 1 || newPage > pagination.totalPages) return;
    setCurrentPage(newPage);
  };

  // Custom tooltip for chart
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div style={{
          backgroundColor: colors.utility.primaryBackground,
          border: `1px solid ${colors.utility.primaryText}20`,
          borderRadius: '8px',
          padding: '12px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
        }}>
          <p style={{ 
            margin: '0 0 4px 0', 
            fontSize: '12px', 
            color: colors.utility.secondaryText 
          }}>
            {payload[0].payload.date}
          </p>
          <p style={{ 
            margin: 0, 
            fontSize: '16px', 
            fontWeight: '600', 
            color: colors.brand.primary 
          }}>
            ₹{payload[0].value.toFixed(4)}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div style={{
      backgroundColor: colors.utility.secondaryBackground,
      borderRadius: '12px',
      padding: '20px'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px'
      }}>
        <h3 style={{
          fontSize: '18px',
          fontWeight: '600',
          color: colors.utility.primaryText,
          margin: 0
        }}>
          📊 NAV Data Viewer
        </h3>
        
        <button
          onClick={handleExportData}
          disabled={navData.length === 0 || isLoading}
          style={{
            padding: '8px 16px',
            backgroundColor: navData.length === 0 || isLoading 
              ? colors.utility.secondaryText 
              : colors.brand.secondary,
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: navData.length === 0 || isLoading ? 'not-allowed' : 'pointer',
            fontSize: '13px',
            fontWeight: '500',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'transform 0.2s ease'
          }}
          onMouseEnter={(e) => {
            if (navData.length > 0 && !isLoading) {
              e.currentTarget.style.transform = 'translateY(-2px)';
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          📥 Export CSV
        </button>
      </div>

      {/* Controls Panel */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        marginBottom: '20px',
        padding: '16px',
        backgroundColor: colors.utility.primaryBackground,
        borderRadius: '8px'
      }}>
        {/* View Mode Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ 
            fontSize: '13px', 
            fontWeight: '600', 
            color: colors.utility.primaryText,
            minWidth: '90px'
          }}>
            View Mode:
          </span>
          <div style={{
            display: 'inline-flex',
            backgroundColor: colors.utility.secondaryBackground,
            borderRadius: '6px',
            padding: '3px',
            border: `1px solid ${colors.utility.primaryText}10`
          }}>
            <button
              onClick={() => setViewMode('graph')}
              style={{
                padding: '6px 16px',
                backgroundColor: viewMode === 'graph' ? colors.brand.primary : 'transparent',
                color: viewMode === 'graph' ? 'white' : colors.utility.primaryText,
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: '500',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              📈 Graph
            </button>
            <button
              onClick={() => setViewMode('table')}
              style={{
                padding: '6px 16px',
                backgroundColor: viewMode === 'table' ? colors.brand.primary : 'transparent',
                color: viewMode === 'table' ? 'white' : colors.utility.primaryText,
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: '500',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              📋 Table
            </button>
          </div>
        </div>

        {/* Granularity Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ 
            fontSize: '13px', 
            fontWeight: '600', 
            color: colors.utility.primaryText,
            minWidth: '90px'
          }}>
            Granularity:
          </span>
          <div style={{
            display: 'inline-flex',
            backgroundColor: colors.utility.secondaryBackground,
            borderRadius: '6px',
            padding: '3px',
            border: `1px solid ${colors.utility.primaryText}10`
          }}>
            <button
              onClick={() => setGranularity('daily')}
              style={{
                padding: '6px 16px',
                backgroundColor: granularity === 'daily' ? colors.brand.secondary : 'transparent',
                color: granularity === 'daily' ? 'white' : colors.utility.primaryText,
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: '500',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              📅 Daily
            </button>
            <button
              onClick={() => setGranularity('monthly')}
              style={{
                padding: '6px 16px',
                backgroundColor: granularity === 'monthly' ? colors.brand.secondary : 'transparent',
                color: granularity === 'monthly' ? 'white' : colors.utility.primaryText,
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: '500',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              📆 Monthly
            </button>
          </div>
        </div>

        {/* Time Period Selection */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <span style={{ 
            fontSize: '13px', 
            fontWeight: '600', 
            color: colors.utility.primaryText,
            minWidth: '90px'
          }}>
            Time Period:
          </span>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {(['1w', '1m', '6m', '1y', '2y', 'all', 'custom'] as TimePeriod[]).map(period => (
              <button
                key={period}
                onClick={() => setTimePeriod(period)}
                style={{
                  padding: '6px 14px',
                  backgroundColor: timePeriod === period 
                    ? colors.brand.primary 
                    : colors.utility.secondaryBackground,
                  color: timePeriod === period ? 'white' : colors.utility.primaryText,
                  border: `1px solid ${timePeriod === period ? colors.brand.primary : colors.utility.primaryText}20`,
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: '500',
                  transition: 'all 0.2s'
                }}
              >
                {period === '1w' && '1 Week'}
                {period === '1m' && '1 Month'}
                {period === '6m' && '6 Months'}
                {period === '1y' && '1 Year'}
                {period === '2y' && '2 Years'}
                {period === 'all' && 'All Time'}
                {period === 'custom' && 'Custom'}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Date Range */}
        {timePeriod === 'custom' && (
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '12px',
            paddingLeft: '106px'
          }}>
            <input
              type="date"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              max={customEndDate || undefined}
              style={{
                padding: '6px 10px',
                border: `1px solid ${colors.utility.primaryText}20`,
                borderRadius: '4px',
                backgroundColor: colors.utility.secondaryBackground,
                color: colors.utility.primaryText,
                fontSize: '13px',
                outline: 'none'
              }}
            />
            <span style={{ color: colors.utility.secondaryText, fontSize: '13px' }}>to</span>
            <input
              type="date"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              min={customStartDate || undefined}
              style={{
                padding: '6px 10px',
                border: `1px solid ${colors.utility.primaryText}20`,
                borderRadius: '4px',
                backgroundColor: colors.utility.secondaryBackground,
                color: colors.utility.primaryText,
                fontSize: '13px',
                outline: 'none'
              }}
            />
            <button
              onClick={loadNavData}
              disabled={!customStartDate || !customEndDate}
              style={{
                padding: '6px 16px',
                backgroundColor: (!customStartDate || !customEndDate) 
                  ? colors.utility.secondaryText 
                  : colors.brand.primary,
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: (!customStartDate || !customEndDate) ? 'not-allowed' : 'pointer',
                fontSize: '13px',
                fontWeight: '500'
              }}
            >
              Apply
            </button>
          </div>
        )}
      </div>

      {/* Statistics Panel */}
      {statistics && !isLoading && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: '12px',
          marginBottom: '20px',
          padding: '14px',
          backgroundColor: colors.utility.primaryBackground,
          borderRadius: '8px'
        }}>
          <div>
            <div style={{ 
              fontSize: '11px', 
              color: colors.utility.secondaryText, 
              marginBottom: '4px',
              fontWeight: '500'
            }}>
              Current NAV
            </div>
            <div style={{ 
              fontSize: '20px', 
              fontWeight: '700', 
              color: colors.brand.primary 
            }}>
              ₹{statistics.current}
            </div>
          </div>
          <div>
            <div style={{ 
              fontSize: '11px', 
              color: colors.utility.secondaryText, 
              marginBottom: '4px',
              fontWeight: '500'
            }}>
              Min NAV
            </div>
            <div style={{ 
              fontSize: '20px', 
              fontWeight: '700', 
              color: colors.semantic.error 
            }}>
              ₹{statistics.min}
            </div>
          </div>
          <div>
            <div style={{ 
              fontSize: '11px', 
              color: colors.utility.secondaryText, 
              marginBottom: '4px',
              fontWeight: '500'
            }}>
              Max NAV
            </div>
            <div style={{ 
              fontSize: '20px', 
              fontWeight: '700', 
              color: colors.semantic.success 
            }}>
              ₹{statistics.max}
            </div>
          </div>
          <div>
            <div style={{ 
              fontSize: '11px', 
              color: colors.utility.secondaryText, 
              marginBottom: '4px',
              fontWeight: '500'
            }}>
              Change
            </div>
            <div style={{ 
              fontSize: '20px', 
              fontWeight: '700', 
              color: statistics.isPositive ? colors.semantic.success : colors.semantic.error 
            }}>
              {statistics.isPositive ? '+' : ''}₹{statistics.change}
            </div>
            <div style={{
              fontSize: '11px',
              color: statistics.isPositive ? colors.semantic.success : colors.semantic.error,
              fontWeight: '600'
            }}>
              {statistics.isPositive ? '+' : ''}{statistics.changePercent}%
            </div>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div style={{
          padding: '12px',
          backgroundColor: colors.semantic.error + '10',
          color: colors.semantic.error,
          borderRadius: '6px',
          marginBottom: '16px',
          border: `1px solid ${colors.semantic.error}30`,
          fontSize: '13px'
        }}>
          ⚠️ {error}
        </div>
      )}

      {/* Content Area */}
      <div style={{
        minHeight: '400px',
        border: `1px solid ${colors.utility.primaryText}10`,
        borderRadius: '8px',
        backgroundColor: colors.utility.primaryBackground,
        display: 'flex',
        flexDirection: 'column'
      }}>
        {isLoading ? (
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '80px',
            color: colors.utility.secondaryText
          }}>
            <span style={{
              width: '32px',
              height: '32px',
              border: '4px solid transparent',
              borderTop: `4px solid ${colors.brand.primary}`,
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              marginRight: '12px'
            }} />
            Loading NAV data...
          </div>
        ) : navData.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '80px 20px',
            color: colors.utility.secondaryText
          }}>
            <div style={{ fontSize: '64px', marginBottom: '16px', opacity: 0.5 }}>📊</div>
            <p style={{ margin: 0, fontSize: '16px', fontWeight: '500' }}>
              No NAV data found for the selected period
            </p>
            <p style={{ margin: '8px 0 0 0', fontSize: '13px' }}>
              Try selecting a different time period or granularity
            </p>
          </div>
        ) : viewMode === 'graph' ? (
          <div style={{ 
            padding: '20px', 
            width: '100%',
            height: '500px',
            minHeight: '500px'
          }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart 
                data={chartData}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid 
                  strokeDasharray="3 3" 
                  stroke={colors.utility.primaryText + '15'} 
                />
                <XAxis 
                  dataKey="date" 
                  stroke={colors.utility.secondaryText}
                  style={{ fontSize: '12px' }}
                  angle={chartData.length > 50 ? -45 : 0}
                  textAnchor={chartData.length > 50 ? 'end' : 'middle'}
                  height={chartData.length > 50 ? 80 : 50}
                  interval={chartData.length > 100 ? 'preserveStartEnd' : 'preserveStart'}
                />
                <YAxis 
                  stroke={colors.utility.secondaryText}
                  style={{ fontSize: '12px' }}
                  domain={['auto', 'auto']}
                  tickFormatter={(value: number) => `₹${value.toFixed(2)}`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend 
                  wrapperStyle={{ 
                    fontSize: '13px',
                    color: colors.utility.primaryText,
                    paddingTop: '10px'
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="nav" 
                  stroke={colors.brand.primary}
                  strokeWidth={2}
                  dot={chartData.length <= 50 ? { fill: colors.brand.primary, r: 3 } : false}
                  activeDot={{ r: 6 }}
                  name="NAV Value (₹)"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{ flex: 1, overflow: 'auto' }}>
              <table style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: '13px'
              }}>
                <thead>
                  <tr style={{
                    backgroundColor: colors.utility.secondaryBackground,
                    borderBottom: `2px solid ${colors.utility.primaryText}10`,
                    position: 'sticky',
                    top: 0,
                    zIndex: 1
                  }}>
                    <th style={{
                      padding: '14px 20px',
                      textAlign: 'left',
                      fontWeight: '600',
                      color: colors.utility.primaryText,
                      fontSize: '13px'
                    }}>
                      Date
                    </th>
                    <th style={{
                      padding: '14px 20px',
                      textAlign: 'right',
                      fontWeight: '600',
                      color: colors.utility.primaryText,
                      fontSize: '13px'
                    }}>
                      NAV Value (₹)
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {navData.map((row, index) => (
                    <tr
                      key={`${row.scheme_id}-${row.nav_date}-${index}`}
                      style={{
                        borderBottom: `1px solid ${colors.utility.primaryText}05`,
                        backgroundColor: index % 2 === 0 
                          ? 'transparent' 
                          : colors.utility.primaryText + '03',
                        transition: 'background-color 0.15s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = colors.utility.primaryText + '08';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = index % 2 === 0 
                          ? 'transparent' 
                          : colors.utility.primaryText + '03';
                      }}
                    >
                      <td style={{
                        padding: '12px 20px',
                        color: colors.utility.primaryText,
                        fontSize: '13px'
                      }}>
                        {new Date(row.nav_date).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </td>
                      <td style={{
                        padding: '12px 20px',
                        textAlign: 'right',
                        color: colors.brand.primary,
                        fontWeight: '600',
                        fontSize: '14px',
                        fontFamily: 'monospace'
                      }}>
                        ₹{formatNavValue(row.nav_value)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination for Table View */}
            {pagination && pagination.totalPages > 1 && (
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 20px',
                borderTop: `1px solid ${colors.utility.primaryText}10`,
                backgroundColor: colors.utility.secondaryBackground
              }}>
                <div style={{ fontSize: '12px', color: colors.utility.secondaryText }}>
                  Showing {((currentPage - 1) * pagination.pageSize) + 1} to {Math.min(currentPage * pagination.pageSize, pagination.total)} of {pagination.total} records
                </div>
                
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <button
                    onClick={() => handlePageChange(1)}
                    disabled={currentPage === 1}
                    style={{
                      padding: '6px 10px',
                      backgroundColor: currentPage === 1 
                        ? colors.utility.primaryBackground 
                        : colors.brand.primary,
                      color: currentPage === 1 
                        ? colors.utility.secondaryText 
                        : 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                      fontSize: '12px',
                      fontWeight: '500'
                    }}
                  >
                    First
                  </button>
                  
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    style={{
                      padding: '6px 12px',
                      backgroundColor: currentPage === 1 
                        ? colors.utility.primaryBackground 
                        : colors.brand.primary,
                      color: currentPage === 1 
                        ? colors.utility.secondaryText 
                        : 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                      fontSize: '12px',
                      fontWeight: '500'
                    }}
                  >
                    ← Prev
                  </button>

                  <span style={{
                    padding: '6px 12px',
                    fontSize: '12px',
                    color: colors.utility.primaryText,
                    fontWeight: '600'
                  }}>
                    Page {currentPage} of {pagination.totalPages}
                  </span>

                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === pagination.totalPages}
                    style={{
                      padding: '6px 12px',
                      backgroundColor: currentPage === pagination.totalPages 
                        ? colors.utility.primaryBackground 
                        : colors.brand.primary,
                      color: currentPage === pagination.totalPages 
                        ? colors.utility.secondaryText 
                        : 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: currentPage === pagination.totalPages ? 'not-allowed' : 'pointer',
                      fontSize: '12px',
                      fontWeight: '500'
                    }}
                  >
                    Next →
                  </button>
                  
                  <button
                    onClick={() => handlePageChange(pagination.totalPages)}
                    disabled={currentPage === pagination.totalPages}
                    style={{
                      padding: '6px 10px',
                      backgroundColor: currentPage === pagination.totalPages 
                        ? colors.utility.primaryBackground 
                        : colors.brand.primary,
                      color: currentPage === pagination.totalPages 
                        ? colors.utility.secondaryText 
                        : 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: currentPage === pagination.totalPages ? 'not-allowed' : 'pointer',
                      fontSize: '12px',
                      fontWeight: '500'
                    }}
                  >
                    Last
                  </button>
                </div>
              </div>
            )}
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