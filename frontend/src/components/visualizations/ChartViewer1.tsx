// frontend/src/components/visualizations/ChartViewer.tsx

import React, { useState, useMemo, useCallback } from 'react';
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

// Mock types - will be imported from src/types/marketAnalysis.types.ts
interface ChartDataPoint {
  date: string;
  value: number;
  rawDate: number;
}

interface ChartViewerProps {
  indexName: string;
  indexId: number;
  lineColor?: string;
  onColorChange?: (color: string) => void;
  isLoading?: boolean;
  error?: string;
  data?: ChartDataPoint[];
  showColorPicker?: boolean;
  
  // Parent-controlled filter state and callbacks
  granularity?: 'daily' | 'weekly' | 'monthly';
  timePeriod?: TimePeriod;
  customStartDate?: string;
  customEndDate?: string;
  onGranularityChange?: (granularity: 'daily' | 'weekly' | 'monthly') => void;
  onTimePeriodChange?: (period: TimePeriod) => void;
  onCustomDateApply?: (startDate: string, endDate: string) => void;
}

type ViewMode = 'graph' | 'table';
type Granularity = 'daily' | 'weekly' | 'monthly';
type TimePeriod = '1w' | '1m' | '3m' | '6m' | '1y' | 'ytd' | 'all' | 'custom';

const ChartViewer: React.FC<ChartViewerProps> = ({
  indexName,
  indexId,
  lineColor,
  onColorChange,
  isLoading = false,
  error = null,
  data = [],
  showColorPicker = true,
  
  // Destructure parent-controlled props
  granularity: parentGranularity = 'daily',
  timePeriod: parentTimePeriod = '1y',
  customStartDate: parentCustomStartDate = '',
  customEndDate: parentCustomEndDate = '',
  onGranularityChange,
  onTimePeriodChange,
  onCustomDateApply
}) => {
  // Mock theme
  const theme = {
    colors: {
      brand: {
        primary: '#f83b46',
        secondary: '#ff6a73',
      },
      utility: {
        primaryText: '#141518',
        secondaryText: '#677681',
        primaryBackground: '#f1f4f8',
        secondaryBackground: '#ffffff',
      },
      semantic: {
        success: '#6bbd78',
        error: '#ff5963',
        warning: '#ec9c4b',
        info: '#0299ff',
      }
    }
  };

  const [viewMode, setViewMode] = useState<ViewMode>('graph');
  
  // Use parent-controlled state (no local state for filters)
  const granularity = parentGranularity;
  const timePeriod = parentTimePeriod;
  
  // Keep local state for custom date inputs (updated on Apply)
  const [tempCustomStartDate, setTempCustomStartDate] = useState(parentCustomStartDate);
  const [tempCustomEndDate, setTempCustomEndDate] = useState(parentCustomEndDate);
  
  const [tempLineColor, setTempLineColor] = useState(lineColor);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 50;

  // Sort and prepare chart data
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];
    
    return [...data]
      .sort((a, b) => a.rawDate - b.rawDate)
      .map(item => ({
        ...item,
        displayValue: parseFloat(item.value.toFixed(4))
      }));
  }, [data]);

  const handleColorChange = useCallback((color: string) => {
    setTempLineColor(color);
    if (onColorChange) {
      onColorChange(color);
    }
  }, [onColorChange]);

  const handlePeriodChange = (period: TimePeriod) => {
    setCurrentPage(1);
    // Call parent to update state and refetch data
    if (onTimePeriodChange) {
      onTimePeriodChange(period);
    }
  };

  const handleGranularityChange = (gran: Granularity) => {
    setCurrentPage(1);
    // Call parent to update state and refetch data
    if (onGranularityChange) {
      onGranularityChange(gran);
    }
  };

  const handleApplyCustomDates = () => {
    if (tempCustomStartDate && tempCustomEndDate && onCustomDateApply) {
      onCustomDateApply(tempCustomStartDate, tempCustomEndDate);
    }
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div style={{
          backgroundColor: theme.colors.utility.primaryBackground,
          border: `1px solid ${theme.colors.utility.primaryText}20`,
          borderRadius: '8px',
          padding: '12px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
        }}>
          <p style={{
            margin: '0 0 4px 0',
            fontSize: '12px',
            color: theme.colors.utility.secondaryText
          }}>
            {payload[0].payload.date}
          </p>
          <p style={{
            margin: 0,
            fontSize: '16px',
            fontWeight: '600',
            color: lineColor
          }}>
            {payload[0].value.toFixed(4)}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div style={{
      backgroundColor: theme.colors.utility.secondaryBackground,
      borderRadius: '12px',
      padding: '20px',
      border: `1px solid ${theme.colors.utility.primaryText}10`
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
          color: theme.colors.utility.primaryText,
          margin: 0
        }}>
          📊 {indexName} Price Chart
        </h3>
      </div>

      {/* Controls Panel */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        marginBottom: '20px',
        padding: '16px',
        backgroundColor: theme.colors.utility.primaryBackground,
        borderRadius: '8px'
      }}>
        {/* View Mode Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{
            fontSize: '13px',
            fontWeight: '600',
            color: theme.colors.utility.primaryText,
            minWidth: '100px'
          }}>
            View Mode:
          </span>
          <div style={{
            display: 'inline-flex',
            backgroundColor: theme.colors.utility.secondaryBackground,
            borderRadius: '6px',
            padding: '3px',
            border: `1px solid ${theme.colors.utility.primaryText}10`
          }}>
            {['graph', 'table'].map(mode => (
              <button
                key={mode}
                onClick={() => setViewMode(mode as ViewMode)}
                style={{
                  padding: '6px 16px',
                  backgroundColor: viewMode === mode ? theme.colors.brand.primary : 'transparent',
                  color: viewMode === mode ? 'white' : theme.colors.utility.primaryText,
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: '500',
                  transition: 'all 0.2s'
                }}
              >
                {mode === 'graph' ? 'Graph' : 'Table'}
              </button>
            ))}
          </div>
        </div>

        {/* Granularity Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{
            fontSize: '13px',
            fontWeight: '600',
            color: theme.colors.utility.primaryText,
            minWidth: '100px'
          }}>
            Granularity:
          </span>
          <div style={{
            display: 'inline-flex',
            backgroundColor: theme.colors.utility.secondaryBackground,
            borderRadius: '6px',
            padding: '3px',
            border: `1px solid ${theme.colors.utility.primaryText}10`
          }}>
            {['daily', 'weekly', 'monthly'].map(gran => (
              <button
                key={gran}
                onClick={() => handleGranularityChange(gran as Granularity)}
                style={{
                  padding: '6px 16px',
                  backgroundColor: granularity === gran ? theme.colors.brand.secondary : 'transparent',
                  color: granularity === gran ? 'white' : theme.colors.utility.primaryText,
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: '500',
                  transition: 'all 0.2s'
                }}
              >
                {gran === 'daily' && 'Daily'}
                {gran === 'weekly' && 'Weekly'}
                {gran === 'monthly' && 'Monthly'}
              </button>
            ))}
          </div>
        </div>

        {/* Time Period Selection */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <span style={{
            fontSize: '13px',
            fontWeight: '600',
            color: theme.colors.utility.primaryText,
            minWidth: '100px'
          }}>
            Time Period:
          </span>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {(['1w', '1m', '3m', '6m', '1y', 'ytd', 'all', 'custom'] as TimePeriod[]).map(period => (
              <button
                key={period}
                onClick={() => handlePeriodChange(period)}
                style={{
                  padding: '6px 14px',
                  backgroundColor: timePeriod === period 
                    ? theme.colors.brand.primary 
                    : theme.colors.utility.secondaryBackground,
                  color: timePeriod === period ? 'white' : theme.colors.utility.primaryText,
                  border: `1px solid ${timePeriod === period ? theme.colors.brand.primary : theme.colors.utility.primaryText}20`,
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: '500',
                  transition: 'all 0.2s'
                }}
              >
                {period === '1w' && '1W'}
                {period === '1m' && '1M'}
                {period === '3m' && '3M'}
                {period === '6m' && '6M'}
                {period === '1y' && '1Y'}
                {period === 'ytd' && 'YTD'}
                {period === 'all' && 'All'}
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
            paddingLeft: '116px'
          }}>
            <input
              type="date"
              value={tempCustomStartDate}
              onChange={(e) => setTempCustomStartDate(e.target.value)}
              max={tempCustomEndDate || undefined}
              style={{
                padding: '6px 10px',
                border: `1px solid ${theme.colors.utility.primaryText}20`,
                borderRadius: '4px',
                backgroundColor: theme.colors.utility.secondaryBackground,
                color: theme.colors.utility.primaryText,
                fontSize: '13px',
                outline: 'none'
              }}
            />
            <span style={{ color: theme.colors.utility.secondaryText, fontSize: '13px' }}>to</span>
            <input
              type="date"
              value={tempCustomEndDate}
              onChange={(e) => setTempCustomEndDate(e.target.value)}
              min={tempCustomStartDate || undefined}
              style={{
                padding: '6px 10px',
                border: `1px solid ${theme.colors.utility.primaryText}20`,
                borderRadius: '4px',
                backgroundColor: theme.colors.utility.secondaryBackground,
                color: theme.colors.utility.primaryText,
                fontSize: '13px',
                outline: 'none'
              }}
            />
            <button
              onClick={handleApplyCustomDates}
              disabled={!tempCustomStartDate || !tempCustomEndDate}
              style={{
                padding: '6px 16px',
                backgroundColor: (!tempCustomStartDate || !tempCustomEndDate) 
                  ? theme.colors.utility.secondaryText 
                  : theme.colors.brand.primary,
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: (!tempCustomStartDate || !tempCustomEndDate) ? 'not-allowed' : 'pointer',
                fontSize: '13px',
                fontWeight: '500'
              }}
            >
              Apply
            </button>
          </div>
        )}

        {/* Color Picker */}
        {showColorPicker && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span style={{
              fontSize: '13px',
              fontWeight: '600',
              color: theme.colors.utility.primaryText,
              minWidth: '100px'
            }}>
              Line Color:
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <input
                type="color"
                value={tempLineColor}
                onChange={(e) => handleColorChange(e.target.value)}
                style={{
                  width: '40px',
                  height: '40px',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  padding: 0
                }}
              />
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  value={tempLineColor}
                  onChange={(e) => {
                    if (/^#[0-9A-F]{6}$/i.test(e.target.value)) {
                      handleColorChange(e.target.value);
                    }
                  }}
                  placeholder="#f83b46"
                  style={{
                    padding: '6px 10px',
                    border: `1px solid ${theme.colors.utility.primaryText}20`,
                    borderRadius: '4px',
                    backgroundColor: theme.colors.utility.secondaryBackground,
                    color: theme.colors.utility.primaryText,
                    fontSize: '13px',
                    width: '120px',
                    outline: 'none',
                    fontFamily: 'monospace'
                  }}
                />
              </div>
              <span style={{
                fontSize: '11px',
                color: theme.colors.utility.secondaryText
              }}>
                (Hex format)
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div style={{
          padding: '12px',
          backgroundColor: theme.colors.semantic.error + '10',
          color: theme.colors.semantic.error,
          borderRadius: '6px',
          marginBottom: '16px',
          border: `1px solid ${theme.colors.semantic.error}30`,
          fontSize: '13px'
        }}>
          {error}
        </div>
      )}

      {/* Content Area */}
      <div style={{
        minHeight: '400px',
        border: `1px solid ${theme.colors.utility.primaryText}10`,
        borderRadius: '8px',
        backgroundColor: theme.colors.utility.primaryBackground,
        display: 'flex',
        flexDirection: 'column'
      }}>
        {isLoading ? (
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '80px',
            color: theme.colors.utility.secondaryText
          }}>
            <span style={{
              width: '32px',
              height: '32px',
              border: '4px solid transparent',
              borderTop: `4px solid ${theme.colors.brand.primary}`,
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              marginRight: '12px'
            }} />
            Loading chart data...
          </div>
        ) : chartData.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '80px 20px',
            color: theme.colors.utility.secondaryText,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center'
          }}>
            <div style={{ fontSize: '64px', marginBottom: '16px', opacity: 0.5 }}>📊</div>
            <p style={{
              fontSize: '16px',
              fontWeight: '500',
              margin: '0 0 8px 0',
              color: theme.colors.utility.primaryText
            }}>
              No Data Available
            </p>
            <p style={{
              fontSize: '13px',
              margin: 0
            }}>
              Try selecting a different time period or date range
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
                  stroke={theme.colors.utility.primaryText + '15'}
                />
                <XAxis
                  dataKey="date"
                  stroke={theme.colors.utility.secondaryText}
                  style={{ fontSize: '12px' }}
                  angle={chartData.length > 50 ? -45 : 0}
                  textAnchor={chartData.length > 50 ? 'end' : 'middle'}
                  height={chartData.length > 50 ? 80 : 50}
                  interval={chartData.length > 100 ? 'preserveStartEnd' : 'preserveStart'}
                />
                <YAxis
                  stroke={theme.colors.utility.secondaryText}
                  style={{ fontSize: '12px' }}
                  domain={['auto', 'auto']}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  wrapperStyle={{
                    fontSize: '13px',
                    color: theme.colors.utility.primaryText,
                    paddingTop: '10px'
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="displayValue"
                  stroke={lineColor}
                  strokeWidth={2}
                  dot={chartData.length <= 50 ? { fill: lineColor, r: 3 } : false}
                  activeDot={{ r: 6 }}
                  name={`${indexName} Value`}
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
                    backgroundColor: theme.colors.utility.secondaryBackground,
                    borderBottom: `2px solid ${theme.colors.utility.primaryText}10`,
                    position: 'sticky',
                    top: 0,
                    zIndex: 1
                  }}>
                    <th style={{
                      padding: '14px 20px',
                      textAlign: 'left',
                      fontWeight: '600',
                      color: theme.colors.utility.primaryText
                    }}>
                      Date
                    </th>
                    <th style={{
                      padding: '14px 20px',
                      textAlign: 'right',
                      fontWeight: '600',
                      color: theme.colors.utility.primaryText
                    }}>
                      Value
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {chartData
                    .slice((currentPage - 1) * pageSize, currentPage * pageSize)
                    .map((row, index) => (
                    <tr
                      key={`${row.rawDate}-${index}`}
                      style={{
                        borderBottom: `1px solid ${theme.colors.utility.primaryText}05`,
                        backgroundColor: index % 2 === 0 ? 'transparent' : theme.colors.utility.primaryText + '03'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = theme.colors.utility.primaryText + '08';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = index % 2 === 0 
                          ? 'transparent' 
                          : theme.colors.utility.primaryText + '03';
                      }}
                    >
                      <td style={{
                        padding: '12px 20px',
                        color: theme.colors.utility.primaryText
                      }}>
                        {row.date}
                      </td>
                      <td style={{
                        padding: '12px 20px',
                        textAlign: 'right',
                        color: lineColor,
                        fontWeight: '600',
                        fontFamily: 'monospace'
                      }}>
                        {row.displayValue.toFixed(4)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {chartData.length > pageSize && (
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 20px',
                borderTop: `1px solid ${theme.colors.utility.primaryText}10`,
                backgroundColor: theme.colors.utility.secondaryBackground
              }}>
                <div style={{ fontSize: '12px', color: theme.colors.utility.secondaryText }}>
                  Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, chartData.length)} of {chartData.length}
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    onClick={() => handlePageChange(1)}
                    disabled={currentPage === 1}
                    style={{
                      padding: '6px 10px',
                      backgroundColor: currentPage === 1 ? theme.colors.utility.primaryBackground : theme.colors.brand.primary,
                      color: currentPage === 1 ? theme.colors.utility.secondaryText : 'white',
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
                      backgroundColor: currentPage === 1 ? theme.colors.utility.primaryBackground : theme.colors.brand.primary,
                      color: currentPage === 1 ? theme.colors.utility.secondaryText : 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                      fontSize: '12px',
                      fontWeight: '500'
                    }}
                  >
                    Prev
                  </button>
                  <span style={{
                    padding: '6px 12px',
                    fontSize: '12px',
                    color: theme.colors.utility.primaryText,
                    fontWeight: '600'
                  }}>
                    Page {currentPage} of {Math.ceil(chartData.length / pageSize)}
                  </span>
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage >= Math.ceil(chartData.length / pageSize)}
                    style={{
                      padding: '6px 12px',
                      backgroundColor: currentPage >= Math.ceil(chartData.length / pageSize) ? theme.colors.utility.primaryBackground : theme.colors.brand.primary,
                      color: currentPage >= Math.ceil(chartData.length / pageSize) ? theme.colors.utility.secondaryText : 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: currentPage >= Math.ceil(chartData.length / pageSize) ? 'not-allowed' : 'pointer',
                      fontSize: '12px',
                      fontWeight: '500'
                    }}
                  >
                    Next
                  </button>
                  <button
                    onClick={() => handlePageChange(Math.ceil(chartData.length / pageSize))}
                    disabled={currentPage >= Math.ceil(chartData.length / pageSize)}
                    style={{
                      padding: '6px 10px',
                      backgroundColor: currentPage >= Math.ceil(chartData.length / pageSize) ? theme.colors.utility.primaryBackground : theme.colors.brand.primary,
                      color: currentPage >= Math.ceil(chartData.length / pageSize) ? theme.colors.utility.secondaryText : 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: currentPage >= Math.ceil(chartData.length / pageSize) ? 'not-allowed' : 'pointer',
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

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default ChartViewer;