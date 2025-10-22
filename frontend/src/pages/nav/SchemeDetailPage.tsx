// frontend/src/pages/nav/SchemeDetailPage.tsx
// Scheme detail page with ChartViewer and MetricsSidebar integration
// Based on IndexDetailPage but adapted for NAV data

import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { FrontendErrorLogger } from '../../services/errorLogger.service';
import { useSchemeMetrics } from '../../hooks/useSchemeMetrics';
import { useCalculateMetrics } from '../../hooks/useMetricsCalculation';
import { useSchemeNavTimeSeries } from '../../hooks/useSchemeNavTimeSeries';
import {
  useEffectiveChartColor,
  useSaveChartPreference,
} from '../../hooks/useChartPreferences';
import { getDateRangeFromPeriod } from '../../utils/timeRangeHelper';
import type { TimePeriod } from '../../utils/timeRangeHelper';
import type { SchemeMetricsResponse } from '../../types/nav.types';
import type { ChartType, ViewMode, DisplayMode, Granularity } from '../../types/chartViewer.types';
import ChartViewer from '../../components/visualizations/ChartViewer';
import MetricsSidebar from '../../components/visualizations/MetricsSidebar';
import {
  transformNavToChartData,
  prepareMetricsForSidebar,
  extractLatestMetrics,
  getLatestNav,
} from '../../utils/schemeDataTransformers';

const SchemeDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const { scheme_id: idParam } = useParams<{ scheme_id: string }>();
  const { theme, isDarkMode } = useTheme();
  const { user } = useAuth();
  
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;
  
  const schemeId = parseInt(idParam || '0', 10);
  
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
  const effectiveColor = useEffectiveChartColor(schemeId, defaultColor);
  const [lineColor, setLineColor] = useState(effectiveColor);
  
  // Update lineColor when effectiveColor changes
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
  const metricsQuery = useSchemeMetrics(schemeId);
  
  const navTimeSeriesQuery = useSchemeNavTimeSeries(schemeId, {
    granularity,
    start_date: dateRange?.startDate,
    end_date: dateRange?.endDate,
    include_metrics: true,
  });
  
  const { calculate: calculateMetrics, isCalculating } = useCalculateMetrics();

  // Extract data
  const metrics = metricsQuery.data as SchemeMetricsResponse | null;
  const navTimeSeries = navTimeSeriesQuery.rawData;

  // Loading and error states
  const isInitialLoading = metricsQuery.isLoading;
  const isNavFetching = navTimeSeriesQuery.isFetching;
  const hasMetrics = !!metrics && !!metrics.metrics;

  // Transform NAV data to ChartViewer format
  const chartData = useMemo(() => {
    if (!navTimeSeries || !navTimeSeries.data || navTimeSeries.data.length === 0) {
      return [];
    }
    
    return transformNavToChartData(navTimeSeries.data);
  }, [navTimeSeries]);

  // Get latest NAV value
  const latestNavInfo = useMemo(() => {
    if (navTimeSeries?.data && navTimeSeries.data.length > 0) {
      return getLatestNav(navTimeSeries.data);
    }
    return null;
  }, [navTimeSeries]);

  // EVENT HANDLERS
  const handleBack = () => {
    try {
      navigate(-1);
    } catch (error: any) {
      FrontendErrorLogger.error(
        'Navigation back failed',
        'SchemeDetailPage',
        { action: 'back', error: error.message },
        error.stack
      );
    }
  };

  const handleCalculateMetrics = async () => {
    try {
      if (!schemeId || schemeId <= 0) {
        throw new Error('Invalid scheme ID');
      }
      await calculateMetrics(schemeId);
    } catch (error: any) {
      FrontendErrorLogger.error(
        'Calculate metrics action failed',
        'SchemeDetailPage',
        { schemeId, error: error.message },
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
        'SchemeDetailPage',
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
        'SchemeDetailPage',
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
        'SchemeDetailPage',
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
        'SchemeDetailPage',
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
        'SchemeDetailPage',
        { granularity: gran, error: error.message },
        error.stack
      );
    }
  };

  const handleColorChange = (color: string) => {
    try {
      setLineColor(color);
      // Save to backend
      saveColorMutation.mutate({ indexId: schemeId, lineColor: color });
    } catch (error: any) {
      FrontendErrorLogger.error(
        'Color change failed',
        'SchemeDetailPage',
        { schemeId, color, error: error.message },
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
        'SchemeDetailPage',
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
        'SchemeDetailPage',
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
        'SchemeDetailPage',
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

  // Prepare metrics for sidebar
  const sidebarMetrics = useMemo(() => {
    // Try to get metrics from latest metrics API call
    if (metrics && metrics.metrics) {
      return prepareMetricsForSidebar(metrics);
    }
    
    // Fallback: extract from time series data
    if (navTimeSeries?.data && navTimeSeries.data.length > 0) {
      return extractLatestMetrics(navTimeSeries.data);
    }
    
    return null;
  }, [metrics, navTimeSeries]);

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
          <p style={{ fontSize: '16px', fontWeight: '500' }}>Loading scheme details...</p>
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
                {metrics?.scheme_name || `Scheme #${schemeId}`}
              </h1>
              <span style={{
                padding: '6px 12px',
                backgroundColor: hasMetrics ? colors.brand.primary + '15' : colors.utility.primaryText + '15',
                color: hasMetrics ? colors.brand.primary : colors.utility.secondaryText,
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: '600',
                textTransform: 'capitalize'
              }}>
                {hasMetrics ? 'Metrics Available' : 'No Metrics'}
              </span>
            </div>

            <div style={{
              fontSize: '14px',
              color: colors.utility.secondaryText,
              marginBottom: '4px'
            }}>
              <strong>Code:</strong> {metrics?.scheme_code || 'N/A'}
            </div>
            <div style={{
              fontSize: '14px',
              color: colors.utility.secondaryText,
              marginBottom: '4px'
            }}>
              <strong>AMC:</strong> {metrics?.amc_name || 'N/A'}
            </div>
            <div style={{
              fontSize: '14px',
              color: colors.utility.secondaryText,
              marginBottom: '8px'
            }}>
              <strong>As Of:</strong> {metrics?.date ? formatDate(metrics.date) : 'N/A'}
            </div>
            {hasMetrics && metrics?.metrics_calculated_at && (
              <div style={{
                fontSize: '13px',
                color: colors.utility.secondaryText,
                fontStyle: 'italic'
              }}>
                Last Calculated: {new Date(metrics.metrics_calculated_at).toLocaleString('en-IN')}
              </div>
            )}
          </div>

          {/* NAV Display */}
          <div style={{ textAlign: 'right' }}>
            {latestNavInfo ? (
              <>
                <div style={{
                  fontSize: '36px',
                  fontWeight: '700',
                  color: colors.brand.primary,
                  lineHeight: '1'
                }}>
                  ₹{latestNavInfo.value.toLocaleString('en-IN', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 4
                  })}
                </div>
                <div style={{
                  fontSize: '13px',
                  color: colors.utility.secondaryText,
                  marginTop: '6px'
                }}>
                  Latest NAV
                </div>
                <div style={{
                  fontSize: '12px',
                  color: colors.utility.secondaryText,
                  marginTop: '4px'
                }}>
                  {formatDate(latestNavInfo.date)}
                </div>
              </>
            ) : (
              <div style={{
                fontSize: '14px',
                color: colors.utility.secondaryText,
                fontStyle: 'italic'
              }}>
                No NAV data available
              </div>
            )}
          </div>
        </div>

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
            <div style={{ fontSize: '64px', marginBottom: '16px', opacity: 0.5 }}>📊</div>
            <p style={{
              fontSize: '16px',
              fontWeight: '500',
              margin: '0 0 8px 0',
              color: colors.utility.primaryText
            }}>
              No Metrics Available
            </p>
            <p style={{ fontSize: '13px', margin: '0 0 20px 0', maxWidth: '400px', marginLeft: 'auto', marginRight: 'auto' }}>
              Calculate metrics to see detailed analysis for this scheme
            </p>
            <button
              onClick={handleCalculateMetrics}
              disabled={isCalculating}
              style={{
                padding: '12px 24px',
                backgroundColor: isCalculating ? colors.utility.secondaryText : colors.brand.primary,
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: isCalculating ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: '600',
                opacity: isCalculating ? 0.6 : 1
              }}
            >
              {isCalculating ? 'Calculating...' : 'Calculate Metrics Now'}
            </button>
          </div>
        ) : (
          <>
            {/* 70/30 SPLIT - Chart + Sidebar */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '70% 30%',
              gap: '24px',
              marginBottom: '24px'
            }}>
              {/* LEFT: CHART SECTION (70%) */}
              <div>
                <ChartViewer
                  indexName={metrics?.scheme_name || `Scheme ${schemeId}`}
                  indexId={schemeId}
                  data={chartData}
                  isLoading={isNavFetching}
                  error={navTimeSeriesQuery.error?.message}
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
                  metrics={sidebarMetrics || {}}
                  colors={colors}
                  isLoading={isNavFetching}
                />
              </div>
            </div>

            {/* DETAILED STATISTICS TABLE */}
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
                    { label: 'Daily Return', value: metrics?.metrics?.daily_return },
                    { label: 'CAGR', value: metrics?.metrics?.cagr },
                    { label: 'Sharpe Ratio', value: metrics?.metrics?.sharpe_ratio },
                    { label: 'Max Drawdown', value: metrics?.metrics?.max_drawdown },
                    { label: 'Total Risk', value: metrics?.metrics?.total_risk },
                    { label: '1W Return', value: metrics?.metrics?.return_1w },
                    { label: '1M Return', value: metrics?.metrics?.return_1m },
                    { label: '3M Return', value: metrics?.metrics?.return_3m },
                    { label: '6M Return', value: metrics?.metrics?.return_6m },
                    { label: '1Y Return', value: metrics?.metrics?.return_1y },
                    { label: 'YTD Return', value: metrics?.metrics?.return_ytd },
                    { label: 'All-Time Return', value: metrics?.metrics?.return_all }
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
    </div>
  );
};

export default SchemeDetailPage;