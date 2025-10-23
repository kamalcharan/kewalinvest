// frontend/src/pages/market/IndexDetailPage.tsx

import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { FrontendErrorLogger } from '../../services/errorLogger.service';
import {
  useCalculateMetrics,
  useIndexMetrics,
  useIndexReturnsTimeSeries,
  useIndexVolatilityTimeSeries,
  useIndexDetail,
} from '../../hooks/useMarketMetrics';
import {
  useChartPreference,
  useSaveChartPreference,
  useEffectiveChartColor,
} from '../../hooks/useChartPreferences';
import { getDateRangeFromPeriod } from '../../utils/timeRangeHelper';
import type { TimePeriod } from '../../utils/timeRangeHelper';
import type { IndexMetrics } from '../../types/marketAnalysis.types';
import type { ChartType, ViewMode, DisplayMode, Granularity } from '../../types/chartViewer.types';
import ChartViewer from '../../components/visualizations/ChartViewer';
import MetricsSidebar from '../../components/visualizations/MetricsSidebar';

const IndexDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const { id: idParam } = useParams<{ id: string }>();
  const { theme, isDarkMode } = useTheme();
  const { user } = useAuth();
  
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;
  
  const indexId = parseInt(idParam || '0', 10);
  
  // STATE MANAGEMENT - Filter States
  const [chartType, setChartType] = useState<ChartType>('line');
  const [viewMode, setViewMode] = useState<ViewMode>('price');
  const [displayMode, setDisplayMode] = useState<DisplayMode>('graph');
  const [granularity, setGranularity] = useState<Granularity>('daily');
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('1y');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [showVolume, setShowVolume] = useState(false);
  const [baselineValue, setBaselineValue] = useState<number | null>(null);

  // COLOR MANAGEMENT - Use preference or theme default
  const defaultColor = colors.brand.primary;
  const effectiveColor = useEffectiveChartColor(indexId, defaultColor);
  const [lineColor, setLineColor] = useState(effectiveColor);
  
  // Update lineColor when effectiveColor changes (on load or preference change)
  useEffect(() => {
    setLineColor(effectiveColor);
  }, [effectiveColor]);

  // Chart preference hooks
  const saveColorMutation = useSaveChartPreference();

  // Calculate date range based on time period
  const dateRange = useMemo(() => {
    if (timePeriod === 'custom') {
      if (customStartDate && customEndDate) {
        return { startDate: customStartDate, endDate: customEndDate };
      }
      return null;
    }
    return getDateRangeFromPeriod(timePeriod);
  }, [timePeriod, customStartDate, customEndDate]);

  // DATA FETCHING HOOKS
  const indexDetailQuery = useIndexDetail(indexId); // Fetch basic index info
  const metricsQuery = useIndexMetrics(indexId);

  const returnsTimeSeriesQuery = useIndexReturnsTimeSeries(
    indexId,
    ['1m', '3m', '6m', '1y', 'ytd', 'all'],
    granularity,
    dateRange?.startDate,
    dateRange?.endDate
  );

  const volatilityTimeSeriesQuery = useIndexVolatilityTimeSeries(
    indexId,
    granularity,
    dateRange?.startDate,
    dateRange?.endDate
  );

  const calculateMetricsMutation = useCalculateMetrics();

  // Extract data
  const indexDetail = indexDetailQuery.data;
  const metrics = metricsQuery.data as IndexMetrics | null;
  const returnsTimeSeries = returnsTimeSeriesQuery.data || [];
  const volatilityTimeSeries = volatilityTimeSeriesQuery.data || [];

  // Loading and error states
  const isInitialLoading = indexDetailQuery.isLoading || metricsQuery.isLoading;
  const isReturnsFetching = returnsTimeSeriesQuery.isFetching;
  const isVolatilityFetching = volatilityTimeSeriesQuery.isFetching;
  const isCalculating = calculateMetricsMutation.isPending;
  const hasMetrics = !!metrics && metrics.id !== undefined;
  const calculationError = calculateMetricsMutation.error?.message;

  // Transform API data to ChartViewer format
  const chartData = useMemo(() => {
    if (!returnsTimeSeries || returnsTimeSeries.length === 0) return [];
    
    return returnsTimeSeries
      .filter(item => item.close !== null && item.close !== undefined && !isNaN(Number(item.close)))
      .map(item => ({
        date: new Date(item.date).toLocaleDateString('en-IN'),
        value: Number(item.close),
        open: item.open ? Number(item.open) : null,
        high: item.high ? Number(item.high) : null,
        low: item.low ? Number(item.low) : null,
        volume: item.volume ? Number(item.volume) : null,
        rawDate: new Date(item.date).getTime()
      }));
  }, [returnsTimeSeries]);

  // EVENT HANDLERS
  const handleBack = () => {
    try {
      navigate(-1);
    } catch (error: any) {
      FrontendErrorLogger.error(
        'Navigation back failed',
        'IndexDetailPage',
        { action: 'back', error: error.message },
        error.stack
      );
    }
  };

  const handleCalculateMetrics = () => {
    try {
      if (!indexId || indexId <= 0) {
        throw new Error('Invalid index ID');
      }
      calculateMetricsMutation.mutate(indexId);
    } catch (error: any) {
      FrontendErrorLogger.error(
        'Calculate metrics action failed',
        'IndexDetailPage',
        { indexId, error: error.message },
        error.stack
      );
    }
  };

  const handleChartTypeChange = (type: ChartType) => {
    try {
      setChartType(type);
    } catch (error: any) {
      FrontendErrorLogger.error(
        'Chart type change failed',
        'IndexDetailPage',
        { chartType: type, error: error.message },
        error.stack
      );
    }
  };

  const handleViewModeChange = (mode: ViewMode) => {
    try {
      setViewMode(mode);
    } catch (error: any) {
      FrontendErrorLogger.error(
        'View mode change failed',
        'IndexDetailPage',
        { viewMode: mode, error: error.message },
        error.stack
      );
    }
  };

  const handleDisplayModeChange = (mode: DisplayMode) => {
    try {
      setDisplayMode(mode);
    } catch (error: any) {
      FrontendErrorLogger.error(
        'Display mode change failed',
        'IndexDetailPage',
        { displayMode: mode, error: error.message },
        error.stack
      );
    }
  };

  const handleTimePeriodChange = (period: TimePeriod) => {
    try {
      setTimePeriod(period);
      if (period !== 'custom') {
        setCustomStartDate('');
        setCustomEndDate('');
      }
    } catch (error: any) {
      FrontendErrorLogger.error(
        'Time period change failed',
        'IndexDetailPage',
        { period, error: error.message },
        error.stack
      );
    }
  };

  const handleGranularityChange = (gran: Granularity) => {
    try {
      setGranularity(gran);
    } catch (error: any) {
      FrontendErrorLogger.error(
        'Granularity change failed',
        'IndexDetailPage',
        { granularity: gran, error: error.message },
        error.stack
      );
    }
  };

  const handleColorChange = (color: string) => {
    try {
      setLineColor(color);
      // Save to backend with debouncing (mutation handles this)
      saveColorMutation.mutate({ indexId, lineColor: color });
    } catch (error: any) {
      FrontendErrorLogger.error(
        'Color change failed',
        'IndexDetailPage',
        { indexId, color, error: error.message },
        error.stack
      );
    }
  };

  const handleApplyCustomDates = (startDate: string, endDate: string) => {
    try {
      setCustomStartDate(startDate);
      setCustomEndDate(endDate);
      setTimePeriod('custom');
    } catch (error: any) {
      FrontendErrorLogger.error(
        'Apply custom dates failed',
        'IndexDetailPage',
        { startDate, endDate, error: error.message },
        error.stack
      );
    }
  };

  const handleVolumeToggle = (show: boolean) => {
    try {
      setShowVolume(show);
    } catch (error: any) {
      FrontendErrorLogger.error(
        'Volume toggle failed',
        'IndexDetailPage',
        { showVolume: show, error: error.message },
        error.stack
      );
    }
  };

  const handleBaselineChange = (value: number | null) => {
    try {
      setBaselineValue(value);
    } catch (error: any) {
      FrontendErrorLogger.error(
        'Baseline change failed',
        'IndexDetailPage',
        { baselineValue: value, error: error.message },
        error.stack
      );
    }
  };

  // UTILITY FUNCTIONS
  const formatMetricValue = (value: number | null | undefined, decimals: number = 2): string => {
    if (value === null || value === undefined || isNaN(Number(value))) {
      return '--';
    }
    const numValue = Number(value);
    if (isNaN(numValue)) {
      return '--';
    }
    return `${numValue >= 0 ? '+' : ''}${numValue.toFixed(decimals)}%`;
  };

  const formatDate = (dateValue: string | Date | null | undefined): string => {
    if (!dateValue) return 'N/A';
    try {
      const date = typeof dateValue === 'string' ? new Date(dateValue) : dateValue;
      return date.toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return 'N/A';
    }
  };

  // Memoized latest values from time-series data for sidebar
  const latestReturns = useMemo(() => {
    if (returnsTimeSeries.length === 0) return {};
    const latest = returnsTimeSeries[returnsTimeSeries.length - 1];
    return {
      return_1m: latest.return_1m,
      return_3m: latest.return_3m,
      return_6m: latest.return_6m,
      return_1y: latest.return_1y,
      return_ytd: latest.return_ytd,
      return_all: latest.return_all
    };
  }, [returnsTimeSeries]);

  const latestVolatility = useMemo(() => {
    if (volatilityTimeSeries.length === 0) return {};
    const latest = volatilityTimeSeries[volatilityTimeSeries.length - 1];
    return {
      volatility_7d: latest.sd_7d,
      volatility_14d: latest.sd_14d,
      volatility_30d: latest.sd_21d,
      volatility_60d: latest.sd_42d,
      volatility_90d: latest.sd_3m
    };
  }, [volatilityTimeSeries]);

  // Prepare metrics for sidebar
  const sidebarMetrics = useMemo(() => ({
    ...latestReturns,
    ...latestVolatility,
    cagr: metrics?.cagr,
    sharpe_ratio: metrics?.sharpe_ratio,
    max_drawdown: metrics?.max_drawdown,
    total_risk: metrics?.total_risk
  }), [latestReturns, latestVolatility, metrics]);

  // Initial loading state
  if (isInitialLoading && !hasMetrics) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: colors.utility.primaryBackground,
        padding: '30px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{
          textAlign: 'center',
          color: colors.utility.secondaryText
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.5 }}>⏳</div>
          <p style={{ fontSize: '16px', fontWeight: '500' }}>Loading index details...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: colors.utility.primaryBackground,
      padding: '30px'
    }}>
      <div style={{ maxWidth: '1600px', margin: '0 auto' }}>
        
        {/* Back Button */}
        <button
          onClick={handleBack}
          style={{
            marginBottom: '20px',
            padding: '10px 16px',
            backgroundColor: 'transparent',
            color: colors.utility.secondaryText,
            border: `1px solid ${colors.utility.primaryText}20`,
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = colors.utility.secondaryBackground;
            e.currentTarget.style.borderColor = colors.brand.primary;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.borderColor = colors.utility.primaryText + '20';
          }}
        >
          ← Back
        </button>

        {/* Header Section */}
        <div style={{
          backgroundColor: colors.utility.secondaryBackground,
          padding: '24px',
          borderRadius: '12px',
          border: `1px solid ${colors.utility.primaryText}10`,
          marginBottom: '30px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: '20px'
        }}>
          <div style={{ flex: 1 }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '12px'
            }}>
              <h1 style={{
                fontSize: '32px',
                fontWeight: '700',
                color: colors.utility.primaryText,
                margin: 0
              }}>
                {metrics?.index_name || indexDetail?.index_name || `Index #${indexId}`} ({metrics?.index_code || indexDetail?.index_code || 'N/A'})
              </h1>
              <span style={{
                padding: '6px 12px',
                backgroundColor: colors.brand.primary + '15',
                color: colors.brand.primary,
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: '600',
                textTransform: 'capitalize'
              }}>
                {hasMetrics ? 'Calculated' : 'Not Calculated'}
              </span>
            </div>

            <div style={{
              fontSize: '14px',
              color: colors.utility.secondaryText,
              marginBottom: '4px'
            }}>
              Data As Of: {metrics?.date ? formatDate(metrics.date) : 'N/A'}
            </div>
            <div style={{
              fontSize: '14px',
              color: colors.utility.secondaryText,
              marginBottom: '8px'
            }}>
              Last Calculated: {hasMetrics && metrics?.metrics_calculated_at ? new Date(metrics.metrics_calculated_at).toLocaleString('en-IN') : 'Not available'}
            </div>
          </div>

          {/* Price Display */}
          <div style={{ textAlign: 'right' }}>
            {hasMetrics && metrics?.last_price !== null && metrics?.last_price !== undefined ? (
              <>
                <div style={{
                  fontSize: '36px',
                  fontWeight: '700',
                  color: colors.brand.primary,
                  lineHeight: '1'
                }}>
                  ₹{metrics.last_price.toLocaleString('en-IN', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  })}
                </div>
                <div style={{
                  fontSize: '13px',
                  color: colors.utility.secondaryText,
                  marginTop: '6px'
                }}>
                  Current Price
                </div>
                
                {/* OHLC Display */}
                {returnsTimeSeries.length > 0 && (() => {
                  const latest = returnsTimeSeries[returnsTimeSeries.length - 1];
                  const openValue = latest?.open != null && !isNaN(Number(latest.open)) 
                    ? Number(latest.open).toFixed(2) 
                    : null;
                  const highValue = latest?.high != null && !isNaN(Number(latest.high)) 
                    ? Number(latest.high).toFixed(2) 
                    : null;
                  const lowValue = latest?.low != null && !isNaN(Number(latest.low)) 
                    ? Number(latest.low).toFixed(2) 
                    : null;
                  const volumeValue = latest?.volume != null && !isNaN(Number(latest.volume)) 
                    ? (Number(latest.volume) / 1000000).toFixed(2) + 'M' 
                    : null;
                  
                  return (
                    <div style={{ 
                      display: 'grid', 
                      gridTemplateColumns: '1fr 1fr', 
                      gap: '8px',
                      marginTop: '12px',
                      fontSize: '12px',
                      textAlign: 'left'
                    }}>
                      <div>
                        <span style={{ color: colors.utility.secondaryText }}>O:</span>{' '}
                        <span style={{ fontWeight: '600', fontFamily: 'monospace', color: colors.utility.primaryText }}>
                          {openValue ? `₹${openValue}` : '--'}
                        </span>
                      </div>
                      <div>
                        <span style={{ color: colors.utility.secondaryText }}>H:</span>{' '}
                        <span style={{ fontWeight: '600', fontFamily: 'monospace', color: colors.semantic.success }}>
                          {highValue ? `₹${highValue}` : '--'}
                        </span>
                      </div>
                      <div>
                        <span style={{ color: colors.utility.secondaryText }}>L:</span>{' '}
                        <span style={{ fontWeight: '600', fontFamily: 'monospace', color: colors.semantic.error }}>
                          {lowValue ? `₹${lowValue}` : '--'}
                        </span>
                      </div>
                      <div>
                        <span style={{ color: colors.utility.secondaryText }}>V:</span>{' '}
                        <span style={{ fontWeight: '600', fontFamily: 'monospace', color: colors.utility.primaryText }}>
                          {volumeValue || '--'}
                        </span>
                      </div>
                    </div>
                  );
                })()}
              </>
            ) : (
              <div style={{
                fontSize: '14px',
                color: colors.utility.secondaryText,
                fontStyle: 'italic'
              }}>
                --
              </div>
            )}
          </div>
        </div>

        {/* Error Display */}
        {calculationError && (
          <div style={{
            marginBottom: '30px',
            padding: '16px',
            backgroundColor: colors.semantic.error + '10',
            border: `1px solid ${colors.semantic.error}30`,
            borderRadius: '8px'
          }}>
            <div style={{
              fontSize: '14px',
              fontWeight: '600',
              color: colors.semantic.error,
              marginBottom: '4px'
            }}>
              Calculation Failed
            </div>
            <div style={{
              fontSize: '13px',
              color: colors.semantic.error
            }}>
              {calculationError}
            </div>
          </div>
        )}

        {/* MAIN CONTENT */}
        {!hasMetrics ? (
          <div style={{
            backgroundColor: colors.utility.secondaryBackground,
            borderRadius: '12px',
            padding: '80px 20px',
            border: `1px solid ${colors.utility.primaryText}10`,
            textAlign: 'center',
            color: colors.utility.secondaryText
          }}>
            <div style={{ fontSize: '64px', marginBottom: '16px', opacity: 0.5 }}>📭</div>
            <p style={{
              fontSize: '16px',
              fontWeight: '500',
              margin: '0 0 8px 0',
              color: colors.utility.primaryText
            }}>
              No Data Available
            </p>
            <p style={{ fontSize: '13px', margin: '0 0 20px 0', maxWidth: '400px', marginLeft: 'auto', marginRight: 'auto' }}>
              Calculate metrics to see analysis for this index
            </p>
            <button
              onClick={handleCalculateMetrics}
              disabled={isCalculating}
              style={{
                padding: '10px 20px',
                backgroundColor: colors.brand.primary,
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: isCalculating ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: '600'
              }}
            >
              {isCalculating ? 'Calculating...' : 'Calculate Now'}
            </button>
          </div>
        ) : (
          <>
            {/* NEW LAYOUT: 70/30 SPLIT - Chart + Sidebar */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '70% 30%',
              gap: '24px',
              marginBottom: '24px'
            }}>
              {/* LEFT: CHART SECTION (70%) */}
              <div>
                <ChartViewer
                  indexName={metrics?.index_name || indexDetail?.index_name || `Index ${indexId}`}
                  indexId={indexId}
                  data={chartData}
                  isLoading={isReturnsFetching}
                  error={returnsTimeSeriesQuery.error?.message}
                  showColorPicker={true}
                  allowExport={true}
                  
                  // Parent-controlled filter states
                  chartType={chartType}
                  viewMode={viewMode}
                  displayMode={displayMode}
                  granularity={granularity}
                  timePeriod={timePeriod}
                  customStartDate={customStartDate}
                  customEndDate={customEndDate}
                  lineColor={lineColor}
                  showVolume={showVolume}
                  baselineValue={baselineValue}
                  
                  // Callbacks
                  onChartTypeChange={handleChartTypeChange}
                  onViewModeChange={handleViewModeChange}
                  onDisplayModeChange={handleDisplayModeChange}
                  onGranularityChange={handleGranularityChange}
                  onTimePeriodChange={handleTimePeriodChange}
                  onCustomDateApply={handleApplyCustomDates}
                  onColorChange={handleColorChange}
                  onVolumeToggle={handleVolumeToggle}
                  onBaselineChange={handleBaselineChange}
                />
              </div>

              {/* RIGHT: METRICS SIDEBAR (30%) */}
              <div>
                <MetricsSidebar
                  metrics={sidebarMetrics}
                  colors={colors}
                  isLoading={isReturnsFetching || isVolatilityFetching}
                />
              </div>
            </div>

            {/* DETAILED STATISTICS TABLE - Below Main Layout */}
            <div style={{
              backgroundColor: colors.utility.secondaryBackground,
              borderRadius: '12px',
              padding: '24px',
              border: `1px solid ${colors.utility.primaryText}10`,
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
            }}>
              <h2 style={{
                fontSize: '18px',
                fontWeight: '600',
                color: colors.utility.primaryText,
                margin: '0 0 20px 0'
              }}>
                📊 Detailed Statistics
              </h2>

              <table style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: '14px'
              }}>
                <thead>
                  <tr style={{
                    backgroundColor: colors.utility.primaryBackground,
                    borderBottom: `2px solid ${colors.utility.primaryText}10`
                  }}>
                    <th style={{
                      padding: '14px 16px',
                      textAlign: 'left',
                      fontWeight: '600',
                      color: colors.utility.primaryText
                    }}>
                      Metric
                    </th>
                    <th style={{
                      padding: '14px 16px',
                      textAlign: 'right',
                      fontWeight: '600',
                      color: colors.utility.primaryText
                    }}>
                      Value
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { label: 'Daily Return', value: metrics?.daily_return },
                    { label: 'CAGR', value: metrics?.cagr },
                    { label: 'Sharpe Ratio', value: metrics?.sharpe_ratio },
                    { label: 'Max Drawdown', value: metrics?.max_drawdown },
                    { label: 'Total Risk', value: metrics?.total_risk },
                    { label: '1W Return', value: metrics?.return_1w },
                    { label: '1M Return', value: metrics?.return_1m },
                    { label: '3M Return', value: metrics?.return_3m },
                    { label: '6M Return', value: metrics?.return_6m },
                    { label: '1Y Return', value: metrics?.return_1y },
                    { label: 'YTD Return', value: metrics?.return_ytd },
                    { label: 'All-Time Return', value: metrics?.return_all }
                  ].map((metric, idx) => (
                    <tr
                      key={metric.label}
                      style={{
                        borderBottom: `1px solid ${colors.utility.primaryText}05`,
                        backgroundColor: idx % 2 === 0 ? 'transparent' : colors.utility.primaryBackground
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = colors.utility.primaryBackground;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = idx % 2 === 0 ? 'transparent' : colors.utility.primaryBackground;
                      }}
                    >
                      <td style={{
                        padding: '14px 16px',
                        color: colors.utility.primaryText,
                        fontWeight: '500'
                      }}>
                        {metric.label}
                      </td>
                      <td style={{
                        padding: '14px 16px',
                        textAlign: 'right',
                        color: colors.utility.secondaryText,
                        fontFamily: 'monospace'
                      }}>
                        {formatMetricValue(metric.value as number || null)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default IndexDetailPage;